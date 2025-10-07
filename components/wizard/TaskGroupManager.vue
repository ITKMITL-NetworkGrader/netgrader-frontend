<template>
  <div class="space-y-6">
    <!-- Task Groups Header -->
    <div class="flex items-center justify-between">
      <div>
        <Label class="text-sm font-medium text-purple-700">Task Groups</Label>
        <p class="text-xs text-muted-foreground mt-1">
          Organize tasks into groups for execution control and grading
        </p>
      </div>
      <Button @click="openCreateGroupModal" variant="outline" size="sm" class="border-purple-200 text-purple-700 hover:bg-purple-50">
        <FolderPlus class="w-4 h-4 mr-2" />
        Create Task Group
      </Button>
    </div>

    <!-- Task Group Swimlanes -->
    <div class="space-y-6">
      <!-- Ungrouped Tasks Swimlane -->
      <div class="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/30">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <Package class="w-4 h-4 text-gray-500" />
            <h4 class="font-medium text-gray-700">Ungrouped Tasks</h4>
            <Badge variant="secondary" class="text-xs">
              {{ ungroupedTasks.length }} task{{ ungroupedTasks.length !== 1 ? 's' : '' }}
            </Badge>
          </div>
          <span class="text-xs text-muted-foreground">
            Drag tasks here to ungroup them
          </span>
        </div>
        
        <div 
          ref="ungroupedDropZone"
          class="min-h-[100px] space-y-3 transition-colors"
          :class="{
            'bg-green-50 border-green-200': isDragOverUngrouped,
            'border-2 border-dashed border-gray-300 rounded-md p-3': ungroupedTasks.length === 0
          }"
        >
          <div v-if="ungroupedTasks.length === 0" class="text-center text-sm text-muted-foreground py-4">
            No ungrouped tasks
          </div>
          
          <TaskCard
            v-for="task in ungroupedTasks"
            :key="task.tempId"
            :task="task"
            :task-index="getTaskIndex(task.tempId)"
            :is-dragging="isDragging && draggedTaskId === task.tempId"
            @start-drag="handleTaskDragStart"
            @end-drag="handleTaskDragEnd"
            @toggle-expanded="handleToggleExpanded"
          />
        </div>
      </div>

      <!-- Task Group Swimlanes -->
      <div 
        v-for="group in localTaskGroups" 
        :key="group.tempId"
        class="border-2 rounded-lg p-4 transition-colors"
        :class="getGroupBorderClass(group)"
        :style="{ borderColor: getGroupColor(group) }"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <FolderOpen :class="`w-4 h-4`" :style="{ color: getGroupColor(group) }" />
            <h4 class="font-medium" :style="{ color: getGroupColor(group) }">
              {{ group.title }}
            </h4>
            <Badge 
              :variant="group.group_type === 'all_or_nothing' ? 'destructive' : 'default'"
              class="text-xs"
            >
              {{ group.group_type === 'all_or_nothing' ? 'All or Nothing' : 'Proportional' }}
            </Badge>
            <Badge variant="outline" class="text-xs">
              {{ getGroupTasks(group.tempId).length }} task{{ getGroupTasks(group.tempId).length !== 1 ? 's' : '' }}
            </Badge>
            <Badge variant="secondary" class="text-xs">
              {{ group.points }} pts
            </Badge>
          </div>
          
          <div class="flex items-center space-x-2">
            <Button 
              @click="editGroup(group)" 
              variant="ghost" 
              size="sm"
              class="h-8 w-8 p-0"
            >
              <Settings class="w-4 h-4" />
            </Button>
            <Button 
              @click="deleteGroup(group.tempId)" 
              variant="ghost" 
              size="sm"
              class="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div class="text-xs text-muted-foreground mb-3" v-if="group.description">
          {{ group.description }}
        </div>
        
        <div 
          :ref="el => setGroupDropZone(group.tempId, el)"
          class="min-h-[80px] space-y-3 transition-colors rounded-md"
          :class="{
            'bg-green-50 border-green-200': isDragOverGroup === group.tempId,
            'border-2 border-dashed border-gray-300 p-3': getGroupTasks(group.tempId).length === 0
          }"
        >
          <div v-if="getGroupTasks(group.tempId).length === 0" class="text-center text-sm text-muted-foreground py-4">
            Drag tasks here to add them to this group
          </div>
          
          <TaskCard
            v-for="task in getGroupTasks(group.tempId)"
            :key="task.tempId"
            :task="task"
            :task-index="getTaskIndex(task.tempId)"
            :is-dragging="isDragging && draggedTaskId === task.tempId"
            :group-color="getGroupColor(group)"
            @start-drag="handleTaskDragStart"
            @end-drag="handleTaskDragEnd"
            @toggle-expanded="handleToggleExpanded"
          />
        </div>

        <!-- Group Summary -->
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <div class="flex items-center space-x-4">
              <span>Timeout: {{ group.timeout_seconds }}s</span>
              <span>Continue on failure: {{ group.continue_on_failure ? 'Yes' : 'No' }}</span>
            </div>
            <span class="font-medium">
              Total: {{ group.points }} pts (overrides individual task points)
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Task Group Modal -->
    <Dialog v-model:open="isGroupModalOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {{ isEditingGroup ? 'Edit Task Group' : 'Create Task Group' }}
          </DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="group-title">Group Title <span class="text-destructive">*</span></Label>
            <Input
              id="group-title"
              v-model="groupForm.title"
              placeholder="Basic Setup Tasks"
              :class="{
                'border-destructive': groupFormErrors.title,
                'border-green-500': !groupFormErrors.title && groupForm.title.length > 0
              }"
            />
            <p v-if="groupFormErrors.title" class="text-xs text-destructive">
              {{ groupFormErrors.title }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="group-description">Description (Optional)</Label>
            <Input
              id="group-description"
              v-model="groupForm.description"
              placeholder="Core device configuration tasks"
            />
          </div>

          <div class="space-y-2">
            <Label>Group Type <span class="text-destructive">*</span></Label>
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <input
                  id="all-or-nothing"
                  v-model="groupForm.group_type"
                  value="all_or_nothing"
                  type="radio"
                  class="w-4 h-4 text-destructive border-gray-300 focus:ring-destructive"
                />
                <Label for="all-or-nothing" class="text-sm">
                  All or Nothing - Students get full points or zero for entire group
                </Label>
              </div>
              <div class="flex items-center space-x-2">
                <input
                  id="proportional"
                  v-model="groupForm.group_type"
                  value="proportional"
                  type="radio"
                  class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <Label for="proportional" class="text-sm">
                  Proportional - Students get partial credit based on completed tasks
                </Label>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="group-points">Group Points <span class="text-destructive">*</span></Label>
              <Input
                id="group-points"
                v-model.number="groupForm.points"
                type="number"
                min="0"
                placeholder="20"
                :class="{
                  'border-destructive': groupFormErrors.points,
                  'border-green-500': !groupFormErrors.points && groupForm.points > 0
                }"
              />
              <p v-if="groupFormErrors.points" class="text-xs text-destructive">
                {{ groupFormErrors.points }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="group-timeout">Timeout (seconds) <span class="text-destructive">*</span></Label>
              <Input
                id="group-timeout"
                v-model.number="groupForm.timeout_seconds"
                type="number"
                min="1"
                max="3600"
                placeholder="300"
                :class="{
                  'border-destructive': groupFormErrors.timeout_seconds,
                  'border-green-500': !groupFormErrors.timeout_seconds && groupForm.timeout_seconds > 0
                }"
              />
              <p v-if="groupFormErrors.timeout_seconds" class="text-xs text-destructive">
                {{ groupFormErrors.timeout_seconds }}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <input
              id="continue-on-failure"
              v-model="groupForm.continue_on_failure"
              type="checkbox"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Label for="continue-on-failure" class="text-sm">
              Continue execution if this group fails
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="closeGroupModal">
            Cancel
          </Button>
          <Button type="button" @click="saveGroup">
            {{ isEditingGroup ? 'Update Group' : 'Create Group' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, defineAsyncComponent } from 'vue'
import { 
  FolderPlus, 
  FolderOpen, 
  Package, 
  Settings, 
  Trash2
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// Types
import type { WizardTask, WizardTaskGroup } from '@/types/wizard'

// Import TaskCard component (we'll create this next)
const TaskCard = defineAsyncComponent(() => import('./TaskCard.vue'))

// Props
interface Props {
  tasks: WizardTask[]
  taskGroups: WizardTaskGroup[]
}

// Emits
interface Emits {
  (e: 'update:tasks', value: WizardTask[]): void
  (e: 'update:task-groups', value: WizardTaskGroup[]): void
  (e: 'task-group-changed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localTaskGroups = ref<WizardTaskGroup[]>([])
const isGroupModalOpen = ref(false)
const isEditingGroup = ref(false)
const editingGroupId = ref<string | null>(null)

// Drag and drop state
const isDragging = ref(false)
const draggedTaskId = ref<string | null>(null)
const isDragOverUngrouped = ref(false)
const isDragOverGroup = ref<string | null>(null)

// Group form
const groupForm = ref({
  title: '',
  description: '',
  group_type: 'proportional' as 'all_or_nothing' | 'proportional',
  points: 0,
  continue_on_failure: false,
  timeout_seconds: 300
})

const groupFormErrors = ref<Record<string, string>>({})

// Refs for drop zones
const ungroupedDropZone = ref<HTMLElement>()
const groupDropZones = ref<Map<string, HTMLElement>>(new Map())

// Computed
const ungroupedTasks = computed(() => {
  return props.tasks.filter(task => !task.groupId)
})

// Methods
const getTaskIndex = (tempId: string): number => {
  return props.tasks.findIndex(task => task.tempId === tempId)
}

const getGroupTasks = (groupTempId: string): WizardTask[] => {
  // Find the group by tempId to get its actual group_id
  const group = localTaskGroups.value.find(g => g.tempId === groupTempId)
  if (!group) return []
  
  // Filter tasks that have this group's actual group_id
  return props.tasks.filter(task => task.groupId === group.group_id)
}

const getGroupColor = (group: WizardTaskGroup): string => {
  // Generate colors from theme CSS variables
  const getThemeColor = (varName: string) => {
    if (process.client) {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue(varName).trim();
    }
    return '';
  };

  // Use a variety of theme-aware colors for different groups
  const colors = [
    getThemeColor('--color-primary'),      // Primary
    getThemeColor('--color-secondary'),    // Secondary
    getThemeColor('--color-accent'),       // Accent
    getThemeColor('--color-chart-1'),      // Chart 1
    getThemeColor('--color-chart-2'),      // Chart 2
    getThemeColor('--color-chart-3'),      // Chart 3
    getThemeColor('--color-chart-4'),      // Chart 4
    getThemeColor('--color-chart-5'),      // Chart 5
  ].filter(c => c) // Filter out empty values

  const index = localTaskGroups.value.findIndex(g => g.tempId === group.tempId)
  return colors[index % colors.length] || getThemeColor('--color-primary')
}

const getGroupBorderClass = (group: WizardTaskGroup): string => {
  return group.group_type === 'all_or_nothing' 
    ? 'border-red-200 bg-red-50/30' 
    : 'border-blue-200 bg-blue-50/30'
}

const setGroupDropZone = (groupId: string, element: HTMLElement | null) => {
  if (element) {
    groupDropZones.value.set(groupId, element)
  }
}

// Task Group CRUD
const openCreateGroupModal = () => {
  isEditingGroup.value = false
  editingGroupId.value = null
  resetGroupForm()
  isGroupModalOpen.value = true
}

const editGroup = (group: WizardTaskGroup) => {
  isEditingGroup.value = true
  editingGroupId.value = group.tempId
  groupForm.value = {
    title: group.title,
    description: group.description || '',
    group_type: group.group_type,
    points: group.points,
    continue_on_failure: group.continue_on_failure,
    timeout_seconds: group.timeout_seconds
  }
  isGroupModalOpen.value = true
}

const resetGroupForm = () => {
  groupForm.value = {
    title: '',
    description: '',
    group_type: 'proportional',
    points: 0,
    continue_on_failure: false,
    timeout_seconds: 300
  }
  groupFormErrors.value = {}
}

const validateGroupForm = (): boolean => {
  groupFormErrors.value = {}
  
  if (!groupForm.value.title.trim()) {
    groupFormErrors.value.title = 'Group title is required'
  }
  
  if (groupForm.value.points <= 0) {
    groupFormErrors.value.points = 'Points must be greater than 0'
  }
  
  if (groupForm.value.timeout_seconds <= 0) {
    groupFormErrors.value.timeout_seconds = 'Timeout must be greater than 0'
  } else if (groupForm.value.timeout_seconds > 3600) {
    groupFormErrors.value.timeout_seconds = 'Timeout cannot exceed 3600 seconds'
  }
  
  return Object.keys(groupFormErrors.value).length === 0
}

const saveGroup = () => {
  if (!validateGroupForm()) return
  
  if (isEditingGroup.value && editingGroupId.value) {
    // Update existing group
    const groupIndex = localTaskGroups.value.findIndex(g => g.tempId === editingGroupId.value)
    if (groupIndex >= 0) {
      localTaskGroups.value[groupIndex] = {
        ...localTaskGroups.value[groupIndex],
        ...groupForm.value
      }
    }
  } else {
    // Create new group
    const newGroup: WizardTaskGroup = {
      tempId: `temp_group_${Date.now()}`,
      group_id: `group_${Date.now()}`,
      title: groupForm.value.title,
      description: groupForm.value.description,
      group_type: groupForm.value.group_type,
      points: groupForm.value.points,
      continue_on_failure: groupForm.value.continue_on_failure,
      timeout_seconds: groupForm.value.timeout_seconds,
      taskIds: [],
      isExpanded: true
    }
    
    localTaskGroups.value.push(newGroup)
  }
  
  closeGroupModal()
  emit('task-group-changed')
}

const deleteGroup = (groupTempId: string) => {
  // Find the group by tempId to get its actual group_id
  const group = localTaskGroups.value.find(g => g.tempId === groupTempId)
  if (!group) return
  
  // Move all tasks from this group back to ungrouped
  const updatedTasks = props.tasks.map(task => 
    task.groupId === group.group_id ? { ...task, groupId: undefined } : task
  )
  emit('update:tasks', updatedTasks)
  
  // Remove the group
  localTaskGroups.value = localTaskGroups.value.filter(g => g.tempId !== groupTempId)
  emit('task-group-changed')
}

const closeGroupModal = () => {
  isGroupModalOpen.value = false
  resetGroupForm()
}

// Drag and Drop handlers
const handleTaskDragStart = (taskId: string) => {
  isDragging.value = true
  draggedTaskId.value = taskId
}

const handleTaskDragEnd = () => {
  isDragging.value = false
  draggedTaskId.value = null
  isDragOverUngrouped.value = false
  isDragOverGroup.value = null
}

const moveTaskToGroup = (taskId: string, groupTempId: string | null) => {
  let actualGroupId: string | null = null
  
  // If groupTempId is provided, find the actual group_id
  if (groupTempId) {
    const group = localTaskGroups.value.find(g => g.tempId === groupTempId)
    actualGroupId = group ? group.group_id : null
  }
  
  const updatedTasks = props.tasks.map(task =>
    task.tempId === taskId ? { ...task, groupId: actualGroupId } : task
  )
  emit('update:tasks', updatedTasks)
  emit('task-group-changed')
}

// Setup drag and drop zones
const setupDropZones = () => {
  // Clean up existing listeners first
  cleanupDropZones()
  
  // Setup ungrouped drop zone
  if (ungroupedDropZone.value) {
    ungroupedDropZone.value.addEventListener('dragover', handleUngroupedDragOver)
    ungroupedDropZone.value.addEventListener('dragleave', handleUngroupedDragLeave)
    ungroupedDropZone.value.addEventListener('drop', handleUngroupedDrop)
  }
  
  // Setup group drop zones
  groupDropZones.value.forEach((element, groupId) => {
    element.addEventListener('dragover', (e) => handleGroupDragOver(e, groupId))
    element.addEventListener('dragleave', (e) => handleGroupDragLeave(e, groupId))
    element.addEventListener('drop', (e) => handleGroupDrop(e, groupId))
  })
}

const cleanupDropZones = () => {
  // Cleanup ungrouped drop zone
  if (ungroupedDropZone.value) {
    ungroupedDropZone.value.removeEventListener('dragover', handleUngroupedDragOver)
    ungroupedDropZone.value.removeEventListener('dragleave', handleUngroupedDragLeave)
    ungroupedDropZone.value.removeEventListener('drop', handleUngroupedDrop)
  }
  
  // Cleanup group drop zones
  groupDropZones.value.forEach((element, groupId) => {
    element.removeEventListener('dragover', (e) => handleGroupDragOver(e, groupId))
    element.removeEventListener('dragleave', (e) => handleGroupDragLeave(e, groupId))
    element.removeEventListener('drop', (e) => handleGroupDrop(e, groupId))
  })
}

const handleUngroupedDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOverUngrouped.value = true
}

const handleUngroupedDragLeave = () => {
  isDragOverUngrouped.value = false
}

const handleUngroupedDrop = (e: DragEvent) => {
  e.preventDefault()
  if (draggedTaskId.value) {
    moveTaskToGroup(draggedTaskId.value, null)
  }
  isDragOverUngrouped.value = false
}

const handleGroupDragOver = (e: DragEvent, groupId: string) => {
  e.preventDefault()
  isDragOverGroup.value = groupId
}

const handleGroupDragLeave = (e: DragEvent, groupId: string) => {
  isDragOverGroup.value = null
}

const handleGroupDrop = (e: DragEvent, groupId: string) => {
  e.preventDefault()
  if (draggedTaskId.value) {
    moveTaskToGroup(draggedTaskId.value, groupId)
  }
  isDragOverGroup.value = null
}

const handleToggleExpanded = (taskId: string) => {
  const updatedTasks = props.tasks.map(task =>
    task.tempId === taskId ? { ...task, isExpanded: !task.isExpanded } : task
  )
  emit('update:tasks', updatedTasks)
}

// Watchers - Prevent recursion with update guards
const isUpdatingFromProps = ref(false)

watch(
  () => props.taskGroups,
  (newGroups) => {
    isUpdatingFromProps.value = true
    localTaskGroups.value = [...newGroups]
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true, immediate: true }
)

watch(
  localTaskGroups,
  (newGroups) => {
    if (!isUpdatingFromProps.value) {
      emit('update:task-groups', newGroups)
    }
    // Re-setup drop zones when groups change
    nextTick(() => {
      setupDropZones()
    })
  },
  { deep: true, flush: 'post' }
)

// Lifecycle
onMounted(() => {
  nextTick(() => {
    setupDropZones()
  })
})

onUnmounted(() => {
  // Cleanup event listeners
  cleanupDropZones()
})
</script>

<style scoped>
.task-group-enter-active,
.task-group-leave-active {
  transition: all 0.3s ease;
}

.task-group-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.task-group-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>