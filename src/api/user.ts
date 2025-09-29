import { buildApiUrl } from '../lib/api'
import { getAuthTokenCookie, clearAuthTokenCookie } from '../utils/token'

interface CreateUserRequest {
  firstName: string
  lastName: string
  emailId: string
  password: string
}

interface SignInRequest {
  emailId: string
  password: string
}

interface UserResponse {
  id?: string
  userId?: string
  _id?: string
  firstName?: string
  lastName?: string
  emailId?: string
  token?: string
  jwt?: string
  accessToken?: string
}

interface ApiResponse<T> {
  user?: T
  token?: string
  error?: {
    message: string
  }
}

// Public endpoint: Create a new user
export async function createUserRecord(data: CreateUserRequest): Promise<ApiResponse<UserResponse>> {
  try {
    const response = await fetch(buildApiUrl('/users/createUser'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.message || 'Failed to create user' 
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

// Public endpoint: Sign in with email and password
export async function signIn(data: SignInRequest): Promise<ApiResponse<UserResponse>> {
  try {
    const response = await fetch(buildApiUrl('/users/signIn'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.message || 'Invalid email or password' 
        } 
      }
    }

    return { user: result.user || result, token: result.token }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Public endpoint: Sign out
export async function signOut(): Promise<{ success: boolean; message?: string; error?: { message: string } }> {
  try {
    const response = await fetch(buildApiUrl('/users/signOut'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Clear the auth token cookie regardless of API response
    clearAuthTokenCookie()

    const result = await response.json()

    if (!response.ok) {
      return { 
        success: false,
        error: { 
          message: result.message || 'Failed to sign out' 
        } 
      }
    }

    return { success: true, message: result.message || 'Signed out successfully' }
  } catch (error) {
    return { 
      success: false,
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
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