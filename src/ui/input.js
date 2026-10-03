/* DreVelopDrop: keyboard (a row of piano, space to build and drop, a few keys for everything else) and pointer (one set of gestures for mouse, finger and pen).
   mouse   drag = squeegee · right or middle button held = build (middle: the other way) · release = drop
   pen     pressure sets the blade (a light touch is fine and precise), the barrel button builds, the eraser end is ignored
   finger  one finger = squeegee · two fingers held = build · three = the other way · release = drop · double-tap = hide or show the panel
   A pen resting on the screen makes the palm look like touches: touches are ignored for a moment after any pen contact. */
import { $, clamp, round } from '../util.js';
import { toast, closeCtx, ctxOpen } from './dom.js';
import { MUTE_KEYS } from './grid.js';

const KEYS = 'awsedftgyhujkolp';
const isField = (t) => t && (t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'checkbox'));

export function buildInput(app) {
  const { A, S, V, PB, P } = app;
  let heldKey = null;

  function keys() {
    addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isField(e.target)) return;
      const k = e.key.toLowerCase();
      if (PB.perf) {                                          // a recording is playing: only the transport and the view
        if (k === ' ') { e.preventDefault(); if (!e.repeat) PB.toggle(); }
        else if (k === 'arrowleft') PB.seek(PB.position() - 10);
        else if (k === 'arrowright') PB.seek(PB.position() + 10);
        else if (k === 'escape') { if (app.isClean()) app.setClean(false); else app.backToLive(); }
        else if (!e.repeat && k === 'c') app.setClean(!app.isClean());
        else if (!e.repeat && k === 'q') toast(`Picture quality: ${V.cycleQuality()}`);
        return;
      }
      if (k === ' ') { e.preventDefault(); if (!e.repeat) app.startBuild(e.shiftKey ? 1 : 0, 'key'); return; }
      if (e.repeat) return;
      if (k === 'escape') {
        if (ctxOpen()) closeCtx();
        else if (app.menuOpen()) app.closeMenu();
        else if (app.anyPanelOpen()) app.closePanels();
        else if (app.isClean()) app.setClean(false);
      } else if (k === 'enter' && document.activeElement.tagName !== 'BUTTON') app.togglePlay();
      else if (k === '`') document.body.classList.toggle('bare');   // hide/show the panel (H is a piano key now)
      else if (k === '?') app.toggleHelp();
      else if (k === 'c') app.setClean(!app.isClean());
      else if (k === 'f' && e.shiftKey) app.toggleFullscreen();    // plain F is a piano key
      else if (k === 'd' && e.shiftKey) app.dev.toggle();          // plain D is a piano key
      else if (k === 'q') toast(`Picture quality: ${V.cycleQuality()}`);
      else if (k >= '1' && k <= '3') app.setLight(+k - 1);
      else if (k === '0') app.toggleDarkroom();
      else if (MUTE_KEYS[k]) app.toggleMute(MUTE_KEYS[k]);
      else if (k === 'n') app.clearPart(e.shiftKey ? 'drums' : 'bass');
      else if (k === ';') app.setStyle(S.style - 1);
      else if (k === "'") app.setStyle(S.style + 1);
      else if (k === '[') app.nudgeTempo(-1);
      else if (k === ']') app.nudgeTempo(1);
      else if (k === '{') app.nudgeTempo(-0.1);
      else if (k === '}') app.nudgeTempo(0.1);
      else if (k === '\\' || k === '|') app.setDnb(!S.dnb);
      else if (k === 'r') {
        if (e.shiftKey) { S.cancelClip(); S.clearClip('drums'); S.clearClip('bass'); toast('Clips cleared.'); }
        else if (A.ready && S.playing && S.recordClip('both', +$('#clipbars').value)) toast('Recording drums and bass from the next bar, then looping them.');
      } else if (k === 'i') { if (S.journey) app.stopJourney(); else app.startJourney(); }
      else if (k === 'm') app.toggleMidi();
      else if (A.ready && KEYS.includes(k)) { heldKey = k; A.noteOn(A.now() + 0.005, A.params.root + 12 + KEYS.indexOf(k), 0.8, false); }
    });
    addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); app.endBuild('key'); }
      else if (k === heldKey) { heldKey = null; A.noteOff(A.now() + 0.005); }
    });
    addEventListener('blur', () => { app.endBuild('key'); app.endBuild('pointer'); app.endBuild('touch'); });   // never leave a build hanging when the window loses focus
  }

  function pointer() {
    const stage = $('#stage'), fingers = new Set();           // touches currently down on the picture
    let strokeId = null, prev = null, quiet = 0, penAt = -1e9, moved = 0, downAt = 0, lastTap = { t: -1e9, x: 0, y: 0 }, buildTimer = 0;

    // A right-click is an instrument here, never a browser menu (which would also land in a screen recording).
    document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, select, textarea')) e.preventDefault(); });

    const endStroke = () => {
      if (strokeId === null) return;
      strokeId = null; prev = null;
      V.wipeEnd(); A.setParam('mod', 0.5); A.squeak(0);
    };

    stage.addEventListener('pointerdown', (e) => {
      const now = performance.now();
      if (e.pointerType === 'pen') penAt = now;
      else if (e.pointerType === 'touch' && now - penAt < 700) return;                // palm rejection
      if (e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32))) return;     // the eraser end does nothing
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* the pointer already ended: carry on */ }
      if (e.button === 2 || e.button === 1) { e.preventDefault(); app.startBuild(e.button === 1 || e.shiftKey ? 1 : 0, 'pointer'); return; }
      if (PB.perf && !app.pressInPlayback) return;
      if (e.pointerType === 'touch') {
        fingers.add(e.pointerId);
        if (fingers.size >= 2) {                                                         // a second finger turns the gesture into a build
          endStroke();
          clearTimeout(buildTimer);
          buildTimer = setTimeout(() => app.startBuild(fingers.size >= 3 ? 1 : 0, 'touch'), 110);   // wait a beat in case a third finger follows
          return;
        }
      }
      strokeId = e.pointerId;
      prev = { x: e.clientX, y: e.clientY };
      moved = 0; downAt = now;
    });

    stage.addEventListener('pointermove', (e) => {
      if (e.pointerId !== strokeId || !prev) return;
      // every point the device reported since the last event (a pen reports far more than the frame rate)
      const co = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [], pts = co.length ? co : [e];
      for (const q of pts) {
        const size = e.pointerType === 'pen' ? clamp(0.2 + 0.95 * (q.pressure || 0.5), 0.2, 1.3) : 1;
        V.wipe(q.clientX, q.clientY, prev.x, prev.y, size);
        if (P.active) {
          const args = [round(q.clientX / innerWidth, 3), round(q.clientY / innerHeight, 3), round(prev.x / innerWidth, 3), round(prev.y / innerHeight, 3)];
          if (size !== 1) args.push(round(size, 3));
          P.log(A.now(), 8, ...args);
        }
        const x = q.clientX / innerWidth;
        A.setParam('mod', x);
        A.squeak((Math.hypot(q.clientX - prev.x, q.clientY - prev.y) / 40) * (e.pointerType === 'pen' ? 0.4 + (q.pressure || 0.5) : 1), x);
        moved += Math.abs(q.clientX - prev.x) + Math.abs(q.clientY - prev.y);
        prev = { x: q.clientX, y: q.clientY };
      }
      clearTimeout(quiet);
      quiet = setTimeout(() => A.squeak(0), 90);
    });

    const release = (e) => {
      if (e.button === 2 || e.button === 1) { app.endBuild('pointer'); return; }
      if (e.pointerType === 'touch' && fingers.delete(e.pointerId) && fingers.size < 2) { clearTimeout(buildTimer); app.endBuild('touch'); }
      if (e.pointerId !== strokeId) return;
      const tap = moved < 10 && performance.now() - downAt < 280 && e.pointerType !== 'mouse' && e.type === 'pointerup';
      endStroke();
      if (tap) {                                                                          // double-tap hides or shows the panel
        const now = performance.now();
        if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { document.body.classList.toggle('bare'); lastTap.t = -1e9; }
        else lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', (e) => { release(e); app.endBuild('pointer'); if (e.pointerType === 'touch') { fingers.clear(); app.endBuild('touch'); } });
    stage.addEventListener('auxclick', (e) => e.preventDefault());
  }

  keys();
  pointer();
}
