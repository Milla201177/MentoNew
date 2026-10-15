import { readFileSync } from 'fs'
import { APIError, type CollectionConfig } from 'payload'

import { findSvgThreats, isSvgUpload } from '@/lib/svgSafety'
import { capAnonymousReads } from '@/lib/publicQueryLimits'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    // Ceiling on anonymous page size, so `?limit=0` cannot ask for the whole
    // table. See src/lib/publicQueryLimits.ts for why this is a hook.
    beforeOperation: capAnonymousReads,
    // Earliest document hook, so a rejected file never reaches storage or the
    // database. See src/lib/svgSafety.ts for what this catches and — more
    // importantly — what it does not.
    beforeValidate: [
      ({ req }) => {
        const file = req.file
        if (!file || !isSvgUpload(file.mimetype, file.name)) return

        // `data` is empty when Payload is configured to spool uploads to disk.
        // We do not enable that, but read through rather than skip the check:
        // silently passing an unread file is the one failure mode worth ruling
        // out here.
        const source = file.data?.length
          ? file.data.toString('utf8')
          : file.tempFilePath
            ? readFileSync(file.tempFilePath, 'utf8')
            : null

        if (source === null) {
          throw new APIError('Could not read the uploaded SVG to check it.', 400)
        }

        const threats = findSvgThreats(source)
        if (threats.length > 0) {
          throw new APIError(
            `This SVG was not accepted because it contains ${threats.join(', ')}. ` +
              'Wordmarks should be plain vector artwork — re-export it from the ' +
              'design tool without scripting, or upload a PNG instead.',
            400,
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Restrict to the formats the design actually uses. Without an allow-list an
    // editor could upload HTML or an SVG carrying inline script, and uploads are
    // served from the site's own origin. SVG is included because the portfolio
    // wordmarks are SVG — if that ever changes, drop it.
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    // Re-encode every raster upload to WebP. Two reasons. Payload already
    // re-encodes uploads through sharp, and its default landed noticeably
    // lossier than the source — the team portraits came out at roughly 2.5/255
    // mean per-channel difference against the originals, where quality 90 gives
    // about 1.6. And it stops the next 1 MB PNG from being dropped into the
    // library by hand: the Focus backdrop was 1218 KB, 68% of the home page,
    // until it was converted. SVG is untouched — this only applies to raster.
    formatOptions: {
      format: 'webp',
      options: { quality: 90 },
    },
    /**
     * The media list's previews. Without this Payload falls back to the original
     * file, so opening the library downloaded every full-size upload at once —
     * 40 of them — to draw 60px squares.
     */
    adminThumbnail: 'thumbnail',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
      },
      {
        name: 'card',
        width: 768,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
      },
    ],
  },
}
