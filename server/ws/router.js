'use strict';
// Routes each incoming message to its handler and enforces host / phase rules.
const session = require('./handlers/session');
const lobby = require('./handlers/lobby');
const game = require('./handlers/game');
const { send } = require('./send');
const { roomOf } = require('./context');

const SESSION = { create: session.create, solo: session.solo, join: session.join };
const ROOM = { ...lobby, ...game };

function route(ws, m) {
  if (m.t === 'hello') return session.hello(ws, m);
  if (!ws.playerId) return send(ws, { t: 'error', msg: 'Not identified' });
  if (SESSION[m.t]) return SESSION[m.t](ws, m);

  const entry = ROOM[m.t];
  if (!entry) return;
  const [room, seat] = roomOf(ws);
  if (!room || seat === -1) return send(ws, { t: 'home' });
  room.lastActive = Date.now();

  const h = typeof entry === 'function' ? { run: entry } : entry;
  if (h.host && !room.isHost(ws.playerId)) return send(ws, { t: 'error', msg: 'Only the host can do that' });
  if (h.lobby && room.game) return;
  if (h.game && !room.game) return;
  h.run({ ws, m, room, seat });
}

module.exports = { route };
