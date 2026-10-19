import { clamp, formatTime, sha256 } from './utils.js';

const OWNER_HASH = 'ee4366ee7198af4e4a05e124becf1a64f807f1e015ccbada51650713464e106f';

const ZONES = {
  'MIDTOWN': [40.758, -73.985],
  'TIMES SQUARE': [40.758, -73.985],
  'CENTRAL PARK': [40.782, -73.965],
  'FINANCIAL DISTRICT': [40.707, -74.011],
  'UPPER MANHATTAN': [40.811, -73.946],
  'UPPER AIRSPACE': [40.71, -74.0],
  'LOW EARTH ORBIT': [0, 0],
  'LUNAR SURFACE': [0, 0],
  'OUTER SOLAR SYSTEM': [0, 0],
};

export class UI {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.$ = (id) => document.getElementById(id);
    this.notices = [];
    this.dialogue = null;
    this.typing = null;
    this.paused = false;
    this.minimap = this.$('minimap');
    this.mapCtx = this.minimap.getContext('2d');
    this.timeSeconds = 20 * 3600 + 41 * 60;
    this.lastMap = 0;
    this.quality = 'HIGH';
    this.bind();
  }

  bind() {
    this.$('start-button').addEventListener('click', () => this.callbacks.onStart?.());
    this.$('resume-button').addEventListener('click', () => this.callbacks.onResume?.());
    this.$('restart-button').addEventListener('click', () => this.callbacks.onRestart?.());
    this.$('quit-button').addEventListener('click', () => this.callbacks.onQuit?.());
    this.$('help-button').addEventListener('click', () => this.openModal('help-modal'));
    this.$('owner-button').addEventListener('click', () => this.openModal('owner-modal'));
    this.$('pause-owner-button').addEventListener('click', () => this.openModal('owner-modal'));
    this.$('owner-submit').addEventListener('click', () => this.verifyOwner());
    this.$('owner-code').addEventListener('keydown', (event) => {
      if (event.code === 'Enter') {
        event.preventDefault();
        this.verifyOwner();
      }
    });
    for (const button of document.querySelectorAll('[data-close]')) {
      button.addEventListener('click', () => this.closeModal(button.dataset.close));
    }
    this.$('dialogue-next').addEventListener('click', () => this.advanceDialogue());
    this.$('respawn-button').addEventListener('click', () => this.callbacks.onRespawn?.());
    this.$('continue-button').addEventListener('click', () => this.callbacks.onContinue?.());
    this.$('ending-restart').addEventListener('click', () => this.callbacks.onRestart?.());
    this.$('sound-toggle').addEventListener('click', () => {
      const muted = this.callbacks.onToggleSound?.();
      this.$('sound-toggle').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    });
    this.$('fullscreen-toggle').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    this.$('quality-button').addEventListener('click', () => {
      this.quality = this.quality === 'HIGH' ? 'PERFORMANCE' : 'HIGH';
      this.$('quality-button').textContent = `QUALITY: ${this.quality}`;
      this.callbacks.onQuality?.(this.quality.toLowerCase());
    });
    window.addEventListener('resize', () => this.drawMinimapStatic());
  }

  openModal(id) {
    this.$(id).classList.remove('hidden');
    if (id === 'owner-modal') setTimeout(() => this.$('owner-code').focus(), 50);
  }

  closeModal(id) {
    this.$(id).classList.add('hidden');
    if (id === 'owner-modal') {
      this.$('owner-code').value = '';
      this.$('owner-message').textContent = '';
      this.$('owner-message').classList.remove('ok');
    }
  }

  async verifyOwner() {
    const input = this.$('owner-code').value.trim().toLowerCase().replace(/\s+/g, ' ');
    const message = this.$('owner-message');
    if (!input) {
      message.textContent = 'ENTER A PHRASE.';
      return;
    }
    const hash = await sha256(input);
    if (hash === OWNER_HASH) {
      message.textContent = 'CLEARANCE ACCEPTED. THE CIRCLES ARE DEFEATED.';
      message.classList.add('ok');
      try { localStorage.setItem('webfall.owner', 'granted'); } catch {}
      this.callbacks.onOwner?.(true);
      setTimeout(() => this.closeModal('owner-modal'), 1400);
    } else {
      message.classList.remove('ok');
      message.textContent = 'ACCESS DENIED. THE VOID IS WATCHING.';
      this.callbacks.onOwnerFailed?.();
    }
  }

  setOwnerBadge(owner) {
    this.$('owner-badge').classList.toggle('hidden', !owner);
  }

  showStart(show) {
    this.$('start-screen').classList.toggle('hidden', !show);
  }

  showHud(show) {
    this.$('hud').classList.toggle('hidden', !show);
  }

  loadingDone() {
    const loading = this.$('loading');
    loading.classList.add('done');
    setTimeout(() => loading.classList.add('hidden'), 700);
  }

  update(player, game) {
    const health = clamp(player.health / player.maxHealth, 0, 1);
    const stamina = clamp(player.stamina / player.maxStamina, 0, 1);
    const focus = clamp(player.focus / player.maxFocus, 0, 1);
    this.$('health-fill').style.width = `${health * 100}%`;
    this.$('health-text').textContent = Math.ceil(player.health);
    this.$('stamina-fill').style.width = `${stamina * 100}%`;
    this.$('focus-fill').style.width = `${focus * 100}%`;
    this.$('speed-readout').textContent = Math.round(player.speedKmh);
    this.$('altitude-readout').textContent = `${Math.round(player.group.position.y)} M`;
    this.$('chaos-readout').textContent = Math.round(game.chaos);
    const stance = player.god ? 'GODHOOD / UNBOUND'
      : player.spaceMode ? 'ZERO-G FLIGHT / UNBOUND'
        : player.mode === 'fly' ? 'FLIGHT / AERIAL'
          : player.mode === 'swing' ? 'WEB-SWING / MOMENTUM'
            : player.mode === 'zip' ? 'WEB-ZIP / PULL'
              : player.onGround ? 'PATROL / GROUNDED' : 'FREEFALL / PARKOUR';
    this.$('stance-readout').textContent = stance;
    this.$('cd-sense').style.transform = `scaleY(${clamp(game.cooldowns.sense / 8, 0, 1)})`;
    this.$('cd-blast').style.transform = `scaleY(${clamp(game.cooldowns.blast / 0.55, 0, 1)})`;
    this.$('flight-state').textContent = player.flightUnlocked ? (player.mode === 'fly' ? 'Engaged' : 'Ready') : 'Locked';
    this.$('cd-flight').style.transform = `scaleY(${player.flightUnlocked ? 0 : 1})`;
    this.$('zone-readout').textContent = game.zone;
    this.$('owner-badge').classList.toggle('hidden', !game.owner);

    const pos = player.group.position;
    const zone = game.zone || 'MIDTOWN';
    const coords = ZONES[zone] || ZONES.MIDTOWN;
    this.$('map-coords').textContent = `${coords[0].toFixed(2)} N / ${Math.abs(coords[1]).toFixed(2)} W`;
    this.$('map-zone').textContent = zone;
    this.timeSeconds += game.dt;
    const total = Math.floor(this.timeSeconds) % 86400;
    this.$('map-time').textContent = `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}`;

    if (game.elapsed - this.lastMap > 0.08) {
      this.lastMap = game.elapsed;
      this.drawMinimap(game);
    }
  }

  drawMinimapStatic() {
    if (!this.mapCtx) return;
  }

  drawMinimap(game) {
    const ctx = this.mapCtx;
    const w = this.minimap.width;
    const h = this.minimap.height;
    const px = (game.player.group.position.x) / 340 * (w / 2) + w / 2;
    const pz = (game.player.group.position.z) / 1100 * (h / 2) + h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060b12';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0d1522';
    ctx.fillRect(w * 0.02, 0, w * 0.96, h);
    ctx.fillStyle = '#101b18';
    const mapRect = (x, z, rw, rh, color) => {
      const mx = x / 340 * (w / 2) + w / 2;
      const mz = z / 1100 * (h / 2) + h / 2;
      ctx.fillStyle = color;
      ctx.fillRect(mx - rw / 2, mz - rh / 2, rw, rh);
    };
    mapRect(0, -410, w * 0.56, h * 0.22, '#13251a');
    ctx.strokeStyle = 'rgba(150,170,200,.16)';
    ctx.lineWidth = 1;
    for (const x of [-240, -160, -80, 0, 80, 160, 240]) {
      const mx = x / 340 * (w / 2) + w / 2;
      ctx.beginPath();
      ctx.moveTo(mx, 4);
      ctx.lineTo(mx, h - 4);
      ctx.stroke();
    }
    for (let z = -960; z <= 1040; z += 100) {
      const mz = z / 1100 * (h / 2) + h / 2;
      ctx.beginPath();
      ctx.moveTo(4, mz);
      ctx.lineTo(w - 4, mz);
      ctx.stroke();
    }
    const marker = game.questMarkerPosition;
    if (marker) {
      const mx = clamp(marker.x / 340 * (w / 2) + w / 2, 6, w - 6);
      const mz = clamp(marker.z / 1100 * (h / 2) + h / 2, 6, h - 6);
      ctx.fillStyle = '#ffc657';
      ctx.beginPath();
      ctx.arc(mx, mz, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,198,87,.55)';
      ctx.beginPath();
      ctx.arc(mx, mz, 7 + Math.sin(game.elapsed * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const enemy of game.enemies?.enemies || []) {
      if (!enemy.alive) continue;
      const ex = clamp(enemy.group.position.x / 340 * (w / 2) + w / 2, 2, w - 2);
      const ez = clamp(enemy.group.position.z / 1100 * (h / 2) + h / 2, 2, h - 2);
      ctx.fillStyle = enemy.boss ? '#ca7bff' : '#ff2b45';
      ctx.fillRect(ex - 2, ez - 2, 4, 4);
    }
    const mx = clamp(px, 3, w - 3);
    const mz = clamp(pz, 3, h - 3);
    ctx.save();
    ctx.translate(mx, mz);
    ctx.rotate(-game.player.yaw);
    ctx.fillStyle = '#62e6ff';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3.4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-3.4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(98,230,255,.25)';
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }

  setQuest(quest, distance) {
    this.$('quest-count').textContent = String(quest.index).padStart(2, '0');
    this.$('quest-title').textContent = quest.title;
    this.$('quest-objective').textContent = quest.objective;
    this.$('quest-distance').textContent = distance === null || distance === undefined ? '--' : `${Math.round(distance)} m`;
    this.$('pause-quest').textContent = quest.title;
  }

  setBoss(boss) {
    const wrap = this.$('boss-wrap');
    if (!boss) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    this.$('boss-name').textContent = boss.name;
    this.$('boss-phase').textContent = `PHASE ${['I', 'II', 'III'][boss.phase - 1] || 'III'}`;
    this.$('boss-fill').style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
    const hints = {
      broker: ['Break his guard with heavy strikes.', 'Use web blast to interrupt the charge.', 'He is enraged. Keep moving.'],
      vulture: ['Web blast him out of the sky.', 'He is stunned. Strike now.', 'Finish it before he recovers.'],
      herald: ['Orbs track you. Dodge sideways.', 'Teleports disrupt his aim.', 'No more running. End it.'],
      sovereign: ['The ring is the weak point.', 'Gravity pull incoming. Break line of sight.', 'The last circle is almost broken.'],
    };
    this.$('boss-hint').textContent = (hints[boss.type] || [''])[boss.phase - 1] || '';
  }

  notify(text, variant = '') {
    const stack = this.$('notification-stack');
    const el = document.createElement('div');
    el.className = `notice ${variant}`;
    el.textContent = text;
    stack.appendChild(el);
    this.notices.push(el);
    while (this.notices.length > 4) {
      const old = this.notices.shift();
      old.remove();
    }
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400);
      const idx = this.notices.indexOf(el);
      if (idx >= 0) this.notices.splice(idx, 1);
    }, 3800);
  }

  subtitle(text, duration = 2.6) {
    const el = this.$('subtitle');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this.subtitleTimer);
    this.subtitleTimer = setTimeout(() => el.classList.add('hidden'), duration * 1000);
  }

  setInteract(text) {
    const prompt = this.$('interact-prompt');
    if (!text) {
      prompt.classList.add('hidden');
      return;
    }
    prompt.classList.remove('hidden');
    this.$('interact-text').textContent = text;
  }

  showDialogue(sequence, onComplete) {
    this.dialogue = { sequence, index: 0, onComplete };
    this.$('dialogue').classList.remove('hidden');
    this.renderDialogueLine();
  }

  renderDialogueLine() {
    if (!this.dialogue) return;
    const line = this.dialogue.sequence[this.dialogue.index];
    this.$('dialogue-speaker').textContent = line.speaker;
    this.$('dialogue-role').textContent = line.role || '';
    this.$('dialogue-portrait').textContent = line.portrait || line.speaker.charAt(0);
    this.$('dialogue-portrait').style.color = line.color || '#ff2b45';
    this.$('dialogue-portrait').style.borderColor = `${line.color || '#ff2b45'}66`;
    this.$('dialogue-text').textContent = '';
    this.$('dialogue-choice-a').textContent = line.choiceA || '';
    this.$('dialogue-choice-b').textContent = line.choiceB || '';
    const lines = this.$('dialogue-lines');
    lines.innerHTML = '';
    for (let i = 0; i < this.dialogue.sequence.length; i++) {
      const i2 = document.createElement('i');
      if (i === this.dialogue.index) i2.className = 'active';
      lines.appendChild(i2);
    }
    const text = line.text;
    let i = 0;
    clearInterval(this.typing);
    this.typing = setInterval(() => {
      i++;
      this.$('dialogue-text').textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(this.typing);
        this.typing = null;
      }
    }, 14);
  }

  advanceDialogue() {
    if (!this.dialogue) return false;
    const line = this.dialogue.sequence[this.dialogue.index];
    if (this.typing) {
      clearInterval(this.typing);
      this.typing = null;
      this.$('dialogue-text').textContent = line.text;
      return true;
    }
    this.dialogue.index++;
    if (this.dialogue.index >= this.dialogue.sequence.length) {
      const done = this.dialogue.onComplete;
      this.dialogue = null;
      this.$('dialogue').classList.add('hidden');
      done?.();
      return false;
    }
    this.renderDialogueLine();
    return true;
  }

  get dialogueActive() {
    return Boolean(this.dialogue);
  }

  hideDialogue() {
    clearInterval(this.typing);
    this.typing = null;
    this.dialogue = null;
    this.$('dialogue').classList.add('hidden');
  }

  showCinematic({ kicker, title, sub, duration = 3.2 }, onDone) {
    this.$('cinematic-kicker').textContent = kicker;
    this.$('cinematic-title').textContent = title;
    this.$('cinematic-sub').textContent = sub;
    const progress = this.$('cinematic-progress')?.querySelector('i');
    if (progress) {
      progress.style.animation = 'none';
      void progress.offsetWidth;
      progress.style.animation = `cinema ${duration}s linear forwards`;
    }
    this.$('cinematic').classList.remove('hidden');
    this.$('cinematic-bars').classList.add('on');
    clearTimeout(this.cinematicTimer);
    this.cinematicTimer = setTimeout(() => {
      this.$('cinematic').classList.add('hidden');
      this.$('cinematic-bars').classList.remove('on');
      onDone?.();
    }, duration * 1000);
  }

  showDeath({ kicker = 'SIGNAL LOST', title = 'YOU DIED', text = 'The city will remember the fall.' }) {
    this.$('death-kicker').textContent = kicker;
    this.$('death-title').textContent = title;
    this.$('death-text').textContent = text;
    this.$('death-screen').classList.remove('hidden');
  }

  hideDeath() {
    this.$('death-screen').classList.add('hidden');
  }

  showEnding(stats) {
    this.$('ending-villains').textContent = stats.villains;
    this.$('ending-chaos').textContent = Math.round(stats.chaos);
    this.$('ending-time').textContent = formatTime(stats.time);
    this.$('ending-screen').classList.remove('hidden');
  }

  hideEnding() {
    this.$('ending-screen').classList.add('hidden');
  }

  setPause(visible) {
    this.paused = visible;
    this.$('pause-screen').classList.toggle('hidden', !visible);
    this.$('pause-chaos').textContent = Math.round(this.callbacks.getChaos?.() || 0);
    this.$('pause-altitude').textContent = `${Math.round(this.callbacks.getAltitude?.() || 0)} M`;
  }

  speedLines(on) {
    this.$('speed-lines').classList.toggle('on', on);
  }

  damageFlash() {
    const el = this.$('damage-flash');
    el.classList.add('on');
    clearTimeout(this.damageTimer);
    this.damageTimer = setTimeout(() => el.classList.remove('on'), 90);
  }

  glitch(active) {
    document.body.classList.toggle('universe-glitch', active);
  }
}
