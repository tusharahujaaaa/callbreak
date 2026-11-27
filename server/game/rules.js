'use strict';
// Trick rules: who wins a trick and which cards are legal to play.
// `trump` is the trump suit for the round ('S' unless the host lets the highest bidder choose).
const { suit, rank } = require('./cards');

// Does card `a` beat the current winning card `w`? (w is always the led suit or a trump.)
function beats(a, w, trump = 'S') {
  if (suit(a) === suit(w)) return rank(a) > rank(w);
  return suit(a) === trump;
}

function winnerIndex(trick, trump = 'S') {
  let best = 0;
  for (let i = 1; i < trick.length; i++) if (beats(trick[i].card, trick[best].card, trump)) best = i;
  return best;
}

// Which cards in `hand` may legally be played onto `trick`, under the host's settings.
function legalCards(hand, trick, s, trumpBroken, trump = 'S') {
  if (trick.length === 0) {
    if (s.spadesMustBeBroken && !trumpBroken) {
      const nonTrumps = hand.filter((c) => suit(c) !== trump);
      if (nonTrumps.length) return nonTrumps;
    }
    return hand.slice();
  }
  const led = suit(trick[0].card);
  const win = trick[winnerIndex(trick, trump)].card;
  const ofLed = hand.filter((c) => suit(c) === led);

  if (ofLed.length) {
    if (!s.mustFollowSuit) return hand.slice();
    if (s.mustOvercard && suit(win) === led) {
      const higher = ofLed.filter((c) => rank(c) > rank(win));
      if (higher.length) return higher;
    }
    return ofLed;
  }

  // Void in the led suit.
  const trumps = hand.filter((c) => suit(c) === trump);
  if (trumps.length && s.mustTrump) {
    if (suit(win) === trump) {
      const higher = trumps.filter((c) => rank(c) > rank(win));
      if (higher.length && s.mustOvertrump) return higher;
      if (!higher.length && s.discardIfCantOvertrump) return hand.slice();
    }
    return trumps;
  }
  return hand.slice();
}

module.exports = { beats, winnerIndex, legalCards };
