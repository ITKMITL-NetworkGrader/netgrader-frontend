<template>
  <Card 
    class="task-card cursor-pointer transition-all duration-200 hover:shadow-md"
    :class="{
      'ring-2 ring-primary bg-primary/5': isSelected,
      'hover:shadow-lg hover:-translate-y-1': !isSelected
    }"
    @click="$emit('click')"
  >
    <CardContent class="p-4">
      <div class="flex items-start justify-between">
        <!-- Main Task Info -->
        <div class="flex-1 min-w-0">
          <!-- Task Header -->
          <div class="flex items-center space-x-3 mb-3">
            <!-- Drag Handle (only show if draggable) -->
            <div 
              v-if="isDraggable" 
              data-sortable-handle 
              class="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-muted/50 transition-colors"
              title="Drag to reorder"
            >
              <Icon name="lucide:grip-vertical" class="w-4 h-4 text-muted-foreground" />
            </div>

            <!-- Task Number Badge -->
            <Badge variant="secondary" class="font-mono text-xs">
              #{{ index + 1 }}
            </Badge>

            <!-- Template Badge -->
            <Badge :variant="getTemplateBadgeVariant(task.template_name)" class="text-xs">
              <Icon :name="getTemplateIcon(task.template_name)" class="w-3 h-3 mr-1" />
              {{ getTemplateDisplayName(task.template_name) }}
            </Badge>

            <!-- Points Badge -->
            <Badge variant="outline" class="text-xs">
              {{ task.points }} pt{{ task.points !== 1 ? 's' : '' }}
            </Badge>
          </div>

          <!-- Task Name -->
          <h4 class="font-medium text-foreground mb-2 line-clamp-2">
            {{ task.name || 'Untitled Task' }}
          </h4>

          <!-- Task Details -->
          <div class="space-y-2 text-sm text-muted-foreground">
            <!-- Parameters Summary -->
            <div v-if="Object.keys(task.parameters).length > 0" class="flex items-center space-x-2">
              <Icon name="lucide:settings" class="w-3 h-3 shrink-0" />
              <div class="flex flex-wrap gap-1 min-w-0">
                <code 
                  v-for="(value, key) in displayParameters" 
                  :key="key"
                  class="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-24"
                  :title="`${key}: ${value}`"
                >
                  {{ key }}: {{ truncateValue(value) }}
                </code>
              </div>
            </div>

            <!-- Test Cases Summary -->
            <div v-if="task.test_cases.length > 0" class="flex items-center space-x-2">
              <Icon name="lucide:check-circle" class="w-3 h-3 shrink-0" />
              <span class="text-xs">
                {{ task.test_cases.length }} test case{{ task.test_cases.length !== 1 ? 's' : '' }}
              </span>
              <div class="flex space-x-1">
                <Badge 
                  v-for="testCase in task.test_cases.slice(0, 3)" 
                  :key="testCase.description"
                  variant="outline" 
                  class="text-xs px-1 py-0"
                >
                  {{ getTestCaseIcon(testCase.comparison_type) }}
                </Badge>
                <Badge v-if="task.test_cases.length > 3" variant="outline" class="text-xs px-1 py-0">
                  +{{ task.test_cases.length - 3 }}
                </Badge>
              </div>
            </div>

            <!-- Device Flow (if applicable) -->
            <div v-if="deviceFlow" class="flex items-center space-x-2">
              <Icon name="lucide:workflow" class="w-3 h-3 shrink-0" />
              <div class="flex items-center space-x-1 text-xs">
                <div class="flex items-center space-x-1">
                  <Icon :name="deviceFlow.source.icon" class="w-3 h-3" />
                  <span>{{ deviceFlow.source.label }}</span>
                </div>
                <Icon name="lucide:arrow-right" class="w-3 h-3 text-muted-foreground/50" />
                <div v-if="deviceFlow.target" class="flex items-center space-x-1">
                  <Icon :name="deviceFlow.target.icon" class="w-3 h-3" />
                  <span>{{ deviceFlow.target.label }}</span>
                </div>
                <span v-else class="italic">Network</span>
              </div>
            </div>
          </div>

          <!-- Validation Warnings -->
          <div v-if="validationIssues.length > 0" class="mt-3">
            <div class="flex items-center space-x-2 text-xs text-amber-600 dark:text-amber-400">
              <Icon name="lucide:triangle-alert" class="w-3 h-3" />
              <span>{{ validationIssues.length }} issue{{ validationIssues.length !== 1 ? 's' : '' }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-1 ml-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="w-8 h-8 p-0">
                <Icon name="lucide:more-vertical" class="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click.stop="$emit('edit')">
                <Icon name="lucide:edit" class="w-4 h-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem @click.stop="$emit('duplicate')">
                <Icon name="lucide:copy" class="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                class="text-destructive focus:text-destructive" 
                @click.stop="$emit('remove')"
              >
                <Icon name="lucide:trash-2" class="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { TaskFormData } from '@/types/lab'

// Props
interface Props {
  task: TaskFormData
  index: number
  isSelected?: boolean
  availableDevices: Array<{ value: string; label: string; icon: string }>
  isDraggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isDraggable: true
})

// Emits
defineEmits<{
  'click': []
  'edit': []
  'duplicate': []
  'remove': []
}>()

// Computed
const displayParameters = computed(() => {
  // Limit displayed parameters to avoid cluttering
  const params = props.task.parameters
  const entries = Object.entries(params)
  
  if (entries.length <= 3) return params
  
  const limited: Record<string, any> = {}
  entries.slice(0, 3).forEach(([key, value]) => {
    limited[key] = value
  })
  return limited
})

const deviceFlow = computed(() => {
  // Extract source device info
  const sourceDevice = props.availableDevices.find(d => d.value === getDeviceFromParameters())
  if (!sourceDevice) return null

  // Extract target device from parameters if available
  const targetValue = props.task.parameters.target_ip || props.task.parameters.target_device
  let targetDevice = null
  
  if (targetValue) {
    // Try to match device by IP variable pattern or direct value
    targetDevice = props.availableDevices.find(d => 
      targetValue.includes(d.value) || targetValue.includes(`${d.value}_ip`)
    )
  }

  return {
    source: sourceDevice,
    target: targetDevice
  }
})

const validationIssues = computed(() => {
  const issues: string[] = []
  
  if (!props.task.name.trim()) {
    issues.push('Task name is required')
  }
  
  if (!props.task.template_name.trim()) {
    issues.push('Template is required')
  }
  
  if (props.task.points <= 0) {
    issues.push('Points must be greater than 0')
  }
  
  if (props.task.test_cases.length === 0) {
    issues.push('At least one test case is required')
  }
  
  return issues
})

// Methods
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

const getTemplateDisplayName = (templateName: string): string => {
  return templateName.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

const getTemplateBadgeVariant = (templateName: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const name = templateName.toLowerCase()
  
  if (name.includes('ping') || name.includes('connectivity')) return 'default'
  if (name.includes('security') || name.includes('ssh')) return 'destructive'
  if (name.includes('service') || name.includes('http')) return 'secondary'
  
  return 'outline'
}

const getTestCaseIcon = (comparisonType: string): string => {
  switch (comparisonType) {
    case 'success': return '✓'
    case 'failed': return '✗'
    case 'contains': return '⊃'
    case 'not_contains': return '⊅'
    case 'equals': return '='
    default: return '?'
  }
}

const getDeviceFromParameters = (): string => {
  // Try to extract device from common parameter patterns
  const params = props.task.parameters
  
  // Look for direct device reference
  if (params.source_device) return params.source_device
  
  // Look for device in IP variables
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.includes('{{') && value.includes('_ip}}')) {
      const match = value.match(/\{\{(\w+)_ip\}\}/)
      if (match) return match[1]
    }
  }
  
  return ''
}

const truncateValue = (value: any): string => {
  const str = String(value)
  return str.length > 12 ? `${str.slice(0, 12)}...` : str
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-card {
  transition: all 0.2s ease;
}

.task-card:hover {
  transform: translateY(-1px);
}
</style>