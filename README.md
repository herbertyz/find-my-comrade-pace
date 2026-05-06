# find-my-comrade-pace

A tiny web service that turns the Comrades Marathon course into a personalised
pacing strategy and a printable pace band, given the runner's goal time and a
few effort-budgeting rules.

It's the same model that produced [my own 2026 Up Run plan][reference] (7:20:00
gun-time goal, 90 sec start delay, 4:52/km baseline GAP) — just packaged so
other runners can plug in their own inputs.

[reference]: https://en.wikipedia.org/wiki/Comrades_Marathon

## What the user sees

1. **Landing page** — a form with six inputs:
   - Goal time (gun, h:mm:ss)
   - Start delay (m:ss — time to cross the start line)
   - GAP adjustment for incline (sec/km — extra effort budget on big climbs)
   - GAP adjustment for decline (sec/km — quad protection on big descents)
   - Heat fade by km 60 (sec/km)
   - Heat fade by finish (sec/km)
2. **Report page** (`/report?goal=…`) — full pacing breakdown with elevation
   and pace charts, a 86-row segment table, and the printable pace band at the
   bottom. The form is embedded at the top so the user can tweak inputs and
   re-run.
3. **JPG download** — the pace band can be downloaded as a JPG via a button at
   the bottom of the report. The button loads `html2canvas` from a CDN on
   demand (no server-side image rendering, so no `node-canvas` dependency).

No customer data is stored — the report is regenerated from URL parameters on
every request.

## Running it

```bash
npm install
npm run build
npm start
# → http://localhost:3000
```

For local development:

```bash
npm run dev   # tsc --watch + nodemon
```

## How the model works

The course is taken from a real GPS track of the 2024 Up Run
(`public/COURSE_2024_up.gpx`, 1690 trackpoints), scaled so that the GPX total
length matches the official 85.777 km. The track is split into 86 official
marker segments: a 0.777 km partial from start to marker 85, then 85 segments
of exactly 1 km from marker 85 down to marker 0 (the finish in PMB).

Each segment gets a grade rating from −2 (big decline) to +2 (big incline)
based on average grade. The pacing algorithm then:

1. Picks a baseline GAP `X` (sec/km).
2. For each segment, computes a target GAP:
   - Plus 10 sec/km on the first 3 km, ramping linearly to 0 by km 6
     (conservative start, built-in default).
   - Plus the user's incline-GAP adjustment on rating +2 segments.
   - Plus the user's decline-GAP adjustment on rating −2 segments.
   - Plus a heat-fade curve that ramps from 0 at km 30 to `midFade` by km 60,
     and from `midFade` to `lastFade` by the finish.
3. Converts the target GAP to actual pace using a Strava-like quadratic
   `pace = GAP × (1 + 0.026·g + 0.002·g²)`, where `g` is the segment grade in
   percent.
4. Sums the predicted segment times and binary-searches `X` until the total
   running time equals `goalTime − startDelay`.

## Project layout

```
src/
  server.ts            ← Express server + input validation
  pacing/
    gpx.ts             ← GPX parser, haversine, smoothing
    model.ts           ← segments, grade rating, pace factor, solver
  render/
    form.ts            ← input form (used standalone and embedded)
    report.ts          ← results page (charts + table + pace band)
    paceBand.ts        ← HTML/CSS pace band + JPG download script
    styles.ts          ← shared CSS
public/
  COURSE_2024_up.gpx   ← bundled course data
```

## Deployment notes

The service is a single stateless Express process. Any platform that runs
Node 18+ will work (Render, Railway, Fly.io, a small VM, …). Bind to
`process.env.PORT` (already done in `server.ts`).

## Defaults — where they come from

The defaults are calibrated against a real 90 km ultra performance and the
2024 Up Run elevation profile:

| Input                               | Default | Reason                                       |
| ----------------------------------- | ------- | -------------------------------------------- |
| Goal time (gun)                     | 7:20:00 | Worked example                                |
| Start delay                         | 1:30    | Typical chip-vs-gun lag for a mid-pack start  |
| GAP adjustment for incline (+2)     | 0       | "Maintain GAP uphill" — runner-observed habit |
| GAP adjustment for decline (−2)     | 10      | Quad protection on steep descents              |
| Heat fade by km 60 (sec/km)         | 3       | Mild aerobic drift through the warm middle    |
| Heat fade by finish (sec/km)        | 6       | Cumulative heat strain over the day           |

## License

MIT — feel free to fork and adapt for other point-to-point ultras.
