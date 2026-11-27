// Shared "maharaja palace" parts: gold, deep maroon velvet, turned legs, arched crests, finials.
import * as THREE from 'three';

export const goldMat = () => new THREE.MeshStandardMaterial({ color: 0xd4a53c, metalness: 1, roughness: 0.3 });

export const velvetMat = (color = 0x6e0f1d) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.88, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xc23a50),
});

// Profile of a turned (lathe) leg: [radius factor, height factor]; 1 = full radius / full height.
const LEG = [[0.55, 0], [1, 0.03], [0.7, 0.07], [0.45, 0.13], [0.45, 0.42], [0.85, 0.47], [0.5, 0.53],
  [0.5, 0.8], [0.78, 0.86], [0.55, 0.92], [0.62, 1]];

// A turned, gilded leg standing on y = 0 and `h` tall.
export function turnedLeg(h, r, mat) {
  const pts = LEG.map(([x, y]) => new THREE.Vector2(x * r, y * h));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A ball with a little spire on top.
export function finial(r, mat) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, r * 2.2, 12), mat);
  spire.position.y = r * 1.5;
  g.add(ball, spire);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// A double arch (the crown of a royal seat back), standing on y = 0, lying in the XY plane.
export function crest(radius, tube, mat) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 48, Math.PI), mat);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.7, tube * 0.7, 10, 40, Math.PI), mat);
  g.add(outer, inner);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
