/* DreVelopDrop: the few settings a person might change. One place, so a rename is one edit. */
export const CONFIG = {
  version: '0.1.1',
  name: 'DreVelopDrop',
  slug: 'drevelopdrop',
  repoUrl: 'https://github.com/DreDarkroom/DreVelopDrop',
  /** Where the feedback card sends an answer: a private notification channel (ntfy). Empty = the card never appears. */
  feedbackUrl: 'https://ntfy.sh/developdrop-fb-c3br1njqktulddkr5c5e58',
  /** GoatCounter site code for an anonymous page-view count (no cookies, no IP address stored). Empty = no counting. Leave empty until the owner has made the account. */
  counterCode: '',
  /** File markers. New files say DreVelopDrop; files from the original instrument (SquidgySqueegee / DevelopDrop) still load. */
  app: 'DreVelopDrop',
  legacyApps: ['SquidgySqueegee', 'DevelopDrop'],
};

export const isOurs = (doc) => !!doc && (doc.app === CONFIG.app || CONFIG.legacyApps.includes(doc.app));
