'use client'

import dynamic from 'next/dynamic'
import { useSyncExternalStore } from 'react'

/**
 * Loads the layout-grid overlay, and only when someone asks for it with `?grid`.
 *
 * The gate is deliberately tiny and the overlay is a `dynamic()` import, so the
 * overlay lands in its own chunk that is fetched on demand. A visitor who never
 * types the parameter pays for the few lines below and nothing else.
 *
 * `useSyncExternalStore` rather than reading the query string during render:
 * the server has no query string, so an inline read would make the first client
 * render disagree with the server's HTML. Passing a server snapshot of `false`
 * is the documented way to say "this is client-only state" without a
 * `setState` in an effect, which cascades an extra render on every page.
 *
 * `useSearchParams` would be the obvious alternative and is the wrong tool
 * here: it opts the whole tree into dynamic rendering, and `/` and `/articles`
 * are prerendered today.
 */
const GridOverlay = dynamic(() => import('./GridOverlay'), { ssr: false })

/** The parameter is read once per load; nothing re-publishes it. */
const subscribe = () => () => {}
const hasGridParam = () => new URLSearchParams(window.location.search).has('grid')
const notOnTheServer = () => false

export default function GridOverlayGate() {
  const enabled = useSyncExternalStore(subscribe, hasGridParam, notOnTheServer)
  return enabled ? <GridOverlay /> : null
}
