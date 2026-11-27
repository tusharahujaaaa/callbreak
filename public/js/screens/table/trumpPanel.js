// Trump picker (shown to the highest bidder when the host lets them choose trump),
// plus the always-visible "Trump" badge.
import { $, SYM, suit } from '../../core/util.js';
import { store, seatName } from '../../core/store.js';
import { send } from '../../core/net.js';

export const SUIT_NAMES = { S: 'Spades', H: 'Hearts', C: 'Clubs', D: 'Diamonds' };
const RED = { H: true, D: true };

export function renderTrumpPanel() {
  const st = store.state, g = st.game;
  const panel = $('#trumpPanel');
  if (g.phase !== 'choosingTrump' || g.turn !== st.mySeat) { panel.classList.add('hidden'); return; }
  const count = (s) => g.hand.filter((c) => suit(c) === s).length;
  panel.innerHTML = `<div class="call-head"><span class="call-kicker">You won the call · ${g.bids[st.mySeat]}</span>
    <h3>Name the trump</h3><p class="call-note">This suit beats every other suit this round</p></div>
    <div class="trump-grid">${['S', 'H', 'C', 'D'].map((s) => `
      <button class="trump-btn ${RED[s] ? 'red' : ''}" data-action="chooseTrump" data-suit="${s}">
        <span class="sym">${SYM[s]}</span><span class="nm">${SUIT_NAMES[s]}</span><span class="ct">${count(s)} in hand</span>
      </button>`).join('')}</div>`;
  panel.classList.remove('hidden');
}

// Small badge in the top bar and (2D table) in the middle of the table.
export function renderTrumpBadge() {
  const g = store.state.game;
  const t = g.trump;
  const html = t
    ? `<span class="tb-label">Trump</span><span class="tb-sym ${RED[t] ? 'red' : ''}">${SYM[t]}</span>`
    : `<span class="tb-label">Trump</span><span class="tb-sym">?</span>`;
  $('#trumpChip').innerHTML = html;
  $('#trumpChip').title = t ? `${SUIT_NAMES[t]} are trump` : 'The highest bidder will choose trump';
  const center = $('#trumpCenter');
  center.innerHTML = t ? `<span class="${RED[t] ? 'red' : ''}">${SYM[t]}</span><small>Trump</small>` : '<span>?</span><small>Trump</small>';
  center.dataset.suit = t || '';
}

export const trumpActions = {
  chooseTrump: (b) => {
    if (store.busy) return;
    store.busy = true;
    send({ t: 'trump', suit: b.dataset.suit });
  },
};

export const choosingText = (g, st) =>
  g.turn === st.mySeat ? 'Choose the trump suit' : `${seatName(g.turn)} is choosing trump…`;
