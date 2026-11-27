// The "Players" list in the lobby, with host controls for bots and seats.
import { $, esc } from '../../core/util.js';
import { send } from '../../core/net.js';

const cap = (l) => l[0].toUpperCase() + l.slice(1);

function levelSelect(levels, val, attrs) {
  return `<select ${attrs}>${levels.map((l) =>
    `<option value="${l}" ${l === val ? 'selected' : ''}>${cap(l)}</option>`).join('')}</select>`;
}

function emptyRow(st, i) {
  const ctrls = st.isHost
    ? `<div class="ctrls">${levelSelect(st.levels, 'intermediate', `id="lvl${i}"`)}
       <button class="btn small" data-action="addBot" data-seat="${i}">Add bot</button></div>`
    : '';
  return `<div class="seat-row empty"><div class="num">${i + 1}</div>
    <div class="who"><b style="color:var(--muted)">Empty seat</b><small>Waiting for a player…</small></div>${ctrls}</div>`;
}

function filledRow(st, s, i) {
  const you = i === st.mySeat;
  const tags = [
    s.isHost ? '<span class="tagpill">Host</span>' : '',
    you ? '<span class="tagpill">You</span>' : '',
    s.kind === 'bot' ? `<span class="tagpill">Bot · ${esc(s.levelLabel)}</span>` : '',
    s.kind === 'human' && !s.connected ? '<span class="tagpill off">Offline</span>' : '',
  ].join('');
  let ctrls = '';
  if (st.isHost) {
    if (s.kind === 'bot') ctrls += levelSelect(st.levels, s.level, `data-botlevel="${i}"`);
    if (!you) ctrls += `<button class="btn small danger" data-action="removeSeat" data-seat="${i}">${s.kind === 'bot' ? 'Remove' : 'Kick'}</button>`;
    if (i > 0) ctrls += `<button class="btn small" title="Move up" data-action="moveSeat" data-from="${i}" data-to="${i - 1}">↑</button>`;
  }
  return `<div class="seat-row"><div class="num">${i + 1}</div>
    <div class="who"><b>${esc(s.name)}${tags}</b><small>${s.kind === 'bot' ? 'Computer player' : 'Player'}</small></div>
    <div class="ctrls">${ctrls}</div></div>`;
}

export function renderSeatList(st) {
  $('#seatList').innerHTML = st.seats.map((s, i) => (s ? filledRow(st, s, i) : emptyRow(st, i))).join('');
  document.querySelectorAll('[data-botlevel]').forEach((sel) =>
    sel.addEventListener('change', () => send({ t: 'botLevel', seat: +sel.dataset.botlevel, level: sel.value })));

  const empty = st.seats.filter((s) => !s).length;
  $('#fillBar').innerHTML = st.isHost && empty
    ? `<div class="row" style="margin-top:8px">${levelSelect(st.levels, 'intermediate', 'id="fillLevel"')}
       <button class="btn" data-action="fillBots">Fill ${empty} empty seat${empty > 1 ? 's' : ''} with bots</button></div>`
    : '';
  return empty;
}

// Click actions for this panel.
export const seatActions = {
  addBot: (b) => send({ t: 'addBot', seat: +b.dataset.seat, level: $('#lvl' + b.dataset.seat).value }),
  fillBots: () => send({ t: 'fillBots', level: $('#fillLevel').value }),
  removeSeat: (b) => send({ t: 'removeSeat', seat: +b.dataset.seat }),
  moveSeat: (b) => send({ t: 'moveSeat', from: +b.dataset.from, to: +b.dataset.to }),
};
