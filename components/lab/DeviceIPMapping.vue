<template>
  <div class="space-y-4">
    <!-- Empty State -->
    <div v-if="devices.length === 0" class="text-center py-8 text-muted-foreground">
      <Icon name="lucide:server" class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>No devices configured yet.</p>
      <p class="text-sm">Add devices to define your network topology.</p>
    </div>

    <!-- Device List -->
    <div v-else class="space-y-3">
      <div
        v-for="(device, index) in devices"
        :key="device.deviceId"
        class="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 space-y-3">
            <!-- Device Header -->
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon 
                  :name="getDeviceIcon(device.deviceId)" 
                  class="w-5 h-5 text-primary" 
                />
              </div>
              <div>
                <h4 class="font-medium">{{ device.deviceName }}</h4>
                <p class="text-sm text-muted-foreground">{{ device.deviceId }}</p>
              </div>
              <Badge variant="outline" class="ml-auto">
                {{ device.ipVariable }}
              </Badge>
            </div>

            <!-- Device Configuration -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Device Name -->
              <div class="space-y-2">
                <Label :for="`device-name-${index}`">Device Name</Label>
                <Input
                  :id="`device-name-${index}`"
                  :model-value="device.deviceName"
                  placeholder="e.g., Router 1"
                  @update:model-value="updateDevice(index, { deviceName: $event })"
                />
              </div>

              <!-- IP Variable -->
              <div class="space-y-2">
                <Label :for="`ip-variable-${index}`">IP Variable</Label>
                <Input
                  :id="`ip-variable-${index}`"
                  :model-value="device.ipVariable"
                  placeholder="e.g., router1_ip"
                  @update:model-value="updateDevice(index, { ipVariable: $event })"
                />
                <p class="text-xs text-muted-foreground">
                  Used in task configurations: <code>{{ '{' }}{{ device.ipVariable }}{{ '}' }}</code>
                </p>
              </div>

              <!-- Host Offset -->
              <div class="space-y-2">
                <Label :for="`host-offset-${index}`">Host Offset</Label>
                <div class="flex items-center space-x-2">
                  <Input
                    :id="`host-offset-${index}`"
                    :model-value="device.hostOffset"
                    type="number"
                    min="1"
                    max="254"
                    class="flex-1"
                    @update:model-value="updateDevice(index, { hostOffset: Number($event) })"
                  />
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button variant="outline" size="icon">
                        <Icon name="lucide:info" class="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-64">
                      <div class="space-y-2">
                        <h4 class="font-medium">Host Offset</h4>
                        <p class="text-sm text-muted-foreground">
                          The last octet of the IP address for this device.
                        </p>
                        <div v-if="networkInfo && device.hostOffset" class="text-xs">
                          <strong>Example IP:</strong>
                          <code class="bg-muted px-1 py-0.5 rounded ml-1">
                            {{ getExampleIP(device.hostOffset) }}
                          </code>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="space-y-2">
              <Label :for="`description-${index}`">Description (Optional)</Label>
              <Textarea
                :id="`description-${index}`"
                :model-value="device.description"
                placeholder="Describe this device's role..."
                rows="2"
                @update:model-value="updateDevice(index, { description: $event })"
              />
            </div>

            <!-- Example IP Display -->
            <div v-if="networkInfo && device.hostOffset" class="flex items-center space-x-2 text-sm">
              <Icon name="lucide:eye" class="w-4 h-4 text-muted-foreground" />
              <span class="text-muted-foreground">Example IP:</span>
              <code class="bg-muted px-2 py-1 rounded">{{ getExampleIP(device.hostOffset) }}</code>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              @click="duplicateDevice(index)"
            >
              <Icon name="lucide:copy" class="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="text-destructive hover:text-destructive"
              @click="removeDevice(index)"
            >
              <Icon name="lucide:trash-2" class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Issues -->
    <div v-if="validationIssues.length > 0" class="space-y-2">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Device Configuration Issues</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="issue in validationIssues" :key="issue">
              {{ issue }}
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>

    <!-- Quick Actions -->
    <div class="flex items-center justify-between pt-4 border-t">
      <div class="text-sm text-muted-foreground">
        {{ devices.length }} device{{ devices.length !== 1 ? 's' : '' }} configured
      </div>
      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          @click="sortDevices"
        >
          <Icon name="lucide:arrow-up-down" class="w-4 h-4 mr-2" />
          Sort by Offset
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-destructive hover:text-destructive"
          :disabled="devices.length === 0"
          @click="clearAllDevices"
        >
          <Icon name="lucide:trash-2" class="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertCircle } from 'lucide-vue-next'
import type { DeviceConfig, NetworkInfo  } from '@/types/ipSchema'

// Props
interface Props {
  devices: DeviceConfig[]
  networkInfo?: NetworkInfo | null
}

const props = withDefaults(defineProps<Props>(), {
  networkInfo: null
})

// Emits
const emit = defineEmits<{
  'update:device': [index: number, updates: Partial<DeviceConfig>]
  'remove:device': [index: number]
}>()

// Computed
const validationIssues = computed(() => {
  const issues: string[] = []
  
  // Check for duplicate device IDs
  const deviceIds = new Set<string>()
  props.devices.forEach((device, index) => {
    if (deviceIds.has(device.deviceId)) {
      issues.push(`Duplicate device ID: ${device.deviceId}`)
    }
    deviceIds.add(device.deviceId)
  })
  
  // Check for duplicate IP variables
  const ipVariables = new Set<string>()
  props.devices.forEach((device, index) => {
    if (ipVariables.has(device.ipVariable)) {
      issues.push(`Duplicate IP variable: ${device.ipVariable}`)
    }
    ipVariables.add(device.ipVariable)
  })
  
  // Check for invalid host offsets
  props.devices.forEach((device, index) => {
    if (device.hostOffset < 1 || device.hostOffset > 254) {
      issues.push(`${device.deviceName}: Host offset must be between 1 and 254`)
    }
  })
  
  // Check for duplicate host offsets (warning)
  const hostOffsets = new Set<number>()
  props.devices.forEach((device, index) => {
    if (hostOffsets.has(device.hostOffset)) {
      issues.push(`Duplicate host offset ${device.hostOffset} - devices will have the same IP`)
    }
    hostOffsets.add(device.hostOffset)
  })
  
  return issues
})

// Methods
const updateDevice = (index: number, updates: Partial<DeviceConfig>) => {
  emit('update:device', index, updates)
}

const removeDevice = (index: number) => {
  emit('remove:device', index)
}

const duplicateDevice = (index: number) => {
  const originalDevice = props.devices[index]
  const newDevice: DeviceConfig = {
    ...originalDevice,
    deviceId: `${originalDevice.deviceId}_copy`,
    deviceName: `${originalDevice.deviceName} (Copy)`,
    ipVariable: `${originalDevice.ipVariable}_copy`,
    hostOffset: originalDevice.hostOffset + 1
  }
  
  // Find next available host offset
  const usedOffsets = new Set(props.devices.map(d => d.hostOffset))
  while (usedOffsets.has(newDevice.hostOffset) && newDevice.hostOffset <= 254) {
    newDevice.hostOffset++
  }
  
  emit('update:device', props.devices.length, newDevice)
}

const sortDevices = () => {
  const sorted = [...props.devices].sort((a, b) => a.hostOffset - b.hostOffset)
  sorted.forEach((device, index) => {
    emit('update:device', index, device)
  })
}

const clearAllDevices = () => {
  for (let i = props.devices.length - 1; i >= 0; i--) {
    emit('remove:device', i)
  }
}

const getDeviceIcon = (deviceId: string): string => {
  const id = deviceId.toLowerCase()
  
  if (id.includes('router')) return 'lucide:router'
  if (id.includes('switch')) return 'lucide:network'
  if (id.includes('pc') || id.includes('computer')) return 'lucide:monitor'
  if (id.includes('phone') || id.includes('voip')) return 'lucide:phone'
  if (id.includes('printer')) return 'lucide:printer'
  if (id.includes('camera')) return 'lucide:camera'
  
  return 'lucide:cpu' // Default icon
}

const getExampleIP = (hostOffset: number): string => {
  if (!props.networkInfo) return `x.x.x.${hostOffset}`
  
  const networkParts = props.networkInfo.network.split('.')
  return `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${hostOffset}`
}
</script>