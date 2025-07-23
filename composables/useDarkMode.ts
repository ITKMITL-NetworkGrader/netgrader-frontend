export const useDarkMode = () => {
  const isDark = ref(false)
  
  // Check for saved theme preference or default to light mode
  const initializeTheme = () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        isDark.value = true
        document.documentElement.classList.add('dark')
      } else {
        isDark.value = false
        document.documentElement.classList.remove('dark')
      }
    }
  }
  
  // Toggle theme
  const toggleTheme = () => {
    isDark.value = !isDark.value
    
    if (typeof window !== 'undefined') {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }
  }
  
  // Set specific theme
  const setTheme = (theme: 'light' | 'dark') => {
    isDark.value = theme === 'dark'
    
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }
  }
  
  // Initialize on mount
  onMounted(() => {
    initializeTheme()
    
    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        if (!localStorage.getItem('theme')) {
          setTheme(e.matches ? 'dark' : 'light')
        }
      }
      
      mediaQuery.addEventListener('change', handleChange)
      
      // Cleanup
      onBeforeUnmount(() => {
        mediaQuery.removeEventListener('change', handleChange)
      })
    }
  })
  
  return {
    isDark: readonly(isDark),
    toggleTheme,
    setTheme
  }
}
