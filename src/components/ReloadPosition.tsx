'use client'

import { useEffect } from 'react'
import { readReloadState, saveReloadState } from '@/lib/reloadState'

/** Keep refresh at the reader's place, including an expanded portfolio. */
export default function ReloadPosition() {
  useEffect(() => {
    const save = () => {
      const portfolio = document.querySelector('.section-portfolio')
      saveReloadState({
        path: location.pathname + location.search,
        scrollY: window.scrollY,
        expanded: portfolio?.classList.contains('is-expanded') || false,
        view: portfolio?.classList.contains('is-view-grid') ? 'grid' : 'list',
      })
    }
    const state = readReloadState()
    let frame = 0
    let active = !!state
    const interactions = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    const release = () => {
      active = false
      cancelAnimationFrame(frame)
      interactions.forEach((event) => window.removeEventListener(event, release))
    }
    const until = performance.now() + 1200
    const restore = () => {
      if (!active || !state) return
      if (Math.abs(window.scrollY - state.scrollY) > 0.5) {
        window.scrollTo({ top: state.scrollY, behavior: 'instant' })
      }
      if (performance.now() < until) frame = requestAnimationFrame(restore)
      else release()
    }
    if (state) {
      interactions.forEach((event) => window.addEventListener(event, release, { passive: true }))
      frame = requestAnimationFrame(restore)
    }
    window.addEventListener('pagehide', save)
    const onHidden = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      release()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [])
  return null
}
