// Your own cards. Legal cards are highlighted on your turn; click one to play it.
// While dealing, cards appear one by one as they arrive (in the order dealt), then get sorted.
import { $, suit } from '../../core/util.js';
import { store } from '../../core/store.js';
import { send } from '../../core/net.js';
import { serverNow } from '../../core/clock.js';
import { cardHtml } from '../../ui/cards.js';
import { dealTimeline, arrivedCount } from '../../game/dealTimeline.js';

let timeline = null;
let timelineId = null;
let shownCount = -1;
let dealTimer = null;

const myTurnToPlay = () => {
  const st = store.state;
  return st && st.game && st.game.phase === 'playing' && st.game.turn === st.mySeat;
};

function dealingCards(g) {
  if (timelineId !== g.deal.id) { timeline = dealTimeline(g.deal); timelineId = g.deal.id; shownCount = -1; }
  const n = arrivedCount(timeline, store.state.mySeat, serverNow() - g.deal.startedAt);
  return g.dealt.slice(0, n);
}

function draw(cards, { dealing }) {
  const g = store.state.game;
  const legal = new Set(g.legal);
  const el = $('#hand');
  el.classList.toggle('myturn', myTurnToPlay());
  let prevSuit = null;
  el.innerHTML = cards.map((c, i) => {
    const gap = !dealing && prevSuit && prevSuit !== suit(c) ? 'gap' : '';
    prevSuit = suit(c);
    const fresh = dealing && i >= shownCount && shownCount >= 0 ? 'dealt-in' : '';
    const trump = g.trump && suit(c) === g.trump ? 'trump' : '';
    return cardHtml(c, `${legal.has(c) ? 'legal' : ''} ${gap} ${fresh} ${trump}`);
  }).join('');
  shownCount = cards.length;
}

export function renderHand() {
  const g = store.state.game;
  if (g.phase === 'dealing' && g.deal && g.dealt) {
    draw(dealingCards(g), { dealing: true });
    // Keep revealing cards until the server says dealing is over.
    if (!dealTimer) {
      dealTimer = setInterval(() => {
        const st = store.state;
        if (!st || !st.game || st.game.phase !== 'dealing') { clearInterval(dealTimer); dealTimer = null; return; }
        const cards = dealingCards(st.game);
        if (cards.length !== shownCount) draw(cards, { dealing: true });
      }, 40);
    }
    return;
  }
  shownCount = -1;
  draw(g.hand, { dealing: false });
}

export function initHand() {
  $('#hand').addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card.legal');
    if (!cardEl || !myTurnToPlay() || store.busy) return;
    store.busy = true;
    cardEl.style.transform = 'translateY(-30px)';
    send({ t: 'play', card: cardEl.dataset.card });
  });
}
