'use client'

/**
 * The "Explore by Category" row, and the only interactive part of the blog
 * index (Figma 371:989).
 *
 * The cards are NOT rendered here — they arrive as `children`, already rendered
 * on the server, and this component only wraps them. That matters: props of a
 * client component have to be serialised into the page so React can hydrate, so
 * passing the article list as a prop shipped every title, standfirst and date
 * twice — once as HTML, once as JSON. Passing them as children ships the markup
 * only. Measured before the change: 11 KB of an 23 KB document was that second
 * copy, and it grew with the collection rather than with what fits on screen.
 *
 * Filtering is done by CSS off `data-filter` (see globals.css) rather than by
 * re-rendering a list. Nothing unmounts, so the cards' images are not thrown
 * away and re-requested every time a pill is clicked.
 */

import { useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { scrambleLabel } from '@/lib/anim'

/** Everything the browser needs: a label, a count, and a value to match on. */
export type BlogFilter = { value: string; label: string; count: number }

export default function BlogFilters({
  filters,
  children,
}: {
  filters: BlogFilter[]
  children: ReactNode
}) {
  const [active, setActive] = useState('all')

  /**
   * Same 350ms scramble the site's buttons run, via the same helper
   * `ScrambleButton` uses — these pills are controls, so they answer like one.
   *
   * Aimed at the label span rather than the button: `scrambleLabel` rewrites the
   * element's whole textContent, and the count sits in a sibling. Wrapping both
   * would garble the number along with the word.
   */
  const onPillEnter = (e: MouseEvent<HTMLButtonElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const label = e.currentTarget.firstElementChild
    if (label instanceof HTMLElement) scrambleLabel(label, 350)
  }

  return (
    <>
      <section className="blog-filters" aria-labelledby="blog-filters-heading">
        <h2 className="blog-filters-heading" id="blog-filters-heading">
          Explore by Category
        </h2>

        {/* A group of buttons, not links: filtering happens in place and does
            not change the URL, so tabs/links would both overpromise. */}
        <div className="blog-filter-row" role="group" aria-label="Filter articles by category">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`pill-tag blog-filter${active === f.value ? ' is-active' : ''}`}
              aria-pressed={active === f.value}
              onClick={() => setActive(f.value)}
              onMouseEnter={onPillEnter}
            >
              {/* First child by design — `onPillEnter` reaches for it. `data-label`
                  is what the scramble restores to, so an interrupted run cannot
                  leave a pill reading garbage. */}
              <span data-label={f.label}>{f.label}</span>
              <span className="blog-filter-count">{f.count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="blog-grid-section" aria-label="Articles" data-filter={active}>
        {children}
      </section>
    </>
  )
}
