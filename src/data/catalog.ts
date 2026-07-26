export type Department = {
  id: number
  /** Short label used on the header chip row. */
  chip?: string
  /** Full department name used in the mega-menu and the home grid. */
  name: string
  slug: string
  /** Local grayscale placeholder, used when the API has no image. */
  art: CatalogArt
  /** Sub-links, grouped as they appear in the mega-menu. */
  groups?: { label: string; items: string[] }[]
  brands?: string[]
}

export type CatalogArt =
  | 'smartphone'
  | 'laptop'
  | 'tv'
  | 'earphones'
  | 'smartwatch'
  | 'tablet'

export function artUrl(art: CatalogArt): string {
  return `/images/catalog/${art}.svg`
}

/** The five chips that live in the header's third row. */
export const HEADER_CATEGORIES = [
  { id: 1, name: 'Mobiles', slug: 'mobiles-tablets', testId: 'category-chip-Mobiles' },
  { id: 2, name: 'Laptops', slug: 'laptops-computers', testId: 'category-chip-Laptops' },
  { id: 3, name: 'Television', slug: 'tvs-appliances', testId: 'category-chip-Television' },
  { id: 6, name: 'Appliances', slug: 'home-kitchen', testId: 'category-chip-Appliances' },
  { id: 4, name: 'Accessories', slug: 'audio-headphones', testId: 'category-chip-Accessories' },
] as const

export const DEPARTMENTS: Department[] = [
  {
    id: 1,
    chip: 'Mobiles',
    name: 'Mobiles & Tablets',
    slug: 'mobiles-tablets',
    art: 'smartphone',
    brands: ['Samsung', 'Motorola', 'Nokia', 'Redmi', 'OnePlus'],
    groups: [
      { label: 'By use', items: ['5G phones', 'Camera-first', 'Gaming phones', 'Big battery', 'Under ₹15,000'] },
      { label: 'Tablets', items: ['Android tablets', 'Keyboard cases', 'Styluses', 'Kids tablets'] },
    ],
  },
  {
    id: 2,
    chip: 'Laptops',
    name: 'Laptops & Computers',
    slug: 'laptops-computers',
    art: 'laptop',
    brands: ['Acer', 'HP', 'Dell', 'Lenovo', 'Asus'],
    groups: [
      { label: 'By use', items: ['Thin & light', 'Gaming', 'Creator', 'Business', 'Under ₹40,000'] },
      { label: 'Add-ons', items: ['Docks', 'Monitors', 'Keyboards', 'Chargers'] },
    ],
  },
  {
    id: 3,
    chip: 'Television',
    name: 'TVs & Appliances',
    slug: 'tvs-appliances',
    art: 'tv',
    brands: ['Hisense', 'Samsung', 'LG', 'Redmi', 'Sony'],
    groups: [
      { label: 'By size', items: ['32-inch', '43-inch', '55-inch', '65-inch and up'] },
      { label: 'Around the TV', items: ['Soundbars', 'Wall mounts', 'Streaming sticks', 'HDMI cables'] },
    ],
  },
  {
    id: 4,
    chip: 'Accessories',
    name: 'Audio & Headphones',
    slug: 'audio-headphones',
    art: 'earphones',
    brands: ['boAt', 'Sony', 'JBL', 'Noise', 'Sennheiser'],
    groups: [
      { label: 'By type', items: ['True wireless', 'Over-ear', 'Neckband', 'Wired', 'Under ₹2,000'] },
      { label: 'For home', items: ['Soundbars', 'Bluetooth speakers', 'Party speakers'] },
    ],
  },
  {
    id: 6,
    chip: 'Appliances',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    art: 'tablet',
    brands: ['Philips', 'Prestige', 'Bajaj', 'Havells', 'Butterfly'],
    groups: [
      { label: 'Kitchen', items: ['Mixer grinders', 'Air fryers', 'Induction cooktops', 'Kettles'] },
      { label: 'Home', items: ['Vacuum cleaners', 'Air purifiers', 'Fans', 'Irons'] },
    ],
  },
  {
    id: 11,
    name: 'Wearables',
    slug: 'smartwatches',
    art: 'smartwatch',
    brands: ['Noise', 'boAt', 'Fire-Boltt', 'Amazfit', 'Apple'],
    groups: [
      { label: 'By use', items: ['Fitness tracking', 'Calling watches', 'Rugged', 'Under ₹3,000'] },
      { label: 'Bands', items: ['Silicone', 'Metal', 'Leather'] },
    ],
  },
]

/** Every department the catalogue knows about, including the ones without a chip. */
export const ALL_DEPARTMENT_COUNT = 14

const SLUG_TO_ART: Record<string, CatalogArt> = {
  'mobiles-tablets': 'smartphone',
  'laptops-computers': 'laptop',
  'tvs-appliances': 'tv',
  'audio-headphones': 'earphones',
  'home-kitchen': 'tablet',
  smartwatches: 'smartwatch',
  'fashion-lifestyle': 'tablet',
  'beauty-personal-care': 'tablet',
  'books-media': 'tablet',
  'sports-fitness': 'smartwatch',
  'grocery-gourmet': 'tablet',
}

const ID_TO_ART: Record<number, CatalogArt> = {
  1: 'smartphone',
  2: 'laptop',
  3: 'tv',
  4: 'earphones',
  6: 'tablet',
  11: 'smartwatch',
}

/**
 * Pick the placeholder that best matches a product, so a missing image still
 * lands in a well of roughly the right shape rather than a generic grey box.
 * Falls back on the product name when the category is unknown.
 */
export function placeholderFor(opts: {
  categoryId?: number | string | null
  slug?: string | null
  name?: string | null
}): string {
  const { categoryId, slug, name } = opts

  if (slug && SLUG_TO_ART[slug]) return artUrl(SLUG_TO_ART[slug])

  const numericId = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId
  if (numericId && ID_TO_ART[numericId]) return artUrl(ID_TO_ART[numericId])

  const haystack = (name || '').toLowerCase()
  if (/phone|galaxy|redmi|moto|iphone|5g/.test(haystack)) return artUrl('smartphone')
  if (/laptop|book|aspire|thinkpad|ryzen|core i/.test(haystack)) return artUrl('laptop')
  if (/tv|qled|oled|television/.test(haystack)) return artUrl('tv')
  if (/watch|band|colorfit|fit/.test(haystack)) return artUrl('smartwatch')
  if (/tab|ipad/.test(haystack)) return artUrl('tablet')
  if (/pod|buds|headphone|earphone|airdopes|audio|speaker/.test(haystack)) return artUrl('earphones')

  return artUrl('smartphone')
}

export function departmentBySlug(slug?: string | null): Department | undefined {
  return DEPARTMENTS.find((d) => d.slug === slug)
}

export function departmentById(id?: number | string | null): Department | undefined {
  const numeric = typeof id === 'string' ? parseInt(id, 10) : id
  return DEPARTMENTS.find((d) => d.id === numeric)
}

export function productsHref(id: number, slug: string): string {
  return `/products?categoryId=${id}&category=${slug}`
}
