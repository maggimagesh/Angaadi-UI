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


