'use client'

import { scrollToScreen } from '@/lib/scrollToScreen'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ScrambleButton from '@/components/ScrambleButton'
import type { Company } from '@/lib/portfolio'
import { safeHref } from '@/lib/safeHref'
import { animateCardFill, animateCardHover } from '@/lib/animateCardHover'

const SHORT_PORTFOLIO_COUNT = 12

const PHONE_LIST_ONLY = '(max-width: 640px)'

export default function PortfolioContent({ companies }: { companies: Company[] }) {
  const visibleCount = Math.min(SHORT_PORTFOLIO_COUNT, companies.length)
  const visibleCompanies = companies.slice(0, visibleCount)
  const extraCompanies = companies.slice(visibleCount)
  const hasMore = extraCompanies.length > 0
  const root = useRef<HTMLElement>(null)
  const gridClipRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const hoverAnimations = useRef(new Map<HTMLElement, Animation>())

  useEffect(() => {
    const animations = hoverAnimations.current
    return () => {
      animations.forEach((animation) => animation.cancel())
      animations.clear()
    }
  }, [])

  const clipFromRef = useRef<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [renderedExpanded, setRenderedExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [layoutRevision, setLayoutRevision] = useState(0)

  const chosenViewRef = useRef<'grid' | 'list'>('list')
  const releaseScrollGuard = useRef<(() => void) | null>(null)
  useEffect(() => () => releaseScrollGuard.current?.(), [])

  const preserveExpansionScroll = () => {
    releaseScrollGuard.current?.()
    const top = window.scrollY
    const left = window.scrollX
    const started = performance.now()
    let frame = 0
    let active = true
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    const release = () => {
      active = false
      cancelAnimationFrame(frame)
      events.forEach((event) => window.removeEventListener(event, release, true))
    }
    const hold = () => {
      if (!active) return
      if (Math.abs(window.scrollY - top) > 0.5) window.scrollTo({ top, left, behavior: 'instant' })
      if (performance.now() - started < 800) frame = requestAnimationFrame(hold)
      else release()
    }
    events.forEach((event) =>
      window.addEventListener(event, release, { capture: true, passive: true }),
    )
    releaseScrollGuard.current = release
    frame = requestAnimationFrame(hold)
  }

  useEffect(() => {
    const section = root.current
    if (!section) return
    // Re-measure wrapping and grid rows only for real viewport changes.
    // Mobile browser toolbars must not trigger layout work while scrolling.
    const viewport = document.createElement('div')
    viewport.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none'
    viewport.setAttribute('aria-hidden', 'true')
    document.body.appendChild(viewport)
    let disposed = false
    let previousWidth = window.innerWidth
    let previousHeight = viewport.getBoundingClientRect().height
    const fit = () => {
      if (disposed) return
      const listView = section.querySelector<HTMLElement>('.portfolio-view-list')
      const previousStyle = listView?.style.cssText
      // Measure wrapped list rows at the current width even while Grid is shown.
      if (listView && viewMode === 'grid') {
        listView.style.cssText = `display:block;position:absolute;visibility:hidden;pointer-events:none;width:${Math.min(504, section.querySelector('.portfolio-container')?.clientWidth || 504)}px`
      }
      const list = section.querySelector<HTMLElement>('.portfolio-list')
      const row = list?.querySelector<HTMLElement>('.portfolio-list-row')
      if (row && list) {
        const gap = parseFloat(getComputedStyle(list).rowGap) || 0
        const items = section.querySelectorAll<HTMLElement>(
          '.portfolio-view-list .portfolio-list-row',
        )
        const used = Array.from(items)
          .slice(0, visibleCount)
          .reduce((height, item, index) => height + item.offsetHeight + (index ? gap : 0), 0)
        section.style.setProperty('--portfolio-view-height', `${used}px`)
      }
      if (listView && previousStyle !== undefined) listView.style.cssText = previousStyle
      setLayoutRevision((revision) => revision + 1)
    }
    fit()
    const reflow = () => {
      const width = window.innerWidth
      const height = viewport.getBoundingClientRect().height
      if (width === previousWidth && Math.abs(height - previousHeight) < 1) return
      previousWidth = width
      previousHeight = height
      section.style.removeProperty('--portfolio-top-lock')
      fit()
    }
    const viewportObserver = new ResizeObserver(reflow)
    viewportObserver.observe(viewport)
    window.addEventListener('resize', reflow)
    section.addEventListener('section-spacing-change', fit)
    document.fonts.ready.then(fit)
    return () => {
      disposed = true
      viewportObserver.disconnect()
      viewport.remove()
      window.removeEventListener('resize', reflow)
      section.removeEventListener('section-spacing-change', fit)
    }
  }, [viewMode, companies, visibleCount])

  useEffect(() => {
    const section = root.current
    if (!section) return
    const alignControls = () => {
      const selector = '.portfolio-header'
      const content = section.querySelector<HTMLElement>(selector)
      if (!content) return
      const edge = content.getBoundingClientRect().top - section.getBoundingClientRect().top
      section.style.setProperty('--portfolio-controls-edge', `${edge}px`)
    }
    alignControls()
    const observer = new ResizeObserver(alignControls)
    const container = section.querySelector('.portfolio-container')
    if (container) observer.observe(container)
    window.addEventListener('resize', alignControls)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', alignControls)
    }
  }, [viewMode, expanded, visibleCount])

  const chooseView = (mode: 'grid' | 'list') => {
    if (viewMode === 'list' && !expanded) {
      const list = root.current?.querySelector<HTMLElement>('.portfolio-list')
      if (list) root.current?.style.setProperty('--portfolio-view-height', `${list.offsetHeight}px`)
    }
    chosenViewRef.current = mode
    setViewMode(mode)
  }

  const toggleExpanded = () => {
    releaseScrollGuard.current?.()
    if (!expanded) preserveExpansionScroll()
    if (expanded && window.matchMedia(PHONE_LIST_ONLY).matches && root.current) {
      const section = root.current
      const top = section.getBoundingClientRect().top + window.scrollY
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur()
      if (!reduceMotion && Math.abs(window.scrollY - top) > 2) {
        // Return while the full list still exists, avoiding a scroll clamp as it shrinks.
        let finished = false
        const finish = () => {
          if (finished) return
          finished = true
          window.clearTimeout(fallback)
          window.removeEventListener('scrollend', finish)
          if (root.current === section) setExpanded(false)
        }
        const fallback = window.setTimeout(finish, 1400)
        window.addEventListener('scrollend', finish, { once: true })
        section.scrollIntoView({ block: 'start', behavior: 'smooth' })
        return
      }
      section.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    // A focused control must not become a scroll target as the layout grows.
    if (document.activeElement instanceof HTMLButtonElement) {
      document.activeElement.blur()
    }
    if (!expanded && root.current) {
      const header = root.current.querySelector<HTMLElement>('.portfolio-header')
      if (header) {
        const offset = header.getBoundingClientRect().top - root.current.getBoundingClientRect().top
        root.current.style.setProperty('--portfolio-top-lock', `${offset}px`)
      }
    }
    const clip = gridClipRef.current
    if (clip) {
      clipFromRef.current = clip.getBoundingClientRect().height
    }
    if (!expanded || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRenderedExpanded(!expanded)
    }
    setExpanded((v) => !v)
  }

  useEffect(() => {
    const phone = window.matchMedia(PHONE_LIST_ONLY)
    const pin = () => setViewMode(phone.matches ? 'list' : chosenViewRef.current)
    pin()
    phone.addEventListener('change', pin)
    return () => phone.removeEventListener('change', pin)
  }, [])

  // Keep section positioning locked until the current view has finished collapsing.
  useLayoutEffect(() => {
    const clip = gridClipRef.current
    const grid = gridRef.current
    const section = root.current
    const from = clipFromRef.current
    clipFromRef.current = null
    if (!section) return
    if (viewMode === 'list') {
      if (expanded || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return
      }
      const extra = section.querySelector<HTMLElement>('.portfolio-extra-wrap')
      const finish = (event: TransitionEvent) => {
        if (event.target === extra && event.propertyName === 'grid-template-rows') {
          setRenderedExpanded(false)
        }
      }
      extra?.addEventListener('transitionend', finish)
      return () => extra?.removeEventListener('transitionend', finish)
    }
    if (!clip || !grid || !grid.firstElementChild) return
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
    const minimumCardHeight =
      parseFloat(getComputedStyle(grid.firstElementChild as HTMLElement).minHeight) || 168
    const rows = Math.max(1, Math.ceil(visibleCount / columns))
    clip.style.setProperty('--visible-rows', String(rows))
    const visible = visibleCount
    const cards = Array.from(grid.children) as HTMLElement[]

    const initiallyHidden = cards.map((card) => getComputedStyle(card).display === 'none')
    cards.forEach((card, i) => {
      card.style.display = ''
      card.inert = !expanded && i >= visible
      if (card.inert) card.setAttribute('aria-hidden', 'true')
      else card.removeAttribute('aria-hidden')
    })
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 16
    const cardHeight = minimumCardHeight
    const collapsed = rows * cardHeight + gap * (rows - 1)
    grid.style.gridAutoRows = `${cardHeight}px`
    grid.style.height = 'auto'
    const to = expanded ? grid.getBoundingClientRect().height : collapsed
    clip.style.height = `${to}px`
    const finish = () => {
      cards.forEach((card, i) => {
        card.style.display = !expanded && i >= visible ? 'none' : ''
      })
      setRenderedExpanded(expanded)
      cards.forEach((card) => {
        card.style.opacity = ''
      })
    }
    if (from === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    // Keep shadows outside the layout box. Extra rows fade only once there is
    // room for them; on collapse they fade before the section starts shrinking.
    const rowAnimations: Animation[] = []
    cards.slice(visible).forEach((card, index) => {
      const current = initiallyHidden[visible + index] ? '0' : getComputedStyle(card).opacity
      card.style.opacity = current
      const rowTop = Math.floor((visible + index) / columns) * (cardHeight + gap)
      const delay = expanded
        ? Math.max(0, (rowTop - collapsed) / Math.max(1, to - collapsed)) * 500
        : 0
      rowAnimations.push(
        card.animate([{ opacity: current }, { opacity: expanded ? 1 : 0 }], {
          duration: 150,
          delay,
          fill: 'both',
          easing: 'ease-in-out',
        }),
      )
    })
    const animation = clip.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: expanded ? 650 : 500,
      delay: expanded ? 0 : 150,
      fill: 'backwards',
      easing: 'cubic-bezier(.22,1,.36,1)',
    })
    animation.onfinish = () => {
      finish()
      rowAnimations.forEach((row) => row.cancel())
    }
    return () => {
      cards.slice(visible).forEach((card) => {
        card.style.opacity = getComputedStyle(card).opacity
      })
      rowAnimations.forEach((row) => row.cancel())
      animation.cancel()
    }
  }, [expanded, viewMode, companies, layoutRevision, visibleCount])

  const renderCard = (company: Company, key: string) => {
    const cardHref = safeHref(company.website)
    const Card = cardHref ? 'a' : 'div'
    const cardLinkProps = cardHref
      ? { href: cardHref, target: '_blank', rel: 'noopener noreferrer' }
      : {}
    return (
      <Card
        className="portfolio-card"
        data-company={company.slug}
        key={key}
        {...cardLinkProps}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse') return
          animateCardFill(event.currentTarget, true, hoverAnimations.current)
          const inner = event.currentTarget.querySelector<HTMLElement>('.portfolio-card-inner')
          if (inner) animateCardHover(inner, true, hoverAnimations.current)
        }}
        onPointerLeave={(event) => {
          animateCardFill(event.currentTarget, false, hoverAnimations.current)
          const inner = event.currentTarget.querySelector<HTMLElement>('.portfolio-card-inner')
          if (inner) animateCardHover(inner, false, hoverAnimations.current)
        }}
      >
        <span className="portfolio-card-inner">
          <span className="portfolio-card-icon-slot">
            <img
              className="portfolio-card-icon"
              src={company.icon ?? company.logo}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className="portfolio-card-label">
            <span className="portfolio-card-name">{company.name}</span>
            <span className="portfolio-card-description">{company.desc}</span>
          </span>
        </span>
      </Card>
    )
  }

  const renderRow = (company: Company, key: string) => {
    const rowHref = safeHref(company.website)
    const Row = rowHref ? 'a' : 'div'
    const rowLinkProps = rowHref
      ? { href: rowHref, target: '_blank', rel: 'noopener noreferrer' }
      : {}
    return (
      <Row
        className="portfolio-list-row"
        data-company={company.slug}
        key={key}

        {...rowLinkProps}
      >
        <span className="portfolio-list-icon">
          <img
            className="portfolio-list-mark"
            src={company.icon ?? company.logo}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />
        </span>
        <span className="portfolio-list-body">
          <span className="portfolio-list-title" data-label={company.name}>
            {company.name}
          </span>
          <span className="portfolio-list-dash" aria-hidden="true">
            {' ... '}
          </span>
          <span className="portfolio-list-desc">{company.desc}</span>
        </span>
      </Row>
    )
  }

  return (
    <section
      className={`section-portfolio is-view-${viewMode}${renderedExpanded ? ' is-expanded' : ''}`}
      id="sectionPortfolio"
      ref={root}
    >
      <div className="portfolio-bg" aria-hidden="true" />
      <div className="portfolio-container">
        <div className="portfolio-header">
          <h2 className="portfolio-display" id="portfolioHeading">
            Our Portfolio
          </h2>
          <p className="portfolio-subheading">Early to the companies that matter</p>
        </div>

        <div className="portfolio-toolbar">
          <div className="portfolio-view-toggle" role="group" aria-label="Portfolio view">
            <span className="portfolio-view-prefix">VIEW:</span>
            <button
              type="button"
              className={`portfolio-view-btn${viewMode === 'list' ? ' is-active' : ''}`}
              aria-pressed={viewMode === 'list'}
              onClick={() => chooseView('list')}
            >
              <span className="portfolio-view-label" data-label="List">
                List
              </span>
            </button>
            <button
              type="button"
              className={`portfolio-view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
              aria-pressed={viewMode === 'grid'}
              onClick={() => chooseView('grid')}
            >
              <span className="portfolio-view-label" data-label="Grid">
                Grid
              </span>
            </button>
          </div>
        </div>

        <div className="portfolio-view portfolio-view-grid">
          <div className={`portfolio-grid-clip${expanded ? ' is-open' : ''}`} ref={gridClipRef}>
            <div className="portfolio-grid" ref={gridRef}>
              {companies.map((company, i) => renderCard(company, `g-${i}`))}
            </div>
          </div>
        </div>

        <div className="portfolio-view portfolio-view-list">
          <div className="portfolio-list">
            {visibleCompanies.map((company, i) => renderRow(company, `lb-${i}`))}
          </div>
          <div className={`portfolio-extra-wrap${expanded ? ' is-open' : ''}`}>
            <div className="portfolio-extra-inner">
              <div
                className="portfolio-list portfolio-list-extra"
                aria-hidden={!expanded}
                inert={!expanded}
              >
                {extraCompanies.map((company, i) => renderRow(company, `le-${i}`))}
              </div>
            </div>
          </div>
        </div>

        <div className="portfolio-button-wrap">
          {hasMore && (
            <ScrambleButton
              className="portfolio-button"
              aria-expanded={expanded}
              onClick={toggleExpanded}
              labelClassName="portfolio-btn-label"
              labelDataLabel={expanded ? 'Show less' : 'Show All'}
            >
              {expanded ? 'Show less' : 'Show All'}
            </ScrambleButton>
          )}
        </div>
      </div>
      <a className="explore-cue portfolio-explore" href="#sectionFocus" onClick={scrollToScreen}>
        <span className="explore-cue-label">Explore how we work</span>
        <img
          className="explore-cue-arrow"
          src="/icons/explore-arrow.svg"
          alt=""
          width={32}
          height={32}
        />
      </a>
    </section>
  )
}
