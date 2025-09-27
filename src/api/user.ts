export type UserDetailsInsert = {
  firstName: string
  lastName: string
  emailId: string
  password: string
} 

import { buildApiUrl } from '../lib/api'

export async function createUserRecord(payload: UserDetailsInsert): Promise<{ row: any | null; error: any | null }> {
  try {
    const res = await fetch(buildApiUrl('/users/createUser'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      const errorMessage = (errJson && (errJson.message || errJson.error)) || res.statusText || 'Request failed'
      return { row: null, error: { message: errorMessage, details: errJson?.details ?? null, status: res.status } }
    }
    const data = await res.json()
    return { row: data.user ?? data, error: null }
  } catch (e: any) {
    return { row: null, error: { message: e?.message || 'Network error' } }
  }
}

export type SignInInput = {
  emailId: string
  password: string
}

export async function signIn(payload: SignInInput): Promise<{ user: any | null; token: string | null; error: any | null }>{
  try {
    const res = await fetch(buildApiUrl('/users/signIn'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      const errorMessage = (errJson && (errJson.message || errJson.error)) || res.statusText || 'Request failed'
      return { user: null, token: null, error: { message: errorMessage, status: res.status } }
    }
    const authHeader = res.headers.get('authorization') || res.headers.get('Authorization') || res.headers.get('x-access-token')
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : authHeader || null
    const data = await res.json()
    const bodyToken = data?.token || data?.jwt || data?.accessToken || data?.authToken || data?.user?.token || null
    const token = bodyToken || bearerToken || null
    return { user: data.user ?? data, token, error: null }
  } catch (e: any) {
    return { user: null, token: null, error: { message: e?.message || 'Network error' } }
  }
}


import { getAuthTokenCookie } from '../utils/token'

export async function fetchUserById(userId: string, token?: string): Promise<{ user: any | null; error: any | null }>{
  try {
    const headerToken = token || getAuthTokenCookie()
    const res = await fetch(buildApiUrl(`/users/${encodeURIComponent(userId)}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(headerToken ? { Authorization: `Bearer ${headerToken}` } : {}),
      },
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      const errorMessage = (errJson && (errJson.message || errJson.error)) || res.statusText || 'Request failed'
      return { user: null, error: { message: errorMessage, status: res.status } }
    }
    const data = await res.json()
    return { user: data.user ?? data, error: null }
  } catch (e: any) {
    return { user: null, error: { message: e?.message || 'Network error' } }
  }
}


