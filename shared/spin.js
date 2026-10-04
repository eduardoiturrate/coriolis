/*
 * Spin: the code shared by all the explainers.
 *
 * A classic script (not a module), so the pages also work when opened straight from the disk.
 * It gives each page: the list of explainers, the top bar, the page layout, the controls, the
 * play bar, a small 2D drawing pen (with charts and mouse input), a small 3D camera for flat
 * canvases, and a few helpers for numbers.
 */
(function () {
  'use strict';

  const TAU = 2 * Math.PI;
  const DEG = Math.PI / 180;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ---------- Colors ----------

  const C = {
    ball: css('--ball') || '#4fc3f7', ink: css('--ink') || '#ffa24a', aim: css('--aim') || '#c9d3df', you: css('--you') || '#9be7a6',
    friend: css('--friend') || '#f06292', spin: css('--spin') || '#ffd54f', warn: css('--warn') || '#ff8a66', muted: css('--muted') || '#8593a8',
    text: '#e3e9f2', grid: 'rgba(255,255,255,0.12)', faint: 'rgba(255,255,255,0.35)',
  };

  // ---------- Small vector helpers (2D) ----------

  const V = {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
    mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
    len: (a) => Math.hypot(a.x, a.y),
    dot: (a, b) => a.x * b.x + a.y * b.y,
    cross: (a, b) => a.x * b.y - a.y * b.x,
    rot: (p, a) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) }),
    norm: (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
    polar: (r, a) => ({ x: r * Math.cos(a), y: r * Math.sin(a) }),
  };

  const V3 = {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    mul: (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k }),
    dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    len: (a) => Math.hypot(a.x, a.y, a.z),
    norm: (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; },
    /** Turn vector v about the unit axis k by angle a (Rodrigues' formula). */
    turn(v, k, a) {
      const c = Math.cos(a), s = Math.sin(a), d = k.x * v.x + k.y * v.y + k.z * v.z;
      return {
        x: v.x * c + (k.y * v.z - k.z * v.y) * s + k.x * d * (1 - c),
        y: v.y * c + (k.z * v.x - k.x * v.z) * s + k.y * d * (1 - c),
        z: v.z * c + (k.x * v.y - k.y * v.x) * s + k.z * d * (1 - c),
      };
    },
  };

  // ---------- Number formatting ----------

  const fmt = {
    n: (v, d = 2) => v.toFixed(d),
    sig: (v, n = 3) => String(+v.toPrecision(n)),
    /** A length in words: mm, cm, m or km. */
    dist(m) {
      const a = Math.abs(m);
      if (a < 0.001) return `${(a * 1000).toFixed(3)} mm`;
      if (a < 0.01) return `${(a * 1000).toFixed(2)} mm`;
      if (a < 1) return `${(a * 100).toFixed(1)} cm`;
      if (a < 1000) return `${a.toFixed(a < 10 ? 2 : 0)} m`;
      return `${(a / 1000).toFixed(a < 10000 ? 1 : 0)} km`;
    },
    /** A duration in words: s, min, h or days. */
    time(s) {
      if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
      if (s < 3600) return `${(s / 60).toFixed(s < 600 ? 1 : 0)} min`;
      if (s < 86400) return `${(s / 3600).toFixed(1)} h`;
      return `${(s / 86400).toFixed(1)} days`;
    },
  };
  /** Cards with a small label and a big number, as in the text under the views. */
  const nums = (items) => `<div class="nums">${items.map(([s, b, a]) => `<div class="num"><small>${s}</small><b>${b}</b>${a ? ` ${a}` : ''}</div>`).join('')}</div>`;

  /** A small random number generator that gives the same numbers each time (for star fields and the like). */
  function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** One step of the fourth-order Runge-Kutta method. f(y, t) returns dy/dt, y is an array. */
  function rk4(f, y, t, h) {
    const n = y.length;
    const add = (a, b, k) => { const o = new Array(n); for (let i = 0; i < n; i++) o[i] = a[i] + b[i] * k; return o; };
    const k1 = f(y, t);
    const k2 = f(add(y, k1, h / 2), t + h / 2);
    const k3 = f(add(y, k2, h / 2), t + h / 2);
    const k4 = f(add(y, k3, h), t + h);
    const o = new Array(n);
    for (let i = 0; i < n; i++) o[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    return o;
  }

  /** Round tick values for an axis from a to b. */
  function niceTicks(a, b, n = 5) {
    const span = b - a;
    if (!(span > 0)) return [a];
    const raw = span / n, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }

  // ---------- The list of explainers ----------

  const GROUPS = ['Rotating frames', 'Rotating bodies', 'Orbits and gravity', 'Moving observers', 'Waves and oscillation', 'Fields and charges'];
  const TOPICS = [
    { slug: 'coriolis', group: 0, title: 'Coriolis effect', blurb: 'A thrown ball flies straight, but the ground under it turns. A roundabout, a space station, cannon shells, storms, trade winds and a pendulum.' },
    { slug: 'centrifugal', group: 0, title: 'Centrifugal force', blurb: 'A ball on a string, water in a spinning bucket, and a ride that pins you to the wall. Is the outward force real?' },
    { slug: 'lagrange', group: 0, title: 'Lagrange points', blurb: 'Five places near two large bodies where a small one can stay in place. Found on the turning map.' },
    { slug: 'gyroscope', group: 1, title: 'Gyroscopes', blurb: 'Why a spinning wheel does not fall over, and why it turns sideways when you push it.' },
    { slug: 'momentum', group: 1, title: 'Angular momentum', blurb: 'A skater who pulls in the arms, a cat that turns in the air, and a racket that flips about one axis.' },
    { slug: 'stability', group: 1, title: 'Stability', blurb: 'Why a bicycle stays up at the right speed, and why a spinning coin whirs faster as it stops.' },
    { slug: 'rolling', group: 1, title: 'Rolling wheels', blurb: 'A wheel that rolls without slipping. A point on it draws a cycloid, and the contact point is at rest.' },
    { slug: 'orbits', group: 2, title: 'Orbits', blurb: 'Kepler’s laws, a cannon fired from a mountain, and an orbit that slowly turns.' },
    { slug: 'maneuvers', group: 2, title: 'Orbital maneuvers', blurb: 'Why a burn forward puts you behind. Burns, transfer orbits, and a chase in space.' },
    { slug: 'slingshot', group: 2, title: 'Gravity assist', blurb: 'A probe gains speed from a planet. Seen from the planet, it gains nothing.' },
    { slug: 'inclination', group: 2, title: 'Launch heading and orbit tilt', blurb: 'How the heading of a launch and the latitude of the site decide the tilt of the orbit.' },
    { slug: 'tides', group: 2, title: 'Tides and tidal locking', blurb: 'Why there are two tides a day, and why the Moon always shows the same face.' },
    { slug: 'relativity', group: 3, title: 'Special relativity', blurb: 'A light clock, a train and two lightning strikes, and a spacetime diagram you can change.' },
    { slug: 'observers', group: 3, title: 'Moving observers', blurb: 'Rain on a moving car, the Doppler effect, and the way stars crowd ahead at high speed.' },
    { slug: 'resonance', group: 4, title: 'Resonance', blurb: 'Push a swing at the right rhythm and it grows. A driven oscillator and its response.' },
    { slug: 'coupled', group: 4, title: 'Coupled oscillators', blurb: 'Two pendulums joined by a spring pass energy back and forth. A chain of masses has its own modes.' },
    { slug: 'waves', group: 4, title: 'Waves on a string', blurb: 'Two waves that cross make a standing wave. A string has modes, and its sound depends on where you pluck it.' },
    { slug: 'fourier', group: 4, title: 'Fourier circles', blurb: 'Circles on circles that add up to a wave, or to a picture you draw.' },
    { slug: 'charged', group: 5, title: 'Charged particles', blurb: 'A charge in a magnetic field turns in a circle. Add an electric field and it drifts. Earth’s field traps it.' },
    { slug: 'induction', group: 5, title: 'Induction', blurb: 'A magnet through a coil, a coil turning in a field, and a magnet falling through a tube.' },
  ];

  // Small pictures for the home page and the menu. Each fits a 64 by 64 box.
  const ic = (body) => `<svg viewBox="0 0 64 64" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const W = '#c9d3df', A = '#4fc3f7', B = '#ffa24a', G = '#9be7a6', P = '#f06292', Y = '#ffd54f';
  const ICONS = {
    coriolis: ic(`<circle cx="32" cy="32" r="22" stroke="${W}"/><path d="M32 54C27 40 36 28 50 18" stroke="${B}"/><path d="M42 18h8v8" stroke="${B}"/>`),
    centrifugal: ic(`<circle cx="30" cy="32" r="15" stroke="${W}" stroke-dasharray="3 5"/><circle cx="45" cy="32" r="5" fill="${A}" stroke="none"/><path d="M30 32h13" stroke="${G}"/><path d="M51 32h9M56 28l4 4-4 4" stroke="${B}"/>`),
    lagrange: ic(`<circle cx="22" cy="34" r="11" stroke="${Y}"/><circle cx="48" cy="34" r="4" stroke="${A}"/><circle cx="35" cy="14" r="2.5" fill="${B}" stroke="none"/><circle cx="35" cy="54" r="2.5" fill="${B}" stroke="none"/><circle cx="35" cy="34" r="2.5" fill="${B}" stroke="none"/><circle cx="58" cy="34" r="2.5" fill="${B}" stroke="none"/><circle cx="4" cy="34" r="2.5" fill="${B}" stroke="none"/>`),
    gyroscope: ic(`<ellipse cx="38" cy="26" rx="16" ry="8" transform="rotate(-20 38 26)" stroke="${A}"/><path d="M8 54l22-22" stroke="${W}"/><path d="M12 12c6-4 14-4 20 0" stroke="${B}"/><path d="M28 8l4 4-5 3" stroke="${B}"/>`),
    momentum: ic(`<circle cx="32" cy="32" r="5" fill="${W}" stroke="none"/><path d="M32 32L12 22M32 32L52 42" stroke="${W}"/><circle cx="12" cy="22" r="4" fill="${A}" stroke="none"/><circle cx="52" cy="42" r="4" fill="${A}" stroke="none"/><path d="M52 14a24 24 0 0 0-20-6" stroke="${B}"/><path d="M52 6v8h-8" stroke="${B}"/>`),
    stability: ic(`<circle cx="16" cy="42" r="11" stroke="${W}"/><circle cx="48" cy="42" r="11" stroke="${W}"/><path d="M16 42l12-18h14l6 18M28 24l-4-8h-6M42 24l-2-8h6" stroke="${A}"/>`),
    rolling: ic(`<path d="M4 54h56" stroke="${W}"/><circle cx="30" cy="38" r="14" stroke="${A}"/><circle cx="30" cy="52" r="3" fill="${B}" stroke="none"/><path d="M4 54c4-22 12-22 14-10M40 44c2-6 6-8 12-8" stroke="${B}" stroke-dasharray="2 5"/>`),
    orbits: ic(`<ellipse cx="32" cy="32" rx="28" ry="16" stroke="${A}"/><circle cx="22" cy="32" r="5" fill="${Y}" stroke="none"/><circle cx="55" cy="26" r="3.5" fill="${B}" stroke="none"/>`),
    maneuvers: ic(`<circle cx="32" cy="32" r="12" stroke="${W}"/><ellipse cx="40" cy="32" rx="22" ry="17" stroke="${B}"/><circle cx="32" cy="32" r="3" fill="${Y}" stroke="none"/><circle cx="62" cy="32" r="2.5" fill="${A}" stroke="none"/>`),
    slingshot: ic(`<circle cx="36" cy="30" r="10" stroke="${Y}"/><path d="M6 58C22 48 30 46 50 36c6-3 8-14 8-30" stroke="${A}"/><path d="M52 12l6-6 5 8" stroke="${A}"/>`),
    inclination: ic(`<circle cx="32" cy="32" r="15" stroke="${W}"/><ellipse cx="32" cy="32" rx="28" ry="9" transform="rotate(-35 32 32)" stroke="${A}"/><path d="M4 32h56" stroke="${W}" stroke-dasharray="2 5"/>`),
    tides: ic(`<ellipse cx="26" cy="32" rx="19" ry="14" stroke="${A}"/><circle cx="26" cy="32" r="12" fill="#14365e" stroke="${W}"/><circle cx="57" cy="32" r="4.5" fill="${W}" stroke="none"/>`),
    relativity: ic(`<path d="M8 14h28M8 50h28" stroke="${W}"/><path d="M14 50l8-36 8 36" stroke="${Y}"/><path d="M42 54l14-44" stroke="${A}"/><path d="M42 54h18" stroke="${W}"/>`),
    observers: ic(`<circle cx="22" cy="32" r="4" fill="${B}" stroke="none"/><path d="M30 24a12 12 0 0 1 0 16M38 18a22 22 0 0 1 0 28M46 12a32 32 0 0 1 0 40" stroke="${A}"/>`),
    resonance: ic(`<path d="M4 54h56M4 54C20 54 24 52 28 38c2-10 4-24 4-24s2 14 4 24c4 14 8 16 24 16" stroke="${A}"/><path d="M32 54V14" stroke="${B}" stroke-dasharray="3 5"/>`),
    coupled: ic(`<path d="M16 6v6M48 6v6M16 12l-5 32M48 12l5 32" stroke="${W}"/><circle cx="11" cy="48" r="5" fill="${A}" stroke="none"/><circle cx="53" cy="48" r="5" fill="${A}" stroke="none"/><path d="M13 30l4 5 5-10 5 10 5-10 5 10 5-10 4 5" stroke="${B}"/>`),
    waves: ic(`<path d="M4 32c7-22 14-22 14 0s7 22 14 0 7-22 14 0 7 22 14 0" stroke="${A}"/><path d="M4 32h56" stroke="${W}" stroke-dasharray="2 5"/>`),
    fourier: ic(`<circle cx="22" cy="32" r="14" stroke="${W}"/><circle cx="36" cy="32" r="6" stroke="${A}"/><path d="M42 32h18" stroke="${B}"/><path d="M42 32c4-10 8 10 12 0" stroke="${B}"/>`),
    charged: ic(`<path d="M12 56c0-16 10-18 14-8s10 0 8-12S46 18 52 10" stroke="${A}"/><circle cx="52" cy="10" r="4" fill="${B}" stroke="none"/><circle cx="14" cy="14" r="2" fill="${W}" stroke="none"/><circle cx="14" cy="34" r="2" fill="${W}" stroke="none"/><circle cx="52" cy="50" r="2" fill="${W}" stroke="none"/>`),
    induction: ic(`<path d="M18 40c-8 0-8-14 0-14s8 14 0 14M28 40c-8 0-8-14 0-14s8 14 0 14M38 40c-8 0-8-14 0-14s8 14 0 14" stroke="${B}"/><rect x="42" y="30" width="16" height="12" rx="2" stroke="${A}"/><path d="M6 33h6M6 40h6M18 52h24" stroke="${W}"/>`),
  };

  // ---------- The top bar ----------

  const BRAND = `<svg viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="3" fill="#ffa24a" stroke="none"/><path d="M16 4a12 12 0 1 1-11.4 8.3" stroke="#4fc3f7" stroke-width="2.6"/><path d="M3 5l2 7 7-2" stroke="#4fc3f7" stroke-width="2.6"/></svg>`;

  function topbar(slug) {
    let bar = $('topbar');
    if (!bar) { bar = el('header'); bar.id = 'topbar'; document.body.prepend(bar); }
    const i = TOPICS.findIndex((t) => t.slug === slug);
    const n = TOPICS.length;
    const prev = TOPICS[(i + n - 1) % n], next = TOPICS[(i + 1) % n];
    const here = TOPICS[i];
    bar.innerHTML = `<a class="brand" href="../">${BRAND}<span>Spin</span></a>
      <span class="sep">/</span><span class="here">${here ? here.title : ''}</span><span class="grow"></span>
      <a class="nav" href="../${prev.slug}/" title="Previous: ${prev.title}" aria-label="Previous: ${prev.title}">‹</a>
      <a class="nav" href="../${next.slug}/" title="Next: ${next.title}" aria-label="Next: ${next.title}">›</a>
      <button id="menuBtn" aria-expanded="false" aria-controls="menu">All explainers ▾</button>
      <nav id="menu" hidden>${GROUPS.map((g, gi) => `<div><h4>${g}</h4>${TOPICS.filter((t) => t.group === gi).map((t) => `<a href="../${t.slug}/"${t.slug === slug ? ' class="now"' : ''}>${ICONS[t.slug]}<span>${t.title}</span></a>`).join('')}</div>`).join('')}</nav>`;
    const menu = $('menu'), btn = $('menuBtn');
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /** The label beyond the tip of an arrow. It moves above the tip when it would run off the canvas. */
  function arrowLabel(pen, text, b, ux, uy) {
    const { ctx } = pen;
    ctx.font = `600 ${pen.px(11.5)}px system-ui`;
    ctx.shadowColor = '#000'; ctx.shadowBlur = pen.px(4);
    const tw = ctx.measureText(text).width;
    let align = ux < -0.3 ? 'right' : 'left';
    let x = b.x + ux * pen.px(7), y = b.y + uy * pen.px(7);
    if (align === 'left' && x + tw > pen.w - pen.px(4)) { align = 'right'; x = b.x; y = b.y - pen.px(12); }
    else if (align === 'right' && x - tw < pen.px(4)) { align = 'left'; x = b.x; y = b.y - pen.px(12); }
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  // ---------- The drawing pen: a 2D canvas with world coordinates (y up) ----------

  class Pen {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.k = 1; this.c = { x: 0, y: 0 }; this.sx = 0; this.sy = 0; this.w = 10; this.h = 10; this.dpr = 1;
    }
    /** Fit the canvas to its box, clear it, and reset the world frame. */
    begin() {
      const c = this.canvas, r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      this.w = w; this.h = h; this.dpr = dpr;
      this.ctx.setLineDash([]);
      this.ctx.clearRect(0, 0, w, h);
      return this.frame(1);
    }
    px(n) { return n * this.dpr; }
    /** A frame of radius R (world units) around `center`: fills the part `fill` of the shorter side. */
    frame(R, center = { x: 0, y: 0 }, fill = 0.4) {
      this.k = (Math.min(this.w, this.h) * fill) / R;
      this.c = center; this.sx = this.w / 2; this.sy = this.h / 2;
      return this;
    }
    /** A frame that fits the world box [x0, x1] by [y0, y1], with a margin in screen pixels. */
    box(x0, x1, y0, y1, pad = 20, rect) {
      const r = rect || { x: 0, y: 0, w: this.cw, h: this.ch };
      this.k = this.px(Math.min((r.w - 2 * pad) / (x1 - x0), (r.h - 2 * pad) / (y1 - y0)));
      this.c = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
      this.sx = this.px(r.x + r.w / 2); this.sy = this.px(r.y + r.h / 2);
      return this;
    }
    /** World point to canvas pixels. */
    P(p) { return { x: this.sx + (p.x - this.c.x) * this.k, y: this.sy - (p.y - this.c.y) * this.k }; }
    /** Canvas pixels to a world point. */
    S(x, y) { return { x: this.c.x + (x - this.sx) / this.k, y: this.c.y - (y - this.sy) / this.k }; }
    /** A length in world units to pixels. */
    L(r) { return r * this.k; }

    dot(p, color, r = 6) {
      const q = this.P(p), { ctx } = this;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(q.x, q.y, this.px(r), 0, TAU); ctx.fill();
    }
    /** A circle of world radius r. o: { fill, stroke, width, dash }. */
    circle(c, r, o = {}) {
      const q = this.P(c), { ctx } = this;
      ctx.save();
      ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0, r * this.k), 0, TAU);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke; ctx.lineWidth = this.px(o.width ?? 1.5);
        if (o.dash) ctx.setLineDash(o.dash.map((d) => this.px(d)));
        ctx.stroke();
      }
      ctx.restore();
    }
    line(pts, color, width = 2, dash) {
      if (pts.length < 2) return;
      const { ctx } = this;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = this.px(width); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash.map((d) => this.px(d)));
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) { const q = this.P(pts[i]); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
      ctx.stroke();
      ctx.restore();
    }
    /** A polygon. o: { fill, stroke, width, close }. */
    poly(pts, o = {}) {
      if (pts.length < 2) return;
      const { ctx } = this;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) { const q = this.P(pts[i]); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
      if (o.close !== false) ctx.closePath();
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = this.px(o.width ?? 1.5); ctx.lineJoin = 'round'; ctx.stroke(); }
      ctx.restore();
    }
    /** A rectangle from world corner (x0, y0) to (x1, y1). */
    rect(x0, y0, x1, y1, o = {}) {
      this.poly([{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], o);
    }
    /** An arrow from a world point along a world vector. `text` is written beyond the tip. */
    arrow(from, vec, color, width = 3, text) {
      const { ctx } = this;
      const a = this.P(from), b = this.P(V.add(from, vec));
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
      if (l < this.px(4)) return;
      const ux = dx / l, uy = dy / l, head = Math.min(l * 0.45, this.px(5 + width * 1.6));
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = this.px(width); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x - ux * head * 0.8, b.y - uy * head * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - ux * head - uy * head * 0.55, b.y - uy * head + ux * head * 0.55);
      ctx.lineTo(b.x - ux * head + uy * head * 0.55, b.y - uy * head - ux * head * 0.55);
      ctx.closePath(); ctx.fill();
      if (text) arrowLabel(this, text, b, ux, uy);
      ctx.restore();
    }
    /** Text at a world point. o: { color, size, weight, align, base, dx, dy }. */
    text(str, p, o = {}) {
      const q = this.P(p);
      this.textS(str, q.x / this.dpr + (o.dx || 0), q.y / this.dpr + (o.dy || 0), o);
    }
    /** Text at a screen position in CSS pixels from the top left of the canvas. */
    textS(str, x, y, o = {}) {
      const { ctx } = this;
      ctx.save();
      ctx.font = `${o.weight ?? 600} ${this.px(o.size ?? 12)}px ${o.mono ? 'ui-monospace, monospace' : 'system-ui'}`;
      ctx.fillStyle = o.color ?? 'rgba(255,255,255,0.8)';
      ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.base ?? 'middle';
      if (o.shadow !== false) { ctx.shadowColor = '#000'; ctx.shadowBlur = this.px(3); }
      ctx.fillText(str, this.px(x), this.px(y));
      ctx.restore();
    }
    /** A caption inside the top of the canvas. */
    note(str, y = 16, color = 'rgba(255,255,255,0.75)') {
      this.textS(str, this.w / this.dpr / 2, y, { color, base: 'top', shadow: false });
    }
    /** The size of the canvas in CSS pixels. */
    get cw() { return this.w / this.dpr; }
    get ch() { return this.h / this.dpr; }

    /** Mouse and touch input. Handlers get the world point, the event and the canvas pixel point. */
    pointer(h) {
      const c = this.canvas;
      c.style.touchAction = 'none';
      const at = (e) => {
        const r = c.getBoundingClientRect();
        const x = ((e.clientX - r.left) * c.width) / r.width, y = ((e.clientY - r.top) * c.height) / r.height;
        return [this.S(x, y), e, { x, y }];
      };
      let down = false;
      c.addEventListener('pointerdown', (e) => { down = true; c.setPointerCapture(e.pointerId); h.down && h.down(...at(e)); });
      c.addEventListener('pointermove', (e) => { if (down) h.move && h.move(...at(e)); else h.hover && h.hover(...at(e)); });
      const up = (e) => { if (!down) return; down = false; h.up && h.up(...at(e)); };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
    }

    /**
     * A chart in the rectangle r = { x, y, w, h } (CSS pixels). o: { x0, x1, y0, y1, xTitle, yTitle, title,
     * xTicks, yTicks, fmtX, fmtY, padL, padR, padT, padB, grid }. Returns functions that draw in data units.
     */
    chart(r, o) {
      const { ctx } = this;
      const px = (n) => this.px(n);
      const padL = o.padL ?? 42, padR = o.padR ?? 12, padT = o.padT ?? (o.title ? 24 : 12), padB = o.padB ?? (o.xTitle ? 38 : 26);
      const L = px(r.x + padL), T = px(r.y + padT), Wd = px(r.w - padL - padR), H = px(r.h - padT - padB);
      const X = (v) => L + ((v - o.x0) / (o.x1 - o.x0)) * Wd;
      const Y = (v) => T + H - ((v - o.y0) / (o.y1 - o.y0)) * H;
      const f = (v) => (+v.toPrecision(3)).toString();
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(L, T, Wd, H);
      ctx.font = `600 ${px(10.5)}px system-ui`; ctx.fillStyle = C.muted; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = px(1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (const v of niceTicks(o.x0, o.x1, o.xTicks ?? 5)) {
        const x = X(v);
        if (o.grid !== false) { ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + H); ctx.stroke(); }
        ctx.fillText((o.fmtX || f)(v), x, T + H + px(4));
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (const v of niceTicks(o.y0, o.y1, o.yTicks ?? 4)) {
        const y = Y(v);
        if (o.grid !== false) { ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + Wd, y); ctx.stroke(); }
        ctx.fillText((o.fmtY || f)(v), L - px(5), y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.strokeRect(L, T, Wd, H);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `600 ${px(11)}px system-ui`;
      if (o.title) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(o.title, L, T - px(19)); }
      if (o.xTitle) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.xTitle, L + Wd / 2, px(r.y + r.h - 2)); }
      if (o.yTitle) { ctx.save(); ctx.translate(px(r.x + 11), T + H / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.yTitle, 0, 0); ctx.restore(); }
      ctx.restore();
      const clipped = (fn) => { ctx.save(); ctx.beginPath(); ctx.rect(L, T, Wd, H); ctx.clip(); fn(); ctx.restore(); };
      const self = {
        X, Y, L, T, W: Wd, H,
        /** pts: array of { x, y } or [x, y] in data units. */
        line(pts, color, width = 2, dash) {
          clipped(() => {
            ctx.strokeStyle = color; ctx.lineWidth = px(width); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            if (dash) ctx.setLineDash(dash.map(px));
            ctx.beginPath();
            pts.forEach((p, i) => { const x = X(p.x ?? p[0]), y = Y(p.y ?? p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.stroke();
          });
        },
        /** Fill the area under a curve down to y = base. */
        area(pts, color, base = 0) {
          if (pts.length < 2) return;
          clipped(() => {
            ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(X(pts[0].x ?? pts[0][0]), Y(base));
            pts.forEach((p) => ctx.lineTo(X(p.x ?? p[0]), Y(p.y ?? p[1])));
            ctx.lineTo(X(pts[pts.length - 1].x ?? pts[pts.length - 1][0]), Y(base)); ctx.closePath(); ctx.fill();
          });
        },
        dot(x, y, color, r = 4.5) { clipped(() => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(x), Y(y), px(r), 0, TAU); ctx.fill(); }); },
        vline(x, color = 'rgba(255,255,255,0.5)', dash = [4, 4], width = 1.2) {
          clipped(() => { ctx.strokeStyle = color; ctx.lineWidth = px(width); ctx.setLineDash(dash.map(px)); ctx.beginPath(); ctx.moveTo(X(x), T); ctx.lineTo(X(x), T + H); ctx.stroke(); });
        },
        hline(y, color = 'rgba(255,255,255,0.5)', dash = [4, 4], width = 1.2) {
          clipped(() => { ctx.strokeStyle = color; ctx.lineWidth = px(width); ctx.setLineDash(dash.map(px)); ctx.beginPath(); ctx.moveTo(L, Y(y)); ctx.lineTo(L + Wd, Y(y)); ctx.stroke(); });
        },
        /** A vertical band from x0 to x1. */
        band(x0, x1, color) { clipped(() => { ctx.fillStyle = color; ctx.fillRect(X(x0), T, X(x1) - X(x0), H); }); },
        /** Bars: items of { x, y, color }, with bar width bw in data units. */
        bars(items, bw, base = 0) {
          clipped(() => items.forEach((b) => { ctx.fillStyle = b.color; ctx.fillRect(X(b.x - bw / 2), Y(Math.max(b.y, base)), X(b.x + bw / 2) - X(b.x - bw / 2), Math.abs(Y(b.y) - Y(base))); }));
        },
        text(str, x, y, o2 = {}) {
          ctx.save(); ctx.font = `600 ${px(o2.size ?? 11)}px system-ui`; ctx.fillStyle = o2.color ?? 'rgba(255,255,255,0.8)';
          ctx.textAlign = o2.align ?? 'left'; ctx.textBaseline = o2.base ?? 'middle';
          ctx.fillText(str, X(x) + px(o2.dx || 0), Y(y) + px(o2.dy || 0)); ctx.restore();
        },
      };
      return self;
    }
  }

  // ---------- A 3D camera for flat canvases (z is up) ----------

  class Cam3 {
    constructor(pen, o = {}) {
      this.pen = pen;
      this.az = o.az ?? 0.9; this.el = o.el ?? 0.45; this.dist = o.dist ?? 6; this.fov = (o.fov ?? 40) * DEG;
      this.min = o.min ?? 1.5; this.max = o.max ?? 30; this.target = o.target ?? { x: 0, y: 0, z: 0 };
      this.zoomStart = this.dist;
      const c = pen.canvas;
      c.style.touchAction = 'none';
      let last = null;
      c.addEventListener('pointerdown', (e) => { last = [e.clientX, e.clientY]; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', (e) => {
        if (!last) return;
        this.az -= (e.clientX - last[0]) * 0.008;
        this.el = clamp(this.el + (e.clientY - last[1]) * 0.008, -1.5, 1.5);
        last = [e.clientX, e.clientY];
      });
      const up = () => { last = null; };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.001), this.min, this.max); }, { passive: false });
    }
    /** Compute the camera axes for this frame. Call after pen.begin(). */
    begin() {
      const { az, el, dist, target, pen } = this;
      const ce = Math.cos(el);
      this.pos = { x: target.x + dist * ce * Math.cos(az), y: target.y + dist * ce * Math.sin(az), z: target.z + dist * Math.sin(el) };
      const f = { x: -ce * Math.cos(az), y: -ce * Math.sin(az), z: -Math.sin(el) };
      let r = { x: f.y, y: -f.x, z: 0 };
      const rl = Math.hypot(r.x, r.y) || 1; r = { x: r.x / rl, y: r.y / rl, z: 0 };
      const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
      this.f = f; this.r = r; this.u = u;
      this.focal = (0.5 * Math.min(pen.w, pen.h)) / Math.tan(this.fov / 2);
      return this;
    }
    /** Project a 3D point to canvas pixels. z is the depth (larger is farther). */
    P(p) {
      const d = { x: p.x - this.pos.x, y: p.y - this.pos.y, z: p.z - this.pos.z };
      const zs = d.x * this.f.x + d.y * this.f.y + d.z * this.f.z;
      const s = this.focal / Math.max(0.05, zs);
      return { x: this.pen.w / 2 + (d.x * this.r.x + d.y * this.r.y + d.z * this.r.z) * s, y: this.pen.h / 2 - (d.x * this.u.x + d.y * this.u.y + d.z * this.u.z) * s, z: zs, s };
    }
    line(pts, color, width = 2, dash) {
      if (pts.length < 2) return;
      const { ctx } = this.pen, px = (n) => this.pen.px(n);
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = px(width); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash.map(px));
      ctx.beginPath();
      pts.forEach((p, i) => { const q = this.P(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
      ctx.stroke();
      ctx.restore();
    }
    dot(p, color, r = 5) {
      const q = this.P(p), { ctx } = this.pen;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(q.x, q.y, this.pen.px(r), 0, TAU); ctx.fill();
    }
    arrow(from, vec, color, width = 3, text) {
      const a = this.P(from), b = this.P({ x: from.x + vec.x, y: from.y + vec.y, z: from.z + vec.z });
      const pen = this.pen, { ctx } = pen;
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
      if (l < pen.px(3)) return;
      const ux = dx / l, uy = dy / l, head = Math.min(l * 0.45, pen.px(5 + width * 1.6));
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = pen.px(width); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x - ux * head * 0.8, b.y - uy * head * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - ux * head - uy * head * 0.55, b.y - uy * head + ux * head * 0.55);
      ctx.lineTo(b.x - ux * head + uy * head * 0.55, b.y - uy * head - ux * head * 0.55);
      ctx.closePath(); ctx.fill();
      if (text) arrowLabel(pen, text, b, ux, uy);
      ctx.restore();
    }
    text(str, p, o = {}) {
      const q = this.P(p);
      this.pen.textS(str, q.x / this.pen.dpr + (o.dx || 0), q.y / this.pen.dpr + (o.dy || 0), o);
    }
    /** Draw filled polygons from far to near. faces: [{ pts, fill, stroke, width }]. */
    faces(faces) {
      const { ctx } = this.pen;
      const items = faces.map((f) => { const q = f.pts.map((p) => this.P(p)); return { f, q, z: q.reduce((s, p) => s + p.z, 0) / q.length }; });
      items.sort((a, b) => b.z - a.z);
      for (const { f, q } of items) {
        ctx.save();
        ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
        if (f.fill) { ctx.fillStyle = f.fill; ctx.fill(); }
        if (f.stroke) { ctx.strokeStyle = f.stroke; ctx.lineWidth = this.pen.px(f.width ?? 1.2); ctx.lineJoin = 'round'; ctx.stroke(); }
        ctx.restore();
      }
    }
  }

  // ---------- Controls ----------

  /** Builds the controls and keeps their values in `v`. Pages listen with on(). */
  class UI {
    constructor(host) {
      this.host = host;
      this.v = {};
      this.ctl = {};
      this.items = [];
      this.listeners = [];
    }
    on(fn) { this.listeners.push(fn); return this; }
    _add(node, o = {}) { (o.host || this.host).appendChild(node); return node; }
    _emit(id) { this.refresh(); for (const fn of this.listeners) fn(id, this.v); }
    _opts(options) { return options.map((x) => (Array.isArray(x) ? { v: x[0], l: x[1] } : typeof x === 'object' ? x : { v: x, l: x })); }
    /** Show or hide a row, and update the numbers shown beside the controls. */
    refresh() {
      for (const it of this.items) {
        if (it.show) it.row.hidden = !it.show(this.v);
        if (it.update) it.update();
      }
    }
    section(text, o = {}) {
      const d = this._add(el('div', 'title', text), o);
      this.items.push({ row: d, show: o.show });
      return d;
    }
    hint(textOrFn, o = {}) {
      const d = this._add(el('div', 'hint'), o);
      this.items.push({ row: d, show: o.show, update: () => { d.innerHTML = typeof textOrFn === 'function' ? textOrFn(this.v) : textOrFn; } });
      this.refresh();
      return d;
    }
    slider(id, o) {
      const row = this._add(el('div', 'row', `<label><span>${o.label}</span><b></b></label><input type="range">`), o);
      const input = row.querySelector('input'), out = row.querySelector('b');
      const log = !!o.log;
      const toValue = (i) => (log ? +(o.min * (o.max / o.min) ** (i / 1000)).toPrecision(3) : Number(i));
      const toInput = (v) => (log ? (1000 * Math.log(v / o.min)) / Math.log(o.max / o.min) : v);
      if (log) { input.min = 0; input.max = 1000; input.step = 1; } else { input.min = o.min; input.max = o.max; input.step = o.step ?? 1; }
      input.value = toInput(o.value);
      this.v[id] = o.value;
      const show = () => { out.textContent = o.fmt ? o.fmt(this.v[id], this.v) : String(this.v[id]); };
      input.addEventListener('input', () => { this.v[id] = toValue(input.value); this._emit(id); });
      this.ctl[id] = { set: (v) => { this.v[id] = v; input.value = toInput(v); } };
      this.items.push({ row, show: o.show, update: show });
      if (o.hint) { const h = el('div', 'hint'); row.appendChild(h); this.items.push({ row: h, update: () => { h.innerHTML = typeof o.hint === 'function' ? o.hint(this.v) : o.hint; } }); }
      this.refresh();
      return row;
    }
    /** A group of buttons where one is chosen. options: strings, [value, label] pairs or { v, l }. */
    seg(id, options, o = {}) {
      const opts = this._opts(options);
      const row = this._add(el('div', o.row === false ? '' : 'row'), o);
      if (o.label) row.appendChild(el('label', '', `<span>${o.label}</span>`));
      const box = el('div', o.pick ? 'chips grid' : `seg${o.small === false ? '' : ' small'}`);
      if (o.pick) box.style.gridTemplateColumns = `repeat(${o.cols ?? 2}, minmax(0, 1fr))`;
      if (o.big) box.className = 'seg';
      row.appendChild(box);
      const buttons = opts.map((x) => {
        const b = el('button', '', x.l);
        if (x.title) b.title = x.title;
        b.addEventListener('click', () => { this.v[id] = x.v; sync(); this._emit(id); });
        box.appendChild(b);
        return b;
      });
      const sync = () => buttons.forEach((b, i) => b.classList.toggle('on', opts[i].v === this.v[id]));
      this.v[id] = o.value ?? opts[0].v;
      this.ctl[id] = { set: (v) => { this.v[id] = v; sync(); } };
      sync();
      this.items.push({ row, show: o.show });
      if (o.hint) this.hint(o.hint, { host: row });
      this.refresh();
      return row;
    }
    /** A grid of buttons where one is chosen (for a longer list). */
    pick(id, options, o = {}) { return this.seg(id, options, { ...o, pick: true, cols: o.cols ?? 2 }); }
    check(id, text, value = false, o = {}) {
      const row = this._add(el('label', 'check', `<input type="checkbox"> <span>${text}</span>`), o);
      const input = row.querySelector('input');
      input.checked = value;
      this.v[id] = value;
      input.addEventListener('change', () => { this.v[id] = input.checked; this._emit(id); });
      this.ctl[id] = { set: (v) => { this.v[id] = v; input.checked = v; } };
      this.items.push({ row, show: o.show });
      this.refresh();
      return row;
    }
    /** Small buttons that set other controls: items of { text, set: { id: value } }. */
    chips(items, o = {}) {
      const box = this._add(el('div', 'chips small'), o);
      for (const it of items) {
        const b = el('button', '', it.text);
        b.addEventListener('click', () => {
          for (const k in it.set) this.set(k, it.set[k], true);
          this._emit(Object.keys(it.set)[0]);
        });
        box.appendChild(b);
      }
      this.items.push({ row: box, show: o.show });
      return box;
    }
    /** Buttons that run a function: items of { text, fn, id }. */
    actions(items, o = {}) {
      const box = this._add(el('div', 'actions'), o);
      const out = {};
      for (const it of items) {
        const b = el('button', 'act', it.text);
        b.addEventListener('click', () => it.fn());
        box.appendChild(b);
        if (it.id) out[it.id] = b;
      }
      this.items.push({ row: box, show: o.show });
      box.buttons = out;
      return box;
    }
    set(id, value, silent) {
      if (this.ctl[id]) this.ctl[id].set(value); else this.v[id] = value;
      if (!silent) this._emit(id); else this.refresh();
    }
  }

  // ---------- The play bar ----------

  /**
   * The play bar at the bottom of the controls: a main button, pause, loop, and speed. The page reads
   * `t` (simulated seconds) and `dt` (the step of this frame) after calling step() in its frame function.
   */
  class Transport {
    constructor(host, o = {}) {
      this.o = o;
      this.t = 0; this.dt = 0;
      this.running = !!o.autostart; this.paused = false; this.endedAt = 0;
      this.hold = o.hold ?? 3000;
      this.last = performance.now();
      this.onStart = null;
      const sp = o.speed === false ? null : { min: 0.1, max: 1, value: 0.5, step: 0.05, label: 'Speed', ...(o.speed || {}) };
      this.sp = sp;
      host.innerHTML = `<div class="btns">${o.go === null ? '' : `<button id="go" class="go"></button>`}${o.pause === false ? '' : `<button id="pause">Pause</button>`}${o.loop === false ? '' : `<label id="loopLabel" title="When the motion ends, wait 3 seconds and start again"><input id="loop" type="checkbox"> Loop</label>`}</div>`
        + (sp ? `<div class="row"><label><span>${sp.label}</span><b id="speedV"></b></label><input id="speed" type="range" min="${sp.min}" max="${sp.max}" step="${sp.step}" value="${sp.value}"></div>` : '');
      this.go = $('go'); this.pauseBtn = $('pause'); this.loopBox = $('loop'); this.speedBox = $('speed');
      if (this.go) { this.go.textContent = o.go ?? 'Start'; this.go.addEventListener('click', () => this.restart()); }
      if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => { if (this.running) { this.paused = !this.paused; this.pauseBtn.textContent = this.paused ? 'Go on' : 'Pause'; } });
      if (this.speedBox) {
        const show = () => { $('speedV').textContent = sp.fmt ? sp.fmt(this.speed) : `${Math.round(this.speed * 100)}%`; };
        this.speedBox.addEventListener('input', () => { show(); if (o.onSpeed) o.onSpeed(this.speed); });
        show();
      }
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !/INPUT|BUTTON|SELECT|TEXTAREA/.test((e.target.tagName || '')) && this.pauseBtn) { e.preventDefault(); this.pauseBtn.click(); }
      });
    }
    get speed() { return this.speedBox ? Number(this.speedBox.value) : 1; }
    get loop() { return !!(this.loopBox && this.loopBox.checked); }
    setGo(text) { if (this.go) this.go.textContent = text; }
    setPause(text) { if (this.pauseBtn) this.pauseBtn.textContent = text; }
    /** Start from the beginning. */
    restart() {
      this.t = 0; this.dt = 0; this.running = true; this.paused = false; this.endedAt = 0;
      if (this.pauseBtn) this.pauseBtn.textContent = 'Pause';
      if (this.onStart) this.onStart();
    }
    /** Back to the beginning, not running (or running again, for pages that never end). */
    reset() {
      this.t = 0; this.dt = 0; this.running = !!this.o.autostart; this.paused = false; this.endedAt = 0;
      if (this.pauseBtn) this.pauseBtn.textContent = 'Pause';
    }
    /** The motion has ended. With Loop on, step() starts it again after the hold time. */
    finish() {
      if (!this.running) return;
      this.running = false; this.endedAt = performance.now();
    }
    /** Call once per frame. Returns the step in seconds, already scaled by the speed. */
    step(now) {
      const real = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (!this.running && this.endedAt && this.loop && now - this.endedAt > this.hold) this.restart();
      this.dt = this.running && !this.paused ? real * this.speed : 0;
      this.t += this.dt;
      return this.dt;
    }
  }

  // ---------- The page ----------

  /**
   * Builds a whole explainer page: the top bar, the control column, the views and the text.
   * o: { slug, title, sub, views: [{ caption, span, short }], cols, rows, go, pause, loop, speed, autostart, transport }
   */
  function app(o) {
    const topic = TOPICS.find((t) => t.slug === o.slug);
    document.title = `${o.title ?? topic.title} · Spin`;
    if (!document.querySelector('link[rel=icon]')) {
      const link = el('link'); link.rel = 'icon'; link.href = `data:image/svg+xml,${encodeURIComponent(BRAND.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`;
      document.head.appendChild(link);
    }
    topbar(o.slug);
    const root = el('div', 'app');
    root.innerHTML = `<aside id="controls" class="panel"><div id="ctlHead"><h1></h1><div class="sub"></div><div id="modeHost"></div></div><div id="ctlScroll"></div><div id="transport"></div></aside>
      <main><div id="views"></div><div id="bottom"><div id="explain" class="panel"></div></div></main>`;
    document.body.appendChild(root);
    root.querySelector('h1').textContent = o.title ?? topic.title;
    root.querySelector('.sub').innerHTML = o.sub ?? '';
    const ui = new UI($('ctlScroll'));
    const vbox = $('views');
    const viewEls = [], pens = [];
    (o.views || [{}, {}]).forEach((vw) => {
      const d = el('div', `view${vw.short ? ' short' : ''}`, `<h3>${vw.caption || ''}</h3><canvas></canvas>`);
      if (vw.span) d.style.gridColumn = `span ${vw.span}`;
      vbox.appendChild(d);
      viewEls.push(d);
      pens.push(new Pen(d.querySelector('canvas')));
    });
    const layout = (cols, rows) => { vbox.style.setProperty('--cols', cols); vbox.style.setProperty('--rows', rows || 'minmax(0, 1fr)'); };
    layout(o.cols ?? Math.min(2, viewEls.length), o.rows);
    const tr = o.transport === false ? null : new Transport($('transport'), { go: o.go, pause: o.pause, loop: o.loop, speed: o.speed, autostart: o.autostart, hold: o.hold });
    const self = {
      ui, tr, pens, views: viewEls, layout,
      head: $('modeHost'),
      /** Tabs for the modes of the page, at the top of the control column. */
      modes(id, options, value) { ui.seg(id, options, { host: $('modeHost'), big: true, row: false, value }); },
      caption(i, text) { viewEls[i].querySelector('h3').textContent = text; },
      /** Show the first n views and hide the rest. */
      show(n, cols) { viewEls.forEach((v, i) => { v.hidden = i >= n; }); if (cols) layout(cols); },
      explain(html) { const e = $('explain'); if (e._last !== html) { e._last = html; e.innerHTML = html; } },
      credit(html) { ui._add(el('div', 'credit', html)); },
    };
    return self;
  }

  /** The frame loop. fn gets the time in milliseconds. A thrown error is logged once, not on every frame. */
  function run(fn) {
    let seen = '';
    const tick = (now) => {
      try { fn(now); } catch (e) { if (String(e) !== seen) { seen = String(e); console.error(e); } }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** A pure tone for the sound options. Browsers only allow sound after a click, so call on() from a click. */
  function tone() {
    let ctx = null, osc = null, gain = null;
    return {
      on() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        if (!osc) { osc = ctx.createOscillator(); gain = ctx.createGain(); gain.gain.value = 0; osc.connect(gain); gain.connect(ctx.destination); osc.start(); }
      },
      set(freq, level = 0.08) { if (!osc) return; osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.02); gain.gain.setTargetAtTime(level, ctx.currentTime, 0.03); },
      off() { if (gain) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04); },
    };
  }

  window.Spin = { TAU, DEG, $, clamp, lerp, el, css, C, V, V3, fmt, nums, rng, rk4, niceTicks, TOPICS, GROUPS, ICONS, BRAND, topbar, Pen, Cam3, UI, Transport, app, run, tone };
})();
