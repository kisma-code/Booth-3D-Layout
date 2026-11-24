// BU (business unit) tag colours and ordering, shared by the booth and the editor.
const BU_COLORS = { HV: '#ff6b7d', TR: '#ffb347', SV: '#5aa9ff', GI: '#4cd48a', GA: '#b98cff', CASE: '#3fd0d4', HR: '#f78fd0' };
const BU_FALLBACK = ['#ffd24d', '#7ee0c3', '#ff9a6b', '#9fb4ff', '#e07ef0'];
export const NO_BU_COLOR = '#a9adb6';

export const buKey = (bu) => String(bu || '').trim().toUpperCase();

/** Tag colour for a BU. Unknown BUs get a stable colour from their name. */
export function buColor(bu) {
  const key = buKey(bu);
  if (!key) return NO_BU_COLOR;
  if (BU_COLORS[key]) return BU_COLORS[key];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BU_FALLBACK[h % BU_FALLBACK.length];
}

/** Compare two BU names: A–Z, empty BU last. */
export const compareBu = (a, b) => (!buKey(a)) - (!buKey(b)) || buKey(a).localeCompare(buKey(b));
