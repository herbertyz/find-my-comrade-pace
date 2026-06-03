/**
 * Shared CSS for both the form and the report. Kept here as a single
 * exported string so the server can inline it into every page.
 *
 * Theme handling: the document-element gets `data-theme="dark"` or
 * `data-theme="light"` set by the early init script. Both palettes are
 * defined below; everything else cascades through CSS variables.
 */
export const SHARED_CSS = `
  /* Default = dark (matches the data-theme set by the head init script
     when localStorage / OS preference is dark or unset). */
  :root,
  :root[data-theme="dark"] {
    --bg: #0f1115;
    --panel: #181b22;
    --panel-2: #20242d;
    --border: #2a2f3a;
    --text: #e7eaf0;
    --text-dim: #8a93a6;
    --accent: #6ea8fe;
    --accent-fg: #0a1226;
    --good: #7dd3a0;
    --warn: #f5c469;
    --bad: #f08a8a;
    --pace: #6ea8fe;
    --gap: #c084fc;
    --elev: #7dd3a0;
    --grid: rgba(255,255,255,0.06);
    --code-bg: rgba(255,255,255,0.06);
    /* Grade-rating tints: +1 / -1 are lower-alpha versions of the +2 / -2 hue */
    --table-r2: rgba(255, 0, 0, 0.07);
    --table-r1: rgba(255, 0, 0, 0.04);
    --table-rn1: rgba(57, 255, 20, 0.04);
    --table-rn2: rgba(57, 255, 20, 0.07);
    --r2-overlay: rgba(255, 0, 0, 0.20);
    --r1-overlay: rgba(255, 0, 0, 0.10);
    --rn1-overlay: rgba(57, 255, 20, 0.10);
    --rn2-overlay: rgba(57, 255, 20, 0.20);
  }
  :root[data-theme="light"] {
    --bg: #f6f8fb;
    --panel: #ffffff;
    --panel-2: #f0f3f8;
    --border: #d8dde6;
    --text: #1a1f2b;
    --text-dim: #5b6478;
    --accent: #2563eb;
    --accent-fg: #ffffff;
    --good: #2f8a55;
    --warn: #b97a14;
    --bad: #c43f3f;
    --pace: #2563eb;
    --gap: #8b3ad4;
    --elev: #2f8a55;
    --grid: rgba(0,0,0,0.07);
    --code-bg: rgba(0,0,0,0.05);
    --table-r2: rgba(255, 0, 0, 0.07);
    --table-r1: rgba(255, 0, 0, 0.04);
    --table-rn1: rgba(57, 200, 30, 0.05);
    --table-rn2: rgba(57, 200, 30, 0.10);
    --r2-overlay: rgba(255, 0, 0, 0.22);
    --r1-overlay: rgba(255, 0, 0, 0.11);
    --rn1-overlay: rgba(57, 200, 30, 0.13);
    --rn2-overlay: rgba(57, 200, 30, 0.25);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 28px 22px 60px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin: 32px 0 12px; }
  .sub { color: var(--text-dim); font-size: 13px; }

  /* Theme toggle button — fixed top-right corner of every page. */
  .theme-toggle {
    position: fixed;
    top: 14px;
    right: 16px;
    z-index: 100;
    width: 38px;
    height: 38px;
    padding: 0;
    border-radius: 999px;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 16px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .theme-toggle:hover { filter: brightness(1.05); }

  /* Form */
  .form-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; margin-bottom: 16px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 22px; }
  @media (max-width: 700px) { .form-row { grid-template-columns: 1fr; } }
  .form-row .field { display: flex; flex-direction: column; gap: 4px; }
  .form-row label { font-size: 11px; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.06em; }
  .form-row input { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 12px; font-size: 14px; font-family: inherit; }
  .form-row input:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  .form-row .hint { font-size: 11px; color: var(--text-dim); }
  .form-actions { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; }
  button, .btn { background: var(--accent); border: none; color: var(--accent-fg); font-weight: 600; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; font-family: inherit; }
  button.secondary, .btn.secondary { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); }
  button:hover { filter: brightness(1.08); }

  /* Stats */
  .hero { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 18px 0 8px; }
  .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .stat .k { font-size: 11px; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.06em; margin-bottom: 4px; }
  .stat .v { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
  .stat .vsub { font-size: 12px; color: var(--text-dim); margin-top: 2px; font-variant-numeric: tabular-nums; }

  /* Panels and charts */
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; margin-bottom: 16px; }
  .panel-header { display:flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
  .panel-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
  .panel-header .meta { font-size: 12px; color: var(--text-dim); }
  canvas { display: block; }
  .chart-box { position: relative; height: 280px; }
  .chart-box.tall { height: 340px; }
  .legend { font-size: 12px; color: var(--text-dim); margin-top: 8px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
  .legend .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: middle; border: 1px solid rgba(0,0,0,0.2); }

  /* Pace table */
  .table-wrap { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .table-scroll { max-height: 600px; overflow-y: auto; }
  table.pace { width: 100%; font-size: 12.5px; border-collapse: collapse; margin-top: 0; font-variant-numeric: tabular-nums; }
  table.pace th, table.pace td { padding: 6px 8px; border-bottom: 1px solid var(--border); }
  table.pace th { text-align: left; color: var(--text-dim); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; background: var(--panel); position: sticky; top: 0; }
  table.pace td { vertical-align: middle; }
  table.pace td.num { text-align: right; }
  table.pace td.marker { font-weight: 600; }
  table.pace td.pace { color: var(--accent); }
  table.pace td.cum { color: var(--text); }
  table.pace td.cum-gun { color: var(--text-dim); font-style: italic; }
  table.pace tr.r2 { background: var(--table-r2); }
  table.pace tr.r1 { background: var(--table-r1); }
  table.pace tr.rn1 { background: var(--table-rn1); }
  table.pace tr.rn2 { background: var(--table-rn2); }
  .rating-pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }

  /* ----------------------------------------------------------------------
     Pace band — printable strip. ALWAYS rendered with white background
     and black ink regardless of theme so the on-screen preview matches
     the printed output.
     ---------------------------------------------------------------------- */
  .band-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
  .band-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .pace-band {
    width: 40mm;
    height: 190mm;
    background: white;
    color: black;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    box-shadow: 0 0 0 1px #000;
    display: grid;
    grid-template-rows: repeat(4, 110fr) 100fr repeat(18, 96fr);
    overflow: visible;
    position: relative;
  }
  .pace-band .header-line { display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 9.5pt; padding: 0 2mm; }
  .pace-band .heading-line { display: grid; grid-template-columns: 82fr 160fr 226fr 12fr; align-items: center; font-weight: 700; font-size: 9.5pt; border-top: 0.5pt solid black; border-bottom: 0.5pt solid black; }
  .pace-band .heading-line .col { text-align: right; padding-right: 2px; }
  .pace-band .heading-line .col.km { padding-right: 0; }
  .pace-band .heading-line .col.pace { text-align: center; padding-right: 0; transform: translateX(1ch); }
  .pace-band .heading-line .col.elapsed { padding-right: 6px; }
  .pace-band .data-row {
    position: relative;
    border-bottom: 0.5pt solid black;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    overflow: visible;
  }
  .pace-band .data-row:last-of-type { border-bottom: none; }
  .pace-band .cell { width: 100%; height: 100%; }
  .pace-band .cell.r2  { background: #ff0000; }  /* +2 big incline */
  .pace-band .cell.r1  { background: #ff8080; }  /* +1 small incline (lighter red) */
  .pace-band .cell.r0  { background: #ffffff; }  /* flat */
  .pace-band .cell.rn1 { background: #a0ffa0; }  /* -1 small decline (lighter green) */
  .pace-band .cell.rn2 { background: #39ff14; }  /* -2 big decline */
  .pace-band .cell.empty { background: white; }
  .pace-band .data-row .text-overlay {
    position: absolute; inset: 0;
    display: grid;
    grid-template-columns: 82fr 160fr 226fr 12fr;
    align-items: center;
    font-weight: 700; font-size: 9.5pt;
    /* Thick white halo around the black numbers — readable on any cell
       color (especially the bright red +2 cells). 8-direction sharp
       text-shadow works cross-browser; the modern stroke variant adds
       extra crispness on WebKit/Blink. */
    text-shadow:
      -2px -2px 0 #fff,  2px -2px 0 #fff,
      -2px  2px 0 #fff,  2px  2px 0 #fff,
       0   -2px 0 #fff,  0    2px 0 #fff,
      -2px  0   0 #fff,  2px  0   0 #fff;
    paint-order: stroke fill;
    -webkit-text-stroke: 1.5pt #fff;
  }
  .pace-band .data-row .text-overlay .col { text-align: right; padding-right: 2px; }
  .pace-band .data-row .text-overlay .col.pace { text-align: center; padding-right: 0; transform: translateX(1ch); }
  .pace-band .data-row .text-overlay .col.elapsed { padding-right: 6px; }
  /* (No cell-boundary ticks — colors alone separate the cells.) */

  details summary { cursor: pointer; user-select: none; padding: 8px 0; color: var(--text-dim); font-size: 13px; }
  details summary:hover { color: var(--text); }
  .insight { background: var(--panel-2); border-left: 3px solid var(--accent); padding: 12px 16px; border-radius: 6px; font-size: 13.5px; line-height: 1.55; color: var(--text); margin-bottom: 12px; }
  .insight.good { border-left-color: var(--good); }
  .insight.warn { border-left-color: var(--warn); }

  /* Notes blocks (used in "Pacing rules" and "How to use this plan") */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } }
  .notes { background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; font-size: 13.5px; line-height: 1.55; color: var(--text); margin-bottom: 12px; }
  .notes ul { margin: 6px 0; padding-left: 20px; }
  .notes li { margin: 5px 0; }
  .notes code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; font-size: 12.5px; }
  .notes strong { color: var(--text); }
`;
