import { ref, watch } from 'vue'
import { extractImagePaths, fetchPresignedUrls, replaceImagePaths } from '../utils/imageUrl'

/**
 * Composable to refresh image URLs in markdown content
 * Call refreshImages(markdown) to get HTML with fresh presigned URLs
 */
export function useImageUrlRefresh(backendUrl: string) {
  const urlMap = ref<Record<string, string>>({})
  const isLoading = ref(false)

  async function refreshImages(markdown: string | undefined | null): Promise<string> {
    if (!markdown) return ''

    // Handle rich text objects
    let md = ''
    if (typeof markdown === 'string') {
      md = markdown
    } else if (markdown && typeof markdown === 'object') {
      md = markdown.markdown || markdown.html || ''
    }

    if (!md) return ''

    const paths = extractImagePaths(md)
    if (paths.length === 0) {
      // No editor images, return as-is
      return typeof markdown === 'string' ? markdown : (markdown.markdown || markdown.html || '')
    }

    isLoading.value = true
    try {
      urlMap.value = await fetchPresignedUrls(paths, backendUrl)
      return replaceImagePaths(md, urlMap.value)
    } catch (error) {
      console.error('Failed to refresh image URLs:', error)
      return md
    } finally {
      isLoading.value = false
    }
  }

  return {
    urlMap,
    isLoading,
    refreshImages,
  }
}
