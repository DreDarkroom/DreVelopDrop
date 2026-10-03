# DreVelopDrop: roadmap

A living list. Everything from DevelopDrop's own roadmap that is still open carries over; what is new is at the top.

## Shipped in 0.1

- The instrument rebuilt as ES modules, engines as factories, about a sixth less code with more in it. Measured speed-ups: see the README.
- **Trippy buttons** and **presses that feed the picture**, recorded in performances.
- **The wet squeegee** (drips, a squishing blade), an **ink** scene and an *Ink Cloud* style.
- **Developer mode** with live numbers, switches and a benchmark.
- **The Studio**: a library of takes, a timeline editor for performances, offline WAV render, video recording of a replay, a video trimmer.

## Next: the Studio

- **A real cut for videos** without re-recording: demux and re-mux with WebCodecs, so a trim is instant and loses nothing.
- **Lanes you can draw in:** drag a knob curve, paint a filter sweep, draw squeegee strokes on the picture and see them replayed.
- **Several takes on one timeline:** line a performance up against a video of it, or against a second performance, and render the lot.
- **A take is a link:** share a performance (a few KB) as a URL fragment that opens in the Studio.
- **Render a performance to video faster than real time** (an offline picture and an offline sound, muxed), not only in real time.
- **Stems:** render kick, snare, hats and bass to separate WAVs.
- Waveform and loudness on the timeline for rendered audio; markers and regions with names.

## Next: the picture

- **Presses as a generator input you can see:** a small panel showing the seed, the energy and the lean, so a press's effect is visible and a favourite state can be saved as part of a style.
- Per-scene cost shown in developer mode, and an automatic "cheap picture" switch when frames run long (the quality manager already steps down; this would pick *which* part to drop).
- More pictures: other folds and scenes; reduced-motion polish.

## Next: sound and performing

### A phone as a remote control
A second screen in your hand: pads for mutes and clips, a big build ▸ drop pad you hold, an XY pad for the filter and squeegee, style and tempo, with haptic feedback.
No backend: pair with a QR code over a direct peer-to-peer connection (WebRTC). An optional tiny relay for places where peer-to-peer is blocked would be the first thing in the project that needs a server.

### Installable
A PWA (install from the browser, work offline), then a packaged Android app with native MIDI and lower audio latency.

### Sound on phones, still to measure
The phone settings are chosen from what is known to cause crackle and heat, and measured only on a computer. Next: measure on real phones, and move the heavy parts of the mix off the main thread (an AudioWorklet).

### MIDI, further
Hardware checks on real controllers, ready-made maps, pad grids (lit pads for feedback), playing the synth from a MIDI keyboard, optional MIDI clock in and out, controllers that use HID instead of MIDI.

### A guided tutorial
An optional walk-through that highlights one control at a time.

### Live sharing
Today: clean mode and OBS. Next: broadcast from the page (the picture and the final audio already exist as streams), or stream a set as events and render it on each viewer's screen: almost no bandwidth, perfect quality.

## Ideas

- Share a loop by link. Loop slots A/B/C with morphing; a song arranger that chains styles and journeys.
- Tap tempo. A second synth voice; more drum voices and kits; a bouncier electroswing kit.
- Keyboard navigation of the grid and rings.

## Principles

- No invented branding: plain wording, a minimal interface ("less is more").
- Nothing leaves the computer unless a person sends it.
- Every file that comes in is validated before anything changes.
- A speed-up has to be measured, and the measurement has to be in the repository.
