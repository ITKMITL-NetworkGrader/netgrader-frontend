<!-- A dynamic particle background component -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  quantity?: number
  staticity?: number
  ease?: number
  refresh?: boolean
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  quantity: 30,
  staticity: 50,
  ease: 50,
  refresh: false,
  color: '#000'
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const coordinates = ref<Array<[number, number]>>([])
const pointerCoordinates = ref<[number, number]>([0, 0])
const particleCoordinates = ref<Array<[number, number]>>([])
const particlePointerCoords = ref<Array<[number, number]>>([])
let animationFrame: number
const mouse = { x: 0, y: 0 }

// Randomly create coordinates
function generateCoordinates(refresh: boolean = false) {
  if (refresh || coordinates.value.length === 0) {
    coordinates.value = Array.from({ length: props.quantity }, () => [
      Math.floor(Math.random() * window.innerWidth),
      Math.floor(Math.random() * window.innerHeight),
    ])
    particleCoordinates.value = coordinates.value.map((coordinate) => [
      coordinate[0],
      coordinate[1],
    ])
  }
}

function handleMouseMove(event: MouseEvent) {
  const canvasRect = canvasRef.value?.getBoundingClientRect()
  if (canvasRect) {
    mouse.x = event.clientX - canvasRect.left
    mouse.y = event.clientY - canvasRect.top
    pointerCoordinates.value = [mouse.x, mouse.y]
  }
}

function animate() {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

  particleCoordinates.value.forEach((particleCoordinate, i) => {
    const coordinate = coordinates.value[i]

    // Move particle coordinates towards their original position
    particleCoordinate[0] += (coordinate[0] - particleCoordinate[0]) / props.ease
    particleCoordinate[1] += (coordinate[1] - particleCoordinate[1]) / props.ease

    // Draw the particle
    ctx.beginPath()
    ctx.arc(particleCoordinate[0], particleCoordinate[1], 1, 0, Math.PI * 2)
    ctx.fillStyle = props.color
    ctx.fill()

    // Calculate distance between particle and pointer
    const distX = mouse.x - particleCoordinate[0]
    const distY = mouse.y - particleCoordinate[1]
    const distance = Math.sqrt(distX * distX + distY * distY)

    // Move particles away from pointer based on distance and staticity
    if (distance < 100) {
      const angle = Math.atan2(distY, distX)
      const force = (100 - distance) / props.staticity
      particleCoordinate[0] -= Math.cos(angle) * force
      particleCoordinate[1] -= Math.sin(angle) * force
    }
  })

  // Draw lines between particles that are close to each other
  particleCoordinates.value.forEach((particle, i) => {
    particleCoordinates.value.slice(i + 1).forEach(otherParticle => {
      const dx = particle[0] - otherParticle[0]
      const dy = particle[1] - otherParticle[1]
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 100) {
        ctx.beginPath()
        ctx.moveTo(particle[0], particle[1])
        ctx.lineTo(otherParticle[0], otherParticle[1])
        ctx.strokeStyle = props.color
        ctx.globalAlpha = 1 - distance / 100
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    })
  })

  animationFrame = requestAnimationFrame(animate)
}

function handleResize() {
  if (!canvasRef.value) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
  generateCoordinates(true)
}

watch(() => props.refresh, generateCoordinates)

onMounted(() => {
  if (!canvasRef.value) return
  handleResize()
  window.addEventListener('resize', handleResize)
  window.addEventListener('mousemove', handleMouseMove)
  generateCoordinates()
  animate()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', handleMouseMove)
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <canvas ref="canvasRef" class="h-full w-full"></canvas>
</template>
