<template>
  <div class="min-h-screen bg-background">
    <!-- Loading State -->
    <div v-if="isLoadingLab" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <Loader2 class="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
        <p class="text-muted-foreground">Loading lab data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md">
        <AlertCircle class="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h2 class="text-xl font-bold mb-2">Failed to Load Lab</h2>
        <p class="text-muted-foreground mb-4">{{ loadError }}</p>
        <Button @click="router.push(`/courses/${courseId}`)">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Course
        </Button>
      </div>
    </div>

    <!-- Main Content (only show when lab is loaded) -->
    <template v-else>
      <!-- Header -->
      <div class="border-b bg-background sticky top-0 z-40">
        <div class="w-full max-w-screen-2xl mx-auto px-6 py-4 lg:px-12">
          <!-- Breadcrumb Navigation -->
          <Breadcrumb class="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <NuxtLink to="/" class="flex items-center">
                  <Home class="h-4 w-4" />
                </NuxtLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight class="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <NuxtLink to="/courses" class="flex items-center">
                  Courses
                </NuxtLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight class="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <NuxtLink :to="`/courses/${courseId}`" class="flex items-center">
                  {{ courseTitle }}
                </NuxtLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight class="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <NuxtLink :to="`/courses/${courseId}/labs/${labId}`" class="flex items-center">
                  {{ originalLabData?.title || 'Lab' }}
                </NuxtLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight class="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Edit Lab</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <!-- Header Title -->
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold">Edit Lab</h1>
              <p class="text-muted-foreground mt-1">Modify lab configuration, network topology, tasks, and grading</p>
            </div>
            <div class="flex items-center gap-4">
              <!-- Playground Button -->
              <Button v-if="validation.step4.isValid" variant="outline" @click="openPlayground" class="gap-2">
                <Play class="w-4 h-4" />
                Playground
              </Button>
              <div class="text-sm text-muted-foreground">
                Course: <span class="font-medium">{{ courseTitle }}</span>
              </div>
            </div>
          </div>

          <!-- Progress Indicator -->
          <div class="mt-4 mb-2">
            <div class="flex flex-wrap items-center justify-center gap-3">
              <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
                <button type="button"
                  class="group flex items-center rounded-md px-2 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  :class="currentStep === index + 1 ? 'cursor-default' : 'cursor-pointer hover:bg-accent/40'"
                  :aria-current="currentStep === index + 1 ? 'step' : undefined" :aria-label="`Go to ${step.title}`"
                  @click="goToStep(index + 1)">
                  <div
                    class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 group-hover:border-primary group-hover:text-primary"
                    :class="{
                      'bg-primary text-primary-foreground border-primary': currentStep >= index + 1,
                      'border-muted-foreground text-muted-foreground bg-background': currentStep < index + 1,
                      'bg-green-500 border-green-500 text-white': currentStep > index + 1
                    }">
                    <Check v-if="currentStep > index + 1" class="w-4 h-4" />
                    <span v-else class="font-semibold text-xs">{{ index + 1 }}</span>
                  </div>
                  <div class="ml-2 min-w-0 text-left">
                    <div class="font-medium text-xs transition-colors duration-200" :class="{
                      'text-foreground': currentStep >= index + 1,
                      'text-muted-foreground': currentStep < index + 1,
                      'text-green-600': currentStep > index + 1
                    }">
                      {{ step.title }}
                    </div>
                  </div>
                </button>
                <ChevronRight v-if="index < steps.length - 1" class="w-4 h-4 mx-3 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="w-full max-w-screen-2xl mx-auto px-6 py-6 lg:px-12">
        <Card class="min-h-[600px]">
          <CardContent class="p-0">
            <!-- Step Content -->
            <div class="p-6">
              <!-- Step 1: Basic Lab Information -->
              <LabWizardStep1 v-if="currentStep === 1" v-model="wizardData.basicInfo" :course-context="courseContext"
                @validate="handleStepValidation(1, $event)" />

              <!-- Step 2: Network Configuration -->
              <LabWizardStep2 v-if="currentStep === 2" v-model="wizardData.networkConfig" :validation="validation.step2"
                @validate="handleStepValidation(2, $event)" />

              <!-- Step 3: Device Configuration -->
              <LabWizardStep3 v-if="currentStep === 3" v-model="wizardData.devices"
                :network-config="wizardData.networkConfig" :validation="validation.step3"
                @validate="handleStepValidation(3, $event)" />

              <!-- Step 4: Parts & Tasks Management -->
              <LabWizardStep4 v-if="currentStep === 4" v-model="wizardData.parts" :devices="wizardData.devices"
                :vlans="wizardData.networkConfig.vlans" :validation="validation.step4"
                @validate="handleStepValidation(4, $event)" />

              <!-- Step 5: Schedule & Publishing -->
              <LabWizardStep5 v-if="currentStep === 5" v-model="wizardData.schedule" :validation="validation.step5"
                @validate="handleStepValidation(5, $event)" />

              <!-- Step 6: Review & Update -->
              <LabWizardStep6 v-if="currentStep === 6" :wizard-data="wizardData" :course-context="courseContext"
                :is-submitting="isSubmitting" :is-edit-mode="true" @create-lab="handleUpdateLab" />
            </div>
          </CardContent>
        </Card>

        <!-- Navigation Footer -->
        <div class="flex items-center justify-between mt-6 pt-4 border-t bg-background sticky bottom-0 z-30">
          <div>
            <Button v-if="currentStep > 1" variant="outline" size="lg" :disabled="isSubmitting" @click="previousStep">
              <ChevronLeft class="w-4 h-4 mr-2" />
              Previous
            </Button>
          </div>

          <div class="flex items-center space-x-3">
            <!-- Save Draft Button -->
            <Button variant="ghost" size="lg" :disabled="isSubmitting" @click="saveDraft">
              <Save class="w-4 h-4 mr-2" />
              Save Draft
            </Button>

            <!-- Next/Update Button -->
            <Button v-if="currentStep < steps.length" size="lg" :disabled="isSubmitting || !canProceedToNextStep"
              @click="nextStep">
              Next
              <ChevronRight class="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" class="shadow-sm" :disabled="isSubmitting || !canUpdateLab" @click="handleUpdateLab">
              <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
              <Save v-else class="w-4 h-4 mr-2" />
              Update Lab
            </Button>
          </div>
        </div>
      </div>

      <!-- Global Error/Success Messages -->
      <div v-if="globalMessage.show" class="fixed bottom-4 right-4 max-w-md z-50">
        <Alert :variant="globalMessage.type === 'error' ? 'destructive' : 'default'" class="shadow-lg border-2">
          <AlertCircle v-if="globalMessage.type === 'error'" class="h-4 w-4" />
          <CheckCircle2 v-else class="h-4 w-4" />
          <AlertTitle>
            {{ globalMessage.type === 'error' ? 'Error' : 'Success' }}
          </AlertTitle>
          <AlertDescription>
            {{ globalMessage.message }}
          </AlertDescription>
        </Alert>
      </div>

      <AlertDialog v-model:open="saveConfirmation.open">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{
                saveConfirmation.summary?.hasDestructiveChanges
                  ? 'Confirm Potentially Destructive Changes'
                  : 'Review Changes Before Saving'
              }}
            </AlertDialogTitle>
            <AlertDialogDescription>{{ saveConfirmation.summary?.hasDestructiveChanges ? 'Some of these changes affect parts that already have student submissions.Proceed only if you are sure.' : 'Here is a quick summary of the updates you are about to apply.' }}</AlertDialogDescription>
          </AlertDialogHeader>

          <div class="space-y-4 text-sm">
            <div v-if="saveConfirmation.summary?.hasDestructiveChanges"
              class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              Deleting a part permanently removes all related student submissions (cascade delete). Editing a submitted
              part may invalidate existing grades.
            </div>

            <div v-if="saveConfirmation.summary?.deletedParts.length">
              <h4 class="font-medium text-destructive flex items-center gap-2">
                <Trash2 class="h-4 w-4" />
                Parts to be deleted
              </h4>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li v-for="part in saveConfirmation.summary?.deletedParts" :key="`deleted-${part.partId}`">
                  {{ part.title }}
                </li>
              </ul>
            </div>

            <div v-if="saveConfirmation.summary?.modifiedParts.length">
              <h4 class="font-medium flex items-center gap-2">
                <Edit class="h-4 w-4" />
                Parts to be updated
              </h4>
              <ul class="mt-2 space-y-2 pl-0">
                <li v-for="part in saveConfirmation.summary?.modifiedParts" :key="`modified-${part.partId}`"
                  class="rounded-md border border-border/60 p-3"
                  :class="part.hasSubmissions ? 'border-amber-400 bg-amber-50/50' : ''">
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{{ part.title }}</span>
                    <span v-if="part.hasSubmissions"
                      class="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      student submissions
                    </span>
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    Changes: {{ part.changes.join(', ') }}
                  </div>
                </li>
              </ul>
            </div>

            <div v-if="saveConfirmation.summary?.createdParts.length">
              <h4 class="font-medium flex items-center gap-2">
                <Plus class="h-4 w-4" />
                New parts
              </h4>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li v-for="part in saveConfirmation.summary?.createdParts"
                  :key="`created-${part.partId || part.title}`">
                  {{ part.title }}
                </li>
              </ul>
            </div>

            <div v-if="saveConfirmation.summary?.basicInfoChanges.length">
              <h4 class="font-medium">Lab information</h4>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li v-for="item in saveConfirmation.summary?.basicInfoChanges" :key="`info-${item}`">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div v-if="saveConfirmation.summary?.networkChanges.length">
              <h4 class="font-medium">Network configuration</h4>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li v-for="item in saveConfirmation.summary?.networkChanges" :key="`network-${item}`">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div v-if="saveConfirmation.summary?.scheduleChanges.length">
              <h4 class="font-medium">Schedule</h4>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li v-for="item in saveConfirmation.summary?.scheduleChanges" :key="`schedule-${item}`">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div v-if="
              saveConfirmation.summary &&
              !saveConfirmation.summary.deletedParts.length &&
              !saveConfirmation.summary.modifiedParts.length &&
              !saveConfirmation.summary.createdParts.length &&
              !saveConfirmation.summary.basicInfoChanges.length &&
              !saveConfirmation.summary.networkChanges.length &&
              !saveConfirmation.summary.scheduleChanges.length
            " class="rounded-md border border-border/60 bg-muted/30 p-3 text-muted-foreground">
              No significant changes detected. Saving will keep your lab unchanged.
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel :disabled="isSubmitting">Cancel</AlertDialogCancel>
            <AlertDialogAction :disabled="isSubmitting" @click="confirmSaveChanges">
              <span class="inline-flex items-center">
                <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
                {{
                  saveConfirmation.summary?.hasDestructiveChanges
                    ? 'Proceed with changes'
                    : 'Save changes'
                }}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- Playground Modals -->
      <PlaygroundSetupModal v-model:open="showPlaygroundSetup" :lab-id="labId" @complete="handlePlaygroundSetupComplete"
        @reset="handlePlaygroundReset" />

      <PlaygroundTestingModal v-model:open="showPlaygroundTesting" :lab-id="labId" :parts="wizardData.parts"
        :gns3-config="playgroundConfig?.gns3Config || null" :device-mappings="playgroundConfig?.deviceMappings || []"
        :custom-ip-mappings="playgroundConfig?.customIpMappings || {}"
        :custom-vlan-mappings="playgroundConfig?.customVlanMappings || {}" @reconfigure="handlePlaygroundReconfigure" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, nextTick, watch, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  Check,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  Edit,
  Plus,
  Play
} from 'lucide-vue-next'

// UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

// Wizard Step Components
import LabWizardStep1 from '@/components/wizard/LabWizardStep1.vue'
import LabWizardStep2 from '@/components/wizard/LabWizardStep2.vue'
import LabWizardStep3 from '@/components/wizard/LabWizardStep3.vue'
import LabWizardStep4 from '@/components/wizard/LabWizardStep4.vue'
import LabWizardStep5 from '@/components/wizard/LabWizardStep5.vue'
import LabWizardStep6 from '@/components/wizard/LabWizardStep6.vue'

// Playground Components
import PlaygroundSetupModal from '@/components/playground/PlaygroundSetupModal.vue'
import PlaygroundTestingModal from '@/components/playground/PlaygroundTestingModal.vue'
import type { GNS3Config, DeviceMapping } from '@/composables/usePlayground'

// Types
import type {
  LabWizardData,
  CourseContext,
  StepValidation,
  ValidationResult,
  WizardStep
} from '@/types/wizard'
import type { PartSubmissionSummary } from '@/types/submission'

interface ChangePartSummary {
  partId?: string
  title: string
}

interface ChangeSummary {
  deletedParts: ChangePartSummary[]
  createdParts: ChangePartSummary[]
  modifiedParts: Array<ChangePartSummary & {
    hasSubmissions: boolean
    changes: string[]
  }>
  basicInfoChanges: string[]
  networkChanges: string[]
  scheduleChanges: string[]
  hasDestructiveChanges: boolean
}

// Page setup
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const backendURL = config.public.backendurl
const INSTRUCTIONS_PART_ID = '__instructions_ack__'
const courseId = route.params.c_id as string
const labId = route.params.l_id as string

// Loading and error states
const isLoadingLab = ref(true)
const loadError = ref('')

// Original lab data (for tracking changes)
const originalLabData = ref<any>(null)
const originalPartsData = ref<any[]>([])

// Course data
const { currentCourse, fetchCourse } = useCourse()
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId}`)

// Course context for components
const courseContext = computed<CourseContext>(() => ({
  courseId,
  courseName: currentCourse.value?.title || '',
  courseCode: currentCourse.value?.code || courseId,
  instructorId: currentCourse.value?.instructorId || ''
}))

// Wizard state
const currentStep = ref(1)
const isSubmitting = ref(false)

// Steps configuration
const steps: WizardStep[] = [
  {
    id: 1,
    title: 'Basic Information',
    description: 'Lab details and instructions',
    isComplete: false,
    isAccessible: true
  },
  {
    id: 2,
    title: 'Network Configuration',
    description: 'Base network topology',
    isComplete: false,
    isAccessible: false
  },
  {
    id: 3,
    title: 'Device Configuration',
    description: 'Network devices setup',
    isComplete: false,
    isAccessible: false
  },
  {
    id: 4,
    title: 'Parts & Tasks',
    description: 'Lab structure and grading',
    isComplete: false,
    isAccessible: false
  },
  {
    id: 5,
    title: 'Schedule & Publishing',
    description: 'Availability and deadlines',
    isComplete: false,
    isAccessible: false
  },
  {
    id: 6,
    title: 'Review & Update',
    description: 'Final review and update',
    isComplete: false,
    isAccessible: false
  }
]

// Wizard data
const wizardData = reactive<LabWizardData>({
  basicInfo: {
    name: '',
    description: '',
    instructions: {
      html: '',
      json: { type: 'doc', content: [] }
    }
  },
  networkConfig: {
    baseNetwork: '192.168.1.0',
    subnetMask: 24,
    allocationStrategy: 'group_based' as 'student_id_based' | 'group_based',
    exemptIpRanges: []
  },
  devices: [],
  parts: [],
  schedule: {
    availableFrom: undefined,
    availableUntil: undefined,
    dueDate: undefined
  },
  courseId,
  courseName: courseTitle.value,
  courseCode: courseId
})

// Validation state
const validation = ref<StepValidation>({
  step1: { isValid: false, errors: [] },
  step2: { isValid: false, errors: [] },
  step3: { isValid: false, errors: [] },
  step4: { isValid: false, errors: [] },
  step5: { isValid: true, errors: [] }, // Step 5 is optional
  step6: { isValid: false, errors: [] }
})

// Global message state
const globalMessage = reactive({
  show: false,
  type: 'success' as 'success' | 'error',
  message: ''
})

const partSubmissionSummary = ref<Record<string, PartSubmissionSummary>>({})
const saveConfirmation = reactive({
  open: false,
  summary: null as ChangeSummary | null
})

// Playground state
const showPlaygroundSetup = ref(false)
const showPlaygroundTesting = ref(false)
const playgroundConfig = ref<{
  gns3Config: GNS3Config
  deviceMappings: DeviceMapping[]
  customIpMappings: Record<string, string>
  customVlanMappings: Record<string, number>
} | null>(null)

// Playground functions
function openPlayground() {
  if (playgroundConfig.value) {
    // If already configured, go directly to testing modal
    showPlaygroundTesting.value = true
  } else {
    // Otherwise, show setup modal first
    showPlaygroundSetup.value = true
  }
}

function handlePlaygroundSetupComplete(config: typeof playgroundConfig.value) {
  playgroundConfig.value = config
  showPlaygroundSetup.value = false
  // Open testing modal after setup is complete
  showPlaygroundTesting.value = true
}

function handlePlaygroundReset() {
  playgroundConfig.value = null
}

function handlePlaygroundReconfigure() {
  showPlaygroundTesting.value = false
  showPlaygroundSetup.value = true
}

// Computed properties
const canProceedToNextStep = computed(() => {
  return validation.value[`step${currentStep.value}` as keyof StepValidation]?.isValid || false
})

const canUpdateLab = computed(() => {
  return validation.value.step1.isValid &&
    validation.value.step2.isValid &&
    validation.value.step3.isValid &&
    validation.value.step4.isValid &&
    validation.value.step5.isValid
})

// Helper function to convert string boolean values to actual booleans
const convertStringToBoolean = (value: any): any => {
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim()
    if (lowerValue === 'true') return true
    if (lowerValue === 'false') return false
  }
  return value
}

// Helper function to check if a value is an IP address
// Helper function to format parameter values for backend submission
const formatParameterValue = (value: any): any => {
  if (typeof value !== 'string') return value
  return value.trim()
}

const normalizeRichText = (value: any) => {
  if (!value) {
    return {
      html: '',
      json: { type: 'doc', content: [] }
    }
  }

  if (typeof value === 'string') {
    return {
      html: value,
      json: { type: 'doc', content: [] }
    }
  }

  if (typeof value === 'object') {
    const html = typeof value.html === 'string'
      ? value.html
      : (typeof value.instructions === 'string' ? value.instructions : '')
    const json = value.json ?? { type: 'doc', content: [] }
    return {
      html,
      json
    }
  }

  return {
    html: '',
    json: { type: 'doc', content: [] }
  }
}

const extractInstructionsHtml = (value: any): string => normalizeRichText(value).html

const fetchPartSubmissionSummary = async () => {
  try {
    const response = await $fetch<{
      status: string
      data?: PartSubmissionSummary[]
      message?: string
    }>(`${backendURL}/v0/submissions/lab/${labId}/part-summary`, {
      method: 'GET',
      credentials: 'include'
    })

    if (response.status === 'success' && Array.isArray(response.data)) {
      const summaryMap: Record<string, PartSubmissionSummary> = {}
      for (const item of response.data) {
        if (item?.partId) {
          summaryMap[item.partId] = {
            ...item,
            lastSubmittedAt: item.lastSubmittedAt
          }
        }
      }
      partSubmissionSummary.value = summaryMap
    } else {
      throw new Error(response.message || 'Failed to fetch part submission summary')
    }
  } catch (error) {
    console.error('Failed to fetch part submission summary:', error)
    partSubmissionSummary.value = {}
  }
}

const applySubmissionSummaryToParts = () => {
  wizardData.parts.forEach((part) => {
    const originalPart = part._id
      ? originalPartsData.value.find((existing: any) => existing._id === part._id)
      : null
    const summaryKey = originalPart?.partId || part.partId
    const summary = summaryKey ? partSubmissionSummary.value[summaryKey] : undefined
    if (summary && summary.submissionCount > 0) {
      part.hasSubmissions = true
      part.submissionSummary = summary
    } else {
      part.hasSubmissions = false
      part.submissionSummary = undefined
    }
  })
}

watch(partSubmissionSummary, () => {
  applySubmissionSummaryToParts()
})

watch(
  () => saveConfirmation.open,
  (isOpen) => {
    if (!isOpen && !isSubmitting.value) {
      saveConfirmation.summary = null
    }
  }
)

const sortObjectKeys = (obj: Record<string, any> = {}) => {
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, any>>((acc, key) => {
      const value = obj[key]
      acc[key] = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? sortObjectKeys(value)
        : value
      return acc
    }, {})
}

const normalizeTasks = (tasks: any[] = []) => {
  return [...tasks]
    .map((task) => ({
      taskId: task.taskId || '',
      name: task.name || '',
      description: task.description || '',
      templateId: task.templateId || '',
      executionDevice: task.executionDevice || '',
      targetDevices: Array.isArray(task.targetDevices) ? [...task.targetDevices].sort() : [],
      parameters: sortObjectKeys(task.parameters || {}),
      testCases: Array.isArray(task.testCases) ? task.testCases.map((testCase: any) => ({
        comparison_type: testCase.comparison_type,
        expected_result: convertStringToBoolean(testCase.expected_result)
      })) : [],
      order: typeof task.order === 'number' ? task.order : 0,
      points: typeof task.points === 'number' ? task.points : 0,
      groupId: task.groupId || task.group_id || ''
    }))
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      return a.taskId.localeCompare(b.taskId)
    })
}

const normalizeTaskGroups = (groups: any[] = []) => {
  return [...groups]
    .map((group) => ({
      group_id: group.group_id,
      title: group.title,
      description: group.description,
      group_type: group.group_type,
      points: group.points,
      continue_on_failure: group.continue_on_failure,
      timeout_seconds: group.timeout_seconds
    }))
    .sort((a, b) => a.group_id.localeCompare(b.group_id))
}

const normalizeQuestions = (questions: any[] = []) => {
  return [...questions]
    .map((question) => ({
      ...question,
      schemaMapping: question.schemaMapping ? { ...question.schemaMapping } : undefined
    }))
    .sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order
      }
      return (a.questionId || '').localeCompare(b.questionId || '')
    })
}

const normalizeInstructions = (value: any) => {
  const { html } = normalizeRichText(value)
  return html.trim()
}

const detectPartChanges = (originalPart: any, updatedPart: any): string[] => {
  if (!originalPart || !updatedPart) return []

  const changes: string[] = []

  if ((originalPart.title || '') !== (updatedPart.title || '')) {
    changes.push('Title')
  }

  if ((originalPart.partType || 'network_config') !== (updatedPart.partType || 'network_config')) {
    changes.push('Part type')
  }

  if ((originalPart.description || '') !== (updatedPart.description || '')) {
    changes.push('Description')
  }

  if (normalizeInstructions(originalPart.instructions) !== normalizeInstructions(updatedPart.instructions)) {
    changes.push('Instructions')
  }

  const originalTasks = normalizeTasks(originalPart.tasks || [])
  const updatedTasks = normalizeTasks(updatedPart.tasks || [])
  if (JSON.stringify(originalTasks) !== JSON.stringify(updatedTasks)) {
    changes.push('Tasks')
  }

  const originalGroups = normalizeTaskGroups(originalPart.task_groups || [])
  const updatedGroups = normalizeTaskGroups(updatedPart.task_groups || [])
  if (JSON.stringify(originalGroups) !== JSON.stringify(updatedGroups)) {
    changes.push('Task groups')
  }

  const originalQuestions = normalizeQuestions(originalPart.questions || [])
  const updatedQuestions = normalizeQuestions(updatedPart.questions || [])
  if (JSON.stringify(originalQuestions) !== JSON.stringify(updatedQuestions)) {
    changes.push('Questions')
  }

  const originalPrereqs = Array.isArray(originalPart.prerequisites) ? [...originalPart.prerequisites].sort() : []
  const updatedPrereqs = Array.isArray(updatedPart.prerequisites) ? [...updatedPart.prerequisites].sort() : []
  if (JSON.stringify(originalPrereqs) !== JSON.stringify(updatedPrereqs)) {
    changes.push('Prerequisites')
  }

  return changes
}

const collectBasicInfoChanges = (): string[] => {
  const changes: string[] = []
  const originalTitle = (originalLabData.value?.title || '').trim()
  const originalDescription = (originalLabData.value?.description || '').trim()
  const originalInstructions = normalizeInstructions(originalLabData.value?.instructions)
  const currentTitle = (wizardData.basicInfo.name || '').trim()
  const currentDescription = (wizardData.basicInfo.description || '').trim()
  const currentInstructions = normalizeInstructions(wizardData.basicInfo.instructions)

  if (currentTitle !== originalTitle) {
    changes.push('Lab title updated')
  }

  if (currentDescription !== originalDescription) {
    changes.push('Lab description updated')
  }

  if (currentInstructions !== originalInstructions) {
    changes.push('Student instructions updated')
  }

  return changes
}

const normalizeExemptRanges = (ranges: any[] = []) => {
  return ranges
    .map((range) => {
      const start = range.start || ''
      const end = range.end || ''
      return end ? `${start}-${end}` : start
    })
    .sort()
}

const toNumberOrUndefined = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

// Helper function to safely convert values to numbers (handles empty strings from v-model.number)
const toSafeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const normalizeVlanEntry = (vlan: any = {}) => {
  const normalized: Record<string, any> = {}
  const vlanId = toNumberOrUndefined(vlan.vlanId)
  if (vlanId !== undefined) normalized.vlanId = vlanId
  if (typeof vlan.baseNetwork === 'string' && vlan.baseNetwork.trim()) {
    normalized.baseNetwork = vlan.baseNetwork.trim()
  }
  const subnetMask = toNumberOrUndefined(vlan.subnetMask)
  if (subnetMask !== undefined) normalized.subnetMask = subnetMask
  const subnetIndex = toNumberOrUndefined(vlan.subnetIndex)
  if (subnetIndex !== undefined) normalized.subnetIndex = subnetIndex
  const groupModifier = toNumberOrUndefined(vlan.groupModifier)
  if (groupModifier !== undefined) normalized.groupModifier = groupModifier
  const calculationMultiplier = toNumberOrUndefined(vlan.calculationMultiplier)
  if (calculationMultiplier !== undefined) normalized.calculationMultiplier = calculationMultiplier
  if (typeof vlan.isStudentGenerated === 'boolean') {
    normalized.isStudentGenerated = vlan.isStudentGenerated
  } else if (vlan.isStudentGenerated !== undefined) {
    normalized.isStudentGenerated = Boolean(vlan.isStudentGenerated)
  }
  // IPv6 Configuration
  if (typeof vlan.ipv6Enabled === 'boolean') {
    normalized.ipv6Enabled = vlan.ipv6Enabled
  } else if (vlan.ipv6Enabled !== undefined) {
    normalized.ipv6Enabled = Boolean(vlan.ipv6Enabled)
  }
  if (typeof vlan.ipv6VlanAlphabet === 'string' && vlan.ipv6VlanAlphabet.trim()) {
    normalized.ipv6VlanAlphabet = vlan.ipv6VlanAlphabet.trim()
  }
  return normalized
}

const normalizeVlanConfiguration = (config: any) => {
  if (!config || typeof config !== 'object') {
    return {
      mode: '',
      vlanCount: 0,
      vlans: []
    }
  }

  const normalizedVlans = Array.isArray(config.vlans)
    ? config.vlans
      .map((vlan: any) => normalizeVlanEntry(vlan))
      .sort((a, b) => {
        if (a.vlanId !== undefined && b.vlanId !== undefined && a.vlanId !== b.vlanId) {
          return a.vlanId - b.vlanId
        }
        if (a.subnetIndex !== undefined && b.subnetIndex !== undefined && a.subnetIndex !== b.subnetIndex) {
          return a.subnetIndex - b.subnetIndex
        }
        return (a.baseNetwork || '').localeCompare(b.baseNetwork || '')
      })
    : []

  const normalizedMode = typeof config.mode === 'string' ? config.mode.trim() : config.mode || ''
  const normalizedCount = toNumberOrUndefined(config.vlanCount)

  return {
    mode: normalizedMode,
    vlanCount: normalizedCount ?? normalizedVlans.length,
    vlans: normalizedVlans
  }
}

const collectNetworkChanges = (): string[] => {
  const changes: string[] = []
  const originalTopology = originalLabData.value?.network?.topology
  const originalVlanConfig = originalLabData.value?.network?.vlanConfiguration

  if (!originalTopology && !originalVlanConfig) {
    if (wizardData.networkConfig.managementNetwork || wizardData.networkConfig.vlans.length > 0) {
      changes.push('Network configuration initialized')
    }
    return changes
  }

  if (originalTopology) {
    if ((wizardData.networkConfig.managementNetwork || '') !== (originalTopology.baseNetwork || '')) {
      changes.push('Management network updated')
    }

    if ((wizardData.networkConfig.managementSubnetMask || 0) !== (originalTopology.subnetMask || 0)) {
      changes.push('Subnet mask updated')
    }

    if ((wizardData.networkConfig.allocationStrategy || 'group_based') !== (originalTopology.allocationStrategy || 'group_based')) {
      changes.push('Allocation strategy updated')
    }

    const newExempt = normalizeExemptRanges(wizardData.networkConfig.exemptIpRanges || [])
    const oldExempt = normalizeExemptRanges(originalTopology.exemptIpRanges || [])
    if (JSON.stringify(newExempt) !== JSON.stringify(oldExempt)) {
      changes.push('Exempt IP ranges updated')
    }
  }

  const currentVlanConfig = normalizeVlanConfiguration({
    mode: wizardData.networkConfig.mode,
    vlanCount: wizardData.networkConfig.vlanCount,
    vlans: wizardData.networkConfig.vlans
  })
  const previousVlanConfig = normalizeVlanConfiguration(originalVlanConfig)

  if (JSON.stringify(currentVlanConfig) !== JSON.stringify(previousVlanConfig)) {
    changes.push('VLAN configuration updated')
  }

  return changes
}

const datesEqual = (a?: Date, b?: Date) => {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.getTime() === b.getTime()
}

const collectScheduleChanges = (): string[] => {
  const changes: string[] = []
  const originalAvailableFrom = originalLabData.value?.availableFrom ? new Date(originalLabData.value.availableFrom) : undefined
  const originalAvailableUntil = originalLabData.value?.availableUntil ? new Date(originalLabData.value.availableUntil) : undefined
  const originalDueDate = originalLabData.value?.dueDate ? new Date(originalLabData.value.dueDate) : undefined

  if (!datesEqual(wizardData.schedule.availableFrom, originalAvailableFrom)) {
    changes.push(originalAvailableFrom ? 'Availability start updated' : 'Availability start set')
  }

  if (!datesEqual(wizardData.schedule.availableUntil, originalAvailableUntil)) {
    changes.push(originalAvailableUntil ? 'Availability end updated' : 'Availability end set')
  }

  if (!datesEqual(wizardData.schedule.dueDate, originalDueDate)) {
    changes.push(originalDueDate ? 'Due date updated' : 'Due date set')
  }

  return changes
}

const buildChangeSummary = (): ChangeSummary => {
  const originalPartsById = new Map(
    originalPartsData.value
      .filter((part: any) => Boolean(part?._id))
      .map((part: any) => [part._id, part])
  )
  const originalPartsByPartId = new Map(
    originalPartsData.value
      .filter((part: any) => Boolean(part?.partId))
      .map((part: any) => [part.partId, part])
  )

  const findOriginalPart = (part: any) => {
    if (!part) return null
    if (part._id && originalPartsById.has(part._id)) {
      return originalPartsById.get(part._id)
    }
    if (part.partId && originalPartsByPartId.has(part.partId)) {
      return originalPartsByPartId.get(part.partId)
    }
    return null
  }

  const deletedParts: ChangePartSummary[] = originalPartsData.value
    .filter((part: any) => {
      const matchesById = part._id ? wizardData.parts.some((updated) => updated._id === part._id) : false
      const matchesByPartId = part.partId ? wizardData.parts.some((updated) => updated.partId === part.partId) : false
      return !matchesById && !matchesByPartId
    })
    .map((part: any) => ({
      partId: part.partId,
      title: part.title || part.partId || 'Untitled Part'
    }))

  const createdParts: ChangePartSummary[] = wizardData.parts
    .filter((part) => !findOriginalPart(part))
    .map((part) => ({
      partId: part.partId,
      title: part.title || part.partId || 'Untitled Part'
    }))

  const modifiedParts = wizardData.parts
    .map((part) => {
      const original = findOriginalPart(part)
      if (!original) return null
      const changes = detectPartChanges(original, part)
      if (changes.length === 0) return null
      const submissionSourcePartId = part.partId || original.partId
      const submissionSummary = submissionSourcePartId ? partSubmissionSummary.value[submissionSourcePartId] : undefined
      const hasSubmissions = Boolean(
        part.hasSubmissions ??
        (submissionSummary && submissionSummary.submissionCount > 0)
      )

      return {
        partId: submissionSourcePartId,
        title: part.title || original.title || submissionSourcePartId || 'Untitled Part',
        hasSubmissions,
        changes
      }
    })
    .filter(Boolean) as Array<ChangePartSummary & { hasSubmissions: boolean; changes: string[] }>

  const basicInfoChanges = collectBasicInfoChanges()
  const networkChanges = collectNetworkChanges()
  const scheduleChanges = collectScheduleChanges()

  const hasDestructiveChanges = deletedParts.length > 0 ||
    modifiedParts.some((part) => part.hasSubmissions)

  return {
    deletedParts,
    createdParts,
    modifiedParts,
    basicInfoChanges,
    networkChanges,
    scheduleChanges,
    hasDestructiveChanges
  }
}

const sanitizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const prepareRichTextForApi = (value: any) => {
  const normalized = normalizeRichText(value)
  return {
    html: (normalized.html || '').trim(),
    json: JSON.parse(JSON.stringify(normalized.json ?? { type: 'doc', content: [] }))
  }
}

const toOptionalDate = (value?: Date | string | null) => {
  if (!value) return undefined
  const dateValue = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dateValue.getTime())) return undefined
  return dateValue
}

const prepareExemptRangesForApi = (ranges: any[] = []) => {
  return ranges
    .map((range) => {
      const start = typeof range.start === 'string' ? range.start.trim() : ''
      const end = typeof range.end === 'string' ? range.end.trim() : ''
      if (!start) return null
      return end ? { start, end } : { start }
    })
    .filter(Boolean)
}

const prepareVlanForApi = (vlan: any) => {
  const formatted: Record<string, any> = {}
  const id = vlan?.id || vlan?._id
  if (id) {
    formatted.id = id
  }

  const vlanId = toNumberOrUndefined(vlan?.vlanId)
  if (vlanId !== undefined) {
    formatted.vlanId = vlanId
  }

  if (typeof vlan?.baseNetwork === 'string' && vlan.baseNetwork.trim()) {
    formatted.baseNetwork = vlan.baseNetwork.trim()
  }

  const subnetMask = toNumberOrUndefined(vlan?.subnetMask)
  if (subnetMask !== undefined) {
    formatted.subnetMask = subnetMask
  }

  const subnetIndex = toNumberOrUndefined(vlan?.subnetIndex)
  if (subnetIndex !== undefined) {
    formatted.subnetIndex = subnetIndex
  }

  const groupModifier = toNumberOrUndefined(vlan?.groupModifier)
  if (groupModifier !== undefined) {
    formatted.groupModifier = groupModifier
  }

  const calculationMultiplier = toNumberOrUndefined(vlan?.calculationMultiplier)
  if (calculationMultiplier !== undefined) {
    formatted.calculationMultiplier = calculationMultiplier
  }

  if (typeof vlan?.isStudentGenerated === 'boolean') {
    formatted.isStudentGenerated = vlan.isStudentGenerated
  } else if (vlan?.isStudentGenerated !== undefined) {
    formatted.isStudentGenerated = Boolean(vlan.isStudentGenerated)
  }

  // IPv6 Configuration
  if (typeof vlan?.ipv6Enabled === 'boolean') {
    formatted.ipv6Enabled = vlan.ipv6Enabled
  } else if (vlan?.ipv6Enabled !== undefined) {
    formatted.ipv6Enabled = Boolean(vlan.ipv6Enabled)
  }
  if (typeof vlan?.ipv6VlanAlphabet === 'string' && vlan.ipv6VlanAlphabet.trim()) {
    formatted.ipv6VlanAlphabet = vlan.ipv6VlanAlphabet.trim()
  }

  return formatted
}

const prepareDeviceForApi = (device: any) => {
  return {
    deviceId: device.deviceId,
    templateId: device.templateId,
    displayName: (device.displayName || device.deviceId || '').trim(),
    ipVariables: (device.ipVariables || []).map((ipVar: any) => {
      const baseVar: Record<string, any> = {
        name: ipVar.name,
        interface: ipVar.interface || '',
        isManagementInterface: Boolean(ipVar.isManagementInterface),
        isVlanInterface: Boolean(ipVar.inputType?.startsWith('studentVlan') || ipVar.isVlanInterface),
        inputType: ipVar.inputType,
        vlanIndex: typeof ipVar.vlanIndex === 'number' ? ipVar.vlanIndex : toNumberOrUndefined(ipVar.vlanIndex),
        interfaceOffset: toNumberOrUndefined(ipVar.interfaceOffset)
      }

      if (ipVar.inputType === 'fullIP' && ipVar.fullIP) {
        return {
          ...baseVar,
          fullIp: ipVar.fullIP
        }
      }

      if (ipVar.inputType === 'hostOffset') {
        const hostOffset = toNumberOrUndefined(ipVar.hostOffset)
        return {
          ...baseVar,
          hostOffset: hostOffset ?? ipVar.hostOffset
        }
      }

      if (ipVar.inputType === 'studentManagement') {
        return baseVar
      }

      if (ipVar.inputType?.startsWith('studentVlan')) {
        return baseVar
      }

      return baseVar
    }),
    credentials: device.credentials || {
      usernameTemplate: device.connectionParams?.username || '',
      passwordTemplate: device.connectionParams?.password || '',
      enablePassword: device.credentials?.enablePassword || ''
    }
  }
}

// Load lab data from backend
const loadLabData = async () => {
  try {
    isLoadingLab.value = true
    loadError.value = ''

    // Fetch lab data
    const labResponse = await $fetch(`${backendURL}/v0/labs/${labId}`, {
      method: 'GET',
      credentials: 'include'
    })

    if (!labResponse.success) {
      throw new Error(labResponse.message || 'Failed to load lab')
    }

    originalLabData.value = labResponse.data

    // Fetch lab parts
    const partsResponse = await $fetch(`${backendURL}/v0/parts/lab/${labId}`, {
      method: 'GET',
      credentials: 'include'
    })

    let fetchedParts: any[] = []

    console.log('🌐 [DEBUG] Parts response structure:', {
      hasSuccess: 'success' in partsResponse,
      hasParts: 'parts' in partsResponse,
      success: (partsResponse as any).success,
      dataType: typeof (partsResponse as any).data,
      dataKeys: Object.keys((partsResponse as any).data || {}),
    })

    if ('success' in partsResponse) {
      if (!partsResponse.success) {
        throw new Error(partsResponse.message || 'Failed to load lab parts')
      }
      fetchedParts = Array.isArray(partsResponse.data?.parts)
        ? partsResponse.data.parts
        : Array.isArray(partsResponse.data)
          ? partsResponse.data
          : []
    } else if ('parts' in partsResponse) {
      fetchedParts = Array.isArray((partsResponse as any).parts) ? (partsResponse as any).parts : []
    } else {
      throw new Error('Failed to load lab parts')
    }

    console.log(`🌐 [DEBUG] Fetched ${fetchedParts.length} parts from backend`)
    if (fetchedParts.length > 0) {
      console.log('🌐 [DEBUG] First part raw data:', {
        keys: Object.keys(fetchedParts[0]),
        _id: fetchedParts[0]._id,
        id: fetchedParts[0].id,
        partId: fetchedParts[0].partId,
        title: fetchedParts[0].title
      })
    }

    const filteredParts = fetchedParts.filter((part: any) => {
      if (!part) return false
      if (part.partId === INSTRUCTIONS_PART_ID) return false
      if (part.partType === 'instructions_ack') return false
      return true
    })

    const deduplicatedParts: any[] = []
    const seenPartKeys = new Set<string>()

    for (const part of filteredParts) {
      // Backend returns 'id' not '_id', so check both
      const idValue = part._id?.toString() || part.id?.toString()
      const key = idValue || part.partId || `${part.title}-${part.order}`
      if (!seenPartKeys.has(key)) {
        seenPartKeys.add(key)
        deduplicatedParts.push(part)
      }
    }

    originalPartsData.value = deduplicatedParts

    // Debug: Log the structure of the first part's _id
    if (deduplicatedParts.length > 0) {
      const firstPart = deduplicatedParts[0]
      console.log('🔍 [DEBUG] Sample part _id structure:', {
        _id: firstPart._id,
        _idType: typeof firstPart._id,
        _idConstructorName: firstPart._id?.constructor?.name,
        _idToString: firstPart._id?.toString?.(),
        partId: firstPart.partId,
        title: firstPart.title,
        rawValue: toRaw(firstPart._id)
      })
    }

    await fetchPartSubmissionSummary()

    // Transform backend data to wizard format
    transformBackendDataToWizard()
    applySubmissionSummaryToParts()

    console.log('✅ Lab data loaded successfully')

    initializeValidationState()

  } catch (error: any) {
    console.error('Failed to load lab data:', error)
    loadError.value = error.message || 'An error occurred while loading the lab'
  } finally {
    isLoadingLab.value = false
  }
}

// Transform backend data to wizard format
const transformBackendDataToWizard = () => {
  const lab = originalLabData.value
  const parts = originalPartsData.value

  // Map basic info
  wizardData.basicInfo = {
    name: lab.title || '',
    description: lab.description || '',
    instructions: normalizeRichText(lab.instructions)
  }

  // Map network config
  if (lab.network?.topology) {
    wizardData.networkConfig = {
      managementNetwork: lab.network.topology.baseNetwork || '192.168.1.0',
      managementSubnetMask: lab.network.topology.subnetMask || 24,
      allocationStrategy: lab.network.topology.allocationStrategy || 'group_based',
      exemptIpRanges: lab.network.topology.exemptIpRanges || [],
      mode: lab.network.vlanConfiguration?.mode || 'fixed',
      vlanCount: lab.network.vlanConfiguration?.vlanCount || 1,
      vlans: lab.network.vlanConfiguration?.vlans || []
    }
  }

  // Map devices
  if (lab.network?.devices) {
    wizardData.devices = lab.network.devices.map((device: any) => ({
      deviceId: device.deviceId,
      templateId: device.templateId,
      displayName: device.displayName || device.deviceId,
      ipVariables: device.ipVariables?.map((ipVar: any) => ({
        name: ipVar.name,
        interface: ipVar.interface || '',
        isManagementInterface: ipVar.isManagementInterface || false,
        isVlanInterface: ipVar.isVlanInterface || false,
        inputType: ipVar.inputType,
        vlanIndex: ipVar.vlanIndex,
        interfaceOffset: ipVar.interfaceOffset,
        hostOffset: ipVar.hostOffset,
        fullIP: ipVar.fullIp
      })) || [],
      credentials: device.credentials || {
        usernameTemplate: '',
        passwordTemplate: '',
        enablePassword: ''
      },
      connectionParams: {
        username: device.credentials?.usernameTemplate || '',
        password: device.credentials?.passwordTemplate || ''
      }
    }))
  }

  // Map parts
  wizardData.parts = parts.map((part: any) => {
    const summary = partSubmissionSummary.value[part.partId]
    const hasSubmissions = Boolean(summary && summary.submissionCount > 0)

    // Intelligently infer partType if missing based on part content
    let inferredPartType = part.partType
    if (!inferredPartType) {
      if (part.questions && Array.isArray(part.questions) && part.questions.length > 0) {
        inferredPartType = 'fill_in_blank'
      } else {
        inferredPartType = 'network_config'
      }
    }

    return {
      _id: part._id, // Keep original ID for updates (might be undefined)
      id: part.id,   // Backend returns 'id' not '_id'
      partId: part.partId || '',
      title: part.title || '',
      description: part.description || '',
      instructions: extractInstructionsHtml(part.instructions),
      order: part.order,
      partType: inferredPartType,
      tasks: part.tasks?.map((task: any) => ({
        taskId: task.taskId,
        name: task.name,
        description: task.description || '',
        templateId: task.templateId,
        executionDevice: task.executionDevice,
        targetDevices: task.targetDevices || [],
        parameters: task.parameters || {},
        testCases: task.testCases || [],
        order: task.order,
        points: task.points,
        groupId: task.group_id
      })) || [],
      task_groups: part.task_groups || [],
      questions: part.questions || [],
      prerequisites: part.prerequisites || [],
      totalPoints: part.totalPoints,
      hasSubmissions,
      submissionSummary: summary
    }
  })

  // Map schedule
  wizardData.schedule = {
    availableFrom: lab.availableFrom ? new Date(lab.availableFrom) : undefined,
    availableUntil: lab.availableUntil ? new Date(lab.availableUntil) : undefined,
    dueDate: lab.dueDate ? new Date(lab.dueDate) : undefined
  }

  console.log('✅ Data transformed to wizard format')
}

const initializeValidationState = () => {
  validation.value.step1 = { isValid: true, errors: [] }
  validation.value.step2 = { isValid: true, errors: [] }
  validation.value.step3 = { isValid: true, errors: [] }
  validation.value.step4 = { isValid: true, errors: [] }
  validation.value.step5 = { isValid: true, errors: [] }
  validation.value.step6 = { isValid: true, errors: [] }
}

// Methods
const goToStep = (stepNumber: number) => {
  if (stepNumber < 1 || stepNumber > steps.length) {
    return
  }

  if (currentStep.value === stepNumber) {
    return
  }

  steps.forEach((step, index) => {
    if (index < stepNumber - 1) {
      step.isComplete = true
      step.isAccessible = true
    } else if (index === stepNumber - 1) {
      step.isAccessible = true
    }
  })

  currentStep.value = stepNumber
}

const nextStep = () => {
  if (canProceedToNextStep.value && currentStep.value < steps.length) {
    steps[currentStep.value - 1].isComplete = true
    currentStep.value++
    steps[currentStep.value - 1].isAccessible = true
  } else {
    showGlobalMessage('error', 'Please complete all required fields before proceeding')
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleStepValidation = (step: number, validationResult: ValidationResult) => {
  validation.value[`step${step}` as keyof StepValidation] = validationResult
}

const saveDraft = async () => {
  try {
    // Deep clone the reactive object to get plain data
    const rawData = JSON.parse(JSON.stringify(wizardData))
    
    // Convert Date objects to ISO strings for schedule
    const draftData = {
      ...rawData,
      schedule: {
        availableFrom: wizardData.schedule.availableFrom?.toISOString?.() || wizardData.schedule.availableFrom || null,
        availableUntil: wizardData.schedule.availableUntil?.toISOString?.() || wizardData.schedule.availableUntil || null,
        dueDate: wizardData.schedule.dueDate?.toISOString?.() || wizardData.schedule.dueDate || null
      },
      currentStep: currentStep.value,
      lastSaved: new Date().toISOString()
    }
    
    const draftKey = `lab-edit-draft-${labId}`
    console.log(`💾 Saving edit draft with key: ${draftKey}`, draftData)
    localStorage.setItem(draftKey, JSON.stringify(draftData))

    showGlobalMessage('success', 'Draft saved successfully')
  } catch (error) {
    console.error('Failed to save draft:', error)
    showGlobalMessage('error', 'Failed to save draft')
  }
}

const loadDraft = () => {
  try {
    const draftKey = `lab-edit-draft-${labId}`
    const draftData = localStorage.getItem(draftKey)
    if (draftData) {
      const parsed = JSON.parse(draftData)
      console.log(`📂 Loading edit draft with key: ${draftKey}`, parsed)
      
      // Restore basic info
      if (parsed.basicInfo) {
        wizardData.basicInfo.name = parsed.basicInfo.name || ''
        wizardData.basicInfo.description = parsed.basicInfo.description || ''
        wizardData.basicInfo.instructions = normalizeRichText(parsed.basicInfo.instructions)
      }
      
      // Restore network config
      if (parsed.networkConfig) {
        Object.assign(wizardData.networkConfig, parsed.networkConfig)
      }
      
      // Restore devices
      if (parsed.devices) {
        wizardData.devices = parsed.devices
      }
      
      // Restore parts with proper instructions handling
      if (parsed.parts) {
        wizardData.parts = (parsed.parts || []).map((part: any) => ({
          ...part,
          instructions: extractInstructionsHtml(part.instructions)
        }))
        applySubmissionSummaryToParts()
      }
      
      // Restore schedule (convert ISO strings back to Date objects)
      if (parsed.schedule) {
        wizardData.schedule.availableFrom = parsed.schedule.availableFrom ? new Date(parsed.schedule.availableFrom) : undefined
        wizardData.schedule.availableUntil = parsed.schedule.availableUntil ? new Date(parsed.schedule.availableUntil) : undefined
        wizardData.schedule.dueDate = parsed.schedule.dueDate ? new Date(parsed.schedule.dueDate) : undefined
      }
      
      // Restore current step
      if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= steps.length) {
        currentStep.value = parsed.currentStep
        // Mark previous steps as complete
        for (let i = 0; i < parsed.currentStep; i++) {
          steps[i].isComplete = i < parsed.currentStep - 1
          steps[i].isAccessible = true
        }
      }

      // Show message about loaded draft
      const lastSavedDate = parsed.lastSaved ? new Date(parsed.lastSaved).toLocaleString() : 'unknown time'
      toast.info(`Draft loaded from ${lastSavedDate}`)
    }
  } catch (error) {
    console.error('Failed to load draft:', error)
  }
}

const executeLabUpdate = async () => {
  isSubmitting.value = true

  try {
    console.group('🔄 Lab Update Process')

    const sanitizedTitle = (wizardData.basicInfo.name || '').trim()
    const sanitizedDescription = sanitizeOptionalString(wizardData.basicInfo.description)
    const labInstructions = prepareRichTextForApi(wizardData.basicInfo.instructions)
    const dueDate = toOptionalDate(wizardData.schedule.dueDate)
    const availableFrom = toOptionalDate(wizardData.schedule.availableFrom)
    const availableUntil = toOptionalDate(wizardData.schedule.availableUntil)

    const labData: Record<string, any> = {
      courseId: wizardData.courseId,
      type: originalLabData.value.type || 'lab',
      title: sanitizedTitle,
      ...(sanitizedDescription !== undefined ? { description: sanitizedDescription } : {}),
      instructions: labInstructions,
      network: {
        name: sanitizedTitle,
        topology: {
          baseNetwork: (wizardData.networkConfig.managementNetwork || '').trim(),
          subnetMask: wizardData.networkConfig.managementSubnetMask,
          allocationStrategy: wizardData.networkConfig.allocationStrategy || 'group_based',
          exemptIpRanges: prepareExemptRangesForApi(wizardData.networkConfig.exemptIpRanges)
        },
        vlanConfiguration: {
          mode: wizardData.networkConfig.mode,
          vlanCount: wizardData.networkConfig.vlanCount,
          vlans: wizardData.networkConfig.vlans.map(prepareVlanForApi)
        },
        // IPv6 Template Configuration
        ipv6Config: wizardData.networkConfig.ipv6Config ? {
          enabled: wizardData.networkConfig.ipv6Config.enabled,
          template: wizardData.networkConfig.ipv6Config.template,
          managementTemplate: wizardData.networkConfig.ipv6Config.managementTemplate || '',
          presetName: wizardData.networkConfig.ipv6Config.presetName
        } : undefined,
        devices: wizardData.devices.map(prepareDeviceForApi)
      }
    }

    if (dueDate) {
      labData.dueDate = dueDate
    }
    if (availableFrom) {
      labData.availableFrom = availableFrom
    }
    if (availableUntil) {
      labData.availableUntil = availableUntil
    }

    console.log('📝 Updating lab...', labData)

    const labResponse = await $fetch(`${backendURL}/v0/labs/${labId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: labData
    })

    if (!labResponse.success) {
      throw new Error(labResponse.message || 'Failed to update lab')
    }

    console.log('✅ Lab updated successfully')

    const normalizeId = (value: any, debugLabel?: string): string | null => {
      const debug = (msg: string, data?: any) => {
        if (debugLabel) {
          console.log(`[normalizeId:${debugLabel}] ${msg}`, data || '')
        }
      }

      if (!value) {
        debug('Value is null/undefined')
        return null
      }

      if (typeof value === 'string') {
        debug('Value is already a string', value)
        return value
      }

      if (typeof value === 'number') {
        debug('Value is a number, converting to string', value)
        return value.toString()
      }

      // Handle Proxy objects and reactive objects by using toRaw
      if (typeof value === 'object') {
        debug('Value is an object', {
          constructor: value.constructor?.name,
          keys: Object.keys(value || {})
        })

        try {
          // Try to unwrap Vue reactive/proxy objects
          const rawValue = toRaw(value)
          debug('After toRaw', {
            rawConstructor: rawValue?.constructor?.name,
            rawKeys: Object.keys(rawValue || {})
          })

          // If it's a MongoDB ObjectId or has a toString method
          if (rawValue && typeof rawValue.toString === 'function') {
            const stringValue = rawValue.toString()
            debug('Called toString()', stringValue)
            if (typeof stringValue === 'string' && stringValue !== '[object Object]') {
              debug('✅ Successfully normalized via toString', stringValue)
              return stringValue
            }
          }

          // If it's an object with $oid property (MongoDB ObjectId format)
          if (rawValue && rawValue.$oid && typeof rawValue.$oid === 'string') {
            debug('✅ Successfully normalized via $oid', rawValue.$oid)
            return rawValue.$oid
          }

          // Try direct toString as fallback
          if (typeof value.toString === 'function') {
            const stringValue = value.toString()
            debug('Called value.toString()', stringValue)
            if (typeof stringValue === 'string' && stringValue !== '[object Object]') {
              debug('✅ Successfully normalized via direct toString', stringValue)
              return stringValue
            }
          }
        } catch (error) {
          console.warn(`[normalizeId:${debugLabel}] Failed to normalize ID:`, error)
        }
      }

      debug('❌ Failed to normalize - returning null')
      return null
    }

    const originalPartsById = new Map<string, any>()
    const originalPartsByPartId = new Map<string, any>()

    console.log(`🗂️ Building original parts maps from ${originalPartsData.value.length} parts`)
    for (const originalPart of originalPartsData.value) {
      // Backend returns 'id' not '_id', so check both
      const idValue = originalPart?._id || originalPart?.id
      const id = normalizeId(idValue, `original:${originalPart?.partId}`)
      if (id) {
        originalPartsById.set(id, originalPart)
      }
      if (originalPart?.partId) {
        originalPartsByPartId.set(originalPart.partId, originalPart)
      }
    }
    console.log(`✅ Built maps: ${originalPartsById.size} by _id, ${originalPartsByPartId.size} by partId`)

    const findOriginalPart = (part: any) => {
      if (!part) return null

      // Check both _id and id (backend returns 'id')
      const idValue = part._id || part.id
      const id = normalizeId(idValue, `wizard:${part.partId}`)
      if (id && originalPartsById.has(id)) {
        console.log(`✅ Found match by _id/id: ${part.partId} (${id})`)
        return originalPartsById.get(id)
      }

      if (part.partId && originalPartsByPartId.has(part.partId)) {
        console.log(`✅ Found match by partId: ${part.partId}`)
        return originalPartsByPartId.get(part.partId)
      }

      console.warn(`⚠️ No match found for part: ${part.partId} (title: ${part.title})`)
      return null
    }

    const matchedOriginalIds = new Set<string>()
    const partsToCreate: any[] = []
    const partsToUpdate: Array<{ part: any; targetId: string }> = []

    for (const part of wizardData.parts) {
      const originalPart = findOriginalPart(part)

      if (!originalPart) {
        console.log(`➕ Part will be created (no match found): ${part.partId || part.title}`)
        partsToCreate.push(part)
        continue
      }

      // Backend returns 'id' not '_id', so check both
      const originalIdValue = originalPart._id || originalPart.id
      const targetId = normalizeId(originalIdValue, `target:${part.partId}`)
      if (!targetId) {
        console.error('❌ CRITICAL: Unable to resolve original part ID', {
          partId: part.partId,
          partTitle: part.title,
          originalPart: {
            _id: originalPart._id,
            id: originalPart.id,
            _idType: typeof originalPart._id,
            idType: typeof originalPart.id,
            partId: originalPart.partId,
            title: originalPart.title
          }
        })
        continue
      }

      console.log(`🔄 Part will be updated: ${part.partId} (ID: ${targetId})`)
      matchedOriginalIds.add(targetId)

      // Ensure the working copy retains the original _id/id for future comparisons
      const partIdValue = part._id || part.id
      if (!normalizeId(partIdValue)) {
        // Backend uses 'id', so store it there
        part.id = originalPart.id || originalPart._id
        part._id = originalPart._id || originalPart.id
      }

      partsToUpdate.push({ part, targetId })
    }

    const partsToDelete = originalPartsData.value.filter((originalPart: any) => {
      // Backend returns 'id' not '_id', so check both
      const originalIdValue = originalPart?._id || originalPart?.id
      const originalId = normalizeId(originalIdValue, `delete:${originalPart?.partId}`)
      if (!originalId) {
        console.warn('⚠️ Skipping part deletion - unable to resolve original ID', {
          partId: originalPart?.partId,
          title: originalPart?.title,
          _id: originalPart?._id,
          id: originalPart?.id
        })
        return false
      }
      const shouldDelete = !matchedOriginalIds.has(originalId)
      if (shouldDelete) {
        console.log(`🗑️  Part will be deleted: ${originalPart.partId} (${originalPart.title})`)
      }
      return shouldDelete
    })

    console.log('📊 Parts summary:', {
      toDelete: partsToDelete.length,
      toCreate: partsToCreate.length,
      toUpdate: partsToUpdate.length
    })

    for (const part of partsToDelete) {
      console.log(`🗑️  Deleting part: ${part.partId}`)
      await $fetch(`${backendURL}/v0/parts/${part._id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    }

    for (const part of partsToCreate) {
      console.log(`➕ Creating new part: ${part.partId}`)
      const partData = buildPartData(labId, part)
      await $fetch(`${backendURL}/v0/parts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: partData
      })
    }

    for (const { part, targetId } of partsToUpdate) {
      console.log(`🔄 Updating part: ${part.partId}`)

      // Debug: Log the source part data from wizard
      console.log(`📥 Source part from wizard (${part.partId}):`, {
        partType: part.partType,
        questionsCount: part.questions?.length || 0,
        totalPoints: part.totalPoints,
        questionPoints: part.questions?.map((q: any) => q.points),
        questions: part.questions
      })

      const partData = buildPartData(labId, part)

      // Debug: Log the part data being sent to backend
      console.log(`📤 Part data for ${part.partId} being sent to backend:`, {
        partType: partData.partType,
        questionsCount: partData.questions?.length || 0,
        totalPoints: partData.totalPoints,
        hasIpTableQuestionnaire: partData.questions?.some((q: any) => q.ipTableQuestionnaire) || false,
        questionPoints: partData.questions?.map((q: any) => q.points),
        firstQuestion: partData.questions?.[0]
      })

      await $fetch(`${backendURL}/v0/parts/${targetId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: partData
      })
      console.log(`✅ Successfully updated part: ${part.partId}`)
    }

    console.groupEnd()

    // Clear draft from localStorage
    const draftKey = `lab-edit-draft-${labId}`
    console.log(`🧹 Clearing edit draft with key: ${draftKey}`)
    localStorage.removeItem(draftKey)
    console.log(`✅ Edit draft cleared. Verifying: ${localStorage.getItem(draftKey) === null ? 'Success' : 'FAILED'}`)

    showGlobalMessage('success', 'Lab updated successfully!')

    setTimeout(() => {
      router.push(`/courses/${courseId}/labs/${labId}`)
    }, 1500)

  } catch (error: any) {
    const errorDetails = error?.data || error?.response?._data || error?.response?.data
    if (errorDetails) {
      console.error('Failed to update lab (details):', errorDetails)
    }
    console.error('Failed to update lab:', error)
    const errorMessage =
      errorDetails?.error?.message ||
      errorDetails?.message ||
      error.message ||
      'Failed to update lab. Please try again.'
    showGlobalMessage('error', errorMessage)
  } finally {
    isSubmitting.value = false
    saveConfirmation.summary = null
  }
}

const handleUpdateLab = () => {
  if (isSubmitting.value) {
    return
  }

  if (!canUpdateLab.value) {
    showGlobalMessage('error', 'Please complete all required steps before updating the lab')
    return
  }

  const summary = buildChangeSummary()
  saveConfirmation.summary = summary
  saveConfirmation.open = true
}

const confirmSaveChanges = async () => {
  if (isSubmitting.value) return
  if (!saveConfirmation.summary) {
    saveConfirmation.summary = buildChangeSummary()
  }
  saveConfirmation.open = false
  await executeLabUpdate()
}

// Helper function to build part data for API
const buildPartData = (labId: string, part: any) => {
  return {
    labId,
    partId: part.partId,
    title: part.title,
    description: part.description,
    instructions: part.instructions,
    order: part.order,
    partType: part.partType,
    tasks: part.partType === 'network_config'
      ? part.tasks.map((task: any) => ({
        taskId: task.taskId,
        name: task.name,
        description: task.description,
        templateId: task.templateId,
        executionDevice: task.executionDevice,
        targetDevices: task.targetDevices,
        parameters: Object.fromEntries(
          Object.entries(task.parameters).map(([key, value]) => [
            key,
            formatParameterValue(value)
          ])
        ),
        testCases: task.testCases.map((testCase: any) => ({
          ...testCase,
          expected_result: convertStringToBoolean(testCase.expected_result)
        })),
        order: task.order,
        points: toSafeNumber(task.points),
        group_id: task.groupId || undefined
      }))
      : [],
    task_groups: part.partType === 'network_config'
      ? part.task_groups.map((group: any) => ({
        group_id: group.group_id,
        title: group.title,
        description: group.description,
        group_type: group.group_type,
        points: toSafeNumber(group.points),
        continue_on_failure: group.continue_on_failure,
        timeout_seconds: group.timeout_seconds
      }))
      : [],
    questions: part.partType === 'fill_in_blank'
      ? part.questions?.map((question: any) => ({
        questionId: question.questionId,
        questionText: question.questionText,
        questionType: question.questionType,
        order: question.order,
        points: toSafeNumber(question.points),
        schemaMapping: question.schemaMapping
          ? {
            vlanIndex: question.schemaMapping.vlanIndex,
            field: question.schemaMapping.field,
            deviceId: question.schemaMapping.deviceId,
            variableName: question.schemaMapping.variableName,
            autoDetected: question.schemaMapping.autoDetected
          }
          : undefined,
        answerFormula: question.answerFormula,
        expectedAnswerType: question.expectedAnswerType,
        placeholder: question.placeholder,
        inputFormat: question.inputFormat,
        expectedAnswer: question.expectedAnswer,
        caseSensitive: question.caseSensitive,
        trimWhitespace: question.trimWhitespace,
        // 🆕 ADDED: IP Table Questionnaire data for advanced IP table questions
        ipTableQuestionnaire: question.ipTableQuestionnaire
          ? {
            tableId: question.ipTableQuestionnaire.tableId,
            rowCount: question.ipTableQuestionnaire.rowCount,
            columnCount: question.ipTableQuestionnaire.columnCount,
            columns: question.ipTableQuestionnaire.columns.map((col: any) => ({
              columnId: col.columnId,
              label: col.label,
              order: col.order
            })),
            rows: question.ipTableQuestionnaire.rows.map((row: any) => ({
              rowId: row.rowId,
              deviceId: row.deviceId,
              interfaceName: row.interfaceName,
              displayName: row.displayName,
              order: row.order
            })),
            cells: question.ipTableQuestionnaire.cells.map((cellRow: any) =>
              cellRow.map((cell: any) => {
                const cellType = cell.cellType ?? 'input'
                const isInputCell = cellType === 'input'
                const isCalculated = cell.answerType === 'calculated'

                return {
                  cellId: cell.cellId,
                  rowId: cell.rowId,
                  columnId: cell.columnId,
                  cellType,
                  answerType: isInputCell ? (cell.answerType ?? 'calculated') : undefined,
                  staticAnswer: isInputCell && cell.answerType === 'static' ? cell.staticAnswer : undefined,
                  calculatedAnswer: isInputCell && isCalculated && cell.calculatedAnswer
                    ? {
                      calculationType: cell.calculatedAnswer.calculationType,
                      vlanIndex: cell.calculatedAnswer.vlanIndex,
                      lecturerOffset: cell.calculatedAnswer.lecturerOffset,
                      lecturerRangeStart: cell.calculatedAnswer.lecturerRangeStart,
                      lecturerRangeEnd: cell.calculatedAnswer.lecturerRangeEnd,
                      deviceId: cell.calculatedAnswer.deviceId,
                      interfaceName: cell.calculatedAnswer.interfaceName
                    }
                    : undefined,
                  readonlyContent: cellType === 'readonly' ? (cell.readonlyContent ?? '') : undefined,
                  blankReason: cellType === 'blank' ? (cell.blankReason ?? '') : undefined,
                  points: isInputCell ? toSafeNumber(cell.points) : 0,
                  autoCalculated: isInputCell ? !!cell.autoCalculated : false
                }
              })
            )
          }
          : undefined
      }))
      : undefined,
    prerequisites: part.prerequisites,
    totalPoints: part.totalPoints
  }
}

const showGlobalMessage = (type: 'success' | 'error', message: string) => {
  globalMessage.type = type
  globalMessage.message = message
  globalMessage.show = true

  // Auto-hide after 5 seconds
  setTimeout(() => {
    globalMessage.show = false
  }, 5000)
}

// Lifecycle
onMounted(async () => {
  // Fetch course data first
  await fetchCourse(courseId)

  // Load lab data from backend
  await loadLabData()

  // Load draft if available (overrides loaded data)
  loadDraft()

  // Update course data in wizard (avoid reactive loops)
  if (currentCourse.value) {
    nextTick(() => {
      wizardData.courseName = currentCourse.value.title || ''
      wizardData.courseCode = currentCourse.value._id || courseId
    })
  }
})
</script>

<style scoped>
.sticky {
  position: sticky;
}

/* Smooth transitions for step indicators */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar for the main content */
:deep(.overflow-y-auto) {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground)) transparent;
}

:deep(.overflow-y-auto::-webkit-scrollbar) {
  width: 6px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb) {
  background-color: hsl(var(--muted-foreground));
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
  background-color: hsl(var(--muted-foreground) / 0.8);
}
</style>
