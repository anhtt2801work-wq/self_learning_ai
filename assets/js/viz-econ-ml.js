/* Economics-friendly demos for the Machine Learning page: loan approval threshold in VND,
 * step-by-step k-fold cross-validation, and bagging as diversification. Toy simulated data. */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-ml.js');

  /* ---------- 1. Loan approval: which score threshold maximises profit (VND)? ---------- */
  Viz.register('loan1', function (root) {
    const N = 3000, r = Viz.rng(31), u = [], z = [];
    for (let i = 0; i < N; i++) { u.push(r()); z.push(Viz.randn(r)); }
    let pi = 0.15, d = 1.5, G = 8, L = 60, t = 1.0;
    const MIN = -3, MAX = 5;
    function pop() { const good = [], bad = []; for (let i = 0; i < N; i++) { if (u[i] < pi) bad.push(z[i] + d); else good.push(z[i]); } return { good, bad }; }
    function profitAt(P, th) { let ag = 0, ab = 0; P.good.forEach(s => { if (s <= th) ag++; }); P.bad.forEach(s => { if (s <= th) ab++; }); return ag * G - ab * L; }
    function curve(P) { const ys = [], ts = []; for (let k = MIN; k <= MAX + 1e-9; k += 0.05) { ts.push(k); ys.push(profitAt(P, k)); } return { ts, ys }; }
    let P = pop(), C = curve(P);
    function best() { let bi = 0; C.ys.forEach((v, i) => { if (v > C.ys[bi]) bi = i; }); return { t: C.ts[bi], v: C.ys[bi] }; }
    function theory() { return (Math.log(G / L) - Math.log(pi / (1 - pi)) + d * d / 2) / d; }
    const view = Viz.mount(root, {
      aspect: 0.8, minH: 330, label: 'Phân phối điểm rủi ro của khách tốt và khách vỡ nợ, và lợi nhuận theo ngưỡng duyệt vay',
      draw(ctx, W, H, c) {
        const A = { x: 56, y: 10, w: W - 70, h: H * 0.4 };
        const h = E.hist(ctx, c, A, [{ vals: P.good, color: c.c }, { vals: P.bad, color: c.b }], MIN, MAX, 48, { title: 'Điểm rủi ro (càng cao càng rủi ro): xanh = khách trả nợ tốt, cam = khách vỡ nợ', tick: 1 });
        ctx.strokeStyle = c.d; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(h.X(t), A.y); ctx.lineTo(h.X(t), A.y + A.h); ctx.stroke();
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = t > (MIN + MAX) / 2 ? 'right' : 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(t > (MIN + MAX) / 2 ? 'duyệt ←  ngưỡng' : 'ngưỡng  → từ chối', h.X(t) + (t > (MIN + MAX) / 2 ? -6 : 6), A.y + A.h - 4);
        const B = { x: 56, y: H * 0.4 + 40, w: W - 70, h: H - H * 0.4 - 72 };
        const mx = Math.max.apply(null, C.ys), mn = Math.min.apply(null, C.ys);
        const lc = E.lineChart(ctx, c, B, [{ y: C.ys, color: c.a, width: 2.4 }], { ymin: mn - (mx - mn) * 0.08, ymax: mx + (mx - mn) * 0.12, n: C.ts.length, yfmt: v => E.vnd(v), hlines: [{ v: 0, color: c.border, dash: false }], title: 'Lợi nhuận danh mục theo ngưỡng (triệu đồng)', xlabel: 'ngưỡng duyệt vay →  (kéo thanh trượt để dời vạch tím)' });
        const ix = i => lc.X((i)), bt = best(), bi = C.ts.indexOf(bt.t);
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(ix(bi), lc.Y(bt.v), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke();
        const ci = Math.round((t - MIN) / 0.05); ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(ix(ci), lc.Y(C.ys[ci]), 6, 0, 7); ctx.fill(); ctx.stroke();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Ngưỡng từ chối (điểm rủi ro)', MIN, MAX, 0.05, t, v => v.toFixed(2), v => { t = v; update(); });
    U.slider(r1, 'Mô hình phân biệt tốt đến đâu', 0.3, 3, 0.1, d, v => v.toFixed(1), v => { d = v; recompute(); });
    const r2 = U.row(root);
    U.slider(r2, 'Tỉ lệ vỡ nợ của danh mục (%)', 3, 40, 1, pi * 100, v => v + '%', v => { pi = v / 100; recompute(); });
    U.slider(r2, 'Lãi thu được mỗi khoản vay tốt (triệu)', 1, 30, 1, G, v => String(v), v => { G = v; recompute(); });
    U.slider(r2, 'Lỗ mỗi khoản vỡ nợ (triệu)', 10, 200, 5, L, v => String(v), v => { L = v; recompute(); });
    const out = U.out(root);
    function recompute() { P = pop(); C = curve(P); update(); }
    function update() {
      view.redraw();
      let tp = 0, fp = 0, fn = 0, tn = 0; P.bad.forEach(s => { if (s > t) tp++; else fn++; }); P.good.forEach(s => { if (s > t) fp++; else tn++; });
      const pr = profitAt(P, t), bt = best(), all = profitAt(P, 99), pstar = G / (G + L);
      out.innerHTML = 'Với ' + N + ' hồ sơ: <b>từ chối đúng khoản sẽ vỡ nợ</b> ' + tp + ', <b>từ chối nhầm khách tốt</b> ' + fp + ' (mất lãi), <b>duyệt nhầm khoản sẽ vỡ nợ</b> ' + fn + ' (mất vốn), duyệt đúng ' + tn + '. Lợi nhuận ở ngưỡng này: <b>' + E.vnd(pr) + '</b>; duyệt tất cả: <b>' + E.vnd(all) + '</b>; ngưỡng tốt nhất trong mẫu: <b>' + bt.t.toFixed(2) + '</b> cho <b>' + E.vnd(bt.v) + '</b> (lý thuyết: ' + theory().toFixed(2) + '). Quy tắc rút ra: chỉ nên từ chối khi xác suất vỡ nợ của hồ sơ vượt <b>lãi / (lãi + lỗ) = ' + (pstar * 100).toFixed(1) + '%</b>, không phải 50%. Vì mất một khoản vỡ nợ đắt gấp ' + (L / G).toFixed(1) + ' lần lãi một khoản tốt, ngưỡng tối ưu khá “khắt khe”. Dữ liệu mô phỏng; số tiền chỉ để minh họa lập luận chi phí–lợi ích biên.';
    }
    update();
  });

  /* ---------- 2. k-fold cross-validation step by step ---------- */
  Viz.register('cvstep1', function (root) {
    const n = 30, K = 5, r = Viz.rng(21), X = [], Y = [];
    for (let i = 0; i < n; i++) X.push(r());
    X.sort((a, b) => a - b);
    for (let i = 0; i < n; i++) Y.push(Math.sin(2 * Math.PI * X[i]) + 0.35 * Viz.randn(r));
    const idx = X.map((_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const fold = new Array(n); idx.forEach((i, k) => { fold[i] = k % K; });
    let deg = 3, step = 0;
    function split(f) { const xt = [], yt = [], xv = [], yv = []; for (let i = 0; i < n; i++) { if (fold[i] === f) { xv.push(X[i]); yv.push(Y[i]); } else { xt.push(X[i]); yt.push(Y[i]); } } return { xt, yt, xv, yv }; }
    function mse(co, xs, ys) { let s = 0; for (let i = 0; i < xs.length; i++) { const e = E.polyval(co, xs[i]) - ys[i]; s += e * e; } return s / xs.length; }
    function foldErr(d, f) { const s = split(f); return mse(E.polyfit(s.xt, s.yt, d), s.xv, s.yv); }
    function cvAll(d) { let s = 0; for (let f = 0; f < K; f++) s += foldErr(d, f); return s / K; }
    function trainErr(d) { return mse(E.polyfit(X, Y, d), X, Y); }
    const view = Viz.mount(root, {
      aspect: 0.72, minH: 300, label: 'Kiểm định chéo 5 phần từng bước: mô hình học trên phần xanh và bị chấm điểm trên phần cam',
      draw(ctx, W, H, c) {
        const A = { x: 44, y: 10, w: W - 58, h: H * 0.58 };
        const f = Math.max(0, step - 1), s = split(f), co = E.polyfit(step ? s.xt : X, step ? s.yt : Y, deg);
        const ys = []; for (let k = 0; k <= 120; k++) ys.push(E.polyval(co, k / 120));
        const lc = E.lineChart(ctx, c, A, [{ y: ys, color: c.a, width: 2.2 }], { ymin: -2, ymax: 2, n: 121, hlines: [{ v: 0, color: c.border, dash: false }], title: step ? 'Bước ' + step + '/' + K + ': học trên 4 phần (xanh), chấm điểm trên phần còn lại (cam)' : 'Dữ liệu 30 quan sát; chưa chia phần' });
        for (let i = 0; i < n; i++) {
          const isVal = step > 0 && fold[i] === f, px = lc.X(X[i] * 120), py = lc.Y(Math.max(-2, Math.min(2, Y[i])));
          ctx.beginPath(); ctx.arc(px, py, isVal ? 6 : 4, 0, 7); ctx.fillStyle = isVal ? c.b : Viz.rgba(c.a, 0.8); ctx.fill();
          if (isVal) { ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke(); const pe = Math.max(-2, Math.min(2, E.polyval(co, X[i]))); ctx.strokeStyle = c.b; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, lc.Y(pe)); ctx.stroke(); ctx.setLineDash([]); }
        }
        const B = { x: 44, y: H * 0.58 + 34, w: W - 58, h: H - H * 0.58 - 52 }, errs = []; for (let k = 0; k < step; k++) errs.push(foldErr(deg, k));
        const top = Math.max(0.3, ...errs, ...(step ? [0] : [])) * 1.2;
        ctx.strokeStyle = c.border; ctx.strokeRect(B.x, B.y, B.w, B.h); ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Sai số bình phương trung bình của từng phần (cam) và trung bình (vạch tím)', B.x + 6, B.y + 4);
        if (!step) { ctx.fillStyle = c.muted; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Chưa có phần nào được chấm điểm: bấm “Bước tiếp”', B.x + B.w / 2, B.y + B.h / 2); }
        const bw = B.w / K; errs.forEach((e, k) => { const h = Math.min(1, e / top) * (B.h - 18); ctx.fillStyle = Viz.rgba(c.b, 0.7); ctx.fillRect(B.x + k * bw + bw * 0.2, B.y + B.h - h, bw * 0.6, h); ctx.fillStyle = c.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(e.toFixed(2), B.x + k * bw + bw / 2, B.y + B.h - h - 1); });
        for (let k = 0; k < K; k++) { ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('phần ' + (k + 1), B.x + k * bw + bw / 2, B.y + B.h + 3); }
        if (errs.length) { const m = E.mean(errs), y = B.y + B.h - Math.min(1, m / top) * (B.h - 18); ctx.strokeStyle = c.d; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B.x, y); ctx.lineTo(B.x + B.w, y); ctx.stroke(); }
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Bước tiếp', () => { step = Math.min(K, step + 1); update(); }, true);
    U.button(r1, 'Chạy hết', () => { step = K; update(); });
    U.button(r1, 'Đặt lại', () => { step = 0; update(); });
    U.slider(r1, 'Độ phức tạp của mô hình (bậc đa thức)', 1, 9, 1, deg, v => String(v), v => { deg = v; update(); });
    const view2 = Viz.mount(root, {
      aspect: 0.4, minH: 200, label: 'Sai số trên dữ liệu đã thấy và sai số kiểm định chéo theo độ phức tạp',
      draw(ctx, W, H, c) {
        const bx = { x: 44, y: 10, w: W - 58, h: H - 40 }, ds = [1, 2, 3, 4, 5, 6, 7, 8, 9], tr = ds.map(trainErr), cv = ds.map(cvAll);
        const lc = E.lineChart(ctx, c, bx, [{ y: tr, color: c.muted, dash: [4, 3], width: 1.8 }, { y: cv, color: c.b, width: 2.4 }], { ymin: 0, ymax: 1.2, n: 9, title: 'Xám đứt: sai số trên chính dữ liệu đã dùng · cam: sai số kiểm định chéo (trung thực)', xlabel: 'bậc đa thức (độ phức tạp) →' });
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ds.forEach((v, i) => ctx.fillText(String(v), lc.X(i), bx.y + bx.h + 18));
        let bi = 0; cv.forEach((v, i) => { if (v < cv[bi]) bi = i; });
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(lc.X(bi), lc.Y(Math.min(1.2, cv[bi])), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = c.d; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lc.X(deg - 1), bx.y); ctx.lineTo(lc.X(deg - 1), bx.y + bx.h); ctx.stroke();
      }
    });
    const out = U.out(root);
    function update() {
      view.redraw(); view2.redraw();
      const cv = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(cvAll); let bi = 0; cv.forEach((v, i) => { if (v < cv[bi]) bi = i; });
      out.innerHTML = step ? 'Phần ' + step + ' đang được dùng để chấm điểm: sai số <b>' + foldErr(deg, step - 1).toFixed(3) + '</b>. ' + (step === K ? 'Trung bình 5 phần: <b>' + cvAll(deg).toFixed(3) + '</b> so với sai số trên chính dữ liệu đã dùng <b>' + trainErr(deg).toFixed(3) + '</b>. ' : '') : 'Bấm “Bước tiếp” để xem từng phần lần lượt bị “giấu đi” rồi dùng chấm điểm. ';
      out.innerHTML += 'Đồ thị dưới: sai số trên dữ liệu đã dùng luôn giảm khi mô hình phức tạp hơn, còn sai số kiểm định chéo giảm rồi tăng; bậc tốt nhất theo kiểm định chéo là <b>' + (bi + 1) + '</b> (chấm xanh lá). Tương tự dự báo kinh tế: một mô hình khớp rất đẹp trong mẫu chưa chắc dự báo tốt ngoài mẫu. Dữ liệu mô phỏng từ đường sin cộng nhiễu.';
    }
    update();
  });

  /* ---------- 3. Bagging as diversification ---------- */
  Viz.register('bag1', function (root) {
    const M = 2000, MB = 50, r = Viz.rng(13), cm = [], idio = [];
    for (let m = 0; m < M; m++) { cm.push(Viz.randn(r)); const row = new Float32Array(MB); for (let b = 0; b < MB; b++) row[b] = Viz.randn(r); idio.push(row); }
    let B = 10, rho = 0.3, S = [], Av = [];
    function run() { S = []; Av = []; for (let m = 0; m < M; m++) { let s = 0; for (let b = 0; b < B; b++) s += Math.sqrt(rho) * cm[m] + Math.sqrt(1 - rho) * idio[m][b]; S.push(Math.sqrt(rho) * cm[m] + Math.sqrt(1 - rho) * idio[m][0]); Av.push(s / B); } }
    run();
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 240, label: 'Phân phối sai số của một mô hình và của trung bình B mô hình',
      draw(ctx, W, H, c) {
        const bx = { x: 20, y: 12, w: W - 34, h: H - 44 };
        const h = E.hist(ctx, c, bx, [{ vals: S, color: c.b }, { vals: Av, color: c.a }], -4, 4, 56, { title: 'Sai số dự báo (0 = đúng): cam = một mô hình đơn lẻ, xanh = trung bình của B mô hình', tick: 1 });
        ctx.strokeStyle = c.fg; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(h.X(0), bx.y); ctx.lineTo(h.X(0), bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Số mô hình B (số “tài sản” trong danh mục)', 1, MB, 1, B, v => String(v), v => { B = v; run(); update(); });
    U.slider(r1, 'Mức giống nhau giữa các mô hình ρ', 0, 1, 0.05, rho, v => v.toFixed(2), v => { rho = v; run(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const s1 = E.sd(S), sB = E.sd(Av), th = Math.sqrt(rho + (1 - rho) / B);
      out.innerHTML = 'Độ lệch chuẩn sai số: một mô hình <b>' + s1.toFixed(2) + '</b>, trung bình ' + B + ' mô hình <b>' + sB.toFixed(2) + '</b> (công thức: √(ρ + (1−ρ)/B) = ' + th.toFixed(2) + '). Đây đúng là bài toán <b>đa dạng hóa danh mục</b>: phần sai số riêng của từng mô hình (rủi ro phi hệ thống) bị triệt tiêu khi lấy trung bình, còn phần chung của mọi mô hình (rủi ro hệ thống, √ρ = ' + Math.sqrt(rho).toFixed(2) + ') thì không bao giờ mất. Muốn giảm tiếp phải làm các mô hình <em>khác nhau hơn</em> (giảm ρ), không phải thêm mô hình giống nhau. Rừng ngẫu nhiên làm đúng điều đó bằng cách cho mỗi cây học trên một mẫu và tập đặc trưng khác nhau.';
    }
    update();
  });
})();
