<template>
  <div 
    ref="canvasRef"
    class="relative w-full h-full bg-gray-100"
    @drop="onDrop"
    @dragover.prevent
    @click="clearSelection"
  >
    <!-- Grid background -->
    <div class="absolute inset-0 opacity-20">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    <!-- Connections Layer - Full canvas coverage -->
    <svg 
      class="absolute inset-0 pointer-events-none" 
      style="z-index: 1; width: 100%; height: 100%;"
      viewBox="0 0 100% 100%"
      preserveAspectRatio="none"
    >
      <ConnectionWire
        v-for="connection in connections"
        :key="connection.id"
        :connection="connection"
        :nodes="nodes"
      />
      
      <!-- Temporary connection line while connecting -->
      <path
        v-if="connectingFrom && mousePosition"
        :d="getTemporaryConnectionPath()"
        stroke="#3b82f6"
        stroke-width="2"
        stroke-dasharray="5,5"
        fill="none"
      />
    </svg>

    <!-- Nodes Layer -->
    <div class="absolute inset-0" style="z-index: 2;">
      <GraderNode
        v-if="graderNode"
        :node="graderNode"
        :selected="selectedNodeId === graderNode.id"
        @select="selectNode"
        @move="moveNode"
        @connect="handleConnection"
      />
      
      <DeviceNode
        v-for="node in deviceNodes"
        :key="node.id"
        :node="node"
        :selected="selectedNodeId === node.id"
        @select="selectNode"
        @move="moveNode"
        @connect="handleConnection"
        @double-click="openTaskModal"
      />
    </div>

    <!-- Connection status indicator -->
    <div 
      v-if="connectingFrom" 
      class="absolute top-4 left-4 bg-blue-100 border border-blue-300 rounded px-3 py-1 text-sm z-10"
    >
      Connecting from {{ getNodeName(connectingFrom.nodeId) }}... Click on another interface to connect
    </div>

    <!-- Task Configuration Modal -->
    <TaskConfigModal
      v-model:open="showTaskModal"
      :node="selectedNode"
      @save="saveTask"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import GraderNode from './nodes/GraderNode.vue'
import DeviceNode from './nodes/DeviceNode.vue'
import ConnectionWire from './connections/ConnectionWire.vue'
import TaskConfigModal from './modals/TaskConfigModal.vue'
import { usePlayCanvas } from '@/composables/usePlayCanvas'
import type { PlayNode, Connection } from '@/types/play'
import { toast } from 'vue-sonner'
import 'vue-sonner/style.css'

interface Props {
  playId: string
}

const { $anime } = useNuxtApp()

const nodesPendingDelete = ref<Set<string>>(new Set())

const deleteNode = async (nodeId: string) => {
    const node = nodes.value.find(n => n.id === nodeId)
  if (node?.type === 'grader') {
    toast.error('No! No! No!', {
      description: 'Grader node cannot be deleted.'
    })
    return
  }

  nodesPendingDelete.value.add(nodeId)
  await nextTick()
  $anime({
    targets: `#node-${nodeId}`,
    scale: [1, 0],
    opacity: [1, 0],
    duration: 200,
    easing: 'easeInBack',
    complete: () => {
      nodesPendingDelete.value.delete(nodeId)
      removeNode(nodeId)
    }
  })
}

// 3. Keyboard event handler
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' && selectedNodeId.value) {
    deleteNode(selectedNodeId.value)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('mousemove', onMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('mousemove', onMouseMove)
})

const props = defineProps<Props>()

const canvasRef = ref<HTMLElement>()
const showTaskModal = ref(false)
const mousePosition = ref<{ x: number; y: number } | null>(null)

const {
  nodes,
  connections,
  selectedNodeId,
  selectedNode,
  connectingFrom,
  addNode,
  moveNode,
  removeNode,
  selectNode,
  clearSelection,
  startConnection,
  completeConnection,
  saveTask
} = usePlayCanvas(props.playId)

const graderNode = computed(() => 
  nodes.value.find(node => node.type === 'grader')
)

const deviceNodes = computed(() => 
  nodes.value.filter(node => node.type === 'device')
)

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  const nodeType = event.dataTransfer?.getData('text/plain')
  
  if (nodeType && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    addNode(nodeType, { x, y })
  }
}

const handleConnection = (data: { nodeId: string; interfaceId: string }) => {
  if (!connectingFrom.value) {
    startConnection(data)
  } else {
    completeConnection(data)
  }
}

const getNodeName = (nodeId: string) => {
  const node = nodes.value.find(n => n.id === nodeId)
  return node?.name || 'Unknown'
}

const getTemporaryConnectionPath = () => {
  if (!connectingFrom.value || !mousePosition.value) return ''
  
  const sourceNode = nodes.value.find(n => n.id === connectingFrom.value!.nodeId)
  if (!sourceNode) return ''
  
  const sourceX = sourceNode.position.x + 40 // Center of node (80/2)
  const sourceY = sourceNode.position.y + 40
  
  return `M ${sourceX} ${sourceY} L ${mousePosition.value.x} ${mousePosition.value.y}`
}

const onMouseMove = (event: MouseEvent) => {
  if (connectingFrom.value && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    mousePosition.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }
}

const openTaskModal = (node: PlayNode) => {
  selectNode(node.id)
  showTaskModal.value = true
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
})
</script>