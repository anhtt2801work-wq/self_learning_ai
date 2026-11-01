/* Economics-friendly demos for the Deep Learning page: a neuron as a credit-scoring sheet (step by step)
 * and a training bill in VND. All numbers are toy inputs chosen to show mechanisms. */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-dl.js');

  /* ---------- 1. A neuron = a credit-scoring sheet, step by step ---------- */
  Viz.register('neuron1', function (root) {
    const W = { inc: 0.06, debt: -0.05, yrs: 0.10 }, B0 = -0.5;
    let inc = 30, debt = 25, yrs = 6, step = 0, noSig = false;
    function calc() {
      const c = [W.inc * inc, W.debt * debt, W.yrs * yrs, B0], z = c[0] + c[1] + c[2] + c[3];
      return { c, z, p: 1 / (1 + Math.exp(-z)) };
    }
    const view = Viz.mount(root, {
      aspect: 0.55, minH: 410, label: 'Một nơ-ron chấm điểm tín dụng: mỗi thông tin đóng góp điểm, cộng lại, rồi nén thành xác suất',
      draw(ctx, W_, H, c) {
        const r = calc(), rows = [['Thu nhập ' + inc + ' triệu/tháng', r.c[0]], ['Nợ/thu nhập ' + debt + '%', r.c[1]], ['Số năm đi làm ' + yrs, r.c[2]], ['Điểm nền (độ lệch)', r.c[3]]];
        const lx = 12, bx0 = Math.min(210, W_ * 0.34), bw = W_ - bx0 - 70, mid = bx0 + bw / 2, rh = 28, top = 26, scale = bw / 2 / 3.2;
        ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(step < 1 ? 'Bước 0: thông tin đầu vào (kéo thanh trượt phía dưới)' : 'Bước 1: mỗi thông tin × trọng số = điểm đóng góp (xanh +, cam −)', lx, 12);
        const wl = ['trọng số +0,06 điểm / triệu', 'trọng số −0,05 điểm / 1%', 'trọng số +0,10 điểm / năm', 'hằng số −0,5'];
        rows.forEach(([name, v], i) => {
          const y = top + i * rh; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.fillText(name, lx, y + rh / 2);
          if (step < 1) { ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('× ' + wl[i], bx0, y + rh / 2); }
          if (step >= 1) { ctx.fillStyle = v >= 0 ? Viz.rgba(c.c, 0.75) : Viz.rgba(c.b, 0.75); const w = Math.min(bw / 2, Math.abs(v) * scale); ctx.fillRect(v >= 0 ? mid : mid - w, y + 5, w, rh - 10); ctx.fillStyle = c.fg; ctx.textAlign = v >= 0 ? 'left' : 'right'; ctx.fillText((v >= 0 ? '+' : '') + v.toFixed(2), v >= 0 ? mid + w + 4 : mid - w - 4, y + rh / 2); }
        });
        if (step >= 1) { ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(mid, top); ctx.lineTo(mid, top + 4 * rh); ctx.stroke(); }
        const ys = top + 4 * rh + 6;
        if (step >= 2) { ctx.strokeStyle = c.border; ctx.beginPath(); ctx.moveTo(lx, ys); ctx.lineTo(W_ - 12, ys); ctx.stroke(); ctx.fillStyle = c.fg; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Bước 2: tổng điểm z = ' + r.z.toFixed(2), lx, ys + 16); const w = Math.min(bw / 2, Math.abs(r.z) * scale); ctx.fillStyle = Viz.rgba(c.a, 0.8); ctx.fillRect(r.z >= 0 ? mid : mid - w, ys + 6, w, 20); }
        const cy = ys + 70, ch = Math.min(H - cy - 28, 170);
        if (step >= 3 && ch > 60) {
          const bx = { x: bx0, y: cy, w: bw, h: ch };
          ctx.fillStyle = c.fg; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(noSig ? 'Bước 3 (đã bỏ bộ nén): đầu ra = z, có thể vượt khỏi khoảng 0–1' : 'Bước 3: bộ nén sigmoid biến điểm z thành xác suất 0–100%', lx, cy - 12);
          const X = z => bx.x + (z + 6) / 12 * bx.w, Y = p => bx.y + (1 - p) * bx.h;
          ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h); ctx.strokeStyle = c.grid; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(bx.x, Y(0.5)); ctx.lineTo(bx.x + bx.w, Y(0.5)); ctx.stroke(); ctx.setLineDash([]);
          ctx.save(); ctx.beginPath(); ctx.rect(bx.x, bx.y, bx.w, bx.h); ctx.clip(); ctx.strokeStyle = c.a; ctx.lineWidth = 2.4; ctx.beginPath();
          for (let z = -6; z <= 6.001; z += 0.1) { const p = noSig ? 0.5 + z / 12 : 1 / (1 + Math.exp(-z)); (z === -6 ? ctx.moveTo : ctx.lineTo).call(ctx, X(z), Y(p)); } ctx.stroke(); ctx.restore();
          const out = noSig ? 0.5 + r.z / 12 : r.p; ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(X(r.z), Y(Math.max(0, Math.min(1, out))), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; [-6, -3, 0, 3, 6].forEach(z => ctx.fillText(String(z), X(z), bx.y + bx.h + 2));
        }
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Thu nhập (triệu/tháng)', 5, 80, 1, inc, v => String(v), v => { inc = v; update(); });
    U.slider(r1, 'Nợ/thu nhập (%)', 0, 80, 1, debt, v => v + '%', v => { debt = v; update(); });
    U.slider(r1, 'Số năm đi làm', 0, 20, 1, yrs, v => String(v), v => { yrs = v; update(); });
    const r2 = U.row(root);
    U.button(r2, 'Bước tiếp', () => { step = Math.min(4, step + 1); update(); }, true);
    U.button(r2, 'Chạy hết', () => { step = 4; update(); });
    U.button(r2, 'Đặt lại', () => { step = 0; update(); });
    U.check(r2, 'Bỏ bộ nén sigmoid (chỉ dùng tổng điểm)', noSig, v => { noSig = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw(); const r = calc();
      const txt = ['Đây là một nơ-ron: bảng chấm điểm gồm 3 thông tin và một điểm nền. Trọng số (mức quan trọng) giả định: thu nhập +0,06 điểm mỗi triệu, nợ −0,05 điểm mỗi 1%, thâm niên +0,10 điểm mỗi năm; điểm nền −0,5. Bấm “Bước tiếp”.',
        'Mỗi thông tin nhân với trọng số của nó cho một khoản đóng góp: thu nhập và thâm niên cộng điểm, tỉ lệ nợ trừ điểm.',
        'Cộng các đóng góp và điểm nền được tổng điểm z = ' + r.z.toFixed(2) + '.',
        noSig ? 'Không có bộ nén: đầu ra chỉ là một hàm tuyến tính của đầu vào, có thể ra số âm hoặc lớn hơn 1, không đọc được như xác suất. Quan trọng hơn, xếp nhiều lớp tuyến tính chồng nhau vẫn chỉ là một hàm tuyến tính.' : 'Hàm sigmoid nén z vào khoảng 0–100%: z = ' + r.z.toFixed(2) + ' tương ứng xác suất trả nợ tốt ≈ ' + (r.p * 100).toFixed(0) + '%. Hàm phi tuyến như thế là thứ giúp mạng nhiều lớp mô tả được quan hệ phức tạp (ví dụ thu nhập chỉ “có ích” khi nợ chưa quá cao).',
        'Quyết định: ' + (r.p >= 0.5 ? 'duyệt' : 'từ chối') + ' ở ngưỡng 50%. Một mạng nơ-ron là nhiều bảng chấm điểm như thế xếp tầng, với trọng số được máy tự học thay vì do chuyên gia đặt tay. Trọng số ở đây là giả định để minh họa, không phải mô hình tín dụng thật.'];
      out.textContent = txt[step];
    }
    update();
  });

  /* ---------- 2. The training bill in VND ---------- */
  Viz.register('trainCost1', function (root) {
    let lp = 9, lex = 10.3, tf = 50, price = 50, ngpu = 8, mem = 24;
    const PRESETS = [
      ['mlp', 'MLP trong Bài 3 (235.146 tham số) học 60.000 ảnh × 20 vòng', 235146, 1.2e6],
      ['m1b', 'Mô hình 1 tỉ tham số học 20 tỉ token', 1e9, 2e10],
      ['m7b', 'Mô hình 7 tỉ tham số học 1.000 tỉ token', 7e9, 1e12]
    ];
    function calc() {
      const P = Math.pow(10, lp), D = Math.pow(10, lex), flops = 6 * P * D, secs = flops / (tf * 1e12), gh = secs / 3600 * 1, cost = gh * price * 1000, wall = gh / ngpu, gb = P * 16 / 1e9;
      return { P, D, flops, gh, cost, wall, gb };
    }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 250, label: 'Chi phí huấn luyện (VND) theo số tham số, với lượng dữ liệu hiện tại và gấp 10 lần',
      draw(ctx, W, H, c) {
        const bx = { x: 62, y: 12, w: W - 76, h: H - 54 }, xs = []; for (let v = 5; v <= 11.001; v += 0.1) xs.push(v);
        const cost = (p, e) => Math.log10(Math.max(1, 6 * Math.pow(10, p) * Math.pow(10, e) / (tf * 1e12) / 3600 * price * 1000));
        const lc = E.lineChart(ctx, c, bx, [{ y: xs.map(p => cost(p, lex + 1)), color: c.muted, dash: [4, 3], width: 1.8 }, { y: xs.map(p => cost(p, lex)), color: c.a, width: 2.6 }], { ymin: 0, ymax: 14, n: xs.length, yfmt: v => v === 0 ? '1' : '10^' + v.toFixed(0), title: 'Xanh: chi phí (VND, thang log) · xám đứt: nếu dùng dữ liệu gấp 10 lần' });
        const ix = (lp - 5) / 0.1, X = lc.X(ix), Y = lc.Y(Math.min(14, cost(lp, lex))); ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [5, 6, 7, 8, 9, 10, 11].forEach(p => ctx.fillText('10^' + p, lc.X((p - 5) / 0.1), bx.y + bx.h + 4)); ctx.fillText('số tham số →', bx.x + bx.w / 2, bx.y + bx.h + 20);
      }
    });
    const r0 = U.row(root); r0.appendChild(el('span', 'viz-lbl', 'Kịch bản mẫu:')); r0.lastChild.style.fontSize = '.88rem';
    PRESETS.forEach(([k, name, P, D]) => U.button(r0, name, () => { lp = Math.log10(P); lex = Math.log10(D); sp.set(lp); se.set(lex); update(); }));
    const r1 = U.row(root);
    const sp = U.slider(r1, 'Số tham số', 5, 11, 0.1, lp, v => E.fmt(Math.pow(10, v) / (v >= 9 ? 1e9 : v >= 6 ? 1e6 : 1e3)) + (v >= 9 ? ' tỉ' : v >= 6 ? ' triệu' : ' nghìn'), v => { lp = v; update(); });
    const se = U.slider(r1, 'Số mẫu (hoặc token) mô hình xử lý trong cả quá trình huấn luyện', 4, 13, 0.1, lex, v => E.fmt(Math.pow(10, v) / (v >= 9 ? 1e9 : v >= 6 ? 1e6 : 1e3)) + (v >= 9 ? ' tỉ' : v >= 6 ? ' triệu' : ' nghìn'), v => { lex = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Tốc độ hiệu dụng của một GPU (TFLOP/s) ✱', 5, 400, 5, tf, v => String(v), v => { tf = v; update(); });
    U.slider(r2, 'Giá thuê một GPU (nghìn đồng/giờ) ✱', 10, 300, 5, price, v => String(v), v => { price = v; update(); });
    U.slider(r2, 'Số GPU chạy song song', 1, 512, 1, ngpu, v => String(v), v => { ngpu = v; update(); });
    U.slider(r2, 'Bộ nhớ một GPU (GB) ✱', 8, 192, 8, mem, v => String(v), v => { mem = v; update(); });
    const out = U.out(root);
    function money(v) { if (v < 1e3) return Math.round(v).toLocaleString('vi-VN') + ' đồng'; if (v < 1e6) return (v / 1e3).toFixed(v < 1e5 ? 1 : 0).replace('.', ',') + ' nghìn đồng'; if (v < 1e9) return (v / 1e6).toFixed(v < 1e8 ? 1 : 0).replace('.', ',') + ' triệu đồng'; if (v < 1e12) return (v / 1e9).toFixed(2).replace('.', ',') + ' tỷ đồng'; return (v / 1e12).toFixed(1).replace('.', ',') + ' nghìn tỷ đồng'; }
    function time(h) { return h < 1 / 60 ? 'dưới 1 phút' : h < 1 ? Math.round(h * 60) + ' phút' : h < 48 ? h.toFixed(1) + ' giờ' : h < 24 * 90 ? (h / 24).toFixed(1) + ' ngày' : (h / 24 / 30).toFixed(1) + ' tháng'; }
    function update() {
      view.redraw(); const r = calc();
      out.innerHTML = 'Khối lượng tính ≈ 6 × tham số × mẫu = <b>' + r.flops.toExponential(1) + ' FLOP</b>. Với tốc độ hiệu dụng ' + tf + ' TFLOP/s: <b>' + time(r.gh) + ' trên một GPU</b>, tiền thuê ≈ <b>' + money(r.cost) + '</b>; chạy trên ' + ngpu + ' GPU thì mất khoảng <b>' + time(r.wall) + '</b> (giả định chia việc hoàn hảo, thực tế hao hụt). Bộ nhớ riêng cho tham số và trạng thái bộ tối ưu Adam ≈ 16 byte mỗi tham số ≈ <b>' + E.fmt(r.gb) + ' GB</b>' + (r.gb > mem ? ' — <b>không vừa</b> một GPU ' + mem + ' GB, phải chia mô hình ra nhiều GPU (chưa tính bộ nhớ cho kích hoạt)' : ' (vừa một GPU ' + mem + ' GB, chưa tính bộ nhớ cho kích hoạt)') + '. Ý nghĩa kinh tế: chi phí tăng tuyến tính theo <em>cả</em> kích thước mô hình lẫn lượng dữ liệu, nên “mô hình lớn hơn và dữ liệu nhiều hơn” nhân lên hóa đơn; đó là lý do việc chọn đúng cỡ mô hình là một quyết định đầu tư. Công thức 6 × tham số × mẫu là xấp xỉ thường dùng (xem trang LLM) ◐; tốc độ GPU và giá thuê ✱ là con số <em>bạn tự nhập</em>, thay đổi theo phần cứng và nhà cung cấp.';
    }
    update();
  });
})();
