import { themes as staticThemes, defaultTheme } from '~/data/themes'
import type { ThemePreset } from '~/data/themes'

const STORAGE_KEY_THEME = 'ng-theme'
const STORAGE_KEY_COLOR_MODE = 'ng-color-mode'

type ColorMode = 'light' | 'dark' | 'system'

// Shared state for custom themes fetched from DB (singleton across composable calls)
const customThemes = ref<ThemePreset[]>([])
const customThemesFetched = ref(false)

// Force dark mode immediately on client to prevent white flash
if (import.meta.client) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COLOR_MODE) || 'dark'
    const isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch (e) {
    // localStorage not available
  }
}

export const useTheme = () => {
  const currentThemeId = useState<string>('theme-id', () => 'default')
  const colorMode = useState<ColorMode>('color-mode', () => 'dark')

  // Merged list: static bundled themes + custom DB themes
  const allThemes = computed<ThemePreset[]>(() => [
    ...staticThemes,
    ...customThemes.value,
  ])

  const currentTheme = computed<ThemePreset>(() => {
    return allThemes.value.find(t => t.id === currentThemeId.value) || defaultTheme
  })

  const resolvedColorMode = computed<'light' | 'dark'>(() => {
    if (colorMode.value === 'system') {
      if (typeof window === 'undefined') return 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return colorMode.value
  })

  function findTheme(id: string): ThemePreset {
    return allThemes.value.find(t => t.id === id) || defaultTheme
  }

  function applyThemeVars(theme: ThemePreset, mode: 'light' | 'dark') {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    // Apply theme-level vars (fonts, radius)
    for (const [key, value] of Object.entries(theme.cssVars.theme)) {
      root.style.setProperty(key, value)
    }

    // Apply mode-specific vars to :root
    const modeVars = mode === 'dark' ? theme.cssVars.dark : theme.cssVars.light
    for (const [key, value] of Object.entries(modeVars)) {
      root.style.setProperty(key, value)
    }

    // Toggle dark class
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  function fadeTransition(callback: () => void) {
    // CSS transitions handle smooth color changes - no overlay needed
    callback()
  }

  function applyTheme(themeId: string, withTransition = false) {
    const theme = findTheme(themeId)
    currentThemeId.value = theme.id

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_THEME, theme.id)
    }

    const apply = () => applyThemeVars(theme, resolvedColorMode.value)

    if (withTransition) {
      fadeTransition(apply)
    } else {
      apply()
    }
  }

  function applyColorMode(mode: ColorMode, withTransition = true) {
    colorMode.value = mode

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_COLOR_MODE, mode)
    }

    const apply = () => applyThemeVars(currentTheme.value, resolvedColorMode.value)

    // Use transition to prevent white flash
    fadeTransition(apply)
  }

  async function savePreferences() {
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl

    await $fetch(`${backendURL}/v0/profile/preferences`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        themePreference: currentThemeId.value,
        colorMode: colorMode.value,
      },
    })
  }

  /**
   * Fetch custom themes from the API and merge into allThemes.
   * Only fetches once per session unless force is true.
   */
  async function fetchCustomThemes(force = false) {
    if (customThemesFetched.value && !force) return

    try {
      const config = useRuntimeConfig()
      const backendURL = config.public.backendurl

      const response = await $fetch<{ success: boolean; data: any[] }>(
        `${backendURL}/v0/themes`,
        { method: 'GET', credentials: 'include' },
      )

      if (response.success && response.data) {
        customThemes.value = response.data.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          cssVars: t.cssVars,
        }))
      }
    } catch {
      // Not authenticated or API unavailable — custom themes just won't show
    }

    customThemesFetched.value = true
  }

  function initFromUser(user: { themePreference?: string; colorMode?: string }) {
    const themeId = user.themePreference || 'default'
    const mode = (user.colorMode as ColorMode) || 'dark'

    currentThemeId.value = themeId
    colorMode.value = mode

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_THEME, themeId)
      localStorage.setItem(STORAGE_KEY_COLOR_MODE, mode)
    }

    applyThemeVars(
      findTheme(themeId),
      mode === 'system'
        ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : mode as 'light' | 'dark'
    )
  }

  function initFromLocalStorage() {
    if (typeof localStorage === 'undefined') return

    const storedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'default'
    const storedMode = (localStorage.getItem(STORAGE_KEY_COLOR_MODE) as ColorMode) || 'dark'

    currentThemeId.value = storedTheme
    colorMode.value = storedMode

    applyThemeVars(
      findTheme(storedTheme),
      storedMode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : storedMode as 'light' | 'dark'
    )
  }

  function resetToDefault(withTransition = true) {
    const reset = () => {
      currentThemeId.value = 'default'
      colorMode.value = 'dark'

      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_THEME)
        localStorage.removeItem(STORAGE_KEY_COLOR_MODE)
      }

      applyThemeVars(defaultTheme, 'dark')
    }

    if (withTransition) {
      fadeTransition(reset)
    } else {
      reset()
    }
  }

  // Listen for system theme changes when in "system" mode
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (colorMode.value === 'system') {
        applyThemeVars(currentTheme.value, resolvedColorMode.value)
      }
    })
  }

  return {
    currentThemeId: readonly(currentThemeId),
    colorMode: readonly(colorMode),
    currentTheme,
    resolvedColorMode,
    allThemes,
    staticThemes,
    customThemes: readonly(customThemes),
    applyTheme,
    applyColorMode,
    savePreferences,
    fetchCustomThemes,
    initFromUser,
    initFromLocalStorage,
    resetToDefault,
  }
}
