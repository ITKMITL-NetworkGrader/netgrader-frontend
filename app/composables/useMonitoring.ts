import { ref } from 'vue'

export interface MonitoringKpi {
  avgTotalExecutionTimeSec: number
  avgEndToEndLatencySec: number
  totalCompletedSubmissions: number
}

export interface DistributionBucket {
  bucket: string
  count: number
}

export interface TimelinePoint {
  hour: number
  count: number
}

export interface PassRateAttempt {
  attempt: number
  total: number
  passed: number
  failed: number
  passRate: number
}

export interface MonitoringData {
  kpi: MonitoringKpi
  executionTimeDistribution: DistributionBucket[]
  submissionTimeline: TimelinePoint[]
  passRateByAttempt: PassRateAttempt[]
}

export const useMonitoring = () => {
  const config = useRuntimeConfig()
  const backendUrl = config.public.backendurl

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const data = ref<MonitoringData | null>(null)

  const fetchMonitoringData = async (
    labId: string,
    submissionType?: 'fill_in_blank' | 'auto_grading'
  ): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      const params = submissionType ? `?submissionType=${submissionType}` : ''
      const response = await fetch(`${backendUrl}/v0/submissions/lab/${labId}/monitoring${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        data.value = result.data
      } else {
        throw new Error(result.message || 'Failed to fetch monitoring data')
      }
    } catch (err: any) {
      console.error('❌ [Monitoring] Failed to fetch data:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, data, fetchMonitoringData }

}
