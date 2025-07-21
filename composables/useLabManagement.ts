import type { Lab, LabPart, LabFormData, APIResponse } from '~/types/lab'

export const useLabManagement = () => {
  const parts = ref<LabPart[]>([])
  const currentPart = ref(0)
  const isLoading = ref(false)
  const hasUnsavedChanges = ref(false)

  // Initialize with default first part
  const initializeDefaultPart = () => {
    if (parts.value.length === 0) {
      parts.value.push({
        id: generateId(),
        title: '',
        content: '',
        playId: null,
        order: 0
      })
    }
  }

  const addPart = () => {
    const newPart: LabPart = {
      id: generateId(),
      title: '',
      content: '',
      playId: null,
      order: parts.value.length
    }
    parts.value.push(newPart)
    hasUnsavedChanges.value = true
  }

  const removePart = (index: number) => {
    if (parts.value.length > 1) {
      parts.value.splice(index, 1)
      // Update order for remaining parts
      parts.value.forEach((part, idx) => {
        part.order = idx
      })
      // Adjust current part if necessary
      if (currentPart.value >= parts.value.length) {
        currentPart.value = parts.value.length - 1
      }
      hasUnsavedChanges.value = true
    }
  }

  const selectPart = (index: number) => {
    if (index >= 0 && index < parts.value.length) {
      currentPart.value = index
    }
  }

  const updatePartTitle = (index: number, title: string) => {
    if (parts.value[index]) {
      parts.value[index].title = title
      hasUnsavedChanges.value = true
    }
  }

  const updatePartContent = (index: number, content: string) => {
    if (parts.value[index]) {
      parts.value[index].content = content
      hasUnsavedChanges.value = true
    }
  }

  const updatePartPlay = (index: number, playId: string | null, playVariables?: Record<string, any>) => {
    if (parts.value[index]) {
      parts.value[index].playId = playId
      parts.value[index].playVariables = playVariables
      hasUnsavedChanges.value = true
    }
  }

  // Generate unique ID for parts
  const generateId = (): string => {
    return `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // API integration
  const config = useRuntimeConfig()
  const baseURL = `${config.public.backend1url}/v0/api`

  const saveLab = async (courseId: string, labData: LabFormData): Promise<APIResponse<Lab>> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Lab>>(`${baseURL}/courses/${courseId}/labs`, {
        method: 'POST',
        body: {
          ...labData,
          parts: parts.value
        }
      })
      if (response.success) {
        hasUnsavedChanges.value = false
      }
      return response
    } catch (error) {
      console.error('Failed to save lab:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const updateLab = async (courseId: string, labId: string, labData: LabFormData): Promise<APIResponse<Lab>> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Lab>>(`${baseURL}/courses/${courseId}/labs/${labId}`, {
        method: 'PUT',
        body: {
          ...labData,
          parts: parts.value
        }
      })
      if (response.success) {
        hasUnsavedChanges.value = false
      }
      return response
    } catch (error) {
      console.error('Failed to update lab:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const loadLab = async (courseId: string, labId: string): Promise<Lab | null> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Lab>>(`${baseURL}/courses/${courseId}/labs/${labId}`)
      if (response.success && response.data) {
        parts.value = response.data.parts
        currentPart.value = 0
        hasUnsavedChanges.value = false
        return response.data
      }
      return null
    } catch (error) {
      console.error('Failed to load lab:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const validateLab = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (parts.value.length === 0) {
      errors.push('Lab must have at least one part')
    }

    parts.value.forEach((part, index) => {
      if (!part.title.trim()) {
        errors.push(`Part ${index + 1} must have a title`)
      }
      if (!part.content.trim()) {
        errors.push(`Part ${index + 1} must have content`)
      }
      if (!part.playId) {
        errors.push(`Part ${index + 1} must have a Play selected`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Initialize on first use
  onMounted(() => {
    initializeDefaultPart()
  })

  return {
    // State
    parts: readonly(parts),
    currentPart: readonly(currentPart),
    isLoading: readonly(isLoading),
    hasUnsavedChanges: readonly(hasUnsavedChanges),

    // Actions
    addPart,
    removePart,
    selectPart,
    updatePartTitle,
    updatePartContent,
    updatePartPlay,
    saveLab,
    updateLab,
    loadLab,
    validateLab,
    initializeDefaultPart
  }
}