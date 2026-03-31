<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Play,
  Search,
  Trash2,
  Loader2,
  XCircle,
  CheckCircle2,
  RefreshCw,
  ServerCrash,
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ClabNodeAccessPanel from './ClabNodeAccessPanel.vue'
import { useClab } from '@/composables/useClab'
import { toast } from 'vue-sonner'

const props = defineProps<{
  labId?: string
  /** Pre-built topology object to deploy in the playground */
  topology?: object
}>()

const {
  nodes,
  labName,
  error,
  isLoading,
  isIdle,
  isProvisioning,
  isRunning,
  hasError,
  testConnectivity,
  deployPlaygroundLab,
  inspectPlaygroundLab,
  reset,
} = useClab()

// ─── Connection status ─────────────────────────────────────────────────────

const connected = ref(false)
const connectError = ref<string | null>(null)
const connecting = ref(false)

async function connect() {
  connecting.value = true
  connectError.value = null
  const result = await testConnectivity()
  connecting.value = false
  if (result.success) {
    connected.value = true
  } else {
    connected.value = false
    connectError.value = result.error ?? 'Could not reach clab-api-server'
  }
}

onMounted(connect)

// ─── Lab actions ──────────────────────────────────────────────────────────

async function handleDeploy() {
  if (!props.topology) {
    toast.error('No topology defined', { description: 'Configure lab topology before deploying.' })
    return
  }
  const success = await deployPlaygroundLab(props.topology)
  if (success) {
    toast.success('Lab deployed', { description: labName.value ?? undefined })
  } else {
    toast.error('Deploy failed', { description: error.value ?? undefined })
  }
}

const inspectLabNameInput = ref('')

async function handleInspect() {
  const name = inspectLabNameInput.value.trim() || labName.value
  if (!name) {
    toast.warning('Enter a lab name to inspect')
    return
  }
  const success = await inspectPlaygroundLab(name)
  if (!success) {
    toast.error('Inspect failed — lab not found')
  }
}

async function handleRefresh() {
  if (!labName.value) return
  await inspectPlaygroundLab(labName.value)
}

function handleReset() {
  reset()
  inspectLabNameInput.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <!-- Connection status bar -->
    <div
      v-if="connecting"
      class="flex items-center gap-2 text-sm text-muted-foreground px-1"
    >
      <Loader2 class="h-3.5 w-3.5 animate-spin" />
      Connecting to clab-api-server…
    </div>
    <Alert v-else-if="connectError" variant="destructive">
      <ServerCrash class="h-4 w-4" />
      <AlertDescription class="flex items-center justify-between">
        <span>{{ connectError }}</span>
        <Button variant="outline" size="sm" class="ml-3 h-6 text-xs" @click="connect">
          Retry
        </Button>
      </AlertDescription>
    </Alert>
    <div
      v-else-if="connected"
      class="flex items-center gap-1.5 text-sm text-green-600 px-1"
    >
      <CheckCircle2 class="h-3.5 w-3.5" />
      Connected
    </div>

    <!-- Error from lab operations -->
    <Alert v-if="hasError" variant="destructive">
      <XCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Actions -->
    <Card v-if="connected">
      <CardHeader class="pb-3">
        <CardTitle class="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Deploy -->
        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            :disabled="isLoading || !topology"
            @click="handleDeploy"
            class="gap-1.5"
          >
            <Loader2 v-if="isProvisioning" class="h-3.5 w-3.5 animate-spin" />
            <Play v-else class="h-3.5 w-3.5" />
            Deploy Lab
          </Button>
          <span v-if="!topology" class="text-xs text-muted-foreground">
            (Topology not available — save lab first)
          </span>
        </div>

        <div class="border-t" />

        <!-- Inspect -->
        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">Inspect existing lab</Label>
          <div class="flex gap-2">
            <Input
              v-model="inspectLabNameInput"
              placeholder="lab-name (or uses current)"
              class="h-8 text-sm"
            />
            <Button variant="outline" size="sm" :disabled="isLoading" @click="handleInspect">
              <Search class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div class="border-t" />

        <!-- Reset -->
        <Button
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive gap-1.5"
          @click="handleReset"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Reset
        </Button>
      </CardContent>
    </Card>

    <!-- Node access panel (when running) -->
    <template v-if="isRunning && nodes.length > 0">
      <div class="flex items-center justify-between mb-1">
        <span class="text-sm font-medium">Nodes</span>
        <Button variant="ghost" size="sm" class="h-7 gap-1.5 text-xs" @click="handleRefresh">
          <RefreshCw class="h-3 w-3" />
          Refresh
        </Button>
      </div>
      <ClabNodeAccessPanel :nodes="nodes" :lab-name="labName ?? ''" />
    </template>
  </div>
</template>
