'use strict';
// End-to-end: host + friend over WebSocket, host config, bots fill seats, full fast game.
const WebSocket = require('ws');
const URL = process.env.URL || 'ws://localhost:3999'; // start the server with PORT=3999 first
function client(id, name) {
  const ws = new WebSocket(URL);
  const c = { ws, id, name, state: null, errors: [], waiters: [] };
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.t === 'state') c.state = m.state;
    if (m.t === 'error') c.errors.push(m.msg);
    c.waiters = c.waiters.filter((w) => !w());
    if (m.t === 'state' && c.onState) c.onState(m.state);
  });
  c.send = (m) => ws.send(JSON.stringify(m));
  c.until = (pred, ms = 60000) => new Promise((res, rej) => {
    const t = setTimeout(() => { const g = c.state && c.state.game; console.log('STATE', c.state && c.state.phase, g && {turn: g.turn, bids: g.bids, hc: g.handCounts, legal: g.legal, mySeat: c.state.mySeat}, c.errors); rej(new Error('timeout waiting ' + name)); }, ms);
    const check = () => { if (c.state && pred(c.state)) { clearTimeout(t); res(c.state); return true; } return false; };
    if (!check()) c.waiters.push(check);
  });
  c.open = new Promise((r) => ws.on('open', () => { c.send({ t: 'hello', playerId: id }); r(); }));
  return c;
}
function autoPlay(c) {
  let lastKey = '';
  c.onState = (s) => {
    const g = s.game; if (!g) return;
    const key = g.dealCount + ':' + s.phase + ':' + g.turn + ':' + g.handCounts.join(',') + g.bids.join(',');
    if (g.turn !== s.mySeat || key === lastKey) return;
    lastKey = key;
    if (s.phase === 'bidding') c.send({ t: 'bid', value: Math.max(s.settings.minBid, 2) });
    if (s.phase === 'playing') c.send({ t: 'play', card: g.legal[0] });
  };
}
(async () => {
  const host = client('host-aaaaaaaa', 'Host'), friend = client('friend-bbbbbbbb', 'Friend');
  await Promise.all([host.open, friend.open]);
  host.send({ t: 'create', name: 'Host' });
  const s1 = await host.until((s) => s.phase === 'lobby');
  console.log('room', s1.code, 'host?', s1.isHost);
  friend.send({ t: 'join', code: s1.code, name: 'Friend' });
  await friend.until((s) => s.phase === 'lobby');
  // Friend can't change settings
  friend.send({ t: 'settings', settings: { rounds: 1 } });
  await new Promise((r) => setTimeout(r, 200));
  console.log('friend error:', friend.errors.pop());
  host.send({ t: 'settings', settings: { rounds: 2, botSpeed: 'fast', minBid: 2, redealLowBid: false } });
  await friend.until((s) => s.settings.rounds === 2 && s.settings.minBid === 2);
  console.log('friend sees settings rounds=2 minBid=2');
  host.send({ t: 'start' });
  await new Promise((r) => setTimeout(r, 200));
  console.log('start with empty seats error:', host.errors.pop());
  host.send({ t: 'addBot', seat: 2, level: 'pro' });
  host.send({ t: 'fillBots', level: 'beginner' });
  await host.until((s) => s.seats.every(Boolean));
  console.log('seats:', host.state.seats.map((s) => `${s.name}/${s.kind}${s.level ? '/' + s.level : ''}`).join(', '));
  autoPlay(host); autoPlay(friend);
  host.send({ t: 'start' });
  await host.until((s) => s.phase === 'roundEnd', 60000);
  console.log('round 1 done:', host.state.game.history[0]);
  // Friend reconnect mid-game test: drop friend, bot should play their seat
  host.send({ t: 'next' });
  await host.until((s) => s.phase === 'playing');
  friend.ws.terminate();
  await host.until((s) => s.seats[1].connected === false);
  console.log('friend offline; bot takes over');
  await host.until((s) => s.phase === 'gameOver', 120000);
  const g = host.state.game;
  console.log('game over totals:', g.totals.map((t) => t / 10));
  host.send({ t: 'restart' });
  await host.until((s) => s.phase === 'lobby');
  console.log('back in lobby; seats:', host.state.seats.map((s) => s && s.name).join(', '));
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
