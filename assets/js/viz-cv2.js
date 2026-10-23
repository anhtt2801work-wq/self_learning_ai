/* Additional interactive demos for the Computer Vision page (deep-dive sections) */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const fmtInt = n => Math.round(n).toLocaleString('en-US');
  const fmtM = n => (n / 1e6).toFixed(n < 1e6 ? 3 : 2) + ' M';

  /* ---------- 1. Cost of a conv layer: standard vs depthwise-separable vs bottleneck ---------- */
  Viz.register('convcost1', function (root) {
    let cin = 128, cout = 128, k = 3, hw = 28, ratio = 4;
    const conv = (ci, co, kk, g) => ({ p: co * (ci / g) * kk * kk, m: hw * hw * co * (ci / g) * kk * kk });
    function designs() {
      const std = conv(cin, cout, k, 1);
      const dw = conv(cin, cin, k, cin), pw = conv(cin, cout, 1, 1);
      const mid = Math.max(1, Math.round(cout / ratio));
      const a = conv(cin, mid, 1, 1), b = conv(mid, mid, k, 1), c = conv(mid, cout, 1, 1);
      return [
        { name: 'Conv chuẩn ' + k + '×' + k, p: std.p, m: std.m },
        { name: 'Tách theo chiều sâu (depthwise ' + k + '×' + k + ' + pointwise 1×1)', p: dw.p + pw.p, m: dw.m + pw.m },
        { name: 'Bottleneck (1×1 → ' + k + '×' + k + ' → 1×1, giữa ' + mid + ' kênh)', p: a.p + b.p + c.p, m: a.m + b.m + c.m }
      ];
    }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 260, label: 'Thanh so sánh số tham số và số phép nhân-cộng của ba thiết kế',
      draw(ctx, W, H, c) {
        const D = designs(), cols = [c.muted, c.a, c.b], padL = 12, padR = 12;
        ctx.font = '12px system-ui, sans-serif'; ctx.textBaseline = 'middle';
        [['Số tham số', 'p'], ['Số MAC (phép nhân-cộng) cho một ảnh', 'm']].forEach(([title, key], g) => {
          const y0 = 8 + g * (H / 2); ctx.fillStyle = c.fg; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(title, padL, y0 + 8);
          ctx.font = '12px system-ui, sans-serif';
          D.forEach((d, i) => {
            const y = y0 + 26 + i * ((H / 2 - 34) / 3), bh = (H / 2 - 34) / 3 - 8, w = (W - padL - padR - 70) * (d[key] / D[0][key]);
            ctx.fillStyle = cols[i]; ctx.globalAlpha = 0.85; ctx.fillRect(padL, y, Math.max(2, w), bh); ctx.globalAlpha = 1;
            ctx.fillStyle = c.fg; ctx.textAlign = 'left'; ctx.fillText((d[key] / D[0][key] * 100).toFixed(d[key] / D[0][key] < 0.1 ? 1 : 0) + '%', padL + Math.max(2, w) + 6, y + bh / 2);
            if (w > 150) { ctx.fillStyle = '#fff'; ctx.fillText(i === 0 ? 'chuẩn' : i === 1 ? 'tách chiều sâu' : 'bottleneck', padL + 8, y + bh / 2); }
          });
        });
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Kênh vào C_in', 16, 512, 16, cin, String, v => { cin = v; update(); });
    U.slider(r1, 'Kênh ra C_out', 16, 512, 16, cout, String, v => { cout = v; update(); });
    const r2 = U.row(root);
    U.select(r2, 'Kernel k', [['1', '1×1'], ['3', '3×3'], ['5', '5×5'], ['7', '7×7']], v => { k = +v; update(); }); r2.querySelector('select').value = '3';
    U.select(r2, 'Bản đồ đặc trưng', [['7', '7×7'], ['14', '14×14'], ['28', '28×28'], ['56', '56×56'], ['112', '112×112']], v => { hw = +v; update(); }); r2.querySelectorAll('select')[1].value = '28';
    U.select(r2, 'Nén bottleneck', [['2', '÷2'], ['4', '÷4'], ['8', '÷8']], v => { ratio = +v; update(); }); r2.querySelectorAll('select')[2].value = '4';
    const readout = U.out(root);
    function update() {
      const D = designs();
      readout.innerHTML = D.map(d => '<b>' + d.name + '</b>: ' + fmtInt(d.p) + ' tham số, ' + fmtM(d.m) + ' MAC').join('<br>') +
        '<br>Tỉ lệ tham số của kiểu tách theo chiều sâu so với conv chuẩn = <b>' + (D[1].p / D[0].p).toFixed(4) + '</b> = 1/C_out + 1/k² = ' + (1 / cout + 1 / (k * k)).toFixed(4) + ' (đúng cả với MAC, vì cả hai cùng nhân với h·w).' +
        (k === 1 ? ' Với k = 1 conv chuẩn và pointwise là một, nên không có gì để tách.' : '');
      view.redraw();
    }
    update();
  });

  /* ---------- 2. Where do params, MACs and activations go in a ResNet-18? ---------- */
  Viz.register('cnnstack1', function (root) {
    let img = 224, wm = 1;
    function net() {
      const ch = c => Math.max(1, Math.round(c * wm));
      const rows = []; let hw = img / 2, c1 = ch(64);
      rows.push({ name: 'conv1 7×7/2 + BN + pool', out: c1 + '×' + hw / 2 + '×' + hw / 2, p: c1 * 3 * 49 + 2 * c1, m: hw * hw * c1 * 3 * 49, a: hw * hw * c1 });
      hw = hw / 2; let cin = c1;
      [[64, 1], [128, 2], [256, 2], [512, 2]].forEach(([c0, s], idx) => {
        const cout = ch(c0); let p = 0, m = 0, a = 0;
        for (let b = 0; b < 2; b++) {
          const st = b === 0 ? s : 1, ci = b === 0 ? cin : cout, h1 = hw / st;
          p += cout * ci * 9 + cout * cout * 9 + 4 * cout; m += h1 * h1 * cout * ci * 9 + h1 * h1 * cout * cout * 9; a += 2 * h1 * h1 * cout;
          if (b === 0 && (st !== 1 || ci !== cout)) { p += cout * ci + 2 * cout; m += h1 * h1 * cout * ci; a += h1 * h1 * cout; }
          hw = h1;
        }
        cin = cout; rows.push({ name: 'layer' + (idx + 1) + ' (2 khối cơ bản)', out: cout + '×' + hw + '×' + hw, p, m, a });
      });
      rows.push({ name: 'GAP + fc (1000 lớp)', out: '1000', p: cin * 1000 + 1000, m: cin * 1000, a: 1000 });
      return rows;
    }
    const r1 = U.row(root);
    U.slider(r1, 'Kích thước ảnh vào', 64, 448, 32, img, v => v + '×' + v, v => { img = v; update(); });
    U.slider(r1, 'Hệ số độ rộng (nhân số kênh)', 0.5, 2, 0.25, wm, v => '×' + v, v => { wm = v; update(); });
    const table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const readout = U.out(root);
    function update() {
      const rows = net(), T = rows.reduce((s, r) => ({ p: s.p + r.p, m: s.m + r.m, a: s.a + r.a }), { p: 0, m: 0, a: 0 });
      const bar = (v, tot, col) => '<div style="display:flex;align-items:center;gap:6px"><div style="height:8px;width:' + Math.max(1, v / tot * 90).toFixed(1) + 'px;background:var(' + col + ');border-radius:3px"></div><span>' + (v / 1e6).toFixed(2) + ' M</span></div>';
      let h = '<table><thead><tr><th>Giai đoạn</th><th>Đầu ra C×H×W</th><th>Tham số</th><th>MAC</th><th>Phần tử kích hoạt*</th></tr></thead><tbody>';
      rows.forEach(r => { h += '<tr><td>' + r.name + '</td><td>' + r.out + '</td><td>' + bar(r.p, T.p, '--c1') + '</td><td>' + bar(r.m, T.m, '--c2') + '</td><td>' + bar(r.a, T.a, '--c3') + '</td></tr>'; });
      h += '<tr><td><b>Tổng</b></td><td></td><td><b>' + fmtInt(T.p) + '</b></td><td><b>' + (T.m / 1e9).toFixed(3) + ' G</b></td><td><b>' + (T.a / 1e6).toFixed(2) + ' M</b></td></tr></tbody></table>';
      table.innerHTML = h;
      const last = rows[4], first = rows[1];
      readout.innerHTML = 'Ở cấu hình chuẩn (224, ×1) tổng là 11,689,512 tham số và khoảng 1.81 G MAC. Nhận xét: <b>tham số dồn về cuối</b> (layer4 chiếm ' + (last.p / T.p * 100).toFixed(0) + '%) còn <b>kích hoạt dồn về đầu</b> (layer1 + conv1 chiếm ' + ((rows[0].a + first.a) / T.a * 100).toFixed(0) + '%), trong khi MAC khá đều giữa các giai đoạn vì mỗi lần nửa kích thước không gian thì số kênh nhân đôi. *Chỉ đếm đầu ra các lớp conv và fc (chưa tính BN/ReLU tại chỗ). Phép nhân (MAC) tăng theo bình phương kích thước ảnh: ' + img + '² ⇒ ' + (img * img / 224 / 224).toFixed(2) + '× so với 224.';
    }
    update();
  });

  /* ---------- 3. ViT patchify and sequence length ---------- */
  Viz.register('vit1', function (root) {
    let S = 224, P = 16, hover = -1;
    function scene(ctx, W, H, c) {
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#8ecae6'); g.addColorStop(1, '#d6ecf5'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#6aa84f'; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, W * 0.09, 0, 7); ctx.fill();
      ctx.fillStyle = '#e9d8a6'; ctx.fillRect(W * 0.2, H * 0.45, W * 0.34, H * 0.32);
      ctx.fillStyle = '#c1121f'; ctx.beginPath(); ctx.moveTo(W * 0.16, H * 0.46); ctx.lineTo(W * 0.37, H * 0.26); ctx.lineTo(W * 0.58, H * 0.46); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7f5539'; ctx.fillRect(W * 0.34, H * 0.6, W * 0.07, H * 0.17);
    }
    const view = Viz.mount(root, {
      aspect: 0.62, minH: 240, label: 'Ảnh được chia thành lưới các mảnh vuông',
      draw(ctx, W, H, c) {
        const side = Math.min(W, H) - 4, ox = (W - side) / 2, oy = 2, n = S / P, cs = side / n;
        ctx.save(); ctx.translate(ox, oy); scene(ctx, side, side);
        ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= n; i++) { ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, side); ctx.moveTo(0, i * cs); ctx.lineTo(side, i * cs); } ctx.stroke();
        if (hover >= 0 && hover < n * n) {
          const r = Math.floor(hover / n), q = hover % n; ctx.strokeStyle = c.b; ctx.lineWidth = 3; ctx.strokeRect(q * cs + 1.5, r * cs + 1.5, cs - 3, cs - 3);
          ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.font = '12px system-ui, sans-serif'; ctx.textBaseline = 'top'; const t = 'mảnh #' + (hover + 1) + ' → vector ' + (P * P * 3) + ' số'; ctx.fillRect(4, 4, ctx.measureText(t).width + 10, 20); ctx.fillStyle = '#fff'; ctx.fillText(t, 9, 8);
        }
        ctx.restore();
      }
    });
    view.cv.addEventListener('pointermove', ev => {
      const p = Viz.pos(ev, view.cv), side = Math.min(view.W, view.H) - 4, ox = (view.W - side) / 2, n = S / P, x = Math.floor((p.x - ox) / (side / n)), y = Math.floor((p.y - 2) / (side / n));
      const h = (x >= 0 && y >= 0 && x < n && y < n) ? y * n + x : -1; if (h !== hover) { hover = h; view.redraw(); }
    });
    view.cv.addEventListener('pointerleave', () => { hover = -1; view.redraw(); });
    const r1 = U.row(root);
    U.slider(r1, 'Cạnh ảnh', 64, 512, 32, S, v => v + '×' + v, v => { S = v; update(); });
    U.select(r1, 'Cạnh mảnh P', [['8', '8'], ['16', '16'], ['32', '32']], v => { P = +v; update(); }); r1.querySelector('select').value = '16';
    const readout = U.out(root);
    function update() {
      const n = (S / P) ** 2, L = n + 1, base = 197 * 197;
      readout.innerHTML = 'Số mảnh = (' + S + '/' + P + ')² = <b>' + n + '</b>, cộng token [CLS] ⇒ chuỗi dài <b>' + L + '</b>. Mỗi đầu attention ở mỗi lớp lưu ma trận ' + L + '×' + L + ' = <b>' + fmtInt(L * L) + '</b> phần tử (' + (L * L / base).toFixed(2) + '× so với ảnh 224 với mảnh 16, vốn là 197² = 38,809). ' +
        'Mỗi mảnh là vector ' + P + '·' + P + '·3 = ' + (P * P * 3) + ' số, chiếu bằng một ma trận (' + (P * P * 3) + ' × d); với d = 768 đó là ' + fmtInt(P * P * 3 * 768 + 768) + ' tham số. Chi phí attention tăng theo bình phương số mảnh, nên giảm một nửa cạnh mảnh làm chuỗi dài gấp 4 và ma trận attention gấp khoảng 16 lần.';
      view.redraw();
    }
    update();
  });

  /* ---------- 4. CLIP contrastive loss ---------- */
  Viz.register('clip1', function (root) {
    const N = 4, D = 8; let seed = 3, noise = 1.0, logTau = -1, base, A, B;
    const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
    function gen() {
      const r = Viz.rng(seed * 101 + 7), g = () => Viz.randn(r);
      base = Array.from({ length: N }, () => Array.from({ length: D }, g));
      A = base.map(b => unit(b.map(x => x + noise * g()))); B = base.map(b => unit(b.map(x => x + noise * g())));
    }
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    function compute() {
      const tau = Math.pow(10, logTau), S = A.map(a => B.map(b => dot(a, b))), Z = S.map(row => row.map(x => x / tau));
      const smRow = Z.map(row => { const m = Math.max(...row), e = row.map(x => Math.exp(x - m)), s = e.reduce((p, q) => p + q, 0); return e.map(x => x / s); });
      const smCol = Z.map((_, i) => Z.map((_, j) => 0));
      for (let j = 0; j < N; j++) { const col = Z.map(row => row[j]), m = Math.max(...col), e = col.map(x => Math.exp(x - m)), s = e.reduce((p, q) => p + q, 0); e.forEach((x, i) => { smCol[i][j] = x / s; }); }
      let li = 0, lt = 0, acc = 0; for (let i = 0; i < N; i++) { li -= Math.log(smRow[i][i]) / N; lt -= Math.log(smCol[i][i]) / N; if (S[i].indexOf(Math.max(...S[i])) === i) acc++; }
      return { tau, S, smRow, smCol, li, lt, loss: (li + lt) / 2, acc: acc / N };
    }
    gen();
    const view = Viz.mount(root, {
      aspect: 0.4, minH: 200, label: 'Ba ma trận: độ giống cosine, softmax theo hàng, softmax theo cột',
      draw(ctx, W, H, c) {
        const R = compute(), gap = 14, w3 = (W - 2 * gap - 24) / 3, titles = ['Độ giống cosine s_ij', 'Softmax theo hàng (ảnh → câu)', 'Softmax theo cột (câu → ảnh)'], mats = [R.S, R.smRow, R.smCol];
        ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        mats.forEach((M, g) => {
          const x0 = 20 + g * (w3 + gap), cs = Math.min(w3 / N, (H - 44) / N), y0 = 30; ctx.fillStyle = c.fg; ctx.font = 'bold 11.5px system-ui, sans-serif'; ctx.fillText(titles[g], x0 + cs * N / 2, 12);
          for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
            const v = M[i][j], t = g === 0 ? (v + 1) / 2 : v, col = i === j ? Viz.rgb(c.c) : Viz.rgb(c.b);
            ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (0.1 + 0.8 * Math.max(0, Math.min(1, t))) + ')'; ctx.fillRect(x0 + j * cs, y0 + i * cs, cs, cs);
            ctx.fillStyle = c.fg; ctx.font = '11.5px system-ui, sans-serif'; ctx.fillText(v.toFixed(2), x0 + j * cs + cs / 2, y0 + i * cs + cs / 2);
          }
          ctx.strokeStyle = c.c; ctx.lineWidth = 2; for (let i = 0; i < N; i++) ctx.strokeRect(x0 + i * cs + 1, y0 + i * cs + 1, cs - 2, cs - 2);
          ctx.fillStyle = c.muted; ctx.font = '10.5px system-ui, sans-serif'; for (let i = 0; i < N; i++) ctx.fillText(String(i + 1), x0 - 8, y0 + i * cs + cs / 2); ctx.fillText('hàng i = ảnh i, cột j = câu j; đường chéo là cặp đúng', x0 + cs * N / 2, y0 + cs * N + 12);
        });
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Nhiễu giữa ảnh và câu', 0, 2, 0.1, noise, v => v.toFixed(1), v => { noise = v; gen(); update(); });
    U.slider(r1, 'Nhiệt độ τ (log₁₀)', -2, 0.5, 0.05, logTau, v => 'τ = ' + Math.pow(10, v).toFixed(3), v => { logTau = v; update(); });
    U.button(r1, 'Lấy cặp ngẫu nhiên khác', () => { seed++; gen(); update(); });
    const readout = U.out(root);
    function update() {
      const R = compute();
      readout.innerHTML = 'Mất mát ảnh→câu = <b>' + R.li.toFixed(3) + '</b>, câu→ảnh = <b>' + R.lt.toFixed(3) + '</b>, trung bình <b>' + R.loss.toFixed(3) + '</b> (nếu mọi logit bằng nhau, mất mát = ln ' + N + ' = ' + Math.log(N).toFixed(3) + '). Zero-shot đúng ' + (R.acc * 100).toFixed(0) + '% (ô lớn nhất của mỗi hàng nằm trên đường chéo). ' +
        (R.tau > 0.5 ? 'τ lớn làm softmax gần đều: gradient yếu và mô hình không bị ép tách cặp đúng khỏi cặp sai.' : R.tau < 0.03 ? 'τ rất nhỏ làm softmax gần như “cứng”: một cặp sai trội hơn cặp đúng bị phạt rất nặng, gradient thưa và dễ bất ổn.' : 'τ vừa phải: mất mát nhạy với cả cặp đúng lẫn các cặp sai gần nhất.');
      view.redraw();
    }
    update();
  });

  /* ---------- 5. Precision-recall curve and AP ---------- */
  Viz.register('pr1', function (root) {
    const DET = [[0.98, .91, 0], [0.95, .84, 1], [0.91, .62, 2], [0.88, .58, 1], [0.80, .77, 3], [0.72, .35, 4], [0.66, .55, 4], [0.55, .81, 5], [0.40, .12, -1], [0.30, .71, 2]];
    const N_GT = 7;
    let iouThr = 0.5, mode = 'all', scoreThr = 0.5;
    function evalAt() {
      const used = new Set(), rows = DET.slice().sort((a, b) => b[0] - a[0]).map(d => { const ok = d[2] >= 0 && d[1] >= iouThr && !used.has(d[2]); if (ok) used.add(d[2]); return { s: d[0], iou: d[1], g: d[2], tp: ok }; });
      let tp = 0, fp = 0; rows.forEach(r => { r.tp ? tp++ : fp++; r.rec = tp / N_GT; r.prec = tp / (tp + fp); });
      const env = rows.map(r => r.prec); for (let i = env.length - 2; i >= 0; i--) env[i] = Math.max(env[i], env[i + 1]); rows.forEach((r, i) => { r.env = env[i]; });
      let ap = 0;
      if (mode === 'all') { let prev = 0; rows.forEach(r => { ap += (r.rec - prev) * r.env; prev = r.rec; }); }
      else { for (let t = 0; t <= 100; t++) { const rr = t / 100, i = rows.findIndex(r => r.rec >= rr - 1e-12); ap += i >= 0 ? rows[i].env : 0; } ap /= 101; }
      return { rows, ap, tp };
    }
    const view = Viz.mount(root, {
      aspect: 0.55, minH: 240, label: 'Đường precision–recall và diện tích AP',
      draw(ctx, W, H, c) {
        const R = evalAt(), pad = { l: 44, r: 14, t: 14, b: 34 }, X = r => pad.l + r * (W - pad.l - pad.r), Y = p => pad.t + (1 - p) * (H - pad.t - pad.b);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { const v = i / 4; ctx.beginPath(); ctx.moveTo(X(0), Y(v)); ctx.lineTo(X(1), Y(v)); ctx.stroke(); ctx.fillText(v.toFixed(2), pad.l - 6, Y(v)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let i = 0; i <= 4; i++) ctx.fillText((i / 4).toFixed(2), X(i / 4), H - pad.b + 6); ctx.fillText('recall', X(0.5), H - 16); ctx.save(); ctx.translate(12, Y(0.5)); ctx.rotate(-Math.PI / 2); ctx.fillText('precision', 0, 0); ctx.restore();
        // shaded area under the envelope
        ctx.fillStyle = Viz.rgba(c.a, 0.22); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); let prev = 0; ctx.lineTo(X(0), Y(R.rows[0].env));
        R.rows.forEach(r => { ctx.lineTo(X(prev), Y(r.env)); ctx.lineTo(X(r.rec), Y(r.env)); prev = r.rec; }); ctx.lineTo(X(prev), Y(0)); ctx.closePath(); ctx.fill();
        // raw precision-recall points (sawtooth)
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(0), Y(1)); R.rows.forEach(r => ctx.lineTo(X(r.rec), Y(r.prec))); ctx.stroke();
        ctx.strokeStyle = c.a; ctx.lineWidth = 2.5; ctx.beginPath(); prev = 0; ctx.moveTo(X(0), Y(R.rows[0].env)); R.rows.forEach(r => { ctx.lineTo(X(prev), Y(r.env)); ctx.lineTo(X(r.rec), Y(r.env)); prev = r.rec; }); ctx.stroke();
        R.rows.forEach(r => { ctx.fillStyle = r.tp ? c.c : c.b; ctx.beginPath(); ctx.arc(X(r.rec), Y(r.prec), r.s >= scoreThr ? 5.5 : 3.5, 0, 7); ctx.fill(); });
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.c; ctx.fillText('● TP', X(0.62), Y(0.97)); ctx.fillStyle = c.b; ctx.fillText('● FP', X(0.72), Y(0.97)); ctx.fillStyle = c.a; ctx.fillText('— đường bao nội suy', X(0.62), Y(0.89)); ctx.fillStyle = c.muted; ctx.fillText('— precision thô', X(0.62), Y(0.81));
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Ngưỡng IoU để tính là trúng', 0.3, 0.9, 0.05, iouThr, v => v.toFixed(2), v => { iouThr = v; update(); });
    U.slider(r1, 'Ngưỡng điểm tin cậy (chấm to)', 0.2, 1, 0.05, scoreThr, v => v.toFixed(2), v => { scoreThr = v; update(); });
    const r2 = U.row(root);
    U.select(r2, 'Cách tính AP', [['all', 'Diện tích dưới đường bao (kiểu VOC, mọi điểm)'], ['101', 'Lấy mẫu 101 mức recall (kiểu COCO)']], v => { mode = v; update(); });
    const table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const readout = U.out(root);
    function update() {
      const R = evalAt(), at = R.rows.filter(r => r.s >= scoreThr), last = at[at.length - 1];
      let h = '<table><thead><tr><th>#</th><th>Điểm</th><th>IoU với vật thật</th><th>Vật thật</th><th>Kết quả</th><th>TP/FP tích lũy → precision, recall</th></tr></thead><tbody>', tp = 0, fp = 0;
      R.rows.forEach((r, i) => { r.tp ? tp++ : fp++; const why = r.tp ? 'TP' : (r.g < 0 || r.iou < iouThr ? 'FP (IoU thấp)' : 'FP (trùng lặp)'); h += '<tr><td>' + (i + 1) + '</td><td>' + r.s.toFixed(2) + '</td><td>' + r.iou.toFixed(2) + '</td><td>' + (r.g >= 0 ? 'g' + (r.g + 1) : '—') + '</td><td>' + why + '</td><td>' + tp + '/' + fp + ' → ' + r.prec.toFixed(2) + ', ' + r.rec.toFixed(2) + '</td></tr>'; });
      table.innerHTML = h + '</tbody></table>';
      readout.innerHTML = 'Có ' + N_GT + ' vật thật; ' + R.tp + '/' + DET.length + ' dự đoán là TP ở IoU ≥ ' + iouThr.toFixed(2) + '. <b>AP = ' + R.ap.toFixed(4) + '</b>. ' +
        (last ? 'Nếu chỉ giữ dự đoán có điểm ≥ ' + scoreThr.toFixed(2) + ': precision = ' + last.prec.toFixed(2) + ', recall = ' + last.rec.toFixed(2) + '.' : 'Không dự đoán nào vượt ngưỡng điểm.') +
        ' Đổi ngưỡng IoU từ 0.5 lên 0.75 làm AP tụt mạnh vì nhiều hộp chỉ “gần đúng”. COCO lấy trung bình trên nhiều ngưỡng IoU để thưởng độ chính xác của hộp.';
      view.redraw();
    }
    update();
  });

  /* ---------- 6. Data augmentation preview ---------- */
  Viz.register('aug1', function (root) {
    const SZ = 128, P = { flip: false, angle: 0, zoom: 1, shift: 0, bright: 0, contrast: 1, noise: 0, cutout: 0 };
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = SZ; return c; };
    const base = mk(), work = mk();
    (function drawBase() {
      const x = base.getContext('2d'), g = x.createLinearGradient(0, 0, 0, SZ); g.addColorStop(0, '#6ab7e3'); g.addColorStop(1, '#cfe9f5'); x.fillStyle = g; x.fillRect(0, 0, SZ, SZ);
      x.fillStyle = '#5a9a45'; x.fillRect(0, 94, SZ, 34); x.fillStyle = '#ffd166'; x.beginPath(); x.arc(104, 24, 12, 0, 7); x.fill();
      x.fillStyle = '#e9d8a6'; x.fillRect(26, 58, 44, 38); x.fillStyle = '#c1121f'; x.beginPath(); x.moveTo(20, 60); x.lineTo(48, 32); x.lineTo(76, 60); x.closePath(); x.fill(); x.fillStyle = '#7f5539'; x.fillRect(42, 74, 9, 22);
      x.fillStyle = '#222'; x.font = 'bold 30px Georgia, serif'; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('R', 86, 90);
    })();
    function render() {
      const x = work.getContext('2d', { willReadFrequently: true }); x.save(); x.fillStyle = '#777'; x.fillRect(0, 0, SZ, SZ); x.translate(SZ / 2 + P.shift, SZ / 2); x.rotate(P.angle * Math.PI / 180); x.scale(P.zoom * (P.flip ? -1 : 1), P.zoom); x.drawImage(base, -SZ / 2, -SZ / 2); x.restore();
      const im = x.getImageData(0, 0, SZ, SZ), d = im.data, r = Viz.rng(11);
      for (let i = 0; i < d.length; i += 4) { const n = P.noise ? Viz.randn(r) * P.noise : 0; for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, (d[i + k] - 128) * P.contrast + 128 + P.bright + n)); }
      if (P.cutout > 0) { const s = P.cutout, x0 = 30, y0 = 36; for (let yy = y0; yy < y0 + s && yy < SZ; yy++) for (let xx = x0; xx < x0 + s && xx < SZ; xx++) { const i = (yy * SZ + xx) * 4; d[i] = d[i + 1] = d[i + 2] = 128; } }
      x.putImageData(im, 0, 0);
    }
    const view = Viz.mount(root, {
      aspect: 0.5, minH: 220, label: 'Ảnh gốc và ảnh sau khi tăng cường dữ liệu',
      draw(ctx, W, H, c) {
        const s = Math.min((W - 30) / 2, H - 30); ctx.imageSmoothingEnabled = false; const y0 = 22, x1 = (W / 2 - s) / 2, x2 = W / 2 + (W / 2 - s) / 2;
        ctx.drawImage(base, x1, y0, s, s); ctx.drawImage(work, x2, y0, s, s); ctx.strokeStyle = c.border; ctx.strokeRect(x1, y0, s, s); ctx.strokeRect(x2, y0, s, s);
        ctx.fillStyle = c.fg; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('Ảnh gốc', x1 + s / 2, 4); ctx.fillText('Sau biến đổi (vẫn cùng nhãn?)', x2 + s / 2, 4);
      }
    });
    const r1 = U.row(root);
    U.check(r1, 'Lật ngang', false, v => { P.flip = v; update(); });
    U.slider(r1, 'Xoay (độ)', -45, 45, 1, 0, String, v => { P.angle = v; update(); });
    U.slider(r1, 'Phóng to', 0.8, 1.8, 0.05, 1, v => '×' + v.toFixed(2), v => { P.zoom = v; update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Dịch ngang', -40, 40, 1, 0, String, v => { P.shift = v; update(); });
    U.slider(r2, 'Độ sáng', -80, 80, 1, 0, String, v => { P.bright = v; update(); });
    U.slider(r2, 'Tương phản', 0.4, 1.8, 0.05, 1, v => '×' + v.toFixed(2), v => { P.contrast = v; update(); });
    const r3 = U.row(root);
    U.slider(r3, 'Nhiễu Gauss σ', 0, 60, 1, 0, String, v => { P.noise = v; update(); });
    U.slider(r3, 'Cutout (cạnh ô xám)', 0, 64, 2, 0, String, v => { P.cutout = v; update(); });
    const readout = U.out(root);
    function update() {
      render(); const notes = [];
      if (P.flip) notes.push('lật ngang biến chữ R thành bản đối xứng: hợp lý với ảnh phong cảnh nhưng <b>sai nhãn</b> nếu bài toán là đọc chữ');
      if (Math.abs(P.angle) > 20) notes.push('góc xoay lớn khiến vật thể xuất hiện ở tư thế hiếm gặp; kiểm tra tư thế đó có thực sự gặp khi triển khai không');
      if (P.zoom > 1.4) notes.push('phóng to nhiều có thể cắt mất đối tượng quan trọng khỏi khung');
      if (P.noise > 30 || P.cutout > 40) notes.push('nhiễu/cutout mạnh làm mô hình học tính bền vững nhưng nếu quá tay thì nhãn thực tế không còn nhìn thấy được');
      readout.innerHTML = notes.length ? 'Lưu ý: ' + notes.join('; ') + '.' : 'Biến đổi nhẹ: ảnh vẫn rõ ràng cùng một cảnh. Mục tiêu của tăng cường dữ liệu là tạo ra những biến thể mà <b>nhãn không đổi</b> và mô hình có thể gặp thật khi triển khai.';
      view.redraw();
    }
    update();
  });
})();
