/**
 * Loaders for the Payload `articles` collection.
 *
 * FALLBACK: when the collection is empty or the database is unreachable, these
 * fall back to the article that was hard-coded before the CMS move (see
 * `@/lib/legacyArticle`). Without it a deploy to an environment that has no
 * database would turn a live article URL into a 404 — the same reason the
 * Team/Portfolio loaders keep their own fallbacks.
 */

import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Article, Media } from '@/payload-types'
import { LEGACY_ARTICLE } from '@/lib/legacyArticle'

export type ArticleCategory = NonNullable<Article['category']>

export type ArticleSummary = {
  slug: string
  title: string
  subtitle: string
  author: string
  publishedDate: string
  heroUrl: string | null
  category: ArticleCategory
}

/** Mirrors the `category` options in `src/collections/Articles.ts`. */
export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  founders: 'Founders',
  'working-at-mento': 'Working at Mento',
  'best-practices': 'Best Practices',
}

/**
 * "Mar 19, 2026" — the format the design used before the CMS move.
 *
 * The formatter is built once at module scope. `toLocaleDateString` constructs
 * a fresh `Intl.DateTimeFormat` on every call, and this runs per card on every
 * render of the grid.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatArticleDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso))
}

// The fallback is shaped like a doc but is not one (no real id/relations), so
// it is cast at the boundary rather than polluting the type everywhere.
const FALLBACK_ARTICLES = [LEGACY_ARTICLE as unknown as Article]

/**
 * The card-width variant Payload generates, falling back to the original.
 *
 * The grid box is 400x207 CSS px; the placeholder cover is 1058x596 and 38 KB,
 * while its `card` size is 768x433 and 14 KB. `sizes` is empty for uploads that
 * are already smaller than the target width, so the fallback is the normal path
 * for small images, not an error case.
 */
function cardUrl(hero: Article['heroImage']): string | null {
  if (!hero || typeof hero !== 'object') return null
  const media = hero as Media
  return media.sizes?.card?.url ?? media.url ?? null
}

/**
 * The 1200x630 variant for share previews, falling back to the original.
 *
 * That is the size LinkedIn, X and Slack lay their cards out to, so handing them
 * a correctly-proportioned file means the crawler crops nothing. Payload skips
 * sizes it would have to enlarge, so a cover smaller than 1200x630 has no `og`
 * entry — the placeholder is 1058x596 and is exactly that case. Falling back to
 * the original is therefore the normal path, not an error.
 */
export function ogUrl(hero: Article['heroImage']): string | null {
  if (!hero || typeof hero !== 'object') return null
  const media = hero as Media
  return media.sizes?.og?.url ?? media.url ?? null
}

export function toSummary(doc: Article): ArticleSummary {
  // The fallback article predates the field and rows created before the
  // migration have it null, so default rather than render an empty tag.
  const category = (doc.category ?? 'founders') as ArticleCategory
  return {
    slug: doc.slug,
    title: doc.title,
    subtitle: doc.subtitle,
    author: doc.author,
    publishedDate: doc.publishedDate,
    heroUrl: cardUrl(doc.heroImage),
    category,
  }
}

/** Newest first — drives /articles and the static params for /articles/[slug]. */
export const loadArticles = cache(async (): Promise<Article[]> => {
  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'articles',
      // Drafts are enabled on the collection, so this filter is what keeps an
      // unfinished piece off the site, out of the sitemap and out of llms.txt.
      // Without it a draft would render the moment it is saved, which is the
      // behaviour drafts exist to prevent.
      where: { _status: { equals: 'published' } },
      sort: '-publishedDate',
      depth: 1,
      limit: 200,
      pagination: false,
    })
    return docs.length > 0 ? docs : FALLBACK_ARTICLES
  } catch {
    return FALLBACK_ARTICLES
  }
})

export const loadArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const fallback = () => FALLBACK_ARTICLES.find((a) => a.slug === slug) ?? null

  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'articles',
      // Published only — same reason as loadArticles. A draft's URL 404s rather
      // than previewing, which is the safe default: the alternative is an
      // unlisted-but-public page anyone with the slug can read.
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      // depth 2 so uploads nested inside rich-text block nodes resolve to media
      // docs (depth 1 only reaches the top-level heroImage).
      depth: 2,
      limit: 1,
      pagination: false,
    })
    return docs[0] ?? fallback()
  } catch {
    return fallback()
  }
})
