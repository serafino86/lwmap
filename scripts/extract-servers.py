#!/usr/bin/env python3
"""Riestrae l'elenco server (stagione, settimana, regione) dal bundle pubblico.

Stessa logica di extract-season-data.py: il chunk cambia a ogni build del sito,
quindi si parte dalla pagina e si cerca quello che contiene davvero i server.

Uso:
    python3 scripts/extract-servers.py

Riscrive assets/data/servers.json. Il widget "server status" dell'hub legge
questo file: se non lo si riesegue, il contatore resta fermo alla stagione in cui
e` stata fatta l'ultima estrazione.
"""

import datetime
import json
import pathlib
import re
import urllib.request

BASE = "https://cpt-hedge.com"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "data" / "servers.json"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def candidate_chunks():
    """Chunk referenziati dalla pagina server piu` quelli del runtime webpack."""
    page = get(f"{BASE}/servers")
    urls = [BASE + p for p in re.findall(r"/_next/static/chunks/[A-Za-z0-9._/-]+\.js", page)]

    runtime = re.search(r"/_next/static/chunks/webpack-[a-f0-9]+\.js", page)
    if runtime:
        body = get(BASE + runtime.group())
        for chunk_id, chunk_hash in re.findall(r'(\d{2,4}):"([a-f0-9]{16})"', body):
            urls.append(f"{BASE}/_next/static/chunks/{chunk_id}.{chunk_hash}.js")

    seen = set()
    return [u for u in urls if not (u in seen or seen.add(u))]


def parse_servers(body):
    """Estrae gli oggetti server con scansione a parentesi bilanciate."""
    out = []
    for match in re.finditer(r'\{"id":"\d+","server":"State#', body):
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


def main():
    best = None
    for url in candidate_chunks():
        try:
            body = get(url)
        except Exception:
            continue
        servers = parse_servers(body)
        if servers and (best is None or len(servers) > len(best[1])):
            best = (url, servers)

    if best is None:
        raise SystemExit("nessun chunk con i server trovato")

    url, servers = best
    payload = {
        "c": servers,
        "extractedFrom": "public Next.js servers page bundle",
        "sourcePath": url.replace(BASE, ""),
        "extractedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"chunk  : {url}")
    print(f"server : {len(servers)}")
    for s in servers:
        if s.get("id") == "1105":
            print(f"1105   : season {s.get('currentSeason')}"
                  f"{' PS' if s.get('isPostSeason') else ''}, week {s.get('currentWeek')}")


if __name__ == "__main__":
    main()
