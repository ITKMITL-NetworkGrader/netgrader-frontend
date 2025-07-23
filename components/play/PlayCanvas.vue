<template>
  <div 
    ref="canvasRef"
    class="relative w-full h-full bg-muted"
    @drop="onDrop"
    @dragover.prevent
    @dragenter.prevent
    @click="clearSelection"
  >
    <!-- Grid background -->
    <div class="absolute inset-0 opacity-20">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-width="1" class="text-border"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    <!-- Connections Layer - Fixed positioning that follows scroll -->
    <svg 
      class="fixed pointer-events-none" 
      style="z-index: 1; top: 0; left: 0; width: 100vw; height: 100vh;"
    >
      <!-- Debug info for connections -->
      <text v-if="connections.length" x="10" y="20" fill="red" font-size="12">
        Connections: {{ connections.length }}
      </text>
      
      <ConnectionWire
        v-for="connection in connections"
        :key="connection.id"
        :connection="connection"
        :nodes="nodes"
        :canvas-ref="canvasRef"
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
      <!-- Grader Node -->
      <GraderNode
        v-if="graderNode && !nodesPendingDelete.has(graderNode.id)"
        :id="`node-${graderNode.id}`"
        :node="graderNode"
        :selected="selectedNodeId === graderNode.id"
        @select="selectNode(graderNode.id)"
        @move="moveNode"
        @node-click="handleNodeClick(graderNode)"
        @double-click="openInterfaceModal(graderNode)"
        @contextmenu="graderNode && openTaskModal(graderNode.id)"
      />
      
      <!-- Device Nodes -->
      <template v-for="node in deviceNodes" :key="node.id">
        <DeviceNode
          v-if="node && !nodesPendingDelete.has(node.id)"
          :id="`node-${node.id}`"
          :node="node"
          :selected="selectedNodeId === node.id"
          @select="selectNode(node.id)"
          @move="moveNode"
          @node-click="handleNodeClick(node)"
          @double-click="openInterfaceModal(node)"
          @contextmenu="openTaskModal(node.id)"
        />
      </template>

      <!-- Connection mode indicator -->
      <div 
        v-if="selectedConnectionType && !connectingFrom" 
        class="absolute top-4 left-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded px-3 py-1 text-sm z-10 text-green-800 dark:text-green-200"
      >
        Connection mode active: {{ selectedConnectionType }}. Click on a node to start wiring.
      </div>

      <!-- Connection status indicator -->
      <div 
        v-if="connectingFrom" 
        class="absolute top-4 left-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded px-3 py-1 text-sm z-10 text-blue-800 dark:text-blue-200"
      >
        Connecting from {{ getNodeName(connectingFrom.nodeId) }} ({{ getInterfaceName(connectingFrom.nodeId, connectingFrom.interfaceId) }})... Click on another node to complete connection
      </div>

      <!-- Interface Selection Modal -->
      <InterfaceSelectionModal
        v-model:open="isInterfaceModalOpen"
        :node="modalNode"
        :title="modalTitle"
        :connections="connections"
        @select="handleInterfaceSelection"
      />
      
      <!-- Task Configuration Modal -->
      <TaskConfigModal
        v-model:open="isTaskModalOpen"
        :node="selectedNode"
        :editing-task="editingTask"
        @save="handleTaskSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useNuxtApp } from '#app'
import GraderNode from './nodes/GraderNode.vue'
import DeviceNode from './nodes/DeviceNode.vue'
import ConnectionWire from './connections/ConnectionWire.vue'
import TaskConfigModal from './modals/TaskConfigModal.vue'
import InterfaceSelectionModal from './modals/InterfaceSelectionModal.vue'
import { usePlayCanvas } from '@/composables/usePlayCanvas'
import type { PlayNode, TaskConfig } from '@/types/play'
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

// Keyboard event handler
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' && selectedNodeId.value) {
    deleteNode(selectedNodeId.value)
  }
}

// Mouse move handler
const onMouseMove = (event: MouseEvent) => {
  if (connectingFrom.value && canvasRef.value) {
    // Since SVG is now fixed to viewport, use clientX/Y directly
    mousePosition.value = {
      x: event.clientX,
      y: event.clientY
    }
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
const mousePosition = ref<{ x: number; y: number } | null>(null)

const playCanvas = usePlayCanvas(props.playId)
const {
  nodes,
  connections,
  selectedNodeId,
  selectedNode,
  connectingFrom,
  addNode,
  moveNode,
  removeNode,
  isInterfaceModalOpen,
  selectedConnectionType,
  isTaskModalOpen,
  editingTask,
  modalNode,
  modalTitle,
  initiateConnection,
  handleInterfaceSelection,
  selectNode,
  clearSelection,
  openTaskModal,
  saveTask
} = playCanvas

// Reset editing task when modal closes  
watch(isTaskModalOpen, (isOpen) => {
  if (!isOpen) {
    // Already handled by closeTaskModal in composable
  }
})

const graderNode = computed(() => 
  nodes.value?.find(node => node.type === 'grader') || null
)

const deviceNodes = computed(() => 
  nodes.value?.filter(node => node.type === 'device') || []
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

const handleNodeClick = (node: PlayNode) => {
  if (!node) return
  
  if (selectedConnectionType.value) {
    // If a connection type is selected, initiate wiring
    initiateConnection(node)
  } else {
    // Otherwise, select the node
    selectNode(node.id)
  }
}

const handleTaskSave = (taskConfig: TaskConfig) => {
  // Use the composable's saveTask function which handles reactivity
  saveTask(taskConfig)
  
  // Force reactivity by triggering a change
  nextTick(() => {
    // Force a reactive update by reassigning the tasks array
    if (selectedNode.value && selectedNode.value.tasks) {
      selectedNode.value.tasks = [...selectedNode.value.tasks]
    }
  })
  
  // Close modal (handled by composable)
  isTaskModalOpen.value = false
}

const getNodeName = (nodeId: string) => {
  const node = nodes.value.find(n => n.id === nodeId)
  return node?.name || 'Unknown'
}

const getInterfaceName = (nodeId: string, interfaceId: string) => {
  const node = nodes.value.find(n => n.id === nodeId)
  const iface = node?.interfaces?.find(i => i.id === interfaceId)
  return iface?.name || 'Unknown'
}

const getTemporaryConnectionPath = () => {
  if (!connectingFrom.value || !mousePosition.value || !nodes.value || !canvasRef.value) return ''
  
  const sourceNode = nodes.value.find(n => n.id === connectingFrom.value!.nodeId)
  if (!sourceNode) return ''
  
  // Get canvas position relative to viewport
  const canvasRect = canvasRef.value.getBoundingClientRect()
  
  // Calculate source position relative to viewport (same as ConnectionWire)
  const sourceX = sourceNode.position.x + canvasRect.left + 40 // Center of node (80/2)
  const sourceY = sourceNode.position.y + canvasRect.top + 40
  
  return `M ${sourceX} ${sourceY} L ${mousePosition.value.x} ${mousePosition.value.y}`
}

const openInterfaceModal = (node: PlayNode) => {
  // Set connection type to LAN to enter connection mode  
  selectedConnectionType.value = 'lan'
  // Use the proper initiate connection flow
  initiateConnection(node)
}
</script>