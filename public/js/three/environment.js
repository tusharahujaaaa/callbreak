// The room: a dim bar lit by one swinging lamp over the table, a back bar with bottles,
// a neon sign, smoke drifting through the light beam.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { brickTexture, plankTexture, neonTexture, smokeTexture, posterTexture } from './textures.js';
import { makeBottle } from './props.js';
import { buildFurniture } from './furniture.js';
import { createPatrons } from './patrons.js';

export const FLOOR_Y = -2.7;
const SPOT_I = 72; // brightness of the lamp over the table
const ROOM = { w: 26, d: 26, h: 13 };
const CEIL_Y = FLOOR_Y + ROOM.h;

function shadowed(m, cast = true) { m.castShadow = cast; m.receiveShadow = true; return m; }

function buildRoom(scene) {
  const floorTex = plankTexture(false);
  floorTex.repeat.set(5, 5);
  const floor = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 })), false);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  scene.add(floor);

  const ceilTex = plankTexture(true);
  ceilTex.repeat.set(4, 4);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d),
    new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.9 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEIL_Y;
  scene.add(ceil);

  // Ceiling beams.
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x24160d, roughness: 0.8 });
  for (const x of [-8, -2.5, 2.5, 8]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, ROOM.d), beamMat);
    beam.position.set(x, CEIL_Y - 0.35, 0);
    scene.add(beam);
  }

  const brick = brickTexture();
  const wallMat = (rx) => {
    const t = brick.clone();
    t.needsUpdate = true;
    t.repeat.set(rx, 3);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  };
  const walls = [
    { pos: [0, 0, -ROOM.d / 2], rot: 0 },
    { pos: [0, 0, ROOM.d / 2], rot: Math.PI },
    { pos: [-ROOM.w / 2, 0, 0], rot: Math.PI / 2 },
    { pos: [ROOM.w / 2, 0, 0], rot: -Math.PI / 2 },
  ];
  for (const w of walls) {
    const m = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.h), wallMat(5)), false);
    m.position.set(w.pos[0], FLOOR_Y + ROOM.h / 2, w.pos[2]);
    m.rotation.y = w.rot;
    scene.add(m);
    // Wooden wainscot along the bottom.
    const wains = shadowed(new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 2.4, 0.15),
      new THREE.MeshStandardMaterial({ map: plankTexture(true), roughness: 0.7 })), false);
    wains.position.set(w.pos[0] * 0.995, FLOOR_Y + 1.2, w.pos[2] * 0.995);
    wains.rotation.y = w.rot;
    scene.add(wains);
  }
}

function buildBackBar(scene) {
  const z = -ROOM.d / 2 + 1.2;
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x4a2814, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const counter = shadowed(new THREE.Mesh(new RoundedBoxGeometry(14, 3.0, 1.6, 3, 0.08), wood));
  counter.position.set(0, FLOOR_Y + 1.5, z + 1.6);
  const top = shadowed(new THREE.Mesh(new RoundedBoxGeometry(14.4, 0.15, 1.9, 3, 0.05),
    new THREE.MeshPhysicalMaterial({ color: 0x2a140a, roughness: 0.25, clearcoat: 1 })));
  top.position.set(0, FLOOR_Y + 3.05, z + 1.6);
  scene.add(counter, top);

  // Shelves with bottles, back-lit.
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x2b170c, roughness: 0.6 });
  // Real-looking bottles on the shelves: wine, whiskey, gin and beer, with labels and liquid.
  const kinds = ['whiskey', 'wine', 'gin', 'whiskey', 'beer', 'wine'];
  for (const [i, y] of [4.6, 6.0, 7.4].entries()) {
    const shelf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.7), shelfMat));
    shelf.position.set(0, FLOOR_Y + y, z - 0.6);
    scene.add(shelf);
    for (let b = 0; b < 13; b++) {
      if ((b * 7 + i * 3) % 9 === 0) continue; // a few gaps
      const kind = kinds[(b + i * 2) % kinds.length];
      const bottle = makeBottle(kind, b + i);
      bottle.scale.setScalar(1.15);
      bottle.position.set(-5.4 + b * 0.9 + (Math.random() - 0.5) * 0.12, FLOOR_Y + y + 0.06, z - 0.6 + (Math.random() - 0.5) * 0.15);
      bottle.rotation.y = (Math.random() - 0.5) * 0.8;
      scene.add(bottle);
    }
  }
  // A few on the counter too.
  for (const [x, kind] of [[-3.2, 'whiskey'], [-2.7, 'gin'], [3.8, 'wine']]) {
    const bottle = makeBottle(kind, Math.abs(x * 3) | 0);
    bottle.scale.setScalar(1.2);
    bottle.position.set(x, FLOOR_Y + 3.12, z + 1.4);
    scene.add(bottle);
  }
  const shelfGlow = new THREE.PointLight(0xffa860, 14, 9, 1.8);
  shelfGlow.position.set(0, FLOOR_Y + 6, z + 0.6);
  scene.add(shelfGlow);

  // Neon sign.
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.25),
    new THREE.MeshBasicMaterial({ map: neonTexture('LAKDI', '♠ CALLBREAK ♠'), transparent: true, depthWrite: false, toneMapped: false }));
  neon.position.set(0, FLOOR_Y + 9.4, -ROOM.d / 2 + 0.1);
  neon.material.color.setScalar(4.5); // over-bright so bloom picks it up
  scene.add(neon);
  const neonLight = new THREE.PointLight(0xff3b4e, 10, 12, 1.6);
  neonLight.position.set(0, FLOOR_Y + 9.2, -ROOM.d / 2 + 1.2);
  scene.add(neonLight);
  return { neon, neonLight };
}

function buildPosters(scene) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d120a, roughness: 0.6 });
  const posters = [
    { x: -ROOM.w / 2 + 0.12, z: -4, ry: Math.PI / 2, tex: posterTexture('HUKUM', '♠', '#151515') },
    { x: -ROOM.w / 2 + 0.12, z: 4, ry: Math.PI / 2, tex: posterTexture('ACE HIGH', 'A', '#8b1e2d') },
    { x: ROOM.w / 2 - 0.12, z: -3, ry: -Math.PI / 2, tex: posterTexture('NO PASS', '♥', '#8b1e2d') },
    { x: ROOM.w / 2 - 0.12, z: 5, ry: -Math.PI / 2, tex: posterTexture('CALL IT', '♣', '#151515') },
  ];
  for (const p of posters) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.1, 0.12), frameMat);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.8), new THREE.MeshStandardMaterial({ map: p.tex, roughness: 0.9 }));
    art.position.z = 0.07;
    g.add(frame, art);
    g.position.set(p.x, FLOOR_Y + 5.6, p.z);
    g.rotation.set(0, p.ry, (Math.random() - 0.5) * 0.06);
    scene.add(g);
  }
}

// The lamp swings gently on its cord; the spotlight and light beam swing with it.
function buildLamp(scene) {
  const pivot = new THREE.Group();
  pivot.position.set(0, CEIL_Y, 0.3);
  scene.add(pivot);
  const cordLen = 4.3;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, cordLen, 6), new THREE.MeshStandardMaterial({ color: 0x0c0c0c }));
  cord.position.y = -cordLen / 2;
  pivot.add(cord);

  const lamp = new THREE.Group();
  lamp.position.y = -cordLen;
  pivot.add(lamp);
  const shade = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 1.25, 0.8, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x23402e, metalness: 0.75, roughness: 0.4, side: THREE.DoubleSide })));
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 1.23, 0.78, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc98a, emissiveIntensity: 0.9, side: THREE.BackSide }));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd8a0, emissiveIntensity: 6 }));
  bulb.position.y = -0.28;
  lamp.add(shade, inner, bulb);

  const spot = new THREE.SpotLight(0xffd29a, SPOT_I, 30, 0.62, 0.6, 1.5);
  spot.position.y = -0.3;
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0003;
  spot.shadow.normalBias = 0.02;
  lamp.add(spot);
  spot.target.position.set(0, 0, 0);
  scene.add(spot.target);

  // Fake volumetric beam.
  const beamH = 7.5;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 4.4, beamH, 48, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main() {
        float edge = pow(abs(dot(vN, vView)), 2.2);
        float fade = smoothstep(0.0, 0.35, vUv.y) * pow(vUv.y, 0.6);
        float flicker = 0.92 + 0.08 * sin(uTime * 13.0) * sin(uTime * 7.3);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * edge * fade * 0.036 * flicker, 1.0);
      }`,
  }));
  beam.position.y = -0.3 - beamH / 2;
  lamp.add(beam);

  return { pivot, bulb, beam, spot };
}

function buildSmoke(scene) {
  const tex = smokeTexture();
  const puffs = [];
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.22, color: 0xcfc2ad }));
    const r = 1 + Math.random() * 4.5, a = Math.random() * Math.PI * 2;
    m.position.set(Math.cos(a) * r, 1 + Math.random() * 6, Math.sin(a) * r);
    const s = 3 + Math.random() * 4;
    m.scale.set(s, s, 1);
    m.material.rotation = Math.random() * Math.PI;
    m.userData = { speed: 0.05 + Math.random() * 0.1, spin: (Math.random() - 0.5) * 0.08, base: m.position.clone(), phase: Math.random() * 10 };
    scene.add(m);
    puffs.push(m);
  }
  return puffs;
}

function buildDust(scene) {
  const n = 400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = Math.random() * 3.2, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.3 + Math.random() * 7;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffe2b0, size: 0.028, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);
  return dust;
}

export function buildEnvironment(scene, renderer) {
  scene.background = new THREE.Color(0x050403);
  scene.fog = new THREE.FogExp2(0x060403, 0.024);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.18;

  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x120a06, 0.3);
  scene.add(hemi);
  const rim = new THREE.DirectionalLight(0x6f8fff, 0.25);
  rim.position.set(-7, 6, -9);
  scene.add(rim);

  buildRoom(scene);
  const bar = buildBackBar(scene);
  buildPosters(scene);
  const lamp = buildLamp(scene);
  const furniture = buildFurniture(scene, FLOOR_Y, ROOM);
  const patrons = createPatrons(scene, furniture.sofaSeats);
  const smoke = buildSmoke(scene);
  const dust = buildDust(scene);
  let level = 1; // master light level (the intro fades the room up from dark)

  return {
    // 0 = dark room, 1 = normal. Used by the intro animation.
    setLevel(k) {
      level = k;
      scene.environmentIntensity = 0.18 * k;
      hemi.intensity = 0.3 * k;
      bar.neon.material.color.setScalar(4.5 * k);
    },
    update(t, dt) {
      // Pendulum swing.
      lamp.pivot.rotation.z = Math.sin(t * 0.75) * 0.045;
      lamp.pivot.rotation.x = Math.sin(t * 0.53 + 1) * 0.03;
      const flick = Math.random() < 0.004 ? 0.4 : 1; // the odd flicker
      lamp.bulb.material.emissiveIntensity = 5 * flick * level;
      lamp.spot.intensity = SPOT_I * level * (flick < 1 ? 0.7 : 1);
      lamp.beam.material.uniforms.uTime.value = t;
      bar.neonLight.intensity = (10 + Math.sin(t * 30) * Math.sin(t * 2.1) * 0.8) * level;

      for (const p of smoke) {
        const u = p.userData;
        p.position.y += u.speed * dt;
        p.position.x = u.base.x + Math.sin(t * 0.2 + u.phase) * 0.6;
        p.material.rotation += u.spin * dt;
        if (p.position.y > 8) p.position.y = 0.5;
        p.material.opacity = 0.12 * Math.sin(Math.min(1, (p.position.y - 0.5) / 7.5) * Math.PI);
      }
      furniture.update(t);
      patrons.update(t, dt);
      dust.rotation.y = t * 0.02;
      dust.position.y = Math.sin(t * 0.2) * 0.15;
    },
  };
}
