'use strict';
// Intermediate: cashes Aces, wins tricks cheaply, throws away low cards.
const { suit, rank } = require('../../game/cards');
const { lowest, highest, winnersOf, lowFromLongestSide, discard } = require('../helpers');

function lead(hand, legal, T) {
  const aces = legal.filter((c) => rank(c) === 14 && suit(c) !== T);
  if (aces.length) return aces[0];
  const side = legal.filter((c) => suit(c) !== T);
  return (side.length && lowFromLongestSide(side, hand, T)) || lowest(legal);
}

function follow(g, seat, hand, legal) {
  const need = g.bids[seat] - g.won[seat];
  const wins = winnersOf(g, legal);
  const T = g.trump;
  if (!wins.length) return discard(legal, hand, undefined, T);

  const led = suit(g.trick[0].card);
  if (g.trick.length === 3) return lowest(wins); // last to play: cheapest winner
  if (led !== T && wins.every((c) => suit(c) === T)) return lowest(wins); // cheapest trump
  const h = highest(wins);
  if (need > 0 && rank(h) >= 13) return h;
  return lowest(wins);
}

function play(g, seat, hand, legal) {
  return g.trick.length ? follow(g, seat, hand, legal) : lead(hand, legal, g.trump);
}

module.exports = { play };
