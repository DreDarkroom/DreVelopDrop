// Adds ?v=<version> to every local script and stylesheet in the HTML pages, and prints what it did.
// Why: hosts cache files for minutes, so after a release a visitor could get a NEW page with OLD scripts. A new version string in the address makes browsers fetch the matching files.
// Run it after changing the version in src/config.js:   node tools/stamp.js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = (readFileSync(join(root, 'src/config.js'), 'utf8').match(/version:\s*'([^']+)'/) || [])[1];
if (!version) { console.error('could not find the version in src/config.js'); process.exit(1); }
for (const page of ['index.html', 'studio.html']) {
  const file = join(root, page), before = readFileSync(file, 'utf8');
  const after = before.replace(/((?:src|href)="(?:src|css)\/[^"?]+)(?:\?v=[^"]*)?"/g, `$1?v=${version}"`);
  if (after !== before) writeFileSync(file, after);
  console.log(`${page}: ${(after.match(/\?v=/g) || []).length} references stamped ?v=${version}`);
}
