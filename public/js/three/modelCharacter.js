// A real rigged character (glTF) seated at the table, holding a fan of cards.
// The models only come standing, so the pose is built in code each frame: the torso and legs
// are aimed (works whatever way each model's bones are oriented), and the arms use two-bone IK
// so the hands land exactly where they should — the left hand grips the cards, the right hand
// rests on the table, plays cards, and picks up the drink (fingers curled round the glass or handle).
import * as THREE from 'three';
import { instantiate, findBones, applyLook, LOOKS as LOOKS_BY_NAME, MODEL_SCALE } from './models.js';
import { makeCard } from './cards3d.js';
import { createPoser } from './poser.js';

// Who sits in each seat (absolute seat, so every player sees the same people).
// Seat 1 is the woman; the others are different-looking men.
const SEAT_PEOPLE = [
  { kind: 'man', look: 'gambler' },
  { kind: 'woman' },
  { kind: 'man', look: 'maroon' },
  { kind: 'man', look: 'green' },
];

export const SIP_S = 3.6; // one sip, seconds
// Held cards at real size (1 unit ≈ 28 cm, so a card is ~9.5 cm tall), gripped near the bottom.
const FAN_SCALE = 0.39, FAN_Y = 0.12;

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = THREE.MathUtils.smootherstep;
const X = V(1, 0, 0);

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Bots look human too — their level is shown on their name tag.
export function personFor(info) {
  return SEAT_PEOPLE[(info.seat ?? hash(info.name || 'x')) % 4];
}

export async function createModelBody(group, info) {
  const person = personFor(info);
  const { root } = await instantiate(person.kind);
  root.scale.setScalar(MODEL_SCALE);
  applyLook(root, LOOKS_BY_NAME[person.look]);

  const bones = findBones(root);
  if (!bones.Hips || !bones.LeftArm || !bones.RightUpLeg) throw new Error('model has no usable skeleton');
  // The woman model has cartoon proportions (short body, big head) and sits like a child.
  // Give her an adult's torso and upper arms so she sits as tall as the others.
  if (person.kind === 'woman') {
    root.scale.multiplyScalar(1.12);
    for (const b of [bones.Spine1, bones.Spine2, bones.Neck]) if (b) b.position.multiplyScalar(1.5);
    for (const b of [bones.LeftArm, bones.RightArm]) if (b) b.position.multiplyScalar(1.25);
    for (const b of [bones.LeftForeArm, bones.RightForeArm, bones.LeftHand, bones.RightHand]) if (b) b.position.multiplyScalar(1.2);
  }
  group.add(root);

  const poser = createPoser(group, bones);
  const { aim, turn, reach, orientHand, curl } = poser;

  // Sit the hips on the chair.
  root.updateMatrixWorld(true);
  const hipsWorld = bones.Hips.getWorldPosition(new THREE.Vector3());
  const hipsLocal = group.worldToLocal(hipsWorld.clone());
  root.position.set(0, -0.45 - hipsLocal.y, -0.12 - hipsLocal.z);
  root.updateMatrixWorld(true);
  const handLen = bones.RightHandMiddle1
    ? bones.RightHand.getWorldPosition(new THREE.Vector3()).distanceTo(bones.RightHandMiddle1.getWorldPosition(new THREE.Vector3()))
    : 0.3;

  // Blink / smile morph targets if the model has them (Ready Player Me does).
  const morphMeshes = [];
  root.traverse((o) => { if (o.isMesh && o.morphTargetDictionary) morphMeshes.push(o); });
  const setMorph = (name, v) => {
    for (const m of morphMeshes) { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; }
  };

  // Fan of cards, gripped at its base by the left hand.
  const fan = new THREE.Group();
  group.add(fan);
  let count = 0;
  function layoutFan() {
    while (fan.children.length > count) fan.remove(fan.children[fan.children.length - 1]);
    while (fan.children.length < count) {
      const pivot = new THREE.Group();
      const card = makeCard(null);
      card.rotation.y = Math.PI;
      card.position.y = FAN_Y;
      card.scale.setScalar(FAN_SCALE);
      pivot.add(card);
      fan.add(pivot);
    }
    // Where each card should sit; update() eases them there so the fan opens/closes smoothly.
    const spread = Math.min(1.25, 0.1 * Math.max(0, count - 1));
    fan.children.forEach((pivot, i) => {
      pivot.userData.rot = count > 1 ? spread / 2 - (i * spread) / (count - 1) : 0;
      pivot.position.z = -i * 0.004;
    });
  }

  // Local (character-frame) point → world, and world direction helpers.
  const gq = new THREE.Quaternion();
  const L = (x, y, z) => group.localToWorld(V(x, y, z));
  const dirW = (x, y, z) => V(x, y, z).applyQuaternion(gq);

  let isTurn = false;
  let reaction = null;
  let sip = null; // { drink, home, homeQ, t, target }
  let headYaw = 0, headTarget = 0;
  let nextBlink = 2 + Math.random() * 3;
  const phase = Math.random() * 10;
  const UP = V(0, 1, 0), RIGHT = V(1, 0, 0);
  const tmp = new THREE.Vector3(), palmC = new THREE.Vector3();
  const fanBasis = new THREE.Matrix4(), fanQ = new THREE.Quaternion();
  const fanTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.25));

  // Where the glass should be during a sip (k = 0..1), in world space.
  function glassPose(k, drink, home, homeQ, out) {
    const sc = drink.group.scale.x;
    const lift = smooth(k, 0.14, 0.32) * (1 - smooth(k, 0.7, 0.86));
    const toMouth = smooth(k, 0.32, 0.45) * (1 - smooth(k, 0.6, 0.72));
    const deep = Math.min(1.35, 0.75 + (1 - drink.level) * 0.75); // tip further as it empties
    const tilt = toMouth * (deep + 0.12 * smooth(k, 0.45, 0.6));
    out.quat.copy(homeQ).multiply(new THREE.Quaternion().setFromAxisAngle(X, tilt));
    const raised = L(-0.5, 0.75, 0.95);
    // Near rim at the lips: the mouth sits a little below and in front of the head bone.
    const lips = bones.Head.getWorldPosition(new THREE.Vector3()).add(dirW(0, -0.12, 0.42));
    const atMouth = lips.sub(V(0, drink.spec.mouth.y, drink.spec.mouth.r).multiplyScalar(sc).applyQuaternion(out.quat));
    out.pos.copy(home).lerp(raised, lift).lerp(atMouth, toMouth);
    return out;
  }
  const pose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };

  return {
    labelY: 2.75,
    get count() { return count; },
    setCount(n) { if (n !== count) { count = Math.max(0, n); layoutFan(); } },

    handTransform() {
      group.updateMatrixWorld(true);
      const pos = new THREE.Vector3(0, FAN_Y, 0);
      fan.localToWorld(pos);
      const quat = new THREE.Quaternion();
      fan.getWorldQuaternion(quat);
      quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));
      return { pos, quat, scale: FAN_SCALE };
    },

    setTurn(b) { isTurn = b; },
    lookAt(world) {
      const local = group.worldToLocal(world.clone());
      headTarget = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.1, 1.1);
    },
    react(type) {
      if (sip && type !== 'sip') return; // busy drinking
      reaction = { type, t: 0, dur: { slam: 0.6, cheer: 1.5, sulk: 2.8 }[type] || 1 };
    },

    // Pick up `drink` from `home` (world position / table rotation), drink, put it back.
    sip(drink, home, homeQ) {
      if (sip || !drink) return false;
      reaction = null;
      sip = { drink, home: home.clone(), homeQ: homeQ.clone(), t: 0 };
      return true;
    },
    get sipping() { return !!sip; },

    rightHandWorld(out = new THREE.Vector3()) { return bones.RightHand.getWorldPosition(out); },

    update(t, dt) {
      poser.reset(root);
      group.getWorldQuaternion(gq);

      // Reaction envelopes.
      let cheer = 0, slam = 0, sulk = 0;
      if (reaction) {
        reaction.t += dt;
        const k = Math.min(1, reaction.t / reaction.dur);
        const env = Math.sin(k * Math.PI);
        if (reaction.type === 'cheer') cheer = Math.min(1, env * 1.8);
        if (reaction.type === 'slam') slam = env;
        if (reaction.type === 'sulk') sulk = Math.min(1, env * 2);
        if (k >= 1) reaction = null;
      }
      let k = 0, grab = 0, drinking = 0;
      if (sip) {
        sip.t += dt;
        k = Math.min(1, sip.t / SIP_S);
        grab = smooth(k, 0, 0.14) * (1 - smooth(k, 0.86, 1));
        drinking = smooth(k, 0.32, 0.45) * (1 - smooth(k, 0.6, 0.72));
      }

      // Torso: slight forward lean, breathing, lean in on their turn / to reach the glass.
      const breath = Math.sin(t * 1.5 + phase) * 0.02;
      const lean = 0.14 + (isTurn ? 0.08 : 0) + slam * 0.3 + sulk * 0.22 + breath + grab * (1 - drinking) * 0.12;
      aim(bones.Spine, bones.Spine1, V(-grab * 0.06, 1, lean));
      aim(bones.Spine1, bones.Spine2, V(0, 1, lean * 0.8));
      aim(bones.Spine2, bones.Neck, V(0, 1, lean * 0.5 - cheer * 0.15 - drinking * 0.12));

      // Legs: seated.
      aim(bones.LeftUpLeg, bones.LeftLeg, V(0.13, -0.22, 1));
      aim(bones.RightUpLeg, bones.RightLeg, V(-0.13, -0.22, 1));
      aim(bones.LeftLeg, bones.LeftFoot, V(0.04, -1, 0.12));
      aim(bones.RightLeg, bones.RightFoot, V(-0.04, -1, 0.12));

      // Head: look at whoever is acting, tilt while thinking, drop when sulking, tip back to drink.
      headYaw += (headTarget * (1 - drinking) - headYaw) * Math.min(1, dt * 3);
      turn(bones.Neck, UP, headYaw * 0.4);
      turn(bones.Head, UP, headYaw * 0.6);
      turn(bones.Head, V(0, 0, 1), Math.sin(t * (isTurn ? 1.8 : 0.8) + phase) * (isTurn ? 0.12 : 0.03) * (1 - drinking));
      turn(bones.Head, RIGHT, sulk * 0.5 - cheer * 0.25 - drinking * 0.28);

      // Left hand: holds the fan in front of the chest, palm toward the face.
      reach('Left', L(0.34, 0.42 + slam * 0.05, 0.8), V(1, -0.8, -0.2));
      orientHand('Left', dirW(-0.4, 0.88, 0.25), dirW(-0.35, 0.1, -1));
      curl('Left', 0.45, 0.25);

      // The fan is fixed to the actual hand (wherever the arm got to): its base sits in the palm
      // just in front of it, the cards rise along the fingers, faces toward the holder.
      const lh = bones.LeftHand.getWorldPosition(new THREE.Vector3());
      const lm = bones.LeftHandMiddle1 ? bones.LeftHandMiddle1.getWorldPosition(new THREE.Vector3()) : lh.clone().add(dirW(0, 0.1, 0));
      const pn = poser.palmNormal('Left', tmp) ? tmp.clone() : dirW(0, 0, -1);
      const fy = lm.clone().sub(lh).normalize();
      fy.addScaledVector(pn, -fy.dot(pn)).normalize();
      const fz = pn.clone().negate();                      // fan +Z = away from the holder
      const fx = new THREE.Vector3().crossVectors(fy, fz);
      fanBasis.makeBasis(fx, fy, fz);
      fanQ.setFromRotationMatrix(fanBasis);
      fan.quaternion.copy(gq).invert().multiply(fanQ);
      // Lean the fan a little toward the thumb so it spreads up and across.
      fan.quaternion.multiply(fanTilt);
      palmC.copy(lh).lerp(lm, 0.55).addScaledVector(pn, 0.045);
      fan.position.copy(group.worldToLocal(palmC.clone()));
      const ek = 1 - Math.exp(-dt * 10);
      for (const pivot of fan.children) pivot.rotation.z += ((pivot.userData.rot || 0) - pivot.rotation.z) * ek;
      fan.updateMatrixWorld(true);

      // Right hand: rests on the table edge; slams a card down; punches the air; or takes the drink.
      const restWrist = L(-0.32, 0.16 + Math.sin(t * 0.7 + phase) * 0.01, 1.02);
      let wrist = restWrist.clone()
        .lerp(L(-0.25, 0.2, 1.35), slam)
        .lerp(L(-0.55, 2.6, 0.45), cheer);
      let finger = dirW(0.25, -0.25, 1).lerp(dirW(0, -0.4, 1), slam).lerp(dirW(0, 1, 0.1), cheer).normalize();
      let palm = dirW(0.1, -1, 0.1).lerp(dirW(0, -1, 0), slam).lerp(dirW(0, 0, 1), cheer).normalize();
      let fingersCurl = 0.35 + cheer * 0.85 - slam * 0.2;

      let gp = null;
      if (sip) {
        const d = sip.drink;
        gp = glassPose(k, d, sip.home, sip.homeQ, pose);
        const sc = d.group.scale.x;
        const gx = X.clone().applyQuaternion(gp.quat);                        // toward the handle / hand
        const grip = gp.pos.clone().add(V(d.spec.grip.x, d.spec.grip.y, 0).multiplyScalar(sc).applyQuaternion(gp.quat));
        const gFinger = V(0, 0.1, -1).applyQuaternion(gp.quat).normalize();  // wrap round the far side
        const gPalm = gx.clone().negate();                                   // palm faces the glass
        const gWrist = grip.clone().addScaledVector(gx, 0.05).addScaledVector(gFinger, -handLen * 0.55);
        wrist = wrist.lerp(gWrist, grab);
        finger = finger.lerp(gFinger, grab).normalize();
        palm = palm.lerp(gPalm, grab).normalize();
        fingersCurl += (d.type === 'beer' ? 1.05 : 0.75) * grab;
        sip.target = gWrist;
      }
      reach('Right', wrist, V(-1, -0.7, -0.35));
      orientHand('Right', finger, palm);
      curl('Right', fingersCurl, fingersCurl * 0.5);

      // The glass goes where the hand actually got to (if the arm came up a little short).
      if (sip) {
        const actual = bones.RightHand.getWorldPosition(new THREE.Vector3());
        const held = smooth(k, 0.12, 0.2) * (1 - smooth(k, 0.8, 0.86));
        const corr = actual.sub(sip.target).multiplyScalar(held);
        sip.drink.group.position.copy(gp.pos).add(corr);
        sip.drink.group.quaternion.copy(gp.quat);
        if (k >= 1) { sip.drink.group.position.copy(sip.home); sip.drink.group.quaternion.copy(sip.homeQ); sip = null; }
      }

      // Blink and smile.
      nextBlink -= dt;
      const blink = nextBlink < 0.12 ? 1 : 0;
      if (nextBlink < 0) nextBlink = 2 + Math.random() * 4;
      setMorph('eyeBlinkLeft', blink); setMorph('eyeBlinkRight', blink);
      setMorph('mouthSmile', cheer * 0.9);
    },
  };
}
