import assert from 'node:assert/strict'
import { test } from 'node:test'
import { animateCardHover } from '../../src/lib/animateCardHover.ts'

function fixture(reduced = false) {
  globalThis.window = { matchMedia: () => ({ matches: reduced }) }
  globalThis.getComputedStyle = (element) => ({ transform: element.painted })
  const inner = {
    painted: 'matrix(1.08, 0, 0, 1.08, 0, 0)',
    style: {},
    animate(frames, timing) {
      return { frames, timing, canceled: false, cancel() { this.canceled = true } }
    },
  }
  return { inner, animations: new Map() }
}

test('interrupted exit and re-entry continue from the painted scale', () => {
  const { inner, animations } = fixture()
  animateCardHover(inner, true, animations)
  const entering = animations.get(inner)
  inner.painted = 'matrix(.95, 0, 0, .95, 0, 0)'
  animateCardHover(inner, false, animations)
  const leaving = animations.get(inner)
  assert.equal(entering.canceled, true)
  assert.equal(leaving.frames[0].transform, inner.painted)
  inner.painted = 'matrix(.98, 0, 0, .98, 0, 0)'
  animateCardHover(inner, true, animations)
  const reentering = animations.get(inner)
  assert.equal(leaving.canceled, true)
  assert.equal(reentering.frames[0].transform, inner.painted)
  leaving.onfinish()
  assert.equal(animations.get(inner), reentering)
  reentering.onfinish()
  assert.equal(inner.style.transform, 'scale(1.12)')
  assert.equal(inner.style.fontWeight, '450')
  assert.equal(animations.size, 0)
})

test('leaving finishes at normal scale without retaining an animation', () => {
  const { inner, animations } = fixture()
  animateCardHover(inner, false, animations)
  const animation = animations.get(inner)
  animation.onfinish()
  assert.equal(inner.style.transform, 'scale(1)')
  assert.equal(inner.style.fontWeight, '400')
  assert.equal(animation.timing.duration, 500)
  assert.equal(animation.canceled, true)
  assert.equal(animations.size, 0)
})

test('reduced motion cancels the previous effect and removes scaling', () => {
  const { inner, animations } = fixture()
  animateCardHover(inner, true, animations)
  const previous = animations.get(inner)
  globalThis.window.matchMedia = () => ({ matches: true })
  animateCardHover(inner, false, animations)
  assert.equal(previous.canceled, true)
  assert.equal(inner.style.transform, 'none')
  assert.equal(animations.size, 0)
})

test('fill exit fades without moving the painted circle; re-entry resumes it', async () => {
  const { animateCardFill } = await import('../../src/lib/animateCardHover.ts')
  globalThis.window = { matchMedia: () => ({ matches: false }) }
  const painted = { clipPath: 'circle(48% at 50% 50%)', opacity: '.65' }
  globalThis.getComputedStyle = () => painted
  const values = new Map()
  const card = {
    style: { setProperty: (key, value) => values.set(key, value) },
    animate(frames, timing) { return { frames, timing, cancel() { this.canceled = true } } },
  }
  const animations = new Map()
  animateCardFill(card, false, animations)
  const exit = animations.get(card)
  assert.equal(exit.frames[0].clipPath, exit.frames[1].clipPath)
  assert.equal(exit.frames[1].opacity, '0')
  assert.equal(exit.timing.pseudoElement, '::before')
  painted.opacity = '.3'
  animateCardFill(card, true, animations)
  const reentry = animations.get(card)
  assert.equal(exit.canceled, true)
  assert.equal(reentry.frames[0].clipPath, painted.clipPath)
  assert.equal(reentry.frames[0].opacity, '.3')
  assert.equal(reentry.frames[1].opacity, '0.45')
  exit.onfinish()
  assert.equal(animations.get(card), reentry)
  reentry.onfinish()
  animateCardFill(card, false, animations)
  animations.get(card).onfinish()
  assert.equal(values.get('--card-fill-opacity'), '0')
  assert.equal(values.get('--card-fill-clip'), 'circle(0% at 50% 50%)')
})
