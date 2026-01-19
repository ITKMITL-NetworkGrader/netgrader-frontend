<template>
  <div class="min-h-screen bg-background">
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
              <BreadcrumbPage>Create {{ labType === 'exam' ? 'Exam' : 'Lab' }}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <!-- Header Title -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Create New {{ labType === 'exam' ? 'Exam' : 'Lab' }}</h1>
            <p class="text-muted-foreground mt-1">Design a comprehensive {{ labType === 'exam' ? 'exam' : 'lab' }} with
              network topology, tasks, and grading</p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Playground Button -->
            <Button v-if="currentStep >= 4 && validation.step4.isValid" variant="outline" @click="openPlayground"
              class="gap-2">
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
          <div class="flex items-center justify-center space-x-4">
            <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep >= index + 1,
                  'border-muted-foreground text-muted-foreground bg-background': currentStep < index + 1,
                  'bg-green-500 border-green-500 text-white': currentStep > index + 1
                }">
                <Check v-if="currentStep > index + 1" class="w-4 h-4" />
                <span v-else class="font-semibold text-xs">{{ index + 1 }}</span>
              </div>
              <div class="ml-2 min-w-0">
                <div class="font-medium text-xs transition-colors duration-200" :class="{
                  'text-foreground': currentStep >= index + 1,
                  'text-muted-foreground': currentStep < index + 1,
                  'text-green-600': currentStep > index + 1
                }">
                  {{ step.title }}
                </div>
              </div>
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
              :vlans="effectiveVlans" :validation="validation.step4"
              @validate="handleStepValidation(4, $event)" />

            <!-- Step 5: Schedule & Publishing -->
            <LabWizardStep5 v-if="currentStep === 5" v-model="wizardData.schedule" :validation="validation.step5"
              @validate="handleStepValidation(5, $event)" />

            <!-- Step 6: Review & Create -->
            <LabWizardStep6 v-if="currentStep === 6" :wizard-data="wizardData" :course-context="courseContext"
              :is-submitting="isSubmitting" @create-lab="handleCreateLab" />
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

          <!-- Next/Create Button -->
          <Button v-if="currentStep < steps.length" size="lg" :disabled="isSubmitting || !canProceedToNextStep"
            @click="nextStep">
            Next
            <ChevronRight class="w-4 h-4 ml-2" />
          </Button>
          <Button v-else size="lg" :disabled="isSubmitting || !canCreateLab" @click="handleCreateLab">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            <Plus v-else class="w-4 h-4 mr-2" />
            Create Lab
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

    <!-- Playground Modals -->
    <PlaygroundSetupModal v-model:open="showPlaygroundSetup" :lab-id="playgroundLabId"
      @complete="handlePlaygroundSetupComplete" @reset="handlePlaygroundReset" />

    <PlaygroundTestingModal v-model:open="showPlaygroundTesting" :lab-id="playgroundLabId" :parts="wizardData.parts"
      :gns3-config="playgroundConfig?.gns3Config || null" :device-mappings="playgroundConfig?.deviceMappings || []"
      :custom-ip-mappings="playgroundConfig?.customIpMappings || {}"
      :custom-vlan-mappings="playgroundConfig?.customVlanMappings || {}" @reconfigure="handlePlaygroundReconfigure" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Play
} from 'lucide-vue-next'

// UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

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

// Page setup
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const backendURL = config.public.backendurl
const courseId = route.params.c_id as string

// Determine lab type from query parameter (default to "lab")
const labType = computed(() => route.query.type as string || 'lab')

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
    title: 'Review & Create',
    description: 'Final review and creation',
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

// Computed property to get VLANs based on mode (handles Large Subnet Mode subVlans)
const effectiveVlans = computed(() => {
  const mode = wizardData.networkConfig.mode
  if (mode === 'large_subnet') {
    // In Large Subnet Mode, VLANs are stored as subVlans in largeSubnetConfig
    const subVlans = wizardData.networkConfig.largeSubnetConfig?.subVlans || []
    return subVlans.map((sv, idx) => ({
      id: sv.id,
      name: sv.name,
      baseNetwork: '', // Sub-VLANs don't have baseNetwork - calculated per student
      subnetMask: sv.subnetSize,
      subnetIndex: sv.subnetIndex,
      isStudentGenerated: true,
      isSubVlan: true // Flag to indicate this is from Large Subnet Mode
    }))
  }
  // For other modes, return regular vlans
  return wizardData.networkConfig.vlans || []
})

// Global message state
const globalMessage = reactive({
  show: false,
  type: 'success' as 'success' | 'error',
  message: ''
})

// Playground state
const showPlaygroundSetup = ref(false)
const showPlaygroundTesting = ref(false)
const playgroundLabId = ref('')
const playgroundConfig = ref<{
  gns3Config: GNS3Config
  deviceMappings: DeviceMapping[]
  customIpMappings: Record<string, string>
  customVlanMappings: Record<string, number>
} | null>(null)

// Playground functions
function openPlayground() {
  // Generate a temporary lab ID for playground testing (not saved to DB)
  playgroundLabId.value = `playground-${courseId}-${Date.now()}`

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

const canCreateLab = computed(() => {
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

// Helper function to safely convert values to numbers (handles empty strings from v-model.number)
const toSafeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

// Methods
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
    
    const draftKey = `lab-draft-${courseId}`
    console.log(`Saving draft with key: ${draftKey}`, draftData)
    localStorage.setItem(draftKey, JSON.stringify(draftData))

    showGlobalMessage('success', 'Draft saved successfully')
  } catch (error) {
    console.error('Failed to save draft:', error)
    showGlobalMessage('error', 'Failed to save draft')
  }
}

const loadDraft = () => {
  try {
    const draftKey = `lab-draft-${courseId}`
    const draftData = localStorage.getItem(draftKey)
    if (draftData) {
      const parsed = JSON.parse(draftData)
      console.log(`Loading draft with key: ${draftKey}`, parsed)
      
      // Restore basic info
      if (parsed.basicInfo) {
        wizardData.basicInfo.name = parsed.basicInfo.name || ''
        wizardData.basicInfo.description = parsed.basicInfo.description || ''
        wizardData.basicInfo.instructions = parsed.basicInfo.instructions || { html: '', json: { type: 'doc', content: [] } }
      }
      
      // Restore network config
      if (parsed.networkConfig) {
        Object.assign(wizardData.networkConfig, parsed.networkConfig)
      }
      
      // Restore devices
      if (parsed.devices) {
        wizardData.devices = parsed.devices
      }
      
      // Restore parts
      if (parsed.parts) {
        wizardData.parts = parsed.parts
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

const handleCreateLab = async () => {
  if (!canCreateLab.value) {
    showGlobalMessage('error', 'Please complete all required steps before creating the lab')
    return
  }

  isSubmitting.value = true

  try {
    // Step 1: Create the lab
    const labData = {
      courseId: wizardData.courseId,
      type: labType.value, // "lab" or "exam" based on query parameter
      title: wizardData.basicInfo.name, // Frontend uses "name" but backend expects "title"
      description: wizardData.basicInfo.description,
      instructions: wizardData.basicInfo.instructions,
      network: {
        name: wizardData.basicInfo.name, // Use lab name as network name
        topology: {
          // 🆕 CHANGED: Use managementNetwork instead of baseNetwork
          baseNetwork: wizardData.networkConfig.managementNetwork,
          subnetMask: wizardData.networkConfig.managementSubnetMask,
          allocationStrategy: wizardData.networkConfig.allocationStrategy || 'group_based',
          // 🆕 ADDED: Exempt IP Ranges for Management IP assignment exclusion
          exemptIpRanges: (wizardData.networkConfig.exemptIpRanges || []).map(range => ({
            start: range.start,
            ...(range.end ? { end: range.end } : {})
          }))
        },
        // 🆕 ADDED: VLAN configuration data
        vlanConfiguration: {
          mode: wizardData.networkConfig.mode,
          vlanCount: wizardData.networkConfig.vlanCount,
          vlans: wizardData.networkConfig.vlans.map(vlan => ({
            id: vlan.id,
            vlanId: vlan.vlanId,
            calculationMultiplier: vlan.calculationMultiplier,
            baseNetwork: vlan.baseNetwork,
            subnetMask: vlan.subnetMask,
            subnetIndex: vlan.subnetIndex,
            groupModifier: vlan.groupModifier,
            isStudentGenerated: vlan.isStudentGenerated,
            // IPv6 Configuration per VLAN
            ipv6Enabled: vlan.ipv6Enabled || false,
            ipv6VlanAlphabet: vlan.ipv6VlanAlphabet || '',
            ipv6SubnetId: vlan.ipv6SubnetId || ''
          })),
          // 🆕 ADDED: Include Large Subnet Mode Configuration when applicable
          ...(wizardData.networkConfig.mode === 'large_subnet' && wizardData.networkConfig.largeSubnetConfig ? {
            largeSubnetConfig: wizardData.networkConfig.largeSubnetConfig
          } : {})
        },
        // IPv6 Template Configuration
        ipv6Config: wizardData.networkConfig.ipv6Config ? {
          enabled: wizardData.networkConfig.ipv6Config.enabled,
          template: wizardData.networkConfig.ipv6Config.template,
          managementTemplate: wizardData.networkConfig.ipv6Config.managementTemplate || '',
          presetName: wizardData.networkConfig.ipv6Config.presetName
        } : undefined,
        devices: wizardData.devices.map(device => ({
          deviceId: device.deviceId,
          templateId: device.templateId, // This should be the actual device template ID from API
          displayName: device.displayName || device.deviceId,
          ipVariables: device.ipVariables.map(ipVar => {
            const baseVar = {
              name: ipVar.name,
              interface: ipVar.interface || '', // Full interface name from device template
              // 🆕 ADDED: Required marks for interface types
              isManagementInterface: ipVar.isManagementInterface || false,
              isVlanInterface: ipVar.inputType?.startsWith('studentVlan') || false,
              inputType: ipVar.inputType,
              vlanIndex: ipVar.vlanIndex,
              interfaceOffset: ipVar.interfaceOffset,
              // 🆕 IPv6 Configuration (for dual-stack interfaces)
              ipv6InputType: ipVar.ipv6InputType || 'none',
              fullIpv6: ipVar.fullIpv6 || '',
              ipv6InterfaceId: ipVar.ipv6InterfaceId || '',
              ipv6VlanIndex: ipVar.ipv6VlanIndex
            }

            // Add either hostOffset or fullIp based on inputType
            if (ipVar.inputType === 'fullIP') {
              return {
                ...baseVar,
                fullIp: ipVar.fullIP
              }
            } else if (ipVar.inputType === 'hostOffset') {
              return {
                ...baseVar,
                hostOffset: ipVar.hostOffset
              }
            } else {
              // For studentManagement and studentVlan types, no additional fields needed
              return baseVar
            }
          }),
          // Connection settings from Step 3
          connectionType: device.connectionParams?.connectionType || 'ssh',
          sshPort: device.connectionParams?.sshPort,
          credentials: device.credentials || {
            usernameTemplate: device.connectionParams?.username || '',
            passwordTemplate: device.connectionParams?.password || '',
            enablePassword: ''
          }
        }))
      },
      dueDate: wizardData.schedule.dueDate,
      availableFrom: wizardData.schedule.availableFrom,
      availableUntil: wizardData.schedule.availableUntil
    }

    // 🐛 DEBUG: Log the full wizard data and lab data being submitted
    console.group('DEBUG: Lab Creation Data')
    console.log('Full Wizard Data:', JSON.stringify(wizardData, null, 2))
    console.log('Lab API Payload:', JSON.stringify(labData, null, 2))
    console.log('API Endpoint:', `${backendURL}/v0/labs`)
    console.groupEnd()

    const labResponse = await $fetch(`${backendURL}/v0/labs`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: labData
    })

    if (!labResponse.success) {
      throw new Error(labResponse.message || 'Failed to create lab')
    }

    const labId = labResponse.data.id  // Lab ID is in 'id' field, not 'labId'

    // Verify we got a valid lab ID
    if (!labId) {
      throw new Error('Failed to get lab ID from lab creation response')
    }

    // Step 2: Create lab parts
    for (let i = 0; i < wizardData.parts.length; i++) {
      const part = wizardData.parts[i]

      const partData = {
        labId,
        partId: part.partId,
        title: part.title,
        description: part.description,
        instructions: part.instructions,
        order: part.order,
        partType: part.partType,
        tasks: part.partType === 'network_config'
          ? part.tasks.map(task => ({
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
            testCases: task.testCases.map(testCase => ({
              ...testCase,
              expected_result: convertStringToBoolean(testCase.expected_result)
            })),
            order: task.order,
            points: toSafeNumber(task.points),
            group_id: task.groupId || undefined
          }))
          : [],
        task_groups: part.partType === 'network_config'
          ? part.task_groups.map(group => ({
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
          ? part.questions?.map(question => ({
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
                columns: question.ipTableQuestionnaire.columns.map(col => ({
                  columnId: col.columnId,
                  label: col.label,
                  order: col.order
                })),
                rows: question.ipTableQuestionnaire.rows.map(row => ({
                  rowId: row.rowId,
                  deviceId: row.deviceId,
                  interfaceName: row.interfaceName,
                  displayName: row.displayName,
                  order: row.order
                })),
                cells: question.ipTableQuestionnaire.cells.map(cellRow =>
                  cellRow.map(cell => {
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

      // 🐛 DEBUG: Log each part data being submitted
      console.group(`DEBUG: Part ${i + 1} Data`)
      console.log('Part API Payload:', JSON.stringify(partData, null, 2))
      console.log('API Endpoint:', `${backendURL}/v0/parts`)
      // 🆕 Log IP Table Questionnaire data if present
      if (part.partType === 'fill_in_blank' && part.questions) {
        const ipTableQuestions = part.questions.filter(q => q.ipTableQuestionnaire)
        if (ipTableQuestions.length > 0) {
          console.log('IP Table Questionnaire Questions:', ipTableQuestions.length)
          ipTableQuestions.forEach((q, idx) => {
            console.log(`  Question ${idx + 1}: ${q.ipTableQuestionnaire?.rowCount}x${q.ipTableQuestionnaire?.columnCount} table`)
          })
        }
      }
      console.groupEnd()

      await $fetch(`${backendURL}/v0/parts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: partData
      })
    }

    // Clear draft from localStorage
    const draftKey = `lab-draft-${courseId}`
    console.log(`Clearing draft with key: ${draftKey}`)
    localStorage.removeItem(draftKey)
    console.log(`Draft cleared. Verifying: ${localStorage.getItem(draftKey) === null ? 'Success' : 'FAILED'}`)

    // Success - redirect to course page
    showGlobalMessage('success', 'Lab created successfully!')

    setTimeout(() => {
      router.push(`/courses/${courseId}`)
    }, 1500)

  } catch (error: any) {
    console.error('Failed to create lab:', error)
    showGlobalMessage('error', error.message || 'Failed to create lab. Please try again.')
  } finally {
    isSubmitting.value = false
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

  // Load draft if available
  loadDraft()

  // Update course data in wizard (avoid reactive loops)
  if (currentCourse.value) {
    // Use nextTick to avoid reactive loops
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
