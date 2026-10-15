import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * The share card's URL, with a fingerprint of the file's own bytes on it.
 *
 * `/og-image.png` is a static path, and every consumer of an OpenGraph image
 * caches it by URL — LinkedIn, X, Slack and iMessage all keep their unfurl for
 * days to weeks, and none of them re-fetch because the file behind the URL
 * changed. Vercel serves `public/` with a long `max-age` on top of that. So
 * regenerating the card and deploying it is not enough: the old card keeps
 * appearing on every link that was ever shared, and there is no way to flush
 * someone else's cache.
 *
 * Appending a content hash makes the new card a different URL, which is the
 * only thing those caches actually key on. The hash is derived at build time
 * from the file itself rather than written by hand, so it is impossible to
 * regenerate the artwork and forget to bump it — the two cannot drift.
 *
 * Read synchronously at module load: this runs once per build in the Node
 * server bundle, not per request, and `metadata` is a module-level const that
 * needs the value before any render.
 */
function fingerprint(publicPath: string): string {
  const file = path.join(process.cwd(), 'public', publicPath)
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8)
  return `/${publicPath}?v=${hash}`
}

export const OG_IMAGE_URL = fingerprint('og-image.png')
