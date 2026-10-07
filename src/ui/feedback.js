/* DreVelopDrop: the feedback card and the optional page counter.

   THE CARD asks one question once you have really played for a while: "If this stopped existing, how would you feel?" (very / somewhat / not bothered),
   then an optional note. It never interrupts: it waits for about two minutes of actual playing (counted across visits, only while the page is visible and
   you are touching it), then waits for a quiet moment. "No thanks" means never again. Nothing is sent unless you press Send, and what is sent is only:
   your answer, your note, roughly how long you have played, how many different days you came, the app name and version, 'touch' or 'desktop', and your
   browser language. No account, no identifier. It goes to a private notification channel (ntfy.sh) that only the owner reads.

   THE COUNTER is an anonymous page-view count (GoatCounter: no cookies, no IP address stored). It is off until CONFIG.counterCode is filled in, and it
   stays off for visitors who send "Do Not Track" and on localhost.

   Everything decided by rules (when to ask, what to send, whether to count) is a pure function below, so tests can check it without a browser. */
import { CONFIG } from '../config.js';
import { store, el } from '../util.js';

export const ASK_AFTER_MS = 120000;          // two minutes of real playing before the first ask
export const IDLE_MS = 4000;                 // ...then wait for a quiet moment this long
export const ACTIVE_WINDOW_MS = 30000;       // a person counts as playing for 30 s after their last touch or key
export const MAX_ASKS = 2;                   // shown at most twice ever (the second time a week later), and never again after any answer
export const RE_ASK_AFTER_MS = 7 * 86400000;
export const FEEL = { very: 'Very disappointed', some: 'Somewhat disappointed', not: 'Not bothered' };

/** st = { playedMs, asks, lastAskAt, done }. idleMs = time since the last touch or key. */
export function shouldAsk(st, now, idleMs) {
  if (!st || st.done || st.asks >= MAX_ASKS || st.playedMs < ASK_AFTER_MS) return false;
  if (st.asks > 0 && now - st.lastAskAt < RE_ASK_AFTER_MS) return false;
  return idleMs >= IDLE_MS;
}

/** One line of text, no control characters, at most 500 characters. */
export const cleanNote = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

export function buildMessage({ feel, note, playedMs, visitDays, name, version, device, lang }) {
  const min = Math.max(0, Math.round((playedMs || 0) / 60000)), days = Math.max(1, visitDays || 1);
  const lines = [`Would miss it: ${FEEL[feel] || 'no answer'}`, `Played about ${min} min over ${days} day${days === 1 ? '' : 's'}`, `${name} ${version} / ${device} / ${cleanNote(lang).slice(0, 12) || '?'}`];
  const n = cleanNote(note);
  if (n) lines.splice(1, 0, `Note: ${n}`);
  return lines.join('\n');
}

/** Count only with a valid GoatCounter code, never for Do Not Track, never on a developer's own machine. */
export function counterAllowed({ code, dnt, host }) {
  return /^[a-z0-9-]{2,40}$/.test(code || '') && dnt !== '1' && dnt !== 'yes' && !/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|.*\.local)$/.test(host || '');
}

export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** The list of distinct days this person came (kept on their device only), capped at the last 90. */
export const addDay = (days, today) => (days.includes(today) ? days : [...days, today].slice(-90));

/* ---------------------------------------------------------------- the browser part */

export function startCounter({ code = CONFIG.counterCode } = {}) {
  const ok = counterAllowed({ code, dnt: navigator.doNotTrack || window.doNotTrack, host: location.hostname });
  if (!ok) return false;
  const s = document.createElement('script');
  s.async = true; s.src = '//gc.zgo.at/count.js'; s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  document.head.append(s);
  return true;
}

/** mode: 'live' (default), 'force' (?feedback=1: show now) or 'test' (?feedback=test: show now, send nothing). */
export function startFeedback({ url = CONFIG.feedbackUrl, mode = 'live', now = () => Date.now() } = {}) {
  if (!url && mode === 'live') return null;
  const st = { playedMs: 0, asks: 0, lastAskAt: 0, done: false, days: [], ...store.get('fb', {}) };
  st.days = addDay(st.days, dayKey(now()));
  const save = () => store.set('fb', st);
  save();
  let lastInput = 0, card = null;
  const poke = () => { lastInput = now(); };
  addEventListener('pointerdown', poke, { passive: true });
  addEventListener('keydown', poke, { passive: true });
  const visible = () => document.visibilityState === 'visible' && !document.body.classList.contains('clean');

  const timer = setInterval(() => {
    const t = now();
    if (lastInput && t - lastInput < ACTIVE_WINDOW_MS && document.visibilityState === 'visible') { st.playedMs += 1000; if (st.playedMs % 10000 === 0) save(); }
    if (card || !visible()) return;
    if (mode !== 'live' ? true : (lastInput && shouldAsk(st, t, t - lastInput))) show();
  }, 1000);

  function close(markDone) {
    if (markDone) st.done = true;
    save(); card?.remove(); card = null;
    if (mode !== 'live') clearInterval(timer);
  }

  function show() {
    st.asks++; st.lastAskAt = now(); save();
    card = el('section'); card.id = 'fbcard';
    card.setAttribute('role', 'region'); card.setAttribute('aria-label', 'Quick feedback'); card.setAttribute('aria-live', 'polite');   // announced politely, focus left alone
    document.body.append(card);
    stepOne();
  }
  function line(text, cls) { const p = el('p', cls, text); return p; }
  function button(label, fn, cls) { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  function stepOne() {
    card.replaceChildren(
      line(`If ${CONFIG.name} stopped existing, how would you feel?`),
      Object.assign(el('div', 'fbrow'), {}),
      line('Sends only your answers. No account, no tracking.', 'fbfine'));
    const row = card.querySelector('.fbrow');
    for (const k of ['very', 'some', 'not']) row.append(button(FEEL[k], () => stepTwo(k)));
    row.append(button('No thanks', () => close(true), 'fbquiet'));
    // Deliberately NOT focused: Space builds and drops the music, and a focused button would turn a stray Space into an answer.
  }

  function stepTwo(feel) {
    const ta = el('textarea'); ta.rows = 3; ta.maxLength = 500; ta.placeholder = 'Optional: what would make it better?';
    ta.setAttribute('aria-label', 'What would make it better? Optional.');
    const msg = el('p', 'fbfine');
    msg.setAttribute('aria-live', 'polite');
    const row = el('div', 'fbrow');
    const send = button('Send', async () => {
      send.disabled = true; msg.textContent = 'Sending...';
      const body = buildMessage({ feel, note: ta.value, playedMs: st.playedMs, visitDays: st.days.length, name: CONFIG.name, version: CONFIG.version,
        device: matchMedia('(pointer: coarse)').matches ? 'touch' : 'desktop', lang: navigator.language });
      try {
        if (mode === 'test') { console.info('[feedback test, not sent]\n' + body); } else {
          const r = await fetch(url, { method: 'POST', body, headers: { Title: `${CONFIG.name} feedback`, Tags: 'speech_balloon' } });
          if (!r.ok) throw new Error(String(r.status));
        }
        msg.textContent = mode === 'test' ? 'Thank you (test: nothing was sent).' : 'Thank you.';
        st.done = true; save(); setTimeout(() => close(true), 2200);
      } catch (err) { send.disabled = false; msg.textContent = 'Could not send (offline?). Nothing was kept.'; }
    });
    row.append(send, button('Skip the note', () => { ta.value = ''; send.click(); }, 'fbquiet'), button('Close', () => close(true), 'fbquiet'));
    card.replaceChildren(line(`Thanks: ${FEEL[feel].toLowerCase()}.`), ta, row, msg);
    ta.focus({ preventScroll: true });
  }

  addEventListener('keydown', (e) => { if (e.key === 'Escape' && card) close(true); });
  return { state: st, close, show, stop() { clearInterval(timer); card?.remove(); } };
}
