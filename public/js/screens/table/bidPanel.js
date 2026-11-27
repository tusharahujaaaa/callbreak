// Bid picker: a compact strip above your cards — one line saying what's been called, a timer
// line (if the host set a turn timer), and a row of small number keys plus Hint.
// Keyboard: 1–9, 0 = 10, H = hint.
import { $, esc } from '../../core/util.js';
import { store } from '../../core/store.js';
import { send } from '../../core/net.js';
import { serverNow } from '../../core/clock.js';
import { suggestBid } from '../../game/suggestBid.js';

let hint = false;      // show the suggested call
let hintKey = '';      // which bidding turn the hint belongs to
let timerRaf = 0;

const myTurnToBid = () => {
  const st = store.state;
  return !!(st && st.game && st.game.phase === 'bidding' && st.game.turn === st.mySeat);
};

function tickTimer() {
  cancelAnimationFrame(timerRaf);
  const bar = $('#bidPanel .bp-timer');
  if (!bar) return;
  const deadline = +bar.dataset.deadline, span = +bar.dataset.span;
  const left = Math.max(0, deadline - serverNow());
  bar.querySelector('i').style.width = `${(left / span) * 100}%`;
  bar.querySelector('span').textContent = `${Math.ceil(left / 1000)}s`;
  bar.classList.toggle('urgent', left < 5000);
  if (left > 0) timerRaf = requestAnimationFrame(tickTimer);
}

export function renderBidPanel() {
  const st = store.state, g = st.game, s = st.settings;
  const panel = $('#bidPanel');
  if (!myTurnToBid()) { panel.classList.add('hidden'); cancelAnimationFrame(timerRaf); return; }

  const key = `${g.dealCount ?? g.round}-${g.round}`;
  if (key !== hintKey) { hintKey = key; hint = false; }

  const calls = g.bids
    .map((b, i) => (b !== null && i !== st.mySeat ? `${esc(st.seats[i].name)} <b>${b}</b>` : null))
    .filter(Boolean);
  const high = Math.max(-1, ...g.bids.filter((b) => b !== null));

  // Last to bid: warn if a low total would force a redeal.
  const sum = g.bids.reduce((a, b) => a + (b || 0), 0);
  const remaining = g.bids.filter((b) => b === null).length;
  let floor = null;
  if (s.redealLowBid && remaining === 1 && !(s.lowBidSkipFinal && g.round >= g.rounds)) {
    const need = s.lowBidThreshold - sum;
    if (need > s.minBid) floor = need;
  }
  const suggested = Math.max(suggestBid(g.hand, s), floor || 0);

  let line = calls.length ? `Your call. ${calls.join(' · ')}` : 'Your call. You go first.';
  if (s.trumpMode === 'bidder' && high >= 0) line += ` — highest is <b>${high}</b>, top call picks trump`;
  else if (s.trumpMode === 'bidder') line += ' — top call picks trump';
  const warn = floor ? `<div class="bp-warn">Call ${floor} or more, or the cards are redealt</div>` : '';

  const keys = [];
  for (let v = s.minBid; v <= s.maxBid; v++) {
    const cls = [floor !== null && v < floor ? 'low' : '', hint && v === suggested ? 'hint' : ''].join(' ');
    keys.push(`<button class="bp-key ${cls}" data-action="bid" data-value="${v}" title="Call ${v}">${v}</button>`);
  }
  const timer = g.deadline && s.turnTimer > 0
    ? `<div class="bp-timer" data-deadline="${g.deadline}" data-span="${s.turnTimer * 1000}"><i></i><span></span></div>` : '';

  panel.innerHTML = `
    <div class="bp-line">${line}</div>
    ${warn}${timer}
    <div class="bp-row">${keys.join('')}<button class="bp-hint ${hint ? 'on' : ''}" data-action="bidHint" title="Suggest a call (H)">${hint ? `Hint: ${suggested}` : 'Hint'}</button></div>`;
  panel.classList.remove('hidden');
  if (timer) tickTimer();
}

function bid(value) {
  if (store.busy) return;
  store.busy = true;
  send({ t: 'bid', value });
}

function toggleHint() { hint = !hint; renderBidPanel(); }

export const bidActions = {
  bid: (b) => bid(+b.dataset.value),
  bidHint: toggleHint,
};

// Number keys call directly while it's your turn to bid; H shows the hint.
window.addEventListener('keydown', (e) => {
  if (!myTurnToBid() || e.target.closest('input, select, textarea')) return;
  if (e.key === 'h' || e.key === 'H') { toggleHint(); return; }
  if (!/^[0-9]$/.test(e.key)) return;
  const v = e.key === '0' ? 10 : +e.key;
  const s = store.state.settings;
  if (v >= s.minBid && v <= s.maxBid) bid(v);
});
