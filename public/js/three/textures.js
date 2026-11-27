// Procedural textures drawn on canvas: felt, wood, carpet, cards, dealer chip.
import * as THREE from 'three';

const SYM = { S: '♠', H: '♥', C: '♣', D: '♦' };
const RANK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const FONT = '"Segoe UI", system-ui, sans-serif';
let maxAniso = 8;

export function setAnisotropy(n) { maxAniso = n; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function speckle(ctx, w, h, count, colors, size = 1.5) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

// ---------- Table ----------

export function feltTexture() {
  const S = 2048;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.5);
  g.addColorStop(0, '#23a05a');
  g.addColorStop(0.55, '#178045');
  g.addColorStop(1, '#0c4f2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 160000, ['rgba(0,0,0,0.10)', 'rgba(255,255,255,0.05)', 'rgba(0,40,10,0.12)'], 2);

  // Gold rings and emblem.
  ctx.strokeStyle = 'rgba(242,193,78,0.55)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.40, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.385, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(242,193,78,0.25)';
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.16, 0, Math.PI * 2); ctx.stroke();

  // (The trump suit is shown by a separate 3D medallion in the centre, so nothing suit-specific here.)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${S * 0.035}px ${FONT}`;
  ctx.fillStyle = 'rgba(242,193,78,0.35)';
  // Text around the ring.
  const text = '★ LAKDI ★ CALLBREAK ★ CALL YOUR TRICKS ';
  const R = S * 0.43;
  for (let i = 0; i < text.length; i++) {
    const a = (i / text.length) * Math.PI * 2;
    ctx.save();
    ctx.translate(S / 2 + Math.cos(a) * R, S / 2 + Math.sin(a) * R);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  return toTexture(c);
}

export function woodTexture() {
  const [c, ctx] = canvas(1024, 256);
  ctx.fillStyle = '#5b2f17';
  ctx.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * 256;
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? '30,12,4' : '140,80,40'},${0.12 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 32) ctx.lineTo(x, y + Math.sin(x / 90 + i) * 4 + Math.random() * 2);
    ctx.stroke();
  }
  return toTexture(c, { repeat: 4 });
}

export function carpetTexture() {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#4a1f22');
  g.addColorStop(0.6, '#2c1215');
  g.addColorStop(1, '#120709');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(214,170,90,0.18)';
  ctx.lineWidth = 6;
  for (const r of [0.28, 0.31, 0.44]) { ctx.beginPath(); ctx.arc(S / 2, S / 2, S * r, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.save();
    ctx.translate(S / 2 + Math.cos(a) * S * 0.375, S / 2 + Math.sin(a) * S * 0.375);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(214,170,90,0.16)';
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 0); ctx.lineTo(0, 18); ctx.lineTo(-14, 0); ctx.fill();
    ctx.restore();
  }
  speckle(ctx, S, S, 60000, ['rgba(0,0,0,0.2)', 'rgba(255,220,200,0.04)'], 2);
  return toTexture(c);
}

export function wallTexture() {
  const [c, ctx] = canvas(1024, 512);
  ctx.fillStyle = '#16211c';
  ctx.fillRect(0, 0, 1024, 512);
  // Wood panels with trim.
  for (let x = 0; x < 1024; x += 128) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(x + 10, 140, 108, 330);
    ctx.strokeStyle = 'rgba(214,170,90,0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 10, 140, 108, 330);
  }
  ctx.fillStyle = 'rgba(214,170,90,0.15)';
  ctx.fillRect(0, 118, 1024, 6);
  speckle(ctx, 1024, 512, 20000, ['rgba(0,0,0,0.25)'], 2);
  return toTexture(c, { repeat: 1 });
}

// ---------- Cards ----------
// Drawn like a real deck: white card stock, condensed serif indices, vector suit pips in the
// classic layouts, double-ended court figures and a fine-line back. Drawn at 2× for sharpness;
// all coordinates below are in a 300 × 420 card.

export const CARD_PX = { w: 300, h: 420 };
const RES = 2;
const faceCache = new Map();
let backTex = null;

const INK = { red: '#c0182c', black: '#141418' };
const ROBE = { red: '#b8162b', blue: '#1d3f8a', gold: '#e2a925', black: '#141418', skin: '#f6dcbc', white: '#fbfaf6' };

// Vector suit shapes in a unit box centred on 0,0 (about 1 wide, 1 tall).
function suitPath(ctx, s) {
  ctx.beginPath();
  if (s === 'H') {
    ctx.moveTo(0, 0.42);
    ctx.bezierCurveTo(-0.08, 0.3, -0.5, 0.05, -0.5, -0.2);
    ctx.bezierCurveTo(-0.5, -0.42, -0.32, -0.5, -0.24, -0.5);
    ctx.bezierCurveTo(-0.1, -0.5, -0.02, -0.4, 0, -0.3);
    ctx.bezierCurveTo(0.02, -0.4, 0.1, -0.5, 0.24, -0.5);
    ctx.bezierCurveTo(0.32, -0.5, 0.5, -0.42, 0.5, -0.2);
    ctx.bezierCurveTo(0.5, 0.05, 0.08, 0.3, 0, 0.42);
  } else if (s === 'D') {
    ctx.moveTo(0, -0.52);
    ctx.quadraticCurveTo(0.18, -0.22, 0.4, 0);
    ctx.quadraticCurveTo(0.18, 0.22, 0, 0.52);
    ctx.quadraticCurveTo(-0.18, 0.22, -0.4, 0);
    ctx.quadraticCurveTo(-0.18, -0.22, 0, -0.52);
  } else if (s === 'S') {
    ctx.moveTo(0, -0.5);
    ctx.bezierCurveTo(-0.08, -0.36, -0.5, -0.12, -0.5, 0.12);
    ctx.bezierCurveTo(-0.5, 0.3, -0.36, 0.38, -0.24, 0.38);
    ctx.bezierCurveTo(-0.12, 0.38, -0.05, 0.32, -0.03, 0.26);
    ctx.quadraticCurveTo(-0.06, 0.42, -0.18, 0.5);
    ctx.lineTo(0.18, 0.5);
    ctx.quadraticCurveTo(0.06, 0.42, 0.03, 0.26);
    ctx.bezierCurveTo(0.05, 0.32, 0.12, 0.38, 0.24, 0.38);
    ctx.bezierCurveTo(0.36, 0.38, 0.5, 0.3, 0.5, 0.12);
    ctx.bezierCurveTo(0.5, -0.12, 0.08, -0.36, 0, -0.5);
  } else {
    // Club: three balls and a flared stem.
    ctx.arc(0, -0.25, 0.22, 0, Math.PI * 2);
    ctx.moveTo(-0.03, 0.08); ctx.arc(-0.25, 0.08, 0.22, 0, Math.PI * 2);
    ctx.moveTo(0.47, 0.08); ctx.arc(0.25, 0.08, 0.22, 0, Math.PI * 2);
    ctx.moveTo(-0.05, 0);
    ctx.quadraticCurveTo(-0.04, 0.38, -0.18, 0.5);
    ctx.lineTo(0.18, 0.5);
    ctx.quadraticCurveTo(0.04, 0.38, 0.05, 0);
    ctx.closePath();
  }
}

function pip(ctx, s, x, y, size, flip = false, color = null) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.rotate(Math.PI);
  ctx.scale(size, size);
  suitPath(ctx, s);
  ctx.fillStyle = color || (s === 'H' || s === 'D' ? INK.red : INK.black);
  ctx.fill();
  ctx.restore();
}

// Classic pip layouts: [x, y] in the pip area (0..1). Pips in the lower half are upside down.
const L = 0, C = 0.5, R = 1;
const PIPS = {
  2: [[C, 0], [C, 1]],
  3: [[C, 0], [C, 0.5], [C, 1]],
  4: [[L, 0], [R, 0], [L, 1], [R, 1]],
  5: [[L, 0], [R, 0], [C, 0.5], [L, 1], [R, 1]],
  6: [[L, 0], [R, 0], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  7: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  8: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [C, 0.75], [L, 1], [R, 1]],
  9: [[L, 0], [R, 0], [L, 1 / 3], [R, 1 / 3], [C, 0.5], [L, 2 / 3], [R, 2 / 3], [L, 1], [R, 1]],
  10: [[L, 0], [R, 0], [C, 1 / 6], [L, 1 / 3], [R, 1 / 3], [L, 2 / 3], [R, 2 / 3], [C, 5 / 6], [L, 1], [R, 1]],
};
const INDEX_FONT = '"Times New Roman", Georgia, serif';

function cardStock(ctx, w, h) {
  roundRect(ctx, 1.5, 1.5, w - 3, h - 3, 16);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#f4f2ec');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.stroke();
}

// One half of a court card: a bust in robes, drawn in a 190 × 150 box (head at the top).
function courtHalf(ctx, r, s, red) {
  const W = 190;
  const cx = W / 2;
  const main = red ? ROBE.red : ROBE.blue, second = red ? ROBE.blue : ROBE.red;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = ROBE.black;
  ctx.lineJoin = 'round';
  const shape = (fill, draw) => { ctx.beginPath(); draw(); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };

  // Robe: shoulders and chest, in panels.
  shape(main, () => { ctx.moveTo(12, 150); ctx.quadraticCurveTo(18, 100, 58, 92); ctx.lineTo(132, 92); ctx.quadraticCurveTo(172, 100, 178, 150); });
  shape(ROBE.gold, () => { ctx.moveTo(70, 150); ctx.lineTo(78, 96); ctx.lineTo(112, 96); ctx.lineTo(120, 150); });
  for (let y = 104; y < 150; y += 11) { ctx.beginPath(); ctx.moveTo(78 - (y - 96) * 0.04, y); ctx.lineTo(112 + (y - 96) * 0.04, y); ctx.stroke(); }
  shape(second, () => { ctx.moveTo(88, 150); ctx.lineTo(91, 100); ctx.lineTo(99, 100); ctx.lineTo(102, 150); });
  // Ermine collar.
  shape(ROBE.white, () => { ctx.moveTo(50, 98); ctx.quadraticCurveTo(cx, 120, 140, 98); ctx.lineTo(132, 88); ctx.quadraticCurveTo(cx, 104, 58, 88); });
  ctx.fillStyle = ROBE.black;
  for (const x of [66, 80, 95, 110, 124]) { ctx.fillRect(x - 1.5, 96 + Math.abs(x - cx) * -0.08 + 4, 3, 5); }

  // Neck and head.
  shape(ROBE.skin, () => { ctx.moveTo(84, 92); ctx.lineTo(84, 76); ctx.lineTo(106, 76); ctx.lineTo(106, 92); });
  ctx.beginPath(); ctx.ellipse(cx, 58, 21, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = ROBE.skin; ctx.fill(); ctx.stroke();
  // Hair either side of the face.
  const hair = r === 12 ? ROBE.gold : r === 11 ? '#7a4a1c' : '#d9d4c8';
  shape(hair, () => { ctx.moveTo(74, 46); ctx.quadraticCurveTo(66, 70, 74, 90); ctx.lineTo(80, 88); ctx.quadraticCurveTo(76, 66, 79, 48); });
  shape(hair, () => { ctx.moveTo(116, 46); ctx.quadraticCurveTo(124, 70, 116, 90); ctx.lineTo(110, 88); ctx.quadraticCurveTo(114, 66, 111, 48); });
  // Face: brows, eyes, nose, mouth.
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(83, 50); ctx.quadraticCurveTo(87, 47, 91, 50);
  ctx.moveTo(99, 50); ctx.quadraticCurveTo(103, 47, 107, 50);
  ctx.moveTo(95, 54); ctx.quadraticCurveTo(92, 62, 96, 65);
  ctx.moveTo(89, 72); ctx.quadraticCurveTo(95, 74, 101, 72);
  ctx.stroke();
  ctx.fillStyle = ROBE.black;
  ctx.beginPath(); ctx.ellipse(87, 54, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.ellipse(103, 54, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  if (r === 13) {
    // King: beard and moustache.
    shape('#d9d4c8', () => { ctx.moveTo(76, 66); ctx.quadraticCurveTo(80, 92, cx, 96); ctx.quadraticCurveTo(110, 92, 114, 66); ctx.quadraticCurveTo(cx, 80, 76, 66); });
  }
  ctx.lineWidth = 1.6;

  // Headwear: crowns for king and queen, a feathered cap for the jack.
  if (r === 11) {
    shape(main, () => { ctx.moveTo(70, 42); ctx.quadraticCurveTo(cx, 10, 122, 40); ctx.lineTo(118, 46); ctx.quadraticCurveTo(cx, 30, 72, 48); });
    shape(ROBE.gold, () => { ctx.moveTo(110, 30); ctx.quadraticCurveTo(140, 4, 150, 14); ctx.quadraticCurveTo(132, 18, 114, 36); });
  } else {
    const top = r === 13 ? 8 : 16;
    shape(ROBE.gold, () => {
      ctx.moveTo(72, 40);
      const pts = r === 13 ? 5 : 3;
      for (let i = 0; i <= pts * 2; i++) {
        const x = 72 + (46 * i) / (pts * 2);
        ctx.lineTo(x, i % 2 ? 30 : top);
      }
      ctx.lineTo(118, 40);
    });
    ctx.fillStyle = second;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(80 + i * 15, 36, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }

  // Held item: sceptre (K), flower (Q), halberd (J), drawn at the side.
  ctx.lineWidth = 2.2;
  if (r === 12) {
    ctx.beginPath(); ctx.moveTo(150, 150); ctx.lineTo(146, 96); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(146 + Math.cos(a) * 6, 90 + Math.sin(a) * 6, 5, 3, a, 0, Math.PI * 2);
      ctx.fillStyle = second; ctx.fill(); ctx.lineWidth = 1; ctx.stroke(); ctx.lineWidth = 2.2;
    }
    ctx.beginPath(); ctx.arc(146, 90, 3, 0, Math.PI * 2); ctx.fillStyle = ROBE.gold; ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(36, 150); ctx.lineTo(42, 70); ctx.stroke();
    if (r === 13) { ctx.beginPath(); ctx.arc(42, 64, 7, 0, Math.PI * 2); ctx.fillStyle = ROBE.gold; ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke(); }
    else { shape('#c9c9cf', () => { ctx.moveTo(42, 70); ctx.lineTo(30, 58); ctx.lineTo(44, 50); ctx.lineTo(54, 66); }); }
  }
  ctx.lineWidth = 1.6;
  // The suit on the robe.
  pip(ctx, s, 150, 128, 20);
}

export function cardFaceTexture(card) {
  if (faceCache.has(card)) return faceCache.get(card);
  const { w, h } = CARD_PX;
  const [c, ctx] = canvas(w * RES, h * RES);
  ctx.scale(RES, RES);
  const s = card[0], r = +card.slice(1);
  const red = s === 'H' || s === 'D';
  const rank = RANK[r] || String(r);
  const color = red ? INK.red : INK.black;
  cardStock(ctx, w, h);

  // Corner indices (top-left and, upside down, bottom-right): narrow serif rank over a small pip.
  const corner = (rot) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rot);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.save();
    ctx.translate(27, 56);
    ctx.scale(rank === '10' ? 0.62 : 0.85, 1);
    ctx.font = `bold 46px ${INDEX_FONT}`;
    ctx.fillText(rank, 0, 0);
    ctx.restore();
    pip(ctx, s, 27, 76, 24);
    ctx.restore();
  };
  corner(0);
  corner(Math.PI);

  if (r === 14) {
    if (s === 'S') {
      // Ace of spades: one large ornate spade.
      ctx.save();
      ctx.strokeStyle = 'rgba(20,20,24,0.55)';
      ctx.lineWidth = 1;
      for (const rad of [88, 94]) { ctx.beginPath(); ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * 94, h / 2 + Math.sin(a) * 94);
        ctx.lineTo(w / 2 + Math.cos(a) * 100, h / 2 + Math.sin(a) * 100);
        ctx.stroke();
      }
      ctx.restore();
      pip(ctx, s, w / 2, h / 2, 130);
      pip(ctx, s, w / 2, h / 2 - 6, 70, false, '#fbfaf6');
      pip(ctx, s, w / 2, h / 2 - 6, 52);
    } else {
      pip(ctx, s, w / 2, h / 2, 74);
    }
  } else if (r >= 11) {
    // Court card: framed, double-ended (bottom half is the top half turned round).
    const fx = 55, fy = 48, fw = w - 110, fh = h - 96;
    ctx.save();
    roundRect(ctx, fx, fy, fw, fh, 4);
    ctx.fillStyle = '#fffdf6';
    ctx.fill();
    ctx.clip();
    for (const flip of [false, true]) {
      ctx.save();
      if (flip) { ctx.translate(w / 2, h / 2); ctx.rotate(Math.PI); ctx.translate(-w / 2, -h / 2); }
      ctx.beginPath(); ctx.rect(fx, fy, fw, fh / 2); ctx.clip();
      ctx.translate(fx + (fw - 190) / 2, fy + 10);
      courtHalf(ctx, r, s, red);
      ctx.restore();
    }
    ctx.restore();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = color;
    roundRect(ctx, fx, fy, fw, fh, 4);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, h / 2); ctx.lineTo(fx + fw, h / 2); ctx.stroke();
  } else {
    // Number card.
    const x0 = 86, x1 = w - 86, y0 = 66, y1 = h - 66;
    const size = r >= 9 ? 40 : 44;
    for (const [px, py] of PIPS[r]) pip(ctx, s, x0 + (x1 - x0) * px, y0 + (y1 - y0) * py, size, py > 0.5);
  }
  const t = toTexture(c);
  faceCache.set(card, t);
  return t;
}

export function cardBackTexture() {
  if (backTex) return backTex;
  const { w, h } = CARD_PX;
  const [c, ctx] = canvas(w * RES, h * RES);
  ctx.scale(RES, RES);
  cardStock(ctx, w, h);
  const m = 16;
  // Fine-line lattice in deep red with a white border, like a casino deck.
  ctx.save();
  roundRect(ctx, m, m, w - 2 * m, h - 2 * m, 6);
  ctx.fillStyle = '#9e1b2a';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,240,235,0.55)';
  ctx.lineWidth = 0.8;
  for (let i = -h; i < w + h; i += 9) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
  }
  // Tiny rosettes in the lattice cells.
  ctx.fillStyle = 'rgba(255,240,235,0.5)';
  for (let y = m; y < h; y += 18) for (let x = m + ((y / 18) % 2) * 9; x < w; x += 18) { ctx.beginPath(); ctx.arc(x, y + 4.5, 1.2, 0, Math.PI * 2); ctx.fill(); }
  // Inner frame and central medallion.
  ctx.strokeStyle = '#fbf4ef';
  ctx.lineWidth = 2;
  roundRect(ctx, m + 9, m + 9, w - 2 * m - 18, h - 2 * m - 18, 4);
  ctx.stroke();
  ctx.lineWidth = 0.8;
  roundRect(ctx, m + 13, m + 13, w - 2 * m - 26, h - 2 * m - 26, 3);
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 54, 70, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#9e1b2a'; ctx.fill();
  ctx.lineWidth = 2; ctx.stroke();
  ctx.lineWidth = 0.8;
  for (const k of [0.82, 0.64]) { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 54 * k, 70 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath(); ctx.ellipse(w / 2 + Math.cos(a) * 40, h / 2 + Math.sin(a) * 52, 5, 2.2, a, 0, Math.PI * 2); ctx.stroke();
  }
  pip(ctx, 'S', w / 2, h / 2, 46, false, '#fbf4ef');
  ctx.restore();
  backTex = toTexture(c);
  return backTex;
}

export function chipTexture(letter) {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath(); ctx.arc(128, 128, 126, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff6d8';
  ctx.setLineDash([22, 18]);
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(128, 128, 108, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#2a1d05';
  ctx.font = `bold 130px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 128, 136);
  return toTexture(c);
}

// ---------- Bar room ----------

export function brickTexture() {
  const [c, ctx] = canvas(1024, 1024);
  ctx.fillStyle = '#2a1712';
  ctx.fillRect(0, 0, 1024, 1024);
  const bw = 128, bh = 56;
  for (let row = 0; row < 1024 / bh + 1; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 1024 + bw; x += bw) {
      const r = 70 + Math.random() * 40, g = 32 + Math.random() * 18, b = 22 + Math.random() * 12;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + off + 4, row * bh + 4, bw - 8, bh - 8);
      // Wear and soot.
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.35})`;
      ctx.fillRect(x + off + 4, row * bh + 4 + (bh - 8) * Math.random() * 0.6, bw - 8, (bh - 8) * 0.4);
    }
  }
  speckle(ctx, 1024, 1024, 90000, ['rgba(0,0,0,0.25)', 'rgba(255,220,180,0.05)'], 2);
  // Soot gradient toward the top.
  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.1)');
  g.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  return toTexture(c, { repeat: 1 });
}

export function plankTexture(dark = false) {
  const [c, ctx] = canvas(1024, 1024);
  const base = dark ? [38, 24, 16] : [74, 46, 28];
  const pw = 128;
  for (let x = 0; x < 1024; x += pw) {
    const k = 0.75 + Math.random() * 0.4;
    ctx.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`;
    ctx.fillRect(x, 0, pw, 1024);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.15})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      const lx = x + Math.random() * pw;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      for (let y = 0; y <= 1024; y += 64) ctx.lineTo(lx + Math.sin(y / 120 + i) * 3, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, 0, 4, 1024);
    // Plank ends.
    const cut = Math.random() * 1024;
    ctx.fillRect(x, cut, pw, 3);
    for (const ny of [cut + 30, cut - 30]) {
      ctx.fillStyle = 'rgba(20,12,8,0.8)';
      ctx.beginPath(); ctx.arc(x + 14, ny, 4, 0, Math.PI * 2); ctx.arc(x + pw - 14, ny, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  speckle(ctx, 1024, 1024, 50000, ['rgba(0,0,0,0.2)', 'rgba(255,230,200,0.03)'], 2);
  return toTexture(c, { repeat: 1 });
}

export function neonTexture(text, sub) {
  const [c, ctx] = canvas(1024, 384);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glowText = (t, y, size, color) => {
    ctx.font = `bold ${size}px Georgia, serif`;
    ctx.shadowColor = color;
    for (const blur of [60, 30, 12]) { ctx.shadowBlur = blur; ctx.fillStyle = color; ctx.fillText(t, 512, y); }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff6e8';
    ctx.fillText(t, 512, y);
  };
  glowText(text, 150, 170, '#ff3b4e');
  if (sub) glowText(sub, 300, 64, '#ffb347');
  return toTexture(c);
}

export function smokeTexture() {
  const [c, ctx] = canvas(256, 256);
  for (let i = 0; i < 18; i++) {
    const x = 128 + (Math.random() - 0.5) * 90, y = 128 + (Math.random() - 0.5) * 90, r = 40 + Math.random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  return toTexture(c);
}

export function posterTexture(title, symbol, color) {
  const [c, ctx] = canvas(512, 720);
  ctx.fillStyle = '#d9c9a3';
  ctx.fillRect(0, 0, 512, 720);
  speckle(ctx, 512, 720, 30000, ['rgba(80,50,20,0.12)', 'rgba(0,0,0,0.06)'], 3);
  ctx.strokeStyle = '#3a2412';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, 464, 672);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 300px Georgia, serif';
  ctx.fillText(symbol, 256, 330);
  ctx.fillStyle = '#2a1a0c';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText(title, 256, 600);
  // Age stains.
  for (let i = 0; i < 6; i++) {
    const g = ctx.createRadialGradient(Math.random() * 512, Math.random() * 720, 0, 256, 360, 400);
    g.addColorStop(0, 'rgba(90,60,20,0.18)');
    g.addColorStop(1, 'rgba(90,60,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 720);
  }
  return toTexture(c);
}

// Centre medallion showing the trump suit (or "?" while the highest bidder is still choosing).
const medallionCache = new Map();
export function medallionTexture(suitLetter) {
  const key = suitLetter || '?';
  if (medallionCache.has(key)) return medallionCache.get(key);
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#2a1b10');
  g.addColorStop(1, '#0d0805');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 18, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 38, 0, Math.PI * 2); ctx.stroke();
  const red = suitLetter === 'H' || suitLetter === 'D';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = red ? '#ff3050' : '#ffd27a';
  ctx.shadowBlur = 30;
  ctx.fillStyle = red ? '#ff4a62' : '#fff3dc';
  ctx.font = `bold ${suitLetter ? 260 : 220}px ${FONT}`;
  ctx.fillText(suitLetter ? SYM[suitLetter] : '?', S / 2, S / 2 - 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f2c14e';
  ctx.font = `bold 44px Georgia, serif`;
  ctx.fillText('TRUMP', S / 2, S - 92);
  const t = toTexture(c);
  medallionCache.set(key, t);
  return t;
}
