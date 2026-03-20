<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  Server,
  Play,
  Search,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import ClabNodeStatusGrid from './ClabNodeStatusGrid.vue'
import { useClab, type ClabServerConfig } from '@/composables/useClab'
import { toast } from 'vue-sonner'

const props = defineProps<{
  labId?: string
  /** Pre-built topology object to deploy in the playground */
  topology?: object
}>()

const {
  lifecycleState,
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

// ─── Server config form ───────────────────────────────────────────────────

const form = reactive<ClabServerConfig>({
  serverIp: '',
  serverPort: 8080,
  username: 'admin',
  password: '',
})

const connectionTested = ref(false)
const connectionVersion = ref<string | null>(null)

async function handleTestConnectivity() {
  connectionTested.value = false
  connectionVersion.value = null
  const result = await testConnectivity({ ...form })
  if (result.success) {
    connectionTested.value = true
    connectionVersion.value = result.version ?? null
    toast.success('Connected to clab-api-server', {
      description: result.version ? `Version: ${result.version}` : undefined,
    })
  } else {
    toast.error('Connection failed', { description: result.error })
  }
}

// ─── Lab actions ──────────────────────────────────────────────────────────

async function handleDeploy() {
  if (!props.topology) {
    toast.error('No topology defined', { description: 'Configure lab topology before deploying.' })
    return
  }
  const success = await deployPlaygroundLab({ ...form }, props.topology)
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
  const success = await inspectPlaygroundLab({ ...form }, name)
  if (!success) {
    toast.error('Inspect failed — lab not found')
  }
}

async function handleRefresh() {
  if (!labName.value) return
  await inspectPlaygroundLab({ ...form }, labName.value)
}

function handleReset() {
  reset()
  connectionTested.value = false
  connectionVersion.value = null
  inspectLabNameInput.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <!-- Server Config Card -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Server class="h-4 w-4" />
          clab-api-server Connection
        </CardTitle>
        <CardDescription>
          Enter the ContainerLab API server credentials to connect.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2 sm:col-span-1 space-y-1.5">
            <Label for="clab-ip">Server IP</Label>
            <Input id="clab-ip" v-model="form.serverIp" placeholder="192.168.1.100" />
          </div>
          <div class="space-y-1.5">
            <Label for="clab-port">Port</Label>
            <Input id="clab-port" v-model.number="form.serverPort" type="number" placeholder="8080" />
          </div>
          <div class="space-y-1.5">
            <Label for="clab-user">Username</Label>
            <Input id="clab-user" v-model="form.username" placeholder="admin" />
          </div>
          <div class="space-y-1.5">
            <Label for="clab-pass">Password</Label>
            <Input id="clab-pass" v-model="form.password" type="password" placeholder="••••••••" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <Button variant="outline" size="sm" :disabled="isLoading" @click="handleTestConnectivity">
            <Loader2 v-if="isLoading && isIdle" class="h-3.5 w-3.5 animate-spin mr-1.5" />
            Test Connectivity
          </Button>
          <span v-if="connectionTested" class="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 class="h-3.5 w-3.5" />
            Connected{{ connectionVersion ? ` — v${connectionVersion}` : '' }}
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- Error -->
    <Alert v-if="hasError" variant="destructive">
      <XCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Actions -->
    <Card>
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

        <Separator />

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

        <Separator />

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

    <!-- Node grid (when running) -->
    <template v-if="isRunning && nodes.length > 0">
      <ClabNodeStatusGrid
        :nodes="nodes"
        :lab-name="labName"
        :on-refresh="handleRefresh"
      />
    </template>
  </div>
</template>
