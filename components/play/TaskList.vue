<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { Button } from '@/components/ui/button'
import type { TaskConfig, PlayNode } from '@/types/play'

interface Props {
  nodes: PlayNode[]
}

interface Emits {
  (e: 'reorder', tasks: TaskConfigWithNode[]): void
  (e: 'delete', taskId: string): void
  (e: 'edit' | 'duplicate', task: TaskConfigWithNode): void
}

interface TaskConfigWithNode extends TaskConfig {
  nodeId: string
  nodeName: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Compute all tasks from all nodes first
const allTasks = computed<TaskConfigWithNode[]>(() => {
  const tasks: TaskConfigWithNode[] = []
  
  if (props.nodes && Array.isArray(props.nodes)) {
    props.nodes.forEach(node => {
      if (node.tasks && Array.isArray(node.tasks) && node.tasks.length > 0) {
        node.tasks.forEach(task => {
          tasks.push({
            ...task,
            nodeId: node.id,
            nodeName: node.name
          })
        })
      }
    })
  }
  
  return tasks
})

// Create a local copy of tasks for drag and drop
const localTasks = ref<TaskConfigWithNode[]>([...allTasks.value])

// Update local tasks when allTasks changes
watch(allTasks, (newTasks) => {
  localTasks.value = [...newTasks]
}, { immediate: true })

const totalPoints = computed(() => {
  if (!localTasks.value || !Array.isArray(localTasks.value)) {
    return 0
  }
  return localTasks.value.reduce((sum, task) => sum + (task.points || 0), 0)
})

const onDragEnd = () => {
  emit('reorder', localTasks.value)
}

const getTaskTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    ping: 'Ping Test',
    traceroute: 'Traceroute',
    ssh: 'SSH Connect',
    telnet: 'Telnet Connect',
    'show-command': 'Show Command',
    'config-verify': 'Config Verify'
  }
  return labels[type] || type
}

const getNodeName = (nodeId: string): string => {
  const node = props.nodes.find(n => n.id === nodeId)
  return node?.name || 'Unknown'
}

const deleteTask = (taskId: string) => {
  emit('delete', taskId)
}

const editTask = (task: TaskConfigWithNode) => {
  emit('edit', task)
}

const duplicateTask = (task: TaskConfigWithNode) => {
  emit('duplicate', task)
}
</script>
<template>
  <div class="w-80 border-l bg-white h-full flex flex-col">
    <div class="p-4 border-b">
      <h2 class="text-lg font-semibold">Grading Tasks</h2>
      <p class="text-sm text-gray-600">Drag to reorder tasks</p>
    </div>
    
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="localTasks.length === 0" class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">📝</div>
        <p>No tasks created yet</p>
        <p class="text-xs mt-1">Configure tasks for devices to get started</p>
      </div>
      
      <VueDraggable
        v-else
        v-model="localTasks"
        class="space-y-3"
        :animation="300"
        ghost-class="opacity-50"
        chosen-class="ring-2 ring-blue-500"
        @end="onDragEnd"
      >
        <div
          v-for="task in localTasks"
          :key="task.id"
          class="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-500" />
              <span class="font-medium text-sm">{{ getTaskTypeLabel(task.type) }}</span>
              <span class="text-xs bg-gray-200 px-2 py-1 rounded">{{ task.points }}pts</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              @click="deleteTask(task.id)"
            >
              ×
            </Button>
          </div>
          
          <div class="text-xs text-gray-600 space-y-1">
            <div v-if="task.destinationIPs && task.destinationIPs.length > 0">
              <span class="font-medium">Target:</span>
              {{ task.destinationIPs.join(', ') }}
            </div>
            
            <div v-if="task.commands && task.commands.length > 0">
              <span class="font-medium">Commands:</span>
              {{ task.commands.join('; ') }}
            </div>
            
            <div>
              <span class="font-medium">Expected:</span>
              {{ task.expectedResult || 'N/A' }}
              <span v-if="task.timeout" class="ml-2">
                ({{ task.timeout }}s timeout)
              </span>
            </div>
            
            <div v-if="task.expectedOutput">
              <span class="font-medium">Output:</span>
              {{ task.expectedOutput.slice(0, 50) }}{{ task.expectedOutput.length > 50 ? '...' : '' }}
            </div>
          </div>
          
          <div class="mt-2 flex items-center justify-between">
            <span class="text-xs text-gray-500">
              Node: {{ getNodeName(task.nodeId) }}
            </span>
            <div class="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                class="h-6 px-2 text-xs"
                @click="editTask(task)"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 px-2 text-xs"
                @click="duplicateTask(task)"
              >
                Duplicate
              </Button>
            </div>
          </div>
        </div>
      </VueDraggable>
    </div>
    
    <div class="p-4 border-t bg-gray-50">
      <div class="text-xs text-gray-600">
        Total: {{ localTasks.length }} tasks • {{ totalPoints }} points
      </div>
    </div>
  </div>
</template>