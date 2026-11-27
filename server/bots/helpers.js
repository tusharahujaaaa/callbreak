'use strict';
// Small helpers shared by all bot levels.
const { suit, rank, SIDE_SUITS } = require('../game/cards');
const { beats, winnerIndex } = require('../game/rules');

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const byRankAsc = (a, b) => rank(a) - rank(b);
const lowest = (cards) => cards.slice().sort(byRankAsc)[0];
const highest = (cards) => cards.slice().sort(byRankAsc).pop();
const ofSuit = (cards, s) => cards.filter((c) => suit(c) === s);

function currentWin(g) {
  return g.trick.length ? g.trick[winnerIndex(g.trick, g.trump)].card : null;
}

// Legal cards that would beat the card currently winning the trick.
function winnersOf(g, legal) {
  const w = currentWin(g);
  return w ? legal.filter((c) => beats(c, w, g.trump)) : [];
}

const SUITS_ALL = ['S', 'H', 'C', 'D'];
const sideSuits = (trump) => SUITS_ALL.filter((s) => s !== trump);

// Lowest card of the longest non-trump suit in `pool` (by length in `hand`).
function lowFromLongestSide(pool, hand, trump = 'S') {
  const longest = sideSuits(trump).filter((s) => ofSuit(pool, s).length)
    .sort((a, b) => ofSuit(hand, b).length - ofSuit(hand, a).length)[0];
  return longest ? lowest(ofSuit(pool, longest)) : null;
}

// Free discard: shed the lowest card from the shortest side suit (prefer not to throw trumps/aces).
function discard(legal, hand, isBoss = () => false, trump = 'S') {
  const suits = new Set(legal.map(suit));
  if (suits.size === 1) return lowest(legal);
  let pool = legal.filter((c) => suit(c) !== trump);
  if (!pool.length) return lowest(legal);
  const nonBoss = pool.filter((c) => !isBoss(c) && rank(c) < 14);
  if (nonBoss.length) pool = nonBoss;
  pool.sort((a, b) => ofSuit(hand, suit(a)).length - ofSuit(hand, suit(b)).length || rank(a) - rank(b));
  return pool[0];
}

module.exports = { rnd, clamp, byRankAsc, lowest, highest, ofSuit, currentWin, winnersOf, lowFromLongestSide, discard, sideSuits };
