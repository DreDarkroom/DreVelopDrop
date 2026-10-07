// Records a clip of DreVelopDrop with sound: a scripted performance (mouse strokes, key holds) driven through Chrome DevTools,
// captured by the instrument's own video recorder (canvas + audio -> WebM), then pulled out of the Studio library.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

export const RAW = (process.env.RAW_DIR || path.join(os.tmpdir(), 'drevelopdrop-clips')).split(path.sep).join('/').replace(/\/?$/, '/');
fs.mkdirSync(RAW, { recursive: true });
const KEYS = { ' ': ['Space', 32], 1: ['Digit1', 49], 2: ['Digit2', 50], 3: ['Digit3', 51], c: ['KeyC', 67], ';': ['Semicolon', 186], "'": ['Quote', 222] };
const keyInfo = (k) => KEYS[k] || [`Key${k.toUpperCase()}`, k.toUpperCase().charCodeAt(0)];

export function helpers(c, W, H) {
  const h = {
    sleep, W, H,
    /** Press, move along a path for `ms`, release. fn(u) -> {x, y} for u in 0..1. */
    async stroke(fn, ms) {
      const p0 = fn(0); await c.mouse('mouseMoved', p0.x, p0.y); await c.mouse('mousePressed', p0.x, p0.y);
      const t0 = performance.now();
      for (;;) { const u = Math.min(1, (performance.now() - t0) / ms), p = fn(u); await c.mouse('mouseMoved', p.x, p.y, { buttons: 1 }); if (u >= 1) break; await sleep(14); }
      const p1 = fn(1); await c.mouse('mouseReleased', p1.x, p1.y, { buttons: 0 });
    },
    async tap(x, y) { await c.mouse('mouseMoved', x, y); await c.mouse('mousePressed', x, y); await sleep(60); await c.mouse('mouseReleased', x, y, { buttons: 0 }); },
    async down(k) { const [code, vk] = keyInfo(k); await c.key('keyDown', k, code, { vk }); },
    async up(k) { const [code, vk] = keyInfo(k); await c.key('keyUp', k, code, { vk }); },
    async press(k, ms = 90) { await h.down(k); await sleep(ms); await h.up(k); },
    circle: (cx, cy, r, turns, phase = 0) => (u) => ({ x: cx + r * Math.cos(phase + u * Math.PI * 2 * turns), y: cy + r * Math.sin(phase + u * Math.PI * 2 * turns) }),
    wave: (x0, x1, y0, y1, waves, phase = 0) => (u) => ({ x: x0 + (x1 - x0) * (0.5 + 0.5 * Math.sin(phase + u * Math.PI * 2 * waves)), y: y0 + (y1 - y0) * u }),
    line: (a, b) => (u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }),
  };
  return h;
}

export async function recordClip(name, choreo, { base = process.env.BASE_URL || 'http://localhost:5173/index.html', query = '', bitrate = '6000000', W = 720, H = 1280, vp8 = false, extra = [], format = 'webm' } = {}) {
  const c = await launch({ width: W, height: H, extra });
  if (vp8) await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `const o = MediaRecorder.isTypeSupported.bind(MediaRecorder); MediaRecorder.isTypeSupported = (t) => /vp9/.test(t) ? false : o(t);` });
  try {
    await c.goto(base + (query ? '?' + query : ''));
    await c.eval('localStorage.clear()');
    await c.goto(base + (query ? '?' + query : ''));
    await sleep(1200);
    const center = async (sel) => c.eval(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    const click = async (sel) => { const [x, y] = await center(sel); await c.mouse('mouseMoved', x, y); await c.mouse('mousePressed', x, y); await c.mouse('mouseReleased', x, y, { buttons: 0 }); };
    await click('#switch'); await sleep(2500);                                           // the safelight on: audio starts, the loop plays
    await c.eval(`(() => { const f = document.querySelector('#recfmt'); f.value = '${format}'; f.dispatchEvent(new Event('change')); const q = document.querySelector('#recq'); q.value = '${bitrate}'; q.dispatchEvent(new Event('change')); })()`);
    const h = helpers(c, W, H);
    await c.eval("document.querySelector('#rec').click()"); await sleep(900);                                                // recording starts
    const recording = await c.eval(`document.querySelector('#rec').getAttribute('aria-pressed')`);
    if (recording !== 'true') throw new Error('the recorder did not start: ' + JSON.stringify(c.logs));
    await h.press('c'); await sleep(400);                                                 // clean: nothing but the picture
    const t0 = performance.now();
    await choreo(c, h);
    const seconds = (performance.now() - t0) / 1000;
    await h.press('c'); await sleep(500);                                                 // controls back so the stop button can be pressed
    await c.eval("document.querySelector('#rec').click()"); await sleep(3000);                                               // stop: the take lands in the Studio library
    const info = await c.eval(`(async () => {
      const { library } = await import('./src/rec/library.js');
      const list = (await library.list()).filter((t) => t.kind === 'video').sort((a, b) => (b.created || 0) - (a.created || 0));
      if (!list.length) return null;
      const t = list[0], blob = await library.blob(t.id);
      const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; const chunks = [];
      for (let i = 0; i < buf.length; i += 3 * 1024 * 1024) { let b = ''; const part = buf.subarray(i, i + 3 * 1024 * 1024); for (let j = 0; j < part.length; j += 8192) b += String.fromCharCode.apply(null, part.subarray(j, j + 8192)); chunks.push(btoa(b)); }
      window.__clip = chunks; return { name: t.name, size: buf.length, chunks: chunks.length };
    })()`);
    if (!info) throw new Error('no video take found in the library: ' + JSON.stringify(c.logs));
    const parts = [];
    for (let i = 0; i < info.chunks; i++) parts.push(Buffer.from(await c.eval(`window.__clip[${i}]`), 'base64'));
    const file = `${RAW}${name}.${format === 'mp4' ? 'mp4' : 'webm'}`;
    fs.writeFileSync(file, Buffer.concat(parts));
    return { file, W, H, bytes: fs.statSync(file).size, performedSeconds: Math.round(seconds * 10) / 10, logs: c.logs };
  } finally { await c.close(); }
}
