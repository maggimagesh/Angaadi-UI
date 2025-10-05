interface CategorySkeletonProps {
  count?: number
}

export function CategorySkeleton({ count = 10 }: CategorySkeletonProps) {
  return (
    <div className="home-category-grid">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="home-category-card skeleton-card">
          <figure className="home-category-image skeleton-image">
            <div className="skeleton-shimmer"></div>
            <span className="category-badge skeleton-badge">
              <div className="skeleton-shimmer"></div>
            </span>
          </figure>
          <div className="home-category-content">
            <h3 className="home-category-title skeleton-title">
              <div className="skeleton-shimmer"></div>
            </h3>
          </div>
        </article>
      ))}
    </div>
  )
}

export function CategorySkeletonLoader() {
  return (
    <section className="home-section home-categories-section" aria-labelledby="home-categories-title" data-testid="home-categories">
      <header className="home-section-header">
        <h2 id="home-categories-title" className="home-section-title">Shop by Category</h2>
      </header>
      <CategorySkeleton count={10} />
    </section>
  )
}
