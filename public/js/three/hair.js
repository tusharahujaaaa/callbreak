// Short hair for the male model (it ships bald). "Shell" hair: the scalp is copied outward in
// thin layers; each layer keeps only the strands long enough to reach it, so up close it reads
// as thousands of short strands and from a distance as a soft, natural haircut.
// The shells are skinned to the head's skeleton, so the hair moves with the head.
import * as THREE from 'three';

const LAYERS = 14;
// Haircuts: thickness (m, model units) at the sides and extra volume on top.
export const HAIR_STYLES = {
  buzz:  { side: 0.004, top: 0.002, front: 0.0 },
  short: { side: 0.008, top: 0.01, front: 0.004 },
  crop:  { side: 0.007, top: 0.02, front: 0.012 },
  full:  { side: 0.014, top: 0.036, front: 0.02 },
};

// Hairline for the Ready Player Me head (mesh space, metres): the lowest height hair grows at,
// by direction round the head — low at the nape, above the ears at the sides, forehead in front.
const CENTRE = new THREE.Vector3(0, 1.735, 0.02);
function hairline(x, z) {
  const f = Math.cos(Math.atan2(x - CENTRE.x, z - CENTRE.z)); // 1 front .. -1 back
  const line = f > 0 ? 1.722 + 0.07 * Math.pow(f, 1.6) : 1.722 + 0.085 * f;
  // Keep the ears clear (they stick out past the skull).
  return Math.abs(x) > 0.086 && f > -0.6 ? Math.max(line, 1.758) : line;
}

let strandTex = null;
function strands() {
  if (strandTex) return strandTex;
  const n = 256;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  // Each texel is one strand; its value is how far out it reaches (0..1).
  for (let i = 0; i < n * n; i++) {
    const v = Math.pow(Math.random(), 0.6) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  strandTex = new THREE.CanvasTexture(c);
  strandTex.wrapS = strandTex.wrapT = THREE.RepeatWrapping;
  strandTex.magFilter = THREE.NearestFilter;
  strandTex.colorSpace = THREE.NoColorSpace;
  return strandTex;
}

const cache = new Map(); // head geometry + style -> shell geometry

function buildShells(headGeo, style) {
  const key = headGeo.uuid + style;
  if (cache.has(key)) return cache.get(key);
  const S = HAIR_STYLES[style] || HAIR_STYLES.short;
  const pos = headGeo.attributes.position, nrm = headGeo.attributes.normal;
  const si = headGeo.attributes.skinIndex, sw = headGeo.attributes.skinWeight;
  const index = headGeo.index ? headGeo.index.array : [...Array(pos.count).keys()];

  // Which vertices are scalp, and how far inside the hairline (0 at the edge .. 1 inside).
  const edge = new Float32Array(pos.count);
  for (let v = 0; v < pos.count; v++) {
    const d = pos.getY(v) - hairline(pos.getX(v), pos.getZ(v));
    edge[v] = THREE.MathUtils.clamp(d / 0.022 + 0.15, 0, 1);
  }
  const tris = [];
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    if (edge[a] + edge[b] + edge[c] > 0.15) tris.push(a, b, c);
  }
  const used = [...new Set(tris)];
  const remap = new Map(used.map((v, i) => [v, i]));
  const n = used.length;

  const P = new Float32Array(n * LAYERS * 3), N = new Float32Array(n * LAYERS * 3);
  const SI = new Uint16Array(n * LAYERS * 4), SW = new Float32Array(n * LAYERS * 4);
  const UV = new Float32Array(n * LAYERS * 2), LE = new Float32Array(n * LAYERS * 2);
  const idx = [];
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  for (let L = 0; L < LAYERS; L++) {
    const k = L / (LAYERS - 1);
    used.forEach((v, i) => {
      const o = L * n + i;
      p.fromBufferAttribute(pos, v);
      q.fromBufferAttribute(nrm, v);
      // Thicker on top and at the front (a bit of volume), thin at the sides and back.
      const top = THREE.MathUtils.clamp((p.y - 1.775) / 0.05, 0, 1);
      const front = THREE.MathUtils.clamp((p.z - 0.04) / 0.08, 0, 1) * top;
      const thick = (S.side + S.top * top + S.front * front) * (0.35 + 0.65 * edge[v]);
      p.addScaledVector(q, 0.0012 + thick * k);
      // Strands fall back and down a little.
      p.z -= thick * k * k * 0.5;
      p.y -= thick * k * k * 0.15 * (1 - top);
      P.set([p.x, p.y, p.z], o * 3);
      N.set([q.x, q.y, q.z], o * 3);
      for (let j = 0; j < 4; j++) { SI[o * 4 + j] = si.getComponent(v, j); SW[o * 4 + j] = sw.getComponent(v, j); }
      // Strand coordinates: around the head x up the head, ~0.6 mm per strand.
      const ang = Math.atan2(p.x - CENTRE.x, p.z - CENTRE.z);
      UV[o * 2] = (ang * 0.1) / 0.0007 / 256;
      UV[o * 2 + 1] = (p.y * 1.0) / 0.0011 / 256;
      LE[o * 2] = k;
      LE[o * 2 + 1] = edge[v];
    });
    for (let t = 0; t < tris.length; t++) idx.push(L * n + remap.get(tris[t]));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  g.setAttribute('hairLE', new THREE.BufferAttribute(LE, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  cache.set(key, g);
  return g;
}

function hairMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, map: strands(), side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 hairLE;\nvarying vec2 vHairLE;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairLE = hairLE;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vHairLE;')
      .replace('#include <map_fragment>', `
        float strand = texture2D(map, vMapUv).r;
        float layer = vHairLE.x, edge = vHairLE.y;
        // A strand shows on this layer if it's long enough; near the hairline strands thin out.
        if (layer > 0.0 && strand < layer) discard;
        if (strand < 1.0 - edge * 1.15) discard;
        // Darker at the roots, lighter at the tips, with per-strand variation.
        diffuseColor.rgb *= mix(0.42, 1.12, layer) * mix(0.8, 1.15, fract(strand * 37.0));
      `);
  };
  m.customProgramCacheKey = () => 'hair-shell';
  return m;
}

/** Give a Ready Player Me model hair. Returns the hair mesh (or null if there's no head). */
export function addHair(root, { style = 'short', color = 0x2a1a10 } = {}) {
  let head = null;
  root.traverse((o) => { if (o.isSkinnedMesh && /Wolf3D_Skin/.test(o.material.name || '')) head = o; });
  if (!head) return null;
  const hair = new THREE.SkinnedMesh(buildShells(head.geometry, style), hairMaterial(color));
  hair.bind(head.skeleton, head.bindMatrix);
  hair.castShadow = true;
  hair.frustumCulled = false;
  hair.name = 'Hair';
  head.parent.add(hair);
  return hair;
}
