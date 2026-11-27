'use strict';
// Round scoring. Scores are kept in tenths of a point to avoid floating-point drift.

function scoreFor(bid, won, settings) {
  const over = Math.round(settings.overtrickPoints * 10);
  if (won >= bid) {
    let base = bid * 10;
    if (settings.eightBidBonus && bid >= 8) base *= 2;
    return base + (won - bid) * over;
  }
  return -bid * 10;
}

module.exports = { scoreFor };
