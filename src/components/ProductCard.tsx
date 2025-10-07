import { formatINR } from '../utils/currency'
import { useCartStore } from '../store/cart'
import { buildPlaceholderDataUri } from '../utils/image'

type Props = {
  id: string
  title: string
  price: number
  image?: string
}

export function ProductCard({ id, title, price, image }: Props) {
  const addByProductId = useCartStore(s => s.addByProductId)
  return (
    <article className="card product-card" id={`product-card-${id}`} data-testid={`product-card-${id}`} role="article" aria-labelledby={`product-card-${id}-title`}>
      <img
        src={image || buildPlaceholderDataUri(title, 600, 160)}
        alt={title}
        style={{width:'100%', height:160, objectFit:'cover', borderRadius:'var(--radius-md)'}}
        id={`prod-image-${id}`}
        data-testid={`prod-image-${id}`}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement
          img.src = buildPlaceholderDataUri(title, 600, 160)
        }}
      />
      <h3 id={`product-card-${id}-title`} className="mt-4" style={{fontSize:'var(--font-md)', marginBottom:'8px'}}>{title}</h3>
      <div className="product-card-footer">
        <span id={`result-price-${id}`} data-testid={`result-price-${id}`} style={{fontWeight:600, fontSize:'var(--font-lg)', color:'var(--color-primary)'}}>{formatINR(price)}</span>
        <div className="product-card-actions">
          <button className="btn hide-on-mobile" data-testid={`result-quickview-${id}`} id={`result-quickview-${id}`} aria-label="Quick view">Quick view</button>
          <label className="hide-on-mobile" style={{display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap'}}>
            <input type="checkbox" id={`compare-checkbox-${id}`} data-testid={`compare-checkbox-${id}`} aria-label="Compare this product" />
            <span className="label">Compare</span>
          </label>
          <button
            className="btn btn-primary"
            data-testid={`result-addtocart-${id}`}
            id={`result-addtocart-${id}`}
            aria-label="Add to cart"
            style={{flex:1}}
            onClick={() => {
              const pid = /^\d+$/.test(id) ? parseInt(id, 10) : Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) + 700000
              void addByProductId(pid, 1, { name: title, price, image })
            }}
          >
            <span className="hide-on-mobile">Add to cart</span>
            <span className="show-on-mobile">Add</span>
          </button>
        </div>
      </div>
    </article>
  )
}


