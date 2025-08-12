<template>
  <div class="min-h-screen bg-background p-4 pb-8">
    <!-- Breadcrumb Navigation -->
    <Breadcrumb class="mb-6">
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
          <NuxtLink :to="`/courses/${courseId}/labs`" class="flex items-center">
            Labs
          </NuxtLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight class="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Create Lab</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Create New Lab</h1>
        <p class="text-muted-foreground">Design a comprehensive lab with multiple parts, IP schema, and grading tasks</p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex items-center space-x-4">
          <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
              :class="{
                'bg-primary text-primary-foreground border-primary': currentStep >= index + 1,
                'border-muted-foreground text-muted-foreground': currentStep < index + 1
              }"
            >
              <Check v-if="currentStep > index + 1" class="w-4 h-4" />
              <span v-else class="text-sm font-medium">{{ index + 1 }}</span>
            </div>
            <span
              class="ml-2 text-sm transition-colors"
              :class="{
                'text-foreground font-medium': currentStep >= index + 1,
                'text-muted-foreground': currentStep < index + 1
              }"
            >
              {{ step.title }}
            </span>
            <ChevronRight
              v-if="index < steps.length - 1"
              class="w-4 h-4 mx-4 text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <Card class="mb-6">
        <CardContent class="p-6">
          <!-- Step 1: Basic Information -->
          <div v-if="currentStep === 1">
            <h2 class="text-xl font-semibold mb-4">Lab Information</h2>
            <div class="space-y-4">
              <div>
                <Label for="lab-title">Lab Title *</Label>
                <Input
                  id="lab-title"
                  v-model="labForm.title"
                  placeholder="Enter lab title"
                  class="mt-1"
                  :class="{ 'border-destructive': showValidation && !labForm.title.trim() }"
                />
                <p v-if="showValidation && !labForm.title.trim()" class="text-sm text-destructive mt-1">
                  Lab title is required
                </p>
              </div>
              <div>
                <Label for="lab-description">Description</Label>
                <Textarea
                  id="lab-description"
                  v-model="labForm.description"
                  placeholder="Describe what students will learn and accomplish in this lab (optional)"
                  rows="4"
                  class="mt-1"
                />
              </div>
              <div>
                <Label class="flex items-center space-x-2">
                  <Switch v-model:checked="labForm.groupsRequired" />
                  <span>Requires Student Groups</span>
                </Label>
                <p class="text-sm text-muted-foreground mt-1">
                  Enable this if students need to work in groups and upload group assignments
                </p>
              </div>
            </div>
          </div>

          <!-- Step 2: IP Schema Configuration -->
          <div v-if="currentStep === 2">
            <h2 class="text-xl font-semibold mb-4">IP Address Configuration</h2>
            
            <!-- Always show IPSchemaManager for scope selection -->
            <IPSchemaManager
              v-model:schema="labForm.ipSchema"
              v-model:device-mapping="labForm.deviceIpMapping"
              :model-value="labForm.ipSchemaData"
              :show-validation="showValidation"
              @update:model-value="handleIPSchemaUpdate"
            />
            
            <!-- Part-specific scope: Use new PartSpecificIPManager -->
            <PartSpecificIPManager
              v-if="labForm.ipSchemaData?.scope === 'part'"
              :parts="labForm.parts"
              :global-students="labForm.students"
              :model-value="labForm.partSpecificData"
              @update:model-value="handlePartSpecificUpdate"
              @update:part="handlePartUpdate"
            />
          </div>

          <!-- Step 3: Lab Parts -->
          <div v-if="currentStep === 3">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold">Lab Parts</h2>
              <Button variant="outline" size="sm" @click="addLabPart">
                <Plus class="w-4 h-4 mr-1" />
                Add Part
              </Button>
            </div>

            <div v-if="labForm.parts.length === 0" class="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <p class="text-muted-foreground mb-2">No lab parts added yet</p>
              <Button variant="outline" @click="addLabPart">
                <Plus class="w-4 h-4 mr-1" />
                Add Your First Part
              </Button>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(part, index) in labForm.parts"
                :key="part.tempId"
                class="border rounded-lg"
              >
                <div
                  class="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                  @click="togglePartExpanded(index)"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {{ index + 1 }}
                    </div>
                    <div>
                      <h3 class="font-medium">
                        {{ part.title || `Part ${index + 1}` }}
                      </h3>
                      <p class="text-sm text-muted-foreground">
                        {{ part.plays ? `Play: ${part.plays.name}` : 'No play selected' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Badge
                      :variant="part.plays ? 'default' : 'destructive'"
                    >
                      {{ part.plays ? 'Configured' : 'Needs Play' }}
                    </Badge>
                    <ChevronDown
                      class="w-4 h-4 transition-transform"
                      :class="{ 'transform rotate-180': expandedParts[index] }"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      @click.stop="removeLabPart(index)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Transition name="expand">
                  <div v-if="expandedParts[index]" class="border-t">
                    <div class="h-96">
                      <TextEditor
                        :model-value="part.textMd"
                        :title="part.title"
                        :selected-play="part.plays"
                        :show-validation="showValidation"
                        :part-specific="labForm.ipSchemaData?.scope === 'part'"
                        :current-part-config="labForm.ipSchemaData?.scope === 'part' ? part : null"
                        @update:model-value="updatePartContent(index, $event)"
                        @update:title="updatePartTitle(index, $event)"
                        @open-play-modal="openPlayModal(index)"
                        @clear-play="clearPlay(index)"
                      />
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- Step 4: Review & Save -->
          <div v-if="currentStep === 4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold">Review Lab</h2>
              <Button 
                variant="outline" 
                size="sm" 
                @click="showDebugInfo = !showDebugInfo"
                class="flex items-center space-x-2"
              >
                <Icon name="lucide:bug" class="w-4 h-4" />
                <span>{{ showDebugInfo ? 'Hide' : 'Show' }} Debug Info</span>
              </Button>
            </div>
            
            <!-- Debug Information Panel -->
            <Card v-if="showDebugInfo" class="mb-6 bg-muted/30 border-dashed">
              <CardHeader>
                <CardTitle class="text-base flex items-center">
                  <Icon name="lucide:bug" class="w-4 h-4 mr-2" />
                  Debug Information (Submission Data Preview)
                </CardTitle>
                <CardDescription>
                  This shows the complete data structure that will be sent to the backend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <!-- Basic Lab Data -->
                  <div>
                    <h4 class="font-medium text-sm mb-2">Basic Lab Information:</h4>
                    <pre class="bg-background p-3 rounded text-xs overflow-auto max-h-32"><code>{{
                      JSON.stringify({
                        title: labForm.title,
                        description: labForm.description,
                        type: labForm.type,
                        groupsRequired: labForm.groupsRequired,
                        courseId: courseId
                      }, null, 2)
                    }}</code></pre>
                  </div>
                  
                  <!-- IP Schema Data -->
                  <div>
                    <h4 class="font-medium text-sm mb-2">IP Schema Configuration:</h4>
                    <pre class="bg-background p-3 rounded text-xs overflow-auto max-h-32"><code>{{
                      JSON.stringify(labForm.ipSchema || {}, null, 2)
                    }}</code></pre>
                  </div>
                  
                  <!-- Device Mapping -->
                  <div>
                    <h4 class="font-medium text-sm mb-2">Device IP Mapping:</h4>
                    <pre class="bg-background p-3 rounded text-xs overflow-auto max-h-32"><code>{{
                      JSON.stringify(labForm.deviceIpMapping || [], null, 2)
                    }}</code></pre>
                  </div>
                  
                  <!-- Students Data -->
                  <div>
                    <h4 class="font-medium text-sm mb-2">Students Data:</h4>
                    <pre class="bg-background p-3 rounded text-xs overflow-auto max-h-32"><code>{{
                      JSON.stringify(labForm.students || [], null, 2)
                    }}</code></pre>
                  </div>
                  
                  <!-- Parts Data -->
                  <div>
                    <h4 class="font-medium text-sm mb-2">Lab Parts ({{ labForm.parts.length }}):</h4>
                    <pre class="bg-background p-3 rounded text-xs overflow-auto max-h-40"><code>{{
                      JSON.stringify(labForm.parts.map((part, index) => ({
                        partNumber: index + 1,
                        title: part.title,
                        textMd: part.textMd.substring(0, 100) + (part.textMd.length > 100 ? '...' : ''),
                        order: part.order,
                        total_points: part.total_points,
                        plays: part.plays ? {
                          play_id: part.plays.play_id,
                          name: part.plays.name,
                          description: part.plays.description
                        } : null,
                        hasContent: !!part.textMd.trim(),
                        hasPlay: !!part.plays
                      })), null, 2)
                    }}</code></pre>
                  </div>
                  
                  <!-- Validation Status -->
                  <div>
                    <h4 class="font-medium text-sm mb-2">Validation Status:</h4>
                    <pre class="bg-background p-3 rounded text-xs overflow-auto max-h-32"><code>{{
                      JSON.stringify({
                        isLabValid: isLabValid,
                        validationResult: validateLab(),
                        deviceCount: labForm.deviceIpMapping?.length || 0,
                        studentCount: labForm.students?.length || 0,
                        partCount: labForm.parts.length,
                        partsWithPlays: labForm.parts.filter(p => p.plays).length
                      }, null, 2)
                    }}</code></pre>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div class="space-y-6">
              <!-- Basic Information -->
              <div>
                <h3 class="font-medium mb-2">Basic Information</h3>
                <dl class="grid grid-cols-1 gap-2 text-sm">
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Title:</dt>
                    <dd class="col-span-2">{{ labForm.title }}</dd>
                  </div>
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Description:</dt>
                    <dd class="col-span-2">{{ labForm.description }}</dd>
                  </div>
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Groups Required:</dt>
                    <dd class="col-span-2">{{ labForm.groupsRequired ? 'Yes' : 'No' }}</dd>
                  </div>
                </dl>
              </div>

              <!-- IP Schema -->
              <div v-if="labForm.ipSchema">
                <h3 class="font-medium mb-2">IP Configuration</h3>
                <dl class="grid grid-cols-1 gap-2 text-sm">
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Base Network:</dt>
                    <dd class="col-span-2">{{ labForm.ipSchema.baseNetwork }}/{{ labForm.ipSchema.subnetMask }}</dd>
                  </div>
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Strategy:</dt>
                    <dd class="col-span-2">{{ labForm.ipSchema.allocationStrategy }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Parts Summary -->
              <div>
                <h3 class="font-medium mb-2">Lab Parts ({{ labForm.parts.length }})</h3>
                <div class="space-y-2">
                  <div
                    v-for="(part, index) in labForm.parts"
                    :key="part.tempId"
                    class="flex items-center justify-between p-3 border rounded"
                  >
                    <div>
                      <span class="font-medium">{{ part.title || `Part ${index + 1}` }}</span>
                      <p class="text-sm text-muted-foreground">
                        {{ part.plays ? `Play: ${part.plays.name}` : 'No play configured' }}
                      </p>
                    </div>
                    <Badge :variant="part.plays ? 'default' : 'destructive'">
                      {{ part.plays ? 'Ready' : 'Missing Play' }}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Navigation -->
      <div class="flex items-center justify-between">
        <div>
          <Button
            v-if="currentStep > 1"
            variant="outline"
            :disabled="isSubmitting"
            @click="previousStep"
          >
            <ChevronLeft class="w-4 h-4 mr-1" />
            Previous
          </Button>
        </div>
        <div class="flex items-center space-x-2">
          <Button
            variant="outline"
            :disabled="isSubmitting"
            @click="saveDraft"
          >
            Save Draft
          </Button>
          <Button
            v-if="currentStep < steps.length"
            :disabled="isSubmitting"
            @click="nextStep"
          >
            Next
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
          <Button
            v-else
            :disabled="isSubmitting || !isLabValid"
            @click="submitLab"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            Create Lab
          </Button>
        </div>
      </div>
    </div>

    <!-- Play Creation Modal -->
    <PlayCreationModal
      v-model:open="showPlayCreationModal"
      :context-info="{
        course: courseId,
        labOrExam: 'Lab',
        part: currentPartIndex !== null ? `Part ${currentPartIndex + 1}` : '',
        scope: labForm.ipSchemaData?.scope || labForm.ipSchema?.scope || 'lab',
        availableDevices: availableDevices,
        availableDestinationDevices: availableDestinationDevices,
        partSpecific: labForm.ipSchemaData?.scope === 'part',
        currentPartConfig: currentPartIndex !== null && labForm.ipSchemaData?.scope === 'part' ? 
          labForm.parts[currentPartIndex.value] : null
      }"
      @play-created="handlePlayCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { 
  Home, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  Check, 
  Plus, 
  Trash2, 
  Loader2 
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

import TextEditor from '@/components/lab/TextEditor.vue'
import IPSchemaManager from '@/components/lab/IPSchemaManager.vue'
import PartSpecificIPManager from '@/components/lab/PartSpecificIPManager.vue'
import PlayCreationModal from '@/components/play/PlayCreationModal.vue'

import type { LabFormData, LabPart, IpSchema, DeviceIpMapping } from '@/types/lab'

// Route setup
const route = useRoute()
const router = useRouter()
const courseId = route.params.c_id as string

// Get course info for breadcrumb
const { currentCourse } = useCourse()
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId}`)

// Wizard steps
const steps = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'IP Configuration' }, 
  { id: 3, title: 'Lab Parts' },
  { id: 4, title: 'Review' }
]

const currentStep = ref(1)
const showValidation = ref(false)
const isSubmitting = ref(false)

// Form data
interface LabPartWithTemp extends Omit<LabPart, 'part_id'> {
  tempId: string
}

const labForm = reactive<LabFormData & { parts: LabPartWithTemp[]; ipSchemaData?: any; students?: any[]; partSpecificData?: any }>({
  title: '',
  description: '',
  type: 'lab',
  groupsRequired: false,
  ipSchema: undefined,
  deviceIpMapping: undefined,
  ipSchemaData: undefined,
  students: [],
  partSpecificData: undefined,
  parts: []
})

// Part management
const expandedParts = ref<Record<number, boolean>>({})
const currentPartIndex = ref<number | null>(null)
const showPlayCreationModal = ref(false)
const showDebugInfo = ref(true)

// Available devices for play creation
const availableDevices = computed(() => {
  const selectedScope = labForm.ipSchemaData?.scope || labForm.ipSchema?.scope
  
  if (selectedScope === 'lab') {
    // Lab-wide scope: use global device mapping
    if (!labForm.deviceIpMapping || labForm.deviceIpMapping.length === 0) {
      return []
    }
    
    return labForm.deviceIpMapping.map(device => ({
      value: device.deviceId,
      label: device.deviceId.charAt(0).toUpperCase() + device.deviceId.slice(1).replace(/[_-]/g, ' '),
      icon: getDeviceIcon(device.deviceId),
      isInternet: false
    }))
  } else if (selectedScope === 'part' && currentPartIndex.value !== null) {
    // Part-specific scope: use current part's device mapping
    const currentPart = labForm.parts[currentPartIndex.value]
    if (!currentPart?.deviceIpMapping || currentPart.deviceIpMapping.length === 0) {
      return []
    }
    
    return currentPart.deviceIpMapping.map(device => ({
      value: device.deviceId,
      label: device.deviceId.charAt(0).toUpperCase() + device.deviceId.slice(1).replace(/[_-]/g, ' '),
      icon: getDeviceIcon(device.deviceId),
      isInternet: false
    }))
  }
  
  return []
})

// Available destination devices (includes Internet option)
const availableDestinationDevices = computed(() => {
  const devices = [...availableDevices.value]
  
  // Add Internet as a special destination option
  devices.push({
    value: 'internet',
    label: 'Internet',
    icon: 'lucide:globe',
    isInternet: true
  })
  
  return devices
})

const getDeviceIcon = (deviceId: string): string => {
  const id = deviceId.toLowerCase()
  
  if (id.includes('router')) return 'lucide:router'
  if (id.includes('switch')) return 'lucide:network'
  if (id.includes('pc') || id.includes('computer')) return 'lucide:monitor'
  if (id.includes('phone') || id.includes('voip')) return 'lucide:phone'
  if (id.includes('printer')) return 'lucide:printer'
  if (id.includes('camera')) return 'lucide:camera'
  
  return 'lucide:cpu' // Default icon
}

const generateDevicesArray = (deviceMapping: any[], students: any[]): any[] => {
  // Generate devices array based on device mapping and students
  // This is a basic implementation - you may need to customize based on your IP generation logic
  return deviceMapping.map(device => ({
    id: device.deviceId,
    ip_address: generateExampleIP(device, students[0]?.studentId || '123'), // Use first student for example
    ansible_connection: getDefaultConnection(device.deviceId),
    credentials: getDefaultCredentials(device.deviceId),
    platform: getDevicePlatform(device.deviceId),
    jump_host: null,
    ssh_args: null,
    use_persistent_connection: false
  }))
}

const generateExampleIP = (device: any, studentId: string): string => {
  // Basic IP generation - you may want to use your existing IP generation logic
  if (labForm.ipSchema?.baseNetwork) {
    const baseNet = labForm.ipSchema.baseNetwork.split('.')
    const hostOffset = device.hostOffset || 10
    return `${baseNet[0]}.${baseNet[1]}.${parseInt(baseNet[2]) + 1}.${hostOffset}`
  }
  return `192.168.1.${device.hostOffset || 10}`
}

const getDefaultConnection = (deviceId: string): string => {
  const id = deviceId.toLowerCase()
  if (id.includes('router') || id.includes('switch')) {
    return 'ansible.netcommon.network_cli'
  }
  return 'ssh'
}

const getDefaultCredentials = (deviceId: string): any => {
  const id = deviceId.toLowerCase()
  if (id.includes('router') || id.includes('firewall')) {
    return {
      ansible_user: 'admin',
      ansible_password: 'admin123'
    }
  } else if (id.includes('server')) {
    return {
      ansible_user: 'ubuntu',
      ansible_password: 'server123'
    }
  }
  return {
    ansible_user: 'student',
    ansible_password: 'student123'
  }
}

const getDevicePlatform = (deviceId: string): string | null => {
  const id = deviceId.toLowerCase()
  if (id.includes('cisco') || id.includes('router')) {
    return 'cisco.ios.ios'
  }
  return null
}

// Comprehensive validation function
const validateLab = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // Basic information validation
  if (!labForm.title.trim()) {
    errors.push('Lab title is required')
  }
  
  // IP Schema validation based on scope
  const selectedScope = labForm.ipSchemaData?.scope || labForm.ipSchema?.scope
  
  if (selectedScope === 'lab') {
    // Lab-wide scope: require lab-level IP schema and device mapping
    if (!labForm.deviceIpMapping || labForm.deviceIpMapping.length < 2) {
      errors.push('At least 2 devices must be created in Device IP Mapping')
    }
    
    if (!labForm.students || labForm.students.length === 0) {
      errors.push('Student CSV is required before creating a Lab')
    }
  } else if (selectedScope === 'part') {
    // Part-specific scope: each part should have its own IP schema (validation will be done during part creation)
    // No lab-level IP schema validation required
  }
  
  // Parts validation
  if (labForm.parts.length === 0) {
    errors.push('At least one lab part must be created')
  } else {
    labForm.parts.forEach((part, index) => {
      if (!part.title.trim()) {
        errors.push(`Part ${index + 1}: Title is required`)
      }
      
      if (!part.textMd.trim()) {
        errors.push(`Part ${index + 1}: Content is required`)
      }
      
      if (!part.plays) {
        errors.push(`Part ${index + 1}: A play must be selected`)
      } else {
        // Validate that the selected play has tasks
        if (!part.plays.play_id && !part.plays.name) {
          errors.push(`Part ${index + 1}: Selected play is invalid`)
        }
      }
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validation
const isLabValid = computed(() => {
  const validation = validateLab()
  return validation.isValid
})

// Methods
const nextStep = () => {
  showValidation.value = true
  
  if (currentStep.value === 1) {
    if (!labForm.title.trim()) {
      toast.error('Lab title is required')
      return
    }
  }
  
  if (currentStep.value === 2) {
    // Validate based on IP schema scope
    const selectedScope = labForm.ipSchemaData?.scope || labForm.ipSchema?.scope
    
    if (selectedScope === 'lab') {
      // Lab-wide scope: validate IP schema configuration
      if (!labForm.deviceIpMapping || labForm.deviceIpMapping.length < 2) {
        toast.error('At least 2 devices must be created in Device IP Mapping to proceed')
        return
      }
      
      if (!labForm.students || labForm.students.length === 0) {
        toast.error('Student CSV must be uploaded before proceeding to lab parts')
        return
      }
    } else if (selectedScope === 'part') {
      // Part-specific scope: just ensure scope is selected
      toast.success('Part-specific scope selected. You can configure IP schemas for each part individually.')
    } else {
      // No scope selected
      toast.error('Please select an IP schema scope to proceed')
      return
    }
  }
  
  if (currentStep.value === 3) {
    if (labForm.parts.length === 0) {
      toast.error('Please add at least one lab part')
      return
    }
    
    const invalidParts = labForm.parts.filter(part => !part.title.trim() || !part.plays)
    if (invalidParts.length > 0) {
      toast.error('All parts must have a title and selected play')
      return
    }
  }
  
  currentStep.value++
}

const previousStep = () => {
  currentStep.value--
}

const addLabPart = () => {
  const newPart: LabPartWithTemp = {
    tempId: `temp-${Date.now()}`,
    title: `Part ${labForm.parts.length + 1}`,
    textMd: '',
    order: labForm.parts.length + 1,
    total_points: 0,
    ipSchema: null,
    deviceIpMapping: null,
    plays: null as any
  }
  
  labForm.parts.push(newPart)
  expandedParts.value[labForm.parts.length - 1] = true
}

const removeLabPart = (index: number) => {
  labForm.parts.splice(index, 1)
  delete expandedParts.value[index]
  
  // Reorder remaining parts
  labForm.parts.forEach((part, i) => {
    part.order = i + 1
  })
}

const togglePartExpanded = (index: number) => {
  expandedParts.value[index] = !expandedParts.value[index]
}

const openPlayModal = (partIndex: number) => {
  currentPartIndex.value = partIndex
  showPlayCreationModal.value = true
}

const clearPlay = (partIndex: number) => {
  labForm.parts[partIndex].plays = null as any
}

const handleIPSchemaUpdate = (data: any) => {
  if (data) {
    labForm.ipSchemaData = data
    labForm.ipSchema = data.ipSchema
    labForm.deviceIpMapping = data.deviceIpMapping
    labForm.students = data.students || []
  }
}

const handlePartSpecificUpdate = (data: any) => {
  labForm.partSpecificData = data
}

const handlePartUpdate = (partIndex: number, updates: any) => {
  if (labForm.parts[partIndex]) {
    // Update the part with new IP schema and device mapping
    labForm.parts[partIndex].ipSchema = updates.ipSchema
    labForm.parts[partIndex].deviceIpMapping = updates.deviceIpMapping
    
    // Update available devices for play creation
    updateAvailableDevicesForPart(partIndex)
  }
}

const updateAvailableDevicesForPart = (partIndex: number) => {
  // This will be used to update available devices for play creation in this specific part
  // The play creation modal will need to use part-specific devices
}

const updatePartContent = (partIndex: number, content: string) => {
  if (labForm.parts[partIndex]) {
    labForm.parts[partIndex].textMd = content
  }
}

const updatePartTitle = (partIndex: number, title: string) => {
  if (labForm.parts[partIndex]) {
    labForm.parts[partIndex].title = title
  }
}

const handlePlayCreated = (play: any) => {
  if (currentPartIndex.value !== null) {
    labForm.parts[currentPartIndex.value].plays = {
      play_id: play.id || play.play_id,
      name: play.name,
      description: play.description || '',
      source_device: play.source_device || '',
      target_device: play.target_device || '',
      total_points: play.total_points || 0,
      ansible_tasks: play.ansible_tasks || []
    }
  }
  currentPartIndex.value = null
}

const saveDraft = async () => {
  // Validate lab name requirement for draft saving
  if (!labForm.title.trim()) {
    toast.error('Lab name is required to save draft')
    return
  }
  
  toast.success('Draft saved locally')
}

const submitLab = async () => {
  console.group('🔍 LAB SUBMISSION DEBUG')
  
  const validation = validateLab()
  
  console.log('📋 Validation Check:', {
    isValid: validation.isValid,
    errors: validation.errors,
    timestamp: new Date().toISOString()
  })
  
  if (!validation.isValid) {
    // Show detailed error messages for unmet requirements
    const errorMessage = validation.errors.length > 1 
      ? `Please fix the following issues:\n• ${validation.errors.join('\n• ')}`
      : validation.errors[0]
    
    console.error('❌ Validation Failed:', validation.errors)
    toast.error(errorMessage)
    console.groupEnd()
    return
  }

  console.log('✅ Validation Passed - Preparing submission data...')
  
  // Log raw form data
  console.log('📝 Raw Form Data:', {
    basic: {
      title: labForm.title,
      description: labForm.description,
      type: labForm.type,
      groupsRequired: labForm.groupsRequired,
      courseId: courseId
    },
    ipSchema: labForm.ipSchema,
    deviceIpMapping: labForm.deviceIpMapping,
    students: labForm.students,
    parts: labForm.parts.map(p => ({
      title: p.title,
      hasContent: !!p.textMd?.trim(),
      contentLength: p.textMd?.length || 0,
      hasPlay: !!p.plays,
      playId: p.plays?.play_id,
      playTitle: p.plays?.name
    }))
  })

  isSubmitting.value = true
  
  try {
    // Transform the form data to match the expected API format
    const selectedScope = labForm.ipSchemaData?.scope || labForm.ipSchema?.scope
    
    const labData = {
      title: labForm.title,
      type: labForm.type,
      description: labForm.description,
      courseId: courseId,
      groupsRequired: labForm.groupsRequired,
      ...(selectedScope === 'lab' && {
        ipSchema: {
          ...labForm.ipSchema,
          reservedSubnets: labForm.ipSchema?.reservedSubnets || []
        },
        deviceIpMapping: labForm.deviceIpMapping,
        devices: generateDevicesArray(labForm.deviceIpMapping || [], labForm.students || [])
      }),
      parts: labForm.parts.map((part, index) => ({
        part_id: `part${index + 1}`,
        title: part.title,
        textMd: part.textMd,
        order: index + 1,
        total_points: part.total_points,
        ...(selectedScope === 'part' && {
          ipSchema: part.ipSchema || {
            scope: 'part',
            baseNetwork: '192.168.1.0',
            subnetMask: 24,
            allocationStrategy: 'group_based',
            variablesMapping: []
          },
          deviceIpMapping: part.deviceIpMapping || []
        }),
        play: part.plays || null // Note: singular 'play' not 'plays'
      }))
    }

    // Detailed submission data logging
    console.log('🚀 Final Submission Data:', labData)
    console.log('📊 Data Summary:', {
      title: labData.title,
      type: labData.type,
      courseId: labData.courseId,
      deviceCount: labData.deviceIpMapping?.length || 0,
      studentCount: labData.students?.length || 0,
      partCount: labData.parts?.length || 0,
      totalPoints: labData.parts?.reduce((sum, part) => sum + (part.total_points || 0), 0) || 0,
      hasIPSchema: !!labData.ipSchema,
      submissionTime: new Date().toISOString()
    })

    // TODO: Make API call to create lab
    console.log('📡 Sending to backend...')
    
    toast.success('Lab created successfully!')
    console.log('✅ Lab creation successful!')
    router.push(`/courses/${courseId}/labs`)
    
  } catch (error) {
    console.error('❌ Failed to create lab:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    toast.error('Failed to create lab. Please try again.')
  } finally {
    isSubmitting.value = false
    console.groupEnd()
  }
}

// Initialize with at least one part
onMounted(() => {
  addLabPart()
})
</script>

<style>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  height: 384px; /* h-96 */
  opacity: 1;
}
</style>