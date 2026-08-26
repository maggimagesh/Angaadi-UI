export function formatINR(value: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `₹${Math.round(value).toLocaleString('en-IN')}`
  }
}



/**
 * Split a rupee amount into the three parts Amazon sets at different sizes:
 * the ₹ mark, the whole rupees, and the paise. Paise come back empty when
 * the amount is whole, which is the common case in this catalogue.
 */
export function splitINR(value: number): { symbol: string; whole: string; fraction: string } {
  const rounded = Math.round(value * 100) / 100
  const whole = Math.floor(Math.abs(rounded))
  const paise = Math.round((Math.abs(rounded) - whole) * 100)
  const sign = rounded < 0 ? '-' : ''
  return {
    symbol: `${sign}₹`,
    whole: whole.toLocaleString('en-IN'),
    fraction: paise > 0 ? String(paise).padStart(2, '0') : '',
  }
}
