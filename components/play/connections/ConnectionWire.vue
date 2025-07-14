<template>
  <g>
    <path
      :d="pathData"
      :stroke="wireColor"
      :stroke-width="wireWidth"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Connection type indicator at midpoint -->
    <circle
      :cx="midPoint.x"
      :cy="midPoint.y"
      r="8"
      :fill="wireColor"
      class="opacity-90"
    />
    <text
      :x="midPoint.x"
      :y="midPoint.y"
      text-anchor="middle"
      dominant-baseline="middle"
      class="text-xs fill-white font-medium pointer-events-none"
    >
      {{ connectionTypeLabel }}
    </text>
    
    <!-- Source interface label -->
    <text
      :x="sourcePoint.x"
      :y="sourcePoint.y - 15"
      text-anchor="middle"
      class="text-xs fill-gray-700 font-medium pointer-events-none bg-white"
    >
      {{ sourceInterfaceName }}
    </text>
    
    <!-- Target interface label -->
    <text
      :x="targetPoint.x"
      :y="targetPoint.y - 15"
      text-anchor="middle"
      class="text-xs fill-gray-700 font-medium pointer-events-none bg-white"
    >
      {{ targetInterfaceName }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Connection, PlayNode } from '@/types/play'

interface Props {
  connection: Connection
  nodes: PlayNode[]
}

const props = defineProps<Props>()

const sourceNode = computed(() => 
  props.nodes.find(n => n.id === props.connection.sourceNodeId)
)

const targetNode = computed(() => 
  props.nodes.find(n => n.id === props.connection.targetNodeId)
)

const sourceInterface = computed(() => 
  sourceNode.value?.interfaces?.find(i => i.id === props.connection.sourceInterfaceId)
)

const targetInterface = computed(() => 
  targetNode.value?.interfaces?.find(i => i.id === props.connection.targetInterfaceId)
)

const sourceInterfaceName = computed(() => sourceInterface.value?.name || 'Unknown')
const targetInterfaceName = computed(() => targetInterface.value?.name || 'Unknown')

const connectionTypeLabel = computed(() => {
  const labels = {
    'lan': 'E',      // Ethernet
    'serial': 'S',   // Serial
    'console': 'C'   // Console
  }
  return labels[props.connection.type as keyof typeof labels] || 'E'
})

const wireColor = computed(() => {
  const colors = {
    'lan': '#3b82f6',      // Blue
    'serial': '#ef4444',   // Red
    'console': '#6b7280'   // Gray
  }
  return colors[props.connection.type as keyof typeof colors] || '#3b82f6'
})

const wireWidth = computed(() => {
  const widths = {
    'lan': 3,
    'serial': 2,
    'console': 2
  }
  return widths[props.connection.type as keyof typeof widths] || 3
})

// Get actual interface connection points
const sourcePoint = computed(() => {
  if (!sourceNode.value || !sourceInterface.value) return { x: 0, y: 0 }
  
  const nodeSize = sourceNode.value.type === 'grader' ? 80 : 96
  const nodeCenter = {
    x: sourceNode.value.position.x + nodeSize / 2,
    y: sourceNode.value.position.y + nodeSize / 2
  }
  
  // Find interface index to determine position
  const interfaceIndex = sourceNode.value.interfaces?.findIndex(i => i.id === sourceInterface.value!.id) || 0
  const totalInterfaces = sourceNode.value.interfaces?.filter(i => i.status !== 'admin-down').length || 1
  
  return getInterfacePosition(nodeCenter, interfaceIndex, totalInterfaces, nodeSize)
})

const targetPoint = computed(() => {
  if (!targetNode.value || !targetInterface.value) return { x: 0, y: 0 }
  
  const nodeSize = targetNode.value.type === 'grader' ? 80 : 96
  const nodeCenter = {
    x: targetNode.value.position.x + nodeSize / 2,
    y: targetNode.value.position.y + nodeSize / 2
  }
  
  // Find interface index to determine position
  const interfaceIndex = targetNode.value.interfaces?.findIndex(i => i.id === targetInterface.value!.id) || 0
  const totalInterfaces = targetNode.value.interfaces?.filter(i => i.status !== 'admin-down').length || 1
  
  return getInterfacePosition(nodeCenter, interfaceIndex, totalInterfaces, nodeSize)
})

const getInterfacePosition = (center: { x: number; y: number }, index: number, total: number, nodeSize: number) => {
  if (total <= 4) {
    // Position on sides: top, right, bottom, left
    const positions = [
      { x: center.x, y: center.y - nodeSize / 2 }, // top
      { x: center.x + nodeSize / 2, y: center.y }, // right
      { x: center.x, y: center.y + nodeSize / 2 }, // bottom
      { x: center.x - nodeSize / 2, y: center.y }  // left
    ]
    return positions[index] || positions[0]
  } else {
    // Distribute around perimeter
    const angle = (index / total) * 2 * Math.PI
    const radius = nodeSize / 2
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    }
  }
}

const pathData = computed(() => {
  if (!sourcePoint.value || !targetPoint.value) return ''
  
  const source = sourcePoint.value
  const target = targetPoint.value
  
  // Create a smooth curve
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Control points for bezier curve
  const controlOffset = Math.min(distance * 0.3, 80)
  const control1X = source.x + (dx > 0 ? controlOffset : -controlOffset)
  const control1Y = source.y
  const control2X = target.x - (dx > 0 ? controlOffset : -controlOffset)
  const control2Y = target.y
  
  return `M ${source.x} ${source.y} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${target.x} ${target.y}`
})

const midPoint = computed(() => {
  if (!sourcePoint.value || !targetPoint.value) return { x: 0, y: 0 }
  
  return {
    x: (sourcePoint.value.x + targetPoint.value.x) / 2,
    y: (sourcePoint.value.y + targetPoint.value.y) / 2
  }
})
</script>