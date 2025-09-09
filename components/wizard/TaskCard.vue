<template>
  <Card
    :draggable="true"
    :class="{
      'border-destructive': hasErrors,
      'border-green-500': !hasErrors && isValid,
      'opacity-50 scale-95': isDragging,
      'cursor-move': !isDragging,
      'shadow-lg': isDragging
    }"
    class="transition-all duration-200"
    :style="groupColor ? { borderLeftColor: groupColor, borderLeftWidth: '4px' } : {}"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <CardTitle class="text-base flex items-center">
          <GripVertical class="w-4 h-4 mr-2 text-gray-400 cursor-move" />
          <CheckSquare 
            :class="groupColor ? `w-4 h-4 mr-2` : 'w-4 h-4 mr-2 text-green-600'" 
            :style="groupColor ? { color: groupColor } : {}"
          />
          Task {{ taskIndex + 1 }}
          <Badge v-if="task.taskId" variant="secondary" class="ml-2 text-xs">
            {{ task.taskId }}
          </Badge>
          <Badge v-if="task.points > 0" variant="outline" class="ml-2 text-xs">
            {{ task.points }} pts
          </Badge>
          <Badge v-if="task.groupId" :style="{ backgroundColor: groupColor + '20', color: groupColor }" class="ml-2 text-xs border-0">
            Grouped
          </Badge>
        </CardTitle>
        
        <div class="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0"
            @click="toggleExpanded"
          >
            <ChevronDown 
              :class="{
                'w-4 h-4 transition-transform': true,
                'transform rotate-180': task.isExpanded
              }" 
            />
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent v-if="task.isExpanded" class="pt-0">
      <div class="space-y-4">
        <!-- Task Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-xs font-medium">
              Task ID <span class="text-destructive">*</span>
            </Label>
            <div class="text-sm text-muted-foreground">
              {{ task.taskId || 'Not configured' }}
            </div>
          </div>
          
          <div class="space-y-2">
            <Label class="text-xs font-medium">
              Task Name <span class="text-destructive">*</span>
            </Label>
            <div class="text-sm text-muted-foreground">
              {{ task.name || 'Not configured' }}
            </div>
          </div>
        </div>

        <div v-if="task.description" class="space-y-2">
          <Label class="text-xs font-medium">Description</Label>
          <div class="text-sm text-muted-foreground">
            {{ task.description }}
          </div>
        </div>

        <!-- Task Template -->
        <div class="space-y-2">
          <Label class="text-xs font-medium">
            Task Template <span class="text-destructive">*</span>
          </Label>
          <div class="text-sm text-muted-foreground">
            {{ task.templateId || 'Not selected' }}
          </div>
        </div>

        <!-- Execution Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-xs font-medium">
              Execution Device <span class="text-destructive">*</span>
            </Label>
            <div class="text-sm text-muted-foreground">
              {{ task.executionDevice || 'Not configured' }}
            </div>
          </div>
          
          <div class="space-y-2">
            <Label class="text-xs font-medium">Task Points</Label>
            <div class="text-sm text-muted-foreground">
              {{ task.points || 0 }} points
            </div>
          </div>
        </div>

        <!-- Target Devices -->
        <div class="space-y-2" v-if="task.targetDevices && task.targetDevices.length > 0">
          <Label class="text-xs font-medium">Target Devices</Label>
          <div class="flex flex-wrap gap-1">
            <Badge 
              v-for="device in task.targetDevices" 
              :key="device"
              variant="secondary" 
              class="text-xs"
            >
              {{ device }}
            </Badge>
          </div>
        </div>

        <!-- Test Cases Summary -->
        <div class="space-y-2">
          <Label class="text-xs font-medium">Test Cases</Label>
          <div class="text-sm text-muted-foreground">
            {{ task.testCases?.length || 0 }} test case{{ (task.testCases?.length || 0) !== 1 ? 's' : '' }} configured
          </div>
        </div>

        <!-- Parameters Summary -->
        <div class="space-y-2" v-if="task.parameters && Object.keys(task.parameters).length > 0">
          <Label class="text-xs font-medium">Parameters</Label>
          <div class="text-sm text-muted-foreground">
            {{ Object.keys(task.parameters).length }} parameter{{ Object.keys(task.parameters).length !== 1 ? 's' : '' }} configured
          </div>
        </div>

        <!-- Task Status -->
        <div class="pt-2 border-t border-gray-200">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
              <div 
                :class="{
                  'w-2 h-2 rounded-full': true,
                  'bg-red-500': hasErrors,
                  'bg-green-500': !hasErrors && isValid,
                  'bg-yellow-500': !hasErrors && !isValid
                }"
              />
              <span class="text-muted-foreground">
                {{ hasErrors ? 'Has errors' : isValid ? 'Valid' : 'Incomplete' }}
              </span>
            </div>
            <div class="text-muted-foreground">
              Order: {{ task.order || taskIndex + 1 }}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  CheckSquare, 
  ChevronDown, 
  GripVertical 
} from 'lucide-vue-next'

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// Types
import type { WizardTask } from '@/types/wizard'

// Props
interface Props {
  task: WizardTask
  taskIndex: number
  isDragging?: boolean
  groupColor?: string
}

// Emits
interface Emits {
  (e: 'start-drag', taskId: string): void
  (e: 'end-drag'): void
  (e: 'toggle-expanded', taskId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  isDragging: false
})

const emit = defineEmits<Emits>()

// Computed
const hasErrors = computed(() => {
  // Basic validation - check required fields
  return !props.task.taskId || 
         !props.task.name || 
         !props.task.templateId || 
         !props.task.executionDevice ||
         props.task.points <= 0 ||
         !props.task.testCases ||
         props.task.testCases.length === 0
})

const isValid = computed(() => {
  // Task is valid if all required fields are filled
  return props.task.taskId && 
         props.task.name && 
         props.task.templateId && 
         props.task.executionDevice &&
         props.task.points > 0 &&
         props.task.testCases &&
         props.task.testCases.length > 0
})

// Methods
const handleDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.task.tempId)
    event.dataTransfer.effectAllowed = 'move'
  }
  emit('start-drag', props.task.tempId)
}

const handleDragEnd = () => {
  emit('end-drag')
}

const toggleExpanded = () => {
  emit('toggle-expanded', props.task.tempId)
}
</script>

<style scoped>
.task-drag-ghost {
  opacity: 0.5;
}
</style>