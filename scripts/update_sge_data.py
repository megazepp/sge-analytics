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

def get_squad():
    """Best-effort extraction from the official public squad page; never fabricate."""
    try:
        req = Request(SOURCES["squad"], headers={"User-Agent": "Mozilla/5.0 (compatible; SGE-Analytics/1.0)"})
        with urlopen(req, timeout=30) as response:
            html = response.read().decode("utf-8", "replace")
        parser = TextExtractor()
        parser.feed(html)
        text = " ".join(parser.parts)
        # Restrict parsing to the player section and keep only the first player
        # card for each shirt number; the page repeats names in accessibility text.
        text = re.split(r"Sportdirektor|Sporting director|Trainerteam", text, maxsplit=1)[0]
        matches = re.findall(r"(?<!\d)(\d{1,2})\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+){1,3})", text)
        players, seen_numbers = [], set()
        for number, name in matches:
            number = int(number)
            if number in seen_numbers or number > 99:
                continue
            seen_numbers.add(number)
            players.append({"number": number, "name": name.strip()})
        return {"status": "ok" if players else "unparsed", "players": players, "source": SOURCES["squad"]}
    except Exception as exc:
        return {"status": "unavailable", "players": [], "source": SOURCES["squad"], "note": str(exc)}

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
