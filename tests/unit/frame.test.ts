// Camera framing: whatever shape the scene window has, the stage must fit it.
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { CONTENT_HEIGHT, contentWidthFor, fitDistance } from '../../src/vision/frame.ts'

const FOV = 32

/** The box the camera actually sees at the stage's depth for a given distance. */
function visible(aspect: number, distance: number) {
  const h = 2 * distance * Math.tan((FOV * Math.PI) / 360)
  return { w: h * aspect, h }
}

describe('fitDistance', () => {
  for (const aspect of [0.5, 0.62, 0.8, 1, 1.25, 1.6, 2.2]) {
    test(`fits the stage at aspect ${aspect}`, () => {
      const v = visible(aspect, fitDistance(aspect, FOV, 1))
      assert.ok(v.h >= CONTENT_HEIGHT - 1e-9, 'height fits')
      assert.ok(v.w >= contentWidthFor(aspect) - 1e-9, 'width fits')
    })
  }

  test('a taller, narrower window sits further back than a wide one', () => {
    assert.ok(fitDistance(0.6, FOV) > fitDistance(1.6, FOV))
  })

  test('the width requirement eases between portrait and landscape', () => {
    assert.equal(contentWidthFor(0.5), 4.8)
    assert.equal(contentWidthFor(2), 6.9)
    const mid = contentWidthFor(1.15)
    assert.ok(mid > 4.8 && mid < 6.9)
  })
})
