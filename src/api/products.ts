import { buildApiUrl } from '../lib/api'

export interface Category {
  id: number
  productname: string
  description: string
  created_at: string
  slug: string | null
  badge: string
  imageurl: string | null
  displayorder: number
  isactive: boolean
  icon: string | null
  productcount: number
  updated_at: string
}

interface CategoryResponse {
  products: Category[]
}

interface ApiResponse<T> {
  data?: T
  error?: {
    message: string
  }
}

// Public endpoint: Fetch all product categories
export async function fetchCategories(): Promise<ApiResponse<Category[]>> {
  try {
    const response = await fetch(buildApiUrl('/products'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result: CategoryResponse = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: (result as any).message || 'Failed to fetch categories' 
        } 
      }
    }

    return { data: result.products }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

