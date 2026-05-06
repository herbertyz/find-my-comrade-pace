/**
 * Pacing model: converts a GPX-derived course into 86 official-marker
 * segments and produces a pacing strategy that hits the runner's gun-time
 * goal. Math is identical to the Python reference implementation.
 */
import { cumulativeDistances, DistEle, interpEle, smoothElevation, TrackPoint } from "./gpx";

export const OFFICIAL_M = 85777;
export const OFFICIAL_KM = 85.777;

export interface Segment {
  idx: number;
  markerAtEnd: number;        // 85, 84, ..., 0
  segmentLabel: string;       // "Start→85", "85→84", ..., "1→0"
  dStartKm: number;
  dEndKm: number;
  lenKm: number;
  eleStartM: number;
  eleEndM: number;
  netElevM: number;
  ascentM: number;
  descentM: number;
  gradePct: number;
}

export interface PacingInputs {
  goalSeconds: number;          // gun-time target
  startDelaySeconds: number;    // time to cross start line after gun fires
  inclineGapAdjSec: number;     // GAP penalty applied on big incline (rating +2)
  declineGapAdjSec: number;     // GAP penalty applied on big decline (rating -2)
  midFadeSec: number;           // GAP fade reached by km 60 (heat etc.)
  lastFadeSec: number;          // GAP fade reached by km 85.777 (finish)
}

export interface PacedSegment extends Segment {
  rating: number;               // -2..+2
  gapSecPerKm: number;
  paceSecPerKm: number;
  segTimeSec: number;
  cumTimeSec: number;
}

export interface PacingResult {
  inputs: PacingInputs;
  baselineGap: number;          // sec/km
  rows: PacedSegment[];
  totalAscentM: number;
  totalDescentM: number;
  totalKm: number;
  runningTimeSec: number;       // sum of segment times
  gunTimeSec: number;           // running + start delay
  ratingsCount: Record<string, number>;
}

export const DEFAULT_INPUTS: PacingInputs = {
  goalSeconds: 7 * 3600 + 20 * 60,  // 7:20:00
  startDelaySeconds: 90,             // 1:30
  inclineGapAdjSec: 0,               // no penalty on big incline (hold GAP)
  declineGapAdjSec: 10,              // +10 sec/km on big decline (save the quads)
  midFadeSec: 3,                     // +3 sec/km by km 60
  lastFadeSec: 6,                    // +6 sec/km by km 85.777
};

// ---------------------------------------------------------------------------
// Course geometry
// ---------------------------------------------------------------------------

/**
 * Build the 86 official marker segments from a GPX track.
 *
 * The GPX is scaled so its total length matches the official 85.777 km.
 * Segment 0 spans Start (km 0) -> marker 85 (km 0.777). Segments 1-85 each
 * span 1 km between successive markers. Segment 85 ends at marker 0 (finish).
 */
export function buildSegments(trkpts: TrackPoint[]): Segment[] {
  if (trkpts.length < 2) {
    throw new Error("GPX track has too few points to build segments.");
  }

  const distances = cumulativeDistances(trkpts);
  const totalGpxM = distances[distances.length - 1];
  const scale = OFFICIAL_M / totalGpxM;

  const rawTrack: DistEle[] = trkpts.map((p, i) => ({
    d: distances[i] * scale,
    ele: p.ele,
  }));
  const track = smoothElevation(rawTrack, 100);

  // Boundaries at 0, 777, 1777, ..., 85777 m  (87 boundaries -> 86 segments)
  const boundaries: number[] = [0];
  for (let i = 0; i < 86; i++) boundaries.push(777 + 1000 * i);

  const segments: Segment[] = [];
  for (let i = 0; i < 86; i++) {
    const dStart = boundaries[i];
    const dEnd = boundaries[i + 1];
    const eStart = interpEle(dStart, track);
    const eEnd = interpEle(dEnd, track);

    // Sample interior points to estimate ascent/descent
    const pts: { d: number; ele: number }[] = [{ d: dStart, ele: eStart }];
    for (const t of track) {
      if (t.d > dStart && t.d < dEnd) pts.push(t);
    }
    pts.push({ d: dEnd, ele: eEnd });

    let ascent = 0;
    let descent = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const dele = pts[k + 1].ele - pts[k].ele;
      if (dele > 0) ascent += dele;
      else descent += -dele;
    }

    const lenM = dEnd - dStart;
    const net = eEnd - eStart;
    const gradePct = (net / lenM) * 100;
    const markerAtEnd = 85 - i;
    const startMarker = i === 0 ? "Start" : String(86 - i);

    segments.push({
      idx: i,
      markerAtEnd,
      segmentLabel: `${startMarker}→${markerAtEnd}`,
      dStartKm: dStart / 1000,
      dEndKm: dEnd / 1000,
      lenKm: lenM / 1000,
      eleStartM: eStart,
      eleEndM: eEnd,
      netElevM: net,
      ascentM: ascent,
      descentM: descent,
      gradePct,
    });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Per-km pacing rules
// ---------------------------------------------------------------------------

export function gradeRating(gradePct: number): number {
  if (gradePct > 3.0) return 2;
  if (gradePct > 1.0) return 1;
  if (gradePct < -3.0) return -2;
  if (gradePct < -1.0) return -1;
  return 0;
}

/**
 * Strava-like quadratic: pace = GAP * (1 + 0.026*g + 0.002*g^2) where g is %.
 *   +5%  -> 1.18 (slower)
 *   -5%  -> 0.92 (faster)
 */
export function paceFactor(gradePct: number): number {
  return 1 + 0.026 * gradePct + 0.002 * gradePct * gradePct;
}

/**
 * Conservative start: first 3 km add +10 sec/km, then linear ramp to 0 by km 6.
 * (Built-in default — not exposed in the form.)
 */
export function conservativeStartOffset(kmMid: number): number {
  if (kmMid < 3) return 10;
  if (kmMid < 6) return 10 * (1 - (kmMid - 3) / 3);
  return 0;
}

/**
 * Heat fade — gradually slower target GAP through the day. Two parameters:
 *   midFade: extra sec/km reached by km 60
 *   lastFade: extra sec/km reached by km 85.777
 *
 * km 0..30  : 0
 * km 30..60 : linear 0 -> midFade
 * km 60..86 : linear midFade -> lastFade
 */
export function heatFadeSecPerKm(kmMid: number, midFade: number, lastFade: number): number {
  if (kmMid <= 30) return 0;
  if (kmMid <= 60) return (midFade * (kmMid - 30)) / 30;
  return midFade + ((lastFade - midFade) * (kmMid - 60)) / (OFFICIAL_KM - 60);
}

/**
 * Compute the target GAP (sec/km) for a single segment given baseline GAP and inputs.
 */
export function targetGap(seg: Segment, baselineX: number, inputs: PacingInputs): number {
  const kmMid = (seg.dStartKm + seg.dEndKm) / 2;
  let gap = baselineX;
  gap += conservativeStartOffset(kmMid);
  const rating = gradeRating(seg.gradePct);
  if (rating >= 2) gap += inputs.inclineGapAdjSec;
  if (rating <= -2) gap += inputs.declineGapAdjSec;
  gap += heatFadeSecPerKm(kmMid, inputs.midFadeSec, inputs.lastFadeSec);
  return gap;
}

/**
 * Total predicted running time at a given baseline GAP.
 */
function totalTimeAt(segments: Segment[], baselineX: number, inputs: PacingInputs): number {
  let total = 0;
  for (const s of segments) {
    const gap = targetGap(s, baselineX, inputs);
    const actual = gap * paceFactor(s.gradePct);
    total += actual * s.lenKm;
  }
  return total;
}

/**
 * Solve the pacing strategy: find the baseline GAP X such that the total
 * predicted running time equals (goal - start_delay).
 */
export function solvePacing(segments: Segment[], inputs: PacingInputs): PacingResult {
  const runningTarget = inputs.goalSeconds - inputs.startDelaySeconds;
  if (runningTarget <= 0) {
    throw new Error("Start delay must be smaller than goal time.");
  }

  // Binary search for X.
  let lo = 120;   // 2:00/km — way too fast, sanity bound
  let hi = 600;   // 10:00/km — way too slow
  for (let iter = 0; iter < 80; iter++) {
    const mid = (lo + hi) / 2;
    if (totalTimeAt(segments, mid, inputs) > runningTarget) hi = mid;
    else lo = mid;
  }
  const X = (lo + hi) / 2;

  // Materialise paced segments with cumulative time.
  const rows: PacedSegment[] = [];
  let cum = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  const ratingsCount: Record<string, number> = { "-2": 0, "-1": 0, "0": 0, "1": 0, "2": 0 };

  for (const s of segments) {
    const rating = gradeRating(s.gradePct);
    const gap = targetGap(s, X, inputs);
    const pace = gap * paceFactor(s.gradePct);
    const segTime = pace * s.lenKm;
    cum += segTime;
    totalAscent += s.ascentM;
    totalDescent += s.descentM;
    ratingsCount[String(rating)]++;

    rows.push({
      ...s,
      rating,
      gapSecPerKm: gap,
      paceSecPerKm: pace,
      segTimeSec: segTime,
      cumTimeSec: cum,
    });
  }

  return {
    inputs,
    baselineGap: X,
    rows,
    totalAscentM: totalAscent,
    totalDescentM: totalDescent,
    totalKm: OFFICIAL_KM,
    runningTimeSec: cum,
    gunTimeSec: cum + inputs.startDelaySeconds,
    ratingsCount,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers (used by the renderers)
// ---------------------------------------------------------------------------

export function fmtPace(sec: number): string {
  if (!Number.isFinite(sec)) return "--";
  const m = Math.floor(sec / 60);
  let r = Math.round(sec - m * 60);
  let mm = m;
  if (r === 60) {
    mm += 1;
    r = 0;
  }
  return `${mm}:${String(r).padStart(2, "0")}`;
}

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = Math.floor(sec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function fmtMmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.floor(sec % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function parseHms(s: string): number {
  // Accept "h:mm:ss", "mm:ss", or seconds-as-number.
  const trimmed = s.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  const parts = trimmed.split(":").map((x) => parseFloat(x));
  if (parts.some((p) => !Number.isFinite(p))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return NaN;
}
