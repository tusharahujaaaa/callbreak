// Right-hand panel: standings and the game log. Also pops a toast for each redeal.
import { $, esc, total } from '../../core/util.js';
import { store } from '../../core/store.js';
import { toast } from '../../ui/toast.js';

let lastLogId = 0;

export const resetSidebar = () => { lastLogId = 0; };

export function renderSidebar() {
  const st = store.state, g = st.game;
  const rows = st.seats.map((s, i) => ({ i, name: s.name, t: g.totals[i] })).sort((a, b) => b.t - a.t);
  $('#log').innerHTML = `<h4>Standings</h4>
    <table class="mini-scores">${rows.map((r) =>
      `<tr><td>${esc(r.name)}${r.i === st.mySeat ? ' (you)' : ''}</td><td>${total(r.t)}</td></tr>`).join('')}</table>
    <h4>Game log</h4>` +
    g.log.slice().reverse().map((l) => `<div class="l ${l.kind}">${esc(l.msg)}</div>`).join('');

  // Toast new redeals (but not ones from before we joined/refreshed).
  if (lastLogId !== 0) {
    for (const l of g.log) if (l.id > lastLogId && l.kind === 'redeal') toast(l.msg);
  }
  lastLogId = g.log.length ? g.log[g.log.length - 1].id : lastLogId || 1;
}
