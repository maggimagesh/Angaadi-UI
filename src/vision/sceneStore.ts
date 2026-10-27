import { useEffect } from 'react'
import { create } from 'zustand'
import type { SceneSpec } from './stage'

/* Which 3D scene the room is showing. Pages call useScene() to ask for one;
   when the page goes away the room falls back to ambient, unless the next page
   has already asked for something else (so a route change never flashes). */

type SceneState = {
  spec: SceneSpec
  /** id of the tall element whose scroll range drives the scene, if any. */
  trackId: string | null
  /** the tour station the camera is on. */
  station: number
  owner: number
  claim: (spec: SceneSpec, trackId: string | null) => number
  release: (owner: number) => void
  setStation: (index: number) => void
}

const AMBIENT: SceneSpec = { mode: 'ambient' }
let nextOwner = 1

export const useSceneStore = create<SceneState>((set, get) => ({
  spec: AMBIENT,
  trackId: null,
  station: 0,
  owner: 0,
  claim: (spec, trackId) => {
    const owner = nextOwner++
    set({ spec, trackId, owner, station: 0 })
    return owner
  },
  release: (owner) => {
    if (get().owner === owner) set({ spec: AMBIENT, trackId: null, owner: 0 })
  },
  setStation: (station) => set({ station }),
}))

/** Asks for a scene while the calling page is mounted. */
export function useScene(spec: SceneSpec, trackId: string | null = null): void {
  const key = JSON.stringify(spec)
  useEffect(() => {
    const owner = useSceneStore.getState().claim(JSON.parse(key) as SceneSpec, trackId)
    return () => useSceneStore.getState().release(owner)
  }, [key, trackId])
}
