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
                <Label for="lab-description">Description *</Label>
                <Textarea
                  id="lab-description"
                  v-model="labForm.description"
                  placeholder="Describe what students will learn and accomplish in this lab"
                  rows="4"
                  class="mt-1"
                  :class="{ 'border-destructive': showValidation && !labForm.description.trim() }"
                />
                <p v-if="showValidation && !labForm.description.trim()" class="text-sm text-destructive mt-1">
                  Lab description is required
                </p>
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
            <IPSchemaManager
              v-model:schema="labForm.ipSchema"
              v-model:device-mapping="labForm.deviceIpMapping"
              :show-validation="showValidation"
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
                        {{ part.selectedPlay ? `Play: ${part.selectedPlay.title}` : 'No play selected' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Badge
                      :variant="part.selectedPlay ? 'default' : 'destructive'"
                    >
                      {{ part.selectedPlay ? 'Configured' : 'Needs Play' }}
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
                        :selected-play="part.selectedPlay"
                        :show-validation="showValidation"
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
            <h2 class="text-xl font-semibold mb-4">Review Lab</h2>
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
                        {{ part.selectedPlay ? `Play: ${part.selectedPlay.title}` : 'No play configured' }}
                      </p>
                    </div>
                    <Badge :variant="part.selectedPlay ? 'default' : 'destructive'">
                      {{ part.selectedPlay ? 'Ready' : 'Missing Play' }}
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
        availableDevices: availableDevices
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
  selectedPlay?: { id: string; title: string; description: string } | null
}

const labForm = reactive<LabFormData & { parts: LabPartWithTemp[] }>({
  title: '',
  description: '',
  type: 'lab',
  groupsRequired: false,
  ipSchema: undefined,
  deviceIpMapping: undefined,
  parts: []
})

// Part management
const expandedParts = ref<Record<number, boolean>>({})
const currentPartIndex = ref<number | null>(null)
const showPlayCreationModal = ref(false)

// Available devices for play creation
const availableDevices = computed(() => {
  if (!labForm.deviceIpMapping || labForm.deviceIpMapping.length === 0) {
    return []
  }
  
  return labForm.deviceIpMapping.map(device => ({
    value: device.deviceId,
    label: device.deviceId.charAt(0).toUpperCase() + device.deviceId.slice(1).replace(/[_-]/g, ' '),
    icon: getDeviceIcon(device.deviceId)
  }))
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

// Validation
const isLabValid = computed(() => {
  return labForm.title.trim() && 
         labForm.description.trim() && 
         labForm.parts.length > 0 &&
         labForm.parts.every(part => part.title.trim() && part.selectedPlay)
})

// Methods
const nextStep = () => {
  showValidation.value = true
  
  if (currentStep.value === 1) {
    if (!labForm.title.trim() || !labForm.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
  }
  
  if (currentStep.value === 3) {
    if (labForm.parts.length === 0) {
      toast.error('Please add at least one lab part')
      return
    }
    
    const invalidParts = labForm.parts.filter(part => !part.title.trim() || !part.selectedPlay)
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
    plays: [],
    selectedPlay: null
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
  labForm.parts[partIndex].selectedPlay = null
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
    labForm.parts[currentPartIndex.value].selectedPlay = {
      id: play.id || play.play_id,
      title: play.name,
      description: play.description || ''
    }
  }
  currentPartIndex.value = null
}

const saveDraft = async () => {
  toast.success('Draft saved locally')
}

const submitLab = async () => {
  if (!isLabValid.value) {
    toast.error('Please complete all required fields and configurations')
    return
  }

  isSubmitting.value = true
  
  try {
    // Transform the form data to match the expected API format
    const labData = {
      ...labForm,
      parts: labForm.parts.map((part, index) => ({
        title: part.title,
        textMd: part.textMd,
        order: index + 1,
        total_points: part.total_points,
        ipSchema: part.ipSchema,
        deviceIpMapping: part.deviceIpMapping,
        plays: part.selectedPlay ? [{
          play_id: part.selectedPlay.id,
          name: part.selectedPlay.title,
          description: part.selectedPlay.description,
          source_device: '',
          target_device: '',
          total_points: part.total_points,
          ansible_tasks: []
        }] : []
      }))
    }

    // TODO: Make API call to create lab
    console.log('Creating lab:', labData)
    
    toast.success('Lab created successfully!')
    router.push(`/courses/${courseId}/labs`)
    
  } catch (error) {
    console.error('Failed to create lab:', error)
    toast.error('Failed to create lab. Please try again.')
  } finally {
    isSubmitting.value = false
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