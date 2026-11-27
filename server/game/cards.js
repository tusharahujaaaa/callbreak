'use strict';
// Deck basics. Cards are strings: suit letter + rank, e.g. "S14" = Ace of Spades.
const crypto = require('crypto');

const SUITS = ['S', 'H', 'C', 'D'];
const SIDE_SUITS = ['H', 'C', 'D'];
const SYMBOLS = { S: '♠', H: '♥', C: '♣', D: '♦' };

const suit = (c) => c[0];
const rank = (c) => +c.slice(1);

function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push(s + r);
  return d;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortHand(hand) {
  const order = { S: 0, H: 1, C: 2, D: 3 };
  return hand.slice().sort((a, b) => order[suit(a)] - order[suit(b)] || rank(b) - rank(a));
}

const cardName = (c) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rank(c)] || rank(c)) + SYMBOLS[suit(c)];

module.exports = { SUITS, SIDE_SUITS, SYMBOLS, suit, rank, newDeck, shuffle, sortHand, cardName };
