# DreVelopDrop

A small, wet instrument that lives in a browser tab, and the Studio that keeps what you play. A bass synth, three drummers that play against each other, and a
picture made of light: a kaleidoscope you wipe clear with a squeegee. No installs, no accounts. What you make stays on your device (see Privacy below).

DreDarkroom, SafeLight and SquidgySqueegee are DJ aliases. **DreVelopDrop** is a working title: the **experimental parallel version** of
[DevelopDrop](https://github.com/DreDarkroom/DevelopDrop) ([play the steady original](https://dredarkroom.github.io/DevelopDrop/)). New ideas land here first and may change or break; the original stays the dependable one.

**Play it:** open `index.html` (any static web server will do: `python -m http.server`). Press the bulb. Press **?** for a short how-to.
**Studio:** `studio.html` (also reachable from the instrument). Version 0.1.0.

## What is new in DreVelopDrop

**More Squidgy Squeegee.** The squeegee is wet: drag fast and drips run down from the blade, opening thin lines in the fog. The blade squishes with speed.
The controls squash like jelly when you press them. There is a fifth picture, *ink* (soft clouds that bloom), and a style to go with it, *Ink Cloud*.

**Trippy buttons, and presses that feed the picture.** Hover a button and a band of colour runs round its edge; press it and it squashes and blooms.
Every press, on a control or anywhere on the picture, also goes into the picture generator: a ring and a glyph bloom where you pressed (folded into the
kaleidoscope like everything else), the press is *remembered* (the last ones stir the seed every scene uses to vary itself), it makes the picture busier for a
few seconds, and the tunnel leans toward where you pressed. The same press is written into recordings (event 17), so a replay rebuilds the same picture.
`Settings ⚙ → Trippy buttons` goes from 0 (off) to 3 (full). Reduced-motion turns the movement off and keeps the picture feed.

**Studio.** An editor for what you record, in the same browser tab or its own page.
- **Library.** Takes you record (performances, videos) are kept in this browser (IndexedDB), never uploaded. Import files, rename, add notes, delete; ask the browser to keep them.
- **Performances** are replayed with the instrument's own sound and picture, and edited on a **timeline** of lanes (bass notes by pitch, kick, snare, hats, builds and drops,
  picture changes, presses, squeegee strokes, knob moves): drag a box to select, move (snapped to the beat), delete, duplicate, quantise, transpose, softer / harder,
  crop to a selection, cut a range, insert a picture or light change at the playhead, undo and redo. Save over the take or as a copy, download the `.sqz`.
- **Render to WAV**, faster than real time (about 12 times on the author's laptop), with no sound played: the same engine into an offline context, at its best quality.
- **Render stems**: kick, snare, hats, bass and effects as separate 24-bit WAVs in one zip (about 3 seconds for a 9-second take). They do not add up to the mix exactly, because the compressors act on each part alone.
- **Record as video**: replay a take and capture the picture and sound as a WebM.
- **Videos** are played, trimmed (mark a start and an end, save the kept part as a new take: the browser cannot cut a file without re-encoding, so it plays and re-records the part, in real time),
  and a frame can be saved as a PNG.

**Developer mode.** `Settings ⚙ → Developer mode`, `Shift + D`, or `?dev=1`. Live numbers (frame time by section, audio nodes and sounds a second, how far ahead of the audio clock the
scheduler is, memory), switches that turn one costly part off at a time (grain, feedback tunnel, kaleidoscope, ripples, drips, the baked hats, the reverb room, 4x output oversampling),
a **benchmark** that renders identical frames and identical notes and reports them, and a log. It is how the speed-ups below were found, and it costs nothing while off.

**Leaner code.** The original was twelve script files that talk through one global object. This is the same instrument as ES modules with no build step, engines made by factories
(`createAudio()`, `createSeq()`, `createVisual()`), which is what lets the Studio render offline, lets the tests run the real sequencer, and lets a page hold two of anything.
The one 1,620-line interface file is nine small modules. Everything shared (the toast, the formatters, the downloads, the heartbeat) exists once instead of twice.
Counting lines of code (blank lines and comments left out): **3,910 in the original, 3,308 here**, with the presses, the settings, the ink scene, the drips and the library added,
and the old player page gone. The Studio (about 900 lines) and developer mode (about 200) are on top of that.

## Faster, measured

Measured with the developer-mode tools against the original DevelopDrop 3.2.0, on one Windows laptop, in a software-rendered Chrome pane.
Where a number is a count it is exact; where it is time it is the median of interleaved runs (original, new, original, new...), so the machine's mood affects both alike.

| What | DevelopDrop 3.2.0 | DreVelopDrop 0.1.0 | Change |
|---|---|---|---|
| **Sound:** time to render 6 bars of *Safelight* offline (same notes) | 1002 ms | 854 ms | **−15%** |
| **Sound:** the same for *Rapid Fixer* (drum and bass) | 721 ms | 605 ms | **−16%** |
| **Sound:** the same for *Dodge & Burn* (metal hats) | 1198 ms | 847 ms | **−29%** |
| **Picture:** full-screen passes per frame | 8.0 | 6.3 | **−21%** |
| **Picture:** pixels handed to the canvas by the kaleidoscope, per frame | 8.4 M | 1.6 M | **−82%** |
| **Picture:** 2D draw calls per frame (by scene) | 357 to 638 | 53 to 384 | **−11% to −85%** |

Where it comes from:
- *Sound:* each metal hat was six oscillators; it is now one pre-built buffer. The noise source for the squeak runs only while you drag. The reverb room's tail is cut at 2.2 s (its envelope is already down 35 dB there).
  The output soft-clip oversamples 2x instead of 4x (the limiter sits in front of it and it only bends the top 3 dB; developer mode can put 4x back).
- *Picture:* the kaleidoscope draws only the wedge of the scene that is ever seen, and the scene canvas is cleared and clipped to that wedge. The whole picture is tinted once in that small wedge instead of multiplying the whole screen. The fog fades in one pass in three.
  The feedback tunnel ping-pongs between two canvases instead of copying a canvas onto itself. Dots in a ring are one fill, not one each. The wedge outline is built once.
- *Honest note on frame time:* in this software-rendered test pane the browser's own flush floor (about 25 ms a frame) and noisy neighbours hide small differences; a wall-clock A/B of the picture showed no reliable change
  (42.4 ms against 40.3 ms, inside the noise). The pass and pixel counts above are what the code now asks the GPU to do; on a real GPU they are the quantity that matters. Run developer mode's benchmark on your own machine and see.

## Fixed from the original

- Buttons gave up keyboard focus after every click (so the piano keys kept working), which made the page hard to use without a mouse. Now only a mouse click does that; keyboard users keep their place.
- The squeak's noise source ran all the time, even in silence. It now runs only while you drag.
- The timed-event queue removed its front element with `shift()` (every element moves each time); it now moves a head index.
- The scheduler's worker script and the MP3 worker's script were never released; both are now.
- The version-1 "exposure" riser was kept as extra code for old files; old files are converted on load instead (the code is gone, the files still play).
- A broken character in a comment in `config.js` (mojibake), and in the README's table of controls.
- The picture canvas had no accessible role.
- A hidden `?debug=1` overlay is now a proper developer mode.
- The separate player page, with copies of the instrument's helpers, is the Studio.

Files from DevelopDrop still open here: loops, clips, MIDI maps, and `.sqz` recordings (version 1 recordings are upgraded on load). New files say `app: "DreVelopDrop"`.

## Privacy

Everything you make (loops, recordings, takes, settings) stays on your device. Nothing is uploaded.

Two small things can send something, and both are in your hands or off by default:

- **A feedback card.** After about two minutes of real playing (counted across visits) and a quiet moment, one question appears, once: *if this stopped existing, how would you feel?* Nothing is sent unless you press **Send**. It sends your answer, your optional note, roughly how many minutes you have played and on how many different days, the app name and version, "touch" or "desktop", and your browser language. No account, no identifier. It goes to a private notification channel on [ntfy.sh](https://ntfy.sh). "No thanks" means it never comes back. Add `?feedback=test` to the address to see the card without sending anything.
- **A page counter** ([GoatCounter](https://www.goatcounter.com): no cookies, no IP address stored). It is **off** until `counterCode` in the config is filled in, stays off if your browser sends Do Not Track, and never runs on localhost.

## Playing

| Input | Does |
|---|---|
| `a w s e d f t g y h u j k o l p` | play the bass like a keyboard |
| hold `space` (or the right mouse button) | **build**: the music thins out and climbs. Let go and the **drop** lands on the beat |
| hold `Shift` + `space` (or the middle button) | build the other way: the mix sinks under water |
| drag on the picture | squeegee the fog: it smears, squeaks, drips and opens the filter. A stylus's pressure sets the blade |
| any press | blooms in the picture and feeds the generator |
| `1` `2` `3` | change the light, which also changes the mode (Aeolian, Dorian, Lydian) |
| `enter` | play / stop |
| `z` `x` `v` `b` | mute or bring back kick, snare, hats, bass |
| `n` / `Shift` + `n` | clear the bass line / the drums |
| right-click the bass grid or a drummer | a menu: mute, solo, clear, a new pattern, shift or turn it, key up and down, record a clip, reset level |
| mouse wheel over a part | trim its level very finely: 0.25 dB a notch (`Shift` 1 dB, `Alt` 0.05 dB) |
| `Shift` + `f` | fullscreen on any device, with a quiet clock |
| `;` `'` | previous / next **style** |
| `[` `]` / `{` `}` | tempo down / up by 1 / by 0.1. `\` switches the drum and bass range (to 180) |
| `r` / `Shift` + `r` | record a clip of drums and bass / clear clips |
| `i` | start or stop the **journey** |
| `m` | MIDI controller panel |
| `` ` `` | hide the panel |
| `c` | clean mode: fullscreen, nothing but the picture. `Esc` to leave |
| `q` | picture quality (auto, high, medium, low) |
| `Shift` + `d` | developer mode |
| `?` | how-to |

Touch and pen, balance, phones and battery, styles, build and drop, journey, clips, loops and MIDI all work as in DevelopDrop; the in-page how-to (`?`) describes each.

Options for streaming and testing: `?clean=1` (no panel, for OBS), `?autostart=1`, `?dev=1`, `?quality=low|medium|high`, `?eco=1`, `?profile=mobile`, `?battery=0.12`.

## Running the tests

```
node --test tests/logic.test.js tests/music.test.js tests/midi.test.js tests/studio.test.js
```

67 tests. The first 49 are DevelopDrop's own, ported (the sequencer runs for real with the audio engine replaced by a recorder); the rest cover the Studio's editing, presses in the file format, version-1 files and the kaleidoscope folding.

## Layout

```
index.html, studio.html        the two pages
src/engine/                    audio.js (factory), seq.js, styles.js, kits.js, loopfile.js, clock.js
src/perf/                      format.js (the .sqz file, pure), playback.js
src/visual/                    engine.js, scenes.js, press.js
src/rec/                       recorder.js, library.js (IndexedDB), wav.js, zip.js
src/ui/                        the instrument page, one concern per file
src/studio/                    the Studio: app, timeline, edit (pure), render (offline WAV), video
src/dev/devtools.js            developer mode and the benchmark
vendor/                        lamejs (LGPL), for MP3
```

No licence has been chosen for this repository yet, so all rights are reserved by default; the vendored LAME encoder keeps its own LGPL licence.
