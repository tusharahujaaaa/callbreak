'use strict';
// How bots decide their bid.
const { suit, rank, SUITS } = require('../game/cards');
const { rnd, clamp, ofSuit } = require('./helpers');

// Rough number of tricks a hand should take if `trump` is the trump suit.
function estimateTricks(hand, trump = 'S') {
  const SIDE_SUITS = SUITS.filter((x) => x !== trump);
  const by = { S: [], H: [], C: [], D: [] };
  hand.forEach((c) => by[suit(c)].push(rank(c)));
  let t = 0;

  for (const s of SIDE_SUITS) {
    const r = by[s];
    const n = r.length;
    const has = (x) => r.includes(x);
    if (has(14)) t += n <= 5 ? 1 : n <= 7 ? 0.7 : 0.4;
    if (has(13)) {
      if (n === 1) t += 0.15;
      else if (n <= 5) t += has(14) ? 0.9 : 0.6;
      else t += 0.3;
    }
    if (has(12) && n >= 3 && n <= 5) t += has(14) || has(13) ? 0.45 : 0.25;
  }

  const sp = by[trump] || []; // trump = null: no trump yet, count side-suit strength only
  const ns = sp.length;
  let honors = 0;
  if (sp.includes(14)) { t += 1; honors++; }
  if (sp.includes(13)) { t += ns >= 2 ? 0.95 : 0.5; honors++; }
  if (sp.includes(12)) { t += ns >= 3 ? 0.8 : 0.3; honors++; }
  if (sp.includes(11)) { t += ns >= 4 ? 0.6 : 0.15; honors++; }
  if (ns > 4) t += (ns - 4) * 0.85;

  // Low spades can ruff short side suits.
  let spare = Math.max(0, Math.min(ns, 5) - honors);
  for (const s of SIDE_SUITS) {
    const n = by[s].length;
    const potential = n === 0 ? 2 : n === 1 ? 1 : n === 2 ? 0.5 : 0;
    const used = Math.min(spare, potential);
    t += used * 0.75;
    spare -= Math.ceil(used);
    if (spare <= 0) break;
  }
  return t;
}

// The suit that makes this hand strongest.
function bestTrump(hand) {
  let best = 'S', bestT = -1;
  for (const s of SUITS) {
    const t = estimateTricks(hand, s);
    if (t > bestT) { bestT = t; best = s; }
  }
  return { suit: best, tricks: bestT };
}

// Expected tricks before trump is known. In 'bidder' mode the trump isn't settled yet, and
// usually someone else picks it: count high cards only, unless our best suit is strong enough
// to outbid everyone so far and win the call (then we'll choose that suit).
// (Tested over 400 bot games: this beats valuing with the best suit or with Spades.)
function handValue(g, hand, seat) {
  if (g.s.trumpMode !== 'bidder') return estimateTricks(hand, 'S');
  const best = bestTrump(hand).tricks * 0.92;
  const others = g.bids.filter((b, i) => i !== seat && b !== null);
  const maxOther = others.length ? Math.max(...others) : 0;
  return best >= maxOther + 1.5 && best >= 4 ? best : estimateTricks(hand, null);
}

function beginnerBid(hand) {
  const high = hand.filter((c) => rank(c) >= 13).length;
  const ns = ofSuit(hand, 'S').length;
  return Math.round(high * 0.8 + Math.max(0, ns - 3) * 0.6 + rnd(-1.3, 1.3));
}

function intermediateBid(g, seat, hand) {
  return Math.round(handValue(g, hand, seat) + rnd(-0.5, 0.5));
}

function proBid(g, seat, hand) {
  const exact = handValue(g, hand, seat);
  let est = Math.floor(exact + 0.4);
  // Last to bid: avoid a pointless low-bid redeal if our hand can stretch a little.
  const others = g.bids.filter((b, i) => i !== seat && b !== null);
  if (g.s.redealLowBid && others.length === 3) {
    const total = others.reduce((a, b) => a + b, 0);
    if (total + est < g.s.lowBidThreshold && total + est + 1 >= g.s.lowBidThreshold && exact - est > 0.3) est++;
  }
  return est;
}

function chooseBid(g, seat, level) {
  const hand = g.hands[seat];
  let est;
  if (level === 'beginner') est = beginnerBid(hand);
  else if (level === 'intermediate') est = intermediateBid(g, seat, hand);
  else est = proBid(g, seat, hand);
  return clamp(est, g.s.minBid, g.s.maxBid);
}

// The highest bidder picks trump. Beginners pick their longest suit; others pick their strongest.
function chooseTrump(g, seat, level) {
  const hand = g.hands[seat];
  if (level === 'beginner') {
    return SUITS.slice().sort((a, b) => ofSuit(hand, b).length - ofSuit(hand, a).length)[0];
  }
  return bestTrump(hand).suit;
}

module.exports = { chooseBid, chooseTrump, estimateTricks };
