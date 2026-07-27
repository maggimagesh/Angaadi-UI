import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchProductsByCategory, type ProductItem } from '../api/products'
import { DEPARTMENTS, placeholderFor } from '../data/catalog'
import { formatINR } from '../utils/currency'

/**
 * Live suggestions for `#search-suggestions`.
 *
 * There is no text-search endpoint, so this uses the call the app already
 * makes — POST /products/by-category — and matches client-side, exactly as the
 * listing page's own search box does. The catalogue for a department is
 * fetched once and cached for the session, so typing filters a local list
 * instead of hammering the API on every keystroke.
 */

const DEBOUNCE_MS = 250
const MAX_PRODUCT_ROWS = 6
const RECENT_KEY = 'angaadi.search.recent'
const MAX_RECENT = 5

const TRENDING = ['monsoon deals', 'tablets under 15k', 'soundbar 2.1', '55 inch qled']

/** Department ids the "All" scope searches across. */
const ALL_SCOPE_IDS = DEPARTMENTS.map((d) => d.id)

/** The header's category `<select>` values, mapped onto real category ids. */
const SCOPE_TO_IDS: Record<string, number[]> = {
  all: ALL_SCOPE_IDS,
  phones: [1],
  laptops: [2],
  audio: [4],
  accessories: [4, 6],
}

type Row = {
  product: ProductItem
  departmentName: string
  departmentId: number
}

/** Session cache: category id → its product list. */
const catalogueCache = new Map<number, ProductItem[]>()

async function loadCategory(id: number): Promise<ProductItem[]> {
  const cached = catalogueCache.get(id)
  if (cached) return cached
  const res = await fetchProductsByCategory(id, 1, 100)
  const products = res.data?.products ?? []
  catalogueCache.set(id, products)
  return products
}

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

export function pushRecentSearch(term: string) {
  const clean = term.trim()
  if (!clean) return
  try {
    const next = [clean, ...readRecentSearches().filter((t) => t !== clean)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** Renders the matched substring in bold, leaving the rest as-is. */
function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <strong>{text.slice(at, at + term.length)}</strong>
      {text.slice(at + term.length)}
    </>
  )
}

export type SuggestionsHandle = {
  /** Number of focusable options, for the input's aria wiring. */
  optionCount: number
  activeId: string | undefined
  move: (delta: number) => void
  commit: () => boolean
  reset: () => void
}

type Props = {
  query: string
  scope: string
  open: boolean
  onPickProduct: (product: ProductItem, departmentId: number) => void
  onPickTerm: (term: string, categoryId?: number) => void
  onSeeAll: () => void
  /** Lets the input drive keyboard navigation without owning the list state. */
  registerHandle: (handle: SuggestionsHandle) => void
}

export function SearchSuggestions({
  query,
  scope,
  open,
  onPickProduct,
  onPickTerm,
  onSeeAll,
  registerHandle,
}: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [byDepartment, setByDepartment] = useState<{ id: number; name: string; count: number }[]>([])
  const [active, setActive] = useState(-1)
  const [recent, setRecent] = useState<string[]>([])

  // Each keystroke supersedes the last. The API helpers take no AbortSignal, so
  // the request itself cannot be cancelled at the transport — instead the
  // controller marks the older run stale and its result is discarded.
  const runRef = useRef<AbortController | null>(null)

  const trimmed = query.trim()
  const isEmptyQuery = trimmed.length === 0

  useEffect(() => {
    if (open && isEmptyQuery) setRecent(readRecentSearches())
  }, [open, isEmptyQuery])

  useEffect(() => {
    setActive(-1)
  }, [trimmed, scope])

  useEffect(() => {
    if (!open || isEmptyQuery) {
      setRows([])
      setTotal(0)
      setByDepartment([])
      return
    }

    runRef.current?.abort()
    const run = new AbortController()
    runRef.current = run

    const timer = window.setTimeout(async () => {
      const ids = SCOPE_TO_IDS[scope] ?? ALL_SCOPE_IDS
      try {
        const lists = await Promise.all(ids.map((id) => loadCategory(id).then((p) => ({ id, p }))))
        if (run.signal.aborted) return

        const needle = trimmed.toLowerCase()
        const matched: Row[] = []
        const counts: { id: number; name: string; count: number }[] = []

        for (const { id, p } of lists) {
          const department = DEPARTMENTS.find((d) => d.id === id)
          const hits = p.filter(
            (item) =>
              item.productname?.toLowerCase().includes(needle) ||
              item.brand?.toLowerCase().includes(needle)
          )
          if (hits.length) {
            counts.push({ id, name: department?.name ?? `Category ${id}`, count: hits.length })
          }
          for (const hit of hits) {
            matched.push({
              product: hit,
              departmentName: department?.name ?? 'Catalogue',
              departmentId: id,
            })
          }
        }

        setTotal(matched.length)
        setRows(matched.slice(0, MAX_PRODUCT_ROWS))
        setByDepartment(counts.sort((a, b) => b.count - a.count).slice(0, 3))
      } catch {
        if (run.signal.aborted) return
        setRows([])
        setTotal(0)
        setByDepartment([])
      }
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      run.abort()
    }
  }, [open, trimmed, scope, isEmptyQuery])

  /** Flat list of everything the arrow keys can land on, in visual order. */
  const options = useMemo(() => {
    if (isEmptyQuery) {
      return [
        ...recent.map((t) => ({ kind: 'term' as const, term: t })),
        ...TRENDING.map((t) => ({ kind: 'term' as const, term: t })),
      ]
    }
    return [
      ...rows.map((r) => ({ kind: 'product' as const, row: r })),
      ...byDepartment.map((d) => ({ kind: 'category' as const, dept: d })),
    ]
  }, [isEmptyQuery, recent, rows, byDepartment])

  const optionId = (i: number) => `search-option-${i}`

  const commit = useCallback((): boolean => {
    const option = options[active]
    if (!option) return false
    if (option.kind === 'term') {
      onPickTerm(option.term)
    } else if (option.kind === 'product') {
      onPickProduct(option.row.product, option.row.departmentId)
    } else {
      onPickTerm(trimmed, option.dept.id)
    }
    return true
  }, [options, active, onPickProduct, onPickTerm, trimmed])

  useEffect(() => {
    registerHandle({
      optionCount: options.length,
      activeId: active >= 0 ? optionId(active) : undefined,
      move: (delta) => {
        setActive((current) => {
          if (!options.length) return -1
          const next = current + delta
          if (next < 0) return options.length - 1
          if (next >= options.length) return 0
          return next
        })
      },
      commit,
      reset: () => setActive(-1),
    })
  }, [registerHandle, options.length, active, commit])

  if (!open) return null

  return (
    <div
      className="suggestions"
      id="search-suggestions"
      data-testid="search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
    >
      {isEmptyQuery ? (
        <>
          {recent.length > 0 ? (
            <>
              <div className="suggest-group">Recent</div>
              {recent.map((term, i) => (
                <button
                  key={`recent-${term}`}
                  type="button"
                  role="option"
                  id={optionId(i)}
                  aria-selected={active === i}
                  className={`suggest-term${active === i ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onPickTerm(term)}
                >
                  {term}
                </button>
              ))}
            </>
          ) : null}
          <div className="suggest-group">Trending now</div>
          {TRENDING.map((term, i) => {
            const index = recent.length + i
            return (
              <button
                key={`trending-${term}`}
                type="button"
                role="option"
                id={optionId(index)}
                aria-selected={active === index}
                className={`suggest-term${active === index ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => onPickTerm(term)}
              >
                {term}
              </button>
            )
          })}
        </>
      ) : rows.length === 0 ? (
        <div className="suggest-foot" role="status">
          <span>No product matches “{trimmed}” yet.</span>
          <button type="button" className="linkish" onClick={onSeeAll}>
            Browse all products
          </button>
        </div>
      ) : (
        <>
          <div className="suggest-group">Products</div>
          {rows.map((row, i) => {
            const p = row.product
            const price = Number(p.price) || 0
            const rating = Number(p.starrating) || 0
            const stock = p.stock > 0 ? (p.stock <= 10 ? `${p.stock} left` : 'in stock') : 'out of stock'
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                id={optionId(i)}
                aria-selected={active === i}
                className={`suggest-row${active === i ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPickProduct(p, row.departmentId)}
              >
                <span className="grayscale suggest-thumb">
                  <img
                    src={
                      p.imageurl?.trim()
                        ? p.imageurl
                        : placeholderFor({ categoryId: p.categoryid, name: p.productname })
                    }
                    alt=""
                  />
                </span>
                <span className="suggest-main">
                  <span className="suggest-name">
                    <Highlight text={p.productname} term={trimmed} />
                  </span>
                  <span className="suggest-meta">
                    {row.departmentName}
                    {rating > 0 ? ` · ${rating.toFixed(1)} ★` : ''} · {stock}
                  </span>
                </span>
                <span className="suggest-price">{formatINR(price)}</span>
              </button>
            )
          })}

          {byDepartment.length > 0 ? (
            <>
              <div className="suggest-group">In categories</div>
              {byDepartment.map((d, i) => {
                const index = rows.length + i
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="option"
                    id={optionId(index)}
                    aria-selected={active === index}
                    className={`suggest-row suggest-cat${active === index ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => onPickTerm(trimmed, d.id)}
                  >
                    <span>“{trimmed}” in {d.name}</span>
                    <span className="suggest-meta">
                      {d.count} result{d.count === 1 ? '' : 's'}
                    </span>
                  </button>
                )
              })}
            </>
          ) : null}

          <div className="suggest-foot">
            <span>↑↓ to move · Enter to open · Esc to close</span>
            <button type="button" className="section-link linkish" onClick={onSeeAll}>
              See all {total} result{total === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default SearchSuggestions
