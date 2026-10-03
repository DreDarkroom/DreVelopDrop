/* DreVelopDrop: the three drummer rings, the bass grid, the mute buttons and the per-part levels (with their right-click menus). */
import { $, el, clamp, notches } from '../util.js';
import { toast, openCtx, blurAfterMouse } from './dom.js';
import { DB_RANGE } from '../engine/audio.js';

const NS = 'http://www.w3.org/2000/svg';
const LENS = [8, 10, 12, 14, 15, 16];
const PART_LABEL = { kick: 'kick', snare: 'snare', hat: 'hats', bass: 'bass' };
export const MUTE_KEYS = { z: 'kick', x: 'snare', v: 'hat', b: 'bass' };
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const noteName = (root) => NOTE_NAMES[root % 12];

export function buildGrid(app) {
  const { A, S, PB } = app;
  const rings = [], cells = [], muteBtns = {}, lvlEls = {}, lvlTimers = {};
  let nowCol = -1;
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  /* ---- three drummers, each a ring ---- */
  function buildDrummers() {
    const host = $('#drummers');
    S.drummers.forEach((d, i) => {
      const wrap = el('div', 'drummer'), svg = svgEl('svg', { viewBox: '-50 -50 100 100', role: 'group', 'aria-label': `${d.name} drummer` }), info = el('div', 'info'), ctl = el('div', 'ctl'), lvl = el('div', 'lvl');
      const mk = (label, aria, fn) => {
        const b = el('button', null, label);
        b.type = 'button';
        b.setAttribute('aria-label', `${d.name} ${aria}`);
        b.addEventListener('click', (e) => { fn(); S.regen(i); renderRing(i); blurAfterMouse(e); });
        return b;
      };
      ctl.append(mk('−', 'fewer hits', () => (d.hits = Math.max(0, d.hits - 1))), mk('+', 'more hits', () => (d.hits = Math.min(d.len, d.hits + 1))), mk('‹', 'shorter loop', () => stepLen(d, -1)), mk('›', 'longer loop', () => stepLen(d, 1)));
      svg.addEventListener('click', (e) => {
        const c = e.target.closest('.dot');
        if (!c) return;
        const s = +c.dataset.s;
        d.steps[s] = !d.steps[s];
        c.classList.toggle('on', d.steps[s]);
        c.classList.remove('ghost');
        c.style.fillOpacity = '';
      });
      wrap.addEventListener('contextmenu', (e) => { e.preventDefault(); ringMenu(e, i); });
      wrap.addEventListener('wheel', wheelLevel(S.PARTS[i]), { passive: false });
      wrap.title = 'Right-click for more · mouse wheel over it for a fine level';
      wrap.append(svg, info, lvl, ctl);
      host.append(wrap);
      rings[i] = { svg, info, dots: [], now: -1, wrap, lvl };
      renderRing(i);
    });
  }

  function stepLen(d, dir) {
    d.len = LENS[clamp(LENS.indexOf(d.len) + dir, 0, LENS.length - 1)];
    d.hits = Math.min(d.hits, d.len);
  }

  function renderRing(i) {
    const d = S.drummers[i], r = rings[i], rad = 38, pr = Math.min(7, rad * Math.sin(Math.PI / d.len) * 0.78);
    r.svg.replaceChildren();
    r.dots = [];
    for (let s = 0; s < d.len; s++) {
      const a = (s / d.len) * Math.PI * 2 - Math.PI / 2;
      const c = svgEl('circle', { cx: (rad * Math.cos(a)).toFixed(2), cy: (rad * Math.sin(a)).toFixed(2), r: pr.toFixed(2), class: 'dot' + (d.steps[s] ? ' on' : '') });
      c.dataset.s = s;
      r.svg.append(c);
      r.dots.push(c);
    }
    r.info.textContent = `${d.name} ${d.hits}/${d.len}`;
  }

  /* ghost hats show as faint fills on the hat ring's empty steps */
  function paintGhosts() {
    const g = S.ghosts;
    rings[2].dots.forEach((c, s) => {
      const on = g[s] > 0.15 && !S.drummers[2].steps[s];
      c.classList.toggle('ghost', on);
      c.style.fillOpacity = on ? (g[s] * 0.5).toFixed(2) : '';
    });
  }

  /* ---- mutes: bring layers in and out ---- */
  function buildMutes() {
    const host = $('#mutes');
    for (const part of S.PARTS) {
      const b = el('button', 'mute', PART_LABEL[part]);
      b.type = 'button';
      b.title = `Mute or bring back the ${PART_LABEL[part]} (${Object.keys(MUTE_KEYS).find((k) => MUTE_KEYS[k] === part)})`;
      b.addEventListener('click', (e) => { toggleMute(part); blurAfterMouse(e); });
      host.append(b);
      muteBtns[part] = b;
    }
    paintMutes();
  }

  function paintMutes() {
    S.PARTS.forEach((part, i) => {
      if (muteBtns[part]) muteBtns[part].setAttribute('aria-pressed', String(!!S.mute[part]));
      if (rings[i] && i < 3) rings[i].wrap.classList.toggle('muted', !!S.mute[part]);
    });
    $('#roll').classList.toggle('muted', !!S.mute.bass);
  }

  function toggleMute(part) { S.toggleMute(part); paintMutes(); }
  const isSolo = (part) => !S.mute[part] && S.PARTS.filter((p) => p !== part).every((p) => S.mute[p]);
  function solo(part) {
    const others = S.PARTS.filter((p) => p !== part), was = isSolo(part);
    others.forEach((p) => S.toggleMute(p, !was));
    S.toggleMute(part, false);
    paintMutes();
  }

  /* ---- bass step grid: 16 columns x 8 degrees (right-click a step to clear it) ---- */
  function buildRoll() {
    const roll = $('#roll');
    for (let row = 7; row >= 0; row--) {
      for (let col = 0; col < 16; col++) {
        const b = el('button', 'cell' + (col % 4 === 0 ? ' beat' : ''));
        b.type = 'button';
        b.setAttribute('aria-label', `step ${col + 1}, degree ${row + 1}`);
        b.dataset.col = col;
        b.addEventListener('click', (e) => {
          const p = S.synth.pattern;
          p[col] = p[col] === row ? -1 : row;
          paintRoll();
          if (A.ready && p[col] >= 0) A.note(A.now() + 0.01, S.midi(row), 0.7, 0.18, false);
          blurAfterMouse(e);
        });
        (cells[col] = cells[col] || [])[row] = b;
        roll.append(b);
      }
    }
    roll.addEventListener('contextmenu', bassMenu);
    roll.addEventListener('wheel', wheelLevel('bass'), { passive: false });
    roll.title = 'Right-click for more · mouse wheel over it for a fine level';
    const lvl = el('div', 'lvl');
    lvl.id = 'basslvl';
    roll.parentElement.append(lvl);
    lvlEls.bass = lvl;
    paintRoll();
  }

  function paintRoll() {
    const p = S.synth.pattern;
    for (let col = 0; col < 16; col++) for (let row = 0; row < 8; row++) {
      const on = p[col] === row;
      cells[col][row].classList.toggle('on', on);
      cells[col][row].setAttribute('aria-pressed', on);
    }
  }

  function clearPart(what) {
    S.clear(what);
    if (what !== 'drums') paintRoll();
    if (what !== 'bass') { S.drummers.forEach((d, i) => renderRing(i)); paintGhosts(); }
    toast(what === 'bass' ? 'Bass line cleared. Click the grid to write your own.' : what === 'drums' ? 'Drums cleared. Click the rings to write them.' : 'Everything cleared. You have a blank page.');
  }

  /* ---- part levels: the mouse wheel over a part trims it in tiny steps (a quarter of a decibel a notch; Shift = 1 dB, Alt = 0.05 dB) ---- */
  const dbOf = (part) => A.params[part + 'Db'] || 0;
  const fmtDb = (d) => `${d > 0.004 ? '+' : d < -0.004 ? '−' : ''}${Math.abs(d).toFixed(2)} dB`;

  function paintLevel(part, flashIt) {
    const box = part === 'bass' ? lvlEls.bass : rings[S.PARTS.indexOf(part)] && rings[S.PARTS.indexOf(part)].lvl;
    if (!box) return;
    const db = dbOf(part);
    box.textContent = fmtDb(db);
    box.classList.toggle('has', Math.abs(db) > 0.004);
    if (flashIt) { box.classList.add('show'); clearTimeout(lvlTimers[part]); lvlTimers[part] = setTimeout(() => box.classList.remove('show'), 1600); }
  }

  function setPartDb(part, db) {
    A.setParam(part + 'Db', Math.round(clamp(db, DB_RANGE[0], DB_RANGE[1]) * 100) / 100);
    paintLevel(part, true);
  }

  const wheelLevel = (part) => (e) => {
    if (e.ctrlKey) return;                                    // a pinch-zoom gesture, not ours
    e.preventDefault();
    setPartDb(part, dbOf(part) - notches(e) * (e.shiftKey ? 1 : e.altKey ? 0.05 : 0.25));   // wheel down = quieter
  };

  /* the wheel over any slider nudges it very finely (a thousandth of its range a notch; Shift = a hundredth) */
  function wheelSliders() {
    document.addEventListener('wheel', (e) => {
      const r = e.target.closest && e.target.closest('input[type="range"]');
      if (!r || e.ctrlKey || PB.perf) return;
      e.preventDefault();
      r.value = clamp(+r.value - notches(e) * (r.max - r.min) * (e.shiftKey ? 0.01 : 0.001), +r.min, +r.max);
      r.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });
  }

  /* ---- right-click menus ---- */
  const levelItem = (part) => [`Level ${fmtDb(dbOf(part))}: reset to 0`, () => setPartDb(part, 0), { dim: Math.abs(dbOf(part)) < 0.005 }];
  const keyShift = (d) => { A.setParam('root', clamp(A.params.root + d, 33, 57)); toast(`Key: ${noteName(A.params.root)}`, 1600); };

  function bassMenu(e) {
    e.preventDefault();
    if (PB.perf) return;
    const cell = e.target.closest('.cell'), p = S.synth.pattern, col = cell ? +cell.dataset.col : -1;
    const items = [[S.mute.bass ? 'Bring the bass back' : 'Mute the bass', () => toggleMute('bass')], [isSolo('bass') ? 'Bring the others back' : 'Solo the bass', () => solo('bass')], '-'];
    if (cell && p[col] >= 0) items.push([`Clear step ${col + 1}`, () => { p[col] = -1; paintRoll(); }]);
    items.push(
      ['Clear the bass line', () => clearPart('bass')],
      ['Fill with a new line', () => {
        const pool = [0, 0, 0, 2, 3, 4, 5, 7];
        S.synth.pattern = Array.from({ length: 16 }, (_, i) => (Math.random() < (i % 4 === 0 ? 0.8 : 0.4) ? pool[Math.floor(Math.random() * pool.length)] : -1));
        S.home = S.synth.pattern.slice();
        paintRoll();
      }],
      ['Shift the line left', () => { const q = S.synth.pattern; q.push(q.shift()); S.home = q.slice(); paintRoll(); }],
      ['Shift the line right', () => { const q = S.synth.pattern; q.unshift(q.pop()); S.home = q.slice(); paintRoll(); }],
      ['↺ Back to the saved loop', () => { S.goHome(); paintRoll(); }],
      '-',
      [`Key up (now ${noteName(A.params.root)})`, () => keyShift(1)], ['Key down', () => keyShift(-1)],
      ['Record a bass clip', () => $('#clipbass').click()], '-', levelItem('bass'));
    openCtx(e.clientX, e.clientY, 'Bass', items);
  }

  function ringMenu(e, i) {
    e.preventDefault();
    if (PB.perf) return;
    const part = S.PARTS[i], d = S.drummers[i], redo = () => { renderRing(i); paintGhosts(); };
    openCtx(e.clientX, e.clientY, d.name[0].toUpperCase() + d.name.slice(1), [
      [S.mute[part] ? `Bring the ${PART_LABEL[part]} back` : `Mute the ${PART_LABEL[part]}`, () => toggleMute(part)],
      [isSolo(part) ? 'Bring the others back' : `Solo the ${PART_LABEL[part]}`, () => solo(part)], '-',
      ['More hits', () => { d.hits = Math.min(d.len, d.hits + 1); S.regen(i); redo(); }],
      ['Fewer hits', () => { d.hits = Math.max(0, d.hits - 1); S.regen(i); redo(); }],
      ['Turn it left', () => { d.steps.push(d.steps.shift()); redo(); }],
      ['Turn it right', () => { d.steps.unshift(d.steps.pop()); redo(); }],
      ['Make a new pattern', () => { d.hits = 2 + Math.floor(Math.random() * Math.max(2, d.len / 2 - 1)); d.rot = Math.floor(Math.random() * d.len); S.regen(i); redo(); }],
      ['Clear', () => { d.steps = new Array(d.len).fill(false); d.hits = 0; redo(); }], '-', levelItem(part)]);
  }

  /* ---- the lights, on the beat: the sequencer's timed events move the playhead ---- */
  function onEvent(e) {
    if (e.type === 'step') {
      if (nowCol >= 0) for (const c of cells[nowCol]) c.classList.remove('now');
      nowCol = e.a;
      for (const c of cells[nowCol]) c.classList.add('now');
    } else if (e.type === 'd') {
      const r = rings[e.a];
      if (!r) return;
      if (r.dots[r.now]) r.dots[r.now].classList.remove('now');
      r.now = e.b;
      if (r.dots[e.b]) r.dots[e.b].classList.add('now');
    } else if (e.type === 'cycle') { paintRoll(); paintGhosts(); }
  }

  buildDrummers(); buildRoll(); buildMutes(); wheelSliders();
  S.PARTS.forEach((p) => paintLevel(p));
  Object.assign(app, { renderRing, paintGhosts, paintMutes, paintRoll, paintLevel: (p) => paintLevel(p), toggleMute, clearPart, gridEvent: onEvent, fmtDb, rings });
}
