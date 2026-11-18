(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  // ----- Menu button (tablets and phones) -----
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    const setOpen = open => {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', e => { if (!e.target.closest('.top')) setOpen(false); });
  }

  // ----- Interactive positioning map (home page) -----
  function makeMap(canvas, host, opts) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, mx = null, my = null, tx = 0, ty = 0, active = false, raf = 0;
    const rest = () => opts.big ? [w / 2 + Math.min(w * 0.3, 380), h * 0.24] : [w * 0.76, h * 0.27];
    const on = () => opts.show(window.innerWidth);

    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = host.clientWidth; h = host.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!active) { [tx, ty] = rest(); mx = tx; my = ty; }
      draw();
    }
    function label(text, x, y, align, lit) {
      ctx.font = '600 12px "IBM Plex Mono", ui-monospace, monospace';
      if ('letterSpacing' in ctx) ctx.letterSpacing = opts.big ? '2px' : '1px';
      ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.fillStyle = lit ? tok('--blue') : tok('--muted');
      ctx.globalAlpha = lit ? 1 : 0.6;
      ctx.fillText(text.toUpperCase(), x, y);
      ctx.globalAlpha = 1;
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      if (!on() || mx === null) return;
      const pale = tok('--blue-pale'), blue = tok('--blue');
      const cx = w / 2, cy = h / 2, pad = opts.big ? 30 : 14, step = opts.big ? 40 : 24;

      ctx.strokeStyle = pale; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, cy); ctx.lineTo(w - pad, cy);
      ctx.moveTo(cx, pad); ctx.lineTo(cx, h - pad);
      for (let x = cx % step; x < w - pad; x += step) if (x > pad) { ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4); }
      for (let y = cy % step; y < h - pad; y += step) if (y > pad) { ctx.moveTo(cx - 4, y); ctx.lineTo(cx + 4, y); }
      ctx.stroke();

      if (opts.big) {
        // Keep the middle clear so the lines never sit on the words.
        ctx.save(); ctx.globalCompositeOperation = 'destination-out';
        const rx = Math.min(w * 0.36, 440), ry = h * 0.4;
        ctx.translate(cx, cy); ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = blue; ctx.globalAlpha = 0.45; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(cx, my); ctx.moveTo(mx, my); ctx.lineTo(mx, cy); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = blue;
      ctx.beginPath(); ctx.arc(cx, my, 2.5, 0, 7); ctx.arc(mx, cy, 2.5, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(mx, my, 15, 0, 7); ctx.strokeStyle = blue; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(mx, my, 6, 0, 7); ctx.fill();

      const right = mx >= cx, top = my <= cy;
      label('Strategy', cx + 10, pad + 6, 'left', top);
      label('Execution', cx + 10, h - pad - 6, 'left', !top);
      label('Brand', pad + 2, cy - 14, 'left', !right);
      label('Commercial', w - pad - 2, cy - 14, 'right', right);
    }
    function tick() {
      mx += (tx - mx) * 0.14; my += (ty - my) * 0.14;
      draw();
      raf = (Math.abs(tx - mx) > 0.3 || Math.abs(ty - my) > 0.3) ? requestAnimationFrame(tick) : 0;
    }
    function moveTo(x, y) {
      tx = Math.max(0, Math.min(w, x)); ty = Math.max(0, Math.min(h, y));
      if (reduced) { mx = tx; my = ty; draw(); return; }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    const point = e => { const r = canvas.getBoundingClientRect(); active = true; moveTo(e.clientX - r.left, e.clientY - r.top); };
    if (opts.big) {
      host.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') point(e); });
      host.addEventListener('pointerleave', () => { active = false; moveTo(...rest()); });
    } else {
      canvas.addEventListener('pointerdown', point);
      canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) point(e); });
    }
    new ResizeObserver(size).observe(host);
    return { size, draw };
  }

  const hero = document.querySelector('.hero');
  if (hero) {
    const maps = [
      makeMap(document.getElementById('heroCanvas'), hero, { big: true, show: vw => vw >= 760 }),
      makeMap(document.getElementById('miniCanvas'), document.querySelector('.minimap'), { big: false, show: vw => vw < 760 })
    ];
    addEventListener('resize', () => maps.forEach(m => m.size()));
    if (document.fonts) document.fonts.ready.then(() => maps.forEach(m => m.draw()));
  }

  // ----- Small fixed maps beside inner page titles -----
  document.querySelectorAll('.pmap').forEach(svg => {
    const [px, py] = svg.dataset.pos.split(',').map(Number);
    const W = 220, H = 140, cx = W / 2, cy = H / 2, sx = 82, sy = 46;
    const x = cx + px * sx, y = cy - py * sy, right = px > 0, top = py > 0, mid = px === 0;
    let ticks = '';
    for (let t = cx % 20; t < W - 8; t += 20) if (t > 8) ticks += `M${t} ${cy - 3}V${cy + 3}`;
    for (let t = cy % 20; t < H - 8; t += 20) if (t > 8) ticks += `M${cx - 3} ${t}H${cx + 3}`;
    const side = on => (mid ? '' : (on ? 'lit' : ''));
    const ly = top ? cy + 15 : cy - 8;
    svg.innerHTML = `
      <path class="ax" d="M8 ${cy}H${W - 8}M${cx} 6V${H - 6}${ticks}"/>
      ${mid ? '' : `<path class="guide" d="M${x} ${y}H${cx}M${x} ${y}V${cy}"/>`}
      <circle class="dot" cx="${cx}" cy="${y}" r="2"/>${mid ? '' : `<circle class="dot" cx="${x}" cy="${cy}" r="2"/>`}
      <circle class="ring" cx="${x}" cy="${y}" r="11"/><circle class="dot" cx="${x}" cy="${y}" r="4.5"/>
      <text x="${cx + 7}" y="10" class="${top ? 'lit' : ''}">STRATEGY</text>
      <text x="${cx + 7}" y="${H - 4}" class="${!top ? 'lit' : ''}">EXECUTION</text>
      <text x="8" y="${ly}" class="${side(!right)}">BRAND</text>
      <text x="${W - 8}" y="${ly}" text-anchor="end" class="${side(right)}">COMMERCIAL</text>`;
  });

  // ----- Contact form: sends through Formspree without leaving the page -----
  const form = document.getElementById('contactForm');
  if (form) {
    const ok = document.getElementById('formOk');
    const err = document.getElementById('formErr');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      ok.hidden = err.hidden = true;
      if (!form.reportValidity()) return;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        ok.hidden = false;
      } catch (x) {
        err.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
