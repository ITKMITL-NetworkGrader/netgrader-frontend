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
        <div class="max-w-6xl mx-auto px-4 py-4">
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
            <div class="text-sm text-muted-foreground">
              Course: <span class="font-medium">{{ courseTitle }}</span>
            </div>
          </div>

          <!-- Progress Indicator -->
          <div class="mt-4 mb-2">
            <div class="flex items-center justify-center space-x-4">
              <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
                <div
                  class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200"
                  :class="{
                    'bg-primary text-primary-foreground border-primary': currentStep >= index + 1,
                    'border-muted-foreground text-muted-foreground bg-background': currentStep < index + 1,
                    'bg-green-500 border-green-500 text-white': currentStep > index + 1
                  }"
                >
                  <Check v-if="currentStep > index + 1" class="w-4 h-4" />
                  <span v-else class="font-semibold text-xs">{{ index + 1 }}</span>
                </div>
                <div class="ml-2 min-w-0">
                  <div
                    class="font-medium text-xs transition-colors duration-200"
                    :class="{
                      'text-foreground': currentStep >= index + 1,
                      'text-muted-foreground': currentStep < index + 1,
                      'text-green-600': currentStep > index + 1
                    }"
                  >
                    {{ step.title }}
                  </div>
                </div>
                <ChevronRight
                  v-if="index < steps.length - 1"
                  class="w-4 h-4 mx-3 text-muted-foreground/40"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-6xl mx-auto px-4 py-6">
        <Card class="min-h-[600px]">
          <CardContent class="p-0">
            <!-- Step Content -->
            <div class="p-6">
              <!-- Step 1: Basic Lab Information -->
              <LabWizardStep1
                v-if="currentStep === 1"
                v-model="wizardData.basicInfo"
                :course-context="courseContext"
                @validate="handleStepValidation(1, $event)"
              />

              <!-- Step 2: Network Configuration -->
              <LabWizardStep2
                v-if="currentStep === 2"
                v-model="wizardData.networkConfig"
                :validation="validation.step2"
                @validate="handleStepValidation(2, $event)"
              />

              <!-- Step 3: Device Configuration -->
              <LabWizardStep3
                v-if="currentStep === 3"
                v-model="wizardData.devices"
                :network-config="wizardData.networkConfig"
                :validation="validation.step3"
                @validate="handleStepValidation(3, $event)"
              />

              <!-- Step 4: Parts & Tasks Management -->
              <LabWizardStep4
                v-if="currentStep === 4"
                v-model="wizardData.parts"
                :devices="wizardData.devices"
                :vlans="wizardData.networkConfig.vlans"
                :validation="validation.step4"
                @validate="handleStepValidation(4, $event)"
              />

              <!-- Step 5: Schedule & Publishing -->
              <LabWizardStep5
                v-if="currentStep === 5"
                v-model="wizardData.schedule"
                :validation="validation.step5"
                @validate="handleStepValidation(5, $event)"
              />

              <!-- Step 6: Review & Update -->
              <LabWizardStep6
                v-if="currentStep === 6"
                :wizard-data="wizardData"
                :course-context="courseContext"
                :is-submitting="isSubmitting"
                :is-edit-mode="true"
                @create-lab="handleUpdateLab"
              />
            </div>
          </CardContent>
        </Card>

        <!-- Navigation Footer -->
        <div class="flex items-center justify-between mt-6 pt-4 border-t bg-background sticky bottom-0 z-30">
          <div>
            <Button
              v-if="currentStep > 1"
              variant="outline"
              size="lg"
              :disabled="isSubmitting"
              @click="previousStep"
            >
              <ChevronLeft class="w-4 h-4 mr-2" />
              Previous
            </Button>
          </div>

          <div class="flex items-center space-x-3">
            <!-- Save Draft Button -->
            <Button
              variant="ghost"
              size="lg"
              :disabled="isSubmitting"
              @click="saveDraft"
            >
              <Save class="w-4 h-4 mr-2" />
              Save Draft
            </Button>

            <!-- Next/Update Button -->
            <Button
              v-if="currentStep < steps.length"
              size="lg"
              :disabled="isSubmitting || !canProceedToNextStep"
              @click="nextStep"
            >
              Next
              <ChevronRight class="w-4 h-4 ml-2" />
            </Button>
            <Button
              v-else
              size="lg"
              :disabled="isSubmitting || !canUpdateLab"
              @click="handleUpdateLab"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
              <Save v-else class="w-4 h-4 mr-2" />
              Update Lab
            </Button>
          </div>
        </div>
      </div>

      <!-- Global Error/Success Messages -->
      <div
        v-if="globalMessage.show"
        class="fixed bottom-4 right-4 max-w-md z-50"
      >
        <Alert
          :variant="globalMessage.type === 'error' ? 'destructive' : 'default'"
          class="shadow-lg border-2"
        >
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
    </template>
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
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
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
    instructions: ''
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
const isIpAddress = (value: string): boolean => {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  return ipv4Pattern.test(value) || ipv6Pattern.test(value)
}

// Helper function to format parameter values for backend submission
const formatParameterValue = (value: any): any => {
  if (typeof value !== 'string') return value

  const trimmedValue = value.trim()

  // If it's an IP address, return as-is
  if (isIpAddress(trimmedValue)) {
    return trimmedValue
  }

  // If it's already wrapped with {{}}, return as-is
  if (trimmedValue.startsWith('{{') && trimmedValue.endsWith('}}')) {
    return trimmedValue
  }

  // Otherwise, wrap it with {{}}
  return `{{${trimmedValue}}}`
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

    if (!partsResponse.success) {
      throw new Error(partsResponse.message || 'Failed to load lab parts')
    }

    originalPartsData.value = partsResponse.data || []

    // Transform backend data to wizard format
    transformBackendDataToWizard()

    console.log('✅ Lab data loaded successfully')

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
    instructions: lab.instructions || ''
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
  wizardData.parts = parts.map((part: any) => ({
    _id: part._id, // Keep original ID for updates
    partId: part.partId,
    title: part.title,
    description: part.description || '',
    instructions: part.instructions || '',
    order: part.order,
    partType: part.partType || 'network_config',
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
    dhcpConfiguration: part.dhcpConfiguration,
    prerequisites: part.prerequisites || [],
    totalPoints: part.totalPoints
  }))

  // Map schedule
  wizardData.schedule = {
    availableFrom: lab.availableFrom ? new Date(lab.availableFrom) : undefined,
    availableUntil: lab.availableUntil ? new Date(lab.availableUntil) : undefined,
    dueDate: lab.dueDate ? new Date(lab.dueDate) : undefined
  }

  console.log('✅ Data transformed to wizard format')
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
    // Save to localStorage as draft (separate from create drafts)
    const draftData = {
      ...wizardData,
      lastSaved: new Date().toISOString()
    }
    localStorage.setItem(`lab-edit-draft-${labId}`, JSON.stringify(draftData))

    showGlobalMessage('success', 'Draft saved successfully')
  } catch (error) {
    console.error('Failed to save draft:', error)
    showGlobalMessage('error', 'Failed to save draft')
  }
}

const loadDraft = () => {
  try {
    const draftData = localStorage.getItem(`lab-edit-draft-${labId}`)
    if (draftData) {
      const parsed = JSON.parse(draftData)
      Object.assign(wizardData, parsed)

      // Show message about loaded draft
      toast.info('Draft loaded from previous session')
    }
  } catch (error) {
    console.error('Failed to load draft:', error)
  }
}

const handleUpdateLab = async () => {
  if (!canUpdateLab.value) {
    showGlobalMessage('error', 'Please complete all required steps before updating the lab')
    return
  }

  isSubmitting.value = true

  try {
    console.group('🔄 Lab Update Process')

    // Step 1: Update the lab
    const labData = {
      courseId: wizardData.courseId,
      type: originalLabData.value.type || 'lab',
      title: wizardData.basicInfo.name,
      description: wizardData.basicInfo.description,
      network: {
        name: wizardData.basicInfo.name,
        topology: {
          baseNetwork: wizardData.networkConfig.managementNetwork,
          subnetMask: wizardData.networkConfig.managementSubnetMask,
          allocationStrategy: wizardData.networkConfig.allocationStrategy || 'group_based',
          exemptIpRanges: (wizardData.networkConfig.exemptIpRanges || []).map(range => ({
            start: range.start,
            ...(range.end ? { end: range.end } : {})
          }))
        },
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
            isStudentGenerated: vlan.isStudentGenerated
          }))
        },
        devices: wizardData.devices.map(device => ({
          deviceId: device.deviceId,
          templateId: device.templateId,
          displayName: device.displayName || device.deviceId,
          ipVariables: device.ipVariables.map(ipVar => {
            const baseVar = {
              name: ipVar.name,
              interface: ipVar.interface || '',
              isManagementInterface: ipVar.isManagementInterface || false,
              isVlanInterface: ipVar.inputType?.startsWith('studentVlan') || false,
              inputType: ipVar.inputType,
              vlanIndex: ipVar.vlanIndex,
              interfaceOffset: ipVar.interfaceOffset
            }

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
              return baseVar
            }
          }),
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

    // Step 2: Handle parts updates (create, update, delete)
    // Track which parts to create, update, or delete
    const originalPartIds = new Set(originalPartsData.value.map(p => p._id))
    const currentPartIds = new Set(wizardData.parts.filter(p => p._id).map(p => p._id))

    // Parts to delete (in original but not in current)
    const partsToDelete = originalPartsData.value.filter(p => !wizardData.parts.some(wp => wp._id === p._id))

    // Parts to create (no _id)
    const partsToCreate = wizardData.parts.filter(p => !p._id)

    // Parts to update (have _id and exist in original)
    const partsToUpdate = wizardData.parts.filter(p => p._id && originalPartIds.has(p._id))

    console.log('📊 Parts summary:', {
      toDelete: partsToDelete.length,
      toCreate: partsToCreate.length,
      toUpdate: partsToUpdate.length
    })

    // Delete parts
    for (const part of partsToDelete) {
      console.log(`🗑️  Deleting part: ${part.partId}`)
      await $fetch(`${backendURL}/v0/parts/${part._id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    }

    // Create new parts
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

    // Update existing parts
    for (const part of partsToUpdate) {
      console.log(`🔄 Updating part: ${part.partId}`)
      const partData = buildPartData(labId, part)
      await $fetch(`${backendURL}/v0/parts/${part._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: partData
      })
    }

    console.groupEnd()

    // Clear draft from localStorage
    localStorage.removeItem(`lab-edit-draft-${labId}`)

    // Success - redirect to lab view page
    showGlobalMessage('success', 'Lab updated successfully!')

    setTimeout(() => {
      router.push(`/courses/${courseId}/labs/${labId}`)
    }, 1500)

  } catch (error: any) {
    console.error('Failed to update lab:', error)
    showGlobalMessage('error', error.message || 'Failed to update lab. Please try again.')
  } finally {
    isSubmitting.value = false
  }
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
          points: task.points,
          group_id: task.groupId || undefined
        }))
      : [],
    task_groups: part.partType === 'network_config'
      ? part.task_groups.map((group: any) => ({
          group_id: group.group_id,
          title: group.title,
          description: group.description,
          group_type: group.group_type,
          points: group.points,
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
          points: question.points,
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
          trimWhitespace: question.trimWhitespace
        }))
      : undefined,
    dhcpConfiguration: part.partType === 'dhcp_config'
      ? {
          vlanIndex: part.dhcpConfiguration?.vlanIndex ?? 0,
          startOffset: part.dhcpConfiguration?.startOffset ?? 0,
          endOffset: part.dhcpConfiguration?.endOffset ?? 0,
          dhcpServerDevice: part.dhcpConfiguration?.dhcpServerDevice || ''
        }
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
