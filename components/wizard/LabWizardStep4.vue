<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Parts & Tasks Management</h2>
      <p class="text-muted-foreground mt-1">
        Create lab parts and define tasks for each part. This is where you structure the learning objectives and grading criteria.
      </p>
    </div>

    <!-- Parts Management Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium">
          Lab Parts <span class="text-destructive">*</span>
          <span class="text-muted-foreground font-normal">(Minimum 1 part required)</span>
        </Label>
        <Button @click="addPart" :disabled="isLoadingTemplates">
          <Plus class="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingTemplates" class="flex items-center justify-center p-8">
        <Loader2 class="w-6 h-6 animate-spin mr-2" />
        <span>Loading task templates...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="localData.length === 0" class="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <BookOpen class="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 class="text-lg font-medium mb-2">No lab parts configured</h3>
        <p class="text-muted-foreground mb-4">
          Add your first lab part to define the structure and tasks
        </p>
        <Button @click="addPart">
          <Plus class="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      <!-- Parts List -->
      <div v-else class="space-y-6">
        <TransitionGroup name="part" tag="div" class="space-y-6">
          <Card
            v-for="(part, partIndex) in localData"
            :key="part.tempId"
            :class="{
              'border-destructive': hasPartErrors(partIndex),
              'border-blue-500': !hasPartErrors(partIndex) && isPartValid(part)
            }"
          >
            <CardHeader class="pb-4">
              <div class="flex items-center justify-between">
                <CardTitle class="text-lg flex items-center">
                  <BookOpen class="w-5 h-5 mr-2 text-blue-600" />
                  Part {{ partIndex + 1 }}
                  <Badge v-if="part.partId" variant="secondary" class="ml-2">
                    {{ part.partId }}
                  </Badge>
                  <Badge v-if="part.totalPoints > 0" variant="outline" class="ml-2">
                    {{ part.totalPoints }} pts
                  </Badge>
                </CardTitle>
                <div class="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="togglePartExpansion(partIndex)"
                  >
                    <ChevronDown
                      :class="{ 'transform rotate-180': part.isExpanded }"
                      class="w-4 h-4 transition-transform"
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="movePart(partIndex, -1)"
                    :disabled="partIndex === 0"
                  >
                    <MoveUp class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="movePart(partIndex, 1)"
                    :disabled="partIndex === localData.length - 1"
                  >
                    <MoveDown class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="removePart(partIndex)"
                    class="text-destructive hover:text-destructive"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <Collapsible v-model:open="part.isExpanded">
              <CollapsibleContent>
                <CardContent class="space-y-6">
                  <!-- Part Basic Information -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Part ID -->
                    <div class="space-y-2">
                      <Label :for="`part-id-${partIndex}`" class="text-sm font-medium">
                        Part ID <span class="text-destructive">*</span>
                      </Label>
                      <Input
                        :id="`part-id-${partIndex}`"
                        v-model="part.partId"
                        placeholder="basic-config, routing, etc."
                        :class="{
                          'border-destructive': hasPartFieldError(partIndex, 'partId'),
                          'border-green-500': !hasPartFieldError(partIndex, 'partId') && part.partId.length > 0
                        }"
                        @input="validatePart(partIndex, 'partId')"
                        @blur="validatePart(partIndex, 'partId')"
                      />
                      <p v-if="hasPartFieldError(partIndex, 'partId')" class="text-sm text-destructive">
                        {{ getPartFieldError(partIndex, 'partId') }}
                      </p>
                    </div>

                    <!-- Part Title -->
                    <div class="space-y-2">
                      <Label :for="`part-title-${partIndex}`" class="text-sm font-medium">
                        Part Title <span class="text-destructive">*</span>
                      </Label>
                      <Input
                        :id="`part-title-${partIndex}`"
                        v-model="part.title"
                        placeholder="Basic Configuration, OSPF Setup, etc."
                        :class="{
                          'border-destructive': hasPartFieldError(partIndex, 'title'),
                          'border-green-500': !hasPartFieldError(partIndex, 'title') && part.title.length > 0
                        }"
                        @input="validatePart(partIndex, 'title')"
                        @blur="validatePart(partIndex, 'title')"
                      />
                      <p v-if="hasPartFieldError(partIndex, 'title')" class="text-sm text-destructive">
                        {{ getPartFieldError(partIndex, 'title') }}
                      </p>
                    </div>
                  </div>

                  <!-- Description -->
                  <div class="space-y-2">
                    <Label :for="`part-description-${partIndex}`" class="text-sm font-medium">
                      Description <span class="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Textarea
                      :id="`part-description-${partIndex}`"
                      v-model="part.description"
                      placeholder="Optional description for this part..."
                      rows="2"
                      @input="validatePart(partIndex, 'description')"
                    />
                  </div>

                  <!-- Instructions -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label :for="`part-instructions-${partIndex}`" class="text-sm font-medium">
                        Student Instructions <span class="text-destructive">*</span>
                      </Label>
                      <div class="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="toggleInstructionsPreview(partIndex)"
                        >
                          <Eye v-if="!part.showInstructionsPreview" class="w-4 h-4 mr-1" />
                          <Edit3 v-else class="w-4 h-4 mr-1" />
                          {{ part.showInstructionsPreview ? 'Edit' : 'Preview' }}
                        </Button>
                      </div>
                    </div>

                    <!-- Instructions Editor/Preview -->
                    <div v-if="!part.showInstructionsPreview">
                      <Textarea
                        :id="`part-instructions-${partIndex}`"
                        v-model="part.instructions"
                        placeholder="# Part Instructions&#10;&#10;In this part, students will:&#10;- Configure basic settings&#10;- Test connectivity&#10;..."
                        rows="6"
                        class="font-mono text-sm"
                        :class="{
                          'border-destructive': hasPartFieldError(partIndex, 'instructions'),
                          'border-green-500': !hasPartFieldError(partIndex, 'instructions') && part.instructions.length > 0
                        }"
                        @input="validatePart(partIndex, 'instructions')"
                      />
                    </div>
                    <div v-else class="min-h-[150px] p-4 border rounded-md bg-background prose prose-sm max-w-none">
                      <div v-html="renderMarkdown(part.instructions)"></div>
                    </div>
                    <p v-if="hasPartFieldError(partIndex, 'instructions')" class="text-sm text-destructive">
                      {{ getPartFieldError(partIndex, 'instructions') }}
                    </p>
                  </div>

                  <!-- Prerequisites -->
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">
                      Prerequisites <span class="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Select v-model="part.prerequisites" multiple>
                      <SelectTrigger>
                        <SelectValue>
                          <template v-if="part.prerequisites.length > 0">
                            {{ getPrerequisitesDisplayText(part.prerequisites) }}
                          </template>
                          <template v-else>
                            Select prerequisite parts
                          </template>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="(otherPart, otherIndex) in localData"
                          :key="otherPart.tempId"
                          :value="otherPart.partId || otherPart.tempId"
                          :disabled="otherIndex === partIndex || !otherPart.partId"
                        >
                          {{ otherPart.partId || `Part ${otherIndex + 1}` }} - {{ otherPart.title || 'Untitled Part' }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Tasks Management -->
                  <div class="border-t pt-6">
                    <TasksManager
                      v-model="part.tasks"
                      :task-templates="taskTemplates"
                      :devices="devices"
                      :part-index="partIndex"
                      :task-groups="part.task_groups"
                      :enable-task-groups="true"
                      @update-total-points="updatePartTotalPoints(partIndex, $event)"
                      @update:task-groups="updatePartTaskGroups(partIndex, $event)"
                      @validate="handleTasksValidation(partIndex, $event)"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </TransitionGroup>
      </div>
    </div>

    <!-- Validation Summary -->
    <div v-if="validation && validation.errors.length > 0" class="mt-6">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Please fix the following issues:</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="error in validation.errors" :key="error">{{ error }}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import {
  BookOpen,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  ChevronDown,
  Eye,
  Edit3,
  AlertCircle,
  Loader2
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'

// Local Components
import TasksManager from './TasksManager.vue'

// Types
import type { WizardLabPart, WizardTaskGroup, Device, TaskTemplate, ValidationResult } from '@/types/wizard'

// Props
interface Props {
  modelValue: WizardLabPart[]
  devices: Device[]
  validation?: ValidationResult
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: WizardLabPart[]): void
  (e: 'validate', result: ValidationResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localData = ref<WizardLabPart[]>([])
const taskTemplates = ref<TaskTemplate[]>([])
const isLoadingTemplates = ref(false)
const partFieldErrors = ref<Record<string, Record<string, string>>>({})
const taskValidationErrors = ref<Record<string, string[]>>({})
const isUpdatingFromProps = ref(false)
const isValidating = ref(false)

// Methods
const generateTempId = (): string => {
  return 'temp_' + Math.random().toString(36).substr(2, 9)
}

const addPart = () => {
  const newPart: WizardLabPart = {
    tempId: generateTempId(),
    partId: '',
    title: '',
    description: '',
    instructions: '',
    order: localData.value.length + 1,
    tasks: [],
    task_groups: [],
    prerequisites: [],
    totalPoints: 0,
    isExpanded: true,
    showInstructionsPreview: false
  }
  localData.value.push(newPart)
  validateStep()
}

const removePart = (partIndex: number) => {
  localData.value.splice(partIndex, 1)
  // Update order for remaining parts
  localData.value.forEach((part, index) => {
    part.order = index + 1
  })
  // Clean up errors
  delete partFieldErrors.value[partIndex]
  delete taskValidationErrors.value[partIndex]
  validateStep()
}

const movePart = (partIndex: number, direction: number) => {
  const newIndex = partIndex + direction
  if (newIndex >= 0 && newIndex < localData.value.length) {
    const part = localData.value.splice(partIndex, 1)[0]
    localData.value.splice(newIndex, 0, part)
    // Update order
    localData.value.forEach((part, index) => {
      part.order = index + 1
    })
  }
}

const togglePartExpansion = (partIndex: number) => {
  localData.value[partIndex].isExpanded = !localData.value[partIndex].isExpanded
}

const toggleInstructionsPreview = (partIndex: number) => {
  const part = localData.value[partIndex]
  part.showInstructionsPreview = !part.showInstructionsPreview
}

const renderMarkdown = (content: string): string => {
  if (!content) return '<p class="text-muted-foreground">No instructions provided</p>'
  
  try {
    return marked(content, {
      breaks: true,
      gfm: true
    })
  } catch (error) {
    return `<p class="text-destructive">Error rendering markdown: ${error}</p>`
  }
}

const getPrerequisitesDisplayText = (prerequisites: string[]): string => {
  if (!prerequisites || prerequisites.length === 0) return ''
  
  const displayNames = prerequisites.map(prereqId => {
    const part = localData.value.find(p => p.partId === prereqId || p.tempId === prereqId)
    if (part) {
      return part.partId || part.title || `Part ${localData.value.indexOf(part) + 1}`
    }
    return prereqId
  })
  
  return displayNames.join(', ')
}

const updatePartTotalPoints = (partIndex: number, totalPoints: number) => {
  if (localData.value[partIndex]) {
    localData.value[partIndex].totalPoints = totalPoints
  }
}

const handleTasksValidation = (partIndex: number, errors: string[]) => {
  taskValidationErrors.value[partIndex] = errors
  // Don't call validateStep() here - it will be called by the debounced watcher
}

const updatePartTaskGroups = (partIndex: number, taskGroups: WizardTaskGroup[]) => {
  if (localData.value[partIndex]) {
    localData.value[partIndex].task_groups = taskGroups
  }
}

const hasPartErrors = (partIndex: number): boolean => {
  return !!partFieldErrors.value[partIndex] || !!(taskValidationErrors.value[partIndex]?.length > 0)
}

const hasPartFieldError = (partIndex: number, field: string): boolean => {
  return !!(partFieldErrors.value[partIndex]?.[field])
}

const getPartFieldError = (partIndex: number, field: string): string => {
  return partFieldErrors.value[partIndex]?.[field] || ''
}

const isPartValid = (part: WizardLabPart): boolean => {
  return part.partId.length > 0 && 
         part.title.length > 0 && 
         part.instructions.length > 0 &&
         part.tasks.length > 0
}

const validatePart = (partIndex: number, field: string) => {
  if (!partFieldErrors.value[partIndex]) {
    partFieldErrors.value[partIndex] = {}
  }

  const part = localData.value[partIndex]

  switch (field) {
    case 'partId':
      if (!part.partId.trim()) {
        partFieldErrors.value[partIndex].partId = 'Part ID is required'
      } else if (!/^[a-z0-9-]+$/.test(part.partId)) {
        partFieldErrors.value[partIndex].partId = 'Part ID must be lowercase alphanumeric with hyphens'
      } else if (localData.value.some((p, i) => i !== partIndex && p.partId === part.partId)) {
        partFieldErrors.value[partIndex].partId = 'Part ID must be unique'
      } else {
        delete partFieldErrors.value[partIndex].partId
      }
      break

    case 'title':
      if (!part.title.trim()) {
        partFieldErrors.value[partIndex].title = 'Part title is required'
      } else if (part.title.length > 200) {
        partFieldErrors.value[partIndex].title = 'Part title must be 200 characters or less'
      } else {
        delete partFieldErrors.value[partIndex].title
      }
      break

    case 'instructions':
      if (!part.instructions.trim()) {
        partFieldErrors.value[partIndex].instructions = 'Student instructions are required'
      } else if (part.instructions.length > 10000) {
        partFieldErrors.value[partIndex].instructions = 'Instructions must be 10000 characters or less'
      } else {
        delete partFieldErrors.value[partIndex].instructions
      }
      break

    case 'description':
      if (part.description && part.description.length > 2000) {
        partFieldErrors.value[partIndex].description = 'Description must be 2000 characters or less'
      } else {
        delete partFieldErrors.value[partIndex].description
      }
      break
  }

  // Don't call validateStep() here to avoid circular calls
  // Individual validation is handled, step validation should be triggered separately
}

const validateStep = () => {
  if (isValidating.value) return // Prevent recursive validation
  isValidating.value = true
  
  try {
    // Validate all parts
    localData.value.forEach((part, index) => {
      validatePart(index, 'partId')
      validatePart(index, 'title')
      validatePart(index, 'instructions')
      validatePart(index, 'description')
    })

    const errors: string[] = []

    if (localData.value.length === 0) {
      errors.push('At least one lab part is required')
    }

    // Collect part field errors
    Object.values(partFieldErrors.value).forEach(partErrors => {
      errors.push(...Object.values(partErrors))
    })

    // Collect task validation errors
    Object.values(taskValidationErrors.value).forEach(taskErrors => {
      errors.push(...taskErrors)
    })

    const isValid = errors.length === 0

    const validationResult: ValidationResult = {
      isValid,
      errors
    }

    emit('validate', validationResult)
  } finally {
    isValidating.value = false
  }
}

const loadTaskTemplates = async () => {
  isLoadingTemplates.value = true
  try {
    const config = useRuntimeConfig()
    const response = await $fetch(`${config.public.backendurl}/v0/task-templates`, {
      credentials: 'include'
    })

    if (response.success && response.data.templates) {
      taskTemplates.value = response.data.templates
    }
  } catch (error) {
    console.error('Failed to load task templates:', error)
    // Set some mock data for development
    taskTemplates.value = [
      {
        _id: '507f1f77bcf86cd799439014',
        templateId: 'cisco_hostname_config',
        name: 'Cisco Hostname Configuration',
        description: 'Configure device hostname on Cisco devices',
        parameterSchema: [
          {
            name: 'hostname',
            type: 'string',
            description: 'Device hostname (alphanumeric, no spaces)',
            required: true
          }
        ],
        defaultTestCases: [
          {
            comparison_type: 'contains',
            expected_result: 'hostname {{hostname}}'
          }
        ]
      },
      {
        _id: '507f1f77bcf86cd799439015',
        templateId: 'linux_ssh_test',
        name: 'Linux SSH Test',
        description: 'Test SSH connectivity to Linux systems',
        parameterSchema: [
          {
            name: 'target_ip',
            type: 'string',
            description: 'Target IP address for SSH test',
            required: true
          },
          {
            name: 'port',
            type: 'number',
            description: 'SSH port (default: 22)',
            required: false
          }
        ],
        defaultTestCases: [
          {
            comparison_type: 'contains',
            expected_result: 'SSH connection successful'
          }
        ]
      },
      {
        _id: '507f1f77bcf86cd799439016',
        templateId: 'interface_config',
        name: 'Interface Configuration',
        description: 'Configure network interface settings',
        parameterSchema: [
          {
            name: 'interface',
            type: 'string',
            description: 'Interface name (e.g., GigabitEthernet0/0)',
            required: true
          },
          {
            name: 'ip_address',
            type: 'string',
            description: 'IP address to assign',
            required: true
          }
        ],
        defaultTestCases: [
          {
            comparison_type: 'contains',
            expected_result: 'interface {{interface}}'
          }
        ]
      }
    ]
  } finally {
    isLoadingTemplates.value = false
  }
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      // Convert to regular WizardLabPart array (remove UI-specific props for parent)
      const cleanParts = newValue.map(({ showInstructionsPreview, ...part }) => part)
      emit('update:modelValue', cleanParts)
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (isUpdatingFromProps.value) return // Prevent recursive updates
    
    isUpdatingFromProps.value = true
    
    // Add UI-specific props to parts without accessing current localData to avoid recursion
    localData.value = newValue.map((part) => ({
      ...part,
      showInstructionsPreview: false, // Reset to default to avoid recursion
      tempId: part.tempId || generateTempId()
    }))
    
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true }
)

// Separate watcher for validation - triggered by data changes
watch(
  [() => partFieldErrors.value, () => taskValidationErrors.value, () => localData.value.length],
  () => {
    if (!isUpdatingFromProps.value && !isValidating.value) {
      nextTick(() => {
        validateStep()
      })
    }
  },
  { deep: true }
)

// Lifecycle
onMounted(async () => {
  await loadTaskTemplates()
  
  // Initialize with existing parts if any
  if (props.modelValue.length > 0) {
    localData.value = props.modelValue.map(part => ({
      ...part,
      showInstructionsPreview: false,
      tempId: generateTempId()
    }))
  }
  
  validateStep()
})
</script>

<style scoped>
/* Part transition animations */
.part-enter-active,
.part-leave-active {
  transition: all 0.3s ease;
}

.part-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.part-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Markdown preview styles */
:deep(.prose) {
  color: hsl(var(--foreground));
}

:deep(.prose h1) {
  color: hsl(var(--foreground));
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
}

:deep(.prose h2) {
  color: hsl(var(--foreground));
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.prose p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

:deep(.prose ul) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

:deep(.prose li) {
  margin-bottom: 0.25rem;
}
</style>