<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          Select an available interface on {{ node?.name }} to connect.
        </DialogDescription>
      </DialogHeader>
      
      <div class="max-h-96 overflow-y-auto space-y-2 py-2">
        <div
          v-for="iface in availableInterfaces"
          :key="iface.id"
          class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          @click="selectInterface(iface.id)"
        >
          <div 
            :class="getInterfaceStatusColor(iface.status)"
            class="w-2.5 h-2.5 rounded-full mr-3"
          />
          <div class="flex-1">
            <p class="font-medium">{{ iface.name }}</p>
            <p v-if="iface.ipAddress" class="text-sm text-gray-500">
              {{ iface.ipAddress }}
            </p>
          </div>
          <ChevronRight class="w-4 h-4 text-gray-400" />
        </div>
        <div v-if="availableInterfaces.length === 0" class="text-center text-gray-500 py-4">
          No available interfaces on this device.
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { PlayNode, Connection } from '@/types/play'

interface Props {
  open: boolean
  node: PlayNode | null
  title: string
  connections: Connection[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'select', interfaceId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const connectedInterfaceIds = computed(() => {
  const ids = new Set<string>()
  props.connections.forEach(conn => {
    ids.add(conn.sourceInterfaceId)
    ids.add(conn.targetInterfaceId)
  })
  return ids
})

const availableInterfaces = computed(() => {
  if (!props.node?.interfaces) return []
  return props.node.interfaces.filter(
    iface => !connectedInterfaceIds.value.has(iface.id)
  )
})

const getInterfaceStatusColor = (status: string) => {
  const colors = {
    'up': 'bg-green-500',
    'down': 'bg-red-500',
    'admin-down': 'bg-gray-500'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-500'
}

const selectInterface = (interfaceId: string) => {
  emit('select', interfaceId)
  emit('update:open', false)
}
</script>
