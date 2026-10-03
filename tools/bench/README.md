# Benchmarks: DreVelopDrop against the original DevelopDrop 3.2.0

Why this folder exists: a speed-up that cannot be measured is a guess. These pages run the original and the new code side by side, on the same machine, in the same tab, alternating.

## Set up

```
git clone https://github.com/DreDarkroom/DevelopDrop tools/bench/orig
python tools/bench/patch-orig.py tools/bench/orig
python -m http.server 8099            # from the repository root
```

Open `http://127.0.0.1:8099/tools/bench/audio-ab.html` or `picture-ab.html`. Keep the tab in front (a background tab is throttled and everything runs about three times slower).

## Sound (`audio-ab.html`)

Renders N bars of a style through each engine into an `OfflineAudioContext` (no sound, same notes at the same times, the original through its own engine with the browser's audio context swapped for an offline one)
and times the render. This is a clean measure of what the sound costs the CPU: the render time is close to the same every run.

```js
await audioAB(0, 4, 6)    // style 0 (Safelight), 4 rounds, 6 bars; also 2 (Dodge & Burn) and 4 (Rapid Fixer)
```

Results on the author's laptop (median of 4 interleaved runs, ms to render 6 bars):

| Style | DevelopDrop 3.2.0 | DreVelopDrop 0.1.0 | Change |
|---|---|---|---|
| Safelight | 1002 (977, 1009, 984, 1002) | 854 (854, 875, 852, 836) | −15% |
| Dodge & Burn (metal hats) | 1198 (1180, 1178, 1198, 1306) | 847 (827, 840, 847, 852) | −29% |
| Rapid Fixer (drum and bass) | 721 (721, 705, 713, 729) | 605 (605, 586, 598, 610) | −16% |

(A second run of Safelight gave 1045 and 875, −16%.) What is in the number: baked metal hats, the squeak source off while idle, the room tail cut at 2.2 s (its envelope is 35 dB down there), and 2x instead of 4x oversampling in the output soft-clip.
Developer mode has switches to put each of those back.

## Picture (`picture-ab.html`)

Two things, because they behave very differently.

**What the code asks the canvas to do** (`countAB(scene, folds)`): the 2D context's methods are wrapped for a few dozen frames and counted. It is exact and does not depend on how busy the machine is.

| Per frame, 1280 x 720, 8 folds | DevelopDrop 3.2.0 | DreVelopDrop 0.1.0 |
|---|---|---|
| full-screen-sized fills and image draws | 8.0 | 6.3 |
| source pixels the kaleidoscope hands the canvas | 8.39 M | 1.55 M |
| 2D calls, scene 0 / 1 / 2 / 3 | 432 / 401 / 638 / 357 | 384 / 159 / 334 / 53 |

**How long a frame takes** (`ab(pairs, frames, scene, folds)`): alternates 8-frame blocks of each version and takes the median, with the canvas flushed by a 1-pixel read-back after each frame (otherwise the browser defers the real drawing).
In the software-rendered Chrome used here this is dominated by a flush floor of about 25 ms and by whatever else the machine is doing, and it does **not** separate the two: 40.3 ms (original) against 42.4 ms (new), a ratio of 1.05 inside the noise.
The counts above are the more trustworthy statement of what changed; time it on your own machine, with a real GPU, and keep the tab in front.

## Reading the old numbers

Early in this work a wall-clock comparison showed the new page three times slower. That was not the code: the two pages were open in different tabs, and one tab was simply slow. Always compare in one tab, interleaved.
