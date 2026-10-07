# Project instructions

## Name

The project is **DreVelopDrop** (a working title): capital D, capital V, one word. Never "Drevelopdrop" or "Dre Velop Drop".
It grew from DevelopDrop (a separate repository) and is its **experimental parallel version**: new ideas are tried here first and may change or break; DevelopDrop stays the steady one (bug fixes and measurement only). The feedback card (`src/ui/feedback.js`) and DevelopDrop's `js/feedback.js` share one design and one set of tests: change them together.

- Repo: `DreDarkroom/DreVelopDrop`. `src/config.js` holds the name, the slug (`drevelopdrop`, the file and storage prefix) and the version.
- The DJ aliases DreDarkroom, SafeLight and SquidgySqueegee are separate from the project name and keep their own casing.
- New files say `app: "DreVelopDrop"`. Files from the original (`app: "SquidgySqueegee"` or `"DevelopDrop"`) must keep loading: `isOurs()` in `src/config.js` is the one place that decides.

## Working rules

- No build step, no framework: plain ES modules, served as they are. Add a dependency only if nothing smaller will do, and vendor it with its licence.
- Engines are factories (`createAudio`, `createSeq`, `createVisual`), never globals; pure logic (`perf/format.js`, `studio/edit.js`, `engine/loopfile.js`) takes no browser APIs so tests can run it.
- Every file that comes in (loops, clips, recordings, MIDI maps) is validated before anything changes; a bad file must never half-load.
- A speed-up has to be measured with developer mode's tools, and the numbers go in the README. Say plainly when a measurement is noisy.
- Keep public files (README, ROADMAP, this file) free of private notes. No real names anywhere: only the aliases above.
- No invented branding: no logos, taglines or lore. Plain wording.
- Deploying (push to `main`) and renaming things on GitHub need the owner's go-ahead.
- Release routine: bump `version` in `src/config.js`, run `node tools/stamp.js`, run the tests (`npm test`), commit, push, check the live page.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
