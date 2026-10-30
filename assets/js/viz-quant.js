/* Interactive demos for the Quant Trading page, part 1: returns, time series, signals and backtesting.
 * Every demo runs on simulated toy data (fixed seeds). None of it is market data or trading advice. */
(function () {
  'use strict';
  const { ui: U, el } = Viz;

  function fmt(v) { const a = Math.abs(v); return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(2); }
  function mean(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function sd(a) { const m = mean(a); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / (a.length - 1)); }
  function acf(x, k) { const m = mean(x); let num = 0, den = 0; for (let i = 0; i < x.length; i++) den += (x[i] - m) * (x[i] - m); for (let i = k; i < x.length; i++) num += (x[i] - m) * (x[i - k] - m); return num / den; }
  function ncdf(x) { // Abramowitz-Stegun 7.1.26 via erf
    const s = x < 0 ? -1 : 1, z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return 0.5 * (1 + s * y);
  }

  /* Line chart inside box bx = {x,y,w,h}. ser = [{y:[...], color, width, dash}] ; o: ymin,ymax,yfmt,hlines,n,xlabel,title */
  function lineChart(ctx, c, bx, ser, o) {
    o = o || {};
    let lo = o.ymin, hi = o.ymax;
    if (lo == null || hi == null) {
      let a = Infinity, b = -Infinity;
      ser.forEach(s => s.y.forEach(v => { if (isFinite(v)) { if (v < a) a = v; if (v > b) b = v; } }));
      if (lo == null) lo = a; if (hi == null) hi = b;
      if (!(hi > lo)) hi = lo + 1;
      const pad = (hi - lo) * 0.06; if (o.ymin == null) lo -= pad; if (o.ymax == null) hi += pad;
    }
    const n = o.n || Math.max.apply(null, ser.map(s => s.y.length));
    const X = i => bx.x + (n > 1 ? i / (n - 1) : 0) * bx.w, Y = v => bx.y + (1 - (v - lo) / (hi - lo)) * bx.h;
    ctx.save();
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(bx.x, y); ctx.lineTo(bx.x + bx.w, y); ctx.stroke(); ctx.fillText((o.yfmt || fmt)(v), bx.x - 5, y); }
    ctx.beginPath(); ctx.rect(bx.x, bx.y, bx.w, bx.h); ctx.clip();
    (o.hlines || []).forEach(h => { ctx.strokeStyle = h.color || c.muted; ctx.setLineDash(h.dash === false ? [] : [5, 4]); ctx.beginPath(); ctx.moveTo(bx.x, Y(h.v)); ctx.lineTo(bx.x + bx.w, Y(h.v)); ctx.stroke(); });
    ctx.setLineDash([]);
    ser.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; ctx.setLineDash(s.dash || []); ctx.beginPath();
      let pen = false;
      for (let i = 0; i < s.y.length; i++) { const v = s.y[i]; if (!isFinite(v)) { pen = false; continue; } if (pen) ctx.lineTo(X(i), Y(v)); else { ctx.moveTo(X(i), Y(v)); pen = true; } }
      ctx.stroke();
    });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
    if (o.title) { ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(o.title, bx.x + 6, bx.y + 4); }
    if (o.xlabel) { ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(o.xlabel, bx.x + bx.w / 2, bx.y + bx.h + 4); }
    ctx.restore();
    return { X, Y, lo, hi };
  }
  Viz.quant = { lineChart, fmt, mean, sd, acf, ncdf };

  /* ---------- 1. Fat tails ---------- */
  Viz.register('ret1', function (root) {
    const N = 2500;
    let df = 4, showNormal = true;
    const r = Viz.rng(11), Z = [], G = [];
    for (let i = 0; i < N; i++) Z.push(Viz.randn(r));
    for (let i = 0; i < N; i++) { const row = []; for (let k = 0; k < 50; k++) row.push(Viz.randn(r)); G.push(row); }
    function series() {
      const out = new Array(N), k = Math.sqrt((df - 2) / df);
      for (let i = 0; i < N; i++) { let g = 0; for (let j = 0; j < df; j++) g += G[i][j] * G[i][j]; out[i] = Z[i] / Math.sqrt(g / df) * k; }
      return out;
    }
    let x = series();
    const view = Viz.mount(root, {
      aspect: 0.8, minH: 320, label: 'Chuỗi lợi suất mô phỏng và biểu đồ tần suất theo thang log so với phân phối chuẩn',
      draw(ctx, W, H, c) {
        const top = { x: 44, y: 10, w: W - 56, h: H * 0.36 };
        lineChart(ctx, c, top, [{ y: x, color: c.a, width: 1 }], { ymin: -10, ymax: 10, hlines: [{ v: 3 }, { v: -3 }], title: 'Lợi suất ngày (đơn vị: độ lệch chuẩn σ); nét đứt = ±3σ' });
        const hb = { x: 44, y: H * 0.36 + 34, w: W - 56, h: H - H * 0.36 - 66 };
        const bw = 0.25, lo = -8, hi = 8, nb = (hi - lo) / bw, cnt = new Array(nb).fill(0);
        x.forEach(v => { const b = Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / bw))); cnt[b]++; });
        const ymax = Math.log10(Math.max(...cnt) * 1.5), ymin = Math.log10(0.5);
        const X = v => hb.x + (v - lo) / (hi - lo) * hb.w, Y = n => hb.y + (1 - (Math.log10(Math.max(n, 0.5)) - ymin) / (ymax - ymin)) * hb.h;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [1, 10, 100, 1000].forEach(n => { if (Math.log10(n) < ymax) { ctx.beginPath(); ctx.moveTo(hb.x, Y(n)); ctx.lineTo(hb.x + hb.w, Y(n)); ctx.stroke(); ctx.fillText(String(n), hb.x - 5, Y(n)); } });
        ctx.fillStyle = Viz.rgba(c.a, 0.55);
        cnt.forEach((n, i) => { if (n > 0) ctx.fillRect(X(lo + i * bw) + 0.5, Y(n), Math.max(1, hb.w / nb - 1), hb.y + hb.h - Y(n)); });
        if (showNormal) { ctx.strokeStyle = c.c; ctx.lineWidth = 2; ctx.beginPath(); for (let v = lo; v <= hi; v += 0.05) { const e = N * bw * Math.exp(-v * v / 2) / Math.sqrt(2 * Math.PI); const y = Y(e); if (v === lo) ctx.moveTo(X(v), y); else ctx.lineTo(X(v), y); } ctx.stroke(); }
        ctx.strokeStyle = c.border; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
        ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [-6, -3, 0, 3, 6].forEach(v => ctx.fillText(v + 'σ', X(v), hb.y + hb.h + 4));
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Số ngày theo mức lợi suất (trục dọc log)' + (showNormal ? '; đường xanh lá = phân phối chuẩn' : ''), hb.x + 6, hb.y + 4);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Độ dày đuôi (bậc tự do df; nhỏ = đuôi dày)', 3, 50, 1, df, v => v >= 50 ? '50 (≈ chuẩn)' : String(v), v => { df = v; update(); });
    U.check(r1, 'Vẽ phân phối chuẩn để so', showNormal, v => { showNormal = v; view.redraw(); });
    const out = U.out(root);
    function update() {
      x = series();
      const big = x.filter(v => Math.abs(v) > 3).length, m = mean(x), v2 = mean(x.map(v => (v - m) * (v - m))), k4 = mean(x.map(v => Math.pow(v - m, 4))) / (v2 * v2) - 3;
      out.innerHTML = 'Trong ' + N + ' ngày: <b>' + big + '</b> ngày lệch quá 3σ (nếu chuẩn thì kỳ vọng khoảng <b>' + (N * 0.0027).toFixed(1) + '</b>). Ngày xấu nhất/tốt nhất: <b>' + Math.min(...x).toFixed(1) + 'σ</b> / <b>' + Math.max(...x).toFixed(1) + 'σ</b>. Độ nhọn dư (excess kurtosis) của mẫu: <b>' + k4.toFixed(1) + '</b> (chuẩn = 0). Dữ liệu đồ chơi: phân phối Student-t chuẩn hóa về phương sai 1, không phải dữ liệu thị trường.';
      view.redraw();
    }
    update();
  });

  /* ---------- 2. AR(1): mean reversion vs random walk ---------- */
  Viz.register('ar1', function (root) {
    let phi = 0.9;
    const n = 300, r = Viz.rng(5), e = [];
    for (let i = 0; i < n; i++) e.push(Viz.randn(r));
    function path(p) { const x = [0]; for (let i = 1; i < n; i++) x.push(p * x[i - 1] + e[i]); return x; }
    const K = 20;
    const view = Viz.mount(root, {
      aspect: 0.78, minH: 320, label: 'Đường đi AR(1) so với bước ngẫu nhiên và hàm tự tương quan',
      draw(ctx, W, H, c) {
        const x = path(phi), rw = path(1);
        const top = { x: 44, y: 10, w: W - 56, h: H * 0.5 };
        lineChart(ctx, c, top, [{ y: rw, color: c.muted, width: 1.2, dash: [4, 3] }, { y: x, color: c.a, width: 1.8 }], { hlines: [{ v: 0, color: c.border }], title: 'Xanh: AR(1) với φ đang chọn; xám đứt: bước ngẫu nhiên (φ = 1), cùng nhiễu' });
        const bx = { x: 44, y: H * 0.5 + 40, w: W - 56, h: H - H * 0.5 - 70 };
        const Y = v => bx.y + (1 - (v + 1) / 2) * bx.h, step = bx.w / K;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [-1, -0.5, 0, 0.5, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(bx.x, Y(v)); ctx.lineTo(bx.x + bx.w, Y(v)); ctx.stroke(); ctx.fillText(v.toFixed(1), bx.x - 5, Y(v)); });
        for (let k = 1; k <= K; k++) {
          const a = acf(x, k); ctx.fillStyle = Viz.rgba(c.b, 0.7); ctx.fillRect(bx.x + (k - 0.5) * step - step * 0.3, Math.min(Y(0), Y(a)), step * 0.6, Math.abs(Y(a) - Y(0)));
          ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(bx.x + (k - 0.5) * step, Y(Math.pow(phi, k)), 3, 0, 7); ctx.fill();
        }
        ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Tự tương quan theo độ trễ 1–' + K + ' (cột: mẫu; chấm: lý thuyết φ^k)', bx.x + 6, bx.y + 4);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Hệ số quay về φ', -0.5, 1, 0.01, phi, v => v.toFixed(2), v => { phi = v; update(); });
    const out = U.out(root);
    function update() {
      let t;
      if (phi >= 0.999) t = '<b>φ = 1: bước ngẫu nhiên.</b> Không có lực kéo về mức trung bình; độ lệch có thể trôi vô hạn. Nếu một “chênh lệch giá” thực ra là bước ngẫu nhiên thì chiến lược mean reversion không có lợi thế, chỉ có may rủi.';
      else if (phi > 0) t = 'Quay về trung bình với <b>nửa chu kỳ ≈ ' + (Math.log(0.5) / Math.log(phi)).toFixed(1) + ' nhịp</b> (sau chừng đó nhịp, một nửa độ lệch biến mất). Độ lệch chuẩn dài hạn bằng ' + (1 / Math.sqrt(1 - phi * phi)).toFixed(2) + ' lần độ lệch chuẩn của nhiễu. φ càng gần 1 thì tín hiệu càng chậm và càng khó phân biệt với bước ngẫu nhiên khi dữ liệu ít.';
      else if (phi === 0) t = 'φ = 0: nhiễu trắng, không dự đoán được gì từ quá khứ.';
      else t = 'φ < 0: đổi dấu liên tục (quay về rất nhanh, kiểu “nảy” giữa mua và bán); thường là dấu hiệu nhiễu vi cấu trúc hơn là cơ hội kiếm lời sau chi phí.';
      out.innerHTML = t + ' Gợi ý đọc: với <i>lợi suất</i>, φ &gt; 0 là quán tính (momentum), φ &lt; 0 là đảo chiều; với <i>chênh lệch giá của một cặp</i>, φ &lt; 1 mới là điều kiện để giao dịch cặp có ý nghĩa.';
      view.redraw();
    }
    update();
  });

  /* ---------- 3. Pairs trading ---------- */
  Viz.register('pairs1', function (root) {
    const n = 500, WIN = 60;
    let phi = 0.95, entry = 2, cost = 0.3, seed = 23, e = [];
    function reseed() { const r = Viz.rng(seed); e = []; for (let i = 0; i < n; i++) e.push(Viz.randn(r)); }
    reseed();
    let res;
    function run() {
      const s = [0]; for (let i = 1; i < n; i++) s.push(phi * s[i - 1] + e[i]);
      const z = new Array(n).fill(NaN);
      for (let t = WIN - 1; t < n; t++) { const w = s.slice(t - WIN + 1, t + 1), m = mean(w), d = sd(w); z[t] = (s[t] - m) / (d || 1); }
      let pos = 0, trades = 0; const gross = [0], net = [0]; let g = 0, nt = 0;
      for (let t = 0; t < n - 1; t++) {
        const prev = pos;
        if (t >= WIN - 1) {
          if (pos === 0) { if (z[t] > entry) pos = -1; else if (z[t] < -entry) pos = 1; }
          else if ((pos === 1 && z[t] >= 0) || (pos === -1 && z[t] <= 0)) pos = 0;
        }
        if (pos !== prev) { trades++; nt -= cost * Math.abs(pos - prev); }
        const p = pos * (s[t + 1] - s[t]); g += p; nt += p; gross.push(g); net.push(nt);
      }
      res = { s, z, gross, net, trades };
    }
    const view = Viz.mount(root, {
      aspect: 0.8, minH: 320, label: 'Điểm z của chênh lệch giá và lãi lỗ tích lũy của giao dịch cặp mô phỏng',
      draw(ctx, W, H, c) {
        run();
        const a = { x: 44, y: 10, w: W - 56, h: H * 0.42 };
        lineChart(ctx, c, a, [{ y: res.z, color: c.a, width: 1.4 }], { hlines: [{ v: entry, color: c.c }, { v: -entry, color: c.c }, { v: 0, color: c.border, dash: false }], title: 'Điểm z (cửa sổ ' + WIN + ' nhịp, chỉ dùng dữ liệu quá khứ); vạch = ngưỡng vào lệnh' });
        const b = { x: 44, y: H * 0.42 + 34, w: W - 56, h: H - H * 0.42 - 66 };
        lineChart(ctx, c, b, [{ y: res.gross, color: c.muted, width: 1.4, dash: [4, 3] }, { y: res.net, color: c.b, width: 2 }], { hlines: [{ v: 0, color: c.border, dash: false }], title: 'Lãi lỗ tích lũy: nét đứt xám = trước chi phí; cam = sau chi phí', xlabel: 'thời gian →' });
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'φ của chênh lệch (1 = không có quay về)', 0.9, 1, 0.005, phi, v => v.toFixed(3), v => { phi = v; update(); });
    U.slider(r1, 'Ngưỡng vào lệnh |z|', 0.5, 3, 0.1, entry, v => v.toFixed(1), v => { entry = v; update(); });
    U.slider(r1, 'Chi phí mỗi lần đổi vị thế', 0, 1, 0.05, cost, v => v.toFixed(2), v => { cost = v; update(); });
    U.button(r1, 'Mẫu nhiễu mới', () => { seed++; reseed(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const gF = res.gross[res.gross.length - 1], nF = res.net[res.net.length - 1];
      out.innerHTML = 'Số lần đổi vị thế: <b>' + res.trades + '</b>. Lãi lỗ cuối kỳ trước chi phí: <b>' + gF.toFixed(1) + '</b>; sau chi phí: <b>' + nF.toFixed(1) + '</b> (đơn vị: độ lệch chuẩn của biến động một nhịp). Bấm “Mẫu nhiễu mới” nhiều lần để thấy sự may rủi. Đã đếm trên 200 mẫu nhiễu (ngưỡng 2, chi phí 0.3): với φ = 1 lãi gộp trung bình chỉ ≈ 2 và chỉ 53% mẫu dương, sau chi phí trung bình ≈ −2.3; với φ = 0.95 trung bình ≈ 28 trước chi phí và 100% mẫu dương. Hạ ngưỡng vào lệnh làm tăng số giao dịch và chi phí ăn dần lãi. Vị thế quyết định ở nhịp t, hưởng biến động nhịp t+1 (không nhìn trước tương lai). Dữ liệu đồ chơi.';
    }
    update();
  });

  /* ---------- 4. GARCH volatility clustering ---------- */
  Viz.register('garch1', function (root) {
    const n = 1000, r0 = Viz.rng(3), z = [];
    for (let i = 0; i < n; i++) z.push(Viz.randn(r0));
    let a = 0.08, b = 0.9, res;
    const LR = 0.01 * 0.01;
    function run() {
      const om = LR * (1 - a - b), ret = [], vol = []; let s2 = LR;
      for (let t = 0; t < n; t++) { const sg = Math.sqrt(s2); vol.push(sg); const r = sg * z[t]; ret.push(r); s2 = om + a * r * r + b * s2; }
      res = { ret, vol };
    }
    const view = Viz.mount(root, {
      aspect: 0.78, minH: 320, label: 'Lợi suất mô phỏng GARCH(1,1) và độ biến động có điều kiện',
      draw(ctx, W, H, c) {
        run();
        const A = { x: 44, y: 10, w: W - 56, h: H * 0.42 };
        lineChart(ctx, c, A, [{ y: res.ret.map(v => v * 100), color: c.a, width: 1 }], { ymin: -8, ymax: 8, hlines: [{ v: 0, color: c.border, dash: false }], title: 'Lợi suất ngày (%): cụm biến động lớn rồi yên ắng' });
        const B = { x: 44, y: H * 0.42 + 34, w: W - 56, h: H - H * 0.42 - 66 };
        lineChart(ctx, c, B, [{ y: res.vol.map(v => v * 100 * Math.sqrt(252)), color: c.c, width: 2 }], { ymin: 0, title: 'Độ biến động có điều kiện, quy năm (%)', xlabel: 'ngày →' });
      }
    });
    const r1 = U.row(root);
    // giữ α + β ≤ 0.99 để phương sai dài hạn còn xác định (α + β = 1 là mô hình tích phân, không có mức trung bình)
    const sa = U.slider(r1, 'α: phản ứng với cú sốc mới', 0, 0.3, 0.01, a, v => v.toFixed(2), v => { a = v; if (a + b > 0.99) { b = Math.floor((0.99 - a) * 100 + 1e-9) / 100; sb.set(b); } update(); });
    const sb = U.slider(r1, 'β: độ bền của biến động cũ', 0, 0.99, 0.01, b, v => v.toFixed(2), v => { b = v; if (a + b > 0.99) { a = Math.floor((0.99 - b) * 100 + 1e-9) / 100; sa.set(a); } update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const p = a + b, r2 = res.ret.map(v => v * v);
      out.innerHTML = 'Độ bền α+β = <b>' + p.toFixed(2) + '</b>' + (p < 0.999 && p > 0 ? ': một cú sốc biến động mất nửa sức nặng sau khoảng <b>' + (Math.log(0.5) / Math.log(p)).toFixed(0) + ' ngày</b>' : '') + '. Tự tương quan độ trễ 1 của <i>lợi suất</i>: <b>' + acf(res.ret, 1).toFixed(2) + '</b> (≈ 0, hướng giá khó đoán) nhưng của <i>bình phương lợi suất</i>: <b>' + acf(r2, 1).toFixed(2) + '</b> (độ lớn dự đoán được: biến động đi thành cụm). Mức dài hạn cố định ở 1%/ngày (≈ 15.9%/năm); α, β chỉ đổi cách biến động đi quanh mức đó. Kết quả cho thấy ta dự báo <b>rủi ro</b> dễ hơn dự báo <b>hướng giá</b>. Dữ liệu đồ chơi; tham số thị trường thật phải ước lượng.';
    }
    update();
  });

  /* ---------- 5. Sharpe ratio estimation error ---------- */
  Viz.register('sharpe1', function (root) {
    let SR = 1, yrs = 3;
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 240, label: 'Phân phối của Sharpe ước lượng được quanh Sharpe thật',
      draw(ctx, W, H, c) {
        const se = Math.sqrt((1 + 0.5 * SR * SR) / yrs), lo = -4, hi = 6;
        const bx = { x: 44, y: 12, w: W - 60, h: H - 56 };
        const X = v => bx.x + (v - lo) / (hi - lo) * bx.w, pdf = v => Math.exp(-0.5 * Math.pow((v - SR) / se, 2)) / (se * Math.sqrt(2 * Math.PI));
        let ymax = pdf(SR) * 1.1;
        const Y = p => bx.y + (1 - p / ymax) * bx.h;
        ctx.fillStyle = Viz.rgba(c.c, 0.35); ctx.beginPath(); ctx.moveTo(X(lo), Y(0));
        for (let v = lo; v <= 0; v += 0.02) ctx.lineTo(X(v), Y(pdf(v))); ctx.lineTo(X(0), Y(0)); ctx.fill();
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let v = lo; v <= hi; v += 0.02) { if (v === lo) ctx.moveTo(X(v), Y(pdf(v))); else ctx.lineTo(X(v), Y(pdf(v))); } ctx.stroke();
        ctx.strokeStyle = c.fg; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(SR), bx.y); ctx.lineTo(X(SR), bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(X(0), bx.y); ctx.lineTo(X(0), bx.y + bx.h); ctx.stroke();
        ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let v = -4; v <= 6; v += 2) ctx.fillText(String(v), X(v), bx.y + bx.h + 4);
        ctx.fillText('Sharpe quy năm đo được từ dữ liệu quá khứ (vùng đỏ: đo ra âm dù chiến lược thật sự có lãi)', bx.x + bx.w / 2, bx.y + bx.h + 22);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Sharpe thật (quy năm)', 0, 2.5, 0.1, SR, v => v.toFixed(1), v => { SR = v; update(); });
    U.slider(r1, 'Số năm dữ liệu', 0.5, 20, 0.5, yrs, v => v.toFixed(1), v => { yrs = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const se = Math.sqrt((1 + 0.5 * SR * SR) / yrs), need = (1 + 0.5 * SR * SR) / 0.0625;
      out.innerHTML = 'Sai số chuẩn của Sharpe đo được ≈ <b>' + se.toFixed(2) + '</b>; khoảng 95% ≈ <b>' + (SR - 1.96 * se).toFixed(1) + ' → ' + (SR + 1.96 * se).toFixed(1) + '</b>. Xác suất đo ra <b>âm</b> dù Sharpe thật là ' + SR.toFixed(1) + ': <b>' + (100 * ncdf(-SR / se)).toFixed(1) + '%</b>. Muốn sai số chuẩn ≤ 0.25 cần khoảng <b>' + need.toFixed(0) + ' năm</b> dữ liệu. Công thức xấp xỉ √((1 + SR²/2) / số năm) giả định lợi suất độc lập, cùng phân phối (thực tế đuôi dày và tự tương quan làm sai số lớn hơn).';
    }
    update();
  });

  /* ---------- 6. Overfitting: best of N noise strategies ---------- */
  Viz.register('overfit1', function (root) {
    const MAXN = 3000;
    let k = 1.5, yrs = 3, seed = 7, a = [], b = [];
    function reseed() { const r = Viz.rng(seed); a = []; b = []; for (let i = 0; i < MAXN; i++) { a.push(Viz.randn(r)); b.push(Viz.randn(r)); } }
    reseed();
    function stats() {
      const N = Math.round(Math.pow(10, k)), s = 1 / Math.sqrt(yrs); let best = 0;
      for (let i = 1; i < N; i++) if (a[i] > a[best]) best = i;
      return { N, s, best, isb: a[best] * s, oos: b[best] * s };
    }
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 280, label: 'Mỗi chấm là một chiến lược nhiễu thuần túy: Sharpe trong mẫu và ngoài mẫu',
      draw(ctx, W, H, c) {
        const st = stats(), bx = { x: 50, y: 12, w: W - 66, h: H - 52 }, R = 4;
        const X = v => bx.x + (v + R) / (2 * R) * bx.w, Y = v => bx.y + (1 - (v + R) / (2 * R)) * bx.h;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let v = -4; v <= 4; v += 2) { ctx.beginPath(); ctx.moveTo(X(v), bx.y); ctx.lineTo(X(v), bx.y + bx.h); ctx.stroke(); ctx.fillText(String(v), X(v), bx.y + bx.h + 4); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.beginPath(); ctx.moveTo(bx.x, Y(v)); ctx.lineTo(bx.x + bx.w, Y(v)); ctx.stroke(); ctx.fillText(String(v), bx.x - 5, Y(v)); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; }
        ctx.fillStyle = Viz.rgba(c.a, 0.35);
        for (let i = 0; i < st.N; i++) { ctx.beginPath(); ctx.arc(X(Math.max(-R, Math.min(R, a[i] * st.s))), Y(Math.max(-R, Math.min(R, b[i] * st.s))), 2.4, 0, 7); ctx.fill(); }
        ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(X(st.isb), Y(st.oos), 7, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('Sharpe TRONG mẫu (dùng để chọn) →', bx.x + bx.w / 2, bx.y + bx.h + 20);
        ctx.save(); ctx.translate(14, bx.y + bx.h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Sharpe NGOÀI mẫu →', 0, 0); ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Số chiến lược đã thử N', 0, 3.4, 0.05, k, v => String(Math.round(Math.pow(10, v))), v => { k = v; update(); });
    U.slider(r1, 'Số năm dữ liệu', 1, 10, 0.5, yrs, v => v.toFixed(1), v => { yrs = v; update(); });
    U.button(r1, 'Mẫu mới', () => { seed++; reseed(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const st = stats();
      out.innerHTML = 'Chọn chiến lược tốt nhất trong <b>' + st.N + '</b> chiến lược <i>hoàn toàn không có lợi thế</i>: Sharpe trong mẫu của nó là <b>' + st.isb.toFixed(2) + '</b> (chấm lớn viền đen), nhưng ngoài mẫu chỉ còn <b>' + st.oos.toFixed(2) + '</b> (trung bình mọi lần chọn là 0). Thử thêm biến thể, tham số, chỉ báo thì N tăng; N = 1 thì Sharpe trong mẫu chỉ quanh 0. Hãy đếm cả những thứ bạn đã thử và bỏ đi, không chỉ cái bạn giữ lại. Ví dụ đồ chơi: lợi suất độc lập, Sharpe thật = 0 cho mọi chiến lược.';
    }
    update();
  });

  /* ---------- 7. Transaction costs eat the edge ---------- */
  Viz.register('cost1', function (root) {
    let gSR = 1, vol = 10, costBps = 10, turn = 20;
    const view = Viz.mount(root, {
      aspect: 0.55, minH: 260, label: 'Sharpe sau chi phí theo vòng quay danh mục hằng năm',
      draw(ctx, W, H, c) {
        const bx = { x: 44, y: 12, w: W - 60, h: H - 56 }, pts = [];
        const f = (t, cb) => (gSR * vol / 100 - t * cb / 1e4) / (vol / 100);
        const T = []; for (let i = 0; i <= 120; i++) T.push(Math.pow(10, i / 40));
        const mk = cb => T.map(t => f(t, cb));
        const lc = lineChart(ctx, c, bx, [{ y: mk(0), color: c.muted, dash: [4, 3] }, { y: mk(costBps), color: c.a, width: 2.4 }, { y: mk(costBps * 2), color: c.c, width: 1.6 }], { ymin: -2, ymax: Math.max(1, gSR * 1.1), hlines: [{ v: 0, color: c.border, dash: false }], yfmt: v => v.toFixed(1), n: T.length });
        const xi = Math.log10(turn) * 40, X = lc.X(xi), Yv = lc.Y(Math.max(lc.lo, f(turn, costBps)));
        ctx.fillStyle = c.b; ctx.beginPath(); ctx.arc(X, Yv, 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [1, 10, 100, 1000].forEach(t => ctx.fillText(t + '×', lc.X(Math.log10(t) * 40), bx.y + bx.h + 4));
        ctx.fillText('Vòng quay danh mục mỗi năm (lần vốn đem mua bán, thang log)', bx.x + bx.w / 2, bx.y + bx.h + 22);
        ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText('Xám đứt: không chi phí · Xanh: chi phí đang chọn · Cam: gấp đôi chi phí', bx.x + 6, bx.y + 4);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Sharpe trước chi phí', 0.2, 3, 0.1, gSR, v => v.toFixed(1), v => { gSR = v; update(); });
    U.slider(r1, 'Biến động danh mục (%/năm)', 3, 30, 1, vol, v => String(v), v => { vol = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Chi phí mỗi chiều (bps của giá trị giao dịch)', 0, 60, 1, costBps, v => String(v), v => { costBps = v; update(); });
    U.slider(r2, 'Vòng quay mỗi năm (lần)', 1, 1000, 1, turn, v => String(v), v => { turn = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const annual = turn * costBps / 100, gross = gSR * vol, net = (gross - annual) / vol, be = costBps > 0 ? gross / (costBps / 100) : Infinity;
      out.innerHTML = 'Lãi gộp ≈ <b>' + gross.toFixed(1) + '%</b>/năm; chi phí = vòng quay × chi phí mỗi chiều = <b>' + annual.toFixed(2) + '%</b>/năm; Sharpe sau chi phí ≈ <b>' + net.toFixed(2) + '</b>. Vòng quay hòa vốn ≈ <b>' + (isFinite(be) ? be.toFixed(0) + ' lần/năm' : 'không giới hạn') + '</b>. Chi phí thật gồm phí sàn, chênh lệch giá mua bán (spread), trượt giá và tác động thị trường, và <b>tăng theo quy mô vốn</b>; ở đây chỉ là một con số cố định để thấy cơ chế. Giả định đơn giản: lãi gộp không đổi khi tăng vòng quay (thực tế tín hiệu nhanh thường có lãi gộp/lệnh nhỏ hơn).';
    }
    update();
  });
})();
