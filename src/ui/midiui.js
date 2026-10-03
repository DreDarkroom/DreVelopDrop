/* DreVelopDrop: MIDI: the actions that can be learned, and the panel that shows them. The mapping itself lives in midi.js. */
import { $, el, stamp, download } from '../util.js';
import { CONFIG } from '../config.js';
import { toast } from './dom.js';
import { M } from '../midi.js';

const QUICK_MAP = ['play', 'build', 'mute-kick', 'mute-snare', 'mute-hat', 'mute-bass', 'style-next', 'style-prev', 'cutoff', 'reso', 'space', 'level', 'tempo'];
const PART_LABEL = { kick: 'kick', snare: 'snare', hat: 'hats', bass: 'bass' };
const keyText = (k) => { const [ch, t, n] = k.split(':'); return `ch ${+ch + 1} ${t === 'n' ? 'note' : 'cc'} ${n}`; };
const TRAKTOR = "Traktor Kontrol X1 MK2: Native Instruments' manual says to hold SHIFT and press both LOAD buttons to switch it to its plain MIDI mode. Then run quick map and touch each control when asked. Nothing here is tied to one device, so any MIDI controller works.";

export function buildMidi(app) {
  const { A, S, V } = app;
  let open = false;

  function define() {
    const btn = (id, label, group, down, up) => M.define(id, { label, group, kind: 'button', down, up });
    btn('play', 'Play / stop', 'Transport', () => app.togglePlay());
    btn('build', 'Build, let go to drop', 'Transport', () => app.startBuild(0, 'midi'), () => app.endBuild('midi'));
    btn('build-sink', 'Build under water, let go to drop', 'Transport', () => app.startBuild(1, 'midi'), () => app.endBuild('midi'));
    for (const part of S.PARTS) btn(`mute-${part}`, `Mute ${PART_LABEL[part]}`, 'Layers', () => app.toggleMute(part));
    btn('clear-bass', 'Clear the bass line', 'Layers', () => app.clearPart('bass'));
    btn('clear-drums', 'Clear the drums', 'Layers', () => app.clearPart('drums'));
    btn('clip-drums', 'Record a drums clip', 'Layers', () => $('#clipdrums').click());
    btn('clip-bass', 'Record a bass clip', 'Layers', () => $('#clipbass').click());
    btn('style-next', 'Next style', 'Show', () => app.setStyle(S.style + 1));
    btn('style-prev', 'Previous style', 'Show', () => app.setStyle(S.style - 1));
    btn('scene-next', 'Next picture', 'Show', () => V.setScene((S.scene = (S.scene + 1) % 5)));
    btn('light-next', 'Next light', 'Show', () => app.setLight((S.light + 1) % 3));
    btn('journey', 'Start or stop the journey', 'Show', () => { if (S.journey) app.stopJourney(); else app.startJourney(); });
    btn('tempo-up', 'Tempo up 1', 'Time', () => app.nudgeTempo(1));
    btn('tempo-down', 'Tempo down 1', 'Time', () => app.nudgeTempo(-1));
    for (const [id, label, sub, get, set] of app.KNOBS) M.define(id, { label: `${label} (${sub})`, group: 'Knobs', kind: 'knob', min: 0, max: 1, get, set: (v) => { set(v); app.syncSoon(); } });
    M.define('tempo', { label: 'Tempo', group: 'Time', kind: 'knob', min: 70, max: 180, get: () => A.params.tempo, set: (v) => { app.setTempo(v); app.syncSoon(); } });
  }

  function paint() {
    if (!open) return;
    const p = $('#midipanel'), close = el('button', 'close', '×'), top = el('div', 'row');
    p.classList.add('card');
    p.replaceChildren();
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => toggle(false));
    p.append(close, el('h3', null, 'MIDI controller'));
    p.append(el('p', null, M.state === 'on' ? (M.inputs.length ? `Connected: ${M.inputs.join(', ')}` : 'Allowed, but no controller found. Plug one in.')
      : M.state === 'unsupported' ? 'This browser has no Web MIDI (Chrome and Edge do).'
        : M.state === 'denied' ? 'MIDI was not allowed. It needs the hosted page or localhost, and your permission.' : 'Not connected.'));
    const mk = (label, fn, title) => { const b = el('button', null, label); b.type = 'button'; if (title) b.title = title; b.addEventListener('click', fn); top.append(b); };
    if (M.state !== 'on') mk('connect', async () => { try { const names = await M.enable(); toast(names.length ? `MIDI: ${names.join(', ')}` : 'MIDI is on. Plug in a controller.'); } catch (err) { toast(err.message, 6000); } paint(); }, 'The browser asks for permission');
    else {
      mk('quick map', () => M.quickMap(QUICK_MAP), 'Walk through the main controls one by one');
      if (M.learning) { mk('skip', () => M.skip()); mk('stop', () => M.cancelLearn()); }
      mk('clear all', () => M.clearAll());
      mk('save map', () => { const n = `${CONFIG.slug}-midi-${stamp().slice(0, 13)}.json`; download(JSON.stringify(M.toJSON(), null, 2), n, 'application/json'); toast(`Saved ${n}`); });
      mk('load map', () => $('#pick').click(), 'Choose a saved map file (or drag it onto the page)');
    }
    p.append(top);
    if (M.learning) p.append(el('p', null, `Now press a button or move a knob for: ${M.actions.get(M.learning).label}`));
    p.append(Object.assign(el('div', 'mon'), { textContent: M.log.length ? M.log.slice(-4).join('\n') : 'Messages from your controller show here.' }));
    if (M.state === 'on') {
      const table = el('table');
      let group = null;
      for (const a of M.actions.values()) {
        if (a.group !== group) { group = a.group; const tr = el('tr'), td = el('td', 'group-h', group); td.colSpan = 3; tr.append(td); table.append(tr); }
        const tr = el('tr'), cur = M.keyOf(a.id), c2 = el('td', 'k', cur ? keyText(cur.key) : '—'), c3 = el('td'), lb = el('button', null, M.learning === a.id ? 'listening…' : 'learn');
        if (M.learning === a.id) tr.className = 'listening';
        if (cur && a.kind === 'knob') {
          const mb = el('button', null, cur.mode === 'abs' ? 'absolute' : cur.mode === 'twos' ? 'relative' : 'relative (offset)');
          mb.type = 'button';
          mb.title = 'Knobs that spin endlessly are relative; click to change how this one is read';
          mb.addEventListener('click', () => M.cycleMode(a.id));
          c2.append(' ', mb);
        }
        lb.type = 'button';
        lb.addEventListener('click', () => M.learn(a.id));
        c3.append(lb);
        if (cur) { const fb = el('button', null, '×'); fb.type = 'button'; fb.title = 'Forget this mapping'; fb.addEventListener('click', () => M.forget(a.id)); c3.append(' ', fb); }
        tr.append(el('td', null, a.label), c2, c3);
        table.append(tr);
      }
      p.append(table);
    }
    p.append(el('p', null, TRAKTOR));
  }

  function toggle(force) {
    open = force != null ? force : !open;
    $('#midipanel').hidden = !open;
    if (open) { app.closePanels('midi'); paint(); }
  }

  define();
  M.restore();
  M.onChange = paint;
  if (M.map.size && M.supported() && navigator.permissions && navigator.permissions.query) {    // a mapping exists and MIDI was already allowed here: reconnect quietly
    navigator.permissions.query({ name: 'midi' }).then((s) => { if (s.state === 'granted') M.enable().catch(() => {}); }).catch(() => {});
  }
  Object.assign(app, { toggleMidi: toggle, midiOpen: () => open, M });
}
