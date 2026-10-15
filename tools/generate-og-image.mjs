/**
 * Composes a share card into `public/og-image.png` from the site's own assets.
 *
 * READ THIS BEFORE RUNNING IT. As of 2026-09-11 the card that actually ships is
 * a design export, not this script's output — different layout (small wordmark
 * above a two-line headline, no strapline or domain along the bottom) and a
 * background the design carries that this script cannot reproduce, because the
 * live hero's dot texture comes from a WebGL shader rather than a file in
 * `public/`. Running this WILL overwrite the designer's card with a
 * near-miss, so it refuses to unless you pass `--force`:
 *
 *   node tools/generate-og-image.mjs --force
 *
 * Keep it around for the reason it was written. The previous card had no
 * generator: it was a committed PNG, so the 2026-09 rebrand went straight past
 * it, and long after the site was white with navy ink and a new headline every
 * link posted to LinkedIn or Slack still showed a cream card, the old green, an
 * eyebrow pill the design had dropped and the retired "legendary company" line.
 * Nothing pointed at it, so nothing caught it. This is the fallback that gets a
 * correct-enough card out of the repo's current assets when that happens again
 * and no designer is available — `public/logos/logotype.svg` and
 * `public/images/hero-bg.webp` are the files the live hero uses, and the ink is
 * the `--color-text-primary` token.
 *
 * DM Sans comes from Google Fonts at run time — it is the same face `next/font`
 * serves, but next/font's copy is hashed into `.next` and not addressable here.
 * The download is the only network call; everything else is local.
 *
 * The request names the `opsz` axis for the same reason `layout.tsx` does: ask
 * for `wght` alone and Google serves the face frozen at the text cut, which
 * sets about 10% wider than the design at display sizes. Without it the card's
 * headline is set in a different cut from the page it links to.
 *
 * Requires Playwright's Chromium, which the repo already installs for the gates.
 */
import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Mirrors the live `<h1>`; keep the two identical when the headline changes. */
const HEADLINE = 'We help the outliers on their journey to build generational companies'
const STRAPLINE = 'Pre-Seed to Series A across the USA, UK, Israel and EU'
/** The brand domain, not `SITE_URL` — this is artwork, not a link. */
const DOMAIN = 'mento.vc'
const INK = '#04212B'

const b64 = async (rel) => (await readFile(path.join(root, rel))).toString('base64')

async function dmSans() {
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500&display=swap',
  ).then((r) => r.text())
  const url = css.match(/https:\/\/fonts\.gstatic\.com[^)]+/)?.[0]
  if (!url) throw new Error('could not find the DM Sans file in the Google Fonts CSS')
  const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()))
  return { data: buf.toString('base64'), format: url.endsWith('.woff2') ? 'woff2' : 'truetype' }
}

const font = await dmSans()
const [bg, logo] = await Promise.all([
  b64('public/images/hero-bg.webp'),
  b64('public/logos/logotype.svg'),
])

const html = `<!doctype html><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'DM Sans';
    font-weight: 500;
    src: url(data:font/${font.format};base64,${font.data}) format('${font.format}');
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1200px; height:630px; }
  .card { position:relative; width:1200px; height:630px; overflow:hidden; background:#FFFFFF; }
  /* The hero's own cloud photo, cropped the way the hero crops it. */
  .bg { position:absolute; inset:0; background:url(data:image/webp;base64,${bg}) center top / cover no-repeat; }
  /* The hero fades its photo into white at the bottom; same here, so the
     strapline sits on flat white instead of on cloud. */
  .fade {
    position:absolute; left:0; right:0; bottom:0; height:340px;
    background:linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 62%, #FFFFFF 84%);
  }
  .inner {
    position:relative; width:100%; height:100%; padding:72px 80px 64px;
    display:flex; flex-direction:column; justify-content:space-between;
    font-family:'DM Sans', sans-serif; color:${INK};
  }
  .logo { width:250px; height:auto; display:block; }
  h1 { font-size:72px; font-weight:500; line-height:1.16; letter-spacing:-0.015em; max-width:1010px; }
  .foot { display:flex; align-items:baseline; justify-content:space-between; font-size:24px; font-weight:500; }
  .foot .left { color:rgba(4,33,43,0.66); }
</style>
<div class="card">
  <div class="bg"></div>
  <div class="fade"></div>
  <div class="inner">
    <img class="logo" src="data:image/svg+xml;base64,${logo}" alt="">
    <h1>${HEADLINE}</h1>
    <div class="foot"><span class="left">${STRAPLINE}</span><span>${DOMAIN}</span></div>
  </div>
</div>`

// Scratch HTML goes to the system temp dir, not the repo — the only file this
// script is meant to leave behind is the PNG.
const tmp = path.join(tmpdir(), 'mento-og-image.html')
await writeFile(tmp, html)

// The shipped card is a design export; see the note at the top of this file.
// Overwriting it silently is the exact failure this script exists to prevent,
// so make the destructive case something you have to ask for.
const target = path.join(root, 'public', 'og-image.png')
if (!process.argv.includes('--force') && existsSync(target)) {
  console.error(
    `Refusing to overwrite ${path.relative(root, target)}.\n` +
      'It is the design export, and this script composes a different card.\n' +
      'Re-run with --force if replacing it is what you mean to do.',
  )
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.goto('file://' + tmp)
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: target })
await browser.close()

console.log('wrote public/og-image.png')
