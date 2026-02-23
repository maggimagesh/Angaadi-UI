import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { products, type Product } from '../data/products'
import { useCartStore } from '../store/cart'
import { useUIStore } from '../store/ui'
import { fetchProductsByCategory, type ProductItem } from '../api/products'
import { PaginationOld } from '../components/PaginationOld'
import { useImageFallback } from '../hooks/useImageFallback'
import LoadingSpinner from '../components/LoadingSpinner'
import { storeCategoryInfo } from '../utils/categoryStorage'
import { useStockUpdates, type StockUpdateEvent } from '../hooks/useStockUpdates'
import '../styles/products-listing-old.css'

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

// Map category slugs to API category IDs (numbers)
const categoryIdMap: Record<string, number> = {
  'mobiles-tablets': 1,
  'laptops-computers': 2,
  'tvs-appliances': 3,
  'audio-headphones': 4,
  'fashion-lifestyle': 5,
  'home-kitchen': 6,
  'beauty-personal-care': 7,
  'books-media': 8,
  'sports-fitness': 9,
  'grocery-gourmet': 10,
  'smartwatches': 11,
  'all': 0, // 0 or special value for "all" - adjust based on your API
}

// Helper function to convert API ProductItem to local Product type (extended with API fields)
function mapApiProductToLocal(apiProduct: ProductItem): Product & { discount?: number; reviewCount?: number; originalPrice?: number; description?: string; stockCount?: number } {
  // Convert string price to number
  const numericPrice = parseFloat(apiProduct.price) || 0
  const numericOldPrice = parseFloat(apiProduct.oldprice) || numericPrice
  const numericRating = parseFloat(apiProduct.starrating) || 0
  
  // Determine stock status from quantity
  const stockStatus: 'In Stock' | 'Out of Stock' = apiProduct.stock > 0 ? 'In Stock' : 'Out of Stock'
  
  return {
    id: apiProduct.id.toString(),
    title: apiProduct.productname,
    brand: apiProduct.brand,
    price: numericPrice,
    rating: numericRating,
    stock: stockStatus,
    image: apiProduct.imageurl,
    category: 'smartphone', // This will be inferred from category
    freeDelivery: apiProduct.freedelivery,
    // Include API-specific fields if available
    discount: apiProduct.discountpercent,
    reviewCount: apiProduct.ratingscount,
    originalPrice: numericOldPrice,
    description: apiProduct.description, // Include product description from API
    stockCount: apiProduct.stock, // Numeric stock count from API
  }
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

const ITEMS_PER_PAGE = 12

export default function ProductsListing() {
  const { handleImageError } = useImageFallback()
  const navigate = useNavigate()
  const addByProductId = useCartStore(s => s.addByProductId)
  const openSuccess = useUIStore(s => s.openSuccess)
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || 'all'
  const categoryIdParam = searchParams.get('categoryId')
  
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [totalProductsFromApi, setTotalProductsFromApi] = useState(0)
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating'>('relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minRating, setMinRating] = useState<number>(0)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false)
  const [wishlistedItems, setWishlistedItems] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch products from API when category changes
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true)
      setProductsError(null)
      
      // Use categoryId from URL if available, otherwise fallback to mapping or parsing
      const categoryId = categoryIdParam 
        ? parseInt(categoryIdParam, 10) 
        : categoryIdMap[categoryParam] !== undefined 
          ? categoryIdMap[categoryParam] 
          : parseInt(categoryParam, 10) || 1
      
      // Store categoryId and slug in localStorage for breadcrumb navigation
      storeCategoryInfo(categoryId, categoryParam)
      
      try {
        const response = await fetchProductsByCategory(categoryId, 1, 100) // Fetch more products for filtering
        
        if (response.error) {
          setProductsError(response.error.message)
          // Fallback to mock data
          const allowedCategories = categoryMap[categoryParam] || categoryMap['all']
          const mockProducts = products.filter(product => allowedCategories.includes(product.category))
          setAllProducts(mockProducts)
          setTotalProductsFromApi(mockProducts.length)
        } else if (response.data) {
          const apiProducts = response.data.products.map(mapApiProductToLocal)
          setAllProducts(apiProducts)
          setTotalProductsFromApi(response.data.total)
        }
      } catch (error) {
        setProductsError('Failed to load products')
        // Fallback to mock data
        const allowedCategories = categoryMap[categoryParam] || categoryMap['all']
        const mockProducts = products.filter(product => allowedCategories.includes(product.category))
        setAllProducts(mockProducts)
        setTotalProductsFromApi(mockProducts.length)
      } finally {
        setIsLoadingProducts(false)
      }
    }
    
    loadProducts()
  }, [categoryParam, categoryIdParam])

  // ── WebSocket: live stock updates ─────────────────────────────────
  const handleStockUpdate = useCallback((event: StockUpdateEvent) => {
    const updatedProduct = event.product
    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === String(updatedProduct.id)) {
          const newStock = Number(updatedProduct.stock) ?? 0
          return {
            ...p,
            stock: newStock > 0 ? 'In Stock' as const : 'Out of Stock' as const,
            stockCount: newStock,
          } as typeof p
        }
        return p
      })
    )
  }, [])

  useStockUpdates(handleStockUpdate)

  const getAllBrands = () => {
    const allBrands = new Set<string>()
    allProducts.forEach(product => allBrands.add(product.brand))
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
    let filtered = [...allProducts]
    
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

    // Apply free delivery filter
    if (freeDeliveryOnly) {
      filtered = filtered.filter(product => product.freeDelivery === true)
    }

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      if (sortBy === 'rating') return b.rating - a.rating
      return 0 // relevance (default order)
    })
    
    setFilteredProducts(sorted)
    setCurrentPage(1)
  }, [allProducts, sortBy, searchQuery, priceRange, selectedBrands, minRating, inStockOnly, freeDeliveryOnly])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const categoryName = categoryDisplayNames[categoryParam] || 'All Products'

  return (
    <main className="app-main products-listing-old-main">
      <div className="surface">
        <div className="container products-listing-old-container">
          {/* Breadcrumb */}
          <nav className="breadcrumb-old" aria-label="Breadcrumb">
            <ol>
              <li>
                <button onClick={() => navigate('/')} className="breadcrumb-old-link">
                  Home
                </button>
              </li>
              <li aria-current="page">{categoryName}</li>
            </ol>
          </nav>

          {/* Page Header with View Toggle */}
          <div className="products-listing-old-header">
            <div className="header-old-left">
              <h1 className="products-listing-old-title">{categoryName}</h1>
              <p className="products-listing-old-subtitle">
                {isLoadingProducts ? (
                  'Loading products...'
                ) : (
                  <>
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                    {totalProductsFromApi > 0 && filteredProducts.length < totalProductsFromApi && (
                      <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                        (filtered from {totalProductsFromApi} total)
                      </span>
                    )}
                  </>
                )}
              </p>
              {productsError && !isLoadingProducts && (
                <div 
                  style={{ 
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: 'var(--color-warning-container, #fff3cd)',
                    color: 'var(--color-warning, #856404)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>⚠️</span>
                  <span>Unable to load latest products. Showing sample products.</span>
                </div>
              )}
            </div>
            <div className="header-old-right">
              <div className="view-toggle-old">
                <button
                  className={`view-btn-old ${viewMode === 'grid' ? 'active' : ''}`}
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
                  className={`view-btn-old ${viewMode === 'list' ? 'active' : ''}`}
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
                className="sort-select-old"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Top Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="products-listing-old-layout">
            {/* Sidebar Filters */}
            <aside className="filters-sidebar-old">
              <div className="filters-header-old">
                <h2>Filters</h2>
                <button className="clear-filters-old" onClick={clearAllFilters}>Clear All</button>
              </div>

              {/* Search Filter */}
              <div className="filter-group-old">
                <h3 className="filter-title-old">Search Products</h3>
                <div className="search-input-wrapper-old">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-old"
                  />
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="filter-group-old">
                <h3 className="filter-title-old">Price Range</h3>
                <div className="dual-range-slider-old">
                  <div className="slider-track-old">
                    <div 
                      className="slider-range-old"
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
                    className="price-slider-old price-slider-old-min"
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
                    className="price-slider-old price-slider-old-max"
                  />
                </div>
                <div className="price-range-display-old">
                  <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
                  <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Brands Filter */}
              <div className="filter-group-old">
                <h3 className="filter-title-old">Brands</h3>
                <div className="checkbox-list-old">
                  {availableBrands.map(brand => (
                    <label key={brand} className="checkbox-label-old">
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
              <div className="filter-group-old">
                <h3 className="filter-title-old">Minimum Rating</h3>
                <div className="rating-options-old">
                  {[4, 3, 2, 1].map(rating => (
                    <label key={rating} className="radio-label-old">
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                      />
                      <span className="rating-stars-display-old">
                        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                      </span>
                      <span>& up</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Stock Filter */}
              <div className="filter-group-old">
                <label className="checkbox-label-old">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                  />
                  <span>In Stock Only</span>
                </label>
              </div>

              {/* Delivery Filter */}
              <div className="filter-group-old">
                <label className="checkbox-label-old">
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
            <div className="products-content-old">
              {isLoadingProducts ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '400px',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <LoadingSpinner size="large" text="Loading products..." />
                </div>
              ) : filteredProducts.length > 0 ? (
                <>
                  <div className={`products-grid-old ${viewMode}`}>
                    {currentProducts.map((product, index) => {
                    // For API products, check if they have discount/reviewCount, otherwise use mock data
                    const discount = (product as any).discount !== undefined 
                      ? (product as any).discount 
                      : getDiscountForProduct(product.id) || 0
                    const originalPrice = (product as any).originalPrice !== undefined
                      ? (product as any).originalPrice
                      : getOriginalPrice(product.price, discount)
                    const reviewCount = (product as any).reviewCount !== undefined
                      ? (product as any).reviewCount
                      : getReviewCount(product.id) || Math.floor(Math.random() * 3000) + 500
                    const isWishlisted = wishlistedItems.has(product.id)

                    return (
                      <article key={`${product.id}-${index}`} className="product-card-old">
                        {discount > 0 && (
                          <span className="discount-badge-old">{discount}% OFF</span>
                        )}
                        <button
                          className={`wishlist-btn-old ${isWishlisted ? 'active' : ''}`}
                          onClick={() => toggleWishlist(product.id)}
                          aria-label="Add to wishlist"
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 17.5s-7-4.5-7-9.5a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 5-7 9.5-7 9.5z"/>
                          </svg>
                        </button>

                        <figure 
                          className="product-image-old"
                          onClick={() => navigate(`/product/${categoryIdParam || categoryIdMap[categoryParam] || 1}/${product.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img
                            src={product.image}
                            data-fallback={fallbackImages[product.category]}
                            alt={product.title}
                            loading="lazy"
                            onError={handleImageError}
                          />
                          {product.stock === 'Out of Stock' && (
                            <div className="out-of-stock-overlay-old">
                              <span>Out of Stock</span>
                            </div>
                          )}
                        </figure>

                        <div className="product-info-old">
                          <h3 
                            className="product-name-old"
                            onClick={() => navigate(`/product/${categoryIdParam || categoryIdMap[categoryParam] || 1}/${product.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            {product.title}
                          </h3>
                          {(product as any).stockCount !== undefined && (
                            <p style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              margin: '0',
                              color: (product as any).stockCount > 0 ? '#2e7d32' : '#d32f2f',
                            }}>
                              {(product as any).stockCount > 0
                                ? `Available: ${(product as any).stockCount}`
                                : 'Out of Stock'}
                            </p>
                          )}
                          <p className="product-specs-old">
                            {(product as any).description || 
                              (product.category === 'smartphone' && `${product.brand === 'Apple' ? '256GB, Natural Titanium' : product.brand === 'Samsung' ? '512GB, S Pen Included' : 'Premium smartphone features'}`) ||
                              (product.category === 'laptop' && `${product.brand === 'Apple' ? '13-inch, M3 chip' : 'Intel Core i7, 16GB RAM'}`) ||
                              (product.category === 'tablet' && `${product.brand === 'Apple' ? '12.9-inch, M2 chip' : '12-inch display, S Pen'}`) ||
                              (product.category === 'earphones' && 'Noise cancellation, 30hr battery') ||
                              (product.category === 'tv' && '4K UHD, HDR10+, Smart TV') ||
                              (product.category === 'smartwatch' && 'GPS, Heart Rate, Water Resistant') ||
                              (product.category === 'fashion' && 'Premium quality, Latest fashion trends') ||
                              (product.category === 'home-kitchen' && 'Premium quality, Energy efficient') ||
                              (product.category === 'beauty' && 'Dermatologically tested, All skin types') ||
                              (product.category === 'books' && 'Bestseller, Paperback edition') ||
                              (product.category === 'sports' && 'Professional grade, Durable material') ||
                              (product.category === 'grocery' && 'Organic certified, Premium quality') ||
                              'Premium product'
                            }
                          </p>
                          
                          <div className="product-rating-old">
                            <span className="stars">{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}</span>
                            <span className="review-count-old">({reviewCount.toLocaleString('en-IN')})</span>
                          </div>

                          <div className="product-pricing-old">
                            <span className="current-price-old">₹{product.price.toLocaleString('en-IN')}</span>
                            {discount > 0 && (
                              <span className="original-price-old">₹{originalPrice.toLocaleString('en-IN')}</span>
                            )}
                          </div>

                            <button
                              className="btn btn-primary"
                              style={{ width: '100%' }}
                              disabled={product.stock === 'Out of Stock'}
                              aria-label={`Add ${product.title} to cart`}
                              onClick={() => {
                                const price = product.price
                                const oldPrice = (product as any).originalPrice || price
                                const discount = (product as any).discount
                                const pid = /^\d+$/.test(product.id) ? parseInt(product.id, 10) : Math.abs(product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) + 800000
                                void addByProductId(pid, 1, {
                                  name: product.title,
                                  brand: product.brand,
                                  image: product.image,
                                  price,
                                  oldPrice,
                                  discountPercent: discount,
                                })
                                openSuccess('Added to cart')
                              }}
                            >
                              Add to Cart
                            </button>
                        </div>
                      </article>
                    )
                  })}
                  </div>

                  {totalPages > 1 && (
                    <PaginationOld
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              ) : (
                <div className="products-empty-old">
                  {allProducts.length === 0 ? (
                    <>
                      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }}>
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                      </svg>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>No Products Available</h3>
                      <p style={{ color: '#666', marginBottom: '1.5rem' }}>There are currently no products in this category.</p>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/')}
                        style={{ padding: '0.75rem 2rem' }}
                      >
                        Browse Other Categories
                      </button>
                    </>
                  ) : (
                    <>
                      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                      </svg>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>No Products Match Your Filters</h3>
                      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Try adjusting your filters to see more results.</p>
                      <button className="btn btn-primary" onClick={clearAllFilters}>
                        Clear All Filters
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

