/**
 * Express server. The course (parsed GPX -> segments) is cached on startup;
 * each request just runs the pacing model with the user's inputs.
 */
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { parseGpx } from "./pacing/gpx";
import {
  buildSegments,
  DEFAULT_INPUTS,
  PacingInputs,
  parseHms,
  Segment,
  solvePacing,
} from "./pacing/model";
import { renderLandingPage, renderReport } from "./render/report";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const GPX_PATH = path.join(__dirname, "..", "public", "COURSE_2024_up.gpx");

// --- Course pre-load ----------------------------------------------------------
function loadSegments(): Segment[] {
  if (!fs.existsSync(GPX_PATH)) {
    throw new Error(`GPX file not found: ${GPX_PATH}`);
  }
  const xml = fs.readFileSync(GPX_PATH, "utf8");
  const trkpts = parseGpx(xml);
  if (trkpts.length === 0) {
    throw new Error("GPX has no track points.");
  }
  const segments = buildSegments(trkpts);
  console.log(
    `[course] Loaded ${trkpts.length} GPX points -> ${segments.length} segments. ` +
      `End elev: ${segments[segments.length - 1].eleEndM.toFixed(0)} m`,
  );
  return segments;
}

const SEGMENTS = loadSegments();

// --- Input parsing ------------------------------------------------------------
function parseInputs(q: Record<string, unknown>): PacingInputs {
  const goal = parseHms(String(q.goal ?? ""));
  const delay = parseHms(String(q.delay ?? ""));
  const inclineAdj = Number(q.inclineAdj ?? "");
  const declineAdj = Number(q.declineAdj ?? "");
  const midFade = Number(q.midFade ?? "");
  const lastFade = Number(q.lastFade ?? "");

  const errors: string[] = [];
  if (!Number.isFinite(goal) || goal < 600 || goal > 18 * 3600)
    errors.push("Goal time must be between 0:10:00 and 18:00:00.");
  if (!Number.isFinite(delay) || delay < 0 || delay > 30 * 60)
    errors.push("Start delay must be between 0:00 and 30:00.");
  if (!Number.isFinite(inclineAdj) || inclineAdj < 0 || inclineAdj > 60)
    errors.push("Incline GAP adjustment must be between 0 and 60.");
  if (!Number.isFinite(declineAdj) || declineAdj < 0 || declineAdj > 60)
    errors.push("Decline GAP adjustment must be between 0 and 60.");
  if (!Number.isFinite(midFade) || midFade < 0 || midFade > 60)
    errors.push("Mid-third fade must be between 0 and 60.");
  if (!Number.isFinite(lastFade) || lastFade < 0 || lastFade > 60)
    errors.push("Last-third fade must be between 0 and 60.");
  if (Number.isFinite(midFade) && Number.isFinite(lastFade) && lastFade < midFade)
    errors.push("Last-third fade should be at least as large as mid-third fade.");
  if (errors.length) throw new InputError(errors.join(" "));

  return {
    goalSeconds: goal,
    startDelaySeconds: delay,
    inclineGapAdjSec: inclineAdj,
    declineGapAdjSec: declineAdj,
    midFadeSec: midFade,
    lastFadeSec: lastFade,
  };
}

class InputError extends Error {}

// --- App ----------------------------------------------------------------------
const app = express();
app.disable("x-powered-by");

app.get("/", (_req: Request, res: Response) => {
  res.type("html").send(renderLandingPage());
});

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ ok: true, segments: SEGMENTS.length });
});

app.get("/report", (req: Request, res: Response) => {
  // If no params at all, show the landing page so the URL is meaningful.
  if (Object.keys(req.query).length === 0) {
    return res.redirect(302, "/");
  }
  let inputs: PacingInputs;
  try {
    inputs = parseInputs(req.query as Record<string, unknown>);
  } catch (err) {
    const msg = err instanceof InputError ? err.message : "Invalid inputs.";
    return res.status(400).type("html").send(errorPage(msg));
  }
  const result = solvePacing(SEGMENTS, inputs);
  res.type("html").send(renderReport(result));
});

function errorPage(msg: string): string {
  const safe = msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bad inputs</title></head>
  <body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px;color:#333">
    <h1>Couldn't build a plan</h1>
    <p>${safe}</p>
    <p><a href="/">← Back to the form</a></p>
  </body></html>`;
}

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).type("html").send(errorPage("Page not found."));
});

app.listen(PORT, () => {
  // Quick sanity log: solve once with defaults and print the headline.
  const r = solvePacing(SEGMENTS, DEFAULT_INPUTS);
  const totalH = Math.floor(r.runningTimeSec / 3600);
  const totalM = Math.floor((r.runningTimeSec % 3600) / 60);
  const totalS = Math.floor(r.runningTimeSec % 60);
  const baseMin = Math.floor(r.baselineGap / 60);
  const baseSec = Math.round(r.baselineGap - baseMin * 60);
  console.log(
    `[server] Listening on http://localhost:${PORT}. ` +
      `Default plan: baseline GAP ${baseMin}:${String(baseSec).padStart(2, "0")}/km, ` +
      `running ${totalH}:${String(totalM).padStart(2, "0")}:${String(totalS).padStart(2, "0")}.`,
  );
});
