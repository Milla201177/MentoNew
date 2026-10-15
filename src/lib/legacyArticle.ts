/**
 * Fallback article, built from the copy that lived in the hand-written route
 * before the CMS move.
 *
 * The `articles` collection is the source of truth, but production has no
 * database yet, and unlike Team/Portfolio an empty result here would turn a
 * live URL into a 404. So the original article is converted to the same Lexical
 * shape the renderer expects and served when the collection has nothing.
 *
 * Images stay as static `/public` paths: `renderNode` only needs an object with
 * `url` (and optionally `alt`), which is what a resolved media doc looks like,
 * so no upload is involved.
 *
 * Delete this once the collection is seeded in every environment.
 */

import {
  TITLE,
  SUBTITLE,
  AUTHOR,
  ARTICLE_COVER,
  LEAD,
  SECTIONS,
  type Run,
} from '@/seed/legacy-article-content'

export const LEGACY_SLUG = 'who-controls-the-agent'
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

function buildContent() {
  const children: LexNode[] = []

  // Paragraphs before the first heading are the lead — that is how
  // `buildStructure` tells them apart from section content.
  for (const par of LEAD) children.push(paragraph(par))

  for (const section of SECTIONS) {
    children.push(heading(section.heading))
    for (const block of section.blocks) {
      if (block.type === 'p') {
        children.push(paragraph(block.runs))
      } else if (block.type === 'figure') {
        children.push(
          blockNode({
            blockType: 'figure',
            image: { url: block.src, alt: block.alt },
            caption: block.caption,
          }),
        )
      } else if (block.type === 'item') {
        children.push(
          blockNode({
            blockType: 'item',
            label: block.label,
            paragraphs: block.paras.map((par) => ({ text: par.map((r) => r.text).join('') })),
          }),
        )
      }
    }
  }

  return {
    root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children },
  }
}

/** Shaped like an `articles` doc so callers can treat it as one. */
export const LEGACY_ARTICLE = {
  id: 0,
  title: TITLE,
  slug: LEGACY_SLUG,
  subtitle: SUBTITLE,
  author: AUTHOR,
  publishedDate: PUBLISHED_ISO,
  heroImage: { url: ARTICLE_COVER, alt: `${TITLE} — hero` },
  content: buildContent(),
  updatedAt: PUBLISHED_ISO,
  createdAt: PUBLISHED_ISO,
}
