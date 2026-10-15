import { test, expect } from '@playwright/test'

test('hero and about copy are in server HTML', async ({ request }) => {
  const res = await request.get('/')
  const html = await res.text()
  expect(html).toContain('generational companies')
  expect(html).toContain('Mento.vc is a data-driven, early-stage fund')
})

test('team roster names are in server HTML', async ({ request }) => {
  const res = await request.get('/')
  const html = await res.text()
  // Progressive enhancement: the roster renders server-side. Figma "Option 2"
  // retired the standalone Team section and demoted the team to these plain
  // name + role lines inside Focus, so this is where the names live now.
  for (const name of ['Alex', 'Dima', 'Katie', 'Sofya', 'Anastasia']) {
    expect(html).toContain(name)
  }
})
