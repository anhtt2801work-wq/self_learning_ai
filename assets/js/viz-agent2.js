/* Additional interactive demos for the Agentic AI page (deep-dive sections) */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const fmt = n => Math.round(n).toLocaleString('en-US');

  /* ---------- 1. Context growth and token cost across history strategies ---------- */
  Viz.register('ctx1', function (root) {
    let T = 30, S0 = 6000, a = 200, r = 1500, win = 200000, cacheRead = 0.1;
    const K = 3, STUB = 30, M = 10, SUM = 800;
    function sizes(strategy) {
      const out = [], cached = [];
      for (let t = 1; t <= T; t++) {
        const h = t - 1, prev = out.length ? out[out.length - 1] : 0; let c, k;
        if (strategy === 'full') { c = S0 + h * (a + r); k = prev; }
        else if (strategy === 'trim') { c = S0 + h * (a + STUB) + Math.min(h, K) * (r - STUB); k = h <= K ? prev : S0 + (h - K - 1) * (a + STUB) + a; }
        else { c = S0 + (h >= M ? SUM : 0) + (h % M) * (a + r); k = (h % M === 0 && h > 0) ? S0 : prev; }
        out.push(c); cached.push(Math.min(k, c));
      }
      return { out, cached };
    }
    const NAMES = { full: 'Giữ toàn bộ lịch sử', trim: 'Rút gọn kết quả cũ (giữ ' + K + ' kết quả gần nhất)', summary: 'Tóm tắt mỗi ' + M + ' bước (→ ' + SUM + ' token)' };
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 240, label: 'Kích thước ngữ cảnh theo số bước cho ba chiến lược quản lý lịch sử',
      draw(ctx, W, H, c) {
        const pad = { l: 56, r: 12, t: 16, b: 32 }, S = ['full', 'trim', 'summary'].map(s => sizes(s)), cols = [c.a, c.b, c.c];
        const maxY = Math.max(win * 1.08, ...S.map(s => Math.max(...s.out))), X = t => pad.l + (t - 1) / Math.max(1, T - 1) * (W - pad.l - pad.r), Y = v => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { const v = maxY * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke(); ctx.fillText(v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1000) + 'k', pad.l - 6, Y(v)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let i = 0; i <= 5; i++) { const t = Math.round(1 + (T - 1) * i / 5); ctx.fillText(t, X(t), H - pad.b + 6); } ctx.fillText('bước agent', (pad.l + W - pad.r) / 2, H - 16);
        ctx.strokeStyle = c.d; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, Y(win)); ctx.lineTo(W - pad.r, Y(win)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = c.d; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('cửa sổ ngữ cảnh ' + (win >= 1e6 ? '1M' : Math.round(win / 1000) + 'k'), W - pad.r - 4, Y(win) + 4);
        S.forEach((s, i) => { ctx.strokeStyle = cols[i]; ctx.lineWidth = 2.5; ctx.beginPath(); s.out.forEach((v, j) => { j ? ctx.lineTo(X(j + 1), Y(v)) : ctx.moveTo(X(1), Y(v)); }); ctx.stroke(); });
        ['full', 'trim', 'summary'].forEach((k, i) => { ctx.fillStyle = cols[i]; ctx.textAlign = 'left'; ctx.fillText('— ' + NAMES[k], pad.l + 8, Y(win) + 6 + i * 15); });
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Số bước T', 5, 80, 1, T, String, v => { T = v; update(); });
    U.slider(r1, 'Chỉ dẫn + công cụ (token)', 1000, 30000, 500, S0, v => fmt(v), v => { S0 = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Kết quả công cụ mỗi bước', 100, 8000, 100, r, v => fmt(v), v => { r = v; update(); });
    U.slider(r2, 'Văn bản mô hình sinh mỗi bước', 50, 1000, 50, a, String, v => { a = v; update(); });
    const r3 = U.row(root);
    U.select(r3, 'Cửa sổ ngữ cảnh', [['32000', '32k'], ['128000', '128k'], ['200000', '200k'], ['1000000', '1M']], v => { win = +v; update(); }); r3.querySelector('select').value = '200000';
    U.slider(r3, 'Hệ số giá đọc từ cache (1 = không cache)', 0.05, 1, 0.05, cacheRead, v => '×' + v.toFixed(2), v => { cacheRead = v; update(); });
    const table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const readout = U.out(root);
    function update() {
      const rows = ['full', 'trim', 'summary'].map(k => { const s = sizes(k), tot = s.out.reduce((p, q) => p + q, 0), bill = s.out.reduce((p, q, i) => p + cacheRead * s.cached[i] + (q - s.cached[i]), 0); return { k, last: s.out[T - 1], tot, bill, max: Math.max(...s.out) }; });
      let h = '<table><thead><tr><th>Chiến lược</th><th>Ngữ cảnh ở bước cuối</th><th>Tổng token đầu vào đã xử lý</th><th>Chi phí đầu vào quy đổi*</th></tr></thead><tbody>';
      rows.forEach(x => { h += '<tr><td>' + NAMES[x.k] + '</td><td>' + fmt(x.last) + (x.max > win ? ' <b style="color:var(--c4)">(vượt cửa sổ)</b>' : '') + '</td><td>' + fmt(x.tot) + '</td><td>' + fmt(x.bill) + '</td></tr>'; });
      table.innerHTML = h + '</tbody></table>';
      const full = sizes('full').out, over = full.findIndex(v => v > win);
      readout.innerHTML = 'Giữ toàn bộ: ngữ cảnh tăng tuyến tính nhưng <b>tổng token đã xử lý tăng bậc hai theo số bước</b> (≈ T·S₀ + (a+r)·T(T−1)/2). ' + (over >= 0 ? 'Bước <b>' + (over + 1) + '</b> đã vượt cửa sổ ' + fmt(win) + ' token: phải rút gọn hoặc tóm tắt.' : 'Với cấu hình này chưa vượt cửa sổ.') +
        ' Văn bản sinh ra: ' + fmt(T * a) + ' token (thường đắt hơn đầu vào cho mỗi token). *Quy đổi theo “token đầu vào đầy giá”; bỏ qua phụ phí ghi cache và chi phí của lời gọi tóm tắt. Khi bạn sửa phần lịch sử đã gửi, tiền tố sau chỗ sửa không còn khớp cache, nên rút gọn có thể làm giảm số token nhưng không giảm chi phí tương ứng nếu đang dùng cache.';
      view.redraw();
    }
    update();
  });

  /* ---------- 2. Verification, retries and chain reliability ---------- */
  Viz.register('rel2', function (root) {
    let p = 0.95, d = 0.8, f = 0.05, rr = 2, n = 20;
    function step() {
      const ac = p * (1 - f), aw = (1 - p) * (1 - d), rho = p * f + (1 - p) * d; let geo = 0; for (let i = 0; i <= rr; i++) geo += Math.pow(rho, i);
      return { pc: ac * geo, pw: aw * geo, pv: Math.pow(rho, rr + 1), att: geo };
    }
    function chain(pc, pw, pv, m) { const ok = Math.pow(pc, m), k = pc < 1 ? (1 - ok) / (1 - pc) : m; return { ok, w: pw * k, v: pv * k }; }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 230, label: 'Xác suất chuỗi hoàn thành đúng theo số bước, có và không có kiểm chứng',
      draw(ctx, W, H, c) {
        const pad = { l: 44, r: 12, t: 14, b: 32 }, X = m => pad.l + (m - 1) / 59 * (W - pad.l - pad.r), Y = v => pad.t + (1 - v) * (H - pad.t - pad.b), s = step();
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(pad.l, Y(i / 4)); ctx.lineTo(W - pad.r, Y(i / 4)); ctx.stroke(); ctx.fillText((i / 4).toFixed(2), pad.l - 6, Y(i / 4)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let m = 1; m <= 60; m += (m === 1 ? 9 : 10)) ctx.fillText(m, X(m), H - pad.b + 6); ctx.fillText('số bước n', (pad.l + W - pad.r) / 2, H - 16);
        const line = (fn, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let m = 1; m <= 60; m++) { const v = fn(m); m === 1 ? ctx.moveTo(X(m), Y(v)) : ctx.lineTo(X(m), Y(v)); } ctx.stroke(); };
        line(m => Math.pow(p, m), c.b, 2.5); line(m => Math.pow(s.pc, m), c.c, 2.5); line(m => chain(s.pc, s.pw, s.pv, m).w, c.d, 2);
        ctx.setLineDash([4, 4]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(n), pad.t); ctx.lineTo(X(n), H - pad.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.b; ctx.fillText('— không kiểm chứng: pⁿ', W - 250, pad.t + 4); ctx.fillStyle = c.c; ctx.fillText('— có kiểm chứng: P(đúng)ⁿ', W - 250, pad.t + 20); ctx.fillStyle = c.d; ctx.fillText('— có kiểm chứng: lỗi lọt qua', W - 250, pad.t + 36);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'p: xác suất một lần thử đúng', 0.8, 0.999, 0.001, p, v => v.toFixed(3), v => { p = v; update(); });
    U.slider(r1, 'd: kiểm chứng bắt được lỗi', 0, 1, 0.01, d, v => v.toFixed(2), v => { d = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'f: từ chối nhầm đáp án đúng', 0, 0.4, 0.01, f, v => v.toFixed(2), v => { f = v; update(); });
    U.slider(r2, 'Số lần thử lại tối đa', 0, 5, 1, rr, String, v => { rr = v; update(); });
    U.slider(r2, 'n (đường đứt)', 1, 60, 1, n, String, v => { n = v; update(); });
    const readout = U.out(root);
    function update() {
      const s = step(), cc = chain(s.pc, s.pw, s.pv, n);
      readout.innerHTML = 'Mỗi bước: đúng <b>' + (s.pc * 100).toFixed(2) + '%</b>, lỗi lọt qua <b>' + (s.pw * 100).toFixed(2) + '%</b>, dừng để người xử lý <b>' + (s.pv * 100).toFixed(3) + '%</b>; số lần thử kỳ vọng ' + s.att.toFixed(3) + '. ' +
        'Chuỗi ' + n + ' bước: không kiểm chứng đúng <b>' + (Math.pow(p, n) * 100).toFixed(1) + '%</b> | có kiểm chứng: đúng <b>' + (cc.ok * 100).toFixed(1) + '%</b>, lỗi lọt <b>' + (cc.w * 100).toFixed(1) + '%</b>, dừng cho người <b>' + (cc.v * 100).toFixed(1) + '%</b>. ' +
        (d < 0.3 ? 'Kiểm chứng yếu (d thấp) hầu như không cải thiện: lỗi vẫn lọt qua.' : f > 0.2 ? 'Kiểm chứng hay từ chối nhầm làm tăng số lần thử và tăng số lần phải dừng.' : 'Kiểm chứng biến phần lớn lỗi “lặng lẽ” thành lần thử lại hoặc cảnh báo, nhưng không bao giờ về 0 nếu d < 1.');
      view.redraw();
    }
    update();
  });

  /* ---------- 3. Multi-agent: Amdahl speed-up versus token overhead ---------- */
  Viz.register('multi1', function (root) {
    let P = 0.8, W0 = 100000, C = 8000, Ssyn = 4000, k = 4;
    const model = kk => ({ sp: W0 / ((1 - P) * W0 + P * W0 / kk + Ssyn), tok: (W0 + kk * C + Ssyn) / W0 });
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 230, label: 'Tăng tốc và số token theo số worker',
      draw(ctx, W, H, c) {
        const pad = { l: 44, r: 12, t: 14, b: 32 }, X = kk => pad.l + (kk - 1) / 15 * (W - pad.l - pad.r), ymax = Math.max(3, 1 / (1 - P), model(16).tok) * 1.08, Y = v => pad.t + (1 - v / ymax) * (H - pad.t - pad.b);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { const v = ymax * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke(); ctx.fillText(v.toFixed(1) + '×', pad.l - 6, Y(v)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; [1, 4, 8, 12, 16].forEach(kk => ctx.fillText(kk, X(kk), H - pad.b + 6)); ctx.fillText('số worker k', (pad.l + W - pad.r) / 2, H - 16);
        ctx.setLineDash([5, 4]); ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(pad.l, Y(1 / (1 - P))); ctx.lineTo(W - pad.r, Y(1 / (1 - P))); ctx.stroke(); ctx.setLineDash([]);
        const line = (fn, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); for (let kk = 1; kk <= 16; kk++) { const v = fn(kk); kk === 1 ? ctx.moveTo(X(kk), Y(v)) : ctx.lineTo(X(kk), Y(v)); } ctx.stroke(); };
        line(kk => model(kk).sp, c.c); line(kk => model(kk).tok, c.b);
        ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('giới hạn Amdahl 1/(1−P)', pad.l + 6, Y(1 / (1 - P)) - 2);
        ctx.textBaseline = 'top'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.c; ctx.fillText('— tăng tốc', pad.l + 8, pad.t + 4); ctx.fillStyle = c.b; ctx.fillText('— token tiêu thụ (so với 1 agent)', pad.l + 8, pad.t + 20);
        ctx.setLineDash([4, 4]); ctx.strokeStyle = c.fg; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(k), pad.t); ctx.lineTo(X(k), H - pad.b); ctx.stroke(); ctx.setLineDash([]);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'P: tỉ lệ việc song song hóa được', 0.3, 0.99, 0.01, P, v => v.toFixed(2), v => { P = v; update(); });
    U.slider(r1, 'k (đường đứt)', 1, 16, 1, k, String, v => { k = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Tổng token công việc', 20000, 400000, 10000, W0, v => fmt(v), v => { W0 = v; update(); });
    U.slider(r2, 'Ngữ cảnh chung mỗi worker nạp lại', 0, 50000, 1000, C, v => fmt(v), v => { C = v; update(); });
    U.slider(r2, 'Token tổng hợp', 0, 40000, 1000, Ssyn, v => fmt(v), v => { Ssyn = v; update(); });
    const readout = U.out(root);
    function update() {
      const m = model(k), eff = m.sp / m.tok;
      readout.innerHTML = 'Với k = <b>' + k + '</b>: tăng tốc <b>' + m.sp.toFixed(2) + '×</b> (giới hạn Amdahl ' + (1 / (1 - P)).toFixed(2) + '×), token gấp <b>' + m.tok.toFixed(2) + '×</b>; tăng tốc trên mỗi đơn vị token thêm = ' + eff.toFixed(2) + '. ' +
        (m.sp < 1.2 ? 'Gần như không nhanh hơn: phần tuần tự và chi phí tổng hợp ăn hết lợi ích.' : m.tok > m.sp ? 'Chi phí token tăng nhanh hơn tốc độ: chỉ đáng khi độ trễ quan trọng hơn chi phí, hoặc mỗi nhánh cần ngữ cảnh riêng để chất lượng tốt hơn.' : 'Tăng tốc lớn hơn mức tăng chi phí: thiết kế song song có lý.') +
        ' Mô hình này chỉ đếm token tuần tự và token nạp lại; chưa tính lỗi phối hợp giữa các agent, vốn thường là chi phí lớn nhất.';
      view.redraw();
    }
    update();
  });

  /* ---------- 4. Three risk factors for indirect prompt injection ---------- */
  Viz.register('trifecta1', function (root) {
    const s = { priv: true, untrusted: true, exfil: false };
    const r1 = U.row(root);
    U.check(r1, 'Truy cập dữ liệu riêng tư', s.priv, v => { s.priv = v; update(); });
    U.check(r1, 'Đọc nội dung không đáng tin (web, email lạ, tài liệu bên ngoài)', s.untrusted, v => { s.untrusted = v; update(); });
    U.check(r1, 'Có đường gửi dữ liệu ra ngoài (email, HTTP, ghi file chia sẻ)', s.exfil, v => { s.exfil = v; update(); });
    const box = el('div', 'viz-out'); box.setAttribute('role', 'status'); root.appendChild(box);
    function update() {
      const n = (s.priv ? 1 : 0) + (s.untrusted ? 1 : 0) + (s.exfil ? 1 : 0);
      let head, body;
      if (n === 3) { head = 'Rủi ro cao: đủ ba yếu tố'; body = 'Nội dung không đáng tin có thể chứa chỉ dẫn khiến agent đọc dữ liệu riêng tư rồi gửi ra ngoài. Hãy <b>bỏ ít nhất một yếu tố</b>: chạy agent đọc nội dung ngoài trong sandbox không có dữ liệu riêng; hoặc chặn đường ra (allowlist người nhận/tên miền) và yêu cầu người phê duyệt mọi hành động gửi.'; }
      else if (n === 2 && !s.exfil) { head = 'Rủi ro vừa: chưa có đường rò rỉ'; body = 'Agent có thể bị dẫn dắt làm sai việc, nhưng không có kênh tự động đưa dữ liệu ra. Vẫn cần chú ý hành động có tác dụng phụ khác (xóa, sửa) và nhớ rằng thêm một công cụ mới có thể tạo ra kênh ra ngoài.'; }
      else if (n === 2) { head = 'Rủi ro vừa: thiếu một yếu tố'; body = !s.untrusted ? 'Chỉ nguồn tin cậy được đọc, nên khó bị cài chỉ dẫn; nhưng nếu nguồn đó có thể bị người khác ghi vào (wiki chung, ticket từ khách) thì nó không thực sự “tin cậy”.' : 'Không có dữ liệu riêng tư để lấy, nhưng agent vẫn có thể bị lợi dụng để gửi nội dung gây hại hoặc thực hiện hành động.'; }
      else if (n === 1) { head = 'Rủi ro thấp hơn'; body = 'Mới có một yếu tố. Vẫn áp dụng quyền tối thiểu, ghi log và phê duyệt cho hành động có tác dụng phụ.'; }
      else { head = 'Không có yếu tố nào'; body = 'Agent chỉ làm việc trong phạm vi khép kín. Rủi ro còn lại chủ yếu là lỗi thường (độ tin cậy) thay vì tấn công.'; }
      box.innerHTML = '<b>' + head + '.</b> ' + body + '<br><span style="color:var(--muted)">Đây là mô hình tư duy đơn giản hóa để tìm điểm cần chặn, không phải bảo đảm an toàn: nội dung độc hại vẫn có thể làm sai lệch quyết định ngay cả khi không rò rỉ dữ liệu.</span>';
    }
    update();
  });
})();
