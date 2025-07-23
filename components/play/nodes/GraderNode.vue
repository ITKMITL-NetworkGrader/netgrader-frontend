<template>
  <div
    :id="`node-${node.id}`"
    :style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
    :class="[
      'absolute w-20 h-20 border-2 rounded-lg cursor-move select-none',
      selected ? 'border-blue-500 shadow-lg' : 'border-gray-300',
      'bg-card hover:shadow-md transition-shadow'
    ]"
    @mousedown="onMouseDown"
    @click.stop="handleClick"
    @dblclick.stop="handleDoubleClick"
    @contextmenu.prevent="handleRightClick"
  >
    <div class="w-full h-full flex flex-col items-center justify-center p-2">
      <Settings class="w-6 h-6 mb-1 text-purple-600" />
      <span class="text-xs font-medium truncate w-full text-center">{{ node.name }}</span>
    </div>
    
    <!-- Interface Connection Points
    <div
      v-for="(interfaceItem, index) in node.interfaces"
      :key="interfaceItem.id"
      :class="[
        'absolute w-3 h-3 rounded-full cursor-crosshair border-2 border-white',
        'hover:scale-110 transition-transform bg-purple-500'
      ]"
      :style="getInterfacePosition(index)"
      :title="`${interfaceItem.name}`"
      @click.stop="handleInterfaceClick(interfaceItem)"
    /> -->
  </div>
</template>

<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import type { PlayNode } from '@/types/play'

interface Props {
  node: PlayNode
  selected: boolean
}

interface Emits {
  (e: 'select', nodeId: string): void
  (e: 'move', nodeId: string, position: { x: number; y: number }): void
  (e: 'connect', data: { nodeId: string; interfaceId: string }): void
  (e: 'node-click', node: PlayNode): void
  (e: 'double-click', node: PlayNode): void
  (e: 'contextmenu', node: PlayNode): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const getInterfacePosition = (index: number) => {
  // Simple positioning for grader node
  return {
    top: '50%',
    right: '-6px',
    transform: 'translateY(-50%)'
  }
}

let isDragging = false
let dragOffset = { x: 0, y: 0 }

const onMouseDown = (event: MouseEvent) => {
  isDragging = false // Reset drag state
  dragOffset = {
    x: event.clientX - props.node.position.x,
    y: event.clientY - props.node.position.y
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (event: MouseEvent) => {
  isDragging = true // It's a drag if the mouse moves
  
  const nodeWidth = 80 // Grader node is always 80x80
  const nodeHeight = 80
  
  let newX = event.clientX - dragOffset.x
  let newY = event.clientY - dragOffset.y
  
  // Basic constraints to prevent negative positions
  newX = Math.max(0, newX)
  newY = Math.max(0, newY)
  
  const newPosition = { x: newX, y: newY }
  emit('move', props.node.id, newPosition)
}

const onMouseUp = () => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

const handleClick = () => {
  if (!isDragging) {
    // Only emit click if it wasn't a drag
    emit('select', props.node.id)
    emit('node-click', props.node)
  }
}

const handleRightClick = () => {
  emit('contextmenu', props.node)
}

const handleInterfaceClick = (interfaceItem: any) => {
  emit('connect', { nodeId: props.node.id, interfaceId: interfaceItem.id })
}

const handleDoubleClick = () => {
  emit('double-click', props.node)
}
</script>