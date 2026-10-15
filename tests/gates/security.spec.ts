import { test, expect } from '@playwright/test'

/**
 * The Media collection deliberately accepts `image/svg+xml` (the portfolio
 * wordmarks are SVG), and uploads are served from this site's own origin at
 * `/api/media/file/*` — Vercel Blob is storage, not delivery. SVG is an
 * executable document format, so what stops an uploaded one from running script
 * against our origin is the `script-src 'none'` header Payload puts on media
 * responses.
 *
 * That header is a framework default, not something this repo declares. A
 * Payload upgrade or a custom media route could drop it and nothing else here
 * would fail. Pin it.
 *
 * Scope note: the header covers uploads only. SVGs served straight from
 * `public/` (`/logos/logotype.svg`, the fallback portfolio marks) carry no CSP.
 * That is acceptable because those are repo files that go through review, not
 * anything a CMS user can put there — but do not read this test as proof that
 * every SVG on the origin is guarded.
 */
test("SVG uploads are served with script-src 'none'", async ({ request }) => {
  // Ask for an SVG specifically. Payload sends this header only for SVG, which
  // is right — it is the one uploadable format that can execute. An earlier
  // version of this test took whichever document came back first and happened
  // to get an SVG; the day WebP portraits were uploaded, the newest document
  // became a WebP and the gate went red against a site that was fine.
  const query = 'limit=1&depth=0&where%5BmimeType%5D%5Bequals%5D=image%2Fsvg%2Bxml'
  const list = await request.get(`/api/media?${query}`)
  const docs = list.ok() ? (await list.json()).docs : null

  // Unlike the other gates, this one has no fallback to lean on: the frontend
  // renders hard-coded copy when the database is down, but there is no stand-in
  // media file to request. Skip loudly rather than fail — a gate that goes red
  // in every database-less checkout is a gate people delete.
  test.skip(
    !docs?.length,
    `no SVG media reachable (GET /api/media -> ${list.status()}); this gate needs a database`,
  )

  const res = await request.get(docs[0].url)
  expect(res.ok()).toBe(true)

  const headers = res.headers()
  // Parsed into directives rather than compared as one string. Payload 3.90
  // tightened this header from `script-src 'none'` to
  // `script-src 'none'; frame-src 'none'; object-src 'none'`, part of its fix
  // for SVG and XML uploads running same-origin script. An exact-string check
  // failed on the STRONGER policy, which is backwards. What matters is that
  // each guard is present — so all three are pinned now, and an upgrade that
  // drops any one of them still turns this red.
  const directives = new Map(
    (headers['content-security-policy'] ?? '')
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...values]) => [name, values.join(' ')]),
  )
  expect(directives.get('script-src')).toBe("'none'")
  expect(directives.get('frame-src')).toBe("'none'")
  expect(directives.get('object-src')).toBe("'none'")
  // Paired guard: without nosniff a browser may second-guess the Content-Type
  // we send and treat an upload as something executable.
  expect(headers['x-content-type-options']).toBe('nosniff')
})

/**
 * The rule above is only worth anything if SVG is still reachable as an upload
 * type. If someone drops it from the collection's mimeTypes, the test above
 * starts skipping and its silence would read as success.
 */
test('SVG is still an accepted upload type, so the gate above has something to check', async ({
  request,
}) => {
  const query = 'limit=0&depth=0&where%5BmimeType%5D%5Bequals%5D=image%2Fsvg%2Bxml'
  const list = await request.get(`/api/media?${query}`)
  test.skip(!list.ok(), `media not reachable (GET /api/media -> ${list.status()})`)
  expect((await list.json()).totalDocs).toBeGreaterThan(0)
})

/**
 * GraphQL is switched off in payload.config.ts and its generated routes are
 * deleted. Nothing reads through it — pages use the Local API in-process — so
 * it was an open endpoint with no owner, and GraphQL lets a caller pick the
 * query's depth, which turns one small request into arbitrary database work.
 *
 * Payload regenerates its `app/(payload)` scaffolding on upgrade, so the routes
 * can come back without anyone deciding they should. This notices.
 *
 * Deliberately asserts on POST, not GET: the endpoint only ever accepted POST,
 * so a GET 404 would prove nothing and would still pass with GraphQL fully
 * live.
 */
test('the GraphQL endpoint is not reachable', async ({ request }) => {
  const res = await request.post('/api/graphql', {
    data: { query: '{ Portfolios(limit:1) { docs { name } } }' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(404)
})

test('the GraphQL playground is not reachable', async ({ request }) => {
  const res = await request.get('/api/graphql-playground', { failOnStatusCode: false })
  expect(res.status()).toBe(404)
})
