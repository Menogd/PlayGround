export const UNIVERSES = [
  {
    id: 'prime',
    name: 'EARTH-616',
    subtitle: 'PRIME',
    tagline: 'THE CITY THAT NEVER SLEEPS',
    accent: '#62e6ff',
    accent2: '#ffc657',
    sky: { top: 0x101c3c, mid: 0x3b2a50, bottom: 0xe2765d, exponent: 0.62 },
    fog: { color: 0x111a2d, density: 0.00078 },
    weather: 'clear',
    sun: { color: 0xffb070, intensity: 2.2 },
    hemi: { sky: 0x4a6cff, ground: 0x120b14, intensity: 1.15 },
    rim: { color: 0x4b7dff, intensity: 1.5 },
    fill: { color: 0xff8a5c, intensity: 0.55 },
    facade: 0xffffff,
    water: { deep: 0x04101e, shallow: 0x0b2b47, glow: 0x173d59 },
    stars: 0xdde8ff,
  },
  {
    id: 'ultimate',
    name: 'EARTH-1610',
    subtitle: 'ULTIMATE',
    tagline: 'NEON RAIN / BROKEN SIGNALS',
    accent: '#ff4fd8',
    accent2: '#62e6ff',
    sky: { top: 0x08021c, mid: 0x2a0a42, bottom: 0xff3f8f, exponent: 0.72 },
    fog: { color: 0x1a0c2b, density: 0.00105 },
    weather: 'rain',
    sun: { color: 0xff4fa0, intensity: 1.7 },
    hemi: { sky: 0x8a3cff, ground: 0x16051c, intensity: 1.05 },
    rim: { color: 0xff4fd8, intensity: 1.8 },
    fill: { color: 0x48d7ff, intensity: 0.5 },
    facade: 0xd8c4ff,
    water: { deep: 0x0b0418, shallow: 0x2a0b47, glow: 0x6a1d7a },
    stars: 0xffc7f2,
  },
  {
    id: 'noir',
    name: 'EARTH-90214',
    subtitle: 'NOIR',
    tagline: 'THE CITY EATS ITS OWN',
    accent: '#e8d9b0',
    accent2: '#c7402f',
    sky: { top: 0x07080b, mid: 0x23252b, bottom: 0x9b9483, exponent: 0.9 },
    fog: { color: 0x18191c, density: 0.00135 },
    weather: 'ash',
    sun: { color: 0xffe2b0, intensity: 1.1 },
    hemi: { sky: 0x8d8f96, ground: 0x0d0d0f, intensity: 0.9 },
    rim: { color: 0xd9cfb6, intensity: 1.1 },
    fill: { color: 0x6f6a5e, intensity: 0.4 },
    facade: 0xc9c3b4,
    water: { deep: 0x090a0c, shallow: 0x1e2124, glow: 0x4a4438 },
    stars: 0xd8d2c2,
  },
  {
    id: 'punk',
    name: 'EARTH-138',
    subtitle: 'SPIDER-PUNK',
    tagline: 'AMPLIFY THE RESISTANCE',
    accent: '#ffd23f',
    accent2: '#ff3b6b',
    sky: { top: 0x0b0524, mid: 0x2b0f3e, bottom: 0xffc247, exponent: 0.68 },
    fog: { color: 0x1e0b1e, density: 0.0009 },
    weather: 'sparks',
    sun: { color: 0xffd23f, intensity: 2.0 },
    hemi: { sky: 0xff3b6b, ground: 0x12081e, intensity: 1.0 },
    rim: { color: 0xff3b6b, intensity: 1.7 },
    fill: { color: 0xffd23f, intensity: 0.65 },
    facade: 0xffd7a0,
    water: { deep: 0x0c0416, shallow: 0x2a0c33, glow: 0x7a2d18 },
    stars: 0xffe9a8,
  },
];

export function getUniverse(index) {
  const len = UNIVERSES.length;
  return UNIVERSES[((index % len) + len) % len];
}

export function universeIndex(id) {
  return Math.max(0, UNIVERSES.findIndex((u) => u.id === id));
}

export function applyUniverse(index, city) {
  const universe = getUniverse(index);
  const scene = city.scene;
  const sky = city.sky.material.uniforms;
  sky.topColor.value.setHex(universe.sky.top);
  sky.midColor.value.setHex(universe.sky.mid);
  sky.bottomColor.value.setHex(universe.sky.bottom);
  sky.exponent.value = universe.sky.exponent;
  scene.fog.color.setHex(universe.fog.color);
  scene.fog.density = universe.fog.density;

  city.sun.color.setHex(universe.sun.color);
  city.sun.intensity = universe.sun.intensity;
  city.hemi.color.setHex(universe.hemi.sky);
  city.hemi.groundColor.setHex(universe.hemi.ground);
  city.hemi.intensity = universe.hemi.intensity;
  city.rim.color.setHex(universe.rim.color);
  city.rim.intensity = universe.rim.intensity;
  city.fill.color.setHex(universe.fill.color);
  city.fill.intensity = universe.fill.intensity;

  city.sunSprite.material.color.setHex(universe.sun.color);
  const waterUniforms = city.water.material.uniforms;
  waterUniforms.deep.value.setHex(universe.water.deep);
  waterUniforms.shallow.value.setHex(universe.water.shallow);
  waterUniforms.glow.value.setHex(universe.water.glow);
  city.stars.material.color.setHex(universe.stars);
  for (const mat of city.facadeMats) mat.color.setHex(universe.facade);

  city.setWeather(universe.weather);
  document.body.dataset.universe = universe.id;
  return universe;
}
