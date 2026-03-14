/**
 * Parses tweakcn-style CSS into a ThemePreset-compatible cssVars object.
 * Extracts variables from :root {} and .dark {} blocks.
 */

const COLOR_VARS = new Set([
  '--background', '--foreground', '--card', '--card-foreground',
  '--popover', '--popover-foreground', '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
  '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
  '--border', '--input', '--ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--sidebar', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring',
])

const THEME_VARS = new Set([
  '--font-sans', '--font-serif', '--font-mono', '--radius',
])

/**
 * Extract the content between the first { and its matching } after a selector match.
 */
function extractBlock(css: string, selectorPattern: RegExp): string | null {
  const match = css.match(selectorPattern)
  if (!match) return null

  const openBrace = css.indexOf('{', match.index!)
  if (openBrace === -1) return null

  let depth = 1
  let i = openBrace + 1
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth++
    if (css[i] === '}') depth--
    i++
  }

  return css.substring(openBrace + 1, i - 1)
}

/**
 * Parse CSS variable declarations from a block of text.
 */
function parseVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {}
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g
  let m
  while ((m = re.exec(block)) !== null) {
    vars[m[1]] = m[2].trim()
  }
  return vars
}

function filterVars(vars: Record<string, string>, allowed: Set<string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) {
    if (allowed.has(k)) result[k] = v
  }
  return result
}

export interface ParsedThemeVars {
  theme: Record<string, string>
  light: Record<string, string>
  dark: Record<string, string>
}

/**
 * Parse a tweakcn CSS string into structured theme variables.
 * Returns null if neither :root nor .dark blocks are found.
 */
export function parseTweakcnCSS(rawCSS: string): ParsedThemeVars | null {
  // Strip CSS comments
  const css = rawCSS.replace(/\/\*[\s\S]*?\*\//g, '')

  const rootBlock = extractBlock(css, /:root\s*\{/)
  const darkBlock = extractBlock(css, /\.dark\s*\{/)

  if (!rootBlock && !darkBlock) return null

  const rootVars = rootBlock ? parseVars(rootBlock) : {}
  const darkVars = darkBlock ? parseVars(darkBlock) : {}

  const theme: Record<string, string> = {}
  const light = filterVars(rootVars, COLOR_VARS)
  const dark = filterVars(darkVars, COLOR_VARS)

  for (const [k, v] of Object.entries(rootVars)) {
    if (THEME_VARS.has(k)) theme[k] = v
  }
  for (const [k, v] of Object.entries(darkVars)) {
    if (THEME_VARS.has(k) && !theme[k]) theme[k] = v
  }

  if (Object.keys(light).length === 0 && Object.keys(dark).length === 0) {
    return null
  }

  return { theme, light, dark }
}

/**
 * Derive a URL-safe slug from a theme name.
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
