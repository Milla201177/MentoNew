 'use client'
import { useEffect, useState } from 'react'

export default function HoverSpark() {
  const [spark, setSpark] = useState<{x:number;y:number;id:number}|null>(null)
  useEffect(() => {
    const over = (event: PointerEvent) => {
      if (!window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
      const target = (event.target as Element).closest('a[href],button:not(:disabled)')
      if (!target || target.contains(event.relatedTarget as Node | null)) return
      setSpark({x:event.clientX + 12,y:event.clientY - 12,id:performance.now()})
    }
    document.addEventListener('pointerover', over)
    return () => document.removeEventListener('pointerover', over)
  }, [])
  return spark ? <span key={spark.id} className="hover-spark" style={{left:spark.x,top:spark.y}} aria-hidden="true">✦</span> : null
}
