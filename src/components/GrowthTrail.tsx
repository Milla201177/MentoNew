'use client'

import { useEffect, useRef } from 'react'

/** Trial 1: three ascending strokes echo the Mento mark behind the cursor. */
export default function GrowthTrail() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const hero = canvas?.closest<HTMLElement>('.hero')
    const context = canvas?.getContext('2d')
    if (!canvas || !hero || !context) return

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const lifetime = 740
    let marks: { x: number; y: number; born: number }[] = []
    let frame = 0
    let width = 0
    let height = 0
    let lastX = -1000
    let lastY = -1000
    let lastAt = -1000
    let enabled = false

    const clear = () => {
      cancelAnimationFrame(frame)
      frame = 0
      marks = []
      context.clearRect(0, 0, width, height)
      lastX = lastY = -1000
      lastAt = -1000
    }

    const resize = () => {
      clear()
      const bounds = hero.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const draw = (now: number) => {
      frame = 0
      context.clearRect(0, 0, width, height)
      marks = marks.filter((mark) => now - mark.born < lifetime)
      for (const mark of marks) {
        const age = now - mark.born
        const growth = 1 - (1 - Math.min(age / 120, 1)) ** 3
        const fade = 1 - Math.max(0, (age - 260) / (lifetime - 260))
        context.save()
        context.translate(mark.x + 24, mark.y + 24)
        context.rotate(-0.22)
        context.globalAlpha = fade * 0.6
        const colors = ['#C8F9F6', '#66E1CF', '#FFFFFF']
        for (let index = 0; index < 3; index++) {
          const barHeight = (8 + index * 8) * growth
          context.fillStyle = colors[index]
          context.fillRect(index * 8, -barHeight, 4, barHeight)
        }
        context.restore()
      }
      if (marks.length) frame = requestAnimationFrame(draw)
    }

    const move = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== 'mouse') return
      const target = event.target as Element
      if (target.closest('a, button, input, textarea, [role="button"]')) return
      const bounds = hero.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      const now = performance.now()
      if (now - lastAt < 50 || Math.hypot(x - lastX, y - lastY) < 24) return
      marks.push({ x, y, born: now })
      if (marks.length > 18) marks.shift()
      lastX = x
      lastY = y
      lastAt = now
      if (!frame) frame = requestAnimationFrame(draw)
    }

    const update = () => {
      enabled = pointer.matches && !motion.matches
      clear()
    }

    const leave = () => {
      lastX = lastY = -1000
      lastAt = -1000
    }

    const observer = new ResizeObserver(resize)
    observer.observe(hero)
    hero.addEventListener('pointermove', move, { passive: true })
    hero.addEventListener('pointerleave', leave)
    motion.addEventListener('change', update)
    pointer.addEventListener('change', update)
    resize()
    update()

    return () => {
      clear()
      observer.disconnect()
      hero.removeEventListener('pointermove', move)
      hero.removeEventListener('pointerleave', leave)
      motion.removeEventListener('change', update)
      pointer.removeEventListener('change', update)
    }
  }, [])

  return <canvas className="growth-trail" ref={ref} aria-hidden="true" />
}
