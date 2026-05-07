/**
 * HTML/CSS pace band — designed to render at exactly 40mm × 190mm.
 * 4 header lines, 1 heading row, 18 marker rows.
 * Adjacent cells abut directly (no continuous dividers); short ticks at
 * each km boundary on the row separators.
 *
 * The "Download JPG" button does NOT use html2canvas — it draws the band
 * directly onto a Canvas element using the embedded data. This mirrors the
 * Python-rendered JPG byte-for-byte (same size, fonts, colors, layout).
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
  const groupSegs: typeof rows[] = [[rows[0]]];
  for (let i = 0; i < 17; i++) {
    groupSegs.push(rows.slice(1 + i * 5, 1 + (i + 1) * 5));
  }
  const markers = [85];
  for (let i = 1; i < 18; i++) markers.push(85 - 5 * i);
  const groups: RowGroup[] = [];
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
 * Render the pace band as an HTML element + a "Download JPG" button. The
 * band element has class .pace-band and CSS sets the dimensions to
 * 40mm × 190mm. The download button uses a native canvas to produce a JPG
 * (no html2canvas, no server-side rendering).
 */
export function renderPaceBand(result: PacingResult): string {
  const groups = buildRowGroups(result);
  const totalKm = result.totalKm;
  const avgPace = result.runningTimeSec / totalKm;
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
          <div class="text-overlay">
            <div class="col km">${g.marker}</div>
            <div class="col pace">${g.paceStr}</div>
            <div class="col elapsed">${g.elapsedStr}</div>
            <div></div>
          </div>
        </div>`;
    })
    .join("");

  // Data we hand off to the client-side renderer for JPG download.
  const bandData = { headerLines, groups };

  return `
<div class="band-wrap">
  <div id="pace-band" class="pace-band">
    ${headerHtml}
    ${headingHtml}
    ${rowsHtml}
  </div>
  <div class="band-actions">
    <button type="button" class="secondary" id="downloadJpgBtn">Download JPG (40 × 190 mm @ 305 DPI)</button>
    <span class="sub" id="downloadStatus">Or zoom in and screenshot the band region for printing.</span>
  </div>
</div>

<script>
(function () {
  const PACE_BAND_DATA = ${JSON.stringify(bandData)};

  // Grade-rating colors. +1 / -1 are lighter shades of +2 / -2 so the
  // visual cue is "same hue, milder magnitude".
  const COLORS = {
    "2":  "#ff0000",   // big incline
    "1":  "#ff8080",   // small incline (lighter red)
    "0":  "#ffffff",   // flat
    "-1": "#a0ffa0",   // small decline (lighter green)
    "-2": "#39ff14"    // big decline
  };

  // Layout constants (mirror src/render/build_pace_band.py)
  const PX_PER_MM = 12;            // 304.8 DPI
  const W = 40 * PX_PER_MM;        // 480 px
  const H = 190 * PX_PER_MM;       // 2280 px
  const CELL_W = 8 * PX_PER_MM;    // 96 px
  const HEADER_H = 110;            // 4 × 110 = 440
  const HEADING_H = 100;           // 1 × 100 = 100
  const DATA_H = 96;               // 18 × 96 = 1728  (total = 2268, +12 px slack)

  // Column anchors (right-aligned), matching the latest Python tuning:
  //   km @ 82, pace @ 242, elapsed @ 468
  const COL_KM_X = 82;
  const COL_PACE_X = 242;
  const COL_ELAPSED_X = 468;

  function strokedText(ctx, txt, x, y) {
    ctx.strokeText(txt, x, y);
    ctx.fillText(txt, x, y);
  }

  function renderPaceBandToCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Header lines (centered)
    ctx.fillStyle = "#000000";
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let y = 0;
    for (const line of PACE_BAND_DATA.headerLines) {
      ctx.fillText(line, W / 2, y + HEADER_H / 2);
      y += HEADER_H;
    }
    // Header / heading divider
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, y - 1, W, 2);

    // Heading row
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "right";
    ctx.fillStyle = "#000000";
    ctx.fillText("km", COL_KM_X, y + HEADING_H / 2);
    ctx.fillText("pace", COL_PACE_X, y + HEADING_H / 2);
    ctx.fillText("elapsed", COL_ELAPSED_X, y + HEADING_H / 2);
    y += HEADING_H;
    ctx.fillRect(0, y - 1, W, 2);
    const dataStartY = y;

    // Data rows. Use a thicker white stroke around the black text so it
    // stays readable on bright cells (especially red +2). lineWidth is
    // centered on the path, so 8 px stroke = ~4 px outline beyond the
    // character — visible on print at 305 DPI.
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#ffffff";
    ctx.lineJoin = "round";

    for (let i = 0; i < PACE_BAND_DATA.groups.length; i++) {
      const g = PACE_BAND_DATA.groups[i];
      const rowY = dataStartY + i * DATA_H;
      const nCells = g.ratings.length;

      // Cell fills
      if (nCells === 1) {
        ctx.fillStyle = COLORS[String(g.ratings[0])] || "#ffffff";
        ctx.fillRect(W - CELL_W, rowY, CELL_W, DATA_H);
      } else {
        for (let j = 0; j < nCells; j++) {
          ctx.fillStyle = COLORS[String(g.ratings[j])] || "#ffffff";
          const cxEnd = j < nCells - 1 ? (j + 1) * CELL_W : W;
          ctx.fillRect(j * CELL_W, rowY, cxEnd - j * CELL_W, DATA_H);
        }
      }

      // Text overlay (bold black with thin white stroke)
      ctx.fillStyle = "#000000";
      const cy = rowY + DATA_H / 2;
      strokedText(ctx, String(g.marker), COL_KM_X, cy);
      strokedText(ctx, g.paceStr, COL_PACE_X, cy);
      strokedText(ctx, g.elapsedStr, COL_ELAPSED_X, cy);
    }

    // Horizontal row dividers between data rows (1 px), plus a thicker bottom line
    ctx.fillStyle = "#000000";
    for (let i = 1; i < PACE_BAND_DATA.groups.length; i++) {
      const dy = dataStartY + i * DATA_H;
      ctx.fillRect(0, dy, W, 1);
    }
    const dataEndY = dataStartY + PACE_BAND_DATA.groups.length * DATA_H;
    ctx.fillRect(0, dataEndY, W, 2);

    // (No vertical cell-boundary ticks — colors alone separate the cells.)

    // Outer frame
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    return canvas;
  }

  const btn = document.getElementById("downloadJpgBtn");
  const status = document.getElementById("downloadStatus");
  if (!btn) return;
  btn.addEventListener("click", function () {
    btn.disabled = true;
    status.textContent = "Rendering…";
    try {
      const canvas = renderPaceBandToCanvas();
      const url = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = url;
      a.download = "comrades_pace_band.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      status.textContent = "Saved to your downloads.";
    } catch (e) {
      const msg = (e && (e.message || String(e))) || "Unknown error";
      status.textContent = "Couldn't render image: " + msg;
    } finally {
      btn.disabled = false;
    }
  });
})();
</script>`;
}
