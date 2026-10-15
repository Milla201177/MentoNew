import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// --- Scramble characters palette (shared across all scramble functions) ---
const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*'

/**
 * Colour every reveal/scramble passes THROUGH before it settles.
 *
 * It used to be the brand teal, which flashed green over headings that resolve
 * to the ink — the one place green survived the 2026-09 rebrand. Holding it at
 * the ink keeps the blink-reveal (it is carried by opacity, not hue) without
 * introducing a second colour. Every accent in the app funnels through here, so
 * this is the single line to change if the flash should come back.
 */
export const SCRAMBLE_ACCENT = '#04212B'
export const ACCENT_GRADIENT = `linear-gradient(90deg, ${SCRAMBLE_ACCENT}, ${SCRAMBLE_ACCENT}, ${SCRAMBLE_ACCENT})`

// HTMLElement augmented with the interval handle stashed by scrambleRandom.
type ScrambleElement = HTMLElement & { _scrambleId?: ReturnType<typeof setInterval> }

// Scramble with random resolve order
export function scrambleRandom(
  charEls: HTMLElement[],
  totalDuration: number,
  accentColor?: string,
  finalColor?: string,
): void {
  const accent = accentColor || SCRAMBLE_ACCENT
  const final = finalColor || SCRAMBLE_ACCENT
  const nonSpace = charEls.filter((s) => s.dataset.original !== ' ')

  const indices = nonSpace.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  const stepTime = totalDuration / nonSpace.length

  nonSpace.forEach((span: ScrambleElement) => {
    // Clear any in-flight interval before starting a new one — prevents leaked
    // intervals when scrambleRandom is called again before the previous run ends.
    if (span._scrambleId !== undefined) clearInterval(span._scrambleId)
    span.style.opacity = '1'
    span.style.color = accent
    span._scrambleId = setInterval(() => {
      span.textContent = scrambleChars[Math.floor(Math.random() * scrambleChars.length)]
    }, 30)
  })

  indices.forEach((idx, order) => {
    const span = nonSpace[idx] as ScrambleElement
    // Capture the interval ID now so the timeout closure always clears the right
    // interval even if _scrambleId is overwritten by a subsequent call.
    const capturedId = span._scrambleId
    setTimeout(
      () => {
        // Only resolve if this is still the active scramble for this span.
        if (span._scrambleId !== capturedId) return
        clearInterval(capturedId)
        span._scrambleId = undefined
        span.textContent = span.dataset.original ?? ''
        span.style.color = final
      },
      stepTime * order + stepTime,
    )
  })

  charEls
    .filter((s) => s.dataset.original === ' ')
    .forEach((s) => {
      s.style.opacity = '1'
    })
}

// Scramble an element's text in place by mutating ONLY `textContent` (no child
// spans) — safe to run on a React-rendered node whose text can change. Reads the
// resolved target from `data-label` (falling back to current text), randomises
// the non-space characters, and resolves them in a random order.
export function scrambleLabel(el: HTMLElement, totalDuration = 350): void {
  const finalText = el.dataset.label ?? el.textContent ?? ''
  const letters = [...finalText]
  const positions = letters.map((_, i) => i).filter((i) => letters[i] !== ' ')

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j], positions[i]]
  }

  const resolved = new Set<number>()
  const stepTime = totalDuration / Math.max(positions.length, 1)
  const elx = el as HTMLElement & { _labelScrambleId?: ReturnType<typeof setInterval> }

  if (elx._labelScrambleId !== undefined) clearInterval(elx._labelScrambleId)
  elx._labelScrambleId = setInterval(() => {
    el.textContent = letters
      .map((ch, i) =>
        ch === ' ' || resolved.has(i)
          ? ch
          : scrambleChars[Math.floor(Math.random() * scrambleChars.length)],
      )
      .join('')
  }, 30)

  positions.forEach((pos, order) => {
    setTimeout(() => resolved.add(pos), stepTime * (order + 1))
  })
  setTimeout(() => {
    if (elx._labelScrambleId !== undefined) clearInterval(elx._labelScrambleId)
    elx._labelScrambleId = undefined
    el.textContent = finalText
  }, totalDuration + 60)
}

/**
 * Split an element's text into per-character spans, grouped by word.
 *
 * Every scrambling label on the site needs this, and until now each component
 * rolled its own — as a FLAT list of character spans. That is the bug this
 * exists to stop: each character is `inline-block`, and a line may break
 * between any two inline-blocks, so once text is per-character the browser has
 * no word boundaries left to respect. At 390px the hero pill read
 * "BACKED BY UNICORN FOU / NDERS AND WORLD-CLASS OPERATORS".
 *
 * Words go in `.scramble-word` wrappers (`white-space: nowrap`) and the spaces
 * between them stay as real text nodes, which is what leaves a legal break
 * between words and nowhere else.
 *
 * The `.scramble-inner` wrapper is not decoration: several of these labels sit
 * in `inline-flex` pills, where whitespace-only text nodes between word spans
 * would be dropped as flex items and the spaces would vanish. Inside one inline
 * wrapper they are ordinary inline content and survive.
 *
 * Returns the character spans in reading order, ready for `scrambleRandom` —
 * which filters spaces itself, so none are included.
 *
 * @param placeholder what each character shows initially. Defaults to the real
 *   character; the tag pills pass a random glyph so they start scrambled.
 */
export function buildWordCharSpans(
  el: HTMLElement,
  charClass: string,
  placeholder: (ch: string) => string = (ch) => ch,
): HTMLSpanElement[] {
  // Idempotent: components re-run their effects, and a second split would
  // shred the spans produced by the first.
  const existing = el.querySelectorAll<HTMLSpanElement>(`.${charClass}`)
  if (existing.length > 0) return Array.from(existing)

  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  el.textContent = ''

  const inner = document.createElement('span')
  inner.className = 'scramble-inner'

  const charEls: HTMLSpanElement[] = []
  const words = text.split(' ')
  words.forEach((word, wordIndex) => {
    const wordEl = document.createElement('span')
    wordEl.className = 'scramble-word'
    for (const ch of word) {
      const span = document.createElement('span')
      span.className = charClass
      span.dataset.original = ch
      span.textContent = placeholder(ch)
      wordEl.appendChild(span)
      charEls.push(span)
    }
    inner.appendChild(wordEl)
    if (wordIndex < words.length - 1) inner.appendChild(document.createTextNode(' '))
  })

  el.appendChild(inner)
  return charEls
}

// Scramble the live text of an element in place. Splits the text into
// word-grouped character spans (words stay intact and wrap between words, so a
// multi-line label never breaks mid-word) and runs `scrambleRandom` over them.
// The original text is cached on `dataset.text` so the element can be restored
// (see `restorePlainText`) or re-scrambled repeatedly.
export function scrambleText(
  el: HTMLElement,
  totalDuration = 350,
  accentColor?: string,
  finalColor?: string,
): void {
  const text = (el.dataset.text ?? el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return
  el.dataset.text = text
  el.textContent = ''

  // Everything goes inside ONE inline wrapper: when the host element is a flex
  // container (e.g. `.pill-tag` is inline-flex) the whitespace-only text nodes
  // between word spans would be dropped as flex items — the wrapper keeps them
  // as normal inline content so the spaces survive.
  const inner = document.createElement('span')
  inner.className = 'scramble-inner'

  const charEls: HTMLSpanElement[] = []
  const words = text.split(' ')
  words.forEach((word, wi) => {
    const wordEl = document.createElement('span')
    wordEl.className = 'scramble-word'
    for (const ch of word) {
      const span = document.createElement('span')
      span.className = 'scramble-char'
      span.dataset.original = ch
      span.textContent = ch
      wordEl.appendChild(span)
      charEls.push(span)
    }
    inner.appendChild(wordEl)
    if (wi < words.length - 1) inner.appendChild(document.createTextNode(' '))
  })

  el.appendChild(inner)
  scrambleRandom(charEls, totalDuration, accentColor, finalColor)
}

// Restore an element scrambled by `scrambleText` back to plain text — removes
// the char spans (and their inline colours) so CSS styling applies again.
export function restorePlainText(el: HTMLElement): void {
  const text = el.dataset.text ?? el.textContent ?? ''
  el.dataset.text = text
  el.textContent = text
}

// Word-by-word heading reveal — byte-for-byte the same animation as the home
// Hero heading (Hero.tsx): split into `.word` spans, then a keyframed blink
// through a teal gradient, staggered `0.3 + i*0.12`, resolving to `finalColor`.
// Strict-Mode guarded so a double-invoke does not re-split.
export function revealHeading(el: HTMLElement, finalColor: string): void {
  let wordEls: HTMLSpanElement[] = []
  if (!el.querySelector('.word')) {
    const text = (el.textContent || '').trim()
    el.innerHTML = ''
    const words = text.split(/\s+/)
    words.forEach((w, i) => {
      const span = document.createElement('span')
      span.className = 'word'
      span.textContent = w
      el.appendChild(span)
      wordEls.push(span)
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '))
    })
  } else {
    wordEls = Array.from(el.querySelectorAll<HTMLSpanElement>('.word'))
  }

  const dur = 1.0
  const ease = 'power2.out'

  wordEls.forEach((word, i) => {
    word.style.opacity = '0'
    word.style.backgroundClip = 'text'
    word.style.webkitBackgroundClip = 'text'
    word.style.webkitTextFillColor = 'transparent'
    word.style.backgroundImage = `linear-gradient(90deg, ${finalColor}, ${finalColor})`

    gsap.to(word, {
      keyframes: [
        { opacity: 0, backgroundImage: `linear-gradient(90deg, ${finalColor}, ${finalColor})`, duration: 0 },
        { opacity: 1, backgroundImage: ACCENT_GRADIENT, duration: dur * 0.01 },
        { opacity: 0.2, duration: dur * 0.14 },
        { opacity: 0.8, duration: dur * 0.15 },
        { opacity: 1, backgroundImage: ACCENT_GRADIENT, duration: dur * 0.1 },
        { opacity: 1, duration: dur * 0.15 },
        { opacity: 0.7, backgroundImage: `linear-gradient(90deg, ${finalColor}, ${finalColor})`, duration: dur * 0.15 },
        { opacity: 1, duration: dur * 0.15 },
        { opacity: 1, duration: dur * 0.15 },
      ],
      delay: 0.3 + i * 0.08,
      ease,
      onComplete: () => {
        word.style.backgroundImage = 'none'
        word.style.webkitTextFillColor = ''
        word.style.color = finalColor
      },
    })
  })
}

// Word by word blink reveal for portfolio items
export function revealText(el: HTMLElement, finalColor: string): void {
  const text = el.dataset.text || el.textContent || ''
  el.dataset.text = text
  el.innerHTML = ''
  el.style.opacity = '1'
  const words = text.split(/\s+/)
  words.forEach((w, i) => {
    const span = document.createElement('span')
    span.className = 'portfolio-word'
    span.textContent = w
    span.style.opacity = '0.12'
    span.style.backgroundClip = 'text'
    span.style.webkitBackgroundClip = 'text'
    span.style.webkitTextFillColor = 'transparent'
    span.style.backgroundImage = `linear-gradient(90deg, ${finalColor}, ${finalColor})`
    el.appendChild(span)
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '))
    gsap.to(span, {
      keyframes: [
        { opacity: 0.12, backgroundImage: `linear-gradient(90deg, ${finalColor}, ${finalColor})`, duration: 0 },
        { opacity: 1, backgroundImage: ACCENT_GRADIENT, duration: 0.005 },
        { opacity: 0.3, duration: 0.07 },
        { opacity: 0.9, duration: 0.075 },
        { opacity: 1, backgroundImage: ACCENT_GRADIENT, duration: 0.05 },
        { opacity: 1, duration: 0.075 },
        { opacity: 0.8, backgroundImage: `linear-gradient(90deg, ${finalColor}, ${finalColor})`, duration: 0.075 },
        { opacity: 1, duration: 0.075 },
      ],
      delay: i * 0.08,
      ease: 'power2.out',
      onComplete: () => {
        span.style.backgroundImage = 'none'
        span.style.webkitTextFillColor = ''
        span.style.color = finalColor
      },
    })
  })
}

/* -----------------------------------------------------------------------------
 * Tres Mares-style reveal (tresmarescapital.com)
 *
 * Paragraph: split into words; each word rises (translateY 100% → 0) while a
 *   clip-path mask opens, ease "expo.out", once.
 * --------------------------------------------------------------------------- */

