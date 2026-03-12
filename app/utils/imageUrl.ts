import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Allowed path prefixes for security
const ALLOWED_PATH_PREFIXES = ['editor/', 'profiles/', 'courses/']

/**
 * Check if a path is allowed for proxy access
 */
export function isAllowedImagePath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix))
}

/**
 * Get authenticated proxy URL for an image path
 * No expiry issues - authenticated on every request
 */
export function getImageUrl(objectPath: string, backendUrl: string): string {
  if (!objectPath || !isAllowedImagePath(objectPath)) {
    return objectPath
  }

  // Already a full URL (legacy)
  if (objectPath.startsWith('http')) {
    return objectPath
  }

  // Use authenticated proxy endpoint (no expiry)
  return `${backendUrl}/v0/storage/serve/${objectPath}`
}

/**
 * Extract MinIO object paths from markdown content
 */
export function extractImagePaths(markdown: string): string[] {
  if (!markdown) return []

  const paths: string[] = []
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g
  let match
  while ((match = regex.exec(markdown)) !== null) {
    const url = match[2]

    // Case 1: Already an object path (new format)
    if (!url.startsWith('http') && isAllowedImagePath(url)) {
      paths.push(url)
    }
    // Case 2: Full presigned URL (legacy format) - extract path
    else if (url.startsWith('http')) {
      try {
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split('/').filter(Boolean)
        for (const prefix of ALLOWED_PATH_PREFIXES) {
          const prefixPart = prefix.replace('/', '')
          const idx = pathParts.indexOf(prefixPart)
          if (idx !== -1) {
            const path = pathParts.slice(idx).join('/')
            paths.push(path)
            break
          }
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }
  return [...new Set(paths)]
}

/**
 * Replace image paths in markdown with proxy URLs
 */
export function replaceImagePaths(markdown: string, backendUrl: string): string {
  if (!markdown) return markdown

  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, path) => {
    const url = getImageUrl(path, backendUrl)
    return `![${alt}](${url})`
  })
}

/**
 * Render markdown to HTML with proxy image URLs (no expiry)
 */
export function renderMarkdownWithImages(
  markdown: string | any,
  backendUrl: string,
  dompurifyConfig?: any
): string {
  let md = ''
  if (typeof markdown === 'string') {
    md = markdown
  } else if (markdown && typeof markdown === 'object') {
    md = markdown.markdown || markdown.html || ''
  }

  if (!md) return ''

  // Replace paths with proxy URLs
  const processedMarkdown = replaceImagePaths(md, backendUrl)

  // Convert to HTML
  const htmlContent = marked(processedMarkdown)
  const sanitized = DOMPurify.sanitize(htmlContent, dompurifyConfig)

  return sanitized
}
