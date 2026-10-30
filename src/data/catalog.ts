import type { ModelKind } from '../vision/models'

export type Department = {
  id: number
  /** Short label used on the header chip row. */
  chip?: string
  /** Full department name used in the mega-menu and the home grid. */
  name: string
  slug: string
  /** Local fallback photo, used when the API has no image. */
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
  | 'kitchen'
  | 'fashion'
  | 'beauty'
  | 'books'
  | 'sports'
  | 'grocery'

/** Every art slot, in the order the landing page lays them out. */
export const CATALOG_ARTS: readonly CatalogArt[] = [
  'smartphone', 'laptop', 'tv', 'earphones', 'smartwatch', 'tablet',
  'kitchen', 'fashion', 'beauty', 'books', 'sports', 'grocery',
]

/** Square colourway variants (1-4) rendered for each art slot. */
export function artVariantUrl(art: CatalogArt, variant: number): string {
  const n = ((Math.floor(variant) % 4) + 4) % 4 + 1
  return `/images/${artSet()}/${art}-${n}.jpg`
}

/**
 * Two sets of renders: neon stills for Vision and matte studio shots for the
 * Studio theme. The set follows the theme on <html>, read at call time; the app
 * re-mounts its pages when the theme changes so every image picks it up.
 */
export function artSet(): 'catalog' | 'studio' {
  if (typeof document === 'undefined') return 'catalog'
  const root = document.documentElement
  // data-theme-target leads data-theme during a theme switch (see useTheme.commit)
  return (root.getAttribute('data-theme-target') ?? root.getAttribute('data-theme')) === 'studio' ? 'studio' : 'catalog'
}

/** The 3D model that stands for a department's art slot. */
export function modelKindFor(art: CatalogArt): ModelKind {
  if (art === 'smartphone') return 'phone'
  if (art === 'earphones') return 'headphones'
  if (art === 'smartwatch') return 'watch'
  return art
}

export function artUrl(art: CatalogArt): string {
  return `/images/${artSet()}/${art}.jpg`
}

/** The five chips that live in the header's third row. */
export const HEADER_CATEGORIES = [
  { id: 1, name: 'Mobiles', slug: 'mobiles-tablets', testId: 'category-chip-Mobiles' },
  { id: 2, name: 'Laptops', slug: 'laptops-computers', testId: 'category-chip-Laptops' },
  { id: 9, name: 'Television', slug: 'tvs-appliances', testId: 'category-chip-Television' },
  { id: 4, name: 'Appliances', slug: 'home-kitchen', testId: 'category-chip-Appliances' },
  { id: 10, name: 'Accessories', slug: 'audio-headphones', testId: 'category-chip-Accessories' },
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
    id: 9,
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
    id: 10,
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
    id: 4,
    chip: 'Appliances',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    art: 'kitchen',
    brands: ['Philips', 'Prestige', 'Bajaj', 'Havells', 'Butterfly'],
    groups: [
      { label: 'Kitchen', items: ['Mixer grinders', 'Air fryers', 'Induction cooktops', 'Kettles'] },
      { label: 'Home', items: ['Vacuum cleaners', 'Air purifiers', 'Fans', 'Irons'] },
    ],
  },
  {
    id: 3,
    name: 'Fashion & Lifestyle',
    slug: 'fashion-lifestyle',
    art: 'fashion',
    brands: ['Levi\'s', 'Puma', 'Fastrack', 'Ray-Ban', 'Wildcraft'],
    groups: [
      { label: 'Wear', items: ['Shirts', 'Jeans', 'Sneakers', 'Jackets'] },
      { label: 'Carry', items: ['Backpacks', 'Wallets', 'Sunglasses', 'Watches'] },
    ],
  },
  {
    id: 5,
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    art: 'beauty',
    brands: ['Lakme', 'Nivea', 'Philips', 'Dove', 'Maybelline'],
    groups: [
      { label: 'Skin & hair', items: ['Skincare', 'Haircare', 'Fragrance', 'Makeup'] },
      { label: 'Grooming', items: ['Trimmers', 'Shavers', 'Dryers'] },
    ],
  },
  {
    id: 6,
    name: 'Books & Media',
    slug: 'books-media',
    art: 'books',
    brands: ['Penguin', 'HarperCollins', 'Scholastic', 'Kindle'],
    groups: [
      { label: 'Read', items: ['Fiction', 'Non-fiction', 'Comics', 'Exam prep'] },
      { label: 'Devices', items: ['E-readers', 'Book lights'] },
    ],
  },
  {
    id: 7,
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    art: 'sports',
    brands: ['Decathlon', 'Nivia', 'Cosco', 'Boldfit', 'Yonex'],
    groups: [
      { label: 'Train', items: ['Dumbbells', 'Yoga mats', 'Resistance bands', 'Skipping ropes'] },
      { label: 'Play', items: ['Cricket', 'Football', 'Badminton'] },
    ],
  },
  {
    id: 8,
    name: 'Grocery & Gourmet',
    slug: 'grocery-gourmet',
    art: 'grocery',
    brands: ['Tata', 'Amul', 'Nestle', 'Organic India', 'Fortune'],
    groups: [
      { label: 'Pantry', items: ['Oils & ghee', 'Spices', 'Tea & coffee', 'Dry fruits'] },
      { label: 'Gourmet', items: ['Preserves', 'Honey', 'Snacks'] },
    ],
  },
]

/** Every department the catalogue knows about, including the ones without a chip. */
export const ALL_DEPARTMENT_COUNT = 10

const SLUG_TO_ART: Record<string, CatalogArt> = Object.fromEntries(DEPARTMENTS.map((d) => [d.slug, d.art]))

const ID_TO_ART: Record<number, CatalogArt> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.art]))

/**
 * Slugs the app has linked to in the past. They keep resolving, but to the live
 * department rather than to whatever number they used to carry.
 */
export const LEGACY_SLUGS: Record<string, string> = {
  smartwatches: 'mobiles-tablets',
  // the slugs the catalogue API itself uses for the same departments
  'mobiles-and-tablets': 'mobiles-tablets',
  'laptops-and-computers': 'laptops-computers',
  'fashion-and-lifestyle': 'fashion-lifestyle',
  'home-and-kitchen': 'home-kitchen',
  'beauty-and-personalcare': 'beauty-personal-care',
  'books-and-media': 'books-media',
  'sports-and-fitness': 'sports-fitness',
  'grocery-and-gourmet': 'grocery-gourmet',
  'tv-and-appliances': 'tvs-appliances',
  'audioand-headphones': 'audio-headphones',
}

/** The department a listing URL names. The slug wins over a stale numeric id. */
export function resolveDepartment(slug?: string | null, id?: number | string | null): Department | undefined {
  const bySlug = slug ? departmentBySlug(LEGACY_SLUGS[slug] ?? slug) : undefined
  return bySlug ?? departmentById(id)
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
  if (/laptop|macbook|notebook|aspire|thinkpad|ryzen|core i/.test(haystack)) return artUrl('laptop')
  if (/tv|qled|oled|television/.test(haystack)) return artUrl('tv')
  if (/watch|band|colorfit|fit/.test(haystack)) return artUrl('smartwatch')
  if (/tab|ipad/.test(haystack)) return artUrl('tablet')
  if (/kettle|mixer|fryer|cooker|kitchen|fan\b|iron\b/.test(haystack)) return artUrl('kitchen')
  if (/shirt|shoe|sunglass|dress|jean|sneaker|bag/.test(haystack)) return artUrl('fashion')
  if (/perfume|lipstick|cream|serum|shampoo/.test(haystack)) return artUrl('beauty')
  if (/book|novel|paperback/.test(haystack)) return artUrl('books')
  if (/dumbbell|yoga|football|cricket|gym/.test(haystack)) return artUrl('sports')
  if (/pod|buds|headphone|earphone|airdopes|audio|speaker/.test(haystack)) return artUrl('earphones')

  return artUrl('smartphone')
}

/** The department render for a live category name, e.g. "Beauty & Personal Care". */
export function artForName(name: string): string {
  const known = DEPARTMENTS.find((d) => d.name.toLowerCase() === name.toLowerCase())
  return known ? artUrl(known.art) : placeholderFor({ name })
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
