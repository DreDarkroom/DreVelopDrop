"""Prepare a copy of the ORIGINAL DevelopDrop (3.2.0) for the A/B benchmarks in this folder.

    git clone https://github.com/DreDarkroom/DevelopDrop tools/bench/orig
    python tools/bench/patch-orig.py tools/bench/orig

It adds exactly two things to js/visual.js and changes nothing else: a `V.bench(n, scene, folds)` that draws n identical frames and flushes the canvas with a 1-pixel
read-back after each (the same thing the new version's developer-mode benchmark does), and the quality guard so a bench call does not resize the canvases.
"""
import io, sys

root = sys.argv[1] if len(sys.argv) > 1 else "tools/bench/orig"
path = root + "/js/visual.js"
s = io.open(path, encoding="utf-8").read()
if "V.bench" in s:
    print("already patched"); raise SystemExit
anchor = "  function draw(dt) {"
assert anchor in s, "visual.js does not look like DevelopDrop 3.2.0"
bench = '''  /* BENCH PATCH (not in the original): n identical frames, flushed with a 1-pixel read-back, average ms per frame. */
  V.bench = function (n, scene, folds) {
    if (mode !== 'high') V.setQuality('high'); st.scene = scene | 0; st.mix = 1; st.n = folds || 8; st.progress = 0.5;
    prof.sim = prof.compose = prof.finish = 0;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      if (i % 8 === 0) { st.kick = 1; rings.push({ r: 20, a: 1 }); for (let k = 0; k < 3; k++) sparks.push({ r: 80 + k * 100, k: Math.random(), a: 1, s: 8, shape: 'c' }); }
      draw(1 / 60);
      sctx.getImageData(0, 0, 1, 1);
    }
    return { ms: +((performance.now() - t0) / n).toFixed(2), sim: +prof.sim.toFixed(2), compose: +prof.compose.toFixed(2), finish: +prof.finish.toFixed(2), w: W, h: H };
  };
'''
s = s.replace(anchor, bench + anchor, 1)
io.open(path, "w", encoding="utf-8").write(s)
print("patched", path)
