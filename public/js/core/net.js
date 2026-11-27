// WebSocket connection to the game server, with automatic reconnect.
import { $ } from './util.js';

let ws = null;
let handler = () => {};

function getPlayerId() {
  let id = localStorage.getItem('lakdi.pid');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('lakdi.pid', id);
  }
  return id;
}

export const playerId = getPlayerId();

export function send(msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

export function connect(onMessage) {
  handler = onMessage;
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => {
    $('#conn').classList.add('hidden');
    send({ t: 'hello', playerId });
  };
  ws.onmessage = (e) => handler(JSON.parse(e.data));
  ws.onclose = () => {
    $('#conn').classList.remove('hidden');
    setTimeout(() => connect(handler), 1500);
  };
}
