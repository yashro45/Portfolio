/* Yash Gupta portfolio - interactions */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = false; // animation always on (set true to freeze it)

  /* ---------- year, nav ---------- */
  $('#yr').textContent = new Date().getFullYear();
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- scroll reveal ---------- */
  const io = new IntersectionObserver((es) => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- count-up stats ---------- */
  const co = new IntersectionObserver((es) => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count;
      let n = 0; const step = () => { n += 1; el.textContent = n + (end >= 3 ? '+' : ''); if (n < end) setTimeout(step, 140); };
      step(); co.unobserve(el);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => co.observe(el));

  /* ---------- tap-to-colour (touch screens) ---------- */
  let lastOn = null;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const t = e.target.closest('.rv, .t-item');
    if (lastOn && lastOn !== t) lastOn.classList.remove('on');
    if (t) { t.classList.add('on'); lastOn = t; }
  }, { passive: true });

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('img', lb);
  const closeLb = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); };
  $$('.cert').forEach(c => c.addEventListener('click', () => {
    lbImg.src = c.dataset.full; lbImg.alt = $('img', c).alt;
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
  }));
  lb.addEventListener('click', (e) => { if (e.target !== lbImg) closeLb(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });

  /* ---------- hero: steady pattern that flees the mouse ---------- */
  const hero = $('#top'), canvas = $('#bg'), ctx = canvas.getContext('2d');
  const lines = $$('.name .line');
  const coarse = matchMedia('(pointer: coarse)').matches;   // phones/tablets
  let W = 0, H = 0, dpr = 1, nodes = [], dots = [], pulses = [];
  const ptr = { x: -9999, y: -9999, active: false, ghost: false };

  /* ======= TWEAK THESE ======= */
  const CFG = {
    nodeDensity: 6500,   // smaller number = MORE nodes (px² per node)
    maxNodes: 260,
    gridSize: 34,        // smaller = denser dot grid
    linkDist: 115,       // max distance for lines between nodes
    pushRadius: 170,     // how far the mouse pushes things away
    pushForce: 14,       // how hard the mouse pushes
    spring: 0.045,       // how fast things return home (steady feel)
    damping: 0.86        // lower = settles faster
  };

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(CFG.maxNodes, Math.floor(W * H / CFG.nodeDensity));
    nodes = Array.from({ length: count }, () => {
      const hx = Math.random() * W, hy = Math.random() * H;
      return {
        hx, hy, x: hx, y: hy, vx: 0, vy: 0,
        r: Math.random() * 1.5 + .8,
        cross: Math.random() < .22,                 // some nodes are "+" shapes
        ph: Math.random() * 6.283, amp: 2 + Math.random() * 4
      };
    });

    dots = [];
    for (let x = CFG.gridSize / 2; x < W; x += CFG.gridSize)
      for (let y = CFG.gridSize / 2; y < H; y += CFG.gridSize)
        dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0 });
  }

  function setPointer(cx, cy) {
    const r = hero.getBoundingClientRect();
    ptr.x = cx - r.left; ptr.y = cy - r.top; ptr.active = true; ptr.ghost = false;
    setNameSpot(cx - r.left, cy - r.top);
  }
  function setNameSpot(x, y) {
    const r = hero.getBoundingClientRect();
    lines.forEach(l => {
      const b = l.getBoundingClientRect();
      l.style.setProperty('--mx', (x + r.left - b.left) + 'px');
      l.style.setProperty('--my', (y + r.top - b.top) + 'px');
    });
  }
  hero.addEventListener('pointermove', e => setPointer(e.clientX, e.clientY), { passive: true });
  hero.addEventListener('pointerdown', e => {
    setPointer(e.clientX, e.clientY);
    const r = hero.getBoundingClientRect();
    pulses.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 });
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    ptr.active = false; ptr.x = ptr.y = -9999;
    setNameSpot(-9999, -9999);
  });

  const hue = (x, y, t) => (x * .25 + y * .15 + t * 0.04) % 360;

  // one physics step: spring back home + push away from the pointer
  function step(o, t, push) {
    let tx = o.hx, ty = o.hy;
    if (o.amp) {                                   // tiny steady float
      tx += Math.sin(t * .0007 + o.ph) * o.amp;
      ty += Math.cos(t * .0006 + o.ph) * o.amp;
    }
    o.vx += (tx - o.x) * CFG.spring;
    o.vy += (ty - o.y) * CFG.spring;
    if (push && ptr.active) {
      const dx = o.x - ptr.x, dy = o.y - ptr.y, d = Math.hypot(dx, dy);
      if (d < CFG.pushRadius && d > .1) {
        const k = 1 - d / CFG.pushRadius, f = k * k * CFG.pushForce;
        o.vx += dx / d * f; o.vy += dy / d * f;
      }
    }
    o.vx *= CFG.damping; o.vy *= CFG.damping;
    o.x += o.vx; o.y += o.vy;
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);

    // phones have no hover: a ghost pointer shows the colour (it does NOT push)
    if (coarse && !ptr.active) {
      const gx = W * (.5 + .38 * Math.sin(t * .00045)), gy = H * (.5 + .3 * Math.sin(t * .00071 + 1));
      ptr.x = gx; ptr.y = gy; ptr.ghost = true; setNameSpot(gx, gy);
    }
    const live = ptr.active || ptr.ghost;
    const R = Math.max(170, Math.min(260, W * .18));

    // ---- dotted grid ----
    for (const d of dots) {
      step(d, t, true);
      const dist = live ? Math.hypot(d.x - ptr.x, d.y - ptr.y) : 1e9;
      if (dist < R) {
        const k = 1 - dist / R;
        ctx.fillStyle = `hsla(${hue(d.x, d.y, t)},95%,62%,${.15 + k * .75})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.1 + k * 2, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
      }
    }

    // ---- nodes ----
    for (const n of nodes) step(n, t, true);

    // links
    const L = CFG.linkDist;
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x;
        if (dx > L || dx < -L) continue;
        const dy = a.y - b.y;
        if (dy > L || dy < -L) continue;
        const d = Math.hypot(dx, dy);
        if (d > L) continue;
        const k = 1 - d / L, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const pd = live ? Math.hypot(mx - ptr.x, my - ptr.y) : 1e9;
        if (pd < R * 1.1) {
          const c = 1 - pd / (R * 1.1);
          ctx.strokeStyle = `hsla(${hue(mx, my, t)},95%,60%,${.2 + c * .7 * k})`;
        } else ctx.strokeStyle = `rgba(140,140,140,${.3 * k})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    // node shapes
    for (const n of nodes) {
      const d = live ? Math.hypot(n.x - ptr.x, n.y - ptr.y) : 1e9, hot = d < R;
      const col = hot ? `hsl(${hue(n.x, n.y, t)},95%,66%)` : '#6a6a6a';
      if (n.cross) {
        const s = hot ? 4 : 3;
        ctx.strokeStyle = col; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(n.x - s, n.y); ctx.lineTo(n.x + s, n.y);
        ctx.moveTo(n.x, n.y - s); ctx.lineTo(n.x, n.y + s); ctx.stroke(); ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(n.x, n.y, hot ? n.r + 1 : n.r, 0, 6.283); ctx.fill();
      }
    }

    // click / tap pulses
    pulses = pulses.filter(p => (p.t += 1) < 70);
    for (const p of pulses) {
      const k = p.t / 70;
      ctx.strokeStyle = `hsla(${hue(p.x, p.y, t)},95%,62%,${1 - k})`;
      ctx.lineWidth = 2 * (1 - k) + .5;
      ctx.beginPath(); ctx.arc(p.x, p.y, k * 320, 0, 6.283); ctx.stroke();
    }

    // soft spotlight
    if (live) {
      const g = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, R * 1.3);
      g.addColorStop(0, `hsla(${hue(ptr.x, ptr.y, t)},90%,55%,.12)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    if (!reduce) requestAnimationFrame(frame);
  }

  resize();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  if (reduce) frame(0); else requestAnimationFrame(frame);
  new IntersectionObserver(([e]) => { canvas.style.visibility = e.isIntersecting ? 'visible' : 'hidden'; }).observe(hero);
})();