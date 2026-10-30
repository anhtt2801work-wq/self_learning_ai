/* Interactive demos for the Cyber Security page: TCP handshake/SYN flood, a stateful firewall
 * rule tester, the SQL-injection-vs-parameterized-query contrast, a risk/ALE calculator, and a
 * Cyber Kill Chain → defense mapper. All of these are concept/defense demos: no real network
 * traffic is sent and no database or exploit code runs; everything happens with plain strings
 * and canvas drawing inside this page. */
(function () {
  'use strict';
  const { ui: U, el } = Viz;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function codeBlock(text) {
    const p = el('pre');
    p.style.cssText = 'margin:6px 0;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);font:12.5px ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere';
    p.textContent = text;
    return p;
  }

  /* ---------- 1. TCP 3-way handshake + SYN flood / SYN cookies ---------- */
  Viz.register('tcp1', function (root) {
    const CAP = 10;
    let step = 0;       // 0 idle, 1 SYN, 2 SYN-ACK, 3 ACK (established)
    let backlog = 0;
    let cookiesOn = false;
    let floodN = 10;
    let note = 'Nhấn “Bắt tay 3 bước” để xem một kết nối TCP bình thường được thiết lập như thế nào.';

    const view = Viz.mount(root, {
      aspect: 0.52, minH: 260, label: 'Bắt tay 3 bước TCP và hàng đợi nửa-mở khi bị SYN flood',
      draw(ctx, W, H, c) {
        const cx = { x: 24, y: 24, w: 108, h: 44 }, sx = { x: W - 132, y: 24, w: 108, h: 44 };
        ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        [[cx, 'Client', c.a], [sx, 'Server', c.b]].forEach(([b, label, color]) => {
          ctx.fillStyle = Viz.rgba(color, 0.16); ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 8) : ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.stroke();
          ctx.fillStyle = c.fg; ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
        });
        const x1 = cx.x + cx.w, x2 = sx.x;
        function seg(y, leftToRight, label, color) {
          ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
          if (leftToRight) { ctx.moveTo(x1, y); ctx.lineTo(x2 - 8, y); } else { ctx.moveTo(x2, y); ctx.lineTo(x1 + 8, y); }
          ctx.stroke();
          const ax = leftToRight ? x2 - 8 : x1 + 8, dir = leftToRight ? 1 : -1;
          ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(ax - 9 * dir, y - 5); ctx.lineTo(ax - 9 * dir, y + 5); ctx.fill();
          ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = c.fg; ctx.fillText(label, (x1 + x2) / 2, y - 10);
        }
        ctx.font = '11px system-ui, sans-serif';
        if (step >= 1) seg(86, true, '① SYN', c.a);
        if (step >= 2) seg(118, false, '② SYN-ACK', c.b);
        if (step >= 3) seg(150, true, '③ ACK', c.a);
        ctx.textAlign = 'center'; ctx.fillStyle = c.muted;
        ctx.fillText(step === 3 ? 'Kết nối TCP đã thiết lập (bắt tay 3 bước hoàn tất)' : (step === 0 ? 'Chưa gửi gói nào' : 'Đang bắt tay…'), W / 2, 175);

        const by = 206, sq = 16, gap = 5, startX = (W - CAP * (sq + gap)) / 2;
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = c.fg;
        ctx.fillText('Hàng đợi nửa-mở (SYN backlog): ' + backlog + ' / ' + CAP + (cookiesOn ? '  (SYN cookies bật → không chiếm hàng đợi)' : ''), 10, by - 10);
        for (let i = 0; i < CAP; i++) {
          const filled = i < backlog;
          ctx.fillStyle = filled ? (backlog >= CAP ? c.c : c.d) : Viz.rgba(c.border, 0.4);
          ctx.strokeStyle = c.border; ctx.lineWidth = 1;
          ctx.fillRect(startX + i * (sq + gap), by, sq, sq); ctx.strokeRect(startX + i * (sq + gap), by, sq, sq);
        }
      }
    });

    const r1 = U.row(root);
    U.button(r1, 'Bắt tay 3 bước (bình thường)', () => { step = Math.min(3, step + 1); if (step === 3) note = 'Bắt tay xong: client và server đều đã xác nhận cả hai chiều. Chỉ sau ACK server mới cấp phát bộ nhớ kết nối thật.'; render(); }, true);
    U.button(r1, 'Đặt lại', () => { step = 0; backlog = 0; note = 'Đã đặt lại.'; render(); });

    const r2 = U.row(root);
    U.slider(r2, 'Số gói SYN giả mạo mỗi lần gửi', 1, CAP, 1, floodN, v => String(v), v => { floodN = v; });
    U.check(r2, 'Bật SYN cookies (phòng thủ)', cookiesOn, v => { cookiesOn = v; note = v ? 'SYN cookies bật: server không lưu trạng thái khi nhận SYN, mà mã hoá thông tin cần thiết ngay trong số thứ tự của gói SYN-ACK trả lời. Hàng đợi nửa-mở chỉ được dùng sau khi ACK hợp lệ quay về, nên gói SYN giả (không có ai gửi ACK) không chiếm được tài nguyên.' : 'SYN cookies tắt: mỗi SYN đến sẽ chiếm một ô trong hàng đợi nửa-mở cho tới khi hết thời gian chờ.'; render(); });
    const r3 = U.row(root);
    U.button(r3, 'Gửi gói SYN giả mạo (mô phỏng SYN flood)', () => {
      if (cookiesOn) { note = 'Gói SYN giả bị bỏ qua về mặt lưu trữ trạng thái: không có backlog nào bị chiếm, server vẫn phục vụ client thật bình thường.'; }
      else {
        backlog = Math.min(CAP, backlog + floodN);
        note = backlog >= CAP
          ? 'Hàng đợi nửa-mở đã đầy: client thật gửi SYN đến sẽ bị server âm thầm bỏ gói (không còn chỗ chờ) — đây chính là từ chối dịch vụ (DoS) do cạn tài nguyên, không cần phá được mật khẩu hay lỗ hổng gì cả.'
          : 'Hàng đợi nửa-mở đang đầy dần vì các gói SYN không có ACK trả về (kẻ tấn công thường giả địa chỉ nguồn nên ACK không bao giờ tới).';
      }
      render();
    });

    const out = U.out(root);
    function render() { out.textContent = note; view.redraw(); }
    render();
  });

  /* ---------- 2. Stateful firewall rule tester ---------- */
  Viz.register('fw1', function (root) {
    const RULES = [
      { label: 'Luật 1 — cho SSH (22) vào, chỉ từ mạng quản trị', test: (d, p, s) => d === 'in' && p === 22 && s === 'admin', action: 'allow' },
      { label: 'Luật 2 — chặn SSH (22) vào từ nơi khác', test: (d, p) => d === 'in' && p === 22, action: 'deny' },
      { label: 'Luật 3 — chặn Telnet (23): không mã hoá, không nên mở', test: (d, p) => d === 'in' && p === 23, action: 'deny' },
      { label: 'Luật 4 — cho HTTPS (443) vào từ bất kỳ đâu', test: (d, p) => d === 'in' && p === 443, action: 'allow' },
      { label: 'Luật 5 — cho mọi kết nối đi ra (outbound) từ nội bộ', test: d => d === 'out', action: 'allow' },
      { label: 'Luật mặc định — default-deny: không khớp luật nào thì từ chối', test: () => true, action: 'deny' }
    ];
    let dir = 'in', port = 22, src = 'any', established = false;

    const r1 = U.row(root);
    U.select(r1, 'Hướng gói tin', [['in', 'Đi vào (inbound)'], ['out', 'Đi ra (outbound)']], v => { dir = v; update(); });
    const r2 = U.row(root);
    const portLbl = el('label', 'viz-ctl'); portLbl.appendChild(el('span', 'viz-lbl', 'Cổng đích'));
    const portInp = el('input'); portInp.type = 'number'; portInp.min = 1; portInp.max = 65535; portInp.value = port; portInp.style.width = '7ch';
    portInp.addEventListener('input', () => { port = parseInt(portInp.value, 10) || 0; update(); });
    portLbl.appendChild(portInp); r2.appendChild(portLbl);
    U.select(r2, 'Nguồn gói tin (nếu đi vào)', [['any', 'Internet / không xác định'], ['admin', 'Mạng quản trị nội bộ']], v => { src = v; update(); });
    const r3 = U.row(root);
    U.check(r3, 'Đây là gói phản hồi của một kết nối ra đã mở trước (stateful)', established, v => { established = v; update(); });

    const rulesList = el('ol'); rulesList.style.cssText = 'font-size:.85rem;color:var(--muted);margin:8px 0 0;padding-left:1.4em';
    RULES.forEach(r => rulesList.appendChild(el('li', null, r.label + ' → ' + (r.action === 'allow' ? 'CHO QUA' : 'TỪ CHỐI'))));
    root.appendChild(rulesList);

    const out = U.out(root);
    function update() {
      if (dir === 'in' && established) {
        out.innerHTML = '<b>CHO QUA</b> — tường lửa có trạng thái (stateful) theo dõi bảng kết nối; vì gói này thuộc một kết nối do chính nội bộ mở ra (luật 5), nó được tự động cho vào mà không cần một luật “inbound” riêng cho cổng ' + port + '.';
        return;
      }
      const rule = RULES.find(r => r.test(dir, port, src));
      const i = RULES.indexOf(rule) + 1;
      out.innerHTML = '<b>' + (rule.action === 'allow' ? 'CHO QUA' : 'TỪ CHỐI') + '</b> — khớp luật ' + i + ': “' + rule.label + '”. Tường lửa xét luật theo thứ tự và dừng ở luật đầu tiên khớp, nên thứ tự luật quan trọng hơn cả nội dung từng luật.';
    }
    update();
  });

  /* ---------- 3. Parameterized query vs string concatenation ---------- */
  Viz.register('sqli1', function (root) {
    const r1 = U.row(root);
    const lbl = el('label', 'viz-ctl'); lbl.appendChild(el('span', 'viz-lbl', 'Giá trị người dùng nhập (ví dụ: tên đăng nhập)'));
    const inp = el('input'); inp.type = 'text'; inp.value = 'alice'; inp.style.flex = '1 1 220px';
    lbl.appendChild(inp); r1.appendChild(lbl);
    U.button(r1, 'Điền ví dụ kinh điển', () => { inp.value = "' OR '1'='1"; update(); });

    const h1 = el('div', null, 'Câu lệnh dựng bằng nối chuỗi (không an toàn):'); h1.style.cssText = 'font-weight:600;margin-top:10px';
    root.appendChild(h1);
    const code1 = codeBlock(''); root.appendChild(code1);
    const h2 = el('div', null, 'Câu lệnh tham số hoá (prepared statement, an toàn):'); h2.style.cssText = 'font-weight:600;margin-top:10px';
    root.appendChild(h2);
    const code2 = codeBlock(''); root.appendChild(code2);
    const out = U.out(root);

    function update() {
      const v = inp.value;
      code1.textContent = "SELECT * FROM users WHERE name = '" + v + "'";
      code2.textContent = 'SELECT * FROM users WHERE name = ?\nTham số gửi riêng: "' + v + '"';
      const cut = v.indexOf("'");
      out.innerHTML = cut !== -1
        ? 'Giá trị này chứa dấu nháy đơn: trong câu nối chuỗi, dấu nháy đơn <b>đầu tiên</b> bên trong giá trị kết thúc chuỗi literal sớm hơn dự kiến. Phần còn lại của giá trị (<code>' + esc(v.slice(cut + 1)) + '</code>) bị cơ sở dữ liệu hiểu là <em>cú pháp SQL</em>, không còn là dữ liệu — đây là bản chất của SQL Injection, bất kể kết quả là một lỗi cú pháp hay (như ví dụ trên) một mệnh đề luôn đúng khiến câu lệnh trả về mọi dòng. Ở câu tham số hoá, toàn bộ giá trị — kể cả dấu nháy đơn — vẫn luôn chỉ là một chuỗi dữ liệu được so sánh, không bao giờ được hiểu là cú pháp.'
        : 'Giá trị này không chứa dấu nháy đơn, nên câu nối chuỗi tình cờ không bị phá vỡ cú pháp với đúng input này — nhưng đó là may rủi của riêng input này, không phải một đảm bảo an toàn. Chỉ cần người dùng nhập một dấu nháy đơn (thử nút “Điền ví dụ kinh điển”), logic câu lệnh có thể thay đổi hoàn toàn. Câu tham số hoá an toàn với <em>mọi</em> giá trị, không phụ thuộc input có ký tự gì.';
    }
    update();
    inp.addEventListener('input', update);
  });

  /* ---------- 4. Risk matrix + ALE calculator ---------- */
  Viz.register('risk1', function (root) {
    const LIK = ['Hiếm khi', 'Khó xảy ra', 'Có thể xảy ra', 'Khá chắc', 'Gần như chắc'];
    const IMP = ['Không đáng kể', 'Nhỏ', 'Trung bình', 'Lớn', 'Nghiêm trọng'];
    let li = 1, im = 1;

    const r1 = U.row(root);
    const sle = U.slider(r1, 'SLE — thiệt hại một lần xảy ra (triệu đồng)', 10, 5000, 10, 500, v => v.toLocaleString('vi-VN'), () => update());
    const aro = U.slider(r1, 'ARO — số lần xảy ra mỗi năm', 0.01, 3, 0.01, 0.5, v => v.toFixed(2), () => update());
    const aleOut = el('div'); aleOut.style.cssText = 'margin:6px 0;font-weight:600'; root.appendChild(aleOut);

    const r2 = U.row(root);
    U.select(r2, 'Khả năng xảy ra', LIK.map((l, i) => [String(i + 1), (i + 1) + ' — ' + l]), v => { li = parseInt(v, 10); update(); });
    U.select(r2, 'Mức ảnh hưởng', IMP.map((l, i) => [String(i + 1), (i + 1) + ' — ' + l]), v => { im = parseInt(v, 10); update(); });

    const table = el('table'); table.style.cssText = 'margin:10px 0;font-size:.82rem;text-align:center';
    const cells = [];
    for (let r = 5; r >= 1; r--) {
      const tr = el('tr');
      tr.appendChild(el('td', null, String(r) + ' — ' + LIK[r - 1])); tr.lastChild.style.cssText = 'text-align:left;color:var(--muted);white-space:nowrap';
      for (let cI = 1; cI <= 5; cI++) {
        const td = el('td', null, String(r * cI)); td.style.cssText = 'width:2.6em;padding:4px;border:1px solid var(--border);cursor:default';
        cells.push({ td, r, cI }); tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    const head = el('tr'); head.appendChild(el('td'));
    for (let cI = 1; cI <= 5; cI++) { head.appendChild(el('td', null, String(cI))); head.lastChild.style.cssText = 'color:var(--muted)'; }
    table.insertBefore(head, table.firstChild);
    root.appendChild(table);

    function levelOf(score) { return score <= 4 ? ['thấp', 'ok'] : score <= 9 ? ['trung bình', 'mid'] : score <= 15 ? ['cao', 'low'] : ['nghiêm trọng (critical)', 'low']; }
    const COLOR = { ok: '--c3', mid: '--c1', low: '--c2' };
    const out = U.out(root);
    function update() {
      aleOut.textContent = 'ALE = SLE × ARO = ' + sle.get().toLocaleString('vi-VN') + ' × ' + aro.get().toFixed(2) + ' ≈ ' + Math.round(sle.get() * aro.get()).toLocaleString('vi-VN') + ' triệu đồng/năm (thiệt hại kỳ vọng mỗi năm nếu không thêm kiểm soát nào)';
      cells.forEach(({ td, r, cI }) => {
        const score = r * cI, [, lv] = levelOf(score), selected = r === li && cI === im;
        td.style.background = Viz.rgba(getComputedStyle(document.documentElement).getPropertyValue(COLOR[lv]).trim(), selected ? 0.55 : 0.18);
        td.style.outline = selected ? '2px solid var(--text)' : 'none';
      });
      const score = li * im, [name] = levelOf(score);
      const action = score <= 4 ? 'chấp nhận hoặc chỉ theo dõi định kỳ.' : score <= 9 ? 'lập kế hoạch giảm thiểu trong thời gian hợp lý.' : score <= 15 ? 'cần thêm kiểm soát ngay, ưu tiên trong các kỳ gần nhất.' : 'xử lý ngay, cân nhắc cả việc tạm ngưng hoạt động liên quan hoặc chuyển giao rủi ro (bảo hiểm).';
      out.innerHTML = 'Điểm rủi ro = ' + li + ' × ' + im + ' = <b>' + score + '</b> → mức <b>' + name + '</b>. Gợi ý xử lý: ' + action + ' Lưu ý: ma trận 1–5×1–5 và ALE là hai cách định lượng khác nhau cho cùng một quyết định “nên đầu tư kiểm soát đến đâu”, không nhất thiết phải khớp số với nhau.';
    }
    window.addEventListener('themechange', update);
    update();
  });

  /* ---------- 5. Cyber Kill Chain → defense mapper ---------- */
  Viz.register('kill1', function (root) {
    const STAGES = [
      { n: 'Trinh sát', atk: 'Thu thập thông tin công khai: tên nhân viên trên LinkedIn, công nghệ đang dùng, email để lại trên mạng (OSINT).', def: 'Hạn chế rò rỉ thông tin nội bộ ra ngoài, theo dõi threat intelligence, đào tạo nhận thức an ninh cho nhân viên.' },
      { n: 'Vũ khí hoá', atk: 'Đóng gói mã khai thác hoặc payload vào một tệp văn bản, macro Office hay công cụ trông vô hại.', def: 'Không có hành động trực diện nào ở phía nạn nhân tại bước này; phòng thủ chủ yếu nằm ở bước Phát tán và Khai thác tiếp theo.' },
      { n: 'Phát tán', atk: 'Gửi qua email lừa đảo (phishing), USB, hoặc dẫn dụ truy cập một website giả mạo.', def: 'Lọc email và web gateway, xác thực DMARC/SPF/DKIM cho email đến, cảnh báo và huấn luyện người dùng nhận diện phishing.' },
      { n: 'Khai thác', atk: 'Lợi dụng một lỗ hổng phần mềm chưa vá hoặc một quyết định sai của người dùng (bấm vào, nhập mật khẩu) để chạy mã.', def: 'Vá lỗi (patch management) nhanh và có ưu tiên, giảm diện tích bị tấn công (tắt dịch vụ không dùng), phần mềm EDR trên máy trạm.' },
      { n: 'Cài cắm', atk: 'Cài mã độc hoặc backdoor để duy trì quyền truy cập lâu dài, kể cả sau khi khởi động lại máy.', def: 'Giám sát thay đổi hệ thống (file integrity monitoring), chỉ cho phép ứng dụng trong danh sách trắng chạy (application allow-listing).' },
      { n: 'Điều khiển từ xa (C2)', atk: 'Máy bị nhiễm kết nối ra ngoài tới hạ tầng của kẻ tấn công để nhận lệnh tiếp theo.', def: 'Giám sát và lọc lưu lượng đi ra (egress filtering), chặn DNS/IP độc hại đã biết, phân đoạn mạng (network segmentation) để hạn chế máy bị nhiễm nói chuyện được với hệ thống quan trọng.' },
      { n: 'Hành động theo mục tiêu', atk: 'Đánh cắp dữ liệu, mã hoá tống tiền (ransomware), hoặc phá hoại hệ thống.', def: 'Chống rò rỉ dữ liệu (DLP), bản sao lưu cách ly khỏi mạng chính (offline/immutable backup), kế hoạch ứng cứu sự cố đã diễn tập trước.' }
    ];
    const r1 = U.row(root);
    const btns = STAGES.map((s, i) => U.button(r1, (i + 1) + '. ' + s.n, () => select(i)));
    const out = U.out(root);
    function select(i) {
      btns.forEach((b, j) => b.classList.toggle('primary', j === i));
      const s = STAGES[i];
      out.innerHTML = '<p style="margin:0 0 6px"><b>Kẻ tấn công làm gì:</b> ' + s.atk + '</p><p style="margin:0"><b>Phòng thủ tương ứng:</b> ' + s.def + '</p>';
    }
    select(0);
  });
})();
