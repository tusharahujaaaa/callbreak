// Home screen: name, create / join a room, or play solo vs bots.
import { $ } from '../core/util.js';
import { send } from '../core/net.js';
import { toast } from '../ui/toast.js';

export function renderHome() {
  const n = $('#nameInput');
  if (!n.value) n.value = localStorage.getItem('lakdi.name') || '';
  const code = new URLSearchParams(location.search).get('room');
  if (code && !$('#codeInput').value) $('#codeInput').value = code.toUpperCase();
}

function myName() {
  const n = $('#nameInput').value.trim();
  if (!n) { toast('Please enter your name', true); $('#nameInput').focus(); return null; }
  localStorage.setItem('lakdi.name', n);
  return n;
}

export function initHome() {
  $('#btnCreate').onclick = () => {
    const name = myName();
    if (name) send({ t: 'create', name });
  };
  $('#btnJoin').onclick = () => {
    const name = myName();
    if (!name) return;
    const code = $('#codeInput').value.trim().toUpperCase();
    if (code.length !== 4) return toast('Enter the 4-letter room code', true);
    send({ t: 'join', code, name });
  };
  $('#btnSolo').onclick = () => {
    const name = myName();
    if (name) send({ t: 'solo', name, level: $('#soloLevel').value });
  };
  $('#codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnJoin').click(); });
}
