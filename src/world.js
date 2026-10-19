import * as THREE from '../vendor/three.module.js';
import {
  TAU, clamp, lerp, rand, mulberry32, makeFacadeTexture, makeRoadTexture, makeSignTexture,
  makeSky, makeLabelSprite,
} from './utils.js';

export const GROUND_Y = 0.3;
export const CITY_BOUNDS = { minX: -330, maxX: 330, minZ: -1020, maxZ: 1100 };

const BUILDING_STYLES = ['brick', 'concrete', 'glass', 'deco'];

function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b2e1c';
  ctx.fillRect(0, 0, 256, 256);
  const rng = mulberry32(44);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${40 + rng() * 40},${70 + rng() * 55},${34 + rng() * 35},${0.16 + rng() * 0.4})`;
    ctx.fillRect(rng() * 256, rng() * 256, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 13);
  return tex;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  const rng = mulberry32(31);
  for (let i = 0; i < 24; i++) {
    const x = 30 + rng() * 196;
    const y = 55 + rng() * 30;
    const r = 18 + rng() * 42;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(190,200,225,.23)');
    g.addColorStop(0.6, 'rgba(140,155,190,.09)');
    g.addColorStop(1, 'rgba(100,120,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


function mergeColoredBoxes(parts) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let offset = 0;
  for (const part of parts) {
    const geo = new THREE.BoxGeometry(part.w, part.h, part.d);
    geo.translate(part.x || 0, part.y || 0, part.z || 0);
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const idx = geo.index;
    const color = new THREE.Color(part.color);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      colors.push(color.r, color.g, color.b);
    }
    for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    offset += pos.count;
    geo.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

export function createCity(scene) {
  const root = new THREE.Group();
  root.name = 'manhattan';
  scene.add(root);

  const rng = mulberry32(1987);
  const colliders = [];
  const hittables = [];
  const destructibles = [];
  const signs = [];
  const landmarks = {};
  const traffic = [];
  const pedestrians = [];
  const fate = {};

  const sky = makeSky();
  sky.position.y = 0;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0x7e9ac9, 0x18130f, 1.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb27b, 2.7);
  sun.position.set(-330, 460, 230);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x4f9dff, 1.6);
  rim.position.set(340, 160, -380);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xff3d65, 0.7);
  fill.position.set(80, 90, 400);
  scene.add(fill);

  scene.fog = new THREE.FogExp2(0x111a2d, 0.00078);

  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      deep: { value: new THREE.Color(0x04101e) },
      shallow: { value: new THREE.Color(0x0b2b47) },
      glow: { value: new THREE.Color(0x173d59) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform vec3 glow;
      varying vec3 vWorld;
      void main() {
        float w = sin(vWorld.x * 0.04 + time * 0.28) * 0.5 + 0.5;
        float w2 = sin(vWorld.z * 0.09 - time * 0.18 + vWorld.x * 0.02) * 0.5 + 0.5;
        vec3 col = mix(deep, shallow, w * 0.45 + w2 * 0.18);
        float glint = pow(max(0.0, sin(vWorld.z * 0.18 + time * 0.7) * cos(vWorld.x * 0.11 - time * 0.22)), 24.0);
        col += glow * glint * 0.32;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.5;
  root.add(water);

  const islandMat = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.95 });
  const island = new THREE.Mesh(new THREE.BoxGeometry(690, 3.2, 2180), islandMat);
  island.position.set(0, -1.7, 40);
  root.add(island);

  const roadTex = makeRoadTexture();
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.88, metalness: 0.05, color: 0xb9c2cc });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x484e58, roughness: 0.92 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x616875, roughness: 0.8 });
  const sidewalkTransforms = [];
  const curbTransforms = [];

  const avenueX = [-280, -200, -120, -40, 40, 120, 200, 280];
  const crossZ = [-960, -860, -760, -660, -560, -460, -360, -260, -160, -60, 40, 140, 240, 340, 440, 540, 640, 740, 840, 940, 1040];

  for (const x of avenueX) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(19, 2110), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(x, 0.012, 40);
    root.add(road);
  }
  for (const z of crossZ) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(690, 15), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.014, z);
    root.add(road);
  }

  const blockCentersX = [-240, -160, -80, 0, 80, 160, 240];
  const blockCentersZ = [];
  for (let i = 0; i < crossZ.length - 1; i++) blockCentersZ.push((crossZ[i] + crossZ[i + 1]) / 2);

  const reserved = [
    { minX: -200, maxX: 200, minZ: -650, maxZ: -175, name: 'park' },
    { minX: -160, maxX: 160, minZ: 250, maxZ: 350, name: 'times' },
    { minX: -130, maxX: -30, minZ: -100, maxZ: -12, name: 'empire' },
    { minX: 45, maxX: 135, minZ: -125, maxZ: -35, name: 'chrysler' },
    { minX: -225, maxX: -165, minZ: 730, maxZ: 800, name: 'oneworld' },
    { minX: 22, maxX: 88, minZ: 135, maxZ: 205, name: 'oracle' },
    { minX: -300, maxX: -240, minZ: 500, maxZ: 570, name: 'spawn' },
    { minX: 185, maxX: 225, minZ: 110, maxZ: 152, name: 'intel' },
  ];
  const isReserved = (x, z, pad = 0) => reserved.some((r) => x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad);

  for (const z of blockCentersZ) {
    for (const x of blockCentersX) {
      if (isReserved(x, z, 2)) continue;
      const bw = 53;
      const bd = 73;
      sidewalkTransforms.push({ x, z, sx: bw + 8, sy: 0.28, sz: bd + 7 });
      curbTransforms.push({ x, z: z - bd / 2 - 3.6, sx: bw + 8.8, sy: 0.4, sz: 0.7 });
      curbTransforms.push({ x, z: z + bd / 2 + 3.6, sx: bw + 8.8, sy: 0.4, sz: 0.7 });
      curbTransforms.push({ x: x - bw / 2 - 4, z, sx: 0.7, sy: 0.4, sz: bd + 7.5 });
      curbTransforms.push({ x: x + bw / 2 + 4, z, sx: 0.7, sy: 0.4, sz: bd + 7.5 });
    }
  }

  const sidewalkGeo = new THREE.BoxGeometry(1, 1, 1);
  const sidewalkMesh = new THREE.InstancedMesh(sidewalkGeo, sidewalkMat, sidewalkTransforms.length);
  const curbMesh = new THREE.InstancedMesh(sidewalkGeo, curbMat, curbTransforms.length);
  const sDummy = new THREE.Object3D();
  sidewalkTransforms.forEach((t, i) => {
    sDummy.position.set(t.x, 0.14, t.z);
    sDummy.scale.set(t.sx, t.sy, t.sz);
    sDummy.updateMatrix();
    sidewalkMesh.setMatrixAt(i, sDummy.matrix);
  });
  curbTransforms.forEach((t, i) => {
    sDummy.position.set(t.x, 0.19, t.z);
    sDummy.scale.set(t.sx, t.sy, t.sz);
    sDummy.updateMatrix();
    curbMesh.setMatrixAt(i, sDummy.matrix);
  });
  sidewalkMesh.instanceMatrix.needsUpdate = true;
  curbMesh.instanceMatrix.needsUpdate = true;
  sidewalkMesh.frustumCulled = false;
  curbMesh.frustumCulled = false;
  root.add(sidewalkMesh, curbMesh);

  const buildingDefs = { brick: [], concrete: [], glass: [], deco: [] };
  const allBuildings = [];

  function addBuilding(x, z, w, d, h, style, color) {
    const def = { x, z, w, d, h, style, color, top: h + GROUND_Y };
    buildingDefs[style].push(def);
    allBuildings.push(def);
    colliders.push({
      minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h + GROUND_Y,
      minZ: z - d / 2, maxZ: z + d / 2, type: 'building', def,
    });
  }

  for (const z of blockCentersZ) {
    for (const x of blockCentersX) {
      if (isReserved(x, z, 2)) continue;
      const lanes = x === -40 || x === 40 ? 2 : 2;
      const lotW = 24;
      const lotD = 31;
      for (let lx = 0; lx < lanes; lx++) {
        for (let lz = 0; lz < 2; lz++) {
          if (rng() < 0.1) continue;
          const px = x - 12 + lx * 24 + (rng() - 0.5) * 4;
          const pz = z - 16 + lz * 32 + (rng() - 0.5) * 4;
          const nearMidtown = Math.abs(pz - 180) < 380;
          const nearDowntown = pz > 640;
          let h = 18 + Math.pow(rng(), 2.1) * (nearMidtown ? 180 : 130);
          if (nearDowntown) h = 25 + Math.pow(rng(), 1.8) * 240;
          if (rng() < 0.06) h += 70;
          const w = lotW * (0.72 + rng() * 0.36);
          const d = lotD * (0.63 + rng() * 0.32);
          const styles = rng() < 0.28 ? ['glass', 'glass', 'concrete'] : rng() < 0.42 ? ['brick', 'deco', 'concrete'] : ['concrete', 'glass', 'deco', 'brick'];
          const style = styles[Math.floor(rng() * styles.length)];
          const palette = style === 'glass' ? [0x8ba8b7, 0x6d8c9c, 0x9bb4bd]
            : style === 'brick' ? [0x9f7062, 0x8e6255, 0xad806f, 0x7b5a51]
              : style === 'deco' ? [0xb49b73, 0xa48c66, 0xc1aa82]
                : [0x9a9da2, 0x8a9098, 0xafb0ad];
          addBuilding(px, pz, w, d, h, style, palette[Math.floor(rng() * palette.length)]);
        }
      }
    }
  }

  for (const style of BUILDING_STYLES) {
    const defs = buildingDefs[style];
    if (!defs.length) continue;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const tex = makeFacadeTexture({ brick: 12, concrete: 4, glass: 8, deco: 22 }[style], style);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(style === 'glass' ? 1.4 : 1, 1.15);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: style === 'glass' ? 0x8fd7ff : 0xffcf93,
      emissiveIntensity: style === 'glass' ? 0.7 : 0.36,
      roughness: style === 'glass' ? 0.28 : 0.8,
      metalness: style === 'glass' ? 0.48 : 0.08,
      color: 0xffffff,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, defs.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dummy = new THREE.Object3D();
    defs.forEach((b, i) => {
      dummy.position.set(b.x, GROUND_Y, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(b.color));
    });
    mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.userData.buildings = defs;
    root.add(mesh);
    hittables.push(mesh);
  }

  const rooftop = new THREE.Group();
  root.add(rooftop);
  const waterTowerDefs = [];
  const acDefs = [];
  const antennaDefs = [];
  for (const b of allBuildings) {
    if (rng() < 0.3) {
      waterTowerDefs.push({ x: b.x + (rng() - 0.5) * b.w * 0.45, y: b.top, z: b.z + (rng() - 0.5) * b.d * 0.45, s: 0.7 + rng() * 0.5 });
    }
    if (rng() < 0.35) {
      acDefs.push({ x: b.x + (rng() - 0.5) * b.w * 0.5, y: b.top, z: b.z + (rng() - 0.5) * b.d * 0.5, sx: 1.5 + rng() * 2, sy: 0.7 + rng() * 1.2, sz: 1.5 + rng() * 2 });
    }
    if (rng() < 0.13) {
      antennaDefs.push({ x: b.x, y: b.top, z: b.z, h: 4 + rng() * 18 });
    }
  }
  const towerGeo = new THREE.CylinderGeometry(1.6, 1.9, 4.5, 10);
  towerGeo.translate(0, 2.25, 0);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x5c4433, roughness: 0.95 });
  const towers = new THREE.InstancedMesh(towerGeo, towerMat, waterTowerDefs.length);
  const roofGeo = new THREE.ConeGeometry(2.1, 1.4, 10);
  roofGeo.translate(0, 0.7, 0);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b2f27, roughness: 0.9 });
  const towerRoofs = new THREE.InstancedMesh(roofGeo, roofMat, waterTowerDefs.length);
  const tDummy = new THREE.Object3D();
  waterTowerDefs.forEach((d, i) => {
    tDummy.position.set(d.x, d.y, d.z);
    tDummy.scale.setScalar(d.s);
    tDummy.updateMatrix();
    towers.setMatrixAt(i, tDummy.matrix);
    tDummy.position.y += 4.5 * d.s;
    tDummy.updateMatrix();
    towerRoofs.setMatrixAt(i, tDummy.matrix);
  });
  rooftop.add(towers, towerRoofs);

  const acGeo = new THREE.BoxGeometry(1, 1, 1);
  acGeo.translate(0, 0.5, 0);
  const acMat = new THREE.MeshStandardMaterial({ color: 0x555a61, roughness: 0.85, metalness: 0.2 });
  const acs = new THREE.InstancedMesh(acGeo, acMat, acDefs.length);
  const aDummy = new THREE.Object3D();
  acDefs.forEach((d, i) => {
    aDummy.position.set(d.x, d.y, d.z);
    aDummy.scale.set(d.sx, d.sy, d.sz);
    aDummy.updateMatrix();
    acs.setMatrixAt(i, aDummy.matrix);
  });
  acs.frustumCulled = false;
  rooftop.add(acs);

  const antennaGeo = new THREE.CylinderGeometry(0.09, 0.16, 1, 5);
  antennaGeo.translate(0, 0.5, 0);
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x3b4048, emissive: 0xff2233, emissiveIntensity: 0.22 });
  const antennas = new THREE.InstancedMesh(antennaGeo, antennaMat, antennaDefs.length);
  antennaDefs.forEach((d, i) => {
    aDummy.position.set(d.x, d.y, d.z);
    aDummy.scale.set(1, d.h, 1);
    aDummy.updateMatrix();
    antennas.setMatrixAt(i, aDummy.matrix);
  });
  antennas.frustumCulled = false;
  rooftop.add(antennas);

  function addLandmarkBlock(x, z, w, d, h, color = 0x8d8b82, style = 'deco') {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.66, metalness: 0.2 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, GROUND_Y + h / 2, z);
    root.add(mesh);
    const collider = { minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h + GROUND_Y, minZ: z - d / 2, maxZ: z + d / 2, type: 'building' };
    colliders.push(collider);
    hittables.push(mesh);
    return { mesh, collider, style };
  }

  function addSpecialTower({ x, z, w, d, h, tiers = 2, color = 0x9b927f, spire = 0 }) {
    const group = new THREE.Group();
    const parts = [];
    const mats = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.28 });
    let currentH = h;
    let currentW = w;
    let currentD = d;
    let baseY = GROUND_Y;
    for (let i = 0; i < tiers; i++) {
      const part = new THREE.Mesh(new THREE.BoxGeometry(currentW, currentH, currentD), mats);
      part.position.set(x, baseY + currentH / 2, z);
      group.add(part);
      parts.push(part);
      colliders.push({ minX: x - currentW / 2, maxX: x + currentW / 2, minY: baseY, maxY: baseY + currentH, minZ: z - currentD / 2, maxZ: z + currentD / 2, type: 'building' });
      hittables.push(part);
      baseY += currentH;
      currentW *= 0.65;
      currentD *= 0.65;
      currentH *= 0.35;
    }
    if (spire > 0) {
      const spireMat = new THREE.MeshStandardMaterial({ color: 0x4b4e52, emissive: 0xff5a3c, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.3 });
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, spire, 8), spireMat);
      sp.position.set(x, baseY + spire / 2, z);
      group.add(sp);
      const light = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b42 }));
      light.position.set(x, baseY + spire, z);
      group.add(light);
    }
    root.add(group);
    return group;
  }

  landmarks.empire = addSpecialTower({ x: -80, z: -55, w: 47, d: 45, h: 155, tiers: 4, color: 0xa99b80, spire: 42 });
  landmarks.chrysler = addSpecialTower({ x: 90, z: -80, w: 38, d: 38, h: 120, tiers: 3, color: 0x9b9b92, spire: 55 });
  landmarks.oneWorld = addSpecialTower({ x: -195, z: 765, w: 44, d: 42, h: 200, tiers: 3, color: 0x71818b, spire: 35 });
  landmarks.oracle = addLandmarkBlock(55, 170, 52, 58, 78, 0x5b5852);
  landmarks.oracle.top = GROUND_Y + 78;
  landmarks.broker = addLandmarkBlock(0, 300, 48, 48, 12, 0x25252a);
  landmarks.broker.top = GROUND_Y + 12;
  landmarks.intel = addLandmarkBlock(205, 131, 38, 42, 64, 0x656a71);
  landmarks.intel.top = GROUND_Y + 64;

  const oracleRoof = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 15), new THREE.MeshStandardMaterial({ color: 0x252b32, roughness: 0.8 }));
  oracleRoof.position.set(55, GROUND_Y + 78.05, 170);
  root.add(oracleRoof);

  const empireTop = landmarks.empire.children.length;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, 18, 8), new THREE.MeshStandardMaterial({ color: 0xc9b58b, emissive: 0x6f3b18, emissiveIntensity: 0.18, metalness: 0.55, roughness: 0.36 }));
  crown.position.set(-80, GROUND_Y + 155 + 10, -55);
  root.add(crown);

  const chryslerCrown = new THREE.Mesh(new THREE.ConeGeometry(13, 29, 8), new THREE.MeshStandardMaterial({ color: 0xc4c7c5, emissive: 0x273a51, emissiveIntensity: 0.45, metalness: 0.75, roughness: 0.25 }));
  chryslerCrown.position.set(90, GROUND_Y + 120 * 1.35 + 14, -80);
  root.add(chryslerCrown);

  const oneWorldTop = new THREE.Mesh(new THREE.CylinderGeometry(3, 20, 30, 3), new THREE.MeshStandardMaterial({ color: 0x8aa0ad, metalness: 0.7, roughness: 0.22, emissive: 0x1b3950, emissiveIntensity: 0.35 }));
  oneWorldTop.position.set(-195, GROUND_Y + 200 * 1.35 + 15, 765);
  root.add(oneWorldTop);

  const oracleHalo = new THREE.Mesh(new THREE.TorusGeometry(5, 0.16, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff2b45, transparent: true, opacity: 0.8 }));
  oracleHalo.rotation.x = Math.PI / 2;
  oracleHalo.position.set(55, GROUND_Y + 84, 170);
  root.add(oracleHalo);
  landmarks.oracleHalo = oracleHalo;

  const park = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(390, 470), new THREE.MeshStandardMaterial({ map: makeGrassTexture(), color: 0x7d9b70, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, 0.32, -410);
  park.add(grass);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x3f4248, roughness: 0.9 });
  const pathA = new THREE.Mesh(new THREE.PlaneGeometry(390, 5), pathMat);
  pathA.rotation.x = -Math.PI / 2;
  pathA.position.set(0, 0.34, -410);
  park.add(pathA);
  const pathB = new THREE.Mesh(new THREE.PlaneGeometry(5, 470), pathMat);
  pathB.rotation.x = -Math.PI / 2;
  pathB.position.set(0, 0.34, -410);
  park.add(pathB);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(42, 32), new THREE.MeshStandardMaterial({ color: 0x102f42, metalness: 0.6, roughness: 0.18 }));
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(1.9, 0.8, 1);
  pond.position.set(45, 0.345, -440);
  park.add(pond);
  const pondRim = new THREE.Mesh(new THREE.RingGeometry(41, 43, 32), new THREE.MeshStandardMaterial({ color: 0x6c6a5c, roughness: 0.9 }));
  pondRim.rotation.x = -Math.PI / 2;
  pondRim.scale.set(1.9, 0.8, 1);
  pondRim.position.set(45, 0.35, -440);
  park.add(pondRim);

  const treeCount = 220;
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.42, 5, 6);
  trunkGeo.translate(0, 2.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const crownGeo = new THREE.IcosahedronGeometry(2.5, 1);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x315d36, roughness: 1, flatShading: true });
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  const treeDummy = new THREE.Object3D();
  for (let i = 0; i < treeCount; i++) {
    let tx = (rng() - 0.5) * 360;
    let tz = -410 + (rng() - 0.5) * 440;
    if (Math.abs(tx) < 10 || Math.abs(tz + 410) < 10) tx += 18;
    if (Math.hypot((tx - 45) / 1.9, (tz + 440) / 0.8) < 51) { tx += 35; tz -= 22; }
    const s = 0.7 + rng() * 0.8;
    treeDummy.position.set(tx, 0.32, tz);
    treeDummy.scale.set(s, s, s);
    treeDummy.rotation.y = rng() * TAU;
    treeDummy.updateMatrix();
    trunks.setMatrixAt(i, treeDummy.matrix);
    treeDummy.position.y = 0.32 + 5 * s;
    treeDummy.scale.set(s * (0.8 + rng() * 0.5), s * (0.8 + rng() * 0.5), s * (0.8 + rng() * 0.5));
    treeDummy.updateMatrix();
    crowns.setMatrixAt(i, treeDummy.matrix);
  }
  trunks.frustumCulled = false;
  crowns.frustumCulled = false;
  park.add(trunks, crowns);
  root.add(park);

  const streetFurniture = new THREE.Group();
  const lampPositions = [];
  for (const x of avenueX) {
    for (let z = -960; z <= 1040; z += 100) {
      if (Math.abs(x) === 280) continue;
      lampPositions.push({ x: x + 11, z: z + 12 });
      lampPositions.push({ x: x - 11, z: z - 12 });
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.14, 6, 5);
  poleGeo.translate(0, 3, 0);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x20242b, metalness: 0.5, roughness: 0.5 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPositions.length);
  const lampGeo = new THREE.SphereGeometry(0.24, 6, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc06b });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampPositions.length);
  const fDummy = new THREE.Object3D();
  lampPositions.forEach((p, i) => {
    fDummy.position.set(p.x, 0.3, p.z);
    fDummy.scale.set(1, 1, 1);
    fDummy.rotation.set(0, 0, 0);
    fDummy.updateMatrix();
    poles.setMatrixAt(i, fDummy.matrix);
    fDummy.position.set(p.x, 6.2, p.z);
    fDummy.scale.setScalar(1);
    fDummy.updateMatrix();
    lamps.setMatrixAt(i, fDummy.matrix);
  });
  poles.frustumCulled = false;
  lamps.frustumCulled = false;
  streetFurniture.add(poles, lamps);

  const trafficLightGeo = new THREE.BoxGeometry(0.45, 1.6, 0.4);
  const trafficLightMat = new THREE.MeshStandardMaterial({ color: 0x141414, emissive: 0xff2020, emissiveIntensity: 0.4 });
  const tlights = new THREE.InstancedMesh(trafficLightGeo, trafficLightMat, 44);
  for (let i = 0; i < 44; i++) {
    const x = avenueX[1 + Math.floor(rng() * 6)] + 10;
    const z = crossZ[Math.floor(rng() * crossZ.length)];
    fDummy.position.set(x, 4.2, z);
    fDummy.rotation.set(0, 0, 0);
    fDummy.scale.setScalar(1);
    fDummy.updateMatrix();
    tlights.setMatrixAt(i, fDummy.matrix);
  }
  tlights.frustumCulled = false;
  streetFurniture.add(tlights);
  root.add(streetFurniture);

  const signWords = ['DELI', 'PIZZA', 'BROADWAY', '24 HOUR', 'SUBWAY', 'NOODLES', 'OSCORP', 'DAILY BUGLE', 'NEON', 'ARCADE', 'HOTEL', 'ROOFTOP'];
  const signColors = ['#ff2b45', '#62e6ff', '#ffc657', '#ff5fd7', '#7dffb1'];
  for (let i = 0; i < 33; i++) {
    const b = allBuildings[Math.floor(rng() * allBuildings.length)];
    const word = signWords[Math.floor(rng() * signWords.length)];
    const color = signColors[Math.floor(rng() * signColors.length)];
    const tex = makeSignTexture(word, color);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const w = 5.5 + rng() * 7;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.375), mat);
    const side = rng() > 0.5 ? 1 : -1;
    sign.position.set(b.x + side * (b.w / 2 + 0.08), 4 + rng() * Math.max(2, Math.min(24, b.h * 0.36)), b.z + (rng() - 0.5) * b.d * 0.5);
    sign.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(sign);
    signs.push({ mesh: sign, flicker: rng() * TAU, speed: 0.5 + rng() * 2 });
    if (i < 6) {
      const glow = new THREE.PointLight(new THREE.Color(color), 1.5, 16, 2);
      glow.position.copy(sign.position);
      root.add(glow);
    }
  }

  const billboards = new THREE.Group();
  const billboardData = [
    { text: 'WEBFALL', color: '#ff2b45', x: -55, z: 346, w: 30, h: 11, y: 16 },
    { text: 'OSCORP', color: '#62e6ff', x: 55, z: 346, w: 25, h: 10, y: 23 },
    { text: 'DAILY BUGLE', color: '#ffc657', x: -60, z: 252, w: 27, h: 9, y: 27 },
    { text: 'THE CITY NEVER SLEEPS', color: '#ff5fd7', x: 59, z: 254, w: 32, h: 8, y: 14 },
  ];
  for (const b of billboardData) {
    const tex = makeSignTexture(b.text, b.color);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), mat);
    mesh.position.set(b.x, b.y, b.z);
    mesh.rotation.y = b.z > 300 ? Math.PI : 0;
    billboards.add(mesh);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.4, b.h + 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x14171d, metalness: 0.5 }));
    frame.position.copy(mesh.position);
    frame.rotation.y = mesh.rotation.y;
    frame.position.z += mesh.rotation.y === 0 ? -0.25 : 0.25;
    billboards.add(frame);
  }
  root.add(billboards);

  const spawnTower = addLandmarkBlock(-270, 535, 45, 55, 52, 0x494d55);
  landmarks.spawnTower = spawnTower;
  const spawnRoof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 9), new THREE.MeshStandardMaterial({ color: 0x2b3038 }));
  spawnRoof.position.set(-270, GROUND_Y + 52.2, 535);
  root.add(spawnRoof);

  function createCar(color, x, z, rot = 0, destructible = false) {
    const car = new THREE.Group();
    const bodyGeo = mergeColoredBoxes([
      { w: 1.7, h: 0.52, d: 3.7, y: 0.62, color },
      { w: 1.45, h: 0.55, d: 1.8, y: 1.08, z: -0.2, color: 0x18232f },
      { w: 1.6, h: 0.18, d: 3.2, y: 0.3, color: 0x0b0d11 },
      { w: 0.24, h: 0.55, d: 0.55, x: -0.84, y: 0.32, z: -1.3, color: 0x08090c },
      { w: 0.24, h: 0.55, d: 0.55, x: 0.84, y: 0.32, z: -1.3, color: 0x08090c },
      { w: 0.24, h: 0.55, d: 0.55, x: -0.84, y: 0.32, z: 1.3, color: 0x08090c },
      { w: 0.24, h: 0.55, d: 0.55, x: 0.84, y: 0.32, z: 1.3, color: 0x08090c },
    ]);
    const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.55 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    car.add(body);
    const lightGeo = mergeColoredBoxes([
      { w: 1.15, h: 0.14, d: 0.06, y: 0.62, z: 1.87, color: 0xffe8b0 },
      { w: 1.2, h: 0.1, d: 0.06, y: 0.62, z: -1.87, color: 0xff1838 },
    ]);
    const light = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ vertexColors: true }));
    car.add(light);
    car.position.set(x, 0.3, z);
    car.rotation.y = rot;
    root.add(car);
    if (destructible) {
      car.userData.destructible = { type: 'car', hp: 3, radius: 2.2, colors: [color, 0x1a2531, 0x2b2e33], shatter: 16 };
      destructibles.push(car);
    }
    return car;
  }

  const carColors = [0xc9302c, 0x1f5fb3, 0xe0b13b, 0xdedede, 0x20242b, 0x5b2d7c, 0x2b8f5d];
  const trafficCount = 32;
  const tBodyGeo = new THREE.BoxGeometry(1.7, 0.52, 3.7);
  tBodyGeo.translate(0, 0.62, 0);
  const tCabinGeo = new THREE.BoxGeometry(1.45, 0.55, 1.8);
  tCabinGeo.translate(0, 1.08, -0.2);
  const tWheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.24, 8);
  tWheelGeo.rotateZ(Math.PI / 2);
  const tBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.55 });
  const tCabinMat = new THREE.MeshStandardMaterial({ color: 0x1a2531, metalness: 0.4, roughness: 0.2 });
  const tWheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0e, roughness: 0.9 });
  const tLightMat = new THREE.MeshBasicMaterial({ color: 0xffe8b0 });
  const tTailMat = new THREE.MeshBasicMaterial({ color: 0xff1838 });
  const trafficBodies = new THREE.InstancedMesh(tBodyGeo, tBodyMat, trafficCount);
  const trafficCabins = new THREE.InstancedMesh(tCabinGeo, tCabinMat, trafficCount);
  const trafficWheels = new THREE.InstancedMesh(tWheelGeo, tWheelMat, trafficCount * 4);
  const trafficLights = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.14, 0.06), tLightMat, trafficCount);
  const trafficTails = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.1, 0.06), tTailMat, trafficCount);
  for (const mesh of [trafficBodies, trafficCabins, trafficWheels, trafficLights, trafficTails]) {
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  const wheelOffsets = [[-0.86, -1.28], [0.86, -1.28], [-0.86, 1.28], [0.86, 1.28]];
  for (let i = 0; i < trafficCount; i++) {
    const x = [-270, -190, -110, -30, 50, 130, 210, 270][i % 8];
    traffic.push({
      lane: x, x: x + (i % 2 === 0 ? 4.2 : -4.2), z: -900 + rng() * 1900,
      speed: 12 + rng() * 16, direction: rng() > 0.5 ? 1 : -1,
      color: carColors[Math.floor(rng() * carColors.length)], wheelPhase: rng() * TAU,
    });
    trafficBodies.setColorAt(i, new THREE.Color(traffic[i].color));
  }
  trafficBodies.instanceColor.needsUpdate = true;

  function updateTrafficMatrices(elapsed) {
    const cDummy = new THREE.Object3D();
    for (let i = 0; i < traffic.length; i++) {
      const t = traffic[i];
      cDummy.position.set(t.x, 0.31, t.z);
      cDummy.rotation.set(0, t.direction > 0 ? 0 : Math.PI, 0);
      cDummy.scale.setScalar(1);
      cDummy.updateMatrix();
      trafficBodies.setMatrixAt(i, cDummy.matrix);
      trafficCabins.setMatrixAt(i, cDummy.matrix);
      trafficLights.setMatrixAt(i, cDummy.matrix);
      trafficTails.setMatrixAt(i, cDummy.matrix);
      for (let w = 0; w < 4; w++) {
        const o = wheelOffsets[w];
        cDummy.position.set(t.x + o[0], 0.31 + 0.3, t.z + o[1]);
        cDummy.rotation.set(0, t.direction > 0 ? 0 : Math.PI, 0);
        cDummy.updateMatrix();
        trafficWheels.setMatrixAt(i * 4 + w, cDummy.matrix);
      }
    }
    trafficBodies.instanceMatrix.needsUpdate = true;
    trafficCabins.instanceMatrix.needsUpdate = true;
    trafficWheels.instanceMatrix.needsUpdate = true;
    trafficLights.instanceMatrix.needsUpdate = true;
    trafficTails.instanceMatrix.needsUpdate = true;
  }
  updateTrafficMatrices(0);

  const parked = [];
  for (let i = 0; i < 11; i++) {
    const x = avenueX[Math.floor(rng() * avenueX.length)] + (rng() > 0.5 ? 12 : -12);
    const z = -250 + rng() * 900;
    const car = createCar(carColors[Math.floor(rng() * carColors.length)], x, z, rng() > 0.5 ? 0 : Math.PI, true);
    car.position.y = 0.31;
    parked.push(car);
  }
  for (const [x, z] of [[-32, 510], [112, 470], [-92, 340], [88, 310], [-206, 620], [42, 660]]) {
    createCar(carColors[Math.floor(rng() * carColors.length)], x, z, rng() > 0.5 ? 0 : Math.PI, true);
  }

  const crateMat = new THREE.MeshStandardMaterial({ color: 0x6e512f, roughness: 0.9 });
  const cratePositions = [
    [-35, 550], [40, 520], [104, 405], [-124, 444], [184, 558], [-194, 552],
    [15, 225], [-18, 248], [70, 230], [-180, 180], [209, 274], [-225, 330],
  ];
  for (const [x, z] of cratePositions) {
    const size = 1.2 + Math.random() * 0.8;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), crateMat);
    crate.position.set(x, 0.3 + size / 2, z);
    crate.rotation.y = Math.random() * TAU;
    crate.userData.destructible = { type: 'crate', hp: 1, radius: 1.1, colors: [0x6e512f, 0x8c6c3d, 0x4a361f], shatter: 8 };
    root.add(crate);
    destructibles.push(crate);
  }

  const carProps = [];
  for (const [x, z] of [[-55, 580], [64, 588], [-106, 300], [120, 285]]) {
    const car = createCar(carColors[Math.floor(rng() * carColors.length)], x, z, Math.PI / 2, true);
    carProps.push(car);
  }

  const pedestrianCount = 46;
  const pedGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.2, 6);
  pedGeo.translate(0, 0.6, 0);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const pedBodies = new THREE.InstancedMesh(pedGeo, pedMat, pedestrianCount);
  const headGeo = new THREE.SphereGeometry(0.22, 7, 6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xc79a7a, roughness: 0.8 });
  const pedHeads = new THREE.InstancedMesh(headGeo, headMat, pedestrianCount);
  const pedColors = [0x35425a, 0x6a3542, 0x2f5143, 0x5e4c32, 0x303039, 0x725746];
  for (let i = 0; i < pedestrianCount; i++) {
    const avenue = avenueX[Math.floor(rng() * avenueX.length)];
    const z = -850 + rng() * 1750;
    const side = rng() > 0.5 ? 1 : -1;
    const x = avenue + side * (12 + rng() * 9);
    const ped = {
      x, z, baseX: x, baseZ: z, dir: rng() > 0.5 ? 1 : -1,
      speed: 0.6 + rng() * 1.1, phase: rng() * TAU, color: pedColors[Math.floor(rng() * pedColors.length)],
      lane: side, height: 0.85 + rng() * 0.3,
    };
    pedestrians.push(ped);
    pedBodies.setColorAt(i, new THREE.Color(ped.color));
  }
  pedBodies.instanceColor.needsUpdate = true;
  pedBodies.frustumCulled = false;
  pedHeads.frustumCulled = false;
  root.add(pedBodies, pedHeads);

  const distant = new THREE.Group();
  const distGeo = new THREE.BoxGeometry(1, 1, 1);
  distGeo.translate(0, 0.5, 0);
  const distMat = new THREE.MeshStandardMaterial({ color: 0x101726, roughness: 1 });
  const distCount = 140;
  const distMesh = new THREE.InstancedMesh(distGeo, distMat, distCount);
  for (let i = 0; i < distCount; i++) {
    const side = rng() > 0.5 ? 1 : -1;
    const x = side * (430 + rng() * 600);
    const z = -900 + rng() * 1900;
    fDummy.position.set(x, 0, z);
    fDummy.scale.set(20 + rng() * 60, 30 + rng() * 190, 20 + rng() * 55);
    fDummy.rotation.y = 0;
    fDummy.updateMatrix();
    distMesh.setMatrixAt(i, fDummy.matrix);
  }
  distMesh.frustumCulled = false;
  distant.add(distMesh);
  root.add(distant);

  const bridge = new THREE.Group();
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x4e5157, metalness: 0.28, roughness: 0.72 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(230, 2.5, 16), bridgeMat);
  deck.position.set(0, 21, 1080);
  bridge.add(deck);
  for (const x of [-76, 76]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 78, 6), bridgeMat);
    tower.position.set(x, 39, 1080);
    bridge.add(tower);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 18), bridgeMat);
    cross.position.set(x, 74, 1080);
    bridge.add(cross);
  }
  const cableMat = new THREE.LineBasicMaterial({ color: 0x8b9098, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = -112 + t * 224;
    const sag = Math.sin(t * Math.PI) * 15;
    const pts = [new THREE.Vector3(x, 78 - sag * 0.1, 1072), new THREE.Vector3(x, 32, 1072)];
    bridge.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  }
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-116, 78, 1080), new THREE.Vector3(-76, 73, 1080),
    new THREE.Vector3(0, 33, 1080), new THREE.Vector3(76, 73, 1080), new THREE.Vector3(116, 78, 1080),
  ]);
  const cableTube = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 30, 0.38, 5, false), new THREE.MeshStandardMaterial({ color: 0x8b9098, metalness: 0.6 }));
  bridge.add(cableTube);
  root.add(bridge);

  const liberty = new THREE.Group();
  const libBase = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 10, 8), new THREE.MeshStandardMaterial({ color: 0x7a7563, roughness: 0.9 }));
  libBase.position.set(-720, 4, 690);
  liberty.add(libBase);
  const libPed = new THREE.Mesh(new THREE.BoxGeometry(12, 22, 12), new THREE.MeshStandardMaterial({ color: 0x8c826e, roughness: 0.9 }));
  libPed.position.set(-720, 20, 690);
  liberty.add(libPed);
  const statueMat = new THREE.MeshStandardMaterial({ color: 0x4b7d6b, roughness: 0.75, metalness: 0.1 });
  const libBody = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4, 22, 7), statueMat);
  libBody.position.set(-720, 42, 690);
  liberty.add(libBody);
  const libHead = new THREE.Mesh(new THREE.SphereGeometry(2.3, 8, 7), statueMat);
  libHead.position.set(-720, 55, 690);
  liberty.add(libHead);
  const torch = new THREE.Mesh(new THREE.BoxGeometry(1.3, 5, 1.3), new THREE.MeshStandardMaterial({ color: 0x7a5e3a, emissive: 0xff9b36, emissiveIntensity: 1.2 }));
  torch.position.set(-716, 61, 691);
  liberty.add(torch);
  const torchGlow = new THREE.PointLight(0xff9b36, 1.6, 40, 2);
  torchGlow.position.set(-716, 61, 691);
  liberty.add(torchGlow);
  root.add(liberty);

  const clouds = new THREE.Group();
  const cloudTex = makeCloudTexture();
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.75 });
  for (let i = 0; i < 34; i++) {
    const sprite = new THREE.Sprite(cloudMat);
    sprite.position.set((rng() - 0.5) * 2300, 250 + rng() * 430, (rng() - 0.5) * 2400);
    const s = 160 + rng() * 400;
    sprite.scale.set(s, s * 0.32, 1);
    sprite.userData.speed = 1.2 + rng() * 3;
    clouds.add(sprite);
  }
  scene.add(clouds);

  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 950; i++) {
    const r = 2400 + rng() * 1800;
    const theta = rng() * TAU;
    const phi = Math.acos(2 * rng() - 1);
    starPos.push(Math.sin(phi) * Math.cos(theta) * r, Math.abs(Math.cos(phi) * r) * 0.9 + 50, Math.sin(phi) * Math.sin(theta) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xdde8ff, size: 3.2, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,246,218,1)');
      g.addColorStop(0.12, 'rgba(255,210,140,.95)');
      g.addColorStop(0.4, 'rgba(255,128,74,.34)');
      g.addColorStop(1, 'rgba(255,80,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })(),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sunSprite.position.set(-1450, 720, -1600);
  sunSprite.scale.set(700, 700, 1);
  scene.add(sunSprite);

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 90, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2b45, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  beacon.position.set(55, GROUND_Y + 78 + 45, 170);
  root.add(beacon);
  landmarks.oracleBeacon = beacon;

  const questAnchors = {
    oracle: new THREE.Vector3(55, GROUND_Y + 78.5, 170),
    spawn: new THREE.Vector3(-270, GROUND_Y + 52.4, 535),
    broker: new THREE.Vector3(0, GROUND_Y + 12.5, 300),
    intel: [
      new THREE.Vector3(-278, 1.4, 430),
      new THREE.Vector3(186, 1.4, 288),
      new THREE.Vector3(205, GROUND_Y + 64.2, 131),
    ],
  };

  function update(dt, elapsed, playerPos) {
    waterMat.uniforms.time.value = elapsed;
    for (const t of traffic) {
      t.z += t.speed * dt * t.direction;
      if (t.direction > 0 && t.z > 1010) t.z = -980;
      if (t.direction < 0 && t.z < -1000) t.z = 1000;
    }
    updateTrafficMatrices(elapsed);
    for (let i = 0; i < pedestrians.length; i++) {
      const p = pedestrians[i];
      p.z += p.speed * dt * p.dir;
      if (p.z > 1030) p.z = -980;
      if (p.z < -990) p.z = 1020;
      const walk = Math.sin(elapsed * 8 + p.phase) * 0.04;
      fDummy.position.set(p.baseX, 0.3 + Math.abs(walk), p.z);
      fDummy.scale.set(1, p.height, 1);
      fDummy.rotation.set(0, p.dir > 0 ? Math.PI : 0, walk);
      fDummy.updateMatrix();
      pedBodies.setMatrixAt(i, fDummy.matrix);
      fDummy.position.y = 0.3 + 1.2 * p.height + Math.abs(walk);
      fDummy.scale.setScalar(1);
      fDummy.updateMatrix();
      pedHeads.setMatrixAt(i, fDummy.matrix);
    }
    pedBodies.instanceMatrix.needsUpdate = true;
    pedHeads.instanceMatrix.needsUpdate = true;

    for (const s of signs) {
      s.mesh.material.opacity = 0.86 + Math.sin(elapsed * s.speed + s.flicker) * 0.08;
    }
    for (const c of clouds.children) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 1400) c.position.x = -1400;
    }
    landmarks.oracleHalo.rotation.z += dt * 0.3;
    landmarks.oracleBeacon.material.opacity = 0.13 + Math.sin(elapsed * 2) * 0.06;
    starMat.opacity = clamp((playerPos?.y || 0) / 1500, 0, 0.72);
    sunSprite.material.opacity = clamp(1 - (playerPos?.y || 0) / 2600, 0.15, 1);
  }

  function zoneAt(position) {
    if (position.y > 160) return 'UPPER AIRSPACE';
    if (Math.abs(position.x) < 200 && position.z < -175 && position.z > -650) return 'CENTRAL PARK';
    if (position.z > 220 && position.z < 360 && Math.abs(position.x) < 160) return 'TIMES SQUARE';
    if (position.z > 600) return 'FINANCIAL DISTRICT';
    if (position.z < -600) return 'UPPER MANHATTAN';
    return 'MIDTOWN';
  }

  function clampPlayer(pos) {
    pos.x = clamp(pos.x, -320, 320);
    pos.z = clamp(pos.z, -1010, 1090);
  }

  return {
    root, scene, colliders, hittables, destructibles, signs, traffic, pedestrians,
    landmarks, questAnchors, sky, stars, clouds, water, sunSprite, hemi, sun,
    update, zoneAt, clampPlayer, groundY: GROUND_Y, bounds: CITY_BOUNDS,
    createCar,
  };
}
