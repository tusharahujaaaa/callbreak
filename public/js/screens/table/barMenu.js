// Drinks menu (bottom-right): pick beer or whiskey, see how full your glass is, call the waiter.
import { $ } from '../../core/util.js';
import { store } from '../../core/store.js';
import { send } from '../../core/net.js';
import { serverNow } from '../../core/clock.js';
import { sfx } from '../../ui/sfx.js';

const LABEL = { beer: 'Beer', whiskey: 'Whiskey' };

function myDrink() {
  const st = store.state;
  const bar = st && st.bar;
  if (!bar) return null;
  const now = serverNow();
  const d = bar.drinks[st.mySeat];
  const showPrev = now < d.pouredAt && d.prev;
  const type = showPrev ? d.prev.type : d.type;
  const level = Math.max(0, 1 - (now - (showPrev ? d.prev.pouredAt : d.pouredAt)) / bar.timing.drainMs[type]);
  const coming = bar.visits.find((v) => v.seat === st.mySeat && now < v.start + bar.timing.walkMs + bar.timing.pourAtMs);
  return { type, level, ordered: d.type, coming };
}

export function renderBarMenu() {
  const el = $('#barMenu');
  const d = myDrink();
  if (!d) { el.innerHTML = ''; return; }
  const waiting = d.coming ? (serverNow() < d.coming.start ? 'Waiter is busy…' : 'Waiter coming…') : '';
  el.innerHTML = `
    <span class="lbl">${LABEL[d.type]}</span>
    <span class="lvl" title="${Math.round(d.level * 100)}% left"><i style="width:${Math.round(d.level * 100)}%"></i></span>
    <button class="bar-btn drink" data-action="sip" ${d.level < 0.05 || d.coming ? 'disabled' : ''} title="Take a sip (D)">${d.type === 'beer' ? '🍺' : '🥃'} Drink</button>
    <span class="sep"></span>
    <button class="bar-btn ${d.ordered === 'beer' ? 'on' : ''}" data-action="order" data-drink="beer" title="Order a beer">🍺 Beer</button>
    <button class="bar-btn ${d.ordered === 'whiskey' ? 'on' : ''}" data-action="order" data-drink="whiskey" title="Order a whiskey">🥃 Whiskey</button>
    <button class="bar-btn" data-action="order" data-drink="${d.ordered}" ${d.coming ? 'disabled' : ''} title="Call the waiter for a refill">🔔 ${waiting || 'Call waiter'}</button>`;
}

// Keep the level bar moving between server updates.
export function startBarMenu() {
  setInterval(() => { if (store.state && store.state.game) renderBarMenu(); }, 1000);
}

export const barActions = {
  order: (b) => {
    const d = myDrink();
    if (!d) return;
    // Switching to the drink that's already on its way just changes the order; otherwise ring.
    if (!d.coming || b.dataset.drink !== d.ordered) sfx.bell();
    send({ t: 'order', drink: b.dataset.drink });
  },
};
