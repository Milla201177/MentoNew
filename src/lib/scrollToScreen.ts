import type { MouseEvent } from 'react'

/** Keep Portfolio aligned to its screen; center the desktop Focus content. */
export function scrollToScreen(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const hash = event.currentTarget.hash
  const target = document.getElementById(hash.slice(1))
  if (!target) return
  event.preventDefault()
  const desktop = window.matchMedia('(min-width: 1025px)').matches
  const content =
    desktop && target.id === 'sectionFocus'
      ? target.querySelector<HTMLElement>('.focus-container')
      : null
  if (content) {
    const rect = content.getBoundingClientRect()
    window.scrollTo({
      top: window.scrollY + rect.top - Math.max(0, (window.innerHeight - rect.height) / 2),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
    window.history.replaceState(null, '', hash)
    return
  }
  target.scrollIntoView({
    block:
      target.id === 'sectionPortfolio' || target.getBoundingClientRect().height > window.innerHeight
        ? 'start'
        : 'center',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
  window.history.replaceState(null, '', hash)
}
