import { formatINR } from '../utils/currency'
import { buildPlaceholderDataUri } from '../utils/image'

type Props = {
  id: string
  title: string
  price: number
  image?: string
}

export function ProductCard({ id, title, price, image }: Props) {
  return (
    <article className="card p-4" id={`product-card-${id}`} data-testid={`product-card-${id}`} role="article" aria-labelledby={`product-card-${id}-title`}>
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
      <h3 id={`product-card-${id}-title`} className="mt-4">{title}</h3>
      <div style={{display:'flex', justifyContent:'space-between', marginTop:8, alignItems:'center'}}>
        <span id={`result-price-${id}`} data-testid={`result-price-${id}`}>{formatINR(price)}</span>
        <div style={{display:'flex', gap:8}}>
          <button className="btn" data-testid={`result-quickview-${id}`} id={`result-quickview-${id}`} aria-label="Quick view">Quick view</button>
          <label style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <input type="checkbox" id={`compare-checkbox-${id}`} data-testid={`compare-checkbox-${id}`} aria-label="Compare this product" />
            <span className="label">Compare</span>
          </label>
          <button className="btn btn-primary" data-testid={`result-addtocart-${id}`} id={`result-addtocart-${id}`} aria-label="Add to cart">Add to cart</button>
        </div>
      </div>
    </article>
  )
}


