import { test, expect } from '@playwright/test'

/**
 * Above the design width the page ENLARGES; it does not re-lay itself out.
 *
 * Everything in the `min-width: 1440px` tier rides one ramp — `--px`, which is
 * `100vw / 1440` capped at the 1920 ceiling — so a value written as
 * `calc(<the Figma number at 1440> * var(--px))` is that number at 1440 and
 * exactly 4/3 of it at 1920. Type is on the same ramp: the `--fluid-*` tokens
 * are all `calc(<size> * var(--px))` up here.
 *
 * That property is easy to lose and invisible when you do. It is lost by a
 * single flat `gap: 24px` in a section whose grid and type both grow, and the
 * result is not a broken page — it is a page whose proportions quietly drift
 * as the window widens. Before this ramp existed, an audit of every element in
 * these five sections found 47/83 values off-scale in the hero, 320/430 in
 * Focus, 885/1219 in Portfolio and 34/58 in the footer, and the About
 * paragraphs re-broke three times between 1440 and 1920.
 *
 * So this gate does what that audit did. It walks every element of every
 * section at 1440 and again at 1920, takes the ratio of each geometric value,
 * and asserts they are all the same ratio. It does not assert WHAT the ratio
 * is, only that there is one — which is the actual invariant, and which stays
 * true if the 1920 ceiling ever moves.
 *
 * Three things are excluded, each for a reason that is not "it was failing":
 *
 *   - an inline box's height is the font's content area rounded to whole pixels
 *     by the engine, so it cannot land on a fractional ratio (20px type gives
 *     26 where 26.67 is wanted);
 *   - a box whose height IS the viewport height does not answer to the window's
 *     width at all, which is the hero, and inside it vertical position comes
 *     from centring against that non-scaling height — so `y` is skipped there
 *     while `x`, width and type are still checked;
 *   - the scramble spans hold a randomised glyph while their tween runs, so
 *     their width is whichever character the animation was on at capture.
 */
const WIDE = 1920
const DESIGN = 1440
const SECTIONS = ['.hero', '.section-about', '.section-focus', '.section-portfolio', '.section-footer']
/** Sub-pixel layout and font rounding, not drift. */
const TOLERANCE = 0.02

type Rec = Record<string, number | string>

async function measure(page: import('@playwright/test').Page, width: number) {
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  // Every section has an entrance animation; walk the page so each one has
  // played before anything is measured.
  for (const sel of SECTIONS) {
    const loc = page.locator(sel).first()
    if (await loc.count()) await loc.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(1800)

  return page.evaluate(
    ({ sections }) => {
      const out: Record<string, Record<string, number>[]> = {}
      for (const sel of sections) {
        const root = document.querySelector(sel)
        if (!root) continue
        const base = root.getBoundingClientRect()
        const seen = new Map<string, number>()
        const recs: Record<string, number>[] = []
        const viewport = `${window.innerHeight}px`
        const isViewportBox = (el: Element) => getComputedStyle(el).height === viewport

        for (const el of [root, ...root.querySelectorAll('*')]) {
          const r = el.getBoundingClientRect()
          if (!r.width && !r.height) continue
          const cs = getComputedStyle(el)
          const cls =
            typeof el.className === 'string' && el.className.trim()
              ? el.className.trim().split(/\s+/).join('.')
              : el.tagName.toLowerCase()
          if (/-char|scramble/.test(cls)) continue

          const n = seen.get(cls) ?? 0
          seen.set(cls, n + 1)
          const rec: Record<string, number> = { __k: n, w: +r.width.toFixed(2) }
          ;(rec as unknown as { id: string }).id = `${sel} ${cls}#${n}`

          const vh = isViewportBox(el)
          if (cs.display !== 'inline' && !vh) rec.h = +r.height.toFixed(2)
          // A marquee track's offset is a function of time, not of layout.
          const animated = !!el.closest('[class*="logo-track"], [class*="marquee"]')
          if (!animated && !vh) {
            rec.x = +(r.left - base.left).toFixed(2)
            let inViewportBox = false
            for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
              if (isViewportBox(a)) { inViewportBox = true; break }
            }
            if (!inViewportBox) rec.y = +(r.top - base.top).toFixed(2)
          }
          const ownText = [...el.childNodes].some((c) => c.nodeType === 3 && !!c.textContent?.trim())
          if (ownText) rec.font = parseFloat(cs.fontSize)
          for (const [k, v] of [
            ['gap', cs.rowGap], ['colGap', cs.columnGap],
            ['padT', cs.paddingTop], ['padL', cs.paddingLeft],
          ] as const) {
            const num = parseFloat(v)
            if (Number.isFinite(num)) rec[k] = num
          }
          recs.push(rec)
        }
        out[sel] = recs
      }
      return out
    },
    { sections: SECTIONS },
  )
}

test('every section scales as one piece above the design width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const atDesign = await measure(page, DESIGN)
  const atWide = await measure(page, WIDE)

  const failures: string[] = []

  for (const sel of SECTIONS) {
    const a = atDesign[sel]
    const b = atWide[sel]
    expect(a, `${sel} is not in the document at ${DESIGN}`).toBeTruthy()
    expect(b, `${sel} is not in the document at ${WIDE}`).toBeTruthy()

    const byId = new Map(b.map((r) => [(r as unknown as Rec).id as string, r]))
    const ratios: { id: string; k: string; va: number; vb: number; r: number }[] = []
    for (const rec of a) {
      const id = (rec as unknown as Rec).id as string
      const other = byId.get(id)
      if (!other) continue
      for (const k of Object.keys(rec)) {
        if (k === 'id' || k === '__k') continue
        const va = rec[k]
        const vb = other[k]
        // Below a pixel, rounding dominates and the ratio means nothing.
        if (typeof va !== 'number' || typeof vb !== 'number' || Math.abs(va) < 1) continue
        ratios.push({ id, k, va, vb, r: vb / va })
      }
    }

    // A section with nothing measurable would pass silently; say so instead.
    expect(ratios.length, `${sel} produced no comparable values`).toBeGreaterThan(20)

    const sorted = ratios.map((x) => x.r).sort((x, y) => x - y)
    const scale = sorted[Math.floor(sorted.length / 2)]
    for (const x of ratios) {
      if (Math.abs(x.r - scale) > TOLERANCE) {
        failures.push(
          `${x.id} ${x.k}: ${x.va} -> ${x.vb} (x${x.r.toFixed(3)}), section scales x${scale.toFixed(3)}`,
        )
      }
    }
  }

  expect(failures.join('\n'), `values that do not scale with their section:\n${failures.join('\n')}`).toBe('')
})
