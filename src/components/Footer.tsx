'use client'

/** Legal disclaimer, copyright and social links with a reduced-motion-aware entrance. */

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { SOCIAL_LINKS } from '@/lib/site'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/* Figma 460:2201 runs the socials in this row, after a Privacy Policy and a
   Cookie Policy link. Those two are not here: both pointed at `#` because
   neither page exists, and a link that goes nowhere is worse than no link —
   it offers a policy the reader cannot read. Restore them when the pages are
   written, not before.

   Nothing on the public site needs them today: it loads no analytics and sets
   no cookies (the only cookie in the project is Payload's admin session, which
   a visitor never receives). That stops being true the moment a tracker is
   added, and a Privacy Policy comes back with it.

   The socials come from `@/lib/site` rather than being typed here, because the
   homepage's JSON-LD `sameAs` has to name the same two URLs — a mismatch there
   asserts an identity link that does not hold. */
const LEGAL_LINKS = [
  { label: 'LinkedIn', href: SOCIAL_LINKS.linkedin },
  { label: 'X/Twitter', href: SOCIAL_LINKS.x },
]

export default function Footer() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return

      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduceMotion) return

      const legalEl = el.querySelector<HTMLElement>('.footer-legal')
      if (!legalEl) return

      ScrollTrigger.create({
        trigger: el,
        start: 'top 95%',
        once: true,
        onEnter: () => {
          gsap.fromTo(
            legalEl,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
          )
        },
      })

      ScrollTrigger.refresh()
    },
    { scope: root },
  )

  return (
    <footer className="section-footer" id="sectionFooter" ref={root}>
      <div className="team-bg" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-legal">
          <p className="footer-legal-disclaimer">
            This website does not constitute an offer to sell or a solicitation to buy any
            securities. Interests in the Fund
            <br className="footer-disclaimer-break" /> are offered only to eligible investors in
            transactions exempt from registration under applicable securities laws.
          </p>
          <div className="footer-legal-right">
            <span className="footer-legal-copy">
              <span>© 2026 MentoVC.</span> <span>All rights reserved</span>
            </span>
            <div className="footer-legal-links">
              {LEGAL_LINKS.map((item) => {
                /* A new tab for anything that leaves the site, and with it the
                   `noopener` that stops the opened page reaching back through
                   `window.opener`.
                   Every link in this row is external today, so the test always
                   passes — it stays because the next one added here may not be,
                   and the failure mode of hardcoding the attributes instead is
                   an internal link that opens in a new tab, or an external one
                   that ships without `noopener`. */
                const external = item.href.startsWith('https://')
                return (
                  <a
                    className="footer-legal-link"
                    href={item.href}
                    key={item.label}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {item.label}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
