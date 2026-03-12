export interface ThemePreset {
  id: string
  name: string
  description?: string
  cssVars: {
    theme: Record<string, string>
    light: Record<string, string>
    dark: Record<string, string>
  }
}
