/* DreVelopDrop: how the page is shown: clean mode, keeping the screen awake, fullscreen and the set clock, the battery saver and its indicator,
   the help card and the notice when the browser pauses the audio. */
import { $, el, clamp, pad2 } from '../util.js';
import { CONFIG } from '../config.js';
import { toast, blurAfterMouse } from './dom.js';

const COARSE = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : { matches: false };
export const isTouchDevice = () => COARSE.matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);

export function buildView(app) {
  const { A, S, V, R, PB, qs } = app;
  let wake = null, ecoOn = false, batt = null, battWarned = 0, clockT0 = null, clockMode = 'elapsed', clockText = '';
  const isClean = () => document.body.classList.contains('clean');
  const inFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  /* ---- clean mode, and keeping the screen awake for a whole set ---- */
  async function updateWake() {
    const want = isClean() || S.playing || R.state.active || PB.playing;
    try {
      if (want && !wake && 'wakeLock' in navigator) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
      else if (!want && wake) { await wake.release(); wake = null; }
    } catch (err) { /* not supported or refused: everything still works */ }
  }

  async function setClean(on) {
    document.body.classList.toggle('clean', on);
    try {
      if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      else if (!on && document.fullscreenElement) await document.exitFullscreen();
    } catch (err) { /* fullscreen refused: still clean, just windowed */ }
    updateWake();
    $('#clean').setAttribute('aria-pressed', on);
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isClean() && !qs.get('clean')) setClean(false);   // Esc leaves clean mode too
    paintFullscreen();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { updateWake(); if (A.ready) A.resume(); } });

  /* ---- fullscreen (on any device) and the set clock ---- */
  function enterFullscreen() {
    const d = document.documentElement;
    if (inFullscreen()) return;
    try {
      const r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen ? d.webkitRequestFullscreen() : null;
      if (r && r.catch) r.catch(() => { /* refused (iPhones have no page fullscreen): carry on */ });
    } catch (err) { /* same */ }
  }
  const toggleFullscreen = () => (inFullscreen() ? (document.exitFullscreen || document.webkitExitFullscreen).call(document) : enterFullscreen());

  function paintFullscreen() {
    document.body.classList.toggle('fs', inFullscreen());
    const b = $('#full');
    b.setAttribute('aria-pressed', String(inFullscreen()));
    b.textContent = inFullscreen() ? 'exit full' : 'full';
    paintClock();
  }

  /* From the moment the sound starts: elapsed time on the audio clock. Click it to see the time of day instead. Only drawn while it is visible. */
  const clockVisible = () => document.body.classList.contains('fs') || isClean();
  function paintClock() {
    const c = $('#clock');
    if (!clockVisible()) return;
    let text;
    if (clockMode === 'day') { const d = new Date(); text = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
    else {
      const s = clockT0 == null || !A.ready ? 0 : Math.max(0, Math.floor(A.now() - clockT0));
      text = s >= 3600 ? `${Math.floor(s / 3600)}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}` : `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
    }
    if (text !== clockText) { clockText = text; c.textContent = text; }
    c.title = clockMode === 'day' ? 'Time of day (click for time since the music started)' : 'Time since the music started (click for the time of day)';
  }

  /* ---- the battery saver ---- */
  function setEco(on, why, persist = true) {
    ecoOn = !!on;
    A.setEco(ecoOn); V.setEco(ecoOn);
    $('#eco').setAttribute('aria-pressed', String(ecoOn));
    if (persist) app.store.set('eco', ecoOn);
    if (why) toast(why, 6000);
    app.ecoChanged();
  }

  /* ---- the battery indicator: ten cells; it flashes in time with the music when low, and twice as fast when very low ---- */
  async function buildBattery() {
    const host = $('#battery'), fake = qs.get('battery');           // ?battery=0.12 (or 0.5c for charging) previews the indicator, and is how it is tested
    if (fake != null && isFinite(parseFloat(fake))) batt = Object.assign(new EventTarget(), { level: clamp(parseFloat(fake), 0, 1), charging: /c$/i.test(fake), dischargingTime: Infinity });
    else {
      if (!navigator.getBattery) return;                           // Safari and Firefox do not offer it: nothing is shown
      try { batt = await navigator.getBattery(); } catch (err) { return; }
    }
    const NS = 'http://www.w3.org/2000/svg', mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const svg = mk('svg', { viewBox: '0 0 34 14', 'aria-hidden': 'true' }), cellsEl = [];
    svg.append(mk('rect', { x: 0.5, y: 0.5, width: 29, height: 13, rx: 3.5, class: 'bshell' }), mk('rect', { x: 31, y: 4.5, width: 2.5, height: 5, rx: 1, class: 'bshell fill' }));
    for (let i = 0; i < 10; i++) { const r = mk('rect', { x: 2.4 + i * 2.65, y: 2.6, width: 1.9, height: 8.8, rx: 0.8, class: 'bcell' }); svg.append(r); cellsEl.push(r); }
    svg.append(mk('path', { d: 'M16.5 2.2 L11.5 8 H15 L13.8 11.8 L18.8 6 H15.3 Z', class: 'bbolt' }));
    const pct = el('span', 'bpct');
    host.replaceChildren(svg, pct);
    host.hidden = false;
    batt._ui = { host, cellsEl, pct };
    batt.addEventListener('levelchange', paintBattery);
    batt.addEventListener('chargingchange', paintBattery);
    paintBattery();
  }

  const battCritical = () => batt && !batt.charging && batt.level <= 0.15;
  const battUrgent = () => batt && !batt.charging && batt.level <= 0.07;

  function paintBattery() {
    if (!batt || !batt._ui) return;
    const { host, cellsEl, pct } = batt._ui, lit = Math.ceil(batt.level * 10 - 1e-6);
    cellsEl.forEach((c, i) => c.classList.toggle('on', i < lit));
    pct.textContent = `${Math.round(batt.level * 100)}%`;
    host.classList.toggle('chg', !!batt.charging);
    host.classList.toggle('low', !batt.charging && batt.level <= 0.3);
    host.classList.toggle('crit', !!battCritical());
    host.classList.toggle('urgent', !!battUrgent());
    host.classList.toggle('still', !S.playing);                   // not playing: a slow pulse instead of the beat
    const left = isFinite(batt.dischargingTime) && batt.dischargingTime > 0 ? `, about ${Math.floor(batt.dischargingTime / 3600)} h ${Math.round((batt.dischargingTime % 3600) / 60)} min left` : '';
    host.title = `Battery ${Math.round(batt.level * 100)}%${batt.charging ? ', charging' : left}`;
    if (!batt.charging && batt.level <= 0.2 && !ecoOn && !battWarned) {   // a low battery turns the battery saver on by itself, once, so the set lasts
      battWarned = 1;
      setEco(true, `Battery at ${Math.round(batt.level * 100)}%: battery saver is on so it lasts. (The eco button turns it off.)`, false);
    }
    if (batt.charging || batt.level > 0.25) battWarned = 0;
  }

  /** Called on every sixteenth: a low battery blinks on the beat, a very low one on every eighth. */
  function batteryBeat(stepIdx) {
    if (!batt || !batt._ui || !battCritical() || !S.playing || stepIdx % (battUrgent() ? 2 : 4) !== 0) return;
    const h = batt._ui.host;
    if (h.animate) h.animate([{ opacity: 1, filter: 'brightness(2.2)' }, { opacity: 0.35, filter: 'brightness(1)' }], { duration: battUrgent() ? 160 : 260, easing: 'ease-out' });
  }

  /* ---- help ---- */
  function toggleHelp(force) {
    const h = $('#help'), on = force != null ? force : h.hidden;
    h.hidden = !on;
    $('#helpbtn').setAttribute('aria-expanded', String(on));
    if (on) { h.scrollTop = 0; app.closePanels('help'); }
  }

  /* ---- audio that gets paused by the browser: say so, and resume on the next touch ---- */
  function watchAudio() {
    const note = $('#notice');
    A.onState = (state) => {
      const paused = state !== 'running';
      note.hidden = !paused || !!(PB.perf && !PB.playing);
      note.textContent = paused ? 'Audio is paused by the browser. Click or press any key to resume.' : '';
    };
    const resume = () => { if (A.ready && !(PB.perf && !PB.playing)) A.resume(); };
    addEventListener('pointerdown', resume, { passive: true });
    addEventListener('keydown', resume, { passive: true });
  }

  const toggleDarkroom = () => { if (document.body.classList.toggle('darkroom')) toast('Safelight only.', 1800); };

  /* ---- phones and tablets: the first tap (the safelight switch) also goes fullscreen; the panel is a sheet ---- */
  function buildMobile() {
    $('#full').addEventListener('click', (e) => { toggleFullscreen(); blurAfterMouse(e); });
    const sheet = $('#sheet'), paint = () => { const min = document.body.classList.contains('sheet-min'); sheet.setAttribute('aria-expanded', String(!min)); sheet.textContent = min ? 'more ▴' : 'less ▾'; };
    sheet.addEventListener('click', (e) => { document.body.classList.toggle('sheet-min'); paint(); blurAfterMouse(e); });
    if (isTouchDevice() || innerWidth < 700) document.body.classList.add('sheet-min');   // a phone starts with the picture and the main controls
    document.body.classList.toggle('touch', isTouchDevice());
    paint();
    paintFullscreen();
  }

  $('#clock').addEventListener('click', () => { clockMode = clockMode === 'elapsed' ? 'day' : 'elapsed'; clockText = ''; paintClock(); });
  setInterval(paintClock, 1000);
  $('#eco').addEventListener('click', (e) => { setEco(!ecoOn, ecoOn ? null : 'Battery saver on: a smaller picture at 30 frames a second, no reverb room, simpler hats. Cooler and kinder to the battery.'); if (!ecoOn) toast('Battery saver off.', 2000); blurAfterMouse(e); });
  const pref = app.store.get('eco');
  setEco(qs.get('eco') != null ? qs.get('eco') === '1' : pref != null ? !!pref : isTouchDevice(), null, false);   // a phone starts in battery saver
  $('#helpbtn').addEventListener('click', (e) => { toggleHelp(); blurAfterMouse(e); });
  $('#helpclose').addEventListener('click', () => toggleHelp(false));
  $('#ver').textContent = CONFIG.version;
  buildMobile(); buildBattery(); watchAudio();
  Object.assign(app, {
    isClean, setClean, updateWake, toggleFullscreen, toggleHelp, toggleDarkroom, batteryBeat, startClock: () => { if (clockT0 == null) clockT0 = A.now(); }, paintBattery,
    isEco: () => ecoOn, setEco, isTouchDevice,
  });
}
