// Your own cards, held in 3D in front of the camera (first person).
// Hover lifts a card, unplayable cards go dark on your turn, click plays.
import * as THREE from 'three';
import { makeCard, CARD_TINT, CARD_W, CARD_H } from './cards3d.js';
import { tween, ease } from './tween.js';
import { sfx } from '../ui/sfx.js';

const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3 };
const DIST = 1.15;   // distance in front of the camera
const SCALE = 0.27;

export function createMyHand(camera) {
  const root = new THREE.Group();
  root.position.set(0, -0.36, -DIST);
  root.rotation.x = -0.12;
  camera.add(root);
  // Soft light so your cards are readable even outside the lamp's cone.
  const handLight = new THREE.PointLight(0xffd9a8, 2.2, 2.5, 1.5);
  handLight.position.set(0, 0.4, -0.3);
  camera.add(handLight);

  const cards = new Map(); // card -> { mesh, target: {pos, rot, scale}, legal }
  let order = [];
  let hovered = null;
  let myTurn = false;
  let trump = null;
  let enabled = true;
  let spreadW = 1.0;
  const raycaster = new THREE.Raycaster();

  // Fan position of card i of n. Suits are separated by a small gap so they're easy to scan.
  function slot(i, n, list = null) {
    const width = Math.min(spreadW, 0.095 * n);
    let u = n > 1 ? i / (n - 1) : 0.5;
    if (list && n > 1) {
      const GAP = 0.45; // in card steps
      let gaps = 0, before = 0;
      for (let j = 1; j < n; j++) if (list[j][0] !== list[j - 1][0]) { gaps++; if (j <= i) before++; }
      u = (i + before * GAP) / (n - 1 + gaps * GAP);
    }
    const t = u - 0.5; // -0.5 .. 0.5
    return {
      pos: new THREE.Vector3(t * width * (list ? 1.06 : 1), -t * t * 0.16, i * 0.004), // gentle arc
      rotZ: -t * 0.3,
    };
  }

  function layout() {
    const n = order.length;
    order.forEach((c, i) => {
      const e = cards.get(c);
      const s = slot(i, n, order);
      const lift = c === hovered && (!myTurn || e.legal) ? 1 : 0;
      const sink = myTurn && !e.legal ? 1 : 0;
      const ready = myTurn && e.legal && !lift ? 1 : 0; // playable cards stand up a little on your turn
      e.target.pos.copy(s.pos).add(new THREE.Vector3(0, lift * 0.1 + ready * 0.025 - sink * 0.04, lift * 0.06));
      e.target.rotZ = s.rotZ * (lift ? 0.5 : 1);
      e.target.scale = SCALE * (lift ? 1.12 : 1);
      // Trump cards wear a gold frame.
      e.frame.visible = !!trump && c[0] === trump;
      e.frame.material.opacity = myTurn && !e.legal ? 0.25 : 0.75;
      const dim = myTurn && !e.legal ? 0.35 : 1;
      e.mesh.userData.front.material.color.set(CARD_TINT).multiplyScalar(dim);
    });
  }

  function add(card, from) {
    const mesh = makeCard(card, { ownMaterial: true });
    mesh.scale.setScalar(SCALE);
    mesh.traverse((o) => { o.castShadow = false; o.renderOrder = 10; });
    mesh.userData.card = card;
    // Trump cards get a thin gold edge.
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W + 0.03, CARD_H + 0.03),
      new THREE.MeshBasicMaterial({ color: 0xd4a640, transparent: true, opacity: 0.75, depthWrite: false }));
    frame.position.z = -0.006;
    frame.visible = false;
    mesh.add(frame);
    root.add(mesh);
    const e = { mesh, frame, legal: true, target: { pos: new THREE.Vector3(), rotZ: 0, scale: SCALE } };
    if (from) mesh.position.copy(from); else mesh.position.set(0, -0.5, 0);
    cards.set(card, e);
  }

  function remove(card) {
    const e = cards.get(card);
    if (!e) return;
    root.remove(e.mesh);
    cards.delete(card);
  }

  return {
    // list = the cards to show (in display order); legal = playable cards; turn = is it your turn to play
    set(list, legal, turn, trumpSuit = null) {
      myTurn = turn;
      trump = trumpSuit;
      const want = new Set(list);
      for (const c of [...cards.keys()]) if (!want.has(c)) remove(c);
      for (const c of list) if (!cards.has(c)) add(c);
      order = list.slice();
      const legalSet = new Set(legal);
      for (const [c, e] of cards) e.legal = legalSet.has(c);
      if (hovered && !cards.has(hovered)) hovered = null;
      layout();
    },

    sorted(list) {
      return list.slice().sort((a, b) => SUIT_ORDER[a[0]] - SUIT_ORDER[b[0]] || +b.slice(1) - +a.slice(1));
    },

    // World transform of one of your cards (for animating it onto the table).
    worldTransform(card) {
      const e = cards.get(card);
      const obj = e ? e.mesh : root;
      obj.updateWorldMatrix(true, false);
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
      obj.matrixWorld.decompose(pos, quat, scl);
      return { pos, quat, scale: e ? scl.x : SCALE };
    },

    // Where the next dealt card lands.
    nextSlotWorld(index, total = 13) {
      const s = slot(index, total);
      const p = s.pos.clone();
      root.localToWorld(p);
      const quat = new THREE.Quaternion();
      root.getWorldQuaternion(quat);
      return { pos: p, quat, scale: SCALE };
    },

    setEnabled(b) { enabled = b; root.visible = b; },

    hover(ndc, cam) {
      if (!enabled) return;
      raycaster.setFromCamera(ndc, cam);
      const hits = raycaster.intersectObjects([...cards.values()].map((e) => e.mesh), true);
      let card = null;
      if (hits.length) {
        let o = hits[0].object;
        while (o && !o.userData.card) o = o.parent;
        card = o ? o.userData.card : null;
      }
      if (card !== hovered) {
        hovered = card;
        if (card && (!myTurn || cards.get(card).legal)) sfx.tick();
        layout();
      }
      return hovered;
    },

    // Returns the card under the cursor if it can be played.
    pick() {
      if (!enabled || !hovered || !myTurn) return null;
      const e = cards.get(hovered);
      return e && e.legal ? hovered : null;
    },

    resize(aspect) {
      // Visible width at the hand's distance, so the fan fits the screen.
      const h = 2 * DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      spreadW = Math.min(1.2, h * aspect * 0.6);
      root.position.y = -h * 0.295;
      layout();
    },

    update(dt) {
      const k = 1 - Math.exp(-dt * 12); // frame-rate independent easing
      for (const e of cards.values()) {
        e.mesh.position.lerp(e.target.pos, k);
        e.mesh.rotation.z += (e.target.rotZ - e.mesh.rotation.z) * k;
        const s = e.mesh.scale.x + (e.target.scale - e.mesh.scale.x) * k;
        e.mesh.scale.setScalar(s);
      }
    },
  };
}
