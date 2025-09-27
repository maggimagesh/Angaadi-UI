const commonWeak = new Set([
  'password', 'password1', 'qwerty', 'qwerty123', 'letmein', 'welcome', 'admin', 'abc123', 'iloveyou', 'monkey',
  '123456', '12345678', '123456789', '111111', '000000', '123123', '654321'
])

export function isStrongPassword(pwd: string): boolean {
  if (!pwd || pwd.length < 8) return false
  if (/(\s)/.test(pwd)) return false
  const hasLower = /[a-z]/.test(pwd)
  const hasUpper = /[A-Z]/.test(pwd)
  const hasDigit = /\d/.test(pwd)
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd)
  if (!(hasLower && hasUpper && hasDigit && hasSymbol)) return false
  const normalized = pwd.toLowerCase()
  if (commonWeak.has(normalized)) return false
  return true
}


