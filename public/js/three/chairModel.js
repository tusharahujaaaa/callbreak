// The royal chair, modelled in Blender (public/models/royal_chair.glb). Origin = floor under the seat,
// front toward +Z. The game's simple built-in chair stays in place if the model can't load.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let loading = null;
export const CHAIR_URL = '/models/royal_chair.glb';

export function makeRoyalChair() {
  if (!loading) loading = new Promise((res, rej) => new GLTFLoader().load(CHAIR_URL, (g) => res(g.scene), undefined, rej));
  return loading.then((src) => {
    const chair = src.clone(true);
    chair.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.sharedGeometry = true; } });
    return chair;
  });
}
