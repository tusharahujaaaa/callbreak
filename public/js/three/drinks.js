// Drinks on the table (beer pint or whiskey tumbler at every seat, emptying over time)
// and the waiter who brings orders and refills. Driven by the server's bar state, so
// everyone sees the same glasses and the same waiter walk.
import * as THREE from 'three';
import { makeDrink } from './props.js';
import { instantiate, findBones, applyLook, LOOKS, MODEL_SCALE } from './models.js';
import { createPoser } from './poser.js';
import { FLOOR_Y } from './environment.js';
import { dir, facingYaw } from './layout.js';
import { serverNow } from '../core/clock.js';
import { sfx } from '../ui/sfx.js';

// Where each seat's glass stands (relative seats: 0 you, 1 left, 2 across, 3 right): near the
// table edge, to their right, within arm's reach.
const rightOf = (r) => { const y = facingYaw(r); return new THREE.Vector3(-Math.cos(y), 0, Math.sin(y)); };
const GLASS_POS = [0, 1, 2, 3].map((r) => {
  const p = r === 0 ? new THREE.Vector3(1.55, 0, 2.85) : dir(r).multiplyScalar(3.12).addScaledVector(rightOf(r), 1.2);
  return [p.x, p.z];
});
// On the table a glass is turned so its handle points to its owner's right hand.
const GLASS_YAW = [0, 1, 2, 3].map((r) => facingYaw(r) + Math.PI);
const HOME = new THREE.Vector3(2.5, FLOOR_Y, -11.4); // behind the bar counter
const GLASS_SCALE = 1.15;

const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

function waiterPath(r) {
  const [gx, gz] = GLASS_POS[r];
  const dir = new THREE.Vector3(gx, 0, gz).normalize();
  const stand = dir.clone().multiplyScalar(5.45).setY(FLOOR_Y);
  const side = gx >= 0 ? 1 : -1;
  const pts = [
    HOME.clone(),
    new THREE.Vector3(side * 7.9, FLOOR_Y, -11.0),
    new THREE.Vector3(side * 8.6, FLOOR_Y, -6.5),
    dir.clone().multiplyScalar(7.6).setY(FLOOR_Y),
    stand,
  ];
  return { curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), stand, glass: new THREE.Vector3(gx, 0, gz) };
}

function createWaiter(scene) {
  const root = new THREE.Group();     // moves along the path; faces where she walks
  root.position.copy(HOME);
  scene.add(root);
  let model = null, bones = null, poser = null;

  // Silver tray with the drink being brought (follows her right hand).
  const tray = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.25 }));
  plate.castShadow = true;
  tray.add(plate);
  tray.position.set(0.55, 3.55, 0.6);
  root.add(tray);
  let trayDrink = null;
  let trayType = null;
  function setTray(type) {
    if (type === trayType) return;
    if (trayDrink) tray.remove(trayDrink.group);
    trayDrink = null;
    trayType = type;
    if (type) {
      trayDrink = makeDrink(type);
      trayDrink.group.position.y = 0.02;
      trayDrink.group.scale.setScalar(0.9);
      tray.add(trayDrink.group);
    }
  }

  // The waiter: white shirt, black trousers.
  instantiate('man').then(({ root: m }) => {
    m.scale.setScalar(MODEL_SCALE);
    applyLook(m, LOOKS.waiter);
    root.add(m);
    model = m;
    bones = findBones(m);
    poser = createPoser(root, bones);
  }).catch((e) => console.warn('Waiter model unavailable:', e));

  // Walk cycle / standing pose, built procedurally (works on any rig).
  let stride = 0;          // walk-cycle phase
  let walkAmt = 0;         // 0 standing … 1 walking
  const lastPos = root.position.clone();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const handPos = new THREE.Vector3();

  function pose(dt, t) {
    if (!poser) return;
    // Speed from how far she moved this frame drives the cadence.
    const speed = root.position.distanceTo(lastPos) / Math.max(dt, 1e-3);
    lastPos.copy(root.position);
    walkAmt += ((speed > 0.3 ? 1 : 0) - walkAmt) * Math.min(1, dt * 6);
    stride += dt * (Math.PI * 2) * Math.min(1.6, speed / 2.6);

    poser.reset(model);
    const { aim, turn } = poser;
    const s = Math.sin(stride) * walkAmt, c = Math.cos(stride) * walkAmt;
    model.position.y = Math.abs(Math.sin(stride)) * 0.06 * walkAmt;

    aim(bones.Spine, bones.Spine1, V(0, 1, 0.04 + 0.04 * walkAmt));
    // Legs: swing forward/back, knees bend on the back-swing.
    aim(bones.LeftUpLeg, bones.LeftLeg, V(0.05, -1, 0.42 * s));
    aim(bones.LeftLeg, bones.LeftFoot, V(0.03, -1, 0.42 * s - 0.55 * Math.max(0, -c)));
    aim(bones.RightUpLeg, bones.RightLeg, V(-0.05, -1, -0.42 * s));
    aim(bones.RightLeg, bones.RightFoot, V(-0.03, -1, -0.42 * s - 0.55 * Math.max(0, c)));
    // Left arm hangs and swings; right arm carries the tray at chest height.
    aim(bones.LeftArm, bones.LeftForeArm, V(0.18, -1, -0.32 * s));
    aim(bones.LeftForeArm, bones.LeftHand, V(0.08, -1, 0.2 - 0.25 * s));
    aim(bones.RightArm, bones.RightForeArm, V(-0.28, -0.75, 0.35));
    aim(bones.RightForeArm, bones.RightHand, V(0.15, 0.12, 1));
    turn(bones.Head, V(0, 1, 0), Math.sin(t * 0.4) * 0.15 * (1 - walkAmt));

    // Tray rests on the right hand.
    bones.RightHand.getWorldPosition(handPos);
    root.worldToLocal(handPos);
    tray.position.copy(handPos).add(V(0.05, 0.12, 0.25));
  }

  const paths = [0, 1, 2, 3].map(waiterPath);
  const tmp = new THREE.Vector3();

  return {
    // bar: server bar state; rel(seat) gives the relative seat.
    update(bar, rel, dt, t) {
      const tm = bar.timing;
      const total = tm.walkMs * 2 + tm.serveMs;
      const now = serverNow();
      const visit = bar.visits.find((v) => now >= v.start && now < v.start + total);
      if (!visit) {
        root.position.lerp(HOME, Math.min(1, dt * 2));
        root.rotation.y += (0 - root.rotation.y) * Math.min(1, dt * 3);
        setTray(null);
      } else {
        const path = paths[rel(visit.seat)];
        const e = now - visit.start;
        if (e < tm.walkMs) {                                  // walking over with the drink
          const u = easeInOut(e / tm.walkMs);
          root.position.copy(path.curve.getPointAt(u));
          const tan = path.curve.getTangentAt(Math.min(0.999, u));
          root.rotation.y = Math.atan2(tan.x, tan.z);
          setTray(visit.type);
        } else if (e < tm.walkMs + tm.serveMs) {              // serving at the table
          root.position.copy(path.stand);
          tmp.copy(path.glass).sub(path.stand);
          root.rotation.y = Math.atan2(tmp.x, tmp.z);
          setTray(e < tm.walkMs + tm.pourAtMs ? visit.type : null);
        } else {                                              // walking back
          const u = easeInOut((e - tm.walkMs - tm.serveMs) / tm.walkMs);
          root.position.copy(path.curve.getPointAt(1 - u));
          const tan = path.curve.getTangentAt(Math.max(0.001, 1 - u));
          root.rotation.y = Math.atan2(-tan.x, -tan.z);
          setTray(null);
        }
      }
      pose(dt, t);
      if (trayDrink) trayDrink.update(t, dt);
    },
  };
}

const smooth = THREE.MathUtils.smootherstep;
const seg = (k, a, b) => smooth(k, a, b);

export function createBarView(scene, camera) {
  const glasses = [null, null, null, null]; // by relative seat
  const waiter = createWaiter(scene);
  let bar = null;
  let mySeat = 0;
  const poured = new Set(); // visit ids we've already played the pour sound for
  const held = [0, 0, 0, 0];  // by relative seat: seconds left that a player's hand holds the glass
  let mySip = -1;             // seconds into your own (first-person) sip, or -1
  const levels = [1, 1, 1, 1]; // by relative seat
  const SIP_S = 3.6;
  const UP = new THREE.Vector3(0, 1, 0);
  const X = new THREE.Vector3(1, 0, 0);
  const rel = (seat) => (seat - mySeat + 4) % 4;
  const seenSips = [0, 0, 0, 0];
  let onSip = null;
  let firstSync = true;

  function glassFor(r, type) {
    if (glasses[r] && glasses[r].type === type) return glasses[r];
    if (glasses[r]) scene.remove(glasses[r].group);
    const d = makeDrink(type);
    const [x, z] = GLASS_POS[r];
    d.group.position.set(x, 0, z);
    d.group.quaternion.copy(homeQuat(r));
    d.group.scale.setScalar(GLASS_SCALE);
    scene.add(d.group);
    glasses[r] = d;
    return d;
  }

  const homePos = (r) => new THREE.Vector3(GLASS_POS[r][0], 0, GLASS_POS[r][1]);
  const homeQuat = (r) => new THREE.Quaternion().setFromAxisAngle(UP, GLASS_YAW[r]);

  // Your own sip, seen from your eyes: lift the glass, bring it up to the camera, tip, put it back.
  const _l = new THREE.Vector3(), _m = new THREE.Vector3(), _q = new THREE.Quaternion();
  function placeMine(g, dt) {
    const home = homePos(0), hq = homeQuat(0);
    if (mySip < 0) { g.group.position.copy(home); g.group.quaternion.copy(hq); return; }
    mySip += dt;
    const k = mySip / SIP_S;
    if (k >= 1) { mySip = -1; placeMine(g, 0); return; }
    const sc = g.group.scale.x;
    camera.updateMatrixWorld();
    const lifted = camera.localToWorld(_l.set(0.5, -0.5, -1.5));
    const deep = Math.min(1.45, 0.8 + (1 - g.level) * 0.8); // tip further as it empties
    const tilt = deep * seg(k, 0.25, 0.42) * (1 - seg(k, 0.62, 0.76)) + 0.15 * seg(k, 0.42, 0.62) * (1 - seg(k, 0.62, 0.7));
    _q.copy(hq).multiply(new THREE.Quaternion().setFromAxisAngle(X, tilt));
    // Glass position that puts the near rim just under the camera.
    const lip = camera.localToWorld(_m.set(0.1, -0.24, -0.62));
    const atMouth = lip.sub(new THREE.Vector3(0, g.spec.mouth.y, g.spec.mouth.r).multiplyScalar(sc).applyQuaternion(_q));
    const up = seg(k, 0, 0.25) * (1 - seg(k, 0.76, 1));
    const mouth = seg(k, 0.25, 0.42) * (1 - seg(k, 0.62, 0.76));
    g.group.position.copy(home).lerp(lifted, up).lerp(atMouth, mouth);
    g.group.quaternion.copy(_q);
  }

  return {
    // A player's hand takes the glass for `secs` (their character moves it meanwhile).
    hold(r, secs) { held[r] = secs; },
    glass: (r) => glasses[r],
    homePos, homeQuat,
    levelOf: (r) => levels[r],
    isSipping: (r) => (r === 0 ? mySip >= 0 : held[r] > 0),
    // Called with a relative seat when the server says that player took a sip.
    onSip(fn) { onSip = fn; },
    sipMine() { if (mySip < 0) mySip = 0; },

    sync(state) {
      bar = state.bar || null;
      mySeat = state.mySeat;
      if (!bar || !bar.sips) return;
      bar.sips.forEach((ts, seat) => {
        if (ts > seenSips[seat]) {
          const fresh = !firstSync && serverNow() - ts < 2500;
          seenSips[seat] = ts;
          if (fresh && onSip) onSip(rel(seat));
        }
      });
      firstSync = false;
    },
    update(t, dt) {
      if (!bar) return;
      const now = serverNow();
      for (let seat = 0; seat < 4; seat++) {
        const d = bar.drinks[seat];
        const showPrev = now < d.pouredAt && d.prev;
        const type = showPrev ? d.prev.type : d.type;
        const since = now - (showPrev ? d.prev.pouredAt : d.pouredAt);
        const level = Math.max(0, 1 - since / bar.timing.drainMs[type]);
        const r = rel(seat);
        const g = glassFor(r, type);
        g.setLevel(level);
        levels[r] = level;
        if (r === 0) placeMine(g, dt);
        else if (held[r] > 0) held[r] -= dt;   // in someone's hand
        else { g.group.position.copy(homePos(r)); g.group.quaternion.copy(homeQuat(r)); }
        g.update(t, dt);
      }
      // Pour sound when our own drink arrives.
      for (const v of bar.visits) {
        if (v.seat !== mySeat || poured.has(v.id)) continue;
        const pourAt = v.start + bar.timing.walkMs + bar.timing.pourAtMs;
        if (now >= pourAt && now < pourAt + 1500) { poured.add(v.id); sfx.pour(); }
      }
      waiter.update(bar, rel, dt, t);
    },
  };
}
