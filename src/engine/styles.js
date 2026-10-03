/* DreVelopDrop: lights and styles. Plain data.
   Styles are complete starting points (tempo, kit, patterns, rings, sound, light, picture): original patterns written in the spirit of each,
   named for darkroom terms, with the inspirations in the notes. */

/** The light you work under decides the mode. */
export const LIGHTS = [
  { id: 'safelight', name: 'Safelight', mode: 'Aeolian', scale: [0, 2, 3, 5, 7, 8, 10], tint: [255, 52, 32] },
  { id: 'amber', name: 'Amber', mode: 'Dorian', scale: [0, 2, 3, 5, 7, 9, 10], tint: [255, 158, 48] },
  { id: 'enlarger', name: 'Enlarger', mode: 'Lydian', scale: [0, 2, 4, 6, 7, 9, 11], tint: [246, 238, 222] },
];

/** Evenly spread `hits` across `len` steps, then rotate. */
export function euclid(hits, len, rot) {
  const out = new Array(len).fill(false);
  for (let i = 0; i < len; i++) if (Math.floor(((i + 1) * hits) / len) !== Math.floor((i * hits) / len)) out[(i + rot) % len] = true;
  return out;
}

const R = (len, hits, rot) => ({ len, steps: euclid(hits, len, rot) });
const O = (len, on) => ({ len, steps: Array.from({ length: len }, (_, i) => on.includes(i)) });
const SND = (cutoff, reso, decay, drive, glide, space) => ({ cutoff, reso, decay, drive, glide, space });
const EMPTY = new Array(16).fill(-1);

export const STYLES = [
  { name: 'Safelight', note: 'The default: slow, rolling, hypnotic.', tempo: 119, swing: 0.22, kit: 'safelight', light: 0, scene: 0, drift: 0.4,
    bass: [0, -1, 0, 2, -1, 4, -1, 3, 0, -1, 5, -1, 4, 2, -1, 7], kick: R(16, 4, 1), snare: R(12, 2, 3), hat: R(14, 7, 0), sound: SND(0.42, 0.4, 0.38, 0.22, 0.18, 0.3) },
  { name: 'Latent Image', note: 'Minimal and polyrhythmic, sparse bass, dry clicks (in the spirit of Max Cooper).', tempo: 122, swing: 0.05, kit: 'minimal', light: 1, scene: 1, drift: 0.55,
    bass: [0, -1, -1, -1, 4, -1, -1, 2, -1, -1, -1, -1, 5, -1, 3, -1], kick: R(16, 5, 0), snare: R(12, 3, 2), hat: R(14, 9, 0), sound: SND(0.5, 0.3, 0.2, 0.1, 0.05, 0.2) },
  { name: 'Dodge & Burn', note: 'Four on the floor, clap on two and four, offbeat hats, driving bass (in the spirit of Soulwax).', tempo: 126, swing: 0.12, kit: 'electro', light: 0, scene: 2, drift: 0.3,
    bass: [0, 0, -1, 7, 0, -1, 7, 0, 0, -1, 5, 0, -1, 7, 3, -1], kick: R(16, 4, 1), snare: R(16, 2, 5), hat: R(16, 4, 3), sound: SND(0.55, 0.45, 0.25, 0.3, 0.08, 0.25) },
  { name: 'Long Exposure', note: 'Rave: a pumping arpeggio, big kick and open hats (in the spirit of Orbital).', tempo: 134, swing: 0, kit: 'rave', light: 2, scene: 3, drift: 0.4,
    bass: [0, 4, 7, 4, 0, 4, 7, 4, 2, 5, 7, 5, 2, 5, 7, 5], kick: R(16, 4, 1), snare: R(16, 2, 5), hat: R(16, 8, 1), sound: SND(0.6, 0.5, 0.3, 0.3, 0.1, 0.35) },
  { name: 'Rapid Fixer', note: 'Drum and bass at 174: two-step kick, snare on two and four, rolling bass.', tempo: 174, swing: 0, kit: 'dnb', light: 0, scene: 1, drift: 0.35, dnb: true,
    bass: [0, -1, 0, -1, -1, 0, -1, 3, 0, -1, 0, -1, -1, 5, -1, 3], kick: O(16, [0, 10]), snare: O(16, [4, 12]), hat: R(16, 13, 0), sound: SND(0.35, 0.5, 0.2, 0.35, 0.02, 0.2) },
  { name: 'Slow Build', note: 'Start quiet with only a kick and hats, then bring the rest in with Z X V B or a right-click on a ring.', tempo: 104, swing: 0.18, kit: 'safelight', light: 0, scene: 0, drift: 0.3,
    bass: [0, -1, -1, -1, 0, -1, -1, -1, 3, -1, -1, -1, 2, -1, -1, -1], kick: R(16, 4, 1), snare: R(12, 2, 3), hat: R(14, 7, 0), sound: SND(0.4, 0.35, 0.4, 0.15, 0.2, 0.35), mute: { snare: true, bass: true } },
  // new in DreVelopDrop: the ink scene, tentacles' darker cousin, a wet and wobbly groove
  { name: 'Ink Cloud', note: 'Wet and wobbly: a slow squid groove with the ink scene, bass that slides (SquidgySqueegee\'s own).', tempo: 112, swing: 0.3, kit: 'safelight', light: 0, scene: 4, drift: 0.5,
    bass: [0, -1, -1, 2, -1, 0, -1, -1, 3, -1, 2, -1, -1, 0, -1, 4], kick: R(16, 3, 0), snare: R(12, 2, 4), hat: R(14, 6, 1), sound: SND(0.38, 0.55, 0.5, 0.18, 0.5, 0.5) },
  { name: 'Blank', note: 'Nothing playing: write your own.', tempo: 119, swing: 0.15, kit: 'safelight', light: 0, scene: 0, drift: 0.4,
    bass: EMPTY.slice(), kick: O(16, []), snare: O(16, []), hat: O(16, []), sound: SND(0.42, 0.4, 0.38, 0.22, 0.18, 0.3) },
];
