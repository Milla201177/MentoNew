import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * robots.txt — served at /robots.txt.
 *
 * Two jobs:
 *
 *  1. Keep crawlers out of the CMS (`/admin`) and the REST/GraphQL API
 *     (`/api`). Both are reachable by design but neither belongs in an index.
 *     `/api/media/` is carved back out: page images are served from there, and
 *     a crawler that cannot fetch them renders the page without its artwork.
 *
 *  2. Explicitly welcome answer engines. This is the point of the exercise —
 *     the fund wants to be citable when a founder asks an LLM about early
 *     -stage investors, so the retrieval and grounding bots are named rather
 *     than left to inherit `*`.
 *
 * Naming a user-agent is not merely decorative: a crawler that finds a block
 * matching its own token obeys that block ALONE and ignores `*` entirely. So
 * every named group repeats the same disallow list — dropping it would hand
 * those bots the admin panel.
 */

/** Answer engines and AI crawlers we deliberately allow. */
const AI_AGENTS = [
  // OpenAI: training crawler, ChatGPT search index, user-initiated fetches.
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic.
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  // Perplexity.
  'PerplexityBot',
  'Perplexity-User',
  // Google's AI products read this token rather than Googlebot's rules; without
  // it the site is excluded from AI Overviews and Gemini grounding.
  'Google-Extended',
  // Apple Intelligence / Siri grounding.
  'Applebot',
  'Applebot-Extended',
  // Others worth being citable in.
  'Amazonbot',
  'Meta-ExternalAgent',
  'cohere-ai',
  'DuckAssistBot',
]

const DISALLOW = ['/admin', '/api/']
const ALLOW = ['/', '/api/media/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ALLOW, disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
