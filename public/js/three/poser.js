// Procedural posing for rigged models. Instead of relying on animation clips (which break when
// two skeletons are oriented differently), each limb is *aimed* in a direction given in the
// character's own frame (+Z forward, +Y up, +X = character's left). Works on any Mixamo-style rig.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3();
const FINGER_NAMES = ['Index', 'Middle', 'Ring', 'Pinky'];

/**
 * @param frame  the Object3D whose orientation defines "forward/up/left" for the directions
 * @param bones  bones from findBones()
 */
export function createPoser(frame, bones) {
  const rest = new Map(Object.values(bones).map((b) => [b, b.quaternion.clone()]));
  const frameQuat = new THREE.Quaternion();

  // Rotate bone (world-space delta) so it ends up with world rotation q * current.
  function applyWorld(bone, q) {
    bone.getWorldQuaternion(_q2);
    _q.copy(q).multiply(_q2);
    bone.parent.getWorldQuaternion(_q3).invert();
    bone.quaternion.copy(_q3.multiply(_q));
    bone.updateMatrixWorld(true);
  }
  function aimWorld(bone, child, want) {
    if (!bone || !child) return;
    bone.updateWorldMatrix(true, false);
    child.updateWorldMatrix(false, false);
    const from = bone.getWorldPosition(_a);
    const cur = child.getWorldPosition(_b).sub(from).normalize();
    applyWorld(bone, new THREE.Quaternion().setFromUnitVectors(cur, want.clone().normalize()));
  }
  const toWorld = (v) => v.clone().normalize().applyQuaternion(frameQuat);
  const P = (side, name) => bones[`${side}${name}`];

  // Raw normal of the hand plane (fingers × knuckle line); which side is the palm is learned
  // from the rest pose, where both palms face the floor.
  function handPlane(side, out) {
    const hand = P(side, 'Hand'), mid = P(side, 'HandMiddle1'), idx = P(side, 'HandIndex1'), pk = P(side, 'HandPinky1');
    if (!hand || !mid || !idx || !pk) return null;
    const h = hand.getWorldPosition(_c);
    const f = mid.getWorldPosition(_d).sub(h);
    const l = idx.getWorldPosition(_e).sub(pk.getWorldPosition(_f));
    return out.crossVectors(f, l).normalize();
  }
  const palmSign = {};
  frame.updateMatrixWorld(true);
  for (const side of ['Left', 'Right']) {
    const n = handPlane(side, new THREE.Vector3());
    palmSign[side] = n && n.y > 0 ? -1 : 1;
  }
  // Palm normal (world) of a hand: the way the palm faces.
  function palmNormal(side, out = new THREE.Vector3()) {
    if (!handPlane(side, out)) return null;
    return out.multiplyScalar(palmSign[side]);
  }

  return {
    toWorld,
    palmNormal,

    // Two-bone IK: bend shoulder→elbow→wrist so the wrist reaches `target` (world).
    // `pole` (frame space) says which way the elbow points.
    reach(side, target, pole) {
      const up = P(side, 'Arm'), lo = P(side, 'ForeArm'), end = P(side, 'Hand');
      if (!up || !lo || !end) return;
      up.updateWorldMatrix(true, true);
      const s = up.getWorldPosition(new THREE.Vector3());
      const a = s.distanceTo(lo.getWorldPosition(_a));
      const b = lo.getWorldPosition(_a).distanceTo(end.getWorldPosition(_b));
      const to = target.clone().sub(s);
      const d = THREE.MathUtils.clamp(to.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
      const dir = to.normalize();
      const pw = toWorld(pole);
      const perp = pw.sub(dir.clone().multiplyScalar(pw.dot(dir))).normalize();
      const x = (a * a - b * b + d * d) / (2 * d);
      const y = Math.sqrt(Math.max(0, a * a - x * x));
      const elbow = s.clone().addScaledVector(dir, x).addScaledVector(perp, y);
      aimWorld(up, lo, elbow.clone().sub(s));
      const wrist = s.clone().addScaledVector(dir, d);
      aimWorld(lo, end, wrist.sub(lo.getWorldPosition(_a)));
    },

    // Point the fingers along `finger` and turn the palm toward `palm` (both world space).
    orientHand(side, finger, palm) {
      const hand = P(side, 'Hand'), mid = P(side, 'HandMiddle1');
      if (!hand || !mid) return;
      const fw = finger.clone().normalize();
      aimWorld(hand, mid, fw);
      const cur = palmNormal(side, new THREE.Vector3());
      if (!cur) return;
      const want = palm.clone().normalize();
      want.sub(fw.clone().multiplyScalar(want.dot(fw))).normalize();
      cur.sub(fw.clone().multiplyScalar(cur.dot(fw))).normalize();
      const ang = Math.atan2(_a.crossVectors(cur, want).dot(fw), cur.dot(want));
      applyWorld(hand, new THREE.Quaternion().setFromAxisAngle(fw, ang));
    },

    // Curl the fingers toward the palm (radians per joint); thumb separately.
    curl(side, amount, thumb = amount * 0.6) {
      const palm = palmNormal(side, new THREE.Vector3());
      if (!palm) return;
      const fingers = [...FINGER_NAMES.map((f) => [f, amount]), ['Thumb', thumb]];
      for (const [f, amt] of fingers) {
        if (!amt) continue;
        const j1 = P(side, `Hand${f}1`), j2 = P(side, `Hand${f}2`);
        if (!j1 || !j2) continue;
        const axis = new THREE.Vector3().crossVectors(j2.getWorldPosition(_a).sub(j1.getWorldPosition(_b)), palm).normalize();
        if (axis.lengthSq() < 1e-6) continue;
        const q = new THREE.Quaternion().setFromAxisAngle(axis, amt * (f === 'Thumb' ? 0.7 : 1));
        for (let j = 1; j <= 3; j++) { const bone = P(side, `Hand${f}${j}`); if (bone) applyWorld(bone, q); }
      }
    },

    // Back to the rest pose; call once per frame before aiming.
    reset(root) {
      frame.getWorldQuaternion(frameQuat);
      for (const [b, q] of rest) b.quaternion.copy(q);
      root.updateMatrixWorld(true);
    },

    // Rotate `bone` so the direction toward `child` points along `dir` (frame space).
    aim(bone, child, dir) {
      if (!bone || !child) return;
      bone.updateWorldMatrix(true, false);
      child.updateWorldMatrix(false, false);
      const from = bone.getWorldPosition(_a);
      const cur = child.getWorldPosition(_b).sub(from).normalize();
      const want = dir.clone().normalize().applyQuaternion(frameQuat);
      _q.setFromUnitVectors(cur, want);
      bone.getWorldQuaternion(_q2);
      _q.multiply(_q2);
      bone.parent.getWorldQuaternion(_q3).invert();
      bone.quaternion.copy(_q3.multiply(_q));
      bone.updateMatrixWorld(true);
    },

    // Rotate a bone about an axis given in frame space.
    turn(bone, axis, angle) {
      if (!bone || !angle) return;
      const ax = axis.clone().applyQuaternion(frameQuat).normalize();
      _q.setFromAxisAngle(ax, angle);
      bone.getWorldQuaternion(_q2);
      _q.multiply(_q2);
      bone.parent.getWorldQuaternion(_q3).invert();
      bone.quaternion.copy(_q3.multiply(_q));
      bone.updateMatrixWorld(true);
    },
  };
}
