'use strict';
// Host-configurable table rules: defaults and validation.

const DEFAULT_SETTINGS = {
  rounds: 5,
  direction: 'anticlockwise',
  minBid: 1,
  maxBid: 13,
  overtrickPoints: 0.1,
  eightBidBonus: false,
  redealNoSpade: true,
  redealNoFace: true,
  redealLowBid: true,
  lowBidThreshold: 8,
  lowBidSkipFinal: false,
  mustFollowSuit: true,
  mustOvercard: true,
  mustTrump: true,
  mustOvertrump: true,
  discardIfCantOvertrump: false,
  spadesMustBeBroken: false,
  trumpMode: 'spades', // 'spades' = Spades always trump; 'bidder' = highest bidder chooses
  dealAnimation: true,
  turnTimer: 0,
  botSpeed: 'normal',
  autoNextRound: false,
};

// key: [min, max, step]
const NUMERIC = {
  rounds: [1, 20, 1],
  minBid: [0, 13, 1],
  maxBid: [1, 13, 1],
  overtrickPoints: [0, 1, 0.1],
  lowBidThreshold: [1, 40, 1],
  turnTimer: [0, 120, 1],
};

const ENUMS = {
  direction: ['anticlockwise', 'clockwise'],
  botSpeed: ['slow', 'normal', 'fast'],
  trumpMode: ['spades', 'bidder'],
};

function sanitizeSettings(input, prev = DEFAULT_SETTINGS) {
  const out = { ...prev };
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!(key in input)) continue;
    const v = input[key];
    if (NUMERIC[key]) {
      const [min, max, step] = NUMERIC[key];
      let n = Number(v);
      if (!Number.isFinite(n)) continue;
      n = Math.min(max, Math.max(min, n));
      n = Math.round(n / step) * step;
      out[key] = step < 1 ? Math.round(n * 10) / 10 : n;
    } else if (ENUMS[key]) {
      if (ENUMS[key].includes(v)) out[key] = v;
    } else {
      out[key] = !!v;
    }
  }
  if (out.maxBid < out.minBid) out.maxBid = Math.max(out.minBid, 1);
  return out;
}

module.exports = { DEFAULT_SETTINGS, sanitizeSettings };
