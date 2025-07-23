<template>
  <div
    :style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
    :class="[
      'absolute border-2 rounded-lg cursor-pointer select-none',
      selected ? 'border-primary shadow-lg' : 'border-border',
      'bg-card hover:shadow-md transition-shadow',
      getNodeSize()
    ]"
    @mousedown="onMouseDown"
    @click.stop="handleClick"
    @dblclick.stop="handleDoubleClick"
    @contextmenu.prevent="handleRightClick"
  >
    <!-- Device Icon and Info -->
    <div class="w-full h-full flex flex-col items-center justify-center p-2 pointer-events-none">
      <component 
        :is="getDeviceIcon()" 
        :class="[
          'mb-1',
          getIconSize(),
          getIconColor()
        ]" 
      />
      <span class="text-xs font-medium truncate w-full text-center">
        {{ node.name }}
      </span>
      <span v-if="node.model" class="text-xs text-muted-foreground truncate w-full text-center">
        {{ node.model }}
      </span>
      <span v-if="node.managementIP" class="text-xs text-blue-600 truncate w-full text-center">
        {{ node.managementIP }}
      </span>
    </div>
    

    <!-- Interface Labels -->
    <!-- <div
      v-for="(interfaceItem, index) in visibleInterfaces"
      :key="`label-${interfaceItem.id}`"
      class="absolute text-xs bg-card px-1 rounded border pointer-events-none"
      :style="getInterfaceLabelPosition(index)"
    >
      {{ interfaceItem.name }}
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Monitor, Router, Server } from 'lucide-vue-next'
import type { PlayNode, NetworkInterface } from '@/types/play'

interface Props {
  node: PlayNode
  selected: boolean
}

interface Emits {
  (e: 'select', nodeId: string): void
  (e: 'move', nodeId: string, position: { x: number; y: number }): void
  (e: 'double-click', node: PlayNode): void
  (e: 'node-click', node: PlayNode): void
  (e: 'contextmenu', node: PlayNode): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visibleInterfaces = computed(() => {
  return props.node.interfaces?.filter(int => int.status !== 'admin-down') || []
})

const getDeviceIcon = () => {
  const icons = {
    'pc': Monitor,
    'cisco-switch': Server,
    'cisco-router': Router
  }
  return icons[props.node.deviceType as keyof typeof icons] || Monitor
}

const getNodeSize = () => {
  const sizes = {
    'pc': 'w-20 h-20',
    'cisco-switch': 'w-24 h-24',
    'cisco-router': 'w-24 h-24'
  }
  return sizes[props.node.deviceType as keyof typeof sizes] || 'w-20 h-20'
}

const getIconSize = () => {
  const sizes = {
    'pc': 'w-6 h-6',
    'cisco-switch': 'w-8 h-8',
    'cisco-router': 'w-8 h-8'
  }
  return sizes[props.node.deviceType as keyof typeof sizes] || 'w-6 h-6'
}

const getIconColor = () => {
  const colors = {
    'pc': 'text-blue-600',
    'cisco-switch': 'text-green-600',
    'cisco-router': 'text-orange-600'
  }
  return colors[props.node.deviceType as keyof typeof colors] || 'text-muted-foreground'
}

const getInterfaceColor = (interfaceItem: NetworkInterface) => {
  const colors = {
    'up': 'bg-green-500',
    'down': 'bg-red-500',
    'admin-down': 'bg-gray-500'
  }
  return colors[interfaceItem.status as keyof typeof colors] || 'bg-gray-500'
}

const getInterfacePosition = (index: number) => {
  const nodeWidth = props.node.deviceType === 'pc' ? 80 : 96
  const nodeHeight = props.node.deviceType === 'pc' ? 80 : 96
  const totalInterfaces = visibleInterfaces.value.length
  
  if (totalInterfaces <= 4) {
    // Position on sides: top, right, bottom, left
    const positions = [
      { top: '-6px', left: '50%', transform: 'translateX(-50%)' }, // top
      { top: '50%', right: '-6px', transform: 'translateY(-50%)' }, // right
      { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }, // bottom
      { top: '50%', left: '-6px', transform: 'translateY(-50%)' } // left
    ]
    return positions[index] || positions[0]
  } else {
    // Distribute around perimeter
    const angle = (index / totalInterfaces) * 2 * Math.PI
    const radius = Math.max(nodeWidth, nodeHeight) / 2 + 6
    const x = Math.cos(angle) * radius + nodeWidth / 2
    const y = Math.sin(angle) * radius + nodeHeight / 2
    
    return {
      left: `${x - 6}px`,
      top: `${y - 6}px`
    }
  }
}

const getInterfaceLabelPosition = (index: number) => {
  const nodeWidth = props.node.deviceType === 'pc' ? 80 : 96
  const nodeHeight = props.node.deviceType === 'pc' ? 80 : 96
  const totalInterfaces = visibleInterfaces.value.length
  
  if (totalInterfaces <= 4) {
    const positions = [
      { top: '-20px', left: '50%', transform: 'translateX(-50%)' }, // top
      { top: '50%', right: '-60px', transform: 'translateY(-50%)' }, // right
      { bottom: '-20px', left: '50%', transform: 'translateX(-50%)' }, // bottom
      { top: '50%', left: '-60px', transform: 'translateY(-50%)' } // left
    ]
    return positions[index] || positions[0]
  } else {
    const angle = (index / totalInterfaces) * 2 * Math.PI
    const radius = Math.max(nodeWidth, nodeHeight) / 2 + 20
    const x = Math.cos(angle) * radius + nodeWidth / 2
    const y = Math.sin(angle) * radius + nodeHeight / 2
    
    return {
      left: `${x - 30}px`,
      top: `${y - 8}px`
    }
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
  
  const nodeWidth = props.node.deviceType === 'pc' ? 80 : 96
  const nodeHeight = props.node.deviceType === 'pc' ? 80 : 96
  
  let newX = event.clientX - dragOffset.x
  let newY = event.clientY - dragOffset.y
  
  // Constrain to prevent negative positions and going too far right/down
  newX = Math.max(0, newX)
  newY = Math.max(0, newY)
  
  // Basic viewport constraints (you can adjust these values)
  const maxX = window.innerWidth - nodeWidth - 300 // Account for toolbar width
  const maxY = window.innerHeight - nodeHeight - 100 // Account for header
  
  newX = Math.min(newX, maxX)
  newY = Math.min(newY, maxY)
  
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

const handleDoubleClick = () => {
  emit('double-click', props.node)
}
</script>