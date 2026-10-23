/* Additional interactive demos for the GitHub page (deep-dive sections) */
(function () {
  'use strict';
  const { ui: U, el } = Viz;

// ---- SHA-1 over a Uint8Array, returns hex ----
function sha1(bytes) {
  const l = bytes.length, nb = (((l + 8) >> 6) + 1) << 6, buf = new Uint8Array(nb); buf.set(bytes); buf[l] = 0x80;
  const dv = new DataView(buf.buffer); dv.setUint32(nb - 4, (l * 8) >>> 0); dv.setUint32(nb - 8, Math.floor(l * 8 / 4294967296));
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0; const w = new Uint32Array(80), rol = (x, n) => (x << n) | (x >>> (32 - n));
  for (let o = 0; o < nb; o += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(o + t * 4);
    for (let t = 16; t < 80; t++) w[t] = rol(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      const f = t < 20 ? (b & c) | (~b & d) : t < 40 ? b ^ c ^ d : t < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d, k = t < 20 ? 0x5A827999 : t < 40 ? 0x6ED9EBA1 : t < 60 ? 0x8F1BBCDC : 0xCA62C1D6;
      const tmp = (rol(a, 5) + f + e + k + w[t]) >>> 0; e = d; d = c; c = rol(b, 30) >>> 0; b = a; a = tmp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map(x => x.toString(16).padStart(8, '0')).join('');
}
const enc = s => new TextEncoder().encode(s);
function gitObject(type, content) { const body = enc(content), head = enc(type + ' ' + body.length + '\0'), all = new Uint8Array(head.length + body.length); all.set(head); all.set(body, head.length); return all; }
const gitHash = (type, content) => sha1(gitObject(type, content));

// ---- diff3 ----
function matches(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0; while (i < n && j < m) { if (a[i] === b[j]) { out.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; } return out;
}
function hunks(base, side) {
  const mt = matches(base, side), hs = []; let bi = 0, si = 0;
  for (const [i, j] of mt.concat([[base.length, side.length]])) { if (i > bi || j > si) hs.push({ bs: bi, be: i, ss: si, se: j }); bi = i + 1; si = j + 1; }
  return hs;
}
function apply(base, side, hs, cs, ce) { const out = []; let p = cs; for (const h of hs) { for (let k = p; k < h.bs; k++) out.push(base[k]); for (let k = h.ss; k < h.se; k++) out.push(side[k]); p = h.be; } for (let k = p; k < ce; k++) out.push(base[k]); return out; }
function diff3(base, ours, theirs) {
  const A = hunks(base, ours).map(h => ({ ...h, w: 'o' })), B = hunks(base, theirs).map(h => ({ ...h, w: 't' })), all = A.concat(B).sort((x, y) => x.bs - y.bs || x.be - y.be);
  const out = []; let pos = 0, conflicts = 0, k = 0;
  while (k < all.length) {
    let cs = all[k].bs, ce = all[k].be; const grp = [all[k]]; k++;
    while (k < all.length && all[k].bs <= ce) { ce = Math.max(ce, all[k].be); grp.push(all[k]); k++; }
    for (let p = pos; p < cs; p++) out.push(base[p]);
    const ho = grp.filter(h => h.w === 'o'), ht = grp.filter(h => h.w === 't');
    if (!ht.length) out.push(...apply(base, ours, ho, cs, ce));
    else if (!ho.length) out.push(...apply(base, theirs, ht, cs, ce));
    else { const a = apply(base, ours, ho, cs, ce), b = apply(base, theirs, ht, cs, ce); if (a.join('\n') === b.join('\n')) out.push(...a); else { conflicts++; out.push('<<<<<<< ours', ...a, '=======', ...b, '>>>>>>> theirs'); } }
    pos = ce;
  }
  for (let p = pos; p < base.length; p++) out.push(base[p]);
  return { lines: out, conflicts };
}

  /* ---------- 1. Git object hashes (blob) and bit avalanche ---------- */
  Viz.register('hash1', function (root) {
    let text = 'hello\n';
    const bits = hex => hex.split('').map(ch => parseInt(ch, 16).toString(2).padStart(4, '0')).join('');
    const variant = t => t.length ? String.fromCharCode(t.charCodeAt(0) ^ 1) + t.slice(1) : 'x';
    const ta = el('textarea'); ta.rows = 3; ta.value = text; ta.setAttribute('aria-label', 'Nội dung file'); ta.style.cssText = 'width:100%;font:13px ui-monospace,Menlo,Consolas,monospace;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);margin:6px 0';
    root.appendChild(ta);
    ta.addEventListener('input', () => { text = ta.value; update(); });
    const view = Viz.mount(root, {
      aspect: 0.2, minH: 120, label: 'Các bit khác nhau giữa hai mã băm SHA-1',
      draw(ctx, W, H, c) {
        const a = bits(gitHash('blob', text)), b = bits(gitHash('blob', variant(text))), cols = 40, rows = 4, cs = Math.min((W - 20) / cols, (H - 8) / rows);
        for (let i = 0; i < 160; i++) { const x = 10 + (i % cols) * cs, y = 4 + Math.floor(i / cols) * cs; ctx.fillStyle = a[i] === b[i] ? Viz.rgba(c.muted, 0.25) : c.b; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
      }
    });
    const out = U.out(root);
    function update() {
      const t2 = variant(text), h1 = gitHash('blob', text), h2 = gitHash('blob', t2), a = bits(h1), b = bits(h2); let d = 0; for (let i = 0; i < 160; i++) if (a[i] !== b[i]) d++;
      const len = enc(text).length, esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '⏎');
      out.innerHTML = 'Đối tượng = <code>blob ' + len + '\0</code> + nội dung ⇒ SHA-1 = <b><code>' + h1 + '</code></b> (dạng ngắn <code>' + h1.slice(0, 7) + '</code>).<br>Đổi ký tự đầu thành “' + esc(t2.slice(0, 1)) + '” ⇒ <code>' + h2 + '</code>. Số bit khác nhau: <b>' + d + '/160</b> (ô cam trên hình; trung bình kỳ vọng ≈ 80 nếu mã băm hoạt động như hàm ngẫu nhiên). Chỉ một ký tự đổi mà gần một nửa số bit đổi theo: đó là “hiệu ứng tuyết lở”.';
      view.redraw();
    }
    update();
  });

  /* ---------- 2. Commit chain: rewriting history changes every descendant ---------- */
  Viz.register('chain1', function (root) {
    const ET = '4b825dc642cb6eb9a060e54bf8d69288fbee4904', ORIG = ['Khoi tao', 'Them du lieu', 'Huan luyen baseline', 'Sua loi chuan hoa'];
    const msgs = ORIG.slice();
    function chain(ms) { let p = null; return ms.map(m => { const body = 'tree ' + ET + '\n' + (p ? 'parent ' + p + '\n' : '') + 'author Ten Cua Ban <ban@example.com> 1700000000 +0000\ncommitter Ten Cua Ban <ban@example.com> 1700000000 +0000\n\n' + m + '\n'; p = gitHash('commit', body); return p; }); }
    const base = chain(ORIG), table = el('div'); table.style.overflowX = 'auto'; root.appendChild(table);
    const inputs = []; const r = U.row(root); r.appendChild(el('span', 'viz-lbl', 'Sửa thông điệp từng commit:')); r.lastChild.style.fontSize = '.88rem';
    msgs.forEach((m, i) => { const inp = el('input'); inp.type = 'text'; inp.value = m; inp.setAttribute('aria-label', 'Thông điệp commit ' + (i + 1)); inp.style.cssText = 'flex:1 1 150px;min-width:130px'; inp.addEventListener('input', () => { msgs[i] = inp.value; update(); }); r.appendChild(inp); inputs.push(inp); });
    U.button(root.appendChild(el('div', 'viz-row')), 'Khôi phục', () => { ORIG.forEach((m, i) => { msgs[i] = m; inputs[i].value = m; }); update(); });
    const out = U.out(root);
    function update() {
      const cur = chain(msgs); let h = '<table><thead><tr><th>#</th><th>Thông điệp</th><th>Cha</th><th>SHA-1 hiện tại (cùng cây, tác giả, giờ)</th><th></th></tr></thead><tbody>', n = 0;
      cur.forEach((x, i) => { const ch = x !== base[i]; if (ch) n++; h += '<tr><td>' + (i + 1) + '</td><td>' + msgs[i].replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</td><td>' + (i ? '<code>' + cur[i - 1].slice(0, 7) + '</code>' : '—') + '</td><td><code>' + x.slice(0, 12) + '…</code></td><td>' + (ch ? '<b style="color:var(--c2)">đã đổi</b>' : '<span style="color:var(--muted)">như gốc</span>') + '</td></tr>'; });
      table.innerHTML = h + '</tbody></table>';
      out.innerHTML = n ? 'Có <b>' + n + '</b> commit đổi mã băm. Mỗi commit chứa mã băm của commit cha, nên sửa một commit cũ làm đổi mã băm của <b>mọi commit sau nó</b>. Đó là lý do <code>rebase</code>, <code>commit --amend</code> và <code>reset</code> “viết lại lịch sử”: thực chất tạo commit mới, và là lý do không nên làm điều này trên nhánh người khác đã kéo về.' : 'Chuỗi giống hệt gốc. Hãy sửa thông điệp của commit 2 hoặc 3 và quan sát các commit phía sau.';
    }
    update();
  });

  /* ---------- 3. Three-way merge ---------- */
  Viz.register('merge3', function (root) {
    const PRESETS = {
      far: ['lr = 0.001\nepochs = 10\nbatch = 32\nseed = 1\noptimizer = sgd\nwd = 0', 'lr = 0.01\nepochs = 10\nbatch = 32\nseed = 1\noptimizer = sgd\nwd = 0', 'lr = 0.001\nepochs = 10\nbatch = 32\nseed = 1\noptimizer = adam\nwd = 0'],
      adj: ['lr = 0.001\nepochs = 10\nbatch = 32', 'lr = 0.01\nepochs = 10\nbatch = 32', 'lr = 0.001\nepochs = 20\nbatch = 32'],
      same: ['lr = 0.001\nepochs = 10\nbatch = 32', 'lr = 0.01\nepochs = 10\nbatch = 32', 'lr = 0.0003\nepochs = 10\nbatch = 32'],
      equal: ['a\nb\nc', 'a\nB\nc', 'a\nB\nc'],
      delmod: ['a\nb\nc\nd', 'a\nc\nd', 'a\nB\nc\nd']
    };
    const mk = (label) => { const w = el('div'); const l = el('div', 'viz-help', label); l.style.padding = '0 0 3px'; w.appendChild(l); const t = el('textarea'); t.rows = 6; t.spellcheck = false; t.setAttribute('aria-label', label); t.style.cssText = 'width:100%;font:12.5px ui-monospace,Menlo,Consolas,monospace;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);resize:vertical'; w.appendChild(t); return { w, t }; };
    const r0 = U.row(root);
    U.select(r0, 'Tình huống', [['far', 'Hai bên sửa hai dòng xa nhau'], ['adj', 'Hai bên sửa hai dòng liền kề'], ['same', 'Hai bên sửa cùng một dòng'], ['equal', 'Hai bên sửa giống hệt nhau'], ['delmod', 'Một bên xóa dòng, bên kia sửa dòng đó']], v => { load(v); });
    const grid = el('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:8px 0'; root.appendChild(grid);
    const B = mk('Tổ tiên chung (base)'), O = mk('Nhánh của bạn (ours)'), T = mk('Nhánh được gộp (theirs)'); [B, O, T].forEach(x => { grid.appendChild(x.w); x.t.addEventListener('input', update); });
    const res = el('pre'); res.style.cssText = 'margin:6px 0;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);font:12.5px ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-x:auto'; root.appendChild(res);
    const out = U.out(root);
    function load(k) { [B, O, T].forEach((x, i) => { x.t.value = PRESETS[k][i]; }); update(); }
    function update() {
      const lines = t => t.value.replace(/\n+$/, '').split('\n'), r = diff3(lines(B.t), lines(O.t), lines(T.t));
      res.textContent = r.lines.join('\n');
      out.innerHTML = r.conflicts ? '<b>' + r.conflicts + ' xung đột</b>: Git dừng lại và đánh dấu; bạn chọn nội dung đúng, xóa các dòng <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> rồi <code>git add</code>. ' : '<b>Gộp sạch</b>, không xung đột. ';
      out.innerHTML += 'Quy tắc: với mỗi vùng, nếu <i>chỉ một bên</i> khác base thì lấy bên đó; nếu cả hai khác base theo cách khác nhau thì xung đột. Hai thay đổi <i>liền kề nhau</i> (không có dòng chưa đổi ở giữa) cũng bị coi là xung đột, đúng như <code>git merge-file</code> thực hiện.';
    }
    load('adj');
  });

  /* ---------- 4. Advanced Git simulator: rebase, reset, cherry-pick, revert, reflog ---------- */
  Viz.register('git2', function (root) {
    let commits, branches, lane, head, nextLane, nextId, logLines, reflog;
    function init() {
      commits = [{ id: 'c0', parents: [], lane: 0, msg: 'Initial commit' }]; branches = { main: 'c0' }; lane = { main: 0 }; head = 'main'; nextLane = 1; nextId = 1;
      reflog = [{ id: 'c0', what: 'commit (initial): Initial commit' }]; logLines = ['# Repo mới với 1 commit trên nhánh main.'];
    }
    const byId = id => commits.find(c => c.id === id);
    const anc = id => { const s = new Set(), st = [id]; while (st.length) { const x = st.pop(); if (s.has(x)) continue; s.add(x); st.push(...byId(x).parents); } return s; };
    const isAncestor = (a, b) => anc(b).has(a);
    function newCommit(parents, msg, what) { const c = { id: 'c' + nextId++, parents, lane: lane[head], msg }; commits.push(c); branches[head] = c.id; reflog.push({ id: c.id, what }); return c; }
    function say(cmd, out) { logLines.push('$ ' + cmd); if (out) logLines.push(out); if (logLines.length > 80) logLines = logLines.slice(-80); }
    function resolve(ref) {
      if (!ref) return null; let m = /^(HEAD|[\w./-]+?)(?:~(\d+))?$/.exec(ref); if (!m) return null; let id = m[1] === 'HEAD' ? branches[head] : branches[m[1]] || (byId(m[1]) ? m[1] : null); if (!id) return null;
      for (let i = 0; i < +(m[2] || 0); i++) { const p = byId(id).parents[0]; if (!p) return null; id = p; } return id;
    }
    function mergeBase(a, b) { const A = anc(a), B = anc(b); for (let i = commits.length - 1; i >= 0; i--) if (A.has(commits[i].id) && B.has(commits[i].id)) return commits[i].id; return null; }
    function exec(raw) {
      const cmd = raw.trim().replace(/\s+/g, ' '); if (!cmd) return; const m = /^git (\w[\w-]*)(.*)$/.exec(cmd);
      if (!m) { say(cmd, 'Mô phỏng chỉ hiểu lệnh bắt đầu bằng "git": commit, branch, switch, merge, rebase, reset, cherry-pick, revert, reflog, log.'); return; }
      const sub = m[1], args = m[2].trim();
      if (sub === 'commit') { const mm = /-m\s+(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(args), msg = mm ? (mm[1] || mm[2] || mm[3]) : 'commit ' + nextId, c = newCommit([branches[head]], msg, 'commit: ' + msg); say(cmd, '[' + head + ' ' + c.id + '] ' + msg); }
      else if (sub === 'branch') { if (!/^[\w./-]+$/.test(args)) { say(cmd, 'Cú pháp: git branch <tên>'); return; } if (branches[args]) { say(cmd, "fatal: nhánh '" + args + "' đã tồn tại"); return; } branches[args] = branches[head]; lane[args] = nextLane++; say(cmd, "Đã tạo nhánh '" + args + "' tại " + branches[head] + '.'); }
      else if (sub === 'switch' || sub === 'checkout') { const create = /^(-c|-b) /.test(args), name = args.replace(/^(-c|-b) /, ''); if (!/^[\w./-]+$/.test(name)) { say(cmd, 'Cú pháp: git ' + sub + ' [-c] <tên>'); return; } if (create) { if (branches[name]) { say(cmd, "fatal: nhánh '" + name + "' đã tồn tại"); return; } branches[name] = branches[head]; lane[name] = nextLane++; } else if (!branches[name]) { say(cmd, "fatal: không có nhánh '" + name + "'"); return; } head = name; reflog.push({ id: branches[head], what: 'checkout: moving to ' + name }); say(cmd, "Đã chuyển sang nhánh '" + name + "'"); }
      else if (sub === 'merge') {
        const name = args; if (!branches[name] || name === head) { say(cmd, name === head ? 'Không thể gộp nhánh vào chính nó.' : "merge: không có nhánh '" + name + "'"); return; }
        const cur = branches[head], tgt = branches[name]; if (isAncestor(tgt, cur)) { say(cmd, 'Already up to date.'); return; }
        if (isAncestor(cur, tgt)) { branches[head] = tgt; reflog.push({ id: tgt, what: 'merge ' + name + ': Fast-forward' }); say(cmd, 'Fast-forward: ' + head + ' trượt tới ' + tgt + ' (không tạo commit mới).'); return; }
        const c = newCommit([cur, tgt], "Merge branch '" + name + "' into " + head, "merge " + name + ": Merge made by the 'ort' strategy."); say(cmd, 'Merge commit ' + c.id + ' có 2 commit cha: ' + cur + ' và ' + tgt + '.');
      } else if (sub === 'rebase') {
        const name = args; if (!branches[name] || name === head) { say(cmd, 'Cú pháp: git rebase <nhánh-đích> (khác nhánh hiện tại)'); return; }
        const cur = branches[head], tgt = branches[name]; if (isAncestor(tgt, cur)) { say(cmd, 'Current branch ' + head + ' is up to date.'); return; }
        if (isAncestor(cur, tgt)) { branches[head] = tgt; reflog.push({ id: tgt, what: 'rebase (finish): fast-forward' }); say(cmd, 'Fast-forward: không có commit nào cần phát lại.'); return; }
        const mb = mergeBase(cur, tgt), seq = []; let x = cur; while (x && x !== mb) { const cm = byId(x); if (cm.parents.length > 1) { say(cmd, 'Mô phỏng chưa hỗ trợ rebase qua merge commit.'); return; } seq.unshift(cm); x = cm.parents[0]; }
        let parent = tgt; const made = []; seq.forEach(cm => { const c = { id: 'c' + nextId++, parents: [parent], lane: lane[head], msg: cm.msg }; commits.push(c); parent = c.id; made.push(cm.id + '→' + c.id); reflog.push({ id: c.id, what: 'rebase (pick): ' + cm.msg }); });
        branches[head] = parent; reflog.push({ id: parent, what: 'rebase (finish): ' + head + ' onto ' + tgt }); say(cmd, 'Phát lại ' + seq.length + ' commit lên ' + name + ': ' + made.join(', ') + '. Commit cũ (mờ trên hình) vẫn còn trong reflog nhưng không nhánh nào trỏ tới.');
      } else if (sub === 'reset') {
        const mm = /^(--soft|--mixed|--hard)?\s*(\S+)$/.exec(args), mode = (mm && mm[1]) || '--mixed', t = mm && resolve(mm[2]); if (!t) { say(cmd, 'Cú pháp: git reset [--soft|--mixed|--hard] <commit|HEAD~N|nhánh>'); return; }
        const was = branches[head]; branches[head] = t; reflog.push({ id: t, what: 'reset: moving to ' + mm[2] });
        const note = mode === '--soft' ? 'Chỉ di chuyển nhánh. Staging và thư mục làm việc giữ nguyên: thay đổi của các commit bị bỏ nằm sẵn trong staging.' : mode === '--hard' ? 'Di chuyển nhánh, đặt lại staging và thư mục làm việc: MỌI thay đổi chưa commit bị mất.' : 'Di chuyển nhánh và đặt lại staging; thay đổi được giữ trong thư mục làm việc (chưa staged).';
        say(cmd, head + ': ' + was + ' → ' + t + '. ' + note + ' Dùng git reflog để tìm lại ' + was + '.');
      } else if (sub === 'cherry-pick') { const t = resolve(args); if (!t) { say(cmd, 'Cú pháp: git cherry-pick <commit>'); return; } const c = newCommit([branches[head]], byId(t).msg, 'cherry-pick: ' + byId(t).msg); say(cmd, 'Đã sao chép thay đổi của ' + t + ' thành commit mới ' + c.id + ' (cha: ' + c.parents[0] + ').'); }
      else if (sub === 'revert') { const t = resolve(args); if (!t) { say(cmd, 'Cú pháp: git revert <commit>'); return; } const c = newCommit([branches[head]], 'Revert "' + byId(t).msg + '"', 'revert: ' + byId(t).msg); say(cmd, 'Tạo commit đảo ngược ' + c.id + '; lịch sử cũ giữ nguyên (an toàn cho nhánh đã chia sẻ).'); }
      else if (sub === 'reflog') { say(cmd, reflog.slice().reverse().map((e, i) => e.id + ' HEAD@{' + i + '}: ' + e.what).join('\n')); }
      else if (sub === 'log') { const s = anc(branches[head]), out = commits.filter(c => s.has(c.id)).reverse().map(c => c.id + ' ' + c.msg).join('\n'); say(cmd, out); }
      else say(cmd, "Lệnh 'git " + sub + "' chưa được mô phỏng.");
    }
    function run(raw) { exec(raw); render(); }
    init();
    const view = Viz.mount(root, {
      aspect: 0.34, minH: 230, label: 'Đồ thị commit; commit mờ không còn nhánh nào trỏ tới',
      draw(ctx, W, H, c) {
        const padX = 34, padY = 46, n = commits.length, lanes = Math.max(1, nextLane), dx = n > 1 ? Math.min(70, (W - 2 * padX) / (n - 1)) : 0, dy = Math.min(60, (H - padY - 24) / Math.max(1, lanes - 1 || 1));
        const idx = {}; commits.forEach((cm, i) => { idx[cm.id] = i; }); const pos = cm => ({ x: padX + idx[cm.id] * dx, y: padY + cm.lane * dy }), colors = [c.a, c.b, c.c, c.d];
        const live = new Set(); Object.values(branches).forEach(t => anc(t).forEach(x => live.add(x)));
        commits.forEach(cm => cm.parents.forEach(pid => { const p = pos(cm), q = pos(byId(pid)); ctx.strokeStyle = colors[cm.lane % 4]; ctx.lineWidth = 3; ctx.globalAlpha = live.has(cm.id) ? 1 : 0.28; ctx.beginPath(); ctx.moveTo(q.x, q.y); if (q.y !== p.y) ctx.bezierCurveTo(q.x + dx * .5, q.y, p.x - dx * .5, p.y, p.x, p.y); else ctx.lineTo(p.x, p.y); ctx.stroke(); }));
        ctx.globalAlpha = 1; const tips = {}; Object.keys(branches).forEach(b => { (tips[branches[b]] = tips[branches[b]] || []).push(b); }); ctx.textAlign = 'center';
        commits.forEach(cm => {
          const p = pos(cm), al = live.has(cm.id) ? 1 : 0.3; ctx.globalAlpha = al; ctx.fillStyle = colors[cm.lane % 4]; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill(); ctx.strokeStyle = c.bg; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = c.bg; ctx.textBaseline = 'middle'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.fillText(cm.id.slice(1), p.x, p.y + .5); ctx.globalAlpha = 1;
          const bs = tips[cm.id]; if (bs) bs.forEach((b, i) => { const y = p.y - 20 - i * 17, isHead = b === head, label = (isHead ? 'HEAD → ' : '') + b; ctx.font = (isHead ? 'bold ' : '') + '11px system-ui, sans-serif'; const w = ctx.measureText(label).width + 12; ctx.fillStyle = isHead ? c.fg : c.bg; ctx.strokeStyle = isHead ? c.fg : c.border; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - w / 2, y - 8, w, 16, 5) : ctx.rect(p.x - w / 2, y - 8, w, 16); ctx.fill(); ctx.stroke(); ctx.fillStyle = isHead ? c.bg : c.fg; ctx.textBaseline = 'middle'; ctx.fillText(label, p.x, y + .5); });
        });
      }
    });
    const r1 = U.row(root); const inp = el('input'); inp.type = 'text'; inp.placeholder = 'vd: git rebase main'; inp.style.flex = '1 1 240px'; inp.setAttribute('aria-label', 'Nhập lệnh git'); r1.appendChild(inp); U.button(r1, 'Chạy', () => submit(), true);
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') submit(); }); function submit() { run(inp.value); inp.value = ''; inp.focus(); }
    const r2 = U.row(root); [['git commit'], ['git switch -c feature'], ['git switch main'], ['git merge feature'], ['git rebase main'], ['git reflog'], ['git log']].forEach(([cmd]) => U.button(r2, cmd, () => run(cmd)));
    const r3 = U.row(root);
    U.button(r3, 'Kịch bản: rebase rồi fast-forward', () => { init(); ['git commit -m "A"', 'git switch -c feature', 'git commit -m "F1"', 'git commit -m "F2"', 'git switch main', 'git commit -m "B"', 'git switch feature', 'git rebase main', 'git switch main', 'git merge feature', 'git log'].forEach(exec); render(); });
    U.button(r3, 'Kịch bản: reset --hard rồi cứu bằng reflog', () => { init(); ['git commit -m "A"', 'git commit -m "B"', 'git commit -m "C"', 'git reset --hard HEAD~2', 'git reflog', 'git reset --hard c3', 'git log'].forEach(exec); render(); });
    U.button(r3, 'Kịch bản: cherry-pick và revert', () => { init(); ['git switch -c hotfix', 'git commit -m "sửa lỗi NaN"', 'git switch main', 'git commit -m "tính năng"', 'git cherry-pick c1', 'git revert c2', 'git log'].forEach(exec); render(); });
    U.button(r3, 'Đặt lại', () => { init(); render(); });
    const log = el('div', 'viz-log'); log.setAttribute('aria-label', 'Nhật ký lệnh'); root.appendChild(log);
    function render() { log.textContent = logLines.join('\n'); log.scrollTop = log.scrollHeight; view.redraw(); }
    render();
  });
})();
