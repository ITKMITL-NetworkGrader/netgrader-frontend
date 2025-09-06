<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Device Configuration</h2>
      <p class="text-muted-foreground mt-1">
        Add and configure network devices for your lab topology.
      </p>
    </div>

    <!-- Network Context -->
    <div class="bg-muted/50 p-4 rounded-lg">
      <div class="flex items-center space-x-2">
        <Network class="h-5 w-5 text-muted-foreground" />
        <span class="font-medium">Network:</span>
        <code class="bg-background px-2 py-1 rounded text-sm">
          {{ networkConfig.baseNetwork }}/{{ networkConfig.subnetMask }}
        </code>
        <span class="text-muted-foreground">
          ({{ availableHosts }} available host addresses)
        </span>
      </div>
    </div>

    <!-- Devices List -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium">
          Network Devices <span class="text-destructive">*</span>
          <span class="text-muted-foreground font-normal">(Minimum 1 device required)</span>
        </Label>
        <Button @click="addDevice" :disabled="isLoadingTemplates">
          <Plus class="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingTemplates" class="flex items-center justify-center p-8">
        <Loader2 class="w-6 h-6 animate-spin mr-2" />
        <span>Loading device templates...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="localData.length === 0" class="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <Router class="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 class="text-lg font-medium mb-2">No devices configured</h3>
        <p class="text-muted-foreground mb-4">
          Add your first network device to get started
        </p>
        <Button @click="addDevice">
          <Plus class="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      <!-- Devices List -->
      <div v-else class="space-y-4">
        <TransitionGroup name="device" tag="div" class="space-y-4">
          <Card
            v-for="(device, index) in localData"
            :key="device.tempId"
            :class="{
              'border-destructive': hasDeviceErrors(index),
              'border-green-500': !hasDeviceErrors(index) && isDeviceValid(device)
            }"
          >
            <CardHeader class="pb-4">
              <div class="flex items-center justify-between">
                <CardTitle class="text-lg flex items-center">
                  <Router class="w-5 h-5 mr-2 text-primary" />
                  Device {{ index + 1 }}
                  <Badge v-if="device.deviceId" variant="secondary" class="ml-2">
                    {{ device.deviceId }}
                  </Badge>
                </CardTitle>
                <div class="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    class="text-sm"
                    @click="moveDevice(index, -1)"
                    :disabled="index === 0"
                  >
                    <MoveUp class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    class="text-sm"
                    @click="moveDevice(index, 1)"
                    :disabled="index === localData.length - 1"
                  >
                    <MoveDown class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    @click="removeDevice(index)"
                    class="text-sm text-destructive hover:text-destructive"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- Device Basic Configuration -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Device ID -->
                <div class="space-y-2">
                  <Label :for="`device-id-${index}`" class="text-sm font-medium">
                    Device ID <span class="text-destructive">*</span>
                  </Label>
                  <Input
                    :id="`device-id-${index}`"
                    v-model="device.deviceId"
                    placeholder="router1, switch1, etc."
                    :class="{
                      'border-destructive': hasFieldError(index, 'deviceId'),
                      'border-green-500': !hasFieldError(index, 'deviceId') && device.deviceId.length > 0
                    }"
                    @input="validateDevice(index, 'deviceId')"
                    @blur="validateDevice(index, 'deviceId')"
                  />
                  <p v-if="hasFieldError(index, 'deviceId')" class="text-sm text-destructive">
                    {{ getFieldError(index, 'deviceId') }}
                  </p>
                </div>

                <!-- Device Template -->
                <div class="space-y-2">
                  <Label :for="`device-template-${index}`" class="text-sm font-medium">
                    Device Template <span class="text-destructive">*</span>
                  </Label>
                  <Select
                    v-model="device.templateId"
                    @update:modelValue="onTemplateChange(index, $event)"
                  >
                    <SelectTrigger
                      :class="{
                        'border-destructive': hasFieldError(index, 'templateId'),
                        'border-green-500': !hasFieldError(index, 'templateId') && device.templateId
                      }"
                    >
                      <SelectValue>
                        <template v-if="getSelectedTemplate(device.templateId)">
                          {{ getSelectedTemplate(device.templateId).name }}
                        </template>
                        <template v-else>
                          Select device template
                        </template>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="template in deviceTemplates"
                        :key="template._id"
                        :value="template._id"
                        class="py-3"
                      >
                        <SelectItemText>
                          <div class="flex flex-col space-y-1">
                            <div class="font-medium">{{ template.name }}</div>
                            <div class="text-xs text-muted-foreground flex items-center space-x-3">
                              <span class="flex items-center space-x-1">
                                <span class="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span>{{ template.platform || 'Generic' }}</span>
                              </span>
                              <span class="flex items-center space-x-1">
                                <span class="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                <span>{{ template.defaultInterfaces?.length || 0 }} interfaces</span>
                              </span>
                              <span v-if="template.deviceType" class="flex items-center space-x-1">
                                <span class="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                                <span class="capitalize">{{ template.deviceType }}</span>
                              </span>
                            </div>
                          </div>
                        </SelectItemText>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="hasFieldError(index, 'templateId')" class="text-sm text-destructive">
                    {{ getFieldError(index, 'templateId') }}
                  </p>
                </div>
              </div>

              <!-- IP Variables Configuration -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <Label class="text-sm font-medium">
                    IP Variables <span class="text-destructive">*</span>
                    <span class="text-muted-foreground font-normal">(Minimum 1 required)</span>
                  </Label>
                  <Button
                    variant="outline"
                    class="text-sm"
                    @click="addIpVariable(index)"
                  >
                    <Plus class="w-4 h-4 mr-1" />
                    Add Variable
                  </Button>
                </div>

                <!-- IP Variables List -->
                <div v-if="device.ipVariables.length === 0" class="text-center p-4 border-2 border-dashed border-muted-foreground/25 rounded">
                  <Network class="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p class="text-sm text-muted-foreground">No IP variables configured</p>
                  <Button variant="ghost" size="sm" @click="addIpVariable(index)" class="mt-2">
                    <Plus class="w-4 h-4 mr-1" />
                    Add IP Variable
                  </Button>
                </div>

                <div v-else class="space-y-3">
                  <TransitionGroup name="ip-var" tag="div" class="space-y-3">
                    <div
                      v-for="(ipVar, ipIndex) in device.ipVariables"
                      :key="`${device.tempId}-ip-${ipIndex}`"
                      class="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <!-- Variable Name -->
                        <div class="space-y-1">
                          <Label class="text-xs font-medium">Variable Name</Label>
                          <Input
                            v-model="ipVar.name"
                            placeholder="loopback0, gig0_1"
                            class="text-sm"
                            :class="{
                              'border-destructive': hasIpVarError(index, ipIndex, 'name'),
                              'border-green-500': !hasIpVarError(index, ipIndex, 'name') && ipVar.name.length > 0
                            }"
                            @input="onVariableNameInput(index, ipIndex, $event)"
                          />
                          <p v-if="hasIpVarError(index, ipIndex, 'name')" class="text-xs text-destructive">
                            {{ getIpVarError(index, ipIndex, 'name') }}
                          </p>
                        </div>

                        <!-- Host Offset -->
                        <div class="space-y-1">
                          <Label class="text-xs font-medium">Host Offset</Label>
                          <div class="flex items-center space-x-2">
                            <Input
                              v-model.number="ipVar.hostOffset"
                              type="number"
                              :min="1"
                              :max="availableHosts"
                              placeholder="1"
                              class="text-sm"
                              :class="{
                                'border-destructive': hasIpVarError(index, ipIndex, 'hostOffset'),
                                'border-green-500': !hasIpVarError(index, ipIndex, 'hostOffset') && ipVar.hostOffset > 0
                              }"
                              @input="validateIpVariable(index, ipIndex, 'hostOffset')"
                            />
                            <div class="text-xs text-muted-foreground">
                              = {{ calculateIP(ipVar.hostOffset) }}
                            </div>
                          </div>
                          <p v-if="hasIpVarError(index, ipIndex, 'hostOffset')" class="text-xs text-destructive">
                            {{ getIpVarError(index, ipIndex, 'hostOffset') }}
                          </p>
                        </div>
                      </div>

                      <!-- Remove IP Variable -->
                      <Button
                        variant="ghost"
                        @click="removeIpVariable(index, ipIndex)"
                        class="text-sm text-destructive hover:text-destructive"
                      >
                        <X class="w-4 h-4" />
                      </Button>
                    </div>
                  </TransitionGroup>
                </div>
              </div>

              <!-- Connection Parameters -->
              <div v-if="device.templateId" class="space-y-4">
                <div class="flex items-center justify-between">
                  <Label class="text-sm font-medium">
                    Connection Parameters
                  </Label>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <!-- SSH Port -->
                  <div class="space-y-2">
                    <Label class="text-xs font-medium">SSH Port</Label>
                    <Input
                      v-model.number="device.connectionParams.sshPort"
                      type="number"
                      placeholder="22"
                      min="1"
                      max="65535"
                      class="text-sm"
                    />
                  </div>
                  
                  <!-- Username -->
                  <div class="space-y-2">
                    <Label class="text-xs font-medium">Username</Label>
                    <Input
                      v-model="device.connectionParams.username"
                      placeholder="admin"
                      class="text-sm"
                    />
                  </div>
                  
                  <!-- Password -->
                  <div class="space-y-2">
                    <Label class="text-xs font-medium">Password</Label>
                    <Input
                      v-model="device.connectionParams.password"
                      type="password"
                      placeholder="password"
                      class="text-sm"
                    />
                  </div>
                </div>
              </div>

              <!-- Template Info -->
              <div v-if="getSelectedTemplate(device.templateId)" class="bg-muted/30 p-3 rounded-lg">
                <div class="flex items-start space-x-3">
                  <Info class="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div class="space-y-2">
                    <div class="text-sm font-medium">Template Information</div>
                    <div class="text-xs text-muted-foreground space-y-1">
                      <div><strong>Platform:</strong> {{ getSelectedTemplate(device.templateId)?.platform }}</div>
                      <div><strong>Default Interfaces:</strong>
                        {{ getSelectedTemplate(device.templateId)?.defaultInterfaces.map(i => i.name).join(', ') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TransitionGroup>
      </div>
    </div>

    <!-- Validation Summary -->
    <div v-if="validation && validation.errors.length > 0" class="mt-6">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Please fix the following issues:</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="error in validation.errors" :key="error">{{ error }}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import {
  Network,
  Router,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Info,
  AlertCircle,
  Loader2,
  X
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

// Types
import type { Device, DeviceTemplate, ValidationResult } from '@/types/wizard'

// Props
interface Props {
  modelValue: Device[]
  networkConfig: {
    baseNetwork: string
    subnetMask: number
  }
  validation?: ValidationResult
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: Device[]): void
  (e: 'validate', result: ValidationResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localData = ref<(Device & { tempId: string })[]>([])
const deviceTemplates = ref<DeviceTemplate[]>([])
const isLoadingTemplates = ref(false)
const fieldErrors = ref<Record<string, Record<string, string>>>({})
const isUpdatingFromProps = ref(false)
const ipVarErrors = ref<Record<string, Record<string, Record<string, string>>>>({})

// Computed
const availableHosts = computed(() => {
  return Math.pow(2, 32 - props.networkConfig.subnetMask) - 2
})

// Methods
const generateTempId = (): string => {
  return 'temp_' + Math.random().toString(36).substr(2, 9)
}

const toAlphanumeric = (interfaceName: string): string => {
  // Convert interface names to alphanumeric format
  // Examples:
  // "GigabitEthernet0/0" -> "gig0_0"
  // "GigabitEthernet0/1" -> "gig0_1"
  // "Loopback0" -> "loopback0"
  // "FastEthernet1/0/1" -> "fa1_0_1"
  
  return interfaceName
    .toLowerCase()
    .replace(/gigabitethernet/g, 'gig')
    .replace(/fastethernet/g, 'fa')
    .replace(/ethernet/g, 'eth')
    .replace(/loopback/g, 'loop')
    .replace(/serial/g, 'ser')
    .replace(/tunnel/g, 'tun')
    .replace(/vlan/g, 'vlan')
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace any non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
}

const addDevice = () => {
  const newDevice: Device & { tempId: string } = {
    tempId: generateTempId(),
    deviceId: '',
    templateId: '',
    ipVariables: [],
    connectionParams: {
      sshPort: 22,
      username: '',
      password: ''
    }
  }
  localData.value.push(newDevice)
  validateStep()
}

const removeDevice = (index: number) => {
  localData.value.splice(index, 1)
  // Clean up errors for this device
  delete fieldErrors.value[index]
  delete ipVarErrors.value[index]
  validateStep()
}

const moveDevice = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < localData.value.length) {
    const device = localData.value.splice(index, 1)[0]
    localData.value.splice(newIndex, 0, device)
  }
}

const addIpVariable = (deviceIndex: number) => {
  const device = localData.value[deviceIndex]
  device.ipVariables.push({
    name: '',
    hostOffset: 1
  })
  validateStep()
}

const removeIpVariable = (deviceIndex: number, ipIndex: number) => {
  localData.value[deviceIndex].ipVariables.splice(ipIndex, 1)
  validateStep()
}

const onVariableNameInput = (deviceIndex: number, ipIndex: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const originalValue = input.value
  
  // Convert to alphanumeric format
  const convertedValue = toAlphanumeric(originalValue)
  
  // Update the model value with converted format
  localData.value[deviceIndex].ipVariables[ipIndex].name = convertedValue
  
  // If the value was changed, update the input field
  if (convertedValue !== originalValue) {
    // Use nextTick to ensure the update happens after the current cycle
    nextTick(() => {
      input.value = convertedValue
    })
  }
  
  // Validate after conversion
  validateIpVariable(deviceIndex, ipIndex, 'name')
}

const onTemplateChange = (deviceIndex: number, templateId: string) => {
  // Update the template ID
  localData.value[deviceIndex].templateId = templateId
  
  // Clear template validation error immediately
  if (fieldErrors.value[deviceIndex]) {
    delete fieldErrors.value[deviceIndex].templateId
  }
  
  // Get the selected template
  const selectedTemplate = getSelectedTemplate(templateId)
  if (selectedTemplate) {
    // Auto-fill Device ID with deviceType + counter
    const sameTypeDevices = localData.value.filter(d => 
      d.templateId === templateId && d.tempId !== localData.value[deviceIndex].tempId
    )
    const counter = sameTypeDevices.length + 1
    localData.value[deviceIndex].deviceId = `${selectedTemplate.deviceType}${counter}`
    
    // Create IP variables from defaultInterfaces
    localData.value[deviceIndex].ipVariables = selectedTemplate.defaultInterfaces.map(iface => ({
      name: toAlphanumeric(iface.name),
      hostOffset: 1 // Default, user can change
    }))
    
    // Set connection parameters from template
    if (selectedTemplate.connectionParams) {
      localData.value[deviceIndex].connectionParams = {
        sshPort: selectedTemplate.connectionParams.defaultSSHPort || 22,
        username: selectedTemplate.connectionParams.authentication?.usernameTemplate || '',
        password: selectedTemplate.connectionParams.authentication?.passwordTemplate || ''
      }
    }
    
    // Clear device ID validation error since we auto-filled it
    if (fieldErrors.value[deviceIndex]) {
      delete fieldErrors.value[deviceIndex].deviceId
    }
  }
  
  // Revalidate the device
  emitValidation()
}

const calculateIP = (hostOffset: number): string => {
  if (!props.networkConfig.baseNetwork || !hostOffset) return 'Invalid'
  
  try {
    const baseParts = props.networkConfig.baseNetwork.split('.').map(Number)
    const totalOffset = hostOffset
    
    // Add offset to the base IP
    let carry = totalOffset
    for (let i = 3; i >= 0 && carry > 0; i--) {
      baseParts[i] += carry % 256
      if (baseParts[i] > 255) {
        carry = Math.floor(baseParts[i] / 256)
        baseParts[i] = baseParts[i] % 256
      } else {
        carry = 0
      }
    }
    
    return baseParts.join('.')
  } catch {
    return 'Invalid'
  }
}

const getSelectedTemplate = (templateId: string): DeviceTemplate | undefined => {
  return deviceTemplates.value.find(t => t._id === templateId)
}

const hasDeviceErrors = (deviceIndex: number): boolean => {
  return !!fieldErrors.value[deviceIndex] || !!ipVarErrors.value[deviceIndex]
}

const hasFieldError = (deviceIndex: number, field: string): boolean => {
  return !!(fieldErrors.value[deviceIndex]?.[field])
}

const getFieldError = (deviceIndex: number, field: string): string => {
  return fieldErrors.value[deviceIndex]?.[field] || ''
}

const hasIpVarError = (deviceIndex: number, ipIndex: number, field: string): boolean => {
  return !!(ipVarErrors.value[deviceIndex]?.[ipIndex]?.[field])
}

const getIpVarError = (deviceIndex: number, ipIndex: number, field: string): string => {
  return ipVarErrors.value[deviceIndex]?.[ipIndex]?.[field] || ''
}

const isDeviceValid = (device: Device & { tempId: string }): boolean => {
  return device.deviceId.length > 0 && 
         device.templateId.length > 0 && 
         device.ipVariables.length > 0 &&
         device.ipVariables.every(ipVar => ipVar.name.length > 0 && ipVar.hostOffset > 0)
}

const validateDevice = (deviceIndex: number, field: string) => {
  if (!fieldErrors.value[deviceIndex]) {
    fieldErrors.value[deviceIndex] = {}
  }

  const device = localData.value[deviceIndex]

  switch (field) {
    case 'deviceId':
      if (!device.deviceId.trim()) {
        fieldErrors.value[deviceIndex].deviceId = 'Device ID is required'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(device.deviceId)) {
        fieldErrors.value[deviceIndex].deviceId = 'Device ID must be alphanumeric with underscores/hyphens'
      } else if (localData.value.some((d, i) => i !== deviceIndex && d.deviceId === device.deviceId)) {
        fieldErrors.value[deviceIndex].deviceId = 'Device ID must be unique'
      } else {
        delete fieldErrors.value[deviceIndex].deviceId
      }
      break

    case 'templateId':
      if (!device.templateId) {
        fieldErrors.value[deviceIndex].templateId = 'Device template is required'
      } else {
        delete fieldErrors.value[deviceIndex].templateId
      }
      break
  }

  emitValidation()
}

const validateIpVariable = (deviceIndex: number, ipIndex: number, field: string) => {
  if (!ipVarErrors.value[deviceIndex]) {
    ipVarErrors.value[deviceIndex] = {}
  }
  if (!ipVarErrors.value[deviceIndex][ipIndex]) {
    ipVarErrors.value[deviceIndex][ipIndex] = {}
  }

  const ipVar = localData.value[deviceIndex].ipVariables[ipIndex]

  switch (field) {
    case 'name':
      if (!ipVar.name.trim()) {
        ipVarErrors.value[deviceIndex][ipIndex].name = 'Variable name is required'
      } else if (!/^[a-zA-Z0-9_]+$/.test(ipVar.name)) {
        ipVarErrors.value[deviceIndex][ipIndex].name = 'Variable name must be alphanumeric with underscores'
      } else {
        delete ipVarErrors.value[deviceIndex][ipIndex].name
      }
      break

    case 'hostOffset':
      if (!ipVar.hostOffset || ipVar.hostOffset < 1) {
        ipVarErrors.value[deviceIndex][ipIndex].hostOffset = 'Host offset must be greater than 0'
      } else if (ipVar.hostOffset > availableHosts.value) {
        ipVarErrors.value[deviceIndex][ipIndex].hostOffset = `Host offset cannot exceed ${availableHosts.value}`
      } else {
        delete ipVarErrors.value[deviceIndex][ipIndex].hostOffset
      }
      break
  }

  emitValidation()
}

const validateAllDevices = () => {
  // Validate all devices without calling validateDevice to avoid recursion
  localData.value.forEach((device, index) => {
    if (!fieldErrors.value[index]) {
      fieldErrors.value[index] = {}
    }

    // Validate deviceId
    if (!device.deviceId.trim()) {
      fieldErrors.value[index].deviceId = 'Device ID is required'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(device.deviceId)) {
      fieldErrors.value[index].deviceId = 'Device ID must be alphanumeric with underscores/hyphens'
    } else if (localData.value.some((d, i) => i !== index && d.deviceId === device.deviceId)) {
      fieldErrors.value[index].deviceId = 'Device ID must be unique'
    } else {
      delete fieldErrors.value[index].deviceId
    }

    // Validate templateId
    if (!device.templateId) {
      fieldErrors.value[index].templateId = 'Device template is required'
    } else {
      delete fieldErrors.value[index].templateId
    }

    // Validate IP variables
    device.ipVariables.forEach((ipVar, ipIndex) => {
      if (!ipVarErrors.value[index]) {
        ipVarErrors.value[index] = {}
      }
      if (!ipVarErrors.value[index][ipIndex]) {
        ipVarErrors.value[index][ipIndex] = {}
      }

      // Validate name
      if (!ipVar.name.trim()) {
        ipVarErrors.value[index][ipIndex].name = 'Variable name is required'
      } else if (!/^[a-zA-Z0-9_]+$/.test(ipVar.name)) {
        ipVarErrors.value[index][ipIndex].name = 'Variable name must be alphanumeric with underscores'
      } else {
        delete ipVarErrors.value[index][ipIndex].name
      }

      // Validate hostOffset
      if (!ipVar.hostOffset || ipVar.hostOffset < 1) {
        ipVarErrors.value[index][ipIndex].hostOffset = 'Host offset must be greater than 0'
      } else if (ipVar.hostOffset > availableHosts.value) {
        ipVarErrors.value[index][ipIndex].hostOffset = `Host offset must be ${availableHosts.value} or less`
      } else {
        delete ipVarErrors.value[index][ipIndex].hostOffset
      }
    })
  })
}

const emitValidation = () => {
  const errors: string[] = []

  if (localData.value.length === 0) {
    errors.push('At least one device is required')
  }

  // Collect field errors
  Object.values(fieldErrors.value).forEach(deviceErrors => {
    errors.push(...Object.values(deviceErrors).filter(Boolean))
  })

  // Collect IP variable errors
  Object.values(ipVarErrors.value).forEach(deviceIpErrors => {
    Object.values(deviceIpErrors).forEach(ipVarDeviceErrors => {
      errors.push(...Object.values(ipVarDeviceErrors).filter(Boolean))
    })
  })

  const isValid = errors.length === 0

  const validationResult: ValidationResult = {
    isValid,
    errors
  }

  emit('validate', validationResult)
}

const validateStep = () => {
  validateAllDevices()
  emitValidation()
}

const loadDeviceTemplates = async () => {
  isLoadingTemplates.value = true
  try {
    const config = useRuntimeConfig()
    const response = await $fetch(`${config.public.backendurl}/v0/device-templates`, {
      credentials: 'include'
    })

    if (response.success && response.data.templates) {
      deviceTemplates.value = response.data.templates
    }
  } catch (error) {
    console.error('Failed to load device templates:', error)
  } finally {
    isLoadingTemplates.value = false
  }
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      // Convert to regular Device array (remove tempId)
      const cleanDevices = newValue.map(({ tempId, ...device }) => device)
      emit('update:modelValue', cleanDevices)
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    isUpdatingFromProps.value = true
    // Add tempId to devices that don't have one
    localData.value = newValue.map((device, index) => ({
      ...device,
      tempId: (localData.value[index]?.tempId) || generateTempId()
    }))
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true }
)

// Lifecycle
onMounted(async () => {
  await loadDeviceTemplates()
  
  // Initialize with existing devices if any
  if (props.modelValue.length > 0) {
    localData.value = props.modelValue.map(device => ({
      ...device,
      tempId: generateTempId()
    }))
  }
  
  validateStep()
})
</script>

<style scoped>
/* Device transition animations */
.device-enter-active,
.device-leave-active {
  transition: all 0.3s ease;
}

.device-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.device-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* IP Variable transition animations */
.ip-var-enter-active,
.ip-var-leave-active {
  transition: all 0.2s ease;
}

.ip-var-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.ip-var-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>