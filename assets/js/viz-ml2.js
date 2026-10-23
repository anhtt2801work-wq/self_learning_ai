/* Deeper demos for the Machine Learning page: bias-variance, PCA, decision trees, k-means, model comparison.
   Needs Viz.poly from viz-ml.js. */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const fmt = (v, d = 3) => (Math.abs(v) >= 1e4 || (v !== 0 && Math.abs(v) < 1e-3)) ? v.toExponential(2) : v.toFixed(d);

  /* ---- shared helpers ---- */
  function frame(W, H, xr, yr, pad) {
    pad = pad || { l: 36, r: 12, t: 12, b: 26 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    return { pad, sx: x => pad.l + (x - xr[0]) / (xr[1] - xr[0]) * pw, sy: y => pad.t + ph - (y - yr[0]) / (yr[1] - yr[0]) * ph };
  }
  function grid(ctx, f, W, H, xt, yt, c, ylabel) {
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xt.forEach(x => { ctx.beginPath(); ctx.moveTo(f.sx(x), f.pad.t); ctx.lineTo(f.sx(x), H - f.pad.b); ctx.stroke(); ctx.fillText(String(x), f.sx(x), H - f.pad.b + 5); });
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    yt.forEach(y => { ctx.beginPath(); ctx.moveTo(f.pad.l, f.sy(y)); ctx.lineTo(W - f.pad.r, f.sy(y)); ctx.stroke(); ctx.fillText(ylabel ? ylabel(y) : String(y), f.pad.l - 5, f.sy(y)); });
    ctx.strokeStyle = c.border; ctx.strokeRect(f.pad.l, f.pad.t, W - f.pad.l - f.pad.r, H - f.pad.t - f.pad.b);
  }
  /* 2-D classification datasets in the unit square, classes 0/1 */
  function data2d(name, seed, n, noise) {
    const r = Viz.rng(seed * 131 + 17), pts = [], g = () => Viz.randn(r) * noise;
    const add = (x, y, c) => pts.push({ x: Math.min(.99, Math.max(.01, x + g())), y: Math.min(.99, Math.max(.01, y + g())), c });
    const h = n >> 1;
    if (name === 'blobs') { for (let i = 0; i < h; i++) add(.36 + Viz.randn(r) * .12, .4 + Viz.randn(r) * .12, 0); for (let i = 0; i < h; i++) add(.64 + Viz.randn(r) * .12, .6 + Viz.randn(r) * .12, 1); }
    else if (name === 'xor') { for (let i = 0; i < n; i++) { const x = r(), y = r(); add(x, y, (x > .5) === (y > .5) ? 0 : 1); } }
    else if (name === 'moons') { for (let i = 0; i < h; i++) { const a = r() * Math.PI; add(.4 + .25 * Math.cos(a), .5 - .25 * Math.sin(a) + .05, 0); } for (let i = 0; i < h; i++) { const a = r() * Math.PI; add(.6 - .25 * Math.cos(a), .5 + .25 * Math.sin(a) - .05, 1); } }
    else { for (let i = 0; i < h; i++) { const a = r() * 6.283, rad = r() * .17; add(.5 + rad * Math.cos(a), .5 + rad * Math.sin(a), 0); } for (let i = 0; i < h; i++) { const a = r() * 6.283, rad = .3 + r() * .12; add(.5 + rad * Math.cos(a), .5 + rad * Math.sin(a), 1); } }
    return pts;
  }
  const DATASETS = [['blobs', 'Hai cụm'], ['xor', 'XOR'], ['moons', 'Hai vầng trăng'], ['ring', 'Tâm và vành']];
  function paintProb(ctx, W, H, cell, c, prob) {
    const A = Viz.rgb(c.a), B = Viz.rgb(c.b);
    for (let px = 0; px < W; px += cell) for (let py = 0; py < H; py += cell) {
      const p = prob((px + cell / 2) / W, (py + cell / 2) / H), m = i => Math.round(A[i] * (1 - p) + B[i] * p);
      ctx.fillStyle = 'rgba(' + m(0) + ',' + m(1) + ',' + m(2) + ',0.38)'; ctx.fillRect(px, py, cell, cell);
    }
  }
  function paintPoints(ctx, W, H, c, pts, r) {
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x * W, p.y * H, r, 0, 7); ctx.fillStyle = p.c ? c.b : c.a; ctx.fill(); ctx.strokeStyle = c.bg; ctx.lineWidth = 1.2; ctx.stroke(); });
  }

  /* ---- decision tree (CART with Gini), used by tree1 and models1 ---- */
  const gini = (n0, n1) => { const t = n0 + n1; return t ? 1 - (n0 / t) ** 2 - (n1 / t) ** 2 : 0; };
  function buildTree(pts, depth, maxDepth, minLeaf, rng, randomFeature) {
    const n1 = pts.reduce((s, p) => s + p.c, 0), n0 = pts.length - n1;
    const leaf = { leaf: true, p: pts.length ? n1 / pts.length : .5, n: pts.length, n0, n1 };
    if (depth >= maxDepth || n0 === 0 || n1 === 0 || pts.length < 2 * minLeaf) return leaf;
    const parent = gini(n0, n1);
    let feats = ['x', 'y'];
    if (randomFeature) feats = rng() < .5 ? ['x', 'y'] : ['y', 'x'];          // try one random feature first, fall back to the other
    let best = null;
    for (const f of feats) {
      const s = pts.slice().sort((a, b) => a[f] - b[f]); let l0 = 0, l1 = 0;
      for (let i = 0; i < s.length - 1; i++) {
        s[i].c ? l1++ : l0++;
        if (s[i][f] === s[i + 1][f]) continue;
        const nl = i + 1, nr = s.length - nl; if (nl < minLeaf || nr < minLeaf) continue;
        const w = (nl * gini(l0, l1) + nr * gini(n0 - l0, n1 - l1)) / s.length;
        if (!best || w < best.w - 1e-12) best = { f, thr: (s[i][f] + s[i + 1][f]) / 2, w, gain: parent - w };
      }
      if (randomFeature && best) break;
    }
    if (!best || best.gain <= 1e-12) return leaf;
    const L = pts.filter(p => p[best.f] <= best.thr), R = pts.filter(p => p[best.f] > best.thr);
    return { leaf: false, f: best.f, thr: best.thr, gain: best.gain, n: pts.length, left: buildTree(L, depth + 1, maxDepth, minLeaf, rng, randomFeature), right: buildTree(R, depth + 1, maxDepth, minLeaf, rng, randomFeature) };
  }
  const treeP = (t, x, y) => { while (!t.leaf) t = (t.f === 'x' ? x : y) <= t.thr ? t.left : t.right; return t.p; };
  const countLeaves = t => t.leaf ? 1 : countLeaves(t.left) + countLeaves(t.right);
  const acc = (pts, pf) => pts.length ? pts.filter(p => (pf(p.x, p.y) >= .5 ? 1 : 0) === p.c).length / pts.length : 0;

  /* ================= 1. Bias-variance by simulation ================= */
  Viz.register('bv1', function (root) {
    const SD = 0.25, truth = x => Math.sin(2 * Math.PI * x), G = 60, grid60 = Array.from({ length: G }, (_, i) => i / (G - 1));
    let deg = 3, le = -9, N = 15;
    const lamOf = () => le <= -9 ? 0 : Math.pow(10, le);
    function sample(r) { const xs = [], ys = []; const rg = Viz.rng(r * 7919 + 13); for (let i = 0; i < N; i++) { const x = rg(); xs.push(x); ys.push(truth(x) + Viz.randn(rg) * SD); } return [xs, ys]; }
    function curves(d, R) { const lam = lamOf(), out = []; for (let r = 0; r < R; r++) { const [xs, ys] = sample(r); const w = Viz.poly.fit(xs, ys, d, lam); out.push(grid60.map(x => Viz.poly.eval(w, x))); } return out; }
    function stats(C) {
      let b2 = 0, v = 0; for (let g = 0; g < G; g++) { let m = 0; C.forEach(c => { m += c[g]; }); m /= C.length; let s = 0; C.forEach(c => { s += (c[g] - m) ** 2; }); v += s / C.length; b2 += (m - truth(grid60[g])) ** 2; }
      return { bias2: b2 / G, variance: v / G };
    }
    let cur = [], mean = [], st = { bias2: 0, variance: 0 }, byDeg = [];
    const main = Viz.mount(root, {
      aspect: 0.5, label: 'Nhiều đường cong khớp từ nhiều mẫu huấn luyện khác nhau',
      draw(ctx, W, H, c) {
        const f = frame(W, H, [0, 1], [-2, 2]); grid(ctx, f, W, H, [0, .25, .5, .75, 1], [-2, -1, 0, 1, 2], c);
        ctx.save(); ctx.beginPath(); ctx.rect(f.pad.l, f.pad.t, W - f.pad.l - f.pad.r, H - f.pad.t - f.pad.b); ctx.clip();
        ctx.strokeStyle = Viz.rgba(c.b, .22); ctx.lineWidth = 1.2;
        cur.slice(0, 40).forEach(cv => { ctx.beginPath(); grid60.forEach((x, i) => { i ? ctx.lineTo(f.sx(x), f.sy(cv[i])) : ctx.moveTo(f.sx(x), f.sy(cv[i])); }); ctx.stroke(); });
        ctx.strokeStyle = c.c; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); grid60.forEach((x, i) => { i ? ctx.lineTo(f.sx(x), f.sy(truth(x))) : ctx.moveTo(f.sx(x), f.sy(truth(x))); }); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = c.b; ctx.lineWidth = 3; ctx.beginPath(); grid60.forEach((x, i) => { i ? ctx.lineTo(f.sx(x), f.sy(mean[i])) : ctx.moveTo(f.sx(x), f.sy(mean[i])); }); ctx.stroke();
        ctx.restore(); ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = Viz.rgba(c.b, .8); ctx.fillText('mảnh = 40 mô hình huấn luyện từ 40 mẫu khác nhau', f.pad.l + 8, f.pad.t + 5);
        ctx.fillStyle = c.b; ctx.fillText('— trung bình của 200 mô hình', f.pad.l + 8, f.pad.t + 20); ctx.fillStyle = c.c; ctx.fillText('- - hàm thật', f.pad.l + 8, f.pad.t + 35);
      }
    });
    const dec = Viz.mount(root, {
      aspect: 0.3, minH: 160, label: 'Bias bình phương, phương sai và sai số tổng theo bậc đa thức',
      draw(ctx, W, H, c) {
        const f = frame(W, H, [0, 10], [-3.2, 3.2], { l: 40, r: 12, t: 12, b: 40 }); grid(ctx, f, W, H, [0, 2, 4, 6, 8, 10], [], c);
        ctx.fillStyle = c.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; [-3, -2, -1, 0, 1, 2, 3].forEach(e => { ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(f.pad.l, f.sy(e)); ctx.lineTo(W - f.pad.r, f.sy(e)); ctx.stroke(); ctx.fillText('1e' + e, f.pad.l - 4, f.sy(e)); });
        const lg = v => Math.min(3.2, Math.max(-3.2, Math.log10(Math.max(1e-9, v))));
        [['bias2', c.a, 'bias²'], ['variance', c.b, 'phương sai'], ['total', c.d, 'tổng = bias² + phương sai + σ²']].forEach(([k, col, name], idx) => {
          ctx.strokeStyle = col; ctx.lineWidth = k === 'total' ? 3 : 2; ctx.beginPath(); byDeg.forEach((e, d) => { d ? ctx.lineTo(f.sx(d), f.sy(lg(e[k]))) : ctx.moveTo(f.sx(d), f.sy(lg(e[k]))); }); ctx.stroke();
          ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('— ' + name, f.pad.l + 8 + idx * 90, f.pad.t + 2);
        });
        const e = byDeg[deg]; if (e) { ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(f.sx(deg), f.sy(lg(e.total)), 5.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.fillText('bậc đa thức (thang log)', W / 2, H - 16);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Bậc đa thức', 0, 10, 1, deg, String, v => { deg = v; update(); });
    U.slider(r1, 'Điều chuẩn L2 λ', -9, 1, 0.5, le, v => v <= -9 ? '0' : '10^' + v, v => { le = v; update(true); });
    U.slider(r1, 'Số mẫu huấn luyện N', 10, 60, 5, N, String, v => { N = v; update(true); });
    const readout = U.out(root);
    function update(all) {
      cur = curves(deg, 200); st = stats(cur); mean = grid60.map((_, g) => cur.reduce((s, c) => s + c[g], 0) / cur.length);
      if (all || !byDeg.length) byDeg = Array.from({ length: 11 }, (_, d) => { const s = stats(curves(d, 60)); return { ...s, total: s.bias2 + s.variance + SD * SD }; });
      readout.innerHTML = 'bậc <b>' + deg + '</b>: bias² = <b>' + fmt(st.bias2) + '</b> · phương sai = <b>' + fmt(st.variance) + '</b> · nhiễu σ² = ' + (SD * SD).toFixed(4) +
        ' → sai số kỳ vọng ≈ <b>' + fmt(st.bias2 + st.variance + SD * SD) + '</b>. Ước lượng từ 200 lần lấy mẫu lại (biểu đồ dưới dùng 60 lần cho mỗi bậc nên hơi nhiễu hơn).';
      main.redraw(); dec.redraw();
    }
    update(true);
  });

  /* ================= 2. PCA on a 2-D cloud ================= */
  Viz.register('pca1', function (root) {
    let ang = 35, s1 = 0.9, s2 = 0.3, seed = 3, proj = true, extra = [], base = [];
    const R = [-2, 2];
    function gen() { const r = Viz.rng(seed * 29 + 5), t = ang * Math.PI / 180, c = Math.cos(t), s = Math.sin(t); base = []; for (let i = 0; i < 150; i++) { const a = Viz.randn(r) * s1, b = Viz.randn(r) * s2; base.push({ x: a * c - b * s, y: a * s + b * c }); } }
    const pts = () => base.concat(extra);
    function pca() {
      const P = pts(), n = P.length, mx = P.reduce((s, p) => s + p.x, 0) / n, my = P.reduce((s, p) => s + p.y, 0) / n;
      let a = 0, b = 0, c = 0; P.forEach(p => { const dx = p.x - mx, dy = p.y - my; a += dx * dx; b += dx * dy; c += dy * dy; }); a /= n; b /= n; c /= n;
      const m = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b), l1 = m + d, l2 = Math.max(0, m - d), th = 0.5 * Math.atan2(2 * b, a - c);
      return { mx, my, l1, l2, th, e1: [Math.cos(th), Math.sin(th)], e2: [-Math.sin(th), Math.cos(th)] };
    }
    const view = Viz.mount(root, {
      aspect: 0.6, label: 'Đám mây điểm hai chiều và hai thành phần chính',
      draw(ctx, W, H, c) {
        const cx = W / 2, cy = H / 2, s = Math.min(W, H) / 4.2;
        const X = x => cx + x * s, Y = y => cy - y * s, p = pca();
        ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
        if (proj) { ctx.strokeStyle = Viz.rgba(c.b, .35); ctx.lineWidth = 1; pts().forEach(q => { const t = (q.x - p.mx) * p.e1[0] + (q.y - p.my) * p.e1[1]; ctx.beginPath(); ctx.moveTo(X(q.x), Y(q.y)); ctx.lineTo(X(p.mx + t * p.e1[0]), Y(p.my + t * p.e1[1])); ctx.stroke(); }); }
        pts().forEach((q, i) => { ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), i >= base.length ? 5.5 : 3.2, 0, 7); ctx.fillStyle = i >= base.length ? c.d : c.a; ctx.fill(); });
        if (proj) { ctx.fillStyle = c.b; pts().forEach(q => { const t = (q.x - p.mx) * p.e1[0] + (q.y - p.my) * p.e1[1]; ctx.beginPath(); ctx.arc(X(p.mx + t * p.e1[0]), Y(p.my + t * p.e1[1]), 2.2, 0, 7); ctx.fill(); }); }
        const arrow = (e, l, col, name) => { const L = 2 * Math.sqrt(l), x1 = X(p.mx + e[0] * L), y1 = Y(p.my + e[1] * L), x0 = X(p.mx - e[0] * L), y0 = Y(p.my - e[1] * L); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.fillStyle = col; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(name, x1 + 4, y1 - 3); };
        arrow(p.e2, p.l2, c.c, 'PC2'); arrow(p.e1, p.l1, c.b, 'PC1');
        ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(X(p.mx), Y(p.my), 4, 0, 7); ctx.fill();
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('bấm vào đồ thị để thêm điểm ngoại lai (tím)', 8, 6);
      }
    });
    view.cv.addEventListener('click', ev => { const q = Viz.pos(ev, view.cv), s = Math.min(view.W, view.H) / 4.2; extra.push({ x: (q.x - view.W / 2) / s, y: -(q.y - view.H / 2) / s }); update(); });
    const r1 = U.row(root);
    U.slider(r1, 'Góc xoay của đám mây (°)', 0, 180, 5, ang, String, v => { ang = v; gen(); update(); });
    U.slider(r1, 'σ dọc trục dài', 0.3, 1.2, 0.05, s1, v => v.toFixed(2), v => { s1 = v; gen(); update(); });
    U.slider(r1, 'σ dọc trục ngắn', 0.05, 1.2, 0.05, s2, v => v.toFixed(2), v => { s2 = v; gen(); update(); });
    const r2 = U.row(root);
    U.check(r2, 'Chiếu các điểm lên PC1', proj, v => { proj = v; update(); });
    U.button(r2, 'Thêm 3 điểm ngoại lai', () => { for (let i = 0; i < 3; i++) extra.push({ x: 1.0 + i * 0.05, y: 1.9 - i * 0.05 }); update(); });
    U.button(r2, 'Xóa ngoại lai / lấy mẫu mới', () => { extra = []; seed++; gen(); update(); });
    const readout = U.out(root);
    function update() {
      const p = pca(), tot = p.l1 + p.l2, saved = extra; extra = []; const p0 = pca(); extra = saved;
      const dAng = Math.abs(((p.th - p0.th) * 180 / Math.PI + 90) % 180 - 90);
      readout.innerHTML = 'λ₁ = <b>' + p.l1.toFixed(3) + '</b>, λ₂ = <b>' + p.l2.toFixed(3) + '</b> · tỉ lệ phương sai giải thích bởi PC1 = <b>' + (100 * p.l1 / tot).toFixed(1) + '%</b> · ' +
        'sai số tái tạo khi giữ PC1 (trung bình bình phương khoảng cách tới đường PC1) = <b>' + p.l2.toFixed(3) + '</b> = λ₂ · hướng PC1 ≈ ' + ((p.th * 180 / Math.PI + 360) % 180).toFixed(0) + '°' +
        (extra.length ? ' · <b>có ' + extra.length + ' ngoại lai</b>: so với lúc chưa có, PC1 xoay ' + dAng.toFixed(1) + '°, λ₂ đổi từ ' + p0.l2.toFixed(3) + ' thành ' + p.l2.toFixed(3) : '');
      view.redraw();
    }
    gen(); update();
  });

  /* ================= 3. Decision tree partitions ================= */
  Viz.register('tree1', function (root) {
    let ds = 'moons', noise = 0.05, depth = 3, minLeaf = 2, seed = 2, train = [], test = [], tree = null;
    function gen() { train = data2d(ds, seed, 120, noise); test = data2d(ds, seed + 500, 200, noise); tree = buildTree(train, 0, depth, minLeaf, Math.random, false); }
    gen();
    const view = Viz.mount(root, {
      aspect: 0.62, label: 'Cây quyết định chia mặt phẳng thành các hình chữ nhật',
      draw(ctx, W, H, c) {
        paintProb(ctx, W, H, 6, c, (x, y) => treeP(tree, x, y));
        (function walk(t, x0, y0, x1, y1) {
          if (t.leaf) return; ctx.strokeStyle = c.fg; ctx.lineWidth = 1.3;
          ctx.beginPath(); if (t.f === 'x') { ctx.moveTo(t.thr * W, y0 * H); ctx.lineTo(t.thr * W, y1 * H); walk(t.left, x0, y0, t.thr, y1); walk(t.right, t.thr, y0, x1, y1); } else { ctx.moveTo(x0 * W, t.thr * H); ctx.lineTo(x1 * W, t.thr * H); walk(t.left, x0, y0, x1, t.thr); walk(t.right, x0, t.thr, x1, y1); } ctx.stroke();
        })(tree, 0, 0, 1, 1);
        paintPoints(ctx, W, H, c, train, 3.8);
      }
    });
    const r1 = U.row(root);
    U.select(r1, 'Dữ liệu', DATASETS, v => { ds = v; gen(); update(); });
    U.slider(r1, 'Nhiễu', 0, 0.15, 0.01, noise, v => v.toFixed(2), v => { noise = v; gen(); update(); });
    U.button(r1, 'Mẫu mới', () => { seed++; gen(); update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Độ sâu tối đa', 1, 10, 1, depth, String, v => { depth = v; gen(); update(); });
    U.slider(r2, 'Số mẫu tối thiểu mỗi lá', 1, 15, 1, minLeaf, String, v => { minLeaf = v; gen(); update(); });
    const readout = U.out(root);
    function list(t, d, out) { if (t.leaf || d > 2 || out.length >= 4) return out; out.push((t.f === 'x' ? 'x₁' : 'x₂') + ' ≤ ' + t.thr.toFixed(2) + ' (giảm Gini ' + t.gain.toFixed(3) + ', ' + t.n + ' mẫu)'); list(t.left, d + 1, out); list(t.right, d + 1, out); return out; }
    function update() {
      const a = acc(train, (x, y) => treeP(tree, x, y)), b = acc(test, (x, y) => treeP(tree, x, y));
      readout.innerHTML = 'số lá = <b>' + countLeaves(tree) + '</b> · độ chính xác train = <b>' + (100 * a).toFixed(0) + '%</b>, test (200 điểm mới) = <b>' + (100 * b).toFixed(0) + '%</b>' + (a - b > .08 ? ' · khoảng cách lớn là dấu hiệu overfitting' : '') +
        '<br>Các phép chia đầu: ' + (list(tree, 0, []).join(' · ') || 'không chia được'); view.redraw();
    }
    update();
  });

  /* ================= 4. k-means step by step ================= */
  Viz.register('kmeans1', function (root) {
    let k = 3, init = 'random', seed = 4, pts = [], cents = [], assign = [], phase = 'assign', iters = 0, history = [], elbow = [], done = false;
    const hue = i => 'hsl(' + ((i * 67 + 210) % 360) + ',68%,52%)';
    function genData() { const r = Viz.rng(seed * 19 + 3), cs = [[.25, .3], [.7, .28], [.5, .75]]; pts = []; cs.forEach(([cx, cy]) => { for (let i = 0; i < 40; i++) pts.push({ x: Math.min(.98, Math.max(.02, cx + Viz.randn(r) * .08)), y: Math.min(.98, Math.max(.02, cy + Viz.randn(r) * .08)) }); }); for (let i = 0; i < 6; i++) pts.push({ x: r(), y: r() }); }
    const d2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
    function initCents(kk, mode, rng) {
      if (mode === 'random') { const idx = new Set(); while (idx.size < kk) idx.add(Math.floor(rng() * pts.length)); return [...idx].map(i => ({ x: pts[i].x, y: pts[i].y })); }
      const c = [{ ...pts[Math.floor(rng() * pts.length)] }];
      while (c.length < kk) { const dd = pts.map(p => Math.min(...c.map(q => d2(p, q)))), tot = dd.reduce((a, b) => a + b, 0); let t = rng() * tot, i = 0; for (; i < dd.length - 1; i++) { t -= dd[i]; if (t <= 0) break; } c.push({ x: pts[i].x, y: pts[i].y }); }
      return c;
    }
    const inertia = (cs, as) => pts.reduce((s, p, i) => s + d2(p, cs[as[i]]), 0);
    const assignAll = cs => pts.map(p => { let b = 0, bd = Infinity; cs.forEach((q, j) => { const d = d2(p, q); if (d < bd) { bd = d; b = j; } }); return b; });
    function updateCents(cs, as) { return cs.map((q, j) => { let sx = 0, sy = 0, n = 0; pts.forEach((p, i) => { if (as[i] === j) { sx += p.x; sy += p.y; n++; } }); return n ? { x: sx / n, y: sy / n } : q; }); }
    function fullRun(kk, mode, rng) { let cs = initCents(kk, mode, rng), as = assignAll(cs); for (let it = 0; it < 100; it++) { const nc = updateCents(cs, as), na = assignAll(nc); const same = na.every((v, i) => v === as[i]); cs = nc; as = na; if (same) break; } return inertia(cs, as); }
    function computeElbow() { const rng = Viz.rng(seed * 7 + 1); elbow = []; for (let kk = 1; kk <= 8; kk++) { let best = Infinity; for (let t = 0; t < 8; t++) best = Math.min(best, fullRun(kk, 'pp', rng)); elbow.push(best); } }
    function reset(newSeed) { const rng = Viz.rng((newSeed || seed) * 101 + Math.floor(Math.random() * 1e6)); cents = initCents(k, init === 'random' ? 'random' : 'pp', rng); assign = pts.map(() => -1); phase = 'assign'; iters = 0; history = []; done = false; }
    const split = el('div', 'viz-split'); root.appendChild(split);
    const cl = el('div'), cr = el('div'); split.appendChild(cl); split.appendChild(cr);
    const view = Viz.mount(cl, {
      aspect: 0.85, label: 'Các điểm được tô màu theo cụm và vị trí các tâm cụm',
      draw(ctx, W, H, c) {
        pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 3.8, 0, 7); ctx.fillStyle = assign[i] >= 0 ? hue(assign[i]) : c.muted; ctx.fill(); });
        cents.forEach((q, j) => { const x = q.x * W, y = q.y * H; ctx.lineWidth = 5; ctx.strokeStyle = c.bg; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.moveTo(x - 9, y + 9); ctx.lineTo(x + 9, y - 9); ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = hue(j); ctx.stroke(); });
      }
    });
    const elb = Viz.mount(cr, {
      aspect: 0.85, label: 'Đồ thị khuỷu tay: tổng bình phương khoảng cách theo k',
      draw(ctx, W, H, c) {
        const mx = Math.max(...elbow), f = frame(W, H, [1, 8], [0, mx * 1.05], { l: 46, r: 12, t: 22, b: 36 }); grid(ctx, f, W, H, [1, 2, 3, 4, 5, 6, 7, 8], [0, mx / 2, mx], c, v => v.toFixed(1));
        ctx.strokeStyle = c.b; ctx.lineWidth = 2.5; ctx.beginPath(); elbow.forEach((v, i) => { i ? ctx.lineTo(f.sx(i + 1), f.sy(v)) : ctx.moveTo(f.sx(i + 1), f.sy(v)); }); ctx.stroke();
        ctx.fillStyle = c.b; elbow.forEach((v, i) => { ctx.beginPath(); ctx.arc(f.sx(i + 1), f.sy(v), i + 1 === k ? 6 : 3, 0, 7); ctx.fill(); });
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('k (số cụm)', W / 2, H - 16); ctx.textAlign = 'left'; ctx.fillText('tổng bình phương khoảng cách (tốt nhất / 8 lần)', f.pad.l, 4);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Số cụm k', 1, 8, 1, k, String, v => { k = v; reset(); update(); });
    U.select(r1, 'Khởi tạo', [['random', 'Chọn ngẫu nhiên k điểm'], ['pp', 'k-means++']], v => { init = v; reset(); update(); });
    const r2 = U.row(root);
    U.button(r2, 'Một bước (gán ⇄ cập nhật)', () => { step(); update(); }, true);
    U.button(r2, 'Chạy tới hội tụ', () => { let g = 0; while (!done && g++ < 60) step(); update(); });
    U.button(r2, 'Khởi tạo lại', () => { reset(); update(); });
    U.button(r2, 'Dữ liệu mới', () => { seed++; genData(); computeElbow(); reset(); update(); });
    const readout = U.out(root);
    function step() {
      if (done) return;
      if (phase === 'assign') { const na = assignAll(cents), same = assign.every((v, i) => v === na[i]); assign = na; history.push(inertia(cents, assign)); if (same) done = true; phase = 'update'; }
      else { cents = updateCents(cents, assign); phase = 'assign'; iters++; }
    }
    function update() {
      const cur = assign[0] >= 0 ? inertia(cents, assign) : null, best = elbow[k - 1];
      readout.innerHTML = 'bước kế tiếp: <b>' + (done ? 'đã hội tụ (phép gán không đổi)' : phase === 'assign' ? 'gán mỗi điểm cho tâm gần nhất' : 'dời mỗi tâm về trung bình cụm') + '</b> · số vòng = ' + iters +
        (cur != null ? ' · tổng bình phương khoảng cách hiện tại = <b>' + cur.toFixed(3) + '</b>' : '') + ' · tốt nhất tìm được cho k = ' + k + ': ' + best.toFixed(3) +
        (done && cur != null && cur > best * 1.15 ? ' · <b>kẹt ở cực tiểu cục bộ</b> (kém hơn nghiệm tốt nhất rõ rệt): thử khởi tạo lại hoặc dùng k-means++' : '') +
        (history.length > 1 ? '<br>Giá trị mục tiêu sau mỗi lần gán (không bao giờ tăng): ' + history.map(v => v.toFixed(2)).join(' → ') : '');
      view.redraw(); elb.redraw();
    }
    genData(); computeElbow(); reset(); update();
  });

  /* ================= 5. Four models side by side ================= */
  Viz.register('models1', function (root) {
    let ds = 'moons', noise = 0.06, seed = 3, kNN = 5, depth = 4, deg = 3, train = [], test = [], M = {};
    const STD = (x, y) => [(x - .5) * 3.2, (y - .5) * 3.2];
    function polyFeat(x, y, d) { const [u, v] = STD(x, y), f = []; for (let a = 0; a <= d; a++) for (let b = 0; a + b <= d; b++) if (a + b > 0) f.push(u ** a * v ** b); return f; }
    function trainLogistic() {
      const X = train.map(p => polyFeat(p.x, p.y, deg)), m = X[0].length, w = new Array(m).fill(0); let b = 0; const mw = new Array(m).fill(0), vw = new Array(m).fill(0); let mb = 0, vb = 0;
      for (let t = 1; t <= 500; t++) {
        const g = new Array(m).fill(0); let gb = 0;
        X.forEach((x, i) => { let z = b; for (let j = 0; j < m; j++) z += w[j] * x[j]; const e = 1 / (1 + Math.exp(-z)) - train[i].c; for (let j = 0; j < m; j++) g[j] += e * x[j]; gb += e; });
        for (let j = 0; j < m; j++) { const gj = g[j] / X.length + 1e-3 * w[j]; mw[j] = .9 * mw[j] + .1 * gj; vw[j] = .999 * vw[j] + .001 * gj * gj; w[j] -= .05 * (mw[j] / (1 - .9 ** t)) / (Math.sqrt(vw[j] / (1 - .999 ** t)) + 1e-8); }
        const gB = gb / X.length; mb = .9 * mb + .1 * gB; vb = .999 * vb + .001 * gB * gB; b -= .05 * (mb / (1 - .9 ** t)) / (Math.sqrt(vb / (1 - .999 ** t)) + 1e-8);
      }
      return (x, y) => { const f = polyFeat(x, y, deg); let z = b; for (let j = 0; j < m; j++) z += w[j] * f[j]; return 1 / (1 + Math.exp(-z)); };
    }
    function knn() { return (x, y) => { const d = train.map(p => [(p.x - x) ** 2 + (p.y - y) ** 2, p.c]).sort((a, b) => a[0] - b[0]); let s = 0; for (let i = 0; i < kNN; i++) s += d[i][1]; return s / kNN; }; }
    function forest() {
      const rng = Viz.rng(seed * 3 + 11), trees = []; for (let t = 0; t < 25; t++) { const bs = train.map(() => train[Math.floor(rng() * train.length)]); trees.push(buildTree(bs, 0, depth, 1, rng, true)); }
      return (x, y) => trees.reduce((s, t) => s + treeP(t, x, y), 0) / trees.length;
    }
    function fitAll() {
      train = data2d(ds, seed, 120, noise); test = data2d(ds, seed + 900, 300, noise);
      const t1 = buildTree(train, 0, depth, 1, Math.random, false);
      M = { lr: trainLogistic(), knn: knn(), tree: (x, y) => treeP(t1, x, y), rf: forest() };
    }
    fitAll();
    const names = [['lr', 'Hồi quy logistic + đặc trưng đa thức'], ['knn', 'k láng giềng gần nhất'], ['tree', 'Một cây quyết định'], ['rf', 'Rừng ngẫu nhiên (25 cây)']];
    const box = el('div', 'viz-split even'); root.appendChild(box);
    const views = names.map(([key, title]) => { const cell = el('div'); const cap = el('div', 'viz-help', title); cap.style.padding = '0 0 4px'; cell.appendChild(cap); box.appendChild(cell); return { key, cap, title, v: Viz.mount(cell, { aspect: 0.8, label: title, draw(ctx, W, H, c) { paintProb(ctx, W, H, 7, c, M[key]); paintPoints(ctx, W, H, c, train, 3); } }) }; });
    const r1 = U.row(root);
    U.select(r1, 'Dữ liệu', DATASETS, v => { ds = v; update(); });
    U.slider(r1, 'Nhiễu', 0, 0.15, 0.01, noise, v => v.toFixed(2), v => { noise = v; update(); });
    U.button(r1, 'Mẫu mới', () => { seed++; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Bậc đa thức (logistic)', 1, 6, 1, deg, String, v => { deg = v; update(); });
    U.slider(r2, 'k (k-NN)', 1, 25, 2, kNN, String, v => { kNN = v; update(); });
    U.slider(r2, 'Độ sâu (cây, rừng)', 1, 12, 1, depth, String, v => { depth = v; update(); });
    const readout = U.out(root);
    function update() {
      fitAll();
      views.forEach(({ key, cap, title, v }) => { cap.textContent = title + ' · train ' + (100 * acc(train, M[key])).toFixed(0) + '% · test ' + (100 * acc(test, M[key])).toFixed(0) + '%'; v.redraw(); });
      readout.innerHTML = 'Mỗi ô tô nền theo xác suất lớp cam mà mô hình dự đoán. Hãy so khoảng cách giữa độ chính xác train và test, và hình dạng ranh giới: đường cong trơn (logistic bậc thấp), răng cưa theo trục (cây), và rừng làm trơn ranh giới của cây.';
    }
    update();
  });
})();
