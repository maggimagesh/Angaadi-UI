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

export interface ProductItem {
  id: number
  categoryid: number
  productname: string
  description: string
  imageurl: string
  badge: string
  price: string // API returns price as string
  oldprice: string
  ratingscount: number
  starrating: string // API returns rating as string
  brand: string
  stock: number // API returns stock as number (quantity)
  slug: string
  discountpercent: number
  freedelivery: boolean
  isactive: boolean
  created_at: string
  updated_at: string
}

interface CategoryResponse {
  products: Category[]
}

interface ProductsByCategoryResponse {
  products: ProductItem[]
  total: number
  page: number
  limit: number
  categoryInfo?: {
    id: number
    name: string
    slug: string
  }
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

// Public endpoint: Fetch products by category
export async function fetchProductsByCategory(
  categoryId: number | string,
  page: number = 1,
  limit: number = 12
): Promise<ApiResponse<ProductsByCategoryResponse>> {
  try {
    // Convert categoryId to number if it's a string
    const numericCategoryId = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId
    
    const response = await fetch(buildApiUrl('/products/by-category'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categoryid: numericCategoryId,
        page,
        limit
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.message || 'Failed to fetch products' 
        } 
      }
    }

    return { data: result }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}

