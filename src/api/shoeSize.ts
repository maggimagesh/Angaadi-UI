import { buildApiUrl } from '../lib/api'
import { getAuthTokenCookie } from '../utils/token'

export type ShoeWidth = 'Narrow' | 'Standard' | 'Wide'
export type ShoeSizeValue = string

export interface UserShoeSize {
  size: ShoeSizeValue
  width: ShoeWidth
  shoeSizeId?: string | number
  created_at?: string | null
  updated_at?: string | null
}

function normalizeSizeValue(size: unknown): ShoeSizeValue {
  if (typeof size === 'number') {
    return Number.isFinite(size) ? size.toString() : ''
  }
  if (typeof size === 'string') {
    const trimmed = size.trim()
    return trimmed
  }
  return ''
}

function normalizeWidthValue(width: unknown): ShoeWidth | null {
  if (typeof width !== 'string') return null
  const normalized = width.trim()
  if (normalized === 'Narrow' || normalized === 'Standard' || normalized === 'Wide') {
    return normalized
  }
  return null
}

function buildSizePayload(size: ShoeSizeValue): ShoeSizeValue | number {
  const parsed = Number(size)
  return Number.isNaN(parsed) ? size : parsed
}

export async function fetchAllShoeSizes(): Promise<{
  shoeSizes?: ShoeSizeValue[]
  widths?: ShoeWidth[]
  error?: { message: string }
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl('/shoe-size'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        error: {
          message: result.error || result.message || 'Failed to fetch shoe sizes'
        }
      }
    }

    const rawSizes = Array.isArray(result.shoeSizes) ? result.shoeSizes : []
    const rawWidths = Array.isArray(result.widths) ? result.widths : []

    const shoeSizes = rawSizes
      .map(normalizeSizeValue)
      .filter((size: ShoeSizeValue) => size.length > 0)

    const widths = rawWidths
      .map(normalizeWidthValue)
      .filter((width: ShoeWidth | null): width is ShoeWidth => width !== null)

    return { shoeSizes, widths }
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}

export async function fetchUserShoeSize(userId: string): Promise<{
  userShoeSize?: UserShoeSize
  error?: { message: string }
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/shoe-size/${userId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        return { userShoeSize: undefined }
      }
      return {
        error: {
          message: result.error || result.details || 'Failed to fetch user shoe size'
        }
      }
    }

    if (!result.userShoeSize) {
      return { userShoeSize: undefined }
    }

    const rawSize = result.userShoeSize.size ?? result.userShoeSize.shoeSize?.size ?? null
    const rawWidth = result.userShoeSize.width ?? result.userShoeSize.shoeSize?.width ?? null
    const normalizedWidth = normalizeWidthValue(rawWidth)
    return {
      userShoeSize: {
        size: normalizeSizeValue(rawSize),
        width: normalizedWidth ?? 'Standard',
        shoeSizeId: result.userShoeSize.shoeSizeId ?? result.userShoeSize.shoeSize?.id,
        created_at: result.userShoeSize.created_at ?? null,
        updated_at: result.userShoeSize.updated_at ?? null
      }
    }
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}

export async function saveUserShoeSize(userId: string, size: ShoeSizeValue, width: ShoeWidth): Promise<{
  userShoeSize?: UserShoeSize
  message?: string
  error?: { message: string }
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl('/shoe-size'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        size: buildSizePayload(size),
        width
      })
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        error: {
          message: result.error || result.details || 'Failed to save shoe size'
        }
      }
    }

    const userShoeSize = result.userShoeSize
      ? {
          size: normalizeSizeValue(result.userShoeSize.size ?? result.userShoeSize.shoeSize?.size ?? size),
          width: normalizeWidthValue(result.userShoeSize.width ?? result.userShoeSize.shoeSize?.width ?? width) ?? width,
          shoeSizeId: result.userShoeSize.shoeSizeId ?? result.userShoeSize.shoeSize?.id,
          created_at: result.userShoeSize.created_at ?? null,
          updated_at: result.userShoeSize.updated_at ?? null
        }
      : undefined

    return {
      userShoeSize,
      message: result.message || 'Shoe size saved successfully'
    }
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}

export async function removeUserShoeSize(userId: string): Promise<{
  success: boolean
  message?: string
  error?: { message: string }
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { success: false, error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/shoe-size/${userId}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: {
          message: result.error || result.details || 'Failed to remove shoe size'
        }
      }
    }

    return {
      success: true,
      message: result.message || 'Shoe size has been removed successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}

