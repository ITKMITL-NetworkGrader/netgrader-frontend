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
          Configure the base network settings for IP address generation
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
              Define network devices and their IP variable assignments
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            @click="showDeviceModal = true"
          >
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
          Upload student roster in CSV format (StudentID;GroupNumber)
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
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any]
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

// Watch for model value changes
watch(() => [networkConfig.value, deviceConfigs.value, students.value, allocationStrategy.value], () => {
  if (canGenerateIPs.value) {
    const schema = ipSchema.createIpSchema()
    const deviceMapping = ipSchema.createDeviceIpMapping()
    emit('update:modelValue', {
      ipSchema: schema,
      deviceIpMapping: deviceMapping,
      students: students.value,
      allocationStrategy: allocationStrategy.value
    })
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

// Initialize if model value provided
if (props.modelValue) {
  const { ipSchema: schema, deviceIpMapping, students: studentData } = props.modelValue
  if (schema && deviceIpMapping) {
    ipSchema.loadFromIpSchema(schema, deviceIpMapping)
  }
  if (studentData) {
    ipSchema.updateStudents(studentData)
  }
}
</script>