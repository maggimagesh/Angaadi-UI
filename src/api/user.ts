import { buildApiUrl } from '../lib/api'
import { clearAuthTokenCookie, getCurrentAuthToken } from '../utils/token'

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

// Public endpoint: Sign In with email and password
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
    const token = await getCurrentAuthToken()
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
    const token = await getCurrentAuthToken()
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

    // API returns { user: { ... } }, so we need to extract the user object
    return { user: result.user || result }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Save physical stats for a user
export async function savePhysicalStats(userId: string, data: { heightUnit: string; weightUnit: string; heightValue: number; weightValue: number }): Promise<{ success?: boolean; error?: { message: string } }> {
  try {
    const token = await getCurrentAuthToken()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl('/users/physical-stats'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        ...data
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.message || 'Failed to save physical stats' 
        } 
      }
    }

    return { success: true }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

export async function removePhysicalStats(userId: string): Promise<{ success?: boolean; error?: { message: string } }> {
  try {
    const token = await getCurrentAuthToken()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/users/physical-stats?userId=${encodeURIComponent(userId)}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.status === 204) {
      return { success: true }
    }

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        error: {
          message: (result as { message?: string })?.message || 'Failed to clear physical stats'
        }
      }
    }

    return { success: true }
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}

// Forgot Password API Functions

interface ForgotPasswordRequest {
  email: string
}

interface VerifyOTPRequest {
  email: string
  otp: string
}

interface ResetPasswordRequest {
  resetToken: string
  newPassword: string
  confirmPassword: string
}

// Public endpoint: Send OTP for password reset
export async function forgotPassword(data: ForgotPasswordRequest): Promise<{ success?: boolean; error?: { message: string } }> {
  try {
    const response = await fetch(buildApiUrl('/users/forgot-password'), {
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
          message: result.message || 'Failed to send OTP' 
        } 
      }
    }

    return { success: true }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Public endpoint: Verify OTP
export async function verifyOTP(data: VerifyOTPRequest): Promise<{ resetToken?: string; error?: { message: string } }> {
  try {
    const response = await fetch(buildApiUrl('/users/verify-otp'), {
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
          message: result.message || result.error || 'Invalid OTP' 
        } 
      }
    }

    // Check if the response contains an error even with 200 status
    if (result.error || result.message && !result.resetToken && !result.token) {
      return {
        error: {
          message: result.error || result.message || 'OTP verification failed'
        }
      }
    }

    return { resetToken: result.resetToken || result.token }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Public endpoint: Reset password with new password
export async function resetPassword(data: ResetPasswordRequest): Promise<{ success?: boolean; error?: { message: string } }> {
  try {
    const response = await fetch(buildApiUrl('/users/reset-password'), {
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
          message: result.message || 'Failed to reset password' 
        } 
      }
    }

    return { success: true }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Fetch physical stats for the authenticated user
export async function fetchPhysicalStats(): Promise<{ stats?: { 
  id?: string; 
  userId?: string; 
  heightCm: number | null; 
  heightFt: number | null; 
  weightKg: number | null; 
  weightLb: number | null; 
  created_at?: string; 
  updated_at?: string 
}; error?: { message: string } }> {
  try {
    const token = await getCurrentAuthToken()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl('/users/physical-stats'), {
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
          message: result.message || 'Failed to fetch physical stats' 
        } 
      }
    }

    // The API returns { stats: { ... } }, so we should return the stats object directly
    // Or if result is already the stats object, return it directly
    return { stats: result.stats || result }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}