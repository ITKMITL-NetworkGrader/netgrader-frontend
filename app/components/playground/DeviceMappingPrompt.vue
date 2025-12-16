<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Router } from 'lucide-vue-next'
import type { PlaygroundDevice } from '@/composables/usePlayground'

const props = defineProps<{
  open: boolean
  devices: PlaygroundDevice[]
  existingMappings?: Record<string, { gns3NodeName: string; ipAddress: string }>
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', mappings: Record<string, { gns3NodeName: string; ipAddress: string }>): void
}>()

// Local mappings state
const localMappings = ref<Record<string, { gns3NodeName: string; ipAddress: string }>>({})

// Initialize mappings when dialog opens
watch(() => props.open, (open) => {
  if (open) {
    localMappings.value = {}
    props.devices.forEach(device => {
      const existing = props.existingMappings?.[device.deviceId]
      localMappings.value[device.deviceId] = {
        gns3NodeName: existing?.gns3NodeName || '',
        ipAddress: existing?.ipAddress || '',
      }
    })
  }
})

// Check if all devices have required mappings
const canConfirm = computed(() => {
  return props.devices.every(device => {
    const mapping = localMappings.value[device.deviceId]
    return mapping?.gns3NodeName && mapping?.ipAddress
  })
})

function handleConfirm() {
  emit('confirm', localMappings.value)
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="text-foreground">New Devices Detected</DialogTitle>
        <DialogDescription class="text-muted-foreground">
          This part requires additional devices. Please configure their mappings.
        </DialogDescription>
      </DialogHeader>

      <Alert class="border-primary/50 bg-primary/5">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription>
          {{ devices.length }} new device(s) need to be mapped to GNS3 nodes
        </AlertDescription>
      </Alert>

      <div class="space-y-4 my-4">
        <div 
          v-for="device in devices" 
          :key="device.deviceId"
          class="p-3 border border-border rounded-md space-y-3"
        >
          <div class="flex items-center gap-2">
            <Router class="h-4 w-4 text-muted-foreground" />
            <span class="font-medium text-sm text-foreground">{{ device.displayName }}</span>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label :for="`node-${device.deviceId}`" class="text-xs">
                GNS3 Node Name
              </Label>
              <Input 
                :id="`node-${device.deviceId}`"
                v-model="localMappings[device.deviceId].gns3NodeName"
                placeholder="R1"
              />
            </div>
            <div class="space-y-1">
              <Label :for="`ip-${device.deviceId}`" class="text-xs">
                IP Address
              </Label>
              <Input 
                :id="`ip-${device.deviceId}`"
                v-model="localMappings[device.deviceId].ipAddress"
                placeholder="10.0.0.1"
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">
          Cancel
        </Button>
        <Button @click="handleConfirm" :disabled="!canConfirm">
          Confirm Mappings
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
