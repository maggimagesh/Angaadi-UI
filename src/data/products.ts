import { artVariantUrl, type CatalogArt } from './catalog'

export type Product = {
  id: string
  title: string
  brand: string
  price: number
  rating: number
  stock: 'In Stock' | 'Out of Stock'
  image: string
  category: 'smartphone' | 'laptop' | 'tablet' | 'earphones' | 'tv' | 'smartwatch' | 'fashion' | 'home-kitchen' | 'beauty' | 'books' | 'sports' | 'grocery'
  freeDelivery: boolean
}

function categoryForIndex(idx: number): Product['category'] {
  if (idx < 35) return 'smartphone'
  if (idx < 60) return 'tablet'
  
  const order: Product['category'][] = [
    'laptop', 'earphones', 'tv', 'smartwatch',
    'fashion', 'home-kitchen', 'beauty', 'books', 'sports', 'grocery'
  ]
  return order[(idx - 60) % order.length]
}

const CATEGORY_ART: Record<Product['category'], CatalogArt> = {
  smartphone: 'smartphone',
  laptop: 'laptop',
  tablet: 'tablet',
  earphones: 'earphones',
  tv: 'tv',
  smartwatch: 'smartwatch',
  fashion: 'fashion',
  'home-kitchen': 'kitchen',
  beauty: 'beauty',
  books: 'books',
  sports: 'sports',
  grocery: 'grocery',
}

export const products: Product[] = Array.from({ length: 90 }).map((_, idx) => {
  const idNum = 1001 + idx
  const category = categoryForIndex(idx)
  
  // Product titles based on category
  const titles: Record<Product['category'], string[]> = {
    smartphone: [
      'iPhone 15 Pro Max',
      'Samsung Galaxy S24 Ultra',
      'OnePlus 12',
      'Google Pixel 8 Pro',
      'Xiaomi 14 Ultra',
      'iPhone 15 Pro',
      'Samsung Galaxy S24+',
      'OnePlus 12R',
      'Google Pixel 8',
      'Xiaomi 14 Pro',
      'iPhone 15',
      'Samsung Galaxy S24',
      'OnePlus 11',
      'Google Pixel 7 Pro',
      'Xiaomi 13T Pro',
      'iPhone 14 Pro Max',
      'Samsung Galaxy S23 Ultra',
      'OnePlus Nord 3',
      'Google Pixel 7a',
      'Xiaomi 13 Pro',
      'iPhone 14 Pro',
      'Samsung Galaxy Z Fold 5',
      'OnePlus Open',
      'Google Pixel Fold',
      'Xiaomi Mix Fold 3',
      'iPhone 14',
      'Samsung Galaxy Z Flip 5',
      'OnePlus Nord CE 3',
      'Google Pixel 6 Pro',
      'Xiaomi 12T Pro',
      'Motorola Edge 40 Pro',
      'Vivo X90 Pro',
      'Oppo Find X6 Pro',
      'Realme GT 3',
      'Nothing Phone (2)'
    ],
    laptop: [
      'MacBook Air M3',
      'Dell XPS 13 Plus',
      'HP Spectre x360',
      'Lenovo ThinkPad X1',
      'ASUS ZenBook 14'
    ],
    tablet: [
      'iPad Pro 12.9"',
      'Samsung Galaxy Tab S9',
      'Microsoft Surface Pro 9',
      'iPad Air',
      'OnePlus Pad',
      'iPad Pro 11"',
      'Samsung Galaxy Tab S9+',
      'Microsoft Surface Go 3',
      'iPad 10th Gen',
      'Samsung Galaxy Tab S9 Ultra',
      'iPad Mini 6th Gen',
      'Samsung Galaxy Tab A9+',
      'Microsoft Surface Pro 8',
      'Lenovo Tab P12 Pro',
      'Xiaomi Pad 6 Pro',
      'Samsung Galaxy Tab S8',
      'Realme Pad 2',
      'Oppo Pad 2',
      'Xiaomi Pad 5 Pro',
      'Lenovo Tab M11',
      'Samsung Galaxy Tab A8',
      'Huawei MatePad Pro',
      'Amazon Fire HD 10',
      'Nokia T20',
      'Lenovo Yoga Tab 13'
    ],
    earphones: [
      'Sony WH-1000XM5',
      'AirPods Pro',
      'Bose QuietComfort',
      'Sennheiser Momentum',
      'JBL Live 660NC'
    ],
    tv: [
      'Samsung Neo QLED 55"',
      'LG OLED C3 65"',
      'Sony Bravia X90L',
      'TCL Mini LED 55"',
      'Mi QLED TV 55"'
    ],
    smartwatch: [
      'Apple Watch Series 9',
      'Samsung Galaxy Watch 6',
      'Garmin Fenix 7',
      'Fitbit Sense 2',
      'Amazfit GTR 4'
    ],
    fashion: [
      'Levi\'s 501 Original Jeans',
      'Nike Air Force 1',
      'Zara Floral Summer Dress',
      'Adidas Originals Hoodie',
      'Ray-Ban Aviator Sunglasses'
    ],
    'home-kitchen': [
      'KitchenAid Stand Mixer',
      'Dyson V15 Vacuum Cleaner',
      'Nespresso Coffee Machine',
      'Le Creuset Dutch Oven',
      'Instant Pot Duo 7-in-1'
    ],
    beauty: [
      'Dyson Airwrap Styler',
      'Fenty Beauty Foundation',
      'The Ordinary Skincare Set',
      'MAC Ruby Woo Lipstick',
      'Philips Sonicare Toothbrush'
    ],
    books: [
      'Atomic Habits by James Clear',
      'The Psychology of Money',
      'Sapiens by Yuval Noah Harari',
      'Think and Grow Rich',
      'The Alchemist by Paulo Coelho'
    ],
    sports: [
      'Nike Yoga Mat Pro',
      'Bowflex Adjustable Dumbbell',
      'Yonex Badminton Racket',
      'Wilson Tennis Balls Set',
      'Adidas Training Resistance Bands'
    ],
    grocery: [
      'Organic Quinoa 1kg',
      'Extra Virgin Olive Oil',
      'Himalayan Pink Salt',
      'Green Tea 100 Bags',
      'Almond Butter Organic'
    ]
  }
  
  const brands: Record<Product['category'], string[]> = {
    smartphone: ['Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Motorola', 'Vivo', 'Oppo', 'Realme', 'Nothing'],
    laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS'],
    tablet: ['Apple', 'Samsung', 'Microsoft', 'Apple', 'OnePlus', 'Apple', 'Samsung', 'Microsoft', 'Apple', 'Samsung', 'Apple', 'Samsung', 'Microsoft', 'Lenovo', 'Xiaomi', 'Samsung', 'Realme', 'Oppo', 'Xiaomi', 'Lenovo', 'Samsung', 'Huawei', 'Amazon', 'Nokia', 'Lenovo'],
    earphones: ['Sony', 'Apple', 'Bose', 'Sennheiser', 'JBL'],
    tv: ['Samsung', 'LG', 'Sony', 'TCL', 'Xiaomi'],
    smartwatch: ['Apple', 'Samsung', 'Garmin', 'Fitbit', 'Amazfit'],
    fashion: ['Levi\'s', 'Nike', 'Zara', 'Adidas', 'Ray-Ban'],
    'home-kitchen': ['KitchenAid', 'Dyson', 'Nespresso', 'Le Creuset', 'Instant Pot'],
    beauty: ['Dyson', 'Fenty Beauty', 'The Ordinary', 'MAC', 'Philips'],
    books: ['Penguin', 'HarperCollins', 'Random House', 'Simon & Schuster', 'Hay House'],
    sports: ['Nike', 'Bowflex', 'Yonex', 'Wilson', 'Adidas'],
    grocery: ['Organic India', 'Borges', 'Tata Salt', 'Lipton', 'Alpino']
  }
  
  const categoryTitles = titles[category]
  const categoryBrands = brands[category]
  const titleIndex = idx % categoryTitles.length
  
  // Local Vision-theme renders, one colourway per title so a row never repeats.
  const art = CATEGORY_ART[category]
  
  const priceRanges = {
    smartphone: [34999, 52999, 42999, 64999, 99999, 29999, 44999, 37999, 49999, 89999, 32999, 59999, 39999, 69999, 79999, 119999, 109999, 24999, 22999, 54999],
    tablet: [34999, 52999, 42999, 64999, 19999, 29999, 39999, 24999, 79999, 89999, 14999, 44999, 49999, 32999, 37999, 59999, 16999, 18999, 27999, 54999]
  }
  
  const getPriceForCategory = (cat: Product['category'], index: number): number => {
    if (cat === 'smartphone') return priceRanges.smartphone[index % priceRanges.smartphone.length]
    if (cat === 'tablet') return priceRanges.tablet[index % priceRanges.tablet.length]
    return [34999, 52999, 5999, 42999, 7999, 1999, 64999, 99999, 19999, 29999][index % 10]
  }

  return {
    id: `prod-${idNum}`,
    title: categoryTitles[titleIndex],
    brand: categoryBrands[titleIndex],
    price: getPriceForCategory(category, idx),
    rating: [4.3, 4.5, 3.9, 4.1, 4.8, 4.6, 4.2, 4.7, 4.4, 3.8, 4.0, 4.9, 3.7, 4.4, 4.6][idx % 15],
    stock: idx % 13 === 0 ? 'Out of Stock' : 'In Stock',
    // read at use, not at import, so the render set follows the current theme
    get image() {
      return artVariantUrl(art, titleIndex)
    },
    category,
    freeDelivery: idx % 3 !== 0,
  }
})


