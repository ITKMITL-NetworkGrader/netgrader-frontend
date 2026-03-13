<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Play, Settings, Server, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-vue-next'
import PlaygroundSetupModal from './PlaygroundSetupModal.vue'
import { usePlayground, type GNS3Config, type DeviceMapping } from '@/composables/usePlayground'

const props = defineProps<{
    labId: string
    partId: string
    vlanConfig?: Array<{ vlanId?: number; baseNetwork?: string }>
}>()

const emit = defineEmits<{
    (e: 'grading-complete', result: any): void
}>()

const {
    state,
    isLoading,
    isConfigured,
    startGrading,
    reset
} = usePlayground()

// Local state
const showSetupModal = ref(false)
const isGrading = ref(false)
const gradingResult = ref<any>(null)
const gradingError = ref<string | null>(null)
const playgroundConfig = ref<{
    gns3Config: GNS3Config
    deviceMappings: DeviceMapping[]
    customIpMappings: Record<string, string>
    customVlanMappings: Record<string, number>
} | null>(null)

// Event Source for SSE
let eventSource: EventSource | null = null

// Computed
const statusBadgeVariant = computed(() => {
    if (gradingResult.value) return 'default'
    if (gradingError.value) return 'destructive'
    if (isGrading.value) return 'secondary'
    return 'outline'
})

const statusText = computed(() => {
    if (gradingResult.value) return 'Complete'
    if (gradingError.value) return 'Error'
    if (isGrading.value) return 'Grading...'
    if (playgroundConfig.value) return 'Ready'
    return 'Not Configured'
})

// Methods
function handleSetupComplete(config: typeof playgroundConfig.value) {
    playgroundConfig.value = config
    // Update playground state with config
    if (config) {
        state.value.gns3Config = config.gns3Config
        config.deviceMappings.forEach(mapping => {
            state.value.deviceMappings[mapping.deviceId] = mapping
        })
        state.value.customIpMappings = config.customIpMappings
        state.value.customVlanMappings = config.customVlanMappings
    }
}

async function handleStartGrading() {
    if (!playgroundConfig.value) {
        showSetupModal.value = true
        return
    }

    isGrading.value = true
    gradingError.value = null
    gradingResult.value = null

    const result = await startGrading(props.labId, props.partId)

    if (result.success && result.jobId) {
        // Connect to SSE for progress updates
        connectToSSE(result.jobId)
    } else {
        gradingError.value = result.error || 'Failed to start grading'
        isGrading.value = false
    }
}

function connectToSSE(jobId: string) {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase

    // Close existing connection
    if (eventSource) {
        eventSource.close()
    }

    eventSource = new EventSource(`${apiBase}/submissions/events?jobId=${jobId}`)

    eventSource.addEventListener('progress', (event) => {
        // Progress updates handled by GradingProgress component
    })

    eventSource.addEventListener('completed', (event) => {
        const data = JSON.parse(event.data)
        gradingResult.value = data
        isGrading.value = false
        emit('grading-complete', data)
        eventSource?.close()
    })

    eventSource.addEventListener('error', (event) => {
        console.error('SSE Error:', event)
        gradingError.value = 'Connection to grading service lost'
        isGrading.value = false
        eventSource?.close()
    })
}

function handleReconfigure() {
    showSetupModal.value = true
}

function handleReset() {
    reset()
    playgroundConfig.value = null
    gradingResult.value = null
    gradingError.value = null
    isGrading.value = false
}

// Cleanup on unmount
onUnmounted(() => {
    if (eventSource) {
        eventSource.close()
    }
})
</script>

<template>
    <div class="space-y-4">
        <!-- Status Card -->
        <Card class="bg-card border-border">
            <CardHeader class="pb-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Server class="h-5 w-5 text-primary" />
                        <CardTitle class="text-lg">Lab Playground</CardTitle>
                    </div>
                    <Badge :variant="statusBadgeVariant">
                        {{ statusText }}
                    </Badge>
                </div>
                <CardDescription>
                    Test grading with custom GNS3 configuration
                </CardDescription>
            </CardHeader>
            <CardContent>
                <!-- Not Configured State -->
                <div v-if="!playgroundConfig" class="text-center py-6">
                    <Settings class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p class="text-muted-foreground mb-4">
                        Configure GNS3 server and device mappings to start testing
                    </p>
                    <Button @click="showSetupModal = true">
                        <Settings class="mr-2 h-4 w-4" />
                        Configure Playground
                    </Button>
                </div>

                <!-- Configured State -->
                <div v-else class="space-y-4">
                    <!-- GNS3 Info -->
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                        <Server class="h-4 w-4" />
                        <span>
                            {{ playgroundConfig.gns3Config.serverIp }}:{{ playgroundConfig.gns3Config.serverPort }}
                        </span>
                        <span class="text-foreground">→</span>
                        <span class="text-foreground font-medium">
                            {{ playgroundConfig.gns3Config.projectName }}
                        </span>
                    </div>

                    <!-- Device Mappings Summary -->
                    <div class="text-sm">
                        <span class="text-muted-foreground">Devices:</span>
                        <span class="ml-2 text-foreground">
                            {{ playgroundConfig.deviceMappings.length }} mapped
                        </span>
                    </div>

                    <!-- Grading Progress -->
                    <div v-if="isGrading && state.gradingJobId" class="p-3 bg-muted rounded-md">
                        <div class="flex items-center gap-2 mb-2">
                            <Spinner class="h-4 w-4" />
                            <span class="text-sm">Grading in progress...</span>
                        </div>
                        <div class="text-xs text-muted-foreground">Job ID: {{ state.gradingJobId }}</div>
                    </div>

                    <!-- Grading Result -->
                    <Alert v-if="gradingResult" class="border-primary/50 bg-primary/5">
                        <CheckCircle2 class="h-4 w-4 text-primary" />
                        <AlertTitle>Grading Complete</AlertTitle>
                        <AlertDescription>
                            Score: {{ gradingResult.total_points_earned }} / {{ gradingResult.total_points_possible }}
                        </AlertDescription>
                    </Alert>

                    <!-- Error -->
                    <Alert v-if="gradingError" variant="destructive">
                        <XCircle class="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{{ gradingError }}</AlertDescription>
                    </Alert>

                    <!-- Actions -->
                    <div class="flex gap-2 pt-2">
                        <Button @click="handleStartGrading" :disabled="isGrading">
                            <Spinner v-if="isGrading" class="mr-2 h-4 w-4" />
                            <Play v-else class="mr-2 h-4 w-4" />
                            {{ isGrading ? 'Grading...' : 'Start Grading' }}
                        </Button>
                        <Button variant="outline" @click="handleReconfigure" :disabled="isGrading">
                            <Settings class="mr-2 h-4 w-4" />
                            Reconfigure
                        </Button>
                        <Button variant="ghost" @click="handleReset" :disabled="isGrading">
                            <RefreshCw class="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Info Alert -->
        <Alert class="border-muted bg-muted/50">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Playground Mode</AlertTitle>
            <AlertDescription>
                Results are ephemeral and not saved. Use this to test if your lab grading works correctly.
            </AlertDescription>
        </Alert>

        <!-- Setup Modal -->
        <PlaygroundSetupModal v-model:open="showSetupModal" :lab-id="labId" :part-id="partId" :vlan-config="vlanConfig"
            @complete="handleSetupComplete" />
    </div>
</template>
