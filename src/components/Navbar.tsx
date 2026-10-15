'use client'

/** Full logo header with contrast inversion over the black Hero. */

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'

export default function Navbar({ darkHero = false }: { darkHero?: boolean }) {
  const root = useRef<HTMLElement>(null)

  // ---- Navbar fade-in (gated behind reduced-motion) ----
  useEffect(() => {
    const el = root.current
    if (!el) return

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      // No fade — show at full opacity immediately.
      el.style.opacity = '1'
      return
    }

    // Mirror the legacy timing (marquee delay + 0.3). The marquee delay is
    // 0.8 + (heading word count 11) * 0.06 ≈ 1.46, so navbar delay ≈ 1.76.
    const tween = gsap.to(el, { opacity: 1, duration: 0.6, delay: 1.76, ease: 'power2.out' })
    return () => {
      tween.kill()
    }
  }, [])

  // Track the Hero boundary for header contrast.
  useEffect(() => {
    const logo = root.current?.querySelector<HTMLElement>('.logo')
    const hero = document.querySelector('.hero, .article-hero')
    if (!logo || !hero) return

    let heroVisible = true

    const apply = () => {
      root.current?.classList.toggle('is-on-dark', darkHero && heroVisible)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.isIntersecting
        apply()
      },
      { rootMargin: '-24px 0px 0px 0px' },
    )
    io.observe(hero)
    // Re-evaluate rather than just clearing: crossing back to desktop while
    // scrolled down should collapse again, not wait for the next crossing.

    return () => {
      io.disconnect()
    }
  }, [darkHero])

  // Fade the whole lockup before its visible area meets page text.
  useEffect(() => {
    const nav = root.current
    const logo = nav?.querySelector<HTMLElement>('.logo')
    if (!nav || !logo) return
    let frame = 0
    const check = () => {
      frame = 0
      const hero = document.querySelector('.hero, .article-hero')
      nav.classList.toggle(
        'is-mobile-compact',
        window.matchMedia('(max-width: 640px)').matches &&
          (!hero || hero.getBoundingClientRect().bottom <= 64),
      )
      const bounds = logo.getBoundingClientRect()
      const hidden = nav.classList.contains('is-over-text')
      const padding = hidden ? 16 : 10
      const overlaps = (rect: DOMRect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        rect.left < bounds.right + padding &&
        rect.right > bounds.left - padding &&
        rect.top < bounds.bottom + padding &&
        rect.bottom > bounds.top - padding
      const candidates = document.querySelectorAll(
        'h1, h2, h3, h4, p, li, .portfolio-list-body, .focus-roster-body, .portfolio-card-label, .explore-cue-label',
      )
      let touching = false
      for (const element of candidates) {
        if (nav.contains(element) || !overlaps(element.getBoundingClientRect())) continue
        if (getComputedStyle(element).visibility === 'hidden') continue
        const range = document.createRange()
        range.selectNodeContents(element)
        if (Array.from(range.getClientRects()).some(overlaps)) {
          touching = true
          break
        }
      }
      if (!touching) {
        touching = Array.from(
          document.querySelectorAll('.about-logos, button, .portfolio-toolbar'),
        ).some(
          (element) =>
            getComputedStyle(element).display !== 'none' &&
            overlaps(element.getBoundingClientRect()),
        )
      }
      nav.classList.toggle('is-over-text', touching)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    document.fonts.ready.then(schedule)
    check()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <nav className={`navbar${darkHero ? ' is-on-dark' : ''}`} aria-label="Primary" ref={root}>
      {/* Split into the mark and the wordmark so the wordmark can drop away on
          scroll (see the collapse effect above). The two files are cut from
          logotype.svg at the natural gap in its viewBox and reassemble to the
          same 142.6x28 lockup, pixel for pixel.

          Both images are decorative and the accessible name moves to the link,
          so it still reads as "Mento" once the wordmark is only a fade away —
          alt text on a hidden image would not.
          Figma 311:745: 140x27.5. Links home, like any header logo. */}
      <Link href="/" className="logo" aria-label="Mento">
        <img
          className="logo-mark"
          src="/logos/logomark.svg"
          alt=""
          aria-hidden="true"
          width={34}
          height={28}
        />
        <img
          className="logo-word"
          src="/logos/wordmark.svg"
          alt=""
          aria-hidden="true"
          width={95}
          height={28}
        />
      </Link>
    </nav>
  )
}
