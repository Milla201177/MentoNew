import { describe, expect, it } from 'vitest'

import { MAX_ANONYMOUS_LIMIT, capAnonymousReads } from '@/lib/publicQueryLimits'

/**
 * The hook is pure, so it is tested directly rather than through a live
 * collection — the interesting behaviour is entirely in which requests it
 * declines to touch, and that is easier to state as a table than to stage
 * against a database.
 */

const [hook] = capAnonymousReads

/** An anonymous request arriving over HTTP — the only case that gets clamped. */
const anon = (limit?: number) =>
  hook({
    args: limit === undefined ? {} : { limit },
    operation: 'read',
    overrideAccess: false,
    req: { user: null },
    // The hook reads four fields; the rest of Payload's hook argument is not
    // worth reconstructing here.
  } as never) as { limit?: number }

const limitOf = (result: unknown) => (result as { limit?: number }).limit

describe('capAnonymousReads', () => {
  describe('clamps anonymous HTTP reads', () => {
    it('turns limit=0 into the ceiling rather than leaving it as "no pagination"', () => {
      // The whole point of the hook. 0 is not "no rows" — Payload reads it as
      // "return the entire table", which is what made ?limit=0 a full scan.
      expect(limitOf(anon(0))).toBe(MAX_ANONYMOUS_LIMIT)
    })

    it('clamps a limit above the ceiling', () => {
      expect(limitOf(anon(5000))).toBe(MAX_ANONYMOUS_LIMIT)
    })

    it('leaves a limit below the ceiling alone', () => {
      expect(limitOf(anon(5))).toBe(5)
    })

    it('leaves the ceiling itself alone', () => {
      expect(limitOf(anon(MAX_ANONYMOUS_LIMIT))).toBe(MAX_ANONYMOUS_LIMIT)
    })

    it('does not set a limit when the caller sent none', () => {
      // Payload's own default is 10. Writing the ceiling in here would RAISE
      // the default page size tenfold — the hook would become the problem it
      // exists to solve.
      expect(limitOf(anon())).toBeUndefined()
    })
  })

  describe('leaves everything else untouched', () => {
    it('ignores Local API calls, which the site\'s own pages use', () => {
      // These ask for limit: 200 (articles) and limit: 100 (portfolio). Clamping
      // them would silently truncate the rendered site, and `overrideAccess`
      // is what tells them apart from an HTTP request.
      const args = { limit: 200 }
      const out = hook({
        args,
        operation: 'read',
        overrideAccess: true,
        req: { user: null },
      } as never)
      expect(limitOf(out)).toBe(200)
    })

    it('ignores an authenticated editor in the admin panel', () => {
      const out = hook({
        args: { limit: 0 },
        operation: 'read',
        overrideAccess: false,
        req: { user: { id: 1 } },
      } as never)
      expect(limitOf(out)).toBe(0)
    })

    it('ignores writes', () => {
      const out = hook({
        args: { limit: 0 },
        operation: 'create',
        overrideAccess: false,
        req: { user: null },
      } as never)
      expect(limitOf(out)).toBe(0)
    })
  })

  it('keeps the ceiling below the largest collection, or it bounds nothing', () => {
    // This assertion is inverted from the one it replaces, and the inversion is
    // the whole lesson. The first ceiling was 100, picked to sit above the real
    // content size — and Media held 97 documents, so a request for everything
    // still returned everything and the clamp never engaged.
    //
    // A ceiling only bounds what is larger than itself. Nothing legitimate
    // reads this endpoint anonymously, so there is no content size to stay
    // above: the site's pages use the Local API and the admin is authenticated,
    // and both are exempt.
    expect(MAX_ANONYMOUS_LIMIT).toBeLessThan(97)
  })
})
