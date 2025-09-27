export type UserDetailsInsert = {
  firstName: string
  lastName: string
  emailId: string
  password: string
}

const API_BASE: string = (import.meta as any).env?.BACKEND_URL || 'http://localhost:3300/api/v1'

export async function createUserRecord(payload: UserDetailsInsert): Promise<{ row: any | null; error: any | null }> {
  try {
    const res = await fetch(`${API_BASE}/users/createUser`, {
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

export async function signIn(payload: SignInInput): Promise<{ user: any | null; error: any | null }>{
  try {
    const res = await fetch(`${API_BASE}/users/signIn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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


