// Draws a playing card.
import { SYM, suit, rank, rankText } from '../core/util.js';

export function cardHtml(c, extraClass = '') {
  const s = suit(c), r = rank(c);
  const red = s === 'H' || s === 'D';
  const face = r >= 11;
  const corner = `${rankText(r)}<span>${SYM[s]}</span>`;
  return `<div class="card ${red ? 'red' : ''} ${extraClass}" data-card="${c}">
    <div class="tl">${corner}</div>
    <div class="mid ${face ? 'face' : ''}">${face ? rankText(r) + SYM[s] : SYM[s]}</div>
    <div class="br">${corner}</div></div>`;
}
