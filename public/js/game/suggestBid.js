// A rough "how many tricks is this hand worth?" used to suggest a call in the bid picker.
// Counts sure winners (aces, protected kings), trump strength and short suits you can trump.
const rank = (c) => +c.slice(1);
const suit = (c) => c[0];

function estimate(hand, trump) {
  const by = { S: [], H: [], C: [], D: [] };
  for (const c of hand) by[suit(c)].push(rank(c));
  let t = 0;
  for (const s of ['S', 'H', 'C', 'D']) {
    if (s === trump) continue;
    const r = by[s], n = r.length;
    if (r.includes(14)) t += n <= 5 ? 1 : 0.7;
    if (r.includes(13)) t += n >= 2 && n <= 5 ? (r.includes(14) ? 0.9 : 0.6) : 0.2;
    if (r.includes(12) && n >= 3 && n <= 4) t += 0.3;
  }
  if (trump) {
    const sp = by[trump], ns = sp.length;
    let honors = 0;
    if (sp.includes(14)) { t += 1; honors++; }
    if (sp.includes(13)) { t += ns >= 2 ? 0.9 : 0.4; honors++; }
    if (sp.includes(12)) { t += ns >= 3 ? 0.7 : 0.2; honors++; }
    if (ns > 4) t += (ns - 4) * 0.85;
    let spare = Math.max(0, Math.min(ns, 5) - honors);
    for (const s of ['S', 'H', 'C', 'D']) {
      if (s === trump || spare <= 0) continue;
      const n = by[s].length;
      const ruffs = n === 0 ? 2 : n === 1 ? 1 : n === 2 ? 0.5 : 0;
      const used = Math.min(spare, ruffs);
      t += used * 0.7;
      spare -= Math.ceil(used);
    }
  }
  return t;
}

/** Suggested call, clamped to the table's allowed range. */
export function suggestBid(hand, settings) {
  let t;
  if (settings.trumpMode === 'bidder') {
    // Trump isn't known yet: high cards only, plus a little for a long suit you might name.
    const best = Math.max(...['S', 'H', 'C', 'D'].map((s) => estimate(hand, s)));
    t = Math.max(estimate(hand, null), best * 0.8);
  } else {
    t = estimate(hand, 'S');
  }
  return Math.min(settings.maxBid, Math.max(settings.minBid, Math.round(t)));
}
