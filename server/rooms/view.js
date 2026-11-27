'use strict';
// Builds what one player is allowed to see. Only their own hand is included.
const { LEVEL_LABEL } = require('../config');
const { LEVELS } = require('../bots');

function seatView(s, hostId) {
  if (!s) return null;
  const bot = s.kind === 'bot';
  return {
    kind: s.kind,
    name: s.name,
    level: bot ? s.level : null,
    levelLabel: bot ? LEVEL_LABEL[s.level] : null,
    connected: bot ? true : s.connected,
    isHost: !bot && s.id === hostId,
  };
}

function gameView(g, seat, deadline) {
  return {
    phase: g.phase,
    round: g.round,
    rounds: g.s.rounds,
    dealer: g.dealer,
    turn: g.turn,
    bids: g.bids,
    won: g.won,
    trick: g.trick,
    trickWinner: g.trickWinner,
    lastTrick: g.lastTrick,
    handCounts: g.hands.map((h) => h.length),
    hand: g.hands[seat],
    legal: g.phase === 'playing' && g.turn === seat ? g.legalFor(seat) : [],
    history: g.history,
    totals: g.totals,
    log: g.log.slice(-40),
    trump: g.trump,
    trumpChooser: g.trumpChooser,
    trumpBroken: g.trumpBroken,
    deal: g.phase === 'dealing' ? g.dealInfo : null,
    dealt: g.phase === 'dealing' ? g.dealtHands[seat] : null,
    deadline,
    dealCount: g.dealCount,
    now: Date.now(),
  };
}

function roomView(room, seat) {
  const g = room.game;
  const me = room.seats[seat];
  return {
    code: room.code,
    mySeat: seat,
    isHost: !!me && me.id === room.hostId,
    phase: g ? g.phase : 'lobby',
    settings: g ? g.s : room.settings,
    levels: LEVELS,
    seats: room.seats.map((s) => seatView(s, room.hostId)),
    game: g ? gameView(g, seat, room.deadline) : null,
    bar: room.bar.view(),
  };
}

module.exports = { roomView };
