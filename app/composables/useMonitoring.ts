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
  timestamp: string  // "2026-01-20T20:00:00" (hourly) or "2026-01-20" (daily) — Bangkok UTC+7
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
  timelineGranularity: 'hourly' | 'daily'
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
    submissionType?: 'fill_in_blank' | 'auto_grading',
    startDate?: Date,
    endDate?: Date,
    studentIdPrefixes?: string[],
  ): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      const qs = new URLSearchParams()
      if (submissionType) qs.set('submissionType', submissionType)
      if (startDate) qs.set('startDate', startDate.toISOString())
      if (endDate) qs.set('endDate', endDate.toISOString())
      if (studentIdPrefixes && studentIdPrefixes.length > 0) {
        qs.set('studentIdPrefixes', studentIdPrefixes.join(','))
      }
      const params = qs.toString() ? `?${qs.toString()}` : ''
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
