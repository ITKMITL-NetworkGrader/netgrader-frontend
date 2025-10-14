import type { GradingStatus, TaskResult, GradingSubmission, APIResponse, ExamConfiguration } from '~/types/lab'

export const useExamGradingStatus = (courseId: string, examId: string, partId: string, studentConfig?: ExamConfiguration) => {
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

    if (!studentConfig) {
      console.error('Cannot submit for grading: Student configuration not available')
      return false
    }

    isSubmitting.value = true
    try {
      // Create exam grading context with personalized variables
      const { createExamGradingContext } = useVariableResolver()
      const gradingContext = createExamGradingContext(studentConfig, partId)

      // Include comprehensive student configuration and grading context
      const requestBody = {
        studentConfiguration: studentConfig,
        gradingContext,
        mode: 'exam',
        personalizedVariables: gradingContext.resolvedVariables,
        expectedAnswers: gradingContext.expectedAnswers,
        gradingCriteria: gradingContext.gradingCriteria
      }

      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/exams/${examId}/parts/${partId}/grade`, {
        method: 'POST',
        body: requestBody
      })

      if (response.success) {
        status.value = 'grading'
        gradingProgress.value = 0
        startPolling()
        return true
      }
      return false
    } catch (error) {
      console.error('Exam grading submission failed:', error)
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
        const response = await $fetch<APIResponse<GradingSubmission>>(`${baseURL}/courses/${courseId}/exams/${examId}/submissions/status`)

        if (response.success && response.data) {
          const submission = response.data

          if (submission.status === 'graded') {
            status.value = 'graded'
            taskResults.value = submission.taskResults.map(task => ({
              ...task,
              // Include resolved variables for exam mode
              resolvedVariables: task.resolvedVariables || {}
            }))
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
        console.error('Exam status polling failed:', error)
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
      const response = await $fetch<APIResponse<GradingSubmission>>(`${baseURL}/courses/${courseId}/exams/${examId}/parts/${partId}/status`)

      if (response.success && response.data) {
        const submission = response.data
        status.value = submission.status
        taskResults.value = submission.taskResults.map(task => ({
          ...task,
          resolvedVariables: task.resolvedVariables || {}
        }))
        totalScore.value = submission.totalScore
        maxScore.value = submission.maxScore

        if (submission.status === 'grading') {
          startPolling()
        }
      }
    } catch (error) {
      // If no submission exists, status remains 'not_submitted'
      console.log('No existing exam submission found')
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

  const validateExamAnswers = (answers: Record<string, any>): { isValid: boolean; errors: string[]; score: number } => {
    if (!studentConfig) {
      return { 
        isValid: false, 
        errors: ['Student configuration not available'], 
        score: 0 
      }
    }

    // Use enhanced validation from variable resolver
    const { validateStudentAnswers } = useVariableResolver()
    return validateStudentAnswers(answers, studentConfig)
  }

  const getExpectedAnswers = (): Record<string, any> => {
    if (!studentConfig) return {}

    // Use enhanced answer key generation from variable resolver
    const { generateExamAnswerKey } = useVariableResolver()
    return generateExamAnswerKey(studentConfig)
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

    // Exam-specific utilities
    validateExamAnswers,
    getExpectedAnswers,
    getStatusVariant,
    getStatusText
  }
}