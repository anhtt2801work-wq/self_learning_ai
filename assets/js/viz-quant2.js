/* Interactive demos for the Quant Trading page, part 2: portfolio and risk, signal breadth, market
 * microstructure, and market-specific tools (Vietnamese price bands, crypto perpetuals, options).
 * All numbers are toy inputs chosen to show mechanisms; none is market data or advice. */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const Q = Viz.quant;
  if (!Q) throw new Error('viz-quant.js phải được nạp trước viz-quant2.js');
  const { lineChart, ncdf } = Q;
  function npdf(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }

  /* ---------- 1. Two-asset mean-variance ---------- */
  Viz.register('mv1', function (root) {
    const mu1 = 0.06, mu2 = 0.10, s1 = 0.20, s2 = 0.30, rf = 0.02;
    let rho = 0.3;
    function port(w, r) { return { v: Math.sqrt(w * w * s1 * s1 + (1 - w) * (1 - w) * s2 * s2 + 2 * r * w * (1 - w) * s1 * s2), m: w * mu1 + (1 - w) * mu2 }; }
    function minVar(r) { const w = (s2 * s2 - r * s1 * s2) / (s1 * s1 + s2 * s2 - 2 * r * s1 * s2); return Math.min(1, Math.max(0, w)); }
    function maxSharpe(r) { let bw = 0, bs = -1e9; for (let i = 0; i <= 200; i++) { const w = i / 200, p = port(w, r), s = (p.m - rf) / p.v; if (s > bs) { bs = s; bw = w; } } return bw; }
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 280, label: 'Đường biên hiệu quả của danh mục hai tài sản theo tương quan',
      draw(ctx, W, H, c) {
        const bx = { x: 52, y: 12, w: W - 68, h: H - 54 }, vx = [0.1, 0.32], my = [0.04, 0.11];
        const X = v => bx.x + (v - vx[0]) / (vx[1] - vx[0]) * bx.w, Y = m => bx.y + (1 - (m - my[0]) / (my[1] - my[0])) * bx.h;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (let m = 0.04; m <= 0.1101; m += 0.02) { ctx.beginPath(); ctx.moveTo(bx.x, Y(m)); ctx.lineTo(bx.x + bx.w, Y(m)); ctx.stroke(); ctx.fillText((m * 100).toFixed(0) + '%', bx.x - 5, Y(m)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let v = 0.1; v <= 0.3201; v += 0.05) ctx.fillText((v * 100).toFixed(0) + '%', X(v), bx.y + bx.h + 4);
        ctx.fillText('Rủi ro (độ lệch chuẩn, %/năm) →', bx.x + bx.w / 2, bx.y + bx.h + 22);
        ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
        ctx.strokeStyle = c.muted; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i <= 100; i++) { const p = port(i / 100, 1); (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(p.v), Y(p.m)); } ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.6; ctx.beginPath();
        for (let i = 0; i <= 100; i++) { const p = port(i / 100, rho); (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(p.v), Y(p.m)); } ctx.stroke();
        function dot(w, col, label, dy) { const p = port(w, rho); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p.v), Y(p.m), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = c.fg; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, X(p.v) + 9, Y(p.m) + dy); }
        dot(1, c.b, 'Tài sản A', 0); dot(0, c.b, 'Tài sản B', 0); dot(minVar(rho), c.c, 'rủi ro nhỏ nhất', 14); dot(maxSharpe(rho), c.d, 'Sharpe cao nhất', -14);
        ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('đứt xám: ρ = 1 (không đa dạng hóa)', bx.x + 8, bx.y + 6);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Tương quan ρ giữa A và B', -1, 1, 0.05, rho, v => v.toFixed(2), v => { rho = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const w = minVar(rho), p = port(w, rho), half = port(0.5, rho), ms = maxSharpe(rho), pm = port(ms, rho);
      out.innerHTML = 'A: kỳ vọng 6%, rủi ro 20%; B: kỳ vọng 10%, rủi ro 30%; lãi phi rủi ro 2% (giả định). Danh mục rủi ro nhỏ nhất dồn <b>' + (w * 100).toFixed(0) + '%</b> vào A với rủi ro <b>' + (p.v * 100).toFixed(1) + '%</b>, thấp hơn cả tài sản ít rủi ro nhất (20%) khi ρ đủ thấp. Chia đôi 50/50 có rủi ro <b>' + (half.v * 100).toFixed(1) + '%</b>. Danh mục Sharpe cao nhất: A <b>' + (ms * 100).toFixed(0) + '%</b>, Sharpe <b>' + ((pm.m - rf) / pm.v).toFixed(2) + '</b>. Lợi ích của đa dạng hóa đến từ ρ thấp, và <b>ρ thường tăng vọt đúng lúc khủng hoảng</b>. Cảnh báo: kỳ vọng lợi suất ước lượng rất nhiễu và nghiệm tối ưu rất nhạy với chúng (xem phần quản trị rủi ro). Đây là ví dụ đồ chơi, không cấm bán khống.';
    }
    update();
  });

  /* ---------- 2. Kelly criterion ---------- */
  Viz.register('kelly1', function (root) {
    let p = 0.55, b = 1, seed = 4, u = [];
    const NB = 300;
    function reseed() { const r = Viz.rng(seed); u = []; for (let i = 0; i < NB; i++) u.push(r()); }
    reseed();
    const g = f => p * Math.log(1 + b * f) + (1 - p) * Math.log(1 - f);
    const fstar = () => Math.max(0, (b * p - (1 - p)) / b);
    function zeroCross() { const fs = fstar(); if (fs <= 0) return 0; let f = fs; while (f < 0.9999 && g(f) > 0) f += 0.0005; return f; }
    const v1 = Viz.mount(root, {
      aspect: 0.5, minH: 230, label: 'Tốc độ tăng trưởng log kỳ vọng theo tỉ lệ vốn mỗi lệnh',
      draw(ctx, W, H, c) {
        const bx = { x: 50, y: 12, w: W - 66, h: H - 52 }, fs = fstar(), N = 200, ys = [];
        for (let i = 0; i < N; i++) ys.push(g(0.995 * i / (N - 1)));
        const top = Math.max(g(fs), 0.002) * 1.4;
        const lc = lineChart(ctx, c, bx, [{ y: ys, color: c.a, width: 2.4 }], { ymin: -top * 1.5, ymax: top, hlines: [{ v: 0, color: c.border, dash: false }], yfmt: v => (v * 100).toFixed(2) + '%', n: N });
        const X = f => lc.X(f / 0.995 * (N - 1));
        function mark(f, col, lab) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(f), lc.Y(Math.max(lc.lo, Math.min(lc.hi, g(f)))), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = c.fg; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(lab, X(f), lc.Y(Math.max(lc.lo, Math.min(lc.hi, g(f)))) - 9); }
        if (fs > 0) { mark(fs, c.c, 'Kelly'); mark(fs / 2, c.b, '½ Kelly'); const z = zeroCross(); if (z < 0.99) mark(z, c.d, 'hòa vốn'); }
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [0, 0.25, 0.5, 0.75, 1].forEach(f => ctx.fillText((f * 100).toFixed(0) + '%', X(Math.min(f, 0.995)), bx.y + bx.h + 4));
        ctx.fillText('Tỉ lệ vốn đặt mỗi lệnh f →', bx.x + bx.w / 2, bx.y + bx.h + 22);
      }
    });
    const v2 = Viz.mount(root, {
      aspect: 0.4, minH: 200, label: 'Ba đường vốn mô phỏng ứng với cùng chuỗi thắng thua',
      draw(ctx, W, H, c) {
        const fs = fstar(), bx = { x: 50, y: 12, w: W - 66, h: H - 40 };
        if (fs <= 0) { ctx.fillStyle = c.fg; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Kỳ vọng không dương: công thức Kelly cho f = 0 (không cược).', W / 2, H / 2); return; }
        function path(f) { f = Math.min(0.99, f); const y = [0]; let lw = 0; for (let i = 0; i < NB; i++) { lw += u[i] < p ? Math.log(1 + b * f) : Math.log(1 - f); y.push(Math.log10(Math.exp(lw))); } return y; }
        lineChart(ctx, c, bx, [{ y: path(fs * 2), color: c.d, width: 1.6 }, { y: path(fs), color: c.c, width: 2 }, { y: path(fs / 2), color: c.b, width: 2 }], { hlines: [{ v: 0, color: c.border, dash: false }], yfmt: v => { const x = Math.pow(10, v); return (x >= 10 ? x.toFixed(0) : x >= 0.1 ? x.toFixed(2) : x.toExponential(0)) + '×'; }, xlabel: NB + ' lệnh liên tiếp →' });
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Vốn (log): ½ Kelly cam · Kelly xanh lá · 2× Kelly tím', bx.x + 6, bx.y + 4);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Xác suất thắng p', 0.4, 0.7, 0.01, p, v => v.toFixed(2), v => { p = v; update(); });
    U.slider(r1, 'Tỉ lệ lãi/lỗ mỗi lệnh b', 0.5, 3, 0.1, b, v => v.toFixed(1), v => { b = v; update(); });
    U.button(r1, 'Chuỗi thắng thua mới', () => { seed++; reseed(); update(); });
    const out = U.out(root);
    function update() {
      v1.redraw(); v2.redraw();
      const fs = fstar();
      if (fs <= 0) { out.innerHTML = 'Kỳ vọng mỗi lệnh = p·b − (1−p) = <b>' + (p * b - (1 - p)).toFixed(2) + '</b> ≤ 0: không có lợi thế thì mọi tỉ lệ cược dương đều làm vốn co lại về lâu dài.'; return; }
      out.innerHTML = 'Công thức f* = (p·b − (1−p)) / b = <b>' + (fs * 100).toFixed(1) + '%</b> vốn mỗi lệnh; tăng trưởng log kỳ vọng tại đó <b>' + (g(fs) * 100).toFixed(3) + '%</b>/lệnh; tại ½ Kelly còn <b>' + (g(fs / 2) * 100).toFixed(3) + '%</b> (giữ khoảng ' + (100 * g(fs / 2) / g(fs)).toFixed(0) + '% tốc độ nhưng độ dao động nhỏ hơn nhiều). Cược khoảng <b>' + (zeroCross() * 100).toFixed(0) + '%</b> thì tăng trưởng về 0, vượt nữa thì <b>cược quá tay làm vốn giảm dù kỳ vọng dương</b>. Vì p, b chỉ là ước lượng nhiễu, người ta thường dùng phân số của Kelly. Mô hình đồ chơi: lệnh độc lập, p và b biết chính xác.';
    }
    update();
  });

  /* ---------- 3. Drawdown ---------- */
  Viz.register('dd1', function (root) {
    const M = 200, NMAX = 2520;
    let vol = 15, SR = 0.5, lev = 1, yrs = 5, seed = 1, Z = [];
    function reseed() { const r = Viz.rng(seed); Z = []; for (let m = 0; m < M; m++) { const row = new Float32Array(NMAX); for (let i = 0; i < NMAX; i++) row[i] = Viz.randn(r); Z.push(row); } }
    reseed();
    let sim;
    function run() {
      const n = Math.round(yrs * 252), sdd = vol / 100 / Math.sqrt(252), mud = SR * vol / 100 / 252, paths = [], mdd = [], fin = [];
      for (let m = 0; m < M; m++) {
        let eq = 1, peak = 1, md = 0; const y = [0];
        for (let i = 0; i < n; i++) { eq = Math.max(0, eq * (1 + lev * (mud + sdd * Z[m][i]))); if (eq > peak) peak = eq; const d = 1 - eq / peak; if (d > md) md = d; y.push(Math.log10(Math.max(eq, 0.01))); }
        if (m < 30) paths.push(y); mdd.push(md); fin.push(eq);
      }
      sim = { paths, mdd, fin, n };
    }
    const view = Viz.mount(root, {
      aspect: 0.55, minH: 260, label: 'Các đường vốn mô phỏng và mức sụt giảm tối đa',
      draw(ctx, W, H, c) {
        run();
        const bx = { x: 52, y: 12, w: W - 68, h: H - 40 };
        const cols = [c.a, c.b, c.c, c.d];
        lineChart(ctx, c, bx, sim.paths.map((y, i) => ({ y, color: Viz.rgba(cols[i % 4], 0.65), width: 1.3 })), { ymin: Math.max(-2, Math.min(...sim.paths.map(p => Math.min(...p))) - 0.1), ymax: Math.max(0.3, Math.max(...sim.paths.map(p => Math.max(...p))) + 0.1), hlines: [{ v: 0, color: c.fg, dash: false }], yfmt: v => Math.pow(10, v).toFixed(v < 0 ? 2 : 1) + '×', xlabel: '30 đường vốn (cùng thông số, nhiễu khác nhau), vốn ban đầu = 1×, thang log →' });
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Biến động tài sản (%/năm)', 5, 50, 1, vol, v => String(v), v => { vol = v; update(); });
    U.slider(r1, 'Sharpe thật', -0.5, 2, 0.1, SR, v => v.toFixed(1), v => { SR = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Đòn bẩy', 0.5, 5, 0.5, lev, v => v.toFixed(1) + '×', v => { lev = v; update(); });
    U.slider(r2, 'Số năm', 1, 10, 1, yrs, v => String(v), v => { yrs = v; update(); });
    U.button(r2, 'Nhiễu mới', () => { seed++; reseed(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const m = sim.mdd.slice().sort((a, b) => a - b), med = m[Math.floor(M / 2)], p90 = m[Math.floor(M * 0.9)];
      const over50 = sim.mdd.filter(v => v > 0.5).length / M, loss = sim.fin.filter(v => v < 1).length / M, ruin = sim.fin.filter(v => v < 0.1).length / M;
      out.innerHTML = 'Trên ' + M + ' đường: sụt giảm tối đa (từ đỉnh xuống đáy) <b>trung vị ' + (med * 100).toFixed(0) + '%</b>, phân vị 90% là <b>' + (p90 * 100).toFixed(0) + '%</b>; <b>' + (over50 * 100).toFixed(0) + '%</b> đường từng mất quá nửa vốn; <b>' + (loss * 100).toFixed(0) + '%</b> kết thúc dưới vốn ban đầu; <b>' + (ruin * 100).toFixed(0) + '%</b> chỉ còn dưới 10%. VaR 95% một ngày ≈ <b>' + (1.645 * lev * vol / 100 / Math.sqrt(252) * 100).toFixed(2) + '%</b> vốn (giả định chuẩn, nhẹ hơn thực tế vì đuôi dày). Hãy thử: nhân đôi đòn bẩy làm độ sụt giảm xấu đi nhiều hơn gấp đôi, và với Sharpe thật 0 thì sụt giảm sâu kéo dài là bình thường, không phải bằng chứng chiến lược hỏng hay tốt. Dữ liệu đồ chơi (lợi suất độc lập, phân phối chuẩn).';
    }
    update();
  });

  /* ---------- 4. Fundamental law of active management ---------- */
  Viz.register('fl1', function (root) {
    let ic = 0.03, kb = 2.4;
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 240, label: 'Information ratio xấp xỉ theo hệ số thông tin và số lượng quyết định độc lập',
      draw(ctx, W, H, c) {
        const bx = { x: 44, y: 12, w: W - 60, h: H - 56 }, T = []; for (let i = 0; i <= 120; i++) T.push(Math.pow(10, i / 30));
        const sets = [[0.01, c.muted], [0.02, c.b], [0.05, c.c]];
        const ser = sets.map(([v, col]) => ({ y: T.map(t => v * Math.sqrt(t)), color: col, width: 1.5, dash: [4, 3] }));
        ser.push({ y: T.map(t => ic * Math.sqrt(t)), color: c.a, width: 2.6 });
        const lc = lineChart(ctx, c, bx, ser, { ymin: 0, ymax: 3, n: T.length, yfmt: v => v.toFixed(1), hlines: [{ v: 1, color: c.border }] });
        const N = Math.pow(10, kb), X = lc.X(kb * 30), Y = lc.Y(Math.min(3, ic * Math.sqrt(N)));
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [1, 10, 100, 1000, 10000].forEach(t => ctx.fillText(String(t), lc.X(Math.log10(t) * 30), bx.y + bx.h + 4));
        ctx.fillText('Số quyết định độc lập mỗi năm (breadth, thang log) →', bx.x + bx.w / 2, bx.y + bx.h + 22);
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Xanh dương: IC bạn chọn · đứt: IC = 0.01 / 0.02 / 0.05 · vạch ngang: IR = 1', bx.x + 6, bx.y + 4);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'IC (tương quan dự báo – kết quả)', 0.005, 0.1, 0.005, ic, v => v.toFixed(3), v => { ic = v; update(); });
    U.slider(r1, 'Số quyết định độc lập mỗi năm', 0, 4, 0.05, kb, v => String(Math.round(Math.pow(10, v))), v => { kb = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const N = Math.pow(10, kb), ir = ic * Math.sqrt(N);
      out.innerHTML = 'IR ≈ IC × √breadth = ' + ic.toFixed(3) + ' × √' + Math.round(N) + ' = <b>' + ir.toFixed(2) + '</b>. Một tín hiệu yếu (IC chỉ 0.02, tức dự báo gần như chỉ hơn tung đồng xu một chút) có thể cho IR khoảng 1 nếu có <b>~2500 quyết định thực sự độc lập</b> mỗi năm; còn 100 quyết định chỉ cho khoảng 0.2. Vì thế quant thường “nhiều mã, nhiều tín hiệu, tín hiệu yếu”. Giới hạn của công thức (Grinold–Kahn, mô hình lý tưởng): các quyết định phải <b>độc lập thật</b> (cổ phiếu cùng ngành, cùng chịu một cú sốc thị trường thì không độc lập), chưa trừ chi phí giao dịch, và IC thật hay suy giảm theo thời gian.';
    }
    update();
  });

  /* ---------- 5. Limit order book and market-order slippage ---------- */
  Viz.register('book1', function (root) {
    const L = 10, tick = 0.01, mid = 100;
    let spread = 2, depth = 1, Q = 600, seed = 2, base = [];
    function reseed() { const r = Viz.rng(seed); base = []; for (let i = 0; i < 2 * L; i++) base.push(60 + Math.floor(r() * 240)); }
    reseed();
    const asks = () => Array.from({ length: L }, (_, i) => ({ p: mid + spread * tick / 2 + i * tick, s: Math.round(base[i] * depth) }));
    const bids = () => Array.from({ length: L }, (_, i) => ({ p: mid - spread * tick / 2 - i * tick, s: Math.round(base[L + i] * depth) }));
    function fill() { let left = Q, cost = 0; const used = []; asks().forEach(l => { const t = Math.min(left, l.s); used.push(t); cost += t * l.p; left -= t; }); const done = Q - left; return { used, avg: done ? cost / done : mid, done, left }; }
    const view = Viz.mount(root, {
      aspect: 0.7, minH: 300, label: 'Sổ lệnh giới hạn và đơn mua thị trường ăn qua các mức giá',
      draw(ctx, W, H, c) {
        const a = asks(), bd = bids(), f = fill(), maxS = Math.max(...a.map(l => l.s), ...bd.map(l => l.s)) * 1.15;
        const rowH = (H - 40) / (2 * L + 1), cx = 96, bw = W - cx - 16;
        ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'middle';
        for (let i = L - 1; i >= 0; i--) {
          const y = 8 + (L - 1 - i) * rowH, l = a[i], w = l.s / maxS * bw;
          ctx.fillStyle = Viz.rgba(c.b, 0.35); ctx.fillRect(cx, y + 1, w, rowH - 2);
          if (f.used[i] > 0) { ctx.fillStyle = c.d; ctx.fillRect(cx, y + 1, f.used[i] / maxS * bw, rowH - 2); }
          ctx.fillStyle = c.fg; ctx.textAlign = 'right'; ctx.fillText(l.p.toFixed(2), cx - 6, y + rowH / 2); ctx.textAlign = 'left'; ctx.fillText(String(l.s), cx + w + 4, y + rowH / 2);
        }
        const ym = 8 + L * rowH; ctx.strokeStyle = c.muted; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(8, ym + rowH / 2); ctx.lineTo(W - 8, ym + rowH / 2); ctx.stroke(); ctx.setLineDash([]);
        const midTxt = 'giá giữa ' + mid.toFixed(2), sprTxt = 'spread = ' + (spread * tick).toFixed(2) + ' (' + (spread * tick / mid * 1e4).toFixed(1) + ' bps)';
        ctx.fillStyle = c.bg; ctx.fillRect(8, ym + 1, ctx.measureText(midTxt).width + cx, rowH - 2); ctx.fillRect(cx + 4, ym + 1, ctx.measureText(sprTxt).width + 4, rowH - 2);
        ctx.fillStyle = c.muted; ctx.textAlign = 'right'; ctx.fillText(midTxt, cx - 6, ym + rowH / 2); ctx.textAlign = 'left'; ctx.fillText(sprTxt, cx + 6, ym + rowH / 2);
        for (let i = 0; i < L; i++) {
          const y = 8 + (L + 1 + i) * rowH, l = bd[i], w = l.s / maxS * bw;
          ctx.fillStyle = Viz.rgba(c.c, 0.35); ctx.fillRect(cx, y + 1, w, rowH - 2);
          ctx.fillStyle = c.fg; ctx.textAlign = 'right'; ctx.fillText(l.p.toFixed(2), cx - 6, y + rowH / 2); ctx.textAlign = 'left'; ctx.fillText(String(l.s), cx + w + 4, y + rowH / 2);
        }
        ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Cam: lệnh bán chờ (ask) · Xanh lá: lệnh mua chờ (bid) · Tím: phần bị đơn mua thị trường ăn', 8, H - 22);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Spread (số tick)', 1, 10, 1, spread, v => String(v), v => { spread = v; update(); });
    U.slider(r1, 'Độ sâu thanh khoản', 0.25, 4, 0.25, depth, v => v.toFixed(2) + '×', v => { depth = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Khối lượng đơn MUA thị trường', 0, 3000, 50, Q, v => String(v), v => { Q = v; update(); });
    U.button(r2, 'Sổ lệnh mới', () => { seed++; reseed(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const f = fill(), slip = (f.avg - mid) / mid * 1e4, half = spread * tick / 2 / mid * 1e4;
      out.innerHTML = 'Đơn mua <b>' + Q + '</b> cổ phiếu khớp được <b>' + f.done + '</b> với giá trung bình <b>' + f.avg.toFixed(3) + '</b>, tức đắt hơn giá giữa <b>' + slip.toFixed(1) + ' bps</b>, trong đó <b>' + half.toFixed(1) + ' bps</b> là nửa spread (không tránh được khi dùng lệnh thị trường) và phần còn lại là <b>trượt giá do đơn lớn ăn nhiều mức</b>.' + (f.left > 0 ? ' Còn <b>' + f.left + '</b> chưa khớp vì vượt toàn bộ ' + L + ' mức hiển thị.' : '') + ' Đặt lệnh giới hạn thì tránh được spread nhưng có thể không khớp. Quy mô vốn càng lớn, chi phí này càng lớn hơn tỉ lệ thuận, và là lý do nhiều chiến lược “chạy tốt” trên vốn nhỏ lại hết lợi thế khi mở rộng. Sổ lệnh đồ chơi, không phải dữ liệu thật.';
    }
    update();
  });

  /* ---------- 6. Vietnamese price bands (rules flagged as unverified in the text) ---------- */
  Viz.register('band1', function (root) {
    const EX = { hose: ['HOSE', 7], hnx: ['HNX', 10], upcom: ['UPCoM', 15] };
    let ex = 'hose', ref = 25, shock = -20;
    const r1 = U.row(root);
    U.select(r1, 'Sàn (biên độ ✱)', Object.keys(EX).map(k => [k, EX[k][0] + ' (±' + EX[k][1] + '%)']), v => { ex = v; update(); });
    const lbl = el('label', 'viz-ctl'); lbl.appendChild(el('span', 'viz-lbl', 'Giá tham chiếu (nghìn đồng)'));
    const inp = el('input'); inp.type = 'number'; inp.min = 1; inp.step = 0.1; inp.value = ref; inp.style.width = '8ch';
    inp.addEventListener('input', () => { ref = parseFloat(inp.value) || 0; update(); });
    lbl.appendChild(inp); r1.appendChild(lbl);
    const r2 = U.row(root);
    U.slider(r2, 'Cú sốc thông tin “đáng ra” (%)', -40, 40, 1, shock, v => (v > 0 ? '+' : '') + v + '%', v => { shock = v; update(); });
    const out = U.out(root);
    function update() {
      const bnd = EX[ex][1] / 100, ceil = ref * (1 + bnd), floor = ref * (1 - bnd), target = ref * (1 + shock / 100);
      let k = 0, px = ref; const list = [];
      if (shock !== 0) { while (k < 30 && (shock < 0 ? px > target + 1e-9 : px < target - 1e-9)) { px = shock < 0 ? Math.max(target, px * (1 - bnd)) : Math.min(target, px * (1 + bnd)); k++; list.push(px.toFixed(2)); } }
      out.innerHTML = 'Giá trần ≈ <b>' + ceil.toFixed(2) + '</b>, giá sàn ≈ <b>' + floor.toFixed(2) + '</b> (chưa làm tròn theo bước giá; quy định cụ thể xem nguồn chính thức). ' + (shock === 0 ? 'Không có cú sốc.' : 'Một cú sốc ' + shock + '% đáng ra phản ánh hết trong 1 phiên sẽ cần <b>' + k + ' phiên</b> nếu mỗi phiên bị chặn ở biên: giá đóng cửa lần lượt ' + list.join(' → ') + '.') + ' Hệ quả cho người làm mô hình: (1) lợi suất ngày bị “cắt” nên biến động quan sát thấp hơn rủi ro thật và lợi suất các phiên liền nhau tương quan; (2) khi dính sàn có thể không bán được hết (thanh khoản biến mất ở giá sàn); (3) backtest phải mô phỏng việc không khớp lệnh được. Công cụ minh họa, không thay thế quy chế của sở giao dịch.';
    }
    update();
  });

  /* ---------- 7. Crypto perpetual: liquidation distance and funding ---------- */
  Viz.register('fund1', function (root) {
    let lev = 10, mm = 0.5, dvol = 4, days = 30, fr = 0.01;
    function dist(L) { return 1 / L - mm / 100; }
    function pLiq(L) { const d = dist(L); if (d <= 0) return 1; return Math.min(1, 2 * ncdf(Math.log(1 - d) / (dvol / 100 * Math.sqrt(days)))); }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 240, label: 'Xác suất bị thanh lý trong khoảng thời gian chọn theo đòn bẩy',
      draw(ctx, W, H, c) {
        const bx = { x: 44, y: 12, w: W - 60, h: H - 56 }, Ls = []; for (let L = 1; L <= 50; L += 0.5) Ls.push(L);
        const lc = lineChart(ctx, c, bx, [{ y: Ls.map(pLiq), color: c.a, width: 2.6 }], { ymin: 0, ymax: 1, n: Ls.length, yfmt: v => (v * 100).toFixed(0) + '%' });
        const X = lc.X((lev - 1) / 0.5 * 1);
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(X, lc.Y(pLiq(lev)), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [1, 10, 20, 30, 40, 50].forEach(L => ctx.fillText(L + '×', lc.X((L - 1) / 0.5), bx.y + bx.h + 4));
        ctx.fillText('Đòn bẩy →  (trục dọc: xác suất giá chạm mức thanh lý trong ' + days + ' ngày)', bx.x + bx.w / 2, bx.y + bx.h + 22);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Đòn bẩy', 1, 50, 1, lev, v => v + '×', v => { lev = v; update(); });
    U.slider(r1, 'Ký quỹ duy trì (%)', 0, 2, 0.1, mm, v => v.toFixed(1), v => { mm = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Biến động ngày của tài sản (%)', 1, 10, 0.5, dvol, v => v.toFixed(1), v => { dvol = v; update(); });
    U.slider(r2, 'Thời gian giữ (ngày)', 1, 90, 1, days, v => String(v), v => { days = v; update(); });
    U.slider(r2, 'Funding mỗi 8 giờ (%) ✱', -0.05, 0.1, 0.005, fr, v => v.toFixed(3), v => { fr = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const d = dist(lev), ann = fr / 100 * 3 * 365 * 100;
      out.innerHTML = 'Vị thế mua đòn bẩy ' + lev + '×, ký quỹ cô lập: giá chỉ cần giảm khoảng <b>' + (d > 0 ? (d * 100).toFixed(1) + '%' : '0%') + '</b> là bị thanh lý (xấp xỉ 1/đòn bẩy − ký quỹ duy trì, bỏ qua phí và funding; <b>công thức từng sàn khác nhau ✱</b>). Với biến động ' + dvol + '%/ngày trong ' + days + ' ngày, xác suất giá từng chạm mức đó ≈ <b>' + (pLiq(lev) * 100).toFixed(0) + '%</b> (bước đi ngẫu nhiên, kỳ vọng 0, quan sát liên tục; thực tế có “râu nến” và đuôi dày nên cao hơn). Funding ' + fr.toFixed(3) + '%/8 giờ ≈ <b>' + ann.toFixed(2) + '%/năm</b> trên giá trị vị thế, tức <b>' + (ann * lev).toFixed(1) + '%/năm trên tiền ký quỹ</b>; dương nghĩa là bên mua trả cho bên bán (quy ước phổ biến ✱, kiểm tra tài liệu của sàn). Ví dụ đồ chơi, không phải khuyến nghị dùng đòn bẩy.';
    }
    update();
  });

  /* ---------- 8. Black-Scholes option value and Greeks ---------- */
  Viz.register('opt1', function (root) {
    let K = 100, sig = 20, T = 1, rr = 5, kind = 'call';
    function bs(S) {
      const s = sig / 100, r = rr / 100, d1 = (Math.log(S / K) + (r + s * s / 2) * T) / (s * Math.sqrt(T)), d2 = d1 - s * Math.sqrt(T), df = Math.exp(-r * T);
      const call = S * ncdf(d1) - K * df * ncdf(d2), put = call - S + K * df;
      return { d1, d2, price: kind === 'call' ? call : put, delta: kind === 'call' ? ncdf(d1) : ncdf(d1) - 1, gamma: npdf(d1) / (S * s * Math.sqrt(T)), vega: S * npdf(d1) * Math.sqrt(T) / 100,
        theta: (kind === 'call' ? -S * npdf(d1) * s / (2 * Math.sqrt(T)) - r * K * df * ncdf(d2) : -S * npdf(d1) * s / (2 * Math.sqrt(T)) + r * K * df * ncdf(-d2)) / 365 };
    }
    const view = Viz.mount(root, {
      aspect: 0.55, minH: 250, label: 'Giá quyền chọn theo giá cổ phiếu hiện tại so với giá trị tại ngày đáo hạn',
      draw(ctx, W, H, c) {
        const bx = { x: 44, y: 12, w: W - 60, h: H - 56 }, Ss = []; for (let S = 50; S <= 150; S += 1) Ss.push(S);
        const pay = Ss.map(S => kind === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)), val = Ss.map(S => bs(S).price);
        const lc = lineChart(ctx, c, bx, [{ y: pay, color: c.muted, width: 1.6, dash: [5, 4] }, { y: val, color: c.a, width: 2.6 }], { ymin: 0, n: Ss.length });
        const X = lc.X(50), Y = lc.Y(bs(100).price);
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [50, 75, 100, 125, 150].forEach(S => ctx.fillText(String(S), lc.X(S - 50), bx.y + bx.h + 4));
        ctx.fillText('Giá cổ phiếu cơ sở S (chấm lớn: S = 100) →', bx.x + bx.w / 2, bx.y + bx.h + 22);
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Xanh: giá lý thuyết hôm nay · xám đứt: giá trị khi đáo hạn', bx.x + 6, bx.y + 4);
      }
    });
    const r1 = U.row(root);
    U.select(r1, 'Loại', [['call', 'Quyền chọn mua (call)'], ['put', 'Quyền chọn bán (put)']], v => { kind = v; update(); });
    U.slider(r1, 'Giá thực hiện K', 70, 130, 1, K, v => String(v), v => { K = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Biến động σ (%/năm)', 5, 80, 1, sig, v => String(v), v => { sig = v; update(); });
    U.slider(r2, 'Thời gian đến hạn (năm)', 0.05, 2, 0.05, T, v => v.toFixed(2), v => { T = v; update(); });
    U.slider(r2, 'Lãi phi rủi ro r (%)', 0, 10, 0.5, rr, v => v.toFixed(1), v => { rr = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const g = bs(100);
      out.innerHTML = 'Tại S = 100: giá <b>' + g.price.toFixed(2) + '</b>; delta <b>' + g.delta.toFixed(3) + '</b>; gamma <b>' + g.gamma.toFixed(4) + '</b>; vega <b>' + g.vega.toFixed(3) + '</b> mỗi 1 điểm σ; theta <b>' + g.theta.toFixed(3) + '</b> mỗi ngày. Mặc định (call, K = 100, σ = 20%, 1 năm, r = 5%) cho giá 10.45 và delta 0.637. Delta hedging: bán 1 quyền chọn mua rồi giữ <b>' + Math.abs(g.delta).toFixed(2) + '</b> cổ phiếu ' + (g.delta >= 0 ? '(mua)' : '(bán khống)') + ' để triệt tiêu rủi ro giá nhỏ; gamma cho biết phải điều chỉnh vị thế này nhanh đến đâu, mỗi lần điều chỉnh mất chi phí. Black–Scholes giả định biến động không đổi, giá liên tục, không chi phí, không cổ tức; thị trường thật có “nụ cười biến động” và nhảy giá, nên σ ngầm định khác nhau theo K. Mô hình giảng dạy, không dùng để định giá giao dịch thật.';
    }
    update();
  });
})();
