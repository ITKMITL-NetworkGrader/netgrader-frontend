import { ref, readonly } from 'vue'

export interface CrossCourseSubmission {
    _id: string
    jobId: string
    partId: string
    partTitle: string
    partOrder: number
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    attempt: number
    submittedAt: string
    completedAt?: string
    submissionType: 'auto_grading' | 'fill_in_blank'
    score: number | null
    totalPoints: number | null
    lab: {
        _id: string
        title: string
    }
    course: {
        _id: string
        title: string
        code: string
    }
}

export interface AllSubmissionHistoryResponse {
    status: string
    data: CrossCourseSubmission[]
    total: number
    limit: number
    offset: number
}

export function useAllSubmissionHistory() {
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl

    const submissions = ref<CrossCourseSubmission[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const total = ref(0)
    const currentOffset = ref(0)
    const limit = ref(20)

    /**
     * Fetch all submissions for the current user across all courses
     */
    const fetchAllSubmissions = async (page: number = 1, pageSize: number = 20) => {
        isLoading.value = true
        error.value = null

        const offset = (page - 1) * pageSize
        currentOffset.value = offset
        limit.value = pageSize

        try {
            const response = await $fetch<AllSubmissionHistoryResponse>(
                `${backendURL}/v0/submissions/history/user`,
                {
                    method: 'GET',
                    credentials: 'include',
                    query: {
                        limit: pageSize.toString(),
                        offset: offset.toString(),
                    },
                }
            )

            if (response.status === 'success') {
                submissions.value = response.data || []
                total.value = response.total || 0
            } else {
                error.value = 'Failed to fetch submission history'
            }
        } catch (err: any) {
            console.error('Error fetching all submission history:', err)
            error.value = err.message || 'An error occurred while fetching submission history'
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Format date for display
     */
    const formatDateTime = (date: string | null) => {
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

    /**
     * Get status badge styling
     */
    const getStatusBadge = (status: string, score?: number | null, totalPoints?: number | null) => {
        if (status === 'completed' && score !== null && score !== undefined && totalPoints !== null && totalPoints !== undefined && totalPoints > 0) {
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
            case 'failed':
                return { variant: 'destructive' as const, class: '', label: 'Failed' }
            default:
                return { variant: 'outline' as const, class: '', label: status }
        }
    }

    /**
     * Total pages for pagination
     */
    const totalPages = computed(() => Math.ceil(total.value / limit.value))
    const currentPage = computed(() => Math.floor(currentOffset.value / limit.value) + 1)

    return {
        submissions: readonly(submissions),
        isLoading: readonly(isLoading),
        error: readonly(error),
        total: readonly(total),
        totalPages,
        currentPage,
        fetchAllSubmissions,
        formatDateTime,
        getStatusBadge,
    }
}
