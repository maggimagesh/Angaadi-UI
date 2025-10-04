export type Product = {
  id: string
  title: string
  brand: string
  price: number
  rating: number
  stock: 'In Stock' | 'Out of Stock'
  image: string
  category: 'smartphone' | 'laptop' | 'tablet' | 'earphones' | 'tv' | 'smartwatch' | 'fashion' | 'home-kitchen' | 'beauty' | 'books' | 'sports' | 'grocery'
}

function categoryForIndex(idx: number): Product['category'] {
  const order: Product['category'][] = [
    'smartphone', 'laptop', 'tablet', 'earphones', 'tv', 'smartwatch',
    'fashion', 'home-kitchen', 'beauty', 'books', 'sports', 'grocery'
  ]
  return order[idx % order.length]
}

export const products: Product[] = Array.from({ length: 60 }).map((_, idx) => {
  const idNum = 1001 + idx
  const category = categoryForIndex(idx)
  
  // Product titles based on category
  const titles: Record<Product['category'], string[]> = {
    smartphone: [
      'iPhone 15 Pro Max',
      'Samsung Galaxy S24 Ultra',
      'OnePlus 12',
      'Google Pixel 8 Pro',
      'Xiaomi 14 Ultra'
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
      'OnePlus Pad'
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
    smartphone: ['Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi'],
    laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS'],
    tablet: ['Apple', 'Samsung', 'Microsoft', 'Apple', 'OnePlus'],
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
  
  // High-quality Unsplash image URLs for each category
  const unsplashImages: Record<Product['category'], string[]> = {
    smartphone: [
      'https://images.unsplash.com/photo-1592286927505-683ed6f8b552?w=500&q=80', // iPhone
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80', // Samsung
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80', // Phone
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&q=80', // Google Pixel
      'https://images.unsplash.com/photo-1598965675045-f28e1e5e4b15?w=500&q=80', // Xiaomi
    ],
    laptop: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80', // MacBook
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80', // Laptop
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80', // Dell
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500&q=80', // Laptop
      'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=500&q=80', // Laptop
    ],
    tablet: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80', // iPad
      'https://images.unsplash.com/photo-1585790050230-5dd28404f1e9?w=500&q=80', // Tablet
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500&q=80', // iPad
      'https://images.unsplash.com/photo-1585241936939-be4099591252?w=500&q=80', // Tablet
      'https://images.unsplash.com/photo-1611532736570-0bfb8a6a82c6?w=500&q=80', // Tablet
    ],
    earphones: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', // Headphones
      'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=500&q=80', // AirPods
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&q=80', // Headphones
      'https://images.unsplash.com/photo-1545127398-14699f92334b?w=500&q=80', // Headphones
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80', // Earphones
    ],
    tv: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80', // TV
      'https://images.unsplash.com/photo-1593359863503-f598eb40a992?w=500&q=80', // TV
      'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&q=80', // TV
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80', // TV
      'https://images.unsplash.com/photo-1571863533956-01c88e79957e?w=500&q=80', // TV
    ],
    smartwatch: [
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&q=80', // Apple Watch
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80', // Watch
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&q=80', // Watch
      'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=500&q=80', // Watch
      'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=500&q=80', // Watch
    ],
    fashion: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80', // Jeans
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80', // Nike Shoes
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80', // Dress
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80', // Hoodie
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80', // Sunglasses
    ],
    'home-kitchen': [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=500&q=80', // Mixer
      'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&q=80', // Vacuum
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&q=80', // Coffee Machine
      'https://images.unsplash.com/photo-1584990347449-7dd5f6f0ee3a?w=500&q=80', // Cookware
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80', // Instant Pot
    ],
    beauty: [
      'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=500&q=80', // Hair Dryer
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80', // Makeup
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80', // Skincare
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&q=80', // Lipstick
      'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500&q=80', // Toothbrush
    ],
    books: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80', // Books
      'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=500&q=80', // Book
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&q=80', // Books
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500&q=80', // Book
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&q=80', // Book
    ],
    sports: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80', // Yoga Mat
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80', // Dumbbells
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&q=80', // Badminton
      'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=500&q=80', // Tennis
      'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500&q=80', // Resistance Bands
    ],
    grocery: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80', // Quinoa
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80', // Olive Oil
      'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=500&q=80', // Salt
      'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=500&q=80', // Tea
      'https://images.unsplash.com/photo-1508997449629-303059a039c0?w=500&q=80', // Almond Butter
    ]
  }
  
  const categoryImages = unsplashImages[category]
  
  return {
    id: `prod-${idNum}`,
    title: categoryTitles[titleIndex],
    brand: categoryBrands[titleIndex],
    price: [34999, 52999, 5999, 42999, 7999, 1999, 64999, 99999, 19999, 29999][idx % 10],
    rating: [4.3, 4.5, 3.9, 4.1, 4.8, 4.6, 4.2, 4.7, 4.4, 3.8][idx % 10],
    stock: idx % 11 === 0 ? 'Out of Stock' : 'In Stock',
    image: categoryImages[titleIndex],
    category,
  }
})


