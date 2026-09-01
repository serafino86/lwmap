#!/usr/bin/env python3
"""Estrae i dataset di una stagione dal bundle JavaScript pubblico della mappa interattiva.

Il sito sorgente e` una app Next.js: i territori vivono dentro un chunk lazy il cui
nome (id + hash) cambia a ogni build. Lo script quindi non hardcoda il chunk:
parte dalla pagina, legge il runtime webpack, scarica i chunk mappati e tiene
quello che contiene davvero i territori.

Uso:
    python3 scripts/extract-season-data.py --season 6

Produce in assets/data/:
    season-<n>-territories.json    dataset raw come pubblicato
    season-<n>-poi-points.json     modello punti normalizzato usato dal planner
    season-<n>-strategic-poi.json  sottoinsieme strategico (capital + outpost)
"""

import argparse
import datetime
import json
import pathlib
import re
import urllib.request

BASE = "https://cpt-hedge.com"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "assets" / "data"

# Come i nomi pubblicati diventano le categorie che il planner sa interpretare.
CATEGORY_BY_NAME = {
    "Fishing Ground": "fishing_ground",
    "Trade Post": "trade_post",
    "Warzone Outpost": "outpost",
    "Console": "console",
    "Wetland Village": "regional_zone",
    "Deepwood Village": "regional_zone",
    "Wetland Barracks": "barracks",
    "Deepwood Barracks": "barracks",
    "Wetland Assembly": "nexus",
    "Deepwood Assembly": "nexus",
    "Wetland Sanctuary": "capital",
    "Deepwood Sanctuary": "capital",
    "Stronghold": "stronghold_territory",
}
STRATEGIC_CATEGORIES = ("capital", "nexus", "outpost")
SHORT_LABELS = {
    "Fishing Ground": "FG",
    "Trade Post": "TP",
    "Warzone Outpost": "WO",
    "Console": "CN",
    "Wetland Village": "WV",
    "Deepwood Village": "DV",
    "Wetland Barracks": "WB",
    "Deepwood Barracks": "DB",
    "Wetland Assembly": "WA",
    "Deepwood Assembly": "DA",
    "Wetland Sanctuary": "WS",
    "Deepwood Sanctuary": "DS",
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def find_season_chunk(season):
    """Ritorna (url, testo) del chunk che contiene i territori della stagione."""
    page = get(f"{BASE}/maps/season-{season}/interactive")
    webpack_path = re.search(r"/_next/static/chunks/webpack-[a-f0-9]+\.js", page)
    if not webpack_path:
        raise SystemExit("runtime webpack non trovato nella pagina")
    runtime = get(BASE + webpack_path.group())

    candidates = re.findall(r'(\d{2,4}):"([a-f0-9]{16})"', runtime)
    best = None
    for chunk_id, chunk_hash in candidates:
        url = f"{BASE}/_next/static/chunks/{chunk_id}.{chunk_hash}.js"
        try:
            body = get(url)
        except Exception:
            continue
        hits = len(re.findall(r'"coordinates":\{"x":', body))
        if hits and (best is None or hits > best[2]):
            best = (url, body, hits)
    if best is None:
        raise SystemExit("nessun chunk con territori trovato")
    return best[0], best[1]


def parse_territories(body):
    """Estrae gli oggetti territorio con scansione a parentesi bilanciate."""
    out = []
    for match in re.finditer(r'\{"id":"[A-Z]+\d+","name":', body):
        start = match.start()
        depth = 0
        for i in range(start, len(body)):
            if body[i] == "{":
                depth += 1
            elif body[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        out.append(json.loads(body[start : i + 1]))
                    except ValueError:
                        pass
                    break
    return out


def to_poi(territory):
    coords = territory["coordinates"]
    name = territory["name"]
    width = coords["width"]
    height = coords["height"]
    return {
        "id": "poi:" + territory["id"],
        "sourceId": territory["id"],
        "sourceName": name,
        "category": CATEGORY_BY_NAME.get(name, "unknown"),
        "label": name,
        "shortLabel": SHORT_LABELS.get(name, name[:2].upper()) + str(territory.get("level", "")),
        "level": territory.get("level"),
        "x": coords["x"] + width // 2,
        "y": coords["y"] + height // 2,
        "gridX": coords["x"] // 50,
        "gridY": coords["y"] // 50,
        "width": width,
        "height": height,
        "buff": territory.get("buff"),
        "resources": territory.get("resources"),
        "isCapitol": bool(territory.get("isCapitol")),
        "meta": {"warzone": re.match(r"[A-Z]+", territory["id"]).group()},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", type=int, default=6)
    args = parser.parse_args()
    season = args.season

    url, body = find_season_chunk(season)
    territories = parse_territories(body)
    if not territories:
        raise SystemExit("chunk trovato ma nessun territorio estratto")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    provenance = {
        "season": season,
        "extractedFrom": f"public Season {season} territories chunk",
        "sourcePath": url.replace(BASE, ""),
        "extractedAt": now,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write(DATA_DIR / f"season-{season}-territories.json", dict(provenance, territories=territories))

    poi = [to_poi(t) for t in territories]
    write(DATA_DIR / f"season-{season}-poi-points.json", dict(provenance, poi=poi))

    strategic = [p for p in poi if p["category"] in STRATEGIC_CATEGORIES]
    write(DATA_DIR / f"season-{season}-strategic-poi.json", dict(provenance, poi=strategic))

    print(f"chunk      : {url}")
    print(f"territori  : {len(territories)}")
    print(f"poi        : {len(poi)}")
    print(f"strategici : {len(strategic)}")


def write(path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
