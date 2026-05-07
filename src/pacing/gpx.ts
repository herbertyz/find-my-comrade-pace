/**
 * GPX parser + distance utilities.
 * Direct port of the Python implementation in pacing_plan.py.
 */
import { XMLParser } from "fast-xml-parser";

export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
}

export function parseGpx(xml: string): TrackPoint[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name: string) => name === "trkpt" || name === "trkseg" || name === "trk",
  });
  const doc = parser.parse(xml);

  const trks = doc?.gpx?.trk ?? [];
  const points: TrackPoint[] = [];
  for (const trk of trks) {
    const segs = trk.trkseg ?? [];
    for (const seg of segs) {
      const pts = seg.trkpt ?? [];
      for (const p of pts) {
        const lat = parseFloat(p["@_lat"]);
        const lon = parseFloat(p["@_lon"]);
        const ele = parseFloat(p.ele ?? "NaN");
        if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(ele)) {
          points.push({ lat, lon, ele });
        }
      }
    }
  }
  return points;
}

const EARTH_RADIUS_M = 6371000.0;

export function haversine(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const phi1 = toRad(p1.lat);
  const phi2 = toRad(p2.lat);
  const dphi = toRad(p2.lat - p1.lat);
  const dlam = toRad(p2.lon - p1.lon);
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlam / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Compute cumulative distance (meters) for each track point.
 */
export function cumulativeDistances(points: TrackPoint[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + haversine(points[i - 1], points[i]));
  }
  return out;
}

/**
 * Smooth elevations along the track using a moving average over a fixed
 * distance window (in meters). Mirrors the Python implementation.
 */
export interface DistEle {
  d: number; // cumulative distance (meters), scaled
  ele: number;
}

export function smoothElevation(track: DistEle[], windowM = 100): DistEle[] {
  const n = track.length;
  const half = windowM / 2;
  const out: DistEle[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const center = track[i].d;
    let sum = 0;
    let count = 0;
    let j = i;
    while (j >= 0 && track[j].d >= center - half) {
      sum += track[j].ele;
      count++;
      j--;
    }
    j = i + 1;
    while (j < n && track[j].d <= center + half) {
      sum += track[j].ele;
      count++;
      j++;
    }
    out[i] = { d: track[i].d, ele: count > 0 ? sum / count : track[i].ele };
  }
  return out;
}

/**
 * Linear interpolation of elevation at an arbitrary distance along the track.
 */
export function interpEle(targetM: number, track: DistEle[]): number {
  if (track.length === 0) return NaN;
  if (targetM <= track[0].d) return track[0].ele;
  if (targetM >= track[track.length - 1].d) return track[track.length - 1].ele;

  let lo = 0;
  let hi = track.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[mid].d < targetM) lo = mid;
    else hi = mid;
  }
  const a = track[lo];
  const b = track[hi];
  if (b.d === a.d) return a.ele;
  return a.ele + ((b.ele - a.ele) * (targetM - a.d)) / (b.d - a.d);
}
