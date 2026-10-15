import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { capAnonymousReads } from '@/lib/publicQueryLimits'

function revalidateHome() {
  try {
    revalidatePath('/')
  } catch {
    // No Next render/request store (e.g. seed script or CLI) — nothing to revalidate.
  }
}

export const Portfolio: CollectionConfig = {
  slug: 'portfolio',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'One line, shown on the card and in the portfolio list view.',
      },
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description:
          "The company's own site, e.g. https://example.com. Each card and list row on the home page links here, and /llms.txt publishes it — which is what answer engines like ChatGPT and Perplexity fetch to learn the portfolio, so an out-of-date address here becomes an out-of-date answer there.",
      },
      validate: (value: string | null | undefined) => {
        // Optional, but if given it has to be a URL a crawler can follow —
        // llms.txt renders it as a link, and a bare domain or a typo'd scheme
        // would publish a dead one.
        if (!value) return true
        try {
          const url = new URL(value)
          return url.protocol === 'https:' || url.protocol === 'http:'
            ? true
            : 'Use an http:// or https:// address.'
        } catch {
          return 'Enter a full URL including https://, e.g. https://example.com'
        }
      },
    },
    /* Two marks per company, because the two places they appear want opposite
     * shapes. Splitting them was the alternative to picking one and having it
     * read badly in the other: the wordmark is illegible at the list's 20px,
     * and the square icon says nothing at the strip's 150px. */
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description:
          'WORDMARK — the company name set as a logo, wide, on a transparent background (SVG preferred). Used in the scrolling logo strip in the About section, where it renders up to 150x70. Also the fallback for the portfolio list when no square icon is set.',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'SQUARE ICON — the brand mark only, no wordmark, on a transparent background (SVG preferred). Used in the portfolio list, where it renders at 20x20. Leave empty to fall back to the wordmark, which will be hard to read at that size.',
      },
    },
    {
      name: 'founders',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'Founder names, revealed when a portfolio card is hovered.',
      },
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Position in the grid and in the About logo strip. Lower comes first.',
      },
    },
    {
      name: 'showInAboutStrip',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Show this logo in the scrolling strip in the About section. Untick to keep the company in the portfolio grid but out of the strip. If every company is unticked the strip falls back to showing them all, so it never renders empty.',
      },
    },
  ],
  hooks: {
    // Ceiling on anonymous page size, so `?limit=0` cannot ask for the whole
    // table. See src/lib/publicQueryLimits.ts for why this is a hook.
    beforeOperation: capAnonymousReads,
    // Revalidate the homepage ISR cache when portfolio content changes via the
    // admin UI. `revalidatePath` only works inside Next's request/render store,
    // so guard it: standalone contexts (the seed script, etc.) have no store and
    // would otherwise throw — there is nothing rendered to revalidate there.
    afterChange: [() => revalidateHome()],
    afterDelete: [() => revalidateHome()],
  },
}
