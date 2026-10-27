import { buildHeadphones, buildLaptop, buildPhone, buildTablet, buildTv, buildWatch } from './electronics'
import { buildBeauty, buildBooks, buildFashion, buildGrocery, buildKitchen, buildSports } from './lifestyle'
import { MODEL_STYLES, type BuiltModel } from './helpers'

export { MODEL_STYLES } from './helpers'
export type { BuiltModel, ModelStyle } from './helpers'

export type ModelKind =
  | 'phone'
  | 'laptop'
  | 'tv'
  | 'headphones'
  | 'watch'
  | 'tablet'
  | 'kitchen'
  | 'fashion'
  | 'beauty'
  | 'books'
  | 'sports'
  | 'grocery'

export const MODEL_KINDS: ModelKind[] = ['phone', 'laptop', 'tv', 'headphones', 'watch', 'tablet', 'kitchen', 'fashion', 'beauty', 'books', 'sports', 'grocery']

const BUILDERS = {
  phone: buildPhone,
  laptop: buildLaptop,
  tv: buildTv,
  headphones: buildHeadphones,
  watch: buildWatch,
  tablet: buildTablet,
  kitchen: buildKitchen,
  fashion: buildFashion,
  beauty: buildBeauty,
  books: buildBooks,
  sports: buildSports,
  grocery: buildGrocery,
} as const

/** Builds one product model in colourway `variant` (0–3). */
export function buildModel(kind: ModelKind, variant = 0): BuiltModel {
  return BUILDERS[kind](MODEL_STYLES[((variant % MODEL_STYLES.length) + MODEL_STYLES.length) % MODEL_STYLES.length])
}
