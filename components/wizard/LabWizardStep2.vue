<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Network Configuration</h2>
      <p class="text-muted-foreground mt-1">
        Configure the VLAN topology and base networks that will be used for all lab devices.
      </p>
    </div>

    <!-- Network Settings -->
    <div class="space-y-6">
      <!-- Management Network -->
      <div class="space-y-2">
        <Label for="management-network" class="text-sm font-medium">
          Management Network <span class="text-destructive">*</span>
        </Label>
        <div class="flex items-center space-x-2">
          <Input
            id="management-network"
            v-model="localData.managementNetwork"
            placeholder="10.0.0.0"
            :class="{
              'border-destructive': hasError('managementNetwork'),
              'border-green-500': !hasError('managementNetwork') && isValidIP(localData.managementNetwork)
            }"
            @input="validateField('managementNetwork')"
            @blur="validateField('managementNetwork')"
          />
          <div class="text-lg font-mono text-muted-foreground">/</div>
          <Select v-model="localData.managementSubnetMask" @update:modelValue="validateField('managementSubnetMask')">
            <SelectTrigger class="w-20">
              <SelectValue placeholder="24" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="mask in subnetMaskOptions" :key="mask" :value="mask">
                {{ mask }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-if="hasError('managementNetwork')" class="text-sm text-destructive">
          {{ getError('managementNetwork') }}
        </p>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span>Network for device management interfaces (e.g., 10.0.0.0/24)</span>
        </div>
      </div>


      <!-- VLAN Mode Selection -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">
          VLAN Configuration Mode <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.mode" @update:modelValue="onModeChange">
          <SelectTrigger
            :class="{
              'border-destructive': hasError('mode'),
              'border-green-500': !hasError('mode') && localData.mode
            }"
          >
            <SelectValue placeholder="Select VLAN configuration mode...">
              <template v-if="localData.mode">
                {{ getModeDisplayText(localData.mode) }}
              </template>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed_vlan">
              <div class="flex flex-col space-y-1">
                <div class="font-medium">Fixed VLAN (Beginning Course)</div>
                <div class="text-xs text-muted-foreground">Use VLAN 1 with custom subnet mask</div>
              </div>
            </SelectItem>
            <SelectItem value="lecturer_group">
              <div class="flex flex-col space-y-1">
                <div class="font-medium">Lecturer VLAN + Group (Advanced Course)</div>
                <div class="text-xs text-muted-foreground">Custom VLANs with group-based modifications</div>
              </div>
            </SelectItem>
            <SelectItem value="calculated_vlan">
              <div class="flex flex-col space-y-1">
                <div class="font-medium">Calculated VLAN (Examination)</div>
                <div class="text-xs text-muted-foreground">Algorithm-generated VLAN numbers</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p v-if="hasError('mode')" class="text-sm text-destructive">
          {{ getError('mode') }}
        </p>
      </div>

      <!-- IP Allocation Strategy -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">
          IP Allocation Strategy <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.allocationStrategy" @update:modelValue="validateField('allocationStrategy')">
          <SelectTrigger
            :class="{
              'border-destructive': hasError('allocationStrategy'),
              'border-green-500': !hasError('allocationStrategy') && localData.allocationStrategy
            }"
          >
            <SelectValue placeholder="Select IP allocation strategy..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="group_based">Group Based</SelectItem>
            <SelectItem value="student_id_based">Student ID Based</SelectItem>
          </SelectContent>
        </Select>
        <p v-if="hasError('allocationStrategy')" class="text-sm text-destructive">
          {{ getError('allocationStrategy') }}
        </p>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span>
            <strong>Student ID Based:</strong> Each student gets unique IPs based on their student ID.
            <strong>Group Based:</strong> Students in the same group share the same IP range.
          </span>
        </div>
      </div>

      <!-- VLAN Count Selection -->
      <div v-if="localData.mode" class="space-y-2">
        <Label class="text-sm font-medium">
          Number of VLANs <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.vlanCount" @update:modelValue="onVlanCountChange">
          <SelectTrigger class="w-32">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="count in vlanCountOptions" :key="count" :value="count">
              {{ count }} VLAN{{ count > 1 ? 's' : '' }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- VLAN Configuration Cards -->
      <div v-if="localData.mode && localData.vlanCount" class="space-y-4">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">VLAN Configuration</Label>
          <Button
            variant="outline"
            size="sm"
            @click="addVlan"
            v-if="localData.vlans.length < 10"
          >
            <Plus class="w-4 h-4 mr-2" />
            Add VLAN
          </Button>
        </div>

        <div class="grid gap-4">
          <Card
            v-for="(vlan, index) in localData.vlans"
            :key="vlan.id || index"
            class="border-2"
            :class="{
              'border-blue-200 bg-blue-50/30': localData.mode === 'fixed_vlan',
              'border-green-200 bg-green-50/30': localData.mode === 'lecturer_group',
              'border-purple-200 bg-purple-50/30': localData.mode === 'calculated_vlan'
            }"
          >
            <CardHeader class="pb-3">
              <div class="flex items-center justify-between">
                <CardTitle class="text-base flex items-center">
                  <component
                    :is="getModeIcon(localData.mode)"
                    class="w-4 h-4 mr-2"
                  />
                  VLAN {{ index + 1 }}
                  <span
                    v-if="localData.mode === 'fixed_vlan' && vlan.vlanId === 1"
                    class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                  >
                    Student Base Network
                  </span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="removeVlan(index)"
                  v-if="localData.vlans.length > 1"
                  class="text-destructive hover:text-destructive"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- VLAN ID (for fixed and lecturer modes) -->
              <div
                v-if="localData.mode === 'fixed_vlan' || localData.mode === 'lecturer_group'"
                class="space-y-2"
              >
                <Label class="text-sm font-medium">VLAN ID</Label>
                <Input
                  v-model.number="vlan.vlanId"
                  type="number"
                  min="1"
                  max="4094"
                  placeholder="1"
                  @input="validateVlan(index)"
                />
                <p
                  v-if="vlan.vlanId === 1"
                  class="text-xs text-blue-600 flex items-center"
                >
                  <Info class="w-3 h-3 mr-1" />
                  VLAN 1 will be used as student base network
                </p>
              </div>

              <!-- Calculation Multiplier (for calculated mode) -->
              <div v-if="localData.mode === 'calculated_vlan'" class="space-y-2">
                <Label class="text-sm font-medium">Calculation Multiplier</Label>
                <Input
                  v-model.number="vlan.calculationMultiplier"
                  type="number"
                  min="1"
                  placeholder="400"
                  @input="validateVlan(index)"
                />
                <p class="text-xs text-muted-foreground">
                  Used in formula: (student_id / 1000000 - 61) * multiplier + (student_id % 1000). Multiplier creates VLAN spacing and ensures different batches get non-overlapping VLAN ranges.
                </p>
              </div>

              <!-- Base Network -->
              <div class="space-y-2">
                <Label class="text-sm font-medium">Base Network</Label>
                <Input
                  v-model="vlan.baseNetwork"
                  placeholder="172.16.0.0"
                  @input="validateVlan(index)"
                />
                <p class="text-xs text-muted-foreground">
                  Algorithm will replace 2nd and 3rd octets based on student ID
                </p>
              </div>

              <!-- Subnet Mask -->
              <div class="space-y-2">
                <Label class="text-sm font-medium">Subnet Mask</Label>
                <Select v-model="vlan.subnetMask" @update:modelValue="validateVlan(index)">
                  <SelectTrigger>
                    <SelectValue placeholder="Select mask..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="mask in subnetMaskOptions" :key="mask" :value="mask">
                      /{{ mask }} ({{ getHostCount(mask) }} hosts)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <!-- Group Modifier (for lecturer_group mode) -->
              <div v-if="localData.mode === 'lecturer_group'" class="space-y-2">
                <Label class="text-sm font-medium">Group Modifier</Label>
                <Input
                  v-model.number="vlan.groupModifier"
                  type="number"
                  min="0"
                  placeholder="0"
                  @input="validateVlan(index)"
                />
                <p class="text-xs text-muted-foreground">
                  Added to VLAN ID based on student group (e.g., Group A = +0, Group B = +10)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Preview Section -->
      <div v-if="localData.vlans.length > 0" class="space-y-4">
        <Label class="text-sm font-medium">Student IP Preview</Label>
        <Card class="bg-accent/30">
          <CardHeader>
            <CardTitle class="text-base flex items-center">
              <Eye class="w-4 h-4 mr-2" />
              Sample Student: 65070232
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div
                v-for="(vlan, index) in localData.vlans"
                :key="index"
                class="p-3 bg-background rounded border"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium text-sm">
                    VLAN {{ index + 1 }}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {{ getVlanDisplay(vlan, index) }}
                  </span>
                </div>
                <code class="text-sm text-primary">
                  {{ generatePreviewIP(vlan) }}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
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
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
  Router,
  Users,
  Calculator
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Types
import type { ValidationResult } from '@/types/wizard'

// VLAN Configuration Types
interface VlanConfig {
  id?: string
  vlanId?: number
  calculationMultiplier?: number
  baseNetwork: string
  subnetMask: number
  groupModifier?: number
  isStudentGenerated: boolean
}

interface NetworkConfig {
  managementNetwork: string
  managementSubnetMask: number
  mode: 'fixed_vlan' | 'lecturer_group' | 'calculated_vlan' | ''
  allocationStrategy: 'student_id_based' | 'group_based'
  vlanCount: number
  vlans: VlanConfig[]
}

// Props
interface Props {
  modelValue: NetworkConfig
  validation?: ValidationResult
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: NetworkConfig): void
  (e: 'validate', result: ValidationResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localData = ref<NetworkConfig>({
  ...props.modelValue,
  managementNetwork: props.modelValue.managementNetwork || '10.0.0.0',
  managementSubnetMask: props.modelValue.managementSubnetMask || 24,
  mode: props.modelValue.mode || '',
  allocationStrategy: props.modelValue.allocationStrategy || 'group_based',
  vlanCount: props.modelValue.vlanCount || 1,
  vlans: props.modelValue.vlans || []
})
const fieldErrors = ref<Record<string, string>>({})
const isUpdatingFromProps = ref(false)

// Constants
const subnetMaskOptions = Array.from({ length: 23 }, (_, i) => 8 + i) // 8-30
const vlanCountOptions = Array.from({ length: 10 }, (_, i) => i + 1) // 1-10

// Methods
const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

const hasError = (field: string): boolean => {
  return !!fieldErrors.value[field]
}

const getError = (field: string): string => {
  return fieldErrors.value[field] || ''
}

const getHostCount = (mask: number): number => {
  return Math.pow(2, 32 - mask) - 2
}

const getModeIcon = (mode: string) => {
  switch (mode) {
    case 'fixed_vlan': return Router
    case 'lecturer_group': return Users
    case 'calculated_vlan': return Calculator
    default: return Network
  }
}

const getModeDisplayText = (mode: string) => {
  switch (mode) {
    case 'fixed_vlan': return 'Fixed VLAN (Beginning Course)'
    case 'lecturer_group': return 'Lecturer VLAN + Group (Advanced Course)'
    case 'calculated_vlan': return 'Calculated VLAN (Examination)'
    default: return ''
  }
}

const generateVlanId = (): string => {
  return `vlan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const createDefaultVlan = (mode: string, index: number): VlanConfig => {
  // Use consistent base network since IP generation algorithm replaces second and third octets
  // This allows multiple VLANs to use the same base network without conflicts
  const baseNetwork = `172.16.0.0`
  
  const baseConfig: VlanConfig = {
    id: generateVlanId(),
    baseNetwork: baseNetwork,
    subnetMask: 24,
    isStudentGenerated: true
  }

  switch (mode) {
    case 'fixed_vlan':
      return {
        ...baseConfig,
        vlanId: 1
      }
    case 'lecturer_group':
      return {
        ...baseConfig,
        vlanId: (index + 1) * 10,
        groupModifier: index * 10
      }
    case 'calculated_vlan':
      return {
        ...baseConfig,
        calculationMultiplier: 400 + (index * 100)
      }
    default:
      return baseConfig
  }
}

const onModeChange = () => {
  // Reset VLANs when mode changes
  localData.value.vlans = []
  localData.value.vlanCount = 1
  addVlan()
  validateAllFields()
}

const onVlanCountChange = () => {
  const currentCount = localData.value.vlans.length
  const targetCount = localData.value.vlanCount

  if (targetCount > currentCount) {
    // Add VLANs (base network duplication is allowed)
    for (let i = currentCount; i < targetCount; i++) {
      localData.value.vlans.push(createDefaultVlan(localData.value.mode, i))
    }
  } else if (targetCount < currentCount) {
    // Remove VLANs
    localData.value.vlans = localData.value.vlans.slice(0, targetCount)
  }

  validateAllFields()
}

const addVlan = () => {
  if (localData.value.vlans.length < 10) {
    // Create new VLAN (base network duplication is allowed)
    const newVlan = createDefaultVlan(localData.value.mode, localData.value.vlans.length)
    localData.value.vlans.push(newVlan)
    localData.value.vlanCount = localData.value.vlans.length
  }
}

const removeVlan = (index: number) => {
  if (localData.value.vlans.length > 1) {
    localData.value.vlans.splice(index, 1)
    localData.value.vlanCount = localData.value.vlans.length
    validateAllFields()
  }
}


const getVlanDisplay = (vlan: VlanConfig, index: number): string => {
  if (localData.value.mode === 'calculated_vlan') {
    return `Multiplier: ${vlan.calculationMultiplier}`
  } else {
    return `VLAN ${vlan.vlanId || index + 1}`
  }
}

const generatePreviewIP = (vlan: VlanConfig): string => {
  // Sample student ID: 65070232
  const studentId = 65070232
  const dec2_1 = (studentId / 1000000 - 61) * 10 // 4 * 10 = 40
  const dec2_2 = (studentId % 1000) / 250 // 232 / 250 = 0.928
  const dec2 = Math.floor(dec2_1 + dec2_2) // 40
  let dec3 = Math.floor((studentId % 1000) % 250) // 232

  // For calculated VLANs, incorporate the calculated VLAN ID into the IP generation
  if (vlan.calculationMultiplier !== undefined) {
    // Calculate the actual VLAN ID for this student
    const calculatedVlanId = Math.floor((studentId / 1000000 - 61) * vlan.calculationMultiplier + (studentId % 1000))

    // Use the calculated VLAN ID to modify the third octet for uniqueness
    // This ensures different multipliers produce different IP ranges
    dec3 = Math.floor((dec3 + calculatedVlanId) % 250)
  }

  if (!vlan.baseNetwork || !isValidIP(vlan.baseNetwork)) {
    return 'Invalid base network'
  }

  const [baseOct1] = vlan.baseNetwork.split('.').map(Number)
  return `${baseOct1}.${dec2}.${dec3}.65/${vlan.subnetMask}`
}

const validateVlan = (index: number) => {
  const vlan = localData.value.vlans[index]
  if (!vlan) return

  // Validate base network
  if (!vlan.baseNetwork || !isValidIP(vlan.baseNetwork)) {
    fieldErrors.value[`vlan_${index}_baseNetwork`] = 'Valid base network is required'
  } else {
    // Base network duplication is allowed since the IP generation algorithm
    // replaces the second and third octets anyway, making duplication irrelevant
    delete fieldErrors.value[`vlan_${index}_baseNetwork`]
  }

  // Validate subnet mask
  if (!vlan.subnetMask || vlan.subnetMask < 8 || vlan.subnetMask > 30) {
    fieldErrors.value[`vlan_${index}_subnetMask`] = 'Subnet mask must be between 8 and 30'
  } else {
    delete fieldErrors.value[`vlan_${index}_subnetMask`]
  }

  // Mode-specific validation
  if (localData.value.mode === 'fixed_vlan' || localData.value.mode === 'lecturer_group') {
    if (!vlan.vlanId || vlan.vlanId < 1 || vlan.vlanId > 4094) {
      fieldErrors.value[`vlan_${index}_vlanId`] = 'VLAN ID must be between 1 and 4094'
    } else {
      delete fieldErrors.value[`vlan_${index}_vlanId`]
    }
  }

  if (localData.value.mode === 'calculated_vlan') {
    if (!vlan.calculationMultiplier || vlan.calculationMultiplier < 1) {
      fieldErrors.value[`vlan_${index}_multiplier`] = 'Calculation multiplier must be greater than 0'
    } else {
      delete fieldErrors.value[`vlan_${index}_multiplier`]
    }
  }

  emitValidation()
}

const validateField = (field: string) => {
  switch (field) {
    case 'managementNetwork':
      if (!localData.value.managementNetwork.trim()) {
        fieldErrors.value.managementNetwork = 'Management network is required'
      } else if (!isValidIP(localData.value.managementNetwork)) {
        fieldErrors.value.managementNetwork = 'Please enter a valid IP address'
      } else {
        delete fieldErrors.value.managementNetwork
      }
      break

    case 'managementSubnetMask':
      if (!localData.value.managementSubnetMask) {
        fieldErrors.value.managementSubnetMask = 'Management subnet mask is required'
      } else if (localData.value.managementSubnetMask < 8 || localData.value.managementSubnetMask > 30) {
        fieldErrors.value.managementSubnetMask = 'Subnet mask must be between 8 and 30'
      } else {
        delete fieldErrors.value.managementSubnetMask
      }
      break

    case 'mode':
      if (!localData.value.mode) {
        fieldErrors.value.mode = 'VLAN configuration mode is required'
      } else {
        delete fieldErrors.value.mode
      }
      break

    case 'allocationStrategy':
      if (!localData.value.allocationStrategy) {
        fieldErrors.value.allocationStrategy = 'IP allocation strategy is required'
      } else if (!['student_id_based', 'group_based'].includes(localData.value.allocationStrategy)) {
        fieldErrors.value.allocationStrategy = 'Invalid allocation strategy'
      } else {
        delete fieldErrors.value.allocationStrategy
      }
      break
  }

  emitValidation()
}

const validateAllFields = () => {
  // Clear all previous errors
  fieldErrors.value = {}

  // Validate management network
  if (!localData.value.managementNetwork.trim()) {
    fieldErrors.value.managementNetwork = 'Management network is required'
  } else if (!isValidIP(localData.value.managementNetwork)) {
    fieldErrors.value.managementNetwork = 'Please enter a valid IP address'
  }

  // Validate management subnet mask
  if (!localData.value.managementSubnetMask) {
    fieldErrors.value.managementSubnetMask = 'Management subnet mask is required'
  } else if (localData.value.managementSubnetMask < 8 || localData.value.managementSubnetMask > 30) {
    fieldErrors.value.managementSubnetMask = 'Subnet mask must be between 8 and 30'
  }

  // Validate mode
  if (!localData.value.mode) {
    fieldErrors.value.mode = 'VLAN configuration mode is required'
  }

  // Validate allocation strategy
  if (!localData.value.allocationStrategy) {
    fieldErrors.value.allocationStrategy = 'IP allocation strategy is required'
  } else if (!['student_id_based', 'group_based'].includes(localData.value.allocationStrategy)) {
    fieldErrors.value.allocationStrategy = 'Invalid allocation strategy'
  }

  // Validate VLANs
  if (localData.value.mode && localData.value.vlans.length === 0) {
    fieldErrors.value.vlans = 'At least one VLAN is required'
  } else {
    localData.value.vlans.forEach((_, index) => {
      validateVlan(index)
    })
  }
}

const emitValidation = () => {
  const errors = Object.values(fieldErrors.value).filter(Boolean)
  const isValid = errors.length === 0

  const validationResult: ValidationResult = {
    isValid,
    errors
  }

  emit('validate', validationResult)
}

const validateStep = () => {
  validateAllFields()
  // Only emit validation if not updating from props to prevent loops
  if (!isUpdatingFromProps.value) {
    emitValidation()
  }
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', newValue)
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    isUpdatingFromProps.value = true
    localData.value = {
      ...newValue,
      // Ensure group_based is default if not explicitly set
      allocationStrategy: newValue.allocationStrategy || 'group_based'
    }
    nextTick(() => {
      isUpdatingFromProps.value = false
      // Trigger validation after props update
      validateStep()
    })
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  // Initialize with default VLAN if empty
  if (localData.value.vlans.length === 0 && localData.value.mode) {
    addVlan()
  }
  validateStep()
})
</script>

<style scoped>
</style>