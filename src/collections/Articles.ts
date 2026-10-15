import type { CollectionConfig } from 'payload'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { revalidatePath } from 'next/cache'
import { capAnonymousReads } from '@/lib/publicQueryLimits'

function revalidateArticle(slug?: string) {
  try {
    revalidatePath('/articles')
    if (slug) revalidatePath(`/articles/${slug}`)
  } catch {
    // No Next render/request store (e.g. seed script or CLI) — nothing to revalidate.
  }
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedDate'],
  },
  access: {
    /**
     * Public read, but published only.
     *
     * `read: () => true` is not enough once drafts exist. Verified against
     * production by creating a draft and fetching it anonymously: the page
     * 404'd correctly, because the site's loaders filter on `_status` — but
     * `/api/articles` happily returned it. An editor would have been writing
     * privately in the admin while anyone could read the draft over REST at a
     * guessable URL.
     *
     * Returning a `Where` instead of `true` pushes the constraint into the
     * query itself, so it holds on every path — list, by-id, filtered — rather
     * than only where a loader remembered to ask. Logged-in editors still see
     * everything, and the site's own pages are unaffected: they read through the
     * Local API, which overrides access by default.
     */
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  /**
   * Drafts, so saving is not publishing.
   *
   * Without this the collection has one row per article and every save is live
   * immediately — an editor mid-sentence is a live edit, and there is no way to
   * prepare a piece ahead of time. The public loaders filter on `_status`, so a
   * draft is invisible to the site, the sitemap and llms.txt until it is
   * published.
   *
   * `autosave` is deliberately NOT enabled: it would write a version on a timer
   * while someone types, which is noise in the version list and extra database
   * traffic for a fund publishing a few pieces a year.
   */
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL segment, e.g. "who-controls-the-agent" → /articles/who-controls-the-agent',
      },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      required: true,
      admin: {
        description: 'One-line standfirst under the title. Also used as the meta description.',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'founders',
      options: [
        { label: 'Founders', value: 'founders' },
        { label: 'Working at Mento', value: 'working-at-mento' },
        { label: 'Best Practices', value: 'best-practices' },
      ],
      admin: {
        description:
          'Shown on the card in /articles and drives the filter row above the grid. The filter only lists categories that actually have articles, so adding an option here does nothing until an article uses it.',
      },
    },
    {
      name: 'author',
      type: 'text',
      required: true,
    },
    {
      name: 'publishedDate',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Drives the displayed date, the JSON-LD datePublished, and ordering on /articles.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Shown in the article hero and used as the OpenGraph / Twitter card image.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      admin: {
        description:
          'Write normally. Each "Heading 2" starts a new section and becomes an entry in the table of contents — its anchor is derived from the heading text. Paragraphs before the first H2 are the lead. Use the Figure and Item blocks where the design calls for them.',
      },
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BlocksFeature({
            blocks: [
              {
                slug: 'figure',
                labels: { singular: 'Figure', plural: 'Figures' },
                fields: [
                  {
                    name: 'image',
                    type: 'upload',
                    relationTo: 'media',
                    required: true,
                    admin: {
                      description:
                        "Alt text comes from the media item's own Alt field — set it there.",
                    },
                  },
                  { name: 'caption', type: 'text', required: true },
                ],
              },
              {
                slug: 'item',
                labels: { singular: 'Item', plural: 'Items' },
                fields: [
                  {
                    name: 'label',
                    type: 'text',
                    required: true,
                    admin: { description: 'Small heading above the item paragraphs.' },
                  },
                  {
                    name: 'paragraphs',
                    type: 'array',
                    required: true,
                    minRows: 1,
                    fields: [{ name: 'text', type: 'textarea', required: true }],
                  },
                ],
              },
            ],
          }),
        ],
      }),
    },
  ],
  hooks: {
    // Ceiling on anonymous page size, so `?limit=0` cannot ask for the whole
    // table. See src/lib/publicQueryLimits.ts for why this is a hook.
    beforeOperation: capAnonymousReads,
    // Revalidate the article + index ISR caches when content changes via the
    // admin UI. `revalidatePath` only works inside Next's request/render store,
    // so guard it: standalone contexts (the seed script, etc.) have no store.
    afterChange: [({ doc }) => revalidateArticle(doc?.slug)],
    afterDelete: [({ doc }) => revalidateArticle(doc?.slug)],
  },
}
