<template>
  <div class="space-y-6">
    <!-- Network Configuration Section -->
    <Card>
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
    <Card>
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
                  <div class="text-sm font-medium truncate">{{ template.deviceName }}</div>
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
    <Card>
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
    <Card v-if="canGenerateIPs && previewAssignments?.success">
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
          <div class="grid grid-cols-2 gap-2">
            <Button 
              v-for="template in deviceTemplates"
              :key="template.deviceId"
              variant="outline"
              size="sm"
              class="text-left justify-start h-auto p-3"
              @click="addDeviceFromTemplate(template)"
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
watch(() => [networkConfig.value, deviceConfigs.value, students.value, allocationStrategy.value], () => {
  // Don't emit updates if we're currently loading from props
  if (isLoadingFromProps.value) return
  
  // Always emit device mapping if we have devices and network config, regardless of students
  if (isNetworkValid.value && hasDeviceConfigs.value) {
    const schema = ipSchema.createIpSchema()
    const deviceMapping = ipSchema.createDeviceIpMapping()
    
    // Emit both the combined model value and individual values
    emit('update:modelValue', {
      ipSchema: schema,
      deviceIpMapping: deviceMapping,
      students: students.value,
      allocationStrategy: allocationStrategy.value
    })
    
    // Emit individual v-model updates
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
  // Check if device already exists
  const exists = deviceConfigs.value.some(d => d.deviceId === template.deviceId)
  if (!exists) {
    ipSchema.addDeviceConfig(template)
    showDeviceModal.value = false
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
  if (id.includes('server')) return 'lucide:server'
  if (id.includes('firewall') || id.includes('security')) return 'lucide:shield'
  if (id.includes('phone') || id.includes('voip')) return 'lucide:phone'
  if (id.includes('printer')) return 'lucide:printer'
  if (id.includes('camera')) return 'lucide:camera'
  
  return 'lucide:cpu' // Default icon
}

// Initialize if model value or individual props provided
onMounted(() => {
  if (props.schema && props.deviceMapping) {
    // Initialize from individual props (v-model:schema and v-model:device-mapping)
    ipSchema.loadFromIpSchema(props.schema, props.deviceMapping)
  } else if (props.modelValue) {
    // Initialize from combined model value
    const { ipSchema: schema, deviceIpMapping, students: studentData } = props.modelValue
    if (schema && deviceIpMapping) {
      ipSchema.loadFromIpSchema(schema, deviceIpMapping)
    }
    if (studentData) {
      ipSchema.updateStudents(studentData)
    }
  }
})
</script>