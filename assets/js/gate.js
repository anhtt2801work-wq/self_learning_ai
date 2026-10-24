/* Cổng mật khẩu phía trình duyệt.
 *
 * Quan trọng: đây là site tĩnh, nên cổng này chỉ ngăn người vào tình cờ. Mọi tệp (HTML, JS, chỉ mục tìm kiếm)
 * vẫn được máy chủ gửi cho bất kỳ ai yêu cầu; người biết xem mã nguồn hoặc mở repo công khai bỏ qua được nó.
 * Mật khẩu không nằm trong mã: chỉ có muối và mã băm PBKDF2-SHA256 trong assets/js/gate-config.js
 * (tạo bằng tools/set_password.py). Hãy dùng mật khẩu dài và không dùng lại ở nơi khác.
 *
 * Phiên mở khóa sống trong sessionStorage: hỏi lại khi đóng tab hoặc mở trình duyệt mới.
 */
(function () {
  'use strict';

  /* ---------- SHA-256 và PBKDF2-HMAC-SHA256 thuần JavaScript (chạy được cả khi mở bằng file://) ---------- */
  var K = new Uint32Array(64), H0 = new Uint32Array(8);
  (function () {
    var n = 2, found = 0;
    while (found < 64) {
      var prime = true;
      for (var d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
      if (prime) {
        if (found < 8) H0[found] = Math.floor((Math.sqrt(n) % 1) * 4294967296);
        K[found] = Math.floor((Math.cbrt(n) % 1) * 4294967296);
        found++;
      }
      n++;
    }
  })();
  var W = new Uint32Array(64);
  function compress(h, blk, off) {
    var i, a, b, c, d, e, f, g, hh, t1, t2, x, y;
    for (i = 0; i < 16; i++) W[i] = blk[off + i];
    for (i = 16; i < 64; i++) {
      x = W[i - 15]; y = W[i - 2];
      W[i] = (W[i - 16] + (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + W[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10))) >>> 0;
    }
    a = h[0]; b = h[1]; c = h[2]; d = h[3]; e = h[4]; f = h[5]; g = h[6]; hh = h[7];
    for (i = 0; i < 64; i++) {
      t1 = (hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  /* Băm tiếp từ một trạng thái đã xử lý prefixLen byte (bội số của 64), với phần còn lại là bytes. */
  function finish(state, prefixLen, bytes) {
    var h = new Uint32Array(state), total = prefixLen + bytes.length, padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes); padded[bytes.length] = 0x80;
    var bits = total * 8, n = padded.length;
    padded[n - 4] = (bits >>> 24) & 255; padded[n - 3] = (bits >>> 16) & 255; padded[n - 2] = (bits >>> 8) & 255; padded[n - 1] = bits & 255;
    padded[n - 5] = Math.floor(bits / 4294967296) & 255;
    var words = new Uint32Array(n / 4);
    for (var i = 0; i < words.length; i++) words[i] = ((padded[4 * i] << 24) | (padded[4 * i + 1] << 16) | (padded[4 * i + 2] << 8) | padded[4 * i + 3]) >>> 0;
    for (var o = 0; o < words.length; o += 16) compress(h, words, o);
    return h;
  }
  function sha256(bytes) { return finish(H0, 0, bytes); }
  function toBytes(h) { var o = new Uint8Array(32); for (var i = 0; i < 8; i++) { o[4 * i] = h[i] >>> 24; o[4 * i + 1] = (h[i] >>> 16) & 255; o[4 * i + 2] = (h[i] >>> 8) & 255; o[4 * i + 3] = h[i] & 255; } return o; }
  function hexToBytes(s) { var o = new Uint8Array(s.length / 2); for (var i = 0; i < o.length; i++) o[i] = parseInt(s.substr(2 * i, 2), 16); return o; }
  function bytesToHex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function utf8(str) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(str) : Uint8Array.from(unescape(encodeURIComponent(str)), function (c) { return c.charCodeAt(0); }); }

  /* PBKDF2-HMAC-SHA256 một khối (32 byte), mỗi vòng lặp chỉ cần hai lần nén nhờ trạng thái ipad/opad tính trước. */
  function pbkdf2Hex(password, saltHex, iterations) {
    var key = utf8(password); if (key.length > 64) key = toBytes(sha256(key));
    var ipad = new Uint8Array(64), opad = new Uint8Array(64), i;
    for (i = 0; i < 64; i++) { var kb = i < key.length ? key[i] : 0; ipad[i] = kb ^ 0x36; opad[i] = kb ^ 0x5c; }
    function words(b) { var w = new Uint32Array(16); for (var j = 0; j < 16; j++) w[j] = ((b[4 * j] << 24) | (b[4 * j + 1] << 16) | (b[4 * j + 2] << 8) | b[4 * j + 3]) >>> 0; return w; }
    var istate = new Uint32Array(H0), ostate = new Uint32Array(H0);
    compress(istate, words(ipad), 0); compress(ostate, words(opad), 0);
    function hmac(msg) { return finish(ostate, 64, toBytes(finish(istate, 64, msg))); }
    var salt = hexToBytes(saltHex), first = new Uint8Array(salt.length + 4); first.set(salt); first[salt.length + 3] = 1;
    var u = hmac(first), t = new Uint32Array(u);
    // vòng lặp nóng: thông điệp luôn dài 32 byte nên chỉ cần một khối cho mỗi lần băm trong và ngoài
    var blk = new Uint32Array(16), h = new Uint32Array(8);
    for (var it = 1; it < iterations; it++) {
      blk.set(u, 0); blk[8] = 0x80000000; for (i = 9; i < 15; i++) blk[i] = 0; blk[15] = (64 + 32) * 8;
      h.set(istate); compress(h, blk, 0);
      blk.set(h, 0); blk[8] = 0x80000000; for (i = 9; i < 15; i++) blk[i] = 0; blk[15] = (64 + 32) * 8;
      u = new Uint32Array(ostate); compress(u, blk, 0);
      for (i = 0; i < 8; i++) t[i] ^= u[i];
    }
    return bytesToHex(toBytes(t));
  }
  window.SiteGate = { pbkdf2Hex: pbkdf2Hex };

  /* ---------- Cổng ---------- */
  var cfg = window.SITE_GATE;
  if (!cfg || !cfg.hash) return;                         // chưa cấu hình: không có cổng
  var KEY = 'site-gate-ok';
  try { if (sessionStorage.getItem(KEY) === cfg.hash) return; } catch (e) { /* sessionStorage bị chặn: hỏi mỗi trang */ }

  var root = document.documentElement;
  root.classList.add('gated');
  var st = document.createElement('style');
  st.id = 'gate-hide';
  st.textContent = 'html.gated body > *:not(.gate-overlay){display:none!important}';
  document.head.appendChild(st);

  function build() {
    var ov = document.createElement('div');
    ov.className = 'gate-overlay';
    ov.innerHTML = '<form class="gate-card" autocomplete="off" aria-labelledby="gate-title">' +
      '<p class="gate-title" id="gate-title">Tự học <span>AI</span></p>' +
      '<p class="gate-lead">Nhập mật khẩu để vào website.</p>' +
      '<label class="gate-label" for="gate-pw">Mật khẩu</label>' +
      '<input class="gate-input" id="gate-pw" type="password" autocomplete="current-password" required autofocus>' +
      '<button class="gate-btn" type="submit">Vào</button>' +
      '<p class="gate-msg" role="alert" aria-live="assertive"></p>' +
      '<p class="gate-note">Cổng này chỉ ngăn người vào tình cờ, không phải bảo mật thật: nội dung vẫn nằm trong mã nguồn công khai.</p>' +
      '</form>';
    document.body.appendChild(ov);
    var form = ov.querySelector('form'), input = ov.querySelector('input'), msg = ov.querySelector('.gate-msg'), btn = ov.querySelector('button'), fails = 0;
    input.focus();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true; msg.textContent = 'Đang kiểm tra…';
      setTimeout(function () {                           // nhường trình duyệt vẽ dòng "Đang kiểm tra" trước khi tính PBKDF2
        var ok = pbkdf2Hex(input.value, cfg.salt, cfg.iter) === cfg.hash;
        if (ok) {
          try { sessionStorage.setItem(KEY, cfg.hash); } catch (e) { /* bỏ qua */ }
          root.classList.remove('gated'); var s = document.getElementById('gate-hide'); if (s) s.remove(); ov.remove();
          window.dispatchEvent(new Event('resize'));     // các khung vẽ được tạo khi đang ẩn cần đo lại kích thước
          return;
        }
        fails++; input.value = ''; msg.textContent = 'Sai mật khẩu.';
        var wait = Math.min(30, fails > 2 ? (fails - 2) * 3 : 0);
        if (!wait) { btn.disabled = false; input.focus(); return; }
        var left = wait; msg.textContent = 'Sai mật khẩu. Thử lại sau ' + left + ' giây.';
        var timer = setInterval(function () { left--; if (left <= 0) { clearInterval(timer); btn.disabled = false; msg.textContent = 'Sai mật khẩu.'; input.focus(); } else msg.textContent = 'Sai mật khẩu. Thử lại sau ' + left + ' giây.'; }, 1000);
      }, 30);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
