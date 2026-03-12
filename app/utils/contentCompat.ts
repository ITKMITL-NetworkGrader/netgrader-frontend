import TurndownService from 'turndown'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { RichTextContent } from '~/types/wizard'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
})

// Custom rule: preserve image src and alt
turndown.addRule('images', {
  filter: 'img',
  replacement(_content, node) {
    const el = node as HTMLElement
    const alt = el.getAttribute('alt') || ''
    const src = el.getAttribute('src') || ''
    return src ? `![${alt}](${src})` : ''
  },
})

/**
 * Detect if content looks like HTML (has tags) vs plain Markdown
 */
export function isHtmlContent(content: string): boolean {
  if (!content || !content.trim()) return false
  // Check for common HTML patterns
  return /<\/?[a-z][\s\S]*>/i.test(content.trim())
}

/**
 * Convert HTML to Markdown using turndown.
 * Lossy: strips text color, alignment, and other non-Markdown features.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return ''
  try {
    return turndown.turndown(html).trim()
  } catch {
    // Fallback: strip tags and return plain text
    return html.replace(/<[^>]*>/g, '').trim()
  }
}

/**
 * Convert Markdown to sanitized HTML for display
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return ''
  try {
    const raw = marked.parse(markdown, { async: false }) as string
    return DOMPurify.sanitize(raw)
  } catch {
    return DOMPurify.sanitize(markdown)
  }
}

/**
 * Get the best content for the Milkdown editor (always Markdown)
 */
export function getEditorContent(content: RichTextContent | string | undefined): string {
  if (!content) return ''

  // String input — detect format
  if (typeof content === 'string') {
    return isHtmlContent(content) ? htmlToMarkdown(content) : content
  }

  // RichTextContent object — prefer markdown field
  if (content.markdown) return content.markdown
  if (content.html) return htmlToMarkdown(content.html)
  return ''
}

/**
 * Get HTML for display (read-only rendering).
 * Uses markdown if available, falls back to legacy HTML.
 */
export function getDisplayHtml(content: RichTextContent | string | undefined): string {
  if (!content) return ''

  if (typeof content === 'string') {
    if (isHtmlContent(content)) return DOMPurify.sanitize(content)
    return markdownToHtml(content)
  }

  // Prefer rendering from markdown for consistency
  if (content.markdown) return markdownToHtml(content.markdown)
  if (content.html) return DOMPurify.sanitize(content.html)
  return ''
}

/**
 * Build a RichTextContent object from Markdown (for saving)
 */
export function buildRichTextContent(markdown: string): RichTextContent {
  return {
    html: markdownToHtml(markdown),
    json: { type: 'doc', content: [] }, // Legacy field, kept for compat
    markdown,
  }
}
