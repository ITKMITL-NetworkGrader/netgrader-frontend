<template>
  <div class="space-y-6">
    <!-- Scope Selection Section -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:layers" class="w-5 h-5 mr-2" />
          IP Schema Scope
        </CardTitle>
        <CardDescription>
          Choose whether the IP schema applies to the entire lab/exam or to individual parts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            class="border-2 rounded-lg p-4 cursor-pointer transition-colors"
            :class="{ 
              'border-primary bg-primary/5': scope === 'lab',
              'border-border hover:border-primary/50': scope !== 'lab'
            }"
            @click="setScope('lab')"
          >
            <div class="flex items-start space-x-3">
              <div
                class="w-5 h-5 rounded-full border-2 mt-0.5"
                :class="{ 
                  'border-primary bg-primary': scope === 'lab',
                  'border-muted-foreground': scope !== 'lab'
                }"
              >
                <div
                  v-if="scope === 'lab'" 
                  class="w-2 h-2 bg-primary-foreground rounded-full m-0.5"
                />
              </div>
              <div>
                <h4 class="font-medium">Lab-wide Scope</h4>
                <p class="text-sm text-muted-foreground">
                  Single IP schema applies to all parts of the lab/exam. All parts share the same network configuration.
                </p>
              </div>
            </div>
          </div>
          
          <div 
            class="border-2 rounded-lg p-4 cursor-pointer transition-colors"
            :class="{ 
              'border-primary bg-primary/5': scope === 'part',
              'border-border hover:border-primary/50': scope !== 'part'
            }"
            @click="setScope('part')"
          >
            <div class="flex items-start space-x-3">
              <div
                class="w-5 h-5 rounded-full border-2 mt-0.5"
                :class="{ 
                  'border-primary bg-primary': scope === 'part',
                  'border-muted-foreground': scope !== 'part'
                }"
              >
                <div
                  v-if="scope === 'part'" 
                  class="w-2 h-2 bg-primary-foreground rounded-full m-0.5"
                />
              </div>
              <div>
                <h4 class="font-medium">Part-specific Scope</h4>
                <p class="text-sm text-muted-foreground">
                  Each part can have its own IP schema. Allows different network configurations per part.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="scope === 'part'" class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div class="flex items-start space-x-2">
            <Icon name="lucide:info" class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div class="text-sm">
              <p class="font-medium text-blue-900 dark:text-blue-100">Part-specific IP Schemas</p>
              <p class="text-blue-700 dark:text-blue-300 mt-1">
                When using part-specific scope, each part in your lab/exam can be assigned its own IP schema during part creation. This allows for progressive complexity or different network topologies per part.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Network Configuration Section -->
    <Card v-if="scope === 'lab'">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:network" class="w-5 h-5 mr-2" />
          Network Configuration
        </CardTitle>
        <CardDescription>
          Configure management IP generation for student outer routers (used by grader to SSH into networks)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NetworkConfigPanel 
          :model-value="networkConfig"
          :validation-result="networkValidation"
          @update:model-value="handleNetworkUpdate"
        />
      </CardContent>
    </Card>

    <!-- Device Configuration Section -->
    <Card v-if="scope === 'lab'">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center">
              <Icon name="lucide:server" class="w-5 h-5 mr-2" />
              Device IP Mapping
            </CardTitle>
            <CardDescription>
              Select device presets below to quickly configure common network devices
            </CardDescription>
          </div>
          <Button 
            variant="outline"
            size="sm" 
            @click="showDeviceModal = true"
          >
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            Add Custom Device
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Device Preset Buttons -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <Label class="text-sm font-medium">Device Presets</Label>
            <span class="text-xs text-muted-foreground">Click to apply preset configuration</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button 
              v-for="template in deviceTemplates"
              :key="template.deviceId"
              variant="outline"
              size="sm"
              class="justify-start h-auto p-3 text-left"
              @click="addDeviceFromTemplate(template)"
            >
              <div class="flex items-center space-x-2">
                <Icon :name="getDeviceIcon(template.deviceId)" class="w-4 h-4 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="text-sm font-medium truncate">{{ getNextDeviceName(template) }}</div>
                  <div class="text-xs text-muted-foreground truncate">{{ template.description || 'Preset configuration' }}</div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        <!-- Device List -->
        <DeviceIPMapping 
          :devices="deviceConfigs"
          :network-info="networkInfo"
          @update:device="handleDeviceUpdate"
          @remove:device="handleDeviceRemove"
        />
      </CardContent>
    </Card>

    <!-- CSV Upload Section -->
    <Card v-if="scope === 'lab'">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:upload" class="w-5 h-5 mr-2" />
          Student Data
        </CardTitle>
        <CardDescription>
          Upload student roster in CSV format (comma-separated values)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CSVUploader 
          :students="students"
          :allocation-strategy="allocationStrategy"
          @upload:students="handleStudentsUpdate"
          @update:strategy="handleStrategyUpdate"
        />
      </CardContent>
    </Card>

    <!-- IP Preview Section -->
    <Card v-if="scope === 'lab' && canGenerateIPs && previewAssignments?.success">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Icon name="lucide:eye" class="w-5 h-5 mr-2" />
          IP Assignment Preview
        </CardTitle>
        <CardDescription>
          Preview of IP assignments based on current configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <IPPreviewTable 
          :assignments="previewAssignments.assignments || []"
          :network-info="previewAssignments.networkInfo"
        />
      </CardContent>
    </Card>

    <!-- Validation Messages -->
    <Alert v-if="validationResult && !validationResult.isValid" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Configuration Errors</AlertTitle>
      <AlertDescription>
        <ul class="list-disc list-inside space-y-1 mt-2">
          <li v-for="error in validationResult.errors" :key="error">
            {{ error }}
          </li>
        </ul>
      </AlertDescription>
    </Alert>

    <Alert v-else-if="validationResult && validationResult.warnings?.length" variant="default">
      <Info class="h-4 w-4" />
      <AlertTitle>Configuration Warnings</AlertTitle>
      <AlertDescription>
        <ul class="list-disc list-inside space-y-1 mt-2">
          <li v-for="warning in validationResult.warnings" :key="warning">
            {{ warning }}
          </li>
        </ul>
      </AlertDescription>
    </Alert>

    <!-- Device Addition Modal -->
    <Dialog v-model:open="showDeviceModal">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Network Device</DialogTitle>
          <DialogDescription>
            Select a device template or create a custom device configuration
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <Label class="text-sm font-medium">Use these presets to customize your new device</Label>
            <p class="text-xs text-muted-foreground mt-1">Click any preset to populate the form fields below, then modify as needed</p>
          </div>
          
          <div class="grid grid-cols-2 gap-2">
            <Button 
              v-for="template in deviceTemplates"
              :key="template.deviceId"
              variant="outline"
              size="sm"
              class="text-left justify-start h-auto p-3"
              @click="populateCustomDeviceForm(template)"
            >
              <div>
                <div class="font-medium">{{ template.deviceName }}</div>
                <div class="text-xs text-muted-foreground">{{ template.description }}</div>
              </div>
            </Button>
          </div>
          
          <Separator />
          
          <div class="space-y-3">
            <div>
              <Label for="custom-device-id">Custom Device ID</Label>
              <Input
                id="custom-device-id"
                v-model="customDevice.deviceId"
                placeholder="e.g., router2, pc3"
              />
            </div>
            <div>
              <Label for="custom-device-name">Device Name</Label>
              <Input
                id="custom-device-name"
                v-model="customDevice.deviceName"
                placeholder="e.g., Router 2, PC 3"
              />
            </div>
            <div>
              <Label for="custom-host-offset">Host Offset</Label>
              <Input
                id="custom-host-offset"
                v-model.number="customDevice.hostOffset"
                type="number"
                min="1"
                max="254"
                placeholder="e.g., 10"
              />
            </div>
            <Button 
              :disabled="!isCustomDeviceValid"
              class="w-full"
              @click="addCustomDevice"
            >
              Add Custom Device
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showDeviceModal = false">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Info } from 'lucide-vue-next'
import NetworkConfigPanel from './NetworkConfigPanel.vue'
import DeviceIPMapping from './DeviceIPMapping.vue'
import CSVUploader from './CSVUploader.vue'
import IPPreviewTable from './IPPreviewTable.vue'
import type { NetworkConfig, DeviceConfig } from '@/types/ipSchema'

// Props
interface Props {
  modelValue?: any
  schema?: any
  deviceMapping?: any
  showValidation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  schema: undefined,
  deviceMapping: undefined,
  showValidation: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any]
  'update:schema': [value: any]
  'update:deviceMapping': [value: any]
  'validation:change': [isValid: boolean]
}>()

// Composables
const ipSchema = useIPSchema()
const {
  networkConfig,
  deviceConfigs,
  students,
  allocationStrategy,
  scope,
  setScope,
  isNetworkValid,
  networkInfo,
  hasDeviceConfigs,
  hasStudents,
  canGenerateIPs,
  previewAssignments,
  validateConfiguration,
  getCommonDeviceTemplates
} = ipSchema

// Reactive state
const showDeviceModal = ref(false)
const customDevice = ref({
  deviceId: '',
  deviceName: '',
  hostOffset: 1,
  description: ''
})

// Computed
const networkValidation = computed(() => {
  if (!isNetworkValid.value) {
    const cidr = `${networkConfig.value.baseNetwork}/${networkConfig.value.subnetMask}`
    const { validateCIDR } = useNetworkValidation()
    return validateCIDR(cidr)
  }
  return null
})

const validationResult = computed(() => validateConfiguration())

const deviceTemplates = computed(() => getCommonDeviceTemplates())

const isCustomDeviceValid = computed(() => {
  return customDevice.value.deviceId.trim() !== '' &&
         customDevice.value.deviceName.trim() !== '' &&
         customDevice.value.hostOffset >= 1 &&
         customDevice.value.hostOffset <= 254 &&
         !deviceConfigs.value.some(d => d.deviceId === customDevice.value.deviceId.trim())
})

const isDeviceTemplateUsed = (deviceId: string): boolean => {
  return deviceConfigs.value.some(d => d.deviceId === deviceId)
}

const getNextDeviceNumber = (templateId: string): number => {
  const prefix = templateId.replace(/\d+$/, '') // Remove trailing numbers (pc1 -> pc)
  const existingDevices = deviceConfigs.value.filter(d => d.deviceId.startsWith(prefix))
  
  // Find the highest number used
  let maxNumber = 0
  existingDevices.forEach(device => {
    const match = device.deviceId.match(/(\d+)$/)
    if (match) {
      const number = parseInt(match[1])
      if (number > maxNumber) {
        maxNumber = number
      }
    }
  })
  
  return maxNumber + 1
}

const getNextHostOffset = (templateId: string, deviceNumber: number): number => {
  const baseTemplate = deviceTemplates.value.find(t => t.deviceId === templateId)
  if (!baseTemplate) return deviceNumber
  
  // Calculate offset based on device type
  if (templateId.startsWith('pc')) {
    return deviceNumber * 10 // pc1=10, pc2=20, pc3=30
  } else if (templateId.startsWith('router')) {
    return deviceNumber // router1=1, router2=2, router3=3
  } else if (templateId.startsWith('switch')) {
    return deviceNumber + 1 // switch1=2, switch2=3, switch3=4
  }
  
  return deviceNumber
}

const getNextDeviceName = (template: any): string => {
  const nextNumber = getNextDeviceNumber(template.deviceId)
  const deviceType = template.deviceName.replace(/\s+\d+$/, '') // Remove " 1" from "PC 1"
  return `${deviceType} ${nextNumber}`
}

const generateNextDeviceFromTemplate = (template: any) => {
  const nextNumber = getNextDeviceNumber(template.deviceId)
  const deviceType = template.deviceId.replace(/\d+$/, '') // pc1 -> pc
  const nextDeviceId = `${deviceType}${nextNumber}`
  const nextHostOffset = getNextHostOffset(template.deviceId, nextNumber)
  
  // Check for host offset conflicts and increment if needed
  let finalHostOffset = nextHostOffset
  while (deviceConfigs.value.some(d => d.hostOffset === finalHostOffset)) {
    finalHostOffset++
  }
  
  return {
    deviceId: nextDeviceId,
    deviceName: getNextDeviceName(template),
    hostOffset: finalHostOffset,
    description: template.description
  }
}

// Watch for validation changes
watch(validationResult, (result) => {
  emit('validation:change', result.isValid)
}, { immediate: true })

// Flag to prevent recursive updates
const isLoadingFromProps = ref(false)

// Watch for prop changes to reload data
watch(() => [props.schema, props.deviceMapping], (newValues, oldValues) => {
  if (!newValues || isLoadingFromProps.value) return
  
  const [newSchema, newDeviceMapping] = newValues
  const [oldSchema, oldDeviceMapping] = oldValues || [null, null]
  
  // Only reload if the props actually changed
  const schemaChanged = JSON.stringify(newSchema) !== JSON.stringify(oldSchema)
  const mappingChanged = JSON.stringify(newDeviceMapping) !== JSON.stringify(oldDeviceMapping)
  
  if ((schemaChanged || mappingChanged) && newSchema && newDeviceMapping) {
    isLoadingFromProps.value = true
    ipSchema.loadFromIpSchema(newSchema, newDeviceMapping)
    nextTick(() => {
      isLoadingFromProps.value = false
    })
  }
}, { deep: true, immediate: true })

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const { ipSchema: schema, deviceIpMapping, students: studentData } = newValue
    if (schema && deviceIpMapping) {
      ipSchema.loadFromIpSchema(schema, deviceIpMapping)
    }
    if (studentData) {
      ipSchema.updateStudents(studentData)
    }
  }
}, { deep: true })

// Watch for model value changes
watch(() => [networkConfig.value, deviceConfigs.value, students.value, allocationStrategy.value, scope.value], () => {
  // Don't emit updates if we're currently loading from props
  if (isLoadingFromProps.value) return
  
  // Always emit the scope, even if other validations fail
  const schema = ipSchema.createIpSchema()
  const deviceMapping = scope.value === 'lab' && hasDeviceConfigs.value ? ipSchema.createDeviceIpMapping() : []
  
  // Emit combined model value with scope always included
  emit('update:modelValue', {
    scope: scope.value,
    ipSchema: schema,
    deviceIpMapping: deviceMapping,
    students: students.value,
    allocationStrategy: allocationStrategy.value
  })
  
  // Emit individual v-model updates only for lab scope
  if (scope.value === 'lab' && isNetworkValid.value && hasDeviceConfigs.value) {
    emit('update:schema', schema)
    emit('update:deviceMapping', deviceMapping)
  }
}, { deep: true })

// Methods
const handleNetworkUpdate = (config: NetworkConfig) => {
  ipSchema.updateNetworkConfig(config)
}

const handleDeviceUpdate = (index: number, updates: Partial<DeviceConfig>) => {
  ipSchema.updateDeviceConfig(index, updates)
}

const handleDeviceRemove = (index: number) => {
  ipSchema.removeDeviceConfig(index)
}

const handleStudentsUpdate = (newStudents: any[]) => {
  ipSchema.updateStudents(newStudents)
}

const handleStrategyUpdate = (strategy: 'group_based' | 'student_id_based') => {
  ipSchema.setAllocationStrategy(strategy)
}

const addDeviceFromTemplate = (template: any) => {
  // Generate the next incremented device
  const nextDevice = generateNextDeviceFromTemplate(template)
  ipSchema.addDeviceConfig(nextDevice)
}

const populateCustomDeviceForm = (template: any) => {
  // Populate the custom device form with template data
  customDevice.value = {
    deviceId: template.deviceId,
    deviceName: template.deviceName,
    hostOffset: template.hostOffset,
    description: template.description || ''
  }
}

const addCustomDevice = () => {
  if (isCustomDeviceValid.value) {
    ipSchema.addDeviceConfig({
      deviceId: customDevice.value.deviceId.trim(),
      deviceName: customDevice.value.deviceName.trim(),
      hostOffset: customDevice.value.hostOffset,
      description: customDevice.value.description.trim()
    })
    
    // Reset form
    customDevice.value = {
      deviceId: '',
      deviceName: '',
      hostOffset: 1,
      description: ''
    }
    
    showDeviceModal.value = false
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

// Initialize if model value or individual props provided
onMounted(() => {
  // Always prioritize modelValue if it exists, regardless of individual props
  if (props.modelValue) {
    const { scope: modelScope, ipSchema: schema, deviceIpMapping, students: studentData } = props.modelValue
    
    // Set scope if provided in model value
    if (modelScope) {
      ipSchema.setScope(modelScope)
    }
    
    if (schema && deviceIpMapping) {
      ipSchema.loadFromIpSchema(schema, deviceIpMapping)
    }
    if (studentData && studentData.length > 0) {
      ipSchema.updateStudents(studentData)
    }
  } else if (props.schema && props.deviceMapping) {
    // Only use individual props if no combined model value exists
    ipSchema.loadFromIpSchema(props.schema, props.deviceMapping)
  }
  
  // Ensure we always emit an initial scope value
  setTimeout(() => {
    emit('update:modelValue', {
      scope: scope.value,
      ipSchema: ipSchema.createIpSchema(),
      deviceIpMapping: [],
      students: [],
      allocationStrategy: allocationStrategy.value
    })
  }, 100)
})
</script>