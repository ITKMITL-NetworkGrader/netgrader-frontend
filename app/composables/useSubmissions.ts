import { ref, computed, onUnmounted } from 'vue'
import type {
  ISubmission,
  CreateSubmissionRequest,
  CreateSubmissionResponse,
  GetSubmissionResponse,
  SubmissionState,
  GradingStatusDisplay,
  LecturerRangeAnswerPayload
} from '@/types/submission'

// Global state for submissions (per session)
const submissions = ref<Record<string, ISubmission>>({})
const currentSubmissionStates = ref<Record<string, SubmissionState>>({})

export const useSubmissions = () => {
  const backendUrl = useRuntimeConfig().public.backendurl

  // Check if backend URL is configured
  if (!backendUrl) {
    console.error('[ERROR] Backend URL is not configured. Please set NUXT_BACKENDURL environment variable.')
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
        sseConnection: null,  // Initialize SSE connection as null
        showProgressDetails: false
      }
    }

    return currentSubmissionStates.value[key]
  }

  // Create a new submission
  const createSubmission = async (
    labId: string,
    partId: string,
    options?: {
      projectId?: string;
      labSessionId?: string | null;
      lecturerRangeAnswers?: LecturerRangeAnswerPayload[];
      slaacAnswers?: LecturerRangeAnswerPayload[];
    }
  ): Promise<{ success: boolean; jobId?: string; error?: string; errorCode?: number; isExpired?: boolean }> => {
    try {
      const state = getSubmissionState(labId, partId)

      // Prevent multiple simultaneous submissions
      if (state.isSubmitting) {
        return { success: false, error: 'Submission already in progress' }
      }

      state.isSubmitting = true

      const requestData: CreateSubmissionRequest = {
        lab_id: labId,
        part_id: partId,
        project_id: options?.projectId || ''
      }

      if (options?.labSessionId) {
        requestData.lab_session_id = options.labSessionId
      }

      if (options?.lecturerRangeAnswers && options.lecturerRangeAnswers.length > 0) {
        requestData.lecturer_range_answers = options.lecturerRangeAnswers.map(answer => ({
          source_part_id: answer.sourcePartId,
          question_id: answer.questionId,
          row_index: answer.rowIndex,
          col_index: answer.colIndex,
          answer: answer.answer,
          device_id: answer.deviceId,
          interface_name: answer.interfaceName,
          vlan_index: answer.vlanIndex
        }))
      }

      if (options?.slaacAnswers && options.slaacAnswers.length > 0) {
        requestData.slaac_answers = options.slaacAnswers.map(answer => ({
          source_part_id: answer.sourcePartId,
          question_id: answer.questionId,
          row_index: answer.rowIndex,
          col_index: answer.colIndex,
          answer: answer.answer,
          device_id: answer.deviceId,
          interface_name: answer.interfaceName,
          vlan_index: answer.vlanIndex
        }))
      }


      console.log('[DEBUG] Creating submission:', requestData)

      const response = await fetch(`${backendUrl}/v0/submissions/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        // Parse error response to get detailed error message
        let errorMessage = `HTTP ${response.status}`
        let errorData: any = null

        try {
          const errorText = await response.text()
          try {
            errorData = JSON.parse(errorText)
            errorMessage = errorData.message || errorText
          } catch {
            errorMessage = errorText || errorMessage
          }
        } catch {
          // Ignore parsing errors
        }

        const state = getSubmissionState(labId, partId)
        state.isSubmitting = false

        // Check if this is a "lab expired" error
        const isExpired = response.status === 403 &&
          (errorMessage.includes('no longer accepting') || errorMessage.includes('no longer available'))

        return {
          success: false,
          error: errorMessage,
          errorCode: response.status,
          isExpired
        }
      }

      const result = await response.json()

      console.log('[DEBUG] Submission created successfully:', result)

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
          submissionType: 'auto_grading',
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
          labSessionId: options?.labSessionId ?? undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // Start SSE connection for real-time progress (with polling fallback)
        startSSE(jobId, labId, partId)
      }
      state.isSubmitting = false

      return {
        success: true,
        jobId: jobId
      }

    } catch (error: any) {
      console.error('[ERROR] Failed to create submission:', error)

      const state = getSubmissionState(labId, partId)
      state.isSubmitting = false

      return {
        success: false,
        error: error.message || 'Failed to create submission',
        errorCode: 0,
        isExpired: false
      }
    }
  }

  // Fetch submission details
  const fetchSubmission = async (jobId: string): Promise<ISubmission | null> => {
    try {
      console.log('[DEBUG] Fetching submission:', jobId)

      const response = await fetch(`${backendUrl}/v0/submissions/${jobId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[WARN] Submission not found:', jobId)
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

      console.log('[DEBUG] Fetched submission:', result.data)

      return result.data

    } catch (error: any) {
      console.error('[ERROR] Failed to fetch submission:', error)
      return null
    }
  }

  // Start SSE connection for real-time updates
  const startSSE = (jobId: string, labId: string, partId: string) => {
    const state = getSubmissionState(labId, partId)

    // Close existing SSE connection if any
    if (state.sseConnection) {
      state.sseConnection.close()
      state.sseConnection = null
    }

    console.log('[DEBUG] Starting SSE connection for submission:', jobId)

    // Flag to track if we've received the completed event
    let completedReceived = false
    let connectionAttempts = 0
    const MAX_RECONNECTION_ATTEMPTS = 3

    try {
      // Create EventSource for SSE with credentials
      // CRITICAL: The URL must be same-origin OR backend must have proper CORS setup with credentials
      const sseUrl = `${backendUrl}/v0/submissions/${jobId}/stream`
      console.log('[DEBUG] Connecting to SSE URL:', sseUrl)

      const eventSource = new EventSource(sseUrl, {
        withCredentials: true // Include cookies for authentication
      })

      // Store reference
      state.sseConnection = eventSource
      connectionAttempts++

      // Handle connection opened
      eventSource.addEventListener('open', () => {
        console.log('[SSE] Connected to grading stream:', jobId)
      })

      // Handle connected event (initial message)
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data)
        console.log('[SSE] Connection confirmed:', data.message)
      })

      // DEBUG: Log ALL raw SSE events to see what's actually coming through
      // eventSource.onmessage = (event) => {
      //   console.log('[SSE DEBUG] Raw message received (default event):', event.data)
      // }

      // Handle started event
      eventSource.addEventListener('started', (event) => {
        const data = JSON.parse(event.data)
        console.log('[SSE] Grading started:', data.message)

        if (state.currentSubmission) {
          state.currentSubmission.status = 'running'
        }
      })

      // Handle progress updates
      eventSource.addEventListener('progress', (event) => {
        const progressData = JSON.parse(event.data)
        console.log(`[SSE] Progress update received:`, {
          percentage: progressData.percentage,
          message: progressData.message,
          current_test: progressData.current_test,
          tests_completed: progressData.tests_completed,
          total_tests: progressData.total_tests
        })

        // Update current submission with progress
        if (state.currentSubmission) {
          // CRITICAL: Update status to 'running' to ensure getGradingStatus picks this up
          state.currentSubmission.status = 'running'

          // Create grading result with running status if not exists
          if (!state.currentSubmission.gradingResult) {
            state.currentSubmission.gradingResult = {
              job_id: jobId,
              status: 'running',
              total_points_earned: 0,
              total_points_possible: progressData.total_tests || 1,
              test_results: [],
              group_results: [],
              total_execution_time: 0,
              error_message: '',
              created_at: new Date().toISOString(),
              completed_at: '',
              cancelled_reason: null
            }
          } else {
            state.currentSubmission.gradingResult.status = 'running'
          }

          const newProgress = {
            message: progressData.message,
            current_test: progressData.current_test || '',
            tests_completed: progressData.tests_completed,
            total_tests: progressData.total_tests,
            percentage: progressData.percentage,
            timestamp: new Date()
          }
          state.currentSubmission.progressHistory.push(newProgress)
          console.log(`[SSE] Progress added. Status: ${state.currentSubmission.status}, History: ${state.currentSubmission.progressHistory.length}`)

          // 🆕 FALLBACK: If we reach 100%, fetch the final result after a delay
          // This handles cases where the SSE 'completed' event doesn't arrive
          if (progressData.percentage >= 100) {
            console.log('[SSE] Reached 100%, setting up fallback result fetch in 2 seconds...')
            setTimeout(async () => {
              // Only fetch if we haven't received the completed event yet
              if (state.currentSubmission && state.currentSubmission.status !== 'completed') {
                console.log('[SSE] No completed event received after 2s, fetching result via API...')
                const submission = await fetchSubmission(jobId)
                if (submission && submission.status === 'completed' && submission.gradingResult) {
                  console.log('[FALLBACK] Successfully fetched completed result from API')
                  completedReceived = true
                  state.currentSubmission.status = 'completed'
                  state.currentSubmission.completedAt = submission.completedAt
                  state.currentSubmission.gradingResult = submission.gradingResult
                  stopSSE(labId, partId)
                }
              }
            }, 2000)
          }
        } else {
          console.warn('[SSE] No current submission to update!')
        }
      })

      // Handle completion
      eventSource.addEventListener('completed', (event) => {
        const resultData = JSON.parse(event.data)
        console.log(`[SSE] Grading completed: ${resultData.total_points_earned}/${resultData.total_points_possible} points`)

        // Mark that we've received the completed event FIRST (before any async operations)
        completedReceived = true
        console.log('[SSE] completedReceived flag set to true')

        // Update submission with final results
        if (state.currentSubmission) {
          state.currentSubmission.status = 'completed'
          state.currentSubmission.completedAt = new Date()
          state.currentSubmission.gradingResult = {
            job_id: jobId,
            status: resultData.status,
            total_points_earned: resultData.total_points_earned,
            total_points_possible: resultData.total_points_possible,
            test_results: resultData.test_results || [],
            group_results: resultData.group_results || [],
            total_execution_time: 0,
            error_message: '',
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            cancelled_reason: null
          }
          console.log('[SSE] Submission updated with final results')
        }

        // CRITICAL FIX: Delay closing the connection to allow any final events to arrive
        // This prevents race condition where connection closes before backend sends all data
        console.log('[SSE] Waiting 1 second before closing connection to ensure all events received')
        setTimeout(() => {
          console.log('[SSE] Closing connection after delay')
          stopSSE(labId, partId)
        }, 1000)
      })

      // Handle errors (single handler, not duplicate)
      eventSource.onerror = (error) => {
        console.log('[SSE] Error event fired, completedReceived:', completedReceived, 'readyState:', eventSource.readyState)

        // If we already received the completed event, this error is expected (connection closing)
        if (completedReceived) {
          console.log('[SSE] Connection closed after completion (expected), not reconnecting')
          stopSSE(labId, partId)
          return
        }

        // Check connection state
        // EventSource.CONNECTING = 0, EventSource.OPEN = 1, EventSource.CLOSED = 2
        if (eventSource.readyState === EventSource.CLOSED) {
          console.error('[SSE] Connection closed unexpectedly before completion')

          // Try to reconnect if we haven't exceeded max attempts
          if (connectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
            console.log(`[SSE] Attempting reconnection ${connectionAttempts + 1}/${MAX_RECONNECTION_ATTEMPTS}...`)
            stopSSE(labId, partId)

            // Wait a bit before reconnecting to avoid hammering the server
            setTimeout(() => {
              startSSE(jobId, labId, partId)
            }, 2000)
          } else {
            console.log('[SSE] Max reconnection attempts reached, falling back to polling')
            stopSSE(labId, partId)
            startPolling(jobId, labId, partId)
          }
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('[SSE] Connection is reconnecting automatically...')
          // EventSource will try to reconnect automatically, don't do anything
        } else {
          console.error('[SSE] Unknown error state:', error)
          stopSSE(labId, partId)
          startPolling(jobId, labId, partId)
        }
      }

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error)
      // Fall back to polling
      startPolling(jobId, labId, partId)
    }
  }

  // Stop SSE connection
  const stopSSE = (labId: string, partId: string) => {
    const state = getSubmissionState(labId, partId)

    if (state.sseConnection) {
      state.sseConnection.close()
      state.sseConnection = null
      console.log('[SSE] Connection closed')
    }
  }

  // Start polling for submission progress (fallback for SSE)
  const startPolling = (jobId: string, labId: string, partId: string) => {
    console.log('[DEBUG] startPolling() called for job:', jobId)

    const state = getSubmissionState(labId, partId)

    // If submission is already in a terminal state, don't start polling
    if (state.currentSubmission && ['completed', 'failed', 'cancelled'].includes(state.currentSubmission.status)) {
      console.log('[DEBUG] Submission already in terminal state:', state.currentSubmission.status, '- skipping polling')
      return
    }

    // Clear any existing polling
    if (state.pollingInterval) {
      console.log('[DEBUG] Clearing existing polling interval before starting new one')
      clearInterval(state.pollingInterval)
      state.pollingInterval = null
    }

    console.log('[DEBUG] Starting polling for submission:', jobId, 'Current status:', state.currentSubmission?.status || 'no submission')

    // Poll immediately first, then set up interval
    const pollSubmission = async () => {
      const submission = await fetchSubmission(jobId)

      if (submission) {
        state.currentSubmission = submission

        // Stop polling if submission is completed, failed, or cancelled
        if (['completed', 'failed', 'cancelled'].includes(submission.status)) {
          console.log('[DEBUG] Submission finished, stopping polling:', submission.status)
          stopPolling(labId, partId)
          stopSSE(labId, partId) // Also close SSE if still open
          return true // Indicates polling should stop
        }
      } else {
        // If we can't fetch the submission, try a few more times before giving up
        console.warn('[WARN] Could not fetch submission, continuing to poll...')
      }
      return false // Continue polling
    }

    // Poll immediately
    pollSubmission().then(shouldStop => {
      if (!shouldStop && !state.pollingInterval) {
        // Set up interval for subsequent polls (only if not already set)
        state.pollingInterval = setInterval(async () => {
          const shouldStop = await pollSubmission()
          if (shouldStop) {
            if (state.pollingInterval) {
              clearInterval(state.pollingInterval)
              state.pollingInterval = null
            }
          }
        }, 3000) as any
        console.log('[DEBUG] Polling interval started')
      }
    })
  }

  // Stop polling for a specific submission
  const stopPolling = (labId: string, partId: string) => {
    const state = getSubmissionState(labId, partId)

    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
      state.pollingInterval = null
      console.log('[DEBUG] Polling stopped. Submission status:', state.currentSubmission?.status || 'no submission')
    } else {
      console.log('[DEBUG] stopPolling() called but no polling interval was running')
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

  // Clear/hide grading results (for when user closes the results popup)
  const clearGradingResults = (labId: string, partId: string) => {
    const state = getSubmissionState(labId, partId)
    // Reset the submission to idle state while keeping the actual submission data
    // This allows the user to resubmit if they didn't pass
    if (state.currentSubmission &&
      state.currentSubmission.gradingResult?.status === 'completed' &&
      state.currentSubmission.gradingResult.total_points_earned < state.currentSubmission.gradingResult.total_points_possible) {
      // Only clear if not passed - if passed, keep showing the results
      state.currentSubmission = null
      state.isSubmitting = false
    }
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
      console.error('[ERROR] Failed to cancel submission:', error)
      return false
    }
  }

  // Cleanup when component unmounts
  const cleanup = () => {
    // Stop all SSE connections and polling intervals
    Object.entries(currentSubmissionStates.value).forEach(([key, state]) => {
      // Close SSE connection
      if (state.sseConnection) {
        state.sseConnection.close()
      }
      // Clear polling interval
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
    labId: string,
    options?: {
      labSessionId?: string | null;
    }
  ): Promise<{ success: boolean; submissions?: ISubmission[]; error?: string }> => {
    try {
      console.log('[DEBUG] Fetching student submissions:', { studentId, labId, options })

      const params = new URLSearchParams()
      params.append('labId', labId)
      if (options?.labSessionId) {
        params.append('labSessionId', options.labSessionId)
      }

      const response = await fetch(
        `${backendUrl}/v0/submissions/student/${studentId}?${params.toString()}`,
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

      console.log('[DEBUG] Fetched student submissions:', result.data)

      return {
        success: true,
        submissions: result.data
      }

    } catch (error: any) {
      console.error('[ERROR] Failed to fetch student submissions:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch submissions'
      }
    }
  }

  const fetchStudentSubmissionHistoryByAttempt = async (
    studentId: string,
    labId: string,
    options?: {
      labSessionId?: string | null;
    }
  ): Promise<{ success: boolean; attempts?: any[]; error?: string }> => {
    try {
      const params = new URLSearchParams()
      params.append('groupBy', 'labSession')
      if (options?.labSessionId) {
        params.append('labSessionId', options.labSessionId)
      }

      const response = await fetch(
        `${backendUrl}/v0/submissions/history/lab/${labId}/student/${studentId}?${params.toString()}`,
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
        throw new Error(result.message || 'Failed to fetch submission history')
      }

      return {
        success: true,
        attempts: result.data
      }
    } catch (error: any) {
      console.error('❌ [ERROR] Failed to fetch submission history by attempt:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch submission history'
      }
    }
  }

  // Check lab completion status based on submissions
  const checkLabCompletionStatus = (
    submissions: ISubmission[],
    labParts: Array<{ partId: string; totalPoints: number }>,
    options?: {
      labSessionId?: string | null;
      dueDate?: Date | string | null;
      availableUntil?: Date | string | null;
    }
  ): {
    isFullyCompleted: boolean
    completedParts: string[]
    totalPartsCompleted: number
    totalParts: number
    allPartsPassedWithFullPoints: boolean
    currentPointsEarned: number  // Total points earned including partial (with late penalty)
    totalPointsPossible: number  // Total points possible
  } => {
    const targetSessionId = options?.labSessionId ?? null
    const normalizedTarget = targetSessionId ? targetSessionId.toString() : null

    // Helper function to calculate late penalty (same logic as backend)
    const calculateLatePenalty = (submittedAt: Date | string | null): { isLate: boolean; penaltyMultiplier: number } => {
      if (!submittedAt || !options?.dueDate) {
        return { isLate: false, penaltyMultiplier: 1.0 }
      }

      const submittedDate = new Date(submittedAt)
      const dueDate = new Date(options.dueDate)
      const availableUntil = options.availableUntil ? new Date(options.availableUntil) : null

      // If submitted after dueDate but before availableUntil (or no availableUntil), it's late
      if (submittedDate > dueDate) {
        if (!availableUntil || submittedDate <= availableUntil) {
          return { isLate: true, penaltyMultiplier: 0.5 } // 50% penalty
        }
      }

      return { isLate: false, penaltyMultiplier: 1.0 }
    }

    const filteredSubmissions = normalizedTarget
      ? submissions.filter(submission => {
        if (!submission.labSessionId) return false
        return submission.labSessionId === normalizedTarget
      })
      : submissions

    // Group submissions by partId and get the latest (highest attempt)
    const latestSubmissionsByPart: Record<string, ISubmission> = {}

    filteredSubmissions.forEach(submission => {
      const partId = submission.partId
      const existing = latestSubmissionsByPart[partId]

      if (!existing || submission.attempt > existing.attempt) {
        latestSubmissionsByPart[partId] = submission
      }
    })

    // Check which parts are completed with full points AND calculate current points
    const completedParts: string[] = []
    let currentPointsEarned = 0
    let totalPointsPossible = 0

    labParts.forEach(part => {
      totalPointsPossible += part.totalPoints || 0
      const submission = latestSubmissionsByPart[part.partId]

      if (submission && submission.status === 'completed') {
        // Calculate late penalty for this submission
        const { penaltyMultiplier } = calculateLatePenalty(submission.submittedAt)

        // Check for network config parts (gradingResult)
        if (submission.gradingResult) {
          const earnedPoints = submission.gradingResult.total_points_earned
          const possiblePoints = submission.gradingResult.total_points_possible

          // Apply late penalty to points for display (rounded to 2 decimal places)
          const adjustedPoints = Math.round(earnedPoints * penaltyMultiplier * 100) / 100
          currentPointsEarned += adjustedPoints || 0

          // Part is completed if student earned full ORIGINAL points (not penalized)
          // This allows late submissions to still unlock next parts
          if (earnedPoints === possiblePoints && possiblePoints > 0) {
            completedParts.push(part.partId)
          }
        }
        // Check for fill-in-blank parts (fillInBlankResults) - e.g., IP Table
        else if (submission.fillInBlankResults) {
          const earnedPoints = submission.fillInBlankResults.totalPointsEarned
          const possiblePoints = submission.fillInBlankResults.totalPoints

          // Apply late penalty to points for display (rounded to 2 decimal places)
          const adjustedPoints = Math.round(earnedPoints * penaltyMultiplier * 100) / 100
          currentPointsEarned += adjustedPoints || 0

          // Part is completed if student earned full ORIGINAL points (not penalized)
          if (earnedPoints === possiblePoints && possiblePoints > 0) {
            completedParts.push(part.partId)
          }
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
      allPartsPassedWithFullPoints,
      currentPointsEarned,
      totalPointsPossible
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
    fetchStudentSubmissionHistoryByAttempt,
    checkLabCompletionStatus,
    getSubmissionState,
    getGradingStatus,
    toggleProgressDetails,
    clearGradingResults,  // New: Clear/hide grading results
    cancelSubmission,
    startSSE,      // New: Start SSE connection
    stopSSE,       // New: Stop SSE connection
    startPolling,  // Fallback polling
    stopPolling,   // Stop fallback polling
    cleanup
  }
}
