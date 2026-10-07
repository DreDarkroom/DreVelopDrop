import { recordClip } from './clip.mjs';
const only = process.argv[2];
const OPT = { W: 540, H: 960, vp8: true, bitrate: '6000000', format: 'webm' };
const setStyle = (c, name) => c.eval(`(() => { const s = document.querySelector('#style'); const o = [...s.options].find(o => o.textContent.includes('${name}')); if (o) { s.value = o.value; s.dispatchEvent(new Event('change')); } return !!o; })()`);

const CLIPS = {
  // 1. The hook: wet strokes open the fog
  '01-wipe-the-fog': async (c, h) => {
    await h.sleep(500);
    for (let i = 0; i < 3; i++) { await h.stroke(h.wave(h.W * (0.28 + i * 0.05), h.W * (0.72 - i * 0.05), h.H * 0.14, h.H * 0.88, 1.75, i * 1.3), 2600); await h.sleep(250); }
    await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.35, 1.6), 2800); await h.sleep(300);
    await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.185, 2.2, 1), 2200); await h.sleep(900);
  },
  // 2. Build and drop: hold space while the strokes get faster, let go, the drop lands
  '02-build-and-drop': async (c, h) => {
    await h.sleep(400);
    await h.stroke(h.wave(h.W * 0.3, h.W * 0.7, h.H * 0.2, h.H * 0.8, 1.5), 2200);
    for (const k of ['a', 'd', 'g', 'j']) { await h.press(k, 110); await h.sleep(190); }
    await h.down(' ');                                                         // build: the music thins and climbs
    await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.30, 1.2), 2200);
    await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.26, 2.4, 1), 2000);
    await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.22, 4.0, 2), 2000);
    await h.up(' ');                                                           // the drop lands on the next beat
    await h.sleep(500);
    await h.stroke(h.wave(h.W * 0.15, h.W * 0.85, h.H * 0.1, h.H * 0.9, 2.5), 2600);
    await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.4, 2.0, 0.5), 2400); await h.sleep(800);
  },
  // 3. Every press feeds the picture: rings and glyphs bloom where you tap
  '03-press-anywhere': async (c, h) => {
    await h.sleep(400);
    await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.3, 1.0), 1500);
    const spots = []; for (let i = 0; i < 26; i++) { const a = i * 2.399, r = h.W * (0.08 + 0.32 * ((i * 37) % 100) / 100); spots.push([h.W / 2 + r * Math.cos(a), h.H / 2 + r * 1.3 * Math.sin(a)]); }
    for (let i = 0; i < spots.length; i++) { await h.tap(spots[i][0], spots[i][1]); await h.sleep(i % 4 === 3 ? 520 : 240); if (i === 8) await h.press('2'); if (i === 17) await h.press('3'); }
    await h.sleep(1200);
  },
  // 4. Ink Cloud: another picture, another light
  '04-ink-cloud': async (c, h) => {
    await h.sleep(300);
    await setStyle(c, 'Ink Cloud'); await h.sleep(2200);                      // lands on the next bar
    await h.stroke(h.wave(h.W * 0.2, h.W * 0.8, h.H * 0.12, h.H * 0.88, 1.25), 3200); await h.sleep(300);
    await h.press('2'); await h.stroke(h.circle(h.W / 2, h.H / 2, h.W * 0.33, 1.4, 1), 2800); await h.sleep(300);
    await h.press('3'); await h.stroke(h.wave(h.W * 0.8, h.W * 0.2, h.H * 0.9, h.H * 0.1, 1.75, 1), 3200); await h.sleep(900);
  },
};

for (const [name, fn] of Object.entries(CLIPS)) {
  if (only && !name.startsWith(only)) continue;
  const r = await recordClip(name, fn, OPT);
  console.log(name, r.bytes, 'bytes', r.performedSeconds + 's performed', r.logs.length ? JSON.stringify(r.logs).slice(0, 200) : '');
}
