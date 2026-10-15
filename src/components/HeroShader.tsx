'use client'

/**
 * HeroShader — client port of `_legacy/src/scripts/hero-shader.js`.
 *
 * Renders the full-screen fixed `<canvas id="canvas">` WebGL2 background that
 * sits behind the whole landing (see the `#canvas` rule in globals.css), and
 * also drives a SECOND context on `<canvas id="thesisCanvas">` (rendered by
 * the article hero) using the exact same shader.
 *
 * The shader source, uniforms, geometry and mouse logic are a faithful 1:1 port
 * of the legacy script. On top of the legacy behaviour this component ADDS the
 * performance / accessibility guards the migration spec requires:
 *   - DPR cap at 1.5 in both resize paths.
 *   - IntersectionObserver so the About canvas only draws while on-screen.
 *   - visibilitychange pause/resume of the RAF loop when the tab is hidden.
 *   - prefers-reduced-motion: draw a single static frame, never start the loop.
 *   - WebGL2-unsupported fallback (sets a background colour), like the legacy.
 *   - Teardown on effect cleanup (cancelAnimationFrame, all listeners, observer
 *     disconnect) so React Strict Mode's double-invoke can't leak a second loop /
 *     duplicate listeners. The GL context is intentionally NOT lost in cleanup —
 *     the browser frees it when the <canvas> leaves the DOM; losing it during
 *     Strict Mode's fake unmount would break the remount's shader compile.
 *
 * The canvas is decorative: `aria-hidden`, behind content, pointer-events:none
 * (via CSS), so it stays invisible to assistive tech and the axe a11y gate.
 *
 * SSR: this is a client-only component; server output is just the empty
 * <canvas> element. WebGL only runs inside the effect after hydration.
 */

import { useEffect, useRef } from 'react'
import { vertSrc, fragSrc } from '@/lib/shaderSrc'

type ContextOptions = WebGLContextAttributes
const GL_OPTS: ContextOptions = {
  alpha: false,
  antialias: false,
  powerPreference: 'high-performance',
}

export default function HeroShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', GL_OPTS)

    if (!gl) {
      // WebGL2 unsupported — fall back to the flat page surface. (It used to be
      // the legacy teal, which belonged to the dark theme this page no longer has.)
      document.body.style.background = 'var(--color-surface-page, #ffffff)'
      console.warn('WebGL 2 not supported')
      return
    }

    // --- Shader / program helpers ---
    function createShader(ctx: WebGL2RenderingContext, type: number, src: string) {
      const s = ctx.createShader(type)!
      ctx.shaderSource(s, src)
      ctx.compileShader(s)
      if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) {
        console.error(ctx.getShaderInfoLog(s))
        ctx.deleteShader(s)
        return null
      }
      return s
    }

    // --- Hero context setup ---
    const vs = createShader(gl, gl.VERTEX_SHADER, vertSrc)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragSrc)
    if (!vs || !fs) {
      // Shader compile failed (e.g. a lost GL context). Degrade to the flat
      // page surface instead of throwing on attachShader(prog, null).
      document.body.style.background = 'var(--color-surface-page, #ffffff)'
      return
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uResolution = gl.getUniformLocation(prog, 'uResolution')
    const uMouse = gl.getUniformLocation(prog, 'uMouse')
    const uMouseActive = gl.getUniformLocation(prog, 'uMouseActive')
    // Hero draws in transparent mode (1.0). Set once — it's constant per program.
    gl.uniform1f(gl.getUniformLocation(prog, 'uAlphaMode'), 1.0)
    gl.uniform1f(gl.getUniformLocation(prog, 'uRays'), 1.0)
    gl.uniform1f(gl.getUniformLocation(prog, 'uDotCols'), 0.0) // 0 = shader default (200)

    const mouse = { x: 0.5, y: 0.5 }
    let mouseActive = 0.0
    let mouseTarget = 0.0

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth
      mouse.y = 1.0 - e.clientY / window.innerHeight
      mouseTarget = 1.0
    }
    const onMouseLeave = () => {
      mouseTarget = 0.0
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)

    function resize() {
      // DPR cap at 1.5 (perf guard added on top of the legacy behaviour).
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas!.width = window.innerWidth * dpr
      canvas!.height = window.innerHeight * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    window.addEventListener('resize', resize)
    resize()

    // --- Second canvas for About section (same shader) ---
    const thesisCanvas = document.getElementById('thesisCanvas') as HTMLCanvasElement | null
    const gl2 = thesisCanvas ? thesisCanvas.getContext('webgl2', GL_OPTS) : null

    let thesisProg: WebGLProgram | null = null
    let thesisUTime: WebGLUniformLocation | null = null
    let thesisURes: WebGLUniformLocation | null = null
    let thesisUMouse: WebGLUniformLocation | null = null
    let thesisUMouseActive: WebGLUniformLocation | null = null

    if (gl2) {
      const vs2 = gl2.createShader(gl2.VERTEX_SHADER)!
      gl2.shaderSource(vs2, vertSrc)
      gl2.compileShader(vs2)
      const fs2 = gl2.createShader(gl2.FRAGMENT_SHADER)!
      gl2.shaderSource(fs2, fragSrc)
      gl2.compileShader(fs2)
      thesisProg = gl2.createProgram()!
      gl2.attachShader(thesisProg, vs2)
      gl2.attachShader(thesisProg, fs2)
      gl2.linkProgram(thesisProg)
      gl2.useProgram(thesisProg)
      const buf2 = gl2.createBuffer()
      gl2.bindBuffer(gl2.ARRAY_BUFFER, buf2)
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl2.STATIC_DRAW)
      const aPos2 = gl2.getAttribLocation(thesisProg, 'a_pos')
      gl2.enableVertexAttribArray(aPos2)
      gl2.vertexAttribPointer(aPos2, 2, gl2.FLOAT, false, 0, 0)
      thesisUTime = gl2.getUniformLocation(thesisProg, 'uTime')
      thesisURes = gl2.getUniformLocation(thesisProg, 'uResolution')
      thesisUMouse = gl2.getUniformLocation(thesisProg, 'uMouse')
      thesisUMouseActive = gl2.getUniformLocation(thesisProg, 'uMouseActive')
      // Transparent mode (1.0): WHITE rays/dots on BLACK, screen-
      // blended over the hero-bg cloud image (see #thesisCanvas in globals.css).
      gl2.uniform1f(gl2.getUniformLocation(thesisProg, 'uAlphaMode'), 1.0)
      gl2.uniform1f(gl2.getUniformLocation(thesisProg, 'uRays'), 1.0)
      gl2.uniform1f(gl2.getUniformLocation(thesisProg, 'uDotCols'), 0.0)
    }

    function resizeAbout() {
      if (!gl2 || !thesisCanvas) return
      const rect = thesisCanvas.parentElement!.getBoundingClientRect()
      // DPR cap at 1.5 (perf guard added on top of the legacy behaviour).
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      thesisCanvas.width = rect.width * dpr
      thesisCanvas.height = rect.height * dpr
      thesisCanvas.style.width = rect.width + 'px'
      thesisCanvas.style.height = rect.height + 'px'
      gl2.viewport(0, 0, thesisCanvas.width, thesisCanvas.height)
    }
    window.addEventListener('resize', resizeAbout)
    resizeAbout()

    // --- Offscreen pause for the About canvas: only draw when scrolled away. ---
    // The legacy shader drew the About canvas on EVERY frame, unconditionally, so
    // the `backdrop-filter: blur(150px)` on `.thesis-card` / `.thesis-blur-overlay`
    // always had rich, animated shader texture to blur. Start `true` (and only let
    // the IntersectionObserver pause it once it has *proven* the canvas is fully
    // offscreen) so the blur never smears a flat, undrawn buffer — which reads as
    // "weak/flat" blur. With `alpha:false` an undrawn buffer is opaque black, and
    // blurring a solid colour produces no visible texture, hence the regression.
    let thesisVisible = true
    let thesisObserver: IntersectionObserver | null = null
    if (gl2 && thesisCanvas && typeof IntersectionObserver !== 'undefined') {
      thesisObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) thesisVisible = entry.isIntersecting
        },
        { threshold: 0 },
      )
      thesisObserver.observe(thesisCanvas)
    } else if (gl2 && thesisCanvas) {
      // No IO support — fall back to always drawing the thesis canvas.
      thesisVisible = true
    }

    // Draw a single frame at time `t`. Used by both the RAF loop and the
    // reduced-motion static draw.
    function drawFrame(t: number) {
      mouseActive += (mouseTarget - mouseActive) * 0.05

      // Hero canvas
      gl!.useProgram(prog)
      gl!.uniform1f(uTime, t)
      gl!.uniform2f(uResolution, canvas!.width, canvas!.height)
      gl!.uniform2f(uMouse, mouse.x, mouse.y)
      gl!.uniform1f(uMouseActive, mouseActive)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)

      // About canvas — skipped when offscreen.
      if (gl2 && thesisVisible) {
        gl2.useProgram(thesisProg)
        gl2.uniform1f(thesisUTime, t)
        gl2.uniform2f(thesisURes, thesisCanvas!.width, thesisCanvas!.height)
        gl2.uniform2f(thesisUMouse, mouse.x, mouse.y)
        gl2.uniform1f(thesisUMouseActive, mouseActive)
        gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4)
      }
    }

    // --- Reduced motion: draw one static frame, never start the loop. ---
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let rafId = 0
    let running = false

    function render(now: number) {
      rafId = requestAnimationFrame(render)
      drawFrame(now * 0.001)
    }

    function startLoop() {
      if (running) return
      running = true
      rafId = requestAnimationFrame(render)
    }
    function stopLoop() {
      running = false
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    // --- Tab pause: stop the loop when hidden, resume when visible. ---
    const onVisibilityChange = () => {
      if (reduceMotion) return
      if (document.hidden) {
        stopLoop()
      } else {
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    if (reduceMotion) {
      // One static frame of the shader at t=0 (not blank/black), no RAF loop.
      // When the thesis canvas isn't on-screen yet, still draw it once so it
      // isn't left blank.
      if (gl2 && thesisCanvas) thesisVisible = true
      drawFrame(0)
    } else {
      startLoop()
    }

    // --- Full teardown (Strict-Mode safe: no leaked loop/listeners/contexts). ---
    return () => {
      stopLoop()
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', resizeAbout)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (thesisObserver) thesisObserver.disconnect()
      // NOTE: intentionally do NOT call WEBGL_lose_context.loseContext() here.
      // React Strict Mode (dev) runs setup → cleanup → setup on the SAME <canvas>;
      // losing the context in cleanup left the remount holding a LOST context, so
      // compileShader failed (COMPILE_STATUS false, getShaderInfoLog → null) and the
      // subsequent attachShader(prog, null) threw. The browser releases the GL
      // context when the <canvas> is removed from the DOM (real unmount) — that is
      // the correct lifecycle point, so explicit teardown here is both unnecessary
      // and harmful. The RAF loop, listeners and observer ARE torn down above.
    }
  }, [])

  return <canvas id="canvas" aria-hidden="true" ref={canvasRef} />
}
