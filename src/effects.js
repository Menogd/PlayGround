import * as THREE from '../vendor/three.module.js';
import { TAU, rand, clamp } from './utils.js';

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15, 'rgba(255,255,255,.85)');
  g.addColorStop(0.5, 'rgba(255,255,255,.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.glowTexture = makeGlowTexture();
    this.effects = [];
    this.debris = [];
    this.spaceMode = false;
    this.time = 0;
    this.maxDebris = 170;
  }

  add(mesh, update, life) {
    this.scene.add(mesh);
    this.effects.push({ mesh, update, life, maxLife: life });
    return mesh;
  }

  hit(position, color = 0xffffff) {
    const group = new THREE.Group();
    group.position.copy(position);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(2.5, 2.5, 1);
    group.add(glow);
    for (let i = 0; i < 7; i++) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, rand(0.2, 0.7)), new THREE.MeshBasicMaterial({ color }));
      spark.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
      spark.position.set(rand(-0.4, 0.4), rand(-0.4, 0.4), rand(-0.4, 0.4));
      spark.userData.vel = new THREE.Vector3(rand(-8, 8), rand(-2, 9), rand(-8, 8));
      group.add(spark);
    }
    this.add(group, (g, dt) => {
      glow.material.opacity = Math.max(0, glow.material.opacity - dt * 5);
      glow.scale.multiplyScalar(1 + dt * 2.4);
      for (const spark of g.children) {
        if (!spark.userData.vel) continue;
        spark.position.addScaledVector(spark.userData.vel, dt);
        spark.userData.vel.y -= 25 * dt;
        spark.rotation.x += dt * 9;
      }
    }, 0.35);
  }

  shock(position, color = 0x62e6ff, scale = 1) {
    const geo = new THREE.SphereGeometry(0.5, 12, 10);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.position.copy(position);
    mesh.scale.setScalar(scale);
    this.add(mesh, (m, dt) => {
      m.scale.multiplyScalar(1 + dt * 4.4);
      m.material.opacity = Math.max(0, m.material.opacity - dt * 2.2);
    }, 0.45);
  }

  ring(position, color = 0xff2b45, radius = 8, duration = 0.7, flat = true) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    mesh.position.copy(position);
    if (flat) mesh.rotation.x = -Math.PI / 2;
    mesh.scale.setScalar(0.1);
    this.add(mesh, (m, dt, t) => {
      const p = 1 - t;
      m.scale.setScalar(radius * (1 - p * p * p));
      m.material.opacity = p * 0.75;
    }, duration);
  }

  telegraph(position, radius, duration, color = 0xff2b45) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y += 0.1;
    mesh.scale.setScalar(radius);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false,
    }));
    inner.rotation.x = -Math.PI / 2;
    inner.scale.setScalar(radius);
    inner.position.y = 0.02;
    mesh.add(inner);
    this.add(mesh, (m, dt, t) => {
      m.material.opacity = 0.22 + Math.abs(Math.sin(t * 16)) * 0.45;
      m.rotation.z += dt * 0.9;
      inner.material.opacity = 0.04 + (1 - t) * 0.12;
    }, duration);
  }

  explosion(position, color = 0xff8a3c, scale = 1) {
    const group = new THREE.Group();
    group.position.copy(position);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.setScalar(8 * scale);
    group.add(glow);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 * scale, 1), new THREE.MeshBasicMaterial({ color: 0xfff1c7, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(core);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(2 * scale);
    group.add(ring);
    this.add(group, (g, dt) => {
      glow.material.opacity = Math.max(0, glow.material.opacity - dt * 2.1);
      glow.scale.multiplyScalar(1 + dt * 1.8);
      core.scale.multiplyScalar(1 + dt * 2.4);
      core.material.opacity = Math.max(0, core.material.opacity - dt * 3);
      ring.scale.multiplyScalar(1 + dt * 4);
      ring.material.opacity = Math.max(0, ring.material.opacity - dt * 1.9);
    }, 0.8);
    const count = Math.round(14 * scale);
    this.spawnDebris(position, [0x2b2d33, 0x8a5b39, color, 0xdddddd], count, 16 * scale);
  }

  portal(position, scale = 2) {
    const group = new THREE.Group();
    group.position.copy(position);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(scale, 0.07 * scale, 6, 48), new THREE.MeshBasicMaterial({ color: 0xb56bff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.8, 32), new THREE.MeshBasicMaterial({ color: 0x5c11a6, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    inner.rotation.x = -Math.PI / 2;
    group.add(inner);
    const light = new THREE.PointLight(0xb56bff, 2, 20, 2);
    group.add(light);
    this.add(group, (g, dt, t) => {
      ring.rotation.z += dt * 2;
      ring.material.opacity = (1 - t) * 0.7;
      inner.material.opacity = (1 - t) * 0.35;
      light.intensity = (1 - t) * 2;
      g.scale.setScalar(1 + t * 0.4);
    }, 0.7);
  }

  webSplat(position, normal, color = 0xffffff) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    mesh.position.copy(position);
    if (normal) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
      mesh.quaternion.copy(q);
    }
    this.add(mesh, (m, dt) => {
      m.material.opacity = Math.max(0, m.material.opacity - dt * 0.22);
      m.scale.setScalar(1 + dt * 0.06);
    }, 6);
  }

  spawnDebris(position, colors, count = 10, power = 10) {
    const capped = Math.min(count, this.maxDebris - this.debris.length);
    for (let i = 0; i < capped; i++) {
      const size = rand(0.22, 0.8);
      const geo = Math.random() > 0.65 ? new THREE.IcosahedronGeometry(size, 0) : new THREE.BoxGeometry(size, size * rand(0.4, 1.8), size * rand(0.5, 1.4));
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.84, metalness: 0.25,
      }));
      m.position.copy(position).add(new THREE.Vector3(rand(-0.8, 0.8), rand(-0.2, 0.8), rand(-0.8, 0.8)));
      m.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
      m.userData.velocity = new THREE.Vector3(rand(-power, power), rand(power * 0.25, power * 1.25), rand(-power, power));
      m.userData.spin = new THREE.Vector3(rand(-8, 8), rand(-8, 8), rand(-8, 8));
      m.userData.life = rand(3.2, 7.5);
      m.userData.maxLife = m.userData.life;
      this.scene.add(m);
      this.debris.push(m);
    }
  }

  gravityPull(playerPos, bossPos, dt) {
    if (Math.random() > dt * 20) return;
    const dir = bossPos.clone().sub(playerPos).normalize();
    const start = playerPos.clone().add(new THREE.Vector3(rand(-16, 16), rand(-8, 8), rand(-16, 16)));
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, rand(1.2, 3.4)), new THREE.MeshBasicMaterial({ color: 0xb56bff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    streak.position.copy(start);
    streak.lookAt(bossPos);
    streak.userData.vel = dir.multiplyScalar(55);
    this.add(streak, (m, delta) => {
      m.position.addScaledVector(m.userData.vel, delta);
      m.material.opacity = Math.max(0, m.material.opacity - delta * 0.7);
    }, 0.7);
  }

  portalBurst(position, color = 0x62e6ff) {
    for (let i = 0; i < 3; i++) this.ring(position, color, 8 + i * 5, 0.55 + i * 0.18);
    this.shock(position, color, 1.5);
  }

  update(dt) {
    this.time += dt;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      const t = clamp(fx.life / fx.maxLife, 0, 1);
      fx.update?.(fx.mesh, dt, t);
      if (fx.life <= 0) {
        this.scene.remove(fx.mesh);
        fx.mesh.traverse?.((c) => {
          c.geometry?.dispose();
          if (c.material) {
            c.material.map?.dispose();
            c.material.dispose();
          }
        });
        this.effects.splice(i, 1);
      }
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.userData.life -= dt;
      const gravity = this.spaceMode ? 0 : -30;
      d.userData.velocity.y += gravity * dt;
      d.position.addScaledVector(d.userData.velocity, dt);
      d.rotation.x += d.userData.spin.x * dt;
      d.rotation.y += d.userData.spin.y * dt;
      d.rotation.z += d.userData.spin.z * dt;
      if (!this.spaceMode && d.position.y < 0.3) {
        d.position.y = 0.3;
        d.userData.velocity.y *= -0.28;
        d.userData.velocity.x *= 0.7;
        d.userData.velocity.z *= 0.7;
        d.userData.spin.multiplyScalar(0.65);
      }
      if (d.userData.life < 1) d.scale.setScalar(Math.max(0.01, d.userData.life));
      if (d.userData.life <= 0) {
        this.scene.remove(d);
        d.geometry.dispose();
        d.material.dispose();
        this.debris.splice(i, 1);
      }
    }
  }

  setSpaceMode(space) {
    this.spaceMode = space;
  }

  clear() {
    for (const fx of this.effects) this.scene.remove(fx.mesh);
    for (const d of this.debris) this.scene.remove(d);
    this.effects = [];
    this.debris = [];
  }
}

Effects.prototype.setScene = function (scene) {
  this.clear();
  this.scene = scene;
};
