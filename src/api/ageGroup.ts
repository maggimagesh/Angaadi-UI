import { secureFetch } from '../lib/secureClient'
import { getAuthTokenCookie } from '../utils/token'

export interface AgeGroup {
  id: string
  ageRange: string
  minAge: number
  maxAge: number
  created_at: string
  updated_at: string | null
}

export interface UserAgeGroup {
  id: string
  userId: string
  ageGroupId: string
  isActive: number
  created_at: string
  updated_at: string | null
  ageGroup?: AgeGroup
}

// Protected endpoint: Fetch all age groups
export async function fetchAllAgeGroups(): Promise<{ 
  ageGroups?: AgeGroup[]; 
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await secureFetch('/age-group', {
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
          message: result.error || result.message || 'Failed to fetch age groups' 
        } 
      }
    }

    return { ageGroups: result.ageGroups || [] }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Get user's active age group
export async function fetchUserAgeGroup(userId: string): Promise<{ 
  userAgeGroup?: UserAgeGroup; 
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await secureFetch(`/age-group/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })

    const result = await response.json()

    if (!response.ok) {
      // 404 is expected when user hasn't selected an age group yet
      if (response.status === 404) {
        return { userAgeGroup: undefined }
      }
      return { 
        error: { 
          message: result.error || result.details || 'Failed to fetch user age group' 
        } 
      }
    }

    return { userAgeGroup: result.userAgeGroup }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Save user's age group selection
export async function saveUserAgeGroup(userId: string, ageGroupId: string): Promise<{ 
  userAgeGroup?: UserAgeGroup; 
  message?: string;
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await secureFetch('/age-group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        ageGroupId
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.error || result.details || 'Failed to save age group' 
        } 
      }
    }

    return { 
      userAgeGroup: result.userAgeGroup,
      message: result.message || 'Age group saved successfully'
    }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Remove user's age group
export async function removeUserAgeGroup(userId: string): Promise<{ 
  success: boolean;
  message?: string;
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { success: false, error: { message: 'Authentication required' } }
    }

    const response = await secureFetch(`/age-group/${userId}`, {
      method: 'DELETE',
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
          message: result.error || result.details || 'Failed to remove age group' 
        } 
      }
    }

    return { 
      success: true,
      message: result.message || 'Age group has been removed successfully'
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

