/**
 * Lexical → article structure.
 *
 * The article design is not a flat stream of rich text: it is a lead followed
 * by `<section id>` blocks, each with an `<h2>`, because the sticky table of
 * contents and its scroll-spy key off those section ids. Lexical stores a flat
 * list of nodes instead, so this module regroups that list — every `h2` starts
 * a new section, and anything before the first `h2` is the lead.
 *
 * Rendering stays plain React rather than Payload's generic `RichText`
 * component: the existing markup and CSS classes (`.article-p`,
 * `.article-figure`, `.article-item`, `.article-reveal`) are what the GSAP
 * reveal and the stylesheet already target, so the converters below reproduce
 * them exactly.
 */

import { Fragment, type ReactNode } from 'react'
import { safeHref } from '@/lib/safeHref'

// Lexical's serialized shape is loosely typed on the Payload side; these are the
// few node properties this renderer actually reads.
type LexicalNode = {
  type?: string
  tag?: string
  text?: string
  format?: number | string
  children?: LexicalNode[]
  fields?: Record<string, unknown>
  [key: string]: unknown
}

export type ArticleSection = {
  id: string
  heading: string
  nodes: LexicalNode[]
}

export type ArticleStructure = {
  lead: LexicalNode[]
  sections: ArticleSection[]
}

/** Lexical marks formatting as a bitfield; bit 0 is bold. */
const IS_BOLD = 1
const IS_ITALIC = 1 << 1

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function nodeText(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(nodeText).join('')
}

/**
 * Split the flat Lexical child list into a lead plus H2-delimited sections.
 * Duplicate headings get a numeric suffix so section ids stay unique.
 */
export function buildStructure(content: unknown): ArticleStructure {
  const root = (content as { root?: LexicalNode })?.root
  const children = root?.children ?? []

  const lead: LexicalNode[] = []
  const sections: ArticleSection[] = []
  const usedIds = new Set<string>()

  for (const node of children) {
    const isH2 = node.type === 'heading' && node.tag === 'h2'
    if (isH2) {
      const heading = nodeText(node).trim()
      let id = slugifyHeading(heading)
      if (usedIds.has(id)) {
        let n = 2
        while (usedIds.has(`${id}-${n}`)) n++
        id = `${id}-${n}`
      }
      usedIds.add(id)
      sections.push({ id, heading, nodes: [] })
      continue
    }
    if (sections.length === 0) lead.push(node)
    else sections[sections.length - 1].nodes.push(node)
  }

  return { lead, sections }
}

/** Inline runs inside a paragraph: bold / italic text nodes and links. */
function renderInline(nodes: LexicalNode[]): ReactNode {
  return nodes.map((node, i) => {
    if (node.type === 'linebreak') return <br key={i} />

    if (typeof node.text === 'string') {
      const format = typeof node.format === 'number' ? node.format : 0
      let out: ReactNode = node.text
      if (format & IS_BOLD) out = <b>{out}</b>
      if (format & IS_ITALIC) out = <i>{out}</i>
      return <Fragment key={i}>{out}</Fragment>
    }

    if (node.type === 'link' || node.type === 'autolink') {
      const fields = (node.fields ?? {}) as { url?: string; newTab?: boolean }
      const url = safeHref(fields.url)
      // A link whose URL fails the scheme check keeps its text and loses the
      // anchor. Rendering `href="#"` instead would leave a link that looks
      // live and goes nowhere, and would hide from the editor that what they
      // typed was rejected.
      if (!url) return <Fragment key={i}>{renderInline(node.children ?? [])}</Fragment>
      return (
        <a
          key={i}
          href={url}
          {...(fields.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {renderInline(node.children ?? [])}
        </a>
      )
    }

    return <Fragment key={i}>{renderInline(node.children ?? [])}</Fragment>
  })
}

function mediaUrl(value: unknown): string | null {
  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: string | null }).url
    return url ?? null
  }
  return null
}

function mediaAlt(value: unknown): string {
  if (value && typeof value === 'object' && 'alt' in value) {
    return (value as { alt?: string }).alt ?? ''
  }
  return ''
}

/** One block-level Lexical node → the markup the stylesheet already targets. */
export function renderNode(node: LexicalNode, key: number): ReactNode {
  switch (node.type) {
    case 'paragraph': {
      // Lexical emits an empty paragraph for a blank line — skip it rather than
      // render a stray gap that the reveal animation would also pick up.
      if (!nodeText(node).trim()) return null
      return (
        <p key={key} className="article-p article-reveal">
          {renderInline(node.children ?? [])}
        </p>
      )
    }

    case 'heading': {
      // H2 is consumed by buildStructure; anything deeper renders inline.
      const Tag = (node.tag as 'h3' | 'h4') ?? 'h3'
      return (
        <Tag key={key} className="article-h3 article-reveal">
          {renderInline(node.children ?? [])}
        </Tag>
      )
    }

    case 'list': {
      const ordered = node.tag === 'ol'
      const ListTag = ordered ? 'ol' : 'ul'
      return (
        <ListTag key={key} className="article-list article-reveal">
          {(node.children ?? []).map((li, i) => (
            <li key={i} className="article-list-item">
              {renderInline(li.children ?? [])}
            </li>
          ))}
        </ListTag>
      )
    }

    case 'quote':
      return (
        <blockquote key={key} className="article-quote article-reveal">
          {renderInline(node.children ?? [])}
        </blockquote>
      )

    case 'block': {
      const fields = (node.fields ?? {}) as Record<string, unknown>
      const blockType = fields.blockType

      if (blockType === 'figure') {
        const src = mediaUrl(fields.image)
        if (!src) return null
        return (
          <figure key={key} className="article-figure article-reveal">
            <div className="article-figure-frame">
              {/* Decorative diagram — described by its caption.

                  Lazy on purpose: every figure sits well below the fold, and
                  loading them eagerly put five or six requests in flight
                  alongside the hero cover, which is the one image the reader
                  actually sees first. */}
              <img src={src} alt={mediaAlt(fields.image)} loading="lazy" decoding="async" />
            </div>
            <figcaption className="article-caption">{String(fields.caption ?? '')}</figcaption>
          </figure>
        )
      }

      if (blockType === 'item') {
        const paragraphs = (fields.paragraphs ?? []) as { text?: string }[]
        return (
          <div key={key} className="article-item article-reveal">
            <p className="article-item-label">{String(fields.label ?? '')}</p>
            {paragraphs.map((par, i) => (
              <p key={i} className="article-p">
                {par.text}
              </p>
            ))}
          </div>
        )
      }

      return null
    }

    default:
      return null
  }
}

export function renderNodes(nodes: LexicalNode[]): ReactNode {
  return nodes.map((node, i) => renderNode(node, i))
}
