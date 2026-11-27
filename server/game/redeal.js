'use strict';
// Redeal checks the host can switch on or off.
const { suit, rank } = require('./cards');

// Checked right after the deal, before bidding.
function preBidRedealReason(hands, settings, names) {
  for (let i = 0; i < hands.length; i++) {
    if (settings.redealNoSpade && !hands[i].some((c) => suit(c) === 'S'))
      return `${names(i)} was dealt no Spades`;
    if (settings.redealNoFace && !hands[i].some((c) => rank(c) >= 11))
      return `${names(i)} was dealt no face cards`;
  }
  return null;
}

// Checked once all four bids are in.
function lowBidRedealReason(bids, settings, round) {
  if (!settings.redealLowBid) return null;
  const total = bids.reduce((a, b) => a + b, 0);
  const finalRound = round >= settings.rounds;
  if (total < settings.lowBidThreshold && !(settings.lowBidSkipFinal && finalRound))
    return `total bid ${total} is below ${settings.lowBidThreshold}`;
  return null;
}

module.exports = { preBidRedealReason, lowBidRedealReason };
