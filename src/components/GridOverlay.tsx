'use client'

import { useEffect } from 'react'

/**
 * The layout grid, drawn over the live page.
 *
 * This exists because "does this line up with our grid?" was previously only
 * answerable by opening devtools and reading computed styles one element at a
 * time. Everything here is measured from the page at the moment it draws —
 * nothing is hardcoded — so it cannot drift from the CSS the way a static
 * design-grid image does.
 *
 * It mounts only when the URL carries `?grid`, and `GridOverlayGate` loads this
 * module dynamically, so a visitor without that parameter never downloads it.
 *
 * Once on, `G` toggles it (also `п`, the same physical key on a Russian
 * layout), and the parameter can be dropped from the URL without losing it.
 */

/** Section, the element that carries its measure, and its inner grid (if any). */
const SECTIONS: [string, string, string | null][] = [
  ['.hero', '.hero .content', null],
  ['.section-about', '.about-container', '.about-grid'],
  ['.section-focus', '.focus-container', '.focus-grid'],
  ['.section-portfolio', '.portfolio-container', '.portfolio-grid'],
  ['.section-footer', '.footer-inner', null],
]

const GUTTER_FILL = 'rgba(255, 0, 90, 0.10)'
const GUTTER_EDGE = 'rgba(255, 0, 90, 0.5)'
const COLUMN_FILL = 'rgba(0, 120, 255, 0.13)'
const GAP_FILL = 'rgba(255, 170, 0, 0.18)'

/**
 * `--px` is `min(calc(...), calc(...))`, and `getPropertyValue` hands back that
 * expression rather than a length. A throwaway element with `width: var(--px)`
 * is the only way to read what it actually resolves to.
 */
function resolvePx(): string {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--px)'
  document.documentElement.appendChild(probe)
  const value = probe.getBoundingClientRect().width
  probe.remove()
  return value.toFixed(4)
}

/** The content box — the measure — rather than the border box. */
function contentBox(el: Element) {
  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  const left = r.left + parseFloat(cs.paddingLeft)
  const right = r.right - parseFloat(cs.paddingRight)
  return { left, right, width: right - left }
}

export default function GridOverlay() {
  useEffect(() => {
    let root: HTMLDivElement | null = null
    let layer: HTMLDivElement | null = null
    let badge: HTMLDivElement | null = null

    const band = (left: number, width: number, background: string) => {
      if (!(width > 0) || !layer) return
      const d = document.createElement('div')
      d.style.cssText = `position:absolute;top:0;bottom:0;left:${left}px;width:${width}px;background:${background}`
      layer.appendChild(d)
    }

    const draw = () => {
      if (!layer || !badge) return
      layer.replaceChildren()

      const vw = document.documentElement.clientWidth
      const middle = window.innerHeight / 2

      // Whichever section owns the middle of the screen is the one being read.
      const found = SECTIONS.find(([sel]) => {
        const host = document.querySelector(sel)
        if (!host) return false
        const r = host.getBoundingClientRect()
        return r.top <= middle && r.bottom >= middle
      })
      if (!found) return

      const [sectionSel, measureSel, gridSel] = found
      const measureEl = document.querySelector(measureSel) ?? document.querySelector(sectionSel)
      if (!measureEl) return
      const box = contentBox(measureEl)

      band(0, box.left, GUTTER_FILL)
      band(box.right, vw - box.right, GUTTER_FILL)
      band(box.left, 1, GUTTER_EDGE)
      band(box.right - 1, 1, GUTTER_EDGE)

      let columnLine = ''
      const grid = gridSel ? document.querySelector<HTMLElement>(gridSel) : null
      // `offsetParent` is null for a grid in the view that is currently hidden
      // — Portfolio keeps both its list and its cards in the DOM.
      if (grid && grid.offsetParent !== null) {
        const gs = getComputedStyle(grid)
        const cols = gs.gridTemplateColumns
          .split(' ')
          .map(parseFloat)
          .filter((n) => !Number.isNaN(n))
        const gap = parseFloat(gs.columnGap) || 0
        let x = grid.getBoundingClientRect().left
        cols.forEach((w, i) => {
          band(x, w, COLUMN_FILL)
          x += w
          if (i < cols.length - 1) {
            band(x, gap, GAP_FILL)
            x += gap
          }
        })
        columnLine = `\ncolumns  ${cols.map(Math.round).join(' + ')}   gap ${Math.round(gap)}`
      }

      badge.textContent =
        `G toggles   viewport ${vw}px\n` +
        `gutter ${Math.round(box.left)}   measure ${Math.round(box.width)}\n` +
        `scale ${(box.width / 1040).toFixed(3)} of the 1040 measure   --px ${resolvePx()}px\n` +
        sectionSel +
        columnLine
    }

    const show = () => {
      if (root) return
      root = document.createElement('div')
      root.id = 'grid-overlay'
      // `aria-hidden` and no pointer events: this must be invisible to both the
      // accessibility tree and every click on the page underneath it.
      root.setAttribute('aria-hidden', 'true')
      root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none'

      layer = document.createElement('div')
      layer.style.cssText = 'position:absolute;inset:0'
      root.appendChild(layer)

      badge = document.createElement('div')
      badge.style.cssText =
        'position:absolute;left:12px;bottom:12px;padding:8px 11px;border-radius:6px;' +
        'font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;' +
        'white-space:pre;background:rgba(4,33,43,.93);color:#fff'
      root.appendChild(badge)

      document.body.appendChild(root)
      window.addEventListener('resize', draw)
      // Capture phase: the sections that scroll are not `window`.
      window.addEventListener('scroll', draw, true)
      draw()
    }

    const hide = () => {
      window.removeEventListener('resize', draw)
      window.removeEventListener('scroll', draw, true)
      root?.remove()
      root = null
      layer = null
      badge = null
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // `п` is the same physical key on a Russian layout.
      if (!['g', 'G', 'п', 'П'].includes(e.key)) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (root) hide()
      else show()
    }

    document.addEventListener('keydown', onKey)
    show()

    return () => {
      document.removeEventListener('keydown', onKey)
      hide()
    }
  }, [])

  return null
}
