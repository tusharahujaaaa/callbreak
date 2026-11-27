// Seated 3D players holding a fan of cards. Humans are stylised people; bots are robots whose
// glow colour shows their level. Built from primitives (no model files needed).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeCard } from './cards3d.js';
import { createModelBody } from './modelCharacter.js';
import { goldMat, velvetMat, turnedLeg, crest, finial } from './royal.js';
import { makeRoyalChair } from './chairModel.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

const SHIRTS = [0x2f6fd6, 0xc9542c, 0x7a43b6, 0x2a9d6a, 0xc23a5b, 0xd09a2c];
const SKINS = [0xf1c9a0, 0xe0ac7d, 0xc68a5a, 0x8d5a3b];
const HAIRS = [0x24170e, 0x0f0f10, 0x6b3e1f, 0x3a2a1a, 0x8a5a2b];
const BOT_ACCENT = { beginner: 0x46d17a, intermediate: 0x3fa0ff, pro: 0xc06bff };

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts });
}

function mesh(geo, material, { shadow = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// Capsule between two points.
function limb(a, b, r, material) {
  const d = b.clone().sub(a);
  const m = mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 14), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// Royal chair: dark carved frame, maroon velvet seat and back panel, gold piping, a crowned top
// and turned gilded legs.
function buildChair(group) {
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x2c140b, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const velvet = velvetMat(0x6e0f1d);
  const gold = goldMat();
  const seat = mesh(new RoundedBoxGeometry(1.25, 0.16, 1.15, 3, 0.05), wood);
  seat.position.set(0, -1.0, -0.15);
  const pad = mesh(new RoundedBoxGeometry(1.15, 0.16, 1.05, 4, 0.07), velvet);
  pad.position.set(0, -0.86, -0.15);
  const piping = mesh(new RoundedBoxGeometry(1.27, 0.04, 1.17, 2, 0.02), gold);
  piping.position.set(0, -0.93, -0.15);
  const back = mesh(new RoundedBoxGeometry(1.25, 2.0, 0.14, 3, 0.06), wood);
  back.position.set(0, 0.0, -0.78);
  back.rotation.x = -0.1;
  const backPad = mesh(new RoundedBoxGeometry(1.0, 1.5, 0.1, 4, 0.05), velvet);
  backPad.position.set(0, 0.05, -0.7);
  backPad.rotation.x = -0.1;
  const topRail = mesh(new RoundedBoxGeometry(1.33, 0.1, 0.2, 2, 0.03), gold);
  topRail.position.set(0, 1.02, -0.83);
  topRail.rotation.x = -0.1;
  const arch = crest(0.5, 0.04, gold);
  arch.position.set(0, 1.06, -0.85);
  arch.rotation.x = -0.1;
  const top = finial(0.08, gold);
  top.position.set(0, 1.6, -0.9);
  group.add(seat, pad, piping, back, backPad, topRail, arch, top);
  for (const x of [-0.64, 0.64]) {
    const f = finial(0.07, gold);
    f.position.set(x, 1.04, -0.84);
    const trim = mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), gold);
    trim.position.set(x * 0.98, 0.0, -0.72);
    trim.rotation.x = -0.1;
    group.add(f, trim);
  }
  for (const [x, z] of [[-0.52, 0.32], [0.52, 0.32], [-0.52, -0.66], [0.52, -0.66]]) {
    const leg = turnedLeg(1.65, 0.075, gold);
    leg.position.set(x, -2.725, z);
    group.add(leg);
  }
}

function buildHuman(body, head, skin, seed) {
  const shirt = mat(SHIRTS[seed % SHIRTS.length], { roughness: 0.75 });
  const skinM = mat(SKINS[(seed >> 3) % SKINS.length], { roughness: 0.55 });
  const hairM = mat(HAIRS[(seed >> 5) % HAIRS.length], { roughness: 0.8 });
  const pants = mat(0x23262e, { roughness: 0.8 });

  // Torso, collar, neck.
  const torso = mesh(new THREE.CapsuleGeometry(0.47, 0.72, 8, 20), shirt);
  torso.scale.set(1, 1, 0.72);
  torso.position.y = 0.3;
  const collar = mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 20), shirt);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.98;
  const neck = mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.25, 16), skinM);
  neck.position.y = 1.05;
  body.add(torso, collar, neck);

  // Legs (seated).
  for (const x of [-0.22, 0.22]) {
    body.add(limb(V(x, -0.72, 0), V(x, -0.72, 0.62), 0.17, pants));
    body.add(limb(V(x, -0.72, 0.62), V(x, -1.7, 0.7), 0.14, pants));
  }

  // Head with hair, eyes, smile.
  const skull = mesh(new THREE.SphereGeometry(0.37, 32, 24), skinM);
  skull.scale.set(0.95, 1.05, 0.95);
  const hair = mesh(new THREE.SphereGeometry(0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM);
  hair.position.set(0, 0.04, -0.03);
  hair.rotation.x = -0.25;
  const eyes = new THREE.Group();
  const white = mat(0xffffff, { roughness: 0.3 });
  const pupil = mat(0x161616, { roughness: 0.2 });
  for (const x of [-0.13, 0.13]) {
    const e = mesh(new THREE.SphereGeometry(0.065, 16, 12), white, { shadow: false });
    e.position.set(x, 0.06, 0.31);
    const p = mesh(new THREE.SphereGeometry(0.035, 12, 8), pupil, { shadow: false });
    p.position.set(x, 0.06, 0.37);
    const brow = mesh(new THREE.CapsuleGeometry(0.018, 0.09, 4, 8), hairM, { shadow: false });
    brow.rotation.z = Math.PI / 2;
    brow.position.set(x, 0.17, 0.33);
    eyes.add(e, p, brow);
  }
  const smile = mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 20, Math.PI), mat(0x7a2a2a), { shadow: false });
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.12, 0.33);
  const nose = mesh(new THREE.SphereGeometry(0.05, 12, 8), skinM, { shadow: false });
  nose.position.set(0, -0.02, 0.36);
  for (const x of [-0.37, 0.37]) {
    const ear = mesh(new THREE.SphereGeometry(0.07, 12, 8), skinM);
    ear.position.set(x, 0, 0);
    head.add(ear);
  }
  head.add(skull, hair, eyes, smile, nose);

  return { sleeve: shirt, hand: skinM, eyes, glow: null };
}

function buildBot(body, head, level) {
  const accentColor = BOT_ACCENT[level] || BOT_ACCENT.intermediate;
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xaab3bf, metalness: 0.9, roughness: 0.28, clearcoat: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2028, metalness: 0.7, roughness: 0.4 });
  const glow = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 2.2 });

  const torso = mesh(new RoundedBoxGeometry(0.98, 1.05, 0.66, 4, 0.2), metal);
  torso.position.y = 0.32;
  const panel = mesh(new RoundedBoxGeometry(0.42, 0.28, 0.05, 2, 0.03), dark);
  panel.position.set(0, 0.45, 0.33);
  const light = mesh(new THREE.CircleGeometry(0.07, 24), glow, { shadow: false });
  light.position.set(0, 0.45, 0.36);
  const neck = mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 16), dark);
  neck.position.y = 0.98;
  body.add(torso, panel, light, neck);

  for (const x of [-0.24, 0.24]) {
    body.add(limb(V(x, -0.72, 0), V(x, -0.72, 0.62), 0.15, dark));
    body.add(limb(V(x, -0.72, 0.62), V(x, -1.7, 0.7), 0.12, metal));
  }

  const skull = mesh(new RoundedBoxGeometry(0.8, 0.64, 0.66, 4, 0.16), metal);
  const visor = mesh(new RoundedBoxGeometry(0.66, 0.26, 0.06, 3, 0.05),
    new THREE.MeshPhysicalMaterial({ color: 0x05070a, metalness: 0.2, roughness: 0.05, clearcoat: 1 }));
  visor.position.set(0, 0.04, 0.32);
  const eyes = new THREE.Group();
  for (const x of [-0.15, 0.15]) {
    const e = mesh(new RoundedBoxGeometry(0.14, 0.07, 0.02, 2, 0.02), glow, { shadow: false });
    e.position.set(x, 0.04, 0.36);
    eyes.add(e);
  }
  for (const x of [-0.42, 0.42]) {
    const ear = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20), dark);
    ear.rotation.z = Math.PI / 2;
    ear.position.x = x;
    head.add(ear);
  }
  const antenna = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8), dark);
  antenna.position.y = 0.46;
  const tip = mesh(new THREE.SphereGeometry(0.055, 16, 12), glow, { shadow: false });
  tip.position.y = 0.64;
  head.add(skull, visor, eyes, antenna, tip);

  return { sleeve: metal, hand: dark, eyes, glow };
}

// Simple character built from shapes: shown while the real model loads, and kept if it can't load.
function createPrimitiveCharacter(info) {
  const seed = hash(info.name || 'x');
  const group = new THREE.Group();
  const chairG = new THREE.Group(); // the simple chair; swapped for the Blender model once it loads
  group.add(chairG);
  buildChair(chairG);

  const body = new THREE.Group();
  const head = new THREE.Group();
  head.position.y = 1.48;
  body.add(head);
  group.add(body);

  const parts = info.kind === 'bot' ? buildBot(body, head, info.level) : buildHuman(body, head, null, seed);

  // Arms reaching forward to hold the cards. Each arm pivots at the shoulder so it can animate.
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = V(0.52 * s, 0.82, 0), elbow = V(0.6 * s, 0.32, 0.38), hand = V(0.2 * s, 0.6, 0.8);
    const pivot = new THREE.Group();
    pivot.position.copy(shoulder);
    const e = elbow.clone().sub(shoulder), h = hand.clone().sub(shoulder);
    pivot.add(limb(V(0, 0, 0), e, 0.12, parts.sleeve));
    pivot.add(limb(e, h, 0.1, parts.sleeve));
    const handMesh = mesh(new THREE.SphereGeometry(0.11, 16, 12), parts.hand);
    handMesh.position.copy(h);
    pivot.add(handMesh);
    body.add(pivot);
    arms.push(pivot);
  }

  // Fan of cards between the hands, backs toward the table.
  const fan = new THREE.Group();
  fan.position.set(0, 0.62, 0.86);
  fan.rotation.x = -0.45;
  body.add(fan);

  const labelAnchor = new THREE.Object3D();
  labelAnchor.position.set(0, 2.2, 0);
  group.add(labelAnchor);

  let count = 0;
  let isTurn = false;
  let lean = 0;
  let headYaw = 0;
  let headTarget = 0;
  let nextBlink = 2 + Math.random() * 3;
  let reaction = null;
  const phase = Math.random() * 10;

  function layoutFan() {
    while (fan.children.length > count) fan.remove(fan.children[fan.children.length - 1]);
    while (fan.children.length < count) {
      const pivot = new THREE.Group();
      const card = makeCard(null);
      card.rotation.y = Math.PI;
      card.position.y = 0.3;
      card.scale.setScalar(0.78);
      pivot.add(card);
      fan.add(pivot);
    }
    const spread = Math.min(1.5, 0.12 * Math.max(0, count - 1));
    fan.children.forEach((pivot, i) => {
      const a = count > 1 ? spread / 2 - (i * spread) / (count - 1) : 0;
      pivot.rotation.z = a;
      pivot.position.z = -i * 0.006;
    });
  }

  return {
    group,
    chairG,
    labelAnchor,
    get count() { return count; },

    setCount(n) {
      if (n === count) return;
      count = Math.max(0, n);
      layoutFan();
    },

    // World position/rotation of where a card sits in this hand (the middle of the fan).
    handTransform() {
      group.updateMatrixWorld(true);
      const pos = new THREE.Vector3(0, 0.3, 0);
      fan.localToWorld(pos);
      const quat = new THREE.Quaternion();
      fan.getWorldQuaternion(quat);
      quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));
      return { pos, quat, scale: 0.78 };
    },

    setTurn(b) { isTurn = b; },

    // Turn the head toward a world point.
    lookAt(world) {
      const local = group.worldToLocal(world.clone());
      headTarget = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.0, 1.0);
    },

    // Quick forward lean when playing a card.
    gesture() { lean = 0.22; },

    /**
     * Exaggerated reactions:
     *  'slam'  – leans in and slaps a card down
     *  'cheer' – fist pump and bounce (won a trick / made their bid)
     *  'sulk'  – head drops, shoulders slump (missed their bid)
     */
    react(type) {
      reaction = { type, t: 0, dur: { slam: 0.55, cheer: 1.4, sulk: 2.6 }[type] || 1 };
    },

    update(t, dt) {
      // Reaction curves (0..1 envelope over the reaction's duration).
      let armX = 0, bounce = 0, extraLean = 0, headDown = 0, slump = 0;
      if (reaction) {
        reaction.t += dt;
        const k = Math.min(1, reaction.t / reaction.dur);
        const env = Math.sin(k * Math.PI);
        if (reaction.type === 'slam') { extraLean = 0.32 * env; armX = 0.7 * env; }
        if (reaction.type === 'cheer') { armX = -2.5 * Math.min(1, env * 1.6); bounce = Math.abs(Math.sin(k * Math.PI * 4)) * 0.09 * (1 - k); headDown = -0.25 * env; }
        if (reaction.type === 'sulk') { headDown = 0.5 * Math.min(1, env * 2); slump = 0.06 * Math.min(1, env * 2); extraLean = 0.12 * env; }
        if (k >= 1) reaction = null;
      }
      arms[1].rotation.x = armX;

      // Breathing and idle sway.
      body.scale.y = 1 + Math.sin(t * 1.6 + phase) * 0.012 - slump;
      body.position.y = bounce;
      const want = isTurn ? 0.1 : 0;
      lean += (want - lean) * Math.min(1, dt * 3);
      body.rotation.x = lean + extraLean + Math.sin(t * 0.7 + phase) * 0.012;
      headYaw += (headTarget - headYaw) * Math.min(1, dt * 3);
      head.rotation.y = headYaw;
      head.rotation.x = headDown;
      // Thinking: head tilts side to side on their turn.
      head.rotation.z = Math.sin(t * (isTurn ? 1.8 : 0.9) + phase) * (isTurn ? 0.12 : 0.03);
      head.position.y = 1.48 + Math.sin(t * 1.6 + phase) * 0.008;

      // Blink.
      nextBlink -= dt;
      if (parts.eyes) parts.eyes.scale.y = nextBlink < 0.12 ? 0.15 : 1;
      if (nextBlink < 0) nextBlink = 2 + Math.random() * 4;

      // Bot glow pulses faster while "thinking".
      if (parts.glow) parts.glow.emissiveIntensity = 1.8 + Math.sin(t * (isTurn ? 9 : 2) + phase) * (isTurn ? 1.1 : 0.4);
    },

    hideBody() { body.visible = false; },

    dispose() {
      group.traverse((o) => { if (o.geometry && !o.userData.sharedGeometry && !o.geometry.parameters?.width) o.geometry.dispose?.(); });
    },
  };
}

/**
 * A seated player at the table: a realistic rigged model (humans) or mannequin (bots),
 * falling back to the simple shape character if the model can't be loaded.
 * info = { name, kind: 'human' | 'bot', level }
 */
export function createCharacter(info) {
  const prim = createPrimitiveCharacter(info);
  let ctl = prim;
  let disposed = false;
  let turn = false;

  // The real chair (floor is 2.725 below the seat group's origin).
  makeRoyalChair()
    .then((chair) => {
      if (disposed) return;
      chair.position.set(0, -2.725, 0);
      prim.group.remove(prim.chairG);
      prim.group.add(chair);
    })
    .catch((e) => console.warn('Royal chair model unavailable, using the simple chair:', e));

  createModelBody(prim.group, info)
    .then((m) => {
      if (disposed) return;
      m.setCount(prim.count);
      m.setTurn(turn);
      prim.hideBody();
      prim.labelAnchor.position.y = m.labelY;
      ctl = m;
    })
    .catch((e) => console.warn('Character model unavailable, using simple character:', e));

  return {
    group: prim.group,
    labelAnchor: prim.labelAnchor,
    get count() { return ctl.count; },
    setCount(n) { prim.setCount(n); if (ctl !== prim) ctl.setCount(n); },
    handTransform: () => ctl.handTransform(),
    setTurn(b) { turn = b; prim.setTurn(b); if (ctl !== prim) ctl.setTurn(b); },
    lookAt: (w) => ctl.lookAt(w),
    gesture: () => ctl.react('slam'),
    react: (type) => ctl.react(type),
    // Only real models can sip (they have a hand bone to hold the glass).
    canSip: () => ctl !== prim && typeof ctl.sip === 'function' && !ctl.sipping,
    sip: (drink, home, homeQ) => (ctl !== prim ? ctl.sip(drink, home, homeQ) : false),
    update: (t, dt) => ctl.update(t, dt),
    dispose() { disposed = true; prim.dispose(); },
  };
}
