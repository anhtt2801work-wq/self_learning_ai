/* Additional interactive demos for the MLOps page (deep-dive sections) */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const fmt = n => Math.round(n).toLocaleString('en-US');

  /* ---- normal helpers (Abramowitz–Stegun 7.1.26 erf, bisection for quantiles) ---- */
  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2));
  function zq(p) { let lo = -8, hi = 8; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; Phi(m) < p ? lo = m : hi = m; } return (lo + hi) / 2; }

  /* ---------- 1. PSI per-bin breakdown and noise floor ---------- */
  Viz.register('psi2', function (root) {
    let mu = 0.3, sigma = 1, B = 10, logN = 3.3, useSample = true, seed = 1, edges = [], qpop = [], qs = [];
    const PSI = (p, q) => p.reduce((s, pi, i) => { const a = Math.max(pi, 1e-4), b = Math.max(q[i], 1e-4); return s + (b - a) * Math.log(b / a); }, 0);
    function compute() {
      edges = [-Infinity]; for (let i = 1; i < B; i++) edges.push(zq(i / B)); edges.push(Infinity);
      qpop = []; for (let i = 0; i < B; i++) qpop.push(Phi((edges[i + 1] - mu) / sigma) - Phi((edges[i] - mu) / sigma));
      const n = Math.round(Math.pow(10, logN)), r = Viz.rng(seed * 977 + 13), cnt = new Array(B).fill(0);
      for (let k = 0; k < n; k++) { const x = mu + sigma * Viz.randn(r); let b = 0; while (b < B - 1 && x > edges[b + 1]) b++; cnt[b]++; }
      qs = cnt.map(c => c / n); return n;
    }
    let nCur = compute();
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 280, label: 'Tỉ lệ từng khoảng của tham chiếu và dữ liệu đang chạy, cùng đóng góp của mỗi khoảng vào PSI',
      draw(ctx, W, H, c) {
        const q = useSample ? qs : qpop, p = new Array(B).fill(1 / B), pad = { l: 40, r: 10 }, w = (W - pad.l - pad.r) / B, h1 = H * 0.46, y0 = 14;
        const maxq = Math.max(...q, ...p) * 1.15, contrib = q.map((qi, i) => (Math.max(qi, 1e-4) - p[i]) * Math.log(Math.max(qi, 1e-4) / p[i])), maxc = Math.max(...contrib, 1e-6) * 1.2;
        ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Tỉ lệ mỗi khoảng (cột xám: tham chiếu 1/B; cột màu: dữ liệu đang chạy)', pad.l, 0);
        ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(pad.l, y0 + h1); ctx.lineTo(W - pad.r, y0 + h1); ctx.stroke();
        q.forEach((qi, i) => { const x = pad.l + i * w; ctx.fillStyle = Viz.rgba(c.muted, 0.55); ctx.fillRect(x + w * 0.08, y0 + h1 * (1 - p[i] / maxq), w * 0.38, h1 * p[i] / maxq); ctx.fillStyle = c.a; ctx.fillRect(x + w * 0.5, y0 + h1 * (1 - qi / maxq), w * 0.38, h1 * qi / maxq); });
        const y1 = y0 + h1 + 36, h2 = H - y1 - 20; ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.fillText('Đóng góp của từng khoảng: (qᵢ − pᵢ)·ln(qᵢ/pᵢ) ≥ 0', pad.l, y0 + h1 + 14);
        ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(pad.l, y1 + h2); ctx.lineTo(W - pad.r, y1 + h2); ctx.stroke();
        contrib.forEach((v, i) => { const x = pad.l + i * w; ctx.fillStyle = c.b; ctx.fillRect(x + w * 0.2, y1 + h2 * (1 - v / maxc), w * 0.6, h2 * v / maxc); ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.fillText(i + 1, x + w / 2, y1 + h2 + 4); });
        ctx.fillStyle = c.muted; ctx.textAlign = 'right'; ctx.fillText(maxc.toFixed(3), pad.l - 4, y1);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Dịch trung bình μ', -1, 1, 0.05, mu, v => v.toFixed(2), v => { mu = v; update(); });
    U.slider(r1, 'Độ lệch chuẩn σ', 0.5, 2, 0.05, sigma, v => v.toFixed(2), v => { sigma = v; update(); });
    const r2 = U.row(root);
    U.select(r2, 'Số khoảng B', [['5', '5'], ['10', '10'], ['20', '20']], v => { B = +v; update(); }); r2.querySelector('select').value = '10';
    U.slider(r2, 'Số mẫu đang chạy n', 2, 4.7, 0.1, logN, v => fmt(Math.pow(10, v)), v => { logN = v; update(); });
    U.check(r2, 'Dùng mẫu ngẫu nhiên (bỏ chọn = phân phối lý thuyết)', useSample, v => { useSample = v; update(); });
    U.button(r2, 'Lấy mẫu khác', () => { seed++; update(); });
    const readout = U.out(root);
    function update() {
      nCur = compute();
      const p = new Array(B).fill(1 / B), pop = PSI(p, qpop), smp = PSI(p, qs), floor = (B - 1) / nCur, chi = qpop.reduce((s, qi, i) => s + (qi - p[i]) ** 2 / p[i], 0);
      const verdict = v => v < 0.1 ? 'ổn định' : v < 0.25 ? 'cần theo dõi' : 'dịch chuyển lớn';
      readout.innerHTML = 'PSI lý thuyết (n → ∞): <b>' + pop.toFixed(4) + '</b> (' + verdict(pop) + '; xấp xỉ χ² Σ(q−p)²/p = ' + chi.toFixed(4) + '). PSI của mẫu n = ' + fmt(nCur) + ': <b>' + smp.toFixed(4) + '</b> (' + verdict(smp) + '). ' +
        'Sàn nhiễu khi <i>không</i> có drift ≈ (B − 1)/n = <b>' + floor.toFixed(4) + '</b> (tham chiếu coi là chính xác; nếu tham chiếu cũng là mẫu cỡ n_ref thì cộng thêm (B − 1)/n_ref). ' +
        (floor > 0.03 ? 'Với n nhỏ và B lớn, nhiễu lấy mẫu một mình đã đẩy PSI lên gần ngưỡng 0.1: đừng cảnh báo dựa trên PSI của mẫu quá nhỏ.' : 'Sàn nhiễu nhỏ so với ngưỡng 0.1, nên PSI đáng tin ở cỡ mẫu này.') +
        ' Các ngưỡng 0.1 và 0.25 là quy ước kinh nghiệm, không phải định lý.';
      view.redraw();
    }
    update();
  });

  /* ---------- 2. M/M/c queue: latency vs utilisation ---------- */
  Viz.register('queue1', function (root) {
    let svc = 20, c = 1, rho = 0.7;
    function mmc(rh, cc) {
      const mu = 1000 / svc, a = rh * cc, lam = rh * cc * mu;
      let term = 1, s = 1; for (let k = 1; k < cc; k++) { term *= a / k; s += term; }
      const top = term * a / cc / (1 - rh) * 1; // a^c/c! · c/(c−a) with term = a^{c-1}/(c-1)! → a^c/c! = term·a/c
      const topFull = top, pw = topFull / (s + topFull), wq = pw / (cc * mu - lam) * 1000, p95 = pw > 0.05 ? Math.log(pw / 0.05) / (cc * mu - lam) * 1000 : 0;
      return { pw, wq, p95, w: wq + svc, lam };
    }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 250, label: 'Độ trễ theo mức sử dụng máy chủ',
      draw(ctx, W, H, c0) {
        const pad = { l: 48, r: 12, t: 14, b: 32 }, X = r => pad.l + r / 0.99 * (W - pad.l - pad.r), ymax = 10 * svc, Y = v => pad.t + (1 - Math.min(v, ymax) / ymax) * (H - pad.t - pad.b);
        ctx.strokeStyle = c0.grid; ctx.fillStyle = c0.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) { const v = ymax * i / 5; ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke(); ctx.fillText(Math.round(v) + ' ms', pad.l - 6, Y(v)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let i = 0; i <= 5; i++) ctx.fillText((i * 0.2).toFixed(1), X(i * 0.2), H - pad.b + 6); ctx.fillText('mức sử dụng ρ = λ / (c·μ)', (pad.l + W - pad.r) / 2, H - 16);
        const line = (fn, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); for (let i = 0; i <= 198; i++) { const r = 0.005 + i * 0.005; if (r > 0.99) break; const v = fn(r); i ? ctx.lineTo(X(r), Y(v)) : ctx.moveTo(X(r), Y(v)); } ctx.stroke(); ctx.setLineDash([]); };
        line(r => mmc(r, 1).w, c0.muted, 1.5, [5, 4]); line(r => mmc(r, c).w + 0, c0.a, 2.5); line(r => svc + mmc(r, c).p95, c0.b, 2.5);
        ctx.fillStyle = c0.fg; ctx.beginPath(); ctx.arc(X(rho), Y(mmc(rho, c).w), 5, 0, 7); ctx.fill();
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c0.a; ctx.fillText('— độ trễ trung bình (c = ' + c + ')', pad.l + 8, pad.t + 4); ctx.fillStyle = c0.b; ctx.fillText('— thời gian xử lý + p95 thời gian chờ', pad.l + 8, pad.t + 20); ctx.fillStyle = c0.muted; ctx.fillText('--- trung bình khi chỉ có 1 máy (c = 1) cùng thời gian xử lý', pad.l + 8, pad.t + 36);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Thời gian xử lý trung bình (ms)', 5, 200, 5, svc, String, v => { svc = v; update(); });
    U.slider(r1, 'Số bản sao máy chủ c', 1, 16, 1, c, String, v => { c = v; update(); });
    U.slider(r1, 'Mức sử dụng ρ', 0.1, 0.98, 0.01, rho, v => v.toFixed(2), v => { rho = v; update(); });
    const readout = U.out(root);
    function update() {
      const m = mmc(rho, c);
      readout.innerHTML = 'λ = <b>' + m.lam.toFixed(1) + '</b> yêu cầu/giây. Xác suất phải chờ <b>' + (m.pw * 100).toFixed(1) + '%</b>; thời gian chờ trung bình <b>' + m.wq.toFixed(1) + ' ms</b>, p95 thời gian chờ <b>' + m.p95.toFixed(1) + ' ms</b>; độ trễ trung bình <b>' + m.w.toFixed(1) + ' ms</b> (' + (m.w / svc).toFixed(2) + '× thời gian xử lý). ' +
        'Ở ρ gần 1 độ trễ tăng vọt; <b>cùng mức sử dụng, nhiều bản sao chung một hàng đợi chờ ít hơn một máy lớn tương đương</b> (đường đứt là c = 1). Mô hình giả định đến ngẫu nhiên (Poisson) và thời gian xử lý mũ, nên tải dồn cục hoặc thời gian xử lý đuôi dài còn tệ hơn.';
      view.redraw();
    }
    update();
  });

  /* ---------- 3. A/B test sample size and power ---------- */
  Viz.register('ab1', function (root) {
    let p1 = 0.10, mde = 0.01, alpha = 0.05, power = 0.8, daily = 4000;
    const nNeeded = () => { const p2 = p1 + mde, za = zq(1 - alpha / 2), zb = zq(power); return Math.pow(za + zb, 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / (mde * mde); };
    const powerAt = n => { const p2 = p1 + mde, se = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / n); return Phi(Math.abs(mde) / se - zq(1 - alpha / 2)); };
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 240, label: 'Công suất kiểm định theo số mẫu mỗi nhóm',
      draw(ctx, W, H, c) {
        const pad = { l: 44, r: 12, t: 14, b: 32 }, nmax = nNeeded() * 2, X = n => pad.l + n / nmax * (W - pad.l - pad.r), Y = v => pad.t + (1 - v) * (H - pad.t - pad.b);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(pad.l, Y(i / 4)); ctx.lineTo(W - pad.r, Y(i / 4)); ctx.stroke(); ctx.fillText((i / 4).toFixed(2), pad.l - 6, Y(i / 4)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let i = 0; i <= 4; i++) ctx.fillText(fmt(nmax * i / 4), X(nmax * i / 4), H - pad.b + 6); ctx.fillText('số mẫu mỗi nhóm', (pad.l + W - pad.r) / 2, H - 16);
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 200; i++) { const n = Math.max(2, nmax * i / 200), v = powerAt(n); i ? ctx.lineTo(X(n), Y(v)) : ctx.moveTo(X(n), Y(v)); } ctx.stroke();
        const nn = nNeeded(); ctx.setLineDash([5, 4]); ctx.strokeStyle = c.b; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, Y(power)); ctx.lineTo(X(nn), Y(power)); ctx.lineTo(X(nn), H - pad.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.b; ctx.beginPath(); ctx.arc(X(nn), Y(power), 5, 0, 7); ctx.fill();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Tỉ lệ nền p', 0.01, 0.5, 0.01, p1, v => (v * 100).toFixed(0) + '%', v => { p1 = v; update(); });
    U.slider(r1, 'Hiệu ứng nhỏ nhất cần phát hiện (điểm %)', 0.002, 0.05, 0.001, mde, v => (v * 100).toFixed(1), v => { mde = v; update(); });
    const r2 = U.row(root);
    U.select(r2, 'Mức ý nghĩa α', [['0.1', '0.10'], ['0.05', '0.05'], ['0.01', '0.01']], v => { alpha = +v; update(); }); r2.querySelector('select').value = '0.05';
    U.slider(r2, 'Công suất mong muốn', 0.5, 0.95, 0.05, power, v => v.toFixed(2), v => { power = v; update(); });
    U.slider(r2, 'Người dùng mới mỗi ngày (cả hai nhóm)', 500, 100000, 500, daily, v => fmt(v), v => { daily = v; update(); });
    const readout = U.out(root);
    function update() {
      const n = Math.ceil(nNeeded()), days = 2 * n / daily, relHalf = nNeeded() * 4;
      readout.innerHTML = 'Cần <b>' + fmt(n) + '</b> mẫu mỗi nhóm (tổng ' + fmt(2 * n) + ') để phát hiện ' + (p1 * 100).toFixed(1) + '% → ' + ((p1 + mde) * 100).toFixed(1) + '% với α = ' + alpha + ', công suất ' + power.toFixed(2) + '. Với ' + fmt(daily) + ' người dùng/ngày: khoảng <b>' + days.toFixed(1) + ' ngày</b>. ' +
        'Số mẫu tỉ lệ nghịch với bình phương hiệu ứng: muốn phát hiện hiệu ứng <i>một nửa</i> cần khoảng ' + fmt(relHalf) + ' mẫu mỗi nhóm (×4). ' +
        'Hãy chốt cỡ mẫu và thời gian chạy <b>trước</b> khi xem kết quả: dừng ngay khi p &lt; 0.05 ở lần nhìn trộm bất kỳ làm tăng dương tính giả (xem mô phỏng bên dưới).';
      view.redraw();
    }
    update();
  });

  /* ---------- 4. Canary: evidence needed vs regression size ---------- */
  Viz.register('canary1', function (root) {
    let p0 = 0.01, p1 = 0.015, traffic = 5000;
    const need = (a, b) => Math.pow(zq(0.95) * Math.sqrt(a * (1 - a)) + zq(0.8) * Math.sqrt(b * (1 - b)), 2) / ((b - a) * (b - a));
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 240, label: 'Số yêu cầu cần để phát hiện bản mới tệ hơn, theo mức tệ đi',
      draw(ctx, W, H, c) {
        const pad = { l: 56, r: 12, t: 14, b: 32 }, lo = p0 * 1.05, hi = Math.min(0.5, p0 * 12), X = p => pad.l + (p - lo) / (hi - lo) * (W - pad.l - pad.r);
        const ymin = Math.log10(5), ymax = Math.log10(Math.max(2e6, need(p0, lo))), Y = n => pad.t + (1 - (Math.log10(Math.max(n, 5)) - ymin) / (ymax - ymin)) * (H - pad.t - pad.b);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let e = Math.ceil(ymin); e <= ymax; e++) { ctx.beginPath(); ctx.moveTo(pad.l, Y(Math.pow(10, e))); ctx.lineTo(W - pad.r, Y(Math.pow(10, e))); ctx.stroke(); ctx.fillText('10^' + e, pad.l - 6, Y(Math.pow(10, e))); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let i = 0; i <= 4; i++) { const p = lo + (hi - lo) * i / 4; ctx.fillText((p * 100).toFixed(1) + '%', X(p), H - pad.b + 6); } ctx.fillText('tỉ lệ lỗi thật của bản mới', (pad.l + W - pad.r) / 2, H - 16);
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 200; i++) { const p = lo + (hi - lo) * i / 200, n = need(p0, p); i ? ctx.lineTo(X(p), Y(n)) : ctx.moveTo(X(p), Y(n)); } ctx.stroke();
        ctx.fillStyle = c.b; ctx.beginPath(); ctx.arc(X(Math.min(Math.max(p1, lo), hi)), Y(need(p0, p1)), 5.5, 0, 7); ctx.fill();
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.a; ctx.fillText('số yêu cầu qua canary để đủ bằng chứng (thang log)', pad.l + 8, pad.t + 4);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Tỉ lệ lỗi nền p₀', 0.001, 0.1, 0.001, p0, v => (v * 100).toFixed(1) + '%', v => { p0 = v; if (p1 <= p0 * 1.05) p1 = p0 * 1.5; update(); });
    U.slider(r1, 'Tỉ lệ lỗi thật của bản mới p₁', 0.002, 0.3, 0.001, p1, v => (v * 100).toFixed(1) + '%', v => { p1 = Math.max(v, p0 * 1.05); update(); });
    U.slider(r1, 'Lưu lượng (yêu cầu/giờ)', 500, 200000, 500, traffic, v => fmt(v), v => { traffic = v; update(); });
    const table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const readout = U.out(root);
    function update() {
      const n = need(p0, p1); let h = '<table><thead><tr><th>Tỉ lệ canary</th><th>Yêu cầu/giờ vào canary</th><th>Giờ để đủ bằng chứng</th></tr></thead><tbody>';
      [0.01, 0.05, 0.25, 0.5].forEach(f => { h += '<tr><td>' + (f * 100) + '%</td><td>' + fmt(traffic * f) + '</td><td>' + (n / (traffic * f)).toFixed(1) + '</td></tr>'; });
      table.innerHTML = h + '</tbody></table>';
      readout.innerHTML = 'Để phát hiện lỗi tăng từ ' + (p0 * 100).toFixed(1) + '% lên ' + (p1 * 100).toFixed(1) + '% (một phía, α = 0.05, công suất 0.8) cần khoảng <b>' + fmt(n) + '</b> yêu cầu đi qua canary. <b>Số yêu cầu bị ảnh hưởng trước khi đủ bằng chứng xấp xỉ chính số này, không phụ thuộc tỉ lệ canary</b>; tỉ lệ canary chỉ quyết định mất bao lâu. ' +
        'Lỗi nặng thì cần rất ít yêu cầu để phát hiện, lỗi nhẹ cần rất nhiều: canary nhỏ bảo vệ tốt trước sự cố lớn, nhưng không thể “thấy” một sự suy giảm nhỏ trong thời gian ngắn. Mô hình coi tỉ lệ nền là đã biết chính xác và các yêu cầu độc lập.';
      view.redraw();
    }
    update();
  });

  /* ---------- 5. Retraining interval: cost trade-off ---------- */
  Viz.register('retrain1', function (root) {
    let C = 2000, V = 100000, r = 0.001;
    const rate = T => V * r * T / 2 + C / T, Tstar = () => Math.sqrt(2 * C / (V * r));
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 230, label: 'Chi phí trung bình mỗi ngày theo chu kỳ huấn luyện lại',
      draw(ctx, W, H, c) {
        const pad = { l: 56, r: 12, t: 14, b: 32 }, tmax = 60, ts = Tstar(), vals = []; for (let T = 1; T <= tmax; T += 0.5) vals.push(rate(T));
        const ymax = Math.min(Math.max(...vals), rate(ts) * 5), X = T => pad.l + (T - 1) / (tmax - 1) * (W - pad.l - pad.r), Y = v => pad.t + (1 - Math.min(v, ymax) / ymax) * (H - pad.t - pad.b);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { const v = ymax * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke(); ctx.fillText(fmt(v), pad.l - 6, Y(v)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let T = 0; T <= 60; T += 10) ctx.fillText(T || 1, X(Math.max(T, 1)), H - pad.b + 6); ctx.fillText('chu kỳ huấn luyện lại T (ngày)', (pad.l + W - pad.r) / 2, H - 16);
        const line = (fn, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); for (let T = 1; T <= tmax; T += 0.5) { const v = fn(T); T === 1 ? ctx.moveTo(X(T), Y(v)) : ctx.lineTo(X(T), Y(v)); } ctx.stroke(); ctx.setLineDash([]); };
        line(T => C / T, c.b, 1.5, [5, 4]); line(T => V * r * T / 2, c.c, 1.5, [5, 4]); line(rate, c.a, 3);
        if (ts >= 1 && ts <= tmax) { ctx.fillStyle = c.a; ctx.beginPath(); ctx.arc(X(ts), Y(rate(ts)), 6, 0, 7); ctx.fill(); }
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.a; ctx.fillText('— tổng', pad.l + 8, pad.t + 4); ctx.fillStyle = c.b; ctx.fillText('--- chi phí huấn luyện lại C/T', pad.l + 8, pad.t + 20); ctx.fillStyle = c.c; ctx.fillText('--- thiệt hại do mô hình cũ đi V·r·T/2', pad.l + 8, pad.t + 36);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Chi phí mỗi lần huấn luyện lại C', 200, 20000, 200, C, fmt, v => { C = v; update(); });
    U.slider(r1, 'Giá trị 1.0 độ chính xác mỗi ngày V', 10000, 1000000, 10000, V, fmt, v => { V = v; update(); });
    U.slider(r1, 'Tốc độ suy giảm r (độ chính xác/ngày)', 0.0001, 0.01, 0.0001, r, v => v.toFixed(4), v => { r = v; update(); });
    const readout = U.out(root);
    function update() {
      const ts = Tstar();
      readout.innerHTML = 'T* = √(2C / (V·r)) = <b>' + ts.toFixed(1) + ' ngày</b>, chi phí trung bình <b>' + fmt(rate(ts)) + '</b>/ngày. So sánh: huấn luyện lại mỗi ngày ' + fmt(rate(1)) + '/ngày; mỗi 30 ngày ' + fmt(rate(30)) + '/ngày. ' +
        'Đáy của đường tổng khá phẳng quanh T*, nên không cần chính xác tuyệt đối. Mô hình giả định độ chính xác giảm <b>tuyến tính</b> và đều; thực tế suy giảm có thể đột ngột (sự kiện, mùa vụ) nên cần giám sát chứ không chỉ chạy theo lịch.';
      view.redraw();
    }
    update();
  });
})();
