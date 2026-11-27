// Post-processing: bloom on bright lights, then a film pass (vignette, grain, warm grade,
// slight chromatic fringe) for a moody, cinematic look.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.62 },
    uGrain: { value: 0.045 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 0.8, 0.4) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uFlash; uniform vec3 uFlashColor;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float ca = 0.0035 * dot(d, d) * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + d * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - d * ca).b;
      // Warm, slightly crushed grade.
      col = pow(col, vec3(1.06));
      col *= vec3(1.07, 0.99, 0.86);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 1.08);
      // Vignette.
      float v = smoothstep(0.95, 0.2, length(d * vec2(1.05, 1.25)));
      col *= mix(1.0 - uVignette, 1.0, v);
      // Event flash (e.g. winning a trick).
      col += uFlashColor * uFlash * (1.0 - v * 0.6) * 0.35;
      // Film grain.
      col += (rand(vUv * vec2(1024.0, 768.0) + fract(uTime * 7.0)) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPostFX(renderer, scene, camera, { bloom: useBloom = true } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // High threshold: only real light sources (bulb, neon, medallion) glow; cards and felt never do.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 2.6);
  composer.addPass(bloom);
  bloom.enabled = useBloom; // off on Low graphics (switchable live)
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  let flash = 0;
  return {
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
    setBloom(on) { bloom.enabled = on; },
    flash(color = 0xffcf66, amount = 1) {
      film.uniforms.uFlashColor.value.set(color);
      flash = amount;
    },
    render(t, dt) {
      flash = Math.max(0, flash - dt * 2.2);
      film.uniforms.uFlash.value = flash;
      film.uniforms.uTime.value = t;
      composer.render(dt);
    },
  };
}
