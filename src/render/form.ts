/**
 * Render the input form. Used as a standalone landing page and embedded
 * (collapsed) at the top of the report so users can re-run with new inputs.
 */
import { DEFAULT_INPUTS, fmtMmss, fmtTime, PacingInputs } from "../pacing/model";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface FormValues {
  goal: string;        // h:mm:ss
  delay: string;       // m:ss
  inclineAdj: string;  // sec/km
  declineAdj: string;  // sec/km
  midFade: string;     // sec/km
  lastFade: string;    // sec/km
}

export function defaultFormValues(): FormValues {
  return {
    goal: fmtTime(DEFAULT_INPUTS.goalSeconds),
    delay: fmtMmss(DEFAULT_INPUTS.startDelaySeconds),
    inclineAdj: String(DEFAULT_INPUTS.inclineGapAdjSec),
    declineAdj: String(DEFAULT_INPUTS.declineGapAdjSec),
    midFade: String(DEFAULT_INPUTS.midFadeSec),
    lastFade: String(DEFAULT_INPUTS.lastFadeSec),
  };
}

export function inputsToFormValues(i: PacingInputs): FormValues {
  return {
    goal: fmtTime(i.goalSeconds),
    delay: fmtMmss(i.startDelaySeconds),
    inclineAdj: String(i.inclineGapAdjSec),
    declineAdj: String(i.declineGapAdjSec),
    midFade: String(i.midFadeSec),
    lastFade: String(i.lastFadeSec),
  };
}

export function renderForm(values: FormValues, opts: { embedded?: boolean } = {}): string {
  const action = "/report";
  const submitLabel = opts.embedded ? "Re-run with these inputs" : "Build my pacing plan";
  return `
<form class="form-card" method="get" action="${action}">
  <div class="form-row">
    <div class="field">
      <label for="goal">Goal time (gun, h:mm:ss)</label>
      <input id="goal" name="goal" type="text" value="${escapeHtml(values.goal)}" pattern="\\d+:\\d{2}:\\d{2}" required />
      <span class="hint">Final official clock you want to see at the finish.</span>
    </div>
    <div class="field">
      <label for="delay">Start delay (m:ss)</label>
      <input id="delay" name="delay" type="text" value="${escapeHtml(values.delay)}" pattern="\\d+:\\d{2}" required />
      <span class="hint">Time it takes you to cross the start line after the gun.</span>
    </div>
    <div class="field">
      <label for="inclineAdj">GAP adjustment for incline (sec/km)</label>
      <input id="inclineAdj" name="inclineAdj" type="number" min="0" max="60" step="1" value="${escapeHtml(values.inclineAdj)}" required />
      <span class="hint">Extra GAP on big climbs (rating +2). 0 = hold same effort uphill.</span>
    </div>
    <div class="field">
      <label for="declineAdj">GAP adjustment for decline (sec/km)</label>
      <input id="declineAdj" name="declineAdj" type="number" min="0" max="60" step="1" value="${escapeHtml(values.declineAdj)}" required />
      <span class="hint">Extra GAP on big descents (rating −2) to save the quads.</span>
    </div>
    <div class="field">
      <label for="midFade">Heat fade by km 60 (sec/km)</label>
      <input id="midFade" name="midFade" type="number" min="0" max="60" step="1" value="${escapeHtml(values.midFade)}" required />
      <span class="hint">Cumulative GAP slowdown reached by km 60.</span>
    </div>
    <div class="field">
      <label for="lastFade">Heat fade by finish (sec/km)</label>
      <input id="lastFade" name="lastFade" type="number" min="0" max="60" step="1" value="${escapeHtml(values.lastFade)}" required />
      <span class="hint">Cumulative GAP slowdown reached by km 85.777.</span>
    </div>
  </div>
  <div class="form-actions">
    <button type="submit">${submitLabel}</button>
    ${opts.embedded ? '<button type="button" class="secondary" onclick="document.getElementById(\'inputs-card\').open=false">Close</button>' : ""}
  </div>
</form>`;
}
