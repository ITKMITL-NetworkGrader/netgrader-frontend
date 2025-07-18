<template>
  <div class="space-y-4 px-4 pt-4">
    
    <div class="items-center">
      <h3 class="font-medium text-lg">Grading Tasks</h3>
      <p class="text-sm text-gray-500">Drag and drop to reorder tasks</p>
    </div>

    <div v-if="tasks.length === 0" class="text-center py-8 text-gray-500">
      <FileText class="w-12 h-12 mx-auto mb-2 text-gray-300" />
      <p>No tasks configured yet</p>
      <p class="text-sm">Click "Add Task" to create your first grading task</p>
    </div>

    <div 
      v-else 
      class="space-y-2"
    >
      <div
        v-for="(task, index) in tasks"
        :key="task.id"
        :draggable="true"
        @dragstart="onDragStart($event, index)"
        @dragend="onDragEnd"
        @dragover.prevent="onDragOver($event, index)"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop($event, index)"
        class="group relative p-4 border rounded-lg cursor-move hover:bg-gray-50 transition-colors"
        :class="{ 'border-blue-300 bg-blue-50': dragOverIndex === index }"
      >
        <!-- Drag Handle -->
        <div class="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical class="w-4 h-4 text-gray-400" />
        </div>

        <div class="ml-6 flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <component :is="getTaskIcon(task.type)" class="w-5 h-5 text-blue-600" />
              <div>
                <h4 class="font-medium text-sm">{{ getTaskTypeName(task.type) }}</h4>
                <p class="text-xs text-gray-500">{{ task.points }} points</p>
              </div>
            </div>

            <div class="space-y-1 text-xs text-gray-600">
              <div v-if="task.destinationIPs?.length">
                <span class="font-medium">Targets:</span>
                {{ task.destinationIPs.filter(ip => ip.trim()).join(', ') }}
              </div>
              
              <div v-if="task.commands?.length && (task.type === 'show-command' || task.type === 'config-verify')">
                <span class="font-medium">Commands:</span>
                {{ task.commands.filter(cmd => cmd.trim()).join(', ') }}
              </div>
              
              <div>
                <span class="font-medium">Expected:</span>
                {{ getExpectedResultText(task.expectedResult) }}
                <span v-if="task.expectedOutput" class="ml-1">
                  ("{{ task.expectedOutput.substring(0, 30) }}{{ task.expectedOutput.length > 30 ? '...' : '' }}")
                </span>
              </div>
              
              <div>
                <span class="font-medium">Timeout:</span>
                {{ task.timeout }}s
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              class="h-8 w-8 p-0"
              @click="$emit('edit', task)"
            >
              <Edit2 class="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              @click="$emit('delete', task.id)"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tasks.length > 0" class="mt-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium">Total Points:</span>
        <span class="font-bold">{{ totalPoints }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Edit2, 
  Trash2, 
  FileText,
  GripVertical,
  Wifi,
  Route,
  Terminal,
  Phone,
  Monitor,
  CheckCircle
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { TaskConfig, PlayNode } from '@/types/play'

interface TaskConfigWithNode extends TaskConfig {
  nodeId: string
  nodeName: string
}

interface Props {
  nodes: PlayNode[]
}

interface Emits {
  (e: 'reorder', tasks: TaskConfigWithNode[]): void
  (e: 'delete', taskId: string): void
  (e: 'edit', task: TaskConfigWithNode): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Compute all tasks from all nodes
const tasks = computed((): TaskConfigWithNode[] => {
  if (!props.nodes) return []
  return props.nodes.flatMap(node => 
    (node.tasks || []).map((task: TaskConfig) => ({
      ...task,
      nodeId: node.id,
      nodeName: node.name
    }))
  )
})

const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const totalPoints = computed(() => {
  return tasks.value.reduce((sum: number, task: TaskConfigWithNode) => sum + (task.points || 0), 0)
})

const getTaskIcon = (type: string) => {
  const icons = {
    'ping': Wifi,
    'traceroute': Route,
    'ssh': Terminal,
    'telnet': Phone,
    'show-command': Monitor,
    'config-verify': CheckCircle
  }
  return icons[type as keyof typeof icons] || Monitor
}

const getTaskTypeName = (type: string) => {
  const names = {
    'ping': 'Ping Test',
    'traceroute': 'Traceroute',
    'ssh': 'SSH Connectivity',
    'telnet': 'Telnet Connectivity',
    'show-command': 'Show Command',
    'config-verify': 'Config Verification'
  }
  return names[type as keyof typeof names] || type
}

const getExpectedResultText = (result: string) => {
  const results = {
    'success': 'Success',
    'failure': 'Failure',
    'timeout': 'Timeout',
    'contains': 'Output Contains',
    'not-contains': 'Output Not Contains'
  }
  return results[result as keyof typeof results] || result
}

const onDragStart = (event: DragEvent, index: number) => {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
  }
}

const onDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const onDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  
  // Only show drag over effect if we're dragging over a different item
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

const onDragLeave = (event: DragEvent) => {
  // Only clear drag over if we're leaving the container entirely
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    dragOverIndex.value = null
  }
}

const onDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault()
  
  if (draggedIndex.value === null || draggedIndex.value === dropIndex) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }
  
  const newTasks = [...tasks.value]
  const draggedTask = newTasks[draggedIndex.value]
  
  // Remove the dragged task
  newTasks.splice(draggedIndex.value, 1)
  
  // Insert at the new position
  // If dragging from higher index to lower index, use dropIndex
  // If dragging from lower index to higher index, use dropIndex - 1 (since we removed one item)
  const insertIndex = draggedIndex.value > dropIndex ? dropIndex : dropIndex - 1
  
  // Insert at the new position
  newTasks.splice(insertIndex, 0, draggedTask)
  
  emit('reorder', newTasks)
  
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>