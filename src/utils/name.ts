// Accept only letters from any language (Unicode) and combining marks. No digits or symbols.
export function isLettersOnly(value: string): boolean {
  if (!value) return false
  return /^[\p{L}\p{M}]+$/u.test(value)
}


