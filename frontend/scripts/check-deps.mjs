import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mods = ['framer-motion', 'cmdk', '@radix-ui/react-tooltip', 'react'];
const results = Object.fromEntries(
  mods.map((m) => [m, fs.existsSync(path.join(root, 'node_modules', m))])
);
const payload = {
  sessionId: '714cdf',
  runId: process.env.DEBUG_RUN_ID || 'pre-fix',
  hypothesisId: 'A',
  location: 'frontend/scripts/check-deps.mjs',
  message: 'frontend node_modules dep presence after install',
  data: results,
  timestamp: Date.now(),
};
console.log('[debug-714cdf]', JSON.stringify(payload));
// #region agent log
fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '714cdf' },
  body: JSON.stringify(payload),
}).catch(() => {});
// #endregion
if (!results['framer-motion'] || !results.cmdk || !results['@radix-ui/react-tooltip']) {
  console.error('[debug-714cdf] REQUIRED_DEPS_MISSING', results);
  process.exit(1);
}
