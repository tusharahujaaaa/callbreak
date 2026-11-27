// The "Table rules" form in the lobby. Editable by the host, read-only for others.
import { $ } from '../../core/util.js';
import { store } from '../../core/store.js';
import { send } from '../../core/net.js';
import { SETTINGS_SPEC } from '../../config/settingsSpec.js';

export function settingsFormHtml() {
  let html = '';
  let open = false;
  for (const f of SETTINGS_SPEC) {
    if (f.group) {
      if (open) html += '</div>';
      html += `<div class="settings-group"><h3>${f.group}</h3>`;
      open = true;
      continue;
    }
    let input;
    if (f.type === 'bool') input = `<label class="switch"><input type="checkbox" name="${f.key}"><span></span></label>`;
    else if (f.type === 'number') input = `<input type="number" name="${f.key}" min="${f.min}" max="${f.max}" step="${f.step || 1}">`;
    else input = `<select name="${f.key}">${f.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
    html += `<div class="setting" data-row="${f.key}"><div class="lbl">${f.label}${f.hint ? `<small>${f.hint}</small>` : ''}</div>${input}</div>`;
  }
  return html + (open ? '</div>' : '');
}

// Copy the server's settings into the form (without stomping the field being edited).
export function syncSettingsForm(s, readOnly) {
  const form = $('#settingsForm');
  if (!form) return;
  for (const f of SETTINGS_SPEC) {
    if (f.group) continue;
    const input = form.elements[f.key];
    if (document.activeElement !== input) {
      if (f.type === 'bool') input.checked = !!s[f.key];
      else input.value = s[f.key];
    }
    const inactive = f.dep && !s[f.dep];
    input.disabled = readOnly || inactive;
    form.querySelector(`[data-row="${f.key}"]`).style.opacity = inactive ? 0.5 : 1;
  }
}

export function onSettingsChange() {
  if (!store.state || !store.state.isHost) return;
  const form = $('#settingsForm');
  const out = {};
  for (const f of SETTINGS_SPEC) {
    if (f.group) continue;
    const input = form.elements[f.key];
    out[f.key] = f.type === 'bool' ? input.checked : f.type === 'number' ? Number(input.value) : input.value;
  }
  send({ t: 'settings', settings: out });
}
