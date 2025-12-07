import type { Play, PlayVariable, APIResponse } from '~/types/lab'

export const usePlayBank = () => {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.backend1url}/v0/api`

  const plays = ref<Play[]>([])
  const isLoading = ref(false)
  const selectedPlay = ref<Play | null>(null)

  const loadPlays = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Play[]>>(`${baseURL}/plays`)
      if (response.success && response.data) {
        plays.value = response.data
      }
    } catch (error) {
      console.error('Failed to load plays:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getPlayById = async (playId: string): Promise<Play | null> => {
    try {
      const response = await $fetch<APIResponse<Play>>(`${baseURL}/plays/${playId}`)
      if (response.success && response.data) {
        return response.data
      }
      return null
    } catch (error) {
      console.error('Failed to get play:', error)
      return null
    }
  }

  const selectPlay = (play: Play) => {
    selectedPlay.value = play
  }

  const clearSelection = () => {
    selectedPlay.value = null
  }

  const getPlayVariables = (playId: string): PlayVariable[] => {
    const play = plays.value.find(p => p.id === playId)
    return play?.variables || []
  }

  const validateVariableBindings = (playId: string, variables: Record<string, any>): { isValid: boolean; errors: string[] } => {
    const playVariables = getPlayVariables(playId)
    const errors: string[] = []

    playVariables.forEach(variable => {
      if (variable.required && (!variables[variable.name] || variables[variable.name] === '')) {
        errors.push(`Variable '${variable.name}' is required`)
      }

      if (variables[variable.name]) {
        const value = variables[variable.name]
        switch (variable.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Variable '${variable.name}' must be a number`)
            }
            break
          case 'ip_address':
            if (!isValidIPAddress(value)) {
              errors.push(`Variable '${variable.name}' must be a valid IP address`)
            }
            break
          case 'group_number':
            const groupNum = Number(value)
            if (isNaN(groupNum) || groupNum < 1 || groupNum > 32) {
              errors.push(`Variable '${variable.name}' must be a group number between 1 and 32`)
            }
            break
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const createDefaultVariableBindings = (playId: string): Record<string, any> => {
    const playVariables = getPlayVariables(playId)
    const bindings: Record<string, any> = {}

    playVariables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        bindings[variable.name] = variable.defaultValue
      } else {
        // Set appropriate default based on type
        switch (variable.type) {
          case 'string':
            bindings[variable.name] = ''
            break
          case 'number':
            bindings[variable.name] = 0
            break
          case 'ip_address':
            bindings[variable.name] = '192.168.1.1'
            break
          case 'group_number':
            bindings[variable.name] = 1
            break
          default:
            bindings[variable.name] = ''
        }
      }
    })

    return bindings
  }

  const searchPlays = (query: string): Play[] => {
    if (!query.trim()) return plays.value

    const lowercaseQuery = query.toLowerCase()
    return plays.value.filter(play =>
      play.name.toLowerCase().includes(lowercaseQuery) ||
      play.description.toLowerCase().includes(lowercaseQuery)
    )
  }

  const filterPlaysByPoints = (minPoints: number, maxPoints: number): Play[] => {
    return plays.value.filter(play =>
      play.totalPoints >= minPoints && play.totalPoints <= maxPoints
    )
  }

  // Utility function to validate IP addresses
  const isValidIPAddress = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }

  // Load plays on mount
  onMounted(() => {
    loadPlays()
  })

  return {
    // State
    plays: readonly(plays),
    isLoading: readonly(isLoading),
    selectedPlay: readonly(selectedPlay),

    // Actions
    loadPlays,
    getPlayById,
    selectPlay,
    clearSelection,
    getPlayVariables,
    validateVariableBindings,
    createDefaultVariableBindings,

    // Utilities
    searchPlays,
    filterPlaysByPoints
  }
}