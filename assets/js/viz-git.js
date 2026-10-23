/* Interactive Git simulator for the GitHub page */
(function () {
  'use strict';
  const { ui: U, el } = Viz;

  Viz.register('git1', function (root) {
    let commits, branches, lane, head, nextLane, logLines;

    function init() {
      commits = [{ id: 'c0', parents: [], lane: 0, msg: 'Initial commit' }];
      branches = { main: 'c0' }; lane = { main: 0 }; head = 'main'; nextLane = 1; logLines = ['# Repo mới với 1 commit trên nhánh main.'];
    }
    const byId = id => commits.find(c => c.id === id);
    function isAncestor(a, b) { // is a reachable from b?
      const seen = new Set(), st = [b];
      while (st.length) { const x = st.pop(); if (x === a) return true; if (seen.has(x)) continue; seen.add(x); st.push(...byId(x).parents); }
      return false;
    }
    function newCommit(parents, msg) {
      const c = { id: 'c' + commits.length, parents, lane: lane[head], msg }; commits.push(c); branches[head] = c.id; return c;
    }
    function say(cmd, out) { logLines.push('$ ' + cmd); if (out) logLines.push(out); if (logLines.length > 60) logLines = logLines.slice(-60); }

    function exec(raw) {
      const cmd = raw.trim().replace(/\s+/g, ' ');
      if (!cmd) return;
      const m = /^git (\w+)(.*)$/.exec(cmd);
      if (!m) { say(cmd, 'Mô phỏng này chỉ hiểu lệnh bắt đầu bằng "git": commit, branch, switch, checkout, merge, log.'); return; }
      const sub = m[1], args = m[2].trim();
      if (sub === 'commit') {
        const mm = /-m\s+(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(args);
        const msg = mm ? (mm[1] || mm[2] || mm[3]) : 'commit ' + commits.length;
        const c = newCommit([branches[head]], msg);
        say(cmd, '[' + head + ' ' + c.id + '] ' + msg);
      } else if (sub === 'branch') {
        const name = args;
        if (!/^[\w./-]+$/.test(name)) { say(cmd, 'Cú pháp: git branch <tên-nhánh>'); return; }
        if (branches[name]) { say(cmd, "fatal: nhánh '" + name + "' đã tồn tại"); return; }
        branches[name] = branches[head]; lane[name] = nextLane++; say(cmd, "Đã tạo nhánh '" + name + "' tại " + branches[head] + ' (chưa chuyển sang).');
      } else if (sub === 'switch' || sub === 'checkout') {
        const create = /^(-c|-b) /.test(args), name = args.replace(/^(-c|-b) /, '');
        if (!/^[\w./-]+$/.test(name)) { say(cmd, 'Cú pháp: git ' + sub + (sub === 'switch' ? ' [-c] ' : ' [-b] ') + '<tên-nhánh>'); return; }
        if (create) {
          if (branches[name]) { say(cmd, "fatal: nhánh '" + name + "' đã tồn tại"); return; }
          branches[name] = branches[head]; lane[name] = nextLane++;
        } else if (!branches[name]) { say(cmd, "fatal: không có nhánh '" + name + "'"); return; }
        head = name; say(cmd, "Đã chuyển sang nhánh '" + name + "'");
      } else if (sub === 'merge') {
        const name = args;
        if (!branches[name]) { say(cmd, "merge: không có nhánh '" + name + "'"); return; }
        if (name === head) { say(cmd, 'Không thể gộp nhánh vào chính nó.'); return; }
        const cur = branches[head], target = branches[name];
        if (isAncestor(target, cur)) { say(cmd, 'Already up to date.'); return; }
        if (isAncestor(cur, target)) { branches[head] = target; say(cmd, 'Fast-forward: ' + head + ' trượt tới ' + target + ' (không tạo commit mới).'); return; }
        const c = newCommit([cur, target], "Merge branch '" + name + "' into " + head);
        say(cmd, "Merge commit " + c.id + ' có 2 commit cha: ' + cur + ' và ' + target + '.');
      } else if (sub === 'log') {
        const seen = new Set(), st = [branches[head]];
        while (st.length) { const x = st.pop(); if (seen.has(x)) continue; seen.add(x); st.push(...byId(x).parents); }
        const out = commits.filter(c => seen.has(c.id)).reverse().map(c => c.id + ' ' + c.msg).join('\n');
        say(cmd, out);
      } else { say(cmd, "Lệnh 'git " + sub + "' chưa được mô phỏng."); }
    }
    function run(raw) { exec(raw); render(); }

    init();

    const view = Viz.mount(root, {
      aspect: 0.3, minH: 200, label: 'Đồ thị commit và nhánh',
      draw(ctx, W, H, c) {
        const padX = 36, padY = 46, n = commits.length;
        const lanes = Math.max(1, nextLane);
        const dx = n > 1 ? Math.min(84, (W - 2 * padX) / (n - 1)) : 0, dy = Math.min(56, (H - padY - 24) / Math.max(1, lanes - 1 || 1));
        const pos = cm => ({ x: padX + parseInt(cm.id.slice(1), 10) * dx, y: padY + cm.lane * dy });
        const laneColors = [c.a, c.b, c.c, c.d];
        ctx.lineWidth = 3;
        commits.forEach(cm => {
          const p = pos(cm);
          cm.parents.forEach((pid, idx) => {
            const q = pos(byId(pid)); ctx.strokeStyle = laneColors[(idx ? byId(pid).lane : cm.lane) % 4]; ctx.beginPath();
            ctx.moveTo(q.x, q.y); if (q.y !== p.y) ctx.bezierCurveTo(q.x + dx * .5, q.y, p.x - dx * .5, p.y, p.x, p.y); else ctx.lineTo(p.x, p.y); ctx.stroke();
          });
        });
        const tips = {}; Object.keys(branches).forEach(b => { (tips[branches[b]] = tips[branches[b]] || []).push(b); });
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
        commits.forEach(cm => {
          const p = pos(cm);
          ctx.fillStyle = laneColors[cm.lane % 4]; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill();
          ctx.strokeStyle = c.bg; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 3;
          ctx.fillStyle = c.bg; ctx.textBaseline = 'middle'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.fillText(cm.id.slice(1), p.x, p.y + .5);
          const bs = tips[cm.id]; if (bs) bs.forEach((b, i) => {
            const y = p.y - 20 - i * 17, isHead = b === head, label = (isHead ? 'HEAD → ' : '') + b;
            ctx.font = (isHead ? 'bold ' : '') + '11px system-ui, sans-serif';
            const w = ctx.measureText(label).width + 12;
            ctx.fillStyle = isHead ? c.fg : c.bg; ctx.strokeStyle = isHead ? c.fg : c.border; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - w / 2, y - 8, w, 16, 5) : ctx.rect(p.x - w / 2, y - 8, w, 16); ctx.fill(); ctx.stroke();
            ctx.fillStyle = isHead ? c.bg : c.fg; ctx.textBaseline = 'middle'; ctx.fillText(label, p.x, y + .5);
          });
        });
      }
    });

    const r1 = U.row(root);
    const inp = el('input'); inp.type = 'text'; inp.placeholder = 'vd: git commit -m "thêm tính năng"'; inp.style.flex = '1 1 240px'; inp.setAttribute('aria-label', 'Nhập lệnh git');
    r1.appendChild(inp);
    U.button(r1, 'Chạy', () => submit(), true);
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') submit(); });
    function submit() { run(inp.value); inp.value = ''; inp.focus(); }
    const r2 = U.row(root);
    [['git commit'], ['git switch -c feature'], ['git switch main'], ['git merge feature'], ['git log']].forEach(([cmd]) => U.button(r2, cmd, () => run(cmd)));
    const r3 = U.row(root);
    U.button(r3, 'Kịch bản mẫu: nhánh rẽ rồi gộp', () => {
      init(); ['git commit', 'git switch -c feature', 'git commit', 'git commit', 'git switch main', 'git commit', 'git merge feature'].forEach(run);
    });
    U.button(r3, 'Kịch bản mẫu: fast-forward', () => {
      init(); ['git commit', 'git switch -c feature', 'git commit', 'git commit', 'git switch main', 'git merge feature'].forEach(run);
    });
    U.button(r3, 'Đặt lại', () => { init(); render(); });
    const log = el('div', 'viz-log'); log.setAttribute('aria-label', 'Nhật ký lệnh'); root.appendChild(log);

    function render() {
      log.textContent = logLines.join('\n'); log.scrollTop = log.scrollHeight; view.redraw();
    }
    render();
  });
})();
