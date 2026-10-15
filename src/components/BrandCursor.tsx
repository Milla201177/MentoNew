'use client'

import { useEffect, useRef } from 'react'

/** Position follows the pointer directly; only the Hero outline is animated. */
export default function BrandCursor() {
  const cursor = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const element = cursor.current
    if (!element) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    let point: { x: number; y: number } | null = null
    const hide = () => {
      element.style.visibility = 'hidden'
      document.body.classList.remove('has-brand-cursor')
      point = null
    }
    const updateOutline = () => {
      if (!point) return
      const hero = document.querySelector('.hero')?.getBoundingClientRect()
      element.dataset.hero = String(
        Boolean(
          hero &&
          point.y >= hero.top &&
          point.y < hero.bottom &&
          point.x >= hero.left &&
          point.x < hero.right,
        ),
      )
    }
    const move = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType !== 'mouse') return hide()
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return hide()
      point = { x: event.clientX, y: event.clientY }
      element.style.transform = `translate3d(${point.x - 5}px, ${point.y - 5}px, 0)`
      updateOutline()
      element.style.visibility = 'visible'
      document.body.classList.add('has-brand-cursor')
    }
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) hide()
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('scroll', updateOutline, { passive: true, capture: true })
    window.addEventListener('resize', updateOutline)
    window.addEventListener('blur', hide)
    document.addEventListener('pointerout', leave)
    fine.addEventListener('change', hide)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('scroll', updateOutline, true)
      window.removeEventListener('resize', updateOutline)
      window.removeEventListener('blur', hide)
      document.removeEventListener('pointerout', leave)
      fine.removeEventListener('change', hide)
      hide()
    }
  }, [])

  return (
    <svg
      ref={cursor}
      className="brand-cursor"
      width="36"
      height="40"
      viewBox="0 0 36 40"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 5 29 22 18 24 12 35Z"
        fill="#111"
        stroke="#C8F9F6"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
