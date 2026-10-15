 'use client'
import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glow = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = glow.current
    if (!element) return
    const enabled = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    const move = (event: PointerEvent) => {
      if (!enabled.matches || event.pointerType === 'touch') { element.style.opacity = '0'; return }
      const target = event.target as Element
      if (target.closest('.hero, a[href]:not(.logo), button')) { element.style.opacity = '0'; return }
      element.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
      element.style.opacity = '1'
    }
    const hide = () => { element.style.opacity = '0' }
    document.addEventListener('pointermove', move)
    document.documentElement.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)
    enabled.addEventListener('change', hide)
    return () => {
      document.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      enabled.removeEventListener('change', hide)
    }
  }, [])
  return <div ref={glow} className="cursor-glow" aria-hidden="true" />
}
