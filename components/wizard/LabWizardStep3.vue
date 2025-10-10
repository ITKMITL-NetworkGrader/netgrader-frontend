<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Device Configuration</h2>
      <p class="text-muted-foreground mt-1">
        Add and configure network devices for your lab topology.
      </p>
    </div>

    <!-- Enhanced Network Context -->
    <div class="bg-muted/50 p-4 rounded-lg space-y-3">
      <!-- Management Network -->
      <div class="flex items-center space-x-2">
        <Network class="h-5 w-5 text-muted-foreground" />
        <span class="font-medium">Management Network:</span>
        <code class="bg-background px-2 py-1 rounded text-sm">
          {{ networkConfig.managementNetwork }}/{{ networkConfig.managementSubnetMask }}
        </code>
      </div>

      <!-- VLAN Configuration Mode -->
      <div class="flex items-center space-x-2">
        <div class="h-5 w-5 bg-blue-500 rounded flex items-center justify-center">
          <span class="text-white text-xs font-bold">V</span>
        </div>
        <span class="font-medium">VLAN Mode:</span>
        <span class="text-foreground">
          {{ getModeDisplayText(networkConfig.mode) }}
        </span>
      </div>

      <!-- IP Allocation Strategy -->
      <div class="flex items-center space-x-2">
        <div class="h-5 w-5 bg-green-500 rounded flex items-center justify-center">
          <span class="text-white text-xs font-bold">IP</span>
        </div>
        <span class="font-medium">Allocation Strategy:</span>
        <span class="text-foreground">
          {{ networkConfig.allocationStrategy === 'group_based' ? 'Group Based' : 'Student ID Based' }}
        </span>
      </div>

      <!-- VLAN Networks -->
      <div v-if="networkConfig.vlans && networkConfig.vlans.length > 0" class="space-y-2">
        <div class="flex items-center space-x-2">
          <div class="h-5 w-5 bg-purple-500 rounded flex items-center justify-center">
            <span class="text-white text-xs font-bold">{{ networkConfig.vlans.length }}</span>
          </div>
          <span class="font-medium">VLAN Networks ({{ networkConfig.vlans.length }}):</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
          <div v-for="(vlan, index) in networkConfig.vlans" :key="vlan.id || index" class="flex items-center space-x-2">
            <div class="text-xs bg-background px-2 py-1 rounded border">
              {{ vlan.calculationMultiplier !== undefined ? getVlanDisplayId(vlan, index) : `VLAN ${getVlanDisplayId(vlan, index)}` }}
            </div>
            <code class="bg-background px-2 py-1 rounded text-xs">
              {{ vlan.baseNetwork }}/{{ vlan.subnetMask }}
            </code>
            <span v-if="vlan.isStudentGenerated" class="text-xs text-muted-foreground">
              (Student Generated)
            </span>
          </div>
        </div>
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
                    @update:modelValue="(value) => {
                      console.log('🔍 Select @update:modelValue fired:', { value, type: typeof value })
                      onTemplateChange(index, value)
                    }"
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
                        :key="template.id"
                        :value="template.id"
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
                      <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
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
                          <!-- IP Duplication Error -->
                          <p v-if="hasIpVarError(index, ipIndex, 'duplication')" class="text-xs text-destructive">
                            {{ getIpVarError(index, ipIndex, 'duplication') }}
                          </p>
                        </div>

                        <!-- IP Configuration Mode -->
                        <div class="space-y-1">
                          <Label class="text-xs font-medium">IP Configuration</Label>
                          <Select
                            v-model="ipVar.inputType"
                            @update:modelValue="onInputTypeChange(index, ipIndex, $event)"
                          >
                            <SelectTrigger class="text-sm">
                              <SelectValue>
                                <template v-if="ipVar.inputType === 'fullIP'">
                                  Full IP Address
                                </template>
                                <template v-else-if="ipVar.inputType === 'studentManagement'">
                                  Student Management IP
                                </template>
                                <template v-else-if="ipVar.inputType?.startsWith('studentVlan')">
                                  {{ getVlanNumberFromInputType(ipVar.inputType) }} IP
                                </template>
                                <template v-else>
                                  Select configuration type
                                </template>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <!-- Full IP Address Option -->
                              <SelectItem value="fullIP">
                                <SelectItemText>
                                  <div class="flex flex-col space-y-1">
                                    <div class="font-medium">Full IP Address</div>
                                    <div class="text-xs text-muted-foreground">Enter complete IP address</div>
                                  </div>
                                </SelectItemText>
                              </SelectItem>

                              <!-- Student Management IP Option -->
                              <SelectItem value="studentManagement">
                                <SelectItemText>
                                  <div class="flex flex-col space-y-1">
                                    <div class="font-medium">Student Management IP</div>
                                    <div class="text-xs text-muted-foreground">Auto-generated from management network using student ID</div>
                                  </div>
                                </SelectItemText>
                              </SelectItem>

                              <!-- Dynamic Student VLAN IP Options -->
                              <SelectItem
                                v-for="(vlan, vlanIndex) in networkConfig.vlans"
                                :key="`vlan-${vlanIndex}`"
                                :value="`studentVlan${vlanIndex}`"
                              >
                                <SelectItemText>
                                  <div class="flex flex-col space-y-1">
                                    <div class="font-medium">{{ vlan.calculationMultiplier !== undefined ? getVlanDisplayId(vlan, vlanIndex) : `Student VLAN ${getVlanDisplayId(vlan, vlanIndex)}` }} IP</div>
                                    <div class="text-xs text-muted-foreground">
                                      Auto-generated from {{ vlan.baseNetwork }}/{{ vlan.subnetMask }}
                                    </div>
                                  </div>
                                </SelectItemText>
                              </SelectItem>

                            </SelectContent>
                          </Select>
                        </div>

                        <!-- Full IP Address Input (when inputType is 'fullIP') -->
                        <div v-if="ipVar.inputType === 'fullIP'" class="space-y-1">
                          <Label class="text-xs font-medium">Full IP Address</Label>
                          <Input
                            v-model="ipVar.fullIP"
                            type="text"
                            placeholder="192.168.1.10"
                            class="text-sm"
                            :class="{
                              'border-destructive': hasIpVarError(index, ipIndex, 'fullIP'),
                              'border-green-500': !hasIpVarError(index, ipIndex, 'fullIP') && ipVar.fullIP && isValidIP(ipVar.fullIP)
                            }"
                            @input="validateIpVariable(index, ipIndex, 'fullIP')"
                          />
                          <p v-if="hasIpVarError(index, ipIndex, 'fullIP')" class="text-xs text-destructive">
                            {{ getIpVarError(index, ipIndex, 'fullIP') }}
                          </p>
                        </div>

                        <!-- Student Management IP Configuration -->
                        <div v-else-if="ipVar.inputType === 'studentManagement'" class="space-y-1">
                          <Label class="text-xs font-medium">Student Management IP Configuration</Label>
                          <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div class="flex items-center justify-between">
                              <div class="space-y-1">
                                <div class="text-sm font-medium text-blue-700">
                                  Management Network IP Generation
                                </div>
                                <div class="text-xs text-blue-600">
                                  Generated from: {{ networkConfig.managementNetwork }}/{{ networkConfig.managementSubnetMask }}
                                </div>
                              </div>
                              <div class="flex items-center space-x-1">
                                <Badge variant="outline" class="text-xs border-blue-300 text-blue-700">
                                  Management
                                </Badge>
                              </div>
                            </div>

                            <!-- Management IP Backend Notice -->
                            <div class="mt-3">
                              <div class="text-xs text-blue-600">
                                <strong>Backend Generated:</strong> Management IPs will be generated by the backend system
                              </div>
                              <div class="text-xs text-blue-500 mt-1">
                                This interface is marked for management IP assignment
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Student VLAN IP Configuration -->
                        <div v-else-if="ipVar.inputType?.startsWith('studentVlan')" class="space-y-1">
                          <Label class="text-xs font-medium">Student VLAN IP Configuration</Label>
                          <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div class="flex items-center justify-between">
                              <div class="space-y-1">
                                <div class="text-sm font-medium text-green-700">
                                  {{ getVlanNumberFromInputType(ipVar.inputType) }} IP Generation
                                </div>
                                <div class="text-xs text-green-600">
                                  Generated from: {{ getVlanNetworkInfo(ipVar.inputType) }}
                                </div>
                              </div>
                              <div class="flex items-center space-x-1">
                                <Badge variant="outline" class="text-xs border-green-300 text-green-700">
                                  {{ getVlanBadgeText(ipVar.inputType) }}
                                </Badge>
                              </div>
                            </div>

                            <!-- Interface Offset Selection -->
                            <div class="mt-3 space-y-2">
                              <Label class="text-xs font-medium text-green-700">Interface Offset</Label>
                              <div class="flex items-center space-x-2">
                                <Input
                                  v-model.number="ipVar.interfaceOffset"
                                  type="number"
                                  :min="1"
                                  :max="50"
                                  placeholder="1"
                                  class="text-sm w-20"
                                  @input="validateIpVariable(index, ipIndex, 'interfaceOffset')"
                                  @change="validateIpVariable(index, ipIndex, 'interfaceOffset')"
                                />
                                <div class="text-xs text-green-600">
                                  <strong>Example (Student ID: 65070232):</strong> {{ getVlanPreviewIP(ipVar.inputType, ipVar.interfaceOffset || 1) }}
                                </div>
                              </div>
                              <div class="text-xs text-green-600">
                                Different offsets ensure unique IPs when multiple interfaces use same VLAN
                              </div>
                              <!-- Interface Offset Error -->
                              <p v-if="hasIpVarError(index, ipIndex, 'interfaceOffset')" class="text-xs text-destructive">
                                {{ getIpVarError(index, ipIndex, 'interfaceOffset') }}
                              </p>
                            </div>

                            <!-- Set VLAN Index -->
                            <input
                              type="hidden"
                              v-model="ipVar.vlanIndex"
                            />
                          </div>
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
    managementNetwork: string
    managementSubnetMask: number
    mode: 'fixed_vlan' | 'lecturer_group' | 'calculated_vlan' | ''
    allocationStrategy: 'student_id_based' | 'group_based'
    vlanCount: number
    vlans: Array<{
      id?: string
      vlanId?: number
      calculationMultiplier?: number
      baseNetwork: string
      subnetMask: number
      groupModifier?: number
      isStudentGenerated: boolean
    }>
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

// Student Generated Variables state
const showDebugInfo = ref(false)

// Computed
const availableHosts = computed(() => {
  // Use management network subnet mask for host calculation
  return Math.pow(2, 32 - props.networkConfig.managementSubnetMask) - 2
})

// Preview values for demonstration (using sample student ID 65070232)
const previewValues = computed(() => {
  try {
    // Import and use StudentIpGenerator for preview only
    const sampleStudentId = '65070232'

    // Calculate using your algorithm
    const student_id = Number(sampleStudentId)
    let dec2_1 = (student_id / 1000000 - 61) * 10
    let dec2_2 = (student_id % 1000) / 250
    let dec2 = Math.floor(dec2_1 + dec2_2)
    let dec3 = Math.floor((student_id % 1000) % 250)

    return {
      router_vlan1_ip: `172.${dec2}.${dec3}.65`,
      router_vlan2_ip: `172.${dec2}.${dec3}.97`,
      switch_management_ip: `172.${dec2}.${dec3}.70`,
      pc1_ip: `172.${dec2}.${dec3}.66`,
      router_external_ip: `10.30.6.190`
    }
  } catch (error) {
    return {
      router_vlan1_ip: '172.16.3.65',
      router_vlan2_ip: '172.16.3.97',
      switch_management_ip: '172.16.3.70',
      pc1_ip: '172.16.3.66',
      router_external_ip: '10.30.6.190'
    }
  }
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
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace non-alphanumeric characters (except _ and -) with underscore
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
  validateAllIpDuplications()
  validateStep()
}

const removeDevice = (index: number) => {
  localData.value.splice(index, 1)
  // Clean up errors for this device
  delete fieldErrors.value[index]
  delete ipVarErrors.value[index]
  validateAllIpDuplications()
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
    inputType: 'fullIP', // Default to full IP mode
    fullIP: '',
    interfaceOffset: 1, // Default interface offset
    vlanIndex: 0, // Default VLAN index
    isStudentGenerated: false,
    readonly: false
  })
  validateAllIpDuplications()
  validateStep()
}

const removeIpVariable = (deviceIndex: number, ipIndex: number) => {
  localData.value[deviceIndex].ipVariables.splice(ipIndex, 1)
  validateAllIpDuplications()
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
  // 🐛 DEBUG: Log template change
  console.log('🔍 Template changing:', {
    deviceIndex,
    templateId,
    deviceId: localData.value[deviceIndex].deviceId
  })
  
  // Update the template ID
  localData.value[deviceIndex].templateId = templateId
  
  // 🐛 DEBUG: Verify template ID was set
  console.log('🔍 Template ID after setting:', {
    templateId: localData.value[deviceIndex].templateId,
    device: localData.value[deviceIndex]
  })
  
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
      inputType: 'fullIP', // Default to full IP mode
      fullIP: '',
      interface: iface.name // ✅ Add the full interface name from template
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

// Removed calculateIP function - hostOffset no longer supported
// Use studentVlanX types with interfaceOffset instead

const getSelectedTemplate = (templateId: string): DeviceTemplate | undefined => {
  return deviceTemplates.value.find(t => t.id === templateId)
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
         device.ipVariables.every(ipVar => ipVar.name.length > 0 && (ipVar.fullIP || ipVar.inputType?.startsWith('studentVlan') || ipVar.inputType === 'studentManagement'))
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
      } else if (!/^[a-zA-Z0-9_-]+$/.test(ipVar.name)) {
        ipVarErrors.value[deviceIndex][ipIndex].name = 'Variable name must be alphanumeric with underscores and hyphens'
      } else {
        delete ipVarErrors.value[deviceIndex][ipIndex].name
      }
      break

    case 'fullIP':
      if (ipVar.inputType === 'fullIP') {
        if (!ipVar.fullIP?.trim()) {
          ipVarErrors.value[deviceIndex][ipIndex].fullIP = 'IP address is required'
        } else if (!isValidIP(ipVar.fullIP)) {
          ipVarErrors.value[deviceIndex][ipIndex].fullIP = 'Invalid IP address format'
        } else {
          delete ipVarErrors.value[deviceIndex][ipIndex].fullIP
        }
      } else {
        delete ipVarErrors.value[deviceIndex][ipIndex].fullIP
      }
      break


    case 'interfaceOffset':
      // Validate interface offset for student-generated IPs (only for VLAN IPs, not management)
      if (ipVar.inputType?.startsWith('studentVlan')) {
        if (!ipVar.interfaceOffset || ipVar.interfaceOffset < 1) {
          ipVarErrors.value[deviceIndex][ipIndex].interfaceOffset = 'Interface offset must be greater than 0'
        } else if (ipVar.interfaceOffset > 50) {
          ipVarErrors.value[deviceIndex][ipIndex].interfaceOffset = 'Interface offset cannot exceed 50'
        } else {
          delete ipVarErrors.value[deviceIndex][ipIndex].interfaceOffset
        }
      } else {
        delete ipVarErrors.value[deviceIndex][ipIndex].interfaceOffset
      }
      break
  }

  // Re-validate all IP variables for duplications to ensure all affected interfaces are updated
  validateAllIpDuplications()

  emitValidation()
}

const onInputTypeChange = (deviceIndex: number, ipIndex: number, inputType: string) => {
  const ipVar = localData.value[deviceIndex].ipVariables[ipIndex]
  ipVar.inputType = inputType

  // Clear validation errors when switching modes
  if (ipVarErrors.value[deviceIndex]?.[ipIndex]) {
    delete ipVarErrors.value[deviceIndex][ipIndex].fullIP
    delete ipVarErrors.value[deviceIndex][ipIndex].studentManagement
    delete ipVarErrors.value[deviceIndex][ipIndex].studentVlan
  }

  // Initialize default values for the selected mode
  if (inputType === 'fullIP') {
    if (!ipVar.fullIP) {
      ipVar.fullIP = ''
    }
    // Clear other fields
    delete ipVar.interfaceOffset
    delete ipVar.vlanIndex
    delete ipVar.isManagementInterface
  } else if (inputType === 'fullIP') {
    if (!ipVar.fullIP) {
      ipVar.fullIP = ''
    }
    // Clear other fields
    delete ipVar.interfaceOffset
    delete ipVar.vlanIndex
    delete ipVar.isManagementInterface
  } else if (inputType === 'studentManagement') {
    // Management IP doesn't need interface offset customization
    ipVar.isStudentGenerated = true
    ipVar.readonly = true
    ipVar.isManagementInterface = true  // Mark for backend management IP generation
    delete ipVar.interfaceOffset
    delete ipVar.vlanIndex
  } else if (inputType.startsWith('studentVlan')) {
    // Initialize interface offset and VLAN index for VLAN IP
    if (!ipVar.interfaceOffset) {
      ipVar.interfaceOffset = 1
    }
    ipVar.vlanIndex = getVlanIndexFromInputType(inputType)
    ipVar.isStudentGenerated = true
    ipVar.readonly = true
    delete ipVar.isManagementInterface
  }

  // Validate all IP variables for potential duplications
  validateAllIpDuplications()

  validateAllIpDuplications()
  validateStep()
}

// Function to check for IP duplication
const validateIpDuplication = (deviceIndex: number, ipIndex: number) => {
  const currentVar = localData.value[deviceIndex].ipVariables[ipIndex]

  if (!currentVar.inputType || currentVar.inputType === 'fullIP' || currentVar.inputType === 'studentManagement') {
    // Clear any existing duplication errors for:
    // - non-student-generated types (fullIP)
    // - studentManagement (backend assigns unique IPs per device automatically)
    delete ipVarErrors.value[deviceIndex]?.[ipIndex]?.duplication
    return
  }

  // Check for duplicates across all devices and IP variables (only for VLAN IPs)
  let duplicates: string[] = []
  const currentKey = getIpKey(currentVar)

  localData.value.forEach((device, devIndex) => {
    device.ipVariables.forEach((ipVar, varIndex) => {
      // Skip the current variable
      if (devIndex === deviceIndex && varIndex === ipIndex) return

      // Only check student VLAN IPs that could conflict (skip management IPs)
      if (ipVar.inputType && ipVar.inputType.startsWith('studentVlan')) {
        const otherKey = getIpKey(ipVar)

        if (currentKey === otherKey) {
          duplicates.push(`${device.deviceId}.${ipVar.name}`)
        }
      }
    })
  })

  // Set or clear duplication error
  if (duplicates.length > 0) {
    if (!ipVarErrors.value[deviceIndex]) {
      ipVarErrors.value[deviceIndex] = {}
    }
    if (!ipVarErrors.value[deviceIndex][ipIndex]) {
      ipVarErrors.value[deviceIndex][ipIndex] = {}
    }
    ipVarErrors.value[deviceIndex][ipIndex].duplication =
      `Duplicate IP detected! Same configuration as: ${duplicates.join(', ')}`
  } else {
    delete ipVarErrors.value[deviceIndex]?.[ipIndex]?.duplication
  }
}

// Function to validate all IP variables for duplications
const validateAllIpDuplications = () => {
  localData.value.forEach((device, deviceIndex) => {
    device.ipVariables.forEach((ipVar, ipIndex) => {
      validateIpDuplication(deviceIndex, ipIndex)
    })
  })
}

// Generate a unique key for IP configuration comparison
const getIpKey = (ipVar: any): string => {
  if (ipVar.inputType === 'studentManagement') {
    return `mgmt:single` // Management IP has only one IP per student
  }

  if (ipVar.inputType && ipVar.inputType.startsWith('studentVlan')) {
    const vlanIndex = ipVar.vlanIndex !== undefined ? ipVar.vlanIndex : getVlanIndexFromInputType(ipVar.inputType)
    return `vlan:${vlanIndex}:${ipVar.interfaceOffset || 1}`
  }

  return `other:${ipVar.inputType}:${JSON.stringify(ipVar)}`
}

const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
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
      } else if (!/^[a-zA-Z0-9_-]+$/.test(ipVar.name)) {
        ipVarErrors.value[index][ipIndex].name = 'Variable name must be alphanumeric with underscores/hyphens'
      } else {
        delete ipVarErrors.value[index][ipIndex].name
      }

      // Validate based on input type (fullIP or studentGenerated)
      if (ipVar.inputType === 'fullIP') {
        // Validate fullIP
        if (!ipVar.fullIP?.trim()) {
          ipVarErrors.value[index][ipIndex].fullIP = 'Full IP address is required'
        } else if (!isValidIP(ipVar.fullIP)) {
          ipVarErrors.value[index][ipIndex].fullIP = 'Please enter a valid IP address'
        } else {
          delete ipVarErrors.value[index][ipIndex].fullIP
        }
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

      // 🐛 DEBUG: Log loaded templates
      console.log('🔍 Device templates loaded:', deviceTemplates.value.map(t => ({
        id: t.id,
        name: t.name,
        deviceType: t.deviceType
      })))
    }
  } catch (error) {
    console.error('Failed to load device templates:', error)
  } finally {
    isLoadingTemplates.value = false
  }
}

// Preview methods for Student Generated Variables
const getPreviewIP = (variableName: string): string => {
  // Map variable names to preview IPs from previewValues
  const variableMap: Record<string, string> = {
    // Router variables
    'loopback0': previewValues.value.router_external_ip,
    'loop0': previewValues.value.router_external_ip,
    'gig0_0': previewValues.value.router_vlan1_ip,
    'gig0_1': previewValues.value.router_vlan2_ip,
    'fa0_0': previewValues.value.router_vlan1_ip,
    'fa0_1': previewValues.value.router_vlan2_ip,
    'eth0_0': previewValues.value.router_vlan1_ip,
    'eth0_1': previewValues.value.router_vlan2_ip,

    // Switch variables
    'management_ip': previewValues.value.switch_management_ip,
    'mgmt': previewValues.value.switch_management_ip,

    // PC variables
    'eth0': previewValues.value.pc1_ip,
    'ens2': previewValues.value.pc1_ip
  }

  return variableMap[variableName.toLowerCase()] ||
         variableMap[variableName] ||
         previewValues.value.router_vlan1_ip
}

// Helper methods for network display
const getModeDisplayText = (mode: string): string => {
  switch (mode) {
    case 'fixed_vlan':
      return 'Fixed VLAN (Beginning Course)'
    case 'lecturer_group':
      return 'Lecturer VLAN + Group (Advanced Course)'
    case 'calculated_vlan':
      return 'Calculated VLAN (Examination)'
    default:
      return 'Not configured'
  }
}


const getVlanDisplayId = (vlan: any, index: number): string => {
  if (vlan.vlanId !== undefined) {
    return vlan.vlanId.toString()
  }
  if (vlan.calculationMultiplier !== undefined) {
    // Use alphabetical labeling for calculated VLANs (A, B, C, etc.)
    const letter = String.fromCharCode(65 + index) // A=65, B=66, C=67, etc.
    return `Calculated Student VLAN ${letter}`
  }
  return `${index + 1}`
}

const getVlanNumberFromInputType = (inputType: string): string => {
  // Extract VLAN number from "studentVlan0", "studentVlan1", etc.
  const match = inputType.match(/studentVlan(\d+)/)
  if (match) {
    const vlanIndex = parseInt(match[1])
    const vlan = props.networkConfig.vlans[vlanIndex]
    // Use conditional labeling for VLAN display
    return vlan.calculationMultiplier !== undefined
      ? getVlanDisplayId(vlan, vlanIndex)
      : `Student VLAN ${getVlanDisplayId(vlan, vlanIndex)}`
  }
  return '?'
}

const getVlanIndexFromInputType = (inputType: string): number => {
  // Extract VLAN index from "studentVlan0", "studentVlan1", etc.
  const match = inputType.match(/studentVlan(\d+)/)
  return match ? parseInt(match[1]) : 0
}

// Get badge text for VLAN configuration (shorter version for badge display)
const getVlanBadgeText = (inputType: string): string => {
  const match = inputType.match(/studentVlan(\d+)/)
  if (match) {
    const vlanIndex = parseInt(match[1])
    const vlan = props.networkConfig.vlans[vlanIndex]
    // For badges, use shorter text
    return vlan.calculationMultiplier !== undefined
      ? `Calculated Student VLAN ${String.fromCharCode(65 + vlanIndex)}`
      : `Student VLAN ${getVlanDisplayId(vlan, vlanIndex)}`
  }
  return '?'
}

const getVlanNetworkInfo = (inputType: string): string => {
  const vlanIndex = getVlanIndexFromInputType(inputType)
  const vlan = props.networkConfig.vlans[vlanIndex]
  return vlan ? `${vlan.baseNetwork}/${vlan.subnetMask}` : 'Unknown'
}

// Management IP preview removed - backend handles generation

const getVlanPreviewIP = (inputType: string, interfaceOffset: number): string => {
  try {
    const vlanIndex = getVlanIndexFromInputType(inputType)
    const vlan = props.networkConfig.vlans[vlanIndex]
    if (!vlan) return 'VLAN not found'

    // Use the same student algorithm with VLAN base network
    const student_id = 65070232 // Sample student ID
    let dec2_1 = (student_id / 1000000 - 61) * 10
    let dec2_2 = (student_id % 1000) / 250
    let dec2 = Math.floor(dec2_1 + dec2_2)
    let dec3 = Math.floor((student_id % 1000) % 250)

    // For calculated VLANs, incorporate the calculated VLAN ID into the IP generation
    if (vlan.calculationMultiplier !== undefined) {
      // Calculate the actual VLAN ID for this student
      const calculatedVlanId = Math.floor((student_id / 1000000 - 61) * vlan.calculationMultiplier + (student_id % 1000))

      // Use the calculated VLAN ID to modify the third octet for uniqueness
      // This ensures different multipliers produce different IP ranges
      dec3 = Math.floor((dec3 + calculatedVlanId) % 250)
    }

    const [vlanOct1] = vlan.baseNetwork.split('.').map(Number)
    return `${vlanOct1}.${dec2}.${dec3}.${64 + interfaceOffset}`
  } catch (error) {
    return 'Error calculating IP'
  }
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      // Convert to regular Device array (remove tempId)
      const cleanDevices = newValue.map(({ tempId, ...device }) => device)
      
      // 🐛 DEBUG: Log what we're emitting
      console.log('🔍 Step 3 emitting devices:', cleanDevices.map(d => ({
        deviceId: d.deviceId,
        templateId: d.templateId,
        hasTemplateId: !!d.templateId
      })))
      
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

  validateAllIpDuplications()
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