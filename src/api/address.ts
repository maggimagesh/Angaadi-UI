import { secureFetch } from '../lib/secureClient'
import { getAuthTokenCookie } from '../utils/token'

export type Address = {
  id: string
  fullName: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  state: string
  pincode: string
  country: string
  isDefault: boolean
  created_at?: string
  updated_at?: string | null
}

export type AddressInput = {
  fullName: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country?: string
  isDefault?: boolean
}

export type ApiResult<T> = { data?: T; error?: { message: string } }

function getAuthHeaders(): Record<string, string> {
  const token = getAuthTokenCookie()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function listAddresses(): Promise<ApiResult<Address[]>> {
  try {
    const res = await secureFetch('/addresses', { method: 'GET', headers: getAuthHeaders() })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to load addresses' } }
    return { data: (json?.addresses || []) as Address[] }
  } catch {
    return { error: { message: 'Failed to load addresses' } }
  }
}

export async function createAddress(input: AddressInput): Promise<ApiResult<Address>> {
  try {
    const res = await secureFetch('/addresses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to save address' } }
    return { data: json.address as Address }
  } catch {
    return { error: { message: 'Failed to save address' } }
  }
}

export async function updateAddress(id: string, input: AddressInput): Promise<ApiResult<Address>> {
  try {
    const res = await secureFetch(`/addresses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to update address' } }
    return { data: json.address as Address }
  } catch {
    return { error: { message: 'Failed to update address' } }
  }
}

export async function setDefaultAddress(id: string): Promise<ApiResult<Address>> {
  try {
    const res = await secureFetch(`/addresses/${id}`, { method: 'PATCH', headers: getAuthHeaders() })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to set default address' } }
    return { data: json.address as Address }
  } catch {
    return { error: { message: 'Failed to set default address' } }
  }
}

export async function deleteAddress(id: string): Promise<ApiResult<Address[]>> {
  try {
    const res = await secureFetch(`/addresses/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to delete address' } }
    return { data: (json?.addresses || []) as Address[] }
  } catch {
    return { error: { message: 'Failed to delete address' } }
  }
}
