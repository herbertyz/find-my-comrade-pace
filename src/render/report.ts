/**
 * Renders the full results page: hero stats, course profile, pace strategy,
 * full segment table, and the printable pace band at the bottom.
 */
import {
  fmtMmss,
  fmtPace,
  fmtTime,
  PacedSegment,
  PacingResult,
} from "../pacing/model";
import { defaultFormValues, inputsToFormValues, renderForm } from "./form";
import { renderPaceBand } from "./paceBand";
import { SHARED_CSS } from "./styles";
import { THEME_INIT_SCRIPT, THEME_RUNTIME_SCRIPT, THEME_TOGGLE_HTML } from "./theme";

function ratingPill(r: number): string {
  // Same hue family as the pace-band cells: red for inclines, green for
  // declines, with +1 / -1 being lighter shades of +2 / -2.
  const colors: Record<number, string> = {
    [-2]: "#39ff14",   // big decline
    [-1]: "#a0ffa0",   // small decline (lighter green)
    [0]: "#8a93a6",    // flat
    [1]: "#ff8080",    // small incline (lighter red)
    [2]: "#ff0000",    // big incline
  };
  const labels: Record<number, string> = {
    [-2]: "−2",
    [-1]: "−1",
    [0]: "±0",
    [1]: "+1",
    [2]: "+2",
  };
  const c = colors[r];
  return `<span class="rating-pill" style="background:${c}1a;color:${c};border:1px solid ${c}40;">${labels[r]}</span>`;
}

function rowClass(r: number): string {
  switch (r) {
    case 2: return "r2";
    case 1: return "r1";
    case -1: return "rn1";
    case -2: return "rn2";
    default: return "r0";
  }
}

function tableRow(s: PacedSegment, startDelay: number): string {
  const cls = rowClass(s.rating);
  const delta = s.paceSecPerKm - s.gapSecPerKm;
  const deltaStr = (delta >= 0 ? "+" : "") + delta.toFixed(1) + "s";
  const deltaCls = delta > 5 ? "delta-bad" : delta < -5 ? "delta-good" : "delta-neutral";
  return (
    `<tr class="${cls}">` +
    `<td class="marker">${s.segmentLabel}</td>` +
    `<td class="num">${s.dEndKm.toFixed(3)}</td>` +
    `<td class="num">${s.lenKm.toFixed(2)}</td>` +
    `<td class="num">${s.eleEndM.toFixed(0)}</td>` +
    `<td class="num">${(s.netElevM >= 0 ? "+" : "") + s.netElevM.toFixed(0)}</td>` +
    `<td class="num">${(s.gradePct >= 0 ? "+" : "") + s.gradePct.toFixed(1)}%</td>` +
    `<td>${ratingPill(s.rating)}</td>` +
    `<td class="num pace">${fmtPace(s.gapSecPerKm)}</td>` +
    `<td class="num pace"><strong>${fmtPace(s.paceSecPerKm)}</strong></td>` +
    `<td class="num ${deltaCls}">${deltaStr}</td>` +
    `<td class="num pace">${fmtPace(s.segTimeSec)}</td>` +
    `<td class="num cum"><strong>${fmtTime(s.cumTimeSec)}</strong></td>` +
    `<td class="num cum-gun">${fmtTime(s.cumTimeSec + startDelay)}</td>` +
    `</tr>`
  );
}

export function renderReport(result: PacingResult): string {
  const totals = {
    ascent: result.totalAscentM,
    descent: result.totalDescentM,
    netClimb: result.totalAscentM - result.totalDescentM,
    bigClimbs: result.ratingsCount["2"] ?? 0,
    bigDescents: result.ratingsCount["-2"] ?? 0,
  };
  const baselineStr = fmtPace(result.baselineGap);
  const avgPace = result.runningTimeSec / result.totalKm;
  let gapTime = 0;
  for (const r of result.rows) gapTime += r.gapSecPerKm * r.lenKm;
  const avgGap = gapTime / result.totalKm;

  const formValues = inputsToFormValues(result.inputs);
  const fadeColor =
    avgPace - avgGap > 30 ? "var(--bad)" : avgPace - avgGap > 15 ? "var(--warn)" : "var(--good)";

  const checkpoints = result.rows
    .filter((r) => [80, 70, 60, 50, 40, 30, 20, 10, 0].includes(r.markerAtEnd))
    .map(
      (r) => `
      <div class="checkpoint">
        <div class="marker">Marker</div>
        <div class="marker-no">${r.markerAtEnd}</div>
        <div class="km">${r.dEndKm.toFixed(2)} km in</div>
        <div class="time">${fmtTime(r.cumTimeSec)}</div>
        <div class="km" style="margin-top:2px;font-style:italic;">gun ${fmtTime(r.cumTimeSec + result.inputs.startDelaySeconds)}</div>
      </div>`,
    )
    .join("");

  const tableRows = result.rows.map((r) => tableRow(r, result.inputs.startDelaySeconds)).join("");

  // Embed slim segment data for charts
  const chartData = {
    rows: result.rows.map((r) => ({
      lap: r.idx,
      marker: r.markerAtEnd,
      d_end_km: r.dEndKm,
      d_start_km: r.dStartKm,
      pace: r.paceSecPerKm,
      gap: r.gapSecPerKm,
      ele: r.eleEndM,
      grade: r.gradePct,
      rating: r.rating,
    })),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Find My Comrades Pace — ${fmtTime(result.gunTimeSec)} plan</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${THEME_INIT_SCRIPT}
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>${SHARED_CSS}
  .checkpoints { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
  .checkpoint { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; text-align: center; }
  .checkpoint .marker { font-size: 11px; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.06em; }
  .checkpoint .marker-no { font-size: 28px; font-weight: 700; line-height: 1; margin: 6px 0 4px; }
  .checkpoint .km { font-size: 12px; color: var(--text-dim); }
  .checkpoint .time { font-size: 16px; font-weight: 600; margin-top: 6px; font-variant-numeric: tabular-nums; }
  details > summary { font-size: 14px; padding: 10px 0; }
</style>
</head>
<body>
${THEME_TOGGLE_HTML}
<div class="wrap">
  <header>
    <h1>Find My Comrades Pace — ${fmtTime(result.gunTimeSec)} plan</h1>
    <div class="sub">Comrades 2026 Up Run · Durban → Pietermaritzburg · 85.777 km · baseline GAP <strong>${baselineStr}/km</strong></div>
  </header>

  <details id="inputs-card">
    <summary>Adjust inputs and re-run ▾</summary>
    ${renderForm(formValues, { embedded: true })}
  </details>

  <section class="hero">
    <div class="stat"><div class="k">Gun-time goal</div><div class="v">${fmtTime(result.gunTimeSec)}</div><div class="vsub">official Comrades clock</div></div>
    <div class="stat"><div class="k">Start delay</div><div class="v">${fmtMmss(result.inputs.startDelaySeconds)}</div><div class="vsub">cross start line</div></div>
    <div class="stat"><div class="k">Running time</div><div class="v">${fmtTime(result.runningTimeSec)}</div><div class="vsub">your watch at finish</div></div>
    <div class="stat"><div class="k">Distance</div><div class="v">${result.totalKm.toFixed(2)} km</div><div class="vsub">${(result.totalKm / 1.609344).toFixed(2)} mi</div></div>
    <div class="stat"><div class="k">Avg running pace</div><div class="v">${fmtPace(avgPace)}<span style="font-size:14px;color:var(--text-dim)"> /km</span></div><div class="vsub">over ${fmtTime(result.runningTimeSec)} of running</div></div>
    <div class="stat"><div class="k">Baseline GAP</div><div class="v">${baselineStr}<span style="font-size:14px;color:var(--text-dim)"> /km</span></div><div class="vsub">flat-equiv effort</div></div>
    <div class="stat"><div class="k">Net elevation</div><div class="v" style="color:var(--warn)">${(totals.netClimb >= 0 ? "+" : "") + totals.netClimb.toFixed(0)} m</div><div class="vsub">+${totals.ascent.toFixed(0)} / −${totals.descent.toFixed(0)} m</div></div>
    <div class="stat"><div class="k">Big climbs / descents</div><div class="v">${totals.bigClimbs} / ${totals.bigDescents}</div><div class="vsub">+2 / −2 ratings</div></div>
  </section>

  <h2>Key checkpoint times</h2>
  <div class="sub" style="margin-bottom:10px;">Top number = your watch (running time) · Bottom = official gun time</div>
  <div class="checkpoints">${checkpoints}</div>

  <h2>Course profile (up direction)</h2>
  <div class="panel">
    <div class="panel-header"><h3>Elevation</h3><div class="meta">Durban (sea level) → PMB (~632 m) · cells coloured by grade rating</div></div>
    <div class="chart-box tall"><canvas id="elevChart"></canvas></div>
    <div class="legend">
      <span><span class="swatch" style="background:#ff0000"></span>+2 big incline</span>
      <span><span class="swatch" style="background:#ff8080"></span>+1 small incline</span>
      <span><span class="swatch" style="background:#a0ffa0"></span>−1 small decline</span>
      <span><span class="swatch" style="background:#39ff14"></span>−2 big decline</span>
    </div>
  </div>

  <h2>Pace strategy</h2>
  <div class="panel">
    <div class="panel-header"><h3>GAP target vs actual pace per km segment</h3><div class="meta">lower = faster · cells coloured by grade rating</div></div>
    <div class="chart-box tall"><canvas id="paceChart"></canvas></div>
    <div class="legend">
      <span><span class="swatch" style="background:#6ea8fe"></span>Pace</span>
      <span><span class="swatch" style="background:#c084fc"></span>GAP</span>
      <span style="margin-left:8px;color:var(--text-dim);">·</span>
      <span><span class="swatch" style="background:#ff0000"></span>+2</span>
      <span><span class="swatch" style="background:#ff8080"></span>+1</span>
      <span><span class="swatch" style="background:#a0ffa0"></span>−1</span>
      <span><span class="swatch" style="background:#39ff14"></span>−2</span>
    </div>
  </div>

  <h2>Pacing rules applied</h2>
  <div class="grid-2">
    <div class="notes">
      <strong>Effort allocation</strong>
      <ul>
        <li><strong>Conservative start:</strong> first 3 km at GAP <code>${baselineStr} + 10s</code>, then linear ramp to baseline by km 6 (built-in default).</li>
        <li><strong>Big inclines (rating +2):</strong> hold baseline GAP + <code>${result.inputs.inclineGapAdjSec}s</code> — pace will naturally slow per the grade.</li>
        <li><strong>Big descents (rating −2, &gt;3% downhill):</strong> GAP + <code>${result.inputs.declineGapAdjSec}s</code> — protect the quads; don't bomb the descents.</li>
        <li><strong>Heat fade:</strong> GAP gradually drifts +0 → +<code>${result.inputs.midFadeSec}s</code>/km from km 30 → 60, then +<code>${result.inputs.midFadeSec}s</code> → +<code>${result.inputs.lastFadeSec}s</code>/km from km 60 → finish.</li>
      </ul>
    </div>
    <div class="notes">
      <strong>Grade-to-pace conversion</strong>
      <ul>
        <li>Quadratic: <code>pace = GAP × (1 + 0.026·g + 0.002·g²)</code> where <code>g</code> is grade in %.</li>
        <li>+5% grade → pace ≈ GAP × 1.18 (≈18% slower)</li>
        <li>−5% grade → pace ≈ GAP × 0.92 (≈8% faster)</li>
        <li><strong>Rating thresholds</strong> (per 1 km segment): +2 &gt; 3%, +1 &gt; 1%, ±0 within ±1%, −1 &lt; −1%, −2 &lt; −3%.</li>
      </ul>
    </div>
  </div>

  <h2>Full pacing table — ${result.rows.length} segments</h2>
  <div class="table-wrap">
    <div class="table-scroll">
      <table class="pace">
        <thead>
          <tr>
            <th>Marker</th><th>Cum km</th><th>Len km</th>
            <th>Elev m</th><th>Δ Elev</th><th>Grade</th>
            <th>Rating</th><th>GAP /km</th><th>Pace /km</th>
            <th>Δ pace</th><th>Lap time</th>
            <th>Cum (watch)</th><th>Gun time</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>

  <h2>How to use this plan</h2>
  <div class="notes">
    <ul>
      <li><strong>The marker column</strong> shows the segment. <code>Start→85</code> is the partial first 0.777 km. <code>85→84</code> is the 1 km between markers 85 and 84. <code>1→0</code> is the final km to the finish.</li>
      <li><strong>The Cum km column</strong> is the cumulative distance at the <em>end</em> of that segment (i.e. where the marker is on the road).</li>
      <li><strong>Cum (watch)</strong> is the time your watch should show as you pass the marker — it starts ticking when you cross the start line. <strong>Gun time</strong> = watch time + your <code>${fmtMmss(result.inputs.startDelaySeconds)}</code> start delay. This is the official Comrades clock reading, what's used for cutoffs.</li>
      <li><strong>The Pace column is your running pace</strong> for that segment — what to target on the watch screen. The GAP column shows the underlying effort (flat-equivalent pace) — useful if you want to think in terms of effort rather than pace.</li>
      <li><strong>The Rating column</strong> tells you what to expect for that segment: +2/−2 are the dramatic sections, ±0 is flat. On +1 and +2 hold form and don't push the pace; on −2 deliberately ease back (the GAP buffer is already built in).</li>
      <li><strong>This is the up run</strong> — net climbing, with the famous big climbs (Cowies / Fields / Botha's / Inchanga / Polly Shortts). The plan front-loads the climbing into the first ~70 km and gives you a slight downhill into PMB. Don't chase the early sea-level pace; let the hills come to you.</li>
      <li><strong>The pace band below</strong> can be screen-shotted for printing, or download it as a JPG with the button at the bottom.</li>
    </ul>
  </div>

  <h2>Printable pace band (40 × 190 mm)</h2>
  ${renderPaceBand(result)}
</div>

<script>
const DATA = ${JSON.stringify(chartData)};

function fmtPace(secs) {
  if (secs == null || isNaN(secs)) return '--';
  const m = Math.floor(secs / 60);
  const r = Math.round(secs - m * 60);
  return m + ':' + String(r).padStart(2, '0');
}

// Read theme-driven colors from CSS variables so charts re-skin when the
// user toggles light/dark.
function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    text: cs.getPropertyValue('--text-dim').trim() || '#8a93a6',
    grid: cs.getPropertyValue('--grid').trim() || 'rgba(255,255,255,0.06)',
    overlays: {
      '2':  cs.getPropertyValue('--r2-overlay').trim()  || 'rgba(255,0,0,0.18)',
      '1':  cs.getPropertyValue('--r1-overlay').trim()  || 'rgba(255,255,0,0.13)',
      '0':  'rgba(0,0,0,0)',
      '-1': cs.getPropertyValue('--rn1-overlay').trim() || 'rgba(0,255,255,0.13)',
      '-2': cs.getPropertyValue('--rn2-overlay').trim() || 'rgba(57,255,20,0.18)'
    }
  };
}

let __theme = themeColors();
Chart.defaults.color = __theme.text;
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
Chart.defaults.font.size = 11;

// Per-segment rating-coloured background; reads CSS variables on every draw
// so a theme toggle is reflected on the next chart.update().
const ratingBandsPlugin = {
  id: 'ratingBands',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!scales.x || !chartArea) return;
    const overlays = __theme.overlays;
    DATA.rows.forEach(r => {
      const x0 = scales.x.getPixelForValue(r.d_start_km);
      const x1 = scales.x.getPixelForValue(r.d_end_km);
      ctx.fillStyle = overlays[String(r.rating)];
      ctx.fillRect(x0, chartArea.top, x1 - x0, chartArea.bottom - chartArea.top);
    });
  }
};
Chart.register(ratingBandsPlugin);

const elev = DATA.rows.map(r => ({ x: r.d_end_km, y: r.ele }));
const paces = DATA.rows.map(r => ({ x: r.d_end_km, y: r.pace }));
const gaps = DATA.rows.map(r => ({ x: r.d_end_km, y: r.gap }));

const elevChart = new Chart(document.getElementById('elevChart'), {
  type: 'line',
  data: {
    datasets: [{ label: 'Elevation', data: elev, borderColor: '#7dd3a0', backgroundColor: 'rgba(125,211,160,0.18)', borderWidth: 1.5, pointRadius: 0, fill: 'origin', tension: 0.2 }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { title: c => 'km ' + Number(c[0].parsed.x).toFixed(2), label: c => c.parsed.y.toFixed(0) + ' m' } } },
    scales: {
      x: { type: 'linear', grid: { color: __theme.grid }, title: { display: true, text: 'Distance (km from start)' }, min: 0, max: 86 },
      y: { grid: { color: __theme.grid }, title: { display: true, text: 'Elevation (m)' } }
    }
  }
});

const paceChart = new Chart(document.getElementById('paceChart'), {
  type: 'line',
  data: {
    datasets: [
      { label: 'Pace', data: paces, borderColor: '#6ea8fe', borderWidth: 2, pointRadius: 0, tension: 0.2 },
      { label: 'GAP', data: gaps, borderColor: '#c084fc', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, tension: 0.2 }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { callbacks: { title: c => 'km ' + Number(c[0].parsed.x).toFixed(2), label: c => c.dataset.label + ': ' + fmtPace(c.parsed.y) + '/km' } } },
    scales: {
      x: { type: 'linear', grid: { color: __theme.grid }, title: { display: true, text: 'Distance (km from start)' }, min: 0, max: 86 },
      y: { grid: { color: __theme.grid }, reverse: true, ticks: { callback: v => fmtPace(v) }, title: { display: true, text: 'Pace (min:sec / km)' } }
    }
  }
});

// Re-skin charts when the theme toggles.
window.__paceCharts = [elevChart, paceChart];
window.addEventListener('themechange', function() {
  __theme = themeColors();
  Chart.defaults.color = __theme.text;
  window.__paceCharts.forEach(function(ch) {
    if (!ch || !ch.options || !ch.options.scales) return;
    Object.keys(ch.options.scales).forEach(function(key) {
      if (ch.options.scales[key] && ch.options.scales[key].grid) {
        ch.options.scales[key].grid.color = __theme.grid;
      }
    });
    ch.update();
  });
});
</script>
${THEME_RUNTIME_SCRIPT}
</body>
</html>`;
}

export function renderLandingPage(): string {
  const values = defaultFormValues();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Find My Comrades Pace — pacing strategy &amp; printable pace band</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${THEME_INIT_SCRIPT}
<style>${SHARED_CSS}</style>
</head>
<body>
${THEME_TOGGLE_HTML}
<div class="wrap">
  <header>
    <h1>Find My Comrades Pace</h1>
    <div class="sub">Build a personalised pacing strategy and printable pace band for the Comrades Marathon 2026 Up Run (Durban → PMB, 85.777 km).</div>
  </header>

  <h2>Tell me about your race</h2>
  ${renderForm(values, { embedded: false })}

  <div class="insight">
    <strong>How it works.</strong> The course is taken from a real GPS track of the 2024 Up Run, scaled to the official 85.777 km and split into 86 marker segments. Your goal time and pacing rules are used to solve for a baseline grade-adjusted pace (GAP), then per-km paces are derived from the local grade and the heat-fade curve. The output is a full pacing plan and a printable pace band sized to 40 × 190 mm — pin it to your race kit and check yourself against the elapsed time at every km marker.
  </div>
  <div class="insight good">
    <strong>Defaults.</strong> The form is pre-filled with the "even-effort, conservative-start, heat-aware" defaults validated against an actual 90 km ultra performance. Tweak the GAP and fade values to model your own discipline (e.g. set <em>GAP adjustment for incline</em> to <code>5</code> if you tend to push too hard up Cowies/Polly).
  </div>
  <div class="insight">
    <strong>No data is stored.</strong> Your inputs are turned into a URL and the report is generated server-side on every request. Bookmark the result URL to come back to your plan.
  </div>
</div>
${THEME_RUNTIME_SCRIPT}
</body>
</html>`;
}
