<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Check, Terminal, Wifi, WifiOff } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import type { ClabNode } from '@/composables/useClab'

const props = defineProps<{
  node: ClabNode
}>()

const copied = ref(false)

const isRunning = computed(() =>
  props.node.state === 'running' || props.node.state === 'Up',
)

const statusVariant = computed<'default' | 'secondary' | 'destructive' | 'outline'>(() =>
  isRunning.value ? 'default' : 'secondary',
)

async function copyCommand() {
  if (!props.node.sshCommand) return
  try {
    await navigator.clipboard.writeText(props.node.sshCommand)
    copied.value = true
    toast.success('SSH command copied', { duration: 2000 })
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    toast.error('Failed to copy')
  }
}
</script>

<template>
  <Card class="border">
    <CardContent class="p-4 space-y-3">
      <!-- Node header -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="h-2 w-2 rounded-full flex-shrink-0"
            :class="isRunning ? 'bg-green-500' : 'bg-muted-foreground'"
          />
          <span class="font-medium text-sm truncate">{{ node.name }}</span>
        </div>
        <Badge :variant="statusVariant" class="text-xs flex-shrink-0">
          {{ node.state }}
        </Badge>
      </div>

      <!-- Kind / Image -->
      <div v-if="node.kind || node.image" class="text-xs text-muted-foreground space-y-0.5">
        <div v-if="node.kind">Kind: <span class="text-foreground">{{ node.kind }}</span></div>
        <div v-if="node.image" class="truncate">Image: <span class="text-foreground">{{ node.image }}</span></div>
      </div>

      <!-- IPv4 address -->
      <div v-if="node.ipv4_address" class="flex items-center gap-1.5 text-xs">
        <Wifi class="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span class="font-mono text-foreground">{{ node.ipv4_address }}</span>
      </div>
      <div v-else class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <WifiOff class="h-3 w-3 flex-shrink-0" />
        <span>No IP assigned</span>
      </div>

      <!-- SSH command -->
      <div v-if="node.sshCommand" class="space-y-1.5">
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <Terminal class="h-3 w-3" />
          <span>SSH</span>
        </div>
        <div class="flex items-center gap-2 bg-muted rounded px-2 py-1.5">
          <code class="text-xs font-mono flex-1 truncate">{{ node.sshCommand }}</code>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 flex-shrink-0"
            :disabled="!isRunning"
            @click="copyCommand"
          >
            <Check v-if="copied" class="h-3 w-3 text-green-500" />
            <Copy v-else class="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div v-else class="text-xs text-muted-foreground italic">
        No SSH access available
      </div>
    </CardContent>
  </Card>
</template>
