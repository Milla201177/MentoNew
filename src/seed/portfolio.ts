/**
 * Seed / re-sync the portfolio collection.
 *
 * Run with: `bunx tsx src/seed/portfolio.ts`
 *
 * Source of truth is the client's Airtable export (2026-08-25), normalised here:
 *  - `Coframe` appeared twice in the export; the duplicate is dropped.
 *  - `Ceramic` was spelled with a Cyrillic `С` (U+0421). It renders identically
 *    to Latin `C` but slugified to `eramic`, so homoglyphs are folded below.
 *  - Whitespace and stray newlines in descriptions are collapsed.
 *
 * THE CMS OWNS EXISTING ROWS. This script fills a row in when it creates it and
 * then stops writing to it: on a re-run it only supplies what is still MISSING
 * — in practice an icon a row does not have yet. Names, descriptions, websites,
 * founders, order and the About-strip flag are edited in the admin, and a seed
 * run must not quietly revert that work.
 *
 * That is a change from how this script used to behave. It upserted every field
 * on every run, which was right while the copy in the database was known-bad
 * (2026-08-24 shipped invented founder names attributed to real companies), and
 * wrong now that editors maintain it.
 *
 * `SEED_OVERWRITE=1` restores the old behaviour and re-imposes every value in
 * this file. It exists for the case where the database is the thing that is
 * wrong; it will discard admin edits, so it is opt-in and never the default.
 *
 * LOGOS: a company with no real wordmark gets a generated placeholder showing
 * its own name, written to a temp dir at run time (not committed). Deliberately
 * NOT Mento's own logotype: this is a public site and stamping the fund's mark
 * on someone else's card misrepresents them. Replace each via the admin as real
 * artwork arrives.
 */
import 'dotenv/config'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

type SeedItem = {
  slug: string
  name: string
  description: string
  /** Real wordmark under `public/`, or null to generate a placeholder. */
  logoPath: string | null
  /** Square brand mark for the portfolio list. */
  iconPath: string
  /**
   * Whether the company joins the About section's scrolling strip. Defaults to
   * true; set false for the companies that have no real wordmark yet, so the
   * strip never shows a generated placeholder.
   */
  inAboutStrip?: boolean
  /**
   * The company's own site. Carried here, not left to the backfill migration:
   * that migration matched on `name` against rows that already existed, so
   * seeding a fresh database after it runs leaves every website null and every
   * portfolio row unlinked. Four rows are null because the redesign added the
   * companies and no address has been supplied for them yet.
   */
  website: string | null
}

const items: SeedItem[] = [
  { slug: 'artisan', name: 'Artisan', description: 'Autonomous AI BDR for sales', logoPath: '/portfolio/logos/artisan.svg', iconPath: '/portfolio/icons/artisan.png' , website: 'https://www.artisan.co' },
  { slug: 'phia', name: 'Phia', description: 'AI fashion app for sustainable shopping', logoPath: '/portfolio/logos/phia.svg', iconPath: '/portfolio/icons/phia.png' , website: 'https://phia.com' },
  { slug: 'coframe', name: 'Coframe', description: 'Live interfaces for humans & agents', logoPath: '/portfolio/logos/coframe.svg', iconPath: '/portfolio/icons/coframe.png' , website: 'https://www.coframe.com' },
  { slug: 'langbase', name: 'Langbase', description: 'A next-generation platform for launching AI agents without infrastructure', logoPath: '/portfolio/logos/langbase.svg', iconPath: '/portfolio/icons/langbase.svg' , website: 'https://langbase.com' },
  { slug: 'final-round-ai', name: 'Final Round AI', description: 'Real-time AI copilot for interviews', logoPath: '/portfolio/logos/final-round-ai.svg', iconPath: '/portfolio/icons/final-round.png' , website: 'https://www.finalroundai.com' },
  { slug: 'clerk-chat', name: 'Clerk Chat', description: 'Multichannel AI telecom layer', logoPath: '/portfolio/logos/clerk-chat.svg', iconPath: '/portfolio/icons/clerk-ai.png' , website: 'https://clerk.chat' },
  { slug: 'rork', name: 'Rork', description: 'AI app builder with App Store publishing', logoPath: '/portfolio/logos/rork.svg', iconPath: '/portfolio/icons/rork.png' , website: 'https://rork.com' },
  { slug: 'sync-so', name: 'Sync.so', description: 'Studio AI lipsync & visual dubbing via API', logoPath: '/portfolio/logos/sync-so.svg', iconPath: '/portfolio/icons/sync.png' , website: 'https://sync.so' },
  { slug: 'eragon-ai', name: 'Eragon AI', description: 'Applied AI lab for ops intelligence', logoPath: '/portfolio/logos/eragon-ai.svg', iconPath: '/portfolio/icons/eragon.png' , website: 'https://www.eragon.ai' },
  { slug: 'alma', name: 'Alma', description: 'AI-native OS for global immigration', logoPath: '/portfolio/logos/alma.svg', iconPath: '/portfolio/icons/alma.png' , website: 'https://www.tryalma.com' },
  { slug: 'mirai', name: 'Mirai', description: 'On-device AI stack for local inference', logoPath: '/portfolio/logos/mirai.svg', iconPath: '/portfolio/icons/mirai.png' , website: 'https://trymirai.com' },
  { slug: 'hyperspell', name: 'HyperSpell', description: 'Enterprise memory for AI agents', logoPath: '/portfolio/logos/hyperspell.svg', iconPath: '/portfolio/icons/hyperspell.svg' , website: 'https://www.hyperspell.com' },
  { slug: 'tella-tv', name: 'Tella.tv', description: 'All-in-one recorder with AI editing tools', logoPath: '/portfolio/logos/tella-tv.svg', iconPath: '/portfolio/icons/tella.svg' , website: 'https://www.tella.com' },
  { slug: 'kodezi', name: 'Kodezi', description: 'AI developer assistant that instantly debugs and optimizes your code', logoPath: '/portfolio/logos/kodezi.svg', iconPath: '/portfolio/icons/kodezi.svg' , website: 'https://kodezi.com' },
  { slug: 'brix', name: 'Brix', description: 'AI workforce agent for global hiring', logoPath: '/portfolio/logos/brix.svg', iconPath: '/portfolio/icons/brix.png' , website: 'https://joinbrix.com' },
  { slug: 'avataros', name: 'AvatarOS', description: 'Real-time 3D AI avatars', logoPath: '/portfolio/logos/avataros.svg', iconPath: '/portfolio/icons/avataros.png' , website: 'https://avataros.com' },
  { slug: 'platus', name: 'Platus', description: 'API for drafting, signing & notarizing', logoPath: '/portfolio/logos/platus.svg', iconPath: '/portfolio/icons/platus.png' , website: 'https://platus.com' },
  { slug: 'openlayer', name: 'Openlayer', description: 'AI governance for enterprises', logoPath: '/portfolio/logos/openlayer.svg', iconPath: '/portfolio/icons/openlayer.png' , website: 'https://www.openlayer.com' },
  { slug: 'tely-ai', name: 'Tely AI', description: 'Self-improving inbound pipeline for B2B', logoPath: '/portfolio/logos/tely-ai.svg', iconPath: '/portfolio/icons/tely-ai.png' , website: 'https://tely.ai' },
  { slug: 'herostuff', name: 'HeroStuff', description: 'AI bulk listing for marketplaces', logoPath: '/portfolio/logos/herostuff.svg', iconPath: '/portfolio/icons/herostuff.png' , website: 'https://www.herostuff.com' },
  { slug: 'leo-ai', name: 'Leo AI', description: 'AI for mechanical engineering teams', logoPath: '/portfolio/logos/leo-ai.svg', iconPath: '/portfolio/icons/leo-ai.png' , website: 'https://www.getleo.ai' },
  { slug: 'synthetic-society', name: 'Synthetic Society', description: 'Synthetic users for QA', logoPath: '/portfolio/logos/synthetic-society.svg', iconPath: '/portfolio/icons/synthetic-society.png' , website: 'https://syntheticsociety.ai' },
  { slug: 'telescope', name: 'Telescope', description: 'AI agent for outbound prospecting', logoPath: '/portfolio/logos/telescope.svg', iconPath: '/portfolio/icons/telescope.svg' , website: 'https://trytelescope.io' },
  { slug: 'videogen', name: 'VideoGen', description: 'Prompt-to-video with real editor', logoPath: '/portfolio/logos/videogen.svg', iconPath: '/portfolio/icons/videogen.svg' , website: 'https://videogen.io' },
  { slug: 'versey', name: 'Versey', description: 'Canvas for marketers to create Gen AI content', logoPath: '/portfolio/logos/versey.svg', iconPath: '/portfolio/icons/versey.svg' , website: 'https://www.versey.ai' },
  { slug: 'neera', name: 'Neera', description: 'Multisensory devices for sleep', logoPath: '/portfolio/logos/neera.svg', iconPath: '/portfolio/icons/neera.png' , website: 'https://neeralab.com' },
  { slug: 'structify', name: 'Structify', description: 'AI foundation for manufacturers', logoPath: '/portfolio/logos/structify.svg', iconPath: '/portfolio/icons/structify.png' , website: 'https://www.structify.ai' },
  { slug: 'uptool', name: 'Uptool', description: 'AI quoting software for machine shops', logoPath: '/portfolio/logos/uptool.svg', iconPath: '/portfolio/icons/uptool.png' , website: 'https://uptool.com' },
  { slug: 'ceramic', name: 'Ceramic', description: 'Web-scale search API for LLMs', logoPath: '/portfolio/logos/ceramic.svg', iconPath: '/portfolio/icons/ceramic.png' , website: 'https://ceramic.ai' },
  { slug: 'brand', name: 'Brand', description: 'Machine-readable brand layer', logoPath: '/portfolio/logos/brand.svg', iconPath: '/portfolio/icons/brand.png' , website: 'https://brand.ai' },
  { slug: 'command-code', name: 'Command Code', description: 'Style-aware coding agent', logoPath: '/portfolio/logos/command-code.svg', iconPath: '/portfolio/icons/command-code.png' , website: 'https://commandcode.ai' },
  { slug: 'pin', name: 'Pin', description: 'End-to-end AI recruiting agent', logoPath: '/portfolio/logos/pin.svg', iconPath: '/portfolio/icons/pin.png' , website: 'https://www.pin.com' },
  { slug: 'edian', name: 'Edian', description: 'Safety-first AI for clinical development', logoPath: '/portfolio/logos/edian.svg', iconPath: '/portfolio/icons/edian.svg' , website: 'https://www.edian.ai' },
]

/** Brand ink, matching the real wordmarks in `public/portfolio/`. */
const INK = '#04212B'

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)
}

/**
 * A placeholder wordmark: the company's own name, set in the brand colour.
 * Width tracks the name length so the card's `object-fit: contain` doesn't
 * stretch short names across the tile.
 */
function placeholderSvg(name: string) {
  const width = Math.max(90, Math.round(name.length * 13 + 24))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="41" viewBox="0 0 ${width} 41" fill="none" role="img" aria-label="${escapeXml(name)}">
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${INK}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="500" letter-spacing="-0.5">${escapeXml(name)}</text>
</svg>
`
}

const run = async () => {
  const payload = await getPayload({ config })
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mento-portfolio-'))

  const existing = await payload.find({
    collection: 'portfolio',
    limit: 1000,
    depth: 0,
    pagination: false,
  })
  const bySlug = new Map(existing.docs.map((d) => [d.slug, d]))

  // Opt-in escape hatch — see the header. Off unless explicitly asked for.
  const overwrite = process.env.SEED_OVERWRITE === '1'
  if (overwrite) console.log('SEED_OVERWRITE=1 — existing rows will be rewritten, discarding admin edits\n')

  let created = 0
  let updated = 0
  let skipped = 0

  for (const [order, item] of items.entries()) {
    const current = bySlug.get(item.slug)

    // Reuse the marks an existing row already points at; only rows being
    // created need an upload. Re-uploading on every run would orphan blobs.
    let logoId = current?.logo as number | undefined

    if (!logoId) {
      let filePath: string
      if (item.logoPath) {
        filePath = path.resolve(process.cwd(), 'public', item.logoPath.replace(/^\//, ''))
      } else {
        filePath = path.join(tmpDir, `${item.slug}.svg`)
        fs.writeFileSync(filePath, placeholderSvg(item.name), 'utf8')
      }
      const media = await payload.create({
        collection: 'media',
        data: { alt: `${item.name} logo` },
        filePath,
      })
      logoId = media.id as number
    }

    // The square icon is optional and has no placeholder: three companies are
    // not in the redesign and have no mark drawn for them, and the list falls
    // back to the wordmark rather than showing something invented.
    let iconId = current?.icon as number | undefined

    if (!iconId) {
      const media = await payload.create({
        collection: 'media',
        data: { alt: `${item.name} icon` },
        filePath: path.resolve(process.cwd(), 'public', item.iconPath.replace(/^\//, '')),
      })
      iconId = media.id as number
    }

    const full = {
      name: item.name,
      slug: item.slug,
      description: item.description,
      logo: logoId,
      ...(iconId ? { icon: iconId } : {}),
      ...(item.website ? { website: item.website } : {}),
      showInAboutStrip: item.inAboutStrip ?? true,
      // Empty on purpose — see the header note about invented founder names.
      founders: [],
      order,
    }

    if (!current) {
      await payload.create({ collection: 'portfolio', data: full })
      created++
      console.log(`create   ${item.slug.padEnd(20)} order ${order}  logo #${logoId}${item.logoPath ? '' : ' (placeholder)'}`)
      continue
    }

    if (overwrite) {
      await payload.update({ collection: 'portfolio', id: current.id, data: full })
      updated++
      console.log(`OVERWRITE ${item.slug.padEnd(19)} every field re-imposed from this file`)
      continue
    }

    // Only what the row is still missing. Anything already set was either
    // seeded once or edited in the admin, and neither is ours to revert.
    const patch: Record<string, unknown> = {}
    if (!current.icon && iconId) patch.icon = iconId

    if (Object.keys(patch).length > 0) {
      await payload.update({ collection: 'portfolio', id: current.id, data: patch })
      updated++
      console.log(`fill     ${item.slug.padEnd(20)} ${Object.keys(patch).join(', ')}`)
    } else {
      skipped++
    }
  }

  fs.rmSync(tmpDir, { recursive: true, force: true })
  console.log(
    `\ndone: ${created} created, ${updated} ${overwrite ? 'overwritten' : 'filled in'},` +
      ` ${skipped} left to the CMS, ${items.length} total`,
  )
  process.exit(0)
}

run()
