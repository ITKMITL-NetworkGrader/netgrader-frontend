<template>
  <div class="space-y-6">
    <!-- Part Context Navigation -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:layers-3" class="w-5 h-5 mr-2" />
          Part-Specific IP Schema Configuration
        </CardTitle>
        <CardDescription>
          Each part can have its own network topology and IP configuration. Configure IP schemas per part below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Part Tabs -->
        <div class="flex items-center space-x-2 mb-6">
          <span class="text-sm font-medium text-muted-foreground">Configure IP Schema for:</span>
          <div class="flex items-center space-x-1">
            <Button
              v-for="(part, index) in parts"
              :key="part.tempId || index"
              :variant="currentPartIndex === index ? 'default' : 'outline'"
              size="sm"
              class="relative"
              @click="switchToPart(index)"
            >
              Part {{ index + 1 }}
              <Badge
                v-if="getPartStatus(index) === 'configured'"
                variant="default"
                class="ml-2 w-2 h-2 p-0 bg-green-500"
              />
              <Badge
                v-else-if="getPartStatus(index) === 'partial'"
                variant="secondary"
                class="ml-2 w-2 h-2 p-0 bg-yellow-500"
              />
              <Badge
                v-else
                variant="destructive"
                class="ml-2 w-2 h-2 p-0"
              />
            </Button>
          </div>
        </div>

        <!-- Current Part Info -->
        <div v-if="currentPart" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
          <div class="flex items-start space-x-3">
            <Icon name="lucide:info" class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 class="font-medium text-blue-900 dark:text-blue-100">
                {{ currentPart.title || `Part ${currentPartIndex + 1}` }}
              </h4>
              <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Configure the network topology and IP addressing for this specific part. 
                Each part can simulate different network scenarios with unique device configurations.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Network Configuration for Current Part -->
    <Card v-if="currentPart">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:network" class="w-5 h-5 mr-2" />
          Network Configuration - Part {{ currentPartIndex + 1 }}
        </CardTitle>
        <CardDescription>
          Define the base network and allocation strategy for this part
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NetworkConfigPanel 
          :model-value="currentPartConfig.networkConfig"
          :validation-result="currentPartValidation"
          @update:model-value="handlePartNetworkUpdate"
        />
      </CardContent>
    </Card>

    <!-- Device Configuration for Current Part -->
    <Card v-if="currentPart">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center">
              <Icon name="lucide:server" class="w-5 h-5 mr-2" />
              Device Configuration - Part {{ currentPartIndex + 1 }}
            </CardTitle>
            <CardDescription>
              Configure devices and IP mappings specific to this part's network scenario
            </CardDescription>
          </div>
          <Button 
            variant="outline"
            size="sm" 
            @click="showPartDeviceModal = true"
          >
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Device Preset Buttons for Current Part -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <Label class="text-sm font-medium">Device Presets for Part {{ currentPartIndex + 1 }}</Label>
            <span class="text-xs text-muted-foreground">Quick add common devices</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button 
              v-for="template in deviceTemplates"
              :key="template.deviceId"
              variant="outline"
              size="sm"
              class="justify-start h-auto p-3 text-left"
              @click="addPartDeviceFromTemplate(template)"
            >
              <div class="flex items-center space-x-2">
                <Icon :name="getDeviceIcon(template.deviceId)" class="w-4 h-4 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="text-sm font-medium truncate">{{ getNextPartDeviceName(template) }}</div>
                  <div class="text-xs text-muted-foreground truncate">{{ template.description || 'Part-specific device' }}</div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        <!-- Device List for Current Part -->
        <DeviceIPMapping 
          :devices="currentPartConfig.deviceConfigs"
          :network-info="currentPartNetworkInfo"
          @update:device="handlePartDeviceUpdate"
          @remove:device="handlePartDeviceRemove"
        />
      </CardContent>
    </Card>

    <!-- CSV Upload for Current Part -->
    <Card v-if="currentPart">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:upload" class="w-5 h-5 mr-2" />
          Student Data - Part {{ currentPartIndex + 1 }}
        </CardTitle>
        <CardDescription>
          Configure student roster for this part or use global student list
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="mb-4">
          <div class="flex items-center space-x-2">
            <Switch 
              v-model:checked="useGlobalStudents"
              id="use-global-students"
            />
            <Label for="use-global-students">Use global student list for all parts</Label>
          </div>
          <p class="text-sm text-muted-foreground mt-1">
            When enabled, all parts will use the same student roster from the main configuration
          </p>
          <p v-if="useGlobalStudents && hasGlobalStudents" class="text-sm text-green-600 dark:text-green-400 mt-1">
            Using {{ globalStudents.length }} students from global roster
          </p>
          <p v-else-if="useGlobalStudents && !hasGlobalStudents" class="text-sm text-amber-600 dark:text-amber-400 mt-1">
            No global student roster available. Please upload CSV below or configure students in the main student enrollment step.
          </p>
        </div>
        
        <CSVUploader 
          v-if="!useGlobalStudents || !hasGlobalStudents"
          :students="currentPartConfig.students"
          :allocation-strategy="currentPartConfig.allocationStrategy"
          @upload:students="handlePartStudentsUpdate"
          @update:strategy="handlePartStrategyUpdate"
        />
        
        <!-- Display global students when using them -->
        <div v-else-if="useGlobalStudents && hasGlobalStudents" class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium">Global Student List ({{ globalStudents.length }} students)</h4>
            <Badge variant="default">{{ currentPartConfig.allocationStrategy }}</Badge>
          </div>
          <div class="max-h-32 overflow-y-auto border rounded-lg p-2">
            <div class="grid grid-cols-1 gap-1 text-xs">
              <div v-for="student in globalStudents.slice(0, 10)" :key="student.studentId" class="flex justify-between">
                <span>{{ student.studentId }}</span>
                <span v-if="student.name" class="text-muted-foreground">{{ student.name }}</span>
              </div>
              <div v-if="globalStudents.length > 10" class="text-muted-foreground italic">
                ... and {{ globalStudents.length - 10 }} more students
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- IP Preview for Current Part -->
    <Card v-if="currentPart && currentPartCanGenerateIPs && currentPartPreview?.success">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:eye" class="w-5 h-5 mr-2" />
          IP Assignment Preview - Part {{ currentPartIndex + 1 }}
        </CardTitle>
        <CardDescription>
          Preview of IP assignments for this part's configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <IPPreviewTable 
          :assignments="currentPartPreview.assignments || []"
          :network-info="currentPartPreview.networkInfo"
        />
      </CardContent>
    </Card>

    <!-- Configuration Summary -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:check-circle" class="w-5 h-5 mr-2" />
          Configuration Summary
        </CardTitle>
        <CardDescription>
          Overview of IP schema configuration for all parts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div
            v-for="(part, index) in parts"
            :key="part.tempId || index"
            class="flex items-center justify-between p-4 border rounded-lg"
            :class="{
              'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20': getPartStatus(index) === 'configured',
              'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20': getPartStatus(index) === 'partial',
              'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20': getPartStatus(index) === 'missing'
            }"
          >
            <div>
              <h4 class="font-medium">{{ part.title || `Part ${index + 1}` }}</h4>
              <p class="text-sm text-muted-foreground">
                {{ getPartConfigSummary(index) }}
              </p>
            </div>
            <div class="flex items-center space-x-2">
              <Badge
                :variant="getPartStatus(index) === 'configured' ? 'default' : 
                         getPartStatus(index) === 'partial' ? 'secondary' : 'destructive'"
              >
                {{ getPartStatusLabel(index) }}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                @click="switchToPart(index)"
              >
                Configure
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Device Addition Modal for Parts -->
    <Dialog v-model:open="showPartDeviceModal">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Device to Part {{ currentPartIndex + 1 }}</DialogTitle>
          <DialogDescription>
            Add a network device specific to this part's network scenario
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <div class="space-y-3">
            <div>
              <Label for="part-device-id">Device ID</Label>
              <Input
                id="part-device-id"
                v-model="partCustomDevice.deviceId"
                placeholder="e.g., part1_router, dmz_firewall"
              />
            </div>
            <div>
              <Label for="part-device-name">Device Name</Label>
              <Input
                id="part-device-name"
                v-model="partCustomDevice.deviceName"
                placeholder="e.g., DMZ Router, Internal Firewall"
              />
            </div>
            <div>
              <Label for="part-host-offset">Host Offset</Label>
              <Input
                id="part-host-offset"
                v-model.number="partCustomDevice.hostOffset"
                type="number"
                min="1"
                max="254"
                placeholder="e.g., 10"
              />
            </div>
            <Button 
              :disabled="!isPartCustomDeviceValid"
              class="w-full"
              @click="addPartCustomDevice"
            >
              Add Device to Part {{ currentPartIndex + 1 }}
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showPartDeviceModal = false">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import NetworkConfigPanel from './NetworkConfigPanel.vue'
import DeviceIPMapping from './DeviceIPMapping.vue'
import CSVUploader from './CSVUploader.vue'
import IPPreviewTable from './IPPreviewTable.vue'

// Props
interface Props {
  parts: any[]
  globalStudents?: any[]
  modelValue?: any
}

const props = withDefaults(defineProps<Props>(), {
  parts: () => [],
  globalStudents: () => [],
  modelValue: () => ({})
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any]
  'update:part': [partIndex: number, updates: any]
}>()

// State
const currentPartIndex = ref(0)
const useGlobalStudents = ref(true)
const showPartDeviceModal = ref(false)
const partCustomDevice = ref({
  deviceId: '',
  deviceName: '',
  hostOffset: 1,
  description: ''
})

// Part-specific IP schema states
const partConfigs = ref<Record<number, any>>({})

// Computed
const currentPart = computed(() => props.parts[currentPartIndex.value])
const hasGlobalStudents = computed(() => props.globalStudents && props.globalStudents.length > 0)

const currentPartConfig = computed(() => {
  if (!partConfigs.value[currentPartIndex.value]) {
    partConfigs.value[currentPartIndex.value] = {
      networkConfig: {
        baseNetwork: '192.168.1.0',
        subnetMask: 24,
        gateway: '192.168.1.1',
        description: ''
      },
      deviceConfigs: [],
      students: [],
      allocationStrategy: 'group_based'
    }
  }
  return partConfigs.value[currentPartIndex.value]
})

const currentPartNetworkInfo = computed(() => {
  const { validateCIDR } = useNetworkValidation()
  const config = currentPartConfig.value.networkConfig
  const cidr = `${config.baseNetwork}/${config.subnetMask}`
  const validation = validateCIDR(cidr)
  return validation.isValid ? validation.network_info : null
})

const currentPartValidation = computed(() => {
  const { validateCIDR } = useNetworkValidation()
  const config = currentPartConfig.value.networkConfig
  const cidr = `${config.baseNetwork}/${config.subnetMask}`
  return validateCIDR(cidr)
})

const currentPartCanGenerateIPs = computed(() => {
  const config = currentPartConfig.value
  const students = useGlobalStudents.value ? props.globalStudents : config.students
  return currentPartNetworkInfo.value && 
         config.deviceConfigs.length > 0 && 
         students.length > 0
})

const currentPartPreview = computed(() => {
  if (!currentPartCanGenerateIPs.value) return null
  
  try {
    const { previewIPAssignments } = useIPGeneration()
    const config = currentPartConfig.value
    const students = useGlobalStudents.value ? props.globalStudents : config.students
    
    return previewIPAssignments(
      students,
      config.networkConfig,
      config.deviceConfigs,
      config.allocationStrategy,
      3
    )
  } catch {
    return null
  }
})

const deviceTemplates = computed(() => [
  { deviceId: 'router1', deviceName: 'Router 1', hostOffset: 1, description: 'Network router' },
  { deviceId: 'switch1', deviceName: 'Switch 1', hostOffset: 2, description: 'Network switch' },
  { deviceId: 'pc1', deviceName: 'PC 1', hostOffset: 10, description: 'Workstation' },
  { deviceId: 'server1', deviceName: 'Server 1', hostOffset: 20, description: 'Server' },
  { deviceId: 'firewall1', deviceName: 'Firewall 1', hostOffset: 1, description: 'Security device' },
  { deviceId: 'dmz_server', deviceName: 'DMZ Server', hostOffset: 50, description: 'DMZ server' }
])

const isPartCustomDeviceValid = computed(() => {
  const config = currentPartConfig.value
  return partCustomDevice.value.deviceId.trim() !== '' &&
         partCustomDevice.value.deviceName.trim() !== '' &&
         partCustomDevice.value.hostOffset >= 1 &&
         partCustomDevice.value.hostOffset <= 254 &&
         !config.deviceConfigs.some((d: any) => d.deviceId === partCustomDevice.value.deviceId.trim())
})

// Methods
const switchToPart = (partIndex: number) => {
  currentPartIndex.value = partIndex
}

const getPartStatus = (partIndex: number): 'configured' | 'partial' | 'missing' => {
  const config = partConfigs.value[partIndex]
  if (!config) return 'missing'
  
  const hasNetwork = config.networkConfig && config.networkConfig.baseNetwork
  const hasDevices = config.deviceConfigs && config.deviceConfigs.length > 0
  const hasStudents = useGlobalStudents.value ? 
    props.globalStudents.length > 0 : 
    config.students && config.students.length > 0
  
  if (hasNetwork && hasDevices && hasStudents) return 'configured'
  if (hasNetwork || hasDevices) return 'partial'
  return 'missing'
}

const getPartStatusLabel = (partIndex: number): string => {
  const status = getPartStatus(partIndex)
  return {
    'configured': 'Ready',
    'partial': 'Incomplete',
    'missing': 'Not Configured'
  }[status]
}

const getPartConfigSummary = (partIndex: number): string => {
  const config = partConfigs.value[partIndex]
  if (!config) return 'No configuration'
  
  const deviceCount = config.deviceConfigs?.length || 0
  const network = config.networkConfig?.baseNetwork || 'Not set'
  const studentCount = useGlobalStudents.value ? 
    props.globalStudents.length : 
    (config.students?.length || 0)
  
  return `${deviceCount} devices, ${network}, ${studentCount} students`
}

const handlePartNetworkUpdate = (networkConfig: any) => {
  currentPartConfig.value.networkConfig = { ...currentPartConfig.value.networkConfig, ...networkConfig }
  emitPartUpdate()
}

const handlePartDeviceUpdate = (index: number, updates: any) => {
  if (currentPartConfig.value.deviceConfigs[index]) {
    currentPartConfig.value.deviceConfigs[index] = { 
      ...currentPartConfig.value.deviceConfigs[index], 
      ...updates 
    }
    emitPartUpdate()
  }
}

const handlePartDeviceRemove = (index: number) => {
  currentPartConfig.value.deviceConfigs.splice(index, 1)
  emitPartUpdate()
}

const handlePartStudentsUpdate = (students: any[]) => {
  currentPartConfig.value.students = [...students]
  emitPartUpdate()
}

const handlePartStrategyUpdate = (strategy: string) => {
  currentPartConfig.value.allocationStrategy = strategy
  emitPartUpdate()
}

const addPartDeviceFromTemplate = (template: any) => {
  const nextNumber = getNextPartDeviceNumber(template.deviceId)
  const deviceType = template.deviceId.replace(/\d+$/, '')
  const nextDeviceId = `part${currentPartIndex.value + 1}_${deviceType}${nextNumber}`
  
  const newDevice = {
    deviceId: nextDeviceId,
    deviceName: `Part ${currentPartIndex.value + 1} ${template.deviceName}`,
    hostOffset: template.hostOffset + (nextNumber - 1),
    ipVariable: `${nextDeviceId.toLowerCase()}_ip`,
    description: template.description
  }
  
  currentPartConfig.value.deviceConfigs.push(newDevice)
  emitPartUpdate()
}

const addPartCustomDevice = () => {
  if (isPartCustomDeviceValid.value) {
    const newDevice = {
      deviceId: partCustomDevice.value.deviceId.trim(),
      deviceName: partCustomDevice.value.deviceName.trim(),
      hostOffset: partCustomDevice.value.hostOffset,
      ipVariable: `${partCustomDevice.value.deviceId.toLowerCase()}_ip`,
      description: partCustomDevice.value.description.trim()
    }
    
    currentPartConfig.value.deviceConfigs.push(newDevice)
    
    // Reset form
    partCustomDevice.value = {
      deviceId: '',
      deviceName: '',
      hostOffset: 1,
      description: ''
    }
    
    showPartDeviceModal.value = false
    emitPartUpdate()
  }
}

const getNextPartDeviceNumber = (templateId: string): number => {
  const prefix = templateId.replace(/\d+$/, '')
  const existingDevices = currentPartConfig.value.deviceConfigs.filter((d: any) => 
    d.deviceId.includes(prefix)
  )
  return existingDevices.length + 1
}

const getNextPartDeviceName = (template: any): string => {
  const nextNumber = getNextPartDeviceNumber(template.deviceId)
  return `${template.deviceName} (Part ${currentPartIndex.value + 1})`
}

const getDeviceIcon = (deviceId: string): string => {
  const id = deviceId.toLowerCase()
  
  if (id.includes('router')) return 'lucide:router'
  if (id.includes('switch')) return 'lucide:network'
  if (id.includes('pc') || id.includes('computer')) return 'lucide:monitor'
  if (id.includes('server')) return 'lucide:server'
  if (id.includes('firewall')) return 'lucide:shield'
  if (id.includes('phone') || id.includes('voip')) return 'lucide:phone'
  if (id.includes('printer')) return 'lucide:printer'
  if (id.includes('camera')) return 'lucide:camera'
  
  return 'lucide:cpu'
}

const emitPartUpdate = () => {
  // Generate IP schema for current part
  const config = currentPartConfig.value
  const ipSchema = {
    scope: 'part' as const,
    baseNetwork: config.networkConfig.baseNetwork,
    subnetMask: config.networkConfig.subnetMask,
    allocationStrategy: config.allocationStrategy,
    variablesMapping: config.deviceConfigs.map((device: any) => ({
      name: device.ipVariable,
      hostOffset: device.hostOffset,
      example: generateExampleIP(device, config)
    }))
  }
  
  const deviceIpMapping = config.deviceConfigs.map((device: any) => ({
    deviceId: device.deviceId,
    ipVariable: device.ipVariable
  }))
  
  // Emit update for the current part
  emit('update:part', currentPartIndex.value, {
    ipSchema,
    deviceIpMapping,
    students: useGlobalStudents.value ? props.globalStudents : config.students
  })
  
  // Emit overall model value update
  emit('update:modelValue', {
    scope: 'part',
    partConfigs: partConfigs.value,
    useGlobalStudents: useGlobalStudents.value
  })
}

const generateExampleIP = (device: any, config: any): string => {
  try {
    const parts = config.networkConfig.baseNetwork.split('.')
    if (config.allocationStrategy === 'group_based') {
      parts[2] = String(parseInt(parts[2]) + 1)
      parts[3] = String(device.hostOffset)
    } else {
      parts[2] = String(parseInt(parts[2]) + 1)
      parts[3] = String(10 + device.hostOffset)
    }
    return parts.join('.')
  } catch {
    return `${config.networkConfig.baseNetwork.split('.').slice(0, 3).join('.')}.${device.hostOffset}`
  }
}

// Watch for part changes
watch(() => props.parts.length, (newLength) => {
  // Ensure we don't go out of bounds
  if (currentPartIndex.value >= newLength && newLength > 0) {
    currentPartIndex.value = newLength - 1
  }
}, { immediate: true })

// Watch for global students usage
watch(useGlobalStudents, () => {
  emitPartUpdate()
})
</script>

<style scoped>
.transition-all {
  transition: all 0.2s ease-in-out;
}
</style>