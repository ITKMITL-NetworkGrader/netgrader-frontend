<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Play,
  StopCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  ServerCrash,
  Network,
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import ClabNodeStatusGrid from './ClabNodeStatusGrid.vue'
import { useClab } from '@/composables/useClab'
import { toast } from 'vue-sonner'

const props = defineProps<{
  labId: string
  studentId: string
  labName?: string
  /** If provided, auto-refresh access for an already-running lab on mount */
  existingLabName?: string
}>()

const emit = defineEmits<{
  (e: 'lab-started', labName: string): void
  (e: 'lab-stopped'): void
}>()

const {
  lifecycleState,
  nodes,
  labName: clabLabName,
  error,
  isLoading,
  isIdle,
  isProvisioning,
  isRunning,
  isDestroying,
  hasError,
  deployStudentLab,
  refreshLabAccess,
  destroyStudentLab,
} = useClab()

// ─── Step labels ───────────────────────────────────────────────────────────

const steps = [
  { id: 'connect', label: 'Connecting', description: 'Authenticating with lab server' },
  { id: 'deploy', label: 'Deploying', description: 'Provisioning your containers' },
  { id: 'ready', label: 'Ready', description: 'Lab is up and running' },
]

const currentStepIndex = computed(() => {
  if (isProvisioning.value) return 1
  if (isRunning.value) return 2
  return 0
})

// ─── Actions ───────────────────────────────────────────────────────────────

async function handleStartLab() {
  const success = await deployStudentLab(props.labId, props.studentId)
  if (success && clabLabName.value) {
    toast.success('Lab is ready!', { description: clabLabName.value })
    emit('lab-started', clabLabName.value)
  } else if (!success) {
    toast.error('Failed to start lab', { description: error.value ?? undefined })
  }
}

async function handleStopLab() {
  if (!clabLabName.value) return
  const name = clabLabName.value
  const success = await destroyStudentLab(name)
  if (success) {
    toast.success('Lab stopped')
    emit('lab-stopped')
  } else {
    toast.error('Failed to stop lab', { description: error.value ?? undefined })
  }
}

async function handleRefresh() {
  if (!clabLabName.value) return
  await refreshLabAccess(clabLabName.value)
}

// If the student already has a running lab, show it immediately
onMounted(async () => {
  if (props.existingLabName) {
    await refreshLabAccess(props.existingLabName)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Stepper -->
    <div class="flex items-center gap-2">
      <template v-for="(step, i) in steps" :key="step.id">
        <div class="flex items-center gap-2">
          <!-- Step icon -->
          <div
            class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors"
            :class="{
              'border-primary bg-primary text-primary-foreground': currentStepIndex > i,
              'border-primary bg-background text-primary': currentStepIndex === i && !isIdle,
              'border-muted-foreground/30 bg-background text-muted-foreground': currentStepIndex < i || (isIdle && i === 0),
            }"
          >
            <CheckCircle2 v-if="currentStepIndex > i" class="h-4 w-4" />
            <Loader2
              v-else-if="currentStepIndex === i && isProvisioning"
              class="h-4 w-4 animate-spin"
            />
            <span v-else class="text-xs font-semibold">{{ i + 1 }}</span>
          </div>
          <!-- Label (hide on small screens except active) -->
          <span
            class="hidden sm:block text-sm"
            :class="currentStepIndex >= i && !isIdle ? 'text-foreground font-medium' : 'text-muted-foreground'"
          >
            {{ step.label }}
          </span>
        </div>
        <!-- Divider -->
        <div v-if="i < steps.length - 1" class="flex-1 h-px bg-border" />
      </template>
    </div>

    <!-- Error state -->
    <Alert v-if="hasError" variant="destructive">
      <XCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- IDLE: Start button -->
    <Card v-if="isIdle || hasError">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <Network class="h-5 w-5" />
          {{ labName ?? 'Your Lab Environment' }}
        </CardTitle>
        <CardDescription>
          Press Start to provision your ContainerLab environment.
          This may take a moment while containers are being created.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button class="gap-2" @click="handleStartLab" :disabled="isLoading">
          <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
          <Play v-else class="h-4 w-4" />
          Start Lab
        </Button>
      </CardContent>
    </Card>

    <!-- PROVISIONING: Loading state -->
    <Card v-else-if="isProvisioning">
      <CardContent class="pt-6">
        <div class="flex flex-col items-center gap-4 py-4 text-center">
          <Loader2 class="h-10 w-10 animate-spin text-primary" />
          <div class="space-y-1">
            <p class="font-medium">Provisioning your lab&hellip;</p>
            <p class="text-sm text-muted-foreground">
              Containers are starting up. This usually takes 30&ndash;120 seconds.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- RUNNING: Node grid -->
    <template v-else-if="isRunning">
      <div class="flex items-center justify-between">
        <Badge variant="default" class="gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-green-400" />
          Lab Running
        </Badge>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-destructive hover:text-destructive"
          :disabled="isLoading"
          @click="handleStopLab"
        >
          <Loader2 v-if="isDestroying" class="h-3.5 w-3.5 animate-spin" />
          <StopCircle v-else class="h-3.5 w-3.5" />
          Stop Lab
        </Button>
      </div>

      <ClabNodeStatusGrid
        :nodes="nodes"
        :lab-name="clabLabName"
        :on-refresh="handleRefresh"
      />
    </template>

    <!-- DESTROYING: spinner -->
    <Card v-else-if="isDestroying">
      <CardContent class="pt-6">
        <div class="flex items-center justify-center gap-3 py-4">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Stopping lab containers&hellip;</span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
