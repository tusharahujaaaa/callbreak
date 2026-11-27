'use strict';
// Beginner: plays a random legal card.

function play(g, seat, hand, legal) {
  return legal[Math.floor(Math.random() * legal.length)];
}

module.exports = { play };
