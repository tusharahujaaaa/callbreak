// Small synthesized sound effects (no audio files needed).
let ctx = null;
let muted = localStorage.getItem('lakdi.muted') === '1';

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Browsers only allow audio after a user gesture.
window.addEventListener('pointerdown', () => audio(), { once: true });

function noiseBurst(duration, freq, gain, q = 1.2) {
  const a = audio();
  if (!a || muted) return;
  const len = Math.floor(a.sampleRate * duration);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
}

function tone(freq, start, duration, gain, type = 'sine') {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + duration + 0.05);
}

export const sfx = {
  deal: () => noiseBurst(0.07, 3200, 0.25, 0.9),
  play: () => { noiseBurst(0.09, 1800, 0.45); tone(140, 0, 0.12, 0.12, 'triangle'); },
  win: () => { tone(660, 0, 0.25, 0.08); tone(990, 0.09, 0.35, 0.07); },
  turn: () => tone(880, 0, 0.18, 0.05),
  tick: () => noiseBurst(0.03, 4200, 0.12, 2),
  thud: () => { tone(70, 0, 0.25, 0.25, 'sine'); noiseBurst(0.12, 400, 0.3); },
  sting: () => { tone(220, 0, 0.6, 0.06, 'sawtooth'); tone(330, 0.02, 0.6, 0.05, 'sawtooth'); tone(440, 0.04, 0.7, 0.04, 'sawtooth'); },
  // Liquid glugs into a glass.
  pour: () => { for (let i = 0; i < 7; i++) setTimeout(() => { noiseBurst(0.09, 500 + i * 70, 0.22, 3); tone(180 + i * 25, 0, 0.08, 0.03); }, i * 110); },
  // Counter bell when you call the waiter.
  bell: () => { tone(1568, 0, 1.2, 0.07); tone(2093, 0, 0.9, 0.04); },
  shuffle: () => { for (let i = 0; i < 8; i++) setTimeout(() => noiseBurst(0.05, 2600 + Math.random() * 800, 0.18), i * 35); },
};

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  localStorage.setItem('lakdi.muted', muted ? '1' : '0');
  return muted;
}
