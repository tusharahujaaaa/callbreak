// Big cinematic announcements across the middle of the screen ("ROUND 2", "YOUR TURN", ...).
import { $, esc } from '../../core/util.js';
import { seatName } from '../../core/store.js';
import { sfx } from '../../ui/sfx.js';
import { SUIT_NAMES } from './trumpPanel.js';

const SYMS = { S: '♠', H: '♥', C: '♣', D: '♦' };

let prev = null;

export const resetAnnouncer = () => { prev = null; };

export function announce(text, sub = '', kind = '', ms = 1800) {
  const host = $('#announce');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `ann ${kind}`;
  el.style.animationDuration = `${ms}ms`;
  el.innerHTML = `<b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
  host.replaceChildren(el);
  setTimeout(() => el.remove(), ms + 50);
}

// Compare with the previous state and announce what just happened.
export function runAnnouncer(st) {
  const g = st.game;
  const p = prev;
  prev = { phase: g.phase, round: g.round, turn: g.turn, dealCount: g.dealCount, trump: g.trump };
  if (!p) return;

  if (g.round !== p.round) {
    announce(`Round ${g.round}`, `${seatName(g.dealer)} ${g.dealer === st.mySeat ? 'deal' : 'deals'}`, '', 2200);
    sfx.sting();
    return;
  }
  if (g.trump && !p.trump && st.settings.trumpMode === 'bidder') {
    const who = g.trumpChooser === st.mySeat ? 'You chose' : `${seatName(g.trumpChooser)} chose`;
    announce(`Trump ${SYMS[g.trump]}`, `${who} ${SUIT_NAMES[g.trump]}`, `trump-${g.trump}`, 2400);
    sfx.sting();
    return;
  }
  if (g.phase === 'choosingTrump' && p.phase !== 'choosingTrump') {
    if (g.turn === st.mySeat) announce('Your call wins', 'Choose the trump suit', 'gold', 1800);
    else announce('Choosing trump', `${seatName(g.turn)} won the call`, 'small', 1600);
    return;
  }
  if (g.dealCount !== p.dealCount) {
    announce('Redeal', 'The cards go back in', 'warn', 1800);
    return;
  }
  if (g.turn === st.mySeat && p.turn !== g.turn) {
    if (g.phase === 'bidding') announce('Your call', 'How many tricks?', '', 1600);
    else if (g.phase === 'playing') announce('Your turn', '', 'small', 1100);
    return;
  }
  if (g.phase === 'trickEnd' && p.phase !== 'trickEnd' && g.trickWinner === st.mySeat) {
    announce('Trick won', '', 'gold', 1400);
  }
}
