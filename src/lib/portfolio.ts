/**
 * Shared loader for the Payload `portfolio` collection.
 *
 * Two sections render the same companies — the Portfolio grid/list and the
 * scrolling logo strip in About — so the query lives here rather than being
 * duplicated. They ask for different marks: the strip wants the wide wordmark
 * (`logo`), the list wants the square icon (`icon`). Wrapped in React's `cache`
 * so both server components share one database round-trip per render.
 *
 * FALLBACK: if the database is unreachable or the collection is empty, this
 * returns the original hard-coded companies. That keeps local dev and
 * `bun run test:gates` working without a DATABASE_URI, and means a database
 * hiccup degrades to slightly stale copy rather than an empty section.
 * Seed with `bunx tsx src/seed/portfolio.ts`.
 */

import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PORTFOLIO_SNAPSHOT } from './portfolioSnapshot'

export type Company = {
  slug: string
  name: string
  desc: string
  /** Wide wordmark. Drives the About section's scrolling strip. */
  logo: string
  /**
   * Square brand mark, 20px in the portfolio list. Optional: rows that predate
   * the field, and the offline fallback for companies whose icon we do not
   * have, fall back to `logo` — legible only because the list is small, not
   * because a wordmark belongs there.
   */
  icon?: string
  founders: string[]
  /** Editor's pick for the About section's scrolling logo strip. */
  showInAboutStrip: boolean
  /** The company's own site. Optional — rendered in llms.txt when present. */
  website?: string
  /**
   * When the row was last edited. Optional because the offline fallback list is
   * static code with no edit history — sitemap.ts reads this to date the
   * homepage and skips the entries that lack it.
   */
  updatedAt?: string
}

/**
 * The subset the About strip shows. Falls back to the full list when nothing is
 * ticked, so an editor who clears every box gets the old behaviour rather than
 * an empty, silently-broken strip.
 */
export function aboutStripCompanies(companies: Company[]): Company[] {
  const picked = companies.filter((c) => c.showInAboutStrip)
  return picked.length > 0 ? picked : companies
}

/**
 * Rendered only when the database is unreachable, so it must never state
 * anything we cannot stand behind: this list previously carried invented
 * founder names attributed to real companies, and descriptions belonging to a
 * different company entirely. Copy now matches the client's own export, and
 * `founders` stays empty because that export has no founder data.
 */
const FALLBACK_COMPANIES = PORTFOLIO_SNAPSHOT

export const loadCompanies = cache(async (): Promise<Company[]> => {
  if (!process.env.DATABASE_URI) return FALLBACK_COMPANIES
  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'portfolio',
      sort: 'order',
      depth: 1, // resolve the `logo` / `icon` uploads into media docs so we can read their URLs
      limit: 100,
      pagination: false,
    })

    const companies = docs.flatMap<Company>((doc) => {
      // depth: 1 resolves the upload, but the field is typed as `number | Media`
      // and a media doc can exist without a URL — skip rather than render a
      // broken logo.
      const logo = typeof doc.logo === 'object' && doc.logo !== null ? doc.logo.url : null
      if (!logo) return []
      // Optional, and a media doc can exist without a URL — an unset icon just
      // means the list falls back to the wordmark.
      const icon = typeof doc.icon === 'object' && doc.icon !== null ? doc.icon.url : null
      return [
        {
          slug: doc.slug,
          name: doc.name,
          desc: doc.description,
          logo,
          icon: icon ?? undefined,
          founders: (doc.founders ?? []).filter((f): f is string => Boolean(f)),
          // Rows created before the field existed have it null; treat that as
          // opted in, matching the field's default.
          showInAboutStrip: doc.showInAboutStrip !== false,
          website: doc.website ?? undefined,
          updatedAt: doc.updatedAt,
        },
      ]
    })

    return companies.length > 0 ? companies : FALLBACK_COMPANIES
  } catch {
    return FALLBACK_COMPANIES
  }
})
