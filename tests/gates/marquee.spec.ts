import { test, expect } from '@playwright/test'

/**
 * The About logo strip has to run at ONE speed whatever the portfolio holds.
 *
 * A CSS marquee is declared as a duration, not a rate, and the track travels
 * exactly one set of logos per cycle — so the moment a duration is written as a
 * literal, adding a company speeds the strip up. That is what happened once
 * before, when the portfolio grew from 4 companies to 29 and the strip ended up
 * running roughly seven times faster than it was tuned for.
 *
 * The fix is arithmetic rather than a magic number: `AboutContent` sets the
 * duration to `count * SECONDS_PER_LOGO`, so the distance and the time both
 * scale with the count and the rate cancels out. This gate pins that shape.
 * A test only ever sees one count, so it checks the invariant that fails the
 * moment the shape is lost: seconds-per-logo, which stays put only if the
 * duration really is derived from the count.
 */
const SECONDS_PER_LOGO = 3.5

test('the logo strip runs at a count-independent rate', async ({ page }) => {
  // The strip is `animation: none` under reduced motion, which is correct and
  // leaves nothing to measure. Ask for the state the assertions are about
  // rather than inheriting whatever the runner's environment happens to prefer.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.about-logos').scrollIntoViewIfNeeded()

  const strip = await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('.about-logo-track')
    if (!track) throw new Error('.about-logo-track is not in the document')
    const cs = getComputedStyle(track)
    const items = track.children.length
    const box = track.getBoundingClientRect()
    const horizontal = cs.animationName.endsWith('-x')
    const first = track.children[0].getBoundingClientRect()
    return {
      items,
      duration: parseFloat(cs.animationDuration),
      // The track renders the set twice so the -50% reset lands on an
      // identical frame; one set is therefore exactly half of it.
      set: (horizontal ? box.width : box.height) / 2,
      itemSize: horizontal ? first.width : first.height,
      horizontal,
      running: cs.animationPlayState,
      iteration: cs.animationIterationCount,
    }
  })

  // The set is duplicated, so the count is half the children — and there has to
  // be a real portfolio behind this for the rest of the assertions to mean
  // anything.
  expect(strip.items % 2).toBe(0)
  const count = strip.items / 2
  expect(count).toBeGreaterThan(1)

  expect(strip.running).toBe('running')
  expect(strip.iteration).toBe('infinite')

  // The invariant: the duration is the count times a constant. Write a literal
  // duration instead and this ratio moves as soon as the CMS gains a company.
  const secondsPerLogo = strip.duration / count
  const expected = strip.horizontal ? SECONDS_PER_LOGO * 0.45 : SECONDS_PER_LOGO
  expect(secondsPerLogo).toBeCloseTo(expected, 3)

  // ...and the distance travelled per cycle is the count times one item's
  // pitch, so the rate is pitch / secondsPerLogo with the count cancelled out.
  // Compared against the item's own box rather than a literal, since the pitch
  // is a vw ramp on desktop.
  expect(strip.set / count).toBeGreaterThanOrEqual(strip.itemSize)

  // Sanity band on the resulting rate, so a plausible-looking edit that halves
  // or doubles the tempo still trips something.
  const rate = strip.set / strip.duration
  expect(rate).toBeGreaterThan(strip.horizontal ? 70 : 25)
  expect(rate).toBeLessThan(strip.horizontal ? 180 : 90)
})
