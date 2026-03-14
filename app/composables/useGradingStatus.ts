import type { GradingStatus, TaskResult, GradingSubmission, APIResponse } from '~/types/lab'

export const useGradingStatus = (courseId: string, labId: string, partId: string) => {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.backend1url}/v0/api`

  const status = ref<GradingStatus>('not_submitted')
  const gradingProgress = ref(0)
  const taskResults = ref<TaskResult[]>([])
  const totalScore = ref(0)
  const maxScore = ref(0)
  const isSubmitting = ref(false)
  const isPolling = ref(false)

  let pollInterval: NodeJS.Timeout | null = null

  const submitForGrading = async (): Promise<boolean> => {
    if (isSubmitting.value || status.value === 'grading') {
      return false
    }

    isSubmitting.value = true
    try {
      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/labs/${labId}/parts/${partId}/grade`, {
        method: 'POST'
      })

      if (response.success) {
        status.value = 'grading'
        gradingProgress.value = 0
        startPolling()
        return true
      }
      return false
    } catch (error) {
      console.error('Grading submission failed:', error)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const startPolling = () => {
    if (isPolling.value) return

    isPolling.value = true
    pollInterval = setInterval(async () => {
      try {
        const response = await $fetch<APIResponse<GradingSubmission>>(`${baseURL}/courses/${courseId}/labs/${labId}/submissions/status`)

        if (response.success && response.data) {
          const submission = response.data

          if (submission.status === 'graded') {
            status.value = 'graded'
            taskResults.value = submission.taskResults
            totalScore.value = submission.totalScore
            maxScore.value = submission.maxScore
            gradingProgress.value = 100
            stopPolling()
          } else {
            // Update progress based on completed tasks
            const completedTasks = submission.taskResults.filter(task => task.score >= 0).length
            const totalTasks = submission.taskResults.length
            gradingProgress.value = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
          }
        }
      } catch (error) {
        console.error('Status polling failed:', error)
        // Don't stop polling on error, just log it
      }
    }, 3000) // Poll every 3 seconds
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    isPolling.value = false
  }

  const loadInitialStatus = async () => {
    try {
      const response = await $fetch<APIResponse<GradingSubmission>>(`${baseURL}/courses/${courseId}/labs/${labId}/parts/${partId}/status`)

      if (response.success && response.data) {
        const submission = response.data
        status.value = submission.status
        taskResults.value = submission.taskResults
        totalScore.value = submission.totalScore
        maxScore.value = submission.maxScore

        if (submission.status === 'grading') {
          startPolling()
        }
      }
    } catch (error) {
      // If no submission exists, status remains 'not_submitted'
    }
  }

  const resetStatus = () => {
    status.value = 'not_submitted'
    gradingProgress.value = 0
    taskResults.value = []
    totalScore.value = 0
    maxScore.value = 0
    stopPolling()
  }

  const getStatusVariant = (status: GradingStatus) => {
    switch (status) {
      case 'not_submitted':
        return 'secondary'
      case 'grading':
        return 'default'
      case 'graded':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const getStatusText = (status: GradingStatus) => {
    switch (status) {
      case 'not_submitted':
        return 'Not Submitted'
      case 'grading':
        return 'Grading...'
      case 'graded':
        return 'Graded'
      default:
        return 'Unknown'
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling()
  })

  // Load initial status on mount
  onMounted(() => {
    loadInitialStatus()
  })

  return {
    // State
    status: readonly(status),
    gradingProgress: readonly(gradingProgress),
    taskResults: readonly(taskResults),
    totalScore: readonly(totalScore),
    maxScore: readonly(maxScore),
    isSubmitting: readonly(isSubmitting),
    isPolling: readonly(isPolling),

    // Actions
    submitForGrading,
    startPolling,
    stopPolling,
    loadInitialStatus,
    resetStatus,

    // Utilities
    getStatusVariant,
    getStatusText
  }
}