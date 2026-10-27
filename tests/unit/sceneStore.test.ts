// The room's scene: a page asks for one, and gives it back when it leaves —
// unless the next page has already asked for something else.
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { useSceneStore } from '../../src/vision/sceneStore.ts'

describe('scene store', () => {
  test('starts ambient and returns to it when the page releases its scene', () => {
    const store = useSceneStore.getState()
    assert.equal(store.spec.mode, 'ambient')
    const owner = store.claim({ mode: 'focus', kind: 'phone', variant: 1, side: 'right' }, 'dept-hero')
    assert.equal(useSceneStore.getState().spec.mode, 'focus')
    assert.equal(useSceneStore.getState().trackId, 'dept-hero')
    useSceneStore.getState().release(owner)
    assert.equal(useSceneStore.getState().spec.mode, 'ambient')
    assert.equal(useSceneStore.getState().trackId, null)
  })

  test('a late release from the old page does not undo the new page’s scene', () => {
    const first = useSceneStore.getState().claim({ mode: 'tour', stations: ['phone', 'laptop'] }, 'tour-track')
    const second = useSceneStore.getState().claim({ mode: 'focus', kind: 'tv', variant: 2, side: 'left' }, 'pdp-page')
    useSceneStore.getState().release(first)
    assert.equal(useSceneStore.getState().spec.mode, 'focus')
    useSceneStore.getState().release(second)
    assert.equal(useSceneStore.getState().spec.mode, 'ambient')
  })

  test('claiming a scene resets the tour station', () => {
    useSceneStore.getState().setStation(4)
    const owner = useSceneStore.getState().claim({ mode: 'tour', stations: ['phone'] }, 'tour-track')
    assert.equal(useSceneStore.getState().station, 0)
    useSceneStore.getState().release(owner)
  })
})
