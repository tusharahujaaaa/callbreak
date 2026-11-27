'use strict';
// The bar: each seat's drink (beer or whiskey) and the waiter's visits.
// A glass empties over time; ordering (or a refill) sends the waiter, who walks over from the
// bar, pours, and walks back. Visits queue up — there is one waiter.

const DRINKS = ['beer', 'whiskey'];
const TIMING = {
  walkMs: 6500,     // bar → table
  serveMs: 2600,    // pouring
  pourAtMs: 1200,   // into the serve, when the glass is full again
  drainMs: { beer: 5 * 60 * 1000, whiskey: 8 * 60 * 1000 },
  sipMs: 3600,      // one sip animation
  sipAmount: 0.06,  // share of a full glass one sip drinks
};

class Bar {
  constructor() {
    const now = Date.now();
    this.drinks = [0, 1, 2, 3].map(() => ({
      type: DRINKS[Math.floor(Math.random() * 2)], pouredAt: now - Math.random() * 60000, prev: null,
    }));
    this.visits = [];
    this.sips = [0, 0, 0, 0]; // when each seat last sipped (server time)
    this.freeAt = 0;
    this.nextId = 1;
  }

  levelOf(seat, now = Date.now()) {
    const d = this.drinks[seat];
    if (now < d.pouredAt && d.prev) return Math.max(0, 1 - (now - d.prev.pouredAt) / TIMING.drainMs[d.prev.type]);
    return Math.max(0, 1 - (now - d.pouredAt) / TIMING.drainMs[d.type]);
  }

  pendingVisit(seat, now = Date.now()) {
    return this.visits.find((v) => v.seat === seat && v.start + TIMING.walkMs + TIMING.pourAtMs > now);
  }

  // Order a drink for a seat (same type = refill). Returns an error string or null.
  order(seat, type) {
    if (!DRINKS.includes(type)) return 'Unknown drink';
    const now = Date.now();
    const pending = this.pendingVisit(seat, now);
    if (pending) { // waiter already on the way: just change the order
      pending.type = type;
      this.drinks[seat].type = type;
      return null;
    }
    const start = Math.max(now, this.freeAt);
    const visit = { id: this.nextId++, seat, type, start };
    this.visits.push(visit);
    this.freeAt = start + TIMING.walkMs * 2 + TIMING.serveMs;
    const d = this.drinks[seat];
    this.drinks[seat] = { type, pouredAt: start + TIMING.walkMs + TIMING.pourAtMs, prev: { type: d.type, pouredAt: d.pouredAt } };
    return null;
  }

  // A player drinks from their glass. Returns true if they did.
  sip(seat) {
    const now = Date.now();
    if (now - this.sips[seat] < TIMING.sipMs || this.pendingVisit(seat, now)) return false;
    if (this.levelOf(seat, now) < 0.05) return false;
    const d = this.drinks[seat];
    d.pouredAt -= TIMING.drainMs[d.type] * TIMING.sipAmount;
    this.sips[seat] = now;
    return true;
  }

  // Bots (and players who are away) order another round when their glass is nearly empty.
  autoOrder(isAutomatic) {
    const now = Date.now();
    let changed = false;
    for (let seat = 0; seat < 4; seat++) {
      if (!isAutomatic(seat) || this.pendingVisit(seat, now) || this.levelOf(seat, now) > 0.12) continue;
      const d = this.drinks[seat];
      const type = Math.random() < 0.25 ? DRINKS[1 - DRINKS.indexOf(d.type)] : d.type;
      this.order(seat, type);
      changed = true;
    }
    return changed;
  }

  view() {
    const now = Date.now();
    this.visits = this.visits.filter((v) => v.start + TIMING.walkMs * 2 + TIMING.serveMs > now);
    return { drinks: this.drinks, visits: this.visits, sips: this.sips, timing: TIMING, now };
  }
}

module.exports = { Bar, DRINKS };
