import * as THREE from '../vendor/three.module.js';
import { TAU, clamp, damp, lerp } from './utils.js';
import { GROUND_Y, CITY_BOUNDS } from './world.js';

function makeSuitTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b7112d';
  ctx.fillRect(0, 0, 256, 512);
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(255,255,255,.12)');
  grad.addColorStop(0.35, 'rgba(0,0,0,.05)');
  grad.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = 'rgba(8,8,15,.65)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(128, y + 12, 256, y);
    ctx.stroke();
  }
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.quadraticCurveTo(x, 256, 128, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 22) {
    for (let x = 0; x <= 256; x += 32) {
      ctx.beginPath();
      ctx.arc((x + (y / 22 % 2) * 16) % 256, y, 2, 0, TAU);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLensShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.13, 0.04);
  shape.quadraticCurveTo(-0.05, 0.16, 0.12, 0.08);
  shape.quadraticCurveTo(0.02, -0.08, -0.13, 0.04);
  return shape;
}

function addLimb(parent, pivot, length, width, material, lowerLength, lowerWidth) {
  const upper = new THREE.Group();
  upper.position.copy(pivot);
  const upperMesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, width), material);
  upperMesh.position.y = -length / 2;
  upper.add(upperMesh);
  const lower = new THREE.Group();
  lower.position.y = -length;
  const lowerMesh = new THREE.Mesh(new THREE.BoxGeometry(lowerWidth, lowerLength, lowerWidth), material);
  lowerMesh.position.y = -lowerLength / 2;
  lower.add(lowerMesh);
  upper.add(lower);
  parent.add(upper);
  return { upper, lower };
}

function createPlayerModel() {
  const suitTex = makeSuitTexture();
  const red = new THREE.MeshStandardMaterial({ map: suitTex, color: 0xffffff, roughness: 0.72, metalness: 0.08 });
  const redDark = new THREE.MeshStandardMaterial({ color: 0x8d0b22, roughness: 0.8 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x10265e, roughness: 0.72, metalness: 0.12 });
  const black = new THREE.MeshStandardMaterial({ color: 0x090a10, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9f7ff, emissive: 0x91ddff, emissiveIntensity: 0.65, roughness: 0.28, side: THREE.DoubleSide });

  const group = new THREE.Group();
  group.name = 'player';
  const body = new THREE.Group();
  group.add(body);
  const upperBody = new THREE.Group();
  body.add(upperBody);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.27, 0.64, 10), red);
  torso.position.y = 1.31;
  torso.scale.z = 0.72;
  upperBody.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.34, 0.3), red);
  chest.position.set(0, 1.48, 0);
  upperBody.add(chest);

  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.25), blue);
  abdomen.position.set(0, 1.0, 0);
  upperBody.add(abdomen);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.12, 0.26), black);
  belt.position.set(0, 0.93, 0);
  upperBody.add(belt);
  const pouchGeo = new THREE.BoxGeometry(0.1, 0.09, 0.06);
  for (const side of [-1, 1]) {
    const pouch = new THREE.Mesh(pouchGeo, black);
    pouch.position.set(side * 0.16, 0.91, -0.16);
    upperBody.add(pouch);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.15, 6), red);
  neck.position.y = 1.67;
  upperBody.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), red);
  head.scale.set(0.92, 1.08, 0.9);
  head.position.y = 1.84;
  upperBody.add(head);

  const lensShape = makeLensShape();
  const lensGeo = new THREE.ShapeGeometry(lensShape);
  for (const side of [-1, 1]) {
    const lens = new THREE.Mesh(lensGeo, white);
    lens.scale.set(side > 0 ? 1 : -1, 1, 1);
    lens.position.set(side * 0.1, 1.86, -0.205);
    lens.rotation.x = -0.1;
    upperBody.add(lens);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 4, 10), black);
    rim.scale.set(1.25, 0.7, 1);
    rim.position.set(side * 0.1, 1.855, -0.202);
    rim.rotation.z = side > 0 ? -0.1 : 0.1;
    upperBody.add(rim);
  }

  const spider = new THREE.Group();
  const spiderBody = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), black);
  spiderBody.scale.set(1, 1.35, 0.45);
  spider.add(spiderBody);
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.01), black);
    leg.position.set((i < 2 ? -1 : 1) * (0.03 + (i % 2) * 0.035), 0, 0);
    leg.rotation.z = (i < 2 ? 1 : -1) * (0.5 + (i % 2) * 0.45);
    spider.add(leg);
  }
  spider.position.set(0, 1.43, -0.156);
  upperBody.add(spider);

  const backSpider = spider.clone();
  backSpider.position.set(0, 1.42, 0.158);
  backSpider.scale.z = -1;
  upperBody.add(backSpider);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 7), red);
    shoulder.position.set(side * 0.37, 1.53, 0);
    shoulder.scale.set(1.1, 0.85, 0.95);
    upperBody.add(shoulder);
    const shoulderTrim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 4, 12), black);
    shoulderTrim.position.set(side * 0.39, 1.5, 0);
    shoulderTrim.rotation.y = Math.PI / 2;
    upperBody.add(shoulderTrim);
  }

  const leftArm = addLimb(upperBody, new THREE.Vector3(-0.39, 1.53, 0), 0.34, 0.16, red, 0.34, 0.14);
  const rightArm = addLimb(upperBody, new THREE.Vector3(0.39, 1.53, 0), 0.34, 0.16, red, 0.34, 0.14);
  leftArm.lower.children[0].material = blue;
  rightArm.lower.children[0].material = blue;
  const shooterGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.16, 6);
  for (const arm of [leftArm, rightArm]) {
    const shooter = new THREE.Mesh(shooterGeo, black);
    shooter.position.set(0, -0.23, -0.03);
    shooter.rotation.x = Math.PI / 2;
    arm.lower.add(shooter);
  }
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), red);
  leftHand.position.y = -0.37;
  leftArm.lower.add(leftHand);
  const rightHand = leftHand.clone();
  rightHand.position.y = -0.37;
  rightArm.lower.add(rightHand);

  const leftLeg = addLimb(body, new THREE.Vector3(-0.17, 0.88, 0), 0.42, 0.2, blue, 0.4, 0.17);
  const rightLeg = addLimb(body, new THREE.Vector3(0.17, 0.88, 0), 0.42, 0.2, blue, 0.4, 0.17);
  leftLeg.lower.children[0].material = red;
  rightLeg.lower.children[0].material = red;
  for (const leg of [leftLeg, rightLeg]) {
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), blue);
    knee.scale.set(1, 0.7, 0.85);
    knee.position.set(0, 0, -0.015);
    leg.upper.add(knee);
  }
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.34), redDark);
  leftFoot.position.set(0, -0.42, -0.07);
  leftLeg.lower.add(leftFoot);
  const rightFoot = leftFoot.clone();
  rightFoot.position.set(0, -0.42, -0.07);
  rightLeg.lower.add(rightFoot);

  return {
    group, body, upperBody, torso, chest, leftArm, rightArm, leftLeg, rightLeg,
    leftHand, rightHand, head, materials: { red, redDark, blue, black, white },
  };
}

export class Player {
  constructor(scene, camera, canvas, world, callbacks = {}) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.world = world;
    this.callbacks = callbacks;
    this.enabled = false;
    this.paused = false;
    this.keys = new Set();
    this.group = new THREE.Group();
    this.group.position.set(0, GROUND_Y, 560);
    scene.add(this.group);
    this.model = createPlayerModel();
    this.flipGroup = new THREE.Group();
    this.flipGroup.position.y = 0.95;
    this.model.group.position.y = -0.95;
    this.flipGroup.add(this.model.group);
    this.group.add(this.flipGroup);
    this.group.rotation.y = 0;

    this.velocity = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.radius = 0.46;
    this.height = 1.82;
    this.onGround = true;
    this.mode = 'ground';
    this.yaw = 0;
    this.pitch = 0.03;
    this.sensitivity = 0.0021;
    this.cameraDistance = 7.2;
    this.cameraHeight = 1.55;
    this.cameraFocus = new THREE.Vector3();
    this.cameraDesired = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.shake = 0;
    this.shakeTime = 0;

    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.focus = 100;
    this.maxFocus = 100;
    this.god = false;
    this.flightUnlocked = false;
    this.senseUnlocked = true;
    this.blastUnlocked = true;
    this.lastDamage = -99;
    this.invulnerable = 0;
    this.speedBoost = 1;
    this.attackAnim = 0;
    this.senseGlow = 0;
    this.landTimer = 0;
    this.runPhase = 0;
    this.idlePhase = 0;
    this.flipTime = 0;
    this.flipDuration = 0;
    this.flipKind = 'back';
    this.flipSide = 0;
    this.rollTime = 0;
    this.rollDuration = 0.46;
    this.mantleTime = 0;
    this.climbing = false;
    this.releaseTimer = 0;
    this.trailTimer = 0;
    this.stepTimer = 0;
    this.swingSide = 1;
    this.swingAnchor = new THREE.Vector3();
    this.ropeLength = 0;
    this.swingTimer = 0;
    this.zipTarget = new THREE.Vector3();
    this.zipTimer = 0;
    this.webTarget = null;
    this.nearWall = new THREE.Vector3();
    this.wallTop = 0;
    this.wallContact = false;
    this.doubleJumped = false;
    this.wantJump = false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.climbStamina = 0;
    this.spaceMode = false;
    this.spaceSpeed = 175;
    this.spaceBoost = 520;
    this.planetSurface = null;
    this.cameraCollisionDist = 0;

    const webGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 4, 1, true);
    webGeo.translate(0, 0.5, 0);
    this.webMesh = new THREE.Mesh(webGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false }));
    this.webMesh.visible = false;
    scene.add(this.webMesh);
    this.webGlow = new THREE.Mesh(webGeo, new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.webGlow.visible = false;
    scene.add(this.webGlow);

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = GROUND_Y + 0.015;
    scene.add(this.shadow);

    this.orbitRing = null;
    this.setupInput();
  }

  setupInput() {
    this.onKeyDown = (event) => {
      if (!this.enabled) return;
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'KeyF'].includes(event.code)) {
        if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
      }
      if (event.repeat) {
        this.keys.add(event.code);
        return;
      }
      this.keys.add(event.code);
      if (event.code === 'Space' && this.enabled && !this.paused) {
        this.wantJump = true;
        this.jumpBuffer = 0.16;
      }
      if (event.code === 'KeyF' && !this.paused) this.toggleFlight();
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    this.onMouseMove = (event) => {
      if (!this.enabled || this.paused) return;
      if (document.pointerLockElement !== this.canvas) return;
      this.yaw -= event.movementX * this.sensitivity;
      this.pitch -= event.movementY * this.sensitivity;
      this.pitch = clamp(this.pitch, -1.15, 1.28);
    };
    this.onMouseDown = (event) => {
      if (!this.enabled || this.paused) return;
      if (document.pointerLockElement !== this.canvas) this.callbacks.onRequestPointerLock?.();
      if (event.button === 0) this.callbacks.onPrimaryDown?.(event);
      if (event.button === 2) this.callbacks.onSecondaryDown?.(event);
    };
    this.onMouseUp = (event) => {
      if (event.button === 0) this.callbacks.onPrimaryUp?.(event);
    };
    this.onContext = (event) => event.preventDefault();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContext);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.keys.clear();
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) this.keys.clear();
  }

  requestPointerLock() {
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock?.();
    }
  }

  getForward() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
  }

  getFlatForward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  getRight() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  getAimRay() {
    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return { origin, direction };
  }

  spawn(position) {
    this.group.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.mode = 'ground';
    this.onGround = true;
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.focus = this.maxFocus;
    this.lastDamage = -99;
    this.invulnerable = 0;
    this.spaceMode = false;
    this.doubleJumped = false;
    this.flipTime = 0;
    this.rollTime = 0;
    this.mantleTime = 0;
    this.releaseTimer = 0;
    this.flipGroup.rotation.set(0, 0, 0);
    this.flipGroup.position.y = 0.95;
    this.detachWeb();
    this.updateCamera(0.016, true);
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addFocus(amount) {
    this.focus = Math.min(this.maxFocus, this.focus + amount);
  }

  takeDamage(amount, source = null) {
    if (this.god || this.invulnerable > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 0.52;
    this.lastDamage = performance.now() / 1000;
    this.shake = Math.min(0.8, this.shake + amount * 0.02);
    this.callbacks.onDamage?.(amount, source);
    if (source) {
      const dir = this.group.position.clone().sub(source);
      dir.y = 0;
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        this.velocity.addScaledVector(dir, Math.min(14, amount * 0.45));
        this.velocity.y += Math.min(6, amount * 0.12);
      }
    }
    if (this.health <= 0) this.callbacks.onDeath?.();
    return true;
  }

  applyHealing(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  toggleFlight() {
    if (this.spaceMode) {
      this.mode = this.mode === 'fly' ? 'air' : 'fly';
      return;
    }
    if (!this.flightUnlocked) {
      this.callbacks.onFlightLocked?.();
      return;
    }
    if (this.mode === 'fly') {
      this.mode = this.onGround ? 'ground' : 'air';
      this.callbacks.onFlightToggle?.(false);
    } else {
      this.mode = 'fly';
      this.velocity.y = Math.max(this.velocity.y, 2);
      this.detachWeb();
      this.callbacks.onFlightToggle?.(true);
    }
  }

  attachSwing(anchor) {
    if (this.spaceMode || this.mode === 'fly') return;
    const dist = this.group.position.distanceTo(anchor);
    if (dist > 135 || dist < 4) return;
    this.mode = 'swing';
    this.swingAnchor.copy(anchor);
    this.ropeLength = clamp(dist, 7, 118);
    this.swingTimer = 0;
    const right = this.getRight();
    this.swingSide = anchor.clone().sub(this.group.position).dot(right) >= 0 ? 1 : -1;
    this.flipTime = 0;
    this.rollTime = 0;
    this.velocity.y = Math.max(this.velocity.y, 1.5);
    const forward = this.getFlatForward();
    const current = this.velocity.length();
    if (current < 12) this.velocity.addScaledVector(forward, 7);
    this.callbacks.onSwingStart?.(anchor);
  }

  zipTo(point) {
    if (this.spaceMode) return;
    this.mode = 'zip';
    this.zipTarget.copy(point);
    this.zipTimer = 0;
    const dir = point.clone().sub(this.group.position).normalize();
    this.velocity.copy(dir).multiplyScalar(70);
    this.callbacks.onWebZip?.(point);
  }

  detachWeb() {
    if (this.mode === 'swing' || this.mode === 'zip') {
      this.mode = this.onGround ? 'ground' : 'air';
      if (this.mode === 'air') this.velocity.y += 3.2;
      this.releaseTimer = 0.4;
    }
    this.webTarget = null;
    this.webMesh.visible = false;
    this.webGlow.visible = false;
  }

  getSwingAnchor(raycaster) {
    return this.world.raycastHittable?.(raycaster);
  }

  performPunch() {
    this.attackAnim = 0.22;
    this.callbacks.onPunch?.();
  }

  useWebBlast() {
    if (this.focus < 12) return false;
    this.focus -= 12;
    this.attackAnim = 0.18;
    this.callbacks.onWebBlast?.();
    return true;
  }

  useSense() {
    if (this.focus < 20) return false;
    this.focus -= 20;
    this.senseGlow = 1.7;
    this.callbacks.onSense?.();
    return true;
  }

  update(dt, elapsed) {
    if (!this.enabled || this.paused) {
      this.updateCamera(dt, false);
      return;
    }
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.senseGlow = Math.max(0, this.senseGlow - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.landTimer = Math.max(0, this.landTimer - dt);
    this.shakeTime = Math.max(0, this.shakeTime - dt);

    if (!this.spaceMode) {
      this.stamina = Math.min(this.maxStamina, this.stamina + (this.onGround ? 20 : 7) * dt);
      if (performance.now() / 1000 - this.lastDamage > 6 && this.health > 0) {
        this.health = Math.min(this.maxHealth, this.health + 1.6 * dt);
      }
    }
    this.focus = Math.min(this.maxFocus, this.focus + 4.2 * dt);

    if (this.mode === 'fly') this.updateFlight(dt);
    else if (this.mode === 'swing') this.updateSwing(dt);
    else if (this.mode === 'zip') this.updateZip(dt);
    else this.updateRunAndAir(dt);

    this.moveAndCollide(dt);

    if (this.mode === 'swing' || this.mode === 'zip') this.updateWebLine();

    this.updateCamera(dt, false);
    this.updateModel(dt, elapsed);
    this.emitTraversalFx(dt);
    this.updateShadow();
    if (this.senseGlow > 0) this.model.materials.white.emissiveIntensity = 1.4 + Math.sin(elapsed * 20) * 0.6;
    else this.model.materials.white.emissiveIntensity = 0.65;
  }

  getInputVector() {
    let f = 0;
    let s = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) f += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) f -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) s += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) s -= 1;
    const dir = new THREE.Vector3();
    dir.addScaledVector(this.getFlatForward(), f);
    dir.addScaledVector(this.getRight(), s);
    if (dir.lengthSq() > 0) dir.normalize();
    this.moveDirection.copy(dir);
    return dir;
  }

  startFlip(kind = null) {
    const side = this.keys.has('KeyD') ? 1 : this.keys.has('KeyA') ? -1 : 0;
    this.flipKind = kind || (side !== 0 ? 'side' : this.keys.has('KeyW') ? 'front' : 'back');
    this.flipSide = side || 1;
    this.flipDuration = this.flipKind === 'side' ? 0.56 : 0.62;
    this.flipTime = this.flipDuration;
    this.rollTime = 0;
    this.callbacks.onFlip?.(this.flipKind);
  }

  startRoll() {
    if (this.rollTime > 0 || this.flipTime > 0) return;
    this.rollTime = this.rollDuration;
    this.callbacks.onRoll?.();
  }

  emitTraversalFx(dt) {
    this.trailTimer -= dt;
    if (this.trailTimer > 0) return;
    const speed = this.velocity.length();
    if (this.mode === 'swing' || this.mode === 'zip' || (this.mode === 'fly' && speed > 26) || (!this.onGround && speed > 22)) {
      this.trailTimer = this.mode === 'fly' ? 0.05 : 0.065;
      this.callbacks.onTrail?.(this.group.position, this.velocity, this.mode);
    }
  }

  updateRunAndAir(dt) {
    const input = this.getInputVector();
    const sprint = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && this.stamina > 0;
    const speed = (sprint ? 13.5 : 8.2) * this.speedBoost;
    this.climbing = false;

    if (this.onGround) {
      const target = input.clone().multiplyScalar(speed);
      this.velocity.x = damp(this.velocity.x, target.x, input.lengthSq() > 0 ? 11 : 16, dt);
      this.velocity.z = damp(this.velocity.z, target.z, input.lengthSq() > 0 ? 11 : 16, dt);
      if (sprint && input.lengthSq() > 0) this.stamina = Math.max(0, this.stamina - 10 * dt);
      if (this.jumpBuffer > 0) {
        this.velocity.y = 10.6;
        this.onGround = false;
        this.jumpBuffer = 0;
        this.doubleJumped = false;
        this.mode = 'air';
        this.callbacks.onJump?.(false);
      }
    } else {
      if (this.mode === 'air') {
        if (input.lengthSq() > 0) {
          this.velocity.x += input.x * 15 * dt;
          this.velocity.z += input.z * 15 * dt;
          const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
          if (hSpeed > 18) {
            this.velocity.x *= 18 / hSpeed;
            this.velocity.z *= 18 / hSpeed;
          }
        }
        this.velocity.y -= 27 * dt;
        if (this.jumpBuffer > 0) {
          if (!this.doubleJumped) {
            this.jumpBuffer = 0;
            this.doubleJumped = true;
            this.velocity.y = 9.2;
            this.startFlip();
            this.callbacks.onJump?.(true);
          } else if (this.wallContact && this.stamina > 3) {
            this.jumpBuffer = 0;
            this.velocity.y = 8.8;
            this.velocity.x += this.nearWall.x * 7;
            this.velocity.z += this.nearWall.z * 7;
            this.stamina -= 6;
            this.doubleJumped = false;
            this.callbacks.onWallJump?.();
          }
        }
      }
      this.velocity.x *= 1 - 0.18 * dt;
      this.velocity.z *= 1 - 0.18 * dt;
    }

    if (!this.onGround && this.wallContact && this.mode !== 'fly') {
      const intoWall = this.moveDirection.dot(this.nearWall) < -0.35;
      if (intoWall && this.stamina > 1) {
        this.velocity.y = Math.max(this.velocity.y, 5.8);
        this.stamina = Math.max(0, this.stamina - 24 * dt);
        this.climbStamina += dt;
        const climbSpeed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 9.5 : 6.5;
        this.velocity.y = climbSpeed;
        this.climbing = true;
        this.runPhase += dt * 9;
        this.callbacks.onClimb?.(dt);
      }
    }
  }

  updateFlight(dt) {
    const input = this.getInputVector();
    const boost = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    const forward = this.getForward();
    const speed = this.spaceMode
      ? (boost ? this.spaceBoost : this.spaceSpeed)
      : (boost ? 150 : 72) * this.speedBoost;
    const target = new THREE.Vector3();
    target.addScaledVector(forward, input.dot(this.getFlatForward()) * speed);
    target.addScaledVector(this.getRight(), input.dot(this.getRight()) * speed * 0.72);
    if (this.keys.has('Space')) target.addScaledVector(new THREE.Vector3(0, 1, 0), speed * 0.58);
    if (this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC')) target.y -= speed * 0.58;
    if (input.lengthSq() < 0.01 && !this.keys.has('Space') && !this.keys.has('ControlLeft') && !this.keys.has('ControlRight')) {
      target.copy(forward).multiplyScalar(speed * 0.02);
    }
    this.velocity.x = damp(this.velocity.x, target.x, 3.4, dt);
    this.velocity.y = damp(this.velocity.y, target.y, 3.4, dt);
    this.velocity.z = damp(this.velocity.z, target.z, 3.4, dt);
    if (this.spaceMode) {
      this.velocity.multiplyScalar(1 - 0.02 * dt);
    } else if (this.group.position.y < 2 && this.velocity.y < 0) {
      this.group.position.y = Math.max(this.group.position.y, GROUND_Y);
    }
  }

  updateSwing(dt) {
    this.swingTimer += dt;
    const input = this.getInputVector();
    this.velocity.y -= 26 * dt;
    const pump = 25 + (this.keys.has('ShiftLeft') ? 12 : 0);
    this.velocity.addScaledVector(input, pump * dt);
    this.velocity.multiplyScalar(1 - 0.05 * dt);
    if (this.jumpBuffer > 0) {
      this.jumpBuffer = 0;
      this.velocity.y += 7.8;
      this.detachWeb();
      this.callbacks.onSwingRelease?.();
      return;
    }
    const diff = this.group.position.clone().sub(this.swingAnchor);
    const dist = diff.length();
    if (dist > 0.01) {
      const dir = diff.normalize();
      if (dist > this.ropeLength) {
        this.group.position.copy(this.swingAnchor).addScaledVector(dir, this.ropeLength);
        const radial = this.velocity.dot(dir);
        if (radial > 0) this.velocity.addScaledVector(dir, -radial);
      }
      if (this.swingAnchor.y - this.group.position.y < 1.5 || dist < 4) {
        this.velocity.y += 3;
        this.detachWeb();
        this.callbacks.onSwingRelease?.();
      }
    }
    const maxSpeed = 105 * this.speedBoost;
    if (this.velocity.length() > maxSpeed) this.velocity.setLength(maxSpeed);
  }

  updateZip(dt) {
    this.zipTimer += dt;
    const diff = this.zipTarget.clone().sub(this.group.position);
    const dist = diff.length();
    if (dist < 3.5 || this.zipTimer > 1.2) {
      this.mode = 'air';
      this.velocity.multiplyScalar(0.55);
      this.velocity.y = Math.max(this.velocity.y, 4);
      this.detachWeb();
      this.callbacks.onZipArrive?.(this.zipTarget);
      return;
    }
    this.velocity.copy(diff.normalize()).multiplyScalar(82);
  }

  moveAndCollide(dt) {
    const pos = this.group.position;
    const old = pos.clone();
    pos.addScaledVector(this.velocity, dt);

    if (!this.spaceMode) {
      this.world.clampPlayer(pos);
      this.wallContact = false;
      const feet = pos.y;
      const head = feet + this.height;
      const radius = this.radius;

      for (const c of this.world.colliders) {
        if (c.maxY <= feet + 0.16 || c.minY >= head) continue;
        const closestX = clamp(pos.x, c.minX, c.maxX);
        const closestZ = clamp(pos.z, c.minZ, c.maxZ);
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq >= radius * radius) continue;
        let nx;
        let nz;
        let push;
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          nx = dx / dist;
          nz = dz / dist;
          push = radius - dist;
        } else {
          const toLeft = Math.abs(pos.x - c.minX);
          const toRight = Math.abs(c.maxX - pos.x);
          const toBack = Math.abs(pos.z - c.minZ);
          const toFront = Math.abs(c.maxZ - pos.z);
          const min = Math.min(toLeft, toRight, toBack, toFront);
          if (min === toLeft) { nx = -1; nz = 0; } else if (min === toRight) { nx = 1; nz = 0; } else if (min === toBack) { nx = 0; nz = -1; } else { nx = 0; nz = 1; }
          push = min + radius;
        }
        pos.x += nx * push;
        pos.z += nz * push;
        const into = this.velocity.x * nx + this.velocity.z * nz;
        if (into < 0) {
          this.velocity.x -= nx * into;
          this.velocity.z -= nz * into;
        }
        this.wallContact = true;
        this.nearWall.set(nx, 0, nz);
        this.wallTop = c.maxY;
      }

      let support = GROUND_Y;
      let supportCollider = null;
      for (const c of this.world.colliders) {
        if (c.maxY > old.y + 0.36) continue;
        if (pos.x < c.minX - 0.1 || pos.x > c.maxX + 0.1 || pos.z < c.minZ - 0.1 || pos.z > c.maxZ + 0.1) continue;
        if (c.maxY > support) {
          support = c.maxY;
          supportCollider = c;
        }
      }
      const falling = this.velocity.y <= 0.1;
      if (falling && pos.y <= support && old.y >= support - 0.42) {
        const impact = Math.abs(this.velocity.y);
        pos.y = support;
        this.velocity.y = 0;
        if (!this.onGround) this.onLand(impact, support);
        this.onGround = true;
        this.doubleJumped = false;
        this.coyote = 0.12;
        if (this.mode === 'air' || this.mode === 'ground') this.mode = 'ground';
      } else if (this.onGround && supportCollider && (pos.x < supportCollider.minX - 0.4 || pos.x > supportCollider.maxX + 0.4 || pos.z < supportCollider.minZ - 0.4 || pos.z > supportCollider.maxZ + 0.4)) {
        this.onGround = false;
        this.mode = 'air';
      } else if (this.onGround && !supportCollider && pos.y > GROUND_Y + 0.15) {
        this.onGround = false;
        this.mode = 'air';
      } else if (this.onGround && pos.y > support + 0.28) {
        this.onGround = false;
        this.mode = 'air';
      }

      if (!this.onGround && this.wallContact && this.wallTop > GROUND_Y + 1.1 && pos.y + 0.42 >= this.wallTop) {
        pos.x -= this.nearWall.x * (this.radius + 0.5);
        pos.z -= this.nearWall.z * (this.radius + 0.5);
        pos.y = this.wallTop;
        this.velocity.set(this.velocity.x * 0.25, 0, this.velocity.z * 0.25);
        this.onGround = true;
        this.mode = 'ground';
        this.doubleJumped = false;
        this.mantleTime = 0.42;
        this.callbacks.onMantle?.(this.wallTop);
      }
      if (this.onGround && pos.y < GROUND_Y) pos.y = GROUND_Y;
      if (pos.y < -3) {
        this.callbacks.onVoidFall?.();
      }
      if (this.mode === 'ground' && this.onGround) {
        this.velocity.y = 0;
      }
    } else {
      pos.x = clamp(pos.x, -95000, 95000);
      pos.y = clamp(pos.y, -95000, 95000);
      pos.z = clamp(pos.z, -95000, 95000);
    }

    if (this.mode === 'swing' || this.mode === 'zip') {
      const diff = pos.clone().sub(this.swingAnchor);
      if (this.mode === 'swing' && diff.length() > this.ropeLength) {
        pos.copy(this.swingAnchor).addScaledVector(diff.normalize(), this.ropeLength);
      }
    }
  }

  onLand(impact, support) {
    if (impact > 52) this.takeDamage(impact - 48, null);
    else if (impact > 34) this.callbacks.onHardLand?.(impact);
    if (impact > 20) {
      this.shake = Math.min(0.55, this.shake + impact * 0.008);
      this.landTimer = Math.max(this.landTimer, Math.min(0.34, impact * 0.008));
    }
    if (impact > 26 && Math.hypot(this.velocity.x, this.velocity.z) > 10) this.startRoll();
    this.callbacks.onLand?.(impact, support);
  }

  updateCamera(dt, immediate) {
    const fly = this.mode === 'fly' || this.spaceMode;
    const targetDistance = fly ? (this.spaceMode ? 12.5 : 9.4) : 7.2;
    this.cameraDistance = damp(this.cameraDistance, targetDistance, 5, dt);
    const focus = this.group.position.clone();
    focus.y += this.cameraHeight;
    if (this.mode === 'swing') focus.y += 0.25;
    this.cameraFocus.lerp(focus, immediate ? 1 : 1 - Math.exp(-13 * dt));
    const forward = this.getForward();
    const desired = focus.clone().addScaledVector(forward, -this.cameraDistance);
    desired.y += fly ? 1.8 : 0.7;
    if (desired.y < GROUND_Y + 1.1 && !this.spaceMode) desired.y = GROUND_Y + 1.1;
    const lambda = fly ? 5.2 : 8.8;
    if (immediate) this.cameraPosition.copy(desired);
    else this.cameraPosition.lerp(desired, 1 - Math.exp(-lambda * dt));
    if (this.shake > 0.001) {
      const s = this.shake * 0.22;
      this.cameraPosition.x += (Math.random() - 0.5) * s;
      this.cameraPosition.y += (Math.random() - 0.5) * s;
      this.cameraPosition.z += (Math.random() - 0.5) * s;
      this.shake = damp(this.shake, 0, 7, dt);
    }
    this.camera.position.copy(this.cameraPosition);
    const target = focus.clone();
    if (this.mode === 'fly' && !this.spaceMode) target.y += 0.8;
    this.camera.lookAt(target);
    this.camera.fov = damp(this.camera.fov, this.mode === 'fly' ? 76 : this.velocity.length() > 28 ? 74 : 68, 4, dt);
    this.camera.updateProjectionMatrix();
  }

  updateModel(dt, elapsed) {
    const model = this.model;
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.idlePhase += dt;
    this.flipTime = Math.max(0, this.flipTime - dt);
    this.rollTime = Math.max(0, this.rollTime - dt);
    this.mantleTime = Math.max(0, this.mantleTime - dt);
    this.releaseTimer = Math.max(0, this.releaseTimer - dt);

    let targetYaw = this.group.rotation.y;
    if (speed > 0.4) targetYaw = Math.atan2(-this.velocity.x, -this.velocity.z);
    else if (this.mode === 'fly') {
      const f = this.getFlatForward();
      targetYaw = Math.atan2(-f.x, -f.z);
    } else if (this.mode !== 'swing') {
      const f = this.getFlatForward();
      targetYaw = Math.atan2(-f.x, -f.z);
    }
    let delta = ((targetYaw - this.group.rotation.y + Math.PI * 3) % TAU) - Math.PI;
    this.group.rotation.y += delta * Math.min(1, dt * 14);

    const armPose = (arm, x, z, lowerX, lambda = 10) => {
      arm.upper.rotation.x = damp(arm.upper.rotation.x, x, lambda, dt);
      arm.upper.rotation.z = damp(arm.upper.rotation.z, z, lambda, dt);
      arm.lower.rotation.x = damp(arm.lower.rotation.x, lowerX, lambda + 2, dt);
    };
    const legPose = (leg, x, lowerX, z = 0, lambda = 9) => {
      leg.upper.rotation.x = damp(leg.upper.rotation.x, x, lambda, dt);
      leg.upper.rotation.z = damp(leg.upper.rotation.z, z, lambda, dt);
      leg.lower.rotation.x = damp(leg.lower.rotation.x, lowerX, lambda + 2, dt);
    };

    const ground = this.onGround && this.mode !== 'fly';
    let bob = 0;
    let lean = -0.03;
    let twist = 0;
    let roll = 0;
    let strafe = 0;

    if (ground && speed < 0.7) {
      const breathe = Math.sin(this.idlePhase * 2.1);
      armPose(model.leftArm, 0.06 + breathe * 0.03, 0.07, 0.24 + breathe * 0.02, 5);
      armPose(model.rightArm, 0.06 - breathe * 0.02, -0.07, 0.24 - breathe * 0.02, 5);
      legPose(model.leftLeg, 0.02, 0.05, 0.03, 5);
      legPose(model.rightLeg, -0.02, 0.05, -0.03, 5);
      bob = breathe * 0.008;
      lean = -0.02;
      model.head.rotation.y = damp(model.head.rotation.y, Math.sin(this.idlePhase * 0.55) * 0.2, 3, dt);
      model.head.rotation.x = damp(model.head.rotation.x, Math.sin(this.idlePhase * 0.37) * 0.06, 3, dt);
      model.group.rotation.x = damp(model.group.rotation.x, -0.01, 5, dt);
      model.group.rotation.z = damp(model.group.rotation.z, 0, 5, dt);
    } else if (ground) {
      const sprint = speed > 9;
      this.runPhase += dt * (4.4 + speed * 1.45);
      const stride = clamp(speed / (sprint ? 12 : 7), 0, 1.3);
      const swing = Math.sin(this.runPhase);
      const swing2 = Math.cos(this.runPhase);
      legPose(model.leftLeg, swing * 0.86 * stride, Math.max(0, -swing) * 1.15 * stride + 0.06, 0, 13);
      legPose(model.rightLeg, -swing * 0.86 * stride, Math.max(0, swing) * 1.15 * stride + 0.06, 0, 13);
      armPose(model.leftArm, -swing * 0.66 * stride, 0.08, 0.3 + swing2 * 0.16, 12);
      armPose(model.rightArm, swing * 0.66 * stride, -0.08, 0.3 - swing2 * 0.16, 12);
      bob = Math.abs(swing) * (sprint ? 0.075 : 0.045) * stride;
      lean = sprint ? -0.14 : -0.05;
      twist = swing * (sprint ? 0.2 : 0.12) * stride;
      model.head.rotation.y = damp(model.head.rotation.y, -twist * 0.7, 8, dt);
      model.head.rotation.x = damp(model.head.rotation.x, sprint ? 0.08 : 0.02, 8, dt);
      model.group.rotation.x = damp(model.group.rotation.x, sprint ? -0.08 : -0.02, 8, dt);
      model.group.rotation.z = damp(model.group.rotation.z, -swing * 0.025 * stride, 8, dt);
      this.stepTimer -= dt;
      if (speed > 2.6 && this.stepTimer <= 0) {
        this.stepTimer = clamp(0.4 - speed * 0.017, 0.14, 0.34);
        this.callbacks.onFootstep?.(this.group.position, speed);
      }
    } else if (this.mode === 'swing') {
      const handUp = this.swingSide > 0 ? model.rightArm : model.leftArm;
      const handOut = this.swingSide > 0 ? model.leftArm : model.rightArm;
      const pump = Math.sin(this.swingTimer * 4.5);
      const side = this.keys.has('KeyA') ? -1 : this.keys.has('KeyD') ? 1 : 0;
      armPose(handUp, 2.72 + pump * 0.12, this.swingSide > 0 ? -0.18 : 0.18, 0.12, 12);
      armPose(handOut, -0.5 + pump * 0.16, this.swingSide > 0 ? 0.5 : -0.5, 0.72, 9);
      legPose(model.leftLeg, 0.62 + pump * 0.12, 1.0, 0.05, 7);
      legPose(model.rightLeg, -0.22 - pump * 0.1, 0.82, -0.05, 7);
      bob = 0;
      lean = -0.18;
      twist = this.swingSide * 0.28;
      roll = -side * 0.22;
      model.head.rotation.y = damp(model.head.rotation.y, -this.swingSide * 0.18, 6, dt);
      model.group.rotation.x = damp(model.group.rotation.x, -0.16 + side * 0.04, 8, dt);
      model.group.rotation.z = damp(model.group.rotation.z, roll, 8, dt);
    } else if (this.mode === 'zip') {
      const t = Math.min(1, this.zipTimer * 5);
      armPose(model.leftArm, 1.52 + Math.sin(elapsed * 20) * 0.02, 0.16, 0.04, 16);
      armPose(model.rightArm, 1.52 + Math.sin(elapsed * 20) * 0.02, -0.16, 0.04, 16);
      legPose(model.leftLeg, -0.28, 0.12, 0.04, 10);
      legPose(model.rightLeg, -0.34, 0.1, -0.04, 10);
      lean = -0.2;
      bob = 0;
      model.group.rotation.x = damp(model.group.rotation.x, -0.72 * t, 12, dt);
      model.group.rotation.z = damp(model.group.rotation.z, 0, 10, dt);
    } else if (this.mode === 'fly') {
      const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      strafe = this.moveDirection.dot(this.getRight());
      const thrust = clamp(this.velocity.length() / (this.spaceMode ? 400 : 110), 0, 1);
      armPose(model.leftArm, 1.28 - thrust * 0.24, 0.3 + (boost ? 0.14 : 0), 0.12, 7);
      armPose(model.rightArm, 1.28 - thrust * 0.24, -0.3 - (boost ? 0.14 : 0), 0.12, 7);
      legPose(model.leftLeg, -0.26 - thrust * 0.12, 0.1, 0.07, 6);
      legPose(model.rightLeg, -0.32 - thrust * 0.12, 0.14, -0.07, 6);
      bob = Math.sin(elapsed * 3.2) * (this.spaceMode ? 0.03 : 0.02);
      lean = -0.08;
      model.head.rotation.x = damp(model.head.rotation.x, -0.28, 6, dt);
      model.head.rotation.y = damp(model.head.rotation.y, 0, 6, dt);
      model.group.rotation.x = damp(model.group.rotation.x, -0.7 - thrust * 0.16, 5, dt);
      model.group.rotation.z = damp(model.group.rotation.z, -strafe * 0.38 + Math.sin(elapsed * 1.7) * 0.02, 5, dt);
    } else if (this.climbing) {
      const climb = Math.sin(this.runPhase);
      armPose(model.leftArm, 2.7 + climb * 0.55, 0.2, 0.35, 14);
      armPose(model.rightArm, 2.7 - climb * 0.55, -0.2, 0.35, 14);
      legPose(model.leftLeg, -0.25 + climb * 0.45, 0.5, 0.04, 12);
      legPose(model.rightLeg, -0.25 - climb * 0.45, 0.5, -0.04, 12);
      lean = -0.12;
      bob = Math.abs(climb) * 0.02;
      model.head.rotation.x = damp(model.head.rotation.x, -0.22, 8, dt);
      model.group.rotation.x = damp(model.group.rotation.x, -0.08, 8, dt);
      model.group.rotation.z = damp(model.group.rotation.z, 0, 8, dt);
    } else {
      const falling = this.velocity.y < 0;
      const airT = clamp(this.velocity.y * 0.025, -0.45, 0.45);
      if (falling) {
        armPose(model.leftArm, -0.66, 0.62, 0.28, 7);
        armPose(model.rightArm, -0.66, -0.62, 0.28, 7);
        legPose(model.leftLeg, 0.58 + airT, 0.82, 0.1, 7);
        legPose(model.rightLeg, -0.42 + airT, 0.66, -0.1, 7);
      } else {
        armPose(model.leftArm, 0.42, 0.7, 0.42, 7);
        armPose(model.rightArm, -0.9, -0.4, 0.22, 7);
        legPose(model.leftLeg, 0.78 + airT, 1.05, 0.08, 7);
        legPose(model.rightLeg, -0.5 + airT, 0.7, -0.08, 7);
      }
      strafe = this.moveDirection.dot(this.getRight());
      bob = 0;
      lean = -0.05;
      model.head.rotation.x = damp(model.head.rotation.x, falling ? 0.08 : -0.06, 7, dt);
      model.group.rotation.x = damp(model.group.rotation.x, -0.08, 7, dt);
      model.group.rotation.z = damp(model.group.rotation.z, -strafe * 0.12, 7, dt);
    }

    const crouch = this.landTimer > 0 ? Math.sin(clamp(this.landTimer / 0.34, 0, 1) * Math.PI) * 0.2 : 0;
    if (crouch > 0) {
      model.leftLeg.lower.rotation.x += crouch * 4;
      model.rightLeg.lower.rotation.x += crouch * 4;
      model.leftLeg.upper.rotation.x -= crouch * 1.2;
      model.rightLeg.upper.rotation.x -= crouch * 1.2;
    }
    model.upperBody.rotation.x = damp(model.upperBody.rotation.x, lean, 10, dt);
    model.upperBody.rotation.y = damp(model.upperBody.rotation.y, twist, 10, dt);
    model.upperBody.rotation.z = damp(model.upperBody.rotation.z, 0, 10, dt);
    model.body.position.y = damp(model.body.position.y, bob - crouch, 14, dt);

    if (this.attackAnim > 0) {
      const p = 1 - this.attackAnim / 0.22;
      model.rightArm.upper.rotation.x = -2.5 + Math.sin(p * Math.PI) * 1.2;
      model.rightArm.upper.rotation.z = -0.2;
      model.upperBody.rotation.y = -0.3 * Math.sin(p * Math.PI);
    }

    if (this.mantleTime > 0) {
      const p = 1 - this.mantleTime / 0.42;
      const lift = Math.sin(p * Math.PI);
      model.leftArm.upper.rotation.x = 2.4 - p * 1.8;
      model.rightArm.upper.rotation.x = 2.4 - p * 1.8;
      model.leftArm.upper.rotation.z = 0.3;
      model.rightArm.upper.rotation.z = -0.3;
      model.body.position.y += lift * 0.12;
    }

    if (this.releaseTimer > 0) {
      const p = this.releaseTimer / 0.4;
      model.leftArm.upper.rotation.x = -0.3 - p * 0.5;
      model.rightArm.upper.rotation.x = -0.3 - p * 0.5;
      model.leftArm.upper.rotation.z = 0.4 + p * 0.6;
      model.rightArm.upper.rotation.z = -0.4 - p * 0.6;
      model.leftLeg.upper.rotation.x = 0.2 + p * 0.3;
      model.rightLeg.upper.rotation.x = -0.2 - p * 0.3;
    }

    if (this.flipTime > 0) {
      const p = 1 - this.flipTime / this.flipDuration;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      this.flipGroup.rotation.set(0, 0, 0);
      if (this.flipKind === 'back') this.flipGroup.rotation.x = e * TAU;
      else if (this.flipKind === 'front') this.flipGroup.rotation.x = -e * TAU;
      else this.flipGroup.rotation.z = this.flipSide * e * TAU;
      const tuck = Math.sin(p * Math.PI);
      model.leftLeg.upper.rotation.x = -1.1 * tuck;
      model.rightLeg.upper.rotation.x = -0.9 * tuck;
      model.leftLeg.lower.rotation.x = 1.7 * tuck + 0.1;
      model.rightLeg.lower.rotation.x = 1.7 * tuck + 0.1;
      model.leftArm.upper.rotation.x = 1.5 * tuck;
      model.rightArm.upper.rotation.x = 1.5 * tuck;
      model.leftArm.upper.rotation.z = 0.4 * tuck;
      model.rightArm.upper.rotation.z = -0.4 * tuck;
      model.upperBody.rotation.y = 0;
      model.body.position.y = 0;
    } else if (this.rollTime > 0) {
      const p = 1 - this.rollTime / this.rollDuration;
      this.flipGroup.rotation.x = -p * TAU;
      this.flipGroup.rotation.z = 0;
      this.flipGroup.position.y = 0.95 - Math.sin(p * Math.PI) * 0.22;
      model.leftLeg.upper.rotation.x = -1.3;
      model.rightLeg.upper.rotation.x = -1.1;
      model.leftLeg.lower.rotation.x = 1.8;
      model.rightLeg.lower.rotation.x = 1.8;
      model.leftArm.upper.rotation.x = 1.2;
      model.rightArm.upper.rotation.x = 1.2;
    } else {
      if (Math.abs(this.flipGroup.rotation.x) > TAU * 0.85 || Math.abs(this.flipGroup.rotation.z) > TAU * 0.85) {
        this.flipGroup.rotation.x = 0;
        this.flipGroup.rotation.z = 0;
      } else {
        this.flipGroup.rotation.x = damp(this.flipGroup.rotation.x, 0, 14, dt);
        this.flipGroup.rotation.z = damp(this.flipGroup.rotation.z, 0, 14, dt);
      }
      this.flipGroup.position.y = damp(this.flipGroup.position.y, 0.95, 12, dt);
      this.flipGroup.rotation.y = 0;
    }

    if (this.god) {
      for (const mat of Object.values(model.materials)) {
        mat.emissive?.setHex(0x5c3b00);
        mat.emissiveIntensity = 0.15 + Math.sin(elapsed * 3) * 0.06;
      }
    }
  }

  updateWebLine() {
    const anchor = this.mode === 'zip' ? this.zipTarget : this.swingAnchor;
    const hand = this.group.position.clone().add(new THREE.Vector3(0.32, 1.45, 0));
    const diff = anchor.clone().sub(hand);
    const length = diff.length();
    if (length < 0.1) {
      this.webMesh.visible = false;
      this.webGlow.visible = false;
      return;
    }
    const mid = hand.clone().addScaledVector(diff, 0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());
    for (const mesh of [this.webMesh, this.webGlow]) {
      mesh.visible = true;
      mesh.position.copy(mid);
      mesh.quaternion.copy(q);
      mesh.scale.set(1, length, 1);
    }
  }

  updateShadow() {
    let support = GROUND_Y;
    if (!this.spaceMode) {
      for (const c of this.world.colliders) {
        if (c.maxY > this.group.position.y + 0.5) continue;
        if (this.group.position.x < c.minX || this.group.position.x > c.maxX || this.group.position.z < c.minZ || this.group.position.z > c.maxZ) continue;
        if (c.maxY > support) support = c.maxY;
      }
    }
    this.shadow.position.set(this.group.position.x, support + 0.02, this.group.position.z);
    const height = Math.max(0, this.group.position.y - support);
    this.shadow.material.opacity = this.spaceMode ? 0 : clamp(0.34 - height * 0.006, 0.02, 0.34);
    const scale = clamp(1 + height * 0.004, 0.7, 2.1);
    this.shadow.scale.setScalar(scale);
  }

  enterSpaceMode(position, speed = 175) {
    this.spaceMode = true;
    this.flightUnlocked = true;
    this.mode = 'fly';
    this.onGround = false;
    this.velocity.set(0, 0, 0);
    this.detachWeb();
    if (position) this.group.position.copy(position);
    this.spaceSpeed = speed;
    this.spaceBoost = speed * 2.8;
    this.shadow.material.opacity = 0;
    this.webMesh.visible = false;
    this.webGlow.visible = false;
  }

  leaveSpaceMode() {
    this.spaceMode = false;
    this.mode = 'fly';
    this.flightUnlocked = true;
    this.velocity.set(0, 0, 0);
    this.group.position.set(0, 540, 520);
  }

  get speedKmh() {
    return this.velocity.length() * 3.6;
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContext);
  }
}
