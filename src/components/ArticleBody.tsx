'use client'

/**
 * ArticleBody — the two-column long-form body of an article page (Figma node
 * 186:309): a sticky table of contents on the left and the article content on
 * the right (lead paragraphs followed by titled sections with paragraphs,
 * figures and labelled items).
 *
 * ANIMATION (follows the existing section patterns):
 *  - Each block (`.article-reveal`) fades + slides up on scroll via
 *    `gsap.fromTo(...{y,opacity}...)` with a one-shot ScrollTrigger. We use
 *    `fromTo` with explicit end values — NOT `gsap.from` — because the
 *    `ScrollTrigger.refresh()` on `document.fonts.ready` would otherwise re-read
 *    an in-flight `.from`'s applied opacity:0 as its destination (0→0 = stuck).
 *  - A per-section ScrollTrigger drives the TOC scroll-spy (active section id).
 *  - `prefers-reduced-motion`: blocks render at their final state, no triggers
 *    for reveal; the spy still runs (it conveys position, not decoration).
 */

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { SCRAMBLE_ACCENT, scrambleText } from '@/lib/anim'
import ArticleToc from './ArticleToc'
import { buildStructure, renderNodes } from '@/lib/articleContent'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// Colour the pill / pager scrambles resolve to — the brand ink.
const TEXT_DARK = '#04212B'

type Props = {
  /** Lexical rich text from the `articles` collection. */
  content: unknown
  /** title of the next article, shown on the "Next article" pager button */
  nextTitle?: string
}

export default function ArticleBody({ content, nextTitle }: Props) {
  const root = useRef<HTMLDivElement>(null)
  // Regroup the flat Lexical node list into lead + H2-delimited sections, which
  // is what the sticky TOC and its scroll-spy key off.
  const { lead, sections } = useMemo(() => buildStructure(content), [content])
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')

  useGSAP(
    () => {
      const el = root.current
      if (!el) return

      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const blocks = gsap.utils.toArray<HTMLElement>('.article-reveal', el)

      if (reduceMotion) {
        gsap.set(blocks, { opacity: 1, y: 0 })
      } else {
        blocks.forEach((bl) => {
          gsap.fromTo(
            bl,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: { trigger: bl, start: 'top 88%', once: true },
            },
          )
        })
      }

      // ---- TOC pill: clip-path reveal from the centre + scramble, fired as
      // the body scrolls into view (mirrors the home page tags). Driven
      // here rather than in ArticleToc because the pill is sticky and does not
      // intersect reliably. ----
      const pill = el.querySelector<HTMLElement>('.article-toc-pill')
      if (pill) {
        if (reduceMotion) {
          pill.style.clipPath = 'inset(0% 0% 0% 0%)'
        } else {
          pill.style.clipPath = 'inset(0% 50% 0% 50%)'
          ScrollTrigger.create({
            trigger: el,
            start: 'top 60%',
            once: true,
            onEnter: () => {
              gsap.fromTo(
                pill,
                { clipPath: 'inset(0% 50% 0% 50%)' },
                { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: 'power3.out' },
              )
              setTimeout(() => scrambleText(pill, 350, SCRAMBLE_ACCENT, TEXT_DARK), 50)
            },
          })
        }
      }

      // ---- TOC scroll-spy: mark the section crossing the 40% viewport line ----
      const secs = gsap.utils.toArray<HTMLElement>('.article-section', el)
      secs.forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 40%',
          end: 'bottom 40%',
          onToggle: (self) => {
            if (self.isActive) setActiveId(sec.id)
          },
        })
      })

      // Font swap shifts trigger positions — recompute once fonts are ready.
      ScrollTrigger.refresh()
      document.fonts?.ready.then(() => ScrollTrigger.refresh())
    },
    { scope: root },
  )

  const onSelect = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    setActiveId(id)
  }

  // Hover scramble for the prev/next pager pills (matches the page's tag pills).
  const onPagerEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const label = e.currentTarget.querySelector<HTMLElement>('.article-pager-label')
    if (label) scrambleText(label, 300, SCRAMBLE_ACCENT, TEXT_DARK)
  }

  return (
    <div className="article-body" ref={root}>
      <div className="article-layout">
        <ArticleToc
          sections={sections.map((s) => ({ id: s.id, toc: s.heading }))}
          activeId={activeId}
          onSelect={onSelect}
        />

        <div className="article-content">
          <div className="article-lead">{renderNodes(lead)}</div>

          {sections.map((s) => (
            <section key={s.id} id={s.id} className="article-section">
              <h2 className="article-h2 article-reveal">{s.heading}</h2>
              {renderNodes(s.nodes)}
            </section>
          ))}
        </div>

        {/* Prev / next article navigation (Figma node 186:462). Single-article
         * site for now — both point to the article index (home). */}
        <nav className="article-pager" aria-label="More articles">
          <Link className="pill-tag article-pager-link" href="/articles" onMouseEnter={onPagerEnter}>
            <span className="article-pager-arrow" aria-hidden="true">
              {'<'}
            </span>
            <span className="article-pager-label">Previous article</span>
          </Link>
          <Link className="pill-tag article-pager-link" href="/articles" onMouseEnter={onPagerEnter}>
            <span className="article-pager-label">
              {nextTitle ? `Next article: ${nextTitle}` : 'Next article'}
            </span>
            <span className="article-pager-arrow" aria-hidden="true">
              {'>'}
            </span>
          </Link>
        </nav>
      </div>
    </div>
  )
}
