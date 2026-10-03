/* DreVelopDrop: the knobs, the lights, the style menu and the tempo. */
import { $, el, clamp } from '../util.js';
import { toast, blurAfterMouse } from './dom.js';

const TEMPO_RANGE = { normal: [70, 140], dnb: [150, 180] };

export function buildControls(app) {
  const { A, S, V } = app;
  const syncs = [], bulbs = [];
  let tempoEls = null, syncQueued = false;

  /** re-read every control from the model (after an import, a style, a MIDI move) */
  const syncAll = () => syncs.forEach((f) => f());
  const syncSoon = () => { if (!syncQueued) { syncQueued = true; requestAnimationFrame(() => { syncQueued = false; syncAll(); }); } };

  /* ---- knobs, named for the tray they belong to ---- */
  const KNOBS = [
    ['cutoff', 'Aperture', 'filter', () => A.params.cutoff, (v) => A.setParam('cutoff', v)],
    ['reso', 'Contrast', 'resonance', () => A.params.reso, (v) => A.setParam('reso', v)],
    ['decay', 'Burn', 'decay', () => A.params.decay, (v) => A.setParam('decay', v)],
    ['drive', 'Grain', 'drive', () => A.params.drive, (v) => A.setParam('drive', v)],
    ['glide', 'Wipe', 'glide', () => A.params.glide, (v) => A.setParam('glide', v)],
    ['space', 'Bath', 'echo + room', () => A.params.space, (v) => A.setParam('space', v)],
    ['swing', 'Bounce', 'swing', () => S.swing * 2, (v) => (S.swing = v / 2)],
    ['drift', 'Drift', 'wander', () => S.drift, (v) => (S.drift = v)],
    ['level', 'Level', 'overall', () => A.params.level, (v) => A.setParam('level', v)],
    ['duck', 'Duck', 'bass under kick', () => A.params.duck, (v) => A.setParam('duck', v)],
  ];

  function slider(label, sub, get, set) {
    const l = el('label', 'knob'), name = el('span', null, label), inp = document.createElement('input');
    name.append(el('small', null, sub));
    Object.assign(inp, { type: 'range', min: 0, max: 1, step: 0.001, value: get() });
    inp.setAttribute('aria-label', `${label} (${sub})`);
    inp.addEventListener('input', () => set(+inp.value));
    l.append(name, inp);
    syncs.push(() => { inp.value = get(); });
    return l;
  }

  /* ---- lights ---- */
  function setLight(i) {
    S.light = i;
    V.setLight(i);
    if (app.P.active) app.P.log(A.now(), 7, i);
    document.documentElement.style.setProperty('--tint-rgb', S.lights[i].tint.join(','));
    bulbs.forEach((b, j) => b.setAttribute('aria-pressed', j === i));
  }

  function buildLights() {
    const host = $('#bulbs');
    S.lights.forEach((l, i) => {
      const b = el('button', 'bulbbtn');
      b.type = 'button';
      b.append(el('i'), el('span', null, `${i + 1} ${l.name}`), el('small', null, l.mode));
      b.style.setProperty('--b', l.tint.join(','));
      b.addEventListener('click', (e) => { setLight(i); blurAfterMouse(e); });
      host.append(b);
      bulbs[i] = b;
    });
  }

  /* ---- styles ---- */
  function buildStyles() {
    const sel = $('#style');
    S.styles.forEach((st, i) => { const o = el('option', null, st.name); o.value = i; o.title = st.note; sel.append(o); });
    const paint = () => { sel.value = S.style; sel.title = S.styles[S.style].note; };
    paint();
    sel.addEventListener('change', (e) => { setStyle(+sel.value); blurAfterMouse(e); });
    syncs.push(paint);
  }

  function setStyle(i) {
    i = (i + S.styles.length) % S.styles.length;
    if (!S.applyStyle(i)) return;
    $('#style').value = i;
    toast(`${S.styles[i].name}: ${S.styles[i].note}${S.playing ? ' (lands on the next bar)' : ''}`, 5200);
    if (!S.playing) app.refreshAll();
  }

  /* ---- tempo: a fine slider (tenths), the exact number, and a drum-and-bass range behind one switch ---- */
  function buildTempo() {
    const host = $('#tempo'), lab = el('label', 'knob'), name = el('span', null, 'Timer'), range = document.createElement('input'), row = el('div', 'temporow'), num = document.createElement('input'), dnb = el('button', null, 'dnb');
    name.append(el('small', null, 'bpm'));
    Object.assign(range, { type: 'range', step: 0.1 });
    range.setAttribute('aria-label', 'Tempo in beats per minute');
    lab.append(name, range);
    Object.assign(num, { type: 'number', min: 60, max: 200, step: 0.1 });
    num.setAttribute('aria-label', 'Exact tempo');
    dnb.type = 'button';
    dnb.title = 'Drum and bass range, up to 180 (\\)';
    row.append(num, dnb);
    host.append(lab, row);
    tempoEls = { range, num, dnb };
    range.addEventListener('input', () => setTempo(+range.value, true));
    num.addEventListener('change', () => { setTempo(+num.value); num.blur(); });
    dnb.addEventListener('click', (e) => { setDnb(!S.dnb); blurAfterMouse(e); });
    syncs.push(paintTempo);
    paintTempo();
  }

  function paintTempo() {
    if (!tempoEls) return;
    const t = A.params.tempo, base = S.dnb ? TEMPO_RANGE.dnb : TEMPO_RANGE.normal;
    tempoEls.range.min = Math.min(base[0], Math.floor(t));      // a journey or a style can be outside the usual range: widen, never clip
    tempoEls.range.max = Math.max(base[1], Math.ceil(t));
    tempoEls.range.value = t;
    if (document.activeElement !== tempoEls.num) tempoEls.num.value = (Math.round(t * 10) / 10).toFixed(1);
    tempoEls.dnb.setAttribute('aria-pressed', String(!!S.dnb));
  }

  function setTempo(v, fromSlider) {
    if (!isFinite(v)) return;
    A.setParam('tempo', clamp(Math.round(v * 10) / 10, 60, 200));
    if (!fromSlider) paintTempo();
    else if (tempoEls && document.activeElement !== tempoEls.num) tempoEls.num.value = A.params.tempo.toFixed(1);
  }

  const nudgeTempo = (d) => setTempo(A.params.tempo + d);

  function setDnb(on) {
    S.dnb = !!on;
    if (on && A.params.tempo < 150) setTempo(174);
    else if (!on && A.params.tempo > 140) setTempo(Math.round(A.params.tempo / 2));
    paintTempo();
    toast(on ? 'Drum and bass range: 150 to 180. The "Rapid Fixer" style has the kit for it.' : 'Back to the usual tempo range.');
  }

  for (const [, label, sub, get, set] of KNOBS) $('#knobs').append(slider(label, sub, get, set));
  buildLights(); buildStyles(); buildTempo();
  Object.assign(app, { KNOBS, syncAll, syncSoon, setLight, setStyle, setTempo, nudgeTempo, setDnb, paintTempo });
}
