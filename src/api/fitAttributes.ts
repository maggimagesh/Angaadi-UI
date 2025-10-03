import { buildApiUrl } from '../lib/api'
import { getAuthTokenCookie } from '../utils/token'

export interface FitAttribute {
  id: string
  name: string
  category: 'mens' | 'womens'
  displayOrder: number
  created_at: string
  updated_at: string | null
}

export interface FitAttributeOption {
  id: number
  attributeName: string
  optionValue: string
}

export interface FitAttributeApiResponse {
  data: Array<{
    attributeName: string
    options: Array<{
      id: number
      value: string
    }>
  }>
}

export interface UserFitAttribute {
  id: string
  userId: string
  fitAttributeId: string
  value: string
  isActive: number
  created_at: string
  updated_at?: string | null
  fitAttribute?: {
    id?: string
    name: string
    category: 'mens' | 'womens'
    displayOrder?: number
  }
}

export interface SaveFitAttributeRequest {
  userId: string
  fitAttributeId: string
  value: string
}

export interface BatchSaveFitAttributesRequest {
  userId: string
  attributes: Array<{
    fitAttributeId: string
    value: string
  }>
}

// Store the raw API options for lookup during save
let cachedFitAttributeOptions: FitAttributeOption[] = []

export function getCachedFitAttributeOptions(): FitAttributeOption[] {
  return cachedFitAttributeOptions
}

// Protected endpoint: Fetch all available fit attributes
export async function fetchAllFitAttributes(): Promise<{ 
  fitAttributes?: FitAttribute[]; 
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const url = buildApiUrl('/fit-attributes')

    const response = await fetch(url, {
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
          message: result.error || result.details || result.message || 'Failed to fetch fit attributes' 
        } 
      }
    }

    // Handle the new API response format: { data: [{ attributeName, options: [{ id, value }] }] }
    const apiData = result.data || []
    
    // Flatten and cache all options for later use during save
    cachedFitAttributeOptions = []
    apiData.forEach((attr: any) => {
      const attributeName = attr.attributeName
      if (attr.options && Array.isArray(attr.options)) {
        attr.options.forEach((opt: any) => {
          cachedFitAttributeOptions.push({
            id: opt.id,
            attributeName: attributeName,
            optionValue: opt.value
          })
        })
      }
    })
    
    // Create FitAttribute objects from the grouped data
    const fitAttributes: FitAttribute[] = apiData.map((attr: any, index: number) => ({
      id: attr.attributeName.toLowerCase().replace(/[\/\s]/g, '-'), // Create consistent ID from name
      name: attr.attributeName,
      category: attr.category || 'womens', // Use category from API response or default
      displayOrder: index,
      created_at: new Date().toISOString(),
      updated_at: null
    }))

    return { fitAttributes }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Get user's active fit attributes
export async function fetchUserFitAttributes(userId: string): Promise<{ 
  userFitAttributes?: UserFitAttribute[];
  lastUpdated?: string;
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/fit-attributes/${userId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })

    const result = await response.json()

    if (!response.ok) {
      // 404 is expected when user hasn't added any fit attributes yet
      if (response.status === 404) {
        return { userFitAttributes: [] }
      }
      return { 
        error: { 
          message: result.error || result.details || 'Failed to fetch user fit attributes' 
        } 
      }
    }

    // Handle new API response structure: { userFitAttributes: { shoulder: {...}, waist: {...}, ... } }
    const apiData = result.userFitAttributes
    
    if (!apiData) {
      return { userFitAttributes: [] }
    }

    // Extract timestamp for "last updated"
    const lastUpdated = apiData.updated_at || apiData.created_at || null
    
    // Transform the nested structure to flat array
    const userAttributes: UserFitAttribute[] = []
    const attributeKeys = ['shoulder', 'waist', 'thighs', 'hips']
    
    attributeKeys.forEach((key, index) => {
      const attrData = apiData[key]
      if (attrData && attrData.attributeName && attrData.optionValue) {
        userAttributes.push({
          id: attrData.id?.toString() || '',
          userId: apiData.userId || userId,
          fitAttributeId: attrData.attributeName.toLowerCase().replace(/[\/\s]/g, '-'),
          value: attrData.optionValue,
          isActive: 1,
          created_at: apiData.created_at || new Date().toISOString(),
          updated_at: apiData.updated_at || null,
          fitAttribute: {
            name: attrData.attributeName,
            category: 'womens', // Default to womens, adjust as needed
            displayOrder: index
          }
        })
      }
    })

    return { 
      userFitAttributes: userAttributes,
      lastUpdated: lastUpdated 
    }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Save single user fit attribute
export async function saveFitAttribute(
  userId: string, 
  fitAttributeId: string, 
  value: string
): Promise<{ 
  userFitAttribute?: UserFitAttribute; 
  message?: string;
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl('/fit-attributes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        fitAttributeId,
        value
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.error || result.details || 'Failed to save fit attribute' 
        } 
      }
    }

    return { 
      userFitAttribute: result.userFitAttribute,
      message: result.message || 'Fit attribute saved successfully'
    }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Batch save user fit attributes
export async function batchSaveFitAttributes(
  userId: string,
  attributes: Array<{ fitAttributeId: string; value: string }>
): Promise<{ 
  success?: boolean;
  userFitAttributes?: UserFitAttribute[];
  message?: string;
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { error: { message: 'Authentication required' } }
    }

    // Transform attributes to find matching option IDs from the API
    const optionIds: number[] = []
    
    for (const attr of attributes) {
      // Find the FitAttribute to get the actual attribute name
      const fitAttr = cachedFitAttributeOptions.find(opt => 
        opt.attributeName.toLowerCase().replace(/[\/\s]/g, '-') === attr.fitAttributeId
      )
      
      if (!fitAttr) {
        // Try direct name match
        const matchingOption = cachedFitAttributeOptions.find(opt => 
          opt.attributeName.toLowerCase() === attr.fitAttributeId.toLowerCase() &&
          opt.optionValue === attr.value
        )
        
        if (matchingOption) {
          optionIds.push(matchingOption.id)
        }
      } else {
        // Find the specific option ID for this attribute name + value combination
        const matchingOption = cachedFitAttributeOptions.find(opt => 
          opt.attributeName === fitAttr.attributeName && 
          opt.optionValue === attr.value
        )
        
        if (matchingOption) {
          optionIds.push(matchingOption.id)
        }
      }
    }

    if (optionIds.length === 0) {
      return { 
        error: { 
          message: 'No valid attributes to save' 
        } 
      }
    }

    const response = await fetch(buildApiUrl('/fit-attributes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        fitAttributeIds: optionIds
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.error || result.details || 'Failed to save fit attributes' 
        } 
      }
    }

    return { 
      success: true,
      userFitAttributes: result.userFitAttributes,
      message: result.message || 'Fit attributes saved successfully'
    }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

// Protected endpoint: Delete specific user fit attribute
export async function removeFitAttribute(
  userId: string,
  fitAttributeId: string
): Promise<{ 
  success: boolean;
  message?: string;
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { success: false, error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/fit-attributes/${userId}?fitAttributeId=${fitAttributeId}`), {
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
          message: result.error || result.details || 'Failed to remove fit attribute' 
        } 
      }
    }

    return { 
      success: true,
      message: result.message || 'Fit attribute has been removed successfully'
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

// Protected endpoint: Delete all user fit attributes
export async function removeAllFitAttributes(userId: string): Promise<{ 
  success: boolean;
  message?: string;
  error?: { message: string } 
}> {
  try {
    const token = getAuthTokenCookie()
    if (!token) {
      return { success: false, error: { message: 'Authentication required' } }
    }

    const response = await fetch(buildApiUrl(`/fit-attributes/${userId}`), {
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
          message: result.error || result.details || 'Failed to remove fit attributes' 
        } 
      }
    }

    return { 
      success: true,
      message: result.message || 'All fit attributes have been removed successfully'
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

