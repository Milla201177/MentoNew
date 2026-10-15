import { SITE_URL } from '@/lib/site'
import { loadArticles } from '@/lib/articles'
import { loadCompanies } from '@/lib/portfolio'
import { LLMS_HEAD, LLMS_MIDDLE, llmsTail } from '@/lib/llmsContent'

/**
 * llms.txt — served at /llms.txt, the file answer engines fetch to learn what a
 * site is about.
 *
 * This used to be a static file in `public/`, and it drifted twice: it claimed
 * 25 portfolio companies when the CMS held 29, and every URL in it was typed by
 * hand against a domain the site is about to move off. Both are the same bug —
 * a second copy of data that already lives somewhere authoritative.
 *
 * The company count in the Fund Details block was the last hand-typed copy and
 * drifted the same way, from 29 to 33; it is passed to `llmsTail` now.
 *
 * So it is a route now, matching `robots.ts` and `sitemap.ts`. The portfolio,
 * the article list and every link are generated; the prose stays in
 * `llmsContent.ts`. Publishing an article or editing a company in the admin
 * shows up here on the next render, and switching to the real domain is one
 * environment variable rather than an edit to this file.
 *
 * `public/llms.txt` had to go when this landed: a static file of the same name
 * is served by the static handler and the route would never be reached.
 */

/** Matches robots.txt and sitemap.xml — a day is plenty for a fact sheet. */
export const revalidate = 86400

/**
 * Link label for a company site: the domain without scheme, `www.` or a
 * trailing slash, which is what a reader wants to see and what the hand-written
 * file used.
 */
function linkLabel(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')
}

export async function GET(): Promise<Response> {
  const [companies, articles] = await Promise.all([loadCompanies(), loadArticles()])

  const keyPages = [
    `- [Mento VC](${SITE_URL}/): the fund's thesis, focus areas, portfolio and team on one page`,
    `- [The Mento Blog](${SITE_URL}/articles): essays on how the fund thinks about founders, agents and private markets`,
    ...articles.map(
      (article) =>
        `- [${article.title}](${SITE_URL}/articles/${article.slug}): ${article.subtitle}`,
    ),
  ].join('\n')

  const portfolio = companies
    .map((company) => {
      const lines = [`### ${company.name}`, `- Description: ${company.desc}`]
      // Optional field. A company without one simply has no Website line,
      // rather than a broken link or an empty label.
      if (company.website) {
        lines.push(`- Website: [${linkLabel(company.website)}](${company.website})`)
      }
      return lines.join('\n')
    })
    .join('\n\n')

  const body = [
    LLMS_HEAD,
    '## Key Pages',
    keyPages,
    LLMS_MIDDLE,
    '## Portfolio',
    portfolio,
    llmsTail({ portfolioCount: companies.length, siteUrl: SITE_URL }),
  ].join('\n\n')

  return new Response(`${body}\n`, {
    headers: {
      // Markdown by convention, but served as text/plain so a browser shows it
      // instead of offering a download.
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
