import { ProductCard } from '../components/ProductCard'
import { products } from '../data/products'

export default function HomePage() {
  return (
    <main className="app-main" id="home-page" data-testid="home-page">
      <section className="container p-6">
        <div className="card p-6" role="region" aria-label="Hero banner" id="hero-banner" data-testid="hero-banner">
          <h1 id="hero-title" data-testid="hero-title">Deals for India</h1>
          <p className="mt-2" id="hero-subtitle" data-testid="hero-subtitle">Great prices and fast delivery across India.</p>
        </div>
        <div className="mt-6" id="featured-products-section" data-testid="featured-products-section">
          <h2 id="featured-products-title" data-testid="featured-products-title">Featured products</h2>
          <div className="grid grid-cols-3 mt-4" id="featured-products-grid" data-testid="featured-products-grid">
            {products.slice(0, 9).map(p => (
              <ProductCard key={p.id} id={p.id} title={p.title} price={p.price} image={p.image} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}


