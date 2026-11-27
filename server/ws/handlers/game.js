'use strict';
// In-game messages.
const { send } = require('../send');

const reply = (ws, err) => err && send(ws, { t: 'error', msg: err });

module.exports = {
  bid: { game: true, run({ room, seat, ws, m }) { reply(ws, room.game.bid(seat, m.value)); } },

  trump: { game: true, run({ room, seat, ws, m }) { reply(ws, room.game.chooseTrump(seat, String(m.suit))); } },

  play: { game: true, run({ room, seat, ws, m }) { reply(ws, room.game.play(seat, String(m.card))); } },

  next: { host: true, game: true, run({ room, ws }) { reply(ws, room.game.nextRound()); } },

  restart: { host: true, game: true, run({ room }) {
    room.backToLobby();
    room.broadcast();
  } },
};
