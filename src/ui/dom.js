/* DreVelopDrop: the few DOM helpers the interface shares: a toast, a context menu, a flashing label. */
import { $, el, clamp } from '../util.js';

let toastTimer = 0;
/** A small message that fades by itself. */
export function toast(msg, ms = 3800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/** Briefly replace a button's label. */
export function flash(b, text) {
  const was = b.dataset.was || b.textContent;
  b.dataset.was = was;
  b.textContent = text;
  setTimeout(() => (b.textContent = was), 1400);
}

/* ---- the small context menu (right-click on the bass grid or a drummer) ---- */
let ctxEl = null;
export const closeCtx = () => { if (ctxEl) { ctxEl.remove(); ctxEl = null; } };
export const ctxOpen = () => !!ctxEl;

/** items: [label, fn] or [label, fn, {dim: true}] or '-' . Opens at the pointer and stays inside the window. */
export function openCtx(x, y, title, items) {
  closeCtx();
  const m = el('div');
  m.id = 'ctx';
  m.setAttribute('role', 'menu');
  if (title) m.append(el('div', 'ctxh', title));
  for (const it of items) {
    if (it === '-') { m.append(el('hr')); continue; }
    const b = el('button', it[2] && it[2].dim ? 'dim' : null, it[0]);
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.addEventListener('click', () => { closeCtx(); it[1](); });
    m.append(b);
  }
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = `${clamp(x, 6, innerWidth - r.width - 6)}px`;
  m.style.top = `${clamp(y, 6, innerHeight - r.height - 6)}px`;
  ctxEl = m;
  const first = m.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}

document.addEventListener('pointerdown', (e) => { if (ctxEl && !e.target.closest('#ctx')) closeCtx(); }, true);
addEventListener('resize', closeCtx);
addEventListener('blur', closeCtx);

/** Buttons give up focus after a mouse click so the piano keys keep working, but a keyboard user keeps their place. */
export function blurAfterMouse(e) { if (e.detail > 0 && e.currentTarget && e.currentTarget.blur) e.currentTarget.blur(); }
