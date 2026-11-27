'use strict';
// Unit test for the bar (drinks + waiter queue). Run: node test/bar.test.js
const assert = require('assert');
const { Bar } = require('../server/rooms/bar');

const bar = new Bar();
const T = bar.view().timing;

// Order a whiskey for seat 0: the waiter is booked, and the glass fills when she pours.
assert.strictEqual(bar.order(0, 'whiskey'), null);
let v = bar.view();
assert.strictEqual(v.visits.length, 1);
assert.strictEqual(v.visits[0].seat, 0);
assert.strictEqual(v.drinks[0].type, 'whiskey');
assert.ok(v.drinks[0].pouredAt >= Date.now() + T.walkMs, 'glass is filled only when the waiter arrives');
assert.ok(v.drinks[0].prev, 'the old drink stays on the table until then');

// Changing your mind while she's on the way changes the order, not the number of trips.
assert.strictEqual(bar.order(0, 'beer'), null);
v = bar.view();
assert.strictEqual(v.visits.length, 1);
assert.strictEqual(v.visits[0].type, 'beer');

// A second seat's order queues behind the first trip.
assert.strictEqual(bar.order(2, 'beer'), null);
v = bar.view();
assert.strictEqual(v.visits.length, 2);
assert.ok(v.visits[1].start >= v.visits[0].start + T.walkMs * 2 + T.serveMs, 'one waiter: visits queue');

// Unknown drinks are refused.
assert.notStrictEqual(bar.order(1, 'vodka'), null);

// Bots reorder when nearly empty.
bar.drinks[3] = { type: 'beer', pouredAt: Date.now() - T.drainMs.beer, prev: null };
assert.ok(bar.levelOf(3) < 0.01);
assert.strictEqual(bar.autoOrder((s) => s === 3), true);
assert.ok(bar.pendingVisit(3), 'bot ordered another round');

console.log('bar tests passed');
