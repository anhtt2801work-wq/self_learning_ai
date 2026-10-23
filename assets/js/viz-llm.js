/* Interactive demos for the LLM page */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- 1. Decoding: temperature, top-k, top-p ---------- */
  Viz.register('samp1', function (root) {
    // Illustrative logits made up for this demo, NOT the output of a real model.
    const TOK = ['Hà Nội', 'thành phố', 'một', 'Sài Gòn', 'Huế', 'Đà Nẵng', 'nơi', 'không', 'Paris', 'xanh'];
    const LOGIT = [6.5, 4.6, 4.0, 3.4, 2.6, 2.4, 2.0, 0.8, -0.5, -1.5];
    let T = 1, K = 10, P = 1, counts = new Array(TOK.length).fill(0), total = 0, last = null;

    const help = el('p', 'viz-help'); help.style.padding = '0 0 8px';
    help.textContent = 'Ngữ cảnh: “Thủ đô của Việt Nam là …”. Các logit dưới đây do mình đặt ra để minh họa, không phải đầu ra của một mô hình thật.';
    root.appendChild(help);
    const box = el('div', 'bars'); root.appendChild(box);
    const r1 = U.row(root);
    U.slider(r1, 'Temperature T', 0.1, 2.5, 0.05, T, v => v.toFixed(2), v => { T = v; resetCounts(); update(); });
    U.slider(r1, 'Top-k', 1, 10, 1, K, String, v => { K = v; resetCounts(); update(); });
    U.slider(r1, 'Top-p', 0.1, 1, 0.05, P, v => v.toFixed(2), v => { P = v; resetCounts(); update(); });
    const r2 = U.row(root);
    U.button(r2, 'Lấy mẫu 1 token', () => sample(1), true);
    U.button(r2, 'Lấy mẫu 500 lần', () => sample(500));
    U.button(r2, 'Xóa thống kê', () => { resetCounts(); update(); });
    const readout = U.out(root);

    function resetCounts() { counts.fill(0); total = 0; last = null; }
    function softmax(z) { const m = Math.max(...z.filter(isFinite)), e = z.map(x => (isFinite(x) ? Math.exp(x - m) : 0)), s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s); }
    function pipeline() {
      const full = softmax(LOGIT.map(x => x / T));
      const keep = new Array(TOK.length).fill(false);
      for (let i = 0; i < K; i++) keep[i] = true;                        // tokens are listed in descending-logit order
      let pk = softmax(LOGIT.map((x, i) => (keep[i] ? x / T : -Infinity)));
      let cum = 0;
      for (let i = 0; i < TOK.length; i++) { if (!keep[i]) continue; if (cum >= P) keep[i] = false; cum += pk[i]; }
      const fin = softmax(LOGIT.map((x, i) => (keep[i] ? x / T : -Infinity)));
      return { full, keep, fin };
    }
    function sample(n) {
      const { fin } = pipeline();
      for (let s = 0; s < n; s++) {
        let r = Math.random(), i = 0; for (; i < fin.length - 1; i++) { r -= fin[i]; if (r <= 0) break; }
        counts[i]++; total++; last = i;
      }
      update();
    }
    function update() {
      const { full, keep, fin } = pipeline(), mx = Math.max(...full);
      box.innerHTML = TOK.map((t, i) =>
        '<span>' + esc(t) + '</span><span class="bar"><i class="' + (keep[i] ? '' : 'off') + '" style="width:' + (100 * full[i] / mx).toFixed(1) + '%"></i></span>' +
        '<span class="val">' + (keep[i] ? (100 * fin[i]).toFixed(1) + '%' : 'bị loại') + (total ? ' · n=' + counts[i] : '') + '</span>').join('');
      const H = -fin.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
      readout.innerHTML = 'Số token còn lại: <b>' + keep.filter(Boolean).length + '</b> · entropy ≈ <b>' + H.toFixed(2) + ' bit</b>' +
        (last != null ? ' · token vừa lấy mẫu: <b>' + esc(TOK[last]) + '</b>' : '') + (total ? ' · tổng số mẫu: ' + total : '') +
        '<br>Thanh dài = xác suất sau softmax(logit/T) trước khi lọc; cột phải = xác suất sau khi lọc top-k, top-p và chuẩn hóa lại.';
    }
    update();
  });

  /* ---------- 2. Self-attention weights (toy) ---------- */
  Viz.register('attn1', function (root) {
    let d = 16, scale = true, causal = false;
    const help = el('p', 'viz-help'); help.style.padding = '0 0 8px';
    help.textContent = 'Vector q và k được sinh ngẫu nhiên (cố định theo từng từ) nên trọng số KHÔNG mang ý nghĩa ngôn ngữ. Mục đích: xem phép tính softmax(QKᵀ/√d), vai trò của mặt nạ nhân quả và của hệ số √d.';
    root.appendChild(help);
    const ta = el('input'); ta.type = 'text'; ta.value = 'con mèo ngồi trên thảm'; ta.setAttribute('aria-label', 'Câu đầu vào (tối đa 8 từ)');
    ta.style.width = '100%'; ta.style.marginBottom = '6px'; root.appendChild(ta);
    const r1 = U.row(root);
    U.slider(r1, 'Số chiều d_k', 4, 128, 4, d, String, v => { d = v; update(); });
    U.check(r1, 'Chia cho √d_k', scale, v => { scale = v; update(); });
    U.check(r1, 'Mặt nạ nhân quả (chỉ nhìn về trước)', causal, v => { causal = v; update(); });
    const table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const readout = U.out(root);

    function vec(token, salt) {
      const r = Viz.rng(Viz.hash(salt + ':' + token)); const out = new Float64Array(d);
      for (let i = 0; i < d; i++) out[i] = Viz.randn(r); return out;
    }
    function update() {
      const toks = ta.value.trim().split(/\s+/).filter(Boolean).slice(0, 8), n = toks.length;
      if (!n) { table.innerHTML = ''; readout.textContent = 'Nhập một câu.'; return; }
      const Q = toks.map(t => vec(t, 'q')), Kk = toks.map(t => vec(t, 'k'));
      const raw = [], w = [];
      for (let i = 0; i < n; i++) {
        raw.push([]); for (let j = 0; j < n; j++) { let s = 0; for (let m = 0; m < d; m++) s += Q[i][m] * Kk[j][m]; raw[i].push(s); }
        const sc = raw[i].map((s, j) => (causal && j > i ? -Infinity : (scale ? s / Math.sqrt(d) : s)));
        const mx = Math.max(...sc), e = sc.map(x => (isFinite(x) ? Math.exp(x - mx) : 0)), sum = e.reduce((a, b) => a + b, 0);
        w.push(e.map(x => x / sum));
      }
      const col = Viz.colors().a, dark = document.documentElement.dataset.theme === 'dark';
      let h = '<table class="heat"><thead><tr><th>query ↓ / key →</th>' + toks.map(t => '<th>' + esc(t) + '</th>').join('') + '</tr></thead><tbody>';
      w.forEach((row, i) => {
        h += '<tr><th>' + esc(toks[i]) + '</th>' + row.map(x => {
          const strong = x > 0.55;
          return '<td style="background:' + Viz.rgba(col, 0.08 + 0.8 * x) + ';color:' + (strong ? (dark ? '#0b1020' : '#fff') : 'inherit') + '">' + x.toFixed(2) + '</td>';
        }).join('') + '</tr>';
      });
      table.innerHTML = h + '</tbody></table>';
      const flat = raw.flat(), mean = flat.reduce((a, b) => a + b, 0) / flat.length;
      const sd = Math.sqrt(flat.reduce((a, b) => a + (b - mean) ** 2, 0) / flat.length);
      const ent = w.map(row => -row.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0)), avg = ent.reduce((a, b) => a + b, 0) / n;
      readout.innerHTML = 'Độ lệch chuẩn của điểm q·k (chưa chia) = <b>' + sd.toFixed(2) + '</b> (lý thuyết ≈ √d_k = ' + Math.sqrt(d).toFixed(2) + ', ước lượng từ chỉ ' + flat.length + ' giá trị nên nhiễu) · ' +
        'entropy trung bình mỗi hàng = <b>' + avg.toFixed(2) + ' bit</b> (tối đa log₂' + n + ' = ' + Math.log2(n).toFixed(2) + '). Entropy thấp = softmax “nhọn”, gradient dễ bị triệt tiêu.';
    }
    ta.addEventListener('input', update);
    window.addEventListener('themechange', update);
    update();
  });
})();
