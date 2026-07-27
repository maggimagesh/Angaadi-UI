import { buildApiUrl } from '../lib/api'
import { getAuthTokenCookie } from '../utils/token'

interface GenderOption {
  id: string
  label: string
}

interface ApiGender {
  id: string
  gender: string
  created_at: string
  updated_at: string | null
}

interface GenderApiResponse {
  genders: ApiGender[]
  error: string
}


interface PreferredDepartmentResponse {
  id: string
  userId: string
  gender: string
  department: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// Protected endpoint: Fetch all gender options
export async function fetchGenderOptions(): Promise<{ options?: GenderOption[]; error?: { message: string } }> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl('/gender'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })

    const result: GenderApiResponse = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.error || 'Failed to fetch gender options' 
        } 
      }
    }

    // Handle the API response structure: { genders: [...] }
    const genderOptions = Array.isArray(result.genders) 
      ? result.genders.map((gender: ApiGender) => ({ 
          id: gender.id, 
          label: gender.gender 
        })) 
      : []

    return { options: genderOptions }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Set preferred department by gender selection
export async function setPreferredDepartment(userId: string, genderId: string): Promise<{ department?: PreferredDepartmentResponse; error?: { message: string } }> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const payload = {
      userId,
      genderId
    }

    const response = await fetch(buildApiUrl('/preferred-department'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.error || 'Failed to set preferred department' 
        } 
      }
    }

    return { department: result }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Fetch latest preferred department for a user
export async function fetchPreferredDepartment(userId: string): Promise<{ preference?: any; error?: { message: string } }> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/preferred-department/${userId}`), {
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
          message: result.error || 'Failed to fetch preferred department' 
        } 
      }
    }

    // The API returns { "preference": { ... } } format as you specified
    // Return the preference object directly
    return { preference: result.preference || result }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Deactivate active preferred department for a user
export async function deactivatePreferredDepartment(userId: string): Promise<{ success: boolean; message?: string; error?: { message: string } }> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { success: false, error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/preferred-department/${userId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        success: false,
        error: { 
          message: result.error || 'Failed to deactivate preferred department' 
        } 
      }
    }

    return { success: true, message: result.error || 'Preferred department deactivated' }
  } catch (error) {
    return { 
      success: false,
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}