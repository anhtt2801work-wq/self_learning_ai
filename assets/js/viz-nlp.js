/* Interactive demos for the NLP page */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- 1. Byte-pair encoding, step by step ---------- */
  Viz.register('bpe1', function (root) {
    const DEFAULT = 'low low low low low lower lower newest newest newest newest newest newest widest widest widest';
    let words, merges, lastMerge;

    const ta = document.createElement('textarea');
    ta.setAttribute('aria-label', 'Văn bản huấn luyện bộ tách từ'); ta.value = DEFAULT; ta.rows = 2;
    root.appendChild(ta);
    const r1 = U.row(root);
    U.button(r1, 'Gộp cặp phổ biến nhất', () => { mergeOnce(); render(); }, true);
    U.button(r1, 'Gộp 5 lần', () => { for (let i = 0; i < 5; i++) mergeOnce(); render(); });
    U.button(r1, 'Đặt lại', () => { init(); render(); });
    const r2 = U.row(root);
    const probe = el('input'); probe.type = 'text'; probe.value = 'lowest'; probe.setAttribute('aria-label', 'Từ cần mã hóa');
    const pl = el('label', 'viz-ctl'); pl.appendChild(el('span', 'viz-lbl', 'Mã hóa từ mới bằng các phép gộp đã học:')); pl.appendChild(probe); r2.appendChild(pl);
    const probeOut = el('div', 'viz-out'); root.appendChild(probeOut);
    const info = el('div'); root.appendChild(info);

    function init() {
      const counts = new Map();
      ta.value.toLowerCase().split(/\s+/).filter(Boolean).forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
      words = [...counts].map(([w, n]) => ({ w, n, toks: [...w].concat(['</w>']) }));
      merges = []; lastMerge = null;
    }
    function pairCounts() {
      const pc = new Map();
      words.forEach(o => { for (let i = 0; i < o.toks.length - 1; i++) { const k = o.toks[i] + '\u0001' + o.toks[i + 1]; pc.set(k, (pc.get(k) || 0) + o.n); } });
      return [...pc].map(([k, n]) => ({ a: k.split('\u0001')[0], b: k.split('\u0001')[1], n }))
        .sort((x, y) => y.n - x.n || (x.a + x.b < y.a + y.b ? -1 : 1));
    }
    function applyMerge(toks, a, b) {
      const out = []; for (let i = 0; i < toks.length; i++) { if (i < toks.length - 1 && toks[i] === a && toks[i + 1] === b) { out.push(a + b); i++; } else out.push(toks[i]); }
      return out;
    }
    function mergeOnce() {
      const top = pairCounts()[0]; if (!top || top.n < 1) return;
      words.forEach(o => { o.toks = applyMerge(o.toks, top.a, top.b); });
      merges.push([top.a, top.b]); lastMerge = top.a + top.b;
    }
    function chips(toks) {
      return toks.map(t => '<span class="chip' + (t === lastMerge ? ' new' : '') + '">' + esc(t) + '</span>').join('');
    }
    function encode(word) {
      let toks = [...word.toLowerCase()].concat(['</w>']);
      merges.forEach(([a, b]) => { toks = applyMerge(toks, a, b); });
      return toks;
    }
    function render() {
      const pc = pairCounts(), vocab = new Set(); words.forEach(o => o.toks.forEach(t => vocab.add(t)));
      let h = '<table><thead><tr><th>Từ (số lần)</th><th>Các token hiện tại</th></tr></thead><tbody>' +
        words.map(o => '<tr><td>' + esc(o.w) + ' (' + o.n + ')</td><td>' + chips(o.toks) + '</td></tr>').join('') + '</tbody></table>';
      h += '<p class="viz-help" style="padding:0"><b>Cặp liền kề phổ biến nhất</b> (sẽ gộp tiếp): ' +
        (pc.slice(0, 6).map((p, i) => (i ? ', ' : '') + (i === 0 ? '<b>' : '') + '(' + esc(p.a) + ', ' + esc(p.b) + ') ×' + p.n + (i === 0 ? '</b>' : '')).join('') || 'không còn cặp nào') + '</p>';
      h += '<p class="viz-help" style="padding:0"><b>Các phép gộp đã học:</b> ' + (merges.map((m, i) => (i + 1) + '. ' + esc(m[0]) + ' + ' + esc(m[1])).join(' · ') || 'chưa có') +
        ' · <b>kích thước từ vựng:</b> ' + vocab.size + '</p>';
      info.innerHTML = h;
      probeOut.innerHTML = 'Mã hóa “<b>' + esc(probe.value) + '</b>” → ' + chips(encode(probe.value.trim().split(/\s+/)[0] || ''));
    }
    ta.addEventListener('input', () => { init(); render(); });
    probe.addEventListener('input', render);
    init(); render();
  });

  /* ---------- 2. Cosine similarity ---------- */
  Viz.register('cos1', function (root) {
    const u = { x: 0.9, y: 0.4 }, v = { x: 0.35, y: 0.95 };
    let drag = null;
    const view = Viz.mount(root, {
      aspect: 0.5, label: 'Hai vector hai chiều có thể kéo thả để xem cosine',
      draw(ctx, W, H, c) {
        const cx = W / 2, cy = H / 2, s = H / 2.5;
        const X = p => cx + p.x * s, Y = p => cy - p.y * s;
        ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
        const arrow = (p, col, name) => {
          const x = X(p), y = Y(p), a = Math.atan2(y - cy, x - cx);
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 11 * Math.cos(a - .4), y - 11 * Math.sin(a - .4)); ctx.lineTo(x - 11 * Math.cos(a + .4), y - 11 * Math.sin(a + .4)); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.globalAlpha = .18; ctx.fill(); ctx.globalAlpha = 1;
          ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(name, x + 10, y - 6);
        };
        const a1 = Math.atan2(-u.y, u.x), a2 = Math.atan2(-v.y, v.x);
        let diff = a2 - a1; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 30, a1, a1 + diff, diff < 0); ctx.stroke();
        arrow(u, c.a, 'u'); arrow(v, c.b, 'v');
      }
    });
    view.cv.style.touchAction = 'none'; view.cv.style.cursor = 'grab';
    const toMath = (p) => { const s = view.H / 2.5; return { x: (p.x - view.W / 2) / s, y: -(p.y - view.H / 2) / s }; };
    view.cv.addEventListener('pointerdown', ev => {
      const p = Viz.pos(ev, view.cv), s = view.H / 2.5, cx = view.W / 2, cy = view.H / 2;
      const du = Math.hypot(p.x - (cx + u.x * s), p.y - (cy - u.y * s)), dv = Math.hypot(p.x - (cx + v.x * s), p.y - (cy - v.y * s));
      if (Math.min(du, dv) < 24) { drag = du <= dv ? u : v; view.cv.setPointerCapture(ev.pointerId); view.cv.style.cursor = 'grabbing'; }
    });
    view.cv.addEventListener('pointermove', ev => {
      if (!drag) return; const m = toMath(Viz.pos(ev, view.cv));
      drag.x = Math.max(-2, Math.min(2, m.x)); drag.y = Math.max(-1.1, Math.min(1.1, m.y)); update();
    });
    const end = () => { drag = null; view.cv.style.cursor = 'grab'; };
    view.cv.addEventListener('pointerup', end); view.cv.addEventListener('pointercancel', end);
    const r1 = U.row(root);
    U.button(r1, 'Nhân đôi độ dài của v', () => { v.x = Math.max(-2, Math.min(2, v.x * 2)); v.y = Math.max(-1.1, Math.min(1.1, v.y * 2)); update(); });
    U.button(r1, 'Chia đôi độ dài của v', () => { v.x /= 2; v.y /= 2; update(); });
    const readout = U.out(root);
    function update() {
      const nu = Math.hypot(u.x, u.y), nv = Math.hypot(v.x, v.y), dot = u.x * v.x + u.y * v.y;
      const cos = nu && nv ? dot / (nu * nv) : 0, ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
      readout.innerHTML = '‖u‖ = <b>' + nu.toFixed(2) + '</b> · ‖v‖ = <b>' + nv.toFixed(2) + '</b> · u·v = <b>' + dot.toFixed(3) +
        '</b> · cos θ = <b>' + cos.toFixed(3) + '</b> · θ = <b>' + ang.toFixed(1) + '°</b>';
      view.redraw();
    }
    update();
  });
})();
