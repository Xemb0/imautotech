import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { products } from './content.mjs';
import { renderPage } from './build.mjs';

test('six distinct product domains', () => {
  assert.equal(products.length, 6);
  assert.equal(new Set(products.map(p=>p.slug)).size, 6);
});

for (const product of products) {
  test(`${product.name}: accessible static page, real contact, and correct identity`, async () => {
    const html = renderPage(product);
    assert.match(html, /<html lang="en">/);
    assert.equal((html.match(/<h1\b/g)||[]).length, 1);
    assert.match(html, new RegExp(`https://${product.slug}\\.imautotech\\.in/`));
    assert.ok(html.includes(`<title>${product.name} —`));
    assert.ok(html.includes(`mailto:support@imautotech.in?subject=${encodeURIComponent(`${product.name} enquiry`)}`));
    assert.match(html, /Illustrative preview, not an app screenshot/);
    assert.match(html, /Contact us for current app access and availability/);
    assert.equal((html.match(/<details>/g)||[]).length, 3);
    assert.equal((html.match(/<article>/g)||[]).length, 3);
    assert.doesNotMatch(html, /<script|href="#"|play\.google\.com|apps\.apple\.com|Lorem ipsum/);
    for (const [,id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `missing anchor ${id}`);
    const config = await readFile(new URL(`./${product.slug}/netlify.toml`, import.meta.url),'utf8');
    assert.ok(config.includes(`publish = "dist/${product.slug}"`));
    assert.ok(config.includes(`command = "node build.mjs ${product.slug}"`));
  });
}

test('important limitations are visible, with no inflated product claims', () => {
  assert.match(renderPage(products.find(p=>p.slug==='printlabel')), /not classic Bluetooth SPP/);
  assert.match(renderPage(products.find(p=>p.slug==='ringreminder')), /not a real phone call/);
  assert.match(renderPage(products.find(p=>p.slug==='bloodlabs')), /Not a diagnosis or medical advice/);
  assert.match(renderPage(products.find(p=>p.slug==='nestlink')), /do not replace calling local emergency services/);
});
