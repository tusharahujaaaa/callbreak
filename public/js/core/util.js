// Small shared helpers.
export const $ = (s) => document.querySelector(s);

export const SYM = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const suit = (c) => c[0];
export const rank = (c) => +c.slice(1);
export const rankText = (r) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] || String(r));

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// Scores arrive in tenths of a point.
export const pts = (tenths) => { const v = tenths / 10; return (v > 0 ? '+' : '') + v.toFixed(1); };
export const total = (tenths) => (tenths / 10).toFixed(1);
