'use client'

import { scrollToScreen } from '@/lib/scrollToScreen'

/** About copy and the draggable, linked portfolio-logo carousel. */

import { useRef, useEffect, type CSSProperties } from 'react'
import type { Company } from '@/lib/portfolio'
import { aboutLogo } from '@/lib/aboutLogo'
import logoWidths from '@/lib/aboutLogoWidths.json'
import { safeHref } from '@/lib/safeHref'

/** Seconds per logo: independent of the number of companies. */
const SECONDS_PER_LOGO = 7

const PARAGRAPHS = [
  `We are a new venture firm purpose-built to support a new generation of AI-native companies. We believe a new kind of company can turn the power of AI models into real products and services, and change whole industries along the way. And going first is a job only for obsessed founders, the ones who couldn't do anything else if they tried.`,
  `Our edge is The Model, a proprietary analytical platform built in-house. We track companies through the traces they leave: web traffic, headcount moves, GitHub commits, model releases, launches, papers, press. Over a billion data points, refreshed continuously, so we see the inflection before the announcement.`,
  `We like to invest early, make a decision in 48 hours, and often before there's a round.`,
  `We are backed by top-tier LPs and iconic unicorn founders.`,
]

export default function AboutContent({ companies }: { companies: Company[] }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const strip = root.current?.querySelector<HTMLElement>('.about-logos')
    const track = strip?.querySelector<HTMLElement>('.about-logo-track')
    if (!strip || !track) return
    const rate = (value: number) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      track.getAnimations().forEach((animation) => animation.updatePlaybackRate(value))
    }
    const horizontal = () => window.matchMedia('(max-width: 1024px)').matches
    const seek = (distance: number) => {
      const animation = track.getAnimations()[0]
      if (!animation) return
      const duration = Number(animation.effect?.getTiming().duration)
      const length = (horizontal() ? track.scrollWidth : track.scrollHeight) / 2
      if (!duration || !length) return
      const current = Number(animation.currentTime) || 0
      animation.currentTime =
        (((current + (distance / length) * duration) % duration) + duration) % duration
    }
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || !track.getAnimations().length) return
      event.preventDefault()
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      seek(
        delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? strip.clientHeight : 1) * 2,
      )
    }
    let start = 0
    let dragged = false
    let dragging = false
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !track.getAnimations().length) return
      start = horizontal() ? event.clientX : event.clientY
      dragged = false
      dragging = true
    }
    const move = (event: PointerEvent) => {
      if (!dragging) return
      const point = horizontal() ? event.clientX : event.clientY
      const delta = start - point
      if (!dragged && Math.abs(delta) < 6) return
      dragged = true
      strip.setPointerCapture(event.pointerId)
      seek(delta * 1.5)
      start = point
    }
    const up = () => {
      dragging = false
    }
    const click = (event: MouseEvent) => {
      if (dragged) {
        event.preventDefault()
        event.stopPropagation()
        dragged = false
      }
    }
    const enter = () => rate(1.25)
    const leave = () => rate(1)
    strip.addEventListener('pointerenter', enter)
    strip.addEventListener('pointerleave', leave)
    strip.addEventListener('wheel', wheel, { passive: false })
    strip.addEventListener('pointerdown', down)
    strip.addEventListener('pointermove', move)
    strip.addEventListener('pointerup', up)
    strip.addEventListener('pointercancel', up)
    strip.addEventListener('click', click, true)
    const stopDrag = (event: DragEvent) => event.preventDefault()
    strip.addEventListener('dragstart', stopDrag)
    return () => {
      strip.removeEventListener('pointerenter', enter)
      strip.removeEventListener('pointerleave', leave)
      strip.removeEventListener('wheel', wheel)
      strip.removeEventListener('pointerdown', down)
      strip.removeEventListener('pointermove', move)
      strip.removeEventListener('pointerup', up)
      strip.removeEventListener('pointercancel', up)
      strip.removeEventListener('click', click, true)
      strip.removeEventListener('dragstart', stopDrag)
      rate(1)
    }
  }, [])

  return (
    <section className="section-about" id="sectionAbout" ref={root}>
      <div className="about-backdrop" aria-hidden="true" />
      <div className="about-container">
        <div className="about-grid">
          <div className="about-intro">
            <div className="about-copy">
              <div className="about-copy-text">
                <h2 className="about-heading" id="aboutHeading">
                  Mento.vc is a data-driven, early-stage fund investing in outstanding startups
                </h2>
                <div className="about-body">
                  {PARAGRAPHS.map((text, idx) => (
                    <p className="about-para" key={idx}>
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="about-cta-row">
              <a
                className="explore-cue about-explore"
                href="#sectionPortfolio"
                onClick={scrollToScreen}
              >
                <span className="explore-cue-label">Explore our portfolio</span>
                <img
                  className="explore-cue-arrow"
                  src="/icons/explore-arrow.svg"
                  alt=""
                  width={32}
                  height={32}
                />
              </a>
            </div>
          </div>

          <div className="about-logos" aria-label="Portfolio companies">
            <div
              className="about-logo-track"
              /* The duplicated track travels one complete set per cycle. */
              style={
                {
                  '--about-logo-duration': `${companies.length * SECONDS_PER_LOGO}s`,
                } as CSSProperties
              }
            >
              {/* Load every logo eagerly so offscreen track items are ready when they enter. */}
              {[...companies, ...companies].map((company, idx) => {
                const href = safeHref(company.website)
                const logo = aboutLogo(company.logo)
                const width = logoWidths[logo.split('/').pop() as keyof typeof logoWidths]
                const logoStyle = { '--about-logo-width': `${width ?? 136}px` } as CSSProperties
                const image = (
                  <picture className="about-logo-picture">
                    <source
                      media="(max-width: 640px)"
                      srcSet={logo.replace('/about-logos/', '/about-logos-mobile/')}
                    />
                    <img src={logo} alt={company.name} fetchPriority="low" decoding="async" />
                  </picture>
                )
                return href ? (
                  <a
                    className="about-logo-item"
                    style={logoStyle}
                    href={href}
                    key={idx}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={company.name}
                    tabIndex={idx >= companies.length ? -1 : 0}
                  >
                    {image}
                  </a>
                ) : (
                  <div className="about-logo-item" style={logoStyle} key={idx}>
                    {image}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
