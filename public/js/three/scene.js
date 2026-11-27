// Entry point for the 3D table: renderer, first-person camera, post-processing,
// your 3D hand (hover + click to play), render loop, and floating name labels.
import * as THREE from 'three';
import { buildEnvironment } from './environment.js';
import { buildTable } from './table.js';
import { createTableView } from './tableView.js';
import { createCameraRig } from './cameraRig.js';
import { createMyHand } from './myHand.js';
import { createPostFX } from './postfx.js';
import { createBarView } from './drinks.js';
import { SIP_S } from './modelCharacter.js';
import { updateTweens } from './tween.js';
import { setAnisotropy } from './textures.js';

/**
 * @param container element to draw into
 * @param onPlay    called with a card id when you click a playable card
 */
// Graphics quality (per device): 'high' (default) or 'low' for weaker computers.
export const graphicsQuality = () => (localStorage.getItem('lakdi.gfx') === 'low' ? 'low' : 'high');

export function createTable3D(container, { onPlay } = {}) {
  let low = graphicsQuality() === 'low';
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const pixelRatioFor = (isLow) => (isLow ? 1 : Math.min(window.devicePixelRatio, 1.75));
  let pixelRatio = pixelRatioFor(low);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  container.appendChild(renderer.domElement);
  setAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const rig = createCameraRig(scene);
  const camera = rig.camera;
  const env = buildEnvironment(scene, renderer);
  const table = buildTable(scene);
  const myHand = createMyHand(camera);
  const post = createPostFX(renderer, scene, camera, { bloom: !low });
  const view = createTableView(scene, table, { myHand, rig, post });
  const barView = createBarView(scene, camera);
  // Graphics quality, switchable live (no reload): resolution, glow and shadow detail.
  function applyQuality() {
    pixelRatio = pixelRatioFor(low);
    renderer.setPixelRatio(pixelRatio);
    post.setBloom(!low);
    const size = low ? 1024 : 2048;
    scene.traverse((o) => {
      if (o.isLight && o.shadow && o.shadow.mapSize.x !== size) {
        o.shadow.mapSize.set(size, size);
        if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
      }
    });
    resize();
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    post.setSize(w, h, pixelRatio);
    rig.resize(w / h);
    myHand.resize(w / h);
  }
  new ResizeObserver(resize).observe(container);
  resize();
  if (low) applyQuality();

  // ----- Mouse: look around + pick cards -----
  const ndc = new THREE.Vector2(-9, -9);
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    rig.setMouse(nx, ny);
    ndc.set(nx, -ny);
  });
  canvas.addEventListener('pointerleave', () => ndc.set(-9, -9));
  canvas.addEventListener('click', () => {
    const card = myHand.pick();
    if (card && onPlay) onPlay(card);
  });

  // ----- Name labels follow each character's head -----
  const labelVec = new THREE.Vector3();
  function placeLabels() {
    const w = container.clientWidth, h = container.clientHeight;
    for (let r = 1; r < 4; r++) {
      const c = view.chars[r];
      const el = document.getElementById('seat' + r);
      if (!c || !el) continue;
      c.labelAnchor.getWorldPosition(labelVec);
      labelVec.project(camera);
      const behind = labelVec.z > 1;
      const ew = el.offsetWidth, eh = el.offsetHeight;
      const x = THREE.MathUtils.clamp(((labelVec.x + 1) / 2) * w, ew / 2 + 6, w - ew / 2 - 6);
      const y = THREE.MathUtils.clamp(((1 - labelVec.y) / 2) * h, eh + 58, h - 140);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = behind ? 0 : 1;
    }
  }

  // ----- Start animation: title card fades away while the camera flies in and the lights come up -----
  const INTRO_S = 3.6;
  let introOn = false;
  function titleCard() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none;display:flex;flex-direction:column;'
      + 'align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#32090f 0%,#050203 72%);'
      + 'color:#e9c46a;font-family:Georgia,"Times New Roman",serif;opacity:1;transition:opacity 1.4s ease 1.0s;';
    el.innerHTML = '<div class="t" style="font-size:clamp(40px,9vw,110px);letter-spacing:.35em;padding-left:.35em;'
      + 'text-shadow:0 0 30px rgba(233,196,106,.55);transform:scale(.9);transition:transform 3s ease-out">LAKDI</div>'
      + '<div style="margin-top:14px;font-size:clamp(14px,2.2vw,26px);letter-spacing:.6em;padding-left:.6em;opacity:.85">\u2660 CALLBREAK \u2660</div>';
    document.body.appendChild(el);
    el.getBoundingClientRect(); // make the browser commit the starting state
    el.style.opacity = '0';
    el.firstChild.style.transform = 'scale(1.06)';
    setTimeout(() => el.remove(), 3000);
  }
  function playIntro() {
    rig.intro(INTRO_S);
    introOn = true;
    env.setLevel(0.1);
    myHand.setEnabled(false);
    titleCard();
  }
  const smooth01 = (k, a, b) => THREE.MathUtils.smoothstep(k, a, b);

  const timer = new THREE.Timer();
  timer.connect(document);
  let t = 0;
  let hoverCursor = false;
  let lastState = null;
  // Developer option: add ?sips to the URL to make sips frequent (for checking the animation).
  const SIP_GAP = new URLSearchParams(location.search).has('sips') ? [2, 2] : [14, 22];
  let nextSip = SIP_GAP[0] * 0.6 + Math.random() * 10 * (SIP_GAP[0] > 2);
  // Player r (relative seat, not you) picks up their glass and drinks.
  function sipFor(r) {
    const c = view.chars[r], g = barView.glass(r);
    if (!c || !g || !c.canSip() || barView.levelOf(r) < 0.05) return false;
    if (!c.sip(g, barView.homePos(r), barView.homeQuat(r))) return false;
    barView.hold(r, SIP_S);
    return true;
  }
  barView.onSip((r) => (r === 0 ? barView.sipMine() : sipFor(r)));
  function maybeSip() {
    if (t < nextSip || !lastState || !lastState.game) return;
    nextSip = t + SIP_GAP[0] + Math.random() * SIP_GAP[1];
    const g = lastState.game;
    const turnRel = g.turn >= 0 ? (g.turn - lastState.mySeat + 4) % 4 : -1;
    // Bots drink now and then (people drink when they press Drink).
    const who = [1, 2, 3].filter((r) => r !== turnRel && lastState.seats[(lastState.mySeat + r) % 4]?.kind === 'bot'
      && view.chars[r] && view.chars[r].canSip() && barView.levelOf(r) > 0.08 && !barView.isSipping(r));
    if (who.length) sipFor(who[Math.floor(Math.random() * who.length)]);
  }
  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(0.05, timer.getDelta());
    t += dt;
    updateTweens(performance.now());
    env.update(t, dt);
    table.update(t, dt);
    rig.update(t, dt);
    if (introOn) {
      const p = rig.introProgress();
      env.setLevel(0.1 + 0.9 * smooth01(p, 0.05, 0.8));
      if (p > 0.55) myHand.setEnabled(true);
      if (p >= 1) { introOn = false; env.setLevel(1); myHand.setEnabled(true); }
    }
    view.update(t, dt);
    maybeSip();
    barView.update(t, dt);
    scene.updateMatrixWorld();
    const hovered = myHand.hover(ndc, camera);
    const canPlay = !!(hovered && myHand.pick());
    if (canPlay !== hoverCursor) { hoverCursor = canPlay; canvas.style.cursor = canPlay ? 'pointer' : 'default'; }
    post.render(t, dt);
    placeLabels();
  });

  return {
    sync: (state) => { lastState = state; view.sync(state); barView.sync(state); },
    reset: () => view.reset(),
    playIntro,
    // Your own sip (first person).
    sipMine: () => barView.sipMine(),
    canSipMine: () => barView.levelOf(0) > 0.05 && !barView.isSipping(0),
    setQuality(q) {
      low = q === 'low';
      localStorage.setItem('lakdi.gfx', low ? 'low' : 'high');
      applyQuality();
    },
  };
}
