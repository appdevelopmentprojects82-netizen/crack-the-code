/* ==========================================================================
   GUIDED INSTRUCTIONS - dims the screen, lights up one part of it and
   points at it with a box and an arrow. Used for "how to play" and the
   first padlock / spider web.
   Tour.start([{ el, title, text | html }, ...], onEnd)
     el: a CSS selector or a function returning an element (none = centred box)
   ========================================================================== */
'use strict';

const Tour = (function () {
  let steps = [], i = 0, onEnd = null, root = null;

  function start(list, done) {
    stop();
    steps = list.filter(function (st) { return !st.el || find(st); });
    if (!steps.length) { if (done) done(); return; }
    i = 0; onEnd = done || null;
    root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML = '<div class="tour-hole"></div><div class="tour-arrow"></div>' +
      '<div class="tour-tip"><div class="tour-title"></div><div class="tour-text"></div>' +
      '<div class="tour-foot"><span class="tour-dots"></span><button class="tour-next"></button></div>' +
      '<button class="tour-skip">SKIP</button></div>';
    document.body.appendChild(root);
    root.querySelector('.tour-next').onclick = next;
    root.querySelector('.tour-skip').onclick = finish;
    root.addEventListener('click', function (e) { if (e.target === root) next(); });
    show();
    window.addEventListener('resize', place);
  }
  function find(st) { return typeof st.el === 'function' ? st.el() : document.querySelector(st.el); }

  function show() {
    const st = steps[i];
    root.querySelector('.tour-title').textContent = st.title || '';
    const tx = root.querySelector('.tour-text');
    if (st.html) tx.innerHTML = st.html;
    else if (window.coinText) coinText(tx, st.text || ''); else tx.textContent = st.text || '';
    root.querySelector('.tour-next').textContent = i === steps.length - 1 ? 'GOT IT ✓' : 'NEXT ›';
    root.querySelector('.tour-skip').classList.toggle('hidden', steps.length < 2 || i === steps.length - 1);
    const dots = root.querySelector('.tour-dots');
    dots.innerHTML = '';
    if (steps.length > 1) steps.forEach(function (x, k) { const d = document.createElement('i'); if (k === i) d.className = 'on'; dots.appendChild(d); });
    root.classList.remove('anim'); void root.offsetWidth; root.classList.add('anim');
    place();
  }

  // put the light on the element and the box above or below it, arrow in between
  function place() {
    if (!root) return;
    const st = steps[i];
    const hole = root.querySelector('.tour-hole'), tip = root.querySelector('.tour-tip'), arrow = root.querySelector('.tour-arrow');
    const W = window.innerWidth, H = window.innerHeight;
    const el = st.el ? find(st) : null;
    const tw = Math.min(330, W - 32);
    tip.style.width = tw + 'px';
    if (!el) {
      root.classList.add('free');
      hole.style.cssText = 'left:50%;top:50%;width:0;height:0';
      tip.style.left = (W - tw) / 2 + 'px';
      tip.style.top = Math.max(16, (H - tip.offsetHeight) / 2) + 'px';
      arrow.style.display = 'none';
      return;
    }
    root.classList.remove('free');
    const r = el.getBoundingClientRect(), pad = 6;
    hole.style.cssText = 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px';
    const th = tip.offsetHeight, gap = 46;
    const below = H - r.bottom > th + gap + 16 || r.top < th + gap + 16;
    const cx = r.left + r.width / 2;
    tip.style.left = Math.max(16, Math.min(W - tw - 16, cx - tw / 2)) + 'px';
    tip.style.top = (below ? Math.min(H - th - 8, r.bottom + pad + gap) : Math.max(8, r.top - pad - gap - th)) + 'px';
    arrow.style.display = 'block';
    arrow.className = 'tour-arrow ' + (below ? 'up' : 'down');
    arrow.style.left = (cx - 18) + 'px';
    arrow.style.top = (below ? r.bottom + pad + 6 : r.top - pad - 40) + 'px';
  }

  function next() { if (i < steps.length - 1) { i++; show(); } else finish(); }
  function finish() { const cb = onEnd; stop(); if (cb) cb(); }
  function stop() {
    if (root) root.remove();
    root = null; onEnd = null;
    window.removeEventListener('resize', place);
  }
  return { start: start, stop: stop, active: function () { return !!root; } };
})();
