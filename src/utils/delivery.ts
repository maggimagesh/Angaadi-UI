/**
 * The delivery promise the cards, the buy box and the cart all quote.
 *
 * Amazon states a date rather than a lead time, so the whole app derives one
 * from the same helper and nothing drifts between a card and the buy box it
 * links to.
 */
export function deliveryDate(offsetDays = 2): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
