<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader class="pb-4">
        <DialogTitle class="flex items-center text-xl">
          <Icon name="lucide:play-circle" class="w-6 h-6 mr-3 text-primary" />
          {{ isEditing ? 'Edit Play' : 'Create New Play' }}
        </DialogTitle>
        <DialogDescription>
          Design automated tasks for {{ contextInfo.course }} → {{ contextInfo.labOrExam }} → {{ contextInfo.part }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 flex overflow-hidden">
        <!-- Left Panel - Play Configuration -->
        <div class="w-1/3 border-r border-border pr-6 overflow-y-auto">
          <div class="space-y-6">
            <!-- Play Header -->
            <PlayHeader :context-info="contextInfo" />

            <!-- Play Details -->
            <Card>
              <CardHeader>
                <CardTitle class="text-base">Play Details</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <!-- Play Name -->
                <div class="space-y-2">
                  <Label for="play-name">Play Name *</Label>
                  <Input
                    id="play-name"
                    :model-value="playData.name"
                    placeholder="e.g., Ping Test PC1 → PC2"
                    :class="{ 'border-destructive': !playData.name.trim() }"
                    @update:model-value="updatePlay({ name: $event })"
                  />
                </div>

                <!-- Description -->
                <div class="space-y-2">
                  <Label for="play-description">Description</Label>
                  <Textarea
                    id="play-description"
                    :model-value="playData.description || ''"
                    placeholder="Describe what this play tests..."
                    rows="3"
                    @update:model-value="updatePlay({ description: $event })"
                  />
                </div>

                <!-- Source Device -->
                <div class="space-y-2">
                  <Label for="source-device">Source Device *</Label>
                  <Select v-model:model-value="sourceDevice">
                    <SelectTrigger id="source-device">
                      <SelectValue placeholder="Select source device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Devices</SelectLabel>
                        <SelectItem 
                          v-for="device in availableDevices" 
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
                    Device that will execute the tasks
                  </p>
                </div>

                <!-- Target Device (Optional) -->
                <div class="space-y-2">
                  <Label for="target-device">Target Device</Label>
                  <Select v-model:model-value="targetDevice">
                    <SelectTrigger id="target-device">
                      <SelectValue placeholder="Select target device (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Devices</SelectLabel>
                        <SelectItem value="">
                          <span class="italic text-muted-foreground">No target device</span>
                        </SelectItem>
                        <SelectItem 
                          v-for="device in availableDevices" 
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
                    Primary target for testing (if applicable)
                  </p>
                </div>
              </CardContent>
            </Card>

            <!-- Play Statistics -->
            <div class="bg-muted/50 rounded-lg p-4">
              <h4 class="font-medium mb-3 flex items-center">
                <Icon name="lucide:bar-chart-3" class="w-4 h-4 mr-2" />
                Play Statistics
              </h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold text-primary">{{ playData.tasks.length }}</div>
                  <div class="text-muted-foreground">Tasks</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-primary">{{ totalPoints }}</div>
                  <div class="text-muted-foreground">Total Points</div>
                </div>
              </div>
            </div>

            <!-- Validation Status -->
            <Alert v-if="validationResult && !validationResult.isValid" variant="destructive">
              <AlertCircle class="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul class="list-disc list-inside space-y-1 mt-2">
                  <li v-for="error in validationResult.errors" :key="error" class="text-sm">
                    {{ error }}
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <!-- Right Panel - Task Management -->
        <div class="flex-1 pl-6 flex flex-col overflow-hidden">
          <!-- Task List Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Tasks</h3>
            <Button 
              :disabled="!canAddTask"
              @click="openTaskModal()"
            >
              <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>

          <!-- Task List -->
          <div class="flex-1 overflow-hidden">
            <TaskList
              :tasks="playData.tasks"
              :current-task-index="currentTaskIndex"
              :available-devices="availableDevices"
              @select:task="selectTask"
              @edit:task="openTaskModal"
              @duplicate:task="duplicateTask"
              @remove:task="removeTask"
              @reorder:tasks="reorderTasks"
            />
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <DialogFooter class="pt-4 border-t">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center space-x-4">
            <!-- Auto-save indicator -->
            <div v-if="hasUnsavedChanges" class="flex items-center space-x-2 text-sm text-muted-foreground">
              <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"/>
              <span>Auto-saving...</span>
            </div>
            <div v-else class="flex items-center space-x-2 text-sm text-muted-foreground">
              <div class="w-2 h-2 bg-green-500 rounded-full"/>
              <span>Saved</span>
            </div>

            <!-- Import/Export -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="sm">
                  <Icon name="lucide:more-horizontal" class="w-4 h-4 mr-2" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem @click="exportPlay">
                  <Icon name="lucide:download" class="w-4 h-4 mr-2" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem @click="showImportDialog = true">
                  <Icon name="lucide:upload" class="w-4 h-4 mr-2" />
                  Import JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="text-destructive" @click="resetPlay">
                  <Icon name="lucide:trash-2" class="w-4 h-4 mr-2" />
                  Reset Play
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div class="flex items-center space-x-3">
            <Button 
              variant="outline" 
              @click="closeModal"
            >
              Cancel
            </Button>
            <Button 
              :disabled="!canSave"
              @click="savePlay"
            >
              <Icon v-if="isSaving" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
              <Icon v-else name="lucide:save" class="w-4 h-4 mr-2" />
              {{ isEditing ? 'Update Play' : 'Create Play' }}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>

    <!-- Task Creation/Edit Modal -->
    <TaskCreationModal
      v-model:open="showTaskModal"
      :task-data="currentTaskData"
      :available-devices="availableDevices"
      :is-editing="isEditingTask"
      @save:task="handleTaskSave"
    />

    <!-- Import Dialog -->
    <Dialog v-model:open="showImportDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Play</DialogTitle>
          <DialogDescription>
            Import play configuration from JSON
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <Textarea
            v-model="importData"
            placeholder="Paste JSON data here..."
            rows="6"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showImportDialog = false">
            Cancel
          </Button>
          <Button :disabled="!importData.trim()" @click="importPlay">
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Dialog>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import PlayHeader from './PlayHeader.vue'
import TaskList from './TaskList.vue'
import TaskCreationModal from './TaskCreationModal.vue'
import type { PlayFormData, TaskFormData } from '@/types/lab'

// Props
interface Props {
  open: boolean
  contextInfo: {
    course: string
    labOrExam: string
    part: string
    availableDevices?: Array<{ value: string; label: string; icon: string }>
  }
  initialData?: PlayFormData
  isEditing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  isEditing: false,
  initialData: undefined
})

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'save:play': [data: PlayFormData]
  'cancel': []
}>()

// Composables
const playCreation = usePlayCreation()
const {
  playData,
  currentTaskIndex,
  totalPoints,
  isValidPlay,
  hasUnsavedChanges,
  updatePlay,
  addTask,
  updateTask,
  removeTask,
  duplicateTask,
  reorderTasks,
  selectTask,
  resetPlay: resetPlayData,
  loadPlay,
  validatePlay,
  exportToJSON,
  importFromJSON
} = playCreation

// Reactive state
const showTaskModal = ref(false)
const showImportDialog = ref(false)
const isEditingTask = ref(false)
const currentTaskData = ref<TaskFormData | null>(null)
const isSaving = ref(false)
const importData = ref('')

// Computed
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const availableDevices = computed(() => {
  return props.contextInfo.availableDevices || [
    { value: 'pc1', label: 'PC 1', icon: 'lucide:monitor' },
    { value: 'pc2', label: 'PC 2', icon: 'lucide:monitor' },
    { value: 'router1', label: 'Router 1', icon: 'lucide:router' },
    { value: 'switch1', label: 'Switch 1', icon: 'lucide:network' },
    { value: 'server1', label: 'Server 1', icon: 'lucide:server' }
  ]
})

const sourceDevice = computed({
  get: () => playData.value.source_device,
  set: (value) => updatePlay({ source_device: value })
})

const targetDevice = computed({
  get: () => playData.value.target_device || '',
  set: (value) => updatePlay({ target_device: value || undefined })
})

const canAddTask = computed(() => {
  return playData.value.source_device.trim() !== ''
})

const canSave = computed(() => {
  return isValidPlay.value && !isSaving.value
})

const validationResult = computed(() => validatePlay())

// Methods
const openTaskModal = (taskIndex?: number) => {
  if (taskIndex !== undefined) {
    // Edit existing task
    isEditingTask.value = true
    currentTaskData.value = { ...playData.value.tasks[taskIndex] }
    selectTask(taskIndex)
  } else {
    // Create new task
    isEditingTask.value = false
    currentTaskData.value = null
  }
  showTaskModal.value = true
}

const handleTaskSave = (taskData: TaskFormData) => {
  if (isEditingTask.value && currentTaskIndex.value >= 0) {
    updateTask(currentTaskIndex.value, taskData)
  } else {
    addTask(taskData)
  }
  showTaskModal.value = false
}

const savePlay = async () => {
  if (!canSave.value) return

  isSaving.value = true
  try {
    // Emit save event with play data
    emit('save:play', { ...playData.value })
    toast.success('Play saved successfully!')
    closeModal()
  } catch (error) {
    console.error('Failed to save play:', error)
    toast.error('Failed to save play')
  } finally {
    isSaving.value = false
  }
}

const closeModal = () => {
  if (hasUnsavedChanges.value) {
    // Could show confirmation dialog here
    const shouldClose = confirm('You have unsaved changes. Are you sure you want to close?')
    if (!shouldClose) return
  }
  
  emit('update:open', false)
  emit('cancel')
}

const resetPlay = () => {
  const shouldReset = confirm('Are you sure you want to reset the play? All changes will be lost.')
  if (shouldReset) {
    resetPlayData()
    toast.info('Play reset successfully')
  }
}

const exportPlay = () => {
  const jsonData = exportToJSON()
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${playData.value.name || 'untitled'}-play.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('Play exported successfully')
}

const importPlay = () => {
  try {
    const success = importFromJSON(importData.value)
    if (success) {
      toast.success('Play imported successfully')
      showImportDialog.value = false
      importData.value = ''
    } else {
      toast.error('Invalid JSON format')
    }
  } catch (error) {
    toast.error('Failed to import play')
  }
}

// Initialize play data when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.initialData) {
      loadPlay(props.initialData)
    } else if (playData.value.name === '' && playData.value.tasks.length === 0) {
      // Initialize with default values only if completely empty
      resetPlayData()
    }
  }
})

// Auto-save functionality
let autoSaveTimeout: NodeJS.Timeout
watch(hasUnsavedChanges, (hasChanges) => {
  if (hasChanges) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(() => {
      // Auto-save to localStorage
      playCreation.saveToLocalStorage()
    }, 2000)
  }
})

onUnmounted(() => {
  clearTimeout(autoSaveTimeout)
})
</script>