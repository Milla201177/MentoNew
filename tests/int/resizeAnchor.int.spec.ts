import React from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ResizeAnchor from '../../src/components/ResizeAnchor'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('keeps the visible heading in place across reflow and yields to user scrolling', () => {
  let now = 0
  let shift = 0
  let scroll = 1000
  let id = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() },
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scroll })
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 744 })
  const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(((
    options: ScrollToOptions | number,
  ) => {
    if (typeof options !== 'number') scroll += options.top || 0
  }) as typeof window.scrollBy)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const top = this.tagName === 'H2' ? 1100 + shift - scroll : 1000 + shift - scroll
    const height = this.style.height === '100svh' ? 744 : this.tagName === 'H2' ? 64 : 900
    return {
      top,
      bottom: top + height,
      left: 0,
      right: 500,
      width: 500,
      height,
      x: 0,
      y: top,
      toJSON() {},
    }
  })
  const flush = () => {
    const batch = [...frames.values()]
    frames.clear()
    act(() => batch.forEach((callback) => callback(now)))
  }
  const view = render(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'main',
        null,
        React.createElement('section', null, React.createElement('h2', null, 'About')),
      ),
      React.createElement(ResizeAnchor),
    ),
  )
  shift = 240
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 })
  act(() => window.dispatchEvent(new Event('resize')))
  flush()
  expect(scroll).toBe(1240)
  expect(document.querySelector('h2')?.getBoundingClientRect().top).toBe(100)
  // A second responsive calculation settles later in the same resize.
  shift = 300
  flush()
  expect(scroll).toBe(1300)
  act(() => window.dispatchEvent(new Event('wheel')))
  shift = 340
  scrollBy.mockClear()
  flush()
  expect(scrollBy).not.toHaveBeenCalled()
  now = 500
  // The same company becomes a different DOM element at the phone breakpoint.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.style.height === '100svh') return new DOMRect(0, 0, 0, 744)
    if (this.style.display === 'none') return new DOMRect()
    const documentTop =
      this.className === 'portfolio-card'
        ? 1400
        : this.className === 'portfolio-list-row'
          ? 2200
          : 1000
    return new DOMRect(0, documentTop - scroll, 500, this.dataset.company ? 64 : 3000)
  })
  const companyView = (gridShown: boolean) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'main',
        null,
        React.createElement(
          'section',
          null,
          React.createElement(
            'div',
            {
              className: 'portfolio-card',
              'data-company': 'leo',
              style: { display: gridShown ? 'block' : 'none' },
            },
            'Leo',
          ),
          React.createElement(
            'div',
            {
              className: 'portfolio-list-row',
              'data-company': 'leo',
              style: { display: gridShown ? 'none' : 'block' },
            },
            'Leo',
          ),
        ),
      ),
      React.createElement(ResizeAnchor),
    )
  view.rerender(companyView(true))
  act(() => window.dispatchEvent(new Event('scroll')))
  flush()
  view.rerender(companyView(false))
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
  act(() => window.dispatchEvent(new Event('resize')))
  flush()
  expect(scroll).toBe(2100)
  expect(document.querySelector('.portfolio-list-row')?.getBoundingClientRect().top).toBe(100)
  flush()
  expect(scroll).toBe(2100)
  cleanup()
  expect(document.querySelector('[style*="100svh"]')).toBeNull()
})
