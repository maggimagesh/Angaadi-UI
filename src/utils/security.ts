/**
 * Security utilities for managing sensitive data
 * 
 * SECURITY BEST PRACTICES:
 * - Never store passwords in localStorage/sessionStorage
 * - Use httpOnly cookies for authentication tokens when possible
 * - Clear all sensitive data on logout
 * - Implement token expiration and refresh mechanisms
 */

/**
 * List of localStorage keys that may contain sensitive data
 */
const SENSITIVE_STORAGE_KEYS = [
  'login.password',        // Old password storage (should never exist)
  'demo.auth.user',        // User auth data
  'jwt',                   // JWT tokens
  'auth_token',            // Alternative token keys
  'access_token',
  'refresh_token',
]

/**
 * Clear all sensitive data from storage
 * Call this on logout or when security concerns arise
 */
export const clearSensitiveData = (): void => {
  try {
    // Clear from localStorage
    SENSITIVE_STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key)
    })
    
    // Clear from sessionStorage
    SENSITIVE_STORAGE_KEYS.forEach(key => {
      sessionStorage.removeItem(key)
    })
    
    console.log('Sensitive data cleared from storage')
  } catch (error) {
    console.error('Failed to clear sensitive data:', error)
  }
}

/**
 * Clear any legacy password storage that should never exist
 * Call this on app initialization
 */
export const clearLegacyPasswordStorage = (): void => {
  try {
    // Remove any password keys that might have been stored by older versions
    const passwordKeys = [
      'login.password',
      'signup.password',
      'user.password',
      'password',
    ]
    
    passwordKeys.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Failed to clear legacy password storage:', error)
  }
}

/**
 * Check if any sensitive data is present in localStorage (for debugging)
 * DO NOT use in production - this is for development only
 */
export const auditStorageSecurity = (): void => {
  if (import.meta.env.PROD) {
    return // Don't run in production
  }
  
  try {
    const findings: string[] = []
    
    // Check for suspicious keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('private')
      )) {
        findings.push(`⚠️ Suspicious localStorage key: ${key}`)
      }
    }
    
    if (findings.length > 0) {
      console.warn('SECURITY AUDIT FINDINGS:')
      findings.forEach(f => console.warn(f))
    } else {
      console.log('✓ No suspicious keys found in localStorage')
    }
  } catch (error) {
    console.error('Storage security audit failed:', error)
  }
}
