// First-person seat camera: you sit at the table. The view follows the mouse a little,
// breathes, glances at whoever is acting, and shakes or zooms on big moments.
import * as THREE from 'three';

// Higher seat-eye than before, looking down onto the felt so played cards are easy to read.
export const EYE = new THREE.Vector3(0, 4.1, 6.7);
const LOOK_AT = new THREE.Vector3(0, -0.2, -0.6);
const MAX_YAW = 0.42;
const MAX_PITCH = 0.14;
// Where the intro flight starts: high at the side of the room, looking down at the table.
const INTRO_POS = new THREE.Vector3(-8, 9, 11);
const INTRO_YAW = -0.63;
const INTRO_PITCH = -0.62;
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function createCameraRig(scene) {
  const camera = new THREE.PerspectiveCamera(56, 1, 0.05, 100);
  const yawObj = new THREE.Group();
  const pitchObj = new THREE.Group();
  yawObj.position.copy(EYE);
  yawObj.add(pitchObj);
  pitchObj.add(camera);
  scene.add(yawObj);

  const basePitch = -Math.atan2(EYE.y - LOOK_AT.y, EYE.z - LOOK_AT.z);
  let mouse = { x: 0, y: 0 };
  let lastMouseMove = 0;
  let glance = 0;      // yaw toward the acting player
  let yaw = 0, pitch = 0;
  let shake = 0;
  let fovKick = 0;
  let baseFov = 56;
  let introT = -1, introDur = 3.6; // seconds into the intro flight (-1 = not playing)

  return {
    camera,
    root: yawObj,

    setMouse(nx, ny) { // -1..1
      mouse = { x: nx, y: ny };
      lastMouseMove = performance.now();
    },

    // Glance toward a world point when the mouse is idle.
    glanceAt(world) {
      if (!world) { glance = 0; return; }
      const dx = world.x - EYE.x, dz = world.z - EYE.z;
      glance = THREE.MathUtils.clamp(Math.atan2(-dx, -dz), -MAX_YAW, MAX_YAW) * 0.55;
    },

    // Fly in from above the room down to your seat.
    intro(seconds = 3.6) { introT = 0; introDur = seconds; },
    introProgress() { return introT < 0 ? 1 : Math.min(1, introT / introDur); },

    shake(amount = 0.25) { shake = Math.max(shake, amount); },
    zoom(amount = 4) { fovKick = amount; },

    resize(aspect) {
      camera.aspect = aspect;
      // Widen the view on narrow screens so the table still fits.
      baseFov = aspect < 1.3 ? Math.min(85, 56 * Math.pow(1.3 / aspect, 0.7)) : 56;
      camera.updateProjectionMatrix();
    },

    update(t, dt) {
      const idle = performance.now() - lastMouseMove > 2500;
      const wantYaw = idle ? glance : -mouse.x * MAX_YAW;
      const wantPitch = idle ? 0 : -mouse.y * MAX_PITCH;
      yaw += (wantYaw - yaw) * Math.min(1, dt * 3.2);
      pitch += (wantPitch - pitch) * Math.min(1, dt * 3.2);

      // Intro flight: blend from the high side view to the seat.
      let w = 0;
      if (introT >= 0) {
        introT += dt;
        const k = Math.min(1, introT / introDur);
        w = 1 - easeInOut(k);
        if (k >= 1) introT = -1;
      }
      yawObj.position.lerpVectors(EYE, INTRO_POS, w);
      yawObj.rotation.y = yaw + Math.sin(t * 0.31) * 0.008 + w * INTRO_YAW;
      pitchObj.rotation.x = basePitch + pitch + Math.sin(t * 1.1) * 0.004 + w * (INTRO_PITCH - basePitch);
      // Breathing.
      pitchObj.position.y = Math.sin(t * 1.4) * 0.012;

      shake = Math.max(0, shake - dt * 1.6);
      const s = shake * shake;
      camera.position.set((Math.random() - 0.5) * s * 0.25, (Math.random() - 0.5) * s * 0.25, 0);
      camera.rotation.z = (Math.random() - 0.5) * s * 0.06;

      fovKick += (0 - fovKick) * Math.min(1, dt * 1.5);
      const fov = baseFov - fovKick;
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    },
  };
}
