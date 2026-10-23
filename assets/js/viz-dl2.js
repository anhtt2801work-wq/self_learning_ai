/* Deeper demos for the Deep Learning page: backprop stepper, optimizer race, initialization, training curves */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const f3 = v => (Math.abs(v) < 5e-4 ? '0' : v.toFixed(3));

  /* ================= 1. Backprop on a 2-2-1 network, one partial derivative at a time ================= */
  Viz.register('bp1', function (root) {
    const P = { w11: 0.4, w12: -0.3, w21: 0.2, w22: 0.8, b1: 0.1, b2: -0.1, v1: 0.7, v2: -0.4, c: 0.05, x1: 1, x2: 2, y: 1 };
    let step = 0;
    const sig = z => 1 / (1 + Math.exp(-z));
    function model(p) {
      const z1 = p.w11 * p.x1 + p.w12 * p.x2 + p.b1, z2 = p.w21 * p.x1 + p.w22 * p.x2 + p.b2, h1 = Math.tanh(z1), h2 = Math.tanh(z2);
      const zo = p.v1 * h1 + p.v2 * h2 + p.c, pr = sig(zo), L = -(p.y * Math.log(pr) + (1 - p.y) * Math.log(1 - pr));
      return { z1, z2, h1, h2, zo, pr, L };
    }
    function steps() {
      const p = P, m = model(p), d = {}; const rows = [];
      const add = (phase, name, formula, val) => rows.push({ phase, name, formula, val });
      add('fwd', 'z₁', 'w₁₁x₁ + w₁₂x₂ + b₁ = ' + f3(p.w11) + '·' + f3(p.x1) + ' + ' + f3(p.w12) + '·' + f3(p.x2) + ' + ' + f3(p.b1), m.z1);
      add('fwd', 'h₁', 'tanh(z₁)', m.h1);
      add('fwd', 'z₂', 'w₂₁x₁ + w₂₂x₂ + b₂ = ' + f3(p.w21) + '·' + f3(p.x1) + ' + ' + f3(p.w22) + '·' + f3(p.x2) + ' + ' + f3(p.b2), m.z2);
      add('fwd', 'h₂', 'tanh(z₂)', m.h2);
      add('fwd', 'zₒ', 'v₁h₁ + v₂h₂ + c = ' + f3(p.v1) + '·' + f3(m.h1) + ' + ' + f3(p.v2) + '·' + f3(m.h2) + ' + ' + f3(p.c), m.zo);
      add('fwd', 'p', 'σ(zₒ)', m.pr);
      add('fwd', 'L', '−[y·ln p + (1−y)·ln(1−p)] với y = ' + p.y, m.L);
      d.zo = m.pr - p.y; add('bwd', '∂L/∂zₒ', 'p − y = ' + f3(m.pr) + ' − ' + p.y, d.zo);
      d.v1 = d.zo * m.h1; add('bwd', '∂L/∂v₁', '(∂L/∂zₒ)·h₁', d.v1);
      d.v2 = d.zo * m.h2; add('bwd', '∂L/∂v₂', '(∂L/∂zₒ)·h₂', d.v2);
      d.c = d.zo; add('bwd', '∂L/∂c', '∂L/∂zₒ (vì ∂zₒ/∂c = 1)', d.c);
      d.h1 = d.zo * p.v1; add('bwd', '∂L/∂h₁', '(∂L/∂zₒ)·v₁', d.h1);
      d.h2 = d.zo * p.v2; add('bwd', '∂L/∂h₂', '(∂L/∂zₒ)·v₂', d.h2);
      d.z1 = d.h1 * (1 - m.h1 ** 2); add('bwd', '∂L/∂z₁', '(∂L/∂h₁)·(1 − h₁²)', d.z1);
      d.z2 = d.h2 * (1 - m.h2 ** 2); add('bwd', '∂L/∂z₂', '(∂L/∂h₂)·(1 − h₂²)', d.z2);
      d.w11 = d.z1 * p.x1; add('bwd', '∂L/∂w₁₁', '(∂L/∂z₁)·x₁', d.w11);
      d.w12 = d.z1 * p.x2; add('bwd', '∂L/∂w₁₂', '(∂L/∂z₁)·x₂', d.w12);
      d.w21 = d.z2 * p.x1; add('bwd', '∂L/∂w₂₁', '(∂L/∂z₂)·x₁', d.w21);
      d.w22 = d.z2 * p.x2; add('bwd', '∂L/∂w₂₂', '(∂L/∂z₂)·x₂', d.w22);
      d.b1 = d.z1; add('bwd', '∂L/∂b₁', '∂L/∂z₁', d.b1);
      d.b2 = d.z2; add('bwd', '∂L/∂b₂', '∂L/∂z₂', d.b2);
      return { rows, m, d };
    }
    function numeric(key) { const e = 1e-6, a = { ...P }, b = { ...P }; a[key] += e; b[key] -= e; return (model(a).L - model(b).L) / (2 * e); }

    const view = Viz.mount(root, {
      aspect: 0.42, minH: 190, label: 'Mạng 2-2-1 với giá trị lan truyền xuôi và gradient lan truyền ngược',
      draw(ctx, W, H, c) {
        const { rows, m, d } = steps(), shown = k => step > k;
        const X = [W * .1, W * .45, W * .85], Y2 = [H * .3, H * .7], Yo = H * .5;
        const nodes = { x1: [X[0], Y2[0]], x2: [X[0], Y2[1]], h1: [X[1], Y2[0]], h2: [X[1], Y2[1]], o: [X[2], Yo] };
        const edge = (a, b, w, key, gr, t) => { t = t || .5; ctx.strokeStyle = c.muted; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); const mx = a[0] * (1 - t) + b[0] * t, my = a[1] * (1 - t) + b[1] * t; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = c.a; ctx.fillText(key + '=' + f3(w), mx, my - 5); if (gr != null) { ctx.fillStyle = c.b; ctx.fillText('∂=' + f3(gr), mx, my + 8); } };
        edge(nodes.x1, nodes.h1, P.w11, 'w₁₁', shown(15) ? d.w11 : null, .5); edge(nodes.x2, nodes.h1, P.w12, 'w₁₂', shown(16) ? d.w12 : null, .27);
        edge(nodes.x1, nodes.h2, P.w21, 'w₂₁', shown(17) ? d.w21 : null, .27); edge(nodes.x2, nodes.h2, P.w22, 'w₂₂', shown(18) ? d.w22 : null, .5);
        edge(nodes.h1, nodes.o, P.v1, 'v₁', shown(8) ? d.v1 : null); edge(nodes.h2, nodes.o, P.v2, 'v₂', shown(9) ? d.v2 : null);
        const node = (name, [x, y], val, grad, col) => { ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fillStyle = c.bg; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = col; ctx.stroke(); ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(name, x, y - 5); ctx.font = '11px system-ui'; ctx.fillText(val == null ? '·' : f3(val), x, y + 9); if (grad != null) { ctx.fillStyle = c.b; ctx.fillText('∂L=' + f3(grad), x, y + 38); } };
        node('x₁', nodes.x1, P.x1, null, c.muted); node('x₂', nodes.x2, P.x2, null, c.muted);
        node('h₁', nodes.h1, shown(1) ? m.h1 : null, shown(13) ? d.z1 : null, c.a); node('h₂', nodes.h2, shown(3) ? m.h2 : null, shown(14) ? d.z2 : null, c.a);
        node('p', nodes.o, shown(5) ? m.pr : null, shown(7) ? d.zo : null, c.c);
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('xanh dương: tham số · cam: gradient ∂L/∂· · ∂L dưới nút h là ∂L/∂z', 8, H - 8);
        if (shown(6)) { ctx.fillStyle = c.fg; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'right'; ctx.fillText('L = ' + f3(m.L), W - 10, 20); }
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Bước tiếp theo', () => { step = Math.min(step + 1, 21); update(); }, true);
    U.button(r1, 'Lùi một bước', () => { step = Math.max(step - 1, 0); update(); });
    U.button(r1, 'Chạy hết', () => { step = 21; update(); });
    U.button(r1, 'Về đầu', () => { step = 0; update(); });
    const r2 = U.row(root); r2.appendChild(el('span', 'viz-lbl', 'Chỉnh tham số:')); r2.lastChild.style.fontSize = '.88rem';
    Object.keys(P).forEach(k => {
      const l = el('label', 'viz-ctl'); l.appendChild(el('span', 'viz-lbl', k)); const i = el('input'); i.type = 'number'; i.step = k === 'y' ? 1 : 0.1; i.value = P[k]; i.style.cssText = 'width:62px;font:inherit;padding:3px 5px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)'; i.setAttribute('aria-label', k);
      i.addEventListener('input', () => { let v = parseFloat(i.value); if (!isFinite(v)) return; if (k === 'y') v = v >= 0.5 ? 1 : 0; P[k] = v; update(); }); l.appendChild(i); r2.appendChild(l);
    });
    const table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const readout = U.out(root);
    function update() {
      const { rows, d } = steps();
      let h = '<table><thead><tr><th>#</th><th>Đại lượng</th><th>Cách tính</th><th>Giá trị</th></tr></thead><tbody>';
      rows.slice(0, step).forEach((r, i) => { h += '<tr' + (r.phase === 'bwd' ? ' style="background:color-mix(in srgb,var(--c2) 8%,transparent)"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.formula) + '</td><td><b>' + f3(r.val) + '</b></td></tr>'; });
      table.innerHTML = step ? h + '</tbody></table>' : '';
      if (step >= 21) {
        const keys = ['w11', 'w12', 'w21', 'w22', 'b1', 'b2', 'v1', 'v2', 'c']; let worst = 0;
        keys.forEach(k => { worst = Math.max(worst, Math.abs(d[k] - numeric(k))); });
        readout.innerHTML = '<b>Kiểm tra bằng sai phân hữu hạn</b> (J(θ+ε) − J(θ−ε))/2ε với ε = 10⁻⁶ cho cả 9 tham số: sai lệch lớn nhất giữa backprop và đạo hàm số = <b>' + worst.toExponential(1) + '</b>. Hai cách khớp nhau nên các công thức ngược ở trên đúng.';
      } else readout.innerHTML = step === 0 ? 'Bấm “Bước tiếp theo”. Bảy bước đầu là lan truyền xuôi, mười bốn bước sau là lan truyền ngược (nền cam).' : (step <= 7 ? 'Lan truyền xuôi: tính giá trị từ đầu vào tới mất mát.' : 'Lan truyền ngược: mỗi dòng dùng kết quả của dòng trước (quy tắc chuỗi).');
      view.redraw();
    }
    update();
  });

  /* ================= 2. Optimizer race on 2-D surfaces ================= */
  Viz.register('opt1', function (root) {
    // Learning rates below were tuned per optimizer (coarse grid search in NumPy) so that the comparison is not rigged by a shared rate.
    const SURF = {
      quad: { name: 'Thung lũng hẹp f = ½(x² + 100y²)', f: (x, y) => .5 * (x * x + 100 * y * y), g: (x, y) => [x, 100 * y], xr: [-5, 5], yr: [-1.1, 1.1], start: [-4.2, 0.7], opt: [[0, 0]], fmin: 0, lr: { sgd: 0.0178, mom: 0.0042, rms: 0.178, adam: 0.237 } },
      rosen: { name: 'Rosenbrock (thung lũng cong)', f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)], xr: [-2, 2], yr: [-1, 3], start: [-1.5, 2], opt: [[1, 1]], fmin: 0, lr: { sgd: 0.00178, mom: 0.002, rms: 0.00178, adam: 0.178 } },
      himmel: { name: 'Himmelblau (bốn đáy bằng nhau)', f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2, g: (x, y) => [4 * x * (x * x + y - 11) + 2 * (x + y * y - 7), 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)], xr: [-5, 5], yr: [-5, 5], start: [0, -4], opt: [[3, 2], [-2.805, 3.131], [-3.779, -3.283], [3.584, -1.848]], fmin: 0, lr: { sgd: 0.01, mom: 0.00075, rms: 0.1, adam: 0.2 } }
    };
    const OPTS = [['sgd', 'SGD', 'fg'], ['mom', 'Momentum (β = 0.9)', 'a'], ['rms', 'RMSProp (ρ = 0.9)', 'c'], ['adam', 'Adam (0.9, 0.999)', 'b']];
    let key = 'quad', S = SURF[key], lr = { ...S.lr }, on = { sgd: true, mom: true, rms: true, adam: true }, timer = null, runs = {}; const TOL = 1e-3;
    function reset() { runs = {}; OPTS.forEach(([k]) => { runs[k] = { p: [...S.start], v: [0, 0], s: [0, 0], m: [0, 0], t: 0, path: [[...S.start]], dead: false, hit: null }; }); }
    function stepOne(k) {
      const r = runs[k]; if (r.dead) return; const g = S.g(...r.p), a = lr[k]; r.t++;
      for (let i = 0; i < 2; i++) {
        if (k === 'sgd') r.p[i] -= a * g[i];
        else if (k === 'mom') { r.v[i] = .9 * r.v[i] + g[i]; r.p[i] -= a * r.v[i]; }
        else if (k === 'rms') { r.s[i] = .9 * r.s[i] + .1 * g[i] * g[i]; r.p[i] -= a * g[i] / (Math.sqrt(r.s[i]) + 1e-8); }
        else { r.m[i] = .9 * r.m[i] + .1 * g[i]; r.s[i] = .999 * r.s[i] + .001 * g[i] * g[i]; r.p[i] -= a * (r.m[i] / (1 - .9 ** r.t)) / (Math.sqrt(r.s[i] / (1 - .999 ** r.t)) + 1e-8); }
      }
      if (!isFinite(r.p[0]) || !isFinite(r.p[1]) || Math.abs(r.p[0]) > 1e3 || Math.abs(r.p[1]) > 1e3) { r.dead = true; return; }
      if (r.hit == null && S.f(...r.p) - S.fmin < TOL) r.hit = r.t;
      if (r.t % 2 === 0 || r.t < 60) r.path.push([...r.p]);
    }
    reset();
    const view = Viz.mount(root, {
      aspect: 0.62, label: 'Đường đi của bốn bộ tối ưu trên bề mặt mất mát hai chiều',
      draw(ctx, W, H, c) {
        const sx = x => (x - S.xr[0]) / (S.xr[1] - S.xr[0]) * W, sy = y => H - (y - S.yr[0]) / (S.yr[1] - S.yr[0]) * H, cell = 6, A = Viz.rgb(c.a);
        let mx = 1; const vals = [];
        for (let px = 0; px < W; px += cell) { const row = []; for (let py = 0; py < H; py += cell) { const x = S.xr[0] + (px + cell / 2) / W * (S.xr[1] - S.xr[0]), y = S.yr[1] - (py + cell / 2) / H * (S.yr[1] - S.yr[0]); const v = Math.log10(1 + Math.max(0, S.f(x, y) - S.fmin)); row.push(v); if (v > mx) mx = v; } vals.push(row); }
        vals.forEach((row, i) => row.forEach((v, j) => { const t = v / mx, band = Math.floor(t * 16); ctx.fillStyle = 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + (0.06 + 0.4 * (band / 16) + (band % 2 ? 0.05 : 0)) + ')'; ctx.fillRect(i * cell, j * cell, cell, cell); }));
        ctx.fillStyle = c.fg; S.opt.forEach(o => { ctx.beginPath(); ctx.arc(sx(o[0]), sy(o[1]), 5, 0, 7); ctx.fill(); });
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx(S.start[0]), sy(S.start[1]), 7, 0, 7); ctx.stroke();
        OPTS.forEach(([k, , col]) => {
          if (!on[k]) return; const r = runs[k], cc = col === 'fg' ? c.fg : c[col]; ctx.strokeStyle = cc; ctx.fillStyle = cc; ctx.lineWidth = 2;
          ctx.beginPath(); r.path.forEach((p, i) => { i ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1])); }); ctx.stroke();
          if (!r.dead) { ctx.beginPath(); ctx.arc(sx(r.p[0]), sy(r.p[1]), 5, 0, 7); ctx.fill(); }
        });
        ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; let y = 6;
        OPTS.forEach(([k, name, col]) => { if (!on[k]) return; ctx.fillStyle = col === 'fg' ? c.fg : c[col]; ctx.fillText('— ' + name, 8, y); y += 14; });
      }
    });
    const r1 = U.row(root);
    U.select(r1, 'Bề mặt', Object.keys(SURF).map(k => [k, SURF[k].name]), v => { stop(); key = v; S = SURF[v]; lr = { ...S.lr }; sliders.forEach(([k, sl]) => sl.set(Math.log10(lr[k]))); reset(); update(); });
    const sliders = []; const r2 = U.row(root);
    OPTS.forEach(([k, name]) => { const sl = U.slider(r2, 'η ' + name.split(' ')[0], -4, -0.3, 0.05, Math.log10(lr[k]), v => Math.pow(10, v).toPrecision(2), v => { lr[k] = Math.pow(10, v); stop(); reset(); update(); }); sliders.push([k, sl]); });
    const r3 = U.row(root);
    OPTS.forEach(([k, name]) => U.check(r3, name, true, v => { on[k] = v; update(); }));
    const r4 = U.row(root);
    const runBtn = U.button(r4, 'Chạy', () => (timer ? stop() : run()), true);
    U.button(r4, 'Một bước', () => { stop(); tick(1); });
    U.button(r4, '+100 bước', () => { stop(); tick(100); });
    U.button(r4, 'Đặt lại', () => { stop(); reset(); update(); });
    const readout = U.out(root);
    function tick(n) { for (let i = 0; i < n; i++) OPTS.forEach(([k]) => stepOne(k)); update(); }
    function run() { runBtn.textContent = 'Dừng'; timer = setInterval(() => { tick(3); if (runs.adam.t >= 4000) stop(); }, 30); }
    function stop() { if (timer) clearInterval(timer); timer = null; runBtn.textContent = 'Chạy'; }
    function update() {
      readout.innerHTML = OPTS.filter(([k]) => on[k]).map(([k, name]) => { const r = runs[k], fv = S.f(...r.p) - S.fmin; return name + ': bước ' + r.t + ', ' + (r.dead ? '<b>phân kỳ</b>' : 'f − f* = <b>' + fv.toExponential(1) + '</b> tại (' + r.p[0].toFixed(2) + ', ' + r.p[1].toFixed(2) + ')') + (r.hit != null ? ' · đạt f − f* &lt; 10⁻³ sau <b>' + r.hit + '</b> bước' : ''); }).join('<br>') +
        '<br>Tốc độ học của từng bộ đã được dò sơ bộ (lưới thô) trên mỗi bề mặt; thay đổi chúng để thấy độ nhạy. Chấm đen là các điểm tối ưu, vòng tròn xám là điểm xuất phát chung.'; view.redraw();
    }
    update();
  });

  /* ================= 3. Signal propagation vs initialization ================= */
  Viz.register('init1', function (root) {
    let act = 'tanh', width = 128, depth = 30; const INITS = [['small', 'N(0, 0.01²)', 'muted'], ['one', 'N(0, 1)', 'd'], ['xavier', 'Xavier: var = 1/n', 'a'], ['he', 'He: var = 2/n', 'b']];
    let res = {};
    function compute() {
      INITS.forEach(([k]) => {
        const r = Viz.rng(7 + width), B = 16, X = Array.from({ length: B }, () => Float64Array.from({ length: width }, () => Viz.randn(r))), std = [], der = [];
        const sd = k === 'small' ? 0.01 : k === 'one' ? 1 : k === 'xavier' ? Math.sqrt(1 / width) : Math.sqrt(2 / width);
        for (let l = 0; l < depth; l++) {
          const W = Float64Array.from({ length: width * width }, () => Viz.randn(r) * sd); let s = 0, s2 = 0, dd = 0, n = 0;
          for (let b = 0; b < B; b++) { const x = X[b], out = new Float64Array(width); for (let j = 0; j < width; j++) { let z = 0; const off = j * width; for (let i = 0; i < width; i++) z += W[off + i] * x[i]; const a = act === 'tanh' ? Math.tanh(z) : Math.max(0, z); out[j] = a; s += a; s2 += a * a; dd += act === 'tanh' ? 1 - a * a : (z > 0 ? 1 : 0); n++; } X[b] = out; }
          const mean = s / n; std.push(Math.sqrt(Math.max(1e-300, s2 / n - mean * mean))); der.push(dd / n);
        }
        res[k] = { std, der };
      });
    }
    function plot(title, key) {
      return Viz.mount(root.querySelector('.cell-' + key), {
        aspect: 0.8, label: title,
        draw(ctx, W, H, c) {
          const all = INITS.flatMap(([k]) => res[k][key]).map(v => Math.log10(Math.max(1e-300, v))).filter(isFinite); let lo = Math.floor(Math.min(...all)) - 1, hi = Math.ceil(Math.max(...all)) + 1; lo = Math.max(lo, -40); hi = Math.min(hi, 40); if (hi - lo < 4) { lo = Math.floor((lo + hi) / 2) - 2; hi = lo + 4; }
          const pad = { l: 46, r: 10, t: 22, b: 30 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, sx = i => pad.l + i / (depth - 1) * pw, sy = v => pad.t + ph - (Math.min(hi, Math.max(lo, Math.log10(Math.max(1e-300, v)))) - lo) / (hi - lo) * ph;
          ctx.font = '11px system-ui'; ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          for (let e = Math.ceil(lo); e <= hi; e += (hi - lo > 20 ? 6 : hi - lo > 8 ? 2 : 1)) { ctx.beginPath(); ctx.moveTo(pad.l, sy(Math.pow(10, e))); ctx.lineTo(W - pad.r, sy(Math.pow(10, e))); ctx.stroke(); ctx.fillText('1e' + e, pad.l - 4, sy(Math.pow(10, e))); }
          ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('lớp', pad.l + pw / 2, H - 14); ctx.textAlign = 'left'; ctx.fillStyle = c.fg; ctx.fillText(title, pad.l, 4);
          INITS.forEach(([k, , col]) => { ctx.strokeStyle = col === 'muted' ? c.muted : c[col]; ctx.lineWidth = 2.4; ctx.beginPath(); res[k][key].forEach((v, i) => { i ? ctx.lineTo(sx(i), sy(v)) : ctx.moveTo(sx(i), sy(v)); }); ctx.stroke(); });
          ctx.strokeStyle = c.border; ctx.strokeRect(pad.l, pad.t, pw, ph);
        }
      });
    }
    const split = el('div', 'viz-split even'); root.appendChild(split); ['std', 'der'].forEach(k => split.appendChild(el('div', 'cell-' + k)));
    compute(); const v1 = plot('Độ lệch chuẩn của kích hoạt theo lớp', 'std'), v2 = plot('Hệ số đạo hàm trung bình φ′(z) theo lớp', 'der');
    const lg = el('div', 'viz-help'); lg.style.padding = '0 0 4px'; lg.innerHTML = INITS.map(([, n, col]) => '<span style="color:' + (col === 'muted' ? 'var(--muted)' : 'var(--c' + ({ a: 1, b: 2, c: 3, d: 4 })[col] + ')') + ';font-weight:700">— ' + n + '</span>').join(' &nbsp; '); root.insertBefore(lg, split);
    const r1 = U.row(root);
    U.select(r1, 'Hàm kích hoạt', [['tanh', 'tanh'], ['relu', 'ReLU']], v => { act = v; update(); });
    U.slider(r1, 'Độ rộng mỗi lớp', 32, 256, 32, width, String, v => { width = v; update(); });
    U.slider(r1, 'Số lớp', 5, 40, 5, depth, String, v => { depth = v; update(); });
    const readout = U.out(root);
    function update() {
      compute(); const last = k => res[k].std[depth - 1], lastD = k => res[k].der[depth - 1], f = v => v.toExponential(1);
      readout.innerHTML = 'Sau ' + depth + ' lớp (' + act + ', độ rộng ' + width + '): độ lệch chuẩn kích hoạt — N(0,0.01²): <b>' + f(last('small')) + '</b>, N(0,1): <b>' + f(last('one')) + '</b>, Xavier: <b>' + f(last('xavier')) + '</b>, He: <b>' + f(last('he')) + '</b>.' +
        '<br>Hệ số φ′ trung bình ở lớp cuối — N(0,1): <b>' + lastD('one').toFixed(2) + '</b>, He: <b>' + lastD('he').toFixed(2) + '</b>' +
        (act === 'tanh' ? ' (với tanh, φ′ nhỏ nghĩa là nhiều nơ-ron bão hòa: N(0,1) giữ độ lớn kích hoạt ≈ 1 nhưng gradient bị bóp nghẹt). ' : ' (với ReLU, φ′ là tỉ lệ nơ-ron đang bật). ') +
        'Gradient lan truyền ngược bị nhân với các hệ số này và với độ lớn trọng số ở mỗi lớp, nên cả hai cùng quyết định gradient triệt tiêu hay bùng nổ.'; v1.redraw(); v2.redraw();
    }
    update();
  });

  /* ================= 4. Reading training curves (schematic) ================= */
  Viz.register('curves1', function (root) {
    const T = 100, SC = {
      good: { name: 'Huấn luyện tốt', tr: t => 0.1 + 1.2 * Math.exp(-t / 18), va: t => 0.17 + 1.2 * Math.exp(-t / 18), dx: 'Cả hai đường giảm và hội tụ gần nhau, khoảng cách nhỏ và ổn định. Có thể dừng khi đường validation phẳng.', fx: 'Không cần sửa. Có thể thử mô hình lớn hơn nếu muốn giảm thêm mất mát.' },
      high: { name: 'Tốc độ học quá lớn', tr: t => 1.0 + 0.25 * Math.sin(t / 2.2) + 0.012 * t, va: t => 1.1 + 0.3 * Math.sin(t / 2.2 + 1) + 0.012 * t, dx: 'Mất mát dao động mạnh hoặc tăng; có thể xuất hiện NaN.', fx: 'Giảm tốc độ học 3–10 lần, dùng warm-up, cắt gradient, kiểm tra chuẩn hóa đầu vào.' },
      low: { name: 'Tốc độ học quá nhỏ', tr: t => 1.3 - 0.0035 * t, va: t => 1.32 - 0.0033 * t, dx: 'Mất mát giảm đều nhưng quá chậm; sau cả quá trình vẫn còn xa mục tiêu.', fx: 'Tăng tốc độ học (thử nhân 3), kiểm tra bộ lập lịch có làm giảm quá sớm không.' },
      over: { name: 'Overfitting', tr: t => 0.02 + 1.2 * Math.exp(-t / 12), va: t => 0.33 + 0.9 * Math.exp(-t / 10) + 0.0125 * Math.max(0, t - 30), dx: 'Train tiếp tục giảm còn validation đạt đáy rồi tăng: khoảng cách ngày càng lớn.', fx: 'Dừng sớm tại đáy validation, thêm dữ liệu/tăng cường, dropout, weight decay, mô hình nhỏ hơn.' },
      under: { name: 'Underfitting', tr: t => 0.8 + 0.5 * Math.exp(-t / 15), va: t => 0.85 + 0.5 * Math.exp(-t / 15), dx: 'Cả hai đường phẳng ở mức mất mát cao và gần nhau: mô hình không đủ khả năng hoặc đặc trưng nghèo.', fx: 'Mô hình lớn hơn, huấn luyện lâu hơn, giảm điều chuẩn, cải thiện đặc trưng/dữ liệu.' },
      bug: { name: 'Mạng không học (lỗi)', tr: t => 2.3026, va: t => 2.3026, dx: 'Mất mát đứng yên đúng ở ln C (ví dụ ln 10 ≈ 2.303): mạng đoán đều. Thường là lỗi chứ không phải vấn đề siêu tham số.', fx: 'Kiểm tra nhãn khớp dữ liệu, quên zero_grad/optimizer.step, đầu ra bị chặn bởi hàm kích hoạt, tốc độ học bằng 0, thử overfit một lô nhỏ.' }
    };
    let key = 'good'; const rng = Viz.rng(21);
    const noise = Array.from({ length: T }, () => (rng() - .5) * 0.04), noise2 = Array.from({ length: T }, () => (rng() - .5) * 0.05);
    const view = Viz.mount(root, {
      aspect: 0.45, label: 'Đường mất mát huấn luyện và validation minh họa',
      draw(ctx, W, H, c) {
        const S = SC[key], pad = { l: 40, r: 12, t: 22, b: 28 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, ymax = 2.6, sx = t => pad.l + t / (T - 1) * pw, sy = v => pad.t + ph - Math.min(ymax, Math.max(0, v)) / ymax * ph;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [0, 0.5, 1, 1.5, 2, 2.5].forEach(v => { ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(W - pad.r, sy(v)); ctx.stroke(); ctx.fillText(v.toFixed(1), pad.l - 5, sy(v)); });
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('epoch', pad.l + pw / 2, H - 14);
        [['tr', c.a, 'train', noise], ['va', c.b, 'validation', noise2]].forEach(([k, col, name, nz], idx) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); for (let t = 0; t < T; t++) { const v = S[k](t) + (key === 'bug' ? nz[t] * 0.1 : nz[t]); t ? ctx.lineTo(sx(t), sy(v)) : ctx.moveTo(sx(t), sy(v)); } ctx.stroke(); ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText('— ' + name, pad.l + 8 + idx * 80, 4); });
        ctx.strokeStyle = c.border; ctx.strokeRect(pad.l, pad.t, pw, ph);
      }
    });
    const r1 = U.row(root);
    U.select(r1, 'Tình huống', Object.keys(SC).map(k => [k, SC[k].name]), v => { key = v; update(); });
    const readout = U.out(root);
    function update() { const S = SC[key]; readout.innerHTML = '<b>Dấu hiệu:</b> ' + esc(S.dx) + '<br><b>Cách xử lý thường dùng:</b> ' + esc(S.fx) + '<br><span style="color:var(--muted)">Đây là đường cong dựng theo công thức để minh họa dạng thường gặp, không phải kết quả đo từ một mô hình thật.</span>'; view.redraw(); }
    update();
  });
})();
