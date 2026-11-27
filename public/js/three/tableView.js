// Keeps the 3D table in step with the game state: who sits where, cards in hands,
// the dealing animation, cards played to the trick, the turn ring and the dealer chip.
import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { makeCard, FACE_UP, FACE_DOWN, CARD_W, CARD_H } from './cards3d.js';
import { tween, ease, cancel } from './tween.js';
import { SEAT_DIST, TABLE_R, tablePoint, trickSlot, TRICK_SCALE, MY_HAND_POINT, facingYaw, dir } from './layout.js';
import { EYE } from './cameraRig.js';
import { arrivedCount } from '../game/dealTimeline.js';
import { dealTimeline } from '../game/dealTimeline.js';
import { serverNow } from '../core/clock.js';
import { sfx } from '../ui/sfx.js';

const qFrom = (euler) => new THREE.Quaternion().setFromEuler(euler);

// Gold frame behind a trump card.
function trumpFrame() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W + 0.03, CARD_H + 0.03),
    new THREE.MeshBasicMaterial({ color: 0xc9962e, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
  m.position.z = -0.006;
  return m;
}
const Q_FACE_UP = qFrom(FACE_UP);
const _UP = new THREE.Vector3(0, 1, 0), _spinQ = new THREE.Quaternion();
const Q_FACE_DOWN = qFrom(FACE_DOWN);

// fx = { myHand, rig, post } are optional first-person extras.
export function createTableView(scene, table, fx = {}) {
  const { myHand, rig, post } = fx;
  const chars = [null, null, null, null]; // by relative position (0 = you: no avatar)
  let charSig = '';
  let mySeat = 0;
  let trump = 'S';
  const rel = (seat) => (seat - mySeat + 4) % 4;

  // ---------- Characters ----------
  function syncCharacters(st) {
    const sig = st.seats.map((s) => `${s.kind}:${s.name}:${s.level}`).join('|') + '#' + st.mySeat;
    if (sig === charSig) return;
    charSig = sig;
    for (let r = 1; r < 4; r++) {
      if (chars[r]) { scene.remove(chars[r].group); chars[r].dispose(); }
      const seat = (st.mySeat + r) % 4;
      const c = createCharacter({ ...st.seats[seat], seat });
      c.group.position.copy(dir(r).multiplyScalar(SEAT_DIST)).setY(0);
      c.group.rotation.y = facingYaw(r);
      scene.add(c.group);
      chars[r] = c;
    }
  }

  // ---------- Dealing ----------
  let dealId = null;
  let dealing = false;
  let dealState = null; // for revealing your 3D hand as cards arrive
  let deck = null;
  const flying = new Set();
  const dealTweens = new Set();

  function clearFlying() {
    for (const tw of dealTweens) cancel(tw);
    dealTweens.clear();
    for (const m of flying) scene.remove(m);
    flying.clear();
  }

  function makeDeck(r) {
    const g = new THREE.Group();
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(CARD_W * 0.98, 1, CARD_H * 0.98),
      new THREE.MeshStandardMaterial({ color: 0xf1ebdc, roughness: 0.7 }));
    block.castShadow = block.receiveShadow = true;
    const top = makeCard(null);
    top.quaternion.copy(Q_FACE_DOWN);
    g.add(block, top);
    const p = tablePoint(r, TABLE_R - 1.25, 0);
    g.position.copy(p);
    g.rotation.y = facingYaw(r);
    g.userData.setCount = (n) => {
      const h = Math.max(0.002, n * 0.008);
      block.scale.y = h;
      block.position.y = h / 2;
      top.position.y = h + 0.003;
      g.visible = n > 0;
    };
    g.userData.setCount(52);
    scene.add(g);
    return g;
  }

  function startDeal(g) {
    const deal = g.deal;
    dealId = deal.id;
    dealing = true;
    clearFlying();
    clearTrick(true);
    if (deck) scene.remove(deck);
    deck = makeDeck(rel(deal.dealer));

    const timeline = dealTimeline(deal);
    dealState = { timeline, deal };
    const elapsed = serverNow() - deal.startedAt;
    const counts = [0, 0, 0, 0];
    let left = 52;

    // Cards already delivered (e.g. after a refresh) appear instantly.
    for (const it of timeline) if (it.arrive <= elapsed) { counts[rel(it.seat)]++; left--; }
    for (let r = 1; r < 4; r++) chars[r] && chars[r].setCount(counts[r]);
    deck.userData.setCount(left);
    if (elapsed < 200) sfx.shuffle();

    const deckTop = () => deck.position.clone().setY(left * 0.008 + 0.01);

    let lastFinish = 0;
    for (const it of timeline) {
      if (it.arrive <= elapsed) continue;
      const r = rel(it.seat);
      const delay = it.start - elapsed;
      lastFinish = Math.max(lastFinish, it.arrive - elapsed);
      const card = makeCard(null);
      card.visible = false;
      scene.add(card);
      flying.add(card);
      const from = new THREE.Vector3(), fromQ = Q_FACE_DOWN.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), facingYaw(rel(deal.dealer))));
      let to, toQ, toScale;
      const spin = (Math.random() - 0.5) * 1.2;
      const tw = tween({
        duration: deal.flight,
        delay,
        ease: ease.linear,
        update(k) {
          if (!deck) return;
          if (!card.visible) {
            card.visible = true;
            from.copy(deckTop());
            left--;
            deck.userData.setCount(left);
            if (r !== 0 && chars[r]) {
              const t = chars[r].handTransform();
              to = t.pos; toQ = t.quat; toScale = t.scale;
            } else {
              if (myHand) { const t = myHand.nextSlotWorld(it.index); to = t.pos; toQ = t.quat; toScale = t.scale; }
              else { to = MY_HAND_POINT.clone(); toQ = Q_FACE_DOWN.clone(); toScale = 1; }
            }
            sfx.deal();
          }
          if (r === 0 && myHand) { const t = myHand.nextSlotWorld(it.index); to = t.pos; toQ = t.quat; toScale = t.scale; }
          // Slides out fast and low, slows as it arrives; turns over late; a little spin in flight.
          const kp = ease.outQuart(k), kr = ease.inOutCubic(Math.min(1, k * 1.15));
          card.position.lerpVectors(from, to, kp);
          card.position.y += Math.sin(kp * Math.PI) * 0.3;
          card.quaternion.slerpQuaternions(fromQ, toQ, kr);
          card.quaternion.premultiply(_spinQ.setFromAxisAngle(_UP, spin * Math.sin(kp * Math.PI)));
          card.scale.setScalar(1 + (toScale - 1) * kp);
        },
        done() {
          dealTweens.delete(tw);
          scene.remove(card);
          flying.delete(card);
          if (r !== 0 && chars[r]) chars[r].setCount(chars[r].count + 1);
        },
      });
      dealTweens.add(tw);
    }
    tween({ duration: 1, delay: lastFinish + 50, update() {}, done() { if (deck) deck.userData.setCount(0); } });
  }

  // ---------- Trick ----------
  let shown = []; // [{ seat, card, mesh }]
  let glow = null;

  function clearTrick(instant) {
    for (const s of shown) scene.remove(s.mesh);
    shown = [];
    if (glow) { scene.remove(glow); glow = null; }
  }

  function addPlayed(seat, card, animate) {
    const r = rel(seat);
    const mesh = makeCard(card);
    if (trump && card[0] === trump) mesh.add(trumpFrame());
    const slot = trickSlot(r);
    const twist = (((card.charCodeAt(0) * 7 + +card.slice(1) * 13) % 21) - 10) * 0.02;
    const endQ = Q_FACE_UP.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), twist));
    scene.add(mesh);
    shown.push({ seat, card, mesh });

    if (!animate) {
      mesh.position.copy(slot);
      mesh.quaternion.copy(endQ);
      mesh.scale.setScalar(TRICK_SCALE);
      return;
    }
    let from, fromQ, fromScale = 1;
    if (r !== 0 && chars[r]) {
      const t = chars[r].handTransform();
      from = t.pos; fromQ = t.quat; fromScale = t.scale;
      chars[r].react('slam');
      tween({ duration: 1, delay: 380, update() {}, done: () => sfx.thud() });
    } else {
      if (myHand) { const t = myHand.worldTransform(card); from = t.pos; fromQ = t.quat; fromScale = t.scale; }
      else { from = MY_HAND_POINT.clone(); fromQ = Q_FACE_UP.clone(); }
      tween({ duration: 1, delay: 420, update() {}, done: () => { sfx.thud(); rig && rig.shake(0.18); } });
    }
    mesh.position.copy(from);
    mesh.quaternion.copy(fromQ);
    sfx.play();
    // Glides out, lays flat a little before it lands, and settles with a tiny slide.
    tween({
      duration: 620,
      ease: ease.linear,
      update(k) {
        const kp = ease.outQuart(k), kr = ease.inOutCubic(Math.min(1, k * 1.25));
        mesh.position.lerpVectors(from, slot, kp);
        mesh.position.y += Math.sin(Math.min(1, k * 1.1) * Math.PI) * 0.32;
        mesh.quaternion.slerpQuaternions(fromQ, endQ, kr);
        mesh.scale.setScalar(fromScale + (TRICK_SCALE - fromScale) * ease.outCubic(k));
      },
    });
  }

  function highlightWinner(seat) {
    const s = shown.find((x) => x.seat === seat);
    if (!s || glow) return;
    glow = new THREE.Mesh(new THREE.PlaneGeometry((CARD_W + 0.12) * TRICK_SCALE, (CARD_H + 0.12) * TRICK_SCALE),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.quaternion.copy(s.mesh.quaternion);
    glow.position.copy(trickSlot(rel(seat))).setY(0.055);
    scene.add(glow);
    tween({ duration: 300, delay: 450, update(k) { glow && (glow.material.opacity = 0.75 * k); } });
    tween({ duration: 1, delay: 450, update() {}, done: () => {
      sfx.win();
      const r = rel(seat);
      if (r !== 0 && chars[r]) chars[r].react('cheer');
      if (r === 0) { post && post.flash(0xffc94a, 1); rig && (rig.shake(0.35), rig.zoom(3)); }
    } });
  }

  // ---------- Won tricks: face-down stacks in front of each winner ----------
  const PILE_SCALE = 0.72;
  const piles = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); scene.add(g); return { group: g, count: 0 }; });
  const pending = [false, false, false, false]; // a trick is still flying to this pile
  let latestWon = [0, 0, 0, 0];                 // by relative seat

  // Where trick #i sits for relative seat r: a row along the table edge, from their left to right.
  function pileSlot(r, i) {
    const d = dir(r);
    const along = new THREE.Vector3(d.z, 0, -d.x); // the seat's left → right
    return tablePoint(r, TABLE_R - 1.12, 0).add(along.multiplyScalar(-1.3 + i * 0.22)).setY(0.012 + (i % 2) * 0.002);
  }
  function pileQuat(r, i) {
    const yaw = facingYaw(r) + (i % 2 ? 0.09 : -0.07); // slightly crosswise, like real tricks
    return Q_FACE_DOWN.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  }
  function setPile(r, n) {
    const p = piles[r];
    n = Math.min(13, Math.max(0, n));
    if (p.count === n) return;
    while (p.group.children.length > n) p.group.remove(p.group.children[p.group.children.length - 1]);
    for (let i = p.group.children.length; i < n; i++) {
      const trick = new THREE.Group();
      for (let k = 0; k < 4; k++) {              // four cards, a little untidy
        const c = makeCard(null);
        c.position.set((Math.random() - 0.5) * 0.04, k * 0.006, (Math.random() - 0.5) * 0.04);
        c.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * 0.12);
        trick.add(c);
      }
      trick.position.copy(pileSlot(r, i));
      trick.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), facingYaw(r) + (i % 2 ? 0.09 : -0.07)));
      trick.scale.setScalar(PILE_SCALE);
      p.group.add(trick);
    }
    p.count = n;
  }
  function clearPiles() { for (let r = 0; r < 4; r++) { setPile(r, 0); pending[r] = false; } }

  // Sweep the finished trick onto the winner's pile.
  function collect(winnerSeat) {
    const cards = shown;
    shown = [];
    if (glow) { scene.remove(glow); glow = null; }
    const r = rel(winnerSeat);
    const index = Math.max(0, latestWon[r] - 1); // this trick's place in the row
    const target = pileSlot(r, index);
    const targetQ = pileQuat(r, index);
    pending[r] = true;
    setPile(r, index);
    let landed = 0;
    cards.forEach((s, i) => {
      const from = s.mesh.position.clone();
      const fromQ = s.mesh.quaternion.clone();
      tween({
        duration: 640,
        delay: i * 60,
        ease: ease.inOutCubic,
        update(k) {
          s.mesh.position.lerpVectors(from, target, k);
          s.mesh.position.y += Math.sin(k * Math.PI) * 0.12 + i * 0.006;
          s.mesh.quaternion.slerpQuaternions(fromQ, targetQ, k);
          s.mesh.scale.setScalar(TRICK_SCALE + (PILE_SCALE - TRICK_SCALE) * k);
        },
        done() {
          scene.remove(s.mesh);
          if (++landed === cards.length) { pending[r] = false; setPile(r, latestWon[r]); }
        },
      });
    });
  }

  function syncTrick(g, firstSync) {
    const want = g.trick;
    const sameStart = shown.length && want.length && shown[0].card === want[0].card;
    if (shown.length && (!want.length || !sameStart)) {
      const winner = g.lastTrick && g.lastTrick.cards[0] && g.lastTrick.cards[0].card === shown[0].card
        ? g.lastTrick.winner : null;
      if (winner !== null && !firstSync) collect(winner);
      else clearTrick(true);
    }
    for (let i = shown.length; i < want.length; i++) addPlayed(want[i].seat, want[i].card, !firstSync);
    if (g.phase === 'trickEnd' && g.trickWinner !== null) highlightWinner(g.trickWinner);
  }

  // ---------- Your hand (first person) ----------
  let lastState = null;
  function syncMyHand(st) {
    lastState = st;
    if (!myHand) return;
    const g = st.game;
    if (g.phase === 'dealing' && g.dealt && dealState) return; // revealed frame by frame in update()
    const turn = g.phase === 'playing' && g.turn === st.mySeat;
    myHand.set(myHand.sorted(g.hand), g.legal, turn, g.trump);
  }

  function revealDealt() {
    const st = lastState;
    if (!myHand || !st || !st.game || st.game.phase !== 'dealing' || !st.game.dealt || !dealState) return;
    const n = arrivedCount(dealState.timeline, st.mySeat, serverNow() - dealState.deal.startedAt);
    myHand.set(st.game.dealt.slice(0, n), [], false);
  }

  // ---------- Main sync ----------
  let lastGame = null;
  let lookTarget = new THREE.Vector3();

  function sync(st) {
    const g = st.game;
    if (!g) return;
    mySeat = st.mySeat;
    syncCharacters(st);
    const firstSync = lastGame === null;
    const trumpChanged = !firstSync && lastGame.trump !== g.trump;
    trump = g.trump;
    table.setTrump(g.trump, trumpChanged && !!g.trump);
    if (trumpChanged && g.trump && post) post.flash(g.trump === 'H' || g.trump === 'D' ? 0xff3a5a : 0xffd27a, 0.8);

    if (g.phase === 'dealing' && g.deal && g.deal.id !== dealId) startDeal(g);
    if (g.phase !== 'dealing') {
      if (dealing) { dealing = false; clearFlying(); if (deck) { scene.remove(deck); deck = null; } }
      for (let r = 1; r < 4; r++) chars[r] && chars[r].setCount(g.handCounts[(mySeat + r) % 4]);
    }

    latestWon = [0, 1, 2, 3].map((r) => g.won[(mySeat + r) % 4]);
    syncTrick(g, firstSync);
    for (let r = 0; r < 4; r++) if (!pending[r]) setPile(r, latestWon[r]);
    syncMyHand(st);

    // Round over: winners celebrate, losers slump.
    if ((g.phase === 'roundEnd' || g.phase === 'gameOver') && lastGame && lastGame.phase !== g.phase && g.history.length) {
      const h = g.history[g.history.length - 1];
      h.deltas.forEach((d, seat) => {
        const r = rel(seat);
        if (r !== 0 && chars[r]) chars[r].react(d >= 0 ? 'cheer' : 'sulk');
        if (r === 0 && post) post.flash(d >= 0 ? 0xffc94a : 0xff2a2a, 1);
      });
    }

    const turnR = g.turn >= 0 ? rel(g.turn) : null;
    table.setTurn(turnR);
    table.setDealer(rel(g.dealer));
    for (let r = 1; r < 4; r++) chars[r] && chars[r].setTurn(turnR === r);

    // Everyone looks at whoever is acting (or the middle of the table).
    lookTarget = turnR !== null ? dir(turnR).multiplyScalar(SEAT_DIST).setY(1.4) : new THREE.Vector3(0, 0, 0);
    // On your turn everyone stares at you.
    if (turnR === 0) lookTarget = EYE.clone();
    if (rig) rig.glanceAt(turnR && turnR !== 0 ? dir(turnR).multiplyScalar(SEAT_DIST) : null);
    if (rig && turnR === 0 && lastGame && lastGame.turn !== g.turn) rig.zoom(2.5);
    if (g.phase === 'trickEnd' && g.trickWinner !== null) lookTarget = dir(rel(g.trickWinner)).multiplyScalar(SEAT_DIST).setY(1.4);

    if (g.turn === st.mySeat && lastGame && lastGame.turn !== g.turn && (g.phase === 'playing' || g.phase === 'bidding')) sfx.turn();
    lastGame = g;
  }

  function reset() {
    clearFlying();
    clearTrick(true);
    clearPiles();
    if (deck) { scene.remove(deck); deck = null; }
    dealId = null;
    dealing = false;
    lastGame = null;
  }

  function update(t, dt) {
    revealDealt();
    if (myHand) myHand.update(dt);
    for (let r = 1; r < 4; r++) {
      const c = chars[r];
      if (!c) continue;
      // Don't look at yourself: look at the middle instead.
      const self = c.group.position;
      c.lookAt(lookTarget.distanceToSquared(new THREE.Vector3(self.x, 1.4, self.z)) < 0.5 ? new THREE.Vector3(0, 0, 0) : lookTarget);
      c.update(t, dt);
    }
  }

  return { sync, reset, update, chars };
}
