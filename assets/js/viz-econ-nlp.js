/* Economics-friendly demos for the NLP page: TF-IDF step by step on product reviews, Naive Bayes as
 * log-odds updating (the spam example from the page), and a customer-support automation ROI in VND. */
(function () {
  'use strict';
  const { ui: U } = Viz;
  const E = Viz.econ;
  if (!E) throw new Error('viz-econ-core.js phải được nạp trước viz-econ-nlp.js');
  const dec = (v, k) => v.toFixed(k == null ? 1 : k).replace('.', ',');

  /* ---------- 1. TF-IDF step by step ---------- */
  Viz.register('tfidf1', function (root) {
    const DOCS = [
      'giao_hàng nhanh đóng_gói cẩn_thận',
      'giao_hàng chậm hộp móp',
      'sản_phẩm tốt giao_hàng nhanh',
      'sản_phẩm hỏng sau hai ngày',
      'giao_hàng nhanh sản_phẩm đẹp',
      'máy hỏng hỏng nhiều lần'
    ].map(s => s.split(' '));
    const N = DOCS.length, df = {};
    DOCS.forEach(d => new Set(d).forEach(w => { df[w] = (df[w] || 0) + 1; }));
    let di = 5, step = 0;
    function terms(i) { const tf = {}; DOCS[i].forEach(w => { tf[w] = (tf[w] || 0) + 1; }); return Object.keys(tf).map(w => ({ w, tf: tf[w], df: df[w], idf: Math.log(N / df[w]), x: tf[w] * Math.log(N / df[w]) })); }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 290, label: 'Bảng TF-IDF cho một đánh giá: tần suất, số văn bản chứa từ, độ hiếm, và điểm cuối cùng',
      draw(ctx, W, H, c) {
        const T = terms(di), cols = [0, 0.3, 0.44, 0.58, 0.72], x0 = 16;
        const cx = k => x0 + cols[k] * (W - 2 * x0), rowH = Math.min(40, (H - 96) / Math.max(T.length, 5));
        ctx.save(); ctx.textBaseline = 'middle';
        ctx.fillStyle = c.fg; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('Đánh giá ' + (di + 1) + ': “' + DOCS[di].join(' ') + '”', x0, 16);
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText('Kho có ' + N + ' đánh giá. “_” nối các âm tiết của một từ ghép.', x0, 36);
        const heads = ['Từ', '1. tf (đếm)', '2. df', '3. idf = ln(N/df)', '4. tf × idf'];
        ctx.font = 'bold 11px system-ui, sans-serif';
        heads.forEach((h, k) => { ctx.fillStyle = k <= step ? c.fg : Viz.rgba(c.muted, 0.5); ctx.textAlign = 'left'; ctx.fillText(h, cx(k), 62); });
        ctx.strokeStyle = c.border; ctx.beginPath(); ctx.moveTo(x0, 72); ctx.lineTo(W - x0, 72); ctx.stroke();
        const mx = Math.max.apply(null, T.map(t => t.x)), best = T.reduce((a, b) => (b.x > a.x ? b : a), T[0]);
        T.forEach((t, i) => {
          const y = 72 + rowH * (i + 0.5) + 4;
          ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = c.fg; ctx.fillText(t.w, cx(0), y);
          if (step >= 1) ctx.fillText(String(t.tf), cx(1), y);
          if (step >= 2) ctx.fillText(t.df + '/' + N, cx(2), y);
          if (step >= 3) ctx.fillText(dec(t.idf, 2), cx(3), y);
          if (step >= 4) {
            const bw = (W - x0 - cx(4) - 46) * (t.x / mx), isBest = t === best;
            ctx.fillStyle = isBest ? Viz.rgba(c.d, 0.85) : Viz.rgba(c.a, 0.6); ctx.fillRect(cx(4), y - 8, Math.max(2, bw), 16);
            ctx.fillStyle = c.fg; ctx.fillText(dec(t.x, 2), cx(4) + Math.max(2, bw) + 5, y);
          }
        });
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Bước tiếp', () => { step = Math.min(4, step + 1); update(); }, true);
    U.button(r1, 'Đặt lại', () => { step = 0; update(); });
    U.select(r1, 'Chọn đánh giá', DOCS.map((d, i) => [String(i), (i + 1) + '. ' + d.join(' ')]), v => { di = +v; step = 0; update(); }).value = String(di);
    const out = U.out(root);
    const MSG = [
      'Bấm “Bước tiếp” để đếm số lần mỗi từ xuất hiện trong đánh giá này (tf).',
      'Bước 1: tf là số lần từ xuất hiện trong đánh giá. Mới chỉ đếm, chưa biết từ nào quan trọng.',
      'Bước 2: df là số đánh giá (trong 6) có chứa từ đó. “giao_hàng” có mặt ở 4/6 đánh giá nên chẳng giúp phân biệt đánh giá nào với đánh giá nào.',
      'Bước 3: idf = ln(N/df) đo độ hiếm: từ càng ít đánh giá chứa thì idf càng cao, như một tin “ít người biết” có giá trị thông tin cao hơn.',
      ''
    ];
    function update() {
      view.redraw();
      if (step < 4) { out.textContent = MSG[step]; return; }
      const T = terms(di), best = T.reduce((a, b) => (b.x > a.x ? b : a), T[0]);
      out.innerHTML = 'Bước 4: điểm = tf × idf. Từ đặc trưng nhất của đánh giá này là <b>' + best.w + '</b> (' + dec(best.x, 2) + '). Từ phổ biến như “giao_hàng” bị hạ trọng số, từ hiếm hoặc lặp lại nhiều (như “hỏng” hai lần ở đánh giá 6) được nâng lên. Đây là công thức sách giáo khoa ln(N/df); scikit-learn dùng một biến thể có làm trơn nên số hơi khác, thứ hạng thường giống nhau.';
    }
    update();
  });

  /* ---------- 2. Naive Bayes = adding evidence in log-odds (the page's spam example) ---------- */
  Viz.register('nbodds1', function (root) {
    const TRAIN = [['khuyến mãi lớn mua ngay', 1], ['mua ngay giảm giá', 1], ['giảm giá lớn', 1], ['họp nhóm sáng mai', 0], ['gửi báo cáo sáng mai', 0]];
    const cnt = [{}, {}], tot = [0, 0], pri = [0, 0], vocab = new Set();
    TRAIN.forEach(([s, y]) => { pri[y ? 0 : 1]++; s.split(' ').forEach(w => { const k = y ? 0 : 1; cnt[k][w] = (cnt[k][w] || 0) + 1; tot[k]++; vocab.add(w); }); });
    const V = vocab.size, PS = pri[0] / 5, PH = pri[1] / 5;
    const lik = (w, k) => ((cnt[k][w] || 0) + 1) / (tot[k] + V);
    const MSGS = ['mua ngay họp', 'giảm giá', 'họp sáng mai', 'khuyến mãi lớn họp sáng', 'mua ngay giảm giá lớn'];
    let mi = 0, step = 0;
    function contrib(m) { const ws = MSGS[m].split(' '); return ws.map(w => ({ w, v: Math.log(lik(w, 0) / lik(w, 1)), ps: lik(w, 0), ph: lik(w, 1) })); }
    const prior = Math.log(PS / PH);
    const view = Viz.mount(root, {
      aspect: 0.6, minH: 320, label: 'Bằng chứng từng từ cộng dồn vào log tỉ lệ cược thư rác so với thư thường',
      draw(ctx, W, H, c) {
        const items = [{ w: 'xác suất ban đầu', v: prior }].concat(contrib(mi)), shown = items.slice(0, step + 1);
        let acc = 0; const run = shown.map(s => (acc += s.v));
        const L = 54, R = W - 14, A = { y: 30, h: H - 74 }, mx = Math.max(2.5, ...run.map(Math.abs), ...items.map(s => Math.abs(s.v))) * 1.15;
        const Y = v => A.y + (0.5 - v / (2 * mx)) * A.h, bw = (R - L) / items.length;
        ctx.save(); ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
        [-mx * 0.8, -mx * 0.4, 0, mx * 0.4, mx * 0.8].forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.stroke(); ctx.fillText(dec(v, 1), L - 5, Y(v)); });
        ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(R, Y(0)); ctx.stroke();
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Cột = bằng chứng của từng từ (cam: nghiêng về thư rác, xanh lá: nghiêng về thư thường); đường tím = tổng cộng dồn', L, 6);
        let base = 0;
        shown.forEach((s, i) => {
          const x = L + i * bw + bw * 0.2, y0 = Y(base), y1 = Y(base + s.v);
          ctx.fillStyle = Viz.rgba(s.v >= 0 ? c.b : c.c, 0.8); ctx.fillRect(x, Math.min(y0, y1), bw * 0.6, Math.max(2, Math.abs(y1 - y0)));
          ctx.fillStyle = c.fg; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = s.v >= 0 ? 'bottom' : 'top';
          ctx.fillText((s.v >= 0 ? '+' : '−') + dec(Math.abs(s.v), 2), x + bw * 0.3, s.v >= 0 ? Math.min(y0, y1) - 2 : Math.max(y0, y1) + 2);
          base += s.v;
        });
        ctx.fillStyle = c.muted; ctx.textBaseline = 'top'; ctx.font = '11px system-ui, sans-serif';
        items.forEach((s, i) => { ctx.fillStyle = i <= step ? c.fg : Viz.rgba(c.muted, 0.5); ctx.textAlign = 'center'; ctx.fillText(s.w, L + i * bw + bw / 2, A.y + A.h + 8); });
        ctx.strokeStyle = c.d; ctx.lineWidth = 2.4; ctx.beginPath(); run.forEach((v, i) => { const x = L + i * bw + bw / 2; if (i) ctx.lineTo(x, Y(v)); else ctx.moveTo(x, Y(v)); }); ctx.stroke();
        run.forEach((v, i) => { ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(L + i * bw + bw / 2, Y(v), 4, 0, 7); ctx.fill(); });
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Thêm từ tiếp theo', () => { step = Math.min(MSGS[mi].split(' ').length, step + 1); update(); }, true);
    U.button(r1, 'Đặt lại', () => { step = 0; update(); });
    U.select(r1, 'Tin nhắn cần phân loại', MSGS.map((m, i) => [String(i), '“' + m + '”']), v => { mi = +v; step = 0; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const items = [{ v: prior }].concat(contrib(mi)); let s = 0; for (let i = 0; i <= step; i++) s += items[i].v;
      const p = 1 / (1 + Math.exp(-s));
      if (step === 0) out.innerHTML = 'Chưa đọc từ nào: trong 5 thư huấn luyện có 3 thư rác và 2 thư thường, nên log tỉ lệ cược ban đầu là ln(0,6/0,4) = <b>' + dec(prior, 2) + '</b>, tức xác suất thư rác <b>' + dec(p * 100, 1) + '%</b>. Bấm “Thêm từ tiếp theo”.';
      else { const w = contrib(mi)[step - 1]; out.innerHTML = 'Thêm từ “<b>' + w.w + '</b>”: nó xuất hiện với xác suất ' + dec(w.ps * 100, 1) + '% trong thư rác và ' + dec(w.ph * 100, 1) + '% trong thư thường, nên cộng thêm ln(' + dec(w.ps, 3) + '/' + dec(w.ph, 3) + ') = <b>' + (w.v >= 0 ? '+' : '−') + dec(Math.abs(w.v), 2) + '</b>. Tổng cộng dồn <b>' + dec(s, 2) + '</b> → xác suất thư rác <b>' + dec(p * 100, 1) + '%</b>' + (step === items.length - 1 ? ' (kết luận cuối)' : '') + '.'; }
      out.innerHTML += ' Đây chính là cập nhật niềm tin theo kiểu logit: mỗi từ là một bằng chứng độc lập (giả định “ngây thơ”) được cộng vào log tỉ lệ cược. Với “mua ngay họp” kết quả cuối khớp 0,824 như ví dụ trong trang (có làm trơn Laplace α = 1).';
    }
    update();
  });

  /* ---------- 3. Customer-support automation: confidence cutoff, monthly saving, payback ---------- */
  Viz.register('supportroi1', function (root) {
    let N = 20000, h = 30, e = 200, F = 15, B = 300, th = 0.8, over = false;
    const T = 24;
    function parts(t) { const cov = 1 - t * t, ok = over ? 0.5 * (1 - Math.pow(t, 4)) : (2 / 3) * (1 - Math.pow(t, 3)); return { cov, ok, bad: cov - ok }; }
    function saving(t) { const p = parts(t); return N * (p.cov * h - p.bad * e) / 1000 - F; }        // triệu đồng / tháng
    const TS = []; for (let k = 0; k <= 0.99 + 1e-9; k += 0.01) TS.push(+k.toFixed(2));
    function best() { let b = 0; TS.forEach((t, i) => { if (saving(t) > saving(TS[b])) b = i; }); return b; }
    const view = Viz.mount(root, {
      aspect: 0.9, minH: 360, label: 'Tiết kiệm mỗi tháng theo ngưỡng tự tin để chatbot tự trả lời, và dòng tiền tích lũy trong 24 tháng',
      draw(ctx, W, H, c) {
        const A = { x: 62, y: 12, w: W - 76, h: H * 0.4 }, ys = TS.map(saving), mn = Math.min.apply(null, ys), mx = Math.max.apply(null, ys), pad = (mx - mn) * 0.1 + 1;
        const lc = E.lineChart(ctx, c, A, [{ y: ys, color: c.a, width: 2.4 }], { ymin: Math.max(mn, -2.5 * Math.max(mx, 1)) - pad, ymax: mx + pad, n: TS.length, yfmt: v => E.vnd(v), hlines: [{ v: 0, color: c.border, dash: false }], title: 'Tiết kiệm ròng mỗi tháng (triệu đồng) theo ngưỡng', xlabel: 'ngưỡng tự tin tối thiểu để tự trả lời → (0 = trả lời mọi ticket, 0,99 = gần như không)' });
        const bi = best(), ci = Math.round(th * 100);
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(lc.X(bi), lc.Y(ys[bi]), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.fg; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(lc.X(ci), lc.Y(ys[ci]), 6, 0, 7); ctx.fill(); ctx.stroke();
        const S = saving(th), Bx = { x: 62, y: H * 0.4 + 52, w: W - 76, h: H - H * 0.4 - 90 }, cum = []; for (let m = 0; m <= T; m++) cum.push(-B + S * m);
        const lo = Math.min(0, ...cum), hi = Math.max(0, ...cum), span = (hi - lo) || 1, Y = v => Bx.y + (1 - (v - lo) / span) * Bx.h, bw = Bx.w / (T + 1);
        ctx.save(); ctx.strokeStyle = c.border; ctx.strokeRect(Bx.x, Bx.y, Bx.w, Bx.h);
        ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('Dòng tiền tích lũy sau mỗi tháng (đã trừ chi phí xây dựng ban đầu)', Bx.x, Bx.y - 4);
        cum.forEach((v, m) => { ctx.fillStyle = Viz.rgba(v >= 0 ? c.c : c.b, 0.75); const y0 = Y(0), y1 = Y(v); ctx.fillRect(Bx.x + m * bw + 1, Math.min(y0, y1), Math.max(1, bw - 2), Math.max(1, Math.abs(y1 - y0))); });
        ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(Bx.x, Y(0)); ctx.lineTo(Bx.x + Bx.w, Y(0)); ctx.stroke();
        ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(E.vnd(hi), Bx.x - 5, Y(hi)); ctx.fillText(E.vnd(lo), Bx.x - 5, Y(lo));
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; [0, 6, 12, 18, 24].forEach(m => ctx.fillText(m + ' th', Bx.x + m * bw + bw / 2, Bx.y + Bx.h + 4));
        ctx.restore();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Ngưỡng tự tin để tự trả lời', 0, 0.99, 0.01, th, v => dec(v, 2), v => { th = v; update(); });
    U.check(r1, 'Mô hình quá tự tin (như Naive Bayes)', over, v => { over = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Số ticket mỗi tháng', 2000, 100000, 1000, N, v => v.toLocaleString('vi-VN'), v => { N = v; update(); });
    U.slider(r2, 'Chi phí nhân viên xử lý một ticket (nghìn) ✱', 10, 100, 5, h, String, v => { h = v; update(); });
    U.slider(r2, 'Thiệt hại nếu tự trả lời sai (nghìn) ✱', 20, 1000, 10, e, String, v => { e = v; update(); });
    const r3 = U.row(root);
    U.slider(r3, 'Vận hành hệ thống mỗi tháng (triệu) ✱', 0, 100, 1, F, String, v => { F = v; update(); });
    U.slider(r3, 'Chi phí xây dựng ban đầu (triệu) ✱', 50, 1500, 10, B, String, v => { B = v; update(); });
    const out = U.out(root);
    function update() {
      view.redraw();
      const p = parts(th), S = saving(th), bi = best(), Sb = saving(TS[bi]);
      let pay = S > 0 ? B / S : null;
      out.innerHTML = 'Ở ngưỡng <b>' + dec(th, 2) + '</b>: chatbot tự trả lời <b>' + Math.round(p.cov * 100) + '%</b> số ticket, trong số đó đúng <b>' + (p.cov > 0 ? Math.round(p.ok / p.cov * 100) : 0) + '%</b>. Mỗi tháng tiết kiệm nhân công ' + E.vnd(N * p.cov * h / 1000) + ', trừ thiệt hại do trả lời sai ' + E.vnd(N * p.bad * e / 1000) + ' và chi phí vận hành ' + E.vnd(F) + ': <b>' + E.vnd(S) + '/tháng</b>. ' +
        (pay === null ? 'Không hoàn vốn ở ngưỡng này. ' : 'Hoàn vốn sau khoảng <b>' + dec(pay, 1) + ' tháng</b>. ') + 'Ngưỡng tốt nhất trong mô phỏng: <b>' + dec(TS[bi], 2) + '</b> (' + E.vnd(Sb) + '/tháng). ' +
        'Bài học: trả lời mọi ticket (ngưỡng 0) thường <em>lỗ</em> vì sai sót đắt hơn nhân công; chỉ nên tự động hóa những ca mô hình thật sự chắc. Nếu mô hình “quá tự tin” (tick ô trên), độ chính xác thật thấp hơn độ tự tin nó báo, nên phải đặt ngưỡng cao hơn. Mô phỏng đơn giản: độ tự tin có phân phối cố định; các giá ✱ là giả định, hãy thay bằng số của bạn.';
    }
    update();
  });
})();
