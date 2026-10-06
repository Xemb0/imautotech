// Run with Playwright available through NODE_PATH. Tests built sites in a real browser.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { products } from './content.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, 'qa-output');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
try {
  for (const product of products) {
    const dir = join(root,'dist',product.slug);
    const server = createServer(async (req,res)=>{
      const pathname = new URL(req.url,'http://localhost').pathname;
      const path = resolve(dir, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!path.startsWith(`${dir}/`)) { res.writeHead(403).end(); return; }
      try {
        const data = await readFile(path);
        res.setHeader('Content-Type', {'.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[extname(path)]||'text/plain');
        res.end(data);
      } catch { res.writeHead(404).end(); }
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    try {
      for (const width of [1440,390,320]) {
        await page.setViewportSize({width,height:width===1440?960:844});
        const response = await page.goto(`http://127.0.0.1:${server.address().port}/`);
        assert.equal(response.status(),200);
        assert.equal(await page.locator('h1').count(),1);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `${product.slug}: horizontal overflow at ${width}`);
        const cta = page.locator('.hero-actions .button');
        assert.ok((await cta.getAttribute('href')).startsWith('mailto:support@imautotech.in?subject='));
        await page.locator('a.text-link').click();
        assert.equal(new URL(page.url()).hash,'#features');
        await page.locator('summary').first().click();
        assert.equal(await page.locator('details').first().getAttribute('open'),'');
        await page.locator('summary').first().click();
        assert.equal(await page.locator('details').first().getAttribute('open'),null);
        await page.emulateMedia({reducedMotion:'reduce'});
        assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to content');
        await page.keyboard.press('Enter');
        assert.equal(new URL(page.url()).hash,'#main');
        await page.locator('h1').click();
        await page.evaluate(()=>scrollTo(0,0));
        if (width!==320) await page.screenshot({path:join(output,`${product.slug}-${width}.png`),fullPage:true});
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS ${product.slug}: 1440/390/320px, navigation, FAQ, keyboard, reduced motion, no overflow or runtime errors`);
    } finally { await page.close(); await new Promise(r=>server.close(r)); }
  }
} finally { await browser.close(); }
