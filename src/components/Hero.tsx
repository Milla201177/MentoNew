'use client'

import { scrollToScreen } from '@/lib/scrollToScreen'

/** Black first screen with a static heading. */

export default function Hero() {
  return (
    <section className="hero">
      <div className="content">
        <h1 id="hero-heading">
          We help the outliers on their journey to build generational companies
        </h1>
      </div>
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
  )
}
