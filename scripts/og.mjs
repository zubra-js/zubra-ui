// Photographs the social card (dist/og/, written by scripts/site.mjs) into site/assets/og.png,
// the image every page's og:image names. Run it after a change to the card or the brand:
//
//   npm run build && node scripts/og.mjs && npm run build
//
// The second build copies the new image into dist/. PLAYWRIGHT_CHROME is a browser to use
// instead of Playwright's own Chromium.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(dist, path.endsWith('/') ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROME ? { executablePath: process.env.PLAYWRIGHT_CHROME, args: (process.env.PLAYWRIGHT_ARGS ?? '').split(' ').filter(Boolean) } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: 'light' });
  await page.goto(`http://127.0.0.1:${server.address().port}/og/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(root, 'site/assets/og.png'), type: 'png' });
  console.log('og: site/assets/og.png (1200 by 630)');
} finally {
  await browser.close();
  server.close();
}
