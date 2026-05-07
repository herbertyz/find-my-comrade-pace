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

## Design decisions

A short tour of the *why* behind choices that aren't obvious from the code,
for whoever picks this up next.

### Course modeling

- **Course is a static asset, not user-uploaded.** The Up Run is the same
  route every other year, so `public/COURSE_2024_up.gpx` (1 690 GPS points,
  Garmin Connect export of an actual finisher's track) is bundled in and
  parsed once at server start. No GPX upload UI to maintain.
- **GPX distance is scaled to the official 85.777 km.** Raw GPX measures
  86.38 km because of GPS noise / corner-cutting. We multiply every
  cumulative distance by `85777 / total_gpx_m` (≈ 0.993) so segment
  boundaries land on the real km markers.
- **86 segments, not 85.** Comrades is signed with markers showing *km
  remaining*. The first marker (`85`) is at race-km 0.777; thereafter every
  marker is 1 km apart, ending at marker `0` at km 85.777. So segment 0 is
  the partial 0.777 km from start to marker 85; segments 1–85 are 1 km each.
- **Elevation is smoothed with a 100 m moving average** before grade is
  computed. GPS altitude is noisy enough that raw deltas would produce a
  spiky grade profile and unstable pace targets.

### Pacing model

- **GAP → actual-pace conversion** uses the Strava-like quadratic
  `pace = GAP × (1 + 0.026·g + 0.002·g²)`, calibrated to +5 % → 1.18× and
  −5 % → 0.92×. A polynomial gives the right asymmetry (climbing costs more
  than descending saves) without needing the full Minetti energy curve.
- **Grade rating thresholds** are ±1 % (small) and ±3 % (big). At 1 km
  averages on Comrades, almost no segments exceed ±7 %, so finer thresholds
  would just add noise.
- **Conservative start is hard-coded, not exposed.** First 3 km add 10 sec/km
  to GAP, then linear ramp to 0 by km 6. Reflects the "every Comrades coach
  ever" advice; making it a knob bloats the form for negligible upside.
- **Heat fade is two-phase linear.** 0 → `midFade` from km 30 to 60, then
  `midFade` → `lastFade` to the finish. Two parameters expose enough control
  for users to model "I'm strong in heat" (low values) vs "I melt at noon"
  (higher values) without overfitting.
- **The "+ GAP penalty on big descents" rule applies to rating −2 only**,
  not −1. The intent is *quad protection on the dramatic drops* (Polly,
  Botha's), not on every gentle slope. Same for the +2-only incline rule.
- **Baseline GAP is solved via binary search** (80 iterations, no early-out).
  At ~100 µs per iteration that's invisible; precision is well below
  sub-second on the total time. Avoids any analytic-inverse complexity.

### Architecture

- **Stateless Express, no database.** Inputs go in the URL query string;
  every report is recomputed on each request (~5 ms). URLs are bookmarkable
  and shareable, which is the only "persistence" runners need.
- **Server-rendered HTML, no SPA.** Pages are template strings. Chart.js
  loaded from CDN, html2canvas (now removed) was loaded the same way.
  Keeps the build simple — `tsc` is the only build step.
- **GPX parsed once at startup.** `loadSegments()` runs in module scope and
  the resulting `Segment[]` is cached for the process lifetime.

### Pace-band rendering

- **Two parallel renderings, by design.** HTML/CSS for the on-screen band
  (so users can screenshot a clean DOM that scales with their browser zoom);
  native `<canvas>` for the JPG download. The canvas renderer is byte-faithful
  to the original Python output: 40 × 190 mm at 305 DPI.
- **`html2canvas` was tried first and rejected.** It choked on CSS
  `linear-gradient` ticks — `createPattern` saw zero-size canvases. Native
  canvas drawing is simpler, more reliable, and avoids ~40 KB of JS.
- **No `node-canvas` dependency.** Doing the JPG on the client (browser
  canvas → `toDataURL`) avoids a native binary dep on the server, which
  matters for free-tier deploys (Render, Fly).
- **Cell-boundary ticks were tried, then deleted.** Two attempts:
  CSS-gradient backgrounds (broke `html2canvas`), then real `<div class="tick">`
  elements at row dividers (cluttered visually). Final answer: colors alone
  separate the cells, which is enough.
- **Text contrast.** Black bold text + thick white outline — both
  `text-shadow` (8-direction sharp offsets, cross-browser) and
  `paint-order: stroke fill` + `-webkit-text-stroke` for modern browsers.
  On the JPG, `strokeText` with `lineWidth=8` and `lineJoin="round"` gives
  the same effect.

### Color palette for grade ratings

- **Iterated through three palettes.** Original Python: red / yellow /
  white / cyan / green. Yellow-for-incline confused users (yellow doesn't
  read as "up"). Final palette: red / light-red / white / light-green /
  green — same hue progression for ±1 and ±2.
- **+1 and −1 are lighter shades, not different hues.** Cells use 50 % mixes
  with white (`#ff8080`, `#a0ffa0`); chart overlays use the *same* RGB as
  ±2 with lower alpha. Means the legend swatch and the chart shading are
  visually unambiguous.
- **The pace band is always white-background / black-ink** regardless of
  theme — it's meant to be printed.

### Theme system

- **Auto-follow OS preference, override in localStorage.** Inline
  `<head>` script sets `data-theme` *before* first paint to avoid flash.
  An OS theme change is followed live only if the user hasn't pinned a
  preference via the toggle button.
- **Charts re-skin without page reload.** A `themechange` window event
  listener re-reads CSS variables and calls `chart.update()` on each chart;
  rating-overlay alphas are tuned per theme via CSS variables, so the
  same plugin code produces sensible tints in both modes.

### What's intentionally NOT exposed in the form

- The conservative-start curve (10 s first 3 km, ramp to km 6).
- Grade-rating thresholds (±1 %, ±3 %).
- Pace-factor coefficients (`0.026`, `0.002`).
- Heat-fade segmentation points (km 30 / 60 / finish).
- The +10/−10 rules' restriction to rating ±2 only.

These are *opinions* baked into the model, tunable in `src/pacing/model.ts`
if you understand the trade-offs. Exposing them would turn the form into
a pacing-rules-engine UI, which is a different product.

### Open questions / future work

- A **"reset to defaults"** button on the form (currently the user has to
  retype values).
- A **`/api/plan` JSON endpoint** so people can build their own UIs or
  watch faces around the model.
- **Course profiles for other races.** Move `OFFICIAL_M / OFFICIAL_KM` and
  the GPX path into a `Course` interface, keep one course per file in
  `public/`, add a course picker.
- **Server-side JPG rendering** if anyone needs it for embedding (email
  attachments, automated PDFs). `node-canvas` would do it, but only worth
  it once that requirement appears.

## License

MIT — feel free to fork and adapt for other point-to-point ultras.
