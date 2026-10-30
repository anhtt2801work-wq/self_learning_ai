/* Shared helpers for the "economics-friendly" demos (loaded before viz-econ-*.js).
 * Exposes Viz.econ = { lineChart, hist, polyfit, polyval, mean, sd, ncdf, vnd, ... }.
 * All demos built on it use simulated toy data with fixed seeds. */
(function () {
  'use strict';
  function mean(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function sd(a) { const m = mean(a); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / (a.length - 1)); }
  function ncdf(x) {
    const s = x < 0 ? -1 : 1, z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return 0.5 * (1 + s * y);
  }
  function fmt(v) { const a = Math.abs(v); return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2); }
  /* Money in million VND → readable text ("850 triệu", "1,25 tỷ"). */
  function vnd(m) {
    const a = Math.abs(m), sign = m < 0 ? '−' : '';
    if (a >= 1000) return sign + (a / 1000).toFixed(2).replace('.', ',') + ' tỷ';
    return sign + Math.round(a).toLocaleString('vi-VN') + ' triệu';
  }

  /* Money in VND → readable text. */
  function money(v) {
    const a = Math.abs(v), sign = v < 0 ? '−' : '';
    if (a < 1e3) return sign + Math.round(a).toLocaleString('vi-VN') + ' đồng';
    if (a < 1e6) return sign + (a / 1e3).toFixed(a < 1e5 ? 1 : 0).replace('.', ',') + ' nghìn đồng';
    if (a < 1e9) return sign + (a / 1e6).toFixed(a < 1e8 ? 1 : 0).replace('.', ',') + ' triệu đồng';
    if (a < 1e12) return sign + (a / 1e9).toFixed(2).replace('.', ',') + ' tỷ đồng';
    return sign + (a / 1e12).toFixed(1).replace('.', ',') + ' nghìn tỷ đồng';
  }

  /* Line chart in box bx = {x,y,w,h}; ser = [{y:[...], color, width, dash}]; o = {ymin,ymax,yfmt,hlines,n,xlabel,title} */
  function lineChart(ctx, c, bx, ser, o) {
    o = o || {};
    let lo = o.ymin, hi = o.ymax;
    if (lo == null || hi == null) {
      let a = Infinity, b = -Infinity;
      ser.forEach(s => s.y.forEach(v => { if (isFinite(v)) { if (v < a) a = v; if (v > b) b = v; } }));
      if (lo == null) lo = a; if (hi == null) hi = b;
      if (!(hi > lo)) hi = lo + 1;
      const pad = (hi - lo) * 0.06; if (o.ymin == null) lo -= pad; if (o.ymax == null) hi += pad;
    }
    const n = o.n || Math.max.apply(null, ser.map(s => s.y.length));
    const X = i => bx.x + (n > 1 ? i / (n - 1) : 0) * bx.w, Y = v => bx.y + (1 - (v - lo) / (hi - lo)) * bx.h;
    ctx.save();
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(bx.x, y); ctx.lineTo(bx.x + bx.w, y); ctx.stroke(); ctx.fillText((o.yfmt || fmt)(v), bx.x - 5, y); }
    ctx.beginPath(); ctx.rect(bx.x, bx.y, bx.w, bx.h); ctx.clip();
    (o.hlines || []).forEach(h => { ctx.strokeStyle = h.color || c.muted; ctx.setLineDash(h.dash === false ? [] : [5, 4]); ctx.beginPath(); ctx.moveTo(bx.x, Y(h.v)); ctx.lineTo(bx.x + bx.w, Y(h.v)); ctx.stroke(); });
    ctx.setLineDash([]);
    ser.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; ctx.setLineDash(s.dash || []); ctx.beginPath();
      let pen = false;
      for (let i = 0; i < s.y.length; i++) { const v = s.y[i]; if (!isFinite(v)) { pen = false; continue; } if (pen) ctx.lineTo(X(i), Y(v)); else { ctx.moveTo(X(i), Y(v)); pen = true; } }
      ctx.stroke();
    });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
    if (o.title) { ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(o.title, bx.x + 6, bx.y + 4); }
    if (o.xlabel) { ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(o.xlabel, bx.x + bx.w / 2, bx.y + bx.h + 4); }
    ctx.restore();
    return { X, Y, lo, hi };
  }

  /* Overlaid density histograms. series = [{vals, color}] ; returns {X, Y} for extra drawing. */
  function hist(ctx, c, bx, series, lo, hi, nb, o) {
    o = o || {};
    const bw = (hi - lo) / nb, dens = series.map(s => { const cnt = new Array(nb).fill(0); s.vals.forEach(v => { const b = Math.floor((v - lo) / bw); if (b >= 0 && b < nb) cnt[b]++; }); return cnt.map(k => k / (s.vals.length * bw)); });
    const top = (o.ymax || Math.max.apply(null, dens.map(d => Math.max.apply(null, d)))) * 1.1 || 1;
    const X = v => bx.x + (v - lo) / (hi - lo) * bx.w, Y = d => bx.y + (1 - d / top) * bx.h;
    ctx.save();
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) { const y = bx.y + bx.h * k / 4; ctx.beginPath(); ctx.moveTo(bx.x, y); ctx.lineTo(bx.x + bx.w, y); ctx.stroke(); }
    series.forEach((s, si) => { ctx.fillStyle = Viz.rgba(s.color, 0.5); dens[si].forEach((d, i) => { if (d > 0) ctx.fillRect(X(lo + i * bw) + 0.5, Y(d), Math.max(1, bx.w / nb - 1), bx.y + bx.h - Y(d)); }); });
    ctx.strokeStyle = c.border; ctx.strokeRect(bx.x, bx.y, bx.w, bx.h);
    ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const step = o.tick || 2, dec = step >= 1 ? 0 : Math.ceil(-Math.log10(step) - 1e-9); for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) ctx.fillText((k * step).toFixed(dec), X(k * step), bx.y + bx.h + 4);
    if (o.title) { ctx.fillStyle = c.fg; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(o.title, bx.x + 6, bx.y + 4); }
    ctx.restore();
    return { X, Y };
  }

  /* Ridge-stabilised polynomial least squares on x scaled to [-1,1]. */
  function polyfit(x, y, d, lam) {
    lam = lam == null ? 1e-9 : lam;
    const n = x.length, m = d + 1, A = [], u = x.map(v => (v - 0.5) * 2);
    for (let i = 0; i < n; i++) { const row = []; for (let k = 0; k < m; k++) row.push(Math.pow(u[i], k)); A.push(row); }
    const M = [], b = [];
    for (let r = 0; r < m; r++) { const row = []; for (let q = 0; q < m; q++) { let s = 0; for (let i = 0; i < n; i++) s += A[i][r] * A[i][q]; row.push(s + (r === q ? lam : 0)); } M.push(row); let s2 = 0; for (let i = 0; i < n; i++) s2 += A[i][r] * y[i]; b.push(s2); }
    for (let col = 0; col < m; col++) {
      let piv = col; for (let r = col + 1; r < m; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      [M[col], M[piv]] = [M[piv], M[col]]; [b[col], b[piv]] = [b[piv], b[col]];
      for (let r = col + 1; r < m; r++) { const f = M[r][col] / (M[col][col] || 1e-18); for (let q = col; q < m; q++) M[r][q] -= f * M[col][q]; b[r] -= f * b[col]; }
    }
    const coef = new Array(m).fill(0);
    for (let r = m - 1; r >= 0; r--) { let s = b[r]; for (let q = r + 1; q < m; q++) s -= M[r][q] * coef[q]; coef[r] = s / (M[r][r] || 1e-18); }
    return coef;
  }
  function polyval(coef, x) { const u = (x - 0.5) * 2; let s = 0; for (let k = coef.length - 1; k >= 0; k--) s = s * u + coef[k]; return s; }

  Viz.econ = { mean, sd, ncdf, fmt, vnd, money, lineChart, hist, polyfit, polyval };
})();
