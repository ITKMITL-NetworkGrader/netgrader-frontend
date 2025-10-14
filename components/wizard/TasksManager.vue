<template>
  <div class="space-y-4">
    <!-- Tasks Header -->
    <div class="flex items-center justify-between">
      <Label class="text-sm font-medium">
        Tasks <span class="text-destructive">*</span>
        <span class="text-muted-foreground font-normal">(Minimum 1 task required)</span>
      </Label>
      <Button @click="addTask" variant="outline" size="sm">
        <Plus class="w-4 h-4 mr-2" />
        Add Task
      </Button>
    </div>

    <!-- Empty State -->
    <div v-if="localTasks.length === 0" class="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
      <CheckSquare class="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
      <h4 class="font-medium mb-2">No tasks configured</h4>
      <p class="text-sm text-muted-foreground mb-4">
        Add your first task to define what students need to accomplish
      </p>
      <Button @click="addTask" variant="outline" size="sm">
        <Plus class="w-4 h-4 mr-2" />
        Add Task
      </Button>
    </div>

    <!-- Tasks List -->
    <div v-else class="space-y-4">
      <TransitionGroup name="task" tag="div" class="space-y-4">
        <Card
          v-for="(task, taskIndex) in localTasks"
          :key="task.tempId"
          :class="{
            'border-destructive': hasTaskErrors(taskIndex),
            'border-green-500': !hasTaskErrors(taskIndex) && isTaskValid(task)
          }"
        >
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base flex items-center">
                <CheckSquare class="w-4 h-4 mr-2 text-green-600" />
                Task {{ taskIndex + 1 }}
                <Badge v-if="task.taskId" variant="secondary" class="ml-2 text-xs">
                  {{ task.taskId }}
                </Badge>
                <Badge v-if="task.points > 0" variant="outline" class="ml-2 text-xs">
                  {{ task.points }} pts
                </Badge>
              </CardTitle>
              <div class="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  @click="toggleTaskExpansion(taskIndex)"
                >
                  <ChevronDown
                    :class="{ 'transform rotate-180': task.isExpanded }"
                    class="w-4 h-4 transition-transform"
                  />
                </Button>
                <Button
                  variant="ghost"
                  @click="moveTask(taskIndex, -1)"
                  :disabled="taskIndex === 0"
                >
                  <MoveUp class="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  @click="moveTask(taskIndex, 1)"
                  :disabled="taskIndex === localTasks.length - 1"
                >
                  <MoveDown class="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  @click="removeTask(taskIndex)"
                  class="text-destructive hover:text-destructive"
                >
                  <Trash2 class="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <Collapsible v-model:open="task.isExpanded">
            <CollapsibleContent>
              <CardContent class="space-y-4">
                <!-- Task Basic Info -->
                <div class="space-y-4">
                  <!-- Task Name -->
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">
                      Task Name <span class="text-destructive">*</span>
                    </Label>
                    <Input
                      v-model="task.name"
                      placeholder="Configure Hostname, Set IP Address"
                      :class="{
                        'border-destructive': hasTaskFieldError(taskIndex, 'name'),
                        'border-green-500': !hasTaskFieldError(taskIndex, 'name') && task.name.length > 0
                      }"
                      @input="handleTaskNameChange(taskIndex, $event.target.value)"
                    />
                    <div v-if="task.taskId" class="text-xs text-muted-foreground">
                      Task ID will be: <code class="bg-muted px-1 py-0.5 rounded text-xs">{{ task.taskId }}</code>
                    </div>
                    <p v-if="hasTaskFieldError(taskIndex, 'name')" class="text-xs text-destructive">
                      {{ getTaskFieldError(taskIndex, 'name') }}
                    </p>
                  </div>
                </div>

                <!-- Description -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">
                    Description <span class="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    v-model="task.description"
                    placeholder="Optional description for this task..."
                    rows="2"
                  />
                </div>

                <!-- Task Template Selection -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">
                    Task Template <span class="text-destructive">*</span>
                  </Label>
                  <Select 
                    v-model="task.templateId"
                    @update:modelValue="(value) => onTemplateChange(taskIndex, value)"
                  >
                    <SelectTrigger
                      :class="{
                        'border-destructive': hasTaskFieldError(taskIndex, 'templateId'),
                        'border-green-500': !hasTaskFieldError(taskIndex, 'templateId') && task.templateId
                      }"
                    >
                      <SelectValue>
                        <template v-if="getSelectedTemplate(task.templateId)">
                          {{ getSelectedTemplate(task.templateId)?.name }}
                        </template>
                        <template v-else>
                          Select task template
                        </template>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="template in taskTemplates"
                        :key="template.id"
                        :value="template.id"
                        :textValue="template.name"
                      >
                        <div class="flex flex-col">
                          <div class="font-medium">{{ template.name }}</div>
                          <div class="text-xs text-muted-foreground">{{ template.description }}</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="hasTaskFieldError(taskIndex, 'templateId')" class="text-xs text-destructive">
                    {{ getTaskFieldError(taskIndex, 'templateId') }}
                  </p>
                </div>

                <!-- Template Parameters -->
                <div v-if="getSelectedTemplate(task.templateId)" class="space-y-4">
                  <Label class="text-sm font-medium">Template Parameters</Label>
                  <div class="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <div
                      v-for="param in getSelectedTemplate(task.templateId)?.parameterSchema"
                      :key="param.name"
                      class="space-y-2"
                    >
                      <Label class="text-sm">
                        {{ param.name }}
                        <span v-if="param.required" class="text-destructive">*</span>
                        <span v-if="param.description" class="text-muted-foreground font-normal">
                          - {{ param.description }}
                        </span>
                      </Label>

                      <!-- IP Address Parameter - Use specialized component -->
                      <IpParameterSelector
                        v-if="param.type === 'ip_address'"
                        :model-value="task.parameters[param.name] || ''"
                        @update:model-value="(value) => task.parameters[param.name] = value"
                        :param-name="param.name"
                        :devices="devices"
                        :required="param.required"
                        :has-error="hasParameterError(taskIndex, param.name)"
                        :error-message="getParameterError(taskIndex, param.name)"
                        @validate="validateTaskParameter(taskIndex, param.name)"
                      />

                      <!-- Regular Parameter Input -->
                      <Input
                        v-else
                        v-model="task.parameters[param.name]"
                        :placeholder="`Enter ${param.name}`"
                        :type="param.type === 'number' ? 'number' : 'text'"
                        @input="validateTaskParameter(taskIndex, param.name)"
                        :class="{
                          'border-destructive': hasParameterError(taskIndex, param.name),
                          'border-green-500': !hasParameterError(taskIndex, param.name) && task.parameters[param.name]
                        }"
                      />

                      <!-- Error message only for non-IP address parameters -->
                      <p v-if="param.type !== 'ip_address' && hasParameterError(taskIndex, param.name)" class="text-xs text-destructive">
                        {{ getParameterError(taskIndex, param.name) }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Execution Configuration -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Execution Device -->
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">
                      Execution Device <span class="text-destructive">*</span>
                    </Label>
                    <Select v-model="task.executionDevice" @update:modelValue="validateTask(taskIndex, 'executionDevice')">
                      <SelectTrigger
                        :class="{
                          'border-destructive': hasTaskFieldError(taskIndex, 'executionDevice'),
                          'border-green-500': !hasTaskFieldError(taskIndex, 'executionDevice') && task.executionDevice
                        }"
                      >
                        <SelectValue>
                          <template v-if="task.executionDevice">
                            {{ task.executionDevice }}
                          </template>
                          <template v-else>
                            Select execution device
                          </template>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="device in devices"
                          :key="device.deviceId"
                          :value="device.deviceId"
                        >
                          {{ device.deviceId }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p v-if="hasTaskFieldError(taskIndex, 'executionDevice')" class="text-xs text-destructive">
                      {{ getTaskFieldError(taskIndex, 'executionDevice') }}
                    </p>
                  </div>

                  <!-- Task Points -->
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">
                      Task Points <span class="text-destructive">*</span>
                    </Label>
                    <Input
                      v-model.number="task.points"
                      type="number"
                      min="0"
                      placeholder="10"
                      :class="{
                        'border-destructive': hasTaskFieldError(taskIndex, 'points'),
                        'border-green-500': !hasTaskFieldError(taskIndex, 'points') && task.points > 0
                      }"
                      @input="validateTask(taskIndex, 'points')"
                    />
                    <p v-if="hasTaskFieldError(taskIndex, 'points')" class="text-xs text-destructive">
                      {{ getTaskFieldError(taskIndex, 'points') }}
                    </p>
                  </div>
                </div>

                <!-- Target Devices -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">
                    Target Devices <span class="text-muted-foreground">(Optional, defaults to execution device)</span>
                  </Label>
                  <Select v-model="task.targetDevices" multiple>
                    <SelectTrigger>
                      <SelectValue>
                        <template v-if="task.targetDevices.length > 0">
                          {{ task.targetDevices.join(', ') }}
                        </template>
                        <template v-else>
                          Select target devices
                        </template>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="device in devices"
                        :key="device.deviceId"
                        :value="device.deviceId"
                      >
                        {{ device.deviceId }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- Test Cases -->
                <TestCasesManager
                  v-model="task.testCases"
                  :template="getSelectedTemplate(task.templateId)"
                  @validate="handleTestCasesValidation(taskIndex, $event)"
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </TransitionGroup>
    </div>

    <!-- Task Grouping Interface (when enabled and tasks exist) -->
    <div v-if="enableTaskGroups && localTasks.length > 0" class="mt-8">
      <TaskGroupManager
        :tasks="localTasks"
        :task-groups="taskGroups || []"
        @update:tasks="handleTasksUpdate"
        @update:task-groups="handleTaskGroupsUpdate"
        @task-group-changed="validateTasks"
      />
    </div>

    <!-- Total Points Summary -->
    <div v-if="localTasks.length > 0" class="flex justify-end">
      <Badge variant="outline" class="text-sm">
        Total: {{ totalPoints }} points
      </Badge>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick, watchEffect } from 'vue'
import {
  CheckSquare,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  ChevronDown
} from 'lucide-vue-next'

// Import utility functions
import { taskNameToId, titleToUniqueId } from '@/utils/idGenerator'

// UI Components
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'

// Local Components
import TestCasesManager from './TestCasesManager.vue'
import TaskGroupManager from './TaskGroupManager.vue'
import IpParameterSelector from './IpParameterSelector.vue'

// Types
import type { WizardTask, WizardTaskGroup, Device, TaskTemplate } from '@/types/wizard'

// Props
interface Props {
  modelValue: WizardTask[]
  taskTemplates: TaskTemplate[]
  devices: Device[]
  partIndex: number
  taskGroups?: WizardTaskGroup[]
  enableTaskGroups?: boolean
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: WizardTask[]): void
  (e: 'update:task-groups', value: WizardTaskGroup[]): void
  (e: 'updateTotalPoints', totalPoints: number): void
  (e: 'validate', errors: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localTasks = ref<WizardTask[]>([])
const taskFieldErrors = ref<Record<string, Record<string, string>>>({})
const parameterErrors = ref<Record<string, Record<string, string>>>({})
const testCaseErrors = ref<Record<string, string[]>>({})
const isUpdatingFromProps = ref(false)
const isValidating = ref(false)

// Computed
const totalPoints = computed(() => {
  if (!props.taskGroups || props.taskGroups.length === 0) {
    // No task groups - use sum of individual task points
    return localTasks.value.reduce((sum, task) => sum + (task.points || 0), 0)
  }
  
  // Calculate points considering task groups
  let totalGroupPoints = 0
  let ungroupedTaskPoints = 0
  const groupsWithTasks = new Set<string>()
  
  // First, identify which groups actually have tasks assigned to them
  for (const task of localTasks.value) {
    if (task.groupId) {
      groupsWithTasks.add(task.groupId)
    }
  }
  
  // Add up task group points ONLY if the group has tasks assigned
  for (const group of props.taskGroups) {
    if (groupsWithTasks.has(group.group_id)) {
      totalGroupPoints += group.points || 0
    }
  }
  
  // Add points for ungrouped tasks (tasks without groupId)
  for (const task of localTasks.value) {
    if (!task.groupId) {
      ungroupedTaskPoints += task.points || 0
    }
  }
  
  return totalGroupPoints + ungroupedTaskPoints
})

// Methods
const generateTempId = (): string => {
  return 'temp_' + Math.random().toString(36).substr(2, 9)
}

const addTask = () => {
  const newTask: WizardTask = {
    tempId: generateTempId(),
    taskId: '',
    name: '',
    description: '',
    templateId: '',
    executionDevice: '',
    targetDevices: [],
    parameters: {},
    testCases: [],
    order: localTasks.value.length + 1,
    points: 0,
    isExpanded: false  // Changed from true to false - tasks are now collapsed by default
  }
  localTasks.value.push(newTask)
  // Don't call validateTasks() here - it will be called by the watcher
}

const removeTask = (taskIndex: number) => {
  localTasks.value.splice(taskIndex, 1)
  // Update order for remaining tasks
  localTasks.value.forEach((task, index) => {
    task.order = index + 1
  })
  // Clean up errors
  delete taskFieldErrors.value[taskIndex]
  delete parameterErrors.value[taskIndex]
  delete testCaseErrors.value[taskIndex]
  // updateTotalPoints() will be called automatically by the watcher
  // Don't call validateTasks() here to avoid circular calls
}

const moveTask = (taskIndex: number, direction: number) => {
  const newIndex = taskIndex + direction
  if (newIndex >= 0 && newIndex < localTasks.value.length) {
    const task = localTasks.value.splice(taskIndex, 1)[0]
    localTasks.value.splice(newIndex, 0, task)
    // Update order
    localTasks.value.forEach((task, index) => {
      task.order = index + 1
    })
  }
}

const toggleTaskExpansion = (taskIndex: number) => {
  localTasks.value[taskIndex].isExpanded = !localTasks.value[taskIndex].isExpanded
}

const onTemplateChange = (taskIndex: number, value: string | number | bigint | Record<string, any> | null) => {
  if (typeof value === 'string') {
    const task = localTasks.value[taskIndex]
    if (task) {
      // Store the previous template ID BEFORE updating
      const previousTemplateId = task.templateId
      // Update the templateId (for v-model to work)
      task.templateId = value
      // Then handle the template change logic with both old and new values
      handleTemplateChange(taskIndex, value, previousTemplateId)
    }
  }
}

const handleTemplateChange = (taskIndex: number, templateId: string, previousTemplateId?: string) => {
  if (!templateId) return
  
  const task = localTasks.value[taskIndex]
  if (!task) return
  
  // Compare with the provided previousTemplateId (passed from onTemplateChange)
  // The templateId passed here is the NEW template ID that was selected
  if (previousTemplateId !== templateId) {
    const newTemplate = getSelectedTemplate(templateId)
    
    if (newTemplate) {
      // Reset parameters when template changes
      task.parameters = {}
      
      // Initialize parameters from template schema
      if (newTemplate.parameterSchema && newTemplate.parameterSchema.length > 0) {
        newTemplate.parameterSchema.forEach(param => {
          // Initialize with appropriate default value based on type
          if (param.type === 'number') {
            task.parameters[param.name] = 0
          } else if (param.type === 'boolean') {
            task.parameters[param.name] = false
          } else {
            // For all other types including 'ip_address', initialize with empty string
            task.parameters[param.name] = ''
          }
        })
      }
      
      // Ensure parameters object is properly initialized even if no schema
      if (!task.parameters || typeof task.parameters !== 'object') {
        task.parameters = {}
      }
      
      // Auto-populate test cases from template defaults
      if (newTemplate.defaultTestCases && newTemplate.defaultTestCases.length > 0) {
        task.testCases = newTemplate.defaultTestCases.map((defaultCase) => ({
          comparison_type: defaultCase.comparison_type,
          expected_result: defaultCase.expected_result
        }))
      } else {
        // Ensure at least one test case exists
        if (task.testCases.length === 0) {
          task.testCases = [{
            comparison_type: '',
            expected_result: ''
          }]
        }
      }
    }
  }
  
  validateTask(taskIndex, 'templateId')
}

const getSelectedTemplate = (templateId: string): TaskTemplate | undefined => {
  return props.taskTemplates.find(t => t.id === templateId)
}

const hasTaskErrors = (taskIndex: number): boolean => {
  return !!taskFieldErrors.value[taskIndex] || 
         !!parameterErrors.value[taskIndex] ||
         !!(testCaseErrors.value[taskIndex]?.length > 0)
}

const hasTaskFieldError = (taskIndex: number, field: string): boolean => {
  return !!(taskFieldErrors.value[taskIndex]?.[field])
}

const getTaskFieldError = (taskIndex: number, field: string): string => {
  return taskFieldErrors.value[taskIndex]?.[field] || ''
}

const hasParameterError = (taskIndex: number, paramName: string): boolean => {
  return !!(parameterErrors.value[taskIndex]?.[paramName])
}

const getParameterError = (taskIndex: number, paramName: string): string => {
  return parameterErrors.value[taskIndex]?.[paramName] || ''
}

const isTaskValid = (task: WizardTask): boolean => {
  return task.taskId.length > 0 && 
         task.name.length > 0 && 
         task.templateId.length > 0 &&
         task.executionDevice.length > 0 &&
         task.points > 0 &&
         task.testCases.length > 0
}

const handleTaskNameChange = (taskIndex: number, newName: string) => {
  const task = localTasks.value[taskIndex]
  if (!task) return

  // Update the name
  task.name = newName

  // Generate task ID from name
  if (newName.trim()) {
    const existingTaskIds = localTasks.value
      .filter((_, i) => i !== taskIndex)
      .map(t => t.taskId)
      .filter(Boolean)

    task.taskId = titleToUniqueId(newName, existingTaskIds)
  } else {
    task.taskId = ''
  }

  // Validate the name and taskId fields
  validateTask(taskIndex, 'name')
  validateTask(taskIndex, 'taskId')
}

const validateTask = (taskIndex: number, field: string) => {
  if (!taskFieldErrors.value[taskIndex]) {
    taskFieldErrors.value[taskIndex] = {}
  }

  const task = localTasks.value[taskIndex]

  switch (field) {
    case 'taskId':
      if (!task.taskId.trim()) {
        taskFieldErrors.value[taskIndex].taskId = 'Task ID is required (generated from name)'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(task.taskId)) {
        taskFieldErrors.value[taskIndex].taskId = 'Task ID must be alphanumeric with underscores/hyphens'
      } else if (localTasks.value.some((t, i) => i !== taskIndex && t.taskId === task.taskId)) {
        taskFieldErrors.value[taskIndex].taskId = 'Task ID must be unique within this part'
      } else {
        delete taskFieldErrors.value[taskIndex].taskId
      }
      break

    case 'name':
      if (!task.name.trim()) {
        taskFieldErrors.value[taskIndex].name = 'Task name is required'
      } else {
        delete taskFieldErrors.value[taskIndex].name
      }
      break

    case 'templateId':
      if (!task.templateId) {
        taskFieldErrors.value[taskIndex].templateId = 'Task template is required'
      } else {
        delete taskFieldErrors.value[taskIndex].templateId
      }
      break

    case 'executionDevice':
      if (!task.executionDevice) {
        taskFieldErrors.value[taskIndex].executionDevice = 'Execution device is required'
      } else if (!props.devices.some(d => d.deviceId === task.executionDevice)) {
        taskFieldErrors.value[taskIndex].executionDevice = `Selected device '${task.executionDevice}' does not exist in configured devices`
      } else {
        delete taskFieldErrors.value[taskIndex].executionDevice
      }
      break

    case 'points':
      if (!task.points || task.points <= 0) {
        taskFieldErrors.value[taskIndex].points = 'Task points must be greater than 0'
      } else {
        delete taskFieldErrors.value[taskIndex].points
      }
      break
  }

  // Don't call validateTasks() here to avoid circular calls
}

const validateTaskParameter = (taskIndex: number, paramName: string) => {
  if (!parameterErrors.value[taskIndex]) {
    parameterErrors.value[taskIndex] = {}
  }

  const task = localTasks.value[taskIndex]
  const template = getSelectedTemplate(task.templateId)
  const paramSchema = template?.parameterSchema.find(p => p.name === paramName)

  if (paramSchema?.required) {
    const paramValue = task.parameters[paramName]
    // More robust validation - check for meaningful values
    const isEmpty = paramValue === undefined ||
                   paramValue === null ||
                   (typeof paramValue === 'string' && paramValue.trim() === '') ||
                   (typeof paramValue === 'number' && isNaN(paramValue))

    if (isEmpty) {
      parameterErrors.value[taskIndex][paramName] = `${paramName} is required`
    } else {
      // Special validation for IP address parameters
      if (paramSchema.type === 'ip_address' && typeof paramValue === 'string') {
        // Only validate if the value looks complete
        const shouldValidate = paramValue.includes('.') && (
          // Complete IP address pattern (4 octets)
          /^(\d{1,3}\.){3}\d{1,3}$/.test(paramValue) ||
          // Variable reference pattern (deviceId.variableName)
          /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(paramValue) ||
          // Domain name pattern (e.g., google.com, example.org)
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(paramValue)
        )
        
        if (shouldValidate) {
          const isValid = validateIpParameterValue(paramValue)
          if (!isValid) {
            parameterErrors.value[taskIndex][paramName] = `${paramName} must be a valid IP variable, IP address, or domain name`
          } else {
            delete parameterErrors.value[taskIndex][paramName]
          }
        } else {
          // For incomplete values, clear any existing errors
          delete parameterErrors.value[taskIndex][paramName]
        }
      } else {
        delete parameterErrors.value[taskIndex][paramName]
      }
    }
  } else {
    delete parameterErrors.value[taskIndex][paramName]
  }

  // Don't call validateTasks() here to avoid circular calls
}

// Helper function to validate IP parameter values
const validateIpParameterValue = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false

  const trimmedValue = value.trim()
  
  // Debug logging (can be removed in production)
  // console.log('🔍 IP Validation Debug:', {
  //   originalValue: value,
  //   trimmedValue: trimmedValue,
  //   type: typeof value
  // })

  // Check if it's a valid IP address
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const isIp = ipRegex.test(trimmedValue)
  
  // Check if it's a valid domain name
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  const isDomain = domainRegex.test(trimmedValue)
  
  // Check if it's a variable reference (deviceId.variableName format)
  // Only check this if it's NOT already a valid domain name
  if (trimmedValue.includes('.') && !isDomain && !isIp) {
    // Check if it matches deviceId.variableName pattern and exists in devices
    const variablePattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/
    if (variablePattern.test(trimmedValue)) {
      // Check if this variable actually exists in our devices
      const [deviceId, variableName] = trimmedValue.split('.')
      const isVariable = props.devices.some(device =>
        device.deviceId === deviceId &&
        device.ipVariables.some(ipVar => ipVar.name === variableName)
      )
      // console.log('🔍 Variable check:', { deviceId, variableName, isVariable })
      if (isVariable) return true
    }
  }
  
  // Test with common IP addresses and domains for debugging (commented out for production)
  // const testIps = ['8.8.8.8', '192.168.1.1', '10.0.0.1', '127.0.0.1']
  // const testDomains = ['google.com', 'example.org', 'github.io']
  // const testResults = [...testIps, ...testDomains].map(item => ({ 
  //   item, 
  //   validIp: ipRegex.test(item), 
  //   validDomain: domainRegex.test(item) 
  // }))
  
  // console.log('🔍 IP/Domain check:', { 
  //   trimmedValue, 
  //   isIp, 
  //   isDomain,
  //   testResults
  // })
  return isIp || isDomain
}

const handleTestCasesValidation = (taskIndex: number, errors: string[]) => {
  testCaseErrors.value[taskIndex] = errors
  // Don't call validateTasks() here to avoid circular calls
}

const updateTotalPoints = () => {
  emit('updateTotalPoints', totalPoints.value)
}

const validateTasks = () => {
  if (isValidating.value) return // Prevent recursive validation
  isValidating.value = true
  
  try {
    // Validate all tasks
    localTasks.value.forEach((task, index) => {
      validateTask(index, 'taskId')
      validateTask(index, 'name')
      validateTask(index, 'templateId')
      validateTask(index, 'executionDevice')
      validateTask(index, 'points')

      // Validate test cases
      if (!task.testCases || task.testCases.length === 0) {
        if (!taskFieldErrors.value[index]) {
          taskFieldErrors.value[index] = {}
        }
        taskFieldErrors.value[index].testCases = 'At least one test case is required'
      } else {
        if (taskFieldErrors.value[index]) {
          delete taskFieldErrors.value[index].testCases
        }
      }

      // Validate targetDevices existence
      if (task.targetDevices && task.targetDevices.length > 0) {
        const invalidDevices = task.targetDevices.filter(deviceId =>
          !props.devices.some(d => d.deviceId === deviceId)
        )
        if (invalidDevices.length > 0) {
          if (!taskFieldErrors.value[index]) {
            taskFieldErrors.value[index] = {}
          }
          taskFieldErrors.value[index].targetDevices = `Target device(s) do not exist: ${invalidDevices.join(', ')}`
        } else {
          if (taskFieldErrors.value[index]) {
            delete taskFieldErrors.value[index].targetDevices
          }
        }
      }

      // Validate parameters
      const template = getSelectedTemplate(task.templateId)
      if (template) {
        template.parameterSchema.forEach(param => {
          validateTaskParameter(index, param.name)
        })
      }
    })

    const errors: string[] = []

    if (localTasks.value.length === 0) {
      errors.push('At least one task is required per part')
    }

    // Collect task field errors
    Object.values(taskFieldErrors.value).forEach(taskErrors => {
      errors.push(...Object.values(taskErrors))
    })

    // Collect parameter errors
    Object.values(parameterErrors.value).forEach(taskParamErrors => {
      errors.push(...Object.values(taskParamErrors))
    })

    // Collect test case errors
    Object.values(testCaseErrors.value).forEach(taskTestErrors => {
      errors.push(...taskTestErrors)
    })

    // Remove duplicate error messages
    const uniqueErrors = Array.from(new Set(errors))

    emit('validate', uniqueErrors)
  } finally {
    isValidating.value = false
  }
}

// Task Group handlers - Prevent recursion carefully
const handleTasksUpdate = (updatedTasks: WizardTask[]) => {
  // Update tasks without triggering watchers to prevent recursion
  isUpdatingFromProps.value = true
  localTasks.value = updatedTasks
  nextTick(() => {
    isUpdatingFromProps.value = false
    emit('update:modelValue', updatedTasks)
  })
}

const handleTaskGroupsUpdate = (updatedTaskGroups: WizardTaskGroup[]) => {
  emit('update:task-groups', updatedTaskGroups)
}

// Watchers
watch(
  localTasks,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', [...newValue])
      // Don't call updateTotalPoints() here as it causes circular updates
      // The computed totalPoints will update automatically
    }
  },
  { deep: true, flush: 'post' }
)

// Separate watcher for totalPoints to emit updates
watch(
  totalPoints,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('updateTotalPoints', newValue)
    }
  }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue || !Array.isArray(newValue)) return
    isUpdatingFromProps.value = true
    localTasks.value = newValue.map((task) => ({
      ...task,
      tempId: task.tempId || generateTempId()
    }))
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true, immediate: false }
)


// Separate watcher for validation - triggered by error state changes
watch(
  [() => taskFieldErrors.value, () => parameterErrors.value, () => testCaseErrors.value, () => localTasks.value.length],
  () => {
    if (!isUpdatingFromProps.value && !isValidating.value) {
      nextTick(() => {
        validateTasks()
      })
    }
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  // Initialize with existing tasks if any
  if (props.modelValue && props.modelValue.length > 0) {
    localTasks.value = props.modelValue.map(task => ({
      ...task,
      tempId: task.tempId || generateTempId()
    }))
  }
  
  // Initial validation will be handled by the watcher
  nextTick(() => {
    validateTasks()
  })
})
</script>

<style scoped>
/* Task transition animations */
.task-enter-active,
.task-leave-active {
  transition: all 0.3s ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.task-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>