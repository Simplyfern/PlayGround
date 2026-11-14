/* ASH TRAIL — wasteland canvas renderer */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIES = {
  dusk:  { top: '#0a0c14', mid: '#2a1b16', low: '#7a3f1e', glow: '#ff9a45', sun: '#ffcf8e' },
  haze:  { top: '#14100e', mid: '#3a2a1e', low: '#8a5a30', glow: '#d9964c', sun: '#e8b57a' },
  dust:  { top: '#1b130d', mid: '#4a2f19', low: '#a06430', glow: '#e2a04a', sun: '#f0c084' },
  storm: { top: '#0b0b0f', mid: '#232126', low: '#4a4040', glow: '#8a6a4a', sun: '#a89380' },
  rain:  { top: '#080e11', mid: '#16282c', low: '#2c4a4a', glow: '#5f8f8a', sun: '#9fc0b8' },
  cold:  { top: '#060b12', mid: '#152333', low: '#33505f', glow: '#7fa8b8', sun: '#cfe0e4' },
};

export class WastelandScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.title = !!opts.title;
    this.state = { mile: 0, weather: 'clear', pace: 'steady', hull: 84, progress: 0 };
    this.scroll = 0;
    this.speed = 0;
    this.targetSpeed = this.title ? 0.25 : 0.55;
    this.time = 0;
    this.shake = 0;
    this.running = false;
    this.particles = [];
    this.dust = [];
    this.buildings = [];
    this.midProps = [];
    this.stars = [];
    this.rocks = [];
    this.last = 0;
    this.resizeObserver = null;
    this._seeded();
    this._resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this._resize());
      this.resizeObserver.observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener('resize', () => this._resize());
    }
    this._raf = this._raf.bind(this);
  }

  _seeded() {
    const r1 = mulberry32(99173);
    this.buildings = [];
    let x = 0;
    while (x < 1600) {
      const w = 14 + r1() * 60;
      const h = 20 + r1() * 130;
      this.buildings.push({ x, w, h, seed: r1(), broken: r1() > 0.45, antenna: r1() > 0.72, lights: r1() });
      x += w + 3 + r1() * 20;
    }
    this.skylineWidth = x;
    const r2 = mulberry32(4421);
    this.midProps = [];
    let mx = 0;
    while (mx < 1400) {
      const t = r2();
      this.midProps.push({ x: mx, type: t > 0.55 ? 'pylon' : t > 0.3 ? 'ruin' : 'tower', s: 0.6 + r2() * 0.8, seed: r2() });
      mx += 110 + r2() * 150;
    }
    this.midWidth = mx;
    const r3 = mulberry32(8821);
    this.stars = Array.from({ length: 80 }, () => ({ x: r3(), y: r3() * 0.55, s: 0.4 + r3() * 1.1, p: r3() * TAU }));
    this.rocks = Array.from({ length: 46 }, () => ({ x: r3(), s: 0.3 + r3() * 1.1, t: r3() }));
    this.dustSeeds = Array.from({ length: 30 }, () => ({ x: r3(), y: r3(), s: 0.4 + r3() * 1.6, v: 0.2 + r3() * 0.8 }));
    this.rainSeeds = Array.from({ length: 70 }, () => ({ x: r3(), y: r3(), v: 0.6 + r3() * 0.8, l: 6 + r3() * 16 }));
  }

  setState(patch) {
    Object.assign(this.state, patch);
  }

  setSpeed(v) { this.targetSpeed = v; }

  kick(amount = 1) { this.shake = Math.min(18, this.shake + amount * 5); }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._raf);
  }

  stop() { this.running = false; }

  _resize() {
    const el = this.canvas;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(rect.width * dpr);
    el.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
    this.dpr = dpr;
  }

  _raf(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    this._update(dt);
    this._draw();
    requestAnimationFrame(this._raf);
  }

  _update(dt) {
    this.time += dt;
    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 2.6);
    if (this.title) this.speed = 0.22 + Math.sin(this.time * 0.4) * 0.05;
    this.scroll += this.speed * dt * 160;
    this.shake *= Math.pow(0.0015, dt);
    const weather = this.state.weather || 'clear';

    if (this.speed > 0.12 && !this.title) {
      const wheelX = this.w * (this.w > 700 ? 0.42 : 0.46);
      const wheelY = this._roadY() + this._vh() * 0.1;
      const n = weather === 'storm' || weather === 'dust' ? 3 : 2;
      for (let i = 0; i < n; i++) {
        if (Math.random() < 0.55) {
          this.dust.push({
            x: wheelX - this._vh() * (0.7 + Math.random() * 0.5),
            y: wheelY + (Math.random() - 0.4) * 8,
            vx: -20 - Math.random() * 60 * this.speed,
            vy: -4 - Math.random() * 16,
            r: 2 + Math.random() * 5,
            life: 0,
            max: 0.7 + Math.random() * 1.1,
          });
        }
      }
    }
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const p = this.dust[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.r += dt * 5;
      if (p.life > p.max) this.dust.splice(i, 1);
    }
  }

  _sunY() { return this.h * (this.title ? 0.5 : 0.52); }
  _horizon() { return this.h * (this.title ? 0.6 : 0.62); }
  _roadY() { return this.h * (this.title ? 0.8 : 0.84); }
  _vh() { return clamp(this.h * (this.title ? 0.2 : 0.24), 30, 150); }

  _draw() {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    const weather = this.state.weather || 'clear';
    const sky = SKIES[weather] || SKIES.dusk;
    ctx.save();
    if (this.shake > 0.2) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this._sky(sky, weather);
    this._sun(sky, weather);
    this._stars(weather);
    this._skyline(sky);
    this._ground(sky);
    this._midground(sky);
    this._foreground();
    this._crawler(weather);
    this._weatherFx(weather);
    this._vignette();
    ctx.restore();
  }

  _sky(sky, weather) {
    const { ctx, w, h } = this;
    const horizon = this._horizon();
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, sky.top);
    g.addColorStop(0.55, sky.mid);
    g.addColorStop(1, sky.low);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizon + 2);

    // haze bands near horizon
    for (let i = 0; i < 7; i++) {
      const y = horizon - 8 - i * (horizon * 0.055);
      ctx.fillStyle = `rgba(255,170,90,${0.035 + i * 0.004})`;
      ctx.fillRect(0, y, w, 1.5 + i * 0.4);
    }

    // green shimmer of Eden near the end
    const prog = this.state.mile / 960;
    if (prog > 0.72) {
      const a = (prog - 0.72) / 0.28;
      const rg = ctx.createRadialGradient(w * 0.62, horizon - 4, 2, w * 0.62, horizon - 4, w * 0.3);
      rg.addColorStop(0, `rgba(120,220,170,${0.2 * a})`);
      rg.addColorStop(1, 'rgba(120,220,170,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(w * 0.3, 0, w * 0.66, horizon);
    }
  }

  _sun(sky, weather) {
    const { ctx, w, h } = this;
    const x = w * (this.title ? 0.58 : 0.7);
    const y = this._sunY();
    const r = Math.max(18, h * (this.title ? 0.1 : 0.075));
    const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 5.5);
    glow.addColorStop(0, this._alpha(sky.glow, 0.5));
    glow.addColorStop(0.28, this._alpha(sky.glow, 0.18));
    glow.addColorStop(1, this._alpha(sky.glow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, this._horizon());
    ctx.fillStyle = this._alpha(sky.sun, weather === 'storm' || weather === 'rain' ? 0.35 : 0.9);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    // scan-sun slats
    ctx.fillStyle = this._alpha(sky.mid, 0.55);
    for (let i = 0; i < 4; i++) {
      const sy = y + r * 0.05 + i * (r * 0.28);
      ctx.fillRect(x - r * 1.1, sy, r * 2.2, r * 0.075);
    }
  }

  _alpha(hex, a) {
    const v = hex.replace('#', '');
    const n = parseInt(v, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  _stars(weather) {
    if (weather === 'dust' || weather === 'storm' || weather === 'rain' || weather === 'haze' || this.title) return;
    const { ctx, w, h } = this;
    for (const s of this.stars) {
      const tw = 0.35 + Math.sin(this.time * 1.6 + s.p) * 0.3;
      ctx.fillStyle = `rgba(210,225,255,${0.28 * tw})`;
      ctx.fillRect(s.x * w, s.y * this._horizon() * 0.85, s.s, s.s);
    }
  }

  _skyline(sky) {
    const { ctx, w, h } = this;
    const horizon = this._horizon();
    const off = (this.scroll * 0.06) % this.skylineWidth;
    const baseFill = this._mix('#161210', sky.mid, 0.25);
    for (let pass = 0; pass < 2; pass++) {
      const baseX = -off + pass * this.skylineWidth;
      if (baseX > w) continue;
      for (const b of this.buildings) {
        const x = baseX + b.x;
        if (x > w + 80 || x + b.w < -80) continue;
        const bh = (b.h / 160) * (h * 0.3);
        const top = horizon - bh;
        ctx.fillStyle = baseFill;
        ctx.beginPath();
        if (b.broken) {
          ctx.moveTo(x, horizon);
          ctx.lineTo(x, top + bh * 0.35);
          ctx.lineTo(x + b.w * 0.28, top + bh * 0.2);
          ctx.lineTo(x + b.w * 0.4, top + bh * 0.42);
          ctx.lineTo(x + b.w * 0.72, top);
          ctx.lineTo(x + b.w, top + bh * 0.3);
          ctx.lineTo(x + b.w, horizon);
        } else {
          ctx.rect(x, top, b.w, bh);
        }
        ctx.fill();
        if (b.antenna) {
          ctx.fillRect(x + b.w * 0.5, top - bh * 0.16, 1.2, bh * 0.17);
          ctx.fillStyle = 'rgba(255,90,70,.5)';
          ctx.fillRect(x + b.w * 0.5 - 1, top - bh * 0.17, 2.4, 2);
        }
        if (b.lights > 0.35) {
          ctx.fillStyle = `rgba(255,180,90,${0.06 + b.lights * 0.12})`;
          for (let wy = 0; wy < 4; wy++) {
            for (let wx = 0; wx < 3; wx++) {
              if ((wx + wy + b.seed * 9) % 3 < 1.2) continue;
              ctx.fillRect(x + 3 + wx * (b.w / 4), top + 6 + wy * (bh / 6), 2, 2.4);
            }
          }
        }
      }
    }
    // haze layer over the city
    const hz = ctx.createLinearGradient(0, horizon - h * 0.12, 0, horizon + 2);
    hz.addColorStop(0, this._alpha(sky.low, 0));
    hz.addColorStop(1, this._alpha(sky.low, 0.5));
    ctx.fillStyle = hz;
    ctx.fillRect(0, horizon - h * 0.12, w, h * 0.12 + 2);
  }

  _mix(a, b, t) {
    const pa = parseInt(a.replace('#', ''), 16);
    const pb = parseInt(b.replace('#', ''), 16);
    const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
    const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
    const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
    return `rgb(${r},${g},${bl})`;
  }

  _ground(sky) {
    const { ctx, w, h } = this;
    const horizon = this._horizon();
    const g = ctx.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, this._mix('#0e0b09', sky.mid, 0.2));
    g.addColorStop(0.35, '#0d0b09');
    g.addColorStop(1, '#080706');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, w, h - horizon);
    const road = this._roadY();
    // road surface
    const rg = ctx.createLinearGradient(0, road, 0, h);
    rg.addColorStop(0, '#1a1714');
    rg.addColorStop(1, '#0b0908');
    ctx.fillStyle = rg;
    ctx.fillRect(0, road, w, h - road);
    // road edge
    ctx.fillStyle = 'rgba(232,221,200,.09)';
    ctx.fillRect(0, road, w, 1);
    // center dashes
    const spacing = Math.max(48, w * 0.075);
    const dashOff = this.scroll % spacing;
    const dy = road + (h - road) * 0.52;
    ctx.fillStyle = 'rgba(220,200,160,.16)';
    for (let x = -spacing; x < w + spacing; x += spacing) {
      ctx.fillRect(x - dashOff, dy, spacing * 0.34, 2.2);
    }
    // cracks
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    const r = mulberry32(77);
    for (let i = 0; i < 8; i++) {
      const cx = ((r() * w + this.scroll * 0.9) % (w + 80)) - 40;
      const cy = road + (h - road) * (0.25 + r() * 0.65);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 12, cy + 2);
      ctx.lineTo(cx + 22, cy - 2);
      ctx.stroke();
    }
  }

  _midground(sky) {
    const { ctx, w, h } = this;
    const horizon = this._horizon();
    const off = (this.scroll * 0.22) % this.midWidth;
    const fill = this._mix('#110e0c', sky.mid, 0.18);
    for (let pass = 0; pass < 2; pass++) {
      const baseX = -off + pass * this.midWidth;
      if (baseX > w) continue;
      for (const p of this.midProps) {
        const x = baseX + p.x;
        if (x > w + 140 || x < -140) continue;
        const s = p.s * (h / 500);
        ctx.fillStyle = fill;
        if (p.type === 'pylon') {
          const ph = 90 * s;
          ctx.beginPath();
          ctx.moveTo(x - 12 * s, horizon);
          ctx.lineTo(x - 3 * s, horizon - ph);
          ctx.lineTo(x + 3 * s, horizon - ph);
          ctx.lineTo(x + 12 * s, horizon);
          ctx.closePath();
          ctx.fill();
          for (let i = 1; i < 4; i++) {
            const yy = horizon - ph * (i / 4);
            const ww = (10 - i * 2) * s;
            ctx.fillRect(x - ww, yy, ww * 2, 1.4 * s + 0.6);
          }
          ctx.strokeStyle = 'rgba(232,221,200,.07)';
          ctx.beginPath();
          ctx.moveTo(x, horizon - ph);
          ctx.quadraticCurveTo(x + 60 * s, horizon - ph + 18 * s, x + 120 * s, horizon - ph + 8 * s);
          ctx.stroke();
        } else if (p.type === 'ruin') {
          const bw = 60 * s, bh = 46 * s;
          ctx.fillRect(x - bw / 2, horizon - bh, bw, bh);
          ctx.fillRect(x - bw / 2, horizon - bh, bw * 0.26, bh * 0.5);
          ctx.fillRect(x + bw * 0.12, horizon - bh * 1.3, bw * 0.24, bh * 0.32);
          ctx.fillStyle = 'rgba(255,180,90,.12)';
          ctx.fillRect(x + 4 * s, horizon - bh * 0.6, 3 * s, 4 * s);
        } else {
          const tw = 40 * s, th = 110 * s;
          ctx.fillRect(x - tw * 0.18, horizon - th, tw * 0.36, th);
          ctx.fillRect(x - tw * 0.5, horizon - th * 0.86, tw, th * 0.06);
          ctx.beginPath();
          ctx.arc(x, horizon - th * 0.86, tw * 0.42, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x - tw * 0.5, horizon - th * 0.6, tw, 1.6);
        }
      }
    }
    // dark ridge in front of props
    ctx.fillStyle = '#0c0a08';
    ctx.beginPath();
    ctx.moveTo(0, horizon + 11);
    const step = Math.max(30, w / 22);
    const r = mulberry32(311);
    for (let x = 0; x <= w + step; x += step) {
      ctx.lineTo(x, horizon + 6 + (r() - 0.5) * 9);
    }
    ctx.lineTo(w, horizon + 22);
    ctx.lineTo(0, horizon + 22);
    ctx.closePath();
    ctx.fill();
  }

  _foreground() {
    const { ctx, w, h } = this;
    const road = this._roadY();
    // fast roadside debris
    for (const rock of this.rocks) {
      const speed = this.scroll * (1.5 + rock.s * 0.6);
      const x = ((rock.x * (w + 160) - speed) % (w + 160) + (w + 160)) % (w + 160) - 80;
      const y = road + (h - road) * (0.18 + rock.t * 0.3);
      const s = rock.s * (h / 700);
      ctx.fillStyle = 'rgba(12,10,8,.9)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 12 * s, y - 5 * s);
      ctx.lineTo(x + 20 * s, y + 1 * s);
      ctx.lineTo(x + 7 * s, y + 3 * s);
      ctx.closePath();
      ctx.fill();
    }
    // kilometer sign on the shoulder
    const signX = w * 0.82;
    const signY = road - 14;
    ctx.strokeStyle = '#2a2620';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(signX, signY);
    ctx.lineTo(signX, signY + (h - road) * 0.38);
    ctx.stroke();
    ctx.fillStyle = '#232019';
    ctx.fillRect(signX - 13, signY - 20, 26, 16);
    ctx.fillStyle = 'rgba(255,180,84,.5)';
    ctx.font = '8px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('E9', signX, signY - 8);
    ctx.textAlign = 'left';
  }

  _crawler(weather) {
    const { ctx, w, h } = this;
    const road = this._roadY();
    const vh = this._vh();
    const x = w * (this.title ? 0.5 : w > 700 ? 0.43 : 0.46);
    const y = road + (h - road) * 0.5;
    const bob = Math.sin(this.time * 7) * this.speed * 1.4 + Math.sin(this.time * 1.7) * 0.6;
    ctx.save();
    ctx.translate(x, y + bob);

    // shadow
    const sh = ctx.createRadialGradient(0, vh * 0.42, 2, 0, vh * 0.42, vh * 1.5);
    sh.addColorStop(0, 'rgba(0,0,0,.6)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(0, vh * 0.45, vh * 1.5, vh * 0.28, 0, 0, TAU);
    ctx.fill();

    // headlight cone
    const beam = ctx.createLinearGradient(vh * 0.8, 0, vh * 3.4, 0);
    beam.addColorStop(0, 'rgba(255,200,120,.22)');
    beam.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(vh * 0.78, -vh * 0.05);
    ctx.lineTo(vh * 3.6, -vh * 0.5);
    ctx.lineTo(vh * 3.6, vh * 0.4);
    ctx.lineTo(vh * 0.78, vh * 0.12);
    ctx.closePath();
    ctx.fill();

    // wheels
    const wheelR = vh * 0.21;
    const wheelY = vh * 0.24;
    const wheelXs = [-vh * 0.62, 0, vh * 0.62];
    for (const wx of wheelXs) {
      ctx.fillStyle = '#141110';
      ctx.beginPath();
      ctx.arc(wx, wheelY, wheelR, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,221,200,.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.save();
      ctx.translate(wx, wheelY);
      ctx.rotate(-this.scroll * 0.055);
      ctx.fillStyle = '#3a332c';
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-1.4, -wheelR * 0.72, 2.8, wheelR * 1.44);
      }
      ctx.fillStyle = '#0b0908';
      ctx.beginPath();
      ctx.arc(0, 0, wheelR * 0.34, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // undercarriage
    ctx.fillStyle = '#17130f';
    ctx.fillRect(-vh * 0.92, vh * 0.02, vh * 1.84, vh * 0.2);

    // main body
    const bodyG = ctx.createLinearGradient(0, -vh * 0.6, 0, vh * 0.25);
    bodyG.addColorStop(0, '#4a3f34');
    bodyG.addColorStop(0.45, '#332b24');
    bodyG.addColorStop(1, '#221c17');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    const bw = vh * 1.86;
    const bh = vh * 0.56;
    const top = -vh * 0.46;
    const rr = vh * 0.06;
    ctx.moveTo(-bw / 2 + rr, top);
    ctx.lineTo(bw / 2 - vh * 0.28, top);
    ctx.lineTo(bw / 2, top + vh * 0.18);
    ctx.lineTo(bw / 2, top + bh);
    ctx.lineTo(-bw / 2, top + bh);
    ctx.lineTo(-bw / 2, top + rr);
    ctx.quadraticCurveTo(-bw / 2, top, -bw / 2 + rr, top);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,120,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // rust/panel streaks
    ctx.strokeStyle = 'rgba(140,80,40,.35)';
    ctx.lineWidth = 1.4;
    const rr2 = mulberry32(55);
    for (let i = 0; i < 5; i++) {
      const px = -vh * 0.8 + rr2() * vh * 1.5;
      ctx.beginPath();
      ctx.moveTo(px, top + vh * 0.06);
      ctx.lineTo(px + 2, top + bh * (0.4 + rr2() * 0.5));
      ctx.stroke();
    }

    // cabin window
    const wx = -vh * 0.6;
    const wy = top + vh * 0.1;
    const ww = vh * 0.56;
    const wh = vh * 0.24;
    const winG = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    winG.addColorStop(0, 'rgba(130,220,205,.55)');
    winG.addColorStop(1, 'rgba(40,90,90,.35)');
    ctx.fillStyle = winG;
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh);
    ctx.lineTo(wx, wy + 4);
    ctx.quadraticCurveTo(wx, wy, wx + 5, wy);
    ctx.lineTo(wx + ww - 6, wy);
    ctx.quadraticCurveTo(wx + ww, wy, wx + ww, wy + 5);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.closePath();
    ctx.fill();
    // driver silhouette
    ctx.fillStyle = 'rgba(10,14,14,.72)';
    ctx.beginPath();
    ctx.arc(wx + ww * 0.36, wy + wh * 0.45, wh * 0.24, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(wx + ww * 0.36, wy + wh * 1.05, wh * 0.42, wh * 0.55, 0, Math.PI, TAU);
    ctx.fill();
    // window reflection
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    ctx.beginPath();
    ctx.moveTo(wx + 4, wy + wh);
    ctx.lineTo(wx + ww * 0.55, wy);
    ctx.lineTo(wx + ww * 0.72, wy);
    ctx.lineTo(wx + ww * 0.18, wy + wh);
    ctx.closePath();
    ctx.fill();

    // roof cargo
    ctx.fillStyle = '#2a241e';
    ctx.fillRect(-vh * 0.5, top - vh * 0.18, vh * 0.7, vh * 0.18);
    ctx.fillStyle = '#39312a';
    ctx.fillRect(-vh * 0.46, top - vh * 0.25, vh * 0.3, vh * 0.09);
    ctx.fillRect(vh * 0.02, top - vh * 0.23, vh * 0.22, vh * 0.07);
    ctx.strokeStyle = 'rgba(20,16,12,.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-vh * 0.38, top - vh * 0.26);
    ctx.lineTo(-vh * 0.38, top);
    ctx.moveTo(vh * 0.08, top - vh * 0.25);
    ctx.lineTo(vh * 0.08, top);
    ctx.stroke();

    // antenna
    ctx.strokeStyle = '#4a4238';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(vh * 0.62, top);
    ctx.lineTo(vh * 0.72, top - vh * 0.55);
    ctx.stroke();
    const blink = Math.sin(this.time * 3.2) > 0.2;
    if (blink) {
      ctx.fillStyle = 'rgba(255,80,60,.9)';
      ctx.beginPath();
      ctx.arc(vh * 0.72, top - vh * 0.55, 1.8, 0, TAU);
      ctx.fill();
    }

    // headlight
    ctx.fillStyle = '#ffe2ae';
    ctx.shadowColor = 'rgba(255,190,110,.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(vh * 0.86, top + vh * 0.3, vh * 0.035, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    // grille
    ctx.strokeStyle = 'rgba(10,8,7,.8)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(vh * 0.7 + i * vh * 0.06, top + vh * 0.24);
      ctx.lineTo(vh * 0.7 + i * vh * 0.06, top + vh * 0.4);
      ctx.stroke();
    }

    // damage
    const hull = this.state.hull ?? 84;
    if (hull < 55) {
      ctx.strokeStyle = 'rgba(255,90,60,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-vh * 0.3, top + vh * 0.02);
      ctx.lineTo(-vh * 0.18, top + vh * 0.14);
      ctx.lineTo(-vh * 0.24, top + vh * 0.22);
      ctx.stroke();
    }
    if (hull < 35) {
      for (let i = 0; i < 3; i++) {
        const t = (this.time * 0.5 + i * 0.33) % 1;
        ctx.fillStyle = `rgba(40,36,32,${0.32 * (1 - t)})`;
        ctx.beginPath();
        ctx.arc(-vh * 0.8 - t * vh * 0.7, top - t * vh * 0.8, 3 + t * vh * 0.18, 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();

    // dust puffs
    for (const p of this.dust) {
      const a = Math.max(0, 1 - p.life / p.max) * 0.22;
      ctx.fillStyle = `rgba(150,115,80,${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
  }

  _weatherFx(weather) {
    const { ctx, w, h } = this;
    if (weather === 'rain') {
      ctx.strokeStyle = 'rgba(170,210,205,.25)';
      ctx.lineWidth = 1;
      for (const s of this.rainSeeds) {
        const y = ((s.y * h + this.time * 420 * s.v) % (h + 40)) - 20;
        const x = ((s.x * w - this.time * 90 * s.v + this.scroll * 0.2) % (w + 40) + w + 40) % (w + 40) - 20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + s.l);
        ctx.stroke();
      }
    } else if (weather === 'dust' || weather === 'storm') {
      const alpha = weather === 'storm' ? 0.4 : 0.25;
      ctx.fillStyle = weather === 'storm' ? 'rgba(90,70,55,.22)' : 'rgba(160,110,55,.12)';
      ctx.fillRect(0, 0, w, h);
      for (const s of this.dustSeeds) {
        const speed = (weather === 'storm' ? 260 : 120) * s.v;
        const x = ((s.x * w + this.time * speed) % (w + 60)) - 30;
        const y = (s.y * h + Math.sin(this.time * 0.7 + s.x * 10) * 12) % h;
        ctx.fillStyle = `rgba(220,180,130,${alpha * 0.35})`;
        ctx.fillRect(x, y, s.s * 7, 1);
      }
    } else if (weather === 'cold') {
      for (const s of this.dustSeeds) {
        const x = ((s.x * w + this.time * 16 * s.v) % (w + 20)) - 10;
        const y = ((s.y * h + this.time * 30 * s.v) % (h + 20)) - 10;
        ctx.fillStyle = 'rgba(220,235,240,.18)';
        ctx.fillRect(x, y, 1.4, 1.4);
      }
    }
    // global haze tint
    if (weather === 'haze') {
      ctx.fillStyle = 'rgba(255,150,70,.05)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  _vignette() {
    const { ctx, w, h } = this;
    const g = ctx.createRadialGradient(w * 0.5, h * 0.55, Math.min(w, h) * 0.25, w * 0.5, h * 0.55, Math.max(w, h) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
