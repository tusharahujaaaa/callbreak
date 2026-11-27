'use strict';
// End-to-end: host turns on "highest bidder chooses trump", wins the bid, picks Hearts.
// Run with a server on port 3999 (PORT=3999 npm start).
const WebSocket = require('ws');
const assert = require('assert');
const URL = process.env.URL || 'ws://localhost:3999';

const ws = new WebSocket(URL);
let state = null;
const errors = [];
const waiters = [];
ws.on('message', (raw) => {
  const m = JSON.parse(raw);
  if (m.t === 'state') state = m.state;
  if (m.t === 'error') errors.push(m.msg);
  for (const w of waiters.splice(0)) if (!w()) waiters.push(w);
});
const send = (m) => ws.send(JSON.stringify(m));
const until = (pred, ms = 60000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout; phase=' + (state && state.phase))), ms);
  const check = () => { if (state && pred(state)) { clearTimeout(t); res(state); return true; } return false; };
  if (!check()) waiters.push(check);
});

(async () => {
  await new Promise((r) => ws.on('open', r));
  send({ t: 'hello', playerId: 'trump-tester-0001' });
  send({ t: 'create', name: 'Host' });
  await until((s) => s.phase === 'lobby');
  send({ t: 'settings', settings: { trumpMode: 'bidder', botSpeed: 'fast', dealAnimation: false, redealLowBid: false } });
  await until((s) => s.settings.trumpMode === 'bidder');
  send({ t: 'fillBots', level: 'pro' });
  await until((s) => s.seats.every(Boolean));
  send({ t: 'start' });

  // Bid 13 so we win the call (bots never bid 13 unless they hold a monster hand).
  await until((s) => s.game && s.phase === 'bidding' && s.game.turn === s.mySeat);
  assert.strictEqual(state.game.trump, null, 'trump is unknown during bidding');
  send({ t: 'bid', value: 13 });

  const s1 = await until((s) => s.phase === 'choosingTrump' || s.phase === 'playing');
  if (s1.game.trumpChooser !== s1.mySeat) {
    console.log('A bot also bid 13 earlier and won the tie; trump chosen by bot:', s1.game.trump || '(choosing)');
    process.exit(0);
  }
  assert.strictEqual(s1.phase, 'choosingTrump');
  assert.strictEqual(s1.game.turn, s1.mySeat);
  console.log('we won the call; choosing trump…');

  send({ t: 'trump', suit: 'X' });
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(errors.pop().includes('Pick'), 'invalid suit rejected');

  send({ t: 'trump', suit: 'H' });
  const s2 = await until((s) => s.phase === 'playing');
  assert.strictEqual(s2.game.trump, 'H');
  assert.ok(s2.game.log.some((l) => l.kind === 'trump' && l.msg.includes('Hearts')), 'trump choice logged');
  console.log('trump is Hearts; play started. Log:', s2.game.log.filter((l) => l.kind === 'trump').map((l) => l.msg).join(' | '));
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
