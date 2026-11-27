'use strict';
// Global lookup tables: open rooms, and which room each player is in.
const crypto = require('crypto');

const rooms = new Map();      // code -> Room
const playerRoom = new Map(); // playerId -> room code

function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 4 }, () => A[crypto.randomInt(A.length)]).join(''); } while (rooms.has(c));
  return c;
}

module.exports = { rooms, playerRoom, makeCode };
