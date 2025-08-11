<template>
  <div class="h-full flex flex-col">
    <!-- Panel Header -->
    <div class="p-4 border-b border-border">
      <h3 class="font-semibold flex items-center">
        <Icon name="lucide:network" class="w-4 h-4 mr-2" />
        Your Network Setup
      </h3>
      <p class="text-xs text-muted-foreground mt-1">
        Assigned IP addresses and device information
      </p>
    </div>

    <!-- Student Info -->
    <div v-if="studentInfo" class="p-4 border-b border-border bg-muted/50">
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Student ID:</span>
          <code class="bg-background px-2 py-1 rounded text-xs font-mono">
            {{ studentInfo.studentId }}
          </code>
        </div>
        
        <div v-if="studentInfo.groupNumber" class="flex justify-between">
          <span class="text-muted-foreground">Group:</span>
          <Badge variant="secondary" class="text-xs">
            Group {{ studentInfo.groupNumber }}
          </Badge>
        </div>
      </div>
    </div>

    <!-- Device List -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-3">
        <!-- Empty State -->
        <div
v-if="devices.length === 0 && Object.keys(ipMappings).length === 0" 
             class="text-center py-8 text-muted-foreground">
          <Icon name="lucide:server-off" class="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p class="text-sm">No devices assigned</p>
        </div>

        <!-- IP Mappings (when devices array is not available) -->
        <div v-else-if="devices.length === 0 && Object.keys(ipMappings).length > 0">
          <h4 class="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:globe" class="w-4 h-4 mr-2" />
            IP Assignments
          </h4>
          
          <div class="space-y-2">
            <div 
              v-for="(ip, variable) in ipMappings" 
              :key="variable"
              class="flex items-center justify-between p-3 bg-card border rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Icon :name="getDeviceIcon(variable)" class="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div class="font-medium text-sm">{{ getDeviceName(variable) }}</div>
                  <div class="text-xs text-muted-foreground">{{ variable }}</div>
                </div>
              </div>
              
              <div class="text-right">
                <code class="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs font-mono font-semibold">
                  {{ ip }}
                </code>
                <div class="flex items-center justify-end mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="w-6 h-6 p-0"
                    @click="copyToClipboard(ip)"
                  >
                    <Icon name="lucide:copy" class="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Full Device Information -->
        <div v-else>
          <h4 class="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:server" class="w-4 h-4 mr-2" />
            Network Devices
          </h4>
          
          <div class="space-y-3">
            <Card v-for="device in devices" :key="device.deviceId" class="border">
              <CardContent class="p-4">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon :name="getDeviceIcon(device.deviceId)" class="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h5 class="font-medium">{{ device.deviceName }}</h5>
                      <p class="text-xs text-muted-foreground">{{ device.deviceId }}</p>
                    </div>
                  </div>
                  
                  <Badge :variant="getStatusBadgeVariant(device.status)" class="text-xs">
                    <div
class="w-2 h-2 rounded-full mr-1"
                         :class="getStatusDotClass(device.status)"/>
                    {{ device.status.charAt(0).toUpperCase() + device.status.slice(1) }}
                  </Badge>
                </div>
                
                <!-- Device IP -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">IP Address:</span>
                    <div class="flex items-center space-x-2">
                      <code class="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs font-mono font-semibold">
                        {{ device.ipAddress }}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="w-6 h-6 p-0"
                        @click="copyToClipboard(device.ipAddress)"
                      >
                        <Icon name="lucide:copy" class="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <!-- Additional Info -->
                <div class="mt-3 pt-3 border-t border-border">
                  <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Status updated:</span>
                    <span>{{ getRelativeTime(new Date()) }}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="p-4 border-t border-border bg-card">
      <div class="space-y-2">
        <Button variant="outline" size="sm" class="w-full" @click="refreshStatus">
          <Icon name="lucide:refresh-cw" class="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
        
        <Button variant="outline" size="sm" class="w-full" @click="exportInfo">
          <Icon name="lucide:download" class="w-4 h-4 mr-2" />
          Export Info
        </Button>
      </div>
    </div>

    <!-- Connection Test Dialog -->
    <Dialog v-model:open="showTestDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Test Connection</DialogTitle>
          <DialogDescription>
            Test connectivity to {{ testTarget?.deviceName }}
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"/>
            <span class="text-sm">Testing connection...</span>
          </div>
          
          <div class="bg-muted/50 p-3 rounded font-mono text-xs">
            <div>PING {{ testTarget?.ipAddress }}</div>
            <div>64 bytes from {{ testTarget?.ipAddress }}: time=1.23ms</div>
            <div class="text-green-600 dark:text-green-400">Connection successful!</div>
          </div>
        </div>
        
        <DialogFooter>
          <Button @click="showTestDialog = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'

// Props
interface Props {
  devices?: Array<{
    deviceId: string
    deviceName: string
    ipAddress: string
    status: 'online' | 'offline' | 'unknown'
  }>
  ipMappings?: Record<string, string>
  studentInfo?: {
    studentId: string
    groupNumber?: number
    assignedIPs?: Record<string, string>
  }
}

const props = withDefaults(defineProps<Props>(), {
  devices: () => [],
  ipMappings: () => ({}),
  studentInfo: undefined
})

// Emits
const emit = defineEmits<{
  'refresh:status': []
  'test:connection': [deviceId: string]
}>()

// Reactive state
const showTestDialog = ref(false)
const testTarget = ref<Props['devices'][0] | null>(null)

// Methods
const getDeviceIcon = (deviceIdOrVariable: string): string => {
  const id = deviceIdOrVariable.toLowerCase()
  
  if (id.includes('router')) return 'lucide:router'
  if (id.includes('switch')) return 'lucide:network'
  if (id.includes('pc') || id.includes('computer')) return 'lucide:monitor'
  if (id.includes('server')) return 'lucide:server'
  if (id.includes('firewall') || id.includes('security')) return 'lucide:shield'
  if (id.includes('phone') || id.includes('voip')) return 'lucide:phone'
  if (id.includes('printer')) return 'lucide:printer'
  if (id.includes('camera')) return 'lucide:camera'
  
  return 'lucide:cpu'
}

const getDeviceName = (variable: string): string => {
  // Convert variable name to display name
  // e.g., "pc1_ip" -> "PC 1", "router1_ip" -> "Router 1"
  const name = variable.replace(/_ip$/, '').replace(/(\d+)$/, ' $1')
  return name.split(/[_-]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'online':
      return 'default'
    case 'offline':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const getStatusDotClass = (status: string): string => {
  switch (status) {
    case 'online':
      return 'bg-green-500'
    case 'offline':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

const getRelativeTime = (date: Date): string => {
  return 'Just now' // Simplified for demo
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${text} to clipboard`)
  } catch (error) {
    toast.error('Failed to copy to clipboard')
  }
}

const refreshStatus = () => {
  emit('refresh:status')
  toast.info('Refreshing device status...')
}

const exportInfo = () => {
  const info = {
    studentInfo: props.studentInfo,
    devices: props.devices,
    ipMappings: props.ipMappings,
    exportedAt: new Date().toISOString()
  }
  
  const jsonString = JSON.stringify(info, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `network-info-${props.studentInfo?.studentId || 'student'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.success('Network information exported')
}

const testConnection = (device: Props['devices'][0]) => {
  testTarget.value = device
  showTestDialog.value = true
  emit('test:connection', device.deviceId)
}
</script>