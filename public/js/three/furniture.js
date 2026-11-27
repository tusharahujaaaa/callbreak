// Room dressing: royal maroon-velvet sofa with a gilded coffee table, a second little card table, bar stools,
// a rug under the main table, wall lamps and a dartboard. Gives the bar some life.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeBottle, makeDrink, glassMaterial } from './props.js';
import { goldMat, velvetMat, turnedLeg, crest, finial } from './royal.js';
import { makeRoyalChair } from './chairModel.js';

const leather = () => new THREE.MeshPhysicalMaterial({ color: 0x4a1d10, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color(0x8a4a30) });
const darkWood = () => new THREE.MeshPhysicalMaterial({ color: 0x2a160b, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25 });
const brass = () => new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.28 });

function shadow(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

// Royal (maharaja palace) sofa: deep maroon velvet, gilded frame, gold buttons and a crowned back.
// Same footprint and seat height as before, so the people sitting on it still line up.
function couch() {
  const g = new THREE.Group();
  const V = velvetMat(0x6e0f1d), Vd = velvetMat(0x4e0a15), G = goldMat();
  const base = new THREE.Mesh(new RoundedBoxGeometry(5.2, 1.0, 2.1, 4, 0.18), Vd);
  base.position.y = 0.75;
  const back = new THREE.Mesh(new RoundedBoxGeometry(5.0, 2.2, 0.6, 4, 0.25), V);
  back.position.set(0, 2.0, -0.78);
  back.rotation.x = -0.08;
  g.add(base, back);
  // Gilded plinth and a gold rail along the front of the seat.
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(5.3, 0.16, 2.2, 3, 0.05), G);
  plinth.position.y = 0.3;
  const rail = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 4.6, 6, 12), G);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.2, 1.07);
  const sash = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 4.4, 6, 12), G);
  sash.rotation.z = Math.PI / 2;
  sash.position.set(0, 1.7, -0.45);
  g.add(plinth, rail, sash);
  // Rolled velvet arms with gold scroll ends.
  for (const x of [-2.55, 2.55]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.1, 24), V);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(x, 1.5, 0);
    const armBase = new THREE.Mesh(new RoundedBoxGeometry(0.75, 1.1, 2.1, 3, 0.15), Vd);
    armBase.position.set(x, 0.95, 0);
    g.add(arm, armBase);
    for (const z of [-1.07, 1.07]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 10, 32), G);
      ring.position.set(x, 1.5, z);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), G);
      boss.position.set(x, 1.5, z * 1.02);
      g.add(ring, boss);
    }
  }
  // Seat cushions.
  for (const x of [-1.6, 0, 1.6]) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.4, 1.6, 4, 0.16), V);
    c.position.set(x, 1.42, 0.15);
    g.add(c);
  }
  // Gold throw cushions, set like diamonds against the back.
  const fabric = new THREE.MeshPhysicalMaterial({ color: 0xc9a14a, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffe3a0) });
  for (const x of [-0.45, 0.45]) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 0.24, 4, 0.1), fabric);
    p.position.set(x, 2.1, -0.32);
    p.rotation.set(-0.3, 0, (x < 0 ? 1 : -1) * Math.PI / 4);
    g.add(p);
  }
  // Gold buttons, three rows.
  for (let j = 0; j < 3; j++) for (let i = 0; i < 9; i++) {
    const y = 2.05 + j * 0.45;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), G);
    b.position.set(-2.1 + i * 0.52 + (j % 2) * 0.26, y, -0.47 - 0.08 * (y - 2.0));
    if (b.position.x > 2.35) continue;
    g.add(b);
  }
  // Crown: gold top rail, posts, arched crest and finials.
  const topRail = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 4.9, 6, 14), G);
  topRail.rotation.z = Math.PI / 2;
  topRail.position.set(0, 3.1, -0.88);
  g.add(topRail);
  for (const x of [-2.5, 2.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 12), G);
    post.position.set(x, 2.5, -0.86);
    const f = finial(0.16, G);
    f.position.set(x, 3.2, -0.88);
    g.add(post, f);
  }
  const cr = crest(0.9, 0.07, G);
  cr.position.set(0, 3.1, -0.9);
  const top = finial(0.12, G);
  top.position.set(0, 4.0, -0.9);
  g.add(cr, top);
  // Turned gilded feet.
  for (const [x, z] of [[-2.4, 0.85], [2.4, 0.85], [-2.4, -0.85], [2.4, -0.85]]) {
    const f = turnedLeg(0.5, 0.13, G);
    f.position.set(x, 0, z);
    g.add(f);
  }
  return shadow(g);
}

function candle() {
  const g = new THREE.Group();
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.32, 20, 1, true),
    glassMaterial(0xffd9a0, 0.3));
  jar.position.y = 0.16;
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 20), new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: 0.8 }));
  wax.position.y = 0.08;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd48a, toneMapped: false }));
  flame.material.color.setScalar(6);
  flame.scale.y = 1.8;
  flame.position.y = 0.22;
  const light = new THREE.PointLight(0xff9a40, 3, 5, 1.8);
  light.position.y = 0.4;
  g.add(jar, wax, flame, light);
  g.userData.update = (t) => {
    const f = 0.85 + Math.sin(t * 17) * 0.06 + Math.sin(t * 7.3) * 0.08;
    light.intensity = 3 * f;
    flame.scale.set(1, 1.8 * f, 1);
  };
  return g;
}

function coffeeTable() {
  const g = new THREE.Group();
  const W = darkWood();
  const top = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.12, 1.3, 3, 0.04), W);
  top.position.y = 1.2;
  g.add(top);
  const edge = new THREE.Mesh(new RoundedBoxGeometry(2.68, 0.05, 1.38, 3, 0.02), goldMat());
  edge.position.y = 1.13;
  g.add(edge);
  for (const [x, z] of [[-1.15, 0.5], [1.15, 0.5], [-1.15, -0.5], [1.15, -0.5]]) {
    const leg = turnedLeg(1.17, 0.09, goldMat());
    leg.position.set(x, 0, z);
    g.add(leg);
  }
  const bottle = makeBottle('wine', 4);
  bottle.position.set(0.6, 1.26, 0.1);
  bottle.scale.setScalar(1.6);
  const c = candle();
  c.position.set(-0.5, 1.26, 0);
  const d1 = makeDrink('whiskey');
  d1.group.position.set(0.1, 1.26, 0.35);
  d1.setLevel(0.4);
  g.add(bottle, c, d1.group);
  g.userData.update = c.userData.update;
  return shadow(g);
}

// Royal side-table chair: maroon velvet seat and back panel in a gilded frame with a crowned top.
function chair(W, cushion) {
  const g = new THREE.Group();
  const G = goldMat(), V = velvetMat(0x6e0f1d);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.14, 1.0, 3, 0.04), W);
  seat.position.y = 1.55;
  const pad = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.16, 0.9, 4, 0.07), V);
  pad.position.y = 1.7;
  const piping = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.04, 1.02, 2, 0.02), G);
  piping.position.y = 1.62;
  const back = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.8, 0.12, 3, 0.05), W);
  back.position.set(0, 2.5, -0.45);
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.84, 1.4, 0.08, 4, 0.04), V);
  panel.position.set(0, 2.5, -0.39);
  const rail = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.1, 0.16, 2, 0.03), G);
  rail.position.set(0, 3.4, -0.45);
  const cr = crest(0.42, 0.035, G);
  cr.position.set(0, 3.42, -0.46);
  const top = finial(0.07, G);
  top.position.set(0, 3.86, -0.46);
  g.add(seat, pad, piping, back, panel, rail, cr, top);
  for (const x of [-0.55, 0.55]) {
    const f = finial(0.06, G);
    f.position.set(x, 3.42, -0.45);
    g.add(f);
  }
  for (const [x, z] of [[-0.45, 0.4], [0.45, 0.4], [-0.45, -0.4], [0.45, -0.4]]) {
    const leg = turnedLeg(1.5, 0.07, G);
    leg.position.set(x, 0, z);
    g.add(leg);
  }
  // Swap in the Blender-modelled chair once it has loaded.
  makeRoyalChair().then((c) => { g.clear(); c.position.z = 0.15; g.add(c); }).catch(() => {});
  return g;
}

// A second, smaller card table with an abandoned game on it.
function sideTable() {
  const g = new THREE.Group();
  const W = darkWood();
  const felt = new THREE.MeshStandardMaterial({ color: 0x1d5a35, roughness: 0.95 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 48), W);
  top.position.y = 2.7;
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.02, 48), felt);
  cloth.position.y = 2.77;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.6, 16), W);
  post.position.y = 1.35;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.12, 32), W);
  foot.position.y = 0.06;
  g.add(top, cloth, post, foot);
  const cushion = new THREE.MeshStandardMaterial({ color: 0x5a1420, roughness: 0.85 });
  for (const a of [0.4, Math.PI + 0.2]) {
    const c = chair(W, cushion);
    c.position.set(Math.sin(a) * 2.3, 0, Math.cos(a) * 2.3);
    c.rotation.y = a + Math.PI;
    g.add(c);
  }
  // Scattered cards, chips, a bottle, two glasses and a candle.
  const cardMat = new THREE.MeshStandardMaterial({ color: 0xf1ebdc, roughness: 0.7 });
  for (let i = 0; i < 7; i++) {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 0.42), cardMat);
    card.position.set((Math.random() - 0.5) * 1.4, 2.79 + i * 0.004, (Math.random() - 0.5) * 1.2);
    card.rotation.y = Math.random() * Math.PI;
    g.add(card);
  }
  const chipColors = [0xb3262f, 0x1f5fae, 0x1f8a4c, 0x111111];
  for (let s = 0; s < 4; s++) for (let i = 0; i < 4 + s; i++) {
    const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), new THREE.MeshStandardMaterial({ color: chipColors[s], roughness: 0.5 }));
    chip.position.set(-0.6 + s * 0.22, 2.8 + i * 0.032, 0.55);
    g.add(chip);
  }
  const b = makeBottle('whiskey', 2);
  b.position.set(0.5, 2.78, -0.4);
  b.scale.setScalar(1.5);
  const d1 = makeDrink('whiskey'); d1.group.position.set(0.1, 2.78, -0.65); d1.setLevel(0.2);
  const d2 = makeDrink('beer'); d2.group.position.set(-0.7, 2.78, -0.3); d2.setLevel(0.55);
  const c = candle();
  c.position.set(0, 2.78, 0);
  g.add(b, d1.group, d2.group, c);
  g.userData.update = (t) => { c.userData.update(t); d2.update(t); };
  return shadow(g);
}

function barStool() {
  const g = new THREE.Group();
  const B = brass();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.25, 28), velvetMat(0x6e0f1d));
  seat.position.y = 3.4;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 12), B);
  post.position.y = 1.65;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 28), B);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.2;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.08, 28), B);
  foot.position.y = 0.04;
  g.add(seat, post, ring, foot);
  return shadow(g);
}

function rug() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#5a1a16'; x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = '#c9a25e'; x.lineWidth = 18; x.strokeRect(40, 40, 944, 944);
  x.strokeStyle = '#1f2a44'; x.lineWidth = 46; x.strokeRect(90, 90, 844, 844);
  x.strokeStyle = '#c9a25e'; x.lineWidth = 6; x.strokeRect(130, 130, 764, 764);
  for (let i = 0; i < 8; i++) {
    x.save(); x.translate(512, 512); x.rotate((i * Math.PI) / 4);
    x.fillStyle = 'rgba(201,162,94,0.55)';
    x.beginPath(); x.moveTo(0, -320); x.quadraticCurveTo(70, -200, 0, -90); x.quadraticCurveTo(-70, -200, 0, -320); x.fill();
    x.restore();
  }
  x.fillStyle = '#1f2a44'; x.beginPath(); x.arc(512, 512, 90, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 90000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; x.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

function sconce() {
  const g = new THREE.Group();
  const B = brass();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20), B);
  plate.rotation.x = Math.PI / 2;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), B);
  arm.rotation.x = Math.PI / 2;
  arm.position.z = 0.25;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.42, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf0d8a8, emissive: 0xffb860, emissiveIntensity: 1.6, side: THREE.DoubleSide, roughness: 0.9 }));
  shade.position.set(0, 0.2, 0.5);
  const light = new THREE.PointLight(0xffb060, 6, 7, 1.8);
  light.position.set(0, 0.1, 0.6);
  g.add(plate, arm, shade, light);
  return g;
}

function dartboard() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  const R = [250, 230, 150, 135, 40, 20];
  x.fillStyle = '#111'; x.beginPath(); x.arc(256, 256, R[0], 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 20; i++) {
    const a0 = (i / 20) * Math.PI * 2 - Math.PI / 20, a1 = a0 + Math.PI / 10;
    for (const [r0, r1, ca, cb] of [[135, 230, '#e8dcc0', '#141414'], [130, 150, '#1f7a3a', '#b3262f'], [220, 230, '#1f7a3a', '#b3262f']]) {
      x.fillStyle = i % 2 ? ca : cb;
      x.beginPath(); x.arc(256, 256, r1, a0, a1); x.arc(256, 256, r0, a1, a0, true); x.fill();
    }
  }
  x.fillStyle = '#1f7a3a'; x.beginPath(); x.arc(256, 256, 40, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#b3262f'; x.beginPath(); x.arc(256, 256, 18, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.15, 48), [
    new THREE.MeshStandardMaterial({ color: 0x111111 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x111111 })]);
  board.rotation.x = Math.PI / 2;
  const g = new THREE.Group();
  g.add(board);
  // Two darts stuck in.
  for (const [dx, dy] of [[0.25, 0.1], [-0.15, -0.3]]) {
    const dart = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.5, 8), brass());
    dart.rotation.x = Math.PI / 2 - 0.2;
    dart.position.set(dx, dy, 0.3);
    g.add(dart);
  }
  return g;
}

export function buildFurniture(scene, FLOOR_Y, ROOM) {
  const updaters = [];

  const r = rug();
  r.position.y = FLOOR_Y + 0.01;
  scene.add(r);

  // A leather sofa + coffee table against each side wall (in view beside the table).
  // Returns the sofa seats so patrons can sit on them.
  const sofaSeats = [];
  for (const side of [-1, 1]) {
    const x = side * (ROOM.w / 2 - 1.6), z = -3.0;
    const yaw = side < 0 ? Math.PI / 2 : -Math.PI / 2; // front of the sofa faces the room
    const c = couch();
    c.position.set(x, FLOOR_Y, z);
    c.rotation.y = yaw;
    scene.add(c);
    const ct = coffeeTable();
    ct.position.set(side * (ROOM.w / 2 - 4.4), FLOOR_Y, z);
    ct.rotation.y = yaw;
    scene.add(ct);
    updaters.push(ct.userData.update);
    // Outer cushions (sofa-local x = ±1.6), on top of the cushion, slightly forward.
    for (const lx of [-1.6, 1.6]) {
      const local = new THREE.Vector3(lx, 1.62, 0.25);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      sofaSeats.push({ position: new THREE.Vector3(x + local.x, FLOOR_Y + local.y, z + local.z), yaw, tableSide: side });
    }
  }

  // Second card table, back-left corner.
  const st = sideTable();
  st.position.set(-9.8, FLOOR_Y, -8.4);
  scene.add(st);
  updaters.push(st.userData.update);

  // Stools at the bar.
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    const s = barStool();
    s.position.set(x, FLOOR_Y, -ROOM.d / 2 + 4.2);
    s.rotation.y = Math.random();
    scene.add(s);
  }

  // Wall lamps.
  for (const [x, z, ry] of [[-ROOM.w / 2 + 0.1, -6, Math.PI / 2], [-ROOM.w / 2 + 0.1, 9, Math.PI / 2], [ROOM.w / 2 - 0.1, 0, -Math.PI / 2], [ROOM.w / 2 - 0.1, 9, -Math.PI / 2]]) {
    const s = sconce();
    s.position.set(x, FLOOR_Y + 6.6, z);
    s.rotation.y = ry;
    scene.add(s);
  }

  const d = dartboard();
  d.position.set(ROOM.w / 2 - 0.12, FLOOR_Y + 6.2, -8.5);
  d.rotation.y = -Math.PI / 2;
  scene.add(d);

  return { sofaSeats, update(t) { for (const u of updaters) u && u(t); } };
}
