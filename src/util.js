/* DreVelopDrop: small helpers shared by everything. No DOM at import time, so Node tests can load it. */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const dbToGain = (d) => Math.pow(10, d / 20);
export const round = (v, d) => { const k = 10 ** d; return Math.round(v * k) / k; };
export const pad2 = (n) => String(n).padStart(2, '0');

export const stamp = (d = new Date()) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
export const fmtBytes = (n) => (n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`);
export const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}` : `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
};

/** A small stable 32-bit hash of a string (FNV-1a): used to turn a control's name into a shape and a colour. */
export const hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Save a Blob (or text) as a download. */
export function download(data, name, type = 'application/octet-stream') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

/** localStorage that never throws (private windows, blocked storage) and keeps everything under one prefix. */
export const store = {
  prefix: 'drevelopdrop.',
  get(k, fallback = null) { try { const v = localStorage.getItem(this.prefix + k); return v == null ? fallback : JSON.parse(v); } catch (err) { return fallback; } },
  set(k, v) { try { localStorage.setItem(this.prefix + k, JSON.stringify(v)); return true; } catch (err) { return false; } },
};

/** Mouse-wheel units to "notches" (a trackpad sends many small ones that add up to the same). */
export const notches = (e) => clamp(((e.deltaY || e.deltaX) * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1)) / 100, -3, 3);
