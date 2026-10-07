import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAsk, buildMessage, cleanNote, counterAllowed, addDay, dayKey, ASK_AFTER_MS, IDLE_MS, MAX_ASKS, RE_ASK_AFTER_MS, FEEL } from '../src/ui/feedback.js';
import { CONFIG } from '../src/config.js';

const fresh = (o = {}) => ({ playedMs: 0, asks: 0, lastAskAt: 0, done: false, ...o });

test('the card waits for real playing and a quiet moment', () => {
  assert.equal(shouldAsk(fresh({ playedMs: ASK_AFTER_MS - 1 }), 1e9, IDLE_MS), false, 'not enough playing yet');
  assert.equal(shouldAsk(fresh({ playedMs: ASK_AFTER_MS }), 1e9, IDLE_MS - 1), false, 'the person is busy: never interrupt');
  assert.equal(shouldAsk(fresh({ playedMs: ASK_AFTER_MS }), 1e9, IDLE_MS), true);
  assert.equal(shouldAsk(null, 1, 1e9), false);
});

test('answered, declined, or asked twice: never again; the second ask waits a week', () => {
  const t = 1e12;
  assert.equal(shouldAsk(fresh({ playedMs: 1e9, done: true }), t, 1e9), false, 'done (answered or "No thanks")');
  assert.equal(shouldAsk(fresh({ playedMs: 1e9, asks: MAX_ASKS, lastAskAt: 0 }), t, 1e9), false, 'at most twice');
  assert.equal(shouldAsk(fresh({ playedMs: 1e9, asks: 1, lastAskAt: t - RE_ASK_AFTER_MS + 1000 }), t, 1e9), false, 'too soon after the first');
  assert.equal(shouldAsk(fresh({ playedMs: 1e9, asks: 1, lastAskAt: t - RE_ASK_AFTER_MS }), t, 1e9), true, 'a week later');
});

test('what is sent: the answer, a short note, rough time, days, app, device, language and nothing else', () => {
  const m = buildMessage({ feel: 'very', note: '  more\nbass \u0007 please  ', playedMs: 14 * 60000, visitDays: 3, name: 'DreVelopDrop', version: '0.1.1', device: 'touch', lang: 'en-GB' });
  assert.equal(m, 'Would miss it: Very disappointed\nNote: more bass please\nPlayed about 14 min over 3 days\nDreVelopDrop 0.1.1 / touch / en-GB');
  assert.equal(buildMessage({ feel: 'not', playedMs: 0, visitDays: 1, name: 'X', version: '1', device: 'desktop', lang: '' }).includes('Note:'), false, 'no note line when there is none');
  assert.match(buildMessage({ feel: 'nope', playedMs: 100, visitDays: 0, name: 'X', version: '1', device: 'd', lang: 'de' }), /no answer/);
  assert.ok(cleanNote('x'.repeat(900)).length === 500 && cleanNote(null) === '' && !/[\n\t]/.test(cleanNote('a\n\tb')));
  for (const k of ['very', 'some', 'not']) assert.ok(FEEL[k]);
  assert.ok(!/@|http|userAgent/i.test(m), 'no address, link or browser fingerprint');
});

test('the counter is off without a code, for Do Not Track, and on a developer machine', () => {
  const ok = { code: 'dredarkroom', dnt: null, host: 'dredarkroom.github.io' };
  assert.equal(counterAllowed(ok), true);
  assert.equal(counterAllowed({ ...ok, code: '' }), false, 'empty code = off (the shipped default)');
  assert.equal(counterAllowed({ ...ok, code: 'a b' }), false); assert.equal(counterAllowed({ ...ok, code: '"><script>' }), false);
  assert.equal(counterAllowed({ ...ok, dnt: '1' }), false); assert.equal(counterAllowed({ ...ok, dnt: 'yes' }), false);
  for (const host of ['localhost', '127.0.0.1', '[::1]', 'dre.local']) assert.equal(counterAllowed({ ...ok, host }), false, host);
});

test('days: distinct, capped, and the config ships safe', () => {
  assert.deepEqual(addDay(['2026-10-01'], '2026-10-01'), ['2026-10-01']);
  assert.deepEqual(addDay(['2026-10-01'], '2026-10-02'), ['2026-10-01', '2026-10-02']);
  assert.equal(addDay(Array.from({ length: 90 }, (_, i) => `d${i}`), 'new').length, 90);
  assert.match(dayKey(new Date(2026, 9, 7, 12).getTime()), /^2026-10-07$/);
  assert.equal(CONFIG.counterCode, '', 'the counter must stay off until the owner supplies a code');
  assert.match(CONFIG.feedbackUrl, /^https:\/\/ntfy\.sh\/developdrop-fb-[a-z0-9]{22}$/);
});
