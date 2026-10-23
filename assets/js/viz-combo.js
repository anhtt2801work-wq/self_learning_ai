/* Interactive demos for the "Kết hợp công cụ AI" page */
(function () {
  'use strict';
  const { ui: U, el } = Viz;

  const CONF = {
    ok: ['✔', 'Đã đọc trực tiếp tài liệu chính thức'],
    mid: ['◐', 'Từ trang chính thức nhưng qua tóm tắt tìm kiếm, hoặc nhiều nguồn thứ cấp thống nhất'],
    low: ['✱', 'Nguồn thứ cấp hoặc chưa xác nhận: hãy kiểm tra trước khi dùng']
  };
  function badge(level) { const b = el('span', 'conf ' + level, CONF[level][0]); b.title = CONF[level][1]; b.setAttribute('aria-label', CONF[level][1]); return b; }
  function codeBlock(text) { const p = el('pre'); p.style.cssText = 'margin:6px 0;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);font:12.5px ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-x:auto'; p.textContent = text; return p; }

  /* ---------- 1. Task → tool router ---------- */
  Viz.register('route1', function (root) {
    const TOOLS = { claude: 'Claude (Claude Code, chat)', gemini: 'Gemini', anti: 'Antigravity', cursor: 'Cursor', copilot: 'GitHub Copilot', gpt: 'ChatGPT / Codex', pplx: 'Perplexity', cons: 'Consensus', nb: 'Gemini Notebook (NotebookLM cũ)' };
    const OWN = { claude: true, gemini: true, anti: true, cursor: true, copilot: false, gpt: true, pplx: true, cons: true, nb: true };
    const TASKS = {
      research: { name: 'Tìm và đọc bài báo học thuật', roles: [['Tìm bài', ['cons', 'pplx']], ['Gom nguồn của bạn và hỏi đáp có trích dẫn', ['nb']], ['Phân tích lập luận, viết tóm tắt', ['claude']], ['Kiểm chứng', ['bạn tự mở bài gốc']]], note: 'Đừng đưa số liệu, tên bài hay trích dẫn do mô hình đưa ra vào tài liệu khi chưa mở nguồn gốc. Hãy coi công cụ tìm kiếm là bước gợi ý, không phải bước xác nhận.' },
      lookup: { name: 'Tra nhanh thông tin hiện hành (giá, phiên bản, tin mới)', roles: [['Tra cứu có nguồn', ['pplx', 'gemini']], ['Đối chiếu', ['mở liên kết nguồn, ưu tiên trang chính thức']]], note: 'Thông tin về công cụ AI đổi theo tuần. Ghi ngày bạn tra cứu cạnh kết quả.' },
      studydoc: { name: 'Soạn tài liệu học (như website này)', roles: [['Dữ kiện và nguồn', ['pplx', 'cons']], ['Soạn và cấu trúc bài', ['claude']], ['Kiểm chứng số và code', ['chạy code thật, ví dụ bằng Claude Code hoặc máy bạn']], ['Học ngược: quiz, tóm tắt từ nguồn đã chọn', ['nb']]], note: 'Chỗ nào chưa kiểm chứng được thì ghi rõ trong bài, như các trang của website này đang làm.' },
      inline: { name: 'Gõ code hằng ngày, cần gợi ý tức thì', roles: [['Gợi ý khi gõ', ['cursor', 'copilot']], ['Câu hỏi nhanh về đoạn code đang mở', ['cursor', 'copilot', 'claude']]], note: 'Chọn một công cụ gợi ý khi gõ và dùng nó thôi; hai công cụ cùng chèn gợi ý vào một trình soạn thảo dễ gây xung đột.' },
      refactor: { name: 'Sửa nhiều file, có kiểm thử', roles: [['Lập kế hoạch và thực hiện', ['claude', 'cursor', 'anti']], ['Review chéo bằng mô hình khác', ['gpt', 'gemini', 'copilot']], ['Trọng tài khách quan', ['bộ kiểm thử và CI']]], note: 'Bắt đầu ở chế độ lập kế hoạch (Claude Code có plan mode), duyệt kế hoạch rồi mới cho sửa file.' },
      webui: { name: 'Làm web: giao diện và tương tác', roles: [['Dựng và sửa', ['claude', 'cursor', 'anti']], ['Xem thử', ['trình duyệt thật, cả màn hình nhỏ và chế độ tối']], ['Review mã', ['gpt', 'gemini']]], note: 'Antigravity được giới thiệu với tác tử có thể thao tác trình duyệt (✱ hãy kiểm tra tính năng hiện hành); dù dùng công cụ nào, hãy tự mở trang và thử.' },
      pr: { name: 'Review pull request', roles: [['Review tự động trên GitHub', ['claude', 'copilot']], ['Review chéo bằng CLI khác', ['gpt', 'gemini']], ['Quyết định cuối', ['người duyệt']]], note: 'Hai bộ review từ hai nhà cung cấp khác nhau thường bắt được nhiều lỗi hơn một, nhưng chỉ khi chúng không bỏ sót cùng một kiểu lỗi (xem minh họa toán bên dưới).' },
      bg: { name: 'Việc nền, chạy song song hoặc ban đêm', roles: [['Nhiều phiên song song, mỗi phiên một nhánh', ['claude', 'gpt']], ['Chạy theo lịch hoặc theo sự kiện', ['GitHub Actions', 'claude']]], note: 'Giới hạn bước, thời gian, chi phí; chạy trong repo tin cậy (xem phần bảo mật).' },
      debug: { name: 'Debug lỗi khó', roles: [['Giả thuyết độc lập từ hai công cụ', ['claude', 'gpt', 'gemini']], ['Tái hiện lỗi bằng test', ['bạn hoặc công cụ chạy lệnh']], ['Trọng tài', ['kết quả chạy test']]], note: 'Hãy yêu cầu mỗi công cụ nêu giả thuyết và cách kiểm chứng, đừng chỉ xin bản vá.' },
      team: { name: 'Dự án nhóm', roles: [['Trung tâm', ['Git, pull request, CI']], ['Chỉ dẫn dùng chung', ['AGENTS.md ở gốc repo']], ['Mỗi người', ['công cụ họ quen, miễn tuân theo chỉ dẫn và CI chung']]], note: 'Đồng bộ qua kho mã chứ không qua cuộc trò chuyện riêng: ai cũng đọc được quyết định và lý do.' }
    };
    let task = 'research';
    const r0 = U.row(root);
    r0.appendChild(el('span', 'viz-lbl', 'Bạn đang có (bỏ chọn nếu không dùng):')); r0.lastChild.style.fontSize = '.88rem';
    Object.keys(TOOLS).forEach(k => U.check(r0, TOOLS[k], OWN[k], v => { OWN[k] = v; update(); }));
    const r1 = U.row(root);
    U.select(r1, 'Việc cần làm', Object.keys(TASKS).map(k => [k, TASKS[k].name]), v => { task = v; update(); });
    const out = el('div', 'viz-out'); out.setAttribute('role', 'status'); root.appendChild(out);
    function update() {
      const t = TASKS[task]; out.textContent = '';
      t.roles.forEach(([role, items]) => {
        const line = el('div'); line.style.margin = '4px 0'; const b = el('b', null, role + ': '); line.appendChild(b);
        items.forEach((id, i) => { if (i) line.appendChild(document.createTextNode(' hoặc ')); if (TOOLS[id]) { const s = el('span', null, TOOLS[id]); if (!OWN[id]) { s.style.cssText = 'color:var(--muted);text-decoration:line-through'; s.title = 'Bạn đã bỏ chọn công cụ này'; } line.appendChild(s); } else line.appendChild(document.createTextNode(id)); });
        out.appendChild(line);
      });
      const n = el('div', null, 'Lưu ý: ' + t.note); n.style.cssText = 'margin-top:6px;color:var(--muted)'; out.appendChild(n);
      const f = el('div', null, 'Đây là gợi ý theo kinh nghiệm chung và vai trò của từng loại công cụ, không phải kết quả đo hiệu năng. Công cụ và hạn mức đổi nhanh; hãy thử trên việc thật của bạn.'); f.style.cssText = 'margin-top:6px;font-size:.85rem;color:var(--muted)'; out.appendChild(f);
    }
    update();
  });

  /* ---------- 2. Cross-review: why independence matters ---------- */
  Viz.register('xrev1', function (root) {
    let d1 = 0.6, d2 = 0.5, rho = 0.3;
    function bothMiss(m1, m2, r) { const p = m1 * m2 + r * Math.sqrt(m1 * (1 - m1) * m2 * (1 - m2)), lo = Math.max(0, m1 + m2 - 1), hi = Math.min(m1, m2); return Math.min(Math.max(p, lo), hi); }
    const catchAt = r => 1 - bothMiss(1 - d1, 1 - d2, r);
    const view = Viz.mount(root, {
      aspect: 0.45, minH: 220, label: 'Xác suất bắt được lỗi khi hai người review, theo mức tương quan giữa các lỗi bỏ sót',
      draw(ctx, W, H, c) {
        const pad = { l: 44, r: 12, t: 14, b: 32 }, X = r => pad.l + r * (W - pad.l - pad.r), Y = v => pad.t + (1 - v) * (H - pad.t - pad.b);
        ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(pad.l, Y(i / 4)); ctx.lineTo(W - pad.r, Y(i / 4)); ctx.stroke(); ctx.fillText((i / 4).toFixed(2), pad.l - 6, Y(i / 4)); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let i = 0; i <= 4; i++) ctx.fillText((i / 4).toFixed(2), X(i / 4), H - pad.b + 6); ctx.fillText('tương quan ρ giữa hai lần bỏ sót (0 = độc lập, 1 = luôn sót cùng lỗi)', (pad.l + W - pad.r) / 2, H - 16);
        const best = Math.max(d1, d2); ctx.setLineDash([5, 4]); ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(pad.l, Y(best)); ctx.lineTo(W - pad.r, Y(best)); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = c.a; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 100; i++) { const r = i / 100, v = catchAt(r); i ? ctx.lineTo(X(r), Y(v)) : ctx.moveTo(X(r), Y(v)); } ctx.stroke();
        ctx.fillStyle = c.b; ctx.beginPath(); ctx.arc(X(rho), Y(catchAt(rho)), 6, 0, 7); ctx.fill();
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = c.muted; ctx.fillText('--- chỉ dùng người review tốt hơn', pad.l + 8, Y(best) - 3); ctx.fillStyle = c.a; ctx.fillText('— bắt được ít nhất một trong hai', pad.l + 8, pad.t + 28);
      }
    });
    const r1 = U.row(root);
    U.slider(r1, 'Người review 1 bắt được lỗi', 0.1, 0.95, 0.05, d1, v => v.toFixed(2), v => { d1 = v; update(); });
    U.slider(r1, 'Người review 2 bắt được lỗi', 0.1, 0.95, 0.05, d2, v => v.toFixed(2), v => { d2 = v; update(); });
    U.slider(r1, 'Tương quan ρ', 0, 1, 0.05, rho, v => v.toFixed(2), v => { rho = v; update(); });
    const out = U.out(root);
    function update() {
      const ind = catchAt(0), cur = catchAt(rho), best = Math.max(d1, d2);
      out.innerHTML = 'Nếu hai người độc lập: bắt được <b>' + (ind * 100).toFixed(1) + '%</b>. Với ρ = ' + rho.toFixed(2) + ': <b>' + (cur * 100).toFixed(1) + '%</b>, hơn người giỏi hơn (' + (best * 100).toFixed(0) + '%) thêm <b>' + ((cur - best) * 100).toFixed(1) + '</b> điểm phần trăm. Khi ρ tiến tới mức tối đa khả dĩ, lợi ích về 0: thêm một người review cùng kiểu sai thì không bắt được thêm gì. ' +
        'Hai con số đầu vào ở đây là <b>giả định minh họa</b>, không phải số đo của công cụ nào. Mô hình cùng nhà cung cấp hoặc cùng cách huấn luyện có thể có ρ cao hơn, nhưng mức cụ thể phải được đo trên lỗi thật của bạn; kiểm thử và CI là một “người review” có ρ thấp với cả hai vì nó kiểm tra bằng cách chạy chứ không bằng cách đọc.';
      view.redraw();
    }
    update();
  });

  /* ---------- 3. Shared instruction file layout generator ---------- */
  Viz.register('instr1', function (root) {
    const S = { claude: true, cursor: true, copilot: false, anti: true, codex: true, win: false };
    const r1 = U.row(root);
    U.check(r1, 'Claude Code', S.claude, v => { S.claude = v; update(); });
    U.check(r1, 'Cursor', S.cursor, v => { S.cursor = v; update(); });
    U.check(r1, 'GitHub Copilot (VS Code / coding agent)', S.copilot, v => { S.copilot = v; update(); });
    U.check(r1, 'Antigravity', S.anti, v => { S.anti = v; update(); });
    U.check(r1, 'Codex', S.codex, v => { S.codex = v; update(); });
    const r2 = U.row(root); U.check(r2, 'Nhóm có người dùng Windows', S.win, v => { S.win = v; update(); });
    const out = el('div'); root.appendChild(out);
    function item(level, title, body) { const d = el('div'); d.style.cssText = 'margin:8px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface)'; const h = el('div'); h.appendChild(badge(level)); const b = el('b', null, ' ' + title); h.appendChild(b); d.appendChild(h); body.forEach(x => d.appendChild(typeof x === 'string' ? el('div', null, x) : x)); return d; }
    function update() {
      out.textContent = '';
      out.appendChild(item('ok', 'Bước 1. Một bản gốc: AGENTS.md ở gốc repo', [codeBlock('# AGENTS.md\n## Lệnh\n- Cài đặt: ...\n- Kiểm thử: ...\n- Lint: ...\n## Quy ước\n- ...\n## Không được làm\n- Không sửa assets/js/search-index.js bằng tay; chạy tools/build_search_index.py\n- Không commit khóa API hoặc tệp .env'), 'Nội dung ngắn, cụ thể, kiểm chứng được (lệnh chạy thật). Chỉ ghi những gì bạn sẽ phải nhắc lại cho mọi công cụ.']));
      if (S.claude) {
        const cm = '@AGENTS.md\n\n## Claude Code\n- (chỉ ghi điều riêng cho Claude, ví dụ: dùng plan mode cho thay đổi trong src/billing/)';
        out.appendChild(item('ok', 'Claude Code', ['Claude Code đọc AGENTS.md nếu repo không có CLAUDE.md (từ v2.1.277; nếu có CLAUDE.md hoặc CLAUDE.local.md thì chỉ đọc các CLAUDE.md). Cách chắc chắn nhất để dùng chung một bản gốc là CLAUDE.md có dòng nhập:', codeBlock('# CLAUDE.md\n' + cm), S.win ? 'Vì nhóm có người dùng Windows, hãy dùng dòng nhập @AGENTS.md thay vì symlink (tài liệu Claude Code nêu rõ lý do). Trong phiên làm việc, chạy /context và xác nhận CLAUDE.md nằm trong “Memory files”.' : 'Có thể thay bằng symlink: ln -s AGENTS.md CLAUDE.md (công cụ Edit/Write của Claude không ghi qua symlink mà sửa tệp đích AGENTS.md). Xác nhận bằng /context.']));
      }
      if (S.cursor) out.appendChild(item('mid', 'Cursor', ['Cursor đọc AGENTS.md ở gốc và ở thư mục con (nội dung thuần markdown, không frontmatter). Chỉ thêm .cursor/rules/*.mdc khi cần quy tắc gắn với một nhóm tệp (glob). .cursorrules là định dạng cũ, tài liệu khuyên chuyển đi.']));
      if (S.copilot) out.appendChild(item('mid', 'GitHub Copilot', ['Coding agent của Copilot hỗ trợ AGENTS.md (gốc và thư mục con), đồng thời vẫn hỗ trợ .github/copilot-instructions.md, .github/instructions/**/*.instructions.md; trang changelog của GitHub cũng nêu CLAUDE.md và GEMINI.md. Tài liệu VS Code coi AGENTS.md là định dạng dùng chung và khuyên tránh để các tệp chỉ dẫn mâu thuẫn nhau. Nếu cần chỉ dẫn riêng cho Copilot thì viết ngắn và không lặp lại nội dung AGENTS.md.']));
      if (S.anti) out.appendChild(item('mid', 'Antigravity', ['Quy tắc workspace được nạp từ AGENTS.md, GEMINI.md hoặc .agents/rules/*.md (kể cả thư mục con); quy tắc toàn cục ở ~/.gemini/. Các nguồn khác nhau về thứ tự ưu tiên giữa AGENTS.md và GEMINI.md, tài liệu chính thức không nêu rõ: đừng để hai tệp mâu thuẫn. Bản Antigravity cũ hơn có thể chưa đọc AGENTS.md (các bài viết nêu số phiên bản khác nhau), nên hãy cập nhật.']));
      if (S.codex) out.appendChild(item('mid', 'Codex', ['Codex đọc AGENTS.md ở gốc repo (và ~/.codex/AGENTS.md cho toàn cục). Đây là định dạng gốc của nó.']));
      out.appendChild(item('ok', 'Bước cuối. Kiểm tra từng công cụ có thực sự thấy chỉ dẫn', [codeBlock('Hãy liệt kê các chỉ dẫn dự án bạn đang nạp và tên tệp nguồn của từng chỉ dẫn.'), 'Dán câu này vào từng công cụ ở một thư mục con và ở gốc. Nếu công cụ không nêu được AGENTS.md, nó chưa đọc tệp đó: dùng cách nhập/sao chép riêng cho công cụ ấy. Đừng suy ra từ tài liệu mà không thử.']));
    }
    update();
  });

  /* ---------- 4. One MCP server definition → config for each tool ---------- */
  Viz.register('mcpgen1', function (root) {
    const S = { name: 'consensus', transport: 'http', url: 'https://mcp.consensus.app/mcp', command: 'npx', args: '-y @perplexity-ai/mcp-server', envName: 'PERPLEXITY_API_KEY' };
    const inp = (label, key, w) => { const wrap = el('label', 'viz-ctl'); wrap.appendChild(el('span', 'viz-lbl', label)); const i = el('input'); i.type = 'text'; i.value = S[key]; i.style.cssText = 'flex:1 1 ' + (w || 200) + 'px;min-width:140px'; i.setAttribute('aria-label', label); i.addEventListener('input', () => { S[key] = i.value; update(); }); wrap.appendChild(i); return wrap; };
    const r0 = U.row(root);
    U.select(r0, 'Ví dụ', [['consensus', 'Consensus (từ xa, HTTP; địa chỉ chưa xác nhận)'], ['perplexity', 'Perplexity (cục bộ, stdio; gói npm chưa xác nhận)'], ['custom', 'Tự nhập']], v => { if (v === 'consensus') Object.assign(S, { name: 'consensus', transport: 'http', url: 'https://mcp.consensus.app/mcp' }); else if (v === 'perplexity') Object.assign(S, { name: 'perplexity', transport: 'stdio', command: 'npx', args: '-y @perplexity-ai/mcp-server', envName: 'PERPLEXITY_API_KEY' }); sync(); update(); });
    const sel = U.select(r0, 'Kiểu kết nối', [['http', 'Từ xa (HTTP)'], ['stdio', 'Cục bộ (chạy lệnh, stdio)']], v => { S.transport = v; update(); });
    const r1 = U.row(root), nameI = inp('Tên', 'name', 120); r1.appendChild(nameI); const urlI = inp('URL (kiểu từ xa)', 'url', 280); r1.appendChild(urlI);
    const r2 = U.row(root), cmdI = inp('Lệnh (kiểu cục bộ)', 'command', 120), argI = inp('Tham số', 'args', 240), envI = inp('Tên biến môi trường chứa khóa', 'envName', 200); r2.appendChild(cmdI); r2.appendChild(argI); r2.appendChild(envI);
    function sync() { [nameI, urlI, cmdI, argI, envI].forEach((w, i) => { w.querySelector('input').value = S[['name', 'url', 'command', 'args', 'envName'][i]]; }); root.querySelectorAll('select')[1].value = S.transport; }
    const out = el('div'); root.appendChild(out);
    function block(level, title, text, note) { const d = el('div'); d.style.cssText = 'margin:8px 0'; const h = el('div'); h.appendChild(badge(level)); h.appendChild(el('b', null, ' ' + title)); d.appendChild(h); d.appendChild(codeBlock(text)); if (note) { const n = el('div', null, note); n.style.cssText = 'font-size:.85rem;color:var(--muted)'; d.appendChild(n); } return d; }
    const J = o => JSON.stringify(o, null, 2);
    function update() {
      const name = (S.name || 'server').replace(/[^\w-]/g, '-'), args = (S.args || '').split(/\s+/).filter(Boolean), env = S.envName ? S.envName.trim() : '', http = S.transport === 'http';
      out.textContent = '';
      // Claude Code (documented)
      let cc = http ? 'claude mcp add --transport http ' + name + ' ' + S.url : 'claude mcp add' + (env ? ' --env ' + env + '=$' + env : '') + ' --transport stdio ' + name + ' -- ' + [S.command].concat(args).join(' ');
      const mcpJson = http ? { mcpServers: { [name]: { type: 'http', url: S.url } } } : { mcpServers: { [name]: Object.assign({ type: 'stdio', command: S.command, args }, env ? { env: { [env]: '${' + env + '}' } } : {}) } };
      out.appendChild(block('ok', 'Claude Code', cc + '\n\n# hoặc đặt trong .mcp.json ở gốc repo (chia sẻ qua Git; không ghi khóa vào tệp, dùng ${BIEN}):\n' + J(mcpJson), 'Phạm vi: --scope local (mặc định) | project (.mcp.json) | user. Trong phiên chạy /mcp để xem trạng thái và đăng nhập OAuth với máy chủ từ xa.'));
      // Cursor
      const cur = http ? { mcpServers: { [name]: { url: S.url } } } : { mcpServers: { [name]: Object.assign({ command: S.command, args }, env ? { env: { [env]: '${env:' + env + '}' } } : {}) } };
      out.appendChild(block('mid', 'Cursor: .cursor/mcp.json (dự án) hoặc ~/.cursor/mcp.json (toàn cục)', J(cur), 'Cách nội suy biến môi trường trong tệp của Cursor (ở đây ${env:...}) mình chưa xác nhận; xem tài liệu MCP của Cursor.'));
      // VS Code
      const vs = http ? { servers: { [name]: { type: 'http', url: S.url } } } : { servers: { [name]: Object.assign({ type: 'stdio', command: S.command, args }, env ? { env: { [env]: '${input:' + env.toLowerCase() + '}' } } : {}) }, inputs: env ? [{ type: 'promptString', id: env.toLowerCase(), description: env, password: true }] : [] };
      out.appendChild(block('low', 'VS Code (Copilot): .vscode/mcp.json', J(vs), 'Khóa gốc là "servers" (không phải "mcpServers"). Công cụ MCP chỉ dùng được trong chế độ agent. Chi tiết trường (type, inputs) theo các bài hướng dẫn thứ cấp; hãy đối chiếu tài liệu VS Code.'));
      // Codex
      const toml = http ? '[mcp_servers.' + name + ']\nurl = "' + S.url + '"' : '[mcp_servers.' + name + ']\ncommand = "' + S.command + '"\nargs = [' + args.map(a => '"' + a + '"').join(', ') + ']' + (env ? '\nenv = { ' + env + ' = "..." }  # nhớ: không commit khóa; xem tùy chọn lấy khóa từ biến môi trường trong tài liệu' : '');
      out.appendChild(block('mid', 'Codex: ~/.codex/config.toml', toml, 'Khóa bảng là mcp_servers (gạch dưới), không phải mcpServers. Kiểu từ xa dùng trường url theo các bài hướng dẫn thứ cấp.'));
      // Antigravity
      const ag = http ? { mcpServers: { [name]: { serverUrl: S.url } } } : { mcpServers: { [name]: Object.assign({ command: S.command, args }, env ? { env: { [env]: '${' + env + '}' } } : {}) } };
      out.appendChild(block('low', 'Antigravity: mcp_config.json', J(ag), 'Máy chủ từ xa dùng "serverUrl" (không phải "url"). Vị trí tệp khác nhau giữa các nguồn (thư mục toàn cục dưới ~/.gemini/, hoặc .agents/ trong workspace); dùng nút “View raw config” trong trình quản lý MCP để thấy đường dẫn thật.'));
    }
    sync(); update();
  });
})();
