/* Economics-friendly demos for the MLOps page: retraining policies compared in VND over time (day-by-day replay),
 * and the A/B "peeking" trap replayed experiment by experiment with a price tag. Toy simulated data. */
(function () {
  'use strict';
  const { ui: U } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-mlops.js');
  const dec = (v, k) => v.toFixed(k == null ? 1 : k).replace('.', ',');

  /* ---------- 1. Retraining policies: never / on a calendar / when monitoring fires ---------- */
  Viz.register('retrainsim1', function (root) {
    const D = 120, BASE = 95;
    let r = 0.1, V = 0.5, C = 20, T = 14, thr = 4, delay = 2, shockOn = true, shockDay = 45, shockSize = 5, day = D, timer = null;
    function simulate(policy) {
      let last = 0, pending = -1, cum = 0, retrains = 0; const acc = [], cumc = [];
      for (let t = 0; t <= D; t++) {
        if (t > 0) {
          if (policy === 'cal' && t % T === 0) { last = t; retrains++; cum += C; pending = -1; }
          if (policy === 'mon' && pending === t) { last = t; retrains++; cum += C; pending = -1; }
        }
        const a = BASE - r * (t - last) - (shockOn && t >= shockDay && last < shockDay ? shockSize : 0);
        if (policy === 'mon' && pending < 0 && a <= BASE - thr) pending = t + delay;
        acc.push(a); cum += V * (BASE - a); cumc.push(cum);
      }
      return { acc, cum: cumc, retrains };
    }
    let S;
    function run() { S = { none: simulate('none'), cal: simulate('cal'), mon: simulate('mon') }; }
    run();
    const view = Viz.mount(root, {
      aspect: 0.9, minH: 380, label: 'Độ chính xác và chi phí tích lũy của ba chính sách huấn luyện lại, phát lại từng ngày',
      draw(ctx, W, H, c) {
        const A = { x: 56, y: 12, w: W - 70, h: H * 0.4 }, cols = { none: c.muted, cal: c.a, mon: c.b };
        const cut = a => a.map((v, i) => (i <= day ? v : NaN));
        const lc = E.lineChart(ctx, c, A, ['none', 'cal', 'mon'].map(k => ({ y: cut(S[k].acc), color: cols[k], width: k === 'none' ? 1.8 : 2.4, dash: k === 'none' ? [4, 3] : null })), { ymin: 76, ymax: 96, n: D + 1, yfmt: v => dec(v, 0) + '%', title: 'Độ chính xác của mô hình đang chạy (%)' });
        if (shockOn) { ctx.strokeStyle = c.d; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lc.X(shockDay), A.y); ctx.lineTo(lc.X(shockDay), A.y + A.h); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = c.d; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('sự cố dữ liệu', lc.X(shockDay) + 4, A.y + 20); }
        const B = { x: 56, y: H * 0.4 + 44, w: W - 70, h: H - H * 0.4 - 78 }, mx = Math.max(S.none.cum[D], S.cal.cum[D], S.mon.cum[D]) * 1.05;
        E.lineChart(ctx, c, B, ['none', 'cal', 'mon'].map(k => ({ y: cut(S[k].cum), color: cols[k], width: k === 'none' ? 1.8 : 2.4, dash: k === 'none' ? [4, 3] : null })), { ymin: 0, ymax: mx, n: D + 1, yfmt: v => E.vnd(v), title: 'Chi phí tích lũy: thiệt hại do kém chính xác + phí huấn luyện lại (triệu đồng)', xlabel: 'ngày →   (xám đứt: không bao giờ huấn luyện lại · xanh dương: theo lịch · cam: khi giám sát báo động)' });
        ctx.save(); ctx.strokeStyle = c.fg; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lc.X(day), A.y); ctx.lineTo(lc.X(day), B.y + B.h); ctx.stroke(); ctx.restore();
      }
    });
    const r0 = U.row(root);
    const sl = U.slider(r0, 'Phát lại đến ngày', 0, D, 1, day, v => 'ngày ' + v, v => { stop(); day = v; update(); });
    const play = U.button(r0, 'Chạy tự động', () => { if (timer) { stop(); return; } if (day >= D) { day = 0; } play.textContent = 'Dừng'; timer = setInterval(() => { if (day >= D) { stop(); return; } day = Math.min(D, day + 2); sl.set(day); update(); }, 60); });
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = 'Chạy tự động'; }
    const r1 = U.row(root);
    U.slider(r1, 'Độ chính xác tụt mỗi ngày (điểm %)', 0.02, 0.3, 0.01, r, v => dec(v, 2), v => { r = v; run(); update(); });
    U.slider(r1, 'Mỗi điểm % mất đi tốn mỗi ngày (triệu) ✱', 0.1, 3, 0.1, V, v => dec(v, 1), v => { V = v; run(); update(); });
    U.slider(r1, 'Chi phí một lần huấn luyện lại (triệu) ✱', 2, 100, 1, C, String, v => { C = v; run(); update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Chu kỳ huấn luyện lại theo lịch (ngày)', 3, 60, 1, T, String, v => { T = v; run(); update(); });
    U.slider(r2, 'Giám sát báo động khi tụt (điểm %)', 1, 8, 0.5, thr, v => dec(v, 1), v => { thr = v; run(); update(); });
    U.slider(r2, 'Độ trễ từ báo động tới huấn luyện xong (ngày)', 0, 10, 1, delay, String, v => { delay = v; run(); update(); });
    const r3 = U.row(root);
    U.check(r3, 'Có sự cố dữ liệu đột ngột', shockOn, v => { shockOn = v; run(); update(); });
    U.slider(r3, 'Ngày xảy ra sự cố', 10, 100, 1, shockDay, String, v => { shockDay = v; run(); update(); });
    U.slider(r3, 'Mức sụt do sự cố (điểm %)', 1, 10, 0.5, shockSize, v => dec(v, 1), v => { shockSize = v; run(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const t = day, n = S.none.cum[t], ca = S.cal.cum[t], m = S.mon.cum[t], fin = [['không huấn luyện lại', S.none.cum[D]], ['theo lịch', S.cal.cum[D]], ['theo giám sát', S.mon.cum[D]]].sort((a, b) => a[1] - b[1]);
      out.innerHTML = 'Đến ngày <b>' + t + '</b>: không huấn luyện lại đã mất <b>' + E.vnd(n) + '</b>; theo lịch <b>' + E.vnd(ca) + '</b>; theo giám sát <b>' + E.vnd(m) + '</b>. Cả ' + D + ' ngày: rẻ nhất là <b>' + fin[0][0] + '</b> (' + E.vnd(fin[0][1]) + '), đắt nhất là ' + fin[2][0] + ' (' + E.vnd(fin[2][1]) + '); số lần huấn luyện lại: lịch ' + S.cal.retrains + ', giám sát ' + S.mon.retrains + '. ' +
        'Hãy thử: đặt chu kỳ lịch bằng chu kỳ tối ưu của bài EOQ (với số mặc định là ≈ ' + dec(Math.sqrt(2 * C / (V * r)), 0) + ' ngày) và tắt sự cố: lịch gần như ngang giám sát; bật sự cố (nhất là mức sụt lớn): giám sát rẻ hơn vì bắt được sự cố sớm; đặt ngưỡng báo động quá cao (8 điểm %): giám sát phản ứng quá chậm và đắt hơn lịch. Mô hình đơn giản: suy giảm tuyến tính, sự cố một lần, chi phí cố định; các giá ✱ là giả định.';
    }
    update();
  });

  /* ---------- 2. The A/B "peeking" trap, replayed one experiment at a time ---------- */
  Viz.register('peek1', function (root) {
    const BLK = 100, NB = 50, P0 = 0.10, LOOKS = [10, 20, 30, 40, 50];
    const rng = Viz.rng(77);
    let last = null, tally = { runs: 0, peek: 0, end: 0 }, exps = 100, cost = 50;
    function runOne() {
      let a = 0, b = 0; const z = [];
      for (let k = 1; k <= NB; k++) {
        for (let i = 0; i < BLK; i++) { if (rng() < P0) a++; if (rng() < P0) b++; }
        const n = k * BLK, p = (a + b) / (2 * n), se = Math.sqrt(Math.max(p * (1 - p), 1e-12) * 2 / n);
        z.push((b - a) / n / se);
      }
      let hit = -1; for (const k of LOOKS) { if (Math.abs(z[k - 1]) > 1.96) { hit = k; break; } }
      return { z, hit, end: Math.abs(z[NB - 1]) > 1.96 };
    }
    function add(res) { tally.runs++; if (res.hit >= 0) tally.peek++; if (res.end) tally.end++; last = res; }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 280, label: 'Thống kê z của một thí nghiệm A/B không có hiệu ứng thật, và các lần nhìn trộm',
      draw(ctx, W, H, c) {
        const bx = { x: 50, y: 14, w: W - 64, h: H - 56 };
        const lc = E.lineChart(ctx, c, bx, last ? [{ y: last.z, color: last.hit >= 0 ? c.b : c.a, width: 2.2 }] : [], { ymin: -4, ymax: 4, n: NB, yfmt: v => dec(v, 0), hlines: [{ v: 1.96, color: c.d }, { v: -1.96, color: c.d }, { v: 0, color: c.border, dash: false }], title: 'z = chênh lệch giữa hai nhóm (đơn vị sai số chuẩn); vạch tím = ngưỡng “có ý nghĩa” ±1,96', xlabel: 'số người đã vào thí nghiệm →  (chấm = các lần nhìn trộm)' });
        ctx.save();
        LOOKS.forEach(k => { const x = lc.X(k - 1); ctx.strokeStyle = c.grid; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x, bx.y); ctx.lineTo(x, bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText((k * BLK / 1000) + 'k', x, bx.y + bx.h + 18); if (last) { const v = last.z[k - 1]; ctx.fillStyle = Math.abs(v) > 1.96 ? c.b : c.a; ctx.beginPath(); ctx.arc(x, lc.Y(Math.max(-4, Math.min(4, v))), 5, 0, 7); ctx.fill(); } });
        if (!last) { ctx.fillStyle = c.muted; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Bấm “Chạy 1 thí nghiệm”', bx.x + bx.w / 2, bx.y + bx.h / 2); }
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Chạy 1 thí nghiệm', () => { add(runOne()); update(); }, true);
    U.button(r1, 'Chạy 200 thí nghiệm', () => { for (let i = 0; i < 200; i++) add(runOne()); update(); });
    U.button(r1, 'Xóa kết quả', () => { tally = { runs: 0, peek: 0, end: 0 }; last = null; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Số thí nghiệm mỗi năm', 10, 500, 10, exps, String, v => { exps = v; update(); });
    U.slider(r2, 'Thiệt hại mỗi lần triển khai nhầm (triệu) ✱', 5, 500, 5, cost, String, v => { cost = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      if (!tally.runs) { out.textContent = 'Cả hai nhóm có cùng tỉ lệ thật 10%, tức là KHÔNG có hiệu ứng nào. Lẽ ra bạn chỉ nên “thấy” hiệu ứng khoảng 5% số lần. Hãy chạy thử.'; return; }
      const pk = tally.peek / tally.runs, en = tally.end / tally.runs;
      let msg = 'Sau <b>' + tally.runs + '</b> thí nghiệm không có hiệu ứng thật: dừng ngay khi thấy “có ý nghĩa” ở một trong 5 lần nhìn trộm → kết luận sai <b>' + dec(pk * 100, 1) + '%</b>; chỉ xem một lần ở cuối → sai <b>' + dec(en * 100, 1) + '%</b>.';
      if (last) msg += ' Thí nghiệm vừa chạy: ' + (last.hit >= 0 ? 'bị “bắt quả tang” ở lần nhìn thứ ' + (LOOKS.indexOf(last.hit) + 1) + ' (đường màu cam).' : 'không vượt ngưỡng ở lần nhìn nào.');
      if (tally.runs >= 100) msg += ' Với ' + exps + ' thí nghiệm/năm và thiệt hại ' + E.vnd(cost) + ' mỗi lần triển khai nhầm: nhìn trộm tốn khoảng <b>' + E.vnd(pk * exps * cost) + '</b>/năm, kỷ luật chỉ xem một lần tốn khoảng <b>' + E.vnd(en * exps * cost) + '</b>/năm.';
      else msg += ' Chạy ít nhất 100 thí nghiệm để thấy tỉ lệ ổn định và con số tiền.';
      out.innerHTML = msg + ' Giống kiểm định giả thuyết trong kinh tế lượng: nếu bạn được phép “thử đến khi có ý nghĩa” thì mức ý nghĩa 5% danh nghĩa không còn đúng nữa. Dữ liệu mô phỏng, giá ✱ là giả định.';
    }
    update();
  });
})();
