'use client'

import { useEffect } from 'react'

/** Keep desktop gaps between painted lettering, rather than padded link boxes. */
export default function DesktopSectionSpacing() {
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    let active = true
    const ink = (element: HTMLElement) => {
      const style = getComputedStyle(element)
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const metrics = context.measureText(element.textContent || '')
      const box = element.getBoundingClientRect()
      const line = Math.min(parseFloat(style.lineHeight), box.height)
      const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.8
      const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.2
      const baseline = (line - ascent - descent) / 2 + ascent
      return {
        top: box.top + baseline - metrics.actualBoundingBoxAscent,
        bottom: box.bottom - line + baseline + metrics.actualBoundingBoxDescent,
      }
    }
    const update = () => {
      frame = 0
      if (!active || !window.matchMedia('(min-width: 1025px)').matches) return
      const aboutCopy = document.querySelector<HTMLElement>('.about-copy-text')
      const aboutCue = document.querySelector<HTMLElement>('.about-explore')
      const portfolio = document.querySelector<HTMLElement>('.section-portfolio')
      if (aboutCopy && aboutCue && portfolio) {
        const gap = Math.max(
          0,
          aboutCue.getBoundingClientRect().top - aboutCopy.getBoundingClientRect().bottom,
        )
        const value = `${gap.toFixed(2)}px`
        if (portfolio.style.getPropertyValue('--portfolio-cue-gap') !== value) {
          portfolio.style.setProperty('--portfolio-cue-gap', value)
        }
      }
      for (const [cueSelector, sectionSelector, headingSelector] of [
        ['.about-explore', '.section-portfolio', '.portfolio-display'],
        ['.portfolio-explore', '.section-focus', '.focus-heading'],
      ]) {
        const cue = document.querySelector<HTMLElement>(cueSelector)
        const section = document.querySelector<HTMLElement>(sectionSelector)
        const heading = document.querySelector<HTMLElement>(headingSelector)
        const label = cue?.querySelector<HTMLElement>('.explore-cue-label')
        const previous = cue?.closest('section')
        if (!cue || !section || !heading || !label || !previous) continue
        const arrow = cue.querySelector('img')?.getBoundingClientRect()
        // The SVG arrow's visible path ends at y=21.09 inside its 32px field.
        const cueBottom = Math.max(
          ink(label).bottom,
          arrow ? arrow.top + (arrow.height * 21.09) / 32 : 0,
        )
        const headingInset =
          ink(heading).top -
          section.getBoundingClientRect().top -
          parseFloat(getComputedStyle(section).paddingTop)
        const padding = 258 - (previous.getBoundingClientRect().bottom - cueBottom) - headingInset
        const value = `${Math.max(0, padding).toFixed(2)}px`
        if (section.style.getPropertyValue('--desktop-heading-inset') !== value) {
          section.style.setProperty('--desktop-heading-inset', value)
          section.dispatchEvent(new Event('section-spacing-change'))
        }
      }
      const focus = document.querySelector<HTMLElement>('.section-focus')
      const footer = document.querySelector<HTMLElement>('.section-footer')
      if (focus && footer) {
        const text = Array.from(focus.querySelectorAll<HTMLElement>('p, .focus-roster-body'))
        const bottom = Math.max(...text.map((element) => ink(element).bottom))
        const gap = 258 - (focus.getBoundingClientRect().bottom - bottom)
        footer.style.setProperty('--desktop-footer-gap', `${gap.toFixed(2)}px`)
      }
    }
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(update)
    }
    const observer = new ResizeObserver(schedule)
    document
      .querySelectorAll('.section-about, .section-portfolio, .focus-container')
      .forEach((e) => observer.observe(e))
    window.addEventListener('resize', schedule)
    document.fonts.ready.then(schedule)
    schedule()
    return () => {
      active = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return null
}
