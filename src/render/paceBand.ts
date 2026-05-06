/**
 * HTML/CSS pace band — designed to render at exactly 40mm × 190mm.
 * 4 header lines, 1 heading row, 18 marker rows.
 * Adjacent cells abut directly (no continuous dividers); short ticks at
 * each km boundary on the row separators.
 */
import {
  fmtMmss,
  fmtPace,
  fmtTime,
  PacingResult,
} from "../pacing/model";

interface RowGroup {
  marker: number;
  paceStr: string;
  elapsedStr: string;
  ratings: number[];
}

function ratingClass(r: number): string {
  switch (r) {
    case 2: return "r2";
    case 1: return "r1";
    case 0: return "r0";
    case -1: return "rn1";
    case -2: return "rn2";
    default: return "r0";
  }
}

export function buildRowGroups(result: PacingResult): RowGroup[] {
  const rows = result.rows;
  const groups: RowGroup[] = [];

  // Group 0: segment 0 only (Start -> marker 85)
  const g0 = [rows[0]];
  // Groups 1..17: segments 1-5, 6-10, ..., 81-85
  const groupSegs: typeof rows[] = [g0];
  for (let i = 0; i < 17; i++) {
    groupSegs.push(rows.slice(1 + i * 5, 1 + (i + 1) * 5));
  }

  const markers = [85];
  for (let i = 1; i < 18; i++) markers.push(85 - 5 * i);

  for (let i = 0; i < 18; i++) {
    const segs = groupSegs[i];
    const dist = segs.reduce((a, b) => a + b.lenKm, 0);
    const time = segs.reduce((a, b) => a + b.segTimeSec, 0);
    const lastCum = segs[segs.length - 1].cumTimeSec;
    groups.push({
      marker: markers[i],
      paceStr: fmtPace(time / dist),
      elapsedStr: fmtTime(lastCum + result.inputs.startDelaySeconds),
      ratings: segs.map((s) => s.rating),
    });
  }
  return groups;
}

/**
 * Render the pace band as an HTML element. The element has class .pace-band
 * and CSS sets the dimensions to 40mm × 190mm.
 */
export function renderPaceBand(result: PacingResult): string {
  const groups = buildRowGroups(result);
  const totalKm = result.totalKm;
  const avgPace = result.runningTimeSec / totalKm;
  // Distance-weighted average of target GAPs
  let gapTime = 0;
  for (const r of result.rows) gapTime += r.gapSecPerKm * r.lenKm;
  const avgGap = gapTime / totalKm;

  const headerLines = [
    `Goal ${fmtTime(result.gunTimeSec)}`,
    `Delay start ${fmtMmss(result.inputs.startDelaySeconds)}`,
    `Avg Pace: ${fmtPace(avgPace)}/km`,
    `Avg GAP: ${fmtPace(avgGap)}/km`,
  ];

  const headerHtml = headerLines
    .map((t) => `<div class="header-line">${t}</div>`)
    .join("");

  const headingHtml = `
    <div class="heading-line">
      <div class="col km">km</div>
      <div class="col pace">pace</div>
      <div class="col elapsed">elapsed</div>
      <div></div>
    </div>`;

  const rowsHtml = groups
    .map((g) => {
      const single = g.ratings.length === 1;
      const cells = single
        ? `<div class="cell empty"></div><div class="cell empty"></div><div class="cell empty"></div><div class="cell empty"></div><div class="cell ${ratingClass(g.ratings[0])}"></div>`
        : g.ratings.map((r) => `<div class="cell ${ratingClass(r)}"></div>`).join("");
      const klass = "data-row" + (single ? " single-cell" : "");
      return `
        <div class="${klass}">
          ${cells}
          <div class="ticks"></div>
          <div class="text-overlay">
            <div class="col km">${g.marker}</div>
            <div class="col pace">${g.paceStr}</div>
            <div class="col elapsed">${g.elapsedStr}</div>
            <div></div>
          </div>
        </div>`;
    })
    .join("");

  return `
<div class="band-wrap">
  <div id="pace-band" class="pace-band">
    ${headerHtml}
    ${headingHtml}
    ${rowsHtml}
  </div>
  <div class="band-actions">
    <button type="button" class="secondary" id="downloadJpgBtn">Download JPG</button>
    <span class="sub" id="downloadStatus">Tip: zoom in and screenshot the band region for printing — or use the button (loads a small library on demand).</span>
  </div>
</div>

<script>
(function () {
  var btn = document.getElementById('downloadJpgBtn');
  var status = document.getElementById('downloadStatus');
  if (!btn) return;

  function loadHtml2Canvas() {
    return new Promise(function (resolve, reject) {
      if (window.html2canvas) return resolve(window.html2canvas);
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = function () { resolve(window.html2canvas); };
      s.onerror = function () { reject(new Error('Failed to load html2canvas')); };
      document.head.appendChild(s);
    });
  }

  btn.addEventListener('click', async function () {
    var node = document.getElementById('pace-band');
    if (!node) return;
    btn.disabled = true;
    status.textContent = 'Loading renderer…';
    try {
      var html2canvas = await loadHtml2Canvas();
      status.textContent = 'Rendering…';
      // Render at 12 px per mm => same physical size as the original Python JPG.
      var canvas = await html2canvas(node, { backgroundColor: 'white', scale: 12 / (96 / 25.4) });
      var url = canvas.toDataURL('image/jpeg', 0.95);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'comrades_pace_band.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      status.textContent = 'Saved to your downloads.';
    } catch (e) {
      status.textContent = 'Couldn\\'t render image: ' + (e && e.message || e);
    } finally {
      btn.disabled = false;
    }
  });
})();
</script>`;
}
