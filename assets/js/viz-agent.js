/* Interactive demos for the Agentic AI page */
(function () {
  'use strict';
  const { ui: U, el } = Viz;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- 1. ReAct loop, scripted simulation ---------- */
  Viz.register('react1', function (root) {
    const Q = 'Hôm nay Hà Nội có cần mang ô không? Nhiệt độ là bao nhiêu độ F?';
    const SCEN = {
      ok: [
        ['user', Q],
        ['thought', 'Cần dữ liệu thời tiết hiện tại, mình chưa biết. Gọi công cụ get_weather.'],
        ['action', 'get_weather(city="Hà Nội")'],
        ['obs', '{"temp_c": 28, "rain_prob": 0.7}'],
        ['thought', 'Có 28 °C và xác suất mưa 70%. Cần đổi sang °F, dùng calculator thay vì tự nhẩm.'],
        ['action', 'calculator(expr="28*9/5+32")'],
        ['obs', '82.4'],
        ['thought', 'Đã đủ thông tin để trả lời.'],
        ['final', 'Xác suất mưa khoảng 70% nên bạn nên mang ô. Nhiệt độ 28 °C tương đương 82,4 °F.']
      ],
      err: [
        ['user', Q],
        ['thought', 'Cần dữ liệu thời tiết hiện tại. Gọi get_weather.'],
        ['action', 'get_weather(city="Hà Nội")'],
        ['err', 'Error: timeout sau 5 giây'],
        ['thought', 'Lỗi có vẻ tạm thời (timeout). Thử lại một lần; nếu vẫn lỗi sẽ báo cho người dùng.'],
        ['action', 'get_weather(city="Hà Nội")'],
        ['obs', '{"temp_c": 28, "rain_prob": 0.7}'],
        ['thought', 'Đổi 28 °C sang °F bằng calculator.'],
        ['action', 'calculator(expr="28*9/5+32")'],
        ['obs', '82.4'],
        ['thought', 'Đã đủ thông tin để trả lời.'],
        ['final', 'Xác suất mưa khoảng 70% nên bạn nên mang ô. Nhiệt độ 28 °C tương đương 82,4 °F.']
      ]
    };
    const LABEL = { user: 'Người dùng', thought: 'Suy luận (thought)', action: 'Hành động (tool call)', obs: 'Quan sát (tool result)', err: 'Lỗi từ công cụ', final: 'Câu trả lời cuối' };
    let key = 'ok', shown = 1;

    const help = el('p', 'viz-help'); help.style.padding = '0 0 8px';
    help.textContent = 'Đây là mô phỏng có kịch bản sẵn (không gọi mô hình thật, dữ liệu thời tiết là giả lập) để quan sát cấu trúc vòng lặp.';
    root.appendChild(help);
    const r1 = U.row(root);
    U.select(r1, 'Kịch bản', [['ok', 'Mọi thứ suôn sẻ'], ['err', 'Công cụ lỗi rồi thử lại']], v => { key = v; shown = 1; render(); });
    const next = U.button(r1, 'Bước tiếp theo', () => { shown++; render(); }, true);
    U.button(r1, 'Chạy lại', () => { shown = 1; render(); });
    const list = el('div', 'msgs'); root.appendChild(list);
    const readout = U.out(root);

    function render() {
      const s = SCEN[key]; shown = Math.min(shown, s.length);
      list.innerHTML = s.slice(0, shown).map(([role, text]) =>
        '<div class="msg ' + role + '"><span class="role">' + LABEL[role] + '</span>' + (role === 'action' || role === 'obs' || role === 'err' ? '<code>' + esc(text) + '</code>' : esc(text)) + '</div>').join('');
      const calls = s.slice(0, shown).filter(m => m[0] === 'thought').length;
      const lastThought = (() => { for (let i = shown - 1; i >= 0; i--) if (s[i][0] === 'thought') return i; return -1; })();
      next.disabled = shown >= s.length;
      readout.innerHTML = 'Số lượt gọi LLM đến giờ: <b>' + calls + '</b>' + (lastThought >= 0 ? ' · ở lượt gần nhất, mô hình nhận lại toàn bộ <b>' + lastThought + '</b> message trước đó làm ngữ cảnh (mô hình không tự nhớ giữa các lượt gọi)' : '') +
        (shown >= s.length ? ' · <b>vòng lặp kết thúc</b> vì mô hình trả lời cuối thay vì gọi công cụ.' : '');
    }
    render();
  });

  /* ---------- 2. Compounding errors over many steps ---------- */
  Viz.register('err1', function (root) {
    let p = 0.95, n = 10;
    const REF = [0.9, 0.95, 0.99, 0.999], NMAX = 50;
    const view = Viz.mount(root, {
      aspect: 0.5, label: 'Xác suất cả chuỗi thành công theo số bước',
      draw(ctx, W, H, c) {
        const pad = { l: 38, r: 12, t: 14, b: 28 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
        const sx = x => pad.l + (x - 1) / (NMAX - 1) * pw, sy = y => pad.t + ph - y * ph;
        ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [0, .25, .5, .75, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(W - pad.r, sy(v)); ctx.stroke(); ctx.fillText((v * 100) + '%', pad.l - 5, sy(v)); });
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        [1, 10, 20, 30, 40, 50].forEach(x => { ctx.fillText(x, sx(x), H - pad.b + 6); });
        ctx.fillText('số bước tuần tự cần đúng hết', pad.l + pw / 2, H - 14);
        const curve = (pp, col, w, dash) => {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath();
          for (let x = 1; x <= NMAX; x++) { const y = Math.pow(pp, x); x === 1 ? ctx.moveTo(sx(x), sy(y)) : ctx.lineTo(sx(x), sy(y)); }
          ctx.stroke(); ctx.setLineDash([]);
        };
        REF.forEach(r => { curve(r, c.muted, 1.2, [4, 4]); ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('p=' + r, sx(NMAX) - 42, sy(Math.pow(r, NMAX)) - 2); });
        curve(p, c.b, 3);
        const y = Math.pow(p, n); ctx.fillStyle = c.b; ctx.beginPath(); ctx.arc(sx(n), sy(y), 5.5, 0, 7); ctx.fill();
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Độ tin cậy mỗi bước p', 0.8, 0.999, 0.001, p, v => v.toFixed(3), v => { p = v; update(); });
    U.slider(r1, 'Số bước n', 1, NMAX, 1, n, String, v => { n = v; update(); });
    const readout = U.out(root);
    function update() {
      readout.innerHTML = 'p<sup>n</sup> = ' + p.toFixed(3) + '<sup>' + n + '</sup> = <b>' + (100 * Math.pow(p, n)).toFixed(1) + '%</b>. ' +
        'Giả định: các bước độc lập và chỉ cần một bước sai là cả chuỗi hỏng. Thực tế có thể khác (agent có thể tự sửa lỗi), nên đây là cận để tư duy, không phải dự báo.';
      view.redraw();
    }
    update();
  });
})();
