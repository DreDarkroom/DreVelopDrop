// A tiny Chrome DevTools Protocol driver (no dependencies; needs Node 22+ for the built-in WebSocket). Launches headless Chrome and talks to one page.
// Set CHROME to the browser's path if it is not in the default Windows place.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1080, height = 1920, port = 9333, extra = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const args = ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`, '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', ...extra, 'about:blank'];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.length) break; } catch (e) { /* not up yet */ } await sleep(250); }
  if (!targets) throw new Error('chrome did not start');
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(), listeners = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } else if (d.method) listeners.forEach((f) => f(d)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
  const api = {
    send, proc, dir, on: (f) => listeners.push(f),
    async eval(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; },
    async goto(url) { await send('Page.enable'); await send('Page.navigate', { url }); await sleep(1500); },
    async mouse(type, x, y, extra = {}) { return send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' || type === 'mouseMoved' ? (extra.buttons ?? 0) : 1, clickCount: 1, ...extra }); },
    async key(type, key, code, extra = {}) { return send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: extra.vk ?? key.toUpperCase().charCodeAt(0), text: type === 'keyDown' && key.length === 1 ? key : undefined, ...extra }); },
    async screenshot(file, format = 'png') { const r = await send('Page.captureScreenshot', { format }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); },
    async close() { try { ws.close(); } catch (e) { /* ok */ } proc.kill(); await sleep(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ok */ } },
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  api.logs = [];
  listeners.push((d) => {
    if (d.method === 'Runtime.exceptionThrown') api.logs.push('EXCEPTION ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) api.logs.push(d.params.type + ' ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  return api;
}
