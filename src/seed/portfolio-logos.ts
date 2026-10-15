/**
 * Replace generated placeholder logos with the real company wordmarks.
 *
 * Run with: `bunx tsx src/seed/portfolio-logos.ts`
 *
 * The wordmarks in `public/portfolio/logos/` come from the DESIGN FILE, not
 * from the companies' websites. The comps hold a hand-conformed version of
 * every logo — monochrome in the brand ink (#04212B), icons kept, sized for
 * the card — and those are the canonical artwork.
 *
 * That matters because an earlier pass scraped the logos from each company's
 * site and conformed them here instead, which got two things wrong: it stripped
 * icons the design keeps (Langbase, Tella, Leo), and it had no source at all
 * for five companies. The design file has all 25.
 *
 * Extraction, for when these need refreshing: `get_design_context` on the card
 * container returns per-asset SVG URLs. Some come back as the logo alone;
 * others export as the whole 297x210 card, gradient included, and need the
 * background element removed and the viewBox cropped to the logo's centred
 * box. `avataros` and `videogen` are live text in Figma with no exportable
 * asset — export those nodes with `svgOutlineText: true`.
 *
 * Idempotent: re-running replaces the logo again with a fresh upload. Safe, but
 * it does leave the previous media rows behind, so don't loop it needlessly.
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

const LOGO_DIR = path.resolve(process.cwd(), 'public/portfolio/logos')

const run = async () => {
  const payload = await getPayload({ config })

  const files = fs
    .readdirSync(LOGO_DIR)
    .filter((f) => f.endsWith('.svg'))
    .sort()

  let updated = 0
  const skipped: string[] = []

  for (const file of files) {
    const slug = file.replace(/\.svg$/, '')

    const { docs } = await payload.find({
      collection: 'portfolio',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    if (docs.length === 0) {
      skipped.push(`${slug} (no portfolio row)`)
      continue
    }

    const media = await payload.create({
      collection: 'media',
      data: { alt: `${docs[0].name} logo` },
      filePath: path.join(LOGO_DIR, file),
    })

    await payload.update({
      collection: 'portfolio',
      id: docs[0].id,
      data: { logo: media.id },
    })
    updated++
    console.log(`logo  ${slug.padEnd(20)} -> media #${media.id}`)
  }

  console.log(`\ndone: ${updated} logos replaced`)
  if (skipped.length) console.log(`skipped: ${skipped.join(', ')}`)
  process.exit(0)
}

run()
