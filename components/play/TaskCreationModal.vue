<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center">
          <Icon name="lucide:plus-circle" class="w-5 h-5 mr-2 text-primary" />
          {{ isEditing ? 'Edit Task' : 'Create New Task' }}
        </DialogTitle>
        <DialogDescription>
          Configure an automated task for network testing and validation
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto space-y-6">
        <!-- Basic Task Information -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Task Details</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Task Name -->
            <div class="space-y-2">
              <Label for="task-name">Task Name *</Label>
              <Input
                id="task-name"
                v-model="localTask.name"
                placeholder="e.g., Ping from PC1 to PC2"
                :class="{ 'border-destructive': !localTask.name.trim() }"
              />
            </div>

            <!-- Template Selection -->
            <div class="space-y-2">
              <Label for="task-template">Task Template *</Label>
              <Select v-model:model-value="localTask.template_name">
                <SelectTrigger id="task-template">
                  <SelectValue placeholder="Select a task template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup v-for="category in groupedTemplates" :key="category.name">
                    <SelectLabel>{{ category.label }}</SelectLabel>
                    <SelectItem
                      v-for="template in category.templates"
                      :key="template.id"
                      :value="template.id"
                    >
                      <div class="flex items-center space-x-2">
                        <Icon :name="getTemplateIcon(template.name)" class="w-4 h-4" />
                        <div>
                          <div class="font-medium">{{ template.name }}</div>
                          <div class="text-xs text-muted-foreground">{{ template.description }}</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <!-- Template Description -->
              <div v-if="selectedTemplate" class="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                <p><strong>{{ selectedTemplate.name }}:</strong> {{ selectedTemplate.description }}</p>
              </div>
            </div>

            <!-- Task Points -->
            <div class="space-y-2">
              <Label for="task-points">Points *</Label>
              <Input
                id="task-points"
                v-model.number="localTask.points"
                type="number"
                min="1"
                max="100"
                placeholder="10"
                :class="{ 'border-destructive': localTask.points <= 0 }"
              />
              <p class="text-xs text-muted-foreground">
                Points awarded when all test cases pass
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Template Parameters -->
        <Card v-if="selectedTemplate && templateParameters.length > 0">
          <CardHeader>
            <CardTitle class="text-base flex items-center">
              <Icon name="lucide:settings" class="w-4 h-4 mr-2" />
              Task Parameters
            </CardTitle>
            <CardDescription>
              Configure the parameters for the selected template
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-for="param in templateParameters" :key="param.name" class="space-y-2">
              <Label :for="`param-${param.name}`">
                {{ param.description || param.name }}
                <span v-if="param.required" class="text-destructive">*</span>
              </Label>

              <!-- Device Variable Parameter -->
              <Select
                v-if="param.type === 'device_variable'"
                v-model:model-value="localTask.parameters[param.name]"
              >
                <SelectTrigger :id="`param-${param.name}`">
                  <SelectValue :placeholder="`Select ${param.description || param.name}`" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Devices</SelectLabel>
                    <SelectItem
                      v-for="device in availableDevices"
                      :key="device.value"
                      :value="`{{${device.value}_ip}}`"
                    >
                      <div class="flex items-center space-x-2">
                        <Icon :name="device.icon" class="w-4 h-4" />
                        <span>{{ device.label }} ({{ '{{' + device.value + '_ip}}' }})</span>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <!-- URL Parameter -->
              <Input
                v-else-if="param.type === 'url'"
                :id="`param-${param.name}`"
                v-model="localTask.parameters[param.name]"
                :placeholder="param.default_value || 'http://{{device_ip}}/'"
                type="url"
              />

              <!-- Number Parameter -->
              <Input
                v-else-if="param.type === 'number'"
                :id="`param-${param.name}`"
                v-model.number="localTask.parameters[param.name]"
                :placeholder="String(param.default_value || 0)"
                type="number"
              />

              <!-- String Parameter -->
              <Input
                v-else
                :id="`param-${param.name}`"
                v-model="localTask.parameters[param.name]"
                :placeholder="String(param.default_value || '')"
                type="text"
              />

              <p v-if="param.description" class="text-xs text-muted-foreground">
                {{ param.description }}
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Test Cases -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base flex items-center">
                  <Icon name="lucide:check-square" class="w-4 h-4 mr-2" />
                  Test Cases
                </CardTitle>
                <CardDescription>
                  Define expected results and validation criteria
                </CardDescription>
              </div>
              <Button size="sm" @click="addTestCase">
                <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
                Add Test Case
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <!-- Empty State -->
            <div v-if="localTask.test_cases.length === 0" class="text-center py-8 text-muted-foreground">
              <Icon name="lucide:clipboard-list" class="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No test cases defined yet.</p>
              <p class="text-sm">Add test cases to validate task execution.</p>
            </div>

            <!-- Test Cases List -->
            <div v-else class="space-y-4">
              <div
                v-for="(testCase, index) in localTask.test_cases"
                :key="index"
                class="border rounded-lg p-4 bg-muted/25"
              >
                <div class="flex items-start justify-between mb-3">
                  <Badge variant="secondary" class="text-xs">
                    Test Case {{ index + 1 }}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="w-8 h-8 p-0 text-destructive hover:text-destructive"
                    @click="removeTestCase(index)"
                  >
                    <Icon name="lucide:x" class="w-4 h-4" />
                  </Button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Test Case Description -->
                  <div class="space-y-2">
                    <Label :for="`test-desc-${index}`">Description *</Label>
                    <Input
                      :id="`test-desc-${index}`"
                      v-model="testCase.description"
                      placeholder="e.g., Ping should succeed"
                    />
                  </div>

                  <!-- Comparison Type -->
                  <div class="space-y-2">
                    <Label :for="`test-type-${index}`">Test Type *</Label>
                    <Select v-model:model-value="testCase.comparison_type">
                      <SelectTrigger :id="`test-type-${index}`">
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="success">Success (Task completes successfully)</SelectItem>
                        <SelectItem value="failed">Failed (Task should fail)</SelectItem>
                        <SelectItem value="contains">Output Contains (Text in output)</SelectItem>
                        <SelectItem value="not_contains">Output Not Contains (Text not in output)</SelectItem>
                        <SelectItem value="equals">Equals (Exact match)</SelectItem>
                        <SelectItem value="ssh_success">SSH Success (SSH connection succeeds)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Expected Result -->
                  <div class="space-y-2">
                    <Label :for="`test-result-${index}`">Expected Result</Label>
                    <!-- Boolean for success/failed -->
                    <Select
                      v-if="['success', 'failed', 'ssh_success'].includes(testCase.comparison_type)"
                      v-model:model-value="testCase.expected_result"
                    >
                      <SelectTrigger :id="`test-result-${index}`">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem :value="true">True</SelectItem>
                        <SelectItem :value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                    <!-- Text input for contains/equals -->
                    <Input
                      v-else
                      :id="`test-result-${index}`"
                      v-model="testCase.expected_result"
                      :placeholder="getExpectedResultPlaceholder(testCase.comparison_type)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Task Preview -->
        <Card v-if="taskPreview" class="bg-muted/25">
          <CardHeader>
            <CardTitle class="text-base flex items-center">
              <Icon name="lucide:eye" class="w-4 h-4 mr-2" />
              Task Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2 text-sm">
              <div><strong>Template:</strong> {{ selectedTemplate?.name }}</div>
              <div><strong>Points:</strong> {{ localTask.points }}</div>
              <div><strong>Parameters:</strong></div>
              <div class="ml-4 space-y-1">
                <div v-for="(value, key) in localTask.parameters" :key="key" class="font-mono text-xs">
                  {{ key }}: <code class="bg-background px-1 py-0.5 rounded">{{ value }}</code>
                </div>
              </div>
              <div><strong>Test Cases:</strong> {{ localTask.test_cases.length }}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Footer -->
      <DialogFooter class="pt-4 border-t">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="lucide:info" class="w-4 h-4" />
            <span>Tasks use IP variables from your device configuration</span>
          </div>

          <div class="flex items-center space-x-3">
            <Button variant="outline" @click="closeModal">
              Cancel
            </Button>
            <Button :disabled="!canSave" @click="saveTask">
              <Icon name="lucide:save" class="w-4 h-4 mr-2" />
              {{ isEditing ? 'Update Task' : 'Create Task' }}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'
import type { TaskFormData, TestCase, TaskTemplate } from '@/types/lab'

// Props
interface Props {
  open: boolean
  taskData?: TaskFormData | null
  availableDevices: Array<{ value: string; label: string; icon: string }>
  isEditing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  taskData: null,
  isEditing: false
})

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'save:task': [data: TaskFormData]
}>()

// Composables
const { templates, loadTemplates, getTemplateById } = useTaskTemplates()

// Reactive state
const localTask = ref<TaskFormData>({
  name: '',
  template_name: '',
  parameters: {},
  test_cases: [],
  points: 1
})

// Computed
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const selectedTemplate = computed(() => {
  return localTask.value.template_name ? getTemplateById(localTask.value.template_name) : null
})

const templateParameters = computed(() => {
  return selectedTemplate.value?.parameters || []
})

const groupedTemplates = computed(() => {
  const groups = new Map<string, TaskTemplate[]>()
  
  templates.value.forEach(template => {
    if (!groups.has(template.category)) {
      groups.set(template.category, [])
    }
    groups.get(template.category)!.push(template)
  })
  
  return Array.from(groups.entries()).map(([category, templates]) => ({
    name: category,
    label: category.charAt(0).toUpperCase() + category.slice(1),
    templates: templates.sort((a, b) => a.name.localeCompare(b.name))
  }))
})

const canSave = computed(() => {
  return localTask.value.name.trim() !== '' &&
         localTask.value.template_name.trim() !== '' &&
         localTask.value.points > 0 &&
         localTask.value.test_cases.length > 0 &&
         localTask.value.test_cases.every(tc => 
           tc.description.trim() !== '' && tc.comparison_type.trim() !== ''
         )
})

const taskPreview = computed(() => {
  return canSave.value ? localTask.value : null
})

// Methods
const addTestCase = () => {
  const defaultTestCase: TestCase = {
    description: '',
    comparison_type: 'success',
    expected_result: true
  }
  
  // Use default test case from template if available
  if (selectedTemplate.value && selectedTemplate.value.default_test_cases.length > 0) {
    const templateDefault = selectedTemplate.value.default_test_cases[0]
    Object.assign(defaultTestCase, templateDefault)
  }
  
  localTask.value.test_cases.push(defaultTestCase)
}

const removeTestCase = (index: number) => {
  localTask.value.test_cases.splice(index, 1)
}

const saveTask = () => {
  if (!canSave.value) {
    toast.error('Please fill in all required fields')
    return
  }
  
  emit('save:task', { ...localTask.value })
  closeModal()
}

const closeModal = () => {
  emit('update:open', false)
}

const resetTask = () => {
  localTask.value = {
    name: '',
    template_name: '',
    parameters: {},
    test_cases: [],
    points: 1
  }
}

const getTemplateIcon = (templateName: string): string => {
  const name = templateName.toLowerCase()
  
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

const getExpectedResultPlaceholder = (comparisonType: string): string => {
  switch (comparisonType) {
    case 'contains':
      return 'Text that should appear in output'
    case 'not_contains':
      return 'Text that should NOT appear in output'
    case 'equals':
      return 'Exact expected output'
    default:
      return 'Expected result'
  }
}

// Watch for template changes to update parameters
watch(() => localTask.value.template_name, (newTemplate) => {
  if (newTemplate) {
    const template = getTemplateById(newTemplate)
    if (template) {
      // Initialize parameters with default values
      const newParams: Record<string, any> = {}
      template.parameters.forEach(param => {
        if (param.default_value !== undefined) {
          newParams[param.name] = param.default_value
        }
      })
      localTask.value.parameters = { ...newParams, ...localTask.value.parameters }
      
      // Add default test cases if none exist
      if (localTask.value.test_cases.length === 0 && template.default_test_cases.length > 0) {
        localTask.value.test_cases = [...template.default_test_cases]
      }
    }
  }
})

// Initialize task data when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.taskData) {
      localTask.value = { ...props.taskData }
    } else {
      resetTask()
    }
  }
})

// Load templates on mount
onMounted(() => {
  loadTemplates()
})
</script>