# Season 6 Planner

Questo planner locale serve per studiare e usare in modo operativo la mappa Season 6 di Last War, prendendo come riferimento pubblico:

- mappa live Season 6 interactive
- guida live conquista Season 6

## File principali

- `index.html`: shell della pagina planner
- `../../assets/planner.js`: logica del planner, stato locale, simulazione percorsi
- `../../assets/styles.css`: stile del planner

## Dati usati

- `../../assets/data/season-6-territories.json`
- `../../assets/data/season-6-poi-points.json`
- `../../assets/data/season-6-strategic-poi.json`

## Documentazione di lavoro

Per sapere cosa e` stato fatto e cosa si sta facendo:

- `../../docs/season5-planner-worklog.md`

Per capire dati, fonti, assunzioni e metodo:

- `../../docs/season5-planner-data-method.md`

## Stato attuale

Il planner oggi supporta:

- grid multiple
- alleanze multiple
- assegnazione territori
- path planning
- import/export grid JSON
- simulazione di piu` piani di conquista Sanctuary
- confronto umano delle soluzioni proposte

## Nota importante

Il simulatore attuale e` uno strumento di supporto decisionale.
Non va considerato come una replica perfetta del motore di gioco reale.

Le proposte vanno validate a occhio confrontandole con:

- layout live della mappa
- regole di conquista Season 6
- esperienza pratica di alleanza
