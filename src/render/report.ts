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

function ratingPill(r: number): string {
  const colors: Record<number, string> = {
    [-2]: "#5dadff",
    [-1]: "#92c4ff",
    [0]: "#8a93a6",
    [1]: "#ffb476",
    [2]: "#ff8a5d",
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
    <div class="stat"><div class="k">Avg running pace</div><div class="v">${fmtPace(avgPace)}<span style="font-size:14px;color:var(--text-dim)"> /km</span></div><div class="vsub">${fmtPace(avgGap)}/km avg GAP</div></div>
    <div class="stat"><div class="k">Net elevation</div><div class="v" style="color:var(--warn)">${(totals.netClimb >= 0 ? "+" : "") + totals.netClimb.toFixed(0)} m</div><div class="vsub">+${totals.ascent.toFixed(0)} / −${totals.descent.toFixed(0)} m</div></div>
    <div class="stat"><div class="k">Big climbs / descents</div><div class="v">${totals.bigClimbs} / ${totals.bigDescents}</div><div class="vsub">+2 / −2 ratings</div></div>
  </section>

  <h2>Key checkpoint times</h2>
  <div class="sub" style="margin-bottom:10px;">Top number = your watch (running time) · Bottom = official gun time</div>
  <div class="checkpoints">${checkpoints}</div>

  <h2>Course profile (up direction)</h2>
  <div class="panel">
    <div class="panel-header"><h3>Elevation</h3><div class="meta">Durban (sea level) → PMB (~632 m)</div></div>
    <div class="chart-box tall"><canvas id="elevChart"></canvas></div>
  </div>

  <h2>Pace strategy</h2>
  <div class="panel">
    <div class="panel-header"><h3>GAP target vs actual pace per km segment</h3><div class="meta">lower = faster</div></div>
    <div class="chart-box tall"><canvas id="paceChart"></canvas></div>
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

Chart.defaults.color = '#8a93a6';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
Chart.defaults.font.size = 11;
const gridColor = 'rgba(255,255,255,0.06)';

const labels = DATA.rows.map(r => r.marker);
const elev = DATA.rows.map(r => r.ele);
const xKm = DATA.rows.map(r => r.d_end_km);
const paces = DATA.rows.map(r => r.pace);
const gaps = DATA.rows.map(r => r.gap);

new Chart(document.getElementById('elevChart'), {
  type: 'line',
  data: {
    labels: xKm,
    datasets: [{ label: 'Elevation', data: elev, borderColor: '#7dd3a0', backgroundColor: 'rgba(125,211,160,0.18)', borderWidth: 1.5, pointRadius: 0, fill: 'origin', tension: 0.2 }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { title: c => 'km ' + (+c[0].label).toFixed(2), label: c => c.parsed.y.toFixed(0) + ' m' } } },
    scales: {
      x: { type: 'linear', grid: { color: gridColor }, title: { display: true, text: 'Distance (km from start)' }, min: 0, max: 86 },
      y: { grid: { color: gridColor }, title: { display: true, text: 'Elevation (m)' } }
    }
  }
});

new Chart(document.getElementById('paceChart'), {
  type: 'line',
  data: {
    labels: xKm,
    datasets: [
      { label: 'Pace', data: paces, borderColor: '#6ea8fe', borderWidth: 2, pointRadius: 0, tension: 0.2 },
      { label: 'GAP', data: gaps, borderColor: '#c084fc', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, tension: 0.2 }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: true, labels: { color: '#8a93a6' } }, tooltip: { callbacks: { title: c => 'km ' + (+c[0].label).toFixed(2), label: c => c.dataset.label + ': ' + fmtPace(c.parsed.y) + '/km' } } },
    scales: {
      x: { type: 'linear', grid: { color: gridColor }, title: { display: true, text: 'Distance (km from start)' }, min: 0, max: 86 },
      y: { grid: { color: gridColor }, reverse: true, ticks: { callback: v => fmtPace(v) }, title: { display: true, text: 'Pace (min:sec / km)' } }
    }
  }
});
</script>
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
<style>${SHARED_CSS}</style>
</head>
<body>
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
</body>
</html>`;
}
