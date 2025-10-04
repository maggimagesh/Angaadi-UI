import { useEffect, useState, type SyntheticEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { products, type Product } from '../data/products'
import '../styles/products-listing.css'

const categoryMap: Record<string, Product['category'][]> = {
  'mobiles-tablets': ['smartphone', 'tablet'],
  'laptops-computers': ['laptop'],
  'tvs-appliances': ['tv'],
  'audio-headphones': ['earphones'],
  'fashion-lifestyle': ['fashion'],
  'home-kitchen': ['home-kitchen'],
  'beauty-personal-care': ['beauty'],
  'books-media': ['books'],
  'sports-fitness': ['sports'],
  'grocery-gourmet': ['grocery'],
  'smartwatches': ['smartwatch'],
  'all': ['smartphone', 'laptop', 'tablet', 'earphones', 'tv', 'smartwatch', 'fashion', 'home-kitchen', 'beauty', 'books', 'sports', 'grocery'],
}

const categoryDisplayNames: Record<string, string> = {
  'mobiles-tablets': 'Mobiles & Tablets',
  'laptops-computers': 'Laptops & Computers',
  'tvs-appliances': 'TVs & Appliances',
  'audio-headphones': 'Audio & Headphones',
  'fashion-lifestyle': 'Fashion & Lifestyle',
  'home-kitchen': 'Home & Kitchen',
  'beauty-personal-care': 'Beauty & Personal Care',
  'books-media': 'Books & Media',
  'sports-fitness': 'Sports & Fitness',
  'grocery-gourmet': 'Grocery & Gourmet',
  'smartwatches': 'Smartwatches',
  'all': 'All Products',
}

// Mock discount data for products
const getDiscountForProduct = (productId: string): number => {
  const discounts: Record<string, number> = {
    'prod-1001': 16, 'prod-1002': 8, 'prod-1003': 7, 'prod-1004': 15,
    'prod-1005': 8, 'prod-1006': 16, 'prod-1007': 10, 'prod-1008': 12,
  }
  return discounts[productId] || 0
}

const getOriginalPrice = (currentPrice: number, discount: number): number => {
  if (discount === 0) return currentPrice
  return Math.round(currentPrice / (1 - discount / 100))
}

const getReviewCount = (productId: string): number => {
  const reviews: Record<string, number> = {
    'prod-1001': 2847, 'prod-1002': 1923, 'prod-1003': 1458, 'prod-1004': 876,
    'prod-1005': 634, 'prod-1006': 3246, 'prod-1007': 1532, 'prod-1008': 2103,
  }
  return reviews[productId] || Math.floor(Math.random() * 3000) + 500
}

export default function ProductsListing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || 'all'
  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating'>('relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minRating, setMinRating] = useState<number>(0)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false)
  const [wishlistedItems, setWishlistedItems] = useState<Set<string>>(new Set())

  const getAllBrands = () => {
    const allBrands = new Set<string>()
    const allowedCategories = categoryMap[categoryParam] || categoryMap['all']
    products
      .filter(product => allowedCategories.includes(product.category))
      .forEach(product => allBrands.add(product.brand))
    return Array.from(allBrands).sort()
  }

  const availableBrands = getAllBrands()

  // Fallback images by category
  const fallbackImages: Record<Product['category'], string> = {
    smartphone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80',
    laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80',
    tablet: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80',
    earphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80',
    smartwatch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    fashion: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80',
    'home-kitchen': 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=500&q=80',
    beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80',
    books: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80',
    sports: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80',
    grocery: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80'
  }

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>, category: Product['category']) => {
    const img = event.currentTarget
    if (img.src !== fallbackImages[category]) {
      img.src = fallbackImages[category]
    }
  }

  const toggleWishlist = (productId: string) => {
    setWishlistedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    )
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setPriceRange([0, 200000])
    setSelectedBrands([])
    setMinRating(0)
    setInStockOnly(false)
    setFreeDeliveryOnly(false)
  }

  useEffect(() => {
    const allowedCategories = categoryMap[categoryParam] || categoryMap['all']
    let filtered = products.filter(product => allowedCategories.includes(product.category))
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply price range filter
    filtered = filtered.filter(product => 
      product.price >= priceRange[0] && product.price <= priceRange[1]
    )

    // Apply brand filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        selectedBrands.includes(product.brand)
      )
    }

    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter(product => product.rating >= minRating)
    }

    // Apply stock filter
    if (inStockOnly) {
      filtered = filtered.filter(product => product.stock === 'In Stock')
    }

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      if (sortBy === 'rating') return b.rating - a.rating
      return 0 // relevance (default order)
    })
    
    setFilteredProducts(sorted)
  }, [categoryParam, sortBy, searchQuery, priceRange, selectedBrands, minRating, inStockOnly, freeDeliveryOnly])

  const categoryName = categoryDisplayNames[categoryParam] || 'All Products'

  return (
    <main className="app-main products-listing-main">
      <div className="surface">
        <div className="container products-listing-container">
          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <button onClick={() => navigate('/')} className="breadcrumb-link">
                  Home
                </button>
              </li>
              <li aria-current="page">{categoryName}</li>
            </ol>
          </nav>

          {/* Page Header with View Toggle */}
          <div className="products-listing-header">
            <div className="header-left">
              <h1 className="products-listing-title">{categoryName}</h1>
              <p className="products-listing-subtitle">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </p>
            </div>
            <div className="header-right">
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="2" y="2" width="6" height="6" rx="1"/>
                    <rect x="12" y="2" width="6" height="6" rx="1"/>
                    <rect x="2" y="12" width="6" height="6" rx="1"/>
                    <rect x="12" y="12" width="6" height="6" rx="1"/>
                  </svg>
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="2" y="3" width="16" height="2" rx="1"/>
                    <rect x="2" y="9" width="16" height="2" rx="1"/>
                    <rect x="2" y="15" width="16" height="2" rx="1"/>
                  </svg>
                </button>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="sort-select"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Top Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="products-listing-layout">
            {/* Sidebar Filters */}
            <aside className="filters-sidebar">
              <div className="filters-header">
                <h2>Filters</h2>
                <button className="clear-filters" onClick={clearAllFilters}>Clear All</button>
              </div>

              {/* Search Filter */}
              <div className="filter-group">
                <h3 className="filter-title">Search Products</h3>
                <div className="search-input-wrapper">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="filter-group">
                <h3 className="filter-title">Price Range</h3>
                <div className="dual-range-slider">
                  <div className="slider-track">
                    <div 
                      className="slider-range"
                      style={{
                        left: `${(priceRange[0] / 200000) * 100}%`,
                        right: `${100 - (priceRange[1] / 200000) * 100}%`
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200000"
                    step="1000"
                    value={priceRange[0]}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value < priceRange[1]) {
                        setPriceRange([value, priceRange[1]])
                      }
                    }}
                    className="price-slider price-slider-min"
                  />
                  <input
                    type="range"
                    min="0"
                    max="200000"
                    step="1000"
                    value={priceRange[1]}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value > priceRange[0]) {
                        setPriceRange([priceRange[0], value])
                      }
                    }}
                    className="price-slider price-slider-max"
                  />
                </div>
                <div className="price-range-display">
                  <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
                  <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Brands Filter */}
              <div className="filter-group">
                <h3 className="filter-title">Brands</h3>
                <div className="checkbox-list">
                  {availableBrands.map(brand => (
                    <label key={brand} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                      />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="filter-group">
                <h3 className="filter-title">Minimum Rating</h3>
                <div className="rating-options">
                  {[4, 3, 2, 1].map(rating => (
                    <label key={rating} className="radio-label">
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                      />
                      <span className="rating-stars-display">
                        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                      </span>
                      <span>& up</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Stock Filter */}
              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                  />
                  <span>In Stock Only</span>
                </label>
              </div>

              {/* Delivery Filter */}
              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={freeDeliveryOnly}
                    onChange={(e) => setFreeDeliveryOnly(e.target.checked)}
                  />
                  <span>Free Delivery</span>
                </label>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="products-content">
              {filteredProducts.length > 0 ? (
                <div className={`products-grid ${viewMode}`}>
                  {filteredProducts.map((product) => {
                    const discount = getDiscountForProduct(product.id)
                    const originalPrice = getOriginalPrice(product.price, discount)
                    const reviewCount = getReviewCount(product.id)
                    const isWishlisted = wishlistedItems.has(product.id)

                    return (
                      <article key={product.id} className="product-card">
                        {discount > 0 && (
                          <span className="discount-badge">{discount}% OFF</span>
                        )}
                        <button
                          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
                          onClick={() => toggleWishlist(product.id)}
                          aria-label="Add to wishlist"
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 17.5s-7-4.5-7-9.5a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 5-7 9.5-7 9.5z"/>
                          </svg>
                        </button>

                        <figure className="product-image">
                          <img
                            src={product.image}
                            alt={product.title}
                            loading="lazy"
                            onError={(e) => handleImageError(e, product.category)}
                          />
                          {product.stock === 'Out of Stock' && (
                            <div className="out-of-stock-overlay">
                              <span>Out of Stock</span>
                            </div>
                          )}
                        </figure>

                        <div className="product-info">
                          <h3 className="product-name">{product.title}</h3>
                          <p className="product-specs">
                            {product.category === 'smartphone' && `${product.brand === 'Apple' ? '256GB, Natural Titanium' : product.brand === 'Samsung' ? '512GB, S Pen Included' : 'Premium smartphone features'}`}
                            {product.category === 'laptop' && `${product.brand === 'Apple' ? '13-inch, M3 chip' : 'Intel Core i7, 16GB RAM'}`}
                            {product.category === 'tablet' && `${product.brand === 'Apple' ? '12.9-inch, M2 chip' : '12-inch display, S Pen'}`}
                            {product.category === 'earphones' && 'Noise cancellation, 30hr battery'}
                            {product.category === 'tv' && '4K UHD, HDR10+, Smart TV'}
                            {product.category === 'smartwatch' && 'GPS, Heart Rate, Water Resistant'}
                            {product.category === 'fashion' && 'Premium quality, Latest fashion trends'}
                            {product.category === 'home-kitchen' && 'Premium quality, Energy efficient'}
                            {product.category === 'beauty' && 'Dermatologically tested, All skin types'}
                            {product.category === 'books' && 'Bestseller, Paperback edition'}
                            {product.category === 'sports' && 'Professional grade, Durable material'}
                            {product.category === 'grocery' && 'Organic certified, Premium quality'}
                          </p>
                          
                          <div className="product-rating">
                            <span className="stars">{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}</span>
                            <span className="review-count">({reviewCount.toLocaleString('en-IN')})</span>
                          </div>

                          <div className="product-pricing">
                            <span className="current-price">₹{product.price.toLocaleString('en-IN')}</span>
                            {discount > 0 && (
                              <span className="original-price">₹{originalPrice.toLocaleString('en-IN')}</span>
                            )}
                          </div>

                          <button
                            className={`add-to-cart-btn ${product.stock === 'Out of Stock' ? 'disabled' : ''}`}
                            disabled={product.stock === 'Out of Stock'}
                            aria-label={`Add ${product.title} to cart`}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="products-empty">
                  <p>No products found matching your filters.</p>
                  <button className="btn btn-primary" onClick={clearAllFilters}>
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

