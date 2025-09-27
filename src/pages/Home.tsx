import { ProductCard } from '../components/ProductCard'
import { products } from '../data/products'

export default function HomePage() {
  return (
    <main className="app-main">
      <section className="container p-6">
        <div className="card p-6" role="region" aria-label="Hero banner">
          <h1>Deals for India</h1>
          <p className="mt-2">Great prices and fast delivery across India.</p>
        </div>
        <div className="mt-6">
          <h2>Featured products</h2>
          <div className="grid grid-cols-3 mt-4">
            {products.slice(0, 9).map(p => (
              <ProductCard key={p.id} id={p.id} title={p.title} price={p.price} image={p.image} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}


