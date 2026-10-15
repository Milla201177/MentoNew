import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('home page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    // Full WCAG 2.2 AA, including color-contrast (re-enabled in Task 18). Note:
    // hero/about text that sits over the WebGL <canvas> is reported by axe as
    // "incomplete" (it cannot read canvas pixels), not as a violation, so it is
    // not enforced here — that contrast is a manual-review item.
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  // On failure, surface the offending node + colours instead of a bare array diff.
  const summary = results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => ({ target: n.target, msg: n.failureSummary })),
  }))
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([])
})
