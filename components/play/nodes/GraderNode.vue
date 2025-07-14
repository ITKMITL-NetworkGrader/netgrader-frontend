<template>
  <div
    :id="`node-${node.id}`"
    :style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
    :class="[
      'absolute w-20 h-20 border-2 rounded-lg cursor-move select-none',
      selected ? 'border-blue-500 shadow-lg' : 'border-gray-300',
      'bg-white hover:shadow-md transition-shadow'
    ]"
    @mousedown="onMouseDown"
    @click.stop="$emit('select', node.id)"
  >
    <div class="w-full h-full flex flex-col items-center justify-center p-2">
      <Settings class="w-6 h-6 mb-1 text-purple-600" />
      <span class="text-xs font-medium truncate w-full text-center">{{ node.name }}</span>
    </div>
    
    <!-- Interface Connection Points -->
    <div
      v-for="(interfaceItem, index) in node.interfaces"
      :key="interfaceItem.id"
      :class="[
        'absolute w-3 h-3 rounded-full cursor-crosshair border-2 border-white',
        'hover:scale-110 transition-transform bg-purple-500'
      ]"
      :style="getInterfacePosition(index)"
      :title="`${interfaceItem.name}`"
      @click.stop="$emit('connect', { nodeId: node.id, interfaceId: interfaceItem.id })"
    />
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
  isDragging = true
  dragOffset = {
    x: event.clientX - props.node.position.x,
    y: event.clientY - props.node.position.y
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (event: MouseEvent) => {
  if (!isDragging) return
  
  const newPosition = {
    x: event.clientX - dragOffset.x,
    y: event.clientY - dragOffset.y
  }
  
  emit('move', props.node.id, newPosition)
}

const onMouseUp = () => {
  isDragging = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}
</script>