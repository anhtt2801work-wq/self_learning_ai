/* Interactive demos for the MLOps page */
(function () {
  'use strict';
  const { ui: U } = Viz;
  const fmt = (v, d = 3) => v.toFixed(d);

  /* ---------- 1. Data drift: PSI and KS statistic ---------- */
  Viz.register('drift1', function (root) {
    let mu = 0, sd = 1, n = 2000, seed = 1, sample = [];
    const DEC = [-1.2816, -0.8416, -0.5244, -0.2533, 0, 0.2533, 0.5244, 0.8416, 1.2816]; // deciles of N(0,1)
    const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; };
    const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2)), phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    function gen() { const r = Viz.rng(seed * 99 + 7); sample = Array.from({ length: n }, () => mu + sd * Viz.randn(r)).sort((a, b) => a - b); }
    function stats() {
      const q = new Array(10).fill(0); for (const v of sample) { let b = 0; while (b < 9 && v > DEC[b]) b++; q[b]++; }
      const qs = q.map(c => Math.max(c / n, 1e-4)); let psi = 0; qs.forEach(p => { psi += (p - 0.1) * Math.log(p / 0.1); });
      let ks = 0; sample.forEach((v, i) => { const f = Phi(v); ks = Math.max(ks, Math.abs((i + 1) / n - f), Math.abs(i / n - f)); });
      return { q: q.map(c => c / n), psi, ks };
    }
    const view = Viz.mount(root, {
      aspect: 0.45, label: 'Phân phối đặc trưng lúc huấn luyện so với lúc vận hành',
      draw(ctx, W, H, c) {
        const pad = { l: 12, r: 12, t: 12, b: 24 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, XR = [-5, 5];
        const sx = x => pad.l + (x - XR[0]) / (XR[1] - XR[0]) * pw, sy = y => pad.t + ph - y / 0.9 * ph;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let x = -4; x <= 4; x += 2) { ctx.beginPath(); ctx.moveTo(sx(x), pad.t); ctx.lineTo(sx(x), H - pad.b); ctx.stroke(); ctx.fillText(x, sx(x), H - pad.b + 5); }
        // production histogram, 40 bins
        const bins = 40, hist = new Array(bins).fill(0); sample.forEach(v => { const b = Math.floor((v - XR[0]) / (XR[1] - XR[0]) * bins); if (b >= 0 && b < bins) hist[b]++; });
        ctx.fillStyle = Viz.rgba(c.b, 0.55); const bw = pw / bins, dens = bins / (XR[1] - XR[0]) / n;
        hist.forEach((h, i) => { const y = sy(h * dens); ctx.fillRect(pad.l + i * bw + 1, y, bw - 2, pad.t + ph - y); });
        ctx.setLineDash([3, 4]); ctx.strokeStyle = c.muted; DEC.forEach(d => { ctx.beginPath(); ctx.moveTo(sx(d), pad.t); ctx.lineTo(sx(d), H - pad.b); ctx.stroke(); }); ctx.setLineDash([]);
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const x = XR[0] + (XR[1] - XR[0]) * i / 200; i ? ctx.lineTo(sx(x), sy(phi(x))) : ctx.moveTo(sx(x), sy(phi(x))); } ctx.stroke();
        ctx.textAlign = 'left'; ctx.fillStyle = c.a; ctx.fillText('— phân phối lúc huấn luyện N(0,1) (các đường đứt = ranh giới 10 phân vị)', pad.l + 6, pad.t + 2);
        ctx.fillStyle = c.b; ctx.fillText('■ dữ liệu đang chạy thật', pad.l + 6, pad.t + 18);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Dịch trung bình μ', -2, 2, 0.1, mu, v => v.toFixed(1), v => { mu = v; gen(); update(); });
    U.slider(r1, 'Độ lệch chuẩn σ', 0.4, 2, 0.1, sd, v => v.toFixed(1), v => { sd = v; gen(); update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Số mẫu đang chạy', 100, 5000, 100, n, String, v => { n = v; gen(); update(); });
    U.button(r2, 'Lấy mẫu khác', () => { seed++; gen(); update(); });
    const readout = U.out(root);
    function update() {
      const s = stats(), level = s.psi >= 0.25 ? 'cảnh báo mạnh' : s.psi >= 0.1 ? 'cần theo dõi' : 'ổn định';
      readout.innerHTML = 'PSI = <b>' + fmt(s.psi) + '</b> (' + level + ' theo quy ước ngón tay cái 0.1 / 0.25) · KS = <b>' + fmt(s.ks) + '</b> · ' +
        'ngưỡng KS xấp xỉ ở mức ý nghĩa 5%: <b>' + fmt(1.36 / Math.sqrt(n)) + '</b> (với n mẫu so với phân phối tham chiếu đã biết). Với μ = 0, σ = 1 thì PSI vẫn dao động do chỉ lấy mẫu hữu hạn; thử giảm số mẫu để thấy cảnh báo giả.';
      view.redraw();
    }
    gen(); update();
  });

  /* ---------- 2. Serving: dynamic batching trade-off ---------- */
  Viz.register('batch1', function (root) {
    let alpha = 20, beta = 2, B = 16, Wms = 10, lam = 150;
    function sim(lambda, Bmax, wait, a, b, T = 15, seed = 3) {
      const r = Viz.rng(seed), arr = []; let t = 0; const mean = 1000 / lambda;
      while (true) { t += -Math.log(1 - r()) * mean; if (t > T * 1000) break; arr.push(t); }
      const n = arr.length, lat = []; let free = 0, busy = 0, i = 0;
      while (i < n) {
        const tFull = i + Bmax - 1 < n ? arr[i + Bmax - 1] : Infinity, tStart = Math.max(free, Math.min(tFull, arr[i] + wait));
        let j = i; while (j < n && j - i < Bmax && arr[j] <= tStart) j++;
        const dur = a + b * (j - i), done = tStart + dur; for (let k = i; k < j; k++) lat.push(done - arr[k]);
        busy += dur; free = done; i = j;
      }
      lat.sort((x, y) => x - y); const q = p => lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] : 0;
      return { p50: q(0.5), p95: q(0.95), thr: n / (Math.max(free, T * 1000) / 1000), util: Math.min(1, busy / Math.max(free, T * 1000)), n };
    }
    const LAMS = Array.from({ length: 25 }, (_, k) => 10 + k * 20);
    const view = Viz.mount(root, {
      aspect: 0.45, label: 'Độ trễ p95 theo lưu lượng yêu cầu',
      draw(ctx, W, H, c) {
        const pad = { l: 64, r: 12, t: 24, b: 30 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, lo = 1, hi = 4.2; // log10 ms
        const sx = l => pad.l + (l - 10) / (490) * pw, sy = ms => pad.t + ph - (Math.min(hi, Math.max(lo, Math.log10(Math.max(1, ms)))) - lo) / (hi - lo) * ph;
        ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [10, 100, 1000, 10000].forEach(v => { ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(W - pad.r, sy(v)); ctx.stroke(); ctx.fillText(v + ' ms', pad.l - 5, sy(v)); });
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [100, 200, 300, 400, 500].forEach(v => { ctx.fillText(v, sx(v), H - pad.b + 5); }); ctx.fillText('yêu cầu / giây (λ)', pad.l + pw / 2, H - 14);
        const line = (cfg, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); LAMS.forEach((l, k) => { const s = sim(l, cfg.B, cfg.W, alpha, beta); k ? ctx.lineTo(sx(l), sy(s.p95)) : ctx.moveTo(sx(l), sy(s.p95)); }); ctx.stroke(); };
        line({ B: 1, W: 0 }, c.muted, 2); line({ B, W: Wms }, c.a, 3);
        ctx.strokeStyle = c.b; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(sx(lam), pad.t); ctx.lineTo(sx(lam), H - pad.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = c.a; ctx.fillText('— p95 với batching động', pad.l + 8, 6); ctx.fillStyle = c.muted; ctx.fillText('— p95 không batching (mỗi lần 1 yêu cầu)', pad.l + 160, 6);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Chi phí cố định α (ms)', 5, 100, 5, alpha, String, v => { alpha = v; update(); });
    U.slider(r1, 'Chi phí mỗi mẫu β (ms)', 0.5, 10, 0.5, beta, v => v.toFixed(1), v => { beta = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Batch tối đa', 1, 64, 1, B, String, v => { B = v; update(); });
    U.slider(r2, 'Chờ tối đa (ms)', 0, 100, 5, Wms, String, v => { Wms = v; update(); });
    U.slider(r2, 'Lưu lượng λ (req/s)', 10, 500, 10, lam, String, v => { lam = v; update(); });
    const readout = U.out(root);
    function update() {
      const s = sim(lam, B, Wms, alpha, beta), s1 = sim(lam, 1, 0, alpha, beta), cap = B / (alpha + beta * B) * 1000, cap1 = 1000 / (alpha + beta);
      readout.innerHTML = 'Tại λ = ' + lam + ' req/s, batching (B=' + B + ', chờ ' + Wms + ' ms): p50 = <b>' + fmt(s.p50, 0) + ' ms</b>, p95 = <b>' + fmt(s.p95, 0) + ' ms</b>, máy bận ≈ ' + (100 * s.util).toFixed(0) + '% thời gian (với batching động, máy luôn bận vẫn chưa chắc quá tải vì lô tự lớn lên khi hàng đợi dài). ' +
        'Không batching: p95 = <b>' + fmt(s1.p95, 0) + ' ms</b>. Công suất tối đa lý thuyết: ' + cap.toFixed(0) + ' req/s (batching) so với ' + cap1.toFixed(0) + ' req/s (không batching). ' +
        'Mô hình đồ chơi: thời gian xử lý một lô = α + β·kích thước lô, một máy chủ, yêu cầu đến theo quá trình Poisson, mô phỏng 15 giây.';
      view.redraw();
    }
    update();
  });
})();
