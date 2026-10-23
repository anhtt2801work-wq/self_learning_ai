/* Interactive demos for the Machine Learning page */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const fmt = (v, d = 3) => (Math.abs(v) >= 1e6 || (v !== 0 && Math.abs(v) < 1e-4)) ? v.toExponential(2) : v.toFixed(d);

  /* Shared least-squares polynomial fit (ridge on all but the intercept) on t = 2x - 1 for x in [0, 1].
     Also used by the bias-variance demo in viz-ml2.js. */
  Viz.poly = {
    fit(xs, ys, d, lam) {
      const m = d + 1, n = xs.length, A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
      for (let k = 0; k < n; k++) {
        const t = 2 * xs[k] - 1, p = []; for (let j = 0; j < m; j++) p.push(t ** j);
        for (let i = 0; i < m; i++) { b[i] += p[i] * ys[k]; for (let j = 0; j < m; j++) A[i][j] += p[i] * p[j]; }
      }
      for (let i = 0; i < m; i++) A[i][i] += (i ? lam : 0) + 1e-12;
      for (let i = 0; i < m; i++) {                          // Gaussian elimination with partial pivoting
        let q = i; for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[q][i])) q = r;
        [A[i], A[q]] = [A[q], A[i]]; [b[i], b[q]] = [b[q], b[i]];
        for (let r = i + 1; r < m; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < m; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
      }
      const w = new Array(m).fill(0);
      for (let i = m - 1; i >= 0; i--) { let v = b[i]; for (let c = i + 1; c < m; c++) v -= A[i][c] * w[c]; w[i] = v / A[i][i]; }
      return w;
    },
    eval(w, x) { const t = 2 * x - 1; let s = 0; for (let j = w.length - 1; j >= 0; j--) s = s * t + w[j]; return s; }
  };

  /* Shared helper: map data ranges to canvas pixels */
  function frame(W, H, xr, yr, pad) {
    pad = pad || { l: 36, r: 12, t: 12, b: 26 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    return {
      pad,
      sx: x => pad.l + (x - xr[0]) / (xr[1] - xr[0]) * pw,
      sy: y => pad.t + ph - (y - yr[0]) / (yr[1] - yr[0]) * ph,
      ix: px => xr[0] + (px - pad.l) / pw * (xr[1] - xr[0]),
      iy: py => yr[0] + (pad.t + ph - py) / ph * (yr[1] - yr[0])
    };
  }
  function axes(ctx, f, W, H, xr, yr, xt, yt, c) {
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xt.forEach(x => { const px = f.sx(x); ctx.beginPath(); ctx.moveTo(px, f.pad.t); ctx.lineTo(px, H - f.pad.b); ctx.stroke(); ctx.fillText(String(x), px, H - f.pad.b + 5); });
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    yt.forEach(y => { const py = f.sy(y); ctx.beginPath(); ctx.moveTo(f.pad.l, py); ctx.lineTo(W - f.pad.r, py); ctx.stroke(); ctx.fillText(String(y), f.pad.l - 6, py); });
    ctx.strokeStyle = c.border;
    ctx.strokeRect(f.pad.l, f.pad.t, W - f.pad.l - f.pad.r, H - f.pad.t - f.pad.b);
  }

  /* ---------- 1. Gradient descent on a 1-D function ---------- */
  Viz.register('gd1', function (root) {
    const FUNCS = {
      parab: { f: w => (w - 2) * (w - 2), g: w => 2 * (w - 2), xr: [-1, 6], yr: [-1, 18], start: 5, xt: [0, 2, 4, 6], yt: [0, 5, 10, 15] },
      quart: { f: w => 0.25 * w ** 4 - w * w + 0.3 * w, g: w => w ** 3 - 2 * w + 0.3, xr: [-2.5, 2.5], yr: [-2, 5], start: 2.2, xt: [-2, -1, 0, 1, 2], yt: [-2, 0, 2, 4] }
    };
    let key = 'parab', fn = FUNCS[key], w = fn.start, path = [w], lr = 0.1, timer = null, steps = 0;

    const view = Viz.mount(root, {
      aspect: 0.5, label: 'Đồ thị hàm mất mát và quỹ đạo gradient descent',
      draw(ctx, W, H, c) {
        const f = frame(W, H, fn.xr, fn.yr);
        axes(ctx, f, W, H, fn.xr, fn.yr, fn.xt, fn.yt, c);
        ctx.beginPath(); ctx.strokeStyle = c.a; ctx.lineWidth = 2.5;
        for (let i = 0; i <= 240; i++) {
          const x = fn.xr[0] + (fn.xr[1] - fn.xr[0]) * i / 240, y = Math.min(fn.f(x), fn.yr[1] * 3);
          i ? ctx.lineTo(f.sx(x), f.sy(y)) : ctx.moveTo(f.sx(x), f.sy(y));
        }
        ctx.stroke();
        const inView = p => isFinite(p) && p >= fn.xr[0] && p <= fn.xr[1] && fn.f(p) <= fn.yr[1];
        ctx.strokeStyle = c.b; ctx.fillStyle = c.b; ctx.lineWidth = 1.5;
        for (let i = 0; i < path.length; i++) {
          if (!inView(path[i])) continue;
          const px = f.sx(path[i]), py = f.sy(fn.f(path[i]));
          if (i > 0 && inView(path[i - 1])) {
            ctx.beginPath(); ctx.moveTo(f.sx(path[i - 1]), f.sy(fn.f(path[i - 1]))); ctx.lineTo(px, py); ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(px, py, i === path.length - 1 ? 6 : 3, 0, 7); ctx.fill();
        }
        ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('trục ngang: tham số w · trục dọc: mất mát f(w) · bấm vào đồ thị để chọn điểm xuất phát', f.pad.l + 6, f.pad.t + 4);
      }
    });
    view.cv.addEventListener('click', ev => {
      const p = Viz.pos(ev, view.cv), f = frame(view.W, view.H, fn.xr, fn.yr);
      stop(); w = Math.min(fn.xr[1], Math.max(fn.xr[0], f.ix(p.x))); path = [w]; steps = 0; update();
    });

    const r1 = U.row(root);
    U.select(r1, 'Hàm', [['parab', 'Parabol (w − 2)²'], ['quart', 'Hai đáy: w⁴/4 − w² + 0.3w']], v => { stop(); key = v; fn = FUNCS[v]; reset(); });
    U.slider(r1, 'Tốc độ học η', 0.01, 1.1, 0.01, lr, v => v.toFixed(2), v => { lr = v; update(); });
    const r2 = U.row(root);
    U.button(r2, 'Một bước', () => { stop(); step(); }, true);
    const runBtn = U.button(r2, 'Chạy tự động', () => (timer ? stop() : run()));
    U.button(r2, 'Đặt lại', () => { stop(); reset(); });
    const readout = U.out(root);

    function reset() { w = fn.start; path = [w]; steps = 0; update(); }
    function step() {
      if (!isFinite(w) || Math.abs(w) > 1e6) return false;
      w = w - lr * fn.g(w); steps++; path.push(w); update(); return true;
    }
    function run() {
      runBtn.textContent = 'Dừng';
      timer = setInterval(() => {
        const done = Math.abs(fn.g(w)) < 1e-4 || steps >= 150 || !isFinite(w) || Math.abs(w) > 1e6;
        if (done) stop(); else step();
      }, 120);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; runBtn.textContent = 'Chạy tự động'; }
    function update() {
      const g = fn.g(w), diverged = !isFinite(w) || Math.abs(w) > 1e6;
      let note = '';
      if (diverged) note = ' → <b>phân kỳ</b> (η quá lớn)';
      else if (Math.abs(g) < 1e-3) note = ' → <b>đã hội tụ</b>';
      else if (key === 'parab') {
        const r = Math.abs(1 - 2 * lr);
        note = ' · hệ số co |1 − 2η| = ' + r.toFixed(2) + (r >= 1 ? ' (≥ 1: không hội tụ)' : lr > 0.5 ? ' (dao động quanh đáy)' : '');
      }
      readout.innerHTML = 'bước <b>' + steps + '</b> · w = <b>' + (diverged ? '∞' : fmt(w)) + '</b> · f(w) = <b>' + (diverged ? '∞' : fmt(fn.f(w))) +
        '</b> · f′(w) = <b>' + (diverged ? '∞' : fmt(g)) + '</b>' + note;
      view.redraw();
    }
    update();
  });

  /* ---------- 2. Linear regression trained by gradient descent ---------- */
  Viz.register('reg1', function (root) {
    const XR = [0, 10], YR = [0, 10];
    let pts = [], w = 0, b = 0, lr = 0.01, norm = false, hist = [], timer = null, steps = 0, showRes = true, showOls = false, diverged = false, seed = 7;
    function gen() {
      const rng = Viz.rng(seed); pts = [];
      for (let i = 0; i < 20; i++) { const x = 0.5 + rng() * 9; pts.push({ x, y: Math.min(9.8, Math.max(0.2, 0.7 * x + 2 + Viz.randn(rng) * 0.9)) }); }
      resetParams();
    }
    function stats() {
      const n = pts.length, mx = pts.reduce((s, p) => s + p.x, 0) / n;
      const sd = Math.sqrt(pts.reduce((s, p) => s + (p.x - mx) ** 2, 0) / n) || 1;
      return { n, mx, sd };
    }
    const Z = (x, s) => norm ? (x - s.mx) / s.sd : x;
    function rawLine() { const s = stats(); return norm ? { a: w / s.sd, c: b - w * s.mx / s.sd } : { a: w, c: b }; }
    function loss() { const s = stats(); return pts.reduce((t, p) => t + (w * Z(p.x, s) + b - p.y) ** 2, 0) / s.n; }
    function ols() {
      const s = stats(), my = pts.reduce((t, p) => t + p.y, 0) / s.n;
      const sxx = pts.reduce((t, p) => t + (p.x - s.mx) ** 2, 0), sxy = pts.reduce((t, p) => t + (p.x - s.mx) * (p.y - my), 0);
      const a = sxx ? sxy / sxx : 0, c = my - a * s.mx;
      return { a, c, mse: pts.reduce((t, p) => t + (a * p.x + c - p.y) ** 2, 0) / s.n };
    }
    function resetParams() { w = 0; b = 0; hist = [loss()]; steps = 0; diverged = false; }

    const view = Viz.mount(root, {
      aspect: 0.55, label: 'Các điểm dữ liệu và đường hồi quy tuyến tính',
      draw(ctx, W, H, c) {
        const f = frame(W, H, XR, YR);
        axes(ctx, f, W, H, XR, YR, [0, 2, 4, 6, 8, 10], [0, 2, 4, 6, 8, 10], c);
        ctx.save(); ctx.beginPath(); ctx.rect(f.pad.l, f.pad.t, W - f.pad.l - f.pad.r, H - f.pad.t - f.pad.b); ctx.clip();
        const line = (L, color, dash) => {
          ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(dash || []);
          ctx.moveTo(f.sx(XR[0]), f.sy(L.a * XR[0] + L.c)); ctx.lineTo(f.sx(XR[1]), f.sy(L.a * XR[1] + L.c)); ctx.stroke(); ctx.setLineDash([]);
        };
        const L = rawLine();
        if (showRes && !diverged) {
          ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
          pts.forEach(p => { ctx.beginPath(); ctx.moveTo(f.sx(p.x), f.sy(p.y)); ctx.lineTo(f.sx(p.x), f.sy(L.a * p.x + L.c)); ctx.stroke(); });
        }
        if (showOls && pts.length > 1) line(ols(), c.c, [6, 5]);
        if (!diverged) line(L, c.b);
        ctx.fillStyle = c.a;
        pts.forEach(p => { ctx.beginPath(); ctx.arc(f.sx(p.x), f.sy(p.y), 4.5, 0, 7); ctx.fill(); });
        ctx.restore();
        // inset: loss history on log scale
        const iw = Math.min(170, W * 0.38), ih = 70, ix = W - f.pad.r - iw - 8, iy = H - f.pad.b - ih - 8;
        ctx.fillStyle = c.bg; ctx.globalAlpha = .92; ctx.fillRect(ix, iy, iw, ih); ctx.globalAlpha = 1;
        ctx.strokeStyle = c.border; ctx.strokeRect(ix, iy, iw, ih);
        ctx.fillStyle = c.muted; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('mất mát (thang log) theo bước', ix + 4, iy + 3);
        if (hist.length > 1) {
          const lo = -2, hi = 3; ctx.beginPath(); ctx.strokeStyle = c.b; ctx.lineWidth = 1.5;
          const m = hist.length, stride = Math.max(1, Math.floor(m / 150));
          let first = true;
          for (let i = 0; i < m; i += stride) {
            const v = Math.log10(Math.max(1e-9, hist[i])), t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
            const px = ix + 4 + (i / (m - 1)) * (iw - 8), py = iy + ih - 4 - t * (ih - 22);
            first ? ctx.moveTo(px, py) : ctx.lineTo(px, py); first = false;
          }
          ctx.stroke();
        }
      }
    });
    view.cv.addEventListener('click', ev => {
      const p = Viz.pos(ev, view.cv), f = frame(view.W, view.H, XR, YR);
      const x = f.ix(p.x), y = f.iy(p.y);
      if (x < XR[0] || x > XR[1] || y < YR[0] || y > YR[1]) return;
      pts.push({ x, y }); stop(); resetParams(); update();
    });

    const r1 = U.row(root);
    U.slider(r1, 'Tốc độ học η', 0.001, 0.05, 0.001, lr, v => v.toFixed(3), v => { lr = v; });
    U.check(r1, 'Chuẩn hóa x (z-score)', norm, v => { norm = v; stop(); resetParams(); update(); });
    U.check(r1, 'Vẽ phần dư', showRes, v => { showRes = v; view.redraw(); });
    U.check(r1, 'So với nghiệm đóng (OLS)', showOls, v => { showOls = v; update(); });
    const r2 = U.row(root);
    U.button(r2, 'Một bước', () => { stop(); iterate(1); }, true);
    const runBtn = U.button(r2, 'Chạy tự động', () => (timer ? stop() : run()));
    U.button(r2, 'Đặt lại tham số', () => { stop(); resetParams(); update(); });
    U.button(r2, 'Dữ liệu mới', () => { stop(); seed++; gen(); update(); });
    U.button(r2, 'Xóa hết điểm', () => { stop(); pts = []; resetParams(); update(); });
    const readout = U.out(root);

    function iterate(k) {
      if (pts.length < 2 || diverged) return;
      const s = stats();
      for (let t = 0; t < k; t++) {
        let gw = 0, gb = 0;
        for (const p of pts) { const z = Z(p.x, s), e = w * z + b - p.y; gw += e * z; gb += e; }
        w -= lr * 2 * gw / s.n; b -= lr * 2 * gb / s.n; steps++;
        if (!isFinite(w) || !isFinite(b) || Math.abs(w) > 1e8) { diverged = true; break; }
        hist.push(loss());
      }
      update();
    }
    function run() {
      runBtn.textContent = 'Dừng';
      timer = setInterval(() => {
        const n = hist.length;
        if (diverged || steps >= 20000 || (n > 3 && Math.abs(hist[n - 1] - hist[n - 2]) < 1e-10)) { stop(); return; }
        iterate(8);
      }, 30);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; runBtn.textContent = 'Chạy tự động'; }
    function update() {
      if (pts.length < 2) { readout.textContent = 'Cần ít nhất 2 điểm. Bấm vào đồ thị để thêm điểm.'; view.redraw(); return; }
      if (diverged) { readout.innerHTML = '<b>Phân kỳ</b>: η quá lớn so với thang đo của x. Hãy giảm η hoặc bật “Chuẩn hóa x”.'; view.redraw(); return; }
      const L = rawLine(), o = ols();
      readout.innerHTML = 'bước <b>' + steps + '</b> · ŷ = <b>' + fmt(L.a) + '</b>·x + <b>' + fmt(L.c) + '</b> · MSE = <b>' + fmt(loss()) + '</b>' +
        (showOls ? ' · OLS: ŷ = ' + fmt(o.a) + '·x + ' + fmt(o.c) + ', MSE tối ưu = <b>' + fmt(o.mse) + '</b>' : '');
      view.redraw();
    }
    gen(); update();
  });

  /* ---------- 3. Overfitting: polynomial degree and L2 regularization ---------- */
  Viz.register('poly1', function (root) {
    const N = 15, SD = 0.25;
    let seed = 11, deg = 3, le = -9, xs, ys, tx, ty;
    const truth = x => Math.sin(2 * Math.PI * x);
    function gen() {
      const r = Viz.rng(seed); xs = []; ys = [];
      for (let i = 0; i < N; i++) { const x = r(); xs.push(x); ys.push(truth(x) + Viz.randn(r) * SD); }
      const r2 = Viz.rng(seed + 5000); tx = []; ty = [];
      for (let i = 0; i < 300; i++) { const x = r2(); tx.push(x); ty.push(truth(x) + Viz.randn(r2) * SD); }
    }
    const fit = (d, lam) => Viz.poly.fit(xs, ys, d, lam);
    const pred = Viz.poly.eval;
    const mse = (w, X, Y) => X.reduce((s, x, i) => s + (pred(w, x) - Y[i]) ** 2, 0) / X.length;
    const lamOf = () => le <= -9 ? 0 : Math.pow(10, le);

    gen();
    let errs = [];
    const main = Viz.mount(root, {
      aspect: 0.5, label: 'Đường cong đa thức khớp dữ liệu có nhiễu',
      draw(ctx, W, H, c) {
        const XR = [0, 1], YR = [-2, 2], f = frame(W, H, XR, YR);
        axes(ctx, f, W, H, XR, YR, [0, 0.25, 0.5, 0.75, 1], [-2, -1, 0, 1, 2], c);
        ctx.save(); ctx.beginPath(); ctx.rect(f.pad.l, f.pad.t, W - f.pad.l - f.pad.r, H - f.pad.t - f.pad.b); ctx.clip();
        ctx.setLineDash([5, 5]); ctx.strokeStyle = c.c; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const x = i / 200; i ? ctx.lineTo(f.sx(x), f.sy(truth(x))) : ctx.moveTo(f.sx(x), f.sy(truth(x))); }
        ctx.stroke(); ctx.setLineDash([]);
        const w = fit(deg, lamOf());
        ctx.strokeStyle = c.b; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i <= 300; i++) { const x = i / 300, y = pred(w, x); i ? ctx.lineTo(f.sx(x), f.sy(y)) : ctx.moveTo(f.sx(x), f.sy(y)); }
        ctx.stroke();
        ctx.fillStyle = c.a; xs.forEach((x, i) => { ctx.beginPath(); ctx.arc(f.sx(x), f.sy(ys[i]), 4.5, 0, 7); ctx.fill(); });
        ctx.restore();
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = c.a; ctx.fillText('● dữ liệu huấn luyện', f.pad.l + 8, f.pad.t + 6);
        ctx.fillStyle = c.b; ctx.fillText('— mô hình đa thức', f.pad.l + 130, f.pad.t + 6);
        ctx.fillStyle = c.c; ctx.fillText('- - hàm thật sin(2πx)', f.pad.l + 245, f.pad.t + 6);
      }
    });
    const errPlot = Viz.mount(root, {
      aspect: 0.3, minH: 150, label: 'Sai số huấn luyện và kiểm tra theo bậc đa thức',
      draw(ctx, W, H, c) {
        const XR = [0, 12], YR = [-2.5, 3], f = frame(W, H, XR, YR, { l: 36, r: 12, t: 12, b: 42 });
        axes(ctx, f, W, H, XR, YR, [0, 2, 4, 6, 8, 10, 12], [], c);
        ctx.fillStyle = c.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '11px system-ui, sans-serif';
        [-2, -1, 0, 1, 2, 3].forEach(e => { const py = f.sy(e); ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(f.pad.l, py); ctx.lineTo(W - f.pad.r, py); ctx.stroke(); ctx.fillText('1e' + e, f.pad.l - 4, py); });
        const lg = v => Math.min(YR[1], Math.max(YR[0], Math.log10(Math.max(1e-9, v))));
        [['tr', c.a], ['te', c.b]].forEach(([k, col]) => {
          ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
          errs.forEach((e, d) => { const px = f.sx(d), py = f.sy(lg(e[k])); d ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.stroke(); ctx.fillStyle = col;
          errs.forEach((e, d) => { ctx.beginPath(); ctx.arc(f.sx(d), f.sy(lg(e[k])), d === deg ? 5 : 2.5, 0, 7); ctx.fill(); });
        });
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = c.a; ctx.fillText('● MSE huấn luyện', f.pad.l + 8, f.pad.t + 4);
        ctx.fillStyle = c.b; ctx.fillText('● MSE kiểm tra (300 điểm mới)', f.pad.l + 120, f.pad.t + 4);
        ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.fillText('bậc đa thức (thang log cho sai số)', W / 2, H - 16);
      }
    });

    const r1 = U.row(root);
    U.slider(r1, 'Bậc đa thức', 0, 12, 1, deg, v => String(v), v => { deg = v; update(); });
    U.slider(r1, 'Điều chuẩn L2 λ', -9, 1, 0.5, le, v => v <= -9 ? '0' : '10^' + v, v => { le = v; update(); });
    U.button(r1, 'Lấy mẫu mới', () => { seed++; gen(); update(); }, true);
    const readout = U.out(root);

    function update() {
      const lam = lamOf(); errs = [];
      for (let d = 0; d <= 12; d++) { const w = fit(d, lam); errs.push({ tr: mse(w, xs, ys), te: mse(w, tx, ty) }); }
      const e = errs[deg];
      readout.innerHTML = 'bậc <b>' + deg + '</b> · MSE huấn luyện = <b>' + fmt(e.tr) + '</b> · MSE kiểm tra = <b>' + fmt(e.te) +
        '</b> · mức nhiễu không thể giảm ≈ σ² = ' + (SD * SD).toFixed(4);
      main.redraw(); errPlot.redraw();
    }
    update();
  });

  /* ---------- 4. k-NN decision regions ---------- */
  Viz.register('knn1', function (root) {
    let pts = [], k = 1, cls = 0, ds = 'blobs', seed = 3;
    function gen() {
      const r = Viz.rng(seed); pts = [];
      const blob = (cx, cy, s, n, c) => { for (let i = 0; i < n; i++) pts.push({ x: cx + Viz.randn(r) * s, y: cy + Viz.randn(r) * s, c }); };
      if (ds === 'blobs') { blob(.38, .42, .13, 25, 0); blob(.64, .58, .13, 25, 1); }
      else if (ds === 'xor') { blob(.28, .3, .08, 15, 0); blob(.72, .7, .08, 15, 0); blob(.28, .7, .08, 15, 1); blob(.72, .3, .08, 15, 1); }
      else { blob(.5, .5, .09, 25, 0); for (let i = 0; i < 40; i++) { const a = r() * 6.283, rad = .3 + Viz.randn(r) * .04; pts.push({ x: .5 + rad * Math.cos(a), y: .5 + rad * Math.sin(a), c: 1 }); } }
      pts.forEach(p => { p.x = Math.min(.98, Math.max(.02, p.x)); p.y = Math.min(.98, Math.max(.02, p.y)); });
    }
    function vote(x, y, skip) {
      const d = [];
      for (let i = 0; i < pts.length; i++) if (i !== skip) d.push([(pts[i].x - x) ** 2 + (pts[i].y - y) ** 2, pts[i].c]);
      d.sort((a, b) => a[0] - b[0]);
      let s = 0; const kk = Math.min(k, d.length); for (let i = 0; i < kk; i++) s += d[i][1];
      return kk ? s / kk : 0.5;
    }
    const view = Viz.mount(root, {
      aspect: 0.55, label: 'Vùng quyết định của thuật toán k láng giềng gần nhất',
      draw(ctx, W, H, c) {
        const cell = 10, A = Viz.rgb(c.a), B = Viz.rgb(c.b);
        if (pts.length) {
          for (let px = 0; px < W; px += cell) for (let py = 0; py < H; py += cell) {
            const p = vote((px + cell / 2) / W, (py + cell / 2) / H, -1);
            const m = i => Math.round(A[i] * (1 - p) + B[i] * p);
            ctx.fillStyle = 'rgba(' + m(0) + ',' + m(1) + ',' + m(2) + ',0.33)'; ctx.fillRect(px, py, cell, cell);
          }
        }
        pts.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 5, 0, 7);
          ctx.fillStyle = p.c ? c.b : c.a; ctx.fill(); ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5; ctx.stroke();
        });
      }
    });
    view.cv.addEventListener('click', ev => {
      const p = Viz.pos(ev, view.cv); pts.push({ x: p.x / view.W, y: p.y / view.H, c: cls }); update();
    });
    const r1 = U.row(root);
    U.slider(r1, 'Số láng giềng k', 1, 21, 2, k, v => String(v), v => { k = v; update(); });
    U.select(r1, 'Bộ dữ liệu', [['blobs', 'Hai cụm chồng lấn'], ['xor', 'XOR'], ['ring', 'Tâm và vành']], v => { ds = v; seed++; gen(); update(); });
    const r2 = U.row(root);
    U.select(r2, 'Bấm để thêm lớp', [['0', 'Lớp xanh'], ['1', 'Lớp cam']], v => { cls = +v; });
    U.button(r2, 'Xóa hết', () => { pts = []; update(); });
    U.button(r2, 'Dữ liệu mới', () => { seed++; gen(); update(); });
    const readout = U.out(root);
    function update() {
      if (pts.length < 2) { readout.textContent = 'Bấm vào đồ thị để thêm điểm.'; view.redraw(); return; }
      let tr = 0, loo = 0;
      pts.forEach((p, i) => { if ((vote(p.x, p.y, -1) >= .5 ? 1 : 0) === p.c) tr++; if ((vote(p.x, p.y, i) >= .5 ? 1 : 0) === p.c) loo++; });
      readout.innerHTML = 'k = <b>' + k + '</b> · độ chính xác trên chính tập huấn luyện = <b>' + (100 * tr / pts.length).toFixed(0) + '%</b> · ' +
        'độ chính xác khi bỏ riêng từng điểm (leave-one-out) = <b>' + (100 * loo / pts.length).toFixed(0) + '%</b>';
      view.redraw();
    }
    gen(); update();
  });
})();
