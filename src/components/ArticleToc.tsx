'use client'

/**
 * ArticleToc — sticky table of contents for an article page (Figma node 186:314).
 *
 * Renders one in-page anchor link per section. The link matching the section
 * currently in view (`activeId`, from the scroll-spy in `ArticleBody`) gets the
 * `.is-active` class — dark text + filled square bullet — and `aria-current`.
 *
 * MOTION (mirrors the home page tags):
 *  - The "Table of contents" pill reveals with a character scramble on mount.
 *  - Whenever the active section changes, its label scrambles to the active
 *    colour; the previously-active label is restored to plain text (so its
 *    scramble-applied inline colour does not stick when it goes inactive).
 *  - `prefers-reduced-motion`: no scramble, labels stay as server-rendered.
 *
 * The label text is a constant per item ({s.toc}), so mutating its DOM in an
 * effect never conflicts with React reconciliation (React sees the text child
 * unchanged across re-renders and leaves it alone).
 */

import { useEffect, useRef } from 'react'
import { SCRAMBLE_ACCENT, restorePlainText, scrambleText } from '@/lib/anim'
/** Label + anchor for one entry; derived from the article's H2 headings. */
export type TocEntry = { id: string; toc: string }

const ACTIVE_DARK = '#04212b'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type Props = {
  sections: TocEntry[]
  activeId: string
  onSelect: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void
}

export default function ArticleToc({ sections, activeId, onSelect }: Props) {
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const prevActive = useRef<string | null>(null)

  // The pill's clip-path reveal (expand from centre + scramble, like the home
  // home tags) is driven by a ScrollTrigger in ArticleBody — sticky elements
  // don't intersect reliably. It has no hover behaviour: the tags on the home
  // page don't re-scramble on hover, and this one is held to the same rule.

  // Active item: scramble the newly-active label, restore the previous one.
  useEffect(() => {
    const reduce = prefersReducedMotion()

    const prev = prevActive.current
    if (prev && prev !== activeId) {
      const prevEl = labelRefs.current[prev]
      if (prevEl) restorePlainText(prevEl)
    }
    prevActive.current = activeId

    const el = labelRefs.current[activeId]
    if (!el) return
    if (reduce) {
      restorePlainText(el)
      return
    }
    scrambleText(el, 280, SCRAMBLE_ACCENT, ACTIVE_DARK)
  }, [activeId])

  return (
    <nav className="article-toc" aria-label="Table of contents">
      <p className="pill-tag article-toc-pill">
        Table of contents
      </p>
      <ul className="article-toc-list">
        {sections.map((s) => {
          const active = s.id === activeId
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`article-toc-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={(e) => onSelect(e, s.id)}
              >
                <span className="article-toc-bullet" aria-hidden="true" />
                <span
                  className="article-toc-label"
                  ref={(el) => {
                    labelRefs.current[s.id] = el
                  }}
                >
                  {s.toc}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
