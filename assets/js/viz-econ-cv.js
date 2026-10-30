/* Economics-friendly demos for the Computer Vision page: convolution as a rolling window (step by step),
 * defect-detection threshold priced in VND, and the API-vs-self-hosting break-even. Toy simulated data. */
(function () {
  'use strict';
  const { ui: U } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-cv.js');
  const dec = (v, k) => v.toFixed(k == null ? 1 : k).replace('.', ',');
  const wt = w => Math.abs(w - 1 / 3) < 1e-9 ? '1/3' : dec(w, 0);

  /* ---------- 1. Convolution = weighted rolling window over a sales series, step by step ---------- */
  Viz.register('conv1d1', function (root) {
    const X = [120, 125, 118, 130, 128, 135, 150, 210, 155, 148, 140, 152, 149, 158];
    const KS = {
      ma: { name: 'Trung bình trượt 3 ngày', k: [1 / 3, 1 / 3, 1 / 3], note: 'làm mượt: cú tăng đột biến bị “dàn đều” sang các ngày bên cạnh' },
      diff: { name: 'Phát hiện thay đổi (ngày sau trừ ngày trước)', k: [-1, 0, 1], note: 'đo đà thay đổi: dương khi doanh thu đang tăng, âm khi đang giảm' },
      peak: { name: 'Nhấn đỉnh (so với hai ngày bên cạnh)', k: [-1, 2, -1], note: 'lớn khi một ngày “nhô lên” so với hai ngày xung quanh, gần 0 khi doanh thu đi ngang' }
    };
    let key = 'ma', step = 0, timer = null;
    const n = X.length;
    function outs() { const k = KS[key].k, o = []; for (let i = 0; i + 2 < n; i++) o.push(k[0] * X[i] + k[1] * X[i + 1] + k[2] * X[i + 2]); return o; }
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 330, label: 'Cửa sổ ba ngày trượt trên chuỗi doanh thu; mỗi bước tạo ra một giá trị đầu ra',
      draw(ctx, W, H, c) {
        const k = KS[key].k, o = outs(), m = o.length;
        const L = 46, R = W - 12, bw = (R - L) / n;
        const A = { y: 40, h: H * 0.34 }, hi = 230;
        ctx.save(); ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('Doanh thu mỗi ngày (triệu đồng) · khung tím = cửa sổ 3 ngày đang xét', L, 3);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let g = 0; g <= 4; g++) { const v = hi * g / 4, y = A.y + A.h - v / hi * A.h; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); ctx.fillText(String(Math.round(v)), L - 5, y); }
        for (let i = 0; i < n; i++) {
          const h = X[i] / hi * A.h, x = L + i * bw + bw * 0.15, inWin = i >= step && i < step + 3;
          ctx.fillStyle = inWin ? Viz.rgba(c.d, 0.85) : Viz.rgba(c.a, 0.55); ctx.fillRect(x, A.y + A.h - h, bw * 0.7, h);
          ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText(String(i + 1), x + bw * 0.35, A.y + A.h + 2);
          if (inWin) { ctx.fillStyle = c.fg; ctx.textBaseline = 'bottom'; ctx.fillText(String(X[i]), x + bw * 0.35, A.y + A.h - h - 1); }
        }
        ctx.strokeStyle = c.d; ctx.lineWidth = 2.2; ctx.strokeRect(L + step * bw + 1, A.y - 4, 3 * bw - 2, A.h + 8);
        ctx.fillStyle = c.d; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textBaseline = 'bottom';
        for (let j = 0; j < 3; j++) { ctx.textAlign = 'center'; ctx.fillText('×' + wt(k[j]), L + (step + j) * bw + bw / 2, A.y - 5); }
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('ngày →', R, A.y + A.h + 14);
        const B = { y: A.y + A.h + 56, h: H - (A.y + A.h + 56) - 24 };
        let mn = Math.min(0, ...o), mx = Math.max(0, ...o); if (mx - mn < 1e-9) mx = mn + 1;
        const pad = (mx - mn) * 0.1; mn -= pad; mx += pad; const Y = v => B.y + (1 - (v - mn) / (mx - mn)) * B.h;
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('Kết quả (' + KS[key].name + '): mỗi bước thêm một cột, đặt tại ngày giữa cửa sổ', L, B.y - 6);
        ctx.strokeStyle = c.border; ctx.lineWidth = 1; ctx.strokeRect(L, B.y, R - L, B.h);
        ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(R, Y(0)); ctx.stroke();
        for (let s = 0; s < m; s++) {
          const x = L + (s + 1) * bw + bw * 0.15, cur = s === step;
          if (s > step) continue;
          ctx.fillStyle = cur ? Viz.rgba(c.d, 0.9) : Viz.rgba(c.c, 0.75);
          const y0 = Y(0), y1 = Y(o[s]); ctx.fillRect(x, Math.min(y0, y1), bw * 0.7, Math.max(1.5, Math.abs(y1 - y0)));
          ctx.fillStyle = c.fg; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = o[s] >= 0 ? 'bottom' : 'top';
          ctx.fillText(dec(o[s], key === 'ma' ? 0 : 0), x + bw * 0.35, o[s] >= 0 ? Y(o[s]) - 1 : Y(o[s]) + 1);
        }
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Bước tiếp', () => { stop(); step = Math.min(n - 3, step + 1); update(); }, true);
    const play = U.button(r1, 'Chạy tự động', () => { if (timer) { stop(); return; } if (step >= n - 3) step = 0; play.textContent = 'Dừng'; timer = setInterval(() => { if (step >= n - 3) { stop(); return; } step++; update(); }, 650); update(); });
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = 'Chạy tự động'; }
    U.button(r1, 'Đặt lại', () => { stop(); step = 0; update(); });
    U.select(r1, 'Bộ lọc (kernel)', Object.keys(KS).map(k => [k, KS[k].name]), v => { key = v; step = 0; stop(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const k = KS[key].k, a = X[step], b = X[step + 1], d = X[step + 2], o = outs()[step];
      const t = (w, x) => (w < 0 ? '(' + wt(w) + ')' : wt(w)) + '×' + x;
      out.innerHTML = 'Bước <b>' + (step + 1) + '/' + (n - 2) + '</b>: ngày ' + (step + 1) + '–' + (step + 3) + '. Tính: ' + t(k[0], a) + ' + ' + t(k[1], b) + ' + ' + t(k[2], d) + ' = <b>' + dec(o, 1) + '</b>. ' +
        'Bộ lọc này ' + KS[key].note + '. Đây chính là cách một lớp tích chập hoạt động, chỉ khác là trên ảnh cửa sổ có hai chiều (3×3 điểm ảnh) và các trọng số được <b>học</b> từ dữ liệu thay vì chọn tay. Dữ liệu mô phỏng; ngày 8 là một đợt khuyến mãi.';
    }
    update();
  });

  /* ---------- 2. Defect inspection: confidence threshold priced in VND ---------- */
  Viz.register('defect1', function (root) {
    const N = 4000, r = Viz.rng(52), u = [], z = [];
    for (let i = 0; i < N; i++) { u.push(r()); z.push(Viz.randn(r)); }
    let pi = 0.03, d = 2.5, Cmiss = 3, Cfa = 0.05, t = 1.5;
    const MIN = -3, MAX = 6, TS = [];
    for (let k = MIN; k <= MAX + 1e-9; k += 0.05) TS.push(+k.toFixed(2));
    let P, M;
    function build() {
      const good = [], bad = [];
      for (let i = 0; i < N; i++) { if (u[i] < pi) bad.push(z[i] + d); else good.push(z[i]); }
      P = { good, bad };
      M = TS.map(th => { let tp = 0, fp = 0; P.bad.forEach(s => { if (s > th) tp++; }); P.good.forEach(s => { if (s > th) fp++; }); const fn = P.bad.length - tp; return { tp, fp, fn, rec: P.bad.length ? tp / P.bad.length : 0, prec: tp + fp ? tp / (tp + fp) : 1, cost: (fp * Cfa + fn * Cmiss) / N * 1000 }; });
    }
    function idx(th) { return Math.max(0, Math.min(TS.length - 1, Math.round((th - MIN) / 0.05))); }
    function best() { let b = 0; M.forEach((m, i) => { if (m.cost < M[b].cost) b = i; }); return b; }
    function theory() { const ps = Cfa / (Cfa + Cmiss); return (Math.log(ps / (1 - ps)) - Math.log(pi / (1 - pi)) + d * d / 2) / d; }
    build();
    const view = Viz.mount(root, {
      aspect: 0.8, minH: 340, label: 'Đường precision–recall của bộ kiểm tra lỗi và chi phí trên 1.000 sản phẩm theo ngưỡng cảnh báo',
      draw(ctx, W, H, c) {
        const A = { x: 56, y: 12, w: W - 70, h: H * 0.38 };
        ctx.save(); ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.lineWidth = 1;
        for (let g = 0; g <= 4; g++) { const y = A.y + A.h * g / 4; ctx.beginPath(); ctx.moveTo(A.x, y); ctx.lineTo(A.x + A.w, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round((1 - g / 4) * 100) + '%', A.x - 5, y); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let g = 0; g <= 4; g++) ctx.fillText(Math.round(g * 25) + '%', A.x + A.w * g / 4, A.y + A.h + 3);
        ctx.strokeStyle = c.border; ctx.strokeRect(A.x, A.y, A.w, A.h);
        const X = rc => A.x + rc * A.w, Y = p => A.y + (1 - p) * A.h;
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.2; ctx.beginPath(); let pen = false;
        M.forEach(m => { if (m.tp + m.fp === 0) return; if (pen) ctx.lineTo(X(m.rec), Y(m.prec)); else { ctx.moveTo(X(m.rec), Y(m.prec)); pen = true; } }); ctx.stroke();
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('Đánh đổi: trục dọc = tỉ lệ cảnh báo đúng (precision), trục ngang = tỉ lệ lỗi bắt được (recall)', A.x + 6, A.y + 4);
        const bi = best(), ci = idx(t);
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(X(M[bi].rec), Y(M[bi].prec), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(X(M[ci].rec), Y(M[ci].prec), 6, 0, 7); ctx.fill(); ctx.stroke();
        ctx.restore();
        const B = { x: 56, y: H * 0.38 + 46, w: W - 70, h: H - H * 0.38 - 78 };
        const ys = M.map(m => m.cost), mx = Math.max.apply(null, ys);
        const lc = E.lineChart(ctx, c, B, [{ y: ys, color: c.b, width: 2.4 }], { ymin: 0, ymax: mx * 1.08, n: ys.length, yfmt: v => E.vnd(v), title: 'Chi phí trên 1.000 sản phẩm (triệu đồng): kiểm nhầm + bỏ sót lỗi', xlabel: 'ngưỡng cảnh báo → (càng cao, càng ít cảnh báo; kéo thanh để dời chấm tím)' });
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(lc.X(bi), lc.Y(ys[bi]), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(lc.X(ci), lc.Y(ys[ci]), 6, 0, 7); ctx.fill(); ctx.stroke();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Ngưỡng cảnh báo (điểm tin cậy)', MIN, MAX, 0.05, t, v => v.toFixed(2), v => { t = v; update(); });
    U.slider(r1, 'Camera phân biệt tốt đến đâu', 0.5, 4, 0.1, d, v => v.toFixed(1), v => { d = v; recompute(); });
    const r2 = U.row(root);
    U.slider(r2, 'Tỉ lệ sản phẩm lỗi (%)', 1, 20, 1, pi * 100, v => v + '%', v => { pi = v / 100; recompute(); });
    U.slider(r2, 'Thiệt hại nếu lọt một sản phẩm lỗi (triệu)', 0.5, 20, 0.5, Cmiss, v => dec(v, 1), v => { Cmiss = v; recompute(); });
    U.slider(r2, 'Chi phí kiểm lại một cảnh báo sai (triệu)', 0.01, 1, 0.01, Cfa, v => dec(v, 2), v => { Cfa = v; recompute(); });
    const out = U.out(root);
    function recompute() { build(); update(); }
    function update() {
      view.redraw();
      const ci = idx(t), bi = best(), m = M[ci], b = M[bi], none = P.bad.length / N * 1000 * Cmiss, all = (P.good.length * Cfa) / N * 1000;
      out.innerHTML = 'Ở ngưỡng <b>' + dec(t, 2) + '</b>, trên mỗi 1.000 sản phẩm: bắt đúng <b>' + dec(m.tp / N * 1000, 1) + '</b> lỗi, cảnh báo nhầm <b>' + dec(m.fp / N * 1000, 1) + '</b> sản phẩm tốt, bỏ sót <b>' + dec(m.fn / N * 1000, 1) + '</b> lỗi. Precision ' + Math.round(m.prec * 100) + '%, recall ' + Math.round(m.rec * 100) + '%. Chi phí: <b>' + E.vnd(m.cost) + '</b>. ' +
        'So sánh: không kiểm tra gì mất <b>' + E.vnd(none) + '</b>; cảnh báo mọi sản phẩm mất <b>' + E.vnd(all) + '</b>; ngưỡng rẻ nhất trong mẫu là <b>' + TS[bi].toFixed(2) + '</b> với <b>' + E.vnd(b.cost) + '</b> (lý thuyết: ' + theory().toFixed(2) + '). Quy tắc: cảnh báo khi xác suất lỗi của sản phẩm vượt <b>' + dec(Cfa / (Cfa + Cmiss) * 100, 1) + '%</b> (chi phí kiểm lại ÷ tổng hai khoản). Vì bỏ sót đắt gấp ' + dec(Cmiss / Cfa, 0) + ' lần một lần kiểm lại, ngưỡng tối ưu thường <em>thấp</em>, chấp nhận nhiều cảnh báo sai. Dữ liệu mô phỏng; số tiền chỉ để minh họa.';
    }
    update();
  });

  /* ---------- 3. Rent an API or run your own vision model? Break-even analysis ---------- */
  Viz.register('cvcost1', function (root) {
    let lg = 6, api = 40, accApi = 94, accOwn = 97, fix = 3, gpu = 15, thr = 30, util = 30, eng = 20;
    const SEC = 30 * 24 * 3600, LO = 4, HI = 8;
    function apiCost(N) { return N * api / 1e6 + N * (1 - accApi / 100) * fix / 1e3; }                      // triệu đồng
    function ownCost(N) { const cap = thr * SEC * util / 100, srv = Math.max(1, Math.ceil(N / cap)); return srv * gpu + eng + N * (1 - accOwn / 100) * fix / 1e3; }
    function breakEven() { let prev = null; for (let e = LO; e <= HI + 1e-9; e += 0.01) { const N = Math.pow(10, e), diff = apiCost(N) - ownCost(N); if (prev !== null && prev <= 0 && diff > 0) return N; prev = diff; } return null; }
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 320, label: 'Chi phí hàng tháng của việc thuê API nhận dạng ảnh và tự vận hành mô hình, theo số ảnh mỗi tháng',
      draw(ctx, W, H, c) {
        const bx = { x: 62, y: 14, w: W - 76, h: H - 62 }, pts = 160, ex = i => LO + (HI - LO) * i / (pts - 1);
        const A = [], O = []; for (let i = 0; i < pts; i++) { const N = Math.pow(10, ex(i)); A.push(apiCost(N)); O.push(ownCost(N)); }
        const lo = Math.max(1, Math.min(A[0], O[0])), hi = Math.max(A[pts - 1], O[pts - 1]) * 1.1;
        const Yl = v => bx.y + (1 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * bx.h;
        const Xp = e => bx.x + (e - LO) / (HI - LO) * bx.w;
        ctx.save(); ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let p = Math.ceil(Math.log10(lo)); p <= Math.floor(Math.log10(hi)); p++) { const y = Yl(Math.pow(10, p)); ctx.beginPath(); ctx.moveTo(bx.x, y); ctx.lineTo(bx.x + bx.w, y); ctx.stroke(); ctx.fillText(E.vnd(Math.pow(10, p)), bx.x - 5, y); }
        ctx.textBaseline = 'top';
        for (let e = LO; e <= HI; e++) { ctx.textAlign = e === HI ? 'right' : 'center'; ctx.beginPath(); ctx.moveTo(Xp(e), bx.y); ctx.lineTo(Xp(e), bx.y + bx.h); ctx.stroke(); ctx.fillText(e === 4 ? '10 nghìn' : e === 5 ? '100 nghìn' : e === 6 ? '1 triệu' : e === 7 ? '10 triệu' : '100 triệu', Xp(e), bx.y + bx.h + 4); }
        ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
        const line = (arr, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); arr.forEach((v, i) => { const x = Xp(ex(i)), y = Yl(v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); };
        line(A, c.b); line(O, c.a);
        const be = breakEven(); if (be) { const e = Math.log10(be), y = Yl(apiCost(be)); ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(Xp(e), y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke(); }
        ctx.strokeStyle = c.d; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(Xp(lg), bx.y); ctx.lineTo(Xp(lg), bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = c.b; ctx.fillText('cam: thuê API', bx.x + 8, bx.y + 6); ctx.fillStyle = c.a; ctx.fillText('xanh dương: tự vận hành', bx.x + 8, bx.y + 22);
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('số ảnh mỗi tháng (thang logarit) →', bx.x + bx.w / 2, bx.y + bx.h + 22);
        ctx.restore();
      }
    });
    const r0 = U.row(root);
    U.slider(r0, 'Số ảnh mỗi tháng (10^x)', LO, HI, 0.05, lg, v => Math.round(Math.pow(10, v)).toLocaleString('vi-VN'), v => { lg = v; update(); });
    const r1 = U.row(root);
    U.slider(r1, 'Giá API mỗi 1.000 ảnh (nghìn đồng) ✱', 5, 200, 5, api, String, v => { api = v; update(); });
    U.slider(r1, 'Độ chính xác của API (%)', 80, 99, 1, accApi, String, v => { accApi = v; update(); });
    U.slider(r1, 'Độ chính xác của mô hình tự huấn luyện (%)', 80, 99.5, 0.5, accOwn, String, v => { accOwn = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Chi phí sửa tay mỗi ảnh sai (nghìn đồng)', 0.5, 20, 0.5, fix, v => dec(v, 1), v => { fix = v; update(); });
    U.slider(r2, 'Thuê một máy GPU mỗi tháng (triệu) ✱', 3, 60, 1, gpu, String, v => { gpu = v; update(); });
    U.slider(r2, 'Kỹ sư vận hành (triệu/tháng) ✱', 0, 60, 1, eng, String, v => { eng = v; update(); });
    const r3 = U.row(root);
    U.slider(r3, 'Tốc độ một máy (ảnh/giây) ✱', 5, 200, 5, thr, String, v => { thr = v; update(); });
    U.slider(r3, 'Tải trung bình của máy (%)', 10, 80, 5, util, String, v => { util = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const N = Math.pow(10, lg), a = apiCost(N), o = ownCost(N), be = breakEven(), cap = thr * SEC * util / 100, srv = Math.max(1, Math.ceil(N / cap));
      out.innerHTML = 'Với <b>' + Math.round(N).toLocaleString('vi-VN') + '</b> ảnh/tháng: thuê API tốn <b>' + E.vnd(a) + '</b> (trong đó sửa lỗi ' + E.vnd(N * (1 - accApi / 100) * fix / 1e3) + '); tự vận hành tốn <b>' + E.vnd(o) + '</b> (' + srv + ' máy GPU + kỹ sư + sửa lỗi ' + E.vnd(N * (1 - accOwn / 100) * fix / 1e3) + '). ' + (a < o ? 'Thuê API <b>rẻ hơn</b>' : 'Tự vận hành <b>rẻ hơn</b>') + ' ' + E.vnd(Math.abs(a - o)) + '. ' +
        (be ? 'Điểm hòa vốn khoảng <b>' + Math.round(be).toLocaleString('vi-VN') + '</b> ảnh/tháng (chấm xanh lá).' : 'Trong khoảng 10 nghìn đến 100 triệu ảnh/tháng, hai đường không cắt nhau theo hướng “tự vận hành rẻ hơn khi lớn”.') +
        ' Đây là phân tích hòa vốn quen thuộc: chi phí cố định (máy, kỹ sư) so với chi phí biến đổi (trả theo ảnh), cộng thêm <em>chi phí của sai sót</em>, thường mới là khoản lớn nhất. Các giá ✱ đều là giả định để minh họa; hãy thay bằng bảng giá và số đo thực tế của bạn.';
    }
    update();
  });
})();
