import * as THREE from '../vendor/three.module.js';
import { TAU, clamp, lerp, rand, mulberry32, makeEarthTexture, makeMoonTexture, makePlanetTexture, makeLabelSprite } from './utils.js';

function makeNebulaTexture(seed = 1, palette = ['#1a0e3a', '#050711', '#4a155f', '#0c2b52']) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const rng = mulberry32(seed);
  ctx.fillStyle = '#01020a';
  ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 90; i++) {
    const x = rng() * 1024;
    const y = rng() * 512;
    const r = 30 + rng() * 190;
    const col = palette[Math.floor(rng() * palette.length)];
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `${col}66`);
    g.addColorStop(0.35, `${col}22`);
    g.addColorStop(1, `${col}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.55})`;
    ctx.fillRect(rng() * 1024, rng() * 512, rng() > 0.97 ? 2 : 1, rng() > 0.97 ? 2 : 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStarPoints(count, radius, seed, color = 0xffffff) {
  const rng = mulberry32(seed);
  const positions = [];
  const colors = [];
  const palette = [new THREE.Color(0xffffff), new THREE.Color(0xaed8ff), new THREE.Color(0xffd7a8), new THREE.Color(0xd4b8ff)];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * rng() - 1);
    const theta = rng() * TAU;
    const r = radius * (0.55 + rng() * 0.45);
    positions.push(Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(theta) * r);
    const c = palette[Math.floor(rng() * palette.length)];
    colors.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 5.5, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

function makeSun(size = 1) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
  core.add(new THREE.Mesh(new THREE.SphereGeometry(size * 1.14, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })));
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 512;
  const gctx = glowCanvas.getContext('2d');
  const g = gctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, 'rgba(255,250,222,1)');
  g.addColorStop(0.1, 'rgba(255,214,130,.9)');
  g.addColorStop(0.35, 'rgba(255,131,62,.28)');
  g.addColorStop(1, 'rgba(255,70,30,0)');
  gctx.fillStyle = g;
  gctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(glowCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95 }));
  glow.scale.setScalar(size * 8);
  group.add(core, glow);
  const light = new THREE.PointLight(0xffd7a0, 2.1, 0, 1.4);
  group.add(light);
  return { group, core, glow };
}

function makeEarth() {
  const group = new THREE.Group();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(850, 64, 48), new THREE.MeshStandardMaterial({ map: makeEarthTexture(), roughness: 0.62, metalness: 0.1, emissive: 0x08223b, emissiveIntensity: 0.22 }));
  group.add(earth);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(872, 48, 32), new THREE.MeshBasicMaterial({ color: 0x4bb8ff, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(atmosphere);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(880, 48, 32), new THREE.MeshBasicMaterial({ color: 0x2a6cff, transparent: true, opacity: 0.08, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(rim);
  return { group, earth, atmosphere, rim, radius: 850 };
}

function makeMoon() {
  const group = new THREE.Group();
  const moon = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 32), new THREE.MeshStandardMaterial({ map: makeMoonTexture(), roughness: 1, metalness: 0.03, emissive: 0x1a1b18, emissiveIntensity: 0.12 }));
  group.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xaec5d9, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(520, 520, 1);
  group.add(halo);
  const beacon = new THREE.Group();
  beacon.position.set(0, 180, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.45, 8, 48), new THREE.MeshBasicMaterial({ color: 0x62e6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = Math.PI / 2;
  beacon.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.8, 90, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x62e6ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 45;
  beacon.add(beam);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(3.2, 0), new THREE.MeshStandardMaterial({ color: 0x9ff5ff, emissive: 0x2bd4ff, emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.35 }));
  crystal.position.y = 5;
  beacon.add(crystal);
  const label = makeLabelSprite('MOON BEACON // E', { color: '#bff8ff', bg: 'rgba(3,11,18,.72)', border: 'rgba(98,230,255,.55)', font: '700 30px Arial', scale: 0.55 });
  label.position.y = 17;
  beacon.add(label);
  group.add(beacon);
  group.userData = { moon, halo, beacon, crystal, beam, radius: 180 };
  return group;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(180,220,255,.55)');
  g.addColorStop(1, 'rgba(80,120,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNebulaBackdrop(scene, radius, seed, palette) {
  const geo = new THREE.SphereGeometry(radius, 48, 24);
  const mat = new THREE.MeshBasicMaterial({ map: makeNebulaTexture(seed, palette), side: THREE.BackSide, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

export function createOrbitWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01020a);
  const camera = null;
  const root = new THREE.Group();
  scene.add(root);
  createNebulaBackdrop(scene, 30000, 2, ['#160a35', '#050711', '#4a155f', '#0c2b52']);
  const starsNear = makeStarPoints(4200, 20000, 9);
  const starsFar = makeStarPoints(3000, 36000, 33);
  starsFar.material.size = 8;
  root.add(starsNear, starsFar);

  const sun = makeSun(110);
  sun.group.position.set(-7000, 2600, -9000);
  scene.add(sun.group);

  const earth = makeEarth();
  earth.group.position.set(-120, -1100, 120);
  scene.add(earth.group);

  const moon = makeMoon();
  moon.position.set(1700, 160, -380);
  scene.add(moon);
  const moonData = moon.userData;

  const station = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(28, 3, 8, 48), new THREE.MeshStandardMaterial({ color: 0x6d7880, metalness: 0.8, roughness: 0.32 }));
  station.add(torus);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 60, 8), new THREE.MeshStandardMaterial({ color: 0x2a3138, metalness: 0.7, roughness: 0.4 }));
  station.add(core);
  const stationLight = new THREE.PointLight(0x62e6ff, 1.5, 120, 2);
  station.add(stationLight);
  station.position.set(1050, 230, 50);
  station.rotation.set(0.4, 0.8, 0.2);
  scene.add(station);

  const debrisField = new THREE.Group();
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5b5e63, roughness: 0.95, metalness: 0.12 });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 170);
  const rd = new THREE.Object3D();
  const rocksData = [];
  for (let i = 0; i < 170; i++) {
    const angle = rand(0, TAU);
    const dist = rand(700, 2600);
    const y = rand(-270, 500);
    rd.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
    const s = rand(1.5, 10);
    rd.scale.set(s, s * rand(0.5, 1.1), s * rand(0.7, 1.4));
    rd.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    rd.updateMatrix();
    rocks.setMatrixAt(i, rd.matrix);
    rocksData.push({ angle, dist, y, speed: rand(0.002, 0.01), spin: rand(-0.5, 0.5), scale: s });
  }
  debrisField.add(rocks);
  root.add(debrisField);

  const lights = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0x8bb2ff, 0x020208, 0.45);
  const sunLight = new THREE.DirectionalLight(0xffd9ac, 2.2);
  sunLight.position.copy(sun.group.position);
  const rim = new THREE.DirectionalLight(0x8d6dff, 0.8);
  rim.position.set(1000, -500, 2000);
  lights.add(hemi, sunLight, rim);
  scene.add(lights);

  const beaconWorld = new THREE.Vector3();
  moonData.beacon.getWorldPosition(beaconWorld);
  const marker = makeLabelSprite('THE MOON IS LISTENING', { color: '#bff8ff', bg: 'rgba(3,11,18,.55)', border: 'rgba(98,230,255,.4)', font: '700 26px Arial', scale: 0.4 });
  marker.position.copy(beaconWorld).add(new THREE.Vector3(0, 42, 0));
  scene.add(marker);

  const orbit = {
    scene, earth, moon, moonData, station, rocks, rocksData, beaconWorld, marker,
    ambience: 0x6e8dff,
    update(dt, elapsed, player) {
      earth.group.rotation.y += dt * 0.006;
      earth.earth.rotation.y += dt * 0.01;
      moon.rotation.y += dt * 0.003;
      station.rotation.y += dt * 0.04;
      moonData.crystal.rotation.y += dt * 0.9;
      moonData.crystal.position.y = 5 + Math.sin(elapsed * 1.8) * 0.8;
      moonData.beacon.getWorldPosition(beaconWorld);
      marker.position.copy(beaconWorld).add(new THREE.Vector3(0, 42, 0));
      marker.lookAt(player.camera.position);
      stationLight.intensity = 1.2 + Math.sin(elapsed * 3) * 0.4;
      sun.core.rotation.y += dt * 0.01;
      for (let i = 0; i < rocksData.length; i++) {
        const r = rocksData[i];
        r.angle += r.speed * dt;
        rd.position.set(Math.cos(r.angle) * r.dist, r.y + Math.sin(elapsed * 0.2 + i) * 4, Math.sin(r.angle) * r.dist);
        rd.scale.setScalar(r.scale);
        rd.rotation.set(elapsed * 0.03 + i, elapsed * 0.02 + i, 0);
        rd.updateMatrix();
        rocks.setMatrixAt(i, rd.matrix);
      }
      rocks.instanceMatrix.needsUpdate = true;
      const d = player.group.position.distanceTo(beaconWorld);
      marker.visible = d > 80;
    },
    collidePlayer(player) {
      const pos = player.group.position;
      const bodies = [
        { center: moon.position, radius: 180 },
        { center: earth.group.position, radius: 850 },
        { center: station.position, radius: 36 },
      ];
      for (const b of bodies) {
        const diff = pos.clone().sub(b.center);
        const dist = diff.length();
        if (dist < b.radius + 2.2 && dist > 0.1) {
          const n = diff.normalize();
          pos.copy(b.center).addScaledVector(n, b.radius + 2.2);
          const vn = player.velocity.dot(n);
          if (vn < 0) player.velocity.addScaledVector(n, -vn * 1.04);
          player.velocity.multiplyScalar(0.985);
        }
      }
    },
    distanceToBeacon(player) {
      return player.group.position.distanceTo(beaconWorld);
    },
  };
  return orbit;
}

function makeBoundary() {
  const radius = 4200;
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, colorA: { value: new THREE.Color(0x6f24c7) }, colorB: { value: new THREE.Color(0xff2b45) } },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      void main() {
        vPos = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 colorA;
      uniform vec3 colorB;
      varying vec3 vPos;
      varying vec3 vNormal;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        float latitude = asin(normalize(vPos).y);
        float longitude = atan(normalize(vPos).z, normalize(vPos).x);
        float grid = abs(sin(latitude * 42.0)) * abs(sin(longitude * 44.0 + time * 0.12));
        float lane = smoothstep(0.86, 1.0, grid);
        float pulse = 0.5 + 0.5 * sin(latitude * 8.0 + longitude * 3.0 + time * 0.8);
        vec3 col = mix(colorA, colorB, pulse);
        float alpha = lane * (0.13 + pulse * 0.15) + 0.035;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 48), mat);
  sphere.frustumCulled = false;
  return { sphere, mat, radius };
}

export function createDeepSpaceWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010107);
  const root = new THREE.Group();
  scene.add(root);
  createNebulaBackdrop(scene, 60000, 14, ['#250a45', '#020208', '#122e5c', '#3b0b56']);
  root.add(makeStarPoints(6500, 30000, 77));
  const farStars = makeStarPoints(4000, 50000, 117);
  farStars.material.size = 9;
  root.add(farStars);

  const sun = makeSun(160);
  sun.group.position.set(-850, -200, 350);
  root.add(sun.group);

  const planets = new THREE.Group();
  const planetData = [
    { r: 14, dist: 900, color: ['#c5a77a', '#8a6b4e'], speed: 0.08 },
    { r: 23, dist: 1280, color: ['#d9a06e', '#9f623a', '#f0d4a3'], speed: 0.05 },
    { r: 25, dist: 1680, color: ['#2e6ba6', '#204b79', '#a9d6e8'], speed: 0.035, ring: true },
    { r: 18, dist: 2200, color: ['#7c4e90', '#4c2e63', '#b68ac5'], speed: 0.022 },
  ];
  for (let i = 0; i < planetData.length; i++) {
    const p = planetData[i];
    const mat = new THREE.MeshStandardMaterial({ map: makePlanetTexture(100 + i, p.color), roughness: 0.72, metalness: 0.08 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 24, 16), mat);
    const a = i * 1.7;
    mesh.position.set(Math.cos(a) * p.dist, Math.sin(i * 2.1) * 50, Math.sin(a) * p.dist);
    planets.add(mesh);
    if (p.ring) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(p.r * 1.4, p.r * 2.2, 48), new THREE.MeshBasicMaterial({ color: 0xc7b28a, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = Math.PI / 2.3;
      mesh.add(ring);
    }
  }
  root.add(planets);

  const boundary = makeBoundary();
  scene.add(boundary.sphere);

  const shrine = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.TorusGeometry(22, 2.4, 8, 64), new THREE.MeshStandardMaterial({ color: 0x6f5421, metalness: 0.9, roughness: 0.22, emissive: 0x5b3a00, emissiveIntensity: 0.65 }));
  platform.rotation.x = Math.PI / 2;
  shrine.add(platform);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(20, 48), new THREE.MeshBasicMaterial({ color: 0x1a0928, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  inner.rotation.x = -Math.PI / 2;
  shrine.add(inner);
  const web = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 20), new THREE.MeshBasicMaterial({ color: 0xffd77a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    spoke.rotation.y = (i / 12) * TAU;
    spoke.position.y = 0.2;
    web.add(spoke);
  }
  for (let i = 1; i <= 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(i * 5, 0.06, 4, 48), new THREE.MeshBasicMaterial({ color: 0xffd77a, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    web.add(ring);
  }
  shrine.add(web);
  const godCore = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), new THREE.MeshStandardMaterial({ color: 0xffe9ab, emissive: 0xffb347, emissiveIntensity: 2.3, roughness: 0.1, metalness: 0.6 }));
  godCore.position.y = 12;
  shrine.add(godCore);
  const shrineLight = new THREE.PointLight(0xffc657, 4, 180, 1.4);
  shrine.add(shrineLight);
  const shrineLabel = makeLabelSprite('THE FIRST WEB // CLAIM GODHOOD', { color: '#ffe9ab', bg: 'rgba(18,10,2,.7)', border: 'rgba(255,198,87,.6)', font: '700 27px Arial', scale: 0.48 });
  shrineLabel.position.y = 30;
  shrine.add(shrineLabel);
  shrine.position.set(0, 0, 3960);
  root.add(shrine);

  const bossAnchor = new THREE.Vector3(0, 0, 3660);
  const bossMarker = makeLabelSprite('THE LAST CIRCLE', { color: '#ffb1ff', bg: 'rgba(17,3,24,.72)', border: 'rgba(202,123,255,.6)', font: '700 30px Arial', scale: 0.6 });
  bossMarker.position.copy(bossAnchor).add(new THREE.Vector3(0, 52, 0));
  root.add(bossMarker);

  const hemi = new THREE.HemisphereLight(0x8c8cff, 0x020107, 0.42);
  const light = new THREE.DirectionalLight(0xffd6a3, 1.2);
  light.position.set(-900, 600, 500);
  const purple = new THREE.PointLight(0xa148ff, 2.4, 900, 1.3);
  purple.position.set(0, 60, 3900);
  scene.add(hemi, light, purple);

  const fragments = [];
  const fragGeo = new THREE.OctahedronGeometry(1, 0);
  const fragMat = new THREE.MeshStandardMaterial({ color: 0x5b3a82, emissive: 0x39105e, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.5 });
  for (let i = 0; i < 140; i++) {
    const mesh = new THREE.Mesh(fragGeo, fragMat);
    const angle = rand(0, TAU);
    const radius = rand(800, 3800);
    mesh.position.set(Math.cos(angle) * radius, rand(-500, 500), Math.sin(angle) * radius);
    mesh.scale.setScalar(rand(1, 9));
    mesh.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    fragments.push({ mesh, angle, radius, y: mesh.position.y, speed: rand(0.01, 0.04), spin: rand(-0.4, 0.4) });
    root.add(mesh);
  }

  const deep = {
    scene, boundary, shrine, godCore, shrineLabel, bossAnchor, bossMarker, sun, planets, fragments,
    update(dt, elapsed, player) {
      boundary.mat.uniforms.time.value = elapsed;
      boundary.sphere.rotation.y += dt * 0.002;
      godCore.rotation.y += dt * 0.8;
      godCore.rotation.x += dt * 0.3;
      godCore.position.y = 12 + Math.sin(elapsed * 1.5) * 1.5;
      shrine.rotation.y += dt * 0.08;
      web.rotation.y += dt * 0.12;
      shrineLight.intensity = 3.2 + Math.sin(elapsed * 2.4) * 0.9;
      shrineLabel.lookAt(player.camera.position);
      bossMarker.lookAt(player.camera.position);
      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i];
        f.angle += f.speed * dt;
        f.mesh.position.set(Math.cos(f.angle) * f.radius, f.y + Math.sin(elapsed * 0.2 + i) * 5, Math.sin(f.angle) * f.radius);
        f.mesh.rotation.x += f.spin * dt;
        f.mesh.rotation.y += f.spin * 0.7 * dt;
      }
      planets.rotation.y += dt * 0.003;
      sun.group.position.set(-850, -200, 350);
    },
    distanceToShrine(player) {
      return player.group.position.distanceTo(shrine.position.clone().add(new THREE.Vector3(0, 0, 0)));
    },
    distanceToBoss(player) {
      return player.group.position.distanceTo(bossAnchor);
    },
    isOutsideUniverse(player) {
      return player.group.position.length() > boundary.radius;
    },
  };
  return deep;
}
