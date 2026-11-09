/* global document, Worker */
import { expect, test } from '@playwright/test';

let pageErrors;
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

for (const threadPool of [false, true]) {
  for (const format of ['es', 'cjs', 'umd', 'iife']) {
    test(`loads ${format} with selfDefending (threadPool=${threadPool})`, async ({ page, request }) => {
      const response = await request.get('/library/manifest.json');
      expect(response.ok()).toBeTruthy();
      const bundles = await response.json();
      const bundle = bundles.find(item => item.format === format && item.threadPool === threadPool);
      expect(bundle).toBeDefined();
      await page.goto('/');
      const result = await page.evaluate(async ({ url, format }) => {
        let library;
        if (format === 'es') library = await import(url);
        else if (format === 'cjs') {
          const code = await (await fetch(url)).text();
          const module = { exports: {} };
          new Function('module', 'exports', code)(module, module.exports);
          library = module.exports;
        }
        else {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          library = globalThis.TestLibrary;
        }
        return { sum: library.add(1, 2), exports: Object.keys(library).sort() };
      }, bundle);
      expect(result).toEqual({ sum: 3, exports: ['add', 'fail'] });
    });
  }
}

for (const sourcemap of [true, 'inline', 'hidden']) {
  test(`loads the library with matching Debug IDs (sourcemap=${sourcemap})`, async ({ page, request }) => {
    const bundles = await (await request.get('/library/manifest.json')).json();
    const bundle = bundles.find(item => item.sourcemap === sourcemap);
    expect(bundle).toBeDefined();
    const code = await (await request.get(bundle.url)).text();
    const ids = [...code.matchAll(/\/\/# debugId=([\da-f-]+)/g)];
    expect(ids).toHaveLength(1);
    const map = sourcemap === 'inline'
      ? JSON.parse(Buffer.from(/base64,([^\r\n]+)/.exec(code)[1], 'base64').toString())
      : await (await request.get(`${bundle.url}.map`)).json();
    expect(map.debugId).toBe(ids[0][1]);
    expect(code.includes('sourceMappingURL')).toBe(sourcemap !== 'hidden');
    await page.goto('/');
    const sum = await page.evaluate(async url => (await import(url)).add(1, 2), bundle.url);
    expect(sum).toBe(3);
  });
}

test('loads dynamically imported obfuscated chunks with the thread pool', async ({ page, request }) => {
  const response = await request.get('/browser/manifest.json');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.chunks).toBeGreaterThanOrEqual(2);
  await page.goto('/');
  const value = await page.evaluate(async url => (await import(url)).load(), manifest.entry);
  expect(value).toBe(42);
});

for (const format of ['esm', 'cjs']) {
  test(`runs the application and Worker from the ${format} config`, async ({ page }) => {
    await page.addInitScript(() => {
      globalThis.__workerMessages = [];
      const BaseWorker = Worker;
      globalThis.Worker = class extends BaseWorker {
        constructor(...args) {
          super(...args);
          this.addEventListener('message', event => globalThis.__workerMessages.push(event.data));
        }
      };
    });
    await page.goto(`/${format}/`);
    await expect(page.locator('#app')).toHaveText('VITE_OBFUSCATOR_COMPATIBILITY_SENTINEL');
    await expect.poll(() => page.evaluate(() => globalThis.__workerMessages)).toEqual(['VITE_WORKER_OBFUSCATOR_COMPATIBILITY_SENTINEL']);
  });
}
