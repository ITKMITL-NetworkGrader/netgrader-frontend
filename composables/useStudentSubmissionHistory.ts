import { ref } from 'vue'

export interface SubmissionAttempt {
  _id: string
  attempt: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  score: number
  totalPoints: number
  submittedAt: Date | string
  startedAt: Date | string | null
  completedAt: Date | string | null
  submissionType?: 'auto_grading' | 'fill_in_blank' | 'ip_answers'
}

export interface PartSubmissionHistory {
  partId: string
  partTitle?: string
  submissionHistory: SubmissionAttempt[]
}

export interface StudentSubmissionHistoryResponse {
  status: string
  data: PartSubmissionHistory[]
}

export const useStudentSubmissionHistory = () => {
  const config = useRuntimeConfig()
  const backendURL = config.public.backendurl

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const submissionHistory = ref<PartSubmissionHistory[]>([])

  const fetchStudentSubmissionHistory = async (labId: string, studentId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<StudentSubmissionHistoryResponse>(
        `${backendURL}/v0/submissions/history/lab/${labId}/student/${studentId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.status === 'success') {
        submissionHistory.value = (response.data || []).map(part => ({
          ...part,
          submissionHistory: part.submissionHistory.map(attempt => ({
            ...attempt,
            score: attempt.score ?? 0,
            totalPoints: attempt.totalPoints ?? 0
          }))
        }))
      } else {
        error.value = 'Failed to fetch submission history'
      }
    } catch (err: any) {
      console.error('Error fetching student submission history:', err)
      error.value = err.message || 'An error occurred while fetching submission history'
    } finally {
      isLoading.value = false
    }
  }

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string, score?: number, totalPoints?: number) => {
    // Check if completed with full score
    if (status === 'completed' && score !== undefined && totalPoints !== undefined) {
      if (score === totalPoints) {
        return { variant: 'default' as const, class: 'bg-green-500 hover:bg-green-600 text-white', label: 'Passed' }
      } else {
        return { variant: 'destructive' as const, class: '', label: 'Not Passed' }
      }
    }

    switch (status) {
      case 'running':
        return { variant: 'default' as const, class: 'bg-blue-500 hover:bg-blue-600 text-white', label: 'Grading', showPing: true }
      case 'pending':
        return { variant: 'secondary' as const, class: '', label: 'In Queue' }
      case 'cancelled':
        return { variant: 'outline' as const, class: '', label: 'Cancelled' }
      default:
        return { variant: 'outline' as const, class: '', label: status }
    }
  }

  return {
    isLoading,
    error,
    submissionHistory,
    fetchStudentSubmissionHistory,
    formatDateTime,
    getStatusBadge,
  }
}
