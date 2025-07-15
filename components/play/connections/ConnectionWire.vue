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
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Connection, PlayNode } from '@/types/play'

interface Props {
  connection: Connection
  nodes: PlayNode[]
  canvasRef?: HTMLElement
}

const props = defineProps<Props>()

const sourceNode = computed(() => 
  props.nodes.find(n => n.id === props.connection.sourceNodeId)
)

const targetNode = computed(() => 
  props.nodes.find(n => n.id === props.connection.targetNodeId)
)

const wireColor = computed(() => {
  const colors = {
    'lan': '#3b82f6',
    'serial': '#ef4444'
  }
  return colors[props.connection.type as keyof typeof colors] || '#3b82f6'
})

const connectionTypeLabel = computed(() => {
  const labels = {
    'lan': 'E',      // Ethernet
    'serial': 'S'    // Serial
  }
  return labels[props.connection.type as keyof typeof labels] || 'E'
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

const getEdgePoint = (source: PlayNode, target: PlayNode) => {
  // Function to get node dimensions
  const getNodeDimensions = (node: PlayNode) => {
    if (node.type === 'grader') {
      return { w: 80, h: 80 } // w-20 h-20 = 80px × 80px
    } else if (node.deviceType === 'pc') {
      return { w: 80, h: 80 } // PCs are also 80x80
    } else {
      return { w: 96, h: 96 } // Other devices (switches, routers) are 96x96
    }
  }

  const s = {
    ...getNodeDimensions(source),
    x: source.position.x,
    y: source.position.y,
  }
  const t = {
    ...getNodeDimensions(target),
    x: target.position.x,
    y: target.position.y,
  }

  const s_cx = s.x + s.w / 2
  const s_cy = s.y + s.h / 2
  const t_cx = t.x + t.w / 2
  const t_cy = t.y + t.h / 2

  const dx = t_cx - s_cx
  const dy = t_cy - s_cy

  const angle = Math.atan2(dy, dx)

  const tan = Math.tan(angle)
  const abs_tan = Math.abs(tan)

  let x, y

  if (abs_tan * s.w / 2 > s.h / 2) {
    // Intersects top or bottom edge
    y = s_cy + (dy > 0 ? s.h / 2 : -s.h / 2)
    x = s_cx + (dy > 0 ? s.h / 2 : -s.h / 2) / tan
  } else {
    // Intersects left or right edge
    x = s_cx + (dx > 0 ? s.w / 2 : -s.w / 2)
    y = s_cy + (dx > 0 ? s.w / 2 : -s.w / 2) * tan
  }

  return { x, y }
}

const pathData = computed(() => {
  if (!sourceNode.value || !targetNode.value) return ''
  
  // Get canvas position relative to viewport
  const canvasRect = props.canvasRef?.getBoundingClientRect() || { left: 0, top: 0 }
  
  // Calculate node positions relative to viewport
  const sourcePos = {
    x: sourceNode.value.position.x + canvasRect.left,
    y: sourceNode.value.position.y + canvasRect.top
  }
  const targetPos = {
    x: targetNode.value.position.x + canvasRect.left,
    y: targetNode.value.position.y + canvasRect.top
  }
  
  // Create temporary nodes with viewport-relative positions for getEdgePoint
  const sourceNodeViewport = { ...sourceNode.value, position: sourcePos }
  const targetNodeViewport = { ...targetNode.value, position: targetPos }
  
  const sourcePoint = getEdgePoint(sourceNodeViewport, targetNodeViewport)
  const targetPoint = getEdgePoint(targetNodeViewport, sourceNodeViewport)

  // Create a smooth curve
  const dx = targetPoint.x - sourcePoint.x
  const dy = targetPoint.y - sourcePoint.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  const controlOffset = Math.min(distance * 0.3, 80)
  const control1X = sourcePoint.x + (dx > 0 ? controlOffset : -controlOffset)
  const control1Y = sourcePoint.y
  const control2X = targetPoint.x - (dx > 0 ? controlOffset : -controlOffset)
  const control2Y = targetPoint.y
  
  return `M ${sourcePoint.x} ${sourcePoint.y} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${targetPoint.x} ${targetPoint.y}`
})
</script>