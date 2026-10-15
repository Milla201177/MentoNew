import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Bundle budget for the PUBLIC LANDING's first-load JavaScript.
 *
 * The chunk list is derived from the prerendered home page HTML
 * (`.next/server/app/index.html`) — i.e. exactly the `<script>`s the browser
 * downloads for `/` — rather than a chunk glob. This matters because:
 *   - it tracks the real first-load set across hashed Turbopack filenames that
 *     change every build, and
 *   - it EXCLUDES the Payload admin bundle (lexical editor, payload UI, ~1.5 MB),
 *     which the public site never loads and which would make a naive
 *     `.next/static/chunks/**` budget meaningless.
 *
 * Requires a prior `next build` (reads from `.next/`). Run via `bun run test:size`.
 */
const html = fs.readFileSync(path.join(dir, '.next/server/app/index.html'), 'utf8')
const files = [
  ...new Set([...html.matchAll(/\/_next\/(static\/[^"]+?\.js)/g)].map((m) => m[1])),
].map((f) => path.join('.next', f))

export default [
  {
    // Measured ~233 KB gzipped (gsap + React + Next framework baseline). The
    // limit leaves headroom for incremental growth; if it trips, check what new
    // dependency landed in the landing's first-load graph.
    name: 'landing first-load JS (gzip)',
    path: files,
    gzip: true,
    limit: '270 KB',
  },
]
