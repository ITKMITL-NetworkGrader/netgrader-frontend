<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="student-lab-view">
    <!-- Lab Completion Prompt -->
    <LabCompletionPrompt
      :is-open="showCompletionPrompt"
      :lab-name="labData.name"
      :completed-parts="completionStatus.totalPartsCompleted"
      :total-parts="completionStatus.totalParts"
      @continue="handleContinueAfterCompletion"
      @restart="handleRestartLab"
      @close="showCompletionPrompt = false"
    />

    <!-- Timer Expired Modal -->
    <LabResultsModal
      :is-open="showTimerExpiredModal"
      :course-id="labData.courseCode"
      :lab-name="labData.name"
      :submissions="studentSubmissions"
      :active-lab-session-id="activeLabSessionId"
      :lab-parts="labData.parts"
      :mode="timerExpiredModalMode"
      :available-until="labData.availableUntil"
      @close="handleTimerExpiredModalClose"
      @start-over="handleRestartLab"
    />

    <!-- GNS3 Setup Modal -->
    <StudentGns3SetupModal
      :open="showGns3SetupModal"
      :lab-id="labData.id"
      :lab-name="labData.name"
      @update:open="showGns3SetupModal = $event"
      @complete="handleGns3SetupComplete"
    />

    <!-- Lab Timer (Fixed at bottom center) -->
    <LabTimer
      v-if="!isCalculatingIPs"
      :available-from="labData.availableFrom"
      :due-date="labData.dueDate"
      :available-until="labData.availableUntil"
      :created-at="labData.createdAt"
      :lab-id="labData.id"
      :poll-interval-ms="45000"
      @timer-expired="handleTimerExpired"
      @deadline-extended="handleDeadlineExtended"
    />

    <!-- IP Calculation Loading Screen -->
    <div v-if="isCalculatingIPs" class="fixed inset-0 z-40 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div class="text-center space-y-6 px-4">
        <!-- Animated IP Calculation Text -->
        <div class="relative">
          <h2 class="text-4xl md:text-5xl font-bold text-foreground mb-2 tracking-tight">
            <span class="inline-block relative ip-calc-text">
              Gathering your IP addresses
              <span class="absolute inset-0 shine-effect" />
            </span>
          </h2>
          <p class="text-lg text-muted-foreground">
            Setting up your personalized network configuration...
          </p>
        </div>

        <!-- Loading Animation -->
        <div class="flex justify-center space-x-2 mt-8">
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 0ms" />
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms" />
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms" />
        </div>

        <!-- Progress Info -->
        <div class="mt-6 text-sm text-muted-foreground space-y-2">
          <div class="flex items-center justify-center space-x-2">
            <div class="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>{{ calculationStatus }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Lab Content (shown after calculation) -->
    <div v-else>
      <!-- Lab Header -->
      <div class="lab-header">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-foreground">{{ labData.name }}</h1>
            <p class="text-muted-foreground">{{ labData.description }}</p>
          </div>
          <div class="flex items-center space-x-2">
            <Badge variant="secondary">Student ID: {{ currentUser.studentId }}</Badge>
            <Badge variant="outline">{{ labData.courseCode }}</Badge>
          </div>
        </div>
      </div>

    <!-- Personalized Network Configuration -->
    <div class="personalized-config mb-6">
      <div class="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div class="flex items-center mb-3">
          <span class="text-primary">🌐</span>
          <h3 class="font-semibold text-primary ml-2">Your Personalized Network Configuration</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-card p-3 rounded border border-border">
            <div class="text-sm font-medium text-card-foreground mb-1">Your Networks</div>
            <div class="space-y-1 text-sm">
              <div>IPv4: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.ipv4_subnet }}</code></div>
              <div>IPv6: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.ipv6_subnet }}</code></div>
            </div>
          </div>

          <div class="bg-card p-3 rounded border border-border">
            <div class="text-sm font-medium text-card-foreground mb-1">VLANs</div>
            <div class="space-y-1 text-sm">
              <div>VLAN 1: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.vlan1 }}</code></div>
              <div>VLAN 2: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.vlan2 }}</code></div>
            </div>
          </div>

          <div class="bg-card p-3 rounded border border-border">
            <div class="text-sm font-medium text-card-foreground mb-1">External Interface</div>
            <div class="space-y-1 text-sm">
              <div>IPv4: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.router_external_ip }}</code></div>
              <div>IPv6: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.router_external_ipv6 }}</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Large Subnet Mode Configuration (for subnet calculation exercises) -->
    <div v-if="backendLargeSubnetInfo" class="personalized-config mb-6">
      <div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
        <div class="flex items-center mb-3">
          <span class="text-purple-600 text-xl">🧮</span>
          <h3 class="font-semibold text-purple-800 ml-2">Your Subnet Calculation Exercise</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Allocated Large Subnet -->
          <div class="bg-white p-4 rounded border border-purple-200">
            <div class="text-sm font-medium text-purple-800 mb-2">Your Assigned Network</div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Network Address:</span>
                <code class="bg-purple-100 text-purple-900 px-2 py-1 rounded font-mono text-lg">
                  {{ backendLargeSubnetInfo.allocatedSubnet }}
                </code>
              </div>
              <div class="text-xs text-gray-500">
                This is your large subnet. You must divide it into the required sub-VLANs.
              </div>
            </div>
          </div>

          <!-- Assigned VLAN IDs -->
          <div class="bg-white p-4 rounded border border-purple-200">
            <div class="text-sm font-medium text-purple-800 mb-2">Your VLAN IDs</div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(subVlan, idx) in backendLargeSubnetInfo.subVlans"
                :key="idx"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm"
              >
                <span class="font-medium">{{ subVlan.name }}:</span>
                <span class="font-mono font-bold">{{ subVlan.vlanId }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Sub-VLAN Requirements (what students need to calculate) -->
        <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <div class="text-sm font-medium text-amber-800 mb-2">Required Sub-VLANs to Configure:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div
              v-for="(subVlan, idx) in backendLargeSubnetInfo.subVlans"
              :key="idx"
              class="text-xs bg-white p-2 rounded border border-amber-100"
            >
              <span class="font-medium text-amber-900">{{ subVlan.name }}:</span>
              <span class="text-amber-700 ml-1">/{{ subVlan.subnetSize }} subnet at index {{ subVlan.subnetIndex }}</span>
            </div>
          </div>
          <div class="mt-2 text-xs text-amber-700">
            <strong>Note:</strong> You must calculate the actual network addresses for each sub-VLAN based on your assigned large subnet.
          </div>
        </div>
      </div>
    </div>

    <!-- Part 0 · Student Instructions -->
    <div class="instructions-part mb-6">
      <div class="bg-card border border-border rounded-lg p-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-card-foreground">Part 0 · Student Instructions</h3>
            <p class="text-sm text-muted-foreground">Read and acknowledge before starting the lab.</p>
            <div v-if="instructionsAcknowledged" class="flex items-center gap-2 text-xs text-green-600 mt-2">
              <CheckCircle class="w-4 h-4" />
              <span>
                Acknowledged {{ acknowledgedAtLabel }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-4 prose max-w-none" v-html="renderedInstructions"></div>

        <div v-if="!instructionsAcknowledged" class="mt-6 space-y-4">
          <div class="flex items-start gap-2">
            <Checkbox
              id="instructions-ack"
              v-model="instructionsAckChecked"
            />
            <Label for="instructions-ack" class="text-sm text-muted-foreground leading-snug">
              I have read and understand the instructions above. I agree to follow these rules while working on this lab.
            </Label>
          </div>

          <div class="flex items-center gap-3">
            <Button
              :disabled="!instructionsAckChecked || instructionsAckLoading"
              @click="acknowledgeInstructions"
            >
              <span v-if="instructionsAckLoading">Submitting...</span>
              <span v-else>Submit</span>
            </Button>
            <p v-if="instructionsAckError" class="text-sm text-destructive">
              {{ instructionsAckError }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!instructionsAcknowledged"
      class="mb-8 border-2 border-dashed border-border/60 rounded-lg p-4 bg-muted/40 text-sm text-muted-foreground flex items-start gap-3"
    >
      <Info class="w-5 h-5 mt-0.5" />
      <div>
        <p class="font-medium text-foreground">Instructions acknowledgement required</p>
        <p class="mt-1">Please complete Part 0 before proceeding to the lab tasks.</p>
      </div>
    </div>

    <div v-if="instructionsAcknowledged">
      <!-- Device Configuration Reference -->
      <div class="device-config mb-6">
        <!-- Device Naming Warning -->
        <Alert class="mb-4 bg-amber-500/10 border-amber-500/30">
          <AlertTriangle class="h-4 w-4 text-amber-600" />
          <AlertTitle class="text-amber-700 text-amber-500">Important: Device Node Names</AlertTitle>
          <AlertDescription class="text-sm text-amber-700 text-amber-500">
            GNS3 device node names must match exactly as defined below. Mismatched names will cause grading to fail.
          </AlertDescription>
        </Alert>

        <div class="bg-muted/50 border border-border rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4 text-foreground">Your Device Configuration Reference</h3>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Router Configuration -->
            <div v-for="device in personalizedDevices" :key="device.deviceId" class="device-card">
              <div class="bg-card border border-border rounded-lg p-4">
                <div class="flex items-center mb-3">
                  <component :is="getDeviceIcon(device.type)" class="w-5 h-5 text-primary mr-2" />
                  <h4 class="font-semibold text-card-foreground">{{ device.deviceId }}</h4>
                  <Badge variant="outline" class="ml-2">{{ device.type }}</Badge>
                </div>

                <div class="space-y-3">
                  <div v-for="variable in device.ipVariables" :key="variable.name" class="variable-config">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-card-foreground">{{ variable.displayName }}</span>
                      <div class="flex items-center space-x-2">
                        <code class="bg-primary/10 text-primary px-2 py-1 rounded text-sm border border-primary/20">
                          {{ variable.resolvedIP }}
                        </code>
                        <Badge
                          :variant="variable.type === 'student_generated' ? 'secondary' : 'outline'"
                          class="text-xs"
                        >
                          {{ variable.type === 'student_generated' ? 'Auto-generated' : 'Static' }}
                        </Badge>
                      </div>
                    </div>
                    <div v-if="variable.description" class="text-xs text-muted-foreground">
                      {{ variable.description }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lab Tasks -->
      <div class="lab-tasks">
        <div class="bg-card border border-border rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4 text-card-foreground">Lab Tasks</h3>

          <div class="space-y-4">
            <div v-for="part in personalizedTasks" :key="part.partId" class="part-section">
              <div class="border border-border rounded-lg p-4">
                <h4 class="font-semibold text-card-foreground mb-2">{{ part.title }}</h4>
              <p class="text-muted-foreground text-sm mb-3">{{ part.description }}</p>
              <div class="p-3 bg-muted/20 rounded mb-4" v-if="renderPartInstructions(part)">
                <Label class="text-xs font-medium text-muted-foreground mb-2 block">
                  Part Instructions
                </Label>
                <div class="prose prose-sm max-w-none" v-html="renderPartInstructions(part)"></div>
              </div>

              <div class="space-y-2">
                <div v-for="task in part.tasks" :key="task.taskId" class="task-item">
                    <div class="flex items-start space-x-3 p-3 bg-muted/50 rounded border border-border">
                      <div class="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20">
                        <span class="text-primary text-xs font-medium">{{ task.order }}</span>
                      </div>
                      <div class="flex-1">
                        <div class="font-medium text-card-foreground">{{ task.name }}</div>
                        <div v-if="task.description" class="text-sm text-muted-foreground mt-1">{{ task.description }}</div>

                        <!-- Show personalized parameters -->
                        <div v-if="task.personalizedParameters" class="mt-2">
                          <div class="text-xs font-medium text-card-foreground mb-1">Your Parameters:</div>
                          <div class="space-y-1">
                            <div v-for="(value, param) in task.personalizedParameters" :key="param" class="text-xs">
                              <span class="text-muted-foreground">{{ param }}:</span>
                              <code class="bg-accent text-accent-foreground px-1 rounded ml-1 border border-border">{{ value }}</code>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="text-sm text-muted-foreground">{{ task.points }} pts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Debug Information (Development Mode) -->
      <div v-if="showDebugInfo" class="debug-info mt-6">
        <div class="bg-card border border-border rounded-lg p-4">
          <h3 class="font-semibold mb-3 text-card-foreground">Debug Information</h3>
          <details>
            <summary class="cursor-pointer text-muted-foreground hover:text-card-foreground">Student IP Generation Details</summary>
            <pre class="mt-2 text-sm overflow-x-auto bg-muted p-3 rounded border border-border text-muted-foreground font-mono">{{ debugInfo }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { Router, Monitor, HardDrive, CheckCircle, Info, AlertTriangle } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'vue-sonner'
import LabCompletionPrompt from '@/components/student/LabCompletionPrompt.vue'
import LabResultsModal from '@/components/student/LabResultsModal.vue'
import LabTimer from '@/components/student/LabTimer.vue'
import StudentGns3SetupModal from '@/components/student/StudentGns3SetupModal.vue'
import { useSubmissions } from '@/composables/useSubmissions'
import type { ISubmission } from '@/types/submission'

const DOMPURIFY_TEXT_COLOR_CONFIG = {
  ADD_ATTR: ['style'],
  ALLOWED_CSS: ['color']
} as const
const EMPTY_PARAGRAPH_REGEX = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi

const normalizeEmptyParagraphs = (html: string): string => {
  return html.replace(
    EMPTY_PARAGRAPH_REGEX,
    '<p class="lab-empty-line"><span aria-hidden="true">&nbsp;</span></p>'
  )
}

// IP Calculation State
const isCalculatingIPs = ref(true)
const calculationStatus = ref('Gathering your IP addresses...')

// Submission State
const showCompletionPrompt = ref(false)
const studentSubmissions = ref<ISubmission[]>([])
const activeLabSessionId = ref<string | null>(null)
const completionStatus = ref({
  isFullyCompleted: false,
  completedParts: [] as string[],
  totalPartsCompleted: 0,
  totalParts: 0,
  allPartsPassedWithFullPoints: false
})

// Timer State
const showTimerExpiredModal = ref(false)
const timerExpiredModalMode = ref<'results' | 'timer_expired' | 'unavailable'>('results')

// GNS3 Setup Modal State
const showGns3SetupModal = ref(false)
const hasGns3Project = ref(false)

// Backend IP Mappings (from POST /v0/labs/:id/start)
const backendIpMappings = ref<Record<string, { ip: string; vlan: number | null }>>({})
const backendVlanMappings = ref<Record<string, number>>({})

// Large Subnet Mode allocation (from backend - for subnet calculation exercises)
const backendLargeSubnetInfo = ref<{
  allocatedSubnet: string       // e.g., "10.0.2.0/23"
  networkAddress: string        // e.g., "10.0.2.0"
  subnetMask: number            // e.g., 23
  randomizedVlanIds: number[]   // e.g., [247, 1892]
  subVlans: Array<{
    name: string
    subnetSize: number
    subnetIndex: number
    vlanId: number
  }>
} | null>(null)

type TaskParameterValue = string | number | boolean | null | undefined

type PartInstructions =
  | string
  | {
      html?: string
      instructions?: string
    }

interface LabInstructions {
  html: string
  json: Record<string, unknown>
}

interface LabTask {
  taskId: string
  name: string
  description: string
  order: number
  points: number
  parameters: Record<string, TaskParameterValue>
}

interface LabPart {
  partId: string
  title: string
  description: string
  instructions?: PartInstructions
  tasks: LabTask[]
}

interface PersonalizedLabTask extends LabTask {
  personalizedParameters: Record<string, string> | null
}

interface PersonalizedLabPart extends LabPart {
  tasks: PersonalizedLabTask[]
}

interface LabDevice {
  deviceId: string
  templateId: string
  deviceType: string
  ipVariables: Array<{
    name: string
    inputType: 'hostOffset' | 'fullIP' | 'studentGenerated'
    hostOffset?: number
    fullIP?: string
    isStudentGenerated?: boolean
  }>
}

interface LabData {
  id: string
  name: string
  description: string
  courseCode: string
  instructions: LabInstructions
  instructionsAcknowledged?: boolean
  availableFrom?: Date | string | null
  dueDate?: Date | string | null
  availableUntil?: Date | string | null
  network: {
    devices: LabDevice[]
  }
  parts: LabPart[]
}

interface Props {
  labData: LabData
  currentUser: {
    studentId: string
    name: string
    email: string
  }
  showDebugInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false
})

const instructionsAcknowledged = ref(props.labData.instructionsAcknowledged ?? false)
const instructionsAcknowledgedAt = ref<Date | null>(null)
const instructionsAckChecked = ref(instructionsAcknowledged.value)
const instructionsAckLoading = ref(false)
const instructionsAckError = ref('')

const acknowledgedAtLabel = computed(() => {
  if (!instructionsAcknowledgedAt.value) return ''
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(instructionsAcknowledgedAt.value)
})

// Generate personalized networks for this student (from backend VLAN mappings)
const personalizedNetworks = computed(() => {
  // Extract VLAN IDs from backend mappings
  const vlan1 = backendVlanMappings.value['vlan0'] || 0
  const vlan2 = backendVlanMappings.value['vlan1'] || 0

  return {
    ipv4_subnet: '172.16.0.0/16', // This could be extracted from backend if needed
    ipv6_subnet: 'fe80::/64', // This could be extracted from backend if needed
    vlan1,
    vlan2,
    router_external_ip: 'Auto-assigned',
    router_external_ipv6: 'Auto-assigned'
  }
})

// Generate personalized device configurations using backend IP mappings
const personalizedDevices = computed(() => {
  return props.labData.network.devices.map((device) => {
    const resolvedVariables = device.ipVariables.map((variable) => {
      // Create the mapping key: deviceId.variableName
      const mappingKey = `${device.deviceId}.${variable.name}`

      // Get IP from backend mappings
      const ipMapping = backendIpMappings.value[mappingKey]
      const resolvedIP = ipMapping?.ip || 'Loading...'

      return {
        name: variable.name,
        displayName: mappingKey,
        resolvedIP,
        type: variable.inputType === 'studentGenerated' || variable.inputType?.startsWith('studentVlan') || variable.inputType === 'studentManagement'
          ? 'student_generated'
          : 'static',
        description: getVariableDescription(device.deviceType, variable.name)
      }
    })

    return {
      deviceId: device.deviceId,
      type: device.deviceType,
      ipVariables: resolvedVariables
    }
  })
})

// Process lab instructions and replace variables with personalized values
const decodeHtmlEntities = (value: string): string => {
  if (!value || value.indexOf('&') === -1) return value

  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = value
    return textarea.value
  }

  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

const convertContentToHtml = (content: string): string => {
  const trimmed = content.trim()
  if (!trimmed) return ''

  const decoded = decodeHtmlEntities(trimmed)
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(decoded)

  if (looksLikeHtml) {
    return decoded
  }

  try {
    return marked(decoded, { breaks: true }) as string
  } catch (error) {
    console.warn('Failed to convert markdown:', error)
    return decoded
  }
}

const renderedInstructions = computed(() => {
  const instructions = props.labData.instructions
  // Support both legacy HTML and new Markdown format
  const rawInstructions = instructions?.markdown || instructions?.html || ''

  if (!rawInstructions) {
    return '<p class="text-muted-foreground">No instructions provided.</p>'
  }

  let instructions = rawInstructions

  // Replace common variables in instructions
  instructions = instructions.replace(/\{student\.id\}/g, props.currentUser.studentId)
  instructions = instructions.replace(/\{student\.name\}/g, props.currentUser.name)

  // Replace IP variables
  personalizedDevices.value.forEach(device => {
    device.ipVariables.forEach(variable => {
      const placeholder = `{${variable.displayName}}`
      instructions = instructions.replace(new RegExp(placeholder, 'g'), variable.resolvedIP)
    })
  })

  // Replace network variables
  instructions = instructions.replace(/\{network\.ipv4\}/g, personalizedNetworks.value.ipv4_subnet)
  instructions = instructions.replace(/\{network\.vlan1\}/g, personalizedNetworks.value.vlan1.toString())
  instructions = instructions.replace(/\{network\.vlan2\}/g, personalizedNetworks.value.vlan2.toString())

  const html = convertContentToHtml(instructions)
  const sanitized = DOMPurify.sanitize(html, DOMPURIFY_TEXT_COLOR_CONFIG)
  return normalizeEmptyParagraphs(sanitized)
})

const renderPartInstructions = (part: LabPart): string => {
  const value = part.instructions
  if (!value) return ''

  let html = ''
  if (typeof value === 'string') {
    html = value
  } else if (typeof value === 'object') {
    // Handle new markdown field or legacy html/json
    html = value.markdown || value.html || value.instructions || ''
  }

  if (!html.trim()) return ''

  try {
    const rendered = convertContentToHtml(html)
    const sanitized = DOMPurify.sanitize(rendered, DOMPURIFY_TEXT_COLOR_CONFIG)
    return normalizeEmptyParagraphs(sanitized)
  } catch (error) {
    console.warn('Failed to render part instructions:', error)
    return html
  }
}

async function acknowledgeInstructions() {
  if (!instructionsAckChecked.value || instructionsAckLoading.value) return

  instructionsAckLoading.value = true
  instructionsAckError.value = ''

  try {
    const config = useRuntimeConfig()
    const response = await fetch(
      `${config.public.backendurl}/v0/labs/${props.labData.id}/instructions/acknowledge`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    instructionsAcknowledged.value = true
    instructionsAckChecked.value = true
    instructionsAcknowledgedAt.value = result.data?.acknowledgedAt
      ? new Date(result.data.acknowledgedAt)
      : new Date()
    instructionsAckError.value = ''
    toast.success('Instructions acknowledged. You can start Part 1 now.')
    
    // Show GNS3 setup modal after acknowledging instructions if no project configured
    checkAndShowGns3Modal()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to acknowledge instructions'
    instructionsAckError.value = message
    toast.error(message)
  } finally {
    instructionsAckLoading.value = false
  }
}

// GNS3 Setup Modal handlers
const GNS3_PROJECT_STORAGE_KEY = 'netgrader_gns3_project'

function checkGns3ProjectExists(): boolean {
  try {
    const saved = localStorage.getItem(GNS3_PROJECT_STORAGE_KEY)
    if (saved) {
      const config = JSON.parse(saved)
      // Check if config exists for current lab
      if (config.labId === props.labData.id && config.projectName) {
        return true
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return false
}

function checkAndShowGns3Modal() {
  const projectExists = checkGns3ProjectExists()
  
  if (!projectExists) {
    showGns3SetupModal.value = true
  } else {
    hasGns3Project.value = true
  }
}

function handleGns3SetupComplete(config: {
  serverIp: string
  serverPort: number
  projectId: string
  projectName: string
}) {
  hasGns3Project.value = true
  showGns3SetupModal.value = false
  toast.success(`GNS3 project "${config.projectName}" configured successfully!`)
}

// Generate personalized task parameters
const formatTaskParameter = (value: TaskParameterValue): string => {
  if (value === undefined || value === null) return ''
  return String(value)
}

const resolveDeviceVariable = (value: string): string | null => {
  const deviceVarMatch = value.match(/^(\w+)\.(\w+)$/)
  if (!deviceVarMatch) return null
  const [, deviceId, variableName] = deviceVarMatch
  const device = personalizedDevices.value.find(d => d.deviceId === deviceId)
  const variable = device?.ipVariables.find(v => v.name === variableName)
  return variable?.resolvedIP ?? null
}

const personalizedTasks = computed<PersonalizedLabPart[]>(() => {
  return props.labData.parts.map((part) => {
    const personalizedPartTasks = part.tasks.map<PersonalizedLabTask>((task) => {
      const personalizedParameters: Record<string, string> = {}

      Object.entries(task.parameters).forEach(([key, value]) => {
        const formattedValue = formatTaskParameter(value)
        if (!formattedValue) return

        const resolved = resolveDeviceVariable(formattedValue)
        personalizedParameters[key] = resolved ?? formattedValue
      })

      return {
        ...task,
        personalizedParameters: Object.keys(personalizedParameters).length > 0 ? personalizedParameters : null
      }
    })

    return {
      ...part,
      tasks: personalizedPartTasks
    }
  })
})

// Debug information
const debugInfo = computed(() => {
  return {
    studentId: props.currentUser.studentId,
    backendIpMappings: backendIpMappings.value,
    backendVlanMappings: backendVlanMappings.value,
    deviceConfigurations: personalizedDevices.value,
    completionStatus: completionStatus.value,
    activeLabSessionId: activeLabSessionId.value
  }
})

// Helper methods
function getVariableDescription(deviceType: string, variableName: string): string {
  const descriptions: Record<string, string> = {
    'loopback0': 'Router loopback interface',
    'gig0_0': 'Router GigabitEthernet 0/0 interface',
    'gig0_1': 'Router GigabitEthernet 0/1 interface',
    'management_ip': 'Switch management interface',
    'eth0': 'Primary network interface',
    'ens2': 'Network interface'
  }

  return descriptions[variableName.toLowerCase()] || `${deviceType} interface`
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'router':
      return Router
    case 'switch':
      return Monitor
    case 'pc':
      return HardDrive
    default:
      return Router
  }
}

// Initialize composables
const { fetchStudentSubmissions, checkLabCompletionStatus } = useSubmissions()

// Check lab completion status
async function checkLabCompletion() {
  try {
    calculationStatus.value = 'Checking lab status...'

    // Fetch student submissions
    const sessionId = activeLabSessionId.value ?? undefined

    const result = await fetchStudentSubmissions(
      props.currentUser.studentId,
      props.labData.id,
      sessionId ? { labSessionId: sessionId } : undefined
    )

    if (result.success && result.submissions) {
      studentSubmissions.value = result.submissions

      // Check completion status
      const labParts = props.labData.parts.map(part => ({
        partId: part.partId,
        totalPoints: part.tasks.reduce((sum, task) => sum + task.points, 0)
      }))

      completionStatus.value = checkLabCompletionStatus(
        result.submissions,
        labParts,
        { 
          labSessionId: sessionId ?? null,
          dueDate: props.labData.dueDate,
          availableUntil: props.labData.availableUntil
        }
      )

      // Show completion prompt if lab is fully completed
      if (completionStatus.value.isFullyCompleted) {
        showCompletionPrompt.value = true
      }
    }
  } catch (error) {
    console.error('❌ [ERROR] Failed to check lab completion:', error)
  }
}

// Handle continue after completion (just view the lab)
function handleContinueAfterCompletion() {
  showCompletionPrompt.value = false
  // Continue loading IPs
  loadPersonalizedIPs()
}

// Handle restart lab
function handleRestartLab() {
  showCompletionPrompt.value = false
  // Reset completion status and load IPs
  completionStatus.value = {
    isFullyCompleted: false,
    completedParts: [],
    totalPartsCompleted: 0,
    totalParts: 0,
    allPartsPassedWithFullPoints: false
  }
  activeLabSessionId.value = null
  studentSubmissions.value = []
  loadPersonalizedIPs()
}

// Handle timer expiration
function handleTimerExpired() {
  timerExpiredModalMode.value = 'timer_expired'
  showTimerExpiredModal.value = true
}

function handleDeadlineExtended(payload: {
  labId: string
  labTitle?: string
  fields: Array<{ type: 'dueDate' | 'availableUntil'; diffMs: number }>
}) {
}

// Handle timer expired modal close
function handleTimerExpiredModalClose() {
  showTimerExpiredModal.value = false
}

// Load personalized IPs from backend
async function loadPersonalizedIPs() {
  try {
    const config = useRuntimeConfig()

    calculationStatus.value = 'Fetching personalized network configuration...'
    const previousSessionId = activeLabSessionId.value

    const response = await fetch(
      `${config.public.backendurl}/v0/labs/${props.labData.id}/start`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.success && result.data) {
      // Store IP mappings from backend
      backendIpMappings.value = result.data.networkConfiguration.ipMappings || {}
      backendVlanMappings.value = result.data.networkConfiguration.vlanMappings || {}

      if (result.data.session) {
        const sessionInfo = result.data.session
        const acknowledged = Boolean(sessionInfo.instructionsAcknowledged)
        instructionsAcknowledged.value = acknowledged
        instructionsAckChecked.value = acknowledged
        instructionsAcknowledgedAt.value = sessionInfo.instructionsAcknowledgedAt
          ? new Date(sessionInfo.instructionsAcknowledgedAt)
          : instructionsAcknowledgedAt.value

        const newSessionId = sessionInfo.sessionId || null
        const sessionChanged = newSessionId !== previousSessionId
        activeLabSessionId.value = newSessionId

        if (sessionChanged) {
          studentSubmissions.value = []
          completionStatus.value = {
            isFullyCompleted: false,
            completedParts: [],
            totalPartsCompleted: 0,
            totalParts: 0,
            allPartsPassedWithFullPoints: false
          }
        }
      } else {
        activeLabSessionId.value = null
      }

        ipMappings: backendIpMappings.value,
        vlanMappings: backendVlanMappings.value
      })
    }

    if (activeLabSessionId.value !== previousSessionId) {
      await checkLabCompletion()
    }

    // Finish loading
    calculationStatus.value = 'Finalizing configuration...'
    await new Promise(resolve => setTimeout(resolve, 500))
    isCalculatingIPs.value = false

  } catch (error) {
    console.error('❌ [ERROR] Failed to load personalized IPs:', error)
    // Fall back to showing the lab anyway
    isCalculatingIPs.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await loadPersonalizedIPs()

  if (!showCompletionPrompt.value) {
    await checkLabCompletion()
  }
  
  // For returning users: if instructions already acknowledged but no GNS3 project, show modal
  if (instructionsAcknowledged.value) {
    checkAndShowGns3Modal()
  }
})
</script>

<style scoped>
.student-lab-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

.lab-header {
  margin-bottom: 2rem;
}

.personalized-config {
  margin-bottom: 2rem;
}

.device-card {
  transition: all 0.2s ease;
}

.device-card:hover {
  transform: translateY(-1px);
}

.variable-config {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.variable-config:last-child {
  border-bottom: none;
}

.task-item {
  margin-bottom: 0.5rem;
}

:deep(.prose) {
  line-height: 1.6;
}

:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

:deep(.prose p) {
  margin-bottom: 1em;
}

:deep(.prose p.lab-empty-line) {
  margin: 1em 0;
  min-height: 0.75rem;
}

:deep(.prose p.lab-empty-line span) {
  display: block;
  height: 0.75rem;
}

:deep(.prose code) {
  background-color: var(--color-muted);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

/* Table styles */
:deep(.prose table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

:deep(.prose th),
:deep(.prose td) {
  border: 1px solid #333333;
  padding: 0.5rem;
  text-align: left;
}

:deep(.prose th) {
  background-color: #e5e5e5;
  font-weight: 600;
}

.debug-info {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

/* IP Calculation Loading Animation */
.ip-calc-text {
  position: relative;
  display: inline-block;
  background: linear-gradient(
    90deg,
    var(--color-foreground) 0%,
    var(--color-foreground) 40%,
    var(--color-primary) 50%,
    var(--color-foreground) 60%,
    var(--color-foreground) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
}

@keyframes shine {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Shine effect overlay */
.shine-effect {
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shine 3s linear infinite;
}

/* Support for dark mode */
:global(.dark) .shine-effect {
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 200% 100%;
}
</style>
