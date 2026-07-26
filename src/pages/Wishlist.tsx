import { useWishlistStore } from '../store/wishlist'
import { useCartStore } from '../store/cart'
import { useUIStore } from '../store/ui'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { CloseIcon } from '../components/icons'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'

/** "Saved 4 Jul" — short, absolute, no relative-time guesswork. */
function savedOn(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Saved recently'
  return `Saved ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items)
  const remove = useWishlistStore((s) => s.remove)
  const clear = useWishlistStore((s) => s.clear)
  const addByProductId = useCartStore((s) => s.addByProductId)
  const openSuccess = useUIStore((s) => s.openSuccess)

  const dropped = items.filter((i) => i.savedPrice > i.price)

  const moveToCart = (id: number) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    void addByProductId(item.id, 1, {
      name: item.name,
      brand: item.brand,
      image: item.image,
      price: item.price,
      oldPrice: item.oldPrice,
    })
    remove(id)
  }

  return (
    <main className="app-main" id="wishlist-page" data-testid="wishlist-page">
      <section style={{ borderBottom: '2px solid var(--color-divider)' }}>
        <div className="section-head">
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 28 }}>Wishlist</h1>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
              {items.length} saved
              {dropped.length > 0
                ? ` · ${dropped.length} ${dropped.length === 1 ? 'has' : 'have'} dropped in price since you saved ${dropped.length === 1 ? 'it' : 'them'}`
                : ''}
            </div>
          </div>

          {items.length > 0 ? (
            <div className="wish-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  items.filter((i) => i.inStock).forEach((i) => moveToCart(i.id))
                  openSuccess('Moved everything in stock to your cart')
                }}
              >
                Move all to cart
              </button>
              <button type="button" className="btn btn-secondary" onClick={clear}>
                Clear list
              </button>
            </div>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div style={{ padding: '0 40px 40px' }}>
            <EmptyState
              title="Nothing saved yet."
              body="Tap the heart on any product to keep it here and get told when the price moves."
              actions={[
                { label: 'Browse products', variant: 'primary', href: '/products?category=all' },
                { label: "Today's price drops", href: '/' },
              ]}
            />
          </div>
        ) : (
          <div className="pgrid">
            {items.map((item) => {
              const drop = item.savedPrice - item.price
              return (
                <article
                  className={`wish-cell${item.inStock ? '' : ' is-out'}`}
                  key={item.id}
                  id={`wishlist-item-${item.id}`}
                  data-testid={`wishlist-item-${item.id}`}
                >
                  <div className="pcard-top">
                    {!item.inStock ? (
                      <span className="tag tag-outline">Out of stock</span>
                    ) : drop > 0 ? (
                      <span className="tag tag-accent">↓ {formatINR(drop)} since saved</span>
                    ) : (
                      <span className="tag tag-neutral">Price unchanged</span>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${item.name} from wishlist`}
                      onClick={() => remove(item.id)}
                      data-testid={`wishlist-remove-${item.id}`}
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>

                  <span className="grayscale wish-well">
                    <img
                      src={item.image || placeholderFor({ categoryId: item.categoryId, name: item.name })}
                      alt={item.name}
                      loading="lazy"
                    />
                  </span>

                  <h3>{item.name}</h3>

                  <div className="wish-price">
                    <span className="now">{formatINR(item.price)}</span>
                    {drop > 0 ? <span className="strike" style={{ fontSize: 12 }}>{formatINR(item.savedPrice)}</span> : null}
                  </div>

                  <div className="wish-meta">
                    {savedOn(item.savedAt)} · {item.inStock ? 'in stock' : 'awaiting restock'}
                  </div>

                  <div className="wish-cta">
                    {item.inStock ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => moveToCart(item.id)}
                        data-testid={`wishlist-move-${item.id}`}
                      >
                        Move to cart
                      </button>
                    ) : (
                      <button type="button" className="btn btn-secondary" disabled>
                        Notify me
                      </button>
                    )}
                    <a
                      className="btn btn-secondary"
                      href={`/product/${item.categoryId ?? 1}/${item.id}`}
                    >
                      View product
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
