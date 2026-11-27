// Bar props: bottles and drinking glasses, lathed from real profiles.
// Glass is drawn as clear, shiny, slightly reflective transparency (not refraction), with the
// liquid rendered first so it always shows through — and it's cheap enough for any computer.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const P = (x, y) => new THREE.Vector2(x, y);

// ---------- Materials ----------
// Glass: almost invisible face-on, brighter and more opaque toward the silhouette (Fresnel),
// with a faint green-blue tint in the thick parts like real soda-lime glass.
export function glassMaterial(tint = 0xffffff, opacity = 0.2) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint).multiply(new THREE.Color(0xeef8f4)), metalness: 0, roughness: 0.03, transparent: true,
    opacity: opacity * 0.55, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 2.6,
    ior: 1.5, side: THREE.DoubleSide, depthWrite: false,
  });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float fres = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.5);
      diffuseColor.a = mix(diffuseColor.a, 0.82, fres);
      outgoingLight += vec3(0.16, 0.19, 0.18) * fres;
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'glass-fresnel';
  return m;
}
function liquidMaterial(color, opacity, glow = 0) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.12, metalness: 0, transparent: opacity < 1, opacity,
    clearcoat: 0.6, envMapIntensity: 1.2, emissive: color, emissiveIntensity: glow, side: THREE.DoubleSide,
  });
}
// Liquid first, glass after (and glass never hides what's inside it).
const LIQUID_ORDER = 1, GLASS_ORDER = 2;

// ---------- Labels ----------
function labelTexture(brand, sub, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(10, 10, 492, 140);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 54px Georgia, serif'; x.fillText(brand, 256, 68);
  x.font = '24px Georgia, serif'; x.fillText(sub, 256, 118);
  for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(60,40,20,${Math.random() * 0.08})`; x.fillRect(Math.random() * 512, Math.random() * 160, 2, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = 2;
  return t;
}

// ---------- Bottles ----------
const BOTTLES = {
  wine:    { profile: [P(0, 0), P(0.13, 0), P(0.145, 0.02), P(0.145, 0.62), P(0.13, 0.74), P(0.075, 0.84), P(0.05, 0.9), P(0.048, 1.12), P(0.056, 1.14), P(0.056, 1.17), P(0, 1.17)], label: [0.18, 0.48], fill: 0.66 },
  whiskey: { profile: [P(0, 0), P(0.16, 0), P(0.17, 0.02), P(0.17, 0.56), P(0.15, 0.64), P(0.07, 0.72), P(0.055, 0.76), P(0.052, 0.94), P(0.06, 0.95), P(0.06, 0.99), P(0, 0.99)], label: [0.14, 0.44], fill: 0.55 },
  beer:    { profile: [P(0, 0), P(0.11, 0), P(0.12, 0.02), P(0.12, 0.5), P(0.1, 0.6), P(0.05, 0.74), P(0.042, 0.9), P(0.048, 0.92), P(0.048, 0.95), P(0, 0.95)], label: [0.12, 0.36], fill: 0.7 },
  gin:     { profile: [P(0, 0), P(0.15, 0), P(0.155, 0.02), P(0.155, 0.7), P(0.12, 0.76), P(0.06, 0.8), P(0.05, 0.84), P(0.05, 0.96), P(0, 0.96)], label: [0.2, 0.5], fill: 0.6 },
};
const BRANDS = [
  ['OLD OAK', 'Single Malt · 12 yrs', '#e9dcc0', '#3a2410'], ['HUKUM', 'Dry Gin', '#f2efe6', '#1f3f6b'],
  ['KING’S RESERVE', 'Blended Whisky', '#1a1a1a', '#d6aa5a'], ['SPADE RUM', 'Dark · Spiced', '#5c1a12', '#f2d79a'],
  ['ROUGE', 'Vin de table', '#efe6d4', '#7a1b2a'], ['GOLDEN ACE', 'Lager', '#c9a14a', '#2a1a08'],
];
// [glass tint, glass opacity, liquid colour, liquid opacity]
const BOTTLE_LOOK = {
  wine: [0x1f3d1a, 0.62, 0x4a0a12, 0.95],
  whiskey: [0xf2ece0, 0.22, 0xa8520e, 0.9],
  beer: [0x5a2f0a, 0.7, 0xc8861a, 0.95],
  gin: [0xdcefea, 0.2, 0xeef6f6, 0.35],
};

export function makeBottle(kind = 'whiskey', brandIndex = 0) {
  const b = BOTTLES[kind];
  const [gTint, gOp, lCol, lOp] = BOTTLE_LOOK[kind];
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.LatheGeometry(b.profile, 32), glassMaterial(gTint, gOp));
  glass.renderOrder = GLASS_ORDER;
  glass.castShadow = true;
  g.add(glass);

  const top = b.profile[b.profile.length - 1].y;
  const fillY = top * b.fill;
  const inner = b.profile.filter((p) => p.y <= fillY).map((p) => P(Math.max(0, p.x - 0.012), Math.max(0.015, p.y)));
  inner.push(P(inner[inner.length - 1].x, fillY), P(0, fillY));
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(inner, 32), liquidMaterial(lCol, lOp));
  liquid.renderOrder = LIQUID_ORDER;
  g.add(liquid);

  const [ly0, ly1] = b.label;
  const r = b.profile[3].x + 0.003;
  const [brand, sub, bg, fg] = BRANDS[brandIndex % BRANDS.length];
  const label = new THREE.Mesh(new THREE.CylinderGeometry(r, r, ly1 - ly0, 32, 1, true, -Math.PI * 0.55, Math.PI * 1.1),
    new THREE.MeshStandardMaterial({ map: labelTexture(brand, sub, bg, fg), roughness: 0.85 }));
  label.position.y = (ly0 + ly1) / 2;
  g.add(label);

  const capColor = kind === 'beer' ? 0xb8b8b8 : kind === 'wine' ? 0x6b1020 : 0x2a1a0e;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 16),
    new THREE.MeshStandardMaterial({ color: capColor, roughness: kind === 'beer' ? 0.3 : 0.7, metalness: kind === 'beer' ? 0.9 : 0 }));
  cap.position.y = top + 0.02;
  g.add(cap);
  return g;
}

// ---------- Drinking glasses ----------
// Each glass is a closed, thick-walled outline (outside up, over the rim, inside down) so the
// rim and the heavy base read as real glass. `inner` is the inside wall the drink fills.
// grip = where a hand holds it (local +X side): the mug's handle, the tumbler's side.
// mouth = the rim (height and radius) that touches the drinker's lips.
const GLASSES = {
  // Heavy glass beer mug with a handle.
  beer: {
    outline: [P(0, 0), P(0.172, 0), P(0.182, 0.016), P(0.182, 0.45), P(0.176, 0.462), P(0.164, 0.462), P(0.16, 0.45),
      P(0.154, 0.075), P(0, 0.075)],
    inner: [P(0.154, 0.075), P(0.16, 0.45)],
    base: 0.075, rim: 0.45, maxFill: 0.33, facets: 48,
    grip: { x: 0.3, y: 0.26 }, mouth: { y: 0.462, r: 0.17 },
  },
  // Old-fashioned / rocks glass: short, wide, very heavy base.
  whiskey: {
    outline: [P(0, 0), P(0.19, 0), P(0.2, 0.014), P(0.207, 0.32), P(0.195, 0.32), P(0.189, 0.3), P(0.184, 0.085), P(0, 0.085)],
    inner: [P(0.184, 0.085), P(0.189, 0.3)],
    base: 0.085, rim: 0.3, maxFill: 0.13, facets: 40,
    grip: { x: 0.235, y: 0.16 }, mouth: { y: 0.32, r: 0.2 },
  },
};

// Radius of the inside wall at height y (for filling it with liquid).
function innerRadius(inner, y) {
  for (let i = 1; i < inner.length; i++) {
    const a = inner[i - 1], b = inner[i];
    if (y <= b.y) return a.x + (b.x - a.x) * ((y - a.y) / Math.max(1e-6, b.y - a.y));
  }
  return inner[inner.length - 1].x;
}

// Mug handle: a thick glass "D" on the +X side.
function mugHandle(mat) {
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.032, 12, 28, Math.PI), mat);
  loop.rotation.z = -Math.PI / 2;
  loop.position.set(0.17, 0.26, 0);
  loop.renderOrder = GLASS_ORDER;
  loop.castShadow = true;
  return loop;
}

const _wq = new THREE.Quaternion(), _wp = new THREE.Vector3(), _n = new THREE.Vector3();

/**
 * Beer mug (with foam and bubbles) or whiskey on the rocks. setLevel(0..1) empties it.
 * The drink's surface stays level when the glass tips, and sloshes when the glass moves.
 * Call update(t, dt) every frame after the glass has been placed.
 */
export function makeDrink(type) {
  const spec = GLASSES[type] || GLASSES.beer;
  const g = new THREE.Group();

  const gMat = glassMaterial(0xffffff, type === 'whiskey' ? 0.26 : 0.22);
  const glass = new THREE.Mesh(new THREE.LatheGeometry(spec.outline, spec.facets), gMat);
  glass.renderOrder = GLASS_ORDER;
  glass.castShadow = true;
  g.add(glass);
  if (type === 'beer') g.add(mugHandle(glassMaterial(0xffffff, 0.3)));

  // Liquid: the whole inside of the glass, built once. Each frame every vertex is pushed down
  // to the drink's surface plane, so the same mesh shows any level and any tilt.
  const N = 18;
  const pts = [P(0, spec.base), P(innerRadius(spec.inner, spec.base) - 0.004, spec.base)];
  for (let i = 1; i <= N; i++) {
    const y = spec.base + ((spec.rim - spec.base) * i) / N;
    pts.push(P(innerRadius(spec.inner, y) - 0.004, y));
  }
  const rTop = innerRadius(spec.inner, spec.rim) - 0.004;
  for (const f of [0.75, 0.5, 0.25, 0]) pts.push(P(rTop * f, spec.rim));
  const lgeo = new THREE.LatheGeometry(pts, 36);
  const base = Float32Array.from(lgeo.attributes.position.array);
  const vcount = base.length / 3;
  const isTop = new Uint8Array(vcount);
  for (let v = 0; v < vcount; v++) isTop[v] = Math.abs(base[v * 3 + 1] - spec.rim) < 1e-5 && Math.hypot(base[v * 3], base[v * 3 + 2]) < rTop * 0.8 ? 1 : 0;
  const liquid = new THREE.Mesh(lgeo,
    type === 'whiskey' ? liquidMaterial(0xa04e0c, 0.88, 0.12) : liquidMaterial(0xd28d1a, 0.94, 0.18));
  liquid.renderOrder = LIQUID_ORDER;
  liquid.frustumCulled = false;
  g.add(liquid);

  let foam = null, bubbles = null, ice = null;
  if (type === 'whiskey') {
    ice = new THREE.Group();
    const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.12, transparent: true, opacity: 0.6, clearcoat: 1, envMapIntensity: 2 });
    for (const [x, z, ry] of [[-0.06, 0.03, 0.4], [0.07, -0.04, 1.1], [0.0, 0.08, 2.0]]) {
      const cube = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.09, 0.1, 2, 0.02), iceMat);
      cube.position.set(x, 0, z);
      cube.rotation.set(0.3, ry, 0.2);
      cube.renderOrder = LIQUID_ORDER;
      ice.add(cube);
    }
    g.add(ice);
  } else {
    foam = new THREE.Group();
    const foamMat = new THREE.MeshStandardMaterial({ color: 0xf6eedc, roughness: 0.95 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 32), foamMat);
    head.position.y = 0.025;
    foam.add(head);
    const blobs = new THREE.Group();
    // A few soft, flattened domes on top of the head.
    for (let i = 0; i < 7; i++) {
      const bub = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.018, 10, 6), foamMat);
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.08;
      bub.position.set(Math.cos(a) * r, 0.045, Math.sin(a) * r);
      bub.scale.y = 0.45;
      blobs.add(bub);
    }
    foam.add(blobs);
    foam.userData.head = head;
    g.add(foam);
    const n = 36;
    bubbles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)),
      new THREE.PointsMaterial({ color: 0xfff6d0, size: 0.012, transparent: true, opacity: 0.85, depthWrite: false }));
    bubbles.userData.seed = Array.from({ length: n }, () => [Math.random() * Math.PI * 2, Math.random() * 0.09, Math.random()]);
    bubbles.renderOrder = LIQUID_ORDER;
    bubbles.frustumCulled = false;
    g.add(bubbles);
  }

  let level = 1;
  // Slosh: the surface normal is a damped spring pulled by the glass's acceleration.
  const slosh = { s: new THREE.Vector2(), v: new THREE.Vector2(), prev: null, vel: new THREE.Vector3(), ripple: 0 };
  const up = new THREE.Vector3();

  function surface(t) {
    const h0 = spec.base + spec.maxFill * level;
    const visible = level > 0.02;
    liquid.visible = visible;
    // Surface normal in the glass's own frame: world up (+ slosh), seen from the tipped glass.
    g.getWorldQuaternion(_wq);
    up.set(slosh.s.x, 1, slosh.s.y).normalize().applyQuaternion(_wq.invert());
    const ny = Math.max(0.18, up.y);
    const pos = liquid.geometry.attributes.position, nrm = liquid.geometry.attributes.normal;
    const amp = slosh.ripple;
    for (let i = 0, v = 0; i < base.length; i += 3, v++) {
      const x = base[i], z = base[i + 2];
      let sy = h0 - (up.x * x + up.z * z) / ny;
      if (amp > 0.0005) sy += amp * Math.sin(Math.hypot(x, z) * 40 - t * 14);
      pos.array[i + 1] = Math.max(spec.base, Math.min(base[i + 1], sy));
      if (isTop[v]) nrm.setXYZ(v, up.x, ny, up.z);
    }
    pos.needsUpdate = true;
    nrm.needsUpdate = true;
    if (foam) {
      foam.visible = visible;
      const r = innerRadius(spec.inner, h0) - 0.008;
      foam.position.set(0, Math.min(h0, spec.rim - 0.03), 0);
      foam.quaternion.setFromUnitVectors(_n.set(0, 1, 0), up);
      foam.userData.head.scale.set(r, 0.5 + level * 0.5, r);
    }
    if (ice) {
      for (const c of ice.children) {
        const sy = h0 - (up.x * c.position.x + up.z * c.position.z) / ny;
        c.position.y = Math.max(spec.base + 0.045, Math.min(spec.rim - 0.04, sy - 0.02));
      }
    }
    return { h0, tipped: up.y < 0.93 };
  }

  surface(0);

  return {
    group: g,
    type,
    spec,
    // (Also redraws, so glasses that are never updated still show the right level.)
    setLevel(v) { const nv = THREE.MathUtils.clamp(v, 0, 1); if (nv !== level) { level = nv; surface(0); } },
    get level() { return level; },
    update(t, dt = 1 / 60) {
      dt = Math.min(0.05, Math.max(1e-3, dt));
      g.updateWorldMatrix(true, false);
      g.getWorldPosition(_wp);
      // The glass's acceleration (scene units/s², 1 unit ≈ 28 cm) tips the surface toward it;
      // a lightly damped spring makes it wobble back and forth before settling.
      if (slosh.prev) {
        const nv = _wp.clone().sub(slosh.prev).divideScalar(dt);
        const acc = nv.clone().sub(slosh.vel).divideScalar(dt);
        slosh.vel.copy(nv);
        const tx = THREE.MathUtils.clamp(acc.x * 0.01, -0.4, 0.4);
        const tz = THREE.MathUtils.clamp(acc.z * 0.01, -0.4, 0.4);
        slosh.v.x += (70 * (tx - slosh.s.x) - 2.4 * slosh.v.x) * dt;
        slosh.v.y += (70 * (tz - slosh.s.y) - 2.4 * slosh.v.y) * dt;
        slosh.s.x = THREE.MathUtils.clamp(slosh.s.x + slosh.v.x * dt, -0.6, 0.6);
        slosh.s.y = THREE.MathUtils.clamp(slosh.s.y + slosh.v.y * dt, -0.6, 0.6);
        // Little ripples while it's moving, fading out after.
        slosh.ripple = Math.min(0.012, slosh.ripple * Math.exp(-dt * 1.5) + Math.min(nv.length(), 4) * 0.004 * dt);
      } else slosh.prev = new THREE.Vector3();
      slosh.prev.copy(_wp);
      const { h0, tipped } = surface(t);

      if (!bubbles) return;
      bubbles.visible = level > 0.05 && !tipped;
      if (!bubbles.visible) return;
      const p = bubbles.geometry.attributes.position;
      const h = h0 - spec.base;
      bubbles.userData.seed.forEach(([a, r, o], i) => {
        const y = ((t * 0.18 + o) % 1) * h;
        const rr = Math.min(r, innerRadius(spec.inner, spec.base + y) - 0.02);
        p.setXYZ(i, Math.cos(a) * rr, spec.base + y, Math.sin(a) * rr);
      });
      p.needsUpdate = true;
    },
  };
}
