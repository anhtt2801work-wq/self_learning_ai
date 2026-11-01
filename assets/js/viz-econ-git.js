/* Economics-friendly demos for the Git/GitHub page: git bisect as an audit that halves the suspect range (step by step, priced in VND),
 * and the CI decision: waiting time of developers vs machine minutes. Toy numbers; ✱ values are user-adjustable assumptions. */
(function () {
  'use strict';
  const { ui: U } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-git.js');
  const dec = (v, k) => v.toFixed(k == null ? 1 : k).replace('.', ',');

  /* ---------- 1. git bisect: halve the suspect range, step by step ---------- */
  Viz.register('bisect1', function (root) {
    let n = 100, bug = 63, mins = 10, wage = 150, lo = 0, hi = 100, tests = 0, timer = null;
    function reset() { lo = 0; hi = n; tests = 0; }
    function done() { return hi - lo <= 1; }
    function step() { if (done()) return; const m = Math.floor((lo + hi) / 2); tests++; if (m >= bug) hi = m; else lo = m; }
    function maxTests() { return Math.ceil(Math.log2(n)); }
    const view = Viz.mount(root, {
      aspect: 0.55, minH: 300, label: 'Các commit từ cũ đến mới: xanh lá đã biết tốt, cam đã biết xấu, xám còn nghi vấn',
      draw(ctx, W, H, c) {
        const cols = Math.ceil(Math.sqrt(n * (W - 20) / (H - 70))), rows = Math.ceil(n / cols), cw = (W - 20) / cols, ch = Math.min(cw, (H - 70) / rows), mid = done() ? -1 : Math.floor((lo + hi) / 2);
        ctx.save(); ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('Mỗi ô là một commit (từ commit 1 ở góc trái trên đến commit ' + n + ' ở cuối). Khung tím = commit đang được kiểm tra.', 10, 4);
        for (let i = 1; i <= n; i++) {
          const k = i - 1, x = 10 + (k % cols) * cw, y = 28 + Math.floor(k / cols) * ch;
          ctx.fillStyle = i <= lo ? Viz.rgba(c.c, 0.8) : i >= hi ? Viz.rgba(c.b, 0.8) : Viz.rgba(c.muted, 0.35);
          ctx.fillRect(x + 1, y + 1, Math.max(1, cw - 2), Math.max(1, ch - 2));
          if (i === mid) { ctx.strokeStyle = c.d; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, cw, ch); }
          if (done() && i === hi) { ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.strokeRect(x, y, cw, ch); }
        }
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText('Còn ' + Math.max(0, hi - lo - 1) + ' commit nghi vấn · đã kiểm tra ' + tests + ' lần', 10, H - 4);
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Kiểm tra commit giữa', () => { stop(); step(); update(); }, true);
    const play = U.button(r1, 'Chạy tự động', () => { if (timer) { stop(); return; } if (done()) reset(); play.textContent = 'Dừng'; timer = setInterval(() => { if (done()) { stop(); return; } step(); update(); }, 700); update(); });
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = 'Chạy tự động'; }
    U.button(r1, 'Đặt lại', () => { stop(); reset(); update(); });
    U.select(r1, 'Số commit', [['50', '50'], ['100', '100'], ['200', '200'], ['500', '500']], v => { stop(); n = +v; bug = Math.min(bug, n); bugSl.input.max = n; bugSl.set(bug); reset(); update(); }).value = '100';
    const r2 = U.row(root);
    const bugSl = U.slider(r2, 'Lỗi bắt đầu từ commit số', 1, n, 1, bug, String, v => { stop(); bug = v; reset(); update(); });
    U.slider(r2, 'Mỗi lần kiểm tra mất (phút)', 1, 60, 1, mins, String, v => { mins = v; update(); });
    U.slider(r2, 'Giá nhân công (nghìn đồng/giờ) ✱', 30, 400, 10, wage, String, v => { wage = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const cost = t => E.money(t * mins / 60 * wage * 1000);
      let msg;
      if (done()) msg = 'Xong: commit đầu tiên gây lỗi là <b>' + hi + '</b> (đã kiểm tra bằng ' + tests + ' lần). Xem lần lượt từ cũ đến mới sẽ tốn <b>' + bug + '</b> lần: ' + cost(tests) + ' so với ' + cost(bug) + '.';
      else msg = 'Mỗi lần kiểm tra commit ở giữa khoảng nghi vấn rồi loại một nửa. Đã kiểm tra <b>' + tests + '</b> lần (' + cost(tests) + '), còn ' + (hi - lo - 1) + ' commit nghi vấn. Tối đa chỉ cần ' + maxTests() + ' lần cho ' + n + ' commit, trong khi xem lần lượt có thể phải tới ' + n + ' lần (' + cost(n) + ').';
      out.innerHTML = msg + ' Giống kiểm toán: thay vì rà từng chứng từ, bạn chọn đúng điểm giữa sổ để xem số dư còn khớp hay không rồi thu hẹp khoảng nghi vấn. Điều kiện: lỗi tái hiện ổn định và mọi commit trong khoảng đều chạy được. Giá nhân công ✱ là giả định.';
    }
    reset(); update();
  });

  /* ---------- 2. CI: parallel jobs shorten the wait but add overhead minutes ---------- */
  Viz.register('cidecision1', function (root) {
    let T = 20, o = 1, devs = 8, push = 5, wage = 150, idle = 30, price = 150, cache = 0, k = 4;
    const DAYS = 22, KMAX = 20;
    function parts(kk) { const t = T * (1 - cache / 100), runs = devs * push * DAYS, wall = t / kk + o, mach = t + kk * o; return { wait: runs * wall * (idle / 100) * wage * 1000 / 60 / 1e6, mach: runs * mach * price / 1e6, wall, mach_min: mach, runs }; }   // triệu đồng / tháng
    function best() { let b = 1; for (let i = 1; i <= KMAX; i++) if (parts(i).wait + parts(i).mach < parts(b).wait + parts(b).mach) b = i; return b; }
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 300, label: 'Chi phí mỗi tháng của CI theo số job chạy song song: thời gian lập trình viên chờ cộng tiền máy',
      draw(ctx, W, H, c) {
        const bx = { x: 62, y: 14, w: W - 76, h: H - 62 }, bw = bx.w / KMAX, tot = []; for (let i = 1; i <= KMAX; i++) tot.push(parts(i).wait + parts(i).mach);
        const mx = Math.max.apply(null, tot) * 1.08, Y = v => bx.y + (1 - v / mx) * bx.h;
        ctx.save(); ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let g = 0; g <= 4; g++) { const v = mx * g / 4; ctx.beginPath(); ctx.moveTo(bx.x, Y(v)); ctx.lineTo(bx.x + bx.w, Y(v)); ctx.stroke(); ctx.fillText(E.vnd(v), bx.x - 5, Y(v)); }
        const bi = best();
        for (let i = 1; i <= KMAX; i++) {
          const q = parts(i), x = bx.x + (i - 1) * bw + bw * 0.12, w = bw * 0.76;
          ctx.fillStyle = Viz.rgba(c.b, i === k ? 0.95 : 0.65); ctx.fillRect(x, Y(q.wait), w, Y(0) - Y(q.wait));
          ctx.fillStyle = Viz.rgba(c.a, i === k ? 0.95 : 0.65); ctx.fillRect(x, Y(q.wait + q.mach), w, Y(q.wait) - Y(q.wait + q.mach));
          ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(String(i), x + w / 2, bx.y + bx.h + 4);
          if (i === k) { ctx.strokeStyle = c.d; ctx.lineWidth = 2.5; ctx.strokeRect(x - 1, Y(q.wait + q.mach) - 1, w + 2, Y(0) - Y(q.wait + q.mach) + 2); }
          if (i === bi) { ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(x + w / 2, Y(q.wait + q.mach) - 9, 5, 0, 7); ctx.fill(); }
        }
        ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('cam: tiền lương lãng phí khi chờ CI · xanh dương: tiền máy CI · chấm xanh lá: tổng thấp nhất', bx.x + 6, bx.y + 4);
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('số job chạy song song →', bx.x + bx.w / 2, bx.y + bx.h + 22);
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Số job chạy song song', 1, KMAX, 1, k, String, v => { k = v; update(); });
    U.slider(r1, 'Tổng thời gian CI nếu chạy tuần tự (phút)', 3, 90, 1, T, String, v => { T = v; update(); });
    U.slider(r1, 'Tiết kiệm nhờ cache phụ thuộc (%)', 0, 60, 5, cache, v => v + '%', v => { cache = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Thời gian khởi động mỗi job (phút)', 0.2, 5, 0.2, o, v => dec(v, 1), v => { o = v; update(); });
    U.slider(r2, 'Số lập trình viên', 1, 50, 1, devs, String, v => { devs = v; update(); });
    U.slider(r2, 'Số lần push mỗi người mỗi ngày', 1, 15, 1, push, String, v => { push = v; update(); });
    const r3 = U.row(root);
    U.slider(r3, 'Lương (nghìn đồng/giờ) ✱', 30, 400, 10, wage, String, v => { wage = v; update(); });
    U.slider(r3, 'Tỉ lệ thời gian chờ thật sự bị lãng phí (%) ✱', 5, 100, 5, idle, v => v + '%', v => { idle = v; update(); });
    U.slider(r3, 'Giá mỗi phút máy CI (đồng) ✱', 20, 1000, 10, price, String, v => { price = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const q = parts(k), b = best(), pb = parts(b), p1 = parts(1);
      out.innerHTML = 'Với <b>' + k + '</b> job song song: mỗi lần push chờ <b>' + dec(q.wall, 1) + '</b> phút và dùng ' + dec(q.mach_min, 1) + ' phút máy; mỗi tháng (' + q.runs.toLocaleString('vi-VN') + ' lần chạy) tốn <b>' + E.vnd(q.wait + q.mach) + '</b> (chờ ' + E.vnd(q.wait) + ' + máy ' + E.vnd(q.mach) + '). Chạy tuần tự (1 job): ' + E.vnd(p1.wait + p1.mach) + '. Số job rẻ nhất: <b>' + b + '</b> (' + E.vnd(pb.wait + pb.mach) + '/tháng). ' +
        'Chạy song song giảm thời gian chờ nhưng mỗi job thêm phí khởi động, nên có điểm tối ưu và đường cong khá phẳng quanh nó. Lương và tiền máy ✱ là giả định; hãy dùng bảng giá của bạn và đo thời gian chờ thật. Mô hình giả định chia việc đều giữa các job.';
    }
    update();
  });
})();
