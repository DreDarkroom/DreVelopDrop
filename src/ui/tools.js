/* DreVelopDrop: the tools strip: loop, files, clips, perform (build and drop, journey), recording, and the playback bar for a recording that is opened on this page. */
import { $, el, clamp, download, stamp, fmtBytes, fmtTime } from '../util.js';
import { CONFIG, isOurs } from '../config.js';
import { toast, flash, blurAfterMouse } from './dom.js';
import { snapshot, applySnapshot, saveLoop, clipToJSON, loadClip } from '../engine/loopfile.js';
import { decode } from '../perf/format.js';
import { FORMATS } from '../rec/recorder.js';

const VIDEO_FORMATS = ['webm', 'visuals', 'both', 'mp4', 'screen'];

export function buildTools(app) {
  const { A, S, V, R, PB, M } = app;
  let buildSrc = null, journeyOpen = false, menuOpen = false;
  const journeyCfg = { to: 140, bars: 64, scenes: true };
  const slug = CONFIG.slug, stampShort = () => stamp().slice(0, 13);

  /* ---- builds and drops: held from the keyboard, the mouse, the button or a MIDI pad ---- */
  function startBuild(variant, src) {
    if (buildSrc || PB.perf) return;
    if (!A.ready || !S.playing) return toast('Press play first (enter).');
    if (!S.buildStart(variant)) return;
    buildSrc = src;
    $('#build').classList.add('holding');
  }
  function endBuild(src) {
    if (buildSrc !== src) return;
    buildSrc = null;
    $('#build').classList.remove('holding');
    S.buildRelease();
  }
  const dropBuild = () => { buildSrc = null; $('#build').classList.remove('holding'); };

  /* ---- clips ---- */
  function paintClips() {
    const host = $('#clips');
    host.replaceChildren();
    for (const part of ['drums', 'bass']) {
      const c = S.clips[part];
      if (!c) continue;
      const b = el('button', 'chip' + (c.active ? '' : ' off'), `${part} ${c.bars}`);
      b.type = 'button';
      b.title = 'Click: play or stop · Shift-click: save as a file · Right-click: remove';
      b.addEventListener('click', (e) => {
        if (e.shiftKey) { const name = `${slug}-clip-${part}-${stampShort()}.json`; download(JSON.stringify(clipToJSON(S, A, part)), name, 'application/json'); toast(`Saved ${name}. Drag it back onto the page any time.`); }
        else S.playClip(part, !c.active);
        blurAfterMouse(e);
      });
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); S.clearClip(part); });
      host.append(b);
    }
    const rec = S.clipRec ? S.clipRec.parts : [];
    $('#clipdrums').classList.toggle('armed', rec.includes('drums'));
    $('#clipbass').classList.toggle('armed', rec.includes('bass'));
  }

  function buildClips() {
    const go = (part) => {
      if (!A.ready || !S.playing) return toast('Press play first (enter).');
      if (S.clipRec && S.clipRec.parts.includes(part)) { S.cancelClip(); return toast('Clip recording cancelled.'); }
      const bars = +$('#clipbars').value;
      if (S.recordClip(part, bars)) toast(`Recording ${bars} bar${bars > 1 ? 's' : ''} of ${part} from the next bar. Play, it loops when done.`, 4500);
    };
    $('#clipdrums').addEventListener('click', (e) => { go('drums'); blurAfterMouse(e); });
    $('#clipbass').addEventListener('click', (e) => { go('bass'); blurAfterMouse(e); });
    $('#clipbars').addEventListener('change', (e) => e.target.blur());
    paintClips();
  }

  /* ---- journey: tempo creeps up and the picture progresses ---- */
  function buildJourneyPop() {
    const pop = $('#journeypop'), close = el('button', 'close', '×'), to = document.createElement('input'), bars = document.createElement('select'), scenes = document.createElement('input'), go = el('button', null, 'start'), hint = el('p', null, '');
    pop.classList.add('card');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => toggleJourneyPop(false));
    Object.assign(to, { type: 'number', min: 60, max: 200, step: 1, value: journeyCfg.to });
    to.setAttribute('aria-label', 'Tempo to arrive at');
    bars.setAttribute('aria-label', 'How many bars the journey takes');
    for (const n of [16, 32, 64, 128, 256]) { const o = el('option', null, `${n} bars`); o.value = n; bars.append(o); }
    bars.value = journeyCfg.bars;
    Object.assign(scenes, { type: 'checkbox', checked: true });
    go.type = 'button';
    const rows = [el('div', 'row'), el('div', 'row'), el('div', 'row')];
    const l1 = el('label', null, 'to'), l2 = el('label', null, 'over'), l3 = el('label');
    l1.append(to, el('span', null, 'bpm')); l2.append(bars); l3.append(scenes, el('span', null, 'change the picture too'));
    rows[0].append(l1, l2); rows[1].append(l3); rows[2].append(go);
    pop.append(close, el('h3', null, 'Journey'), el('p', null, 'Slowly raise the tempo while the picture changes and thickens. It starts on the next bar.'), ...rows, hint);
    const read = () => { journeyCfg.to = clamp(+to.value || 140, 60, 200); journeyCfg.bars = +bars.value; journeyCfg.scenes = scenes.checked; };
    go.addEventListener('click', () => { if (S.journey) stopJourney(); else startJourney(read); });
    Object.assign(pop, { _go: go, _hint: hint, _read: read, _to: to });
    paintJourney();
  }

  function startJourney(read) {
    (read || $('#journeypop')._read)();
    if (!A.ready || !S.playing) return toast('Press play first (enter).');
    if (S.journeyStart(journeyCfg)) toast(`Journey: ${A.params.tempo} to ${journeyCfg.to} bpm over ${journeyCfg.bars} bars.`, 4500);
    paintJourney();
  }
  function stopJourney() { S.journeyStop(); paintJourney(); toast('Journey stopped where it was.'); }

  function paintJourney() {
    const pop = $('#journeypop');
    if (!pop._go) return;
    const j = S.journey;
    pop._go.textContent = j ? 'stop' : 'start';
    pop._hint.textContent = j ? `${Math.round(j.to - j.from ? (100 * (A.params.tempo - j.from)) / (j.to - j.from) : 0)}% of the way to ${j.to} bpm` : '';
    $('#journey').classList.toggle('armed', !!j);
  }

  function toggleJourneyPop(force) {
    journeyOpen = force != null ? force : !journeyOpen;
    $('#journeypop').hidden = !journeyOpen;
    if (journeyOpen) { app.closePanels('journey'); $('#journeypop')._to.value = S.dnb && journeyCfg.to < 150 ? 174 : journeyCfg.to; }
  }

  /* ---- files menu: several kinds of JSON out, and loops back in ---- */
  const closeMenu = () => { menuOpen = false; $('#filesmenu').hidden = true; $('#files').setAttribute('aria-expanded', 'false'); };

  function buildFilesMenu() {
    const menu = $('#filesmenu'), btn = $('#files'), pick = $('#pick');
    const item = (label, hint, fn) => { const b = el('button', null, label); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.title = hint; b.addEventListener('click', () => { closeMenu(); fn(); }); menu.append(b); };
    item('Export everything', 'Bass, drums, sound settings, light and drift: the whole loop as a .json file', () => exportKind('loop'));
    item('Export bass line only', 'Just the 16-step bass pattern', () => exportKind('pattern'));
    item('Export drums only', 'Just the three drummer rings', () => exportKind('drums'));
    item('Export sound only', 'Knobs, tempo, swing, drift and light, without the notes', () => exportKind('sound'));
    menu.append(el('hr'));
    item('Copy loop to clipboard', 'Paste it into a message or another browser', async () => {
      try { await navigator.clipboard.writeText(JSON.stringify(snapshot(S, A))); toast('Loop copied. Paste it anywhere; use files → paste loop to load it back.'); } catch (err) { toast('The browser would not let me use the clipboard. Use export instead.'); }
    });
    item('Import from a file…', 'Load a loop, a clip or a recording (you can also drag it onto the page)', () => pick.click());
    item('Paste loop from clipboard', 'Load a loop someone sent you as text', async () => {
      try { importText(await navigator.clipboard.readText(), 'clipboard'); } catch (err) { toast('The browser would not let me read the clipboard. Use import from a file instead.'); }
    });
    btn.addEventListener('click', () => { menuOpen = !menuOpen; menu.hidden = !menuOpen; btn.setAttribute('aria-expanded', String(menuOpen)); });
    document.addEventListener('pointerdown', (e) => { if (menuOpen && !e.target.closest('#filesmenu, #files')) closeMenu(); });
    pick.addEventListener('change', () => { const files = [...pick.files]; pick.value = ''; handleFiles(files); });
  }

  function exportKind(kind) {
    const names = { loop: 'loop', pattern: 'bass', drums: 'drums', sound: 'sound' }, name = `${slug}-${names[kind]}-${stampShort()}.json`;
    download(JSON.stringify(snapshot(S, A, kind), null, 2), name, 'application/json');
    toast(`Exported ${name}`);
  }

  /* ---- anything dropped on the page: a recording, a loop, a clip, a MIDI map ---- */
  async function handleFiles(files) { for (const f of files.slice(0, 4)) { try { await importFile(f); } catch (err) { toast(`${f.name}: ${err.message}`); } } }

  async function importFile(f) {
    const head = new Uint8Array(await f.slice(0, 2).arrayBuffer());
    if ((head[0] === 0x1f && head[1] === 0x8b) || /\.sqz$/i.test(f.name)) {
      if (f.size > 60 * 1024 * 1024) return toast('That file is too large to be a performance.');
      return openRecording(new Uint8Array(await f.arrayBuffer()), f.name);
    }
    if (f.size > 4 * 1024 * 1024) return toast(`${f.name} is too big to be a loop or a clip.`);
    importText(await f.text(), f.name);
  }

  function importText(text, source) {
    let j = null;
    try { j = JSON.parse(text); } catch (err) { /* handled below */ }
    if (j && j.kind === 'performance') return openRecording(new TextEncoder().encode(text), source);
    if (j && j.kind === 'clip') {
      const part = loadClip(S, A, j);
      if (!part) return toast(`${source} is not a clip this page can use. Nothing was changed.`);
      paintClips();
      return toast(S.playing ? `${part} clip loaded. It comes in on the next bar, in time.` : `${part} clip loaded. It starts when you press play.`);
    }
    if (j && j.kind === 'midi-map') { const n = M.fromJSON(j); return toast(n < 0 ? `${source} is not a MIDI map this page can use.` : `MIDI map loaded (${n} controls).`); }
    if (!j || !isOurs(j) || !applySnapshot(S, A, j)) return toast(`${source} is not a loop this page can use. Nothing was changed.`);
    app.refreshAll();
    toast(`${{ loop: 'Loop', pattern: 'Bass line', drums: 'Drums', sound: 'Sound settings' }[j.kind || 'loop']} loaded from ${source}. (Save loop makes it the one that comes back next time.)`);
  }

  /* ---- a recording takes over the page (and the audio) until "back to live" ---- */
  let liveSnap = null;

  async function openRecording(bytes, name) {
    try { if (!(await decode(bytes)).events.length) throw new Error('that recording is empty'); } catch (err) { return toast(`${name}: ${err.message}`); }
    if (R.state.active) return toast('Stop recording first, then open a recording.');
    if (!PB.perf) liveSnap = snapshot(S, A);
    if (S.playing) { S.buildCancel(); S.journeyStop(); S.stop(); $('#play').textContent = 'play'; }
    document.body.classList.add('lit', 'playback');
    try { const doc = await PB.load(bytes); $('#pseek').max = doc.duration; } catch (err) { return backToLive(); }
    $('#pbar').hidden = false;
    await PB.play();
    toast(`Playing ${name}. Press back to live to play again yourself.`, 5200);
  }

  async function backToLive() {
    await PB.close();
    $('#pbar').hidden = true;
    document.body.classList.remove('playback');
    if (liveSnap) { applySnapshot(S, A, liveSnap); liveSnap = null; }
    V.setScene(S.scene);
    app.refreshAll();
    if (A.ready) { S.start(); $('#play').textContent = 'stop'; app.updateWake(); }
  }

  function buildPlaybackBar() {
    let dragging = false;
    PB.onChange = () => {
      if (!PB.perf) return;
      const p = PB.position();
      if (!dragging) $('#pseek').value = p;
      $('#ptime').textContent = `${fmtTime(p)} / ${fmtTime(PB.perf.duration)}`;
      $('#pplay').textContent = PB.playing ? '❚❚' : '▶';
      $('#pplay').setAttribute('aria-label', PB.playing ? 'Pause' : 'Play');
    };
    $('#pplay').addEventListener('click', (e) => { PB.toggle(); blurAfterMouse(e); });
    $('#pclose').addEventListener('click', backToLive);
    const seek = $('#pseek');
    seek.addEventListener('input', () => { dragging = true; if (PB.perf) $('#ptime').textContent = `${fmtTime(+seek.value)} / ${fmtTime(PB.perf.duration)}`; });
    seek.addEventListener('change', () => { dragging = false; PB.seek(+seek.value); seek.blur(); });
  }

  function buildDrop() {
    const zone = $('#dropzone');
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
    addEventListener('dragenter', (e) => { if (hasFiles(e)) { depth++; zone.hidden = false; } });
    addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) zone.hidden = true; });
    addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; zone.hidden = true; handleFiles([...e.dataTransfer.files]); });
  }

  /* ---- recording ---- */
  function buildRecorder() {
    const sel = $('#recfmt'), btn = $('#rec'), snap = $('#snap'), q = $('#recq'), sup = R.support(), dest = $('#recdest');
    for (const [key, f] of Object.entries(FORMATS)) {
      const o = el('option', null, f.label);
      o.value = key; o.title = f.hint;
      if (sup[key] === false) { o.disabled = true; o.textContent += ' — not in this browser'; }
      sel.append(o);
    }
    const last = app.store.get('recfmt'), lq = app.store.get('recq');
    if (last && sel.querySelector(`option[value="${last}"]:not(:disabled)`)) sel.value = last;
    if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled) sel.value = 'wav';
    if (lq && q.querySelector(`option[value="${lq}"]`)) q.value = lq;
    R.toStudio = app.store.get('toStudio', true) !== false;
    dest.checked = R.toStudio;
    const paintFmt = () => {
      sel.title = FORMATS[sel.value].hint;
      q.hidden = !VIDEO_FORMATS.includes(sel.value);
      dest.parentElement.hidden = !FORMATS[sel.value].studio;
      R.videoBitrate = +q.value;
    };
    paintFmt();
    sel.addEventListener('change', (e) => { paintFmt(); app.store.set('recfmt', sel.value); blurAfterMouse(e); });
    q.addEventListener('change', (e) => { paintFmt(); app.store.set('recq', q.value); blurAfterMouse(e); });
    dest.addEventListener('change', () => { R.toStudio = dest.checked; app.store.set('toStudio', dest.checked); });

    btn.addEventListener('click', async (e) => {
      blurAfterMouse(e);
      try {
        if (R.state.active) {
          const r = await R.stop();
          if (r) {
            toast(`Saved ${r.name} · ${fmtBytes(r.bytes)} · ${fmtTime(r.seconds)}` + (r.where === 'studio' ? ' (in the Studio)' : r.where === 'memory' ? ' (in your Downloads)' : ''), 7000);
            if (r.where === 'studio' && r.ids[0]) $('#studiolink').href = `studio.html?take=${r.ids[0]}`;       // the Studio link now opens what you just made
          }
        } else {
          if (!A.ready) return toast('Turn on the safelight first.');
          if (PB.perf) return toast('Go back to live before recording.');
          await R.start(sel.value);
        }
      } catch (err) { toast(`Recording problem: ${err.message}`, 7000); }
    });
    snap.addEventListener('click', async (e) => { blurAfterMouse(e); try { toast(`Saved ${await R.snap()}`); } catch (err) { toast(`Could not save a picture: ${err.message}`); } });
    R.onUpdate = (st) => {
      document.body.classList.toggle('recording', !!st.active);
      btn.textContent = st.active ? 'stop rec' : '● rec';
      btn.setAttribute('aria-pressed', String(!!st.active));
      sel.disabled = q.disabled = dest.disabled = !!st.active;
      $('#recinfo').textContent = st.active ? `${fmtTime(R.elapsed())}${st.format === 'perf' ? '' : ' · ' + fmtBytes(st.bytes || 0)}` : '';
    };
    R.onAuto = (r) => toast(`Recording stopped: ${r.reason}. Saved ${r.name}.`, 9000);
  }

  /* ---- the simple buttons ---- */
  function buildSimple() {
    $('#save').addEventListener('click', (e) => {
      const ok = saveLoop(S, A);
      flash(e.currentTarget, ok ? 'saved ✓' : 'no storage');
      toast(ok ? 'Loop saved in this browser. It comes back next time you open this page.' : 'This browser blocked saving. Use files → export instead.');
      blurAfterMouse(e);
    });
    $('#revert').addEventListener('click', (e) => { S.goHome(); app.paintRoll(); toast('Bass pattern returned to your saved loop.'); blurAfterMouse(e); });
    $('#clearbass').addEventListener('click', (e) => { app.clearPart('bass'); blurAfterMouse(e); });
    $('#cleardrums').addEventListener('click', (e) => { app.clearPart('drums'); blurAfterMouse(e); });
    $('#clean').addEventListener('click', (e) => { app.setClean(true); blurAfterMouse(e); });
    $('#play').addEventListener('click', (e) => { app.togglePlay(); blurAfterMouse(e); });
    const b = $('#build');
    b.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; b.setPointerCapture(e.pointerId); startBuild(e.shiftKey ? 1 : 0, 'button'); });
    const up = () => endBuild('button');
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    $('#quant').addEventListener('change', (e) => { S.setQuant(e.target.value); e.target.blur(); });
    $('#journey').addEventListener('click', (e) => { toggleJourneyPop(); blurAfterMouse(e); });
    $('#midi').addEventListener('click', (e) => { app.toggleMidi(); blurAfterMouse(e); });
  }

  buildSimple(); buildClips(); buildJourneyPop(); buildFilesMenu(); buildRecorder(); buildPlaybackBar(); buildDrop();
  Object.assign(app, {
    startBuild, endBuild, dropBuild, paintClips, paintJourney, startJourney, stopJourney, toggleJourneyPop, closeMenu, openRecording, backToLive, importText,
    journeyOpen: () => journeyOpen, menuOpen: () => menuOpen, toggleJourneyPopClosed: () => toggleJourneyPop(false),
  });
}
