<script setup lang="ts">
import { computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { GroupedBar } from '@unovis/ts'
import type { TimelinePoint } from '@/composables/useMonitoring'

const props = defineProps<{
  data: TimelinePoint[]
}>()

type DataRecord = TimelinePoint

const x = (d: DataRecord) => d.hour
const y = [(d: DataRecord) => d.count]
const colors = ['#f59e0b']

const formatHour = (h: number): string => {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

// Only show tick labels every 3 hours to avoid crowding
const xTickFormat = (h: number) => (h % 3 === 0 ? formatHour(h) : '')

const tooltipTriggers = {
  [GroupedBar.selectors.bar]: (d: DataRecord) =>
    `<div class="text-sm font-medium">${formatHour(d.hour)}</div><div class="text-xs text-muted-foreground">${d.count} submission${d.count !== 1 ? 's' : ''}</div>`,
}

// Highlight the peak hour band
const peakHour = computed(() => {
  const max = Math.max(...props.data.map(d => d.count))
  return props.data.find(d => d.count === max)?.hour ?? -1
})
</script>

<template>
  <div class="animate-fade-in-up" style="animation-delay: 200ms; animation-fill-mode: both">
    <VisXYContainer
      :data="data"
      :height="220"
      :margin="{ top: 10, right: 16, bottom: 36, left: 44 }"
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
        :num-ticks="24"
        :grid-line="false"
        :domain-line="false"
        label="Hour of Day (Bangkok, UTC+7)"
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

    <!-- Peak hour callout -->
    <p v-if="peakHour >= 0 && (data.find(d => d.hour === peakHour)?.count ?? 0) > 0" class="text-xs text-muted-foreground mt-2 text-right">
      Peak hour: <span class="font-medium text-amber-600 dark:text-amber-400">{{ formatHour(peakHour) }}</span>
      ({{ data.find(d => d.hour === peakHour)?.count }} submissions)
    </p>
  </div>
</template>
