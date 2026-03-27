<script setup lang="ts">
import { Timer, Clock, Activity } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import type { MonitoringKpi } from '@/composables/useMonitoring'

const props = defineProps<{
  kpi: MonitoringKpi
}>()

const formatSeconds = (sec: number): string => {
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = Math.round(sec % 60)
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  return `${sec.toFixed(1)}s`
}

const cards = computed(() => [
  {
    label: 'Avg Execution Time',
    value: formatSeconds(props.kpi.avgTotalExecutionTimeSec),
    subtext: 'Grading worker wall time',
    icon: Timer,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    delay: 'animation-delay-0',
  },
  {
    label: 'Avg End-to-End Latency',
    value: formatSeconds(props.kpi.avgEndToEndLatencySec),
    subtext: 'Submit → result received',
    icon: Clock,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    delay: 'animation-delay-100',
  },
  {
    label: 'Completed Submissions',
    value: props.kpi.totalCompletedSubmissions.toLocaleString(),
    subtext: 'Graded (all attempts)',
    icon: Activity,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    delay: 'animation-delay-200',
  },
])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <Card
      v-for="(card, i) in cards"
      :key="card.label"
      :class="[
        'border transition-all duration-300 hover:shadow-md',
        card.border,
        'animate-fade-in-up',
      ]"
      :style="{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }"
    >
      <CardContent class="pt-5 pb-4 px-5">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {{ card.label }}
            </p>
            <p class="text-3xl font-bold mt-1 tabular-nums tracking-tight">
              {{ card.value }}
            </p>
            <p class="text-xs text-muted-foreground mt-1">{{ card.subtext }}</p>
          </div>
          <div :class="['p-2.5 rounded-lg ml-3 shrink-0', card.bg]">
            <component :is="card.icon" :class="['w-5 h-5', card.color]" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
