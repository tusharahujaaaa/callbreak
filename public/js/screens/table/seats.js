// The four player boxes around the table.
import { $, esc, total } from '../../core/util.js';
import { store, rel } from '../../core/store.js';

function seatHtml(st, g, seat) {
  const s = st.seats[seat];
  const r = rel(seat);
  const bid = g.bids[seat];
  const won = g.won[seat];
  const isTurn = g.turn === seat;
  const offline = s.kind === 'human' && !s.connected;
  const bidTxt = bid !== null ? bid : g.phase === 'bidding' && isTurn ? 'bidding…' : '–';
  const madeCls = bid !== null && won >= bid ? 'made' : '';
  const showTimer = isTurn && g.deadline && st.settings.turnTimer > 0;
  const avatar = s.kind === 'bot' ? '🤖' : esc(s.name[0].toUpperCase());

  return `
    <div class="seat ${isTurn ? 'turn' : ''} ${offline ? 'away' : ''}">
      <div class="avatar ${s.kind === 'bot' ? 'bot' : ''}">${avatar}
        ${g.dealer === seat ? '<span class="dealer-chip" title="Dealer">D</span>' : ''}</div>
      <div>
        <div class="nm">${esc(s.name)}${seat === st.mySeat ? ' (you)' : ''}
          ${s.kind === 'bot' ? `<small style="color:var(--muted)">${esc(s.levelLabel)}</small>` : ''}
          ${offline ? '<small style="color:#ff9b97">offline · bot playing</small>' : ''}</div>
        <div class="bw">Bid <b>${bidTxt}</b> · Won <b class="${madeCls}">${won}</b></div>
        <div class="tot">Total ${total(g.totals[seat])}</div>
        ${r !== 0 ? `<div class="backs">${'<i></i>'.repeat(g.handCounts[seat])}</div>` : ''}
        ${showTimer ? `<div class="timer" data-deadline="${g.deadline}" data-span="${st.settings.turnTimer * 1000}" data-skew="${Date.now() - g.now}"></div>` : ''}
      </div>
    </div>`;
}

export function renderSeats() {
  const st = store.state;
  for (let seat = 0; seat < 4; seat++) $('#seat' + rel(seat)).innerHTML = seatHtml(st, st.game, seat);
}

// Animates turn-timer bars; call once at startup.
export function startTimerBars() {
  setInterval(() => {
    document.querySelectorAll('.timer[data-deadline]').forEach((t) => {
      const left = +t.dataset.deadline - (Date.now() - +t.dataset.skew);
      t.style.width = Math.max(0, Math.min(100, (left / +t.dataset.span) * 100)) + '%';
    });
  }, 250);
}
