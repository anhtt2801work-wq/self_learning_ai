/* Economics-friendly demos for the LLM page: step-by-step next-token generation on a toy table, the monthly
 * API bill vs human labour in VND, and the sampling error of benchmark scores. Toy inputs only. */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-llm.js');

  /* ---------- 1. Autoregressive generation, one token at a time ---------- */
  Viz.register('ntp1', function (root) {
    const TERM = { 'lạm phát': 1, 'cầu tăng': 1, 'nguồn cung hạn chế': 1, 'chính sách tiền tệ': 1, 'cầu giảm': 1, 'thị trường biến động': 1 };
    const DIR = [['vì', 40], ['khi', 20], ['.', 40]];
    const TAB = {
      '<s>': [['Lãi suất', 50], ['Giá', 30], ['Tỉ giá', 20]],
      'Lãi suất': [['tăng', 35], ['giảm', 35], ['ổn định', 20], ['cao', 10]],
      'Tỉ giá': [['tăng', 40], ['giảm', 40], ['ổn định', 20]],
      'Giá': [['vàng', 40], ['nhà', 35], ['xăng', 25]],
      'vàng': [['tăng', 45], ['giảm', 40], ['đi ngang', 15]], 'nhà': [['tăng', 45], ['giảm', 40], ['đi ngang', 15]], 'xăng': [['tăng', 45], ['giảm', 40], ['đi ngang', 15]],
      'tăng': DIR, 'giảm': DIR, 'ổn định': DIR, 'cao': DIR, 'đi ngang': DIR,
      'vì': [['lạm phát', 30], ['cầu tăng', 25], ['nguồn cung hạn chế', 25], ['chính sách tiền tệ', 20]],
      'khi': [['lạm phát', 30], ['cầu giảm', 30], ['thị trường biến động', 40]]
    };
    Object.keys(TERM).forEach(k => { TAB[k] = [['.', 100]]; });
    let T = 1, sample = true, seed = 1, rng = Viz.rng(seed), seq = [], last = null;
    function dist() {
      const key = seq.length ? seq[seq.length - 1] : '<s>', row = TAB[key];
      if (!row) return null;
      const w = row.map(([t, p]) => [t, Math.pow(p / 100, 1 / T)]), z = w.reduce((s, x) => s + x[1], 0);
      return w.map(([t, v]) => [t, v / z, (row.find(x => x[0] === t)[1]) / 100]);
    }
    const view = Viz.mount(root, {
      aspect: 0.3, minH: 175, label: 'Xác suất của từng token có thể đứng tiếp theo',
      draw(ctx, W, H, c) {
        const d = dist();
        ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        if (!d) { ctx.fillText('Câu đã kết thúc. Bấm “Câu mới” để sinh câu khác.', 12, 12); return; }
        ctx.fillText('Mô hình đang cân nhắc token kế tiếp sau “' + (seq.length ? seq[seq.length - 1] : '(bắt đầu câu)') + '”:', 12, 10);
        const rowH = Math.min(30, (H - 40) / d.length), lx = 12, bx = Math.min(190, W * 0.38), bw = W - bx - 70;
        d.slice().sort((a, b) => b[1] - a[1]).forEach(([t, p, p0], i) => {
          const y = 34 + i * rowH; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.textBaseline = 'middle'; ctx.fillText(t, lx, y + rowH / 2);
          ctx.fillStyle = Viz.rgba(c.a, 0.7); ctx.fillRect(bx, y + 3, bw * p, rowH - 6);
          if (T !== 1) { ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.strokeRect(bx, y + 3, bw * p0, rowH - 6); ctx.setLineDash([]); }
          ctx.fillStyle = c.fg; ctx.fillText((p * 100).toFixed(0) + '%', bx + bw * p + 6, y + rowH / 2);
        });
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Sinh token tiếp', () => step(), true);
    U.button(r1, 'Chạy hết câu', () => { let g = 0; while (dist() && g++ < 20) step(true); update(); });
    U.button(r1, 'Câu mới', () => { seed++; rng = Viz.rng(seed * 7919); seq = []; update(); });
    U.slider(r1, 'Nhiệt độ T', 0.2, 3, 0.1, T, v => v.toFixed(1), v => { T = v; update(); });
    U.check(r1, 'Lấy mẫu ngẫu nhiên (tắt = luôn chọn token có xác suất cao nhất)', sample, v => { sample = v; });
    const line = el('div'); line.style.cssText = 'margin:8px 0;font-size:1.05rem;font-weight:600;min-height:1.6em'; root.appendChild(line);
    const out = U.out(root);
    function step(quiet) {
      const d = dist(); if (!d) return;
      let pick;
      if (!sample) pick = d.reduce((b, x) => x[1] > b[1] ? x : b)[0];
      else { let u = rng(), acc = 0; pick = d[d.length - 1][0]; for (const [t, p] of d) { acc += p; if (u < acc) { pick = t; break; } } }
      seq.push(pick); if (!quiet) update();
    }
    function update() {
      view.redraw(); line.textContent = seq.length ? seq.join(' ').replace(' .', '.') : '…';
      out.innerHTML = 'Đây là cách LLM viết: <b>mỗi lần chỉ chọn một token</b> dựa trên phân phối xác suất, nối vào câu, rồi lặp lại. Đã sinh ' + seq.length + ' token. Nhiệt độ thấp làm phân phối nhọn hơn (ít bất ngờ, lặp lại); cao làm phẳng hơn (đa dạng hơn nhưng dễ chọn token vô lý). Nét đứt là xác suất gốc khi T ≠ 1. <b>Bảng xác suất ở đây là đồ chơi tự đặt, chỉ nhìn một token trước</b>; LLM thật nhìn toàn bộ ngữ cảnh và có hàng chục nghìn token để chọn. Lưu ý: mô hình chọn câu “nghe hợp lý”, không kiểm tra câu đó có đúng sự thật hay không.';
    }
    update();
  });

  /* ---------- 2. API bill vs human labour (VND) ---------- */
  Viz.register('apiCost1', function (root) {
    let lreq = 3, tin = 1500, tout = 300, pin = 3, pout = 15, fx = 25000, mins = 6, wage = 80, review = 20, rmin = 2, fixed = 10;
    function calc() {
      const reqs = Math.pow(10, lreq) * 30, ai = reqs * (tin * pin + tout * pout) / 1e6 * fx, human = reqs * mins / 60 * wage * 1000,
        rev = reqs * review / 100 * rmin / 60 * wage * 1000, hybrid = ai + rev + fixed * 1e6, perAI = (tin * pin + tout * pout) / 1e6 * fx,
        saving = human - hybrid, s1 = mins / 60 * wage * 1000 - (perAI + review / 100 * rmin / 60 * wage * 1000);
      return { reqs, ai, human, rev, hybrid, perAI, saving, be: s1 > 0 ? fixed * 1e6 / s1 / 30 : Infinity };
    }
    const view = Viz.mount(root, {
      aspect: 0.4, minH: 200, label: 'So sánh chi phí hằng tháng: chỉ người làm, chỉ phần gọi API, và AI kết hợp duyệt lại',
      draw(ctx, W, H, c) {
        const r = calc(), items = [['Người làm 100%', r.human, c.b], ['AI + người duyệt + chi phí cố định', r.hybrid, c.a], ['Chỉ riêng phần gọi API', r.ai, c.c]];
        const mx = Math.max(...items.map(i => i[1])) * 1.05 || 1, lx = 12, bx = Math.min(240, W * 0.42), bw = W - bx - 130, rh = (H - 24) / 3;
        items.forEach(([name, v, col], i) => { const y = 12 + i * rh; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(name, lx, y + rh / 2); ctx.fillStyle = Viz.rgba(col, 0.75); ctx.fillRect(bx, y + 8, Math.max(2, bw * v / mx), rh - 16); ctx.fillStyle = c.fg; ctx.fillText(E.money(v), bx + Math.max(2, bw * v / mx) + 6, y + rh / 2); });
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Số yêu cầu mỗi ngày', 1, 5, 0.1, lreq, v => Math.round(Math.pow(10, v)).toLocaleString('vi-VN'), v => { lreq = v; update(); });
    U.slider(r1, 'Token vào mỗi yêu cầu', 100, 20000, 100, tin, v => v.toLocaleString('vi-VN'), v => { tin = v; update(); });
    U.slider(r1, 'Token ra mỗi yêu cầu', 20, 4000, 20, tout, v => v.toLocaleString('vi-VN'), v => { tout = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Giá token vào (USD / triệu) ✱', 0.1, 20, 0.1, pin, v => v.toFixed(1), v => { pin = v; update(); });
    U.slider(r2, 'Giá token ra (USD / triệu) ✱', 0.5, 100, 0.5, pout, v => v.toFixed(1), v => { pout = v; update(); });
    U.slider(r2, 'Tỉ giá (đồng / USD) ✱', 23000, 27000, 100, fx, v => v.toLocaleString('vi-VN'), v => { fx = v; update(); });
    const r3 = U.row(root);
    U.slider(r3, 'Người làm tay mất (phút / yêu cầu)', 1, 60, 1, mins, v => String(v), v => { mins = v; update(); });
    U.slider(r3, 'Lương theo giờ (nghìn đồng) ✱', 30, 500, 5, wage, v => String(v), v => { wage = v; update(); });
    U.slider(r3, 'Tỉ lệ kết quả AI cần người duyệt lại (%)', 0, 100, 5, review, v => v + '%', v => { review = v; update(); });
    U.slider(r3, 'Phút duyệt lại mỗi ca', 0.5, 30, 0.5, rmin, v => String(v), v => { rmin = v; update(); });
    U.slider(r3, 'Chi phí cố định hằng tháng (triệu đồng): hạ tầng, bảo trì', 0, 200, 5, fixed, v => String(v), v => { fixed = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw(); const r = calc();
      out.innerHTML = 'Mỗi tháng ' + Math.round(r.reqs).toLocaleString('vi-VN') + ' yêu cầu. Một yêu cầu qua AI tốn khoảng <b>' + E.money(r.perAI) + '</b> tiền token; người làm tay tốn <b>' + E.money(mins / 60 * wage * 1000) + '</b>. ' + (r.saving >= 0 ? 'Phương án AI kết hợp duyệt lại <b>tiết kiệm ' + E.money(r.saving) + '/tháng</b>' : 'Phương án AI kết hợp duyệt lại đang <b>đắt hơn ' + E.money(-r.saving) + '/tháng</b>') + (isFinite(r.be) ? '; điểm hòa vốn khoảng <b>' + Math.round(r.be).toLocaleString('vi-VN') + ' yêu cầu/ngày</b> (dưới mức này chi phí cố định không được bù lại).' : '; với thông số này không bao giờ hòa vốn vì mỗi ca AI + duyệt lại không rẻ hơn làm tay.') + ' Bài học kinh tế: tiền token thường nhỏ so với <b>chi phí con người duyệt lại</b> và chi phí cố định; tỉ lệ cần duyệt lại (độ tin cậy của mô hình) quyết định hiệu quả nhiều hơn giá token. Giá API, tỉ giá và lương ✱ là số <em>bạn tự nhập</em> (giá mô hình thay đổi theo tháng, hãy xem bảng giá hiện hành của nhà cung cấp); giá trị mặc định chỉ là ví dụ, không phải bảng giá thật. Chưa tính chi phí lỗi (một câu trả lời sai tốn bao nhiêu?), thường là khoản quyết định.';
    }
    update();
  });

  /* ---------- 3. Sampling error of benchmark scores ---------- */
  Viz.register('evalci1', function (root) {
    const M = 4000, r = Viz.rng(5), zA = [], zB = [];
    for (let i = 0; i < M; i++) { zA.push(Viz.randn(r)); zB.push(Viz.randn(r)); }
    let pA = 0.72, pB = 0.69, ln = 2.3;
    function sim() { const n = Math.round(Math.pow(10, ln)), sa = Math.sqrt(pA * (1 - pA) / n), sb = Math.sqrt(pB * (1 - pB) / n); return { n, A: zA.map(z => Math.min(1, Math.max(0, pA + sa * z))), B: zB.map(z => Math.min(1, Math.max(0, pB + sb * z))), sa, sb }; }
    let S = sim();
    const view = Viz.mount(root, {
      aspect: 0.42, minH: 220, label: 'Điểm đo được của hai mô hình khi lặp lại phép đánh giá nhiều lần với bộ câu hỏi khác nhau',
      draw(ctx, W, H, c) {
        const lo = Math.max(0, Math.min(pA, pB) - 0.2), hi = Math.min(1, Math.max(pA, pB) + 0.2), bx = { x: 14, y: 12, w: W - 28, h: H - 44 };
        const h = E.hist(ctx, c, bx, [{ vals: S.A, color: c.a }, { vals: S.B, color: c.b }], lo, hi, 60, { title: 'Điểm đo được qua nhiều lần đánh giá: xanh = mô hình A, cam = mô hình B', tick: 0.05 });
        [[pA, c.a], [pB, c.b]].forEach(([p, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(h.X(p), bx.y); ctx.lineTo(h.X(p), bx.y + bx.h); ctx.stroke(); ctx.setLineDash([]); });
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Độ chính xác thật của A', 0.3, 0.95, 0.01, pA, v => v.toFixed(2), v => { pA = v; S = sim(); update(); });
    U.slider(r1, 'Độ chính xác thật của B', 0.3, 0.95, 0.01, pB, v => v.toFixed(2), v => { pB = v; S = sim(); update(); });
    U.slider(r1, 'Số câu hỏi đánh giá', 1, 3.7, 0.05, ln, v => Math.round(Math.pow(10, v)).toLocaleString('vi-VN'), v => { ln = v; S = sim(); update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      let wrong = 0; for (let i = 0; i < M; i++) { if ((S.A[i] > S.B[i]) !== (pA > pB) && S.A[i] !== S.B[i]) wrong++; }
      const se = Math.sqrt(pA * (1 - pA) / S.n), d = Math.abs(pA - pB), pbar = (pA + pB) / 2, need = d > 0 ? 2 * Math.pow(1.96 + 0.84, 2) * pbar * (1 - pbar) / (d * d) : Infinity;
      out.innerHTML = 'Với ' + S.n.toLocaleString('vi-VN') + ' câu hỏi, sai số chuẩn của một điểm số ≈ <b>' + (se * 100).toFixed(1) + ' điểm %</b> (khoảng 95%: ±' + (1.96 * se * 100).toFixed(1) + '). Thật ra ' + (pA >= pB ? 'A' : 'B') + ' hơn ' + (d * 100).toFixed(0) + ' điểm, nhưng trong <b>' + (wrong / M * 100).toFixed(0) + '%</b> lần đánh giá, bảng xếp hạng bị <b>đảo thứ tự</b>. Để phân biệt hai mô hình cách nhau ' + (d * 100).toFixed(0) + ' điểm với độ tin cậy 95% và sức mạnh kiểm định 80%, cần khoảng <b>' + (isFinite(need) ? Math.round(need).toLocaleString('vi-VN') : '∞') + ' câu hỏi cho mỗi mô hình</b> (xấp xỉ, giả định hai bộ câu hỏi độc lập; so sánh ghép cặp trên cùng câu hỏi thường cần ít hơn). Đây đúng là bài toán khoảng tin cậy và cỡ mẫu trong kinh tế lượng: một bảng xếp hạng chênh vài điểm trên vài trăm câu hỏi gần như là nhiễu. Mô phỏng xấp xỉ chuẩn, không phải dữ liệu đánh giá thật.';
    }
    update();
  });
})();
