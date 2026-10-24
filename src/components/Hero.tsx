'use client'

import HeroShader from '@/components/HeroShader'
import { scrollToScreen } from '@/lib/scrollToScreen'

/** Original cloud backdrop behind the current heading and layout. */

export default function Hero() {
  return (
    <section className="hero">
      <HeroShader />
      <div className="bottom-fade" aria-hidden="true" />
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
