'use strict';
// Bot entry point: pick a bid or a card for a seat at a given level.
const { chooseBid, chooseTrump, estimateTricks } = require('./bidding');
const levels = {
  beginner: require('./levels/beginner'),
  intermediate: require('./levels/intermediate'),
  pro: require('./levels/pro'),
};

function chooseCard(g, seat, level) {
  const hand = g.hands[seat];
  const legal = g.legalFor(seat);
  if (legal.length === 1) return legal[0];
  return (levels[level] || levels.intermediate).play(g, seat, hand, legal);
}

module.exports = { chooseBid, chooseCard, chooseTrump, estimateTricks, LEVELS: Object.keys(levels) };
