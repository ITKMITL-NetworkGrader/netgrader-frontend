import type { User } from '~/composables/states'

export default defineNuxtPlugin(async () => {
  const userState = useUserState()
  const config = useRuntimeConfig()
  const backendURL = config.public.backendurl

  // Only run on client-side and if user state is not already set
  if (import.meta.client && !userState.value) {
    // Apply theme from localStorage immediately (before API response)
    const { initFromLocalStorage, initFromUser, fetchCustomThemes } = useTheme()
    initFromLocalStorage()

    try {
      const userData = await $fetch<User>(`${backendURL}/v0/auth/me`, {
        method: 'GET',
        credentials: 'include',
      })

      if (userData) {
        userState.value = userData
        // Fetch custom themes from DB, then apply user's saved preferences
        await fetchCustomThemes()
        initFromUser(userData)
      }
    } catch {
      // User not authenticated
    }
  }
})
