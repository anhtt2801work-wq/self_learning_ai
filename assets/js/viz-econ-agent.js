/* Economics-friendly demos for the Agentic AI page: unit economics of an agent task (cost per completed task
 * vs a human, with retries and review) and human approval as an internal control (review only actions above a value threshold). */
(function () {
  'use strict';
  const { ui: U } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-agent.js');
  const dec = (v, k) => v.toFixed(k == null ? 1 : k).replace('.', ',');
  const kvnd = k => E.money(k * 1000);          // nghìn đồng → text

  /* ---------- 1. Cost per completed task: agent (with retries and review) vs a person ---------- */
  Viz.register('agentroi1', function (root) {
    let N = 2000, h = 120, T = 12, rr = 1500, pin = 75, p = 70, retry = 1, rev = 20;
    const S0 = 6000, a = 200, OUT = 5;
    function run() { const inp = T * S0 + (a + rr) * T * (T - 1) / 2, out = T * a; return (inp * pin + out * pin * OUT) / 1e6; }   // nghìn đồng một lần chạy
    function cost(pp, r) { const q = 1 - pp, E_ = (1 - Math.pow(q, r + 1)) / pp, fail = Math.pow(q, r + 1); return E_ * (run() + rev) + fail * h; }
    function breakEven(r) { for (let k = 1; k <= 100; k++) if (cost(k / 100, r) < h) return k; return null; }
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 320, label: 'Chi phí kỳ vọng để hoàn thành một tác vụ bằng agent so với người, theo tỉ lệ thành công mỗi lần chạy',
      draw(ctx, W, H, c) {
        const bx = { x: 62, y: 14, w: W - 76, h: H - 56 }, xs = []; for (let k = 10; k <= 100; k++) xs.push(k);
        const mk = r => xs.map(k => cost(k / 100, r)), top = Math.max(h * 1.6, ...mk(0).slice(0, 5));
        const lc = E.lineChart(ctx, c, bx, [{ y: mk(0), color: c.b, width: 2 }, { y: mk(1), color: c.a, width: 2.4 }, { y: mk(3), color: c.c, width: 2 }], { ymin: 0, ymax: top, n: xs.length, yfmt: v => Math.round(v) + ' nghìn', hlines: [{ v: h, color: c.fg }], title: 'cam: không thử lại · xanh dương: thử lại 1 lần · xanh lá: 3 lần · vạch đứt: người làm', xlabel: 'tỉ lệ thành công của agent mỗi lần chạy (%) →  10 … 100' });
        ctx.save(); const x = lc.X(p - 10); ctx.strokeStyle = c.d; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, bx.y); ctx.lineTo(x, bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(x, lc.Y(Math.min(top, cost(p / 100, retry))), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Tỉ lệ thành công mỗi lần chạy (%)', 10, 100, 1, p, v => v + '%', v => { p = v; update(); });
    U.slider(r1, 'Số lần thử lại tối đa', 0, 3, 1, retry, String, v => { retry = v; update(); });
    U.slider(r1, 'Số bước của agent', 3, 40, 1, T, String, v => { T = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Kết quả công cụ mỗi bước (token)', 200, 6000, 100, rr, v => v.toLocaleString('vi-VN'), v => { rr = v; update(); });
    U.slider(r2, 'Giá token đầu vào mỗi 1 triệu (nghìn đồng) ✱', 10, 400, 5, pin, String, v => { pin = v; update(); });
    U.slider(r2, 'Chi phí người duyệt mỗi kết quả (nghìn) ✱', 0, 100, 1, rev, String, v => { rev = v; update(); });
    const r3 = U.row(root);
    U.slider(r3, 'Chi phí nhân viên làm một tác vụ (nghìn) ✱', 20, 500, 5, h, String, v => { h = v; update(); });
    U.slider(r3, 'Số tác vụ mỗi tháng', 100, 20000, 100, N, v => v.toLocaleString('vi-VN'), v => { N = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const c1 = cost(p / 100, retry), save = N * (h - c1) / 1000, be = breakEven(retry), q = 1 - p / 100, E_ = (1 - Math.pow(q, retry + 1)) / (p / 100);
      out.innerHTML = 'Một lần chạy agent tốn <b>' + kvnd(run()) + '</b> (ngữ cảnh gửi lại mỗi bước nên tăng gần bậc hai theo số bước) cộng ' + kvnd(rev) + ' duyệt = ' + kvnd(run() + rev) + '. Với tỉ lệ thành công ' + p + '% và thử lại tối đa ' + retry + ' lần, bình quân phải chạy <b>' + dec(E_, 2) + '</b> lần, và ' + dec(Math.pow(q, retry + 1) * 100, 1) + '% tác vụ vẫn thất bại và chuyển cho người. Chi phí kỳ vọng mỗi tác vụ: <b>' + kvnd(c1) + '</b> so với ' + kvnd(h) + ' nếu người làm. ' +
        (save >= 0 ? 'Tiết kiệm khoảng <b>' + E.vnd(save) + '</b>/tháng' : 'Agent đang <b>đắt hơn</b> người khoảng <b>' + E.vnd(-save) + '</b>/tháng') + '. ' + (be ? 'Với số thử lại này, agent bắt đầu rẻ hơn người khi tỉ lệ thành công từ khoảng <b>' + be + '%</b> trở lên. ' : 'Ở mức giá này agent không rẻ hơn người dù thành công 100%. ') +
        'Bài học: tỉ lệ thành công và chi phí duyệt thường quan trọng hơn giá token. Các giá ✱ là giả định minh họa (giá đầu ra giả định gấp 5 lần đầu vào), hãy thay bằng số của bạn.';
    }
    update();
  });

  /* ---------- 2. Human approval as an internal control: review only actions above a value threshold ---------- */
  Viz.register('approval1', function (root) {
    const N = 4000, r = Viz.rng(63), val = [];
    for (let i = 0; i < N; i++) val.push(300 * Math.exp(1.2 * Viz.randn(r)));            // nghìn đồng, lognormal, trung vị 300
    let e = 3, d = 90, v = 15, lx = 2.5;
    const XS = []; for (let k = 1; k <= 5 + 1e-9; k += 0.05) XS.push(+k.toFixed(2));
    function costAt(x) { const t = Math.pow(10, x); let rv = 0, loss = 0; val.forEach(w => { if (w > t) { rv += v; loss += e / 100 * (1 - d / 100) * w; } else loss += e / 100 * w; }); return { rv, loss, tot: rv + loss }; }
    let C = XS.map(costAt);
    function recompute() { C = XS.map(costAt); update(); }
    function best() { let b = 0; C.forEach((c, i) => { if (c.tot < C[b].tot) b = i; }); return b; }
    const logs = val.map(w => Math.log10(w));
    const view = Viz.mount(root, {
      aspect: 0.82, minH: 340, label: 'Phân phối giá trị các hành động của agent và chi phí kiểm soát theo ngưỡng giá trị phải có người duyệt',
      draw(ctx, W, H, c) {
        const A = { x: 56, y: 12, w: W - 70, h: H * 0.34 };
        const hh = E.hist(ctx, c, A, [{ vals: logs, color: c.a }], 1, 5, 40, { title: 'Số hành động theo giá trị (trục ngang: log10 của nghìn đồng; 1 = 10 nghìn, 2 = 100 nghìn, 3 = 1 triệu …)', tick: 1 });
        ctx.save(); ctx.strokeStyle = c.d; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hh.X(lx), A.y); ctx.lineTo(hh.X(lx), A.y + A.h); ctx.stroke(); ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textBaseline = 'bottom'; ctx.textAlign = lx > 3 ? 'right' : 'left'; ctx.fillText(lx > 3 ? 'người duyệt ←  ngưỡng' : 'ngưỡng  → người duyệt', hh.X(lx) + (lx > 3 ? -6 : 6), A.y + A.h - 4); ctx.restore();
        const B = { x: 56, y: H * 0.34 + 44, w: W - 70, h: H - H * 0.34 - 76 }, ys = C.map(q => q.tot), mx = Math.max.apply(null, ys);
        const lc = E.lineChart(ctx, c, B, [{ y: C.map(q => q.loss), color: c.b, width: 1.8, dash: [4, 3] }, { y: C.map(q => q.rv), color: c.a, width: 1.8, dash: [4, 3] }, { y: ys, color: c.fg, width: 2.6 }], { ymin: 0, ymax: mx * 1.08, n: XS.length, yfmt: q => E.vnd(q / 1000), title: 'Chi phí mỗi ngày (triệu): đen = tổng · cam đứt = thiệt hại do lỗi lọt · xanh đứt = phí người duyệt', xlabel: 'ngưỡng giá trị phải có người duyệt → (kéo thanh để dời vạch tím)' });
        const bi = best(), ci = Math.round((lx - 1) / 0.05);
        ctx.save(); ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(lc.X(bi), lc.Y(ys[bi]), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(lc.X(ci), lc.Y(ys[ci]), 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Ngưỡng giá trị phải có người duyệt (10^x nghìn đồng)', 1, 5, 0.05, lx, v_ => kvnd(Math.pow(10, v_)), v_ => { lx = v_; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Tỉ lệ agent làm sai (%)', 0.5, 15, 0.5, e, v_ => dec(v_, 1) + '%', v_ => { e = v_; recompute(); });
    U.slider(r2, 'Người duyệt bắt được lỗi (%)', 30, 100, 5, d, v_ => v_ + '%', v_ => { d = v_; recompute(); });
    U.slider(r2, 'Chi phí duyệt một hành động (nghìn) ✱', 1, 100, 1, v, String, v_ => { v = v_; recompute(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const t = Math.pow(10, lx), cur = costAt(lx), bi = best(), n = val.filter(w => w > t).length, share = val.filter(w => w > t).reduce((s, w) => s + w, 0) / val.reduce((s, w) => s + w, 0);
      const none = costAt(5).tot, all = costAt(1).tot, th = v / (e / 100 * d / 100);
      out.innerHTML = 'Với ' + N.toLocaleString('vi-VN') + ' hành động mỗi ngày: ngưỡng <b>' + kvnd(t) + '</b> nghĩa là người duyệt <b>' + n + '</b> hành động (' + dec(n / N * 100, 1) + '% số lượng nhưng <b>' + dec(share * 100, 0) + '%</b> tổng giá trị). Chi phí: duyệt ' + E.vnd(cur.rv / 1000) + ' + thiệt hại lọt ' + E.vnd(cur.loss / 1000) + ' = <b>' + E.vnd(cur.tot / 1000) + '</b>/ngày. So sánh: để agent tự quyết hết ' + E.vnd(none / 1000) + '; duyệt hết ' + E.vnd(all / 1000) + '; ngưỡng rẻ nhất trong mẫu ≈ <b>' + kvnd(Math.pow(10, XS[bi])) + '</b> (' + E.vnd(C[bi].tot / 1000) + '). ' +
        'Quy tắc kiểm soát nội bộ: chỉ đáng duyệt khi lỗi kỳ vọng tránh được lớn hơn phí duyệt, tức giá trị hành động > phí duyệt ÷ (tỉ lệ sai × tỉ lệ bắt được) = <b>' + kvnd(th) + '</b>. Hành động nhỏ để agent tự làm, hành động lớn cần người ký. Dữ liệu mô phỏng (giá trị phân phối lệch phải, trung vị 300 nghìn); giá ✱ là giả định.';
    }
    update();
  });
})();
