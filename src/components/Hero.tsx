'use client'

import { scrollToScreen } from '@/lib/scrollToScreen'

/** Black first screen with a static heading. */


export default function Hero() {
  return (
    <>
      <section className="hero">
        <div className="content">
          <h1 id="hero-heading">
            We help the outliers on their journey to build generational companies
          </h1>
        </div>
        {/* Scroll cue (Figma 330:653). Decorative: it is not interactive in the
         * design, and "Explore ↓" carries no meaning without the affordance, so
         * it is hidden from assistive tech rather than announced as stray text. */}
        <a className="explore-cue hero-explore" href="#sectionAbout" onClick={scrollToScreen}>
          <span className="explore-cue-label">Explore</span>
          <img
            className="explore-cue-arrow"
            src="/icons/explore-arrow.svg"
            alt=""
            width={32}
            height={32}
          />
        </a>
      </section>
    </>
  )
}
