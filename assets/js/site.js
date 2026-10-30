/* Self-Learning AI — core: layout, theme, search, TOC, code blocks, math, viz framework */
(function () {
  'use strict';

  // lesson: true marks pages that take part in the previous/next lesson links.
  var NAV = [
    { id: 'home', href: 'index.html', label: 'Trang chủ' },
    { id: 'guide', href: 'huong-dan.html', label: 'Cách dùng' },
    { id: 'github', href: 'github.html', label: 'GitHub', lesson: true },
    { id: 'ml', href: 'machine-learning.html', label: 'Machine Learning', lesson: true },
    { id: 'dl', href: 'deep-learning.html', label: 'Deep Learning', lesson: true },
    { id: 'cv', href: 'computer-vision.html', label: 'Computer Vision', lesson: true },
    { id: 'nlp', href: 'nlp.html', label: 'NLP', lesson: true },
    { id: 'llm', href: 'llm.html', label: 'LLM', lesson: true },
    { id: 'agent', href: 'agentic-ai.html', label: 'Agentic AI', lesson: true },
    { id: 'mlops', href: 'mlops.html', label: 'MLOps', lesson: true },
    { id: 'combo', href: 'ket-hop-cong-cu-ai.html', label: 'Kết hợp AI', lesson: true },
    { id: 'cyber', href: 'cyber-security.html', label: 'An ninh mạng', lesson: true },
    { id: 'quant', href: 'quant-trading.html', label: 'Quant Trading', lesson: true }
  ];
  var PAGE = document.body.getAttribute('data-page') || 'home';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function norm(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }

  /* ---------- Theme ---------- */
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function setTheme(t, persist) {
    document.documentElement.setAttribute('data-theme', t);
    if (persist) store('theme', t);
    var b = document.getElementById('theme-btn');
    if (b) {
      b.setAttribute('aria-label', t === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
      b.firstChild.textContent = t === 'dark' ? '☀' : '☾';
    }
    window.dispatchEvent(new Event('themechange'));
  }

  /* ---------- Header / footer ---------- */
  function buildHeader() {
    var host = document.getElementById('site-header');
    if (!host) return;
    // The brand link already goes home, so the home page has no tab of its own.
    var links = NAV.filter(function (n) { return n.id !== 'home'; }).map(function (n) {
      return '<a href="' + n.href + '"' + (n.id === PAGE ? ' aria-current="page"' : '') + '>' + n.label + '</a>';
    }).join('');
    host.className = 'site-header';
    host.innerHTML =
      '<div class="header-inner">' +
      '<a class="brand" href="index.html"' + (PAGE === 'home' ? ' aria-current="page"' : '') + '>Tự học <span>AI</span></a>' +
      '<nav class="nav-tabs" aria-label="Chủ đề">' + links + '</nav>' +
      '<div class="header-actions">' +
      '<button class="icon-btn" id="search-btn" type="button" aria-label="Tìm kiếm (phím /)">⌕ <span class="btn-text">Tìm kiếm</span> <kbd>/</kbd></button>' +
      '<button class="icon-btn" id="theme-btn" type="button"><span aria-hidden="true">☾</span></button>' +
      '</div></div>';
    document.getElementById('theme-btn').addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
    setTheme(currentTheme(), false);
    var active = host.querySelector('[aria-current="page"]');
    if (active && active.scrollIntoView) { try { active.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { } }
  }

  function buildFooter() {
    var host = document.getElementById('site-footer');
    if (!host) return;
    host.className = 'site-footer';
    host.innerHTML = '<div class="inner">' +
      '<p><strong>Lưu ý về độ tin cậy:</strong> nội dung được soạn với sự hỗ trợ của AI để phục vụ tự học. ' +
      'Công thức, số liệu và liên kết nên được đối chiếu với nguồn gốc ở cuối mỗi bài. ' +
      'Các chủ đề LLM và Agentic AI thay đổi rất nhanh, hãy kiểm tra lại tài liệu chính thức mới nhất.</p>' +
      '<p>Các minh họa tương tác chạy hoàn toàn trong trình duyệt của bạn; dữ liệu trong đó là dữ liệu đồ chơi (toy) để hiểu cơ chế.</p>' +
      '</div>';
  }

  function buildPageNav() {
    var content = document.querySelector('.content');
    var lessons = NAV.filter(function (n) { return n.lesson; });
    var i = lessons.findIndex(function (n) { return n.id === PAGE; });
    if (!content || i < 0) return;
    var prev = lessons[i - 1], next = lessons[i + 1];
    var nav = el('nav', 'page-nav'); nav.setAttribute('aria-label', 'Bài trước / bài sau');
    nav.innerHTML =
      (prev ? '<a class="prev" href="' + prev.href + '"><small>← Trước</small>' + prev.label + '</a>' : '<span></span>') +
      (next ? '<a class="next" href="' + next.href + '"><small>Tiếp theo →</small>' + next.label + '</a>' : '');
    content.appendChild(nav);
  }

  /* ---------- Headings: anchors + TOC ---------- */
  function buildToc() {
    var heads = Array.prototype.slice.call(document.querySelectorAll('.content h2[id], .content h3[id]'));
    heads.forEach(function (h) {
      var a = el('a', 'anchor', '#'); a.href = '#' + h.id; a.setAttribute('aria-label', 'Liên kết đến mục này');
      h.appendChild(a);
    });
    var toc = document.getElementById('toc');
    if (!toc) return;
    if (heads.length < 3) { toc.style.display = 'none'; return; }
    var html = '<h2>Mục lục</h2><ul>' + heads.map(function (h) {
      var t = h.childNodes[0].textContent;
      return '<li class="' + (h.tagName === 'H3' ? 'sub' : '') + '"><a href="#' + h.id + '">' + esc(t) + '</a></li>';
    }).join('') + '</ul>';
    toc.innerHTML = html;
    var links = {};
    toc.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          if (links[en.target.id]) links[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-72px 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  /* ---------- Code blocks ---------- */
  var KW = {
    python: 'and as assert async await break class continue def del elif else except finally for from global if import in is lambda None nonlocal not or pass raise return try while with yield True False self',
    js: 'const let var function return if else for while new class import from export async await true false null undefined of in this typeof'
  };
  function highlight(code, lang) {
    var re, kwset = null;
    if (lang === 'python') {
      re = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|\b[rfbRFB]{0,2}"(?:\\.|[^"\\\n])*"|\b[rfbRFB]{0,2}'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)/g;
      kwset = KW.python;
    } else if (lang === 'js' || lang === 'json') {
      re = /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
      kwset = KW.js;
    } else if (lang === 'bash') {
      re = /(^|\s)(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^'\n]*')|(\s--?[A-Za-z][\w-]*)|(^|\n)(\s*[A-Za-z_./-]+)/g;
      return code.replace(re, function (m, p1, com, str, flag, nl, cmd) {
        if (com) return esc(p1) + '<span class="tok-com">' + esc(com) + '</span>';
        if (str) return '<span class="tok-str">' + esc(str) + '</span>';
        if (flag) return '<span class="tok-num">' + esc(flag) + '</span>';
        if (cmd != null) return esc(nl) + '<span class="tok-fn">' + esc(cmd) + '</span>';
        return esc(m);
      });
    } else if (lang === 'yaml') {
      re = /(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'[^'\n]*')|(^[ \t-]*[\w.\-/]+)(?=:)/gm;
      return code.replace(re, function (m, com, str, key) {
        if (com) return '<span class="tok-com">' + esc(com) + '</span>';
        if (str) return '<span class="tok-str">' + esc(str) + '</span>';
        if (key) return '<span class="tok-kw">' + esc(key) + '</span>';
        return esc(m);
      });
    } else {
      return esc(code);
    }
    var kwre = new RegExp('^(?:' + kwset.split(' ').join('|') + ')$');
    var out = '', last = 0, m;
    while ((m = re.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      last = re.lastIndex;
      if (m[1]) out += '<span class="tok-com">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-str">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-num">' + esc(m[3]) + '</span>';
      else if (m[4]) out += kwre.test(m[4]) ? '<span class="tok-kw">' + esc(m[4]) + '</span>' : '<span class="tok-fn">' + esc(m[4]) + '</span>';
      else if (m[5]) out += kwre.test(m[5]) ? '<span class="tok-kw">' + esc(m[5]) + '</span>' : esc(m[5]);
      else out += esc(m[0]);
    }
    return out + esc(code.slice(last));
  }

  function buildCode() {
    document.querySelectorAll('.content pre > code').forEach(function (code) {
      var pre = code.parentNode;
      var m = /language-(\w+)/.exec(code.className);
      var lang = m ? m[1] : 'text';
      var raw = code.textContent.replace(/^\n+|\s+$/g, '');
      code.innerHTML = highlight(raw, lang);
      var wrap = el('div', 'codeblock');
      var head = el('div', 'codeblock-head');
      head.appendChild(el('span', '', lang === 'text' ? 'text' : lang));
      var btn = el('button', '', 'Sao chép'); btn.type = 'button';
      btn.addEventListener('click', function () {
        var done = function () { btn.textContent = 'Đã chép ✓'; setTimeout(function () { btn.textContent = 'Sao chép'; }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(raw).then(done, function () { });
      });
      head.appendChild(btn);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head); wrap.appendChild(pre);
      pre.tabIndex = 0;
    });
  }

  /* ---------- Math ---------- */
  function buildMath() {
    if (typeof window.renderMathInElement !== 'function') return;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    });
  }

  /* ---------- Search ---------- */
  var searchState = { open: false, sel: 0, results: [] };
  function buildSearch() {
    var ov = el('div', 'search-overlay'); ov.id = 'search-overlay';
    ov.innerHTML = '<div class="search-box" role="dialog" aria-modal="true" aria-label="Tìm kiếm bài học">' +
      '<input id="search-input" type="search" autocomplete="off" placeholder="Tìm: gradient descent, attention, git merge, ReAct…" aria-label="Từ khóa tìm kiếm">' +
      '<ul class="search-results" id="search-results"></ul></div>';
    document.body.appendChild(ov);
    var input = document.getElementById('search-input');
    var list = document.getElementById('search-results');
    var idx = (window.SEARCH_INDEX || []).map(function (e) {
      return { e: e, nt: norm(e.t), nx: norm(e.x || '') };
    });

    function render() {
      list.innerHTML = '';
      var q = norm(input.value).trim();
      if (!q) { list.innerHTML = '<li class="search-empty">Gõ từ khóa để tìm trong tất cả bài học (không cần gõ dấu).</li>'; searchState.results = []; return; }
      var toks = q.split(/\s+/);
      var res = [];
      idx.forEach(function (it) {
        var score = 0;
        for (var i = 0; i < toks.length; i++) {
          var t = toks[i], inT = it.nt.indexOf(t), inX = it.nx.indexOf(t);
          if (inT < 0 && inX < 0) return;
          if (inT >= 0) score += inT === 0 ? 8 : 5;
          if (inX >= 0) score += 1;
        }
        res.push({ it: it, score: score });
      });
      res.sort(function (a, b) { return b.score - a.score; });
      res = res.slice(0, 8);
      searchState.results = res; searchState.sel = 0;
      if (!res.length) { list.innerHTML = '<li class="search-empty">Không tìm thấy kết quả cho “' + esc(input.value) + '”.</li>'; return; }
      res.forEach(function (r, i) {
        var e = r.it.e;
        var pos = r.it.nx.indexOf(toks[0]);
        var src = e.x || '';
        var from = Math.max(0, pos - 50), snip;
        if (pos >= 0) { if (from > 0) { var sp = src.indexOf(' ', from); from = sp >= 0 && sp < pos ? sp + 1 : from; } snip = src.slice(from, from + 160); }
        else snip = src.slice(0, 140);
        var li = el('li');
        li.innerHTML = '<a href="' + e.u + '" class="' + (i === 0 ? 'sel' : '') + '"><span class="r-page">' + esc(e.p) + '</span> ' +
          '<span class="r-title">' + esc(e.t) + '</span><span class="r-snip">' + esc(snip) + '…</span></a>';
        list.appendChild(li);
      });
    }
    function select(d) {
      var links = list.querySelectorAll('a'); if (!links.length) return;
      links[searchState.sel].classList.remove('sel');
      searchState.sel = (searchState.sel + d + links.length) % links.length;
      links[searchState.sel].classList.add('sel');
      links[searchState.sel].scrollIntoView({ block: 'nearest' });
    }
    function open() { searchState.open = true; ov.classList.add('open'); input.value = ''; render(); input.focus(); }
    function close() { searchState.open = false; ov.classList.remove('open'); }
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); select(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); select(-1); }
      else if (ev.key === 'Enter') { var a = list.querySelectorAll('a')[searchState.sel]; if (a) { close(); window.location.href = a.getAttribute('href'); } }
    });
    ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
    list.addEventListener('click', function (ev) { if (ev.target.closest('a')) close(); });
    document.getElementById('search-btn').addEventListener('click', open);
    document.addEventListener('keydown', function (ev) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      var typing = /INPUT|TEXTAREA|SELECT/.test(tag);
      if (ev.key === 'Escape' && searchState.open) { close(); }
      else if ((ev.key === '/' && !typing) || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k')) { ev.preventDefault(); open(); }
    });
  }

  /* ---------- Visualization framework ---------- */
  var Viz = window.Viz = { reg: {}, register: function (name, fn) { this.reg[name] = fn; } };
  var uid = 0;
  Viz.el = el;
  Viz.colors = function () {
    var cs = getComputedStyle(document.documentElement);
    function g(n) { return cs.getPropertyValue(n).trim(); }
    return { bg: g('--viz-bg'), fg: g('--text'), muted: g('--muted'), grid: g('--viz-grid'), border: g('--border'), a: g('--c1'), b: g('--c2'), c: g('--c3'), d: g('--c4') };
  };
  Viz.rgb = function (hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  Viz.rgba = function (hex, a) { var c = Viz.rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  Viz.rng = function (seed) { // mulberry32
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  Viz.randn = function (rng) { var u = 1 - rng(), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  Viz.hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  Viz.pos = function (ev, cv) { var r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };

  // Canvas that follows container width, handles HiDPI and theme changes.
  Viz.mount = function (parent, opts) {
    var stage = el('div', 'viz-stage'); parent.appendChild(stage);
    var cv = el('canvas'); stage.appendChild(cv);
    if (opts.label) cv.setAttribute('aria-label', opts.label);
    cv.setAttribute('role', 'img');
    var ctx = cv.getContext('2d');
    var self = { cv: cv, stage: stage, W: 0, H: 0 };
    function draw() {
      if (!self.W) return;
      var c = Viz.colors();
      ctx.save(); ctx.clearRect(0, 0, self.W, self.H);
      ctx.fillStyle = c.bg; ctx.fillRect(0, 0, self.W, self.H);
      opts.draw(ctx, self.W, self.H, c);
      ctx.restore();
    }
    function resize() {
      var w = Math.max(260, Math.floor(stage.clientWidth));
      var h = Math.round(w * (opts.aspect || 0.6));
      if (opts.minH && h < opts.minH) h = opts.minH;
      var dpr = window.devicePixelRatio || 1;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      self.W = w; self.H = h; draw();
    }
    self.redraw = draw;
    self.ctx = ctx;
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { if (Math.abs(stage.clientWidth - self.W) > 1) resize(); }).observe(stage);
    } else { window.addEventListener('resize', resize); }
    window.addEventListener('themechange', draw);
    resize();
    return self;
  };

  Viz.ui = {
    row: function (parent) { var d = el('div', 'viz-row'); parent.appendChild(d); return d; },
    slider: function (parent, label, min, max, step, val, fmt, cb) {
      var id = 'vz' + (++uid);
      var w = el('label', 'viz-ctl'); w.setAttribute('for', id);
      w.appendChild(el('span', 'viz-lbl', label));
      var inp = el('input'); inp.type = 'range'; inp.id = id; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
      var out = el('output'); out.setAttribute('for', id);
      fmt = fmt || function (v) { return String(v); };
      function upd() { out.textContent = fmt(parseFloat(inp.value)); }
      inp.addEventListener('input', function () { upd(); cb(parseFloat(inp.value)); });
      w.appendChild(inp); w.appendChild(out); parent.appendChild(w); upd();
      return { input: inp, get: function () { return parseFloat(inp.value); }, set: function (v) { inp.value = v; upd(); } };
    },
    button: function (parent, label, cb, primary) {
      var b = el('button', 'btn' + (primary ? ' primary' : ''), label); b.type = 'button';
      b.addEventListener('click', cb); parent.appendChild(b); return b;
    },
    select: function (parent, label, options, cb) {
      var id = 'vz' + (++uid);
      var w = el('label', 'viz-ctl'); w.setAttribute('for', id);
      w.appendChild(el('span', 'viz-lbl', label));
      var s = el('select'); s.id = id;
      options.forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; s.appendChild(op); });
      s.addEventListener('change', function () { cb(s.value); });
      w.appendChild(s); parent.appendChild(w);
      return s;
    },
    check: function (parent, label, checked, cb) {
      var id = 'vz' + (++uid);
      var w = el('label', 'viz-ctl'); w.setAttribute('for', id);
      var c = el('input'); c.type = 'checkbox'; c.id = id; c.checked = !!checked;
      c.addEventListener('change', function () { cb(c.checked); });
      w.appendChild(c); w.appendChild(el('span', '', label)); parent.appendChild(w);
      return c;
    },
    out: function (parent) { var d = el('div', 'viz-out'); d.setAttribute('role', 'status'); parent.appendChild(d); return d; }
  };

  function initViz() {
    document.querySelectorAll('.viz[data-viz]').forEach(function (host) {
      var name = host.getAttribute('data-viz');
      var fn = Viz.reg[name];
      var help = host.querySelector('.viz-help');
      var title = el('div', 'viz-title', host.getAttribute('data-title') || name);
      title.appendChild(el('span', 'viz-badge', 'Tương tác'));
      host.insertBefore(title, host.firstChild);
      var body = el('div', 'viz-body'); host.appendChild(body);
      if (!fn) { body.textContent = 'Không tải được minh họa “' + name + '”.'; return; }
      try { fn(body, host); } catch (err) { body.textContent = 'Lỗi khi khởi tạo minh họa: ' + err.message; if (window.console) console.error(err); }
    });
  }

  /* ---------- Shared SVG arrowhead used by static diagrams (.arrow) ---------- */
  function buildSvgDefs() {
    if (!document.querySelector('.diagram')) return;
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute';
    svg.innerHTML = '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path class="mk" d="M0 0L10 5L0 10z"/></marker></defs>';
    document.body.appendChild(svg);
  }

  /* ---------- Boot ---------- */
  function boot() {
    buildHeader();
    buildFooter();
    buildCode();
    buildToc();
    buildPageNav();
    buildMath();
    buildSvgDefs();
    buildSearch();
    initViz();
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) { if (!store('theme')) setTheme(e.matches ? 'dark' : 'light', false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
    // jump to hash after layout built (anchors/math may shift position)
    if (location.hash) {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 50);
    }
  }
  // Deferred scripts run while readyState is 'interactive' but before DOMContentLoaded, so wait for that event
  // to let the viz-*.js modules register themselves first.
  if (document.readyState === 'complete') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
