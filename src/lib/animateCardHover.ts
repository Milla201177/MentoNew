/** Start each hover phase at the currently painted scale, including interrupted phases. */
export function animateCardHover(
  inner: HTMLElement,
  hovering: boolean,
  animations: Map<HTMLElement, Animation>,
) {
  const painted = getComputedStyle(inner)
  const current = painted.transform
  const currentWeight = painted.fontWeight || '400'
  animations.get(inner)?.cancel()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    inner.style.transform = 'none'
    inner.style.fontWeight = '400'
    animations.delete(inner)
    return
  }
  inner.style.transform = current
  inner.style.fontWeight = currentWeight
  const target = hovering ? 'scale(1.12)' : 'scale(1)'
  const targetWeight = hovering ? '450' : '400'
  const easing = 'cubic-bezier(.4,0,.2,1)'
  const frames = hovering
    ? [
        { transform: current, fontWeight: currentWeight, offset: 0, easing },
        { transform: 'scale(.92)', fontWeight: '400', offset: 0.5, easing },
        { transform: target, fontWeight: targetWeight, offset: 1 },
      ]
    : [
        { transform: current, fontWeight: currentWeight },
        { transform: target, fontWeight: targetWeight },
      ]
  const animation = inner.animate(frames, {
    duration: hovering ? 1300 : 500,
    easing: hovering ? 'linear' : easing,
    fill: 'forwards',
  })
  animations.set(inner, animation)
  animation.onfinish = () => {
    if (animations.get(inner) !== animation) return
    inner.style.transform = target
    inner.style.fontWeight = targetWeight
    animation.cancel()
    animations.delete(inner)
  }
}

/** Fade out in place: reversing a clipped circle makes the edge twitch on exit. */
export function animateCardFill(
  card: HTMLElement,
  hovering: boolean,
  animations: Map<HTMLElement, Animation>,
) {
  const painted = getComputedStyle(card, '::before')
  const clip = painted.clipPath
  const opacity = painted.opacity
  animations.get(card)?.cancel()
  const commit = (nextClip: string, nextOpacity: string) => {
    card.style.setProperty('--card-fill-clip', nextClip)
    card.style.setProperty('--card-fill-opacity', nextOpacity)
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    commit(hovering ? 'circle(75% at 50% 50%)' : 'circle(0% at 50% 50%)', hovering ? '0.45' : '0')
    animations.delete(card)
    return
  }
  commit(clip, opacity)
  const targetClip = hovering ? 'circle(75% at 50% 50%)' : clip
  const animation = card.animate(
    [
      { clipPath: clip, opacity },
      { clipPath: targetClip, opacity: hovering ? '0.45' : '0' },
    ],
    {
      pseudoElement: '::before',
      duration: hovering ? 1400 : 650,
      easing: 'cubic-bezier(.4,0,.2,1)',
      fill: 'forwards',
    },
  )
  animations.set(card, animation)
  animation.onfinish = () => {
    if (animations.get(card) !== animation) return
    commit(hovering ? targetClip : 'circle(0% at 50% 50%)', hovering ? '0.45' : '0')
    animation.cancel()
    animations.delete(card)
  }
}
