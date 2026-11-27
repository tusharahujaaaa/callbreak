// Game table screen.
import { $ } from '../../core/util.js';
import { store } from '../../core/store.js';
import { renderSeats } from './seats.js';
import { renderTrick } from './trick.js';
import { renderHand } from './hand.js';
import { renderStatus } from './status.js';
import { renderBidPanel } from './bidPanel.js';
import { renderSidebar } from './sidebar.js';
import { syncRoundEndPanel } from './scoreboard.js';
import { runAnnouncer } from './announcer.js';
import { renderTrumpPanel, renderTrumpBadge } from './trumpPanel.js';
import { renderBarMenu } from './barMenu.js';

export function renderTable() {
  const st = store.state, g = st.game;
  $('#roundInfo').textContent = `Round ${g.round} / ${g.rounds}`;
  $('#roomChip').textContent = `Room ${st.code}`;
  renderSeats();
  renderTrick();
  renderHand();
  renderStatus();
  renderBidPanel();
  renderTrumpPanel();
  renderTrumpBadge();
  renderBarMenu();
  renderSidebar();
  syncRoundEndPanel();
  runAnnouncer(st);
}

export { initHand } from './hand.js';
export { startTimerBars } from './seats.js';
export { resetSidebar } from './sidebar.js';
export { resetAnnouncer } from './announcer.js';
export { bidActions } from './bidPanel.js';
export { scoreActions } from './scoreboard.js';
export { trumpActions } from './trumpPanel.js';
export { barActions, startBarMenu } from './barMenu.js';
