'use strict';
// One table: four seats (humans or bots), the host's settings, and the running game.
const { DEFAULT_SETTINGS } = require('../game/settings');
const { LakdiGame } = require('../game/LakdiGame');
const Bots = require('../bots');
const config = require('../config');
const { rooms, playerRoom } = require('./registry');
const { roomView } = require('./view');
const { send } = require('../ws/send');
const { Bar } = require('./bar');

class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.seats = [null, null, null, null];
    this.settings = { ...DEFAULT_SETTINGS };
    this.game = null;
    this.timers = new Set();
    this.actorKey = null;
    this.actorTimer = null;
    this.deadline = null;
    this.lastActive = Date.now();
    this.bar = new Bar();
    // Bots and away players reorder drinks when they run low.
    this.barTimer = setInterval(() => {
      const auto = (i) => { const s = this.seats[i]; return !!s && (s.kind === 'bot' || !s.connected); };
      if (this.bar.autoOrder(auto)) this.broadcast();
    }, 15000);
  }

  // ----- Timers -----

  later(ms, fn) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      try { fn(); } catch (e) { console.error(e); }
    }, ms);
    this.timers.add(t);
    return t;
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    clearTimeout(this.actorTimer);
    this.actorKey = null;
    this.deadline = null;
  }

  destroy() {
    this.clearTimers();
    clearInterval(this.barTimer);
    for (const s of this.seats) if (s && s.kind === 'human') playerRoom.delete(s.id);
    rooms.delete(this.code);
  }

  // ----- Seats -----

  seatOf(id) { return this.seats.findIndex((s) => s && s.kind === 'human' && s.id === id); }
  humans() { return this.seats.filter((s) => s && s.kind === 'human'); }
  name(i) { const s = this.seats[i]; return s ? s.name : '—'; }
  isHost(id) { return this.hostId === id; }

  unusedBotName(seat) {
    const used = new Set(this.seats.filter(Boolean).map((s) => s.baseName || s.name));
    const list = config.WOMAN_SEATS.includes(seat) ? config.BOT_NAMES.female : config.BOT_NAMES.male;
    return list.find((n) => !used.has(n)) || 'Bot';
  }

  addHuman(id, name, ws) {
    const seat = this.seats.findIndex((s) => !s);
    if (seat === -1) return -1;
    this.seats[seat] = { kind: 'human', id, name, connected: true, ws };
    playerRoom.set(id, this.code);
    return seat;
  }

  addBot(seat, level) {
    if (!Bots.LEVELS.includes(level)) level = 'intermediate';
    const baseName = this.unusedBotName(seat);
    this.seats[seat] = { kind: 'bot', baseName, name: baseName, level };
  }

  removeHuman(id, replaceWithBot) {
    const i = this.seatOf(id);
    if (i === -1) return;
    const old = this.seats[i];
    clearTimeout(old.dropTimer);
    playerRoom.delete(id);
    this.seats[i] = replaceWithBot
      ? { kind: 'bot', baseName: old.name, name: `${old.name} (bot)`, level: 'intermediate' }
      : null;
    this.transferHostIfNeeded();
  }

  transferHostIfNeeded() {
    if (this.seatOf(this.hostId) !== -1) return;
    const h = this.humans().find((s) => s.connected) || this.humans()[0];
    if (h) this.hostId = h.id;
    else this.destroy();
  }

  swapSeats(a, b) {
    [this.seats[a], this.seats[b]] = [this.seats[b], this.seats[a]];
  }

  // ----- Connection -----

  attach(seat, ws) {
    const s = this.seats[seat];
    if (s.ws && s.ws !== ws) {
      send(s.ws, { t: 'home', reason: 'Opened in another tab' });
      s.ws.playerId = null;
    }
    s.ws = ws;
    s.connected = true;
    clearTimeout(s.dropTimer);
    if (this.game) this.rescheduleActor();
    this.broadcast();
  }

  detach(seat) {
    const s = this.seats[seat];
    s.ws = null;
    s.connected = false;
    if (this.game) {
      this.scheduleActor();
    } else {
      // In the lobby, free the seat if they don't come back soon.
      s.dropTimer = setTimeout(() => {
        if (s.connected || rooms.get(this.code) !== this || this.game || this.seats[seat] !== s) return;
        this.removeHuman(s.id, false);
        if (rooms.has(this.code)) this.broadcast();
      }, config.LOBBY_DROP_MS);
    }
    this.broadcast();
  }

  broadcast() {
    this.seats.forEach((s, i) => {
      if (s && s.kind === 'human' && s.ws) send(s.ws, { t: 'state', state: roomView(this, i) });
    });
  }

  // ----- Game lifecycle -----

  startGame() {
    this.clearTimers();
    this.game = new LakdiGame(this.settings, (i) => this.name(i), {
      changed: () => { this.lastActive = Date.now(); this.scheduleActor(); this.broadcast(); },
      schedule: (ms, fn) => this.later(ms, fn),
    });
    this.game.start();
  }

  backToLobby() {
    this.clearTimers();
    this.game = null;
    // Drop seats of people who are gone; bots that replaced leavers stay.
    this.seats.forEach((s, i) => {
      if (s && s.kind === 'human' && !s.connected) { playerRoom.delete(s.id); this.seats[i] = null; }
    });
  }

  rescheduleActor() {
    this.actorKey = null;
    this.scheduleActor();
  }

  // Schedules the next automatic move: bot turns, disconnected players, or turn-timer expiry.
  scheduleActor() {
    const g = this.game;
    if (!g || !['bidding', 'choosingTrump', 'playing'].includes(g.phase)) {
      clearTimeout(this.actorTimer);
      this.actorKey = null;
      this.deadline = null;
      return;
    }
    const seat = g.turn;
    const p = this.seats[seat];
    const connected = p.kind === 'human' ? p.connected : true;
    const key = [g.dealCount, g.phase, seat, g.played.length, g.bids.filter((b) => b !== null).length, p.kind, connected].join('|');
    if (this.actorKey === key) return;
    this.actorKey = key;
    clearTimeout(this.actorTimer);
    this.deadline = null;

    let delay;
    let level = 'intermediate';
    const speed = config.BOT_DELAY[g.s.botSpeed] || config.BOT_DELAY.normal;
    if (p.kind === 'bot') {
      delay = g.phase === 'playing' ? speed : speed + config.BID_EXTRA_DELAY;
      level = p.level;
    } else if (!p.connected) {
      delay = config.OFFLINE_AUTOPLAY_MS;
    } else if (g.s.turnTimer > 0) {
      delay = g.s.turnTimer * 1000;
      this.deadline = Date.now() + delay;
    } else {
      return; // a connected human with no timer: wait for them
    }

    this.actorTimer = setTimeout(() => {
      if (this.actorKey !== key || this.game !== g) return;
      try {
        if (g.phase === 'bidding') g.bid(seat, Bots.chooseBid(g, seat, level));
        else if (g.phase === 'choosingTrump') g.chooseTrump(seat, Bots.chooseTrump(g, seat, level));
        else if (g.phase === 'playing') g.play(seat, Bots.chooseCard(g, seat, level));
      } catch (e) { console.error('bot error', e); }
    }, delay);
  }
}

module.exports = { Room };
