import * as THREE from '../vendor/three.module.js';
import { clamp, lerp, damp, formatTime, makeLabelSprite } from './utils.js';
import { UI } from './ui.js';
import { AudioEngine } from './audio.js';
import { createCity, GROUND_Y } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Effects } from './effects.js';
import { createOrbitWorld, createDeepSpaceWorld } from './space.js';
import { UNIVERSES, applyUniverse, getUniverse } from './multiverse.js';

const DIALOGUES = {
  intro: [
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'So. The city finally sends me someone who can hear the static. I am the Oracle. I watch the wires beneath the streets.' },
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'Something is buying Manhattan one alley at a time. A man called the Broker is holding the ledger. Find my three signal caches.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'I am on the roof. Point me at the first one.' },
  ],
  oracle: [
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'You move like the old stories. Good. The caches are hidden in plain sight: two at street level, one above the lights.' },
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'Collect them before the Broker scrubs the data. Then meet him at Times Square and take his ledger apart.' },
  ],
  cachesDone: [
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'All three signals are yours. The ledger points to a meeting at Times Square. He will have muscle.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'Let them bring muscle. I brought physics.' },
  ],
  brokerIntro: [
    { speaker: 'THE BROKER', role: 'VILLAIN / CRIME', portrait: 'B', color: '#ffc657', text: 'You. The bug who thinks the skyline belongs to him. You have been expensive.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'Rent is due. I am collecting.' },
    { speaker: 'THE BROKER', role: 'VILLAIN / CRIME', portrait: 'B', color: '#ffc657', text: 'Then let us see if you can afford the interest. Boys! Remove the spider.' },
  ],
  brokerDefeat: [
    { speaker: 'THE BROKER', role: 'VILLAIN / DEFEATED', portrait: 'B', color: '#ffc657', text: 'This changes nothing. The Vulture already has the second half of the ledger. He is above you even now.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'Good. I hate fighting downhill.' },
  ],
  vultureIntro: [
    { speaker: 'THE VULTURE', role: 'VILLAIN / AERIAL', portrait: 'V', color: '#7dffb1', text: 'The Broker was a wallet. I am the debt collector. And the sky belongs to me.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'You talk a lot for a bird.' },
  ],
  vultureDefeat: [
    { speaker: 'THE VULTURE', role: 'VILLAIN / GROUNDED', portrait: 'V', color: '#7dffb1', text: 'The beacon... the Moon... it is already awake. You are too late, little spider.' },
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'Flight module attuned. Do not thank me. Get above the clouds and follow the signal to the Moon.' },
  ],
  beaconIntro: [
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'That beacon is not human. It is a door, and something on the other side is knocking very politely.' },
    { speaker: 'THE VOID HERALD', role: 'ENTITY / HOSTILE', portrait: 'H', color: '#b56bff', text: 'You carry the First Web in your blood. He will want it back, piece by piece.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'Tell him to come and take it.' },
  ],
  heraldDefeat: [
    { speaker: 'THE VOID HERALD', role: 'ENTITY / BROKEN', portrait: 'H', color: '#b56bff', text: 'The Sovereign waits beyond the heliopause. He is the last circle. You cannot survive his edge.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'Then I will bring better edges.' },
  ],
  deepIntro: [
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'This is the edge of the solar wind. Past here the map ends and the Void Sovereign begins.' },
    { speaker: 'THE VOID SOVEREIGN', role: 'VILLAIN / COSMIC', portrait: 'S', color: '#ca7bff', text: 'I am the last circle. Beyond me there is nothing you can survive.' },
    { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'Then it is a good thing I brought a god complex.' },
  ],
  sovereignDefeat: [
    { speaker: 'THE VOID SOVEREIGN', role: 'VILLAIN / UNMADE', portrait: 'S', color: '#ca7bff', text: 'The circles... defeated. You are... unbounded.' },
    { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'The shrine is dead ahead. Take the God Core. Finish it, or the universe will find another edge.' },
  ],
  shrine: [
    { speaker: 'THE FIRST WEB', role: 'ORIGIN / UNKNOWN', portrait: '*', color: '#ffc657', text: 'You climbed from a city to the seam of everything. You did not break. You bent.' },
    { speaker: 'THE FIRST WEB', role: 'ORIGIN / UNKNOWN', portrait: '*', color: '#ffc657', text: 'Take the core. Become the thing that does not end. Guard the last circle, or become the next one.' },
    { speaker: 'YOU', role: 'GODHOOD', portrait: 'W', color: '#ffc657', text: 'I am the wall now.' },
  ],
  boundary: [
    { speaker: 'THE VOID', role: '???', portrait: '?', color: '#b56bff', text: 'You left the universe before becoming a god. There is nothing here to catch you.' },
  ],
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.2, 220000);
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.dt = 0;
    this.mode = 'menu';
    this.zone = 'MIDTOWN';
    this.paused = false;
    this.transitioning = false;
    this.dead = false;
    this.started = false;
    this.owner = false;
    this.ownerApplied = false;
    this.chaos = 0;
    this.villainsDefeated = 0;
    this.runTime = 0;
    this.checkpoint = new THREE.Vector3(-270, GROUND_Y + 52.4, 535);
    this.cooldowns = { sense: 0, blast: 0 };
    this.lastVultureBark = 0;
    this.barkTimer = 0;
    this.questMarkerPosition = null;
    this.currentInteract = null;
    this.questIndex = 0;
    this.questState = { intel: 0, brokerActive: false, vultureActive: false, heraldActive: false, sovereignActive: false, shrineReady: false, beyondShown: false, beaconActive: false };
    this.menuOrbit = 0;
    this.quality = 'high';
    this.senseActive = 0;
    this.beyond = false;
    this.raycaster = new THREE.Raycaster();
    this.universeIndex = 0;
    this.universe = UNIVERSES[0];

    this.ui = new UI({
      onStart: () => this.start(),
      onResume: () => this.togglePause(false),
      onRestart: () => { this.resetRun(); this.start(); },
      onQuit: () => this.returnToTitle(),
      onRespawn: () => this.respawn(),
      onContinue: () => this.ui.hideEnding(),
      onOwner: (has) => this.grantOwner(has),
      onOwnerFailed: () => this.audio.play('hurt'),
      onToggleSound: () => {
        const muted = !this.audio.muted;
        this.audio.setMuted(muted);
        return muted;
      },
      onQuality: (level) => this.setQuality(level),
      getChaos: () => this.chaos,
      getAltitude: () => this.player?.group.position.y || 0,
    });

    this.audio = new AudioEngine();
    this.setupScenes();
    this.setupInput();
    window.addEventListener('resize', () => this.onResize());
    this.clock.start();
    this.loop();
    setTimeout(() => this.ui.loadingDone(), 500);
  }

  setupScenes() {
    this.cityScene = new THREE.Scene();
    this.city = createCity(this.cityScene);
    this.universe = applyUniverse(this.universeIndex, this.city);
    this.activeScene = this.cityScene;
    this.effects = new Effects(this.cityScene);
    this.player = new Player(this.cityScene, this.camera, this.canvas, this.city, {
      onPrimaryDown: (event) => this.onPrimary(event),
      onPrimaryUp: () => this.onPrimaryUp(),
      onSecondaryDown: () => this.onSecondary(),
      onRequestPointerLock: () => this.player.requestPointerLock(),
      onJump: (double) => { this.audio.play('jump'); if (double) this.effects.shock(this.player.group.position, 0x62e6ff, 0.7); },
      onWallJump: () => this.audio.play('jump'),
      onLand: (impact) => { this.audio.play('jump'); if (impact > 32) this.effects.ring(this.player.group.position, 0xffffff, 4, 0.35); },
      onHardLand: () => { this.audio.play('heavy'); this.camShake(0.4); },
      onSwingStart: () => this.audio.play('thwip'),
      onSwingRelease: () => this.audio.play('swing'),
      onWebZip: () => this.audio.play('thwip'),
      onZipArrive: () => this.audio.play('hit'),
      onMantle: () => { this.audio.play('jump'); this.ui.notify('MANTLE', 'cyan'); },
      onFlip: (kind) => {
        this.audio.play('swing');
        this.effects.ring(this.player.group.position, 0x62e6ff, 3.2, 0.28);
        if (kind === 'side') this.ui.notify('PARKOUR // SIDE FLIP', 'cyan');
      },
      onRoll: () => this.effects.dust(this.player.group.position, 0xb8c0cc),
      onTrail: (position, velocity, mode) => this.effects.speedTrail(position, velocity, mode),
      onFootstep: (position) => {
        if (this.player.mode === 'ground') this.effects.dust(position, 0x8d939e);
      },
      onDamage: (amount) => { this.audio.play('hurt'); this.ui.damageFlash(); this.camShake(0.3 + amount * 0.01); },
      onDeath: () => this.die('You fell in the line of duty.'),
      onVoidFall: () => this.die('The river took you.'),
      onFlightLocked: () => this.ui.notify('FLIGHT LOCKED // COMPLETE THE SKYFALL TRIAL', 'gold'),
      onFlightToggle: (flying) => this.audio.play('swing'),
      onClimb: () => {},
    });
    this.player.group.visible = false;
    this.player.setEnabled(false);
    this.cityQuestGroup = new THREE.Group();
    this.cityScene.add(this.cityQuestGroup);
    this.caches = [];
    this.setupGodAura();
    this.enemies = new EnemyManager(this.cityScene, this.enemyContext());
    this.ui.setOwnerBadge(false);
    try { this.owner = localStorage.getItem('webfall.owner') === 'granted'; } catch {}
  }

  setupGodAura() {
    this.godAura = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc657, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.035, 6, 40), ringMat);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.02, 6, 40), ringMat.clone());
    r1.rotation.x = Math.PI / 2;
    r2.rotation.x = Math.PI / 3;
    const light = new THREE.PointLight(0xffc657, 1.4, 26, 2);
    this.godAura.add(r1, r2, light);
    this.godAura.position.y = 1.05;
    this.godAura.visible = false;
    this.player.group.add(this.godAura);
    this.godRings = [r1, r2];
  }

  enemyContext() {
    return {
      effects: this.effects,
      audio: this.audio,
      player: this.player,
      onBossSpawn: (enemy) => {
        this.audio.play('boss');
        this.ui.setBoss(enemy);
        this.ui.notify(`BOSS // ${enemy.name}`, 'gold');
        this.camShake(0.5);
      },
      onBossUpdate: (enemy) => this.ui.setBoss(enemy),
      onBossPhase: (enemy, phase) => {
        this.ui.notify(`${enemy.name} // PHASE ${phase}`, 'gold');
        this.ui.subtitle(['HOLD THE LINE.', 'HE IS CHANGING.', 'THIS IS THE LAST PUSH.'][phase - 1] || '', 2.2);
        this.camShake(0.6);
      },
      onBossDefeated: (enemy) => this.bossDefeated(enemy),
      onEnemyDeath: (enemy) => this.enemyKilled(enemy),
    };
  }

  setQuality(level) {
    this.quality = level;
    const pixelRatio = level === 'performance' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.ui.notify(`RENDER QUALITY // ${level.toUpperCase()}`, 'cyan');
  }

  setupInput() {
    window.addEventListener('keydown', (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.code === 'Escape') {
        if (this.mode === 'menu' || !this.started) return;
        this.togglePause(!this.paused);
        return;
      }
      if (this.ui.dialogueActive) {
        if (event.code === 'KeyE' || event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          this.ui.advanceDialogue();
        }
        return;
      }
      if (!this.started || this.paused || this.dead || this.transitioning) return;
      if (event.repeat) return;
      switch (event.code) {
        case 'KeyE': this.interact(); break;
        case 'KeyR': this.webBlast(); break;
        case 'KeyQ': this.spiderSense(); break;
        case 'KeyM': this.cycleUniverse(event.shiftKey ? -1 : 1); break;
        case 'KeyG':
          if (this.owner) this.grantOwner(true);
          break;
        default: break;
      }
    });
  }

  async start() {
    if (this.mode !== 'menu' && this.started) return;
    this.audio.init();
    this.audio.play('quest');
    this.started = true;
    this.mode = 'city';
    this.ui.showStart(false);
    this.ui.showHud(true);
    this.player.group.visible = true;
    this.player.setEnabled(true);
    const spawnPoint = (this.checkpoint.x > this.city.bounds.minX - 5 && this.checkpoint.x < this.city.bounds.maxX + 5) ? this.checkpoint.clone() : new THREE.Vector3(-270, GROUND_Y + 52.4, 535);
    this.checkpoint.copy(spawnPoint);
    this.player.spawn(spawnPoint);
    this.player.yaw = -0.72;
    this.player.pitch = -0.03;
    this.player.flightUnlocked = false;
    this.runTime = 0;
    this.enterQuest(0);
    if (this.owner && !this.ownerApplied) this.applyGodhood(false);
    this.player.requestPointerLock();
    setTimeout(() => {
      if (this.mode === 'city') {
        this.ui.showDialogue(DIALOGUES.intro, () => {
          this.ui.notify('OBJECTIVE UPDATED // FIND THE ORACLE', 'gold');
        });
      }
    }, 1600);
  }

  resetRun() {
    this.enemies.clear();
    this.effects.clear();
    this.clearQuestMarkers();
    this.checkpoint.set(-270, GROUND_Y + 52.4, 535);
    this.questIndex = 0;
    this.questState = { intel: 0, brokerActive: false, vultureActive: false, heraldActive: false, sovereignActive: false, shrineReady: false, beyondShown: false, beaconActive: false };
    this.chaos = 0;
    this.villainsDefeated = 0;
    this.beyond = false;
    this.dead = false;
    this.player.god = this.owner;
    this.player.flightUnlocked = this.owner;
    this.player.speedBoost = this.owner ? 1.35 : 1;
    this.godAura.visible = this.owner;
    this.ui.hideDeath();
    this.ui.hideEnding();
    this.ui.setBoss(null);
    if (this.mode !== 'city') {
      this.returnToCity();
    }
  }

  returnToTitle() {
    this.started = false;
    this.paused = false;
    this.mode = 'menu';
    this.transitioning = false;
    this.player.setEnabled(false);
    this.player.setPaused(false);
    this.player.group.visible = false;
    this.ui.showHud(false);
    this.ui.showStart(true);
    this.ui.setBoss(null);
    this.ui.hideDialogue();
    this.ui.hideDeath();
    this.ui.hideEnding();
    this.ui.setPause(false);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
    this.enemies.clear();
    this.clearQuestMarkers();
    this.effects.clear();
    this.activeScene = this.cityScene;
    this.effects.setScene(this.cityScene);
    this.enemies.scene = this.cityScene;
    this.player.group.parent?.remove(this.player.group);
    this.cityScene.add(this.player.group);
    this.player.leaveSpaceMode();
    this.player.spaceMode = false;
    this.audio.setMode('city');
  }

  returnToCity() {
    this.player.group.parent?.remove(this.player.group);
    this.cityScene.add(this.player.group);
    this.activeScene = this.cityScene;
    this.effects.setScene(this.cityScene);
    this.enemies.scene = this.cityScene;
    this.effects.setSpaceMode(false);
    this.player.spaceMode = false;
    this.player.mode = 'ground';
    this.player.group.position.copy(this.checkpoint);
    this.player.velocity.set(0, 0, 0);
    this.mode = 'city';
    this.audio.setMode('city');
  }

  togglePause(force) {
    if (!this.started || this.dead) return;
    this.paused = force === undefined ? !this.paused : force;
    this.player.setPaused(this.paused);
    this.ui.setPause(this.paused);
    if (this.paused) {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
    } else {
      setTimeout(() => this.player.requestPointerLock(), 80);
    }
  }

  camShake(amount) {
    this.player.shake = Math.min(1.1, this.player.shake + amount * 0.25);
  }

  /* ================= QUESTS ================= */

  get quest() {
    const quests = [
      { title: 'The City Cries', objective: "Reach the Oracle's rooftop beacon." },
      { title: 'Webs of Power', objective: 'Collect 3 signal caches hidden across Manhattan.' },
      { title: "The Broker's Toll", objective: "Break up the Broker's gathering at Times Square." },
      { title: 'Wings over Manhattan', objective: 'Take down the Vulture above Midtown.' },
      { title: 'The Moon is Listening', objective: 'Breach the atmosphere and reach the Moon beacon.' },
      { title: 'Herald of the Void', objective: 'Destroy the Void Herald at the Moon beacon.' },
      { title: 'Edge of Everything', objective: 'Travel beyond the solar system. Find the last circle.' },
      { title: 'The Void Sovereign', objective: 'Defeat the Void Sovereign at the boundary.' },
      { title: 'Become a God', objective: 'Claim the God Core at the First Web shrine.' },
    ];
    return quests[clamp(this.questIndex, 0, quests.length - 1)];
  }

  enterQuest(index) {
    this.questIndex = clamp(index, 0, 8);
    this.clearQuestMarkers();
    const q = this.quest;
    this.checkpoint.copy(this.player.group.position);
    switch (this.questIndex) {
      case 0:
        this.setCityMarker(this.city.questAnchors.oracle, 'THE ORACLE // E', '#62e6ff');
        break;
      case 1:
        this.spawnCaches();
        break;
      case 2:
        if (this.mode === 'city') this.setCityMarker(this.city.questAnchors.broker, 'TIMES SQUARE // E', '#ffc657');
        break;
      case 3:
        this.unlockFlight();
        break;
      case 4:
        this.clearQuestMarkers();
        this.ui.notify('HOLD SHIFT WHILE ASCENDING TO BREACH THE ATMOSPHERE', 'cyan');
        break;
      case 5:
        if (this.mode === 'orbit') this.setSpaceMarker(this.orbit.beaconWorld, 'MOON BEACON // E', '#62e6ff');
        break;
      case 6:
        this.clearQuestMarkers();
        break;
      case 7:
        if (this.mode === 'deep') this.setSpaceMarker(this.deep.bossAnchor, 'THE LAST CIRCLE', '#ca7bff');
        break;
      case 8:
        if (this.mode === 'deep') this.setSpaceMarker(this.deep.shrine.position, 'THE FIRST WEB // E', '#ffc657');
        break;
      default: break;
    }
    this.ui.setQuest({ index: this.questIndex + 1, ...q }, null);
  }

  advanceQuest() {
    if (this.questIndex >= 8) return;
    const next = this.questIndex + 1;
    this.enterQuest(next);
    this.audio.play('quest');
    this.ui.notify(`QUEST COMPLETE // ${this.quest.title.toUpperCase()}`, 'gold');
    if (next === 3) this.ui.showCinematic({ kicker: 'TRAVERSAL UPGRADE', title: 'FLIGHT UNLOCKED', sub: 'Hold F to engage flight. Hold SHIFT to boost.' }, () => {});
  }

  clearQuestMarkers() {
    if (this.spaceMarker) {
      this.spaceMarker.parent?.remove(this.spaceMarker);
      this.spaceMarker = null;
    }
    for (const child of [...this.cityQuestGroup.children]) {
      this.cityQuestGroup.remove(child);
      child.traverse?.((c) => { c.geometry?.dispose(); c.material?.dispose(); });
    }
    this.caches.forEach((cache) => {
      cache.parent?.remove(cache);
    });
    this.caches = [];
    this.cityMarker = null;
    this.spaceMarker = null;
    this.questMarkerPosition = null;
  }

  makeMarker(position, label, color) {
    const group = new THREE.Group();
    group.position.copy(position);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.2, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    beacon.position.y = 30;
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, roughness: 0.2 }));
    diamond.position.y = 2.4;
    const sprite = makeLabelSprite(label, { color: `#${new THREE.Color(color).getHexString()}`, bg: 'rgba(3,7,13,.72)', border: 'rgba(255,255,255,.32)', font: '700 28px Arial', scale: 0.42 });
    sprite.position.y = 6.2;
    const light = new THREE.PointLight(color, 1.4, 30, 2);
    light.position.y = 3;
    group.add(beacon, diamond, sprite, light);
    group.userData = { label, color, diamond, sprite };
    return group;
  }

  setCityMarker(position, label, color) {
    this.clearQuestMarkers();
    this.cityMarker = this.makeMarker(position, label, color);
    this.cityQuestGroup.add(this.cityMarker);
    this.questMarkerPosition = position.clone();
  }

  setSpaceMarker(position, label, color) {
    this.clearQuestMarkers();
    const scene = this.mode === 'orbit' ? this.orbit.scene : this.deep.scene;
    this.spaceMarker = this.makeMarker(position, label, color);
    scene.add(this.spaceMarker);
    this.questMarkerPosition = position.clone();
  }

  spawnCaches() {
    const positions = this.city.questAnchors.intel;
    positions.forEach((pos, i) => {
      const group = new THREE.Group();
      group.position.copy(pos);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: 0xffc657, emissive: 0xff9b1a, emissiveIntensity: 1.8, roughness: 0.2, metalness: 0.4 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffc657, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = Math.PI / 2;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 34, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc657, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
      beam.position.y = 17;
      const light = new THREE.PointLight(0xffc657, 1.6, 26, 2);
      group.add(core, ring, beam, light);
      group.userData = { index: i, pos };
      this.cityScene.add(group);
      this.caches.push(group);
    });
    this.updateCacheMarker();
  }

  updateCacheMarker() {
    const next = this.caches.find((c) => !c.userData.collected);
    if (next) {
      this.questMarkerPosition = next.userData.pos.clone().add(new THREE.Vector3(0, 3, 0));
      this.cityMarker = this.makeMarker(next.userData.pos.clone().add(new THREE.Vector3(0, 1, 0)), `CACHE ${this.questState.intel + 1} / 3 // E`, '#ffc657');
      this.cityQuestGroup.add(this.cityMarker);
    }
  }

  unlockFlight() {
    if (this.player.flightUnlocked) return;
    this.player.flightUnlocked = true;
    this.ui.notify('POWER UNLOCKED // FLIGHT', 'gold');
    this.effects.ring(this.player.group.position, 0x62e6ff, 10, 1);
    this.audio.play('quest');
  }

  cycleUniverse(direction = 1) {
    if (this.mode !== 'city') {
      this.ui.notify('MULTIVERSE ANCHOR UNAVAILABLE OUTSIDE MANHATTAN', 'gold');
      return;
    }
    if (this.transitioning || this.paused || this.dead) return;
    const len = UNIVERSES.length;
    this.universeIndex = ((this.universeIndex + direction) % len + len) % len;
    this.universe = applyUniverse(this.universeIndex, this.city);
    const color = parseInt(this.universe.accent.slice(1), 16);
    this.effects.portalBurst(this.player.group.position, color);
    this.effects.ring(this.player.group.position, color, 14, 0.6);
    this.audio.play('transition');
    this.camShake(0.35);
    this.ui.notify(`MULTIVERSE SHIFT // ${this.universe.name} ${this.universe.subtitle}`, 'cyan');
    this.ui.subtitle(this.universe.tagline, 2.6);
  }

  interact() {
    if (this.mode === 'city') {
      const p = this.player.group.position;
      const rift = this.city.rifts.find((r) => p.distanceTo(r.position) < 5.5);
      if (rift) {
        const index = UNIVERSES.findIndex((u) => u.name.endsWith(rift.name === 'PRIME' ? '616' : rift.name === 'NEON' ? '1610' : '90214'));
        const direction = index === this.universeIndex ? 1 : index - this.universeIndex;
        this.cycleUniverse(index >= 0 ? direction : 1);
        return;
      }
      if (this.questIndex === 0 && p.distanceTo(this.city.questAnchors.oracle) < 9) {
        this.ui.showDialogue(DIALOGUES.oracle, () => this.advanceQuest());
        return;
      }
      if (this.questIndex === 1) {
        for (const cache of this.caches) {
          if (cache.userData.collected) continue;
          if (p.distanceTo(cache.userData.pos) < 7) {
            this.collectCache(cache);
            return;
          }
        }
      }
      if (this.questIndex === 2 && p.distanceTo(this.city.questAnchors.broker) < 13 && !this.questState.brokerActive) {
        this.ui.showDialogue(DIALOGUES.brokerIntro, () => this.startBrokerFight());
        return;
      }
    } else if (this.mode === 'orbit') {
      if (this.questIndex === 4 && this.orbit.distanceToBeacon(this.player) < 60) {
        this.questState.beaconActive = true;
        this.ui.showDialogue(DIALOGUES.beaconIntro, () => this.startHeraldFight());
        return;
      }
    } else if (this.mode === 'deep') {
      if (this.questIndex === 8 && this.deep.distanceToShrine(this.player) < 75 && !this.player.god) {
        this.ui.showDialogue(DIALOGUES.shrine, () => this.applyGodhood(true));
        return;
      }
    }
  }

  collectCache(cache) {
    cache.userData.collected = true;
    this.questState.intel++;
    this.audio.play('collect');
    this.effects.portalBurst(cache.position, 0xffc657);
    this.effects.spawnDebris(cache.position, [0xffc657, 0xfff0c5], 10, 8);
    cache.visible = false;
    this.chaos += 2;
    this.ui.notify(`SIGNAL CACHE ${this.questState.intel} / 3 // RECOVERED`, 'gold');
    if (this.cityMarker) {
      this.cityMarker.removeFromParent();
      this.cityMarker = null;
    }
    if (this.questState.intel >= 3) {
      this.ui.showDialogue(DIALOGUES.cachesDone, () => this.advanceQuest());
    } else {
      this.updateCacheMarker();
    }
  }

  startBrokerFight() {
    this.questState.brokerActive = true;
    this.ui.setQuest({ index: 3, title: "The Broker's Toll", objective: 'Defeat the Broker and his enforcers.' }, null);
    if (this.cityMarker) {
      this.cityMarker.removeFromParent();
      this.cityMarker = null;
    }
    this.questMarkerPosition = null;
    this.enemies.setChallenge(true);
    this.enemies.spawn('broker', this.city.questAnchors.broker.clone().add(new THREE.Vector3(0, 0, 0)), { aggro: true });
    this.enemies.spawnGroup('thug', 4, this.city.questAnchors.broker.clone(), 12);
    this.ui.notify('THREAT DETECTED // BROKER + ENFORCERS', 'gold');
  }

  bossDefeated(enemy) {
    this.villainsDefeated++;
    this.chaos += 12;
    this.ui.setBoss(null);
    this.enemies.setChallenge(false);
    this.effects.portalBurst(enemy.group.position, 0xffc657);
    if (enemy.type === 'broker') {
      this.ui.showDialogue(DIALOGUES.brokerDefeat, () => {
        this.enterQuest(3);
        this.ui.notify('THE VULTURE INBOUND', 'gold');
        setTimeout(() => this.spawnVulture(), 600);
      });
    } else if (enemy.type === 'vulture') {
      this.ui.showDialogue(DIALOGUES.vultureDefeat, () => {
        this.player.flightUnlocked = true;
        this.enterQuest(4);
      });
    } else if (enemy.type === 'herald') {
      this.questState.heraldActive = false;
      this.ui.showDialogue(DIALOGUES.heraldDefeat, () => this.transitionToDeepSpace());
    } else if (enemy.type === 'sovereign') {
      this.questState.sovereignActive = false;
      this.ui.showDialogue(DIALOGUES.sovereignDefeat, () => {
        this.enterQuest(8);
        this.ui.notify('THE LAST CIRCLE IS BROKEN // CLAIM THE GOD CORE', 'gold');
      });
    }
  }

  spawnVulture() {
    if (this.questState.vultureActive) return;
    this.questState.vultureActive = true;
    const spawn = this.player.group.position.clone().add(new THREE.Vector3(0, 34, -50));
    this.enemies.spawn('vulture', spawn, { aggro: true });
    this.ui.showDialogue(DIALOGUES.vultureIntro, () => {});
    this.ui.notify('BOSS // THE VULTURE', 'gold');
  }

  startHeraldFight() {
    if (this.questState.heraldActive) return;
    this.questState.heraldActive = true;
    this.questIndex = 5;
    this.ui.setQuest({ index: 6, title: 'Herald of the Void', objective: 'Destroy the Void Herald at the Moon beacon.' }, null);
    this.clearQuestMarkers();
    const spawn = this.orbit.beaconWorld.clone().add(new THREE.Vector3(0, 40, 0));
    this.enemies.spawn('herald', spawn, { aggro: true });
    this.ui.notify('BOSS // VOID HERALD', 'gold');
  }

  transitionToOrbit() {
    if (this.transitioning || this.mode !== 'city') return;
    this.transitioning = true;
    this.player.setEnabled(false);
    this.player.detachWeb();
    this.audio.play('transition');
    this.ui.showCinematic({ kicker: 'SECTOR 02', title: 'LOW EARTH ORBIT', sub: 'The city becomes a memory. The Moon is listening.' }, () => {
      this.orbit = this.orbit || createOrbitWorld();
      this.player.group.parent?.remove(this.player.group);
      this.orbit.scene.add(this.player.group);
      this.activeScene = this.orbit.scene;
      this.effects.setScene(this.orbit.scene);
      this.effects.setSpaceMode(true);
      this.enemies = new EnemyManager(this.orbit.scene, this.enemyContext());
      this.mode = 'orbit';
      this.player.enterSpaceMode(new THREE.Vector3(-60, 340, 720), 200);
      this.player.setEnabled(true);
      this.player.flightUnlocked = true;
      this.questIndex = 4;
      this.enterQuest(4);
      this.setSpaceMarker(this.orbit.beaconWorld, 'MOON BEACON // E', '#62e6ff');
      this.audio.setMode('space');
      this.ui.notify('ZONE // LOW EARTH ORBIT', 'cyan');
      this.ui.notify('SPIDER SENSE // Q  |  WEB BLAST // R', 'gold');
      this.transitioning = false;
      this.checkpoint.copy(this.player.group.position);
      this.ui.showDialogue([
        { speaker: 'THE ORACLE', role: 'FRIEND / SIGNAL', portrait: 'O', color: '#62e6ff', text: 'You are above the weather now. The Moon beacon is on your HUD. Land and crack it open.' },
        { speaker: 'YOU', role: 'THE WEB', portrait: 'W', color: '#ff2b45', text: 'Something is already waiting up here.' },
      ], () => {});
    });
  }

  transitionToDeepSpace() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.setEnabled(false);
    this.audio.play('transition');
    this.ui.showCinematic({ kicker: 'SECTOR 03', title: 'THE HELIOPAUSE', sub: 'Beyond the solar wind, a circle is closing.' }, () => {
      this.deep = this.deep || createDeepSpaceWorld();
      this.player.group.parent?.remove(this.player.group);
      this.deep.scene.add(this.player.group);
      this.activeScene = this.deep.scene;
      this.effects.setScene(this.deep.scene);
      this.effects.setSpaceMode(true);
      this.enemies = new EnemyManager(this.deep.scene, this.enemyContext());
      this.mode = 'deep';
      this.player.enterSpaceMode(new THREE.Vector3(0, 40, 2980), 420);
      this.player.setEnabled(true);
      this.player.flightUnlocked = true;
      this.questIndex = 6;
      this.enterQuest(6);
      this.setSpaceMarker(this.deep.bossAnchor, 'THE LAST CIRCLE', '#ca7bff');
      this.audio.setMode('space');
      this.ui.notify('ZONE // OUTSIDE THE SOLAR SYSTEM', 'cyan');
      this.ui.notify('THE SHIFT KEY IS YOUR FRIEND // BOOST', 'gold');
      this.transitioning = false;
      this.checkpoint.copy(this.player.group.position);
      this.ui.showDialogue(DIALOGUES.deepIntro, () => {
        this.questIndex = 7;
        this.questState.sovereignActive = true;
        this.ui.setQuest({ index: 8, title: 'The Void Sovereign', objective: 'Defeat the Void Sovereign at the boundary.' }, null);
        this.enemies.spawn('sovereign', this.deep.bossAnchor.clone(), { aggro: true });
      });
    });
  }

  applyGodhood(showEnding) {
    this.ownerApplied = true;
    this.player.god = true;
    this.player.flightUnlocked = true;
    this.player.speedBoost = 1.35;
    this.player.health = this.player.maxHealth;
    this.godAura.visible = true;
    this.ui.setOwnerBadge(true);
    this.audio.play('god');
    this.effects.portalBurst(this.player.group.position, 0xffc657);
    this.ui.notify('GODHOOD ACHIEVED // THE LAST CIRCLE CANNOT HOLD YOU', 'gold');
    if (showEnding) {
      this.questIndex = 8;
      this.enterQuest(8);
      this.ui.showEnding({ villains: this.villainsDefeated, chaos: this.chaos, time: this.runTime });
    }
  }

  grantOwner(has) {
    if (!has) return;
    this.owner = true;
    try { localStorage.setItem('webfall.owner', 'granted'); } catch {}
    this.ui.setOwnerBadge(true);
    if (this.started) {
      this.applyGodhood(false);
    } else {
      this.ui.notify('OWNER CLEARANCE // THE CIRCLES ARE DEFEATED', 'gold');
    }
  }

  enemyKilled(enemy) {
    this.chaos += 2;
    this.villainsDefeated += 0;
    this.audio.play('hit');
    if (this.questState.brokerActive && this.enemies.getAliveCount() === 0 && !this.enemies.getBoss()) {
      // boss handles completion
    }
  }

  /* ================= COMBAT ================= */

  onPrimary() {
    if (this.ui.dialogueActive || this.paused || this.dead || this.transitioning) return;
    const player = this.player;
    if (player.mode === 'swing') {
      player.detachWeb();
      this.audio.play('swing');
      return;
    }
    if (player.spaceMode) {
      this.webBlast();
      return;
    }
    const aim = player.getAimRay();
    const enemyHit = this.enemies.raycast(aim.origin, aim.direction, player.mode === 'fly' ? 90 : 45);
    const flatDist = enemyHit ? player.group.position.distanceTo(enemyHit.enemy.group.position) : Infinity;
    const grounded = player.onGround && !player.spaceMode;
    const sprint = player.keys.has('ShiftLeft') || player.keys.has('ShiftRight');
    if (grounded && enemyHit && flatDist < 6.5) {
      player.performPunch();
      this.enemies.melee(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), aim.direction, sprint ? 6.4 : 5.2, sprint ? 30 : 18, sprint);
      this.effects.shock(enemyHit.point, 0xffd0a0, 0.5);
      this.camShake(sprint ? 0.4 : 0.22);
      this.audio.play(sprint ? 'heavy' : 'punch');
      return;
    }
    if (grounded) {
      const smashed = this.smashNearbyDestructibles(player.group.position, aim.direction, sprint ? 6 : 4.6, sprint ? 3 : 1);
      player.performPunch();
      if (!smashed) this.audio.play('punch');
      this.camShake(0.14);
      return;
    }
    // aerial: swing or web strike
    const anchor = this.findWebAnchor();
    if (anchor) {
      player.attachSwing(anchor);
      this.ui.setInteract(null);
      return;
    }
    if (enemyHit && flatDist < 14) {
      player.performPunch();
      this.enemies.melee(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), aim.direction, 5.5, 16, false);
      this.audio.play('punch');
      return;
    }
  }

  onPrimaryUp() {
    if (this.player.mode === 'swing') {
      this.player.detachWeb();
    }
  }

  onSecondary() {
    if (this.ui.dialogueActive || this.paused || this.dead || this.transitioning) return;
    if (this.player.spaceMode) return;
    const enemyHit = this.enemies.raycast(...Object.values(this.player.getAimRay()), 80);
    const anchor = enemyHit && enemyHit.distance < 40 ? enemyHit.point : this.findWebAnchor();
    if (anchor) this.player.zipTo(anchor);
  }

  webBlast() {
    if (this.cooldowns.blast > 0 || this.paused || this.dead || this.transitioning) return;
    if (this.player.focus < 12) {
      this.ui.notify('FOCUS LOW', 'gold');
      return;
    }
    this.player.useWebBlast();
    this.cooldowns.blast = 0.55;
    const aim = this.player.getAimRay();
    const enemyHit = this.enemies.raycast(aim.origin, aim.direction, 110);
    this.audio.play('blast');
    if (enemyHit) {
      this.enemies.damage(enemyHit.enemy, 12, aim.origin, { color: 0xffffff, knockback: 4, stun: enemyHit.enemy.type === 'vulture' ? 1.3 : 0.15 });
      this.effects.webSplat(enemyHit.point, aim.direction.clone().negate(), 0xffffff);
      this.effects.shock(enemyHit.point, 0x9fe8ff, 0.7);
      return;
    }
    const ray = new THREE.Raycaster(aim.origin, aim.direction, 0.1, 120);
    const destructibleHits = ray.intersectObjects(this.city.destructibles, true);
    if (this.mode === 'city' && destructibleHits.length) {
      const obj = this.destructibleAncestor(destructibleHits[0].object);
      if (obj) {
        this.damageDestructible(obj, 2, destructibleHits[0].point);
        this.effects.webSplat(destructibleHits[0].point, destructibleHits[0].face?.normal || aim.direction.clone().negate(), 0xffffff);
        return;
      }
    }
    if (this.mode === 'city') {
      const hit = this.findWebAnchorRaw(aim.origin, aim.direction, 120);
      if (hit) {
        this.effects.webSplat(hit.point, hit.normal, 0xffffff);
      }
    }
  }

  spiderSense() {
    if (this.cooldowns.sense > 0 || this.paused || this.dead || this.transitioning) return;
    if (this.player.focus < 20) {
      this.ui.notify('FOCUS LOW', 'gold');
      return;
    }
    if (!this.player.useSense()) return;
    this.cooldowns.sense = 8;
    this.senseActive = 1.7;
    this.audio.play('sense');
    this.effects.ring(this.player.group.position, 0x62e6ff, 26, 1.1);
    this.effects.shock(this.player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x62e6ff, 2.2);
    this.ui.notify('SPIDER SENSE // THREATS SLOWED', 'cyan');
    for (const enemy of this.enemies.enemies) {
      if (enemy.alive) this.effects.ring(enemy.group.position, 0x62e6ff, 4, 1.2);
    }
  }

  findWebAnchor() {
    const aim = this.player.getAimRay();
    const hit = this.findWebAnchorRaw(aim.origin, aim.direction, 145);
    return hit ? hit.point : null;
  }

  findWebAnchorRaw(origin, direction, maxDist) {
    if (this.mode !== 'city') return null;
    this.raycaster.set(origin, direction);
    this.raycaster.near = 0;
    this.raycaster.far = maxDist;
    const hits = this.raycaster.intersectObjects(this.city.hittables, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : direction.clone().negate();
    return { point: hit.point.clone(), normal };
  }

  smashNearbyDestructibles(origin, direction, range, damage) {
    const flat = direction.clone();
    flat.y = 0;
    flat.normalize();
    let smashed = false;
    for (const obj of [...this.city.destructibles]) {
      if (!obj.parent) continue;
      const to = obj.position.clone().sub(origin);
      const dist = to.length();
      if (dist > range + 2) continue;
      const vertical = Math.abs(obj.position.y - origin.y);
      if (vertical > 3) continue;
      to.y = 0;
      to.normalize();
      if (to.dot(flat) < 0.1 && dist > 1.6) continue;
      this.damageDestructible(obj, damage, obj.position.clone().add(new THREE.Vector3(0, 1, 0)));
      smashed = true;
    }
    return smashed;
  }

  destructibleAncestor(object) {
    let current = object;
    while (current) {
      if (current.userData?.destructible) return current;
      current = current.parent;
    }
    return null;
  }

  damageDestructible(object, amount, point) {
    const data = object.userData.destructible;
    if (!data) return;
    data.hp -= amount;
    this.effects.hit(point || object.position.clone().add(new THREE.Vector3(0, 1, 0)), data.type === 'car' ? 0xffb347 : 0xd8b06a);
    this.audio.play('hit');
    object.position.y += 0.06;
    setTimeout(() => { if (object.parent) object.position.y -= 0.06; }, 60);
    if (data.hp <= 0) this.destroyObject(object);
  }

  destroyObject(object) {
    const data = object.userData.destructible;
    const position = object.position.clone();
    const color = data.type === 'car' ? 0xffb347 : 0x8c6c3d;
    this.effects.explosion(position.clone().add(new THREE.Vector3(0, data.type === 'car' ? 0.8 : 0.5, 0)), color, data.type === 'car' ? 2.6 : 1.1);
    this.effects.spawnDebris(position.clone().add(new THREE.Vector3(0, 0.6, 0)), data.colors, data.shatter, data.type === 'car' ? 16 : 9);
    if (data.type === 'car') {
      this.audio.play('explosion');
      this.enemies.aoe(position, 7, 22, 0xffb347);
      if (this.player.group.position.distanceTo(position) < 7) this.player.takeDamage(6, position);
      this.chaos += 4;
    } else {
      this.audio.play('heavy');
      this.chaos += 1;
    }
    object.parent?.remove(object);
    const idx = this.city.destructibles.indexOf(object);
    if (idx >= 0) this.city.destructibles.splice(idx, 1);
    this.ui.notify(data.type === 'car' ? 'VEHICLE WRECKED // CHAOS +4' : 'PROPERTY DAMAGED // CHAOS +1', '');
  }

  /* ================= DEATH / RESPAWN ================= */

  die(reason, options = {}) {
    if (this.dead) return;
    this.dead = true;
    this.player.setEnabled(false);
    this.audio.play('death');
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
    this.ui.showDeath({
      kicker: options.kicker || 'SIGNAL LOST',
      title: options.title || 'YOU DIED',
      text: reason,
    });
  }

  respawn() {
    this.dead = false;
    this.ui.hideDeath();
    this.player.setEnabled(true);
    this.player.health = this.player.maxHealth;
    this.player.invulnerable = 1.4;
    this.enemies.clear();
    this.effects.clear();
    this.ui.setBoss(null);
    if (this.mode === 'city') {
      if (this.questState.brokerActive) {
        this.enemies.spawn('broker', this.city.questAnchors.broker.clone(), { aggro: true });
        this.enemies.spawnGroup('thug', 4, this.city.questAnchors.broker.clone(), 12);
      } else if (this.questState.vultureActive) {
        this.enemies.spawn('vulture', this.player.group.position.clone().add(new THREE.Vector3(0, 34, -50)), { aggro: true });
      }
    }
    if (this.mode === 'orbit') {
      this.orbit = this.orbit || createOrbitWorld();
      this.player.enterSpaceMode(new THREE.Vector3(-60, 340, 720), 200);
      this.enterQuest(4);
      this.setSpaceMarker(this.orbit.beaconWorld, 'MOON BEACON // E', '#62e6ff');
      if (this.questState.heraldActive) this.enemies.spawn('herald', this.orbit.beaconWorld.clone().add(new THREE.Vector3(0, 40, 0)), { aggro: true });
    } else if (this.mode === 'deep') {
      this.deep = this.deep || createDeepSpaceWorld();
      this.player.enterSpaceMode(new THREE.Vector3(0, 40, 2900), 420);
      this.questIndex = 7;
      this.questState.sovereignActive = true;
      this.setSpaceMarker(this.deep.bossAnchor, 'THE LAST CIRCLE', '#ca7bff');
      this.enemies.spawn('sovereign', this.deep.bossAnchor.clone(), { aggro: true });
    } else {
      this.player.spawn(this.checkpoint.clone());
      this.enterQuest(this.questIndex);
    }
    setTimeout(() => this.player.requestPointerLock(), 60);
  }

  /* ================= UPDATE ================= */

  loop() {
    requestAnimationFrame(() => this.loop());
    this.dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += this.dt;
    this.runTime += this.started && !this.paused ? this.dt : 0;
    if (this.mode === 'menu') {
      this.updateMenu();
    } else if (this.started) {
      this.updatePlay(this.dt);
    }
    this.renderer.render(this.activeScene, this.camera);
    if (this.started) this.ui.update(this.player, this);
    this.ui.speedLines(this.started && !this.dead && this.player.speedKmh > 145);
  }

  updateMenu() {
    this.menuOrbit += this.dt * 0.07;
    const radius = 640;
    const height = 210 + Math.sin(this.menuOrbit * 0.6) * 60;
    this.camera.position.set(Math.cos(this.menuOrbit) * radius, height, Math.sin(this.menuOrbit) * radius + 60);
    this.camera.lookAt(0, 70, -40);
    this.city.update(this.dt, this.elapsed, { y: this.camera.position.y });
    this.effects.update(this.dt);
  }

  updatePlay(dt) {
    const pausedNow = this.paused || this.ui.dialogueActive || this.transitioning;
    if (!pausedNow) {
      this.player.update(dt, this.elapsed);
    } else {
      this.player.updateCamera(dt, false);
    }

    const enemyScale = this.senseActive > 0 ? 0.38 : 1;
    if (this.mode === 'city') {
      this.city.update(dt, this.elapsed, this.player.group.position);
      this.zone = this.city.zoneAt(this.player.group.position);
      if (!pausedNow) {
        this.enemies.update(dt * enemyScale, this.player);
        if (this.player.group.position.y > 1180 && this.player.mode === 'fly' && this.questIndex >= 4) {
          this.transitionToOrbit();
        }
      }
    } else if (this.mode === 'orbit') {
      this.orbit.update(dt, this.elapsed, this.player);
      this.zone = this.player.group.position.y > 260 ? 'LUNAR SURFACE' : 'LOW EARTH ORBIT';
      if (!pausedNow) {
        this.orbit.collidePlayer(this.player);
        this.enemies.update(dt * enemyScale, this.player);
        if (this.player.group.position.distanceTo(new THREE.Vector3(0, 0, 0)) > 9000) {
          this.ui.subtitle('THE SIGNAL LINKS TO THE HELIOPAUSE...', 3);
        }
      }
    } else if (this.mode === 'deep') {
      this.deep.update(dt, this.elapsed, this.player);
      this.zone = 'OUTER SOLAR SYSTEM';
      if (!pausedNow) {
        this.enemies.update(dt * enemyScale, this.player);
        this.checkUniverseBoundary();
        if (this.player.group.position.z > 3850 && this.player.group.position.z < 4100) this.zone = 'THE LAST CIRCLE';
      }
      if (this.beyond && this.player.god) {
        this.deep.scene.background.lerp(new THREE.Color(0xf8f4ea), 1 - Math.exp(-1.6 * dt));
      }
    }

    if (this.senseActive > 0) this.senseActive = Math.max(0, this.senseActive - dt);
    this.cooldowns.blast = Math.max(0, this.cooldowns.blast - dt);
    this.cooldowns.sense = Math.max(0, this.cooldowns.sense - dt);
    this.effects.update(dt);
    this.updateGodAura(dt);
    this.updateMarkers(dt);
    this.updateInteract();
    this.updateQuestDistance();
    this.updateBarks(dt);
    this.audio.setIntensity(clamp(this.player.speedKmh / 320 + (this.enemies.getBoss() ? 0.4 : 0), 0, 1));
  }

  updateGodAura(dt) {
    if (!this.godAura.visible) return;
    this.godRings[0].rotation.z += dt * 0.8;
    this.godRings[1].rotation.y += dt * 0.6;
    this.godAura.position.y = 1.05 + Math.sin(this.elapsed * 2) * 0.08;
  }

  updateMarkers(dt) {
    const pulse = (marker) => {
      if (!marker) return;
      marker.userData.diamond.rotation.y += dt * 1.4;
      marker.userData.diamond.position.y = 2.4 + Math.sin(this.elapsed * 2.2) * 0.35;
      if (marker.userData.sprite && this.mode !== 'city') marker.userData.sprite.quaternion.copy(this.camera.quaternion);
    };
    pulse(this.cityMarker);
    pulse(this.spaceMarker);
    for (let i = 0; i < this.caches.length; i++) {
      const cache = this.caches[i];
      if (cache.userData.collected) continue;
      cache.children[0].rotation.y += dt * 1.3;
      cache.children[0].position.y = Math.sin(this.elapsed * 2 + i) * 0.2;
      cache.children[1].rotation.z += dt * 0.7;
    }
    if (this.cityMarker) {
      this.cityMarker.userData.sprite.lookAt(this.camera.position);
    }
  }

  updateInteract() {
    let prompt = null;
    if (this.mode === 'city') {
      const p = this.player.group.position;
      const rift = this.city.rifts.find((r) => p.distanceTo(r.position) < 5.5);
      if (rift) prompt = `Shift reality // ${rift.name} RIFT`;
      if (this.questIndex === 0 && p.distanceTo(this.city.questAnchors.oracle) < 9) prompt = 'Hear the Oracle';
      if (this.questIndex === 1) {
        for (const cache of this.caches) {
          if (!cache.userData.collected && p.distanceTo(cache.userData.pos) < 7) prompt = `Recover signal cache ${this.questState.intel + 1} / 3`;
        }
      }
      if (this.questIndex === 2 && !this.questState.brokerActive && p.distanceTo(this.city.questAnchors.broker) < 13) prompt = 'Confront the Broker';
    } else if (this.mode === 'orbit') {
      if (this.questIndex === 4 && this.orbit.distanceToBeacon(this.player) < 60) prompt = 'Activate the Moon beacon';
    } else if (this.mode === 'deep') {
      if (this.questIndex === 8 && this.deep.distanceToShrine(this.player) < 75 && !this.player.god) prompt = 'Claim the God Core';
    }
    this.ui.setInteract(prompt);
  }

  updateQuestDistance() {
    let distance = null;
    if (this.questMarkerPosition) {
      const target = this.questMarkerPosition;
      if (this.mode === 'city') {
        distance = Math.hypot(target.x - this.player.group.position.x, target.z - this.player.group.position.z);
      } else {
        distance = this.player.group.position.distanceTo(target);
      }
    }
    this.ui.setQuestDistance(distance);
    if (this.enemies.getBoss()) this.ui.setBoss(this.enemies.getBoss());
  }

  updateBarks(dt) {
    this.barkTimer -= dt;
    if (this.barkTimer > 0) return;
    const boss = this.enemies.getBoss();
    if (!boss) return;
    this.barkTimer = 9 + Math.random() * 6;
    const barks = {
      broker: ['You cannot punch money.', 'The Vulture sends his regards.', 'This city eats heroes.'],
      vulture: ['The sky is mine, spider.', 'You are too slow on the rebound.', 'Fall. It is cleaner.'],
      herald: ['The First Web is a leash.', 'Your blood sings, little hero.', 'The Sovereign sees you.'],
      sovereign: ['All circles close.', 'I am the edge of meaning.', 'You are a small bright accident.'],
    };
    const list = barks[boss.type] || [];
    if (list.length) this.ui.subtitle(list[Math.floor(Math.random() * list.length)], 2.4);
  }

  checkUniverseBoundary() {
    if (!this.deep) return;
    const outside = this.deep.isOutsideUniverse(this.player);
    if (!outside) return;
    if (this.player.god) {
      this.beyond = true;
      if (!this.questState.beyondShown) {
        this.questState.beyondShown = true;
        this.ui.notify('BEYOND THE LAST CIRCLE // UNBOUND', 'gold');
        this.ui.subtitle('There is no wall here. Only you.', 4);
        this.applyGodhood(true);
      }
      return;
    }
    this.die('You crossed the last circle before becoming a god. The Void does not negotiate.', { kicker: 'THE LAST CIRCLE', title: 'ERASED' });
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

window.game = new Game();
