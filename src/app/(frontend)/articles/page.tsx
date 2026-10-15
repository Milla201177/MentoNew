import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogFilters, { type BlogFilter } from '@/components/BlogFilters'
import {
  loadArticles,
  toSummary,
  formatArticleDate,
  CATEGORY_LABELS,
  type ArticleCategory,
} from '@/lib/articles'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: `The Mento Blog — ${SITE_NAME}`,
  description: "The latest on how we're revolutionizing private markets.",
  alternates: { canonical: '/articles' },
}

export default async function ArticlesIndexPage() {
  const articles = (await loadArticles()).map(toSummary)

  const counts = new Map<ArticleCategory, number>()
  for (const a of articles) counts.set(a.category, (counts.get(a.category) ?? 0) + 1)

  // Order follows the collection's option order, not first-seen order, so the
  // row does not reshuffle when an article is added. Only categories that have
  // articles get a pill — an empty filter would be a dead end.
  const filters: BlogFilter[] = [
    { value: 'all', label: 'All articles', count: articles.length },
    ...(Object.keys(CATEGORY_LABELS) as ArticleCategory[])
      .filter((c) => counts.has(c))
      .map((c) => ({ value: c, label: CATEGORY_LABELS[c], count: counts.get(c) ?? 0 })),
  ]

  return (
    <>
      <Navbar />
      <main id="main">
        <section className="section-blog">
          <div className="blog-container">
            <header className="blog-intro">
              <h1 className="blog-title">The Mento Blog</h1>
              <p className="blog-subtitle">
                The latest on how we&rsquo;re revolutionizing private markets
              </p>
            </header>

            {articles.length === 0 ? (
              <p className="articles-empty">No articles published yet.</p>
            ) : (
              /* Cards are passed as children, not as a prop: they stay server
                 markup instead of being serialised into the page a second time
                 for hydration. */
              <BlogFilters filters={filters}>
                <ul className="blog-grid">
                  {articles.map((article, i) => (
                    <li className="blog-card" key={article.slug} data-category={article.category}>
                      <Link className="blog-card-link" href={`/articles/${article.slug}`}>
                        <span className="blog-card-media">
                          {article.heroUrl && (
                            /* Decorative: the title below is the link's accessible name. */
                            <img
                              src={article.heroUrl}
                              alt=""
                              /* The first row is above the fold — deferring it
                                 delays the largest paint on this page. */
                              loading={i < 3 ? 'eager' : 'lazy'}
                              fetchPriority={i < 3 ? 'high' : undefined}
                              decoding="async"
                            />
                          )}
                        </span>
                        <span className="blog-card-body">
                          <span className="pill-tag blog-card-tag">
                            {CATEGORY_LABELS[article.category]}
                          </span>
                          <span className="blog-card-title">{article.title}</span>
                          <span className="blog-card-excerpt">{article.subtitle}</span>
                        </span>
                        <span className="blog-card-meta">
                          <span>{article.author}</span>
                          <span>{formatArticleDate(article.publishedDate)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </BlogFilters>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
