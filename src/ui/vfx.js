/* DreVelopDrop: trippy buttons, and presses that feed the picture.
   Every press, on the picture or on any control, does two things.
   1. It tells the visual generator (V.press): a ring and a glyph bloom in the picture, the generator is stirred, the machine warms (see visual/press.js).
   2. It leaves a small burst of colour under the finger. Buttons also shimmer when you hover and squash like jelly when you press (the stylesheet).
   The Trippy setting (0 off, 1 gentle, 2 trippy, 3 full) scales both. A reduced-motion preference turns the movement off and keeps the picture feed. */
import { clamp, hashStr } from '../util.js';

export const VFX_LEVELS = [{ name: 'off', press: 0 }, { name: 'gentle', press: 0.6 }, { name: 'trippy', press: 1 }, { name: 'full', press: 1.6 }];
const SELECTOR = 'button, select, input, label, summary, a, .dot, .cell, #stage';
const MAX_BURSTS = 10;

export function buildVfx(app) {
  const { V, PB } = app;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = 2, alive = 0;

  function set(n) {
    level = clamp(Math.round(n), 0, VFX_LEVELS.length - 1);
    V.pressScale = VFX_LEVELS[level].press;
    for (let i = 0; i < VFX_LEVELS.length; i++) document.body.classList.toggle(`vfx-${i}`, i === level);
    document.body.classList.toggle('vfx-motion', level > 0 && !reduce);
    app.store.set('vfx', level);
  }

  function burst(x, y, id) {
    if (reduce || alive >= MAX_BURSTS) return;
    const b = document.createElement('i');
    b.className = 'vfx-burst';
    b.style.cssText = `left:${x}px;top:${y}px;--h:${id % 360}deg;--s:${0.8 + (level / 3) * 0.9}`;
    alive++;
    b.addEventListener('animationend', () => { b.remove(); alive--; }, { once: true });
    document.body.append(b);
  }

  document.addEventListener('pointerdown', (e) => {
    if (!level) return;
    const t = e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!t || t.disabled) return;
    const id = hashStr(t.id || t.getAttribute('aria-label') || (t.textContent || '').trim().slice(0, 24) || t.tagName + t.className);
    const force = e.pointerType === 'pen' ? clamp((e.pressure || 0.5) * 1.6, 0.2, 2) : 1;
    if (!PB.perf) V.press(e.clientX / innerWidth, e.clientY / innerHeight, id, force);   // a recording that is playing decides its own picture
    if (t.id !== 'stage') burst(e.clientX, e.clientY, id);
  }, true);

  set(app.store.get('vfx', 2));
  Object.assign(app, { vfx: { set, get: () => level, levels: VFX_LEVELS } });
}
