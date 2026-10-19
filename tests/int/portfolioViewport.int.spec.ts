import React from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PortfolioContent from '../../src/components/PortfolioContent'

vi.mock('@/components/ScrambleButton', () => ({ default: () => null }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('ignores toolbar-only resizes but refits on actual viewport changes', async () => {
  let stableHeight = 640
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() },
  })
  const original = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.style.height === '100svh')
      return { ...original.call(this), height: stableHeight } as DOMRect
    return original.call(this)
  })
  const queries = vi.spyOn(HTMLElement.prototype, 'querySelector')
  await act(async () => {
    render(React.createElement(PortfolioContent, { companies: [] }))
  })
  queries.mockClear()
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 })
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
  expect(queries).not.toHaveBeenCalledWith('.portfolio-button-wrap')
  stableHeight = 800
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
  expect(queries).toHaveBeenCalledWith('.portfolio-button-wrap')
  queries.mockClear()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 })
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
  expect(queries).toHaveBeenCalledWith('.portfolio-button-wrap')
  cleanup()
  expect(document.querySelector('[aria-hidden="true"][style*="100svh"]')).toBeNull()
})
