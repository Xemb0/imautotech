import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { products } from './content.mjs';
import { artwork } from './artwork.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderPage(product) {
  const p = product;
  const url = `https://${p.slug}.imautotech.in/`;
  const contact = `mailto:support@imautotech.in?subject=${encodeURIComponent(`${p.name} enquiry`)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(p.name)} — ${escape(p.category)}</title>
  <meta name="description" content="${escape(p.description)}">
  <meta name="theme-color" content="${p.accent}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escape(p.name)} — ${escape(p.category)}">
  <meta property="og:description" content="${escape(p.description)}">
  <meta property="og:url" content="${url}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="theme-${p.motif}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header wrap">
    <a class="brand" href="/" aria-label="${escape(p.name)} home"><span class="brand-mark" aria-hidden="true">${p.mark}</span>${escape(p.name)}</a>
    <nav aria-label="Main navigation"><a href="#features">Features</a><a href="#questions">Questions</a><a class="nav-contact" href="${contact}">Contact us</a></nav>
  </header>
  <main id="main">
    <section class="hero wrap" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="category">${escape(p.category)}</p>
        <h1 id="hero-title">${escape(p.headline).replace('\n','<br>')}</h1>
        <p class="intro">${escape(p.description)}</p>
        <div class="hero-actions"><a class="button" href="${contact}">${escape(p.cta)}</a><a class="text-link" href="#features">Explore the features</a></div>
        <p class="availability">Contact us for current app access and availability.</p>
      </div>
      <figure class="hero-art"><div class="art-stage art-${p.motif}" role="img" aria-label="${escape(p.name)} concept illustration">${artwork(p.motif)}</div><figcaption>Illustrative preview, not an app screenshot.</figcaption></figure>
    </section>
    <section class="features wrap" id="features" aria-labelledby="features-title"><h2 id="features-title">${escape(p.featuresTitle)}</h2><div class="feature-grid">${p.features.map(([title,description])=>`<article><h3>${escape(title)}</h3><p>${escape(description)}</p></article>`).join('')}</div></section>
    <section class="workflow" aria-labelledby="workflow-title"><div class="wrap workflow-layout"><h2 id="workflow-title">A simple way<br>to get going.</h2><ol>${p.steps.map((step,i)=>`<li><span aria-hidden="true">${i+1}</span>${escape(step)}</li>`).join('')}</ol></div></section>
    <section class="questions wrap" id="questions" aria-labelledby="questions-title"><h2 id="questions-title">A few useful answers.</h2><div>
      <details><summary>How do I get ${escape(p.name)}?</summary><p>Contact the Autotech team for current app availability and installation options. We will share the appropriate official download link when available. <a href="${contact}">Email us about ${escape(p.name)}</a>.</p></details>
      <details><summary>${escape(p.question)}</summary><p>${escape(p.answer)}</p></details>
      <details><summary>How can I get help?</summary><p>Email <a href="${contact}">support@imautotech.in</a> with the app name and a description of your question. Do not include passwords or sensitive personal information.</p></details>
    </div></section>
    <section class="closing wrap" aria-labelledby="closing-title"><div><h2 id="closing-title">${escape(p.closing)}</h2><p>${escape(p.note)}</p></div><a class="button" href="${contact}">Talk to the team</a></section>
  </main>
  <footer class="site-footer wrap"><div><a class="brand small" href="/">${escape(p.name)}</a><span>A product by <a href="https://imautotech.in/">imautotech</a></span></div><nav aria-label="Footer navigation"><a href="https://imautotech.in/#products-showcase">All products</a><a href="https://imautotech.in/privacy-policy.html">Privacy policy</a><a href="https://imautotech.in/terms-of-service.html">Terms</a><a href="${contact}">Support</a></nav></footer>
</body>
</html>
`;
}

export async function build(slug) {
  const selected = slug ? products.filter(p=>p.slug===slug) : products;
  if (!selected.length) throw new Error(`Unknown product: ${slug}`);
  const css = await readFile(join(root,'styles.css'),'utf8');
  for (const p of selected) {
    const dir = join(root,'dist',p.slug);
    await mkdir(dir,{recursive:true});
    await writeFile(join(dir,'index.html'),renderPage(p));
    await writeFile(join(dir,'styles.css'),css);
    await writeFile(join(dir,'favicon.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${p.accent}"/><text x="32" y="44" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="38" font-weight="bold">${p.mark}</text></svg>`);
    await writeFile(join(dir,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: https://${p.slug}.imautotech.in/sitemap.xml\n`);
    await writeFile(join(dir,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${p.slug}.imautotech.in/</loc></url></urlset>`);
    await writeFile(join(dir,'404.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — ${p.name}</title><link rel="stylesheet" href="/styles.css"><body class="theme-${p.motif}"><main class="wrap questions"><h1>Page not found.</h1><p>That page is not available.</p><a class="button" href="/">Back to ${p.name}</a></main></body></html>`);
    await writeFile(join(dir,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'\n`);
    console.log(`Built ${p.slug}: ${dir}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await build(process.argv[2]);
