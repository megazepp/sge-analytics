#!/usr/bin/env python3
"""Build the public SGE data snapshot from OpenLigaDB and the club's public squad page."""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "sge.json"
SEASON = int(os.getenv("SGE_SEASON", "2026"))
BASE = "https://api.openligadb.de"
SOURCES = {
    "matches": f"{BASE}/getmatchdata/bl1/{SEASON}",
    "table": f"{BASE}/getbltable/bl1/{SEASON}",
    "scorers": f"{BASE}/getgoalgetters/bl1/{SEASON}",
    "teams": f"{BASE}/getavailableteams/bl1/{SEASON}",
    "squad": "https://profis.eintracht.de/kader/",
}

def get_json(url):
    req = Request(url, headers={"User-Agent": "SGE-Analytics/1.0 (fan project)"})
    with urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_data(self, data):
        value = " ".join(data.split())
        if value:
            self.parts.append(value)

class ProfileParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.meta = {}
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "meta":
            item = dict(attrs)
            key = item.get("property") or item.get("name")
            if key:
                self.meta[key.lower()] = item.get("content", "")
    def handle_data(self, data):
        value = " ".join(data.split())
        if value:
            self.parts.append(value)

class SquadLinksParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_heading = False
        self.section = ""
        self.anchor = None
        self.players = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag.lower() in ("h2", "h3"):
            self.in_heading = True
        if tag.lower() == "a":
            href = attrs.get("href", "")
            if re.match(r"^/kader/[^/]+/?$", href):
                self.anchor = {"profileUrl": "https://profis.eintracht.de" + href, "text": ""}
    def handle_endtag(self, tag):
        if tag.lower() in ("h2", "h3"):
            self.in_heading = False
        if tag.lower() == "a" and self.anchor:
            self.players.append({**self.anchor, "position": self.section})
            self.anchor = None
    def handle_data(self, data):
        value = " ".join(data.split())
        if not value:
            return
        if self.in_heading:
            self.section = value
        if self.anchor is not None:
            self.anchor["text"] += " " + value

def get_squad():
    """Read only player links from the official squad page, then enrich from official profiles."""
    try:
        req = Request(SOURCES["squad"], headers={"User-Agent": "Mozilla/5.0 (compatible; SGE-Analytics/1.0)"})
        with urlopen(req, timeout=30) as response:
            html = response.read().decode("utf-8", "replace")
        links = SquadLinksParser()
        links.feed(html)
        unique, seen = [], set()
        for item in links.players:
            key = item["profileUrl"].rstrip("/")
            if key not in seen:
                seen.add(key)
                unique.append(item)
        players = []
        for item in unique:
            name = re.sub(r"\s+", " ", item["text"]).strip()
            name = re.sub(r"\b\d{1,2}\b", "", name).strip()
            name = re.sub(r"(\b[A-ZÀ-Ý][a-zà-ÿ'’.-]+)(?:\s+\1){1,}", r"\\1", name)
            slug_name = item["profileUrl"].rstrip("/").split("/")[-1].replace("-", " ").title()
            player = {"name": name or slug_name, "position": item["position"], "profileUrl": item["profileUrl"]}
            try:
                profile_req = Request(item["profileUrl"], headers={"User-Agent": "Mozilla/5.0 (compatible; SGE-Analytics/1.0)"})
                with urlopen(profile_req, timeout=20) as response:
                    profile_html = response.read().decode("utf-8", "replace")
                profile = ProfileParser()
                profile.feed(profile_html)
                body = " ".join(profile.parts)
                image = profile.meta.get("og:image") or profile.meta.get("twitter:image")
                if image:
                    player["photoUrl"] = image
                number_match = re.search(r"#\s*(\d{1,2})", body)
                if number_match:
                    player["number"] = int(number_match.group(1))
                nationality = re.search(r"Nationalität:\s*([A-Za-zÀ-ÿ -]+?)\s+Geburtstag:", body)
                if nationality:
                    player["nationality"] = nationality.group(1).strip()
                height = re.search(r"Größe:\s*(\d[.,]\d{2})\s*m", body)
                if height:
                    player["height"] = height.group(1).replace(",", ".") + " m"
            except Exception as profile_error:
                player["profileNote"] = str(profile_error)
            if player["name"]:
                players.append(player)
        if not players:
            raise RuntimeError("Keine Spielerprofile auf der offiziellen Kaderseite gefunden")
        return {"status": "ok", "count": len(players), "players": players, "source": SOURCES["squad"]}
    except Exception as exc:
        return {"status": "unavailable", "count": 0, "players": [], "source": SOURCES["squad"], "note": str(exc)}

def main():
    matches = get_json(SOURCES["matches"])
    table = get_json(SOURCES["table"])
    scorers = get_json(SOURCES["scorers"])
    teams = get_json(SOURCES["teams"])
    if not isinstance(matches, list) or not isinstance(table, list):
        raise RuntimeError("OpenLigaDB returned an unexpected response; preserving previous snapshot")
    sge_matches = [
        m for m in matches
        if "eintracht frankfurt" in (
            ((m.get("team1") or {}).get("teamName", "") + " " +
             (m.get("team2") or {}).get("teamName", "")).casefold()
        )
    ]
    payload = {
        "meta": {
            "club": "Eintracht Frankfurt",
            "league": "Bundesliga",
            "season": SEASON,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "agent": "sge-public-data-agent",
            "sources": SOURCES,
            "notice": "Community and official public sources; starting lineups are only available when officially published."
        },
        "squad": get_squad(),
        "matches": sge_matches,
        "allMatches": matches,
        "table": table,
        "scorers": scorers,
        "teams": teams,
        "statistics": {
            "matchesPlayed": len([m for m in sge_matches if m.get("matchIsFinished")]),
            "wins": 0, "draws": 0, "losses": 0, "goalsFor": 0, "goalsAgainst": 0
        },
        "lineup": {"status": "not_published", "players": [], "note": "Offizielle Aufstellungen werden erst kurz vor dem Anpfiff veröffentlicht."}
    }
    # Derive SGE season record only from confirmed full-time results.
    for match in sge_matches:
        if not match.get("matchIsFinished"):
            continue
        sge_home = "eintracht frankfurt" in ((match.get("team1") or {}).get("teamName", "").casefold())
        results = match.get("matchResults") or []
        finals = [r for r in results if r.get("resultTypeID") == 2]
        if not finals:
            continue
        result = finals[-1]
        gf = result.get("pointsTeam1" if sge_home else "pointsTeam2")
        ga = result.get("pointsTeam2" if sge_home else "pointsTeam1")
        if not isinstance(gf, (int, float)) or not isinstance(ga, (int, float)):
            continue
        payload["statistics"]["goalsFor"] += gf
        payload["statistics"]["goalsAgainst"] += ga
        if gf > ga: payload["statistics"]["wins"] += 1
        elif gf == ga: payload["statistics"]["draws"] += 1
        else: payload["statistics"]["losses"] += 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUT.with_suffix(".json.tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(OUT)
    print(f"Updated {OUT}: {len(sge_matches)} SGE matches, {len(table)} table rows")

if __name__ == "__main__":
    main()
