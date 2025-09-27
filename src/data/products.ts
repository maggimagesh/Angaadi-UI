export type Product = {
  id: string
  title: string
  brand: string
  price: number
  rating: number
  stock: 'In Stock' | 'Out of Stock'
  image: string
  category: 'smartphone' | 'laptop' | 'tablet' | 'earphones' | 'tv' | 'smartwatch'
}

function categoryForIndex(idx: number): Product['category'] {
  const order: Product['category'][] = ['smartphone','laptop','tablet','earphones','tv','smartwatch']
  return order[idx % order.length]
}

export const products: Product[] = Array.from({ length: 30 }).map((_, idx) => {
  const idNum = 1001 + idx
  const category = categoryForIndex(idx)
  return {
    id: `prod-${idNum}`,
    title: idx % 2 === 0 ? `XPhone Pro ${12 + (idx % 4)} - 128GB` : `LapiBook ${13 + (idx % 3)} Ryzen 5`,
    brand: idx % 2 === 0 ? 'XBrand' : 'LapiBook',
    price: [34999, 52999, 5999, 42999, 7999, 1999][idx % 6],
    rating: [4.3, 4.5, 3.9, 4.1, 4.8][idx % 5],
    stock: idx % 11 === 0 ? 'Out of Stock' : 'In Stock',
    image: `/images/catalog/${category}.svg`,
    category,
  }
})


