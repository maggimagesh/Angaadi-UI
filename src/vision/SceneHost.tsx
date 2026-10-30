import { useEffect, useRef } from 'react'
import { useTheme } from '../theme/useTheme'
import { useSceneStore } from './sceneStore'
import type { LandingStage, StagePalette } from './stage'

/* The one canvas behind the whole app. three.js is imported on demand, so it
   never weighs on first paint, and nothing depends on it: if WebGL is missing,
   the theme is not Vision, or anything throws, the canvas stays empty and the
   CSS room gradient underneath carries the page. */

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

export function SceneHost() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const enabled = theme === 'vision' || theme === 'studio'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !canvas || !hasWebGL()) return

    let disposed = false
    let cleanup = () => {}

    void import('./stage')
      .then(({ LandingStage }) => {
        if (disposed) return
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const store = useSceneStore
        const stage: LandingStage = new LandingStage({
          canvas,
          palette: readPalette(),
          scene: store.getState().spec,
          reducedMotion,
          onStation: (i) => store.getState().setStation(i),
        })

        const size = () => stage.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)
        const progress = () => {
          const doc = document.documentElement
          const page = doc.scrollHeight > window.innerHeight ? window.scrollY / (doc.scrollHeight - window.innerHeight) : 0
          const trackId = store.getState().trackId
          const track = trackId ? document.getElementById(trackId) : null
          let tour = 0
          if (track) {
            const rect = track.getBoundingClientRect()
            const range = rect.height - window.innerHeight
            tour = range > 0 ? -rect.top / range : rect.top < 0 ? 1 : 0
          }
          stage.setProgress(tour, page)
        }
        const pointer = (e: PointerEvent) => stage.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
        const visibility = () => stage.setVisible(!document.hidden)

        // a page asked for a different scene: swap it, then re-read the scroll position
        const unsubscribe = store.subscribe((state, prev) => {
          if (state.spec !== prev.spec || state.trackId !== prev.trackId) {
            stage.setScene(state.spec)
            requestAnimationFrame(progress)
          }
        })

        size()
        progress()
        window.addEventListener('resize', size)
        window.addEventListener('scroll', progress, { passive: true })
        window.addEventListener('pointermove', pointer, { passive: true })
        document.addEventListener('visibilitychange', visibility)

        // tokens change with light/dark: re-tint without rebuilding the models
        const watcher = new MutationObserver(() => stage.applyPalette(readPalette()))
        watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-theme'] })

        canvas.dataset.ready = 'true'
        document.documentElement.dataset.stage = 'ready'
        cleanup = () => {
          unsubscribe()
          watcher.disconnect()
          window.removeEventListener('resize', size)
          window.removeEventListener('scroll', progress)
          window.removeEventListener('pointermove', pointer)
          document.removeEventListener('visibilitychange', visibility)
          delete canvas.dataset.ready
          delete document.documentElement.dataset.stage
          stage.dispose()
        }
      })
      .catch(() => {
        // WebGL context lost or the chunk failed to load: the CSS room remains.
      })

    return () => {
      disposed = true
      cleanup()
    }
  }, [enabled])

  if (!enabled) return null
  return <canvas ref={canvasRef} className="vr-stage" aria-hidden="true" data-testid="vr-stage" />
}
