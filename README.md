# オークション / Auction

Fork of [spoonya/pomojnyj-aukcion](https://github.com/spoonya/pomojnyj-aukcion) for Japanese streamers with an international (EN) audience.

Bilingual JP / EN overlay for live auctions — works as an OBS Browser Source on **GitHub Pages** (no VPS).

## Live

https://zisam.github.io/streamer-auction/

## Features

- Lot list with totals and bid input
- Bank total
- Timer (start / stop, ± minutes)
- Undo / redo history
- Local storage (survives refresh)

## Usage (OBS)

1. Open the Pages URL in a browser once to confirm it loads.
2. OBS → Sources → Browser → paste the URL.
3. Suggested size: **1920×1080** (or crop to the panel you need).

## Tests

```bash
npm test
```

Runs unit tests for bids, bank totals, timer math, and roulette weighting (`test/auction-core.test.mjs`).

## Pre-stream checklist

1. `npm test` — all green  
2. Open https://zisam.github.io/streamer-auction/build/index.html?v=tests1 (Ctrl+F5)  
3. Add 2–3 lots with amounts → bank updates  
4. Start / pause timer, ±1 / =10  
5. Spin roulette (weighted on/off)  
6. OBS: Browser Source → that URL, size ~1920×1080  
7. Optional: send the streamer a 30-sec Loom/screen recording of the flow  

## Local development

```bash
npm install
npm start    # gulp + browser-sync
npm run build
```

> Original gulp stack is old (`node-sass`). Prefer **Node 14–16** via nvm if install fails on Node 20+.

The `build/` folder is committed so GitHub Pages works without a CI build.

## License

Based on the upstream project (ISC).
