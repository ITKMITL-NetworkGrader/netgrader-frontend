<template>
  <div class="h-screen flex flex-col bg-gray-50 pt-16">
    <!-- Custom header for Play page -->
    <div class="border-b bg-white px-4 py-2 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div>
            <h1 class="text-xl font-semibold">Play Editor</h1>
            <p class="text-sm text-gray-600">Course: {{ course?.name }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <!-- User info from navigation -->
          <span v-if="userState" class="text-sm text-gray-600">
            {{ userState.first_name }} {{ userState.last_name }}
          </span>
          <div class="flex gap-2">
            <Button variant="outline" @click="savePlay">Save</Button>
            <Button @click="publishPlay">Publish</Button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex-1 flex">
      <PlayToolbar class="w-64 border-r bg-white" :play-id="playId" />
      <div class="flex-1 flex">
        <PlayCanvas 
          class="flex-1 w-full" 
          :play-id="playId" 
        />
        <TaskList 
          class="w-80 border-l bg-white"
          :nodes="nodes" 
          @reorder="handleTaskReorder"
          @delete="handleTaskDelete"
          @edit="handleTaskEdit"
        />
      </div>
      <!-- End of main content -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import PlayToolbar from '@/components/play/PlayToolbar.vue'
import PlayCanvas from '@/components/play/PlayCanvas.vue'
import TaskList from '@/components/play/TaskList.vue'
import { usePlayCanvas } from '@/composables/usePlayCanvas'
import type { TaskConfig } from '@/types/play'

const route = useRoute()
const userState = useUserState()
const playId = computed(() => (route.params.id as string) || 'demo-play')

// Use the play canvas composable
const playCanvas = usePlayCanvas(playId.value)
const { 
  nodes, 
  deleteTask, 
  updateTaskOrder,
  editTask
} = playCanvas

// Add some mock tasks for testing
onMounted(() => {
  // Remove mock tasks - let users add their own
  // if (nodes.value.length > 0 && (!nodes.value[0].tasks || nodes.value[0].tasks.length === 0)) {
  //   nodes.value[0].tasks = [
  //     {
  //       id: 'task-1',
  //       type: 'ping',
  //       destinationIPs: ['192.168.1.1'],
  //       expectedResult: 'success',
  //       points: 10,
  //       timeout: 30
  //     },
  //     {
  //       id: 'task-2',
  //       type: 'ssh',
  //       destinationIPs: ['192.168.1.2'],
  //       username: 'admin',
  //       password: 'cisco',
  //       expectedResult: 'success',
  //       points: 15,
  //       timeout: 30
  //     }
  //   ]
  // }
})

// Mock course data for demo
const course = ref({ name: 'Demo Course' })

interface TaskConfigWithNode extends TaskConfig {
  nodeId: string
  nodeName: string
}

const handleTaskReorder = (reorderedTasks: TaskConfigWithNode[]) => {
  updateTaskOrder(reorderedTasks)
}

const handleTaskDelete = (taskId: string) => {
  deleteTask(taskId)
}

const handleTaskEdit = (task: TaskConfigWithNode) => {
  editTask(task.id)
}

const savePlay = async () => {
  console.log('Saving play...')
}

const publishPlay = async () => {
  console.log('Publishing play...')
}

// Use a custom layout or no layout for full-screen experience
// definePageMeta({
//   layout: false,  // This removes the default layout
// })
</script>