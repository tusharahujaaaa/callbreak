// Loading and cloning rigged character models (glTF).
//  man   – Ready Player Me avatar (realistic male)
//  woman – Mixamo "Michelle" (realistic female)
// Both share the Mixamo skeleton naming, so one posing system drives them all.
// The man's clothes, hat, beard and skin are separate parts, so LOOKS turns him into many
// different-looking people (players, sofa guests, the waiter).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { addHair } from './hair.js';

export const MODEL_URLS = {
  man: '/models/readyplayer.me.glb',
  woman: '/models/Michelle.glb',
};

// 1 scene unit ≈ 28 cm (the table top is 2.7 units above the floor ≈ 76 cm).
export const MODEL_SCALE = 3.55;

const loader = new GLTFLoader();
const cache = new Map();

export function loadModel(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject)).then((gltf) => {
      if (url === MODEL_URLS.woman) tidyWoman(gltf.scene);
      return gltf;
    }));
  }
  return cache.get(url);
}

// The woman model comes dressed as a cartoon (rainbow headphones, round red sunglasses, yellow
// cargo trousers). Take the headphones and glasses off and dye the trousers dark denim, once,
// on the shared geometry / texture before any copies are made.
function tidyWoman(scene) {
  scene.traverse((o) => {
    if (!o.isSkinnedMesh || !o.geometry.index) return;
    try { removeParts(o.geometry, (size) => size === 3209 || size === 322 || size === 29); } catch (e) { console.warn('tidyWoman', e); }
    const map = o.material.map;
    if (map && map.image) o.material.map = recolour(map, (r, g, b) => {
      // Yellow (trousers) -> dark indigo denim, keeping the folds' light and shade.
      if (r > 120 && g > 100 && b < 120 && r - b > 70 && Math.abs(r - g) < 80) {
        const l = (r + g) / 510;
        return [28 + 30 * l, 34 + 34 * l, 52 + 48 * l];
      }
      // The little cyan stripes on the trousers -> stitching.
      if (b > r + 40 && g > r + 25) return [52, 60, 80];
      return null;
    });
  });
}

// Hide connected pieces of a mesh (welded by position) whose vertex count matches `pick`.
function removeParts(geo, pick) {
  const P = geo.attributes.position, I = geo.index.array, n = P.count;
  const par = new Int32Array(n).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`;
    if (seen.has(k)) join(i, seen.get(k)); else seen.set(k, i);
  }
  for (let t = 0; t < I.length; t += 3) { join(I[t], I[t + 1]); join(I[t], I[t + 2]); }
  const size = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); size.set(r, (size.get(r) || 0) + 1); }
  for (let t = 0; t < I.length; t += 3) {
    if (pick(size.get(find(I[t])))) { I[t + 1] = I[t]; I[t + 2] = I[t]; } // degenerate = invisible
  }
  geo.index.needsUpdate = true;
}

function recolour(tex, fn) {
  const img = tex.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const out = fn(d.data[i], d.data[i + 1], d.data[i + 2]);
    if (out) { d.data[i] = out[0]; d.data[i + 1] = out[1]; d.data[i + 2] = out[2]; }
  }
  ctx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = tex.flipY;
  t.colorSpace = tex.colorSpace;
  t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  t.anisotropy = tex.anisotropy;
  t.channel = tex.channel;
  return t;
}

// A private copy of the model with its own materials (so each player can be tinted).
export async function instantiate(kind) {
  const gltf = await loadModel(MODEL_URLS[kind]);
  const root = SkeletonUtils.clone(gltf.scene);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false; // skinned meshes move away from their bounding box when posed
  });
  return { root, animations: gltf.animations };
}

const BONE_NAMES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
// Finger joints (Left/Right + finger + 1..3), used to curl hands around cards and glasses.
export const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
for (const side of ['Left', 'Right']) for (const f of FINGERS) for (let j = 1; j <= 4; j++) BONE_NAMES.push(`${side}Hand${f}${j}`);

// Find the standard bones whether they're named "mixamorig:Hips", "mixamorigHips" or "Hips".
export function findBones(root) {
  const bones = {};
  root.traverse((o) => {
    if (!o.isBone) return;
    const name = o.name.replace(/^mixamorig[:_]?/, '');
    if (BONE_NAMES.includes(name) && !bones[name]) bones[name] = o;
  });
  return bones;
}

// Mixamo clips (e.g. X Bot's walk) use "mixamorig..." track names; rename for a target skeleton.
export function retargetClip(clip, targetRoot) {
  const names = new Set();
  targetRoot.traverse((o) => o.isBone && names.add(o.name));
  const prefixed = [...names].some((n) => n.startsWith('mixamorig'));
  const tracks = clip.tracks
    .filter((t) => t.name.endsWith('.quaternion') || t.name.startsWith('mixamorigHips.position'))
    .map((t) => {
      const tr = t.clone();
      const [node, prop] = tr.name.split('.');
      const bare = node.replace(/^mixamorig[:_]?/, '');
      tr.name = `${prefixed ? 'mixamorig' + bare : bare}.${prop}`;
      return tr;
    })
    .filter((t) => names.has(t.name.split('.')[0]) && !t.name.endsWith('.position'));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

// Looks for the male model: hat / beard on or off, skin tone, shirt / trousers / shoe colours.
// (null colour = keep the model's own.)
// hair: [haircut, colour] (see hair.js). The hat already has hair under it.
export const LOOKS = {
  gambler: { hat: true, beard: true, skin: null, top: null, bottom: null, hair: null },
  navy:    { hat: false, beard: true, skin: 0xd9a07a, top: 0x2f4f7a, bottom: 0x2a2a2a, hair: ['crop', 0x1c1410] },
  maroon:  { hat: true, beard: false, skin: 0x8d5a3b, top: 0x7a2b2b, bottom: 0x3a3030, hair: null },
  green:   { hat: false, beard: false, skin: 0xffe3cc, top: 0x2e5a3a, bottom: 0x3a3a3a, hair: ['full', 0x4a2c18] },
  plum:    { hat: true, beard: false, skin: 0xc68a5a, top: 0x4a3a6b, bottom: 0x222222, hair: null },
  tan:     { hat: false, beard: true, skin: 0xb07a50, top: 0x8a6a3a, bottom: 0x2a2620, hair: ['short', 0x151110] },
  waiter:  { hat: false, beard: false, skin: 0xe8b890, top: 0xf2f2f2, bottom: 0x111111, shoes: 0x0a0a0a, hair: ['crop', 0x2a1c12] },
};

export function applyLook(root, look) {
  if (!look) return;
  const tint = (m, c) => { if (c != null) m.color.set(c); };
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.material.name || '';
    if (/Headwear/i.test(n)) o.visible = !!look.hat;
    else if (/Beard/i.test(n)) o.visible = !!look.beard;
    else if (/Wolf3D_(Skin|Body)/i.test(n)) tint(o.material, look.skin);
    else if (/Outfit_Top/i.test(n)) tint(o.material, look.top);
    else if (/Outfit_Bottom/i.test(n)) tint(o.material, look.bottom);
    else if (/Outfit_Footwear/i.test(n)) tint(o.material, look.shoes);
  });
  if (look.hair && !look.hat) addHair(root, { style: look.hair[0], color: look.hair[1] });
}
