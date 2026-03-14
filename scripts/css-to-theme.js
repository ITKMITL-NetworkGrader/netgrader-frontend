#!/usr/bin/env node

/**
 * Converts a tweakcn-style CSS theme file into a ThemePreset .ts file.
 *
 * Usage:
 *   node scripts/css-to-theme.js <input.css> [theme-id] [theme-name]
 *
 * Examples:
 *   node scripts/css-to-theme.js ~/Downloads/violet-rose.css
 *   node scripts/css-to-theme.js ~/Downloads/violet-rose.css violet-rose "Violet Rose"
 *
 * The output .ts file is written to app/data/themes/<theme-id>.ts
 */

const fs = require('fs')
const path = require('path')

const [,, cssPath, overrideId, overrideName] = process.argv

if (!cssPath) {
  console.error('Usage: node scripts/css-to-theme.js <input.css> [theme-id] [theme-name]')
  process.exit(1)
}

const css = fs.readFileSync(path.resolve(cssPath), 'utf8')

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

function parseBlock(blockContent) {
  const vars = {}
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g
  let m
  while ((m = re.exec(blockContent)) !== null) {
    vars[m[1]] = m[2].trim()
  }
  return vars
}

function extractSection(source, selectorRe) {
  const match = source.match(selectorRe)
  if (!match) return {}
  const start = source.indexOf('{', match.index) + 1
  let depth = 1, i = start
  while (depth > 0 && i < source.length) {
    if (source[i] === '{') depth++
    if (source[i] === '}') depth--
    i++
  }
  return parseBlock(source.substring(start, i - 1))
}

const rootVars = extractSection(css, /:root\s*\{/)
const darkVars = extractSection(css, /\.dark\s*\{/)

const theme = {}
const light = {}
const dark = {}

for (const [k, v] of Object.entries(rootVars)) {
  if (THEME_VARS.has(k)) theme[k] = v
  else if (COLOR_VARS.has(k)) light[k] = v
}

for (const [k, v] of Object.entries(darkVars)) {
  if (COLOR_VARS.has(k)) dark[k] = v
  if (THEME_VARS.has(k) && !theme[k]) theme[k] = v
}

const basename = path.basename(cssPath, path.extname(cssPath))
const id = overrideId || basename
const name = overrideName || id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
const exportName = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Theme'

function objToString(obj, indent) {
  const pad = ' '.repeat(indent)
  const lines = Object.entries(obj).map(([k, v]) => `${pad}  '${k}': '${v}',`)
  return `{\n${lines.join('\n')}\n${pad}}`
}

const ts = `import type { ThemePreset } from './types'

export const ${exportName}: ThemePreset = {
  id: '${id}',
  name: '${name}',
  cssVars: {
    theme: ${objToString(theme, 4)},
    light: ${objToString(light, 4)},
    dark: ${objToString(dark, 4)},
  },
}
`

const outDir = path.resolve(__dirname, '../app/data/themes')
const outPath = path.join(outDir, `${id}.ts`)
fs.writeFileSync(outPath, ts)

console.log('Created ' + outPath)
console.log('')
console.log('Now add to app/data/themes/index.ts:')
console.log('  import { ' + exportName + " } from './" + id + "'")
console.log('  // Add ' + exportName + ' to the themes array and re-export it')
