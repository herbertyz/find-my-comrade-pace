/**
 * Shared CSS for both the form and the report. Kept here as a single
 * exported string so the server can inline it into every page.
 */
export const SHARED_CSS = `
  :root {
    --bg: #0f1115;
    --panel: #181b22;
    --panel-2: #20242d;
    --border: #2a2f3a;
    --text: #e7eaf0;
    --text-dim: #8a93a6;
    --accent: #6ea8fe;
    --good: #7dd3a0;
    --warn: #f5c469;
    --bad: #f08a8a;
    --pace: #6ea8fe;
    --gap: #c084fc;
    --elev: #7dd3a0;
    --r-up2: #ff8a5d;
    --r-up1: #ffb476;
    --r-flat: #8a93a6;
    --r-dn1: #92c4ff;
    --r-dn2: #5dadff;
    --grid: rgba(255,255,255,0.06);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 28px 22px 60px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin: 32px 0 12px; }
  .sub { color: var(--text-dim); font-size: 13px; }

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
  button, .btn { background: var(--accent); border: none; color: #0a1226; font-weight: 600; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; font-family: inherit; }
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
  table.pace tr.r2 { background: rgba(255,138,93,0.05); }
  table.pace tr.r1 { background: rgba(255,180,118,0.03); }
  table.pace tr.rn1 { background: rgba(146,196,255,0.03); }
  table.pace tr.rn2 { background: rgba(93,173,255,0.05); }
  .rating-pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }

  /* Pace band — printable strip */
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
    overflow: hidden;
    position: relative;
  }
  .pace-band .header-line { display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 9.5pt; padding: 0 2mm; }
  .pace-band .heading-line { display: grid; grid-template-columns: 82fr 160fr 226fr 12fr; align-items: center; font-weight: 700; font-size: 8pt; border-top: 0.5pt solid black; border-bottom: 0.5pt solid black; }
  .pace-band .heading-line .col { text-align: right; padding-right: 2px; }
  .pace-band .heading-line .col.km { padding-right: 0; }
  .pace-band .heading-line .col.pace { }
  .pace-band .heading-line .col.elapsed { padding-right: 6px; }
  .pace-band .data-row {
    position: relative;
    border-bottom: 0.5pt solid black;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
  }
  .pace-band .data-row:last-of-type { border-bottom: none; }
  .pace-band .cell { width: 100%; height: 100%; }
  .pace-band .cell.r2 { background: #ff0000; }
  .pace-band .cell.r1 { background: #ffff00; }
  .pace-band .cell.r0 { background: #ffffff; }
  .pace-band .cell.rn1 { background: #00ffff; }
  .pace-band .cell.rn2 { background: #39ff14; }
  .pace-band .cell.empty { background: white; }
  .pace-band .data-row .text-overlay {
    position: absolute; inset: 0;
    display: grid;
    grid-template-columns: 82fr 160fr 226fr 12fr;
    align-items: center;
    font-weight: 700; font-size: 9.5pt;
    -webkit-text-stroke: 0.5pt white;
  }
  .pace-band .data-row .text-overlay .col { text-align: right; padding-right: 2px; }
  .pace-band .data-row .text-overlay .col.elapsed { padding-right: 6px; }
  /* Tick marks at cell boundaries on horizontal row dividers */
  .pace-band .data-row .ticks {
    position: absolute; inset: 0; pointer-events: none;
  }
  .pace-band .data-row .ticks::before,
  .pace-band .data-row .ticks::after {
    content: "";
    position: absolute;
    left: 0; right: 0; height: 2mm;
    background-image: linear-gradient(black, black), linear-gradient(black, black), linear-gradient(black, black), linear-gradient(black, black);
    background-repeat: no-repeat;
    background-size: 0.5pt 100%;
    background-position: 20% 0, 40% 0, 60% 0, 80% 0;
  }
  .pace-band .data-row .ticks::before { top: -1mm; }
  .pace-band .data-row .ticks::after { bottom: -1mm; }
  .pace-band .data-row.single-cell .ticks::before,
  .pace-band .data-row.single-cell .ticks::after {
    background-position: 80% 0;
    background-image: linear-gradient(black, black);
  }

  details summary { cursor: pointer; user-select: none; padding: 8px 0; color: var(--text-dim); font-size: 13px; }
  details summary:hover { color: var(--text); }
  .insight { background: var(--panel-2); border-left: 3px solid var(--accent); padding: 12px 16px; border-radius: 6px; font-size: 13.5px; line-height: 1.55; color: var(--text); margin-bottom: 12px; }
  .insight.good { border-left-color: var(--good); }
  .insight.warn { border-left-color: var(--warn); }
`;
