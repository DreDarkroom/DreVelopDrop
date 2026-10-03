/* DreVelopDrop: the instrument page. Makes the engines, builds every part of the interface, and connects them. */
import { $, store } from './util.js';
import { createAudio } from './engine/audio.js';
import { createSeq } from './engine/seq.js';
import { makeClock } from './engine/clock.js';
import { LIGHTS } from './engine/styles.js';
import { loadLoop } from './engine/loopfile.js';
import { snapshot } from './engine/loopfile.js';
import { createRecorder } from './perf/format.js';
import { createPlayback } from './perf/playback.js';
import { createVisual } from './visual/engine.js';
import { createRecording } from './rec/recorder.js';
import { M } from './midi.js';
import { buildGrid } from './ui/grid.js';
import { buildControls } from './ui/controls.js';
import { buildTools } from './ui/tools.js';
import { buildView, isTouchDevice } from './ui/view.js';
import { buildInput } from './ui/input.js';
import { buildMidi } from './ui/midiui.js';
import { buildVfx } from './ui/vfx.js';
import { buildSettings } from './ui/settings.js';
import { buildDev } from './dev/devtools.js';

export function start() {
  const qs = new URLSearchParams(location.search);
  const A = createAudio(), S = createSeq(A), V = createVisual({ audio: A }), P = createRecorder();
  A.profile = qs.get('profile') || (isTouchDevice() ? 'mobile' : 'desktop');          // decided before any audio exists
  const R = createRecording({ audio: A, perf: P, snapshot: () => snapshot(S, A), canvas: $('#stage') });
  const PB = createPlayback({ audio: A, visual: V, makeClock, onLight: (i) => document.documentElement.style.setProperty('--tint-rgb', LIGHTS[i].tint.join(',')) });
  const app = { A, S, V, P, R, PB, M, qs, store };
  V.log = (code, ...args) => { if (P.active) P.log(A.now(), code, ...args); };
  V.styleScene = () => S.scene;

  S.drift = 0.4;
  loadLoop(S, A);                                                                     // a loop saved with "save loop" comes back before the controls are built
  V.init($('#stage'));

  /* panels that share the right-hand side: opening one closes the others */
  app.closePanels = (except) => {
    if (except !== 'journey' && app.journeyOpen()) app.toggleJourneyPopClosed();
    if (except !== 'midi' && app.midiOpen()) app.toggleMidi(false);
    if (except !== 'help' && !$('#help').hidden) app.toggleHelp(false);
    if (except !== 'settings' && app.settingsOpen()) app.toggleSettings(false);
  };
  app.anyPanelOpen = () => app.journeyOpen() || app.midiOpen() || !$('#help').hidden || app.settingsOpen();
  app.ecoChanged = () => {};

  /* after an import, a style or a MIDI move: bring every control in line with the model */
  app.refreshAll = () => {
    S.drummers.forEach((d, i) => app.renderRing(i));
    app.paintGhosts(); app.paintRoll(); app.paintMutes(); app.paintClips(); app.paintJourney(); app.syncAll();
    S.PARTS.forEach((p) => app.paintLevel(p));
    app.setLight(S.light);
  };

  function togglePlay() {
    if (!A.ready || PB.perf) return;
    if (S.playing) { S.buildCancel(); S.journeyStop(); app.dropBuild(); V.setBuild(0); S.stop(); } else S.start();
    $('#play').textContent = S.playing ? 'stop' : 'play';
    app.paintJourney(); app.paintBattery(); app.updateWake();
  }
  app.togglePlay = togglePlay;

  async function powerOn() {
    document.body.classList.add('lit');
    await A.init();
    app.startClock();                                                                 // the set clock starts when the music does
    S.start();
    app.paintBattery();
    $('#play').textContent = 'stop';
    app.updateWake();
  }

  /* ---- the sequencer's timed events, released by the picture when they are heard ---- */
  let armedTimer = 0;
  V.onEvent = (e) => {
    app.gridEvent(e);
    switch (e.type) {
      case 'step': app.batteryBeat(e.a); break;
      case 'style': app.refreshAll(); break;
      case 'dropArmed': { const a = $('#armed'); a.textContent = 'drop ▸'; a.hidden = false; clearTimeout(armedTimer); armedTimer = setTimeout(() => { a.hidden = true; }, Math.max(500, (e.a || 0) * 1000 + 600)); break; }
      case 'drop': $('#armed').hidden = true; break;
      case 'journey': app.paintTempo(); app.paintJourney(); break;
      case 'journeyEnd': app.paintJourney(); break;
      case 'clipDone': case 'clipState': case 'clipArmed': case 'clipRec': case 'clipCancel': app.paintClips(); break;
      default:
    }
  };

  buildGrid(app);
  buildControls(app);
  buildTools(app);
  buildView(app);
  buildMidi(app);
  buildVfx(app);
  buildSettings(app);
  buildDev(app);
  buildInput(app);
  app.setLight(S.light);
  $('#dre').addEventListener('click', app.toggleDarkroom);
  $('#switch').addEventListener('click', () => {
    if (isTouchDevice() && qs.get('fullscreen') !== '0') app.toggleFullscreen();      // must happen synchronously inside the tap
    powerOn();
  });
  // a set is not something to lose to a stray Ctrl+W or F5
  addEventListener('beforeunload', (e) => { if (S.playing || R.state.active || PB.playing) { e.preventDefault(); e.returnValue = ''; } });
  // options for OBS and friends: ?clean=1 (no panel, no fullscreen prompt), ?autostart=1, ?dev=1, ?quality=low|medium|high, ?eco=1
  if (qs.get('clean') === '1') { document.body.classList.add('clean'); $('#clean').setAttribute('aria-pressed', 'true'); }
  if (qs.get('autostart') === '1') powerOn().catch(() => { /* the browser wants a click first: the splash stays */ });
  window.__dd = app;                                                                  // a handle for the console, the tests and the benchmark
  return app;
}
