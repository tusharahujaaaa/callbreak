// Cards played to the current trick, in the middle of the table.
import { $ } from '../../core/util.js';
import { store, rel } from '../../core/store.js';
import { cardHtml } from '../../ui/cards.js';

let prevCards = new Set(); // so only newly played cards animate in

export function renderTrick() {
  const g = store.state.game;
  const badge = $('#trumpCenter');
  $('#trick').innerHTML = g.trick.map((t) => {
    const cls = `t${rel(t.seat)} ${prevCards.has(t.card) ? '' : 'enter'} ${g.trickWinner === t.seat ? 'win' : ''}`;
    return cardHtml(t.card, `${cls} ${t.card[0] === g.trump ? 'trump' : ''}`);
  }).join('');
  $('#trick').prepend(badge);
  prevCards = new Set(g.trick.map((t) => t.card));
}
