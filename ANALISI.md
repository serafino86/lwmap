# Analisi tecnica del sito analizzato

Data analisi: `2026-04-03`

## Stack osservato

- Framework: `Next.js`
- Routing: `App Router`
- Hosting: `Vercel`
- CDN / proxy: `Cloudflare`
- Stile: utility classes in stile `Tailwind`
- Font: `Geist`
- Tracking / terze parti:
  - `Simple Analytics`
  - `Google AdSense`
  - `Google Translate`

Indicatori concreti osservati:

- asset `/_next/static/...`
- script `main-app`, `app/page-*`, `app/layout-*`
- header HTTP `x-vercel-cache`, `x-matched-path`, `vary: RSC, Next-Router-State-Tree`
- presenza di `self.__next_f.push(...)` nell'HTML

## Architettura pubblica

Route principali osservate via sitemap:

- `/`
- `/maps`
- `/maps/planner`
- `/maps/season-1/interactive`
- `/maps/season-2/interactive`
- `/maps/season-2/supplies`
- `/maps/season-3/interactive`
- `/maps/season-3/artifacts`
- `/maps/season-4/interactive`
- `/maps/season-6/interactive`
- `/calculators`
- `/calculators/*`
- `/events`
- `/events/ammo-bonanza`
- `/events/desert-treasure`
- `/events/train-conductor`
- `/events/virus-resistance`
- `/guides`
- `/guides/*`
- `/buildings`
- `/buildings/*`
- `/servers`
- `/contact`

## Conclusioni sul backend

Conclusione pratica: non emerge un backend applicativo pesante.

Quello che ho verificato:

- Homepage: contenuti gia` incorporati nel bundle o nell'HTML.
- `events/ammo-bonanza`: la simulazione gira nel browser.
- `servers`: i dati sono dentro un JSON enorme bundlato nel JS client.
- `maps/planner`: e` una mini-app SVG client-side con persistenza in `localStorage`.

Quindi:

- esiste quasi certamente codice server di `Next.js` per rendering, routing e metadata;
- non ho trovato prove di API runtime indispensabili per le feature analizzate;
- il path `/api/` e` bloccato in `robots.txt`, ma questo non basta a dimostrare un backend importante.

## Evidenze specifiche

### 1. `Ammo Bonanza` e` client-side

Nel bundle della pagina:

- usa `Math.random()`;
- esegue `5000` simulazioni;
- aggiorna il progresso con `setTimeout(..., 0)`;
- non fa `fetch()` per il calcolo.

Questo significa che il calcolo e` locale, nel browser.

### 2. `Servers` e` client-side con dataset bundlato

Nel bundle della pagina `servers` compare un grande `JSON.parse(...)` con oggetti server del tipo:

- `id`
- `server`
- `timestamp`
- `seasonStartTimestamps`
- `currentSeason`
- `isPostSeason`
- `currentWeek`
- `updatedAt`
- `region`

La pagina mostra uno spinner iniziale ma poi carica il dataset direttamente dal bundle.

### 3. `Planner` e` una web app SVG locale

Nel chunk condiviso del planner ho verificato:

- canvas SVG a griglia;
- drag and drop;
- zoom e pan;
- touch handlers;
- export/import logico;
- persistenza in `localStorage`;
- gestione di elementi custom.

Chiavi osservate:

- `grid-planner-elements`
- `grid-planner-settings`
- `grid-planner-custom-elements`

## Come funziona davvero

### Homepage

- rendering iniziale server-side / prerender;
- componenti client per menu, animazioni e tema;
- dataset parzialmente statici dentro i chunk.

### Calcolatori

- UI renderizzata da pagine dedicate;
- logica numerica nel browser;
- nessuna dipendenza evidente da API.

### Servers

- dataset precompilato;
- filtri, sorting e virtualizzazione lato client;
- preferenze salvate in `localStorage`.

### Planner

- editor visivo SVG;
- griglia 50x50 di default;
- elementi predefiniti per stagioni e contesti;
- stato persistente locale;
- nessuna mappa esterna tipo Mapbox o Leaflet.

## Implicazione per il clone

Per studiarlo conviene separare il clone in quattro blocchi:

1. shell condivisa: navbar, tema, layout
2. pagina contenuti: homepage
3. tool numerici: calcolatore evento
4. tool dati: server list
5. tool visuali: planner SVG

Questo repo locale segue esattamente quella divisione.
