import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  '/root/.hermes/tools/chromium-1208/chrome-linux64/chrome',
].filter(Boolean);

async function loadChromium() {
  const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!chrome) return null;
  const modules = [
    'playwright',
    'playwright-core',
    '/root/.bun/install/cache/playwright-core@1.63.0@@@1/index.mjs',
  ];
  for (const specifier of modules) {
    try {
      const imported = await import(specifier);
      if (imported.chromium) return { chromium: imported.chromium, chrome };
    } catch {
      // Try the next install of Playwright.
    }
  }
  return null;
}

async function serve(directory) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204);
      response.end();
      return;
    }
    const decoded = decodeURIComponent(url.pathname);
    const file = path.resolve(directory, `.${decoded}`);
    if (file !== directory && !file.startsWith(directory + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const target = fs.existsSync(file) && fs.statSync(file).isDirectory()
      ? path.join(file, 'index.html')
      : file;
    fs.readFile(target, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end('not found');
        return;
      }
      const types = {
        '.js': 'text/javascript',
        '.html': 'text/html',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      };
      const type = types[path.extname(target)] || 'application/octet-stream';
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test('one choice gates every optional cookie', { timeout: 60000 }, async (t) => {
  const loaded = await loadChromium();
  if (!loaded) {
    t.skip('Chromium is not installed');
    return;
  }
  const { chromium, chrome } = loaded;
  const { server, url } = await serve(root);
  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const requested = [];
    page.on('request', (request) => requested.push(request.url()));
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`${url}/demo/index.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.crumbnod');
    await page.waitForFunction(() => {
      const logo = document.querySelector('.brand img');
      return logo && logo.complete && logo.naturalWidth > 0;
    });

    assert.equal(await page.evaluate(() => window.CrumbNod?.name), 'CrumbNod');
    assert.equal(await page.locator('#state').textContent(), 'No choice yet. Optional cookies stay off.');
    assert.equal(
      await page.locator('.crumbnod-copy').textContent(),
      'This site uses cookies.\u2002Approve them or reject them.',
    );
    const privacy = await page.evaluate(() => {
      const message = document.querySelector('.crumbnod-message');
      const link = document.querySelector('.crumbnod-privacy');
      const box = link.getBoundingClientRect();
      const line = message.getBoundingClientRect();
      return {
        href: link.getAttribute('href'),
        text: link.textContent,
        sentence: message.textContent,
        inside: message.contains(link),
        display: getComputedStyle(link).display,
        inlineEnd: box.bottom <= line.bottom + 1 && box.top >= line.top - 1,
      };
    });
    assert.equal(privacy.href, '#privacy');
    assert.equal(privacy.text, 'privacy');
    assert.equal(
      privacy.sentence,
      'This site uses cookies.\u2002Approve them or reject them.\u2002Visit our privacy page to learn more.',
    );
    assert.equal(privacy.inside, true);
    assert.equal(privacy.display, 'inline');
    assert.equal(privacy.inlineEnd, true);
    assert.equal(await page.locator('#crumbnod-style').count(), 1);
    assert.equal(await page.locator('.crumbnod-deny').textContent(), 'Reject');
    assert.equal(await page.locator('.crumbnod-allow').textContent(), 'Approve');
    const sizes = await page.evaluate(() => {
      const deny = document.querySelector('.crumbnod-deny');
      const allow = document.querySelector('.crumbnod-allow');
      const denyStyle = getComputedStyle(deny);
      return {
        denyHeight: deny.offsetHeight,
        allowHeight: allow.offsetHeight,
        denyBg: denyStyle.backgroundColor,
        focused: document.activeElement?.className || '',
      };
    });
    assert.equal(sizes.denyHeight, sizes.allowHeight);
    assert.ok(sizes.denyHeight >= 44);
    assert.notEqual(sizes.denyBg, 'rgba(0, 0, 0, 0)');
    assert.equal(sizes.focused, 'crumbnod-allow');

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.crumbnod').count(), 1);
    assert.equal(await page.evaluate(() => document.cookie), '');

    await page.locator('#theme').click();
    const light = await page.evaluate(() => getComputedStyle(document.querySelector('.crumbnod')).backgroundColor);
    assert.equal(light, 'rgb(255, 255, 255)');

    await page.locator('.crumbnod-deny').click();
    await page.waitForSelector('.crumbnod', { state: 'hidden' });
    assert.equal(await page.locator('#state').textContent(), 'Optional cookies are off.');
    assert.equal(await page.locator('#crumbnod-style').count(), 0);
    assert.match(await page.evaluate(() => document.cookie), /cookieconsent_status=deny/);
    assert.equal(errors.length, 0, errors.join('\n'));

    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.crumbnod').count(), 0);
    assert.equal(await page.locator('#crumbnod-style').count(), 0);
    assert.equal(await page.locator('#state').textContent(), 'Optional cookies are off.');

    await page.locator('#reopen').click();
    await page.waitForSelector('.crumbnod');
    assert.equal(await page.evaluate(() => document.activeElement?.className || ''), 'crumbnod-allow');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#state')?.textContent === 'Optional cookies are allowed: preferences, drafts.');
    assert.match(await page.evaluate(() => document.cookie), /cookieconsent_status=allow/);
    assert.equal(await page.evaluate(() => document.activeElement?.id || ''), 'reopen');

    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.crumbnod').count(), 0);
    assert.equal(await page.locator('#state').textContent(), 'Optional cookies are allowed: preferences, drafts.');
    assert.equal(requested.some((item) => /analytics|googletagmanager|doubleclick/i.test(item)), false);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
