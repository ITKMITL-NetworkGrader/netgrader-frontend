import type { PlayFormData, TaskFormData, TestCase, AnsibleTask } from '@/types/lab'

export const usePlayCreation = () => {
  // Reactive state
  const playData = ref<PlayFormData>({
    name: '',
    description: '',
    source_device: '',
    target_device: '',
    tasks: []
  })

  const currentTaskIndex = ref(-1)
  const hasUnsavedChanges = ref(false)

  // Computed properties
  const totalPoints = computed(() => {
    return playData.value.tasks.reduce((sum, task) => sum + task.points, 0)
  })

  const isValidPlay = computed(() => {
    return playData.value.name.trim() !== '' &&
           playData.value.source_device.trim() !== '' &&
           playData.value.tasks.length > 0 &&
           playData.value.tasks.every(task => isValidTask(task))
  })

  const currentTask = computed(() => {
    return currentTaskIndex.value >= 0 ? playData.value.tasks[currentTaskIndex.value] : null
  })

  // Task management
  const addTask = (taskData?: Partial<TaskFormData>) => {
    const newTask: TaskFormData = {
      name: taskData?.name || '',
      template_name: taskData?.template_name || '',
      parameters: taskData?.parameters || {},
      test_cases: taskData?.test_cases || [],
      points: taskData?.points || 1
    }

    playData.value.tasks.push(newTask)
    currentTaskIndex.value = playData.value.tasks.length - 1
    hasUnsavedChanges.value = true

    return currentTaskIndex.value
  }

  const updateTask = (index: number, updates: Partial<TaskFormData>) => {
    if (index >= 0 && index < playData.value.tasks.length) {
      playData.value.tasks[index] = { ...playData.value.tasks[index], ...updates }
      hasUnsavedChanges.value = true
    }
  }

  const removeTask = (index: number) => {
    if (index >= 0 && index < playData.value.tasks.length) {
      playData.value.tasks.splice(index, 1)
      
      // Adjust current task index
      if (currentTaskIndex.value > index) {
        currentTaskIndex.value--
      } else if (currentTaskIndex.value === index) {
        currentTaskIndex.value = Math.min(currentTaskIndex.value, playData.value.tasks.length - 1)
      }
      
      hasUnsavedChanges.value = true
    }
  }

  const duplicateTask = (index: number) => {
    if (index >= 0 && index < playData.value.tasks.length) {
      const originalTask = playData.value.tasks[index]
      const duplicatedTask: TaskFormData = {
        ...originalTask,
        name: `${originalTask.name} (Copy)`,
        test_cases: [...originalTask.test_cases],
        parameters: { ...originalTask.parameters }
      }
      
      playData.value.tasks.splice(index + 1, 0, duplicatedTask)
      currentTaskIndex.value = index + 1
      hasUnsavedChanges.value = true
      
      return currentTaskIndex.value
    }
    return -1
  }

  const reorderTasks = (fromIndex: number, toIndex: number) => {
    if (fromIndex >= 0 && fromIndex < playData.value.tasks.length &&
        toIndex >= 0 && toIndex < playData.value.tasks.length &&
        fromIndex !== toIndex) {
      
      const tasks = [...playData.value.tasks]
      const [movedTask] = tasks.splice(fromIndex, 1)
      tasks.splice(toIndex, 0, movedTask)
      
      playData.value.tasks = tasks
      
      // Update current task index if needed
      if (currentTaskIndex.value === fromIndex) {
        currentTaskIndex.value = toIndex
      } else if (currentTaskIndex.value > fromIndex && currentTaskIndex.value <= toIndex) {
        currentTaskIndex.value--
      } else if (currentTaskIndex.value < fromIndex && currentTaskIndex.value >= toIndex) {
        currentTaskIndex.value++
      }
      
      hasUnsavedChanges.value = true
    }
  }

  const selectTask = (index: number) => {
    if (index >= -1 && index < playData.value.tasks.length) {
      currentTaskIndex.value = index
    }
  }

  // Play management
  const updatePlay = (updates: Partial<PlayFormData>) => {
    playData.value = { ...playData.value, ...updates }
    hasUnsavedChanges.value = true
  }

  const resetPlay = () => {
    playData.value = {
      name: '',
      description: '',
      source_device: '',
      target_device: '',
      tasks: []
    }
    currentTaskIndex.value = -1
    hasUnsavedChanges.value = false
  }

  const loadPlay = (data: PlayFormData) => {
    playData.value = { ...data }
    currentTaskIndex.value = data.tasks.length > 0 ? 0 : -1
    hasUnsavedChanges.value = false
  }

  // Validation
  const isValidTask = (task: TaskFormData): boolean => {
    return task.name.trim() !== '' &&
           task.template_name.trim() !== '' &&
           task.points > 0 &&
           task.test_cases.length > 0
  }

  const validatePlay = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!playData.value.name.trim()) {
      errors.push('Play name is required')
    }

    if (!playData.value.source_device.trim()) {
      errors.push('Source device is required')
    }

    if (playData.value.tasks.length === 0) {
      errors.push('At least one task is required')
    }

    playData.value.tasks.forEach((task, index) => {
      const taskErrors = validateTask(task)
      if (!taskErrors.isValid) {
        errors.push(`Task ${index + 1}: ${taskErrors.errors.join(', ')}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const validateTask = (task: TaskFormData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!task.name.trim()) {
      errors.push('Task name is required')
    }

    if (!task.template_name.trim()) {
      errors.push('Task template is required')
    }

    if (task.points <= 0) {
      errors.push('Task points must be greater than 0')
    }

    if (task.test_cases.length === 0) {
      errors.push('At least one test case is required')
    }

    task.test_cases.forEach((testCase, index) => {
      if (!testCase.description.trim()) {
        errors.push(`Test case ${index + 1}: Description is required`)
      }

      if (!testCase.comparison_type.trim()) {
        errors.push(`Test case ${index + 1}: Comparison type is required`)
      }

      if (['contains', 'not_contains'].includes(testCase.comparison_type) && 
          (!testCase.expected_result || testCase.expected_result.toString().trim() === '')) {
        errors.push(`Test case ${index + 1}: Expected result is required for content-based comparisons`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Test case management
  const addTestCase = (taskIndex: number, testCase?: Partial<TestCase>) => {
    if (taskIndex >= 0 && taskIndex < playData.value.tasks.length) {
      const newTestCase: TestCase = {
        description: testCase?.description || '',
        comparison_type: testCase?.comparison_type || 'success',
        expected_result: testCase?.expected_result || true
      }

      playData.value.tasks[taskIndex].test_cases.push(newTestCase)
      hasUnsavedChanges.value = true
    }
  }

  const updateTestCase = (taskIndex: number, testCaseIndex: number, updates: Partial<TestCase>) => {
    if (taskIndex >= 0 && taskIndex < playData.value.tasks.length &&
        testCaseIndex >= 0 && testCaseIndex < playData.value.tasks[taskIndex].test_cases.length) {
      
      playData.value.tasks[taskIndex].test_cases[testCaseIndex] = {
        ...playData.value.tasks[taskIndex].test_cases[testCaseIndex],
        ...updates
      }
      hasUnsavedChanges.value = true
    }
  }

  const removeTestCase = (taskIndex: number, testCaseIndex: number) => {
    if (taskIndex >= 0 && taskIndex < playData.value.tasks.length &&
        testCaseIndex >= 0 && testCaseIndex < playData.value.tasks[taskIndex].test_cases.length) {
      
      playData.value.tasks[taskIndex].test_cases.splice(testCaseIndex, 1)
      hasUnsavedChanges.value = true
    }
  }

  // Export functions
  const exportToAnsibleFormat = (): { play_name: string; tasks: AnsibleTask[] } => {
    return {
      play_name: playData.value.name,
      tasks: playData.value.tasks.map((task, index) => ({
        task_id: `task_${index + 1}`,
        name: task.name,
        template_name: task.template_name,
        parameters: task.parameters,
        test_cases: task.test_cases,
        points: task.points
      }))
    }
  }

  const exportToJSON = (): string => {
    return JSON.stringify(playData.value, null, 2)
  }

  const importFromJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString) as PlayFormData
      loadPlay(data)
      return true
    } catch (error) {
      console.error('Failed to import play data:', error)
      return false
    }
  }

  // Auto-save functionality
  const autoSaveKey = computed(() => `netgrader_play_autosave_${playData.value.name || 'new'}`)

  const saveToLocalStorage = () => {
    if (process.client && hasUnsavedChanges.value) {
      localStorage.setItem(autoSaveKey.value, JSON.stringify({
        data: playData.value,
        timestamp: Date.now()
      }))
    }
  }

  const loadFromLocalStorage = (): boolean => {
    if (process.client) {
      const saved = localStorage.getItem(autoSaveKey.value)
      if (saved) {
        try {
          const { data, timestamp } = JSON.parse(saved)
          const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60)
          
          if (ageInHours < 24) { // Only restore if less than 24 hours old
            loadPlay(data)
            return true
          }
        } catch (error) {
          console.error('Failed to load auto-saved data:', error)
        }
      }
    }
    return false
  }

  const clearLocalStorage = () => {
    if (process.client) {
      localStorage.removeItem(autoSaveKey.value)
    }
  }

  // Auto-save on changes
  watchEffect(() => {
    if (hasUnsavedChanges.value) {
      const timeoutId = setTimeout(saveToLocalStorage, 1000) // Save after 1 second of inactivity
      return () => clearTimeout(timeoutId)
    }
  })

  return {
    // State
    playData: readonly(playData),
    currentTaskIndex: readonly(currentTaskIndex),
    currentTask,
    hasUnsavedChanges: readonly(hasUnsavedChanges),
    totalPoints,
    isValidPlay,

    // Play management
    updatePlay,
    resetPlay,
    loadPlay,
    validatePlay,

    // Task management
    addTask,
    updateTask,
    removeTask,
    duplicateTask,
    reorderTasks,
    selectTask,
    validateTask,

    // Test case management
    addTestCase,
    updateTestCase,
    removeTestCase,

    // Export/Import
    exportToAnsibleFormat,
    exportToJSON,
    importFromJSON,

    // Auto-save
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage
  }
}