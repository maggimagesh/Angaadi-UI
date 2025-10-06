// Utility functions to manage category ID in localStorage

const CATEGORY_STORAGE_KEY = 'angaadi_current_category_id'
const CATEGORY_SLUG_STORAGE_KEY = 'angaadi_current_category_slug'

export interface CategoryInfo {
  categoryId: number
  categorySlug?: string
}

/**
 * Store the current category information in localStorage
 */
export const storeCategoryInfo = (categoryId: number, categorySlug?: string): void => {
  try {
    localStorage.setItem(CATEGORY_STORAGE_KEY, categoryId.toString())
    if (categorySlug) {
      localStorage.setItem(CATEGORY_SLUG_STORAGE_KEY, categorySlug)
    }
  } catch (error) {
    console.error('Failed to store category info:', error)
  }
}

/**
 * Retrieve the current category information from localStorage
 */
export const getCategoryInfo = (): CategoryInfo | null => {
  try {
    const categoryId = localStorage.getItem(CATEGORY_STORAGE_KEY)
    const categorySlug = localStorage.getItem(CATEGORY_SLUG_STORAGE_KEY)
    
    if (categoryId) {
      return {
        categoryId: parseInt(categoryId, 10),
        categorySlug: categorySlug || undefined
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to retrieve category info:', error)
    return null
  }
}

/**
 * Clear category information from localStorage
 */
export const clearCategoryInfo = (): void => {
  try {
    localStorage.removeItem(CATEGORY_STORAGE_KEY)
    localStorage.removeItem(CATEGORY_SLUG_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear category info:', error)
  }
}

/**
 * Get the current category ID, or return a default value
 */
export const getCurrentCategoryId = (defaultValue: number = 1): number => {
  const categoryInfo = getCategoryInfo()
  return categoryInfo ? categoryInfo.categoryId : defaultValue
}

/**
 * Get the current category slug
 */
export const getCurrentCategorySlug = (): string | null => {
  const categoryInfo = getCategoryInfo()
  return categoryInfo?.categorySlug || null
}
