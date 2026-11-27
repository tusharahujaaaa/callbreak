// 3D playing-card meshes (front and back planes, rounded corners via alpha).
import * as THREE from 'three';
import { cardFaceTexture, cardBackTexture } from './textures.js';

export const CARD_W = 0.62;
export const CARD_H = 0.87;
export const CARD_TINT = 0xecebe6;

const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
const faceMaterials = new Map();
let backMaterial = null;
let blankMaterial = null;

function material(map) {
  // Coated card stock: near-white with a soft satin sheen.
  return new THREE.MeshPhysicalMaterial({ map, color: CARD_TINT, alphaTest: 0.5, roughness: 0.48, metalness: 0,
    clearcoat: 0.25, clearcoatRoughness: 0.35, side: THREE.FrontSide });
}

function faceMaterial(card) {
  if (!card) {
    if (!blankMaterial) blankMaterial = backMat();
    return blankMaterial;
  }
  if (!faceMaterials.has(card)) faceMaterials.set(card, material(cardFaceTexture(card)));
  return faceMaterials.get(card);
}

function backMat() {
  if (!backMaterial) backMaterial = material(cardBackTexture());
  return backMaterial;
}

/**
 * A card whose face points along local +Z (back along -Z).
 * card = "S14" etc, or null for an unknown card (back on both sides).
 */
export function makeCard(card = null, { ownMaterial = false } = {}) {
  const g = new THREE.Group();
  // ownMaterial: a private copy, so this card can be tinted without affecting others.
  const front = new THREE.Mesh(geometry, ownMaterial ? faceMaterial(card).clone() : faceMaterial(card));
  front.position.z = 0.002;
  const back = new THREE.Mesh(geometry, backMat());
  back.rotation.y = Math.PI;
  back.position.z = -0.002;
  front.castShadow = back.castShadow = true;
  g.add(front, back);
  g.userData.front = front;
  g.userData.setCard = (c) => { front.material = faceMaterial(c); };
  return g;
}

// Orientation helpers for cards lying on the table.
export const FACE_UP = new THREE.Euler(-Math.PI / 2, 0, 0);
export const FACE_DOWN = new THREE.Euler(Math.PI / 2, 0, 0);
