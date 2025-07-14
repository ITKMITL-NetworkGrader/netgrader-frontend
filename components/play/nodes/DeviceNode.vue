<template>
  <div
    :id="`node-${node.id}`"
    :style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
    :class="[
      'absolute border-2 rounded-lg cursor-move select-none',
      selected ? 'border-blue-500 shadow-lg' : 'border-gray-300',
      'bg-white hover:shadow-md transition-shadow',
      getNodeSize()
    ]"
    @mousedown="onMouseDown"
    @click.stop="$emit('select', node.id)"
    @dblclick="$emit('double-click', node)"
  >
    <!-- Device Icon and Info -->
    <div class="w-full h-full flex flex-col items-center justify-center p-2">
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
      <span v-if="node.model" class="text-xs text-gray-500 truncate w-full text-center">
        {{ node.model }}
      </span>
      <span v-if="node.managementIP" class="text-xs text-blue-600 truncate w-full text-center">
        {{ node.managementIP }}
      </span>
    </div>
    
    <!-- Interface Connection Points -->
    <div
      v-for="(interfaceItem, index) in visibleInterfaces"
      :key="interfaceItem.id"
      :class="[
        'absolute w-3 h-3 rounded-full cursor-crosshair border-2 border-white',
        'hover:scale-110 transition-transform',
        getInterfaceColor(interfaceItem)
      ]"
      :style="getInterfacePosition(index)"
      :title="`${interfaceItem.name} - ${interfaceItem.status}`"
      @click.stop="$emit('connect', { nodeId: node.id, interfaceId: interfaceItem.id })"
    />

    <!-- Interface Labels -->
    <div
      v-for="(interfaceItem, index) in visibleInterfaces"
      :key="`label-${interfaceItem.id}`"
      class="absolute text-xs bg-white px-1 rounded border pointer-events-none"
      :style="getInterfaceLabelPosition(index)"
    >
      {{ interfaceItem.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  (e: 'connect', data: { nodeId: string; interfaceId: string }): void
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
  return colors[props.node.deviceType as keyof typeof colors] || 'text-gray-600'
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