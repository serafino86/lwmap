# Season 6 – dati e metodo

Ultimo aggiornamento: 2026-09-01

## Cosa e` la Season 6

Mappa **Lost / Shadow Rainforest**. Due clan rivali, **Wetland** e **Deepwood**, si
contendono 8 warzone piu` un'area centrale. La mappa e` speculare: le due meta`
partono da posizioni identiche.

## Fonte dei dati

Gli stessi dati che alimentano la mappa interattiva pubblica, letti dal bundle
JavaScript del sito (Next.js). Il chunk che li contiene ha nome `<id>.<hash>.js`
e **cambia a ogni build del sito**, quindi non va hardcodato.

Estrazione riproducibile:

```bash
python3 scripts/extract-season-data.py --season 6
```

Lo script:

1. scarica `/maps/season-6/interactive`;
2. legge il runtime webpack referenziato dalla pagina;
3. scarica i chunk mappati nel runtime;
4. tiene quello con piu` occorrenze di `"coordinates":{"x":`;
5. estrae gli oggetti territorio con scansione a parentesi bilanciate;
6. riscrive i tre dataset in `assets/data/`.

Ogni file generato porta la propria provenienza (`sourcePath`, `extractedAt`),
cosi` si sa sempre da quale build vengono i numeri.

## Dataset prodotti

| File | Contenuto |
|---|---|
| `season-6-territories.json` | dataset raw come pubblicato |
| `season-6-poi-points.json` | 1768 punti normalizzati per il planner |
| `season-6-strategic-poi.json` | 136 punti strategici (capital + nexus + outpost) |

## Struttura della mappa

- 8 warzone: prefissi id `A`–`H`, **221 territori ciascuna**, perfettamente simmetriche
- estensione 0–2950 su entrambi gli assi (viewBox 3000×3000, come la stagione precedente)
- 1768 territori totali

### Composizione

| Nome pubblicato | Categoria planner | Quantita` |
|---|---|---|
| Fishing Ground | `fishing_ground` | 960 |
| Wetland / Deepwood Village | `regional_zone` | 400 |
| Wetland / Deepwood Barracks | `barracks` | 160 |
| Wetland / Deepwood Assembly | `nexus` | 96 |
| Trade Post | `trade_post` | 80 |
| Warzone Outpost | `outpost` | 32 |
| Console | `console` | 32 |
| Wetland / Deepwood Sanctuary | `capital` | 8 |

### Campi di un territorio

`id`, `name`, `level`, `isCapitol`, `buff{item,percentage}`,
`coordinates{x,y,width,height}`, `resources{influence}`.

I Sanctuary sono gli unici `isCapitol`: livello 7, buff `march speed +10%`,
**200.000 influence** ciascuno. Ce ne sono 4 Wetland e 4 Deepwood, uno per warzone.

## Cosa e` cambiato rispetto alla stagione precedente

- non esiste piu` un obiettivo centrale unico: gli obiettivi capital sono **8**,
  uno per warzone, non uno solo al centro della mappa;
- niente CrystalGold: i buff sono `coin` e `march speed`;
- Assembly prende il posto del nodo strategico di warzone;
- Fishing Ground e` il nodo risorsa diffuso.

## Aperto – da fare

1. **Regole di conquista Season 6**: finestre di attacco, condizione di adiacenza
   ai Sanctuary, influence per obiettivo, scadenze territori. Vanno trascritte
   dalla guida pubblica. Finche` non ci sono, il planner non mostra numeri:
   meglio nessuna regola che le regole della stagione sbagliata.
2. **Simulazione con 8 capital**: il motore cerca *un* punto `capital` e simula la
   rotta verso quello. Con 8 Sanctuary va scelto quello della warzone
   dell'alleanza, non il primo dell'elenco.
3. **Guida Season 6**: la guida della stagione precedente e` stata rimossa. La
   struttura HTML e i testi nelle 4 lingue sono recuperabili dalla storia git
   (`git show ac12975:guide/index.html`) come impalcatura.
4. **Mappa alimentata da Google Sheet**: obiettivo dichiarato — le assegnazioni
   territori dell'alleanza devono arrivare da un foglio condiviso via Apps Script,
   come il resto dell'hub. Da progettare.
5. **Elementi decorativi del planner**: `assets/data/planner-elements.json` punta a
   `/images/planner/season-6/...`; i nomi dei file sono ancora quelli del set
   precedente (miniere, torri, binari) e vanno verificati sul set Season 6.
