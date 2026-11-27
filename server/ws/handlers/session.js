'use strict';
// Messages that don't need a room yet: identify, create, join, solo.
const { rooms, makeCode } = require('../../rooms/registry');
const { Room } = require('../../rooms/Room');
const { LEVELS } = require('../../bots');
const { send } = require('../send');
const { cleanName, roomOf, leaveCurrent } = require('../context');

function hello(ws, m) {
  if (typeof m.playerId !== 'string' || m.playerId.length < 8 || m.playerId.length > 64) return;
  ws.playerId = m.playerId;
  const [room, seat] = roomOf(ws);
  if (room && seat !== -1) return room.attach(seat, ws); // reconnect
  send(ws, { t: 'home' });
}

function create(ws, m) {
  leaveCurrent(ws);
  const room = new Room(makeCode(), ws.playerId);
  rooms.set(room.code, room);
  room.addHuman(ws.playerId, cleanName(m.name), ws);
  room.broadcast();
}

function solo(ws, m) {
  leaveCurrent(ws);
  const room = new Room(makeCode(), ws.playerId);
  rooms.set(room.code, room);
  room.addHuman(ws.playerId, cleanName(m.name), ws);
  const level = LEVELS.includes(m.level) ? m.level : 'intermediate';
  for (let i = 1; i < 4; i++) room.addBot(i, level);
  room.startGame();
}

function join(ws, m) {
  const room = rooms.get(String(m.code || '').toUpperCase().trim());
  if (!room) return send(ws, { t: 'error', msg: 'Room not found' });
  const existing = room.seatOf(ws.playerId);
  if (existing !== -1) return room.attach(existing, ws);
  if (room.game) return send(ws, { t: 'error', msg: 'That game has already started' });
  leaveCurrent(ws);
  if (room.addHuman(ws.playerId, cleanName(m.name), ws) === -1) return send(ws, { t: 'error', msg: 'Room is full' });
  room.broadcast();
}

module.exports = { hello, create, solo, join };
