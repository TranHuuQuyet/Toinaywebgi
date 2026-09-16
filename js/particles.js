/**
 * Particle & Reveal FX Engine (V2.2)
 * High performance 2D Canvas particle explosions and shockwaves
 * with ambient floating particles and zero memory leaks.
 */

export class ParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d') || null;
    this.particles = [];
    this.shockwaves = [];
    this.ambientParticles = [];
    this.animId = null;
    this.rarity = 'common';
    this.active = false;
    this.reducedMotion = false;
    this.width = 0;
    this.height = 0;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  setReducedMotion(reduced) {
    this.reducedMotion = reduced;
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: 500, height: 500 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  explode(rarity, centerX = null, centerY = null) {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    this.stop();
    this.rarity = rarity;
    this.active = true;

    if (this.reducedMotion) return;

    const cx = centerX ?? this.width / 2;
    const cy = centerY ?? this.height * 0.42;
    const isMobile = window.innerWidth < 600;

    const palette = {
      rare: ['#4ba7ff', '#82c5ff', '#ffffff', '#2278d4'],
      epic: ['#b56dff', '#d89eff', '#ff78e8', '#ffffff'],
      legendary: ['#ffb33f', '#ffd666', '#ffe89e', '#ffffff', '#ff941a'],
      mythic: ['#ff456d', '#ff7895', '#ffd666', '#ff1744', '#ffffff']
    }[rarity];

    if (!palette) return;

    // Shockwave ring
    const shockwaveSpeed = { rare: 6, epic: 8, legendary: 11, mythic: 14 }[rarity] || 7;
    const shockwaveMaxRadius = { rare: 160, epic: 220, legendary: 280, mythic: 340 }[rarity] || 200;
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 12,
      maxRadius: isMobile ? shockwaveMaxRadius * 0.75 : shockwaveMaxRadius,
      speed: shockwaveSpeed,
      color: palette[0],
      alpha: 0.95
    });

    if (rarity === 'mythic') {
      // Second trailing shockwave for mythic jackpot
      this.shockwaves.push({
        x: cx,
        y: cy,
        radius: 4,
        maxRadius: isMobile ? 240 : 380,
        speed: shockwaveSpeed * 0.65,
        color: palette[1],
        alpha: 0.8
      });
    }

    // Burst particles
    const baseCount = { rare: 22, epic: 34, legendary: 52, mythic: 75 }[rarity] || 20;
    const count = isMobile ? Math.floor(baseCount * 0.55) : baseCount;

    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * (rarity === 'mythic' ? 8.5 : rarity === 'legendary' ? 7 : 5.5);
      const color = palette[Math.floor(Math.random() * palette.length)];
      const size = 2 + Math.random() * (rarity === 'mythic' ? 4 : 3);
      const drag = 0.94 + Math.random() * 0.03;

      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag,
        gravity: 0.08,
        size,
        color,
        alpha: 1,
        decay: 0.012 + Math.random() * 0.018,
        sparkle: Math.random() > 0.5
      });
    }

    // Ambient floating particles for Legendary / Mythic
    if (rarity === 'legendary' || rarity === 'mythic') {
      const ambientCount = rarity === 'mythic' ? 24 : 14;
      for (let i = 0; i < ambientCount; i += 1) {
        this.ambientParticles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3 - Math.random() * 0.6,
          size: 1.5 + Math.random() * 2.5,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 0.2 + Math.random() * 0.6,
          pulseSpeed: 0.02 + Math.random() * 0.03,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }

    this._loop();
  }

  _loop() {
    if (!this.active || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Render shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) {
      const wave = this.shockwaves[i];
      wave.radius += wave.speed;
      wave.alpha *= 0.93;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      this.ctx.lineWidth = Math.max(1, 4 * (1 - wave.radius / wave.maxRadius));
      this.ctx.strokeStyle = wave.color;
      this.ctx.globalAlpha = Math.max(0, wave.alpha);
      this.ctx.stroke();
      this.ctx.restore();

      if (wave.radius >= wave.maxRadius || wave.alpha <= 0.02) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Render explosion particles
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.alpha -= p.decay;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.sparkle && Math.random() > 0.4) {
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = p.color;
      }
      this.ctx.fill();
      this.ctx.restore();

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Render ambient floating particles (persistent while modal open)
    for (const ap of this.ambientParticles) {
      ap.x += ap.vx;
      ap.y += ap.vy;
      ap.pulse += ap.pulseSpeed;

      if (ap.y < -10) ap.y = this.height + 10;
      if (ap.x < -10) ap.x = this.width + 10;
      if (ap.x > this.width + 10) ap.x = -10;

      const alpha = Math.max(0.1, ap.alpha * (0.6 + 0.4 * Math.sin(ap.pulse)));

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
      this.ctx.fillStyle = ap.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = ap.color;
      this.ctx.fill();
      this.ctx.restore();
    }

    // Keep animating if particles exist or ambient active
    if (this.particles.length > 0 || this.shockwaves.length > 0 || this.ambientParticles.length > 0) {
      this.animId = requestAnimationFrame(() => this._loop());
    } else {
      this.stop();
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.particles = [];
    this.shockwaves = [];
    this.ambientParticles = [];
    this.active = false;
    if (this.ctx && this.width && this.height) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
  }
}

