import * as THREE from '../vendor/three.module.js';

export const TAU = Math.PI * 2;
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const fmt = (n, digits = 0) => Number(n).toFixed(digits);
export const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function sha256(text) {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeFacadeTexture(seed = 1, style = 'brick') {
  const rng = mulberry32(seed);
  return canvasTexture(512, 1024, (ctx, w, h) => {
    const palettes = {
      brick: ['#2a1b1b', '#3b2320', '#24191a'],
      concrete: ['#2b303a', '#363d49', '#22262e'],
      glass: ['#182b39', '#1f3d4d', '#12232e'],
      deco: ['#342d25', '#473a2c', '#29241f'],
    };
    const pal = palettes[style] || palettes.concrete;
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    const cols = style === 'glass' ? 9 : 6;
    const rows = style === 'glass' ? 27 : 22;
    const cw = w / cols;
    const ch = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * cw + cw * 0.17;
        const py = y * ch + ch * 0.15;
        const ww = cw * 0.66;
        const wh = ch * 0.58;
        const lit = rng() > (style === 'glass' ? 0.55 : 0.73);
        if (style === 'glass') {
          ctx.fillStyle = lit ? `rgba(160,216,235,${0.3 + rng() * 0.45})` : `rgba(8,18,25,${0.45 + rng() * 0.3})`;
        } else {
          ctx.fillStyle = lit ? `rgba(255,205,125,${0.35 + rng() * 0.5})` : `rgba(8,12,19,${0.35 + rng() * 0.4})`;
        }
        ctx.fillRect(px, py, ww, wh);
        if (lit && rng() > 0.6) {
          ctx.fillStyle = 'rgba(255,255,255,.12)';
          ctx.fillRect(px + ww * 0.1, py + wh * 0.08, ww * 0.6, wh * 0.12);
        }
        ctx.fillStyle = 'rgba(0,0,0,.34)';
        ctx.fillRect(px, py + wh, ww, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(0, y * ch + ch - 1, w, 1);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rng() * 0.025})`;
      ctx.fillRect(rng() * w, rng() * h, rng() * 30 + 4, 1);
    }
    if (style === 'brick') {
      ctx.strokeStyle = 'rgba(0,0,0,.1)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 9) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = pal[1];
    ctx.fillRect(0, 0, w, 9);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(0, h - 13, w, 13);
  });
}

export function makeRoadTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#171a20';
    ctx.fillRect(0, 0, w, h);
    const rng = mulberry32(912);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rng() * 0.03})`;
      ctx.fillRect(rng() * w, rng() * h, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(238,194,74,.7)';
    ctx.fillRect(w / 2 - 3, 0, 3, h);
    ctx.fillStyle = 'rgba(210,68,58,.55)';
    ctx.fillRect(12, 0, 2, h);
    ctx.fillRect(w - 14, 0, 2, h);
    for (let y = 0; y < h; y += 48) {
      ctx.fillStyle = 'rgba(220,226,232,.4)';
      ctx.fillRect(34, y, 3, 22);
      ctx.fillRect(w - 37, y, 3, 22);
      ctx.fillStyle = 'rgba(238,194,74,.5)';
      ctx.fillRect(w / 2 + 14, y + 12, 3, 20);
      ctx.fillRect(w / 2 - 17, y + 12, 3, 20);
    }
  });
}

export function makeSignTexture(text, color = '#ff2b45', bg = '#080b12') {
  return canvasTexture(512, 192, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.strokeRect(9, 9, w - 18, h - 18);
    ctx.font = '900 74px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 24;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2 + 4);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#fff';
    for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 1);
  });
}

export function makeLabelSprite(text, options = {}) {
  const {
    color = '#ffffff', bg = 'rgba(4,7,12,.72)', border = 'rgba(255,255,255,.25)',
    font = '700 42px Arial', padding = 26, scale = 1, width = 1024, height = 128,
  } = options;
  const tex = canvasTexture(width, height, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2);
  });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set((width / height) * 1.6 * scale, 1.6 * scale, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export function makeGlowTexture(color = '#62e6ff') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.15, color);
    grad.addColorStop(0.5, color.replace(')', ', .22)').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makeMoonTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const rng = mulberry32(407);
    ctx.fillStyle = '#a6a6a0';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = rng() * 23 + 2;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(62,62,60,${0.12 + rng() * 0.25})`);
      g.addColorStop(0.7, 'rgba(120,120,115,.16)');
      g.addColorStop(1, 'rgba(220,220,215,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(40,40,38,${rng() * 0.13})`;
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h, rng() * 80 + 10, rng() * 40 + 8, rng() * TAU, 0, TAU);
      ctx.fill();
    }
  });
}

export function makeEarthTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const rng = mulberry32(1984);
    const ocean = ctx.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, '#07152e');
    ocean.addColorStop(0.5, '#0b3262');
    ocean.addColorStop(1, '#07152e');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);
    const land = ['#22573b', '#2e6a44', '#4d6b3b', '#74613a'];
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = land[Math.floor(rng() * land.length)];
      ctx.globalAlpha = 0.78 + rng() * 0.2;
      ctx.beginPath();
      const cx = rng() * w;
      const cy = h * 0.18 + rng() * h * 0.64;
      const pts = 7 + Math.floor(rng() * 8);
      for (let j = 0; j < pts; j++) {
        const a = (j / pts) * TAU;
        const rr = (0.05 + rng() * 0.15) * w;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.55;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + rng() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h * 0.2 + h * 0.08, rng() * 90 + 10, rng() * 18 + 5, rng() * 0.4, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h * 0.2 + h * 0.78, rng() * 80 + 10, rng() * 16 + 4, -rng() * 0.3, 0, TAU);
      ctx.fill();
    }
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.4, 10, w * 0.7, h * 0.4, w * 0.35);
    glow.addColorStop(0, 'rgba(255,220,140,.14)');
    glow.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makePlanetTexture(seed, colors) {
  return canvasTexture(512, 256, (ctx, w, h) => {
    const rng = mulberry32(seed);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = `rgba(${rng() > 0.5 ? '255,255,255' : '0,0,0'},${rng() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h, rng() * 80 + 10, rng() * 9 + 1, 0, 0, TAU);
      ctx.fill();
    }
  });
}

export function makeDebrisMaterial(color, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.82, metalness: 0.16, emissive, emissiveIntensity: 0.2,
  });
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        for (const key of ['map', 'emissiveMap', 'normalMap', 'alphaMap']) {
          if (mat[key]) mat[key].dispose();
        }
        mat.dispose();
      }
    }
  });
}

export function makeSky() {
  const geo = new THREE.SphereGeometry(4200, 32, 18);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x101c3c) },
      midColor: { value: new THREE.Color(0x3b2a50) },
      bottomColor: { value: new THREE.Color(0xe2765d) },
      offset: { value: 80 },
      exponent: { value: 0.62 },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      uniform float time;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        float t = max(pow(max(h, 0.0), exponent), 0.0);
        vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.35, t));
        col = mix(col, topColor, smoothstep(0.25, 0.95, t));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
