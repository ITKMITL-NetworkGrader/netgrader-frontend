<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center text-xl">
          <Play class="w-6 h-6 mr-3 text-primary" />
          Create New Play
        </DialogTitle>
        <DialogDescription>
          Create a new play for {{ contextInfo.course }} → {{ contextInfo.labOrExam }} → {{ contextInfo.part }}
        </DialogDescription>
      </DialogHeader>

      <!-- Progress Steps -->
      <div class="mb-6 px-6 py-3 border-b">
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

      <div class="flex-1 overflow-y-auto px-6 space-y-6">
        <!-- Step 1: Basic Info -->
        <div v-if="currentStep === 1" class="space-y-6">
          <!-- Play Name -->
          <div class="space-y-2">
            <Label for="play-name">Play Name *</Label>
            <Input
              id="play-name"
              v-model="playForm.name"
              placeholder="e.g., Network Connectivity Test"
              :class="{ 'border-destructive': showValidation && !playForm.name.trim() }"
              @blur="validateStep1"
            />
            <p v-if="showValidation && !playForm.name.trim()" class="text-sm text-destructive">
              Play name is required
            </p>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <Label for="play-description">Description (Optional)</Label>
            <Textarea
              id="play-description"
              v-model="playForm.description"
              placeholder="Describe what this play will test..."
              rows="3"
            />
          </div>

          <!-- Source Device -->
          <div class="space-y-2">
            <Label for="source-device">Source Device *</Label>
            <Select v-model:model-value="playForm.source_device">
              <SelectTrigger id="source-device">
                <SelectValue placeholder="Select the device that will execute tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Available Devices</SelectLabel>
                  <SelectItem
                    v-for="device in contextInfo.availableDevices"
                    :key="device.value"
                    :value="device.value"
                  >
                    <div class="flex items-center space-x-2">
                      <Icon :name="device.icon" class="w-4 h-4" />
                      <span>{{ device.label }}</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              The device that will run the automated tasks (usually a router or PC)
            </p>
          </div>

          <!-- Target Device (Optional) -->
          <div class="space-y-2">
            <Label for="target-device">Target Device (Optional)</Label>
            <Select v-model:model-value="playForm.target_device">
              <SelectTrigger id="target-device">
                <SelectValue placeholder="Select target device (if applicable)" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Available Devices</SelectLabel>
                  <SelectItem value="">None (tasks will specify targets)</SelectItem>
                  <SelectItem
                    v-for="device in contextInfo.availableDevices.filter(d => d.value !== playForm.source_device)"
                    :key="device.value"
                    :value="device.value"
                  >
                    <div class="flex items-center space-x-2">
                      <Icon :name="device.icon" class="w-4 h-4" />
                      <span>{{ device.label }}</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Optional default target for tasks (can be overridden in individual tasks)
            </p>
          </div>
        </div>

        <!-- Step 2: Tasks -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold">Configure Tasks</h3>
              <p class="text-muted-foreground">Add automated tasks to test network functionality</p>
            </div>
            <Button @click="openTaskModal">
              <Plus class="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>

          <!-- Empty State -->
          <div v-if="playForm.tasks.length === 0" class="text-center py-12 border-2 border-dashed border-muted rounded-lg">
            <Icon name="lucide:clipboard-list" class="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h4 class="text-lg font-medium mb-2">No tasks configured</h4>
            <p class="text-muted-foreground mb-4">Add tasks to define what this play will test</p>
            <Button @click="openTaskModal">
              <Plus class="w-4 h-4 mr-2" />
              Add Your First Task
            </Button>
          </div>

          <!-- Tasks List -->
          <div v-else class="space-y-4">
            <div
              v-for="(task, index) in playForm.tasks"
              :key="index"
              class="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <Icon :name="getTaskIcon(task.template_name)" class="w-5 h-5 text-primary" />
                    <h4 class="font-medium">{{ task.name }}</h4>
                    <Badge variant="secondary">{{ task.points }} points</Badge>
                  </div>
                  <p class="text-sm text-muted-foreground mb-3">Template: {{ getTemplateName(task.template_name) }}</p>
                  
                  <!-- Parameters -->
                  <div class="space-y-1">
                    <div
                      v-for="(value, key) in task.parameters"
                      :key="key"
                      class="text-xs font-mono bg-muted/50 px-2 py-1 rounded"
                    >
                      {{ key }}: <code>{{ value }}</code>
                    </div>
                  </div>
                  
                  <!-- Test Cases -->
                  <div class="mt-2">
                    <span class="text-xs text-muted-foreground">{{ task.test_cases.length }} test case(s)</span>
                  </div>
                </div>
                
                <div class="flex items-center space-x-2 ml-4">
                  <Button variant="outline" size="sm" @click="editTask(index)">
                    <Pencil class="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" class="text-destructive hover:text-destructive" @click="removeTask(index)">
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Review -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold mb-4">Review Play Configuration</h3>
          </div>

          <!-- Basic Info Review -->
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <div class="grid grid-cols-3 text-sm">
                <span class="text-muted-foreground">Name:</span>
                <span class="col-span-2 font-medium">{{ playForm.name }}</span>
              </div>
              <div v-if="playForm.description" class="grid grid-cols-3 text-sm">
                <span class="text-muted-foreground">Description:</span>
                <span class="col-span-2">{{ playForm.description }}</span>
              </div>
              <div class="grid grid-cols-3 text-sm">
                <span class="text-muted-foreground">Source Device:</span>
                <span class="col-span-2 font-medium">{{ getDeviceLabel(playForm.source_device) }}</span>
              </div>
              <div v-if="playForm.target_device" class="grid grid-cols-3 text-sm">
                <span class="text-muted-foreground">Target Device:</span>
                <span class="col-span-2 font-medium">{{ getDeviceLabel(playForm.target_device) }}</span>
              </div>
              <div class="grid grid-cols-3 text-sm">
                <span class="text-muted-foreground">Total Points:</span>
                <span class="col-span-2 font-bold text-primary">{{ totalPoints }}</span>
              </div>
            </CardContent>
          </Card>

          <!-- Tasks Review -->
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Tasks ({{ playForm.tasks.length }})</CardTitle>
            </CardHeader>
            <CardContent>
              <div v-if="playForm.tasks.length === 0" class="text-center text-muted-foreground py-4">
                No tasks configured
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="(task, index) in playForm.tasks"
                  :key="index"
                  class="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <div class="font-medium">{{ task.name }}</div>
                    <div class="text-sm text-muted-foreground">{{ getTemplateName(task.template_name) }}</div>
                  </div>
                  <Badge variant="secondary">{{ task.points }} points</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Navigation Footer -->
      <DialogFooter class="p-6 border-t">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center space-x-2">
            <Button
              v-if="currentStep > 1"
              variant="outline"
              :disabled="isCreating"
              @click="previousStep"
            >
              <ChevronLeft class="w-4 h-4 mr-1" />
              Previous
            </Button>
          </div>
          
          <div class="flex items-center space-x-3">
            <Button variant="outline" @click="handleCancel" :disabled="isCreating">
              Cancel
            </Button>
            <Button
              v-if="currentStep < steps.length"
              :disabled="!canProceedToNext"
              @click="nextStep"
            >
              Next
              <ChevronRight class="w-4 h-4 ml-1" />
            </Button>
            <Button
              v-else
              :disabled="!canCreatePlay || isCreating"
              @click="handleCreate"
            >
              <Loader2 v-if="isCreating" class="w-4 h-4 mr-2 animate-spin" />
              Create Play
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>

    <!-- Task Creation Modal -->
    <TaskCreationModal
      v-model:open="showTaskModal"
      :task-data="editingTask"
      :available-devices="contextInfo.availableDevices"
      :is-editing="isEditingTask"
      @save:task="handleTaskSaved"
    />
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { toast } from 'vue-sonner'
import { 
  Play, 
  Loader2, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Pencil, 
  Trash2 
} from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import TaskCreationModal from './TaskCreationModal.vue'
import type { PlayFormData, TaskFormData } from '@/types/lab'

interface ContextInfo {
  course: string
  labOrExam: string
  part: string
  availableDevices: Array<{ value: string; label: string; icon: string }>
}

interface Props {
  open: boolean
  contextInfo: ContextInfo
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'play-created', play: { name: string; description?: string; source_device: string; target_device?: string; tasks: TaskFormData[]; total_points: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const { templates, getTemplateById } = useTaskTemplates()

// Wizard steps
const steps = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'Tasks' },
  { id: 3, title: 'Review' }
]

// Form state
const currentStep = ref(1)
const showValidation = ref(false)
const isCreating = ref(false)

const playForm = ref<PlayFormData>({
  name: '',
  description: '',
  source_device: '',
  target_device: '',
  tasks: []
})

// Task modal state
const showTaskModal = ref(false)
const editingTask = ref<TaskFormData | null>(null)
const editingTaskIndex = ref<number | null>(null)
const isEditingTask = computed(() => editingTask.value !== null)

// Computed properties
const totalPoints = computed(() => {
  return playForm.value.tasks.reduce((sum, task) => sum + task.points, 0)
})

const canProceedToNext = computed(() => {
  if (currentStep.value === 1) {
    return playForm.value.name.trim() !== '' && playForm.value.source_device !== ''
  }
  return true
})

const canCreatePlay = computed(() => {
  return playForm.value.name.trim() !== '' && 
         playForm.value.source_device !== '' &&
         playForm.value.tasks.length > 0
})

// Methods
const nextStep = () => {
  showValidation.value = true
  
  if (canProceedToNext.value) {
    currentStep.value++
    showValidation.value = false
  } else {
    if (currentStep.value === 1) {
      toast.error('Please fill in all required fields')
    }
  }
}

const previousStep = () => {
  currentStep.value--
  showValidation.value = false
}

const validateStep1 = () => {
  showValidation.value = true
}

const openTaskModal = () => {
  editingTask.value = null
  editingTaskIndex.value = null
  showTaskModal.value = true
}

const editTask = (index: number) => {
  editingTask.value = { ...playForm.value.tasks[index] }
  editingTaskIndex.value = index
  showTaskModal.value = true
}

const removeTask = (index: number) => {
  playForm.value.tasks.splice(index, 1)
  toast.success('Task removed')
}

const handleTaskSaved = (taskData: TaskFormData) => {
  if (isEditingTask.value && editingTaskIndex.value !== null) {
    // Update existing task
    playForm.value.tasks[editingTaskIndex.value] = { ...taskData }
    toast.success('Task updated')
  } else {
    // Add new task
    playForm.value.tasks.push({ ...taskData })
    toast.success('Task added')
  }
  
  editingTask.value = null
  editingTaskIndex.value = null
}

const getDeviceLabel = (deviceValue: string): string => {
  const device = props.contextInfo.availableDevices.find(d => d.value === deviceValue)
  return device?.label || deviceValue
}

const getTemplateName = (templateId: string): string => {
  const template = getTemplateById(templateId)
  return template?.name || templateId
}

const getTaskIcon = (templateId: string): string => {
  const template = getTemplateById(templateId)
  const name = template?.name.toLowerCase() || ''
  
  if (name.includes('ping')) return 'lucide:radar'
  if (name.includes('traceroute')) return 'lucide:route'
  if (name.includes('ssh')) return 'lucide:terminal'
  if (name.includes('telnet')) return 'lucide:phone'
  if (name.includes('http')) return 'lucide:globe'
  if (name.includes('port')) return 'lucide:network'
  if (name.includes('dns')) return 'lucide:search'
  if (name.includes('config')) return 'lucide:settings'
  
  return 'lucide:play'
}

const resetForm = () => {
  playForm.value = {
    name: '',
    description: '',
    source_device: '',
    target_device: '',
    tasks: []
  }
  currentStep.value = 1
  showValidation.value = false
  editingTask.value = null
  editingTaskIndex.value = null
}

const handleCancel = () => {
  emit('update:open', false)
}

const handleCreate = async () => {
  if (!canCreatePlay.value) {
    toast.error('Please complete all required fields and add at least one task')
    return
  }

  isCreating.value = true
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newPlay = {
      name: playForm.value.name.trim(),
      description: playForm.value.description.trim() || undefined,
      source_device: playForm.value.source_device,
      target_device: playForm.value.target_device || undefined,
      tasks: playForm.value.tasks,
      total_points: totalPoints.value,
      // Generate a temporary ID for the play
      id: `play_${Date.now()}`,
      play_id: `play_${Date.now()}`
    }

    emit('play-created', newPlay)
    emit('update:open', false)
    toast.success('Play created successfully!')
  } catch (error) {
    console.error('Failed to create play:', error)
    toast.error('Failed to create play. Please try again.')
  } finally {
    isCreating.value = false
  }
}

// Reset form when modal opens/closes
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    resetForm()
  }
})
</script>