<script setup lang="ts">
import { VisXYContainer, VisGroupedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { GroupedBar } from '@unovis/ts'
import type { PassRateAttempt } from '@/composables/useMonitoring'

const props = defineProps<{
  data: PassRateAttempt[]
}>()

type DataRecord = PassRateAttempt

const x = (d: DataRecord) => d.attempt - 1   // 0-based index for Unovis
const y = [(d: DataRecord) => d.passed, (d: DataRecord) => d.failed]
const colors = ['#10b981', '#f43f5e']

// v is the raw x value (attempt - 1); map back to the attempt label
const xTickFormat = (v: number) => {
  const attempt = v + 1
  const d = props.data.find(d => d.attempt === attempt)
  if (!d) return ''
  return d.attempt === 4 ? 'Attempt 4+' : `Attempt ${d.attempt}`
}

const tooltipTriggers = {
  [GroupedBar.selectors.bar]: (d: DataRecord) =>
    `<div class="text-sm font-medium">${d.attempt === 4 ? 'Attempt 4+' : `Attempt ${d.attempt}`}</div>` +
    `<div class="text-xs">Passed: <span class="text-emerald-500 font-medium">${d.passed}</span></div>` +
    `<div class="text-xs">Failed/Partial: <span class="text-rose-500 font-medium">${d.failed}</span></div>` +
    `<div class="text-xs font-medium mt-1">Pass rate: ${d.passRate}%</div>`,
}
</script>

<template>
  <div class="animate-fade-in-up" style="animation-delay: 250ms; animation-fill-mode: both">
    <VisXYContainer
      :data="data"
      :height="220"
      :margin="{ top: 10, right: 16, bottom: 36, left: 44 }"
    >
      <VisGroupedBar
        :x="x"
        :y="y"
        :color="colors"
        :rounded-corners="4"
        :bar-padding="0.2"
        :group-padding="0.3"
      />
      <VisAxis
        type="x"
        :tick-format="xTickFormat"
        :grid-line="false"
        :domain-line="false"
        label="Attempt"
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

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-2 justify-end">
      <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span class="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
        Passed (full score)
      </span>
      <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span class="inline-block w-3 h-3 rounded-sm bg-rose-500" />
        Not passed
      </span>
    </div>
  </div>
</template>
