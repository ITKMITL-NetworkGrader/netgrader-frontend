import { ref, computed, onUnmounted } from 'vue'
import type { 
  ISubmission, 
  CreateSubmissionRequest, 
  CreateSubmissionResponse, 
  GetSubmissionResponse,
  SubmissionState,
  GradingStatusDisplay
} from '@/types/submission'

// Global state for submissions (per session)
const submissions = ref<Record<string, ISubmission>>({})
const currentSubmissionStates = ref<Record<string, SubmissionState>>({})

export const useSubmissions = () => {
  const backendUrl = useRuntimeConfig().public.backendurl

  // Check if backend URL is configured
  if (!backendUrl) {
    console.error('❌ [ERROR] Backend URL is not configured. Please set NUXT_BACKENDURL environment variable.')
  }

  // Helper to generate unique key for part submission
  const getSubmissionKey = (labId: string, partId: string): string => {
    return `${labId}-${partId}`
  }

  // Get current submission state for a specific part
  const getSubmissionState = (labId: string, partId: string): SubmissionState => {
    const key = getSubmissionKey(labId, partId)
    
    if (!currentSubmissionStates.value[key]) {
      currentSubmissionStates.value[key] = {
        isSubmitting: false,
        currentSubmission: null,
        lastSubmissionJobId: null,
        pollingInterval: null,
        showProgressDetails: false
      }
    }
    
    return currentSubmissionStates.value[key]
  }

  // Create a new submission
  const createSubmission = async (
    labId: string,
    partId: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    try {
      const state = getSubmissionState(labId, partId)
      
      // Prevent multiple simultaneous submissions
      if (state.isSubmitting) {
        return { success: false, error: 'Submission already in progress' }
      }

      state.isSubmitting = true

      const requestData: CreateSubmissionRequest = {
        lab_id: labId,
        part_id: partId
      }

      console.log('🔄 [DEBUG] Creating submission:', requestData)

      const response = await fetch(`${backendUrl}/v0/submissions/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      console.log('✅ [DEBUG] Submission created successfully:', result)

      // Extract jobId from the actual response format
      let jobId: string | undefined
      
      if (result.status === 'success' && result.job_id) {
        // Actual backend format: { status: "success", job_id: "...", ... }
        jobId = result.job_id
      } else if (result.jobId) {
        // Alternative format: { jobId: "..." }
        jobId = result.jobId
      }

      // Update state
      if (jobId) {
        state.lastSubmissionJobId = jobId
        
        // Create initial submission state to show immediate progress
        state.currentSubmission = {
          jobId: jobId,
          studentId: '', // Will be populated from API
          labId: labId,
          partId: partId,
          status: 'pending',
          submittedAt: new Date(),
          progressHistory: [{
            message: 'Submission queued for grading',
            current_test: '',
            tests_completed: 0,
            total_tests: 1,
            percentage: 0,
            timestamp: new Date()
          }],
          attempt: 1,
          ipMappings: {},
          callbackUrl: '',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        // Start polling for progress
        startPolling(jobId, labId, partId)
      }
      state.isSubmitting = false

      return { 
        success: true, 
        jobId: jobId 
      }

    } catch (error: any) {
      console.error('❌ [ERROR] Failed to create submission:', error)
      
      const state = getSubmissionState(labId, partId)
      state.isSubmitting = false
      
      return { 
        success: false, 
        error: error.message || 'Failed to create submission' 
      }
    }
  }

  // Fetch submission details
  const fetchSubmission = async (jobId: string): Promise<ISubmission | null> => {
    try {
      console.log('🔍 [DEBUG] Fetching submission:', jobId)

      const response = await fetch(`${backendUrl}/v0/submissions/${jobId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [WARN] Submission not found:', jobId)
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.message || 'Failed to fetch submission')
      }

      // Store in cache
      submissions.value[jobId] = result.data

      console.log('📊 [DEBUG] Fetched submission:', result.data)
      
      return result.data

    } catch (error: any) {
      console.error('❌ [ERROR] Failed to fetch submission:', error)
      return null
    }
  }

  // Start polling for submission progress
  const startPolling = (jobId: string, labId: string, partId: string) => {
    const state = getSubmissionState(labId, partId)
    
    // Clear any existing polling
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
    }

    console.log('🔄 [DEBUG] Starting polling for submission:', jobId)

    // Poll immediately first, then set up interval
    const pollSubmission = async () => {
      const submission = await fetchSubmission(jobId)
      
      if (submission) {
        state.currentSubmission = submission

        // Stop polling if submission is completed, failed, or cancelled
        if (['completed', 'failed', 'cancelled'].includes(submission.status)) {
          console.log('✅ [DEBUG] Submission finished, stopping polling:', submission.status)
          stopPolling(labId, partId)
          return true // Indicates polling should stop
        }
      } else {
        // If we can't fetch the submission, try a few more times before giving up
        console.warn('⚠️ [WARN] Could not fetch submission, continuing to poll...')
      }
      return false // Continue polling
    }

    // Poll immediately
    pollSubmission().then(shouldStop => {
      if (!shouldStop) {
        // Set up interval for subsequent polls
        state.pollingInterval = setInterval(async () => {
          const shouldStop = await pollSubmission()
          if (shouldStop && state.pollingInterval) {
            clearInterval(state.pollingInterval)
            state.pollingInterval = null
          }
        }, 3000) // Poll every 3 seconds as specified
      }
    })
  }

  // Stop polling for a specific submission
  const stopPolling = (labId: string, partId: string) => {
    const state = getSubmissionState(labId, partId)
    
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
      state.pollingInterval = null
      console.log('🛑 [DEBUG] Stopped polling for submission')
    }
  }

  // Get grading status display data for UI
  const getGradingStatus = (labId: string, partId: string): GradingStatusDisplay => {
    const state = getSubmissionState(labId, partId)
    
    if (state.isSubmitting) {
      return {
        status: 'submitting',
        message: 'Creating submission...',
        progress: {
          percentage: 5,
          current_test: 'Preparing submission',
          tests_completed: 0,
          total_tests: 1
        }
      }
    }

    if (!state.currentSubmission) {
      return {
        status: 'idle',
        message: 'Ready to submit'
      }
    }

    const submission = state.currentSubmission

    // Handle gradingResult status if available
    if (submission.gradingResult) {
      switch (submission.gradingResult.status) {
        case 'pending':
          const pendingProgress = submission.progressHistory[submission.progressHistory.length - 1]
          return {
            status: 'grading',
            message: pendingProgress?.message || 'In queue',
            progress: {
              percentage: pendingProgress?.percentage || 10,
              current_test: pendingProgress?.current_test || 'Submission queued for grading',
              tests_completed: pendingProgress?.tests_completed || 0,
              total_tests: pendingProgress?.total_tests || 1
            }
          }

        case 'running':
          const runningProgress = submission.progressHistory[submission.progressHistory.length - 1]
          return {
            status: 'grading',
            message: runningProgress?.message || 'Grading in progress...',
            progress: runningProgress ? {
              percentage: runningProgress.percentage,
              current_test: runningProgress.current_test || runningProgress.message,
              tests_completed: runningProgress.tests_completed,
              total_tests: runningProgress.total_tests
            } : undefined
          }

        case 'completed':
          const pointsMessage = `${submission.gradingResult.total_points_earned}/${submission.gradingResult.total_points_possible} points`
          return {
            status: 'completed',
            message: `Grading completed: ${pointsMessage}`,
            results: {
              total_points_earned: submission.gradingResult.total_points_earned,
              total_points_possible: submission.gradingResult.total_points_possible,
              status: submission.gradingResult.status
            }
          }

        case 'failed':
          return {
            status: 'failed',
            message: submission.gradingResult.error_message || 'Grading failed',
            error: submission.gradingResult.error_message
          }

        case 'cancelled':
          return {
            status: 'cancelled',
            message: submission.gradingResult.cancelled_reason || 'Grading was cancelled',
            error: submission.gradingResult.cancelled_reason
          }
      }
    }

    // Fallback to submission status if no gradingResult
    switch (submission.status) {
      case 'pending':
        const fallbackPendingProgress = submission.progressHistory[submission.progressHistory.length - 1]
        return {
          status: 'grading',
          message: fallbackPendingProgress?.message || 'In queue',
          progress: {
            percentage: fallbackPendingProgress?.percentage || 10,
            current_test: fallbackPendingProgress?.current_test || 'Submission queued for grading',
            tests_completed: fallbackPendingProgress?.tests_completed || 0,
            total_tests: fallbackPendingProgress?.total_tests || 1
          }
        }

      case 'running':
        const fallbackRunningProgress = submission.progressHistory[submission.progressHistory.length - 1]
        return {
          status: 'grading',
          message: fallbackRunningProgress?.message || 'Grading in progress...',
          progress: fallbackRunningProgress ? {
            percentage: fallbackRunningProgress.percentage,
            current_test: fallbackRunningProgress.current_test || fallbackRunningProgress.message,
            tests_completed: fallbackRunningProgress.tests_completed,
            total_tests: fallbackRunningProgress.total_tests
          } : undefined
        }

      default:
        return {
          status: 'idle',
          message: 'Ready to submit'
        }
    }
  }

  // Toggle progress details visibility
  const toggleProgressDetails = (labId: string, partId: string) => {
    const state = getSubmissionState(labId, partId)
    state.showProgressDetails = !state.showProgressDetails
  }

  // Cancel a running submission
  const cancelSubmission = async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${backendUrl}/v0/submissions/${jobId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success || false

    } catch (error: any) {
      console.error('❌ [ERROR] Failed to cancel submission:', error)
      return false
    }
  }

  // Cleanup when component unmounts
  const cleanup = () => {
    // Stop all polling intervals
    Object.values(currentSubmissionStates.value).forEach(state => {
      if (state.pollingInterval) {
        clearInterval(state.pollingInterval)
      }
    })
    
    // Clear states
    currentSubmissionStates.value = {}
  }

  // Fetch all submissions for a student and specific lab
  const fetchStudentSubmissions = async (
    studentId: string,
    labId: string
  ): Promise<{ success: boolean; submissions?: ISubmission[]; error?: string }> => {
    try {
      console.log('🔍 [DEBUG] Fetching student submissions:', { studentId, labId })

      const response = await fetch(
        `${backendUrl}/v0/submissions/student/${studentId}?labId=${labId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status !== 'success' || !result.data) {
        throw new Error(result.message || 'Failed to fetch submissions')
      }

      console.log('📊 [DEBUG] Fetched student submissions:', result.data)

      return {
        success: true,
        submissions: result.data
      }

    } catch (error: any) {
      console.error('❌ [ERROR] Failed to fetch student submissions:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch submissions'
      }
    }
  }

  // Check lab completion status based on submissions
  const checkLabCompletionStatus = (
    submissions: ISubmission[],
    labParts: Array<{ partId: string; totalPoints: number }>
  ): {
    isFullyCompleted: boolean
    completedParts: string[]
    totalPartsCompleted: number
    totalParts: number
    allPartsPassedWithFullPoints: boolean
  } => {
    // Group submissions by partId and get the latest (highest attempt)
    const latestSubmissionsByPart: Record<string, ISubmission> = {}

    submissions.forEach(submission => {
      const partId = submission.partId
      const existing = latestSubmissionsByPart[partId]

      if (!existing || submission.attempt > existing.attempt) {
        latestSubmissionsByPart[partId] = submission
      }
    })

    // Check which parts are completed with full points
    const completedParts: string[] = []

    labParts.forEach(part => {
      const submission = latestSubmissionsByPart[part.partId]

      if (submission &&
          submission.status === 'completed' &&
          submission.gradingResult) {

        const earnedPoints = submission.gradingResult.total_points_earned
        const possiblePoints = submission.gradingResult.total_points_possible

        // Part is completed if student earned full points
        if (earnedPoints === possiblePoints) {
          completedParts.push(part.partId)
        }
      }
    })

    const totalParts = labParts.length
    const totalPartsCompleted = completedParts.length
    const isFullyCompleted = totalPartsCompleted === totalParts && totalParts > 0
    const allPartsPassedWithFullPoints = isFullyCompleted

    return {
      isFullyCompleted,
      completedParts,
      totalPartsCompleted,
      totalParts,
      allPartsPassedWithFullPoints
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    submissions: computed(() => submissions.value),

    // Methods
    createSubmission,
    fetchSubmission,
    fetchStudentSubmissions,
    checkLabCompletionStatus,
    getSubmissionState,
    getGradingStatus,
    toggleProgressDetails,
    cancelSubmission,
    startPolling,
    stopPolling,
    cleanup
  }
}