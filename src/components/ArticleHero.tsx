'use client'

/**
 * ArticleHero — the top block of an article page (Figma node 186:287).
 *
 * Cream cloud-photo background (reuses `/images/hero-bg.webp`, the brand cloud
 * shared with the landing Hero) behind a centred stack: a "< All Articles" pill,
 * the article title (<h1>), subtitle and date — followed by a decorative product
 * screenshot card.
 *
 * PROGRESSIVE ENHANCEMENT: the title and pill render as plain, fully-visible
 * text server-side. After hydration the title gets the shared word-by-word
 * blink reveal (`revealText`) and the pill gets the shared character scramble
 * (`scrambleRandom`) — same patterns as Hero/About/Focus.
 *
 * REDUCED MOTION: every animation is skipped and the final resting state shows
 * immediately (text stays exactly as server-rendered).
 */

import { useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { SCRAMBLE_ACCENT, buildWordCharSpans, revealHeading, scrambleRandom, scrambleText } from '@/lib/anim'

gsap.registerPlugin(useGSAP)

const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*'

// Title and pill scramble both resolve to the brand ink (#04212B).
const TITLE_DARK = '#04212b'
const PILL_DARK = '#04212b'

type Props = {
  title: string
  subtitle: string
  author: string
  date: string
  screenshot: string
  /** canonical path of this article — href for the current breadcrumb crumb */
  path: string
}

export default function ArticleHero({ title, subtitle, author, date, screenshot, path }: Props) {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return

      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // ---- Pill: split into char spans (scrambled placeholders) ----
      const tagEl = el.querySelector<HTMLElement>('#article-tag')
      const tagCharEls: HTMLSpanElement[] = []
      if (tagEl) {
        // Word-grouped so the pill never breaks a word in half — see
        // buildWordCharSpans. Starts on random glyphs unless reduced motion.
        tagCharEls.push(
          ...buildWordCharSpans(tagEl, 'tag-char', (ch) =>
            reduceMotion ? ch : scrambleChars[Math.floor(Math.random() * scrambleChars.length)],
          ),
        )
      }

      const heading = el.querySelector<HTMLElement>('#article-title')
      const crumbEl = el.querySelector<HTMLElement>('.article-breadcrumb-current')
      const pillEl = el.querySelector<HTMLElement>('.article-breadcrumb-pill')
      const subtitleEl = el.querySelector<HTMLElement>('.article-subtitle')
      const bylineEl = el.querySelector<HTMLElement>('.article-byline')

      if (reduceMotion) {
        // Final resting state, no animation.
        if (pillEl) pillEl.style.clipPath = 'inset(0% 0% 0% 0%)'
        if (tagEl) tagEl.style.opacity = '1'
        tagCharEls.forEach((span) => {
          span.style.opacity = '1'
          if (span.dataset.original !== ' ') {
            span.textContent = span.dataset.original ?? ''
            span.style.color = PILL_DARK
          }
        })
        if (crumbEl) crumbEl.style.opacity = '1'
        if (subtitleEl) subtitleEl.style.opacity = '1'
        if (bylineEl) bylineEl.style.opacity = '1'
        return
      }

      // Reveal order: (1) title, (2) subtitle + author/date byline, (3) breadcrumb.

      // 1) Title — word-by-word blink reveal, identical to the home Hero.
      if (heading) revealHeading(heading, TITLE_DARK)

      // 2) Subtitle, then the byline — fade up after the title.
      if (subtitleEl)
        gsap.fromTo(
          subtitleEl,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.5, delay: 1.0, ease: 'power2.out' },
        )
      if (bylineEl)
        gsap.fromTo(
          bylineEl,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.5, delay: 1.2, ease: 'power2.out' },
        )

      // 3) Breadcrumb pill LAST — clip-path reveal from the centre + scramble
      // both crumbs, identical to the home page tags.
      if (pillEl) {
        gsap.fromTo(
          pillEl,
          { clipPath: 'inset(0% 50% 0% 50%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: 'power3.out', delay: 1.45 },
        )
        gsap.delayedCall(1.5, () => {
          scrambleRandom(tagCharEls, 350, SCRAMBLE_ACCENT, PILL_DARK)
          if (crumbEl) scrambleText(crumbEl, 350, SCRAMBLE_ACCENT, PILL_DARK)
        })
      }

    },
    { scope: root },
  )

  return (
    <section className="article-hero" ref={root}>
      {/* Brand cloud photo — decorative. */}
      <div className="article-hero-bg" aria-hidden="true" />

      <div className="article-hero-inner">
        {/* Breadcrumb trail in a SINGLE pill (BreadcrumbList JSON-LD lives on
         * the page): the "All Articles" link (animated scramble, like the home
         * tags) + separator + the current article as the non-link final crumb. */}
        <nav className="article-breadcrumb" aria-label="Breadcrumb">
          <span className="pill-tag article-breadcrumb-pill">
            <Link className="article-hero-tag" id="article-tag" href="/articles">
              All Articles
            </Link>
            <span className="article-breadcrumb-sep" aria-hidden="true">
              {'<'}
            </span>
            <a className="article-breadcrumb-current" href={path} aria-current="page">
              {title}
            </a>
          </span>
        </nav>
        <h1 className="article-title" id="article-title">
          {title}
        </h1>
        <p className="article-subtitle">{subtitle}</p>
        <div className="article-byline">
          <span className="article-author">{author}</span>
          <span className="article-byline-sep" aria-hidden="true">
            ·
          </span>
          <span className="article-date">{date}</span>
        </div>
      </div>

      {/* The article's cover — the same `heroImage` the listing card shows, so
          one piece reads the same in both places. Decorative here: the title
          above already names the article. */}
      <div className="article-hero-card" aria-hidden="true">
        {/* The first image the reader meets, so it is fetched ahead of the
            figures further down rather than sharing the queue with them. */}
        <img src={screenshot} alt="" fetchPriority="high" decoding="async" />
      </div>
    </section>
  )
}
