/* Deeper demos for the NLP page: n-gram language model, tiny word2vec trained in the browser, BLEU calculator */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ================= 1. n-gram language model with add-k smoothing ================= */
  Viz.register('ngram1', function (root) {
    const DEFAULT = 'tôi ăn cơm\ntôi ăn phở\nbạn ăn cơm\ntôi uống nước\nbạn uống cà_phê\ntôi thích ăn phở\nbạn thích uống cà_phê\ntôi đi học\nbạn đi làm';
    let n = 2, k = 0, counts = new Map(), ctxCounts = new Map(), vocab = new Set(), totalTokens = 0;
    const ta = document.createElement('textarea'); ta.rows = 5; ta.value = DEFAULT; ta.setAttribute('aria-label', 'Ngữ liệu huấn luyện, mỗi dòng một câu'); root.appendChild(ta);
    const r1 = U.row(root);
    U.slider(r1, 'Bậc n', 1, 3, 1, n, v => v === 1 ? '1 (unigram)' : v === 2 ? '2 (bigram)' : '3 (trigram)', v => { n = v; update(); });
    U.slider(r1, 'Làm trơn add-k', 0, 1, 0.05, k, v => v.toFixed(2), v => { k = v; update(); });
    const r2 = U.row(root);
    const ctxIn = el('input'); ctxIn.type = 'text'; ctxIn.value = 'tôi'; ctxIn.setAttribute('aria-label', 'Ngữ cảnh');
    const l1 = el('label', 'viz-ctl'); l1.appendChild(el('span', 'viz-lbl', 'Ngữ cảnh (từ đứng trước):')); l1.appendChild(ctxIn); r2.appendChild(l1);
    const testIn = el('input'); testIn.type = 'text'; testIn.value = 'tôi ăn cơm'; testIn.setAttribute('aria-label', 'Câu kiểm tra'); testIn.style.minWidth = '200px';
    const l2 = el('label', 'viz-ctl'); l2.appendChild(el('span', 'viz-lbl', 'Câu kiểm tra:')); l2.appendChild(testIn); r2.appendChild(l2);
    const r3 = U.row(root); U.button(r3, 'Sinh 5 câu từ mô hình', () => gen(), true);
    const genOut = el('div', 'viz-log'); genOut.style.maxHeight = '120px'; genOut.textContent = '(bấm “Sinh 5 câu” để lấy mẫu từ mô hình)';
    const tbl = el('div'); tbl.style.overflowX = 'auto'; root.appendChild(tbl); root.appendChild(genOut);
    const readout = U.out(root);
    const key = a => a.join('\u0001');
    const toks = line => line.toLowerCase().trim().split(/\s+/).filter(Boolean);
    function train() {
      counts = new Map(); ctxCounts = new Map(); vocab = new Set(['</s>']); totalTokens = 0;
      ta.value.split('\n').map(toks).filter(t => t.length).forEach(t => {
        const seq = Array(Math.max(0, n - 1)).fill('<s>').concat(t, ['</s>']);
        t.forEach(w => vocab.add(w));
        for (let i = n - 1; i < seq.length; i++) { const ctx = seq.slice(i - n + 1, i), g = key(ctx.concat(seq[i])); counts.set(g, (counts.get(g) || 0) + 1); ctxCounts.set(key(ctx), (ctxCounts.get(key(ctx)) || 0) + 1); totalTokens++; }
      });
    }
    const V = () => vocab.size;
    const prob = (ctx, w) => { const c = counts.get(key(ctx.concat(w))) || 0, t = ctxCounts.get(key(ctx)) || 0; return (c + k) / (t + k * V()); };
    function ctxOf(words) { const need = n - 1, w = need ? words.slice(-need) : []; while (w.length < need) w.unshift('<s>'); return w; }
    function gen() {
      const rng = Math.random, out = [];
      for (let s = 0; s < 5; s++) {
        let words = [], guard = 0;
        while (guard++ < 15) {
          const ctx = ctxOf(words), cand = [...vocab].map(w => [w, prob(ctx, w)]).filter(x => x[1] > 0), tot = cand.reduce((a, b) => a + b[1], 0);
          if (!tot) break; let r = rng() * tot, pick = cand[cand.length - 1][0]; for (const [w, p] of cand) { r -= p; if (r <= 0) { pick = w; break; } }
          if (pick === '</s>') break; words.push(pick);
        }
        out.push((words.join(' ') || '(rỗng)'));
      }
      genOut.textContent = out.join('\n');
    }
    function update() {
      train();
      const ctxWords = toks(ctxIn.value), ctx = ctxOf(ctxWords), c0 = ctxCounts.get(key(ctx)) || 0;
      const rows = [...vocab].map(w => [w, prob(ctx, w), counts.get(key(ctx.concat(w))) || 0]).sort((a, b) => b[1] - a[1]).filter(r => r[1] > 0).slice(0, 8);
      let h = '<table><thead><tr><th>Từ kế tiếp</th><th>đếm c(' + esc(ctx.join(' ') || '∅') + ', w)</th><th>P(w | ngữ cảnh)</th></tr></thead><tbody>';
      h += rows.length ? rows.map(r => '<tr><td>' + esc(r[0]) + '</td><td>' + r[2] + '</td><td><b>' + r[1].toFixed(3) + '</b></td></tr>').join('') : '<tr><td colspan="3">Ngữ cảnh chưa từng xuất hiện và k = 0: không có dự đoán. Hãy tăng k hoặc đổi ngữ cảnh.</td></tr>';
      tbl.innerHTML = h + '</tbody></table>';
      // perplexity of the test sentence
      const t = toks(testIn.value), seq = Array(n - 1).fill('<s>').concat(t, ['</s>']); let lp = 0, zero = false, m = 0; const parts = [];
      for (let i = n - 1; i < seq.length; i++) { const ctxp = seq.slice(i - n + 1, i), p = prob(ctxp, seq[i]); parts.push(esc(seq[i]) + ': ' + p.toFixed(3)); if (p <= 0) zero = true; else lp += Math.log(p); m++; }
      readout.innerHTML = 'Từ vựng V = <b>' + V() + '</b>, tổng số token huấn luyện = ' + totalTokens + ' · số lần ngữ cảnh “' + esc(ctx.join(' ') || '∅') + '” xuất hiện = ' + c0 +
        '<br>Câu kiểm tra: ' + parts.join(' · ') + '<br>' + (zero ? '<b>Xác suất bằng 0 ở ít nhất một vị trí, nên perplexity = ∞</b>. Tăng k để làm trơn.' : 'perplexity = exp(−trung bình ln P) = <b>' + Math.exp(-lp / m).toFixed(3) + '</b> trên ' + m + ' dự đoán.');
    }
    ta.addEventListener('input', update); ctxIn.addEventListener('input', update); testIn.addEventListener('input', update);
    update();
  });

  /* ================= 2. word2vec (skip-gram, negative sampling) trained live ================= */
  Viz.register('w2v1', function (root) {
    const CATS = {
      animal: { name: 'Động vật', words: ['mèo', 'chó', 'ngựa', 'bò', 'gà', 'vịt'], col: 'b' },
      fruit: { name: 'Trái cây', words: ['táo', 'cam', 'chuối', 'xoài', 'nho'], col: 'c' },
      city: { name: 'Thành phố', words: ['hà_nội', 'huế', 'đà_nẵng', 'sài_gòn'], col: 'a' }
    };
    const FOOD = ['cá', 'xương', 'cỏ', 'thóc'];
    const TEMPL = {
      animal: [w => ['con', w, 'ăn', FOOD[Math.floor(rng() * 4)]], w => ['con', w, 'chạy', 'rất', 'nhanh'], w => ['con', w, 'kêu', 'to'], w => ['tôi', 'thấy', 'con', w]],
      fruit: [w => ['tôi', 'ăn', w], w => [w, 'rất', 'ngọt'], w => ['tôi', 'mua', w, 'ở', 'chợ'], w => [w, 'tươi', 'ở', 'chợ']],
      city: [w => ['tôi', 'sống', 'ở', w], w => [w, 'là', 'thành_phố', 'đẹp'], w => ['tôi', 'đi', 'du_lịch', w], w => [w, 'rất', 'đẹp']]
    };
    const DIM = 12, WIN = 2, NEG = 5; let rng = Viz.rng(11), sents = [], vocab = [], idx = {}, Win, Wout, freq, epochs = 0, sel = 'mèo';
    function build() {
      rng = Viz.rng(11); sents = [];
      Object.keys(CATS).forEach(c => { for (let i = 0; i < 90; i++) { const w = CATS[c].words[Math.floor(rng() * CATS[c].words.length)], t = TEMPL[c][Math.floor(rng() * 4)]; sents.push(t(w)); } });
      const cnt = new Map(); sents.forEach(s => s.forEach(w => cnt.set(w, (cnt.get(w) || 0) + 1)));
      vocab = [...cnt.keys()]; idx = {}; vocab.forEach((w, i) => { idx[w] = i; }); freq = vocab.map(w => Math.pow(cnt.get(w), 0.75));
      const init = () => vocab.map(() => Float64Array.from({ length: DIM }, () => (rng() - .5) / DIM)); Win = init(); Wout = vocab.map(() => new Float64Array(DIM)); epochs = 0;
      const tot = freq.reduce((a, b) => a + b, 0); cum = []; let s = 0; freq.forEach(f => { s += f / tot; cum.push(s); });
    }
    let cum = [];
    const negSample = () => { const r = rng(); let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return lo; };
    const sig = x => 1 / (1 + Math.exp(-x));
    function trainEpochs(E, lr) {
      for (let e = 0; e < E; e++) {
        sents.forEach(s => { const ids = s.map(w => idx[w]); ids.forEach((c, i) => { for (let j = Math.max(0, i - WIN); j <= Math.min(ids.length - 1, i + WIN); j++) { if (j === i) continue; const o = ids[j], vc = Win[c], grad = new Float64Array(DIM);
          for (let q = 0; q <= NEG; q++) { const t = q ? negSample() : o, y = q ? 0 : 1; if (q && t === o) continue; const uo = Wout[t]; let z = 0; for (let d = 0; d < DIM; d++) z += uo[d] * vc[d]; const g = (y - sig(z)) * lr; for (let d = 0; d < DIM; d++) { grad[d] += g * uo[d]; uo[d] += g * vc[d]; } }
          for (let d = 0; d < DIM; d++) vc[d] += grad[d]; } }); });
        epochs++;
      }
    }
    const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < DIM; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / (Math.sqrt(na * nb) + 1e-12); };
    function pca2() {
      const n = vocab.length, mean = new Float64Array(DIM); Win.forEach(v => v.forEach((x, d) => { mean[d] += x / n; }));
      const X = Win.map(v => Float64Array.from(v, (x, d) => x - mean[d])), C = Array.from({ length: DIM }, () => new Float64Array(DIM));
      X.forEach(v => { for (let i = 0; i < DIM; i++) for (let j = 0; j < DIM; j++) C[i][j] += v[i] * v[j] / n; });
      const power = (excl) => { let v = Float64Array.from({ length: DIM }, (_, i) => Math.sin(i + 1)); for (let it = 0; it < 200; it++) { let w = new Float64Array(DIM); for (let i = 0; i < DIM; i++) for (let j = 0; j < DIM; j++) w[i] += C[i][j] * v[j]; if (excl) { let dp = 0; for (let i = 0; i < DIM; i++) dp += w[i] * excl[i]; for (let i = 0; i < DIM; i++) w[i] -= dp * excl[i]; } const nr = Math.hypot(...w) || 1; v = w.map(x => x / nr); } return v; };
      const e1 = power(null), e2 = power(e1);
      return X.map(v => [v.reduce((s, x, d) => s + x * e1[d], 0), v.reduce((s, x, d) => s + x * e2[d], 0)]);
    }
    const catOf = w => Object.keys(CATS).find(c => CATS[c].words.includes(w));
    build();
    const view = Viz.mount(root, {
      aspect: 0.62, label: 'Biểu diễn 2D (PCA) của các vector từ sau khi huấn luyện',
      draw(ctx, W, H, c) {
        const P = pca2(), xs = P.map(p => p[0]), ys = P.map(p => p[1]), mx = Math.max(...xs.map(Math.abs)) || 1, my = Math.max(...ys.map(Math.abs)) || 1, pad = 36;
        const X = v => W / 2 + v / mx * (W / 2 - pad), Y = v => H / 2 - v / my * (H / 2 - pad);
        ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.font = '12px system-ui'; ctx.textBaseline = 'middle';
        vocab.forEach((w, i) => { const cat = catOf(w), col = cat ? c[CATS[cat].col] : c.muted; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(P[i][0]), Y(P[i][1]), w === sel ? 7 : 4.5, 0, 7); ctx.fill(); if (w === sel) { ctx.strokeStyle = c.fg; ctx.lineWidth = 2; ctx.stroke(); } ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.fillText(w, X(P[i][0]) + 7, Y(P[i][1])); });
        ctx.textBaseline = 'top'; let y = 6; Object.keys(CATS).forEach(k => { ctx.fillStyle = c[CATS[k].col]; ctx.fillText('● ' + CATS[k].name, 8, y); y += 15; }); ctx.fillStyle = c.muted; ctx.fillText('● từ khác', 8, y);
      }
    });
    const r1 = U.row(root);
    U.button(r1, 'Huấn luyện thêm 5 epoch', () => { trainEpochs(5, 0.05); update(); }, true);
    U.button(r1, 'Huấn luyện thêm 30 epoch', () => { trainEpochs(30, 0.05); update(); });
    U.button(r1, 'Khởi tạo lại', () => { build(); update(); });
    const selEl = U.select(r1, 'Xem láng giềng của', [], v => { sel = v; update(); });
    const readout = U.out(root);
    function update() {
      if (!selEl.options.length) vocab.slice().sort().forEach(w => { const o = el('option', '', w); o.value = w; selEl.appendChild(o); }); selEl.value = sel;
      const within = [], between = []; const ws = Object.keys(CATS).flatMap(c => CATS[c].words);
      for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) (catOf(ws[i]) === catOf(ws[j]) ? within : between).push(cos(Win[idx[ws[i]]], Win[idx[ws[j]]]));
      const avg = a => a.reduce((s, x) => s + x, 0) / a.length, nn = vocab.filter(w => w !== sel).map(w => [w, cos(Win[idx[sel]], Win[idx[w]])]).sort((a, b) => b[1] - a[1]).slice(0, 5);
      readout.innerHTML = 'epoch = <b>' + epochs + '</b> · cosine trung bình giữa hai từ <b>cùng nhóm</b> = <b>' + avg(within).toFixed(2) + '</b>, <b>khác nhóm</b> = <b>' + avg(between).toFixed(2) + '</b>' +
        '<br>Láng giềng gần nhất của “' + esc(sel) + '”: ' + nn.map(([w, s]) => esc(w) + ' (' + s.toFixed(2) + ')').join(', ') +
        '<br><span style="color:var(--muted)">Ngữ liệu là các câu mẫu do chương trình sinh theo khuôn, khoảng 270 câu, nên đây là mô hình đồ chơi để thấy cơ chế: các từ xuất hiện trong ngữ cảnh giống nhau sẽ có vector gần nhau. Nó không đại diện cho chất lượng của embedding huấn luyện trên dữ liệu thật.</span>';
      view.redraw();
    }
    update();
  });

  /* ================= 3. BLEU / ROUGE calculator ================= */
  Viz.register('bleu1', function (root) {
    const help = el('p', 'viz-help', 'Điền bản tham chiếu và bản dịch (ứng viên). Chương trình tách theo khoảng trắng, chuyển chữ thường và bỏ dấu câu.'); help.style.padding = '0 0 8px'; root.appendChild(help);
    const mk = (label, val) => { const l = el('label', 'viz-ctl'); l.style.display = 'flex'; l.style.flexDirection = 'column'; l.style.alignItems = 'stretch'; l.appendChild(el('span', 'viz-lbl', label)); const i = el('input'); i.type = 'text'; i.value = val; i.style.width = '100%'; l.appendChild(i); root.appendChild(l); return i; };
    const refIn = mk('Tham chiếu (câu dịch chuẩn)', 'con mèo ngồi trên tấm thảm'), candIn = mk('Ứng viên (câu hệ thống tạo ra)', 'con mèo nằm trên thảm');
    const r1 = U.row(root); let smooth = false; U.check(r1, 'Làm trơn (+1 cho n-gram bậc ≥ 2)', smooth, v => { smooth = v; update(); });
    const box = el('div'); box.style.overflowX = 'auto'; root.appendChild(box);
    const readout = U.out(root);
    const tok = s => s.toLowerCase().replace(/[.,!?;:"“”()]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const grams = (t, n) => { const m = new Map(); for (let i = 0; i + n <= t.length; i++) { const g = t.slice(i, i + n).join(' '); m.set(g, (m.get(g) || 0) + 1); } return m; };
    function update() {
      const ref = tok(refIn.value), cand = tok(candIn.value); if (!ref.length || !cand.length) { box.innerHTML = ''; readout.textContent = 'Nhập cả hai câu.'; return; }
      const ps = [], rows = [], rouge = [];
      for (let n = 1; n <= 4; n++) { const c = grams(cand, n), r = grams(ref, n); let m = 0, tot = 0; c.forEach((v, g) => { m += Math.min(v, r.get(g) || 0); tot += v; }); const rt = [...r.values()].reduce((a, b) => a + b, 0);
        const p = tot ? (smooth && n > 1 ? (m + 1) / (tot + 1) : m / tot) : 0; ps.push(p); rows.push('<tr><td>' + n + '-gram</td><td>' + m + ' / ' + tot + '</td><td><b>' + p.toFixed(3) + '</b></td></tr>'); if (n <= 2) { const rec = rt ? m / rt : 0, prec = tot ? m / tot : 0; rouge.push([n, rec, prec, rec + prec ? 2 * rec * prec / (rec + prec) : 0]); } }
      const bp = cand.length > ref.length ? 1 : Math.exp(1 - ref.length / cand.length), pos = ps.every(p => p > 0), bleu = pos ? bp * Math.exp(ps.reduce((s, p) => s + Math.log(p), 0) / 4) : 0;
      box.innerHTML = '<table><thead><tr><th>Bậc</th><th>Trùng (đã cắt) / tổng của ứng viên</th><th>Độ chính xác p<sub>n</sub></th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
      readout.innerHTML = 'Độ dài: ứng viên ' + cand.length + ', tham chiếu ' + ref.length + ' → phạt ngắn BP = <b>' + bp.toFixed(3) + '</b> · BLEU-4 = BP·(p₁p₂p₃p₄)^¼ = <b>' + bleu.toFixed(3) + '</b>' + (pos ? '' : ' (bằng 0 vì có độ chính xác n-gram bằng 0; thử bật làm trơn)') +
        '<br>ROUGE-1: recall <b>' + rouge[0][1].toFixed(3) + '</b>, precision ' + rouge[0][2].toFixed(3) + ', F1 <b>' + rouge[0][3].toFixed(3) + '</b> · ROUGE-2: recall <b>' + rouge[1][1].toFixed(3) + '</b>, F1 ' + rouge[1][3].toFixed(3) +
        '<br><span style="color:var(--muted)">Đây là BLEU mức câu với một tham chiếu. BLEU thường được tính ở mức toàn tập dữ liệu và phụ thuộc cách tách từ; hãy dùng công cụ chuẩn hóa như sacreBLEU khi báo cáo kết quả.</span>';
    }
    refIn.addEventListener('input', update); candIn.addEventListener('input', update); update();
  });
})();
