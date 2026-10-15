'use client'

/**
 * Unified CTA button / link with a scramble-on-hover effect.
 *
 * Renders as <button> (default) or <a> (as="a").  The visible label is wrapped
 * in an inner <span> so the scramble only touches text, leaving any icon nodes
 * untouched.  An optional `labelRef` prop lets the parent call scrambleLabel()
 * directly (e.g. Portfolio triggers it when the button label toggles).
 *
 * CSS hover highlight is handled purely by class rules in globals.css —
 * every button class already carries `transition + :hover { background teal }`.
 */

import { useRef } from 'react'
import type { MouseEvent, ReactNode, RefObject } from 'react'

type Props = {
  as?: 'button' | 'a'
  href?: string
  id?: string
  className?: string
  children: ReactNode
  /** External ref to the inner label span — use when the parent also needs to call scrambleLabel() */
  labelRef?: RefObject<HTMLSpanElement | null>
  labelClassName?: string
  labelDataLabel?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  'aria-expanded'?: boolean
  onClick?: (e: MouseEvent<HTMLElement>) => void
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void
  target?: string
  rel?: string
}

export default function ScrambleButton({
  as: Tag = 'button',
  href,
  id,
  className,
  children,
  labelRef: externalRef,
  labelClassName,
  labelDataLabel,
  type = 'button',
  disabled,
  'aria-expanded': ariaExpanded,
  onClick,
  onMouseEnter,
  target,
  rel,
}: Props) {
  const internalRef = useRef<HTMLSpanElement>(null)
  const labelRef = externalRef ?? internalRef

  const handleMouseEnter = (e: MouseEvent<HTMLElement>) => {
    onMouseEnter?.(e)
  }

  const labelSpan = (
    <span
      ref={labelRef}
      className={labelClassName}
      {...(labelDataLabel != null ? { 'data-label': labelDataLabel } : {})}
    >
      {children}
    </span>
  )

  if (Tag === 'a') {
    return (
      <a href={href} id={id} className={className} onMouseEnter={handleMouseEnter} target={target} rel={rel}>
        {labelSpan}
      </a>
    )
  }

  return (
    <button
      id={id}
      type={type}
      className={className}
      disabled={disabled}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      {labelSpan}
    </button>
  )
}
