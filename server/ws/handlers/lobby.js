'use strict';
// Lobby messages. Everything except `leave` and `rename` is host-only and lobby-only.
const { sanitizeSettings } = require('../../game/settings');
const { LEVELS } = require('../../bots');
const { playerRoom } = require('../../rooms/registry');
const { send } = require('../send');
const { cleanName, leaveCurrent } = require('../context');

const validSeat = (i) => Number.isInteger(i) && i >= 0 && i < 4;

module.exports = {
  leave(ctx) {
    leaveCurrent(ctx.ws);
    send(ctx.ws, { t: 'home' });
  },

  // Order a drink (beer / whiskey) or a refill: the waiter brings it. Works any time.
  order({ room, seat, ws, m }) {
    const err = room.bar.order(seat, String(m.drink));
    if (err) return send(ws, { t: 'error', msg: err });
    room.broadcast();
  },

  // Take a sip of your own drink (everyone sees it; the glass goes down a little).
  sip({ room, seat }) {
    if (room.bar.sip(seat)) room.broadcast();
  },

  rename({ room, seat, m }) {
    if (room.game) return;
    room.seats[seat].name = cleanName(m.name);
    room.broadcast();
  },

  settings: { host: true, lobby: true, run({ room, m }) {
    room.settings = sanitizeSettings(m.settings, room.settings);
    room.broadcast();
  } },

  addBot: { host: true, lobby: true, run({ room, m }) {
    const i = Number(m.seat);
    if (validSeat(i) && !room.seats[i]) room.addBot(i, m.level);
    room.broadcast();
  } },

  fillBots: { host: true, lobby: true, run({ room, m }) {
    for (let i = 0; i < 4; i++) if (!room.seats[i]) room.addBot(i, m.level);
    room.broadcast();
  } },

  // Allowed mid-game too: the host can make a bot stronger or weaker.
  botLevel: { host: true, run({ room, m }) {
    const s = room.seats[Number(m.seat)];
    if (s && s.kind === 'bot' && LEVELS.includes(m.level)) s.level = m.level;
    room.broadcast();
  } },

  removeSeat: { host: true, lobby: true, run({ room, seat, m }) {
    const i = Number(m.seat);
    const s = room.seats[i];
    if (!s || i === seat) return;
    if (s.kind === 'human') {
      send(s.ws, { t: 'home', reason: 'The host removed you from the room' });
      clearTimeout(s.dropTimer);
      playerRoom.delete(s.id);
    }
    room.seats[i] = null;
    room.broadcast();
  } },

  moveSeat: { host: true, lobby: true, run({ room, m }) {
    const a = Number(m.from), b = Number(m.to);
    if (validSeat(a) && validSeat(b)) room.swapSeats(a, b);
    room.broadcast();
  } },

  start: { host: true, lobby: true, run({ room, ws }) {
    if (room.seats.some((s) => !s)) return send(ws, { t: 'error', msg: 'Fill all 4 seats first (add bots for empty seats)' });
    room.startGame();
  } },
};
