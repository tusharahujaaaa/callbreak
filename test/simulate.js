'use strict';
// Headless simulation: bots play many full games; checks rules invariants and compares bot levels.
const assert = require('assert');
const R = { ...require('../server/game/cards'), ...require('../server/game/rules'), ...require('../server/game/settings') };
const { LakdiGame } = require('../server/game/LakdiGame');
const Bots = require('../server/bots');

const trumpsSeen = new Set();
function runGame(levels, settings) {
  const queue = [];
  const g = new LakdiGame(R.sanitizeSettings(settings || {}), (i) => 'P' + i, {
    changed() {}, schedule(ms, fn) { queue.push(fn); },
  });
  g.start();
  let steps = 0;
  while (g.phase !== 'gameOver') {
    if (++steps > 100000) throw new Error('stuck');
    if (queue.length) { queue.shift()(); continue; }
    if (g.phase === 'roundEnd') { g.nextRound(); continue; }
    const seat = g.turn;
    if (g.phase === 'bidding') {
      const b = Bots.chooseBid(g, seat, levels[seat]);
      assert(b >= g.s.minBid && b <= g.s.maxBid);
      assert.strictEqual(g.bid(seat, b), null);
    } else if (g.phase === 'choosingTrump') {
      assert.strictEqual(seat, g.highestBidder());
      const t = Bots.chooseTrump(g, seat, levels[seat]);
      assert.notStrictEqual(g.chooseTrump((seat + 1) % 4, t), null, 'only the highest bidder may choose');
      assert.strictEqual(g.chooseTrump(seat, t), null);
      assert.strictEqual(g.trump, t);
      trumpsSeen.add(t);
    } else if (g.phase === 'playing') {
      const legal = g.legalFor(seat);
      assert(legal.length > 0);
      const c = Bots.chooseCard(g, seat, levels[seat]);
      assert(legal.includes(c), 'bot played illegal card');
      // An illegal card must be rejected.
      const illegal = g.hands[seat].find((x) => !legal.includes(x));
      if (illegal) assert.notStrictEqual(g.play(seat, illegal), null);
      assert.strictEqual(g.play(seat, c), null);
    }
  }
  for (const h of g.history) assert.strictEqual(h.won.reduce((a, b) => a + b, 0), 13);
  return g;
}

// Unit checks on legal-move rules.
const S = R.DEFAULT_SETTINGS;
const T = (...cs) => cs.map((card, seat) => ({ seat, card }));
assert.deepStrictEqual(R.legalCards(['H5', 'H12', 'C3'], T('H10'), S, false), ['H12']);          // must overcard
assert.deepStrictEqual(R.legalCards(['H5', 'H9', 'C3'], T('H10'), S, false), ['H5', 'H9']);      // can't beat: any of suit
assert.deepStrictEqual(R.legalCards(['S5', 'S9', 'C3'], T('H10'), S, false), ['S5', 'S9']);      // must trump
assert.deepStrictEqual(R.legalCards(['S5', 'S9', 'C3'], T('H10', 'S7'), S, false), ['S9']);      // must over-trump
assert.deepStrictEqual(R.legalCards(['S5', 'C3'], T('H10', 'S7'), S, false), ['S5']);            // can't over-trump: still spade
assert.deepStrictEqual(R.legalCards(['S5', 'C3'], T('H10', 'S7'), { ...S, discardIfCantOvertrump: true }, false), ['S5', 'C3']);
assert.deepStrictEqual(R.legalCards(['H5', 'H12'], T('H10', 'S2'), S, false), ['H5', 'H12']);    // trumped: any of led suit
assert.deepStrictEqual(R.legalCards(['H5', 'H12', 'C3'], T('H10'), { ...S, mustOvercard: false }, false), ['H5', 'H12']);
assert.deepStrictEqual(R.legalCards(['S5', 'C3'], [], { ...S, spadesMustBeBroken: true }, false), ['C3']);
const g0 = new LakdiGame(S, () => '', { changed() {}, schedule() {} });
// Trump = Hearts: a heart beats a spade lead; spades are just another suit.
assert.deepStrictEqual(R.legalCards(['H5', 'S9', 'C3'], T('D10'), S, false, 'H'), ['H5']);
assert.strictEqual(R.winnerIndex(T('S14', 'H2', 'S13'), 'H'), 1);
assert.strictEqual(R.winnerIndex(T('S14', 'H2', 'S13'), 'S'), 0);
assert.deepStrictEqual(R.legalCards(['H5', 'S9'], [], { ...S, spadesMustBeBroken: true }, false, 'H'), ['S9']);
assert.strictEqual(g0.scoreFor(4, 4), 40);
assert.strictEqual(g0.scoreFor(4, 6), 42);
assert.strictEqual(g0.scoreFor(4, 3), -40);
console.log('rule checks passed');

const N = Number(process.argv[2]) || 300;
const LV = ['beginner', 'intermediate', 'pro'];
const sums = {}; const made = {}; const bids = {};
LV.forEach((l) => { sums[l] = 0; made[l] = [0, 0]; });
for (let i = 0; i < N; i++) {
  const levels = [0, 1, 2, 3].map((k) => LV[(k + i) % 3]);
  const variants = [{}, { direction: 'clockwise' }, { spadesMustBeBroken: true, discardIfCantOvertrump: true }, { mustOvercard: false, eightBidBonus: true }, { trumpMode: 'bidder' }, { trumpMode: 'bidder', spadesMustBeBroken: true }];
  const g = runGame(levels, variants[i % variants.length]);
  levels.forEach((l, s) => {
    sums[l] += g.totals[s] / 10;
    g.history.forEach((h) => { made[l][1]++; if (h.won[s] >= h.bids[s]) made[l][0]++; });
  });
}
for (const l of LV) console.log(`${l.padEnd(13)} avg game score ${(sums[l] / (N * 4 / 3)).toFixed(2)}  bids made ${(100 * made[l][0] / made[l][1]).toFixed(0)}%`);
console.log(`${N} games simulated OK; trumps chosen by highest bidders: ${[...trumpsSeen].sort().join(' ')}`);
