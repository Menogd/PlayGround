import * as THREE from '../vendor/three.module.js';
import { TAU, clamp, damp, rand } from './utils.js';

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: options.roughness ?? 0.72, metalness: options.metalness ?? 0.18,
    emissive: options.emissive ?? 0x000000, emissiveIntensity: options.emissiveIntensity ?? 0.2,
  });
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function makeThug() {
  const group = new THREE.Group();
  const dark = mat(0x171a22);
  const red = mat(0x7d1221, { emissive: 0x2a0007, emissiveIntensity: 0.3 });
  const skin = mat(0xb17b61);
  const torso = box(0.56, 0.72, 0.34, dark, 0, 1.24, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 7), skin);
  head.position.y = 1.77;
  const mask = box(0.3, 0.1, 0.22, red, 0, 1.79, -0.13);
  const armL = box(0.16, 0.62, 0.17, dark, -0.39, 1.25, 0);
  const armR = box(0.16, 0.62, 0.17, dark, 0.39, 1.25, 0);
  const legL = box(0.2, 0.65, 0.22, mat(0x242a35), -0.16, 0.45, 0);
  const legR = box(0.2, 0.65, 0.22, mat(0x242a35), 0.16, 0.45, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.82, 24), new THREE.MeshBasicMaterial({ color: 0xff2b45, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(torso, head, mask, armL, armR, legL, legR, ring);
  return { group, parts: { torso, head, armL, armR, legL, legR }, mats: [dark, red, skin], ring };
}

function makeBroker() {
  const group = new THREE.Group();
  const suit = mat(0x0c0f16, { metalness: 0.42, roughness: 0.36 });
  const gold = mat(0xb48b3b, { metalness: 0.78, roughness: 0.25, emissive: 0x3f2900, emissiveIntensity: 0.5 });
  const shirt = mat(0x241015);
  const skin = mat(0xc09272);
  const torso = box(1.3, 1.5, 0.72, suit, 0, 1.95, 0);
  const shouldersL = box(0.6, 0.35, 0.8, gold, -0.85, 2.52, 0);
  const shouldersR = box(0.6, 0.35, 0.8, gold, 0.85, 2.52, 0);
  const shirtFront = box(0.52, 1.05, 0.06, shirt, 0, 1.96, -0.38);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 9), skin);
  head.position.y = 2.92;
  const mask = box(0.66, 0.2, 0.38, gold, 0, 2.95, -0.28);
  const armL = box(0.32, 1.2, 0.34, suit, -0.9, 1.8, 0);
  const armR = box(0.32, 1.2, 0.34, suit, 0.9, 1.8, 0);
  const legL = box(0.38, 1.2, 0.44, suit, -0.33, 0.62, 0);
  const legR = box(0.38, 1.2, 0.44, suit, 0.33, 0.62, 0);
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 18), gold);
  chain.position.set(0, 2.48, -0.24);
  const briefcase = box(0.65, 0.45, 0.18, gold, 1.08, 0.86, 0.1);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 1.95, 32), new THREE.MeshBasicMaterial({ color: 0xffc657, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(torso, shouldersL, shouldersR, shirtFront, head, mask, armL, armR, legL, legR, chain, briefcase, ring);
  return { group, parts: { torso, head, armL, armR, legL, legR, briefcase }, mats: [suit, gold, shirt, skin], ring };
}

function makeVulture() {
  const group = new THREE.Group();
  const green = mat(0x2f4b34, { roughness: 0.5, metalness: 0.32, emissive: 0x071b0a, emissiveIntensity: 0.2 });
  const metal = mat(0x59636a, { metalness: 0.75, roughness: 0.28 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x273a2b, roughness: 0.45, metalness: 0.36, side: THREE.DoubleSide });
  const skin = mat(0x9b7b62);
  const torso = box(0.72, 0.92, 0.54, green, 0, 2.2, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 7), skin);
  head.position.set(0, 2.84, -0.04);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 5), metal);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 2.78, -0.28);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.8, 6), metal);
  jet.position.set(0, 1.85, 0.28);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 2.7, 0.35, -0.2, 2.2, 0, 1.7,
    0, 0, 0, 2.2, 0, 1.7, 0.7, -0.1, 1.2,
  ], 3));
  wingGeo.computeVertexNormals();
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.35, 2.5, 0);
  wingL.scale.x = -1;
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.35, 2.5, 0);
  const legL = box(0.2, 0.7, 0.24, green, -0.2, 1.25, 0);
  const legR = box(0.2, 0.7, 0.24, green, 0.2, 1.25, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.02, 24), new THREE.MeshBasicMaterial({ color: 0x67ff9d, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -2.1;
  group.add(torso, head, beak, jet, wingL, wingR, legL, legR, ring);
  group.scale.setScalar(1.15);
  return { group, parts: { torso, head, wingL, wingR, legL, legR, jet }, mats: [green, metal, skin, wingMat], ring };
}

function makeHerald() {
  const group = new THREE.Group();
  const robe = mat(0x181127, { roughness: 0.5, metalness: 0.25, emissive: 0x1b0738, emissiveIntensity: 0.55 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xb56bff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.3, 8), robe);
  hood.position.y = 1.8;
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.33, 8, 7), new THREE.MeshBasicMaterial({ color: 0x09020f }));
  inner.position.set(0, 2.3, -0.34);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), glow);
  eyeL.position.set(-0.13, 2.31, -0.65);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.13;
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), glow);
  orb.position.set(0, 1.05, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.04, 6, 48), glow);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.55;
  const ring2 = ring.clone();
  ring2.scale.setScalar(1.35);
  ring2.rotation.z = Math.PI / 3;
  const groupRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.62, 32), new THREE.MeshBasicMaterial({ color: 0xb56bff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  groupRing.rotation.x = -Math.PI / 2;
  groupRing.position.y = 0.03;
  group.add(hood, inner, eyeL, eyeR, orb, ring, ring2, groupRing);
  group.scale.setScalar(1.15);
  return { group, parts: { hood, orb, ring, ring2 }, mats: [robe], glow, ring: groupRing };
}

function makeSovereign() {
  const group = new THREE.Group();
  const dark = mat(0x130b24, { roughness: 0.38, metalness: 0.55, emissive: 0x250653, emissiveIntensity: 0.8 });
  const gold = mat(0x806027, { roughness: 0.3, metalness: 0.9, emissive: 0x3a2200, emissiveIntensity: 0.55 });
  const purple = new THREE.MeshBasicMaterial({ color: 0xc77bff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 2), new THREE.MeshStandardMaterial({ color: 0x2b0f45, emissive: 0xb04dff, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.4 }));
  const shell = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.18, 8, 64), gold);
  shell.rotation.x = Math.PI / 2.6;
  const shell2 = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.08, 6, 64), purple);
  shell2.rotation.x = Math.PI / 1.8;
  shell2.rotation.z = Math.PI / 4;
  const crown = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.5, 4), gold);
    const a = (i / 8) * TAU;
    spike.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0);
    spike.rotation.z = a - Math.PI / 2;
    crown.add(spike);
  }
  crown.rotation.x = Math.PI / 2;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), purple);
  eyeL.position.set(-0.65, 0.35, -1.9);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.65;
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.4, 5.7, 48), new THREE.MeshBasicMaterial({ color: 0xd18aff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  const group2 = new THREE.Group();
  group2.add(core, shell, shell2, crown, eyeL, eyeR, ring);
  group2.scale.setScalar(1.7);
  for (let i = 0; i < 7; i++) {
    const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.55, 5.5 + Math.random() * 3, 5), dark);
    const a = (i / 7) * TAU;
    tentacle.position.set(Math.cos(a) * 3.5, -3.8, Math.sin(a) * 3.5);
    tentacle.rotation.z = Math.cos(a) * 0.35;
    tentacle.rotation.x = Math.sin(a) * 0.35;
    group2.add(tentacle);
  }
  group.add(group2);
  return { group, parts: { core, shell, shell2, crown, eyeL, eyeR, inner: group2 }, mats: [dark, gold], glow: purple, ring };
}

const MODELS = {
  thug: makeThug,
  broker: makeBroker,
  vulture: makeVulture,
  herald: makeHerald,
  sovereign: makeSovereign,
};

export class EnemyManager {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this.enemies = [];
    this.projectiles = [];
    this.boss = null;
    this.challengeActive = false;
    this.time = 0;
  }

  spawn(type, position, options = {}) {
    const factory = MODELS[type] || makeThug;
    const visual = factory();
    visual.group.position.copy(position);
    this.scene.add(visual.group);
    const stats = {
      thug: { hp: 42, radius: 0.75, speed: 4.1, damage: 8, reward: 1 },
      broker: { hp: 360, radius: 2.2, speed: 7.5, damage: 18, reward: 1, boss: true },
      vulture: { hp: 300, radius: 1.4, speed: 20, damage: 14, reward: 1, boss: true },
      herald: { hp: 330, radius: 1.4, speed: 13, damage: 16, reward: 1, boss: true },
      sovereign: { hp: 780, radius: 7, speed: 18, damage: 22, reward: 1, boss: true },
    }[type] || {};
    const enemy = {
      type, ...visual, name: options.name || { thug: 'BROKER ENFORCER', broker: 'THE BROKER', vulture: 'THE VULTURE', herald: 'VOID HERALD', sovereign: 'THE VOID SOVEREIGN' }[type],
      hp: options.hp ?? stats.hp, maxHp: options.hp ?? stats.hp, radius: stats.radius,
      speed: stats.speed, damage: stats.damage, boss: Boolean(stats.boss), reward: stats.reward,
      home: position.clone(), alive: true, flash: 0, stun: 0, attackCd: 1 + Math.random() * 2,
      state: 'idle', stateTimer: 0, phase: 1, age: 0, hitCooldown: 0, deathTimer: 0,
      spawnPortal: options.portal || false, aggro: options.aggro ?? true, baseY: position.y,
      bobPhase: Math.random() * TAU, vulnerable: 1, ringPulse: Math.random() * TAU,
      onDeath: options.onDeath, scale: options.scale || 1, velocity: new THREE.Vector3(),
    };
    if (options.scale) visual.group.scale.multiplyScalar(options.scale);
    for (const m of visual.mats) {
      if (m.emissive) {
        m.userData.baseEmissive = m.emissive.getHex();
        m.userData.baseEmissiveIntensity = m.emissiveIntensity;
      }
    }
    if (enemy.boss) {
      this.boss = enemy;
      enemy.ring.material.opacity = 0.5;
    }
    if (options.portal) {
      this.ctx.effects.portal(position, type === 'sovereign' ? 8 : 2);
    }
    this.enemies.push(enemy);
    if (enemy.boss) this.ctx.onBossSpawn?.(enemy);
    return enemy;
  }

  spawnGroup(type, count, center, spread = 5) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU;
      const pos = center.clone().add(new THREE.Vector3(Math.cos(angle) * spread, 0, Math.sin(angle) * spread));
      list.push(this.spawn(type, pos, { aggro: true }));
    }
    return list;
  }

  setChallenge(active) {
    this.challengeActive = active;
  }

  getAliveCount() {
    return this.enemies.filter((e) => e.alive && !e.boss).length;
  }

  getBoss() {
    return this.boss && this.boss.alive ? this.boss : null;
  }

  damage(enemy, amount, source = null, options = {}) {
    if (!enemy || !enemy.alive) return false;
    const multiplier = enemy.vulnerable || 1;
    const dealt = amount * multiplier;
    enemy.hp -= dealt;
    enemy.flash = 0.13;
    enemy.stun = Math.max(enemy.stun, options.stun ?? 0);
    if (source) {
      const dir = enemy.group.position.clone().sub(source);
      dir.y = 0;
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        enemy.velocity.addScaledVector(dir, options.knockback ?? 4);
      }
    }
    this.ctx.effects.hit(enemy.group.position.clone().add(new THREE.Vector3(0, enemy.boss ? 2 : 1.2, 0)), options.color || 0xffffff);
    this.ctx.audio.play('hit');
    if (enemy.boss) {
      const ratio = enemy.hp / enemy.maxHp;
      const phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
      if (phase !== enemy.phase) {
        enemy.phase = phase;
        this.ctx.onBossPhase?.(enemy, phase);
        this.ctx.effects.ring(enemy.group.position, 0xff2b45, enemy.radius * 3, 0.65);
      }
      this.ctx.onBossUpdate?.(enemy);
    }
    if (enemy.hp <= 0) this.kill(enemy);
    return true;
  }

  kill(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    const color = enemy.type === 'sovereign' ? 0xca7bff : enemy.type === 'vulture' ? 0x66ff9f : enemy.type === 'broker' ? 0xffc657 : 0xff405a;
    this.ctx.effects.explosion(enemy.group.position.clone().add(new THREE.Vector3(0, 1, 0)), color, enemy.boss ? 4 : 1.4);
    this.ctx.audio.play('explosion');
    this.scene.remove(enemy.group);
    if (enemy.boss) {
      if (this.boss === enemy) this.boss = null;
      this.ctx.onBossDefeated?.(enemy);
    } else {
      this.ctx.onEnemyDeath?.(enemy);
    }
    enemy.onDeath?.();
    setTimeout(() => {
      const i = this.enemies.indexOf(enemy);
      if (i >= 0) this.enemies.splice(i, 1);
    }, 20);
  }

  clear() {
    for (const enemy of [...this.enemies]) {
      if (enemy.alive) this.scene.remove(enemy.group);
    }
    this.enemies = [];
    this.boss = null;
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
  }

  raycast(origin, direction, maxDist = 120) {
    let best = null;
    let bestDist = maxDist;
    const ray = new THREE.Ray(origin, direction);
    const point = new THREE.Vector3();
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const center = enemy.group.position.clone().add(new THREE.Vector3(0, enemy.boss ? 2.4 : 1.2, 0));
      const sphere = new THREE.Sphere(center, enemy.boss ? enemy.radius * 1.35 : enemy.radius * 1.3);
      if (ray.intersectSphere(sphere, point)) {
        const d = origin.distanceTo(point);
        if (d < bestDist) {
          best = enemy;
          bestDist = d;
        }
      }
    }
    return best ? { enemy: best, distance: bestDist, point } : null;
  }

  melee(origin, direction, range = 5.2, damage = 18, heavy = false) {
    const flatDir = direction.clone();
    flatDir.y = 0;
    if (flatDir.lengthSq() === 0) flatDir.set(0, 0, -1);
    flatDir.normalize();
    const hits = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const to = enemy.group.position.clone().sub(origin);
      const dist = to.length();
      const vertical = Math.abs(enemy.group.position.y - origin.y);
      to.y = 0;
      if (dist > range + enemy.radius || vertical > (enemy.boss ? enemy.radius * 2 : 2.8)) continue;
      to.normalize();
      if (to.dot(flatDir) < 0.15 && dist > 1.6) continue;
      const dealt = damage * (enemy.boss ? 1 : 1.12);
      this.damage(enemy, dealt, origin, { knockback: heavy ? 13 : 5, color: 0xffd0a0 });
      hits.push(enemy);
    }
    return hits;
  }

  aoe(center, radius, damage, color = 0x62e6ff) {
    const hits = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = enemy.group.position.distanceTo(center);
      if (d <= radius + enemy.radius) {
        this.damage(enemy, damage, center, { knockback: 8, color });
        hits.push(enemy);
      }
    }
    if (hits.length) this.ctx.audio.play('blast');
    return hits;
  }

  spawnProjectile(origin, direction, options = {}) {
    const color = options.color ?? 0xff4566;
    const radius = options.radius ?? 0.22;
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 5), material);
    mesh.position.copy(origin);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.ctx.effects.glowTexture, color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(radius * 8, radius * 8, 1);
    mesh.add(glow);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh, velocity: direction.clone().normalize().multiplyScalar(options.speed ?? 28),
      damage: options.damage ?? 10, life: options.life ?? 4, homing: options.homing ?? 0,
      radius, kind: options.kind || 'orb', target: options.target || null,
    });
  }

  updateProjectiles(dt, player) {
    const playerPos = player.group.position.clone().add(new THREE.Vector3(0, 1, 0));
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.homing > 0) {
        const desired = playerPos.clone().sub(p.mesh.position).normalize().multiplyScalar(p.velocity.length());
        p.velocity.lerp(desired, p.homing * dt);
      }
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.y += dt * 3;
      if (p.mesh.position.distanceTo(playerPos) < p.radius + 0.7) {
        if (player.takeDamage(p.damage, p.mesh.position)) {
          this.ctx.effects.hit(playerPos, p.mesh.material.color.getHex());
          this.ctx.audio.play('hurt');
        }
        this.removeProjectile(i);
        continue;
      }
      if (p.life <= 0 || p.mesh.position.length() > 30000) this.removeProjectile(i);
    }
  }

  removeProjectile(index) {
    const p = this.projectiles[index];
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
    p.mesh.children.forEach((c) => {
      c.material?.map?.dispose();
      c.material?.dispose();
    });
    this.projectiles.splice(index, 1);
  }

  update(dt, player) {
    this.time += dt;
    const playerPos = player.group.position.clone();
    this.updateProjectiles(dt, player);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.age += dt;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.stun = Math.max(0, enemy.stun - dt);
      enemy.attackCd -= dt;
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
      const toPlayer = playerPos.clone().sub(enemy.group.position);
      const dist = toPlayer.length();
      const flatDist = Math.hypot(toPlayer.x, toPlayer.z);
      const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
      if (enemy.type !== 'sovereign' && enemy.type !== 'herald') {
        const rotDiff = ((targetYaw - enemy.group.rotation.y + Math.PI * 3) % TAU) - Math.PI;
        enemy.group.rotation.y += rotDiff * Math.min(1, dt * 6);
      }
      if (enemy.flash > 0) {
        for (const m of enemy.mats) {
          if (m.emissive) m.emissive.setHex(0xffffff);
          if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 1.2;
        }
      } else {
        for (const m of enemy.mats) {
          if (m.emissive) m.emissive.setHex(m.userData.baseEmissive ?? 0);
          if (m.emissiveIntensity !== undefined) m.emissiveIntensity = m.userData.baseEmissiveIntensity ?? 0.2;
        }
      }
      enemy.ring.material.opacity = 0.25 + Math.sin(this.time * 3 + enemy.ringPulse) * 0.12;
      enemy.ring.rotation.z += dt * 0.5;
      if (enemy.stun > 0) {
        enemy.group.position.y = Math.max(0.3, enemy.group.position.y - dt * 5);
        if (enemy.type === 'vulture') enemy.group.rotation.z = Math.sin(this.time * 12) * 0.4;
        continue;
      }
      switch (enemy.type) {
        case 'thug': this.updateThug(enemy, player, dt, flatDist, dist); break;
        case 'broker': this.updateBroker(enemy, player, dt, flatDist, dist); break;
        case 'vulture': this.updateVulture(enemy, player, dt, flatDist); break;
        case 'herald': this.updateHerald(enemy, player, dt, flatDist); break;
        case 'sovereign': this.updateSovereign(enemy, player, dt, flatDist); break;
      }
      enemy.group.position.addScaledVector(enemy.velocity, dt);
      enemy.velocity.multiplyScalar(1 - 4 * dt);
    }
  }

  updateThug(enemy, player, dt, flatDist, dist) {
    const pos = enemy.group.position;
    if (flatDist < 85) {
      if (flatDist > 2.1) {
        const dir = player.group.position.clone().sub(pos);
        dir.y = 0;
        dir.normalize();
        enemy.velocity.addScaledVector(dir, enemy.speed * 8 * dt);
      }
      if (flatDist < 3.2 && enemy.attackCd <= 0) {
        enemy.attackCd = 1.25 + Math.random() * 0.6;
        player.takeDamage(enemy.damage, pos);
        enemy.parts.armR.rotation.x = -2.2;
        this.ctx.effects.shock(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff2b45, 1.2);
      }
      if (dist > 13 && dist < 38 && enemy.attackCd < 2.1) {
        enemy.attackCd = 3.3;
        this.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 1.5, 0)), player.group.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(pos).normalize(), { speed: 22, damage: 7, color: 0xff2b45, life: 2.4 });
      }
    }
    const swing = Math.sin(this.time * 9 + enemy.bobPhase) * 0.45;
    enemy.parts.legL.rotation.x = swing;
    enemy.parts.legR.rotation.x = -swing;
    enemy.parts.armL.rotation.x = -swing * 0.7;
    enemy.parts.armR.rotation.x = damp(enemy.parts.armR.rotation.x, swing * 0.7, 6, dt);
  }

  updateBroker(enemy, player, dt, flatDist, dist) {
    const pos = enemy.group.position;
    const phase = enemy.phase;
    if (enemy.state === 'slam') {
      enemy.stateTimer -= dt;
      enemy.velocity.multiplyScalar(0.9);
      if (enemy.stateTimer <= 0) {
        enemy.state = 'idle';
        this.ctx.effects.ring(pos, 0xffc657, 10, 0.55);
        this.ctx.effects.explosion(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xffc657, 2.6);
        this.ctx.audio.play('heavy');
        if (dist < 11) player.takeDamage(16 + phase * 3, pos);
        enemy.attackCd = 3.4 - phase * 0.4;
      }
      return;
    }
    if (enemy.state === 'charge') {
      enemy.stateTimer -= dt;
      const dir = player.group.position.clone().sub(pos);
      dir.y = 0;
      dir.normalize();
      enemy.velocity.copy(dir).multiplyScalar(24 + phase * 3);
      if (dist < 4.8 && enemy.hitCooldown <= 0) {
        enemy.hitCooldown = 1;
        player.takeDamage(18, pos);
        this.ctx.effects.shock(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffc657, 2);
      }
      if (enemy.stateTimer <= 0) {
        enemy.state = 'idle';
        enemy.attackCd = 2.2;
        this.ctx.effects.ring(pos, 0xffc657, 6, 0.5);
      }
      return;
    }
    if (flatDist > 4.2) {
      const dir = player.group.position.clone().sub(pos);
      dir.y = 0;
      dir.normalize();
      enemy.velocity.addScaledVector(dir, enemy.speed * 6 * dt);
    }
    if (enemy.attackCd <= 0) {
      if (flatDist < 9) {
        enemy.state = 'slam';
        enemy.stateTimer = 0.8;
        this.ctx.effects.telegraph(pos.clone(), 10, 0.8, 0xffc657);
        this.ctx.audio.play('boss');
      } else if (flatDist > 10) {
        enemy.state = 'charge';
        enemy.stateTimer = 0.9;
        this.ctx.effects.telegraph(pos.clone(), 3.2, 0.5, 0xffc657);
      }
    }
    if (phase >= 2 && Math.random() < dt * 0.4) {
      this.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 2.2, 0)), player.group.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(pos).normalize(), { speed: 22, damage: 10, color: 0xffc657, life: 3 });
    }
    if (phase >= 3 && Math.random() < dt * 0.22) {
      this.spawnGroup('thug', 1, pos.clone().add(new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6))), 1);
    }
    enemy.parts.armL.rotation.x = Math.sin(this.time * 4) * 0.2;
    enemy.parts.armR.rotation.x = -Math.sin(this.time * 4) * 0.2;
  }

  updateVulture(enemy, player, dt, flatDist) {
    const pos = enemy.group.position;
    const phase = enemy.phase;
    if (enemy.state === 'dive') {
      enemy.stateTimer -= dt;
      const dir = player.group.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(pos);
      const targetDist = dir.length();
      dir.normalize();
      enemy.velocity.copy(dir).multiplyScalar(38);
      if (targetDist < 5 && enemy.hitCooldown <= 0) {
        enemy.hitCooldown = 1.2;
        player.takeDamage(15, pos);
        this.ctx.effects.shock(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x66ff9f, 1.6);
      }
      if (enemy.stateTimer <= 0) {
        enemy.state = 'circle';
        enemy.attackCd = 2.8;
      }
      return;
    }
    const angle = this.time * (0.34 + phase * 0.05);
    const radius = 17;
    const desired = new THREE.Vector3(
      player.group.position.x + Math.cos(angle) * radius,
      player.group.position.y + 17 + Math.sin(this.time * 0.7) * 3 + phase * 2,
      player.group.position.z + Math.sin(angle) * radius,
    );
    const diff = desired.sub(pos);
    enemy.velocity.addScaledVector(diff, dt * 1.2);
    if (enemy.attackCd <= 0) {
      enemy.state = 'dive';
      enemy.stateTimer = 1.05;
      this.ctx.effects.telegraph(pos.clone(), 2.4, 0.55, 0x66ff9f);
      this.ctx.audio.play('boss');
      return;
    }
    if (enemy.phase >= 2 && Math.random() < dt * 0.55) {
      const origin = pos.clone().add(new THREE.Vector3(0, -0.3, 0));
      const base = player.group.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(origin).normalize();
      for (let i = -2; i <= 2; i++) {
        const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.12);
        this.spawnProjectile(origin, dir, { speed: 30, damage: 8, color: 0x66ff9f, life: 2.8, kind: 'feather' });
      }
      enemy.attackCd = Math.max(enemy.attackCd, 1.5);
    }
    const flap = Math.sin(this.time * 10);
    enemy.parts.wingL.rotation.z = flap * 0.32 + 0.05;
    enemy.parts.wingR.rotation.z = -flap * 0.32 - 0.05;
    enemy.parts.wingL.rotation.x = 0.15;
    enemy.parts.wingR.rotation.x = 0.15;
  }

  updateHerald(enemy, player, dt, flatDist) {
    const pos = enemy.group.position;
    const phase = enemy.phase;
    if (enemy.state === 'teleport') {
      enemy.stateTimer -= dt;
      enemy.group.scale.setScalar(1.15 * (enemy.stateTimer / 0.55));
      if (enemy.stateTimer <= 0) {
        const angle = rand(0, TAU);
        const target = player.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * 16, rand(6, 16), Math.sin(angle) * 16));
        pos.copy(target);
        enemy.group.scale.setScalar(1.15);
        enemy.state = 'idle';
        this.ctx.effects.portal(pos, 2.2);
        enemy.attackCd = 1.2;
      }
      return;
    }
    const orbit = this.time * 0.7;
    const desired = new THREE.Vector3(
      player.group.position.x + Math.cos(orbit) * 16,
      player.group.position.y + 10 + Math.sin(this.time * 1.2) * 2,
      player.group.position.z + Math.sin(orbit) * 16,
    );
    const diff = desired.sub(pos);
    enemy.velocity.addScaledVector(diff, dt * 1.4);
    enemy.parts.orb.rotation.y += dt * 2;
    enemy.parts.orb.rotation.x += dt;
    enemy.parts.ring.rotation.z += dt * 0.6;
    enemy.parts.ring2.rotation.y += dt * 0.4;
    if (enemy.attackCd <= 0) {
      const origin = pos.clone().add(new THREE.Vector3(0, 1, 0));
      const base = player.group.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(origin).normalize();
      const count = phase >= 2 ? 7 : 4;
      for (let i = 0; i < count; i++) {
        const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (count - 1) / 2) * 0.18);
        this.spawnProjectile(origin, dir, { speed: 24, damage: 9, color: 0xb56bff, life: 3.2, homing: 0.7 });
      }
      enemy.attackCd = 2.1 - phase * 0.25;
      this.ctx.audio.play('blast');
    }
    if (Math.random() < dt * 0.18) {
      enemy.state = 'teleport';
      enemy.stateTimer = 0.55;
    }
  }

  updateSovereign(enemy, player, dt, flatDist) {
    const pos = enemy.group.position;
    const phase = enemy.phase;
    if (enemy.state === 'pull') {
      enemy.stateTimer -= dt;
      const dir = pos.clone().sub(player.group.position).normalize();
      player.velocity.addScaledVector(dir, 55 * dt);
      this.ctx.effects.gravityPull(player.group.position, pos, dt);
      if (enemy.stateTimer <= 0) {
        enemy.state = 'idle';
        enemy.attackCd = 2.8;
        this.ctx.effects.ring(pos, 0xca7bff, 22, 0.8);
        if (player.group.position.distanceTo(pos) < 22) player.takeDamage(18, pos);
      }
      return;
    }
    const desired = player.group.position.clone().add(new THREE.Vector3(
      Math.cos(this.time * 0.24) * 30, 7 + Math.sin(this.time * 0.5) * 4, Math.sin(this.time * 0.24) * 30,
    ));
    const diff = desired.sub(pos);
    enemy.velocity.addScaledVector(diff, dt * 0.55);
    enemy.parts.shell.rotation.z += dt * 0.35;
    enemy.parts.shell.rotation.x += dt * 0.18;
    enemy.parts.shell2.rotation.y += dt * 0.5;
    enemy.parts.inner.rotation.y += dt * 0.2;
    enemy.parts.core.material.emissiveIntensity = 1.2 + Math.sin(this.time * 4) * 0.4;
    if (enemy.attackCd <= 0) {
      const roll = Math.random();
      if (roll < 0.4) {
        const count = 14 + phase * 2;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU;
          const dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.35, Math.sin(a)).normalize();
          this.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 1, 0)), dir, { speed: 22, damage: 9, color: 0xca7bff, life: 4.5, radius: 0.32 });
        }
        this.ctx.audio.play('boss');
        enemy.attackCd = 3.3;
      } else if (roll < 0.72) {
        for (let i = 0; i < 4 + phase; i++) {
          const origin = player.group.position.clone().add(new THREE.Vector3(rand(-45, 45), 30 + rand(0, 20), rand(-45, 45)));
          this.spawnProjectile(origin, player.group.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(origin).normalize(), { speed: 28, damage: 13, color: 0xff5fd7, life: 5, homing: 0.25, radius: 0.38 });
        }
        enemy.attackCd = 3.8;
      } else {
        enemy.state = 'pull';
        enemy.stateTimer = 2.2;
        this.ctx.effects.ring(pos, 0xca7bff, 30, 1.2);
        this.ctx.audio.play('transition');
        enemy.attackCd = 6.5;
      }
    }
    if (phase >= 2 && Math.random() < dt * 0.3) {
      const origin = pos.clone().add(new THREE.Vector3(rand(-5, 5), rand(-2, 5), rand(-5, 5)));
      this.spawnProjectile(origin, player.group.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(origin).normalize(), { speed: 34, damage: 11, color: 0xff5fd7, life: 4, homing: 0.5 });
    }
  }
}
