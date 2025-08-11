<template>
  <div class="space-y-4">
    <!-- Preview Header -->
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-medium">IP Assignment Preview</h4>
        <p class="text-sm text-muted-foreground">
          Showing sample assignments for the first {{ Math.min(assignments.length, 5) }} students
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <Button variant="outline" size="sm" @click="refreshPreview">
          <Icon name="lucide:refresh-cw" class="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" @click="exportPreview">
          <Icon name="lucide:download" class="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
    </div>

    <!-- Network Summary -->
    <div v-if="networkInfo" class="bg-muted/50 rounded-lg p-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="text-center">
          <div class="font-medium text-primary">{{ networkInfo.network }}</div>
          <div class="text-muted-foreground">Network</div>
        </div>
        <div class="text-center">
          <div class="font-medium text-primary">{{ networkInfo.subnetMask }}</div>
          <div class="text-muted-foreground">Subnet Mask</div>
        </div>
        <div class="text-center">
          <div class="font-medium text-primary">{{ networkInfo.totalHosts }}</div>
          <div class="text-muted-foreground">Available Hosts</div>
        </div>
        <div class="text-center">
          <div class="font-medium text-primary">{{ assignments.length }}</div>
          <div class="text-muted-foreground">Students</div>
        </div>
      </div>
    </div>

    <!-- IP Assignments Table -->
    <div class="border rounded-lg overflow-hidden">
      <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 border-b sticky top-0">
            <tr>
              <th class="text-left p-3 font-medium">Student ID</th>
              <th v-if="hasGroups" class="text-left p-3 font-medium">Group</th>
              <th
v-for="deviceType in deviceTypes" :key="deviceType" 
                  class="text-left p-3 font-medium">
                {{ deviceType }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
v-for="assignment in displayedAssignments" 
                :key="assignment.studentId" 
                class="border-b hover:bg-muted/25 transition-colors">
              <!-- Student ID -->
              <td class="p-3">
                <div class="flex items-center space-x-2">
                  <code class="bg-background px-2 py-1 rounded text-xs font-mono">
                    {{ assignment.studentId }}
                  </code>
                  <Badge v-if="getStudentInfo(assignment.studentId)" variant="outline" class="text-xs">
                    {{ getStudentInfo(assignment.studentId) }}
                  </Badge>
                </div>
              </td>
              
              <!-- Group -->
              <td v-if="hasGroups" class="p-3">
                <Badge v-if="assignment.groupNumber" variant="secondary">
                  Group {{ assignment.groupNumber }}
                </Badge>
                <span v-else class="text-muted-foreground italic">None</span>
              </td>
              
              <!-- Device IPs -->
              <td v-for="deviceType in deviceTypes" :key="deviceType" class="p-3">
                <div
v-if="getDeviceIP(assignment, deviceType)" 
                     class="flex items-center space-x-2">
                  <code class="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs font-mono">
                    {{ getDeviceIP(assignment, deviceType) }}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="w-6 h-6 p-0"
                    @click="copyToClipboard(getDeviceIP(assignment, deviceType)!)"
                  >
                    <Icon name="lucide:copy" class="w-3 h-3" />
                  </Button>
                </div>
                <span v-else class="text-muted-foreground italic">N/A</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Variable Mapping Reference -->
    <div class="bg-muted/50 rounded-lg p-4">
      <h5 class="font-medium mb-3 flex items-center">
        <Icon name="lucide:code" class="w-4 h-4 mr-2" />
        Variable Reference
      </h5>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div
v-for="device in uniqueDevices" :key="device.variableName"
             class="flex items-center justify-between p-2 bg-background rounded">
          <span class="font-medium">{{ device.deviceId }}</span>
          <code class="text-primary bg-primary/10 px-2 py-1 rounded">
            {{ '{' }}{{ device.variableName }}{{ '}' }}
          </code>
        </div>
      </div>
      <p class="text-muted-foreground mt-2">
        Use these variables in your task configurations to reference device IP addresses.
      </p>
    </div>

    <!-- Empty State -->
    <div v-if="assignments.length === 0" class="text-center py-8 text-muted-foreground">
      <Icon name="lucide:table" class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>No IP assignments to preview.</p>
      <p class="text-sm">Configure network settings and upload student data first.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import type { IPAssignment, NetworkInfo } from '@/types/ipSchema'

// Props
interface Props {
  assignments: IPAssignment[]
  networkInfo?: NetworkInfo | null
}

const props = withDefaults(defineProps<Props>(), {
  assignments: () => [],
  networkInfo: null
})

// Emits
const emit = defineEmits<{
  'refresh:preview': []
}>()

// Computed
const displayedAssignments = computed(() => {
  // Show first 5 assignments for preview
  return props.assignments.slice(0, 5)
})

const hasGroups = computed(() => {
  return props.assignments.some(a => a.groupNumber !== undefined)
})

const deviceTypes = computed(() => {
  if (props.assignments.length === 0) return []
  
  // Get all unique device IDs from the first assignment
  const firstAssignment = props.assignments[0]
  return firstAssignment.deviceAssignments.map(d => d.deviceId).sort()
})

const uniqueDevices = computed(() => {
  if (props.assignments.length === 0) return []
  
  const devices = new Map()
  props.assignments[0].deviceAssignments.forEach(device => {
    devices.set(device.deviceId, {
      deviceId: device.deviceId,
      variableName: device.variableName
    })
  })
  
  return Array.from(devices.values()).sort((a, b) => a.deviceId.localeCompare(b.deviceId))
})

// Methods
const getDeviceIP = (assignment: IPAssignment, deviceType: string): string | null => {
  const device = assignment.deviceAssignments.find(d => d.deviceId === deviceType)
  return device?.ipAddress || null
}

const getStudentInfo = (studentId: string): string | null => {
  // Parse student ID to show year/faculty info
  if (studentId.length === 8) {
    const year = studentId.substring(0, 2)
    const faculty = studentId.substring(2, 4)
    return `20${year}-${faculty}`
  }
  return null
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('IP address copied to clipboard')
  } catch (error) {
    toast.error('Failed to copy to clipboard')
  }
}

const refreshPreview = () => {
  emit('refresh:preview')
}

const exportPreview = () => {
  // Generate CSV export of the preview
  const headers = ['Student ID']
  if (hasGroups.value) headers.push('Group')
  headers.push(...deviceTypes.value)
  
  const rows = displayedAssignments.value.map(assignment => {
    const row = [assignment.studentId]
    if (hasGroups.value) {
      row.push(assignment.groupNumber?.toString() || '')
    }
    
    deviceTypes.value.forEach(deviceType => {
      const ip = getDeviceIP(assignment, deviceType)
      row.push(ip || '')
    })
    
    return row
  })
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ip-assignment-preview.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.success('Preview exported as CSV')
}
</script>