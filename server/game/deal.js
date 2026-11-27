'use strict';
// The deal: cards go out in batches of 5, 4, 4, starting with the player after the dealer
// and ending with the dealer. The client animates the same timeline.

const DEAL_BATCHES = [5, 4, 4];

// Per-card interval, pause between batches, and flight time (ms), by bot-speed setting.
const DEAL_TIMING = {
  slow: { interval: 95, pause: 400, flight: 520 },
  normal: { interval: 62, pause: 300, flight: 450 },
  fast: { interval: 36, pause: 180, flight: 360 },
};

function dealOrder(dealer, next) {
  const order = [];
  let p = dealer;
  for (let i = 0; i < 4; i++) order.push((p = next(p)));
  return order;
}

// Hands in the order each player received their cards.
function distribute(deck, order) {
  const hands = [[], [], [], []];
  let i = 0;
  for (const batch of DEAL_BATCHES) {
    for (const p of order) for (let k = 0; k < batch; k++) hands[p].push(deck[i++]);
  }
  return hands;
}

function dealTiming(speed) {
  return DEAL_TIMING[speed] || DEAL_TIMING.normal;
}

function dealDuration(t) {
  return 52 * t.interval + (DEAL_BATCHES.length - 1) * t.pause + t.flight + 500;
}

module.exports = { DEAL_BATCHES, dealOrder, distribute, dealTiming, dealDuration };
