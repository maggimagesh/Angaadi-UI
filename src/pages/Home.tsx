import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchCategories } from '../api/products'
import { CategorySkeletonLoader } from '../components/CategorySkeleton'
import { useImageFallback } from '../hooks/useImageFallback'
import '../styles/home.css'

const heroSlides = [
  {
    title: 'Great Indian Festival',
    subtitle: 'Up to 80% off on Electronics',
    cta: 'Shop Now',
    background: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
    alt: 'Great Indian Festival sale banner',
  },
  {
    title: 'Smartphone Sale',
    subtitle: 'Latest models at best prices',
    cta: 'Shop Mobiles',
    background: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
    alt: 'Smartphone sale banner',
  },
  {
    title: 'Festive Tech Week',
    subtitle: 'Upgrade your everyday with latest technology',
    cta: 'Explore Deals',
    background: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
    alt: 'Festive tech week banner',
  },
]

// Helper function to map API category names to slugs
const categorySlugMap: Record<string, string> = {
  mobileAndTablets: 'mobiles-tablets',
  laptopsAndComputers: 'laptops-computers',
  fashionAndLifestyle: 'fashion-lifestyle',
  homeAndKitchen: 'home-kitchen',
  beautyAndPersonalCare: 'beauty-personal-care',
  booksAndMedia: 'books-media',
  sportsAndFitness: 'sports-fitness',
  groceryAndGourmet: 'grocery-gourmet',
  tvsAndAppliances: 'tvs-appliances',
  audioAndHeadphones: 'audio-headphones',
}

// Default fallback image for categories without API image
const DEFAULT_CATEGORY_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'

// Fallback categories when API fails
const FALLBACK_CATEGORIES = [
  {
    name: 'Mobiles & Tablets',
    slug: 'mobiles-tablets',
    badge: 'Up to 40% Off',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Laptops & Computers',
    slug: 'laptops-computers',
    badge: 'Starting ₹25,990',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'TVs & Appliances',
    slug: 'tvs-appliances',
    badge: 'Up to ₹60,000 Off',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Audio & Headphones',
    slug: 'audio-headphones',
    badge: 'Starting ₹199',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Fashion & Lifestyle',
    slug: 'fashion-lifestyle',
    badge: 'Min 50% Off',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    badge: 'Up to 60% Off',
    image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    badge: 'Starting ₹99',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Books & Media',
    slug: 'books-media',
    badge: 'Up to 80% Off',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    badge: 'Min 30% Off',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
  {
    name: 'Smartwatches',
    slug: 'smartwatches',
    badge: 'Starting ₹1,999',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    fallback: DEFAULT_CATEGORY_IMAGE,
  },
]

// Helper function to generate badge text for categories (will be replaced by API data later)
const categoryBadgeMap: Record<string, string> = {
  mobileAndTablets: 'Up to 40% Off',
  laptopsAndComputers: 'Starting ₹25,990',
  fashionAndLifestyle: 'Min 50% Off',
  homeAndKitchen: 'Up to 60% Off',
  beautyAndPersonalCare: 'Starting ₹99',
  booksAndMedia: 'Up to 80% Off',
  sportsAndFitness: 'Min 30% Off',
  groceryAndGourmet: 'Free Delivery',
  tvsAndAppliances: 'Up to ₹60,000 Off',
  audioAndHeadphones: 'Starting ₹199',
}

const spotlights = [
  { title: 'End of season refresh', description: 'Switch to eco-efficient appliances with special bank offers.', meta: 'Valid till 10 Oct' },
  { title: 'Creator studio setup', description: 'Build your dream workspace with monitors, mics, and lighting.', meta: 'Limited stocks' },
  { title: 'Campus essentials', description: 'Lightweight laptops, tablets, and backpacks for the new semester.', meta: 'Student exclusive' },
]

const curatedCollections = [
  { badge: 'Top rated', title: 'Power & productivity', copy: 'Long-lasting battery champs with stellar performance for work and play.' },
  { badge: 'New arrival', title: 'Latest arrivals', copy: 'Browse the newest products from top brands with modern features.' },
  { badge: "Editor's choice", title: 'Soundscapes', copy: 'Noise-cancelling headphones and speakers for audiophiles.' },
  { badge: 'Value buys', title: 'Daily essentials', copy: 'Chargers, cables, and accessories you reach for every day.' },
]

const trustSignals = [
  { title: 'Trusted sellers', description: 'Every partner is vetted for quality, warranty, and post-sale support.' },
  { title: 'Secure payments', description: 'UPI, credit, EMI, and wallet support with industry-grade encryption.' },
  { title: 'Expert concierge', description: 'Need guidance? Chat with our product specialists 7 days a week.' },
  { title: 'Easy returns', description: 'Hassle-free pickup and instant refunds within 48 hours.' },
]

const dealHighlights = [
  {
    title: 'iPhone 15 Pro Max',
    description: 'A17 Pro • Titanium build • 256 GB',
    priceLabel: '₹1,34,900',
    tag: 'Festival offer',
    image: '/images/deals/deal-iphone.jpg',
    fallback: 'https://images.unsplash.com/photo-1675953935267-e039f13ddd79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    title: 'MacBook Air M3',
    description: '13-inch • 8C CPU • 18-hour battery',
    priceLabel: '₹1,07,990',
    tag: 'Bank cashback',
    image: '/images/deals/deal-macbook.jpg',
    fallback: 'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    title: 'Sony WH-1000XM5',
    description: 'Adaptive ANC • 30-hour battery life',
    priceLabel: '₹29,499',
    tag: 'Price drop',
    image: '/images/deals/deal-headphones.jpg',
    fallback: 'https://images.unsplash.com/photo-1649956736509-f359d191bbcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    title: 'Samsung Neo QLED 55"',
    description: 'Mini LED • Dolby Atmos • Tizen TV',
    priceLabel: '₹1,05,999',
    tag: 'Exchange bonus',
    image: '/images/deals/deal-tv.jpg',
    fallback: 'https://images.unsplash.com/photo-1601944177325-f8867652837f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
]

const recommendedHighlights = [
  {
    title: 'Galaxy S24 Ultra',
    description: 'Quad telephoto • S Pen in the box',
    priceLabel: '₹1,09,999',
    tag: 'Trending',
    image: '/images/featured/featured-galaxy.jpg',
    fallback: 'https://images.unsplash.com/photo-1675953935267-e039f13ddd79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    title: 'Dell XPS 13 Plus',
    description: 'OLED InfinityEdge • Intel Ultra 7',
    priceLabel: '₹1,72,490',
    tag: 'Editor’s pick',
    image: '/images/featured/featured-dell.jpg',
    fallback: 'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    title: 'Apple Watch Series 9',
    description: 'S9 SiP • Double Tap gestures',
    priceLabel: '₹39,900',
    tag: 'Bundle offer',
    image: '/images/featured/featured-watch.jpg',
    fallback: 'https://images.unsplash.com/photo-1675953935267-e039f13ddd79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    title: 'Sony A7 IV',
    description: '33 MP full-frame • 4K 60p video',
    priceLabel: '₹2,19,990',
    tag: 'Back in stock',
    image: '/images/featured/featured-camera.jpg',
    fallback: 'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
]

export default function HomePage() {
  const { handleImageError } = useImageFallback()
  const navigate = useNavigate()
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const [categories, setCategories] = useState<Array<{ name: string; slug: string; badge: string; image: string; fallback: string }>>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const hasLoadedCategories = useRef(false)

  // Fetch categories from API
  useEffect(() => {
    // Prevent duplicate API calls in React StrictMode
    if (hasLoadedCategories.current) {
      return
    }
    
    const loadCategories = async () => {
      hasLoadedCategories.current = true
      setCategoriesLoading(true)
      setCategoriesError(null)
      
      try {
        const response = await fetchCategories()
        
        if (response.error) {
          setCategoriesError(response.error.message)
          // Use fallback categories when API fails
          setCategories(FALLBACK_CATEGORIES)
        } else if (response.data) {
          // Filter only active categories and transform API data to match component structure
          const transformedCategories = response.data
            .filter((cat) => cat.isactive)
            .sort((a, b) => a.displayorder - b.displayorder)
            .map((cat) => ({
              name: cat.description,
              slug: cat.slug || categorySlugMap[cat.productname] || cat.productname,
              badge: cat.badge || categoryBadgeMap[cat.productname] || 'Shop Now',
              image: cat.imageurl || DEFAULT_CATEGORY_IMAGE,
              fallback: DEFAULT_CATEGORY_IMAGE,
            }))
          
          setCategories(transformedCategories)
        }
      } catch (error) {
        setCategoriesError('Failed to load categories')
        // Use fallback categories when API fails
        setCategories(FALLBACK_CATEGORIES)
      } finally {
        setCategoriesLoading(false)
        setIsPageLoading(false)
      }
    }
    
    loadCategories()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [activeHeroIndex])

  const handlePrevSlide = () => {
    setActiveHeroIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length)
  }

  const handleNextSlide = () => {
    setActiveHeroIndex((current) => (current + 1) % heroSlides.length)
  }

  return (
    <main className="app-main home-main" id="home-page" data-testid="home-page">
      {isPageLoading && (
        <div className="page-loading-overlay">
          <div className="page-loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}
      <div className="surface">
        <div className="container home-stack">
          <section className="home-hero-slider" role="region" aria-label="Featured promotions" id="hero-banner" data-testid="hero-banner">
            <div className="slider-wrapper">
              {heroSlides.map((slide, index) => (
                <div
                  key={slide.title}
                  className={`slide ${index === activeHeroIndex ? 'is-active' : ''}`}
                  style={{ backgroundImage: `url(${slide.background})` }}
                  aria-hidden={index !== activeHeroIndex}
                >
                  <div className="slide-overlay"></div>
                  <div className="slide-content">
                    <h1 className="slide-title">{slide.title}</h1>
                    <p className="slide-subtitle">{slide.subtitle}</p>
                    <button className="btn btn-hero" aria-label={slide.cta}>
                      {slide.cta}
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                className="slider-nav slider-nav-prev"
                onClick={handlePrevSlide}
                aria-label="Previous slide"
                type="button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button
                className="slider-nav slider-nav-next"
                onClick={handleNextSlide}
                aria-label="Next slide"
                type="button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <div className="slider-indicators">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    className={`slider-dot ${index === activeHeroIndex ? 'is-active' : ''}`}
                    onClick={() => setActiveHeroIndex(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === activeHeroIndex}
                    type="button"
                  ></button>
                ))}
              </div>
            </div>
          </section>

          {categoriesLoading ? (
            <CategorySkeletonLoader />
          ) : (
            <section className="home-section home-categories-section" aria-labelledby="home-categories-title" data-testid="home-categories">
              <header className="home-section-header">
                <h2 id="home-categories-title" className="home-section-title">Shop by Category</h2>
                {categoriesError && (
                  <div 
                    style={{ 
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: 'var(--color-warning-container, #fff3cd)',
                      color: 'var(--color-warning, #856404)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>⚠️</span>
                    <span>Unable to load latest categories. Showing default categories.</span>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => window.location.reload()}
                      style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: '13px' }}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </header>
              <div className="home-category-grid">
                {categories.map(({ name, slug, badge, image, fallback }) => (
                  <article 
                    key={name} 
                    className="home-category-card"
                    onClick={() => navigate(`/products?category=${slug}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/products?category=${slug}`)
                      }
                    }}
                    aria-label={`Shop ${name}`}
                  >
                    <figure className="home-category-image">
                      <img
                        src={image}
                        data-fallback={fallback}
                        alt={`${name} category`}
                        loading="lazy"
                        onError={handleImageError}
                      />
                      <span className="category-badge">{badge}</span>
                    </figure>
                    <div className="home-category-content">
                      <h3 className="home-category-title">{name}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="card home-section" aria-labelledby="home-spotlight-title" data-testid="seasonal-spotlights">
            <header className="home-section-header">
              <h2 id="home-spotlight-title" className="home-section-title">Seasonal spotlights</h2>
              <p className="home-section-subtitle">Discover exclusive seasonal collections and limited-time offers on your favorite products.</p>
            </header>
            <div className="home-spotlight-grid">
              {spotlights.map(({ title, description, meta }) => (
                <article key={title} className="home-spotlight-card">
                  <div className="home-spotlight-meta">
                    <span>{meta}</span>
                    <span>Shop now</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <button className="btn btn-secondary" aria-label={`View collection ${title}`}>View collection</button>
                </article>
              ))}
            </div>
          </section>

          <section className="card home-section" aria-labelledby="home-deals-title" data-testid="deals-of-day">
            <header className="home-section-header">
              <h2 id="home-deals-title" className="home-section-title">Deals of the day</h2>
              <p className="home-section-subtitle">Limited-hour offers refreshed every morning. Prices include partner bank discounts where applicable.</p>
            </header>
            <div className="home-products-grid">
              {dealHighlights.map(({ title, description, priceLabel, tag, image, fallback }) => (
                <article key={title} className="home-product-card">
                  <figure className="home-product-media">
                    <img
                      src={image}
                      data-fallback={fallback}
                      alt={title}
                      loading="lazy"
                      onError={handleImageError}
                    />
                  </figure>
                  <div className="home-product-content">
                    <span className="home-product-tag">{tag}</span>
                    <h3 className="home-product-title">{title}</h3>
                    <p className="home-product-description">{description}</p>
                  </div>
                  <div className="home-product-footer">
                    <span className="home-product-price">{priceLabel}</span>
                    <button className="btn btn-primary" aria-label={`Add ${title} to cart`}>Add to cart</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card home-section" aria-labelledby="home-collections-title" data-testid="curated-collections">
            <header className="home-section-header">
              <h2 id="home-collections-title" className="home-section-title">Curated for you</h2>
              <p className="home-section-subtitle">Handpicked product collections based on your shopping preferences and latest trends.</p>
            </header>
            <div className="home-collection-grid">
              {curatedCollections.map(({ badge, title, copy }) => (
                <article key={title} className="home-collection-card">
                  <span className="home-collection-badge">{badge}</span>
                  <h3 className="home-collection-title">{title}</h3>
                  <p className="home-collection-copy">{copy}</p>
                  <button className="btn btn-ghost" aria-label={`Browse ${title}`}>Browse</button>
                </article>
              ))}
            </div>
          </section>

          <section className="card home-section" aria-labelledby="home-recommendations-title" data-testid="recommended-products">
            <header className="home-section-header">
              <h2 id="home-recommendations-title" className="home-section-title">Fresh picks for you</h2>
              <p className="home-section-subtitle">Personalized product recommendations based on your browsing history and purchase preferences.</p>
            </header>
            <div className="home-products-grid">
              {recommendedHighlights.map(({ title, description, priceLabel, tag, image, fallback }) => (
                <article key={title} className="home-product-card">
                  <figure className="home-product-media">
                    <img
                      src={image}
                      data-fallback={fallback}
                      alt={title}
                      loading="lazy"
                      onError={handleImageError}
                    />
                  </figure>
                  <div className="home-product-content">
                    <span className="home-product-tag">{tag}</span>
                    <h3 className="home-product-title">{title}</h3>
                    <p className="home-product-description">{description}</p>
                  </div>
                  <div className="home-product-footer">
                    <span className="home-product-price">{priceLabel}</span>
                    <button className="btn btn-secondary" aria-label={`View details for ${title}`}>View details</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card home-section" aria-labelledby="home-trust-title" data-testid="trust-highlights">
            <header className="home-section-header">
              <h2 id="home-trust-title" className="home-section-title">Why Angaadi</h2>
              <p className="home-section-subtitle">Customer-focused shopping experience with reliable service and quality products at best prices.</p>
            </header>
            <div className="home-trust-grid">
              {trustSignals.map(({ title, description }) => (
                <article key={title} className="home-trust-card">
                  <span className="home-trust-title">{title}</span>
                  <p className="home-trust-desc">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="home-footer-cta" aria-labelledby="home-cta-title" data-testid="home-footer-cta">
            <h3 id="home-cta-title">Your premium shopping experience starts here</h3>
            <p>Discover the best deals on electronics, fashion, home essentials, and more. Shop from trusted sellers with secure payments and easy returns.</p>
            <div className="home-footer-actions">
              <button className="btn btn-primary" aria-label="Sign In to Angaadi" onClick={() => navigate('/login')}>Sign In</button>
              <button className="btn btn-secondary" aria-label="Start exploring">Start exploring</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}


