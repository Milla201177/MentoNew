import { test, expect } from '@playwright/test'

test('single h1, metadata and JSON-LD present', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page).toHaveTitle(/.+/)
  const html = await (await request.get('/')).text()
  expect(html).toMatch(/<meta name="description"/)
  expect(html).toMatch(/<meta property="og:title"/)
  expect(html).toMatch(/<link rel="canonical"/)
  expect(html).toMatch(/application\/ld\+json/)
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  expect(m).not.toBeNull()
  expect(() => JSON.parse(m![1])).not.toThrow()
})
