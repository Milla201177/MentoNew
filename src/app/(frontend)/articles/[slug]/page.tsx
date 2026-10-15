import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ArticleHero from '@/components/ArticleHero'
import ArticleBody from '@/components/ArticleBody'
import Footer from '@/components/Footer'
import { formatArticleDate, loadArticleBySlug, loadArticles, ogUrl } from '@/lib/articles'
import { SITE_NAME, SITE_URL } from '@/lib/site'

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const articles = await loadArticles()
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const article = await loadArticleBySlug(slug)
  if (!article) return {}

  const path = `/articles/${article.slug}`
  // Share previews get the 1200x630 variant when the cover is large enough for
  // one; see ogUrl. The page itself still renders the full image.
  const hero = ogUrl(article.heroImage) ?? ''

  return {
    title: `${article.title} — ${SITE_NAME}`,
    description: article.subtitle,
    alternates: { canonical: path },
    openGraph: {
      title: article.title,
      description: article.subtitle,
      type: 'article',
      url: path,
      publishedTime: article.publishedDate,
      images: hero ? [{ url: hero }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.subtitle,
      images: hero ? [hero] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params
  const article = await loadArticleBySlug(slug)
  if (!article) notFound()

  const path = `/articles/${article.slug}`
  const hero = typeof article.heroImage === 'object' ? (article.heroImage?.url ?? '') : ''
  const publishedIso = article.publishedDate.slice(0, 10)

  // The next article in reverse-chronological order, for the pager pill.
  const all = await loadArticles()
  const index = all.findIndex((a) => a.slug === article.slug)
  const nextTitle = index >= 0 && all[index + 1] ? all[index + 1].title : undefined

  /**
   * JSON-LD (schema.org) so crawlers / LLMs get machine-readable context. The
   * `@graph` carries the Article plus a BreadcrumbList — the latter lets search
   * engines index and render the "All Articles › …" breadcrumb trail. The
   * visible "< All Articles" pill in the hero is the breadcrumb's first crumb.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.title,
        description: article.subtitle,
        image: hero ? [`${SITE_URL}${hero}`] : undefined,
        datePublished: publishedIso,
        dateModified: article.updatedAt?.slice(0, 10) ?? publishedIso,
        author: { '@type': 'Person', name: article.author },
        publisher: {
          '@type': 'Organization',
          name: 'Mento',
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/logotype.svg` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${path}` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'All Articles', item: `${SITE_URL}/articles` },
          { '@type': 'ListItem', position: 2, name: article.title, item: `${SITE_URL}${path}` },
        ],
      },
    ],
  }

  return (
    <>
      {/* `JSON.stringify` escapes quotes but not `<`, so a title or subtitle
          containing `</script>` would close this tag early and let the rest be
          parsed as HTML. These fields come from the CMS, so escape it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Navbar />
      <main id="main">
        <ArticleHero
          title={article.title}
          subtitle={article.subtitle}
          author={article.author}
          date={formatArticleDate(article.publishedDate)}
          screenshot={hero}
          path={path}
        />
        <ArticleBody content={article.content} nextTitle={nextTitle} />
      </main>
      <Footer />
    </>
  )
}
