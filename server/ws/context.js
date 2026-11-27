'use strict';
// Shared helpers for message handlers.
const { rooms, playerRoom } = require('../rooms/registry');

const cleanName = (n) => (String(n || '').replace(/[<>]/g, '').trim().slice(0, 16) || 'Player');

// The room and seat this connection belongs to.
function roomOf(ws) {
  const code = ws.playerId && playerRoom.get(ws.playerId);
  const room = code && rooms.get(code);
  if (!room) return [null, -1];
  return [room, room.seatOf(ws.playerId)];
}

// Leave the current room. Mid-game, a bot takes the seat.
function leaveCurrent(ws) {
  const [room] = roomOf(ws);
  if (!room) return;
  room.removeHuman(ws.playerId, !!room.game);
  if (!rooms.has(room.code)) return;
  if (!room.humans().length) return room.destroy();
  if (room.game) room.rescheduleActor();
  room.broadcast();
}

module.exports = { cleanName, roomOf, leaveCurrent };
