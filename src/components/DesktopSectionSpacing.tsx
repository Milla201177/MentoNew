'use client'

import { useEffect } from 'react'

const MIN_CUE_GAP = 64

function setPixelProperty(element: HTMLElement, name: string, pixels: number) {
  const value = `${pixels.toFixed(2)}px`
  if (element.style.getPropertyValue(name) !== value) {
    element.style.setProperty(name, value)
  }
}

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
      if (!active) return
      const hero = document.querySelector<HTMLElement>('.hero')
      const heroHeading = document.querySelector<HTMLElement>('#hero-heading')
      if (hero && heroHeading) {
        setPixelProperty(hero, '--hero-copy-height', heroHeading.getBoundingClientRect().height)
      }
      if (!window.matchMedia('(min-width: 1025px)').matches) return
      const aboutCopy = document.querySelector<HTMLElement>('.about-copy-text')
      const aboutCue = document.querySelector<HTMLElement>('.about-explore')
      const portfolio = document.querySelector<HTMLElement>('.section-portfolio')
      const about = document.querySelector<HTMLElement>('.section-about')
      const aboutGrid = document.querySelector<HTMLElement>('.about-grid')
      if (about && aboutCopy && aboutCue && aboutGrid) {
        const style = getComputedStyle(about)
        const grid = aboutGrid.getBoundingClientRect()
        const copyBottom = aboutCopy.getBoundingClientRect().bottom - grid.top
        // The centred grid needs room for the copy, a 64px gap, and the cue.
        const cueInset = parseFloat(getComputedStyle(aboutCue).bottom)
        const minimum =
          2 * (cueInset + aboutCue.offsetHeight + MIN_CUE_GAP + copyBottom) +
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom) -
          grid.height
        setPixelProperty(about, '--about-content-min-height', Math.ceil(minimum))
      }
      if (aboutCopy && aboutCue && portfolio) {
        const gap = Math.max(
          MIN_CUE_GAP,
          aboutCue.getBoundingClientRect().top - aboutCopy.getBoundingClientRect().bottom,
        )
        setPixelProperty(portfolio, '--portfolio-cue-gap', gap)
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
        setPixelProperty(footer, '--desktop-footer-gap', gap)
      }
    }
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(update)
    }
    const observer = new ResizeObserver(schedule)
    document
      .querySelectorAll('.section-about, .about-grid, #hero-heading, .section-portfolio, .focus-container')
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
