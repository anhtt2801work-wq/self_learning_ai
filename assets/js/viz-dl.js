/* Interactive demos for the Deep Learning page */
(function () {
  'use strict';
  const { ui: U } = Viz;

  /* ---------- 1. Activation functions ---------- */
  Viz.register('act1', function (root) {
    const sig = x => 1 / (1 + Math.exp(-x));
    const FN = [
      { id: 'sigmoid', name: 'Sigmoid', f: sig, on: true },
      { id: 'tanh', name: 'tanh', f: Math.tanh, on: true },
      { id: 'relu', name: 'ReLU', f: x => Math.max(0, x), on: true },
      { id: 'leaky', name: 'Leaky ReLU (0.1)', f: x => (x > 0 ? x : 0.1 * x), on: false },
      { id: 'gelu', name: 'GELU (xấp xỉ tanh)', f: x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3))), on: false },
      { id: 'silu', name: 'SiLU / Swish', f: x => x * sig(x), on: false }
    ];
    const d = (f, x) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4;
    let deriv = false, x0 = 1;
    const XR = [-6, 6], YR = [-1.5, 3];
    const colorsFor = c => [c.a, c.b, c.c, c.d, document.documentElement.dataset.theme === 'dark' ? '#f472b6' : '#db2777', document.documentElement.dataset.theme === 'dark' ? '#22d3ee' : '#0891b2'];

    const view = Viz.mount(root, {
      aspect: 0.5, label: 'Đồ thị các hàm kích hoạt',
      draw(ctx, W, H, c) {
        const pad = { l: 34, r: 12, t: 12, b: 24 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
        const sx = x => pad.l + (x - XR[0]) / (XR[1] - XR[0]) * pw, sy = y => pad.t + ph - (y - YR[0]) / (YR[1] - YR[0]) * ph;
        ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = c.muted; ctx.strokeStyle = c.grid;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let x = -6; x <= 6; x += 2) { ctx.beginPath(); ctx.moveTo(sx(x), pad.t); ctx.lineTo(sx(x), H - pad.b); ctx.stroke(); ctx.fillText(x, sx(x), H - pad.b + 5); }
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let y = -1; y <= 3; y++) { ctx.beginPath(); ctx.moveTo(pad.l, sy(y)); ctx.lineTo(W - pad.r, sy(y)); ctx.stroke(); ctx.fillText(y, pad.l - 6, sy(y)); }
        ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(sx(0), pad.t); ctx.lineTo(sx(0), H - pad.b); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(W - pad.r, sy(0)); ctx.stroke();
        const cols = colorsFor(c);
        ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, pw, ph); ctx.clip();
        FN.forEach((fn, k) => {
          if (!fn.on) return;
          ctx.strokeStyle = cols[k]; ctx.lineWidth = 2.5; ctx.beginPath();
          for (let i = 0; i <= 300; i++) { const x = XR[0] + (XR[1] - XR[0]) * i / 300, y = deriv ? d(fn.f, x) : fn.f(x); i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)); }
          ctx.stroke();
          const yv = deriv ? d(fn.f, x0) : fn.f(x0); ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.arc(sx(x0), sy(yv), 4.5, 0, 7); ctx.fill();
        });
        ctx.strokeStyle = c.border; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(sx(x0), pad.t); ctx.lineTo(sx(x0), H - pad.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; let ly = pad.t + 6;
        FN.forEach((fn, k) => { if (!fn.on) return; ctx.fillStyle = cols[k]; ctx.fillText('■ ' + fn.name + (deriv ? '′' : ''), pad.l + 8, ly); ly += 15; });
      }
    });
    const r1 = U.row(root);
    FN.forEach(fn => U.check(r1, fn.name, fn.on, v => { fn.on = v; update(); }));
    const r2 = U.row(root);
    U.check(r2, 'Vẽ đạo hàm thay vì giá trị hàm', false, v => { deriv = v; update(); });
    U.slider(r2, 'x', -6, 6, 0.1, x0, v => v.toFixed(1), v => { x0 = v; update(); });
    const readout = U.out(root);
    function update() {
      const rows = FN.filter(f => f.on).map(f => f.name + ': f = <b>' + f.f(x0).toFixed(3) + '</b>, f′ = <b>' + d(f.f, x0).toFixed(3) + '</b>');
      readout.innerHTML = 'Tại x = <b>' + x0.toFixed(1) + '</b><br>' + (rows.join('<br>') || 'Chọn ít nhất một hàm.');
      view.redraw();
    }
    update();
  });

  /* ---------- 2. Neural network playground ---------- */
  Viz.register('mlp1', function (root) {
    let dsKey = 'circle', noise = 0.08, seed = 1, nh = 2, hu = 6, actKey = 'tanh', lr = 0.03, l2 = 0, extra = false;
    let train = [], test = [], running = false, raf = 0;
    let sizes, L, W, B, gW, gB, mW, vW, mB, vB, A, Z, D, t = 0, hTr = [], hTe = [], epochs = 0, tmp;

    const ACT = {
      tanh: { f: Math.tanh, d: (z, a) => 1 - a * a },
      relu: { f: z => (z > 0 ? z : 0), d: z => (z > 0 ? 1 : 0) },
      sigmoid: { f: z => 1 / (1 + Math.exp(-z)), d: (z, a) => a * (1 - a) }
    };
    const sigm = z => 1 / (1 + Math.exp(-z));

    /* --- data --- */
    function makeData() {
      const r = Viz.rng(seed * 101 + 7), pts = [], n = 100;
      const add = (x, y, c) => pts.push({ x: x + Viz.randn(r) * noise, y: y + Viz.randn(r) * noise, c });
      if (dsKey === 'circle') {
        for (let i = 0; i < n; i++) { const a = r() * 6.283, rad = 0.05 + r() * 0.4; add(rad * Math.cos(a), rad * Math.sin(a), 0); }
        for (let i = 0; i < n; i++) { const a = r() * 6.283, rad = 0.65 + r() * 0.3; add(rad * Math.cos(a), rad * Math.sin(a), 1); }
      } else if (dsKey === 'xor') {
        for (let i = 0; i < 2 * n; i++) { const x = r() * 1.8 - 0.9, y = r() * 1.8 - 0.9; add(x, y, x * y > 0 ? 0 : 1); }
      } else if (dsKey === 'spiral') {
        for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) { const tt = i / n, rad = 0.08 + 0.85 * tt, a = tt * 3 * Math.PI + c * Math.PI; add(rad * Math.cos(a), rad * Math.sin(a), c); }
      } else {
        for (let i = 0; i < n; i++) add(-0.4 + Viz.randn(r) * 0.2, -0.4 + Viz.randn(r) * 0.2, 0);
        for (let i = 0; i < n; i++) add(0.4 + Viz.randn(r) * 0.2, 0.4 + Viz.randn(r) * 0.2, 1);
      }
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
      const cut = Math.floor(pts.length * 0.7);
      train = pts.slice(0, cut); test = pts.slice(cut);
      featurize();
    }
    const nIn = () => (extra ? 5 : 2);
    function feat(x, y, out) { out[0] = x; out[1] = y; if (extra) { out[2] = x * x; out[3] = y * y; out[4] = x * y; } return out; }
    function featurize() { [train, test].forEach(set => set.forEach(p => { p.f = feat(p.x, p.y, new Float64Array(nIn())); })); }

    /* --- network --- */
    function build() {
      sizes = [nIn()]; for (let i = 0; i < nh; i++) sizes.push(hu); sizes.push(1);
      L = sizes.length - 1; const r = Viz.rng(seed * 31 + 5);
      W = []; B = []; gW = []; gB = []; mW = []; vW = []; mB = []; vB = []; A = [new Float64Array(sizes[0])]; Z = []; D = [];
      for (let l = 0; l < L; l++) {
        const ni = sizes[l], no = sizes[l + 1], s = Math.sqrt(2 / (ni + no)) * 1.4;
        W.push(Float64Array.from({ length: ni * no }, () => Viz.randn(r) * s));
        B.push(new Float64Array(no));
        gW.push(new Float64Array(ni * no)); gB.push(new Float64Array(no));
        mW.push(new Float64Array(ni * no)); vW.push(new Float64Array(ni * no)); mB.push(new Float64Array(no)); vB.push(new Float64Array(no));
        A.push(new Float64Array(no)); Z.push(new Float64Array(no)); D.push(new Float64Array(no));
      }
      tmp = new Float64Array(nIn()); t = 0; hTr = []; hTe = []; epochs = 0;
    }
    function forward() {
      const act = ACT[actKey].f;
      for (let l = 0; l < L; l++) {
        const ni = sizes[l], no = sizes[l + 1], w = W[l], a = A[l], z = Z[l], o = A[l + 1], bb = B[l];
        for (let j = 0; j < no; j++) {
          let s = bb[j]; const off = j * ni; for (let i = 0; i < ni; i++) s += w[off + i] * a[i];
          z[j] = s; o[j] = l === L - 1 ? sigm(s) : act(s);
        }
      }
      return A[L][0];
    }
    function trainStep() {
      const dact = ACT[actKey].d;
      for (let l = 0; l < L; l++) { gW[l].fill(0); gB[l].fill(0); }
      for (const p of train) {
        A[0].set(p.f); const pr = forward();
        D[L - 1][0] = pr - p.c;
        for (let l = L - 1; l >= 0; l--) {
          const ni = sizes[l], no = sizes[l + 1], d = D[l], a = A[l], gw = gW[l], gb = gB[l];
          for (let j = 0; j < no; j++) { gb[j] += d[j]; const off = j * ni; for (let i = 0; i < ni; i++) gw[off + i] += d[j] * a[i]; }
          if (l > 0) {
            const w = W[l], dp = D[l - 1];
            for (let i = 0; i < ni; i++) { let s = 0; for (let j = 0; j < no; j++) s += w[j * ni + i] * d[j]; dp[i] = s * dact(Z[l - 1][i], A[l][i]); }
          }
        }
      }
      t++; const n = train.length, b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
      for (let l = 0; l < L; l++) {
        const upd = (P, G, M, V, reg) => {
          for (let i = 0; i < P.length; i++) {
            const g = G[i] / n + (reg ? l2 * P[i] : 0);
            M[i] = b1 * M[i] + (1 - b1) * g; V[i] = b2 * V[i] + (1 - b2) * g * g;
            P[i] -= lr * (M[i] / c1) / (Math.sqrt(V[i] / c2) + 1e-8);
          }
        };
        upd(W[l], gW[l], mW[l], vW[l], true); upd(B[l], gB[l], mB[l], vB[l], false);
      }
      epochs++;
    }
    const predict = (x, y) => { A[0].set(feat(x, y, tmp)); return forward(); };
    function evalSet(set) {
      let loss = 0, ok = 0;
      for (const p of set) { A[0].set(p.f); const pr = forward(); loss -= p.c ? Math.log(pr + 1e-12) : Math.log(1 - pr + 1e-12); if ((pr >= 0.5 ? 1 : 0) === p.c) ok++; }
      return { loss: loss / set.length, acc: ok / set.length };
    }

    makeData(); build();

    /* --- views --- */
    const split = document.createElement('div'); split.className = 'viz-split'; root.appendChild(split);
    const cellL = document.createElement('div'), cellR = document.createElement('div'); split.appendChild(cellL); split.appendChild(cellR);
    const map = Viz.mount(cellL, {
      aspect: 1, label: 'Ranh giới quyết định của mạng nơ-ron trên dữ liệu hai chiều',
      draw(ctx, Wd, Hd, c) {
        const cell = 8, A1 = Viz.rgb(c.a), B1 = Viz.rgb(c.b);
        for (let px = 0; px < Wd; px += cell) for (let py = 0; py < Hd; py += cell) {
          const p = predict(((px + cell / 2) / Wd) * 2 - 1, 1 - ((py + cell / 2) / Hd) * 2);
          const m = i => Math.round(A1[i] * (1 - p) + B1[i] * p);
          ctx.fillStyle = 'rgba(' + m(0) + ',' + m(1) + ',' + m(2) + ',0.45)'; ctx.fillRect(px, py, cell, cell);
        }
        const X = x => (x + 1) / 2 * Wd, Y = y => (1 - y) / 2 * Hd;
        train.forEach(p => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3.8, 0, 7); ctx.fillStyle = p.c ? c.b : c.a; ctx.fill(); ctx.strokeStyle = c.bg; ctx.lineWidth = 1.2; ctx.stroke(); });
        test.forEach(p => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 4.2, 0, 7); ctx.strokeStyle = p.c ? c.b : c.a; ctx.lineWidth = 1.8; ctx.stroke(); });
      }
    });
    const curve = Viz.mount(cellR, {
      aspect: 1, label: 'Đường mất mát huấn luyện và kiểm tra theo số bước',
      draw(ctx, Wd, Hd, c) {
        const pad = { l: 34, r: 10, t: 14, b: 26 }, pw = Wd - pad.l - pad.r, ph = Hd - pad.t - pad.b, ymax = 1.0;
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [0, 0.25, 0.5, 0.75, 1].forEach(v => { const y = pad.t + ph - v / ymax * ph; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(Wd - pad.r, y); ctx.stroke(); ctx.fillText(v.toFixed(2), pad.l - 4, y); });
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('bước huấn luyện →', Wd / 2, Hd - 16);
        ctx.textAlign = 'left'; ctx.fillStyle = c.a; ctx.fillText('— mất mát train', pad.l + 6, 2);
        ctx.fillStyle = c.b; ctx.fillText('— mất mát test', pad.l + 100, 2);
        [[hTr, c.a], [hTe, c.b]].forEach(([h, col]) => {
          if (h.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
          h.forEach((v, i) => { const x = pad.l + i / (h.length - 1) * pw, y = pad.t + ph - Math.min(ymax, v) / ymax * ph; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke();
        });
      }
    });

    /* --- controls --- */
    const r1 = U.row(root);
    const playBtn = U.button(r1, '▶ Huấn luyện', () => (running ? pause() : play()), true);
    U.button(r1, 'Một bước', () => { pause(); tick(1); });
    U.button(r1, 'Khởi tạo lại trọng số', () => { pause(); build(); refresh(); });
    const r2 = U.row(root);
    U.select(r2, 'Dữ liệu', [['circle', 'Tâm và vành'], ['xor', 'XOR'], ['spiral', 'Xoắn ốc'], ['blobs', 'Hai cụm']], v => { dsKey = v; pause(); makeData(); build(); refresh(); });
    U.slider(r2, 'Nhiễu', 0, 0.3, 0.02, noise, v => v.toFixed(2), v => { noise = v; pause(); makeData(); build(); refresh(); });
    U.button(r2, 'Lấy dữ liệu mới', () => { seed++; pause(); makeData(); build(); refresh(); });
    const r3 = U.row(root);
    U.slider(r3, 'Số lớp ẩn', 1, 3, 1, nh, String, v => { nh = v; pause(); build(); refresh(); });
    U.slider(r3, 'Nơ-ron mỗi lớp', 2, 12, 1, hu, String, v => { hu = v; pause(); build(); refresh(); });
    U.select(r3, 'Kích hoạt', [['tanh', 'tanh'], ['relu', 'ReLU'], ['sigmoid', 'sigmoid']], v => { actKey = v; pause(); build(); refresh(); });
    const r4 = U.row(root);
    U.slider(r4, 'Tốc độ học (Adam)', 0.003, 0.1, 0.001, lr, v => v.toFixed(3), v => { lr = v; });
    U.select(r4, 'Điều chuẩn L2', [['0', 'không'], ['0.001', '0.001'], ['0.01', '0.01']], v => { l2 = +v; });
    U.check(r4, 'Thêm đặc trưng x₁², x₂², x₁x₂', extra, v => { extra = v; pause(); featurize(); build(); refresh(); });
    const readout = U.out(root);

    function tick(k) { for (let i = 0; i < k; i++) trainStep(); if (epochs % 5 === 0 || k === 1) { hTr.push(evalSet(train).loss); hTe.push(evalSet(test).loss); if (hTr.length > 400) { hTr = hTr.filter((_, i) => i % 2 === 0); hTe = hTe.filter((_, i) => i % 2 === 0); } } refresh(); }
    function loop() { if (!running) return; tick(5); raf = requestAnimationFrame(loop); }
    function play() { running = true; playBtn.textContent = '❚❚ Tạm dừng'; raf = requestAnimationFrame(loop); }
    function pause() { running = false; cancelAnimationFrame(raf); playBtn.textContent = '▶ Huấn luyện'; }
    function refresh() {
      const a = evalSet(train), b = evalSet(test);
      readout.innerHTML = 'bước <b>' + epochs + '</b> · train: mất mát <b>' + a.loss.toFixed(3) + '</b>, chính xác <b>' + (100 * a.acc).toFixed(0) + '%</b> · ' +
        'test: mất mát <b>' + b.loss.toFixed(3) + '</b>, chính xác <b>' + (100 * b.acc).toFixed(0) + '%</b> · số tham số = <b>' +
        W.reduce((s, w, i) => s + w.length + B[i].length, 0) + '</b>. Chấm đặc = dữ liệu train, vòng rỗng = test.';
      map.redraw(); curve.redraw();
    }
    refresh();
  });
})();
