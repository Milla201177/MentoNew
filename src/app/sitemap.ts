import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { loadArticles } from '@/lib/articles'
import { loadCompanies } from '@/lib/portfolio'

/**
 * sitemap.xml — served at /sitemap.xml and referenced from robots.txt.
 *
 * Article entries come from the CMS, so publishing through the admin adds a
 * sitemap row on the next render rather than needing a code change.
 * `loadArticles` already falls back to the pre-CMS article when the database
 * is unreachable, which keeps this route from 500-ing a deploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await loadArticles()

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    // `updatedAt` tracks edits; `publishedDate` is the editorial date and can
    // sit in the past for a piece that was revised yesterday.
    lastModified: new Date(article.updatedAt ?? article.publishedDate),
    changeFrequency: 'yearly',
    priority: 0.6,
  }))

  // Newest article edit doubles as the freshness signal for the index page.
  const newestArticleEdit = articleEntries
    .map((entry) => entry.lastModified as Date)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  // Falls back to the build time only when neither collection is reachable,
  // which is the database-less case the loaders already cover with static
  // content — there is no real edit date to report there.
  const companies = await loadCompanies()
  const newestContentEdit =
    [
      ...articleEntries.map((entry) => entry.lastModified as Date),
      ...companies.map((company) => company.updatedAt).filter(Boolean).map((d) => new Date(d!)),
    ].sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date()

  return [
    {
      url: SITE_URL,
      /**
       * The newest edit to anything the homepage renders, not `new Date()`.
       *
       * `new Date()` resolves when the route is rendered, so every deploy
       * announced that the homepage had just changed — including a deploy that
       * only touched an article, or one that changed nothing but a font. A
       * lastmod that is always "now" is a signal crawlers learn to discount,
       * which costs the one page where the date is worth something.
       *
       * The homepage is assembled from the portfolio, the team strip and the
       * article teasers, so the real answer is the latest `updatedAt` across
       * them. `loadCompanies` and `loadArticles` are both request-cached and
       * already read here or on the page itself, so this adds no query.
       */
      lastModified: newestContentEdit,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: newestArticleEdit ?? new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...articleEntries,
  ]
}
