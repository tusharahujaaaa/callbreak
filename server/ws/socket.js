'use strict';
// WebSocket server: parses messages, handles disconnects, heartbeats and idle-room cleanup.
const { WebSocketServer } = require('ws');
const config = require('../config');
const { rooms } = require('../rooms/registry');
const { route } = require('./router');
const { send } = require('./send');
const { roomOf } = require('./context');

function onClose(ws) {
  const [room, seat] = roomOf(ws);
  if (!room || seat === -1) return;
  if (room.seats[seat].ws !== ws) return; // an older tab closing
  room.detach(seat);
}

function attachWebSockets(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));
    ws.on('message', (raw) => {
      if (raw.length > config.MAX_MESSAGE_BYTES) return;
      let m;
      try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m.t !== 'string') return;
      try { route(ws, m); } catch (e) { console.error(e); send(ws, { t: 'error', msg: 'Server error' }); }
    });
    ws.on('close', () => onClose(ws));
  });

  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
    const now = Date.now();
    for (const room of rooms.values()) {
      const anyone = room.humans().some((s) => s.connected);
      if (!anyone && now - room.lastActive > config.ROOM_IDLE_MS) room.destroy();
    }
  }, config.HEARTBEAT_MS);

  return wss;
}

module.exports = { attachWebSockets };
