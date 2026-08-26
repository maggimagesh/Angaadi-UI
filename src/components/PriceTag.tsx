import { splitINR } from '../utils/currency'

/**
 * A rupee amount set the way Amazon sets one: the ₹ mark and the paise at
 * about two thirds the size of the whole-rupee figure, both raised to the
 * cap height.
 *
 * The parts are adjacent inline spans with no separator, so the element's
 * text content is still exactly "₹1,29,999" — the automation suites assert
 * on these nodes, and a visually-hidden duplicate would double the string.
 * The `id` and `data-testid` pass straight through for the same reason.
 */
export function PriceTag({
  value,
  className,
  id,
  testId,
}: {
  value: number
  className?: string
  id?: string
  testId?: string
}) {
  const { symbol, whole, fraction } = splitINR(value)
  return (
    <span className={className ? `price-tag ${className}` : 'price-tag'} id={id} data-testid={testId}>
      <span className="sym">{symbol}</span>
      <span className="whole">{whole}</span>
      {fraction ? <span className="frac">.{fraction}</span> : null}
    </span>
  )
}

export default PriceTag
