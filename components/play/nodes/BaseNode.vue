<template>
  <div
    :style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
    :class="[
      'absolute w-16 h-16 border-2 rounded-lg cursor-move select-none',
      selected ? 'border-blue-500 shadow-lg' : 'border-gray-300',
      'bg-white hover:shadow-md transition-shadow'
    ]"
    @mousedown="onMouseDown"
    @click.stop="$emit('select', node.id)"
    @dblclick="$emit('double-click', node)"
  >
    <div class="w-full h-full flex flex-col items-center justify-center p-1">
      <component :is="icon" class="w-6 h-6 mb-1" />
      <span class="text-xs truncate w-full text-center">{{ node.name }}</span>
    </div>
    
    <!-- Connection points -->
    <div
      v-for="point in connectionPoints"
      :key="point.id"
      :class="[
        'absolute w-3 h-3 bg-gray-400 rounded-full cursor-crosshair',
        'hover:bg-blue-500 transition-colors'
      ]"
      :style="point.style"
      @click.stop="$emit('connect', { nodeId: node.id, pointId: point.id })"
    />
  </div>
</template>

<script setup lang="ts">
import type { PlayNode } from '@/types/play'

interface Props {
  node: PlayNode
  selected: boolean
  icon: any
}

interface Emits {
  (e: 'select', nodeId: string): void
  (e: 'move', nodeId: string, position: { x: number; y: number }): void
  (e: 'double-click', node: PlayNode): void
  (e: 'connect', data: { nodeId: string; pointId: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const connectionPoints = [
  { id: 'top', style: { top: '-6px', left: '50%', transform: 'translateX(-50%)' } },
  { id: 'right', style: { top: '50%', right: '-6px', transform: 'translateY(-50%)' } },
  { id: 'bottom', style: { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' } },
  { id: 'left', style: { top: '50%', left: '-6px', transform: 'translateY(-50%)' } }
]

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