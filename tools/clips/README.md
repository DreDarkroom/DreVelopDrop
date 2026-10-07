# Clip maker

Makes short vertical clips (picture and sound) of the instrument by performing a script in a headless browser and using the instrument's own video recorder. Nothing here ships to visitors; it is a developer tool.

```
npm run serve                         # in one terminal: serves the instrument on http://localhost:5173
node tools/clips/clips.mjs            # all four clips; or: node tools/clips/clips.mjs 02
```

Needs Node 22 or newer, Chrome (set `CHROME` if it is not at the default Windows path), and `ffmpeg` for the finishing step below. Set `BASE_URL` to record another address and `RAW_DIR` to choose where the raw WebM files go.

What it does: opens the page in a portrait window, switches the safelight on with a real click, starts the recorder (WebM, VP8, 6 Mbps), enters the picture-only view, plays the script with timed strokes, key holds and taps, stops, and reads the finished take out of the Studio library.

**Why 540x960 and VP8:** the browser encodes video on the CPU in real time. Measured on the author's laptop, VP9 at 720x1280 kept only about 12 frames a second even with an idle picture, VP8 at 540x960 about 28. The picture is soft and grainy by design, so the 2x upscale in the finishing step costs little. (MP4 from the browser's hardware encoder gave a stream ffmpeg reported decode errors on, so it is not used.)

Finishing (1080x1920, 30 fps, H.264 + AAC, loudness set to -14 LUFS for social platforms, all metadata removed):

```
ffmpeg -i raw.webm -vf "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p" -af "loudnorm=I=-14:TP=-1.5:LRA=9" -ar 48000 -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k -movflags +faststart -map_metadata -1 -fflags +bitexact out.mp4
```

Edit the scripts in `clips.mjs` (a script is a function of `(page, h)`; `h.stroke`, `h.tap`, `h.press`, `h.down`/`h.up`, and path helpers `h.circle`, `h.wave`, `h.line`). Check each result with `ffprobe` (frames per second over time) and `ffmpeg -af ebur128` (loudness) before posting.
