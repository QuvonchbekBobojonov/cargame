/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldRegionId } from '../types/game';
import {
  createCitySpire,
  createTashkentTVTower,
  createKhivaKaltaMinor,
  createIchanQalaGate,
  createStreetLightPole,
  createHighwayGantrySign,
} from './models';

export const CITY_SPAWN_COORDS: Record<
  WorldRegionId,
  { x: number; z: number; heading: number }
> = {
  tashkent: { x: 4, z: 0, heading: 0 },
  m39_highway: { x: 4, z: 245, heading: 0 },
  khorezm: { x: -236, z: -235, heading: 0 },
  samarkand: { x: 244, z: -235, heading: 0 },
};

export type PoiType = 'choyxona' | 'rest_park' | 'fuel' | 'gai_post';

export interface WorldPoi {
  id: string;
  type: PoiType;
  name: string;
  x: number;
  z: number;
  radius: number;
}

export interface OpenWorldBuildResult {
  pois: WorldPoi[];
  beaconPairs: { red: THREE.Mesh; blue: THREE.Mesh }[];
}

function createSignCanvasTexture(title: string, subtitle: string, bg: string, accent: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 148);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 56);

  ctx.fillStyle = accent;
  ctx.font = '700 24px sans-serif';
  ctx.fillText(subtitle, 256, 112);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChoyxonaMesh(name: string): THREE.Group {
  const g = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.45, metalness: 0.25 });
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 9), floorMat);
  deck.position.y = 0.175;
  deck.receiveShadow = true;
  g.add(deck);

  for (const px of [-4.6, 0, 4.6]) {
    for (const pz of [-3.6, 3.6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 3.8, 10), pillarMat);
      col.position.set(px, 2.05, pz);
      col.castShadow = true;
      g.add(col);
    }
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.45, 10.2), roofMat);
  roof.position.y = 4.1;
  roof.castShadow = true;
  g.add(roof);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.4, roughness: 0.35 })
  );
  dome.position.y = 4.3;
  g.add(dome);

  for (const tx of [-2.8, 2.8]) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 2.0), tableMat);
    table.position.set(tx, 0.62, 0);
    g.add(table);

    const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 1.8), clothMat);
    cloth.position.set(tx, 0.92, 0);
    g.add(cloth);

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.22, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
    );
    plate.position.set(tx, 1.0, 0);
    g.add(plate);
  }

  const signTex = createSignCanvasTexture(name.toUpperCase(), '🥣 MILLIY TAOMLAR • TUSHIB OVQATLANING (G)', '#451a03', '#fbbf24');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 2.2),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 5.5, 4.9);
  g.add(sign);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.8, 5.6, 32),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);

  return g;
}

function createRestParkMesh(name: string): THREE.Group {
  const g = new THREE.Group();

  const lawn = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 8.5, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 })
  );
  lawn.position.y = 0.06;
  lawn.receiveShadow = true;
  g.add(lawn);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  for (const px of [-2.5, 2.5]) {
    for (const pz of [-2.5, 2.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), woodMat);
      post.position.set(px, 1.7, pz);
      g.add(post);
    }
  }
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
  );
  canopy.position.y = 4.0;
  g.add(canopy);

  const benchMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.75), benchMat);
    bench.position.set(0, 0.35, side * 1.4);
    g.add(bench);
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
  for (const [tx, tz] of [[-5.8, -5.2], [5.8, -5.2], [-5.8, 5.2], [5.8, 5.2]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.4, 8), trunkMat);
    trunk.position.set(tx, 1.2, tz);
    g.add(trunk);

    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.75, 10, 8), leafMat);
    leaves.position.set(tx, 3.2, tz);
    g.add(leaves);
  }

  const signTex = createSignCanvasTexture(name.toUpperCase(), '🌳 DAM OLISH BOG‘I • TUSHIB DAM OLING (G)', '#064e3b', '#34d399');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 2.0),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 5.4, 0);
  g.add(sign);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(5.8, 6.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.14;
  g.add(ring);

  return g;
}

function createFuelStationMesh(name: string): THREE.Group {
  const g = new THREE.Group();
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0284c7, emissiveIntensity: 0.6 });

  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
  );
  pad.position.y = 0.09;
  g.add(pad);

  for (const px of [-3.8, 3.8]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.2, 0.55), canopyMat);
    col.position.set(px, 2.2, 0);
    g.add(col);
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.55, 7.5), canopyMat);
  roof.position.y = 4.4;
  g.add(roof);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.18, 7.6), accentMat);
  strip.position.y = 4.4;
  g.add(strip);

  for (const dx of [-1.8, 1.8]) {
    const dispenser = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.8, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    dispenser.position.set(dx, 1.05, 0);
    g.add(dispenser);
  }

  const signTex = createSignCanvasTexture(name.toUpperCase(), '⛽ METAN / AI-95 / NITRO TO‘LDIRISH (G)', '#0f172a', '#22d3ee');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 2.0),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 5.7, 3.8);
  g.add(sign);

  return g;
}

function createGaiPostMesh(
  name: string,
  beaconPairs: { red: THREE.Mesh; blue: THREE.Mesh }[]
): THREE.Group {
  const g = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });

  const booth = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 4.2), whiteMat);
  booth.position.y = 1.65;
  booth.castShadow = true;
  g.add(booth);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.5, 4.3), blueMat);
  stripe.position.y = 1.25;
  g.add(stripe);

  const win = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 4.28), glassMat);
  win.position.y = 2.25;
  g.add(win);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.35, 4.8), blueMat);
  roof.position.y = 3.4;
  g.add(roof);

  const redBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.38, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff0033 })
  );
  redBeacon.position.set(-1.1, 3.78, 0);
  g.add(redBeacon);

  const blueBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.38, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x0088ff })
  );
  blueBeacon.position.set(1.1, 3.78, 0);
  g.add(blueBeacon);
  beaconPairs.push({ red: redBeacon, blue: blueBeacon });

  const signTex = createSignCanvasTexture(name.toUpperCase(), '🚓 YPX / GAI NAZORAT POSTI • TEZLIKNI SAQLANG', '#0c4a6e', '#38bdf8');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.8),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 4.9, 2.2);
  g.add(sign);

  return g;
}

function createRoadGridTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#facc15';
  ctx.fillRect(249, 0, 4, 512);
  ctx.fillRect(259, 0, 4, 512);

  ctx.fillStyle = '#e2e8f0';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(128, y, 4, 34);
    ctx.fillRect(380, y, 4, 34);
  }

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(14, 0, 6, 512);
  ctx.fillRect(492, 0, 6, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 70);
  tex.anisotropy = Math.min(4, maxAniso);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildGrandOpenWorld(
  worldGroup: THREE.Group,
  maxAniso: number
): OpenWorldBuildResult {
  const pois: WorldPoi[] = [];
  const beaconPairs: { red: THREE.Mesh; blue: THREE.Mesh }[] = [];

  // 1. Massive 2000m x 2000m solid city ground terrain
  const groundGeo = new THREE.PlaneGeometry(2000, 2000);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x0f3b26, roughness: 0.95 });
  for (const gx of [-120, 120, -370, 370]) {
    for (const gz of [-120, 120, -370, 370]) {
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(205, 205), grassMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(gx, -0.02, gz);
      lawn.receiveShadow = true;
      worldGroup.add(lawn);
    }
  }

  // 2. Intersecting Asphalt City Avenue Network
  const roadTex = createRoadGridTexture(maxAniso);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.38,
    metalness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  for (const ax of [0, -240, 240, -520, 520]) {
    const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(20, 1400), roadMat);
    roadNS.rotation.x = -Math.PI / 2;
    roadNS.position.set(ax, 0.005, 0);
    roadNS.receiveShadow = true;
    worldGroup.add(roadNS);
  }

  for (const az of [0, -240, 240, -520, 520]) {
    const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(20, 1400), roadMat);
    roadEW.rotation.x = -Math.PI / 2;
    roadEW.rotation.z = Math.PI / 2;
    roadEW.position.set(0, 0.008, az);
    roadEW.receiveShadow = true;
    worldGroup.add(roadEW);
  }

  // 3. Roadside POIs (Choyxonas, Dam olish bog'lari, Zapravkalar, GAI postlari)
  const choyxonaSpecs = [
    { id: 'choyxona_1', name: 'Toshkent Milliy Choyxona', x: 22, z: 75 },
    { id: 'choyxona_2', name: 'Xorazm Taomlari Choyxonasi', x: -215, z: -185 },
    { id: 'choyxona_3', name: 'Samarqand Osh Markazi', x: 264, z: -185 },
  ];
  for (const sp of choyxonaSpecs) {
    const m = createChoyxonaMesh(sp.name);
    m.position.set(sp.x, 0, sp.z);
    if (sp.x > 0) m.rotation.y = -Math.PI / 2;
    else m.rotation.y = Math.PI / 2;
    worldGroup.add(m);
    pois.push({ id: sp.id, type: 'choyxona', name: sp.name, x: sp.x, z: sp.z, radius: 9.5 });
  }

  const parkSpecs = [
    { id: 'park_1', name: 'Toshkent Bog‘i', x: -22, z: -75 },
    { id: 'park_2', name: 'Xiva Sayilgohi', x: -264, z: -185 },
    { id: 'park_3', name: 'Samarqand Navoiy Parki', x: 215, z: -185 },
  ];
  for (const sp of parkSpecs) {
    const m = createRestParkMesh(sp.name);
    m.position.set(sp.x, 0, sp.z);
    worldGroup.add(m);
    pois.push({ id: sp.id, type: 'rest_park', name: sp.name, x: sp.x, z: sp.z, radius: 10.5 });
  }

  const fuelSpecs = [
    { id: 'fuel_1', name: 'A-380 Metan Zapravka', x: -22, z: 270 },
    { id: 'fuel_2', name: 'Toshkent Zapravka', x: 22, z: -180 },
  ];
  for (const sp of fuelSpecs) {
    const m = createFuelStationMesh(sp.name);
    m.position.set(sp.x, 0, sp.z);
    worldGroup.add(m);
    pois.push({ id: sp.id, type: 'fuel', name: sp.name, x: sp.x, z: sp.z, radius: 9.0 });
  }

  const gaiSpecs = [
    { id: 'gai_1', name: 'YPX 01 Post', x: -19, z: 335 },
    { id: 'gai_2', name: 'Samarqand GAI Posti', x: 218, z: 18 },
  ];
  for (const sp of gaiSpecs) {
    const m = createGaiPostMesh(sp.name, beaconPairs);
    m.position.set(sp.x, 0, sp.z);
    worldGroup.add(m);
    pois.push({ id: sp.id, type: 'gai_post', name: sp.name, x: sp.x, z: sp.z, radius: 9.0 });
  }

  // 4. Iconic City District Landmarks & Highway Gantry Signs
  // TOSHKENT CENTER
  const tvTower = createTashkentTVTower();
  tvTower.position.set(-68, 0, 125);
  worldGroup.add(tvTower);

  const tashkentSign = createHighwayGantrySign('TOSHKENT SHAHRI • MARKAZ', 'AMIR TEMUR SHOH KO‘CHASI');
  tashkentSign.position.set(0, 0, 42);
  worldGroup.add(tashkentSign);

  // A-380 TRASSA
  const m39Sign = createHighwayGantrySign('A-380 XALQARO MAGISTRAL', 'TOSHKENT ➔ SAMARQAND ➔ XIVA');
  m39Sign.position.set(0, 0, 290);
  worldGroup.add(m39Sign);

  // XORAZM / XIVA CENTER (-240, -240)
  const kaltaMinor = createKhivaKaltaMinor();
  kaltaMinor.position.set(-285, 0, -210);
  worldGroup.add(kaltaMinor);

  const khivaGate = createIchanQalaGate();
  khivaGate.position.set(-240, 0, -195);
  worldGroup.add(khivaGate);

  const khivaSign = createHighwayGantrySign('XORAZM VILOYATI • XIVA', 'ICHAN QAL‘A & KALTA MINOR');
  khivaSign.position.set(-240, 0, -160);
  worldGroup.add(khivaSign);

  // SAMARQAND REGISTON CENTER (+240, -240)
  const registanGate = createIchanQalaGate();
  registanGate.position.set(240, 0, -195);
  worldGroup.add(registanGate);

  const registanTower = createKhivaKaltaMinor();
  registanTower.position.set(282, 0, -205);
  worldGroup.add(registanTower);

  const samarkandSign = createHighwayGantrySign('SAMARQAND SHAHRI', 'REGISTON MAYDONI • BUYUK IPAK YO‘LI');
  samarkandSign.position.set(240, 0, -160);
  worldGroup.add(samarkandSign);

  // 5. Skyscrapers & Buildings placed safely inside city blocks (avoiding X/Z = 0, ±240, ±520 roads!)
  const isNearRoad = (x: number, z: number) =>
    Math.abs(x) < 26 ||
    Math.abs(z) < 26 ||
    Math.abs(Math.abs(x) - 240) < 28 ||
    Math.abs(Math.abs(z) - 240) < 28 ||
    Math.abs(Math.abs(x) - 520) < 28 ||
    Math.abs(Math.abs(z) - 520) < 28;

  const isNearPoi = (x: number, z: number) =>
    pois.some((p) => Math.hypot(p.x - x, p.z - z) < 24);

  for (let i = 0; i < 65; i++) {
    const bx = (Math.sin(i * 17.3) * 0.5 + Math.cos(i * 31.7) * 0.5) * 460;
    const bz = (Math.cos(i * 23.1) * 0.5 + Math.sin(i * 11.9) * 0.5) * 460;
    if (isNearRoad(bx, bz) || isNearPoi(bx, bz)) continue;
    const h = 30 + (i % 7) * 14;
    const w = 10 + (i % 4) * 3;
    const spire = createCitySpire(h, w);
    spire.position.set(bx, 0, bz);
    worldGroup.add(spire);
  }

  // 6. Street lights along central avenues
  for (let z = -420; z <= 420; z += 70) {
    if (Math.abs(z) < 22 || Math.abs(Math.abs(z) - 240) < 22) continue;
    const l1 = createStreetLightPole();
    l1.position.set(-12.5, 0, z);
    worldGroup.add(l1);

    const l2 = createStreetLightPole();
    l2.position.set(12.5, 0, z);
    l2.rotation.y = Math.PI;
    worldGroup.add(l2);
  }

  return { pois, beaconPairs };
}
