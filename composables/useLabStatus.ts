import { ref } from 'vue'

/**
 * Lab Submission Overview Response
 * Lightweight data for instructor dashboards
 */
export interface LabSubmissionOverview {
  studentId: string
  studentName: string
  currentPart: number          // 1-indexed, shows which part they're on
  totalParts: number
  progression: string          // e.g., "3/5" (3 completed, 2 remaining)
  latestSubmissionStatus: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled'
  latestSubmissionAt: Date
}

/**
 * Student Submission History (grouped by part)
 */
export interface StudentSubmissionHistory {
  partId: string
  submissionHistory: Array<{
    _id: string
    attempt: number
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    score: number
    totalPoints: number
    submittedAt: Date
    startedAt: Date | null
    completedAt: Date | null
  }>
}

/**
 * Test Case Result
 */
export interface TestCaseResult {
  description: string
  expected_value: any
  actual_value: any
  comparison_type: string
  status: 'passed' | 'failed' | 'error'
  points_earned: number
  points_possible: number
  message: string
}

/**
 * Test Result
 */
export interface TestResult {
  test_name: string
  status: 'passed' | 'failed' | 'error'
  message: string
  points_earned: number
  points_possible: number
  execution_time: number
  test_case_results: TestCaseResult[]
  raw_output?: string
  debug_info?: {
    enabled: boolean
    parameters_received?: Record<string, any>
    registered_variables?: Record<string, any>
    command_results?: any[]
    validation_details?: any[]
  }
  group_id?: string
}

/**
 * Group Result
 */
export interface GroupResult {
  group_id: string
  title: string
  status: 'passed' | 'failed' | 'cancelled'
  group_type: 'all_or_nothing' | 'proportional'
  points_earned: number
  points_possible: number
  execution_time: number
  task_results: TestResult[]
  message: string
  rescue_executed: boolean
  cleanup_executed: boolean
}

/**
 * Grading Result
 */
export interface GradingResult {
  job_id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  total_points_earned: number
  total_points_possible: number
  total_execution_time: number
  error_message?: string
  test_results: TestResult[]
  group_results: GroupResult[]
  created_at: string
  completed_at?: string
  cancelled_reason?: string
}

/**
 * Progress History Entry
 */
export interface ProgressHistoryEntry {
  message: string
  current_test: string
  tests_completed: number
  total_tests: number
  percentage: number
  timestamp: Date
}

/**
 * Detailed Submission Response
 */
export interface DetailedSubmission {
  _id: string
  jobId: string
  studentId: string
  labId: string
  partId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  attempt: number
  ipMappings: Record<string, string>
  submittedAt: Date
  startedAt: Date | null
  completedAt: Date | null
  progressHistory: ProgressHistoryEntry[]
  gradingResult?: GradingResult
}

/**
 * Lab IP Statistics Response
 */
export interface LabIPStats {
  totalIps: number           // Total usable IPs (2^(32-mask) - 2)
  exemptCount: number        // Configured exempt IP count
  assignedCount: number      // Active student sessions
  totalBlocked: number       // Merged exempt + assigned
  available: number          // totalIps - totalBlocked
  enrolledStudents: number   // Students enrolled in course
  sufficient: boolean        // available >= enrolledStudents
}

export interface AssignedIP {
  studentId: string
  studentName: string
  managementIp: string
}

/**
 * Composable for Lab Status API calls
 */
export const useLabStatus = () => {
  const config = useRuntimeConfig()
  const backendUrl = config.public.backendurl

  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch Lab Submission Overview (Poll-friendly)
   * GET /v0/submissions/lab/:labId
   */
  const fetchLabSubmissionOverview = async (
    labId: string,
    limit?: number,
    offset?: number
  ): Promise<{
    success: boolean
    data?: LabSubmissionOverview[]
    total?: number
    limit?: number
    offset?: number
    error?: string
  }> => {
    try {
      isLoading.value = true
      error.value = null

      // Build query parameters
      const params = new URLSearchParams()
      if (limit) params.append('limit', limit.toString())
      if (offset) params.append('offset', offset.toString())

      const url = `${backendUrl}/v0/submissions/lab/${labId}${params.toString() ? `?${params.toString()}` : ''}`

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        return {
          success: true,
          data: result.data,
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      } else {
        throw new Error(result.message || 'Failed to fetch lab submission overview')
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Failed to fetch lab submission overview:', err)
      error.value = err.message
      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch Student Submission History
   * GET /v0/submissions/history/lab/:labId/student/:studentId
   */
  const fetchStudentHistory = async (
    labId: string,
    studentId: string
  ): Promise<{
    success: boolean
    data?: StudentSubmissionHistory[]
    error?: string
  }> => {
    try {
      isLoading.value = true
      error.value = null

      const url = `${backendUrl}/v0/submissions/history/lab/${labId}/student/${studentId}`

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || 'Failed to fetch student history')
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Failed to fetch student history:', err)
      error.value = err.message
      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch Detailed Submission
   * GET /v0/submissions/detailed/:submissionId
   */
  const fetchSubmissionDetails = async (
    submissionId: string
  ): Promise<{
    success: boolean
    data?: DetailedSubmission
    error?: string
  }> => {
    try {
      isLoading.value = true
      error.value = null

      const url = `${backendUrl}/v0/submissions/detailed/${submissionId}`

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || 'Failed to fetch submission details')
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Failed to fetch submission details:', err)
      error.value = err.message
      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch Lab IP Assignment Statistics
   * GET /v0/labs/stats/:id
   */
  const fetchLabIPStats = async (
    labId: string
  ): Promise<{
    success: boolean
    ipStats?: LabIPStats
    assignedIps?: AssignedIP[]
    error?: string
  }> => {
    try {
      isLoading.value = true
      error.value = null

      const url = `${backendUrl}/v0/labs/stats/${labId}`

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        return {
          success: true,
          ipStats: result.ipStats,
          assignedIps: result.assignedIps
        }
      } else {
        throw new Error(result.message || 'Failed to fetch lab IP stats')
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Failed to fetch lab IP stats:', err)
      error.value = err.message
      return {
        success: false,
        error: err.message
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    isLoading,
    error,

    // Methods
    fetchLabSubmissionOverview,
    fetchStudentHistory,
    fetchSubmissionDetails,
    fetchLabIPStats
  }
}
