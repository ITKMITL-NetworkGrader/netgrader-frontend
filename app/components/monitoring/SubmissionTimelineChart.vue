<script setup lang="ts">
import { computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { GroupedBar } from '@unovis/ts'
import type { TimelinePoint } from '@/composables/useMonitoring'

const props = defineProps<{
  data: TimelinePoint[]
  granularity: 'hourly' | 'daily'
}>()

type DataRecord = { index: number; timestamp: string; count: number }

const chartData = computed<DataRecord[]>(() =>
  props.data.map((d, i) => ({ index: i, timestamp: d.timestamp, count: d.count }))
)

const x = (d: DataRecord) => d.index
const y = [(d: DataRecord) => d.count]
const colors = ['#f59e0b']

// Parse "YYYY-MM-DDTHH:00:00" or "YYYY-MM-DD" as Bangkok local time (no DST, always UTC+7)
const parseTimestamp = (ts: string): Date => {
  if (ts.includes('T')) {
    // hourly: "2026-01-20T20:00:00" → treat as Bangkok time
    return new Date(ts + '+07:00')
  }
  // daily: "2026-01-20" → midnight Bangkok
  return new Date(ts + 'T00:00:00+07:00')
}

const formatLabel = (ts: string): string => {
  const d = parseTimestamp(ts)
  if (props.granularity === 'hourly') {
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Bangkok' })
    const day = d.toLocaleString('en-US', { day: 'numeric', timeZone: 'Asia/Bangkok' })
    const hour = d.toLocaleString('en-US', { hour: 'numeric', hour12: true, timeZone: 'Asia/Bangkok' })
    return `${month} ${day} ${hour}`
  }
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Bangkok' })
}

// Tick spacing: avoid crowding by showing every Nth label
const tickEvery = computed(() => {
  const n = chartData.value.length
  if (n <= 24) return 3     // hourly ≤1 day: every 3h
  if (n <= 48) return 6     // hourly ≤2 days: every 6h
  if (n <= 72) return 12    // hourly 3 days: every 12h
  if (n <= 14) return 1     // daily ≤2 weeks: every day
  if (n <= 31) return 3     // daily ~month: every 3 days
  return Math.ceil(n / 10)  // fallback
})

const xTickFormat = (i: number) => {
  const d = chartData.value[i]
  if (!d) return ''
  return i % tickEvery.value === 0 ? formatLabel(d.timestamp) : ''
}

const tooltipTriggers = {
  [GroupedBar.selectors.bar]: (d: DataRecord) =>
    `<div class="text-sm font-medium">${formatLabel(d.timestamp)}</div>` +
    `<div class="text-xs text-muted-foreground">${d.count} submission${d.count !== 1 ? 's' : ''}</div>`,
}

const peakIndex = computed(() => {
  if (!chartData.value.length) return -1
  let maxCount = 0
  let maxIdx = -1
  chartData.value.forEach((d, i) => {
    if (d.count > maxCount) { maxCount = d.count; maxIdx = i }
  })
  return maxIdx
})
</script>

<template>
  <div class="animate-fade-in-up" style="animation-delay: 200ms; animation-fill-mode: both">
    <VisXYContainer
      :data="chartData"
      :height="220"
      :margin="{ top: 10, right: 16, bottom: 48, left: 44 }"
    >
      <VisGroupedBar
        :x="x"
        :y="y"
        :color="colors"
        :rounded-corners="3"
        :bar-padding="0.05"
      />
      <VisAxis
        type="x"
        :tick-format="xTickFormat"
        :num-ticks="chartData.length"
        :grid-line="false"
        :domain-line="false"
        :tick-text-angle="-35"
        label="Time (Bangkok, UTC+7)"
      />
      <VisAxis
        type="y"
        :num-ticks="5"
        :grid-line="true"
        :domain-line="false"
        label="Submissions"
      />
      <VisTooltip :triggers="tooltipTriggers" />
    </VisXYContainer>

    <!-- Peak callout -->
    <p
      v-if="peakIndex >= 0 && chartData[peakIndex]?.count > 0"
      class="text-xs text-muted-foreground mt-1 text-right"
    >
      Peak: <span class="font-medium text-amber-600 dark:text-amber-400">{{ formatLabel(chartData[peakIndex].timestamp) }}</span>
      ({{ chartData[peakIndex].count }} submissions)
    </p>
  </div>
</template>
