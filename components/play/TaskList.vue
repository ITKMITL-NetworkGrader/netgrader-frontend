<template>
  <div class="h-full flex flex-col">
    <!-- Empty State -->
    <div v-if="tasks.length === 0" class="flex-1 flex items-center justify-center text-center p-8">
      <div class="text-muted-foreground">
        <Icon name="lucide:list-checks" class="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h3 class="text-lg font-medium mb-2">No Tasks Yet</h3>
        <p class="text-sm">Add your first task to get started with this play.</p>
        <p class="text-xs mt-2">Tasks define what will be tested automatically.</p>
      </div>
    </div>

    <!-- Task List -->
    <div v-else class="flex-1 overflow-y-auto space-y-3">
      <div 
        v-for="(task, index) in tasks" 
        :key="index"
        ref="taskElements"
      >
        <TaskCard
          :task="task"
          :index="index"
          :is-selected="index === currentTaskIndex"
          :available-devices="availableDevices"
          :is-draggable="tasks.length > 1"
          @click="$emit('select:task', index)"
          @edit="$emit('edit:task', index)"
          @duplicate="$emit('duplicate:task', index)"
          @remove="$emit('remove:task', index)"
        />
      </div>
    </div>

    <!-- Task Statistics -->
    <div v-if="tasks.length > 0" class="mt-4 pt-4 border-t border-border">
      <div class="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div class="font-semibold text-lg">{{ tasks.length }}</div>
          <div class="text-muted-foreground">Tasks</div>
        </div>
        <div>
          <div class="font-semibold text-lg">{{ totalTestCases }}</div>
          <div class="text-muted-foreground">Test Cases</div>
        </div>
        <div>
          <div class="font-semibold text-lg text-primary">{{ totalPoints }}</div>
          <div class="text-muted-foreground">Points</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'
import Sortable from 'sortablejs'
import TaskCard from './TaskCard.vue'
import type { TaskFormData } from '@/types/lab'

// Props
interface Props {
  tasks: TaskFormData[]
  currentTaskIndex: number
  availableDevices: Array<{ value: string; label: string; icon: string }>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'select:task': [index: number]
  'edit:task': [index: number]
  'duplicate:task': [index: number]
  'remove:task': [index: number]
  'reorder:tasks': [fromIndex: number, toIndex: number]
}>()

// Refs
const taskElements = ref<HTMLElement[]>([])

// Sortable instance
let sortableInstance: Sortable | null = null

// Computed
const totalPoints = computed(() => {
  return props.tasks.reduce((sum, task) => sum + task.points, 0)
})

const totalTestCases = computed(() => {
  return props.tasks.reduce((sum, task) => sum + task.test_cases.length, 0)
})

// Methods
const initSortable = async () => {
  await nextTick()
  
  const container = taskElements.value[0]?.parentElement
  if (!container || props.tasks.length <= 1) return

  sortableInstance = new Sortable(container, {
    animation: 200,
    delay: 100,
    delayOnTouchStart: true,
    ghostClass: 'opacity-50',
    chosenClass: 'ring-2 ring-primary',
    dragClass: 'rotate-3 scale-105',
    handle: '[data-sortable-handle]',
    
    onEnd: (event) => {
      const { oldIndex, newIndex } = event
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        emit('reorder:tasks', oldIndex, newIndex)
      }
    }
  })
}

const destroySortable = () => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
}

// Lifecycle
onMounted(() => {
  initSortable()
})

onUnmounted(() => {
  destroySortable()
})

// Watch for changes that require sortable re-initialization
watch(() => props.tasks.length, () => {
  destroySortable()
  nextTick(() => {
    initSortable()
  })
}, { flush: 'post' })
</script>

<style scoped>
.rotate-3 {
  transform: rotate(3deg);
}

.scale-105 {
  transform: scale(1.05);
}

/* Smooth transitions for drag and drop */
.task-card {
  transition: all 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
</style>