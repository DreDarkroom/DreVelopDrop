/* DreVelopDrop: the settings card: how trippy the buttons are, picture quality, the battery saver, developer mode, and the way into the Studio. */
import { $, el } from '../util.js';
import { toast } from './dom.js';

export function buildSettings(app) {
  const { V } = app;
  const box = $('#settings');
  let open = false;

  function row(label, hint, control) {
    const r = el('label', 'setrow'), name = el('span', null, label);
    if (hint) name.append(el('small', null, hint));
    r.append(name, control);
    return r;
  }

  function build() {
    box.replaceChildren();
    box.classList.add('card');
    const close = el('button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close settings');
    close.addEventListener('click', () => toggle(false));
    box.append(close, el('h3', null, 'Settings'));

    const trippy = document.createElement('input'), tl = el('output', null, app.vfx.levels[app.vfx.get()].name);
    Object.assign(trippy, { type: 'range', min: 0, max: 3, step: 1, value: app.vfx.get() });
    trippy.setAttribute('aria-label', 'Trippy buttons: 0 off, 1 gentle, 2 trippy, 3 full');
    trippy.addEventListener('input', () => { app.vfx.set(+trippy.value); tl.textContent = app.vfx.levels[app.vfx.get()].name; });
    const tw = el('span', 'inline');
    tw.append(trippy, tl);
    box.append(row('Trippy buttons', 'every press blooms and feeds the picture', tw));

    const q = document.createElement('select');
    for (const m of ['auto', 'high', 'medium', 'low']) { const o = el('option', null, m); o.value = m; q.append(o); }
    q.value = V.stats.mode;
    q.addEventListener('change', () => { V.setQuality(q.value); app.store.set('quality', q.value); toast(`Picture quality: ${q.value}`, 1800); });
    box.append(row('Picture quality', 'auto steps down when frames run slow', q));

    const eco = el('button', null, app.isEco() ? 'on' : 'off');
    eco.type = 'button';
    eco.addEventListener('click', () => { app.setEco(!app.isEco()); eco.textContent = app.isEco() ? 'on' : 'off'; });
    box.append(row('Battery saver', 'smaller picture, no reverb room', eco));

    const dev = document.createElement('input');
    dev.type = 'checkbox';
    dev.checked = app.dev.on;
    dev.addEventListener('change', () => { app.dev.toggle(dev.checked); });
    box.append(row('Developer mode', 'live numbers, switches and a benchmark (Shift + D)', dev));

    const studio = el('a', 'btnlink', 'Open the Studio');
    studio.href = 'studio.html';
    box.append(el('p', null, 'Recordings you make are kept in this browser. The Studio plays them back, trims them and edits a performance note by note.'), studio);
  }

  function toggle(force) {
    open = force != null ? force : !open;
    box.hidden = !open;
    $('#setbtn').setAttribute('aria-expanded', String(open));
    if (open) { app.closePanels('settings'); build(); }
  }

  $('#setbtn').addEventListener('click', (e) => { toggle(); if (e.detail > 0) e.currentTarget.blur(); });
  const saved = app.store.get('quality');
  if (saved && saved !== 'auto' && !app.qs.get('quality')) V.setQuality(saved);
  Object.assign(app, { toggleSettings: toggle, settingsOpen: () => open });
}
