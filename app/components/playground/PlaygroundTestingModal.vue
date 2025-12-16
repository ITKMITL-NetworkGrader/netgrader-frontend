<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
    Play,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Loader2,
    ListChecks,
    Sparkles,
    Trophy,
    Target,
    AlertCircle
} from 'lucide-vue-next'
import confetti from 'canvas-confetti'
import { usePlayground, type GNS3Config, type DeviceMapping } from '@/composables/usePlayground'

// Types
interface Task {
    taskId: string
    name: string
    description?: string
    points: number
    order: number
    testCases?: any[]
    groupId?: string
}

interface Part {
    partId: string
    tempId?: string
    title: string
    description?: string
    partType: 'fill_in_blank' | 'network_config'
    tasks: Task[]
    totalPoints: number
    isExpanded?: boolean
}

interface GradingResult {
    partId: string
    status: 'idle' | 'grading' | 'success' | 'failed' | 'error'
    score?: number
    maxScore?: number
    taskResults?: Array<{
        taskId: string
        passed: boolean
        score: number
        maxScore: number
        feedback?: string
    }>
    error?: string
}

const props = defineProps<{
    open: boolean
    labId: string
    parts: Part[]
    gns3Config: GNS3Config | null
    deviceMappings: DeviceMapping[]
    customIpMappings: Record<string, string>
    customVlanMappings: Record<string, number>
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'reconfigure'): void
}>()

const { startGrading } = usePlayground()

// State
const expandedParts = ref<Set<string>>(new Set())
const gradingResults = ref<Map<string, GradingResult>>(new Map())
const activeEventSource = ref<EventSource | null>(null)

// Computed
const networkConfigParts = computed(() =>
    props.parts.filter(p => p.partType === 'network_config')
)

const overallProgress = computed(() => {
    const total = networkConfigParts.value.length
    if (total === 0) return 0
    const completed = Array.from(gradingResults.value.values()).filter(
        r => r.status === 'success' || r.status === 'failed'
    ).length
    return Math.round((completed / total) * 100)
})

// Methods
function togglePart(partId: string) {
    if (expandedParts.value.has(partId)) {
        expandedParts.value.delete(partId)
    } else {
        expandedParts.value.add(partId)
    }
}

function getPartResult(partId: string): GradingResult | undefined {
    return gradingResults.value.get(partId)
}

function isPartGrading(partId: string): boolean {
    return getPartResult(partId)?.status === 'grading'
}

async function gradePart(part: Part) {
    if (!props.gns3Config?.projectId) {
        console.error('GNS3 not configured')
        gradingResults.value.set(part.partId, {
            partId: part.partId,
            status: 'error',
            error: 'GNS3 project not configured. Please reconfigure.',
        })
        return
    }

    // Set grading state
    gradingResults.value.set(part.partId, {
        partId: part.partId,
        status: 'grading',
    })

    try {
        // Pass the config from props to startGrading
        const result = await startGrading(props.labId, part.partId, {
            gns3Config: props.gns3Config,
            deviceMappings: props.deviceMappings,
            customIpMappings: props.customIpMappings,
            customVlanMappings: props.customVlanMappings,
        })

        if (!result.success || !result.jobId) {
            gradingResults.value.set(part.partId, {
                partId: part.partId,
                status: 'error',
                error: result.error || 'Failed to start grading',
            })
            return
        }

        // Connect to SSE for results
        connectToGradingStream(part.partId, result.jobId)
    } catch (error: any) {
        gradingResults.value.set(part.partId, {
            partId: part.partId,
            status: 'error',
            error: error.message || 'Grading failed',
        })
    }
}

function connectToGradingStream(partId: string, jobId: string) {
    const config = useRuntimeConfig()
    const sseUrl = `${config.public.backendurl}/v0/submissions/events?jobId=${jobId}`

    // Close existing connection
    if (activeEventSource.value) {
        activeEventSource.value.close()
    }

    const eventSource = new EventSource(sseUrl, { withCredentials: true })
    activeEventSource.value = eventSource

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data)
            handleGradingUpdate(partId, data)
        } catch (e) {
            console.error('Failed to parse SSE message:', e)
        }
    }

    eventSource.onerror = () => {
        eventSource.close()
        const currentResult = gradingResults.value.get(partId)
        if (currentResult?.status === 'grading') {
            gradingResults.value.set(partId, {
                ...currentResult,
                status: 'error',
                error: 'Connection lost with SSE',
            })
        }
    }
}

function handleGradingUpdate(partId: string, data: any) {
    if (data.type === 'complete' || data.status === 'done') {
        // Grading complete
        const score = data.result?.score ?? data.score ?? 0
        const maxScore = data.result?.maxScore ?? data.maxScore ?? 100
        const passed = score >= maxScore * 0.6 // 60% pass threshold

        gradingResults.value.set(partId, {
            partId,
            status: passed ? 'success' : 'failed',
            score,
            maxScore,
            taskResults: data.result?.taskResults || data.taskResults,
        })

        // Trigger celebration animation on success
        if (passed) {
            triggerSuccessAnimation()
        } else {
            triggerFailureAnimation()
        }

        // Close SSE connection
        if (activeEventSource.value) {
            activeEventSource.value.close()
            activeEventSource.value = null
        }
    } else if (data.type === 'error') {
        gradingResults.value.set(partId, {
            partId,
            status: 'error',
            error: data.message || 'Grading failed',
        })

        if (activeEventSource.value) {
            activeEventSource.value.close()
            activeEventSource.value = null
        }
    }
    // Progress updates can be handled here if needed
}

function triggerSuccessAnimation() {
    // Confetti burst
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#34d399', '#6ee7b7'],
    })

    // Second burst after slight delay
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#22c55e', '#10b981'],
        })
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#22c55e', '#10b981'],
        })
    }, 250)
}

function triggerFailureAnimation() {
    // Subtle shake effect handled via CSS class
    const modal = document.querySelector('.playground-testing-modal')
    if (modal) {
        modal.classList.add('shake-animation')
        setTimeout(() => modal.classList.remove('shake-animation'), 500)
    }
}

function getStatusIcon(status: GradingResult['status']) {
    switch (status) {
        case 'grading': return Loader2
        case 'success': return CheckCircle2
        case 'failed': return XCircle
        case 'error': return AlertCircle
        default: return Target
    }
}

function getStatusColor(status: GradingResult['status']) {
    switch (status) {
        case 'grading': return 'text-blue-500'
        case 'success': return 'text-green-500'
        case 'failed': return 'text-red-500'
        case 'error': return 'text-orange-500'
        default: return 'text-muted-foreground'
    }
}

// Cleanup
onBeforeUnmount(() => {
    if (activeEventSource.value) {
        activeEventSource.value.close()
    }
})

// Persist state when modal closes
watch(() => props.open, (open) => {
    if (open) {
        // Expand first part by default
        if (networkConfigParts.value.length > 0 && expandedParts.value.size === 0) {
            expandedParts.value.add(networkConfigParts.value[0].partId)
        }
    }
})
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="max-w-3xl max-h-[85vh] overflow-y-auto playground-testing-modal">
            <DialogHeader>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="p-2 bg-primary/10 rounded-lg">
                            <Sparkles class="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle class="text-foreground">Playground Testing</DialogTitle>
                            <DialogDescription class="text-muted-foreground">
                                Test your lab configuration by grading each part
                            </DialogDescription>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" @click="$emit('reconfigure')">
                        Reconfigure
                    </Button>
                </div>
            </DialogHeader>

            <!-- Progress Overview -->
            <div class="mt-4 p-4 bg-muted/50 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium">Overall Progress</span>
                    <span class="text-sm text-muted-foreground">
                        {{Array.from(gradingResults.values()).filter(r => r.status === 'success').length}} / {{
                            networkConfigParts.length }} parts passed
                    </span>
                </div>
                <Progress :model-value="overallProgress" class="h-2" />
            </div>

            <!-- GNS3 Connection Info -->
            <Alert v-if="gns3Config"
                class="mt-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle2 class="w-4 h-4 text-green-600" />
                <AlertTitle class="text-green-800 dark:text-green-400">GNS3 Connected</AlertTitle>
                <AlertDescription class="text-green-700 dark:text-green-500">
                    {{ gns3Config.serverIp }}:{{ gns3Config.serverPort }} • Project: {{ gns3Config.projectName }}
                </AlertDescription>
            </Alert>

            <!-- Parts List -->
            <div class="mt-6 space-y-4">
                <div v-if="networkConfigParts.length === 0" class="text-center py-8 text-muted-foreground">
                    <ListChecks class="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No network configuration parts found</p>
                    <p class="text-sm">Only network_config parts can be tested in the playground</p>
                </div>

                <Card v-for="part in networkConfigParts" :key="part.partId || part.tempId"
                    class="overflow-hidden transition-all duration-200"
                    :class="{ 'ring-2 ring-primary/50': expandedParts.has(part.partId) }">
                    <Collapsible :open="expandedParts.has(part.partId)">
                        <CollapsibleTrigger as-child>
                            <CardHeader class="cursor-pointer hover:bg-muted/50 transition-colors"
                                @click="togglePart(part.partId)">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <component :is="expandedParts.has(part.partId) ? ChevronDown : ChevronRight"
                                            class="w-4 h-4 text-muted-foreground transition-transform" />
                                        <div>
                                            <CardTitle class="text-base">{{ part.title }}</CardTitle>
                                            <CardDescription v-if="part.description" class="mt-0.5">
                                                {{ part.description }}
                                            </CardDescription>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <!-- Status Badge -->
                                        <Badge v-if="getPartResult(part.partId)" :variant="getPartResult(part.partId)?.status === 'success' ? 'default' :
                                            getPartResult(part.partId)?.status === 'failed' ? 'destructive' :
                                                'secondary'" class="gap-1">
                                            <component :is="getStatusIcon(getPartResult(part.partId)!.status)"
                                                class="w-3 h-3"
                                                :class="{ 'animate-spin': getPartResult(part.partId)?.status === 'grading' }" />
                                            <span v-if="getPartResult(part.partId)?.score !== undefined">
                                                {{ getPartResult(part.partId)?.score }}/{{
                                                    getPartResult(part.partId)?.maxScore }}
                                            </span>
                                            <span v-else>
                                                {{ getPartResult(part.partId)?.status === 'grading' ? 'Grading...' :
                                                    getPartResult(part.partId)?.status === 'error' ? 'Error' : '' }}
                                            </span>
                                        </Badge>

                                        <!-- Points -->
                                        <Badge variant="outline" class="gap-1">
                                            <Trophy class="w-3 h-3" />
                                            {{ part.totalPoints }} pts
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <CardContent class="pt-0 space-y-4">
                                <!-- Tasks List -->
                                <div class="space-y-2">
                                    <div class="text-sm font-medium text-muted-foreground mb-2">
                                        Tasks ({{ part.tasks.length }})
                                    </div>

                                    <div v-for="task in part.tasks" :key="task.taskId"
                                        class="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                                        <div class="flex items-center gap-3">
                                            <div
                                                class="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                {{ task.order + 1 }}
                                            </div>
                                            <div>
                                                <div class="font-medium text-sm">{{ task.name }}</div>
                                                <div v-if="task.description" class="text-xs text-muted-foreground">
                                                    {{ task.description }}
                                                </div>
                                            </div>
                                        </div>

                                        <Badge variant="secondary" class="text-xs">
                                            {{ task.points }} pts
                                        </Badge>
                                    </div>
                                </div>

                                <!-- Error Display -->
                                <Alert v-if="getPartResult(part.partId)?.error" variant="destructive">
                                    <AlertCircle class="w-4 h-4" />
                                    <AlertDescription>
                                        {{ getPartResult(part.partId)?.error }}
                                    </AlertDescription>
                                </Alert>

                                <!-- Grade Button -->
                                <div class="flex justify-end pt-2">
                                    <Button @click.stop="gradePart(part)"
                                        :disabled="isPartGrading(part.partId) || !gns3Config" class="gap-2">
                                        <Loader2 v-if="isPartGrading(part.partId)" class="w-4 h-4 animate-spin" />
                                        <Play v-else class="w-4 h-4" />
                                        {{ isPartGrading(part.partId) ? 'Grading...' : 'Grade Part' }}
                                    </Button>
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            </div>
        </DialogContent>
    </Dialog>
</template>

<style scoped>
.shake-animation {
    animation: shake 0.5s ease-in-out;
}

@keyframes shake {

    0%,
    100% {
        transform: translateX(0);
    }

    10%,
    30%,
    50%,
    70%,
    90% {
        transform: translateX(-5px);
    }

    20%,
    40%,
    60%,
    80% {
        transform: translateX(5px);
    }
}

/* Smooth transitions */
.playground-testing-modal {
    transition: transform 0.2s ease;
}
</style>
