'use client'

import { useEffect } from 'react'

type Anchor = {
  element: HTMLElement
  top: number
  section: HTMLElement
  sectionTop: number
  company: string | null
}

/** Preserve the reader's place when responsive reflow changes preceding sections. */
export default function ResizeAnchor() {
  useEffect(() => {
    const viewport = document.createElement('div')
    viewport.style.cssText =
      'position:fixed;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none'
    viewport.setAttribute('aria-hidden', 'true')
    document.body.appendChild(viewport)
    let width = window.innerWidth
    let height = viewport.getBoundingClientRect().height
    let anchor: Anchor | null = null
    let pageTop = window.scrollY < 1
    let restoringUntil = 0
    let frame = 0
    let disposed = false

    const capture = () => {
      pageTop = window.scrollY < 1
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>('main > section, .section-footer'),
      )
      const visibleSections = sections.filter((item) => {
        const box = item.getBoundingClientRect()
        return box.bottom > 64 && box.top < window.innerHeight
      })
      let selected: {
        element: HTMLElement
        section: HTMLElement
        top: number
        distance: number
      } | null = null
      for (const section of visibleSections) {
        for (const element of section.querySelectorAll<HTMLElement>(
          'h1, h2, h3, p, .portfolio-list-row, .portfolio-card, .focus-roster-row, .footer-legal',
        )) {
          const box = element.getBoundingClientRect()
          if (box.width <= 0 || box.bottom <= 64 || box.top >= window.innerHeight) continue
          const distance = Math.abs(box.top - 80)
          if (!selected || distance < selected.distance)
            selected = { element, section, top: box.top, distance }
        }
      }
      const section = selected?.section || visibleSections[0]
      if (!section) return
      const element = selected?.element || section
      anchor = {
        element,
        top: selected?.top ?? section.getBoundingClientRect().top,
        section,
        sectionTop: section.getBoundingClientRect().top,
        company: element.dataset.company || null,
      }
    }
    const tick = () => {
      frame = 0
      if (disposed) return
      if (restoringUntil > performance.now()) {
        if (pageTop) {
          if (window.scrollY) window.scrollTo({ top: 0, behavior: 'instant' })
        } else if (anchor?.section.isConnected) {
          const visible = (element: HTMLElement) => {
            const box = element.getBoundingClientRect()
            return element.isConnected && box.width > 0 && box.height > 0
          }
          let element = anchor.element
          const company = anchor.company
          if (!visible(element) && company) {
            // Grid and List render separate elements for the same company.
            const peer = Array.from(
              anchor.section.querySelectorAll<HTMLElement>('[data-company]'),
            ).find((item) => item.dataset.company === company && visible(item))
            if (peer) {
              anchor.element = peer
              element = peer
            }
          }
          // A hidden view can survive for a frame while React switches modes.
          // Never use its zero rectangle as a scroll target.
          if (visible(element)) {
            const delta = element.getBoundingClientRect().top - anchor.top
            if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, behavior: 'instant' })
          } else if (!anchor.company && !element.isConnected) {
            const delta = anchor.section.getBoundingClientRect().top - anchor.sectionTop
            if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, behavior: 'instant' })
          }
        }
        frame = requestAnimationFrame(tick)
      } else {
        restoringUntil = 0
        capture()
      }
    }
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      const nextHeight = viewport.getBoundingClientRect().height
      if (width === window.innerWidth && Math.abs(nextHeight - height) < 1) return
      width = window.innerWidth
      height = nextHeight
      restoringUntil = performance.now() + 350
      schedule()
    }
    const release = () => {
      restoringUntil = 0
      schedule()
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    capture()
    document.fonts.ready.then(schedule)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', schedule, { passive: true })
    const interactions = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    interactions.forEach((event) => window.addEventListener(event, release, { passive: true }))
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      viewport.remove()
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', schedule)
      interactions.forEach((event) => window.removeEventListener(event, release))
    }
  }, [])
  return null
}
