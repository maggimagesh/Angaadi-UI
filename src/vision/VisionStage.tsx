import { useEffect, useRef } from 'react'
import { useTheme } from '../theme/useTheme'
import type { StagePalette } from './stage'
import type { ModelKind } from './models'

/* The fixed WebGL canvas behind the landing page. three.js is imported on
   demand, so it never weighs on any other route, and the page works without it:
   if WebGL is missing, the theme is not Vision, or anything throws, the canvas
   simply stays empty and the CSS room gradient underneath carries the page. */

type Props = {
  stations: ModelKind[]
  /** id of the tall element whose scroll range drives the product tour. */
  trackId: string
  onStation: (index: number) => void
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

export function VisionStage({ stations, trackId, onStation }: Props) {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const onStationRef = useRef(onStation)
  onStationRef.current = onStation
  const enabled = theme === 'vision'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !canvas || !hasWebGL()) return

    let disposed = false
    let cleanup = () => {}

    void import('./stage')
      .then(({ LandingStage }) => {
        if (disposed) return
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const stage = new LandingStage({
          canvas,
          palette: readPalette(),
          stations,
          reducedMotion,
          onStation: (i) => onStationRef.current(i),
        })

        const size = () => stage.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)
        const progress = () => {
          const track = document.getElementById(trackId)
          const doc = document.documentElement
          const page = doc.scrollHeight > window.innerHeight ? window.scrollY / (doc.scrollHeight - window.innerHeight) : 0
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
  }, [enabled, stations, trackId])

  if (!enabled) return null
  return <canvas ref={canvasRef} className="vr-stage" aria-hidden="true" data-testid="vr-stage" />
}
