// Client entry point: connects to the server, picks the screen, routes button clicks.
import { $ } from './core/util.js';
import { store } from './core/store.js';
import { connect, send } from './core/net.js';
import { toast } from './ui/toast.js';
import { syncClock } from './core/clock.js';
import { isMuted, toggleMute } from './ui/sfx.js';
import { openRules, closeModal, modalKind } from './ui/modal.js';
import { renderHome, initHome } from './screens/home.js';
import { renderLobby, resetLobby, lobbyActions } from './screens/lobby/index.js';
import { renderTable, initHand, startTimerBars, resetSidebar, resetAnnouncer, bidActions, scoreActions, trumpActions, barActions, startBarMenu } from './screens/table/index.js';
import { openScores } from './screens/table/scoreboard.js';

// ---------- 3D table (optional: the game still works without WebGL) ----------
let table3d = null;
let tableShown = false; // the table screen was already on screen (so the intro has played)
import('./three/scene.js')
  .then((m) => {
    table3d = m.createTable3D($('#scene3d'), {
      onPlay: (card) => {
        if (store.busy) return;
        store.busy = true;
        send({ t: 'play', card });
      },
    });
    $('#table').classList.add('three-on', 'log-hidden');
    if (store.state && store.state.game) { table3d.sync(store.state); if (tableShown) table3d.playIntro(); }
  })
  .catch((e) => console.warn('3D table unavailable, using 2D table', e));

// ---------- Screens ----------
function show(id) {
  for (const s of ['home', 'lobby', 'table']) $('#' + s).classList.toggle('hidden', s !== id);
}

function render() {
  const st = store.state;
  if (!st) { tableShown = false; show('home'); return renderHome(); }
  if (st.phase === 'lobby') { tableShown = false; show('lobby'); return renderLobby(); }
  resetLobby();
  show('table');
  renderTable();
  const firstLook = !tableShown;
  tableShown = true;
  if (table3d) { if (firstLook) table3d.playIntro(); table3d.sync(st); }
}

// ---------- Server messages ----------
function onMessage(m) {
  if (m.t === 'state') {
    const prev = store.state;
    store.state = m.state;
    store.busy = false;
    if (m.state.game) syncClock(m.state.game.now);
    if (m.state.bar) syncClock(m.state.bar.now);
    if (prev && prev.phase !== 'lobby' && m.state.phase === 'lobby') closeModal();
    render();
  } else if (m.t === 'home') {
    store.state = null;
    if (table3d) table3d.reset();
    resetLobby();
    resetSidebar();
    resetAnnouncer();
    if (m.reason) toast(m.reason);
    closeModal();
    render();
  } else if (m.t === 'error') {
    store.busy = false;
    toast(m.msg, true);
  }
}

// ---------- Button actions (elements with data-action="…") ----------
const inEndPanel = () => store.state && store.state.game && ['roundEnd', 'gameOver'].includes(store.state.game.phase);

const actions = {
  ...lobbyActions,
  ...bidActions,
  ...scoreActions,
  ...trumpActions,
  ...barActions,
  rules: openRules,
  toggleLog: () => $('#table').classList.toggle('log-hidden'),
  // Switch graphics quality (Low: lower resolution, no glow, smaller shadows).
  gfx: (b) => {
    const next = localStorage.getItem('lakdi.gfx') === 'low' ? 'high' : 'low';
    localStorage.setItem('lakdi.gfx', next);
    b.textContent = next === 'low' ? 'GFX: Low' : 'GFX: High';
    if (table3d) table3d.setQuality(next); // switches instantly, no reload
  },
  // Take a sip of your own drink (you see it lifted to you; everyone else sees you drink).
  sip: () => drink(),
  mute: (b) => { b.textContent = toggleMute() ? '🔇' : '🔊'; },
  closeModal: () => { closeModal(); if (inEndPanel()) openScores(true); },
  leave: () => {
    const g = store.state && store.state.game;
    if (g && g.phase !== 'gameOver' && !confirm('Leave the game? A bot will take your seat.')) return;
    send({ t: 'leave' });
  },
};

function drink() {
  if (!table3d || !store.state || !store.state.game || !table3d.canSipMine()) return;
  if ($('[data-action=sip]')?.disabled) return; // empty, or the waiter is bringing a new one
  table3d.sipMine();
  send({ t: 'sip' });
}
window.addEventListener('keydown', (e) => {
  if ((e.key === 'd' || e.key === 'D') && !e.target.closest('input, select, textarea')) drink();
});

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (b && actions[b.dataset.action]) actions[b.dataset.action](b);
});

$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal' && modalKind() !== 'roundEnd') closeModal();
});

// ---------- Start ----------
$('#btnMute').textContent = isMuted() ? '🔇' : '🔊';
$('#btnGfx').textContent = localStorage.getItem('lakdi.gfx') === 'low' ? 'GFX: Low' : 'GFX: High';
initHome();
initHand();
startTimerBars();
startBarMenu();
render();
connect(onMessage);
