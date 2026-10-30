/* Camera framing for a scene window of any shape.

   The old room filled the whole screen, so narrow screens cropped the product.
   Now each scene lives in its own window, and the camera is placed so the
   product and its plinth always fit that window, whatever its aspect ratio. */

/** The width of the stage (in world units) that must stay visible at a given aspect ratio. */
export function contentWidthFor(aspect: number): number {
  if (aspect >= 1.5) return 6.9
  if (aspect <= 0.8) return 4.8
  // between portrait and landscape: ease from one to the other
  const t = (aspect - 0.8) / (1.5 - 0.8)
  return 4.8 + (6.9 - 4.8) * t
}

/** The height of the stage that must stay visible: the product, its plinth and some air. */
export const CONTENT_HEIGHT = 4.9

/** How far back the camera sits so a CONTENT_HEIGHT × contentWidthFor(aspect) box fills the view. */
export function fitDistance(aspect: number, fovDegrees: number, margin = 1.04): number {
  const half = Math.tan((fovDegrees * Math.PI) / 360)
  const byHeight = CONTENT_HEIGHT / 2 / half
  const byWidth = contentWidthFor(aspect) / 2 / (half * aspect)
  return Math.max(byHeight, byWidth) * margin
}
