import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCompareStore, COMPARE_LIMIT } from '../store/compare'
import { useCartStore } from '../store/cart'
import { useUIStore } from '../store/ui'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'

export default function ComparePage() {
  const items = useCompareStore((s) => s.items)
  const remove = useCompareStore((s) => s.remove)
  const clear = useCompareStore((s) => s.clear)
  const addByProductId = useCartStore((s) => s.addByProductId)
  const openSuccess = useUIStore((s) => s.openSuccess)

  /**
   * The spec rows are the union of every product's spec keys, plus price and
   * rating, so a product missing a spec shows a gap rather than shifting the
   * column. A row is "differing" when its values are not all identical — those
   * are the ones worth looking at, so they get the emphasis.
   */
  const rows = useMemo(() => {
    const keys = new Set<string>()
    items.forEach((item) => Object.keys(item.specs).forEach((k) => keys.add(k)))

    const specRows = Array.from(keys).map((key) => {
      const values = items.map((item) => item.specs[key] ?? '—')
      const differs = new Set(values).size > 1
      return { key, values, differs }
    })

    const priceRow = {
      key: 'Price',
      values: items.map((i) => formatINR(i.price)),
      differs: new Set(items.map((i) => i.price)).size > 1,
    }

    const ratingRow = {
      key: 'Rating',
      values: items.map((i) =>
        i.rating
          ? `${i.rating.toFixed(1)} ★${i.ratingsCount ? ` · ${i.ratingsCount.toLocaleString('en-IN')}` : ''}`
          : 'Not yet rated'
      ),
      differs: new Set(items.map((i) => i.rating ?? 0)).size > 1,
    }

    return [priceRow, ...specRows, ratingRow]
  }, [items])

  const freeSlots = COMPARE_LIMIT - items.length

  return (
    <main className="app-main" id="compare-page" data-testid="compare-page">
      <section>
        <div className="section-head">
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 28 }}>Compare</h1>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
              {items.length} of {COMPARE_LIMIT} slots used
              {items.length > 1 ? ' · differing values are emphasised' : ''}
            </div>
          </div>
          {items.length > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={clear}>
              Clear all
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div style={{ padding: '0 40px 40px' }}>
            <EmptyState
              title="Nothing to compare yet."
              body={`Add up to ${COMPARE_LIMIT} products from any listing — the Compare button sits next to Add to cart on every card.`}
              actions={[
                { label: 'Browse products', variant: 'primary', href: '/products?category=all' },
                { label: 'Open your wishlist', href: '/wishlist' },
              ]}
            />
          </div>
        ) : (
          <div className="compare-scroll">
            <table className="table compare-table">
              <thead>
                <tr>
                  <th>Specification</th>
                  {items.map((item) => (
                    <th key={item.id}>
                      <div className="compare-head">
                        <span className="grayscale compare-well">
                          <img
                            src={item.image || placeholderFor({ categoryId: item.categoryId, name: item.name })}
                            alt=""
                            loading="lazy"
                          />
                        </span>
                        <Link className="compare-name" to={`/product/${item.categoryId ?? 1}/${item.id}`}>
                          {item.name}
                        </Link>
                        <span className="compare-price">{formatINR(item.price)}</span>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => remove(item.id)}
                          data-testid={`compare-remove-${item.id}`}
                        >
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                  {freeSlots > 0 ? (
                    <th style={{ verticalAlign: 'middle' }}>
                      <div className="compare-slot">
                        <span className="hint">
                          {freeSlots} slot{freeSlots === 1 ? '' : 's'} free.
                        </span>
                        <Link className="btn btn-secondary" to="/products?category=all">
                          Add a product
                        </Link>
                      </div>
                    </th>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td style={{ color: 'var(--color-neutral-700)' }}>{row.key}</td>
                    {row.values.map((value, i) => (
                      <td key={`${row.key}-${items[i].id}`}>
                        {row.differs ? <strong>{value}</strong> : value}
                      </td>
                    ))}
                    {freeSlots > 0 ? <td /> : null}
                  </tr>
                ))}

                <tr>
                  <td />
                  {items.map((item) => (
                    <td key={`cta-${item.id}`}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          void addByProductId(item.id, 1, {
                            name: item.name,
                            brand: item.brand,
                            image: item.image,
                            price: item.price,
                          })
                          openSuccess('Added to cart')
                        }}
                        data-testid={`compare-addtocart-${item.id}`}
                      >
                        Add to cart
                      </button>
                    </td>
                  ))}
                  {freeSlots > 0 ? <td /> : null}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
