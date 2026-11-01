/* Economics-friendly demos for the "Kết hợp công cụ AI" page: is a second tool for the same role worth paying for,
 * and is a second (cross) reviewer worth its cost given how correlated the two reviewers are. Toy numbers; ✱ values are user-adjustable assumptions. */
(function () {
  'use strict';
  const { ui: U } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-combo.js');
  const dec = (v, k) => v.toFixed(k == null ? 1 : k).replace('.', ',');

  /* ---------- 1. Is a (second) tool for the same role worth its subscription? ---------- */
  Viz.register('toolroi1', function (root) {
    let H = 40, wage = 100, fx = 25, P1 = 20, s1 = 30, P2 = 30, s2 = 3;
    const net = (s, P) => H * s / 100 * wage * 1000 - P * fx * 1000;          // đồng / tháng
    const view = Viz.mount(root, {
      aspect: 0.6, minH: 300, label: 'Giá trị ròng mỗi tháng của một công cụ theo tỉ lệ thời gian nó giúp tiết kiệm',
      draw(ctx, W, H_, c) {
        const bx = { x: 66, y: 14, w: W - 80, h: H_ - 60 }, xs = []; for (let s = 0; s <= 60; s++) xs.push(s);
        const A = xs.map(s => net(s, P1)), B = xs.map(s => net(s, P2)), all = A.concat(B), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
        const lc = E.lineChart(ctx, c, bx, [{ y: A, color: c.a, width: 2.4 }, { y: B, color: c.b, width: 2.4 }], { ymin: lo - (hi - lo) * 0.05, ymax: hi + (hi - lo) * 0.05, n: xs.length, yfmt: v => dec(v / 1e6, 1) + ' tr', hlines: [{ v: 0, color: c.fg, dash: false }], title: 'Giá trị ròng (triệu đồng/tháng) · xanh dương: công cụ chính · cam: công cụ thứ hai', xlabel: 'tỉ lệ thời gian của vai này mà công cụ giúp tiết kiệm (%) →  0 … 60' });
        ctx.save();
        [[s1, P1, c.a], [s2, P2, c.b]].forEach(([s, P, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lc.X(s), lc.Y(net(s, P)), 7, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke(); });
        [[P1, c.a], [P2, c.b]].forEach(([P, col]) => { const be = P * fx * 1000 / (H * wage * 1000) * 100; if (be <= 60) { ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lc.X(be), bx.y); ctx.lineTo(lc.X(be), bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]); } });
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Giờ làm việc thuộc vai này mỗi tháng', 5, 160, 5, H, String, v => { H = v; update(); });
    U.slider(r1, 'Giá một giờ của bạn (nghìn đồng) ✱', 20, 500, 10, wage, String, v => { wage = v; update(); });
    U.slider(r1, 'Tỉ giá (nghìn đồng/USD) ✱', 20, 30, 0.5, fx, v => dec(v, 1), v => { fx = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Công cụ chính: giá thuê bao (USD/tháng) ✱', 0, 100, 1, P1, String, v => { P1 = v; update(); });
    U.slider(r2, 'Công cụ chính tiết kiệm (% thời gian)', 0, 60, 1, s1, v => v + '%', v => { s1 = v; update(); });
    const r3 = U.row(root);
    U.slider(r3, 'Công cụ thứ hai: giá (USD/tháng) ✱', 0, 100, 1, P2, String, v => { P2 = v; update(); });
    U.slider(r3, 'Công cụ thứ hai tiết kiệm THÊM (% thời gian)', 0, 60, 1, s2, v => v + '%', v => { s2 = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const n1 = net(s1, P1), n2 = net(s2, P2), be1 = P1 * fx / (H * wage) * 100 * 1000 / 1000, be2 = P2 * fx / (H * wage) * 100;
      out.innerHTML = 'Công cụ chính tiết kiệm ' + dec(H * s1 / 100, 1) + ' giờ/tháng, đáng ' + E.money(H * s1 / 100 * wage * 1000) + ' so với phí ' + E.money(P1 * fx * 1000) + ': giá trị ròng <b>' + E.money(n1) + '</b>/tháng (hòa vốn khi tiết kiệm từ <b>' + dec(be1, 1) + '%</b> thời gian). ' +
        'Công cụ thứ hai chỉ tiết kiệm <em>thêm</em> ' + dec(H * s2 / 100, 1) + ' giờ: giá trị ròng <b>' + E.money(n2) + '</b>/tháng; nó chỉ đáng tiền nếu tiết kiệm thêm từ <b>' + dec(be2, 1) + '%</b> trở lên. ' +
        (n2 < 0 ? 'Với các giả định này, <b>trả hai lần cho cùng một vai là lỗ</b>.' : 'Với các giả định này, công cụ thứ hai có lãi.') + ' Điểm mấu chốt: công cụ thứ hai chỉ được tính phần <em>chênh lệch</em> so với công cụ đã có (giá trị biên), không phải toàn bộ thời gian nó tiết kiệm. Giá, tỉ giá, giá một giờ và tỉ lệ tiết kiệm ✱ đều là giả định để minh họa, không phải số đo của công cụ nào.';
    }
    update();
  });

  /* ---------- 2. Second reviewer: marginal value depends on how correlated the two reviewers are ---------- */
  Viz.register('review2roi1', function (root) {
    let Np = 60, q = 25, Lc = 5, d1 = 60, d2 = 50, rho = 0.5, c2 = 30;
    function pBoth(m1, m2, r) { const p = m1 * m2 + r * Math.sqrt(m1 * (1 - m1) * m2 * (1 - m2)), lo = Math.max(0, m1 + m2 - 1), hi = Math.min(m1, m2); return Math.min(Math.max(p, lo), hi); }
    function net(r) { const m1 = 1 - d1 / 100, m2 = 1 - d2 / 100; return Np * q / 100 * (m1 - pBoth(m1, m2, r)) * Lc - Np * c2 / 1000; }      // triệu đồng / tháng
    function rhoStar() { for (let k = 0; k <= 1000; k++) { if (net(k / 1000) < 0) return k === 0 ? 0 : (k - 1) / 1000; } return null; }
    const view = Viz.mount(root, {
      aspect: 0.55, minH: 290, label: 'Giá trị ròng mỗi tháng của người review thứ hai theo mức tương quan giữa hai người review',
      draw(ctx, W, H, c) {
        const bx = { x: 62, y: 14, w: W - 76, h: H - 56 }, ys = []; for (let k = 0; k <= 100; k++) ys.push(net(k / 100));
        const lo = Math.min(0, ...ys), hi = Math.max(0, ...ys), pad = (hi - lo) * 0.08 + 0.1;
        const lc = E.lineChart(ctx, c, bx, [{ y: ys, color: c.a, width: 2.6 }], { ymin: lo - pad, ymax: hi + pad, n: ys.length, yfmt: v => dec(v, 1) + ' tr', hlines: [{ v: 0, color: c.fg, dash: false }], title: 'Lợi ích ròng của người review thứ hai (triệu đồng/tháng) = lỗi lọt giảm được × thiệt hại − chi phí review', xlabel: 'ρ: hai người review hay bỏ sót CÙNG những lỗi nào (0 = độc lập, 1 = giống hệt nhau) →' });
        const rs = rhoStar(); ctx.save();
        if (rs !== null && rs < 1) { ctx.strokeStyle = c.c; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(lc.X(rs * 100), bx.y); ctx.lineTo(lc.X(rs * 100), bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(lc.X(rho * 100), lc.Y(net(rho)), 7, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'ρ: mức bỏ sót giống nhau', 0, 1, 0.01, rho, v => dec(v, 2), v => { rho = v; update(); });
    U.slider(r1, 'Người 1 bắt được lỗi (%)', 10, 95, 5, d1, v => v + '%', v => { d1 = v; update(); });
    U.slider(r1, 'Người 2 bắt được lỗi (%)', 10, 95, 5, d2, v => v + '%', v => { d2 = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Số PR mỗi tháng', 5, 500, 5, Np, String, v => { Np = v; update(); });
    U.slider(r2, 'Tỉ lệ PR có lỗi (%) ✱', 2, 80, 1, q, v => v + '%', v => { q = v; update(); });
    U.slider(r2, 'Thiệt hại nếu lọt một lỗi (triệu) ✱', 0.2, 50, 0.2, Lc, v => dec(v, 1), v => { Lc = v; update(); });
    U.slider(r2, 'Chi phí một lần review thêm (nghìn) ✱', 1, 300, 1, c2, String, v => { c2 = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const m1 = 1 - d1 / 100, m2 = 1 - d2 / 100, pb = pBoth(m1, m2, rho), rs = rhoStar();
      out.innerHTML = 'Với ρ = <b>' + dec(rho, 2) + '</b>: xác suất cả hai cùng sót một lỗi là <b>' + dec(pb * 100, 1) + '%</b> (chỉ người 1: ' + dec(m1 * 100, 0) + '%), nên người thứ hai giảm lỗi lọt ' + dec((m1 - pb) * 100, 1) + ' điểm %. Giá trị ròng: <b>' + E.vnd(net(rho)) + '</b>/tháng. ' +
        (rs === null ? 'Dù hai người giống hệt nhau, người thứ hai vẫn có lãi với các giả định này.' : rs === 0 ? 'Với các giả định này, người thứ hai không đáng tiền ngay cả khi hoàn toàn độc lập.' : 'Người thứ hai chỉ đáng tiền khi ρ nhỏ hơn khoảng <b>' + dec(rs, 2) + '</b> (vạch xanh lá). ') +
        ' Giống kiểm toán độc lập: chỉ đáng trả thêm tiền cho người kiểm tra có cách nhìn <em>khác</em>; kiểm thử chạy thật là “người review” có ρ thấp nhất. Mô hình dùng công thức ở khối bên trên; ρ, tỉ lệ bắt lỗi và các giá ✱ là giả định minh họa, không phải số đo của công cụ nào.';
    }
    update();
  });
})();
