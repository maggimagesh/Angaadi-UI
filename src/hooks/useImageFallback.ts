import { type SyntheticEvent } from 'react'

export function useImageFallback() {
  const handleImageError = (
    event: SyntheticEvent<HTMLImageElement>,
    fallbackUrl?: string
  ) => {
    const img = event.currentTarget
    const fallback = fallbackUrl || img.dataset.fallback

    if (fallback && img.src !== fallback) {
      img.onerror = null
      img.src = fallback
    }
  }

  return { handleImageError }
}
