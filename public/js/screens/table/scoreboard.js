// Scoreboard, round-end / game-over panel, and last-trick viewer.
import { esc, pts, total } from '../../core/util.js';
import { store, seatName } from '../../core/store.js';
import { send } from '../../core/net.js';
import { openModal, closeModal, modalKind } from '../../ui/modal.js';
import { cardHtml } from '../../ui/cards.js';
import { toast } from '../../ui/toast.js';

function scoreTableHtml() {
  const st = store.state, g = st.game;
  const meCls = (i) => (i === st.mySeat ? 'me-col' : '');
  const head = st.seats.map((s, i) => `<th class="${meCls(i)}">${esc(s.name)}</th>`).join('');
  const body = g.history.map((h) => `<tr><td>R${h.round}</td>${h.deltas.map((d, i) =>
    `<td class="${meCls(i)}"><span class="${d >= 0 ? 'pos' : 'neg'}">${pts(d)}</span><small>bid ${h.bids[i]} · won ${h.won[i]}</small></td>`).join('')}</tr>`).join('');
  const foot = g.totals.map((t, i) => `<td class="${meCls(i)}">${total(t)}</td>`).join('');
  return `<table class="score-table"><thead><tr><th>Round</th>${head}</tr></thead>
    <tbody>${body || '<tr><td colspan="5" style="color:var(--muted)">No rounds finished yet</td></tr>'}</tbody>
    <tfoot><tr><td>Total</td>${foot}</tr></tfoot></table>`;
}

function roundEndParts(st, g) {
  const auto = st.settings.autoNextRound;
  return {
    title: `Round ${g.round} complete`,
    extra: '',
    actions: st.isHost
      ? `<span class="note">${auto ? 'The next round starts automatically…' : ''}</span><button class="btn primary big" data-action="next">Deal round ${g.round + 1}</button>`
      : `<span class="note">${auto ? 'The next round starts automatically…' : 'Waiting for the host to deal the next round…'}</span>`,
  };
}

function gameOverParts(st, g) {
  const best = Math.max(...g.totals);
  const winners = st.seats.map((s, i) => (g.totals[i] === best ? seatName(i) : null)).filter(Boolean);
  const verb = winners.length > 1 || winners[0] === 'You' ? 'win' : 'wins';
  return {
    title: 'Game over',
    extra: `<div class="winner-banner">🏆 <b>${winners.map(esc).join(' & ')}</b> ${verb} with ${total(best)} points!</div>`,
    actions: st.isHost
      ? '<button class="btn danger" data-action="leave">Leave</button><button class="btn primary big" data-action="restart">Back to lobby</button>'
      : '<span class="note">Waiting for the host…</span><button class="btn danger" data-action="leave">Leave</button>',
  };
}

// auto = opened because the round ended (not by clicking "Scores").
export function openScores(auto) {
  const st = store.state, g = st.game;
  let parts = { title: 'Scoreboard', extra: '', actions: '<button class="btn" data-action="closeModal">Close</button>' };
  let kind = 'scores';
  if (g.phase === 'roundEnd') { parts = roundEndParts(st, g); kind = 'roundEnd'; }
  else if (g.phase === 'gameOver') { parts = gameOverParts(st, g); kind = 'roundEnd'; }
  if (auto && modalKind() === 'scores') return; // don't replace a board the player opened
  openModal(`<h2>${parts.title}</h2>${parts.extra}${scoreTableHtml()}<div class="panel-actions">${parts.actions}</div>`, kind);
}

export function openLastTrick() {
  const g = store.state.game;
  if (!g.lastTrick) return toast('No trick has been played yet this round');
  const figs = g.lastTrick.cards.map((t) => `<figure>${cardHtml(t.card, t.seat === g.lastTrick.winner ? 'win' : '')}
    <figcaption>${esc(seatName(t.seat))}</figcaption></figure>`).join('');
  openModal(`<h2>Last trick</h2><div class="last-trick">${figs}</div>
    <div class="panel-actions"><button class="btn" data-action="closeModal">Close</button></div>`, 'last');
}

// Keep the round-end panel in sync with the game phase.
export function syncRoundEndPanel() {
  const phase = store.state.game.phase;
  if (phase === 'roundEnd' || phase === 'gameOver') openScores(true);
  else if (modalKind() === 'roundEnd') closeModal();
}

export const scoreActions = {
  scores: () => openScores(false),
  lastTrick: () => openLastTrick(),
  next: () => { closeModal(); send({ t: 'next' }); },
  restart: () => { closeModal(); send({ t: 'restart' }); },
};
