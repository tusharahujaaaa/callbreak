'use strict';
// Game flow: deal → (redeal checks) → bidding → (low-bid check) → [highest bidder picks trump] → 13 tricks → scoring.
const crypto = require('crypto');
const { suit, newDeck, shuffle, sortHand, cardName, SUITS, SYMBOLS } = require('./cards');
const { winnerIndex, legalCards } = require('./rules');
const { scoreFor } = require('./scoring');
const { preBidRedealReason, lowBidRedealReason } = require('./redeal');
const { DEAL_BATCHES, dealOrder, distribute, dealTiming, dealDuration } = require('./deal');

const TRICK_PAUSE = { slow: 1800, normal: 1300, fast: 750 };
const AUTO_NEXT_ROUND_MS = 7000;
const SUIT_NAMES = { S: 'Spades', H: 'Hearts', C: 'Clubs', D: 'Diamonds' };

class LakdiGame {
  /**
   * @param settings sanitized settings
   * @param names    function(seat) -> display name
   * @param hooks    { changed(), schedule(ms, fn) }
   */
  constructor(settings, names, hooks) {
    this.s = { ...settings };
    this.names = names;
    this.hooks = hooks;
    this.round = 0;
    this.dealer = crypto.randomInt(4);
    this.totals = [0, 0, 0, 0];
    this.history = [];
    this.log = [];
    this.logId = 0;
    this.dealCount = 0;
    this.phase = 'init';
    this.turn = -1;
    this.resetHandState([[], [], [], []]);
  }

  resetHandState(hands) {
    this.hands = hands;
    this.bids = [null, null, null, null];
    this.won = [0, 0, 0, 0];
    this.trick = [];
    this.lastTrick = null;
    this.trickWinner = null;
    this.played = [];
    this.voids = [0, 1, 2, 3].map(() => ({ S: false, H: false, C: false, D: false }));
    this.trumpBroken = false;
    this.tricksDone = 0;
    // Spades unless the host lets the highest bidder choose (decided after bidding).
    this.trump = this.s.trumpMode === 'bidder' ? null : 'S';
    this.trumpChooser = null;
  }

  next(seat) {
    return this.s.direction === 'clockwise' ? (seat + 1) % 4 : (seat + 3) % 4;
  }

  addLog(msg, kind = '') {
    this.log.push({ id: ++this.logId, msg, kind });
    if (this.log.length > 80) this.log.shift();
  }

  changed() {
    this.hooks.changed();
  }

  // ----- Round lifecycle -----

  start() {
    this.startRound();
  }

  startRound() {
    this.round++;
    this.addLog(`Round ${this.round} of ${this.s.rounds}: ${this.names(this.dealer)} deals`, 'round');
    this.deal();
  }

  deal() {
    const order = dealOrder(this.dealer, (p) => this.next(p));
    let dealt, hands;
    for (let attempt = 0; attempt < 200; attempt++) {
      dealt = distribute(shuffle(newDeck()), order);
      hands = dealt.map(sortHand);
      const reason = preBidRedealReason(hands, this.s, this.names);
      if (!reason) break;
      this.addLog(`Redeal: ${reason}`, 'redeal');
    }
    this.dealCount++;
    this.resetHandState(hands);
    this.dealtHands = dealt; // unsorted, in the order received (for the deal animation)

    if (this.s.dealAnimation) {
      const timing = dealTiming(this.s.botSpeed);
      const id = this.dealCount;
      this.dealInfo = { id, startedAt: Date.now(), dealer: this.dealer, order, batches: DEAL_BATCHES, ...timing };
      this.phase = 'dealing';
      this.turn = -1;
      this.hooks.schedule(dealDuration(timing), () => {
        if (this.phase !== 'dealing' || this.dealCount !== id) return;
        this.startBidding();
        this.changed();
      });
    } else {
      this.dealInfo = null;
      this.startBidding();
    }
    this.changed();
  }

  startBidding() {
    this.phase = 'bidding';
    this.turn = this.next(this.dealer);
  }

  nextRound() {
    if (this.phase !== 'roundEnd') return 'Round is not over';
    this.dealer = this.next(this.dealer);
    this.startRound();
    return null;
  }

  // ----- Bidding -----

  bid(seat, value) {
    if (this.phase !== 'bidding' || seat !== this.turn) return 'Not your turn to bid';
    value = Number(value);
    if (!Number.isInteger(value) || value < this.s.minBid || value > this.s.maxBid)
      return `Bid must be between ${this.s.minBid} and ${this.s.maxBid}`;
    this.bids[seat] = value;
    this.addLog(`${this.names(seat)} bids ${value}`);

    if (this.bids.every((b) => b !== null)) {
      const reason = lowBidRedealReason(this.bids, this.s, this.round);
      if (reason) {
        this.addLog(`Redeal: ${reason}`, 'redeal');
        this.deal();
        return null;
      }
      if (this.s.trumpMode === 'bidder') {
        this.trumpChooser = this.highestBidder();
        this.phase = 'choosingTrump';
        this.turn = this.trumpChooser;
        this.addLog(`${this.names(this.trumpChooser)} has the highest bid and will choose trump`);
      } else {
        this.startPlay();
      }
    } else {
      this.turn = this.next(seat);
    }
    this.changed();
    return null;
  }

  // Highest bid wins the trump call; on a tie, whoever bid it first (in bidding order).
  highestBidder() {
    let best = -1, who = null;
    for (let p = this.next(this.dealer), i = 0; i < 4; i++, p = this.next(p)) {
      if (this.bids[p] > best) { best = this.bids[p]; who = p; }
    }
    return who;
  }

  // ----- Choosing trump -----

  chooseTrump(seat, suitChoice) {
    if (this.phase !== 'choosingTrump' || seat !== this.turn) return 'Not your turn to choose trump';
    if (!SUITS.includes(suitChoice)) return 'Pick Spades, Hearts, Clubs or Diamonds';
    this.trump = suitChoice;
    this.addLog(`${this.names(seat)} chooses ${SYMBOLS[suitChoice]} ${SUIT_NAMES[suitChoice]} as trump`, 'trump');
    this.startPlay();
    this.changed();
    return null;
  }

  startPlay() {
    this.phase = 'playing';
    this.turn = this.next(this.dealer);
  }

  // ----- Playing -----

  legalFor(seat) {
    return legalCards(this.hands[seat], this.trick, this.s, this.trumpBroken, this.trump);
  }

  // Track publicly visible voids (used by smarter bots).
  trackVoids(seat, card) {
    if (!this.trick.length) return;
    const led = suit(this.trick[0].card);
    if (suit(card) === led) return;
    this.voids[seat][led] = true;
    const T = this.trump;
    if (led !== T && suit(card) !== T && this.s.mustTrump) {
      const win = this.trick[winnerIndex(this.trick, T)].card;
      if (!(suit(win) === T && this.s.discardIfCantOvertrump)) this.voids[seat][T] = true;
    }
  }

  play(seat, card) {
    if (this.phase !== 'playing' || seat !== this.turn) return 'Not your turn';
    if (!this.legalFor(seat).includes(card)) return 'That card is not allowed right now';

    this.trackVoids(seat, card);
    this.hands[seat] = this.hands[seat].filter((c) => c !== card);
    this.trick.push({ seat, card });
    this.played.push(card);
    if (suit(card) === this.trump) this.trumpBroken = true;

    if (this.trick.length === 4) {
      const w = this.trick[winnerIndex(this.trick, this.trump)];
      this.trickWinner = w.seat;
      this.phase = 'trickEnd';
      this.turn = -1;
      this.addLog(`${this.names(w.seat)} wins the trick with ${cardName(w.card)}`);
      this.hooks.schedule(TRICK_PAUSE[this.s.botSpeed] || TRICK_PAUSE.normal, () => this.collect());
    } else {
      this.turn = this.next(seat);
    }
    this.changed();
    return null;
  }

  collect() {
    if (this.phase !== 'trickEnd') return;
    const w = this.trickWinner;
    this.won[w]++;
    this.lastTrick = { cards: this.trick, winner: w };
    this.trick = [];
    this.trickWinner = null;
    this.tricksDone++;
    if (this.tricksDone >= 13) {
      this.endRound();
    } else {
      this.phase = 'playing';
      this.turn = w;
    }
    this.changed();
  }

  // ----- Scoring -----

  scoreFor(bid, won) {
    return scoreFor(bid, won, this.s);
  }

  endRound() {
    const deltas = [0, 1, 2, 3].map((i) => this.scoreFor(this.bids[i], this.won[i]));
    deltas.forEach((d, i) => (this.totals[i] += d));
    this.history.push({ round: this.round, bids: [...this.bids], won: [...this.won], deltas });
    for (let i = 0; i < 4; i++) {
      const d = deltas[i] / 10;
      this.addLog(`${this.names(i)}: bid ${this.bids[i]}, won ${this.won[i]} → ${d > 0 ? '+' : ''}${d.toFixed(1)}`);
    }
    this.turn = -1;

    if (this.round >= this.s.rounds) {
      this.phase = 'gameOver';
      const best = Math.max(...this.totals);
      const winners = [0, 1, 2, 3].filter((i) => this.totals[i] === best).map((i) => this.names(i));
      this.addLog(`Game over! Winner: ${winners.join(' & ')}`, 'round');
      return;
    }

    this.phase = 'roundEnd';
    if (this.s.autoNextRound) {
      const r = this.round;
      this.hooks.schedule(AUTO_NEXT_ROUND_MS, () => {
        if (this.phase === 'roundEnd' && this.round === r) this.nextRound();
      });
    }
  }
}

module.exports = { LakdiGame };
