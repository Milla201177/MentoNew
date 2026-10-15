/**
 * A ceiling on how much work one anonymous request may ask the database for.
 *
 * The four content collections are `read: () => true`, which is correct — this
 * is a marketing site and its content is public. But Payload lets the caller
 * choose the page size, and `?limit=0` is not "zero rows", it is Payload's
 * documented way of saying *no pagination at all*:
 *
 *     const usePagination = pagination && limit !== 0
 *     const sanitizedLimit = limit ?? (usePagination ? 10 : 0)
 *     — payload/dist/collections/operations/find.js:71
 *
 * So `GET /api/media?limit=0` returns every row in one response. Measured in
 * production before this hook: 97 documents, 58 413 bytes, anonymous, and
 * repeatable as fast as anyone cares to repeat it. Nothing there is secret; the
 * cost is that one cheap request buys a full-table read, and with no rate
 * limiting in front of it that converts directly into Neon compute.
 *
 * WHY A HOOK AND NOT CONFIG: Payload has no per-collection ceiling for the REST
 * API. `pagination.defaultLimit` exists but lives under `admin` and only sets
 * the admin panel's page size. `beforeOperation` is the documented seam — it
 * runs before `find` destructures its arguments, and whatever it returns
 * becomes those arguments.
 *
 * WHY `overrideAccess` AND NOT `req.user`: the site's own pages read through
 * the Local API, which runs these same hooks. Those calls legitimately ask for
 * `limit: 200` (articles) and `limit: 100` (portfolio), and they carry no user
 * — gating on `req.user` alone would clamp them and silently truncate the
 * site's own content. What actually separates them is `overrideAccess`, which
 * the Local API defaults to `true` and an HTTP request always sets to `false`.
 * An authenticated editor in the admin panel is `overrideAccess: false` *with*
 * a user, so the pair below means exactly "an anonymous request arriving over
 * HTTP" and nothing else.
 */

import type { CollectionConfig } from 'payload'

/**
 * Deliberately below the size of the largest collection, which held 97
 * documents when this was written.
 *
 * The first value here was 100, chosen to sit "comfortably above any real page
 * of content" — and that made the ceiling useless: 97 is less than 100, so a
 * request asking for everything still got everything and the clamp never
 * engaged. A ceiling above the data it is meant to bound is decoration.
 *
 * 25 costs nothing real, because nothing legitimate reads this endpoint. The
 * site's own pages go through the Local API in-process and are exempt (see the
 * `overrideAccess` note above); the admin panel is authenticated and exempt.
 * What is left is callers from outside, of which there are no known legitimate
 * ones — and for them, pulling the media library now takes four requests
 * instead of one.
 */
export const MAX_ANONYMOUS_LIMIT = 25

type BeforeOperation = NonNullable<CollectionConfig['hooks']>['beforeOperation']

/**
 * Clamp the page size on anonymous reads. Everything else — the admin panel,
 * the Local API, authenticated REST — passes through untouched.
 */
export const capAnonymousReads: NonNullable<BeforeOperation> = [
  ({ args, operation, overrideAccess, req }) => {
    if (operation !== 'read' || overrideAccess || req.user) return args

    // `limit` is typed as optional on findByID's args, which share this hook.
    const requested = (args as { limit?: number }).limit

    // Leave `undefined` alone. Payload turns it into 10, which is already
    // bounded — rewriting it to the ceiling here would *raise* the default page
    // size tenfold and make this hook the problem it was written to fix.
    if (requested === undefined) return args

    // 0 is not "no rows", it is Payload's switch for "no pagination", so it is
    // the one value that has to become the ceiling rather than be clamped by
    // Math.min — which would happily return 0.
    const capped = requested === 0 ? MAX_ANONYMOUS_LIMIT : Math.min(requested, MAX_ANONYMOUS_LIMIT)

    return { ...args, limit: capped }
  },
]
