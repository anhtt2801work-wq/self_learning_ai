/* Interactive demos for the Computer Vision page */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- 1. 2-D convolution on a tiny image ---------- */
  Viz.register('conv1', function (root) {
    const N = 8;
    const IMAGES = {
      T: () => { const a = new Array(N * N).fill(0); for (let x = 1; x < 7; x++) a[1 * N + x] = 1; for (let y = 1; y < 7; y++) { a[y * N + 3] = 1; a[y * N + 4] = 1; } return a; },
      square: () => { const a = new Array(N * N).fill(0); for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) a[y * N + x] = 1; return a; },
      diag: () => { const a = new Array(N * N).fill(0); for (let i = 0; i < N; i++) { a[i * N + i] = 1; if (i + 1 < N) a[i * N + i + 1] = 0.5; } return a; },
      noise: () => { const r = Viz.rng(5); return Array.from({ length: N * N }, () => Math.round(r() * 4) / 4); }
    };
    const KERNELS = {
      identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
      blur: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
      sobelx: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      sobely: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
      sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
      laplace: [0, 1, 0, 1, -4, 1, 0, 1, 0]
    };
    let img = IMAGES.T(), ker = KERNELS.sobelx.slice(), stride = 1, pad = 0, sel = null;
    const outDim = () => Math.floor((N + 2 * pad - 3) / stride) + 1;
    const at = (y, x) => (y < 0 || x < 0 || y >= N || x >= N) ? 0 : img[y * N + x];
    function compute() {
      const O = outDim(), out = [];
      for (let i = 0; i < O; i++) for (let j = 0; j < O; j++) {
        let s = 0;
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += at(i * stride + a - pad, j * stride + b - pad) * ker[a * 3 + b];
        out.push(s);
      }
      return { O, out };
    }

    const split = el('div', 'viz-split even'); root.appendChild(split);
    const left = el('div'), right = el('div'); split.appendChild(left); split.appendChild(right);
    const cap = (p, t) => { const d = el('div', 'viz-help', t); d.style.padding = '0 0 4px'; p.appendChild(d); };
    cap(left, 'Ảnh vào 8×8 (bấm một ô để đổi độ sáng 0 → 0.5 → 1)'); cap(right, 'Bản đồ đặc trưng (rê chuột / bấm để xem vùng nhìn thấy)');
    const inV = Viz.mount(left, {
      aspect: 1, label: 'Ảnh đầu vào dạng lưới điểm ảnh',
      draw(ctx, W, H, c) {
        const cs = W / N; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = img[y * N + x]; ctx.fillStyle = 'rgb(' + Math.round(v * 255) + ',' + Math.round(v * 255) + ',' + Math.round(v * 255) + ')';
          ctx.fillRect(x * cs, y * cs, cs, cs); ctx.fillStyle = v > 0.5 ? '#111' : '#ddd'; ctx.fillText(v.toFixed(v % 1 ? 1 : 0), x * cs + cs / 2, y * cs + cs / 2);
        }
        ctx.strokeStyle = c.border; ctx.lineWidth = 1;
        for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, H); ctx.moveTo(0, i * cs); ctx.lineTo(W, i * cs); ctx.stroke(); }
        if (sel) {
          const y0 = sel.i * stride - pad, x0 = sel.j * stride - pad;
          ctx.strokeStyle = c.b; ctx.lineWidth = 3; ctx.strokeRect(x0 * cs + 1, y0 * cs + 1, 3 * cs - 2, 3 * cs - 2);
        }
      }
    });
    const outV = Viz.mount(right, {
      aspect: 1, label: 'Kết quả sau phép tích chập',
      draw(ctx, W, H, c) {
        const { O, out } = compute(), cs = W / Math.max(O, 1), mx = Math.max(1e-9, ...out.map(Math.abs));
        const A = Viz.rgb(c.a), B = Viz.rgb(c.b); ctx.font = (O > 6 ? 10 : 12) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < O; i++) for (let j = 0; j < O; j++) {
          const v = out[i * O + j], t = Math.abs(v) / mx, col = v >= 0 ? B : A;
          ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (0.12 + 0.85 * t) + ')'; ctx.fillRect(j * cs, i * cs, cs, cs);
          ctx.fillStyle = c.fg; ctx.fillText(Math.abs(v) < 0.005 ? '0' : (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)), j * cs + cs / 2, i * cs + cs / 2);
        }
        ctx.strokeStyle = c.border; ctx.lineWidth = 1;
        for (let i = 0; i <= O; i++) { ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, H); ctx.moveTo(0, i * cs); ctx.lineTo(W, i * cs); ctx.stroke(); }
        if (sel && sel.i < O && sel.j < O) { ctx.strokeStyle = c.b; ctx.lineWidth = 3; ctx.strokeRect(sel.j * cs + 1, sel.i * cs + 1, cs - 2, cs - 2); }
      }
    });
    inV.cv.addEventListener('click', ev => {
      const p = Viz.pos(ev, inV.cv), x = Math.floor(p.x / (inV.W / N)), y = Math.floor(p.y / (inV.H / N));
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      const v = img[y * N + x]; img[y * N + x] = v === 0 ? 0.5 : v === 0.5 ? 1 : 0; update();
    });
    const pick = ev => {
      const O = outDim(), p = Viz.pos(ev, outV.cv), j = Math.floor(p.x / (outV.W / O)), i = Math.floor(p.y / (outV.H / O));
      sel = (i >= 0 && j >= 0 && i < O && j < O) ? { i, j } : null; update();
    };
    outV.cv.addEventListener('pointermove', pick); outV.cv.addEventListener('click', pick);
    outV.cv.addEventListener('pointerleave', () => { sel = null; update(); });

    const r1 = U.row(root);
    U.select(r1, 'Ảnh', [['T', 'Chữ T'], ['square', 'Hình vuông'], ['diag', 'Đường chéo'], ['noise', 'Nhiễu']], v => { img = IMAGES[v](); update(); });
    U.select(r1, 'Bộ lọc', [['sobelx', 'Sobel dọc (cạnh trái/phải)'], ['sobely', 'Sobel ngang (cạnh trên/dưới)'], ['blur', 'Làm mờ trung bình'], ['sharpen', 'Làm sắc nét'], ['laplace', 'Laplace'], ['identity', 'Đồng nhất'], ['custom', 'Tự chỉnh (bên dưới)']], v => {
      if (v !== 'custom') { ker = KERNELS[v].slice(); syncInputs(); } update();
    });
    const r2 = U.row(root);
    U.slider(r2, 'Stride', 1, 3, 1, stride, String, v => { stride = v; sel = null; update(); });
    U.slider(r2, 'Padding (số 0 viền)', 0, 2, 1, pad, String, v => { pad = v; sel = null; update(); });
    const r3 = U.row(root); r3.appendChild(el('span', 'viz-lbl', 'Nhân (kernel) 3×3:')); r3.lastChild.style.fontSize = '.88rem';
    const grid = el('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,64px);gap:4px'; r3.appendChild(grid);
    const inputs = ker.map((_, k) => {
      const i = el('input'); i.type = 'number'; i.step = 'any'; i.setAttribute('aria-label', 'Phần tử kernel ' + (k + 1));
      i.style.cssText = 'width:64px;font:inherit;padding:3px 6px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)';
      i.addEventListener('input', () => { const v = parseFloat(i.value); ker[k] = isFinite(v) ? v : 0; update(); }); grid.appendChild(i); return i;
    });
    function syncInputs() { inputs.forEach((i, k) => { i.value = +ker[k].toFixed(3); }); }
    const readout = U.out(root);
    function update() {
      const O = outDim();
      readout.innerHTML = 'Kích thước đầu ra: ⌊(' + N + ' + 2·' + pad + ' − 3)/' + stride + '⌋ + 1 = <b>' + O + '×' + O + '</b> · mỗi ô đầu ra = tổng (3×3 điểm ảnh × nhân) · ' +
        (sel ? 'ô (' + sel.i + ',' + sel.j + ') nhìn vào khung cam trên ảnh vào (phần nằm ngoài ảnh được coi là 0).' : 'rê chuột lên bản đồ đặc trưng để xem ô đó “nhìn” vào đâu.');
      inV.redraw(); outV.redraw();
    }
    syncInputs(); update();
  });

  /* ---------- 2. Receptive field calculator ---------- */
  Viz.register('rf1', function (root) {
    const PRESETS = {
      vgg: '3:1, 3:1, 2:2, 3:1, 3:1, 2:2, 3:1, 3:1, 3:1, 2:2',
      stem: '7:2, 3:2, 3:1, 3:1, 3:1, 3:1',
      big: '5:1, 5:1',
      small: '3:1, 3:1'
    };
    const help = el('p', 'viz-help', 'Mỗi lớp ghi dưới dạng kích_thước_nhân:bước (stride), ví dụ 3:1 là conv 3×3 stride 1, 2:2 là pooling 2×2 stride 2.'); help.style.padding = '0 0 8px'; root.appendChild(help);
    const r1 = U.row(root);
    U.select(r1, 'Mẫu', [['vgg', 'Kiểu VGG (conv 3×3 + pool)'], ['stem', 'Mở đầu 7×7 stride 2'], ['small', 'Hai lớp 3×3'], ['big', 'Hai lớp 5×5']], v => { inp.value = PRESETS[v]; update(); });
    const inp = el('input'); inp.type = 'text'; inp.value = PRESETS.vgg; inp.style.cssText = 'flex:1 1 280px'; inp.setAttribute('aria-label', 'Danh sách lớp'); r1.appendChild(inp);
    const r2 = U.row(root);
    U.slider(r2, 'Kích thước ảnh vào', 32, 512, 32, 224, String, v => { size = v; update(); });
    let size = 224;
    const table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const readout = U.out(root);
    function update() {
      const layers = inp.value.split(',').map(s => s.trim().split(':').map(Number)).filter(a => a.length === 2 && a.every(isFinite) && a[0] > 0 && a[1] > 0);
      let r = 1, j = 1, n = size, h = '<table><thead><tr><th>Lớp</th><th>k</th><th>stride</th><th>Bước nhảy tích lũy j</th><th>Trường nhìn r</th><th>Kích thước đầu ra*</th></tr></thead><tbody>';
      layers.forEach(([k, s], i) => {
        r += (k - 1) * j; j *= s; n = Math.floor((n + 2 * Math.floor(k / 2) - k) / s) + 1;
        h += '<tr><td>' + (i + 1) + '</td><td>' + k + '</td><td>' + s + '</td><td>' + j + '</td><td><b>' + r + '</b></td><td>' + n + '×' + n + '</td></tr>';
      });
      table.innerHTML = h + '</tbody></table>';
      readout.innerHTML = layers.length ? 'Trường nhìn cuối cùng: <b>' + r + '×' + r + '</b> điểm ảnh' + (r >= size ? ' (đã phủ toàn bộ ảnh vào ' + size + '×' + size + ')' : ' (ảnh vào ' + size + '×' + size + ')') +
        '. *Giả định padding = ⌊k/2⌋. Công thức: r ← r + (k − 1)·j, rồi j ← j·stride.' : 'Nhập ít nhất một lớp hợp lệ.';
    }
    inp.addEventListener('input', update); update();
  });

  /* ---------- 3. IoU and non-maximum suppression ---------- */
  Viz.register('nms1', function (root) {
    let scene = 'apart', seed = 4, iouThr = 0.5, scoreThr = 0.2, boxes = [];
    const iou = (a, b) => {
      const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
      const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1), uni = a.w * a.h + b.w * b.h - inter; return uni > 0 ? inter / uni : 0;
    };
    function gen() {
      const r = Viz.rng(seed * 17 + 3); boxes = [];
      const objs = scene === 'apart' ? [{ x: .12, y: .2, w: .3, h: .5 }, { x: .58, y: .3, w: .3, h: .5 }] : [{ x: .3, y: .2, w: .3, h: .55 }, { x: .42, y: .25, w: .3, h: .55 }];
      objs.forEach((o, k) => {
        for (let i = 0; i < 4; i++) boxes.push({ x: o.x + (r() - .5) * .07, y: o.y + (r() - .5) * .07, w: o.w + (r() - .5) * .07, h: o.h + (r() - .5) * .07, s: 0.95 - i * 0.14 - r() * .08 - k * .05, obj: k });
      });
      boxes.push({ x: .72, y: .05, w: .2, h: .2, s: 0.15, obj: -1 }); // low-score background detection
      boxes.sort((a, b) => b.s - a.s);
    }
    function run() {
      const res = boxes.map(b => ({ b, state: b.s < scoreThr ? 'low' : 'pending' })); const kept = [];
      res.forEach(r => { if (r.state === 'low') return; const hit = kept.find(k => iou(k.b, r.b) > iouThr); if (hit) { r.state = 'sup'; r.by = hit; r.iou = iou(hit.b, r.b); } else { r.state = 'keep'; kept.push(r); } });
      return res;
    }
    const view = Viz.mount(root, {
      aspect: 0.55, label: 'Các hộp phát hiện và kết quả NMS',
      draw(ctx, W, H, c) {
        ctx.strokeStyle = c.grid; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
        const res = run(); ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'top';
        const order = { low: 0, sup: 1, keep: 2 };
        res.slice().sort((a, b) => order[a.state] - order[b.state]).forEach(({ b, state }) => {
          const x = b.x * W, y = b.y * H, w = b.w * W, h = b.h * H;
          ctx.setLineDash(state === 'keep' ? [] : [5, 4]); ctx.lineWidth = state === 'keep' ? 3 : 1.5;
          ctx.strokeStyle = state === 'keep' ? c.c : state === 'sup' ? c.b : c.muted; ctx.globalAlpha = state === 'low' ? 0.5 : 1;
          ctx.strokeRect(x, y, w, h); ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle; ctx.fillText(b.s.toFixed(2), x + 3, y + 3); ctx.globalAlpha = 1;
        });
        ctx.fillStyle = c.c; ctx.fillText('■ giữ lại', 8, H - 18); ctx.fillStyle = c.b; ctx.fillText('■ bị NMS loại', 72, H - 18); ctx.fillStyle = c.muted; ctx.fillText('■ điểm quá thấp', 160, H - 18);
      }
    });
    const r1 = U.row(root);
    U.select(r1, 'Cảnh', [['apart', 'Hai vật tách rời'], ['crowd', 'Hai vật chồng lấn nhiều']], v => { scene = v; gen(); update(); });
    U.button(r1, 'Sinh hộp mới', () => { seed++; gen(); update(); });
    const r2 = U.row(root);
    U.slider(r2, 'Ngưỡng IoU của NMS', 0.1, 0.9, 0.05, iouThr, v => v.toFixed(2), v => { iouThr = v; update(); });
    U.slider(r2, 'Ngưỡng điểm tin cậy', 0, 0.9, 0.05, scoreThr, v => v.toFixed(2), v => { scoreThr = v; update(); });
    const readout = U.out(root);
    function update() {
      const res = run(), kept = res.filter(r => r.state === 'keep'), sup = res.filter(r => r.state === 'sup');
      const objsKept = new Set(kept.map(k => k.b.obj).filter(o => o >= 0)).size, fp = kept.filter(k => k.b.obj < 0).length;
      readout.innerHTML = 'Giữ <b>' + kept.length + '</b> hộp (' + objsKept + '/2 vật được phát hiện' + (fp ? ', ' + fp + ' hộp nền' : '') + '), loại <b>' + sup.length + '</b> hộp. ' +
        (sup.length ? 'IoU của các hộp bị loại với hộp giữ lại: ' + sup.map(s => s.iou.toFixed(2)).join(', ') + '.' : '') +
        (scene === 'crowd' && objsKept < 2 ? ' <b>Ngưỡng IoU thấp đã xóa nhầm vật thứ hai</b> (hạn chế kinh điển của NMS khi vật chồng lấn).' : '');
      view.redraw();
    }
    gen(); update();
  });
})();
