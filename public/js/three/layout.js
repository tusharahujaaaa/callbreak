// Where things sit around the round table. Seat positions are "relative":
// 0 = you (nearest the camera), 1 = left, 2 = across, 3 = right.
import * as THREE from 'three';

export const TABLE_R = 3.6;   // felt radius
export const SEAT_DIST = 5.0; // character distance from centre

const DIRS = [
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(1, 0, 0),
];

export const dir = (r) => DIRS[r].clone();

// A point on the table surface toward seat r, `dist` from the centre.
export const tablePoint = (r, dist, y = 0.01) => dir(r).multiplyScalar(dist).setY(y);

// Where a played card lands for seat r.
export const trickSlot = (r) => tablePoint(r, 1.12, 0.07 + r * 0.004); // clear of the trump medallion
export const TRICK_SCALE = 1.45; // cards on the table are drawn a bit larger so they're easy to read

// Your hand is drawn in HTML; 3D cards fly to/from just below the camera's view.
export const MY_HAND_POINT = new THREE.Vector3(0, 1.6, 5.6);

// Angle that makes something at seat r face the table centre.
export const facingYaw = (r) => Math.atan2(-DIRS[r].x, -DIRS[r].z);
