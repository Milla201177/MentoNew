/**
 * One-time seed: move the hand-written article into the Payload `articles`
 * collection, converting its bespoke block structure into Lexical rich text.
 *
 * Run once with: `bunx tsx src/seed/articles.ts`
 *
 * Unlike the other seeds this one DOES import the original `content.ts`: it is
 * a migration of that exact data, and inlining a 400-line copy would only risk
 * the two drifting. Once this has run, `content.ts` and the hard-coded route
 * can be deleted. Idempotent: skipped if the slug already exists.
 *
 * Mapping:
 *   Section       → h2 heading node (its anchor is re-derived from the text)
 *   { type:'p' }  → paragraph node; a bold first run becomes a bold text node
 *   { type:'figure' } → `figure` block node (image uploaded to media)
 *   { type:'item' }   → `item` block node
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import path from 'path'
import config from '../payload.config'
import {
  TITLE,
  SUBTITLE,
  AUTHOR,
  ARTICLE_COVER,
  LEAD,
  SECTIONS,
  type Run,
} from './legacy-article-content'

const SLUG = 'who-controls-the-agent'
const PUBLISHED_ISO = '2026-03-19'

type LexNode = Record<string, unknown>

const textNode = (text: string, bold = false): LexNode => ({
  type: 'text',
  text,
  format: bold ? 1 : 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const paragraph = (runs: Run[]): LexNode => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  textFormat: 0,
  children: runs.map((r) => textNode(r.text, Boolean(r.bold))),
})

const heading = (text: string): LexNode => ({
  type: 'heading',
  tag: 'h2',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [textNode(text)],
})

const blockNode = (fields: Record<string, unknown>): LexNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields,
})

const run = async () => {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'articles',
    where: { slug: { equals: SLUG } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs.length > 0) {
    console.log(`skip  ${SLUG} (already seeded)`)
    process.exit(0)
  }

  const uploadImage = async (src: string, alt: string) => {
    const media = await payload.create({
      collection: 'media',
      data: { alt },
      filePath: path.resolve(process.cwd(), 'public', src.replace(/^\//, '')),
    })
    console.log(`  media #${media.id}  ${src}`)
    return media.id
  }

  const hero = await uploadImage(ARTICLE_COVER, `${TITLE} — hero`)

  const children: LexNode[] = []

  // Lead paragraphs come before the first heading — that is how the renderer
  // tells them apart from section content.
  for (const par of LEAD) children.push(paragraph(par))

  for (const section of SECTIONS) {
    children.push(heading(section.heading))
    for (const block of section.blocks) {
      if (block.type === 'p') {
        children.push(paragraph(block.runs))
      } else if (block.type === 'figure') {
        const image = await uploadImage(block.src, block.alt)
        children.push(blockNode({ blockType: 'figure', image, caption: block.caption }))
      } else if (block.type === 'item') {
        children.push(
          blockNode({
            blockType: 'item',
            label: block.label,
            paragraphs: block.paras.map((par) => ({
              text: par.map((r) => r.text).join(''),
            })),
          }),
        )
      }
    }
  }

  const content = {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children,
    },
  }

  await payload.create({
    collection: 'articles',
    data: {
      title: TITLE,
      slug: SLUG,
      subtitle: SUBTITLE,
      // Matches the tag the design shows on every card; the field is required,
      // so a re-seed has to state it rather than inherit the collection default.
      category: 'founders',
      author: AUTHOR,
      publishedDate: PUBLISHED_ISO,
      heroImage: hero,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: content as any,
    },
  })

  console.log(`seed  ${SLUG} (${SECTIONS.length} sections, ${children.length} nodes)`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
