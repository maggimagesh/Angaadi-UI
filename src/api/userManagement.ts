import { buildApiUrl } from '../lib/api'
import { getAuthTokenCookie } from '../utils/token'

interface UserResponse {
  id?: string
  userId?: string
  firstName?: string
  lastName?: string
  emailId?: string
}

// Protected endpoint: Fetch all users
export async function fetchAllUsers(): Promise<{ users?: UserResponse[]; error?: { message: string } }> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl('/users'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.message || 'Failed to fetch users' 
        } 
      }
    }

    return { users: result }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Fetch a specific user by ID
export async function fetchUserById(userId: string): Promise<{ user?: UserResponse; error?: { message: string } }> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/users/${userId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.message || 'Failed to fetch user' 
        } 
      }
    }

    return { user: result }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}