<script setup lang="ts">
import { computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis, VisTooltip } from '@unovis/vue'
import { GroupedBar } from '@unovis/ts'
import type { DistributionBucket } from '@/composables/useMonitoring'

const props = defineProps<{
  data: DistributionBucket[]
}>()

// Unovis requires numeric x — map bucket label to index
const chartData = computed(() =>
  props.data.map((d, i) => ({ index: i, label: d.bucket, count: d.count }))
)

type DataRecord = { index: number; label: string; count: number }

const x = (d: DataRecord) => d.index
const y = [(d: DataRecord) => d.count]
const colors = ['#6366f1']

const xTickFormat = (i: number) => chartData.value[i]?.label ?? ''

const tooltipTriggers = {
  [GroupedBar.selectors.bar]: (d: DataRecord) =>
    `<div class="text-sm font-medium">${d.label}</div><div class="text-xs text-muted-foreground">${d.count} submission${d.count !== 1 ? 's' : ''}</div>`,
}
</script>

<template>
  <div class="animate-fade-in-up" style="animation-delay: 150ms; animation-fill-mode: both">
    <VisXYContainer
      :data="chartData"
      :height="220"
      :margin="{ top: 10, right: 16, bottom: 36, left: 44 }"
    >
      <VisGroupedBar
        :x="x"
        :y="y"
        :color="colors"
        :rounded-corners="4"
        :bar-padding="0.15"
      />
      <VisAxis
        type="x"
        :tick-format="xTickFormat"
        :grid-line="false"
        :domain-line="false"
        label="Execution Time"
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
  </div>
</template>
