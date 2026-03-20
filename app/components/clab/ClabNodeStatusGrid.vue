<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ClabSshCommandCard from './ClabSshCommandCard.vue'
import type { ClabNode } from '@/composables/useClab'

const props = defineProps<{
  nodes: readonly ClabNode[]
  labName: string | null
  /** Polling interval in ms. Pass 0 to disable. Default: 10000 */
  pollInterval?: number
  /** Called when the grid needs a status refresh */
  onRefresh?: () => Promise<void>
}>()

const POLL_INTERVAL_MS = props.pollInterval ?? 10_000

let pollTimer: ReturnType<typeof setInterval> | null = null
const isRefreshing = ref(false)

async function doRefresh() {
  if (!props.onRefresh || isRefreshing.value) return
  isRefreshing.value = true
  try {
    await props.onRefresh()
  } finally {
    isRefreshing.value = false
  }
}

function startPolling() {
  if (POLL_INTERVAL_MS <= 0 || !props.onRefresh) return
  stopPolling()
  pollTimer = setInterval(doRefresh, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(startPolling)
onBeforeUnmount(stopPolling)

// Restart polling if onRefresh prop changes
watch(() => props.onRefresh, (fn) => {
  if (fn) startPolling()
  else stopPolling()
})
</script>

<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-muted-foreground">
        {{ nodes.length }} node{{ nodes.length !== 1 ? 's' : '' }}
        <span v-if="labName" class="font-mono text-xs ml-1">({{ labName }})</span>
      </span>
      <Button
        v-if="onRefresh"
        variant="ghost"
        size="sm"
        :disabled="isRefreshing"
        class="h-7 gap-1.5 text-xs"
        @click="doRefresh"
      >
        <RefreshCw class="h-3 w-3" :class="isRefreshing ? 'animate-spin' : ''" />
        Refresh
      </Button>
    </div>

    <!-- Empty state -->
    <div
      v-if="nodes.length === 0"
      class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      No nodes found.
    </div>

    <!-- Node cards -->
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ClabSshCommandCard v-for="node in nodes" :key="node.name" :node="node" />
    </div>
  </div>
</template>
