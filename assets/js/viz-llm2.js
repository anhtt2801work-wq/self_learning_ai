/* Deeper demos for the LLM page: attention step by step, positional encodings, KV cache and memory, scaling laws */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const f2 = v => (Math.abs(v) < 5e-3 ? '0.00' : v.toFixed(2));
  const numInput = (val, cb, w) => { const i = el('input'); i.type = 'number'; i.step = 'any'; i.value = val; i.style.cssText = 'width:' + (w || 54) + 'px;font:inherit;padding:2px 4px;border:1px solid var(--border);border-radius:5px;background:var(--surface);color:var(--text)'; i.addEventListener('input', () => { const v = parseFloat(i.value); if (isFinite(v)) cb(v); }); return i; };

  /* ================= 1. Self-attention with every matrix visible ================= */
  Viz.register('attnstep1', function (root) {
    const names = ['con', 'mèo', 'ngồi'];
    const X = [[1, 0], [0, 1], [1, 1]], Wq = [[1, 0], [0, 1]], Wk = [[1, 1], [0, 1]], Wv = [[1, 0], [1, 1]]; let scale = true, causal = true;
    const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
    const tr = A => A[0].map((_, j) => A.map(r => r[j]));
    function matrixEditor(title, M, cb) { const box = el('div'); box.style.cssText = 'display:inline-block;margin:4px 14px 8px 0;vertical-align:top'; box.appendChild(el('div', 'viz-lbl', title)); box.lastChild.style.fontSize = '.82rem'; M.forEach((r, i) => { const row = el('div'); r.forEach((v, j) => row.appendChild(numInput(v, x => { M[i][j] = x; cb(); }))); box.appendChild(row); }); return box; }
    const ed = el('div'); root.appendChild(ed);
    [['X (3 token × 2 chiều)', X], ['W_Q', Wq], ['W_K', Wk], ['W_V', Wv]].forEach(([t, M]) => ed.appendChild(matrixEditor(t, M, update)));
    const r1 = U.row(root);
    U.check(r1, 'Chia cho √d_k', scale, v => { scale = v; update(); });
    U.check(r1, 'Mặt nạ nhân quả', causal, v => { causal = v; update(); });
    const out = el('div'); root.appendChild(out);
    const readout = U.out(root);
    const table = (M, rowLab, colLab, heat) => { let h = '<table class="heat"><thead><tr><th></th>' + (colLab || M[0].map((_, j) => j)).map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>'; M.forEach((r, i) => { h += '<tr><th>' + esc(rowLab ? rowLab[i] : i) + '</th>' + r.map(v => { const bg = heat ? 'background:' + Viz.rgba(Viz.colors().a, 0.08 + 0.8 * Math.max(0, Math.min(1, v))) + ';' : ''; return '<td style="' + bg + (heat && v > .55 ? 'color:' + (document.documentElement.dataset.theme === 'dark' ? '#0b1020' : '#fff') : '') + '">' + (v === -Infinity ? '−∞' : f2(v)) + '</td>'; }).join('') + '</tr>'; }); return h + '</tbody></table>'; };
    function update() {
      const Q = mm(X, Wq), K = mm(X, Wk), V = mm(X, Wv), S = mm(Q, tr(K)), dk = Q[0].length, S2 = S.map(r => r.map(v => (scale ? v / Math.sqrt(dk) : v)));
      const Sm = S2.map((r, i) => r.map((v, j) => (causal && j > i ? -Infinity : v))), A = Sm.map(r => { const m = Math.max(...r), e = r.map(v => (v === -Infinity ? 0 : Math.exp(v - m))), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }), O = mm(A, V);
      const cell = (t, formula, M, rl, cl, heat) => '<div style="display:inline-block;margin:4px 16px 10px 0;vertical-align:top"><div class="viz-lbl" style="font-size:.82rem">' + t + '<br><span style="opacity:.75">' + formula + '</span></div>' + table(M, rl, cl, heat) + '</div>';
      out.innerHTML = cell('Q', 'Q = X·W_Q', Q, names, ['q₁', 'q₂']) + cell('K', 'K = X·W_K', K, names, ['k₁', 'k₂']) + cell('V', 'V = X·W_V', V, names, ['v₁', 'v₂']) + '<br>' +
        cell('Điểm thô', 'S = Q·Kᵀ', S, names, names) + cell(scale ? 'Chia √d_k' : 'Không chia', scale ? 'S / √' + dk + ' = S / ' + Math.sqrt(dk).toFixed(3) : '(bỏ bước chia)', S2, names, names) + cell(causal ? 'Thêm mặt nạ' : 'Không mặt nạ', causal ? 'ô j > i ← −∞' : '(nhìn mọi vị trí)', Sm, names, names) + '<br>' +
        cell('Trọng số attention', 'A = softmax theo từng hàng', A, names, names, true) + cell('Đầu ra', 'O = A·V', O, names, ['o₁', 'o₂']);
      const i = 2, w = A[i].map((v, j) => names[j] + ' ' + f2(v)).join(', ');
      readout.innerHTML = 'Hàng cuối của A (token “' + names[i] + '” nhìn vào đâu): <b>' + w + '</b>. Mỗi hàng của A có tổng bằng 1; đầu ra o<sub>i</sub> = Σ<sub>j</sub> A<sub>ij</sub>·v<sub>j</sub> là trung bình có trọng số của các vector giá trị. ' +
        (causal ? 'Với mặt nạ nhân quả, hàng đầu chỉ có thể nhìn chính nó (trọng số 1) và A là ma trận tam giác dưới.' : 'Không có mặt nạ, mỗi token nhìn được cả tương lai (như trong mô hình mã hóa hai chiều kiểu BERT).');
    }
    window.addEventListener('themechange', update);
    update();
  });

  /* ================= 2. Positional encodings: sinusoidal map and the RoPE relative property ================= */
  Viz.register('pos1', function (root) {
    let dModel = 64, theta = 0.35, m1 = 3, m2 = 17, aq = 20, ak = 100; const LEN = 48;
    const split = el('div', 'viz-split even'); root.appendChild(split); const cl = el('div'), cr = el('div'); split.appendChild(cl); split.appendChild(cr);
    const c1 = el('div', 'viz-help', 'Mã hóa vị trí sin/cos: hàng = vị trí, cột = chiều'); c1.style.padding = '0 0 4px'; cl.appendChild(c1);
    const c2 = el('div', 'viz-help', 'RoPE: tích vô hướng theo khoảng cách n − m'); c2.style.padding = '0 0 4px'; cr.appendChild(c2);
    const pe = (pos, i) => { const k = Math.floor(i / 2), ang = pos / Math.pow(10000, 2 * k / dModel); return i % 2 ? Math.cos(ang) : Math.sin(ang); };
    const heat = Viz.mount(cl, {
      aspect: 1, label: 'Bản đồ nhiệt của mã hóa vị trí sin/cos',
      draw(ctx, W, H, c) { const cw = W / dModel, ch = H / LEN, A = Viz.rgb(c.a), B = Viz.rgb(c.b); for (let p = 0; p < LEN; p++) for (let i = 0; i < dModel; i++) { const v = pe(p, i), col = v >= 0 ? B : A; ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + Math.abs(v) * .9 + ')'; ctx.fillRect(i * cw, p * ch, Math.ceil(cw), Math.ceil(ch)); } ctx.fillStyle = c.fg; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('chiều → (tần số giảm dần)', 6, 4); ctx.save(); ctx.translate(6, H - 6); ctx.fillText('vị trí ↓', 0, -12); ctx.restore(); }
    });
    const rot = (v, m) => { const c = Math.cos(m * theta), s = Math.sin(m * theta); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
    const qv = () => [Math.cos(aq * Math.PI / 180), Math.sin(aq * Math.PI / 180)], kv = () => [Math.cos(ak * Math.PI / 180), Math.sin(ak * Math.PI / 180)];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    const curve = m => { const out = []; for (let d = -20; d <= 20; d++) out.push([d, dot(rot(qv(), m), rot(kv(), m + d))]); return out; };
    const rope = Viz.mount(cr, {
      aspect: 1, label: 'Tích vô hướng của q và k sau khi quay theo vị trí',
      draw(ctx, W, H, c) {
        const pad = { l: 34, r: 10, t: 22, b: 30 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, sx = d => pad.l + (d + 20) / 40 * pw, sy = v => pad.t + ph / 2 - v * ph / 2.2;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; [-20, -10, 0, 10, 20].forEach(d => { ctx.beginPath(); ctx.moveTo(sx(d), pad.t); ctx.lineTo(sx(d), H - pad.b); ctx.stroke(); ctx.fillText(d, sx(d), H - pad.b + 4); }); ctx.fillText('n − m', pad.l + pw / 2, H - 14);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; [-1, 0, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(W - pad.r, sy(v)); ctx.stroke(); ctx.fillText(v, pad.l - 4, sy(v)); });
        [[m1, c.a, 3.2], [m2, c.b, 1.8]].forEach(([m, col, w]) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); curve(m).forEach(([d, v], i) => { i ? ctx.lineTo(sx(d), sy(v)) : ctx.moveTo(sx(d), sy(v)); }); ctx.stroke(); });
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = c.a; ctx.fillText('— m = ' + m1, pad.l + 6, 4); ctx.fillStyle = c.b; ctx.fillText('— m = ' + m2, pad.l + 70, 4); ctx.strokeStyle = c.border; ctx.strokeRect(pad.l, pad.t, pw, ph);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'd_model (bản đồ sin/cos)', 16, 128, 16, dModel, String, v => { dModel = v; update(); });
    U.slider(r1, 'Góc quay θ mỗi vị trí (rad)', 0.05, 1.2, 0.05, theta, v => v.toFixed(2), v => { theta = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Vị trí m (đường xanh)', 0, 40, 1, m1, String, v => { m1 = v; update(); });
    U.slider(r2, 'Vị trí m (đường cam)', 0, 40, 1, m2, String, v => { m2 = v; update(); });
    U.slider(r2, 'Góc của q (°)', 0, 180, 5, aq, String, v => { aq = v; update(); });
    U.slider(r2, 'Góc của k (°)', 0, 180, 5, ak, String, v => { ak = v; update(); });
    const readout = U.out(root);
    function update() {
      const a = curve(m1), b = curve(m2); let diff = 0; a.forEach(([, v], i) => { diff = Math.max(diff, Math.abs(v - b[i][1])); });
      readout.innerHTML = 'Hai đường (cho hai vị trí tuyệt đối m khác nhau) trùng nhau: chênh lệch lớn nhất = <b>' + diff.toExponential(1) + '</b>. Tích vô hướng ⟨R<sub>m</sub>q, R<sub>n</sub>k⟩ chỉ phụ thuộc vào n − m, nên attention với RoPE có tính tương đối về vị trí. ' +
        'Ở d_model = ' + dModel + ', tần số các cặp chiều giảm từ 1 rad/vị trí xuống cỡ 1/10000 rad/vị trí, nên mô hình có cả thang đo gần lẫn xa.'; heat.redraw(); rope.redraw();
    }
    update();
  });

  /* ================= 3. KV cache, weights and decoding speed ================= */
  Viz.register('kv1', function (root) {
    // Configurations below are hypothetical, chosen to resemble well-known sizes; they are not official specs of any product.
    const PRE = {
      s7: { name: 'Cỡ 7B, attention đầy đủ', L: 32, d: 4096, h: 32, kv: 32, ff: 11008, V: 32000 },
      s7g: { name: 'Cỡ 7B, GQA (8 nhóm KV)', L: 32, d: 4096, h: 32, kv: 8, ff: 14336, V: 128000 },
      s70: { name: 'Cỡ 70B, GQA (8 nhóm KV)', L: 80, d: 8192, h: 64, kv: 8, ff: 28672, V: 32000 }
    };
    const S = { ...PRE.s7 }; let ctxLen = 4096, batch = 8, wBytes = 2, kvBytes = 2, bw = 2000, mem = 80;
    const params = () => { const dh = S.d / S.h; return S.L * (2 * S.d * S.d + 2 * S.d * S.kv * dh + 3 * S.d * S.ff) + 2 * S.V * S.d; };
    const kvPerTok = () => 2 * S.L * S.kv * (S.d / S.h) * kvBytes;
    const wB = () => params() * wBytes, kvSeq = () => kvPerTok() * ctxLen, memUse = b => wB() + b * kvSeq();
    const tput = b => b / ((wB() + b * kvSeq()) / (bw * 1e9));        // tokens/s total, memory-bandwidth bound
    const view = Viz.mount(root, {
      aspect: 0.45, label: 'Thông lượng giải mã (token mỗi giây) theo kích thước lô',
      draw(ctx, W, H, c) {
        const pad = { l: 56, r: 12, t: 24, b: 32 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, B = []; for (let b = 1; b <= 512; b = Math.ceil(b * 1.25 + (b < 4 ? 1 : 0))) B.push(b);
        const pts = B.map(b => [b, tput(b)]), maxY = Math.max(...pts.map(p => p[1])) * 1.1 || 1, sx = b => pad.l + Math.log2(b) / 9 * pw, sy = v => pad.t + ph - v / maxY * ph;
        ctx.font = '11px system-ui'; ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; [1, 2, 4, 8, 16, 32, 64, 128, 256, 512].forEach(b => { ctx.beginPath(); ctx.moveTo(sx(b), pad.t); ctx.lineTo(sx(b), H - pad.b); ctx.stroke(); ctx.fillText(b, sx(b), H - pad.b + 4); });
        ctx.fillText('kích thước lô (số chuỗi giải mã đồng thời)', pad.l + pw / 2, H - 14); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (let i = 0; i <= 4; i++) { const v = maxY * i / 4 / 1.1; ctx.beginPath(); ctx.moveTo(pad.l, sy(v * 1.1)); ctx.lineTo(W - pad.r, sy(v * 1.1)); ctx.stroke(); ctx.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0), pad.l - 4, sy(v * 1.1)); }
        const feas = b => memUse(b) <= mem * 1e9; const bmax = B.filter(feas).pop();
        if (bmax && bmax < 512) { ctx.fillStyle = Viz.rgba(c.b, .13); ctx.fillRect(sx(bmax), pad.t, W - pad.r - sx(bmax), ph); ctx.fillStyle = c.b; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('vượt bộ nhớ GPU', W - pad.r - 4, pad.t + 4); }
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.6; ctx.beginPath(); pts.forEach(([b, v], i) => { i ? ctx.lineTo(sx(b), sy(v)) : ctx.moveTo(sx(b), sy(v)); }); ctx.stroke();
        ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(sx(Math.max(1, batch)), sy(tput(batch)), 5.5, 0, 7); ctx.fill(); ctx.fillStyle = c.a; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('— tổng token/giây (cận trên theo băng thông bộ nhớ)', pad.l + 6, 4); ctx.strokeStyle = c.border; ctx.lineWidth = 1; ctx.strokeRect(pad.l, pad.t, pw, ph);
      }
    });
    const r1 = U.row(root);
    U.select(r1, 'Cấu hình mô hình', Object.keys(PRE).map(k => [k, PRE[k].name]), v => { Object.assign(S, PRE[v]); fields.forEach(f => f()); update(); });
    const fields = []; const r2 = U.row(root);
    [['L', 'Số lớp'], ['d', 'd_model'], ['h', 'Số đầu Q'], ['kv', 'Số đầu K/V'], ['ff', 'd_ff'], ['V', 'Từ vựng']].forEach(([k, t]) => { const l = el('label', 'viz-ctl'); l.appendChild(el('span', 'viz-lbl', t)); const i = numInput(S[k], v => { S[k] = Math.max(1, Math.round(v)); update(); }, 74); l.appendChild(i); r2.appendChild(l); fields.push(() => { i.value = S[k]; }); });
    const r3 = U.row(root);
    U.slider(r3, 'Độ dài ngữ cảnh', 512, 131072, 512, ctxLen, v => String(v), v => { ctxLen = v; update(); });
    U.slider(r3, 'Kích thước lô', 1, 256, 1, batch, String, v => { batch = v; update(); });
    const r4 = U.row(root);
    U.select(r4, 'Độ chính xác trọng số', [['2', '16-bit (2 byte)'], ['1', '8-bit (1 byte)'], ['0.5', '4-bit (0.5 byte)']], v => { wBytes = +v; update(); });
    U.select(r4, 'Độ chính xác KV cache', [['2', '16-bit'], ['1', '8-bit']], v => { kvBytes = +v; update(); });
    const lb = el('label', 'viz-ctl'); lb.appendChild(el('span', 'viz-lbl', 'Băng thông bộ nhớ (GB/s)')); lb.appendChild(numInput(bw, v => { bw = Math.max(1, v); update(); }, 70)); r4.appendChild(lb);
    const lm = el('label', 'viz-ctl'); lm.appendChild(el('span', 'viz-lbl', 'Bộ nhớ GPU (GB)')); lm.appendChild(numInput(mem, v => { mem = Math.max(1, v); update(); }, 60)); r4.appendChild(lm);
    const readout = U.out(root);
    function update() {
      const p = params(), kvs = kvSeq(), tot = memUse(batch), perSeq = 1 / ((wB() + batch * kvs) / (bw * 1e9));
      readout.innerHTML = 'Số tham số ≈ <b>' + (p / 1e9).toFixed(2) + ' tỷ</b> → trọng số <b>' + (wB() / 2 ** 30).toFixed(1) + ' GiB</b> · KV cache mỗi token = <b>' + (kvPerTok() / 1024).toFixed(0) + ' KiB</b> → mỗi chuỗi ' + ctxLen + ' token = <b>' + (kvs / 2 ** 30).toFixed(2) + ' GiB</b>' +
        '<br>Lô ' + batch + ': tổng bộ nhớ ≈ <b>' + (tot / 2 ** 30).toFixed(1) + ' GiB</b> ' + (tot > mem * 1e9 ? '<b>(vượt ' + mem + ' GB của GPU)</b>' : '(vừa)') + ' · cận trên tốc độ giải mã ≈ <b>' + perSeq.toFixed(1) + ' token/giây mỗi chuỗi</b>, tổng ≈ <b>' + (batch * perSeq).toFixed(0) + ' token/giây</b>' +
        '<br><span style="color:var(--muted)">Cận trên này giả định giải mã bị chặn bởi băng thông bộ nhớ (mỗi bước đọc toàn bộ trọng số và KV cache một lần) và bỏ qua tính toán, truyền thông giữa nhiều GPU, chi phí khác. Số đo thực tế thường thấp hơn. Cấu hình mô hình và băng thông là giá trị giả định gần với các cỡ thường gặp; hãy nhập số của phần cứng bạn dùng.</span>'; view.redraw();
    }
    update();
  });

  /* ================= 4. Parametric scaling law and compute-optimal allocation ================= */
  Viz.register('scaling1', function (root) {
    const K = { E: 1.69, A: 406.4, B: 410.7, a: 0.34, b: 0.28 }; let logC = 22, logN = 9.6;
    const loss = (N, D) => K.E + K.A / Math.pow(N, K.a) + K.B / Math.pow(D, K.b);
    const opt = C => { const G = Math.pow(K.a * K.A / (K.b * K.B), 1 / (K.a + K.b)); const N = G * Math.pow(C / 6, K.b / (K.a + K.b)), D = Math.pow(C / 6, K.a / (K.a + K.b)) / G; return { N, D, L: loss(N, D) }; };
    const view = Viz.mount(root, {
      aspect: 0.5, label: 'Mất mát dự đoán theo số tham số khi giữ cố định ngân sách tính toán',
      draw(ctx, W, H, c) {
        const pad = { l: 46, r: 12, t: 24, b: 32 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, lo = 7, hi = 12.5, curves = [logC - 2, logC, logC + 2], cols = [c.c, c.a, c.b];
        const Lmin = K.E, Lmax = K.E + 2.2, sx = x => pad.l + (x - lo) / (hi - lo) * pw, sy = v => pad.t + ph - (Math.min(Lmax, v) - Lmin) / (Lmax - Lmin) * ph;
        ctx.font = '11px system-ui'; ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let x = 7; x <= 12; x++) { ctx.beginPath(); ctx.moveTo(sx(x), pad.t); ctx.lineTo(sx(x), H - pad.b); ctx.stroke(); ctx.fillText('1e' + x, sx(x), H - pad.b + 4); } ctx.fillText('số tham số N (thang log)', pad.l + pw / 2, H - 14);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (let v = Math.ceil(Lmin * 2) / 2; v < Lmax; v += 0.5) { ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(W - pad.r, sy(v)); ctx.stroke(); ctx.fillText(v.toFixed(1), pad.l - 4, sy(v)); }
        curves.forEach((lc, k) => { const C = Math.pow(10, lc); ctx.strokeStyle = cols[k]; ctx.lineWidth = k === 1 ? 3 : 1.8; ctx.beginPath(); for (let i = 0; i <= 240; i++) { const x = lo + (hi - lo) * i / 240, N = Math.pow(10, x), D = C / 6 / N; i ? ctx.lineTo(sx(x), sy(loss(N, D))) : ctx.moveTo(sx(x), sy(loss(N, D))); } ctx.stroke(); const o = opt(C); ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.arc(sx(Math.log10(o.N)), sy(o.L), 5, 0, 7); ctx.fill(); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('C = 1e' + (+lc.toFixed(2)), pad.l + 6 + k * 90, 4); });
        const C = Math.pow(10, logC), Nx = Math.pow(10, logN); ctx.fillStyle = c.d; ctx.beginPath(); ctx.arc(sx(logN), sy(loss(Nx, C / 6 / Nx)), 6, 0, 7); ctx.fill(); ctx.strokeStyle = c.border; ctx.lineWidth = 1; ctx.strokeRect(pad.l, pad.t, pw, ph);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Ngân sách C = 6ND (log₁₀ FLOP)', 19, 26, 0.25, logC, v => '1e' + (+v.toFixed(2)), v => { logC = v; update(); });
    U.slider(r1, 'Chọn N của bạn (log₁₀)', 7.5, 12.2, 0.05, logN, v => (Math.pow(10, v) / 1e9).toFixed(2) + ' tỷ', v => { logN = v; update(); });
    const det = el('details'); det.appendChild(el('summary', '', 'Hằng số của hàm mất mát L(N,D) = E + A/N^α + B/D^β (có thể sửa)')); det.style.margin = '6px 0'; const row = el('div', 'viz-row');
    [['E', 'E'], ['A', 'A'], ['B', 'B'], ['a', 'α'], ['b', 'β']].forEach(([k, t]) => { const l = el('label', 'viz-ctl'); l.appendChild(el('span', 'viz-lbl', t)); l.appendChild(numInput(K[k], v => { K[k] = v; update(); }, 70)); row.appendChild(l); }); det.appendChild(row); root.appendChild(det);
    const readout = U.out(root);
    function update() {
      const C = Math.pow(10, logC), o = opt(C), N = Math.pow(10, logN), D = C / 6 / N, L = loss(N, D);
      readout.innerHTML = 'Với C = <b>1e' + (+logC.toFixed(2)) + '</b> FLOP: tối ưu theo hàm này là N* ≈ <b>' + (o.N / 1e9).toFixed(2) + ' tỷ</b> tham số, D* ≈ <b>' + (o.D / 1e9).toFixed(0) + ' tỷ</b> token (D*/N* ≈ <b>' + (o.D / o.N).toFixed(0) + '</b>), mất mát L* ≈ <b>' + o.L.toFixed(3) + '</b>.' +
        '<br>Mô hình bạn chọn: N = ' + (N / 1e9).toFixed(2) + ' tỷ, D = C/(6N) = ' + (D / 1e9 < 1e4 ? (D / 1e9).toFixed(0) + ' tỷ' : D.toExponential(1) + '') + ' token (D/N ≈ ' + (D / N > 1e4 ? (D / N).toExponential(1) : (D / N).toFixed(0)) + '), L ≈ <b>' + L.toFixed(3) + '</b>, chênh <b>+' + (L - o.L).toFixed(3) + '</b> so với tối ưu.' +
        '<br><span style="color:var(--muted)">Hằng số mặc định là giá trị mình nhớ từ cách ước lượng tham số trong bài Hoffmann và cộng sự (2022); có nghiên cứu sau cho rằng các ước lượng gốc có sai lệch, và các nhóm chọn tỉ lệ D/N khác nhau tùy mục tiêu (ví dụ huấn luyện lâu hơn để mô hình nhỏ rẻ khi triển khai). Hãy coi đây là minh họa dạng hàm, không phải dự báo cho một mô hình cụ thể.</span>'; view.redraw();
    }
    update();
  });
})();
