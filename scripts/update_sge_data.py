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
    POSITIONS = {"Tor", "Abwehr", "Mittelfeld", "Sturm"}
    def __init__(self):
        super().__init__()
        self.heading = ""
        self.in_heading = False
        self.anchor = None
        self.players = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag.lower() in ("h2", "h3"):
            self.in_heading = True
        if tag.lower() == "a":
            href = attrs.get("href", "")
            if re.match(r"^/kader/[^/]+/?$", href) and self.heading in self.POSITIONS:
                self.anchor = {"profileUrl": "https://profis.eintracht.de" + href, "text": "", "position": self.heading, "images": []}
        if tag.lower() in ("img", "source") and self.anchor:
            for key in ("src", "data-src", "data-lazy-src", "data-original"):
                value = attrs.get(key)
                if value and value.startswith("http"):
                    self.anchor["images"].append(value)
            srcset = attrs.get("srcset", "")
            for entry in srcset.split(","):
                value = entry.strip().split(" ")[0]
                if value.startswith("http"):
                    self.anchor["images"].append(value)
    def handle_endtag(self, tag):
        if tag.lower() in ("h2", "h3"):
            self.in_heading = False
        if tag.lower() == "a" and self.anchor:
            self.players.append(self.anchor)
            self.anchor = None
    def handle_data(self, data):
        value = " ".join(data.split())
        if not value:
            return
        if self.in_heading:
            self.heading = value
        if self.anchor is not None:
            self.anchor["text"] += " " + value

def clean_player_name(raw, profile_url):
    # The official profile slug is the stable canonical player name.
    slug = profile_url.rstrip("/").split("/")[-1]
    return " ".join(part.capitalize() for part in slug.split("-"))

def shirt_number_from_card(raw, canonical_name):
    # The official roster card repeats the accessible player label and places
    # the shirt number immediately before the second occurrence of the name.
    escaped = re.escape(canonical_name)
    match = re.search(r"\\b(\\d{1,2})\\s+" + escaped + r"\\b", raw, re.IGNORECASE)
    if match:
        number = int(match.group(1))
        return number if 1 <= number <= 99 else None
    # Fallback for cards whose accessible label begins with the number.
    match = re.match(r"\\s*(\\d{1,2})\\s+", raw)
    if match:
        number = int(match.group(1))
        return number if 1 <= number <= 99 else None
    return None

def valid_player_image(url):
    lower = url.lower()
    return (
        url.startswith("https://")
        and not any(word in lower for word in ("logo", "wappen", "placeholder", "default", "avatar"))
        and any(ext in lower for ext in (".jpg", ".jpeg", ".png", ".webp", "image/upload"))
    )

def get_squad():
    """Extract only first-team player cards and their actual embedded portraits from Eintracht's official roster."""
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
        canonical_name = clean_player_name(item["text"], item["profileUrl"])
        player = {
            "name": canonical_name,
            "position": item["position"],
            "profileUrl": item["profileUrl"]
        }
        card_number = shirt_number_from_card(item["text"], canonical_name)
        if card_number is not None:
            player["number"] = card_number
        images = [url for url in item["images"] if valid_player_image(url)]
        if images:
            player["photoUrl"] = images[0]
        try:
            profile_req = Request(item["profileUrl"], headers={"User-Agent": "Mozilla/5.0 (compatible; SGE-Analytics/1.0)"})
            with urlopen(profile_req, timeout=20) as response:
                profile_html = response.read().decode("utf-8", "replace")
            profile = ProfileParser()
            profile.feed(profile_html)
            body = " ".join(profile.parts)
            if "photoUrl" not in player:
                profile_images = re.findall(r'<img[^>]+(?:src|data-src)="(https://[^"]+)"', profile_html, re.IGNORECASE)
                image = next((url for url in profile_images if valid_player_image(url)), None)
                if image:
                    player["photoUrl"] = image
            number_match = re.search(r"(?:Rückennummer|Trikotnummer|Trikot-Nr\.?|#)\s*(\d{1,2})", body, re.IGNORECASE)
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
        players.append(player)
    if not players:
        raise RuntimeError("Keine Spielerprofile aus den vier offiziellen Kadergruppen gefunden")
    return {"status": "ok", "count": len(players), "players": players, "source": SOURCES["squad"]}

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
