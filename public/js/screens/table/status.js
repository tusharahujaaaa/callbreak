// The one-line status message in the middle of the table.
import { $ } from '../../core/util.js';
import { store, seatName } from '../../core/store.js';
import { choosingText } from './trumpPanel.js';

export function renderStatus() {
  const st = store.state, g = st.game;
  const mine = g.turn === st.mySeat;
  let text = '';
  switch (g.phase) {
    case 'dealing': text = g.dealer === st.mySeat ? 'You are dealing…' : `${seatName(g.dealer)} is dealing…`; break;
    case 'choosingTrump': text = choosingText(g, st); break;
    case 'bidding': text = mine ? 'Your turn to bid' : `${seatName(g.turn)} is bidding…`; break;
    case 'playing': text = mine ? 'Your turn: pick a highlighted card' : `${seatName(g.turn)} to play`; break;
    case 'trickEnd': text = `${seatName(g.trickWinner)} ${g.trickWinner === st.mySeat ? 'win' : 'wins'} the trick`; break;
    case 'roundEnd': text = 'Round over'; break;
    case 'gameOver': text = 'Game over'; break;
  }
  if (g.phase === 'playing' || g.phase === 'trickEnd') {
    text += ` · Total bid ${g.bids.reduce((a, b) => a + (b || 0), 0)}`;
  }
  $('#status').textContent = text;
}
