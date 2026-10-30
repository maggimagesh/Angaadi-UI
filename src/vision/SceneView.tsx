import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../theme/useTheme'
import type { LandingStage, SceneSpec, StagePalette } from './stage'

/* A 3D product shot in its own window, placed in the page like any other block.

   It sits in the normal flow, so it scrolls with the page, never hides behind
   content and always has its own shape — the camera fits that shape (frame.ts).
   three.js loads on demand, only once the window is near the screen, and the
   still image inside it stands in until (or unless) the 3D is ready: with no
   WebGL, with reduced data, or in a theme that has no 3D at all. */

type Props = {
  scene: SceneSpec
  /** the still shown until the 3D is ready, or when it cannot run */
  still: string
  /**
   * What drives the turn and the camera:
   *   an element id  – scroll through that tall element (a pinned track)
   *   'page'         – scroll through the whole page
   *   'window'       – the window passing through the viewport (default)
   */
  track?: string | 'page' | 'window'
  className?: string
  label: string
  onStation?: (index: number) => void
}

function readPalette(): StagePalette {
  const css = getComputedStyle(document.documentElement)
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    glowA: get('--vr-glow-a', '#7b6cff'),
    glowB: get('--vr-glow-b', '#3fd2ff'),
    glowC: get('--vr-glow-c', '#ff5fd2'),
    dust: get('--vr-dust', '#b9b3ff'),
    room: parseFloat(get('--vr-room', '1')) || 0,
    look: get('--vr-look', 'neon') === 'studio' ? 'studio' : 'neon',
    bgTop: get('--vr-stage-top', '#14134a'),
    bgMid: get('--vr-stage-mid', '#262470'),
    bgBottom: get('--vr-stage-bottom', '#07081f'),
  }
}

function hasWebGL(): boolean {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

export function SceneView({ scene, still, track = 'window', className = '', label, onStation }: Props) {
  const { theme } = useTheme()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<LandingStage | null>(null)
  const onStationRef = useRef(onStation)
  onStationRef.current = onStation
  const [ready, setReady] = useState(false)
  const enabled = (theme === 'vision' || theme === 'studio') && typeof window !== 'undefined'
  const sceneKey = JSON.stringify(scene)
  const sceneRef = useRef(scene)
  sceneRef.current = scene

  // the 3D itself: created when the window nears the screen, torn down with it
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!enabled || !wrap || !canvas || !hasWebGL()) return

    let disposed = false
    let started = false
    let cleanup = () => {}

    const progress = () => {
      const stage = stageRef.current
      if (!stage) return
      const vh = window.innerHeight
      let p = 0
      const trackEl = track !== 'page' && track !== 'window' ? document.getElementById(track) : null
      if (trackEl) {
        const rect = trackEl.getBoundingClientRect()
        const range = rect.height - vh
        p = range > 0 ? -rect.top / range : 0
      } else if (track === 'page') {
        // a long page: turn about a third of a turn from top to bottom
        const doc = document.documentElement
        p = (doc.scrollHeight > vh ? window.scrollY / (doc.scrollHeight - vh) : 0) * 0.45
      } else {
        // the window passing through the screen: front-on when it is centred, turning a little either way
        const rect = wrap.getBoundingClientRect()
        p = (1 - rect.bottom / (vh + rect.height) - 0.5) * 0.8
      }
      stage.setProgress(p)
    }

    const start = () => {
      if (started) return
      started = true
      void import('./stage')
        .then(({ LandingStage }) => {
          if (disposed) return
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          const stage = new LandingStage({
            canvas,
            palette: readPalette(),
            scene: sceneRef.current,
            reducedMotion,
            onStation: (i) => onStationRef.current?.(i),
          })
          stageRef.current = stage

          const size = () => {
            const r = wrap.getBoundingClientRect()
            stage.resize(r.width, r.height, window.devicePixelRatio || 1)
          }
          size()
          progress()
          const resizeObserver = new ResizeObserver(size)
          resizeObserver.observe(wrap)

          // parallax from the pointer over the window; drag turns the product
          let dragging = false
          let lastX = 0
          const move = (e: PointerEvent) => {
            const r = wrap.getBoundingClientRect()
            if (e.pointerType === 'mouse') stage.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
            if (dragging) {
              stage.dragBy((e.clientX - lastX) * 0.012)
              lastX = e.clientX
            }
          }
          const down = (e: PointerEvent) => {
            dragging = true
            lastX = e.clientX
            canvas.classList.add('is-dragging')
            if (e.pointerType === 'mouse') canvas.setPointerCapture(e.pointerId)
          }
          const up = () => {
            if (!dragging) return
            dragging = false
            canvas.classList.remove('is-dragging')
            stage.dragEnd()
          }
          const leave = () => stage.setPointer(0, 0)
          canvas.addEventListener('pointermove', move)
          canvas.addEventListener('pointerdown', down)
          canvas.addEventListener('pointerup', up)
          canvas.addEventListener('pointercancel', up)
          canvas.addEventListener('pointerleave', leave)

          // renders only while the window is on screen
          const visibility = new IntersectionObserver(([entry]) => stage.setVisible(entry.isIntersecting && !document.hidden), { rootMargin: '80px' })
          visibility.observe(wrap)
          const onVisibility = () => stage.setVisible(!document.hidden)
          document.addEventListener('visibilitychange', onVisibility)

          window.addEventListener('scroll', progress, { passive: true })
          // tokens change with light/dark: re-tint without rebuilding the page
          const watcher = new MutationObserver(() => stage.applyPalette(readPalette()))
          watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-theme'] })

          setReady(true)
          cleanup = () => {
            setReady(false)
            watcher.disconnect()
            resizeObserver.disconnect()
            visibility.disconnect()
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('scroll', progress)
            canvas.removeEventListener('pointermove', move)
            canvas.removeEventListener('pointerdown', down)
            canvas.removeEventListener('pointerup', up)
            canvas.removeEventListener('pointercancel', up)
            canvas.removeEventListener('pointerleave', leave)
            stage.dispose()
            stageRef.current = null
          }
        })
        .catch(() => {
          // WebGL context lost or the chunk failed to load: the still remains
        })
    }

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start()
          near.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    near.observe(wrap)

    return () => {
      disposed = true
      near.disconnect()
      cleanup()
    }
  }, [enabled, track])

  // a different scene in the same window (a department changes, say)
  useEffect(() => {
    stageRef.current?.setScene(JSON.parse(sceneKey) as SceneSpec)
  }, [sceneKey])

  return (
    <div ref={wrapRef} className={`scene-view ${className}`.trim()} data-ready={ready ? 'true' : 'false'} role="img" aria-label={label}>
      <img className="scene-still" src={still} alt="" />
      {enabled ? <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" /> : null}
      <span className="scene-frame" aria-hidden="true" />
    </div>
  )
}
