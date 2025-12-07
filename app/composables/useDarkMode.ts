export const useDarkMode = () => {
  const isDark = ref(true) // Default to dark mode
  
  // Force dark mode - no user preference checking
  const initializeTheme = () => {
    if (typeof window !== 'undefined') {
      isDark.value = true
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }
  
  // Initialize on mount
  onMounted(() => {
    initializeTheme()
  })
  
  return {
    isDark: readonly(isDark)
  }
}
