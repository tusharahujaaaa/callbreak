'use strict';
// Pro: counts cards, tracks who is void, plays safe winners, draws trumps,
// builds voids for ruffing and avoids feeding opponents' trumps.
// Only uses public information (cards played, visible voids) plus its own hand.
const { suit, rank, newDeck } = require('../../game/cards');
const { byRankAsc, lowest, highest, ofSuit, winnersOf, lowFromLongestSide, discard, sideSuits } = require('../helpers');

// What the bot knows about the cards still out there.
function knowledge(g, seat, hand) {
  const seen = new Set(g.played.concat(hand));
  const unseen = newDeck().filter((c) => !seen.has(c));
  const unseenOf = (s) => ofSuit(unseen, s);
  const isBoss = (c) => !unseen.some((u) => suit(u) === suit(c) && rank(u) > rank(c));
  const opps = [0, 1, 2, 3].filter((p) => p !== seat);
  // Opponent known (or very likely) to ruff suit s.
  const T = g.trump;
  const canRuff = (p, s, left) => (g.voids[p][s] || left === 0) && !g.voids[p][T] && unseenOf(T).length > 0;
  return { unseenOf, isBoss, opps, canRuff, T };
}

function lead(g, seat, hand, legal, k) {
  const { unseenOf, isBoss, opps, canRuff, T } = k;
  const trumpsLeft = unseenOf(T).length;
  const myTrumps = ofSuit(hand, T);

  // 1. Cash side-suit winners that are unlikely to be trumped.
  const cash = legal
    .filter((c) => suit(c) !== T && isBoss(c))
    .map((c) => {
      const left = unseenOf(suit(c)).length;
      const risk = opps.some((p) => canRuff(p, suit(c), left));
      return { c, left, ok: trumpsLeft === 0 || (!risk && left >= 3) };
    })
    .filter((x) => x.ok)
    .sort((a, b) => b.left - a.left);
  if (cash.length) return cash[0].c;

  // 2. Draw out trumps with top trumps when long in trumps.
  const bossTrumps = legal.filter((c) => suit(c) === T && isBoss(c));
  if (bossTrumps.length && trumpsLeft > 0 && myTrumps.length >= 3) return highest(bossTrumps);
  if (trumpsLeft === 0 && bossTrumps.length) return highest(bossTrumps);

  // Prefer suits opponents can't ruff.
  const safeSuit = (s) => !opps.some((p) => canRuff(p, s, unseenOf(s).length));
  const side = legal.filter((c) => suit(c) !== T);
  const sidePref = side.filter((c) => safeSuit(suit(c)));
  const pool = sidePref.length ? sidePref : side;

  // 3. Lead from a short suit to set up ruffs later.
  if (myTrumps.length && pool.length) {
    const shorts = sideSuits(T).map((s) => ofSuit(pool, s))
      .filter((a) => a.length && ofSuit(hand, suit(a[0])).length <= 2 && !a.some(isBoss))
      .sort((a, b) => a.length - b.length);
    if (shorts.length) return lowest(shorts[0]);
  }
  // 4. Low card from the longest side suit.
  return (pool.length && lowFromLongestSide(pool, hand, T)) || lowest(legal);
}

function follow(g, seat, hand, legal, k) {
  const { unseenOf, isBoss, T } = k;
  const led = suit(g.trick[0].card);
  const later = [];
  for (let p = seat, i = 0; i < 3 - g.trick.length; i++) later.push((p = g.next(p)));
  const ledLeft = unseenOf(led).length;
  const likelyVoid = (p) => g.voids[p][led] || ledLeft < later.length;

  // Will this card still be winning when the trick is complete?
  const safe = (c) => {
    if (!later.length) return true;
    if (suit(c) === T && led !== T) {
      if (isBoss(c)) return true;
      return !later.some((p) => likelyVoid(p) && !g.voids[p][T]);
    }
    if (!isBoss(c)) return false;
    if (led === T) return true;
    return !(unseenOf(T).length && later.some((p) => likelyVoid(p) && !g.voids[p][T]));
  };

  const wins = winnersOf(g, legal);
  if (wins.length) {
    const safeWins = wins.filter(safe).sort(byRankAsc);
    if (safeWins.length) return safeWins[0];
    return lowest(wins); // can't guarantee it: conserve high cards
  }
  return discard(legal, hand, isBoss, T);
}

function play(g, seat, hand, legal) {
  const k = knowledge(g, seat, hand);
  return g.trick.length ? follow(g, seat, hand, legal, k) : lead(g, seat, hand, legal, k);
}

module.exports = { play };
