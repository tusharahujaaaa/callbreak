// A single shared modal dialog.
import { $ } from '../core/util.js';

let kind = null; // 'rules' | 'scores' | 'roundEnd' | 'last' | null

export const modalKind = () => kind;

export function openModal(html, k) {
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
  kind = k;
}

export function closeModal() {
  $('#modal').classList.add('hidden');
  kind = null;
}

export function openRules() {
  openModal($('#rulesTpl').innerHTML, 'rules');
}
