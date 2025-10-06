import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchProductById } from '../api/products'
import { mockReviews, mockQnA, mockRatingDistribution } from '../data/mockData'
import { useImageFallback } from '../hooks/useImageFallback'
import LoadingSpinner from '../components/LoadingSpinner'
import { storeCategoryInfo, getCategoryInfo } from '../utils/categoryStorage'
import '../styles/product-details.css'

interface ProductDetails {
  id: number
  categoryid: number
  productname: string
  description: string
  imageurl: string
  badge: string
  price: string
  oldprice: string
  ratingscount: number
  starrating: string
  brand: string
  stock: number
  slug: string
  discountpercent: number
  freedelivery: boolean
  isactive: boolean
  created_at: string
  updated_at: string
  productdetails: string
  keyfeatures: {
    "Key Features": string[]
  }
  categories: {
    id: number
    categoryname: string
    description: string
    created_at: string
    slug: string
    badge: string
    imageurl: string
    displayorder: number
    isactive: boolean
    icon: string | null
    productcount: number
    updated_at: string
    isActive: number
  }
  specifications: Array<{
    id: string
    productid: number
    screensize: string
    ram: string
    battery: string
    operating_system: string
    waterresistance: string
    storage: string
    camera: string
    processor: string
    displaytype: string
    connectivity: string
    created_at: string
    updated_at: string
  }>
}

const ProductDetails = () => {
  const { categoryId, productId } = useParams<{ categoryId: string; productId: string }>()
  const navigate = useNavigate()
  const { handleImageError } = useImageFallback()
  
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedStorage, setSelectedStorage] = useState('256GB')
  const [selectedColor, setSelectedColor] = useState('Natural Titanium')
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'details' | 'specifications' | 'reviews' | 'qa'>('details')
  const [wishlisted, setWishlisted] = useState(false)

  // Fallback image for products without images
  const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
  
  /**
   * Get product images from API
   * Currently supports single image from product.imageurl
   * 
   * Future Enhancement: If API provides multiple images (e.g., product.images array),
   * this function can be extended to return all available images:
   * - if (product.images && product.images.length > 0) return product.images
   * 
   * @returns Array of image URLs (always returns array for consistent UI handling)
   */
  const getProductImages = () => {
    if (!product) return [FALLBACK_PRODUCT_IMAGE]
    
    // TODO: If API supports multiple images, handle here
    // Example: if (product.images?.length > 0) return product.images
    
    // Check if product has a valid image URL
    if (product.imageurl && product.imageurl.trim() !== '') {
      return [product.imageurl]
    }
    
    // Return fallback if no image available
    return [FALLBACK_PRODUCT_IMAGE]
  }
  
  const productImages = getProductImages()

  // Storage options with pricing
  const storageOptions = [
    { value: '256GB', price: 0 },
    { value: '512GB', price: 20000 },
    { value: '1TB', price: 40000 }
  ]

  // Color options
  const colorOptions = [
    { value: 'Natural Titanium', color: '#8E8E93' },
    { value: 'Blue Titanium', color: '#007AFF' },
    { value: 'White Titanium', color: '#F2F2F7' },
    { value: 'Black Titanium', color: '#1C1C1E' }
  ]

  // Technical specifications from API (with defensive checks)
  const getSpecifications = () => {
    if (!product || !product.specifications || product.specifications.length === 0) {
      return []
    }
    
    const spec = product.specifications[0] // Get first specification object
    const specs = []
    
    // Only add specifications that have values
    if (spec.screensize) specs.push({ label: 'Screen Size', value: spec.screensize })
    if (spec.ram) specs.push({ label: 'RAM', value: `${spec.ram}GB` })
    if (spec.battery) specs.push({ label: 'Battery', value: spec.battery })
    if (spec.operating_system) specs.push({ label: 'Operating System', value: spec.operating_system })
    if (spec.waterresistance) specs.push({ label: 'Water Resistance', value: spec.waterresistance })
    if (selectedStorage) specs.push({ label: 'Storage', value: selectedStorage })
    if (spec.camera) specs.push({ label: 'Camera', value: spec.camera })
    if (spec.processor) specs.push({ label: 'Processor', value: spec.processor })
    if (spec.displaytype) specs.push({ label: 'Display Type', value: spec.displaytype })
    if (spec.connectivity) specs.push({ label: 'Connectivity', value: spec.connectivity })
    
    return specs
  }

  useEffect(() => {
    const loadProduct = async () => {
      if (!categoryId || !productId) {
        setError('Invalid product parameters')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetchProductById(categoryId, productId)
        
        if (response.error) {
          setError(response.error.message)
        } else if (response.data) {
          // The API response structure matches our interface directly
          const productData = response.data as ProductDetails
          setProduct(productData)
          
          // Store categoryId and slug in localStorage for breadcrumb navigation
          storeCategoryInfo(
            productData.categoryid || parseInt(categoryId, 10),
            productData.categories?.slug
          )
        }
      } catch (err) {
        setError('Failed to load product details')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [categoryId, productId])

  const handleAddToCart = () => {
    // TODO: Implement add to cart functionality
    console.log('Add to cart:', { product, selectedStorage, selectedColor, quantity })
  }

  const handleBuyNow = () => {
    // TODO: Implement buy now functionality
    console.log('Buy now:', { product, selectedStorage, selectedColor, quantity })
  }

  const toggleWishlist = () => {
    setWishlisted(!wishlisted)
  }

  const getCurrentPrice = () => {
    if (!product || !product.price) return 0
    const storagePrice = storageOptions.find(s => s.value === selectedStorage)?.price || 0
    const price = parseFloat(product.price)
    return isNaN(price) ? 0 : price + storagePrice
  }

  const getSavings = () => {
    if (!product || !product.oldprice) return 0
    const oldPrice = parseFloat(product.oldprice)
    const currentPrice = getCurrentPrice()
    if (isNaN(oldPrice) || oldPrice <= currentPrice) return 0
    return oldPrice - currentPrice
  }

  const getDiscountPercentage = () => {
    if (!product) return 0
    return product.discountpercent || 0
  }
  
  // Safe rating getter
  const getRating = () => {
    if (!product || !product.starrating) return 0
    const rating = parseFloat(product.starrating)
    return isNaN(rating) ? 0 : rating
  }
  
  // Safe ratings count getter
  const getRatingsCount = () => {
    if (!product || !product.ratingscount) return 0
    return typeof product.ratingscount === 'number' ? product.ratingscount : 0
  }

  if (loading) {
    return (
      <main className="app-main product-details-main">
        <div className="surface">
          <div className="container product-details-page">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '400px',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <LoadingSpinner size="large" text="Loading product details..." />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="app-main product-details-main">
        <div className="surface">
          <div className="container product-details-page">
            <div className="error-state">
              {/* Product Not Found Icon */}
              <svg 
                width="120" 
                height="120" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1" 
                style={{ margin: '0 auto 1.5rem', opacity: 0.3, display: 'block' }}
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: '600', color: '#1e293b' }}>
                {!product ? 'Product Not Available' : 'Unable to Load Product'}
              </h2>
              
              <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.6' }}>
                {error || 'The product you are looking for could not be found or is currently unavailable. It may have been removed or the product ID is invalid.'}
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    const categoryInfo = getCategoryInfo()
                    if (categoryInfo && categoryInfo.categorySlug) {
                      navigate(`/products?categoryId=${categoryInfo.categoryId}&category=${categoryInfo.categorySlug}`)
                    } else {
                      navigate('/products')
                    }
                  }}
                  style={{ padding: '0.75rem 2rem' }}
                >
                  Back to Products
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => navigate('/')}
                  style={{ padding: '0.75rem 2rem' }}
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="app-main product-details-main">
      <div className="surface">
        <div className="container product-details-page">
          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <button onClick={() => navigate('/')} className="breadcrumb-link">
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    const categoryInfo = getCategoryInfo()
                    if (categoryInfo && categoryInfo.categorySlug) {
                      navigate(`/products?categoryId=${categoryInfo.categoryId}&category=${categoryInfo.categorySlug}`)
                    } else {
                      navigate('/products')
                    }
                  }} 
                  className="breadcrumb-link"
                >
                  Products
                </button>
              </li>
              <li aria-current="page">{product.productname}</li>
            </ol>
          </nav>

          <div className="product-details-layout">
            {/* Product Images */}
            <div className="product-images">
              <div className="main-image-container">
                {getDiscountPercentage() > 0 && (
                  <span className="discount-badge">{getDiscountPercentage()}% OFF</span>
                )}
                <img
                  src={productImages[selectedImageIndex]}
                  alt={product.productname || 'Product'}
                  onError={handleImageError}
                  className="main-image"
                />
                {/* Only show navigation buttons if multiple images */}
                {productImages.length > 1 && (
                  <>
                    <button 
                      className="image-nav-btn prev"
                      onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                      disabled={selectedImageIndex === 0}
                    >
                      ‹
                    </button>
                    <button 
                      className="image-nav-btn next"
                      onClick={() => setSelectedImageIndex(Math.min(productImages.length - 1, selectedImageIndex + 1))}
                      disabled={selectedImageIndex === productImages.length - 1}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
              {/* Only show thumbnail gallery if multiple images */}
              {productImages.length > 1 && (
                <div className="thumbnail-gallery">
                  {productImages.map((image, index) => (
                    <button
                      key={index}
                      className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img src={image} alt={`${product.productname || 'Product'} view ${index + 1}`} onError={handleImageError} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="product-info">
              {/* Product Tags */}
              <div className="product-tags">
                <span className="tag">Apple</span>
                <span className="tag">Premium</span>
                <span className="tag">Latest</span>
                <span className="tag">5G</span>
              </div>

              {/* Product Name */}
              <h1 className="product-name">{product.productname || 'Product'}</h1>
              {product.description && (
                <p className="product-specs">
                  {product.description}
                </p>
              )}

              {/* Rating and Reviews - Only show if rating data exists */}
              {getRating() > 0 && (
                <div className="product-rating">
                  <div className="stars">
                    {'★'.repeat(Math.floor(getRating()))}
                    {'☆'.repeat(5 - Math.floor(getRating()))}
                  </div>
                  <span className="rating-number">
                    {getRating().toFixed(1)}
                  </span>
                  {getRatingsCount() > 0 && (
                    <span className="review-count">
                      ({getRatingsCount().toLocaleString('en-IN')} reviews)
                    </span>
                  )}
                  <button className="wishlist-btn" onClick={toggleWishlist}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 17.5s-7-4.5-7-9.5a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 5-7 9.5-7 9.5z"/>
                    </svg>
                  </button>
                  <button className="share-btn">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 1 0-2.977-2.63l-4.94 2.47a3 3 0 1 0 0 4.319l4.94 2.47a3 3 0 1 0 .895-1.789l-4.94-2.47a3.03 3.03 0 0 0 0-.74l4.94-2.47C13.456 7.68 14.19 8 15 8Z"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Pricing - Only show if price exists */}
              {getCurrentPrice() > 0 && (
                <div className="product-pricing">
                  <span className="current-price">₹{getCurrentPrice().toLocaleString('en-IN')}</span>
                  {getSavings() > 0 && (
                    <>
                      <span className="original-price">₹{(getCurrentPrice() + getSavings()).toLocaleString('en-IN')}</span>
                      <span className="savings">Save ₹{getSavings().toLocaleString('en-IN')}</span>
                    </>
                  )}
                  <div className="tax-info">Inclusive of all taxes</div>
                </div>
              )}

              {/* Storage Options */}
              <div className="option-group">
                <h3>Storage</h3>
                <div className="option-buttons">
                  {storageOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`option-btn ${selectedStorage === option.value ? 'selected' : ''}`}
                      onClick={() => setSelectedStorage(option.value)}
                    >
                      {option.value}
                      {option.price > 0 && <span>+₹{option.price.toLocaleString('en-IN')}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Options */}
              <div className="option-group">
                <h3>Color</h3>
                <div className="option-buttons">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`option-btn ${selectedColor === option.value ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(option.value)}
                    >
                      {option.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity and Stock */}
              <div className="quantity-stock">
                <div className="quantity-selector">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
                {product.stock !== undefined && product.stock > 0 && (
                  <span className="in-stock">✓ In Stock</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button 
                  className="btn btn-primary add-to-cart"
                  onClick={handleAddToCart}
                  disabled={product.stock !== undefined && product.stock <= 0}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                  </svg>
                  Add to Cart
                </button>
                <button 
                  className="btn btn-secondary buy-now"
                  onClick={handleBuyNow}
                  disabled={product.stock !== undefined && product.stock <= 0}
                >
                  Buy Now
                </button>
              </div>

              {/* Delivery and Service Info */}
              <div className="service-info">
                <div className="service-item">
                  <div className="service-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="service-title">Free Delivery</div>
                    <div className="service-desc">Delivered by tomorrow, if ordered within 6 hrs</div>
                  </div>
                </div>

                <div className="service-item">
                  <div className="service-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <div className="service-title">10 days return policy</div>
                    <div className="service-desc">Easy returns & exchanges</div>
                  </div>
                </div>

                <div className="service-item">
                  <div className="service-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <div className="service-title">1 Year Apple India Limited Warranty</div>
                    <div className="service-desc">Know more about warranty</div>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="seller-info">
                <div className="seller-details">
                  <span>Sold by Apple India</span>
                  <div className="seller-rating">
                    <span className="stars">★</span>
                    <span>4.8 seller rating</span>
                  </div>
                </div>
                <button className="btn btn-outline">View Store</button>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="product-tabs">
            <div className="tab-navigation">
              <button 
                className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button 
                className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('specifications')}
              >
                Specifications
              </button>
              <button 
                className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Reviews
              </button>
              <button 
                className={`tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
                onClick={() => setActiveTab('qa')}
              >
                Q&A
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'details' && (
                <div className="details-content">
                  {product.productdetails && (
                    <>
                      <h3>Product Details</h3>
                      <p>{product.productdetails}</p>
                    </>
                  )}
                  
                  {product.keyfeatures && product.keyfeatures["Key Features"] && product.keyfeatures["Key Features"].length > 0 && (
                    <>
                      <h3>Key Features</h3>
                      <ul className="features-list">
                        {product.keyfeatures["Key Features"].map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  
                  {!product.productdetails && (!product.keyfeatures || !product.keyfeatures["Key Features"] || product.keyfeatures["Key Features"].length === 0) && (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No product details available.</p>
                  )}
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="specifications-content">
                  <h3>Technical Specifications</h3>
                  {getSpecifications().length > 0 ? (
                    <div className="specs-grid">
                      {getSpecifications().map((spec, index) => (
                        <div key={index} className="spec-item">
                          <span className="spec-label">{spec.label}</span>
                          <span className="spec-value">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No specifications available for this product.</p>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="reviews-content">
                  <h3>Customer Reviews</h3>
                  
                  {getRating() > 0 && getRatingsCount() > 0 ? (
                    <div className="reviews-summary">
                      <div className="overall-rating">
                        <div className="rating-number">{getRating().toFixed(1)}</div>
                        <div className="rating-stars">
                          {'★'.repeat(Math.floor(getRating()))}
                          {'☆'.repeat(5 - Math.floor(getRating()))}
                        </div>
                        <div className="rating-count">{getRatingsCount()} total reviews</div>
                      </div>
                      
                      <div className="rating-breakdown">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = mockRatingDistribution[rating === 5 ? 'five' : rating === 4 ? 'four' : rating === 3 ? 'three' : rating === 2 ? 'two' : 'one']
                          const percentage = getRatingsCount() > 0 ? (count / getRatingsCount()) * 100 : 0
                          return (
                            <div key={rating} className="rating-bar">
                              <span className="rating-label">{rating} star</span>
                              <div className="bar-container">
                                <div className="bar" style={{ width: `${percentage}%` }}></div>
                              </div>
                              <span className="rating-count">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>No rating information available for this product.</p>
                  )}

                  <div className="reviews-list">
                    {mockReviews.map((review) => (
                      <div key={review.id} className="review-item">
                        <div className="review-header">
                          <div className="user-info">
                            <div className="user-avatar">{review.userInitial}</div>
                            <div>
                              <div className="user-name">{review.userName}</div>
                              {review.verifiedPurchase && (
                                <div className="verified-badge">Verified Purchase</div>
                              )}
                            </div>
                          </div>
                          <div className="review-meta">
                            <div className="review-rating">
                              {'★'.repeat(review.rating)}
                              {'☆'.repeat(5 - review.rating)}
                            </div>
                            <div className="review-date">{review.date}</div>
                          </div>
                        </div>
                        <div className="review-content">
                          <h4 className="review-headline">{review.headline}</h4>
                          <p className="review-body">{review.body}</p>
                        </div>
                        <div className="review-actions">
                          <button className="helpful-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M2.5 1.5A1.5 1.5 0 0 0 1 3v6a1.5 1.5 0 0 0 1.5 1.5h3.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H2.5zm3.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h3.5a1.5 1.5 0 0 0 1.5-1.5V3a1.5 1.5 0 0 0-1.5-1.5H6z"/>
                            </svg>
                            Helpful ({review.helpfulCount})
                          </button>
                          <button className="report-btn">Report</button>
                        </div>
                      </div>
                    ))}
                    <button className="load-more-btn">Load More Reviews</button>
                  </div>
                </div>
              )}

              {activeTab === 'qa' && (
                <div className="qa-content">
                  <h3>Questions & Answers</h3>
                  
                  <div className="qa-list">
                    {mockQnA.map((qa) => (
                      <div key={qa.id} className="qa-item">
                        <div className="question">
                          <strong>Q:</strong> {qa.question}
                        </div>
                        <div className="answer">
                          <strong>A:</strong> {qa.answer}
                        </div>
                        <div className="qa-meta">
                          Answered by {qa.answeredBy} {qa.answeredDate}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button className="ask-question-btn">Ask a Question</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProductDetails
