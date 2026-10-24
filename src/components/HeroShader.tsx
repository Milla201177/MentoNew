'use client'

import { useEffect, useRef } from 'react'
import { fragSrc, vertSrc } from '@/lib/shaderSrc'

/** Original Mento dots, screen-blended over the original cloud image. */
export default function HeroShader() {
  const root = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = root.current
    const hero = canvas?.parentElement
    if (!canvas || !hero) return
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
    })
    if (!gl) return // The cloud image is also the static fallback.
    const shaders: WebGLShader[] = []
    const program = gl.createProgram()
    const buffer = gl.createBuffer()
    if (!program || !buffer) {
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      return
    }
    const dispose = () => {
      shaders.forEach((shader) => gl.deleteShader(shader))
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertSrc],
      [gl.FRAGMENT_SHADER, fragSrc],
    ] as const) {
      const shader = gl.createShader(type)
      if (!shader) {
        dispose()
        return
      }
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        dispose()
        return
      }
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      dispose()
      return
    }
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const time = uniform('uTime')
    const resolution = uniform('uResolution')
    const pointer = uniform('uMouse')
    const pointerActive = uniform('uMouseActive')
    gl.uniform1f(uniform('uAlphaMode'), 1)
    gl.uniform1f(uniform('uRays'), 1)
    gl.uniform1f(uniform('uDotCols'), 0)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let visible = true
    let activity = 0
    let target = 0
    const mouse = { x: 0.5, y: 0.5 }
    const draw = (now: number) => {
      activity += (target - activity) * 0.05
      gl.uniform1f(time, motion.matches ? 0 : now / 1000)
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform2f(pointer, mouse.x, mouse.y)
      gl.uniform1f(pointerActive, activity)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    const render = (now: number) => {
      draw(now)
      frame = requestAnimationFrame(render)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (!visible || document.hidden) return
      draw(performance.now())
      if (!motion.matches) frame = requestAnimationFrame(render)
    }
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = Math.round(hero.clientWidth * ratio)
      const height = Math.round(hero.clientHeight * ratio)
      if (canvas.width === width && canvas.height === height) return
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, canvas.width, canvas.height)
      sync()
    }
    const move = (event: MouseEvent) => {
      const box = hero.getBoundingClientRect()
      mouse.x = (event.clientX - box.left) / box.width
      mouse.y = 1 - (event.clientY - box.top) / box.height
      target = 1
    }
    const leave = () => {
      target = 0
    }
    const size = new ResizeObserver(resize)
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    size.observe(hero)
    visibility.observe(hero)
    hero.addEventListener('mousemove', move)
    hero.addEventListener('mouseleave', leave)
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    resize()
    return () => {
      cancelAnimationFrame(frame)
      size.disconnect()
      visibility.disconnect()
      hero.removeEventListener('mousemove', move)
      hero.removeEventListener('mouseleave', leave)
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', sync)
      dispose()
    }
  }, [])
  return <canvas className="hero-shader" ref={root} aria-hidden="true" />
}
