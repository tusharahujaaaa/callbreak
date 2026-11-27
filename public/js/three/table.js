// The round card table: felt top, polished wooden rail, pedestal, plus turn ring and dealer chip.
import * as THREE from 'three';
import { feltTexture, woodTexture, chipTexture, medallionTexture } from './textures.js';
import { tween, ease } from './tween.js';
import { TABLE_R, tablePoint } from './layout.js';
import { FLOOR_Y } from './environment.js';

export function buildTable(scene) {
  const group = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({
    map: woodTexture(), color: 0x956646, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12,
  });

  // Felt top (surface at y = 0).
  const felt = new THREE.Mesh(new THREE.CircleGeometry(TABLE_R, 128),
    new THREE.MeshStandardMaterial({ map: feltTexture(), color: 0xb4b4b4, roughness: 0.92 }));
  felt.rotation.x = -Math.PI / 2;
  felt.receiveShadow = true;
  group.add(felt);

  // Padded rail.
  const rail = new THREE.Mesh(new THREE.TorusGeometry(TABLE_R + 0.18, 0.24, 32, 160), wood);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.06;
  rail.castShadow = rail.receiveShadow = true;
  group.add(rail);

  // Gold inlay line inside the rail.
  const inlay = new THREE.Mesh(new THREE.TorusGeometry(TABLE_R - 0.02, 0.025, 8, 160),
    new THREE.MeshStandardMaterial({ color: 0xd6aa5a, metalness: 1, roughness: 0.3 }));
  inlay.rotation.x = Math.PI / 2;
  inlay.position.y = 0.01;
  group.add(inlay);

  // Apron, pedestal, foot.
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R + 0.3, TABLE_R - 0.4, 0.55, 96), wood);
  apron.position.y = -0.3;
  apron.castShadow = apron.receiveShadow = true;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, Math.abs(FLOOR_Y) - 0.6, 32), wood);
  post.position.y = (FLOOR_Y - 0.55) / 2;
  post.castShadow = true;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 0.22, 48), wood);
  foot.position.y = FLOOR_Y + 0.11;
  foot.castShadow = foot.receiveShadow = true;
  group.add(apron, post, foot);

  // Ashtray. (Each seat's drink is managed by drinks.js: beer or whiskey, refilled by the waiter.)
  const ashtray = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.08, 24),
    new THREE.MeshPhysicalMaterial({ color: 0x2c3a33, roughness: 0.15, metalness: 0.2, clearcoat: 1 }));
  ashtray.position.set(2.2, 0.04, 2.2);
  ashtray.castShadow = true;
  group.add(ashtray);

  scene.add(group);

  // Glowing ring showing whose turn it is.
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 64),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // Dealer chip.
  const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 40), [
    new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.4, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: chipTexture('D'), metalness: 0.2, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ color: 0xf2c14e }),
  ]);
  chip.castShadow = true;
  chip.visible = false;
  scene.add(chip);

  // Trump medallion in the centre of the table.
  const medal = new THREE.Group();
  const medalTop = new THREE.MeshStandardMaterial({ map: medallionTexture(null), emissiveMap: medallionTexture(null), emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.45, metalness: 0.2 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.05, 64), [
    new THREE.MeshStandardMaterial({ color: 0xd6aa5a, metalness: 1, roughness: 0.3 }), medalTop,
    new THREE.MeshStandardMaterial({ color: 0x1a110a }),
  ]);
  disc.position.y = 0.025;
  disc.castShadow = true;
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.78, 64),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.006;
  medal.add(disc, halo);
  scene.add(medal);
  let trumpShown;
  let revealing = false;

  let ringTarget = null;
  let chipTarget = null;

  return {
    // Show the trump suit (null = not chosen yet). animate = flip it up for the reveal.
    setTrump(suitLetter, animate) {
      if (suitLetter === trumpShown) return;
      trumpShown = suitLetter;
      const apply = () => {
        const tex = medallionTexture(suitLetter);
        medalTop.map = tex;
        medalTop.emissiveMap = tex;
        medalTop.needsUpdate = true;
        halo.material.color.set(suitLetter === 'H' || suitLetter === 'D' ? 0xff4a62 : 0xf2c14e);
      };
      if (!animate) { apply(); return; }
      revealing = true;
      // Rise and spin, swap the face at the top, drop back with a bounce.
      tween({ duration: 650, ease: ease.outCubic, update(k) { medal.position.y = k * 1.3; disc.rotation.z = k * Math.PI * 3; }, done: apply });
      tween({ duration: 700, delay: 650, ease: ease.outBack, update(k) { medal.position.y = 1.3 * (1 - k); disc.rotation.z = Math.PI * 3 + k * Math.PI; },
        done: () => { medal.position.y = 0; disc.rotation.z = 0; revealing = false; halo.material.opacity = 0.5; } });
    },

    setTurn(r) {
      ring.visible = r !== null && r !== undefined;
      if (ring.visible) ringTarget = tablePoint(r, TABLE_R - 0.75, 0.015);
    },
    setDealer(r) {
      chip.visible = r !== null && r !== undefined;
      if (!chip.visible) return;
      const p = tablePoint(r, TABLE_R - 0.55, 0.035);
      // Offset sideways so it doesn't sit under the turn ring.
      const side = new THREE.Vector3(-p.z, 0, p.x).normalize().multiplyScalar(0.75);
      chipTarget = p.add(side);
    },
    update(t, dt) {
      // Trump medallion glows and slowly turns.
      medalTop.emissiveIntensity = 0.65 + Math.sin(t * 2.2) * 0.25;
      if (!revealing) medal.rotation.y = t * 0.15;
      halo.material.opacity += ((0.15 + Math.sin(t * 2.2) * 0.05) - halo.material.opacity) * Math.min(1, dt * 2);
      if (ringTarget) {
        ring.position.lerp(ringTarget, ring.position.lengthSq() < 0.01 ? 1 : Math.min(1, dt * 8));
        ring.material.opacity = 0.55 + Math.sin(t * 4) * 0.3;
        const s = 1 + Math.sin(t * 4) * 0.08;
        ring.scale.set(s, s, s);
      }
      if (chipTarget) chip.position.lerp(chipTarget, chip.position.lengthSq() < 0.01 ? 1 : Math.min(1, dt * 5));
    },
  };
}
