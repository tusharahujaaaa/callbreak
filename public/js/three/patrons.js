// Bar regulars lounging on the sofas: realistic models posed seated, holding a drink,
// glancing around and taking the occasional sip. Purely atmosphere (not part of the game).
import * as THREE from 'three';
import { instantiate, findBones, applyLook, LOOKS, MODEL_SCALE } from './models.js';
import { createPoser } from './poser.js';
import { makeDrink } from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Sofa regulars: three different-looking men and a woman.
const PEOPLE = [{ kind: 'man', look: 'navy' }, { kind: 'man', look: 'plum' }, { kind: 'woman' }, { kind: 'man', look: 'tan' }];

function createPatron(scene, seat, i) {
  const person = PEOPLE[i % PEOPLE.length];
  const group = new THREE.Group();
  group.position.copy(seat.position);
  group.rotation.y = seat.yaw;
  scene.add(group);

  const drink = makeDrink(i % 3 === 1 ? 'beer' : 'whiskey');
  drink.setLevel(0.4 + Math.random() * 0.5);
  drink.group.scale.setScalar(1.15);
  scene.add(drink.group);

  let ready = null;
  instantiate(person.kind).then(({ root }) => {
    root.scale.setScalar(MODEL_SCALE);
    applyLook(root, LOOKS[person.look]);
    const bones = findBones(root);
    if (!bones.Hips) return;
    group.add(root);
    // Hips just above the cushion, sitting back into the sofa.
    root.updateMatrixWorld(true);
    const hips = group.worldToLocal(bones.Hips.getWorldPosition(new THREE.Vector3()));
    root.position.set(0, 0.32 - hips.y, -0.25 - hips.z);
    ready = { root, bones, poser: createPoser(group, bones) };
  }).catch((e) => console.warn('Patron model unavailable:', e));

  const phase = Math.random() * 100;
  let nextSip = 4 + Math.random() * 12;
  let sip = -1; // seconds into a sip, or -1
  let look = 0, lookTarget = 0, nextLook = 2;
  const gq = new THREE.Quaternion(), glassQ = new THREE.Quaternion();
  const FLIP = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI); // handle to their right

  return {
    update(t, dt) {
      if (!ready) return;
      const { root, bones, poser } = ready;
      const { aim, turn } = poser;
      poser.reset(root);

      // Sip timing: reach (0-0.5s), drink (0.5-2s), lower (2-2.6s).
      nextSip -= dt;
      if (sip < 0 && nextSip < 0) { sip = 0; nextSip = 10 + Math.random() * 18; }
      let lift = 0;
      if (sip >= 0) {
        sip += dt;
        lift = THREE.MathUtils.smootherstep(sip, 0, 0.9) * (1 - THREE.MathUtils.smootherstep(sip, 2.1, 3.0));
        if (sip > 3.0) sip = -1;
      }

      // Glance around now and then (often at the card table).
      nextLook -= dt;
      if (nextLook < 0) { lookTarget = (Math.random() - 0.5) * 1.6; nextLook = 2 + Math.random() * 4; }
      look += (lookTarget - look) * Math.min(1, dt * 2);

      // Relaxed seated pose: leaning back, legs out, knees apart.
      const breath = Math.sin(t * 1.3 + phase) * 0.02;
      aim(bones.Spine, bones.Spine1, V(0, 1, -0.18 + breath));
      aim(bones.Spine1, bones.Spine2, V(0, 1, -0.1));
      aim(bones.Spine2, bones.Neck, V(0, 1, 0.08 - lift * 0.1));
      aim(bones.LeftUpLeg, bones.LeftLeg, V(0.2, -0.12, 1));
      aim(bones.RightUpLeg, bones.RightLeg, V(-0.2, -0.12, 1));
      aim(bones.LeftLeg, bones.LeftFoot, V(0.06, -1, 0.3));
      aim(bones.RightLeg, bones.RightFoot, V(-0.06, -1, 0.3));
      // Left arm rests on the thigh.
      aim(bones.LeftArm, bones.LeftForeArm, V(0.3, -0.9, 0.25));
      aim(bones.LeftForeArm, bones.LeftHand, V(0.05, -0.35, 1));
      turn(bones.Neck, V(0, 1, 0), look * 0.4 * (1 - lift));
      turn(bones.Head, V(0, 1, 0), look * 0.6 * (1 - lift));
      turn(bones.Head, V(1, 0, 0), -lift * 0.3);

      // Right hand holds the drink on the thigh, or lifts it to the lips (fingers round it).
      group.getWorldQuaternion(gq);
      const dirW = (x, y, z) => V(x, y, z).applyQuaternion(gq);
      const sc = drink.group.scale.x;
      const tilt = lift * (0.8 + (1 - drink.level) * 0.6);
      glassQ.copy(gq).multiply(FLIP).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), tilt));
      const onThigh = bones.RightLeg.getWorldPosition(new THREE.Vector3()).add(dirW(0.2, 0.25, -0.55));
      const lips = bones.Head.getWorldPosition(new THREE.Vector3()).add(dirW(0, -0.12, 0.42))
        .sub(V(0, drink.spec.mouth.y, drink.spec.mouth.r).multiplyScalar(sc).applyQuaternion(glassQ));
      const gpos = onThigh.lerp(lips, lift);
      const gx = V(1, 0, 0).applyQuaternion(glassQ);
      const fingerW = V(0, 0.1, -1).applyQuaternion(glassQ).normalize();
      const grip = gpos.clone().add(V(drink.spec.grip.x, drink.spec.grip.y, 0).multiplyScalar(sc).applyQuaternion(glassQ));
      const wrist = grip.addScaledVector(gx, 0.05).addScaledVector(fingerW, -0.3 * 0.55);
      poser.reach('Right', wrist, V(-1, -0.6, -0.3));
      poser.orientHand('Right', fingerW, gx.clone().negate());
      poser.curl('Right', drink.type === 'beer' ? 1.3 : 1.0, 0.5);
      const actual = bones.RightHand.getWorldPosition(new THREE.Vector3());
      drink.group.position.copy(gpos).add(actual.sub(wrist));
      drink.group.quaternion.copy(glassQ);
      drink.update(t, dt);
    },
  };
}

export function createPatrons(scene, seats) {
  const patrons = seats.map((seat, i) => createPatron(scene, seat, i));
  return { update(t, dt) { for (const p of patrons) p.update(t, dt); } };
}
