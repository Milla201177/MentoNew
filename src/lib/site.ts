/**
 * Canonical public origin of the site, in one place.
 *
 * Feeds `metadataBase`, canonical links, OpenGraph URLs and the JSON-LD `@id`s,
 * so getting it wrong silently points every share preview and every structured
 * -data node at a domain we don't control. It used to be a hardcoded
 * placeholder duplicated across three route files; keep it here instead.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_SITE_URL` — set this once the real domain is live. Wins over
 *     everything, so a custom domain never depends on Vercel's own naming.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel injects the project's production
 *     hostname at build time (no scheme), which keeps preview/prod builds
 *     self-describing without any configuration.
 *  3. localhost — local dev, where absolute URLs only need to be parseable.
 *
 * No trailing slash: callers concatenate paths directly (`${SITE_URL}/articles`).
 */
const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()

export const SITE_URL = (
  explicit || (vercelProduction ? `https://${vercelProduction}` : 'http://localhost:3000')
).replace(/\/+$/, '')

/**
 * How the site names itself, in one place.
 *
 * This is the `<title>` on the homepage, the suffix on every sub-page's title,
 * and the OpenGraph `site_name` and `title` the share card collapses into one
 * line. Declared here for the same reason as `SITE_URL` above: it was about to
 * be a literal repeated across the same three route files.
 *
 * Spelled with the domain. `Mento VC` is not a second spelling to reach for
 * here — that form lives on as `alternateName` in the JSON-LD
 * (`src/app/(frontend)/page.tsx`), which is what tells a search engine the two
 * are one entity.
 */
export const SITE_NAME = 'Mento.vc'

/**
 * The fund's own profiles elsewhere.
 *
 * Declared here because two unrelated files need the same URLs and must not
 * drift: the footer links to them, and `sameAs` in the homepage's JSON-LD
 * asserts that these profiles and this site are one entity. A search engine
 * resolving the two against each other is the point, so a typo in one copy
 * would be worse than no link at all.
 */
export const SOCIAL_LINKS = {
  linkedin: 'https://www.linkedin.com/company/mento-vc/',
  x: 'https://x.com/mento_vc',
} as const
