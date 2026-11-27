// Lobby screen: players, table rules, start button.
import { $, esc } from '../../core/util.js';
import { store } from '../../core/store.js';
import { send } from '../../core/net.js';
import { toast } from '../../ui/toast.js';
import { settingsFormHtml, syncSettingsForm, onSettingsChange } from './settingsForm.js';
import { renderSeatList, seatActions } from './seatList.js';

let builtFor = null; // room code the lobby DOM was built for

export const resetLobby = () => { builtFor = null; };

function build(st) {
  builtFor = st.code;
  $('#lobby').innerHTML = `
    <div class="lobby-head">
      <h1>Room <span class="code-big">${esc(st.code)}</span></h1>
      <div class="row" style="flex:0">
        <button class="btn" data-action="copyLink">Copy invite link</button>
        <button class="btn" data-action="rules">Rules</button>
        <button class="btn danger" data-action="leave">Leave</button>
      </div>
    </div>
    <div class="lobby-grid">
      <div>
        <div class="box">
          <h2>Players</h2>
          <p class="hint">Share the room code with friends. The host can fill empty seats with bots.</p>
          <div id="seatList"></div>
          <div id="fillBar"></div>
        </div>
        <div class="start-bar" id="startBar"></div>
      </div>
      <div class="box">
        <h2>Table rules</h2>
        <p class="hint" id="rulesHint"></p>
        <form id="settingsForm" onsubmit="return false">${settingsFormHtml()}</form>
      </div>
    </div>`;
  $('#settingsForm').addEventListener('change', onSettingsChange);
}

export function renderLobby() {
  const st = store.state;
  if (builtFor !== st.code) build(st);

  const empty = renderSeatList(st);
  $('#startBar').innerHTML = st.isHost
    ? `<span class="note">${empty ? `Waiting for ${empty} more player${empty > 1 ? 's' : ''} or bots.` : 'All 4 seats are filled.'}</span>
       <button class="btn primary big" data-action="start" ${empty ? 'disabled' : ''}>Start game</button>`
    : '<span class="note">Waiting for the host to start the game…</span>';
  $('#rulesHint').textContent = st.isHost
    ? 'You are the host: changes apply to everyone at the table.'
    : 'Only the host can change these rules.';
  syncSettingsForm(st.settings, !st.isHost);
}

export const lobbyActions = {
  ...seatActions,
  start: () => send({ t: 'start' }),
  copyLink: () => {
    const url = `${location.origin}${location.pathname}?room=${store.state.code}`;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
      () => toast('Invite link copied'),
      () => prompt('Copy this link:', url));
  },
};
