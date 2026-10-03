/* DreVelopDrop: the few settings a person might change. One place, so a rename is one edit. */
export const CONFIG = {
  version: '0.1.0',
  name: 'DreVelopDrop',
  slug: 'drevelopdrop',
  repoUrl: 'https://github.com/DreDarkroom/DreVelopDrop',
  /** File markers. New files say DreVelopDrop; files from the original instrument (SquidgySqueegee / DevelopDrop) still load. */
  app: 'DreVelopDrop',
  legacyApps: ['SquidgySqueegee', 'DevelopDrop'],
};

export const isOurs = (doc) => !!doc && (doc.app === CONFIG.app || CONFIG.legacyApps.includes(doc.app));
