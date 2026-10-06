# Product websites

Six independent Netlify sites, built from this folder in `Xemb0/imautotech` on `master`.
The build uses only Node.js standard-library modules. No runtime JavaScript, third-party
fonts, tracking scripts, signup forms, or credentials are needed.

## Build and check

```sh
node product-sites/build.mjs
node --test product-sites/sites.test.mjs
# Or build one website:
node product-sites/build.mjs printlabel
```

Edit `content.mjs` for product copy, `artwork.mjs` for illustrations, and `styles.css`
for presentation. `dist/<slug>` contains only the files safe to publish. Do not deploy
the repository root to a product subdomain. Do not deploy this folder over the main site.

Each site uses base directory `product-sites`, package directory `product-sites/<slug>`,
its own `<slug>/netlify.toml`, and publish directory `dist/<slug>` relative to the base.
The main website retains its existing root Netlify configuration and payment functions.

## Content and design decisions

Descriptions were checked against the app repositories and public product catalog.
PrintLabel's printer limitations and RingReminder's simulated calls are disclosed.
Bloodlabs copy follows its actual patient/test-booking and reports screens, rather than
the catalog's broader laboratory-management claim. No clinical advice or certifications
are asserted. No store URL, download, price, testimonial, or release state is invented.
Illustrations are labelled and contain no real user data. CTAs open the existing support
email address with the relevant app name. Website privacy and terms link to Autotech.

Design plan: left-aligned product story beside one subject-specific illustration;
features below, then an actual three-step workflow, native expandable FAQs, and contact.

- PrintLabel: receipt motif; Avenir Next Condensed heading; `#f6f9fa`, `#163b4b`, `#176778`, `#e0eff0`, `#cbdcde`.
- OneTapMusic: record and library motif; Georgia heading with Avenir body; `#f0f6fa`, `#173e56`, `#225874`, `#dceaf3`, `#ebbc8b`.
- NestLink: fictional family-map motif; rounded system sans; `#f7faf5`, `#203e2f`, `#215942`, `#e3eedc`, `#9c5b45`.
- LabourChauk: pinned job-sheet motif; heavy sans heading; `#fffbf5`, `#422c20`, `#983e16`, `#fae9cd`, `#e3a149`.
- RingReminder: call-style reminder motif; restrained sans; `#fbf8ff`, `#412b59`, `#68408b`, `#ece0f8`, `#dfd0eb`.
- Bloodlabs: test/booking/report-folder motif; restrained sans; `#f6faff`, `#21445f`, `#285c89`, `#e1edf7`, `#a9384e`.

Review against the brief: replace generic app-phone mockups with the actual subject's
objects; keep a phone only for RingReminder, whose defining interaction is a call screen.
No decorative gradient hero, fabricated counters, or inaccessible fake controls.
