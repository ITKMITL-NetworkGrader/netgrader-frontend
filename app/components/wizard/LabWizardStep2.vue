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


      <!-- Exempt IP Ranges -->
      <div class="space-y-2">
        <Label for="exempt-ip-ranges" class="text-sm font-medium">
          Exempt IP Ranges <span class="text-muted-foreground">(Optional)</span>
        </Label>
        <div class="space-y-3">
          <!-- Tags Display Area -->
          <div
            class="min-h-[80px] p-3 border-2 rounded-md bg-background"
            :class="{
              'border-destructive': exemptRangesError,
              'border-muted': !exemptRangesError
            }"
          >
            <!-- Existing Tags -->
            <div v-if="localData.exemptIpRanges && localData.exemptIpRanges.length > 0" class="flex flex-wrap gap-2 mb-2">
              <div
                v-for="(range, index) in localData.exemptIpRanges"
                :key="index"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border-2 transition-all"
                :class="{
                  'bg-green-50 border-green-300 text-green-800': !getRangeWarning(range),
                  'bg-yellow-50 border-yellow-300 text-yellow-800': getRangeWarning(range)
                }"
              >
                <span class="font-mono">{{ formatRangeDisplay(range) }}</span>
                <button
                  @click="removeExemptRange(index)"
                  type="button"
                  class="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Input Field -->
            <div class="relative">
              <Input
                id="exempt-ip-ranges"
                v-model="exemptRangeInput"
                placeholder="Type IP or range (e.g., 10.0.0.1 or 10.0.0.1 - 10.0.0.10) and press Enter..."
                class="text-sm"
                @keydown.enter.prevent="addExemptRange"
                @blur="validateExemptRanges"
              />
            </div>
          </div>

          <!-- Error Message -->
          <p v-if="exemptRangesError" class="text-sm text-destructive flex items-start gap-1">
            <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{{ exemptRangesError }}</span>
          </p>

          <!-- Examples & Help -->
          <div class="flex items-start space-x-2 text-xs text-muted-foreground bg-accent/30 p-3 rounded border">
            <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div class="space-y-1">
              <p class="font-medium">IPs to exclude from Management IP assignment:</p>
              <ul class="list-disc list-inside space-y-0.5 ml-1">
                <li>Single IP: <code class="bg-muted px-1 py-0.5 rounded">10.0.0.1</code></li>
                <li>IP Range: <code class="bg-muted px-1 py-0.5 rounded">10.0.0.1 - 10.0.0.10</code></li>
                <li>Type each IP/range and press <kbd class="px-1.5 py-0.5 bg-muted rounded border">Enter</kbd></li>
                <li>Overlapping ranges will be automatically merged</li>
              </ul>
            </div>
          </div>

          <!-- Summary -->
          <div
            v-if="localData.exemptIpRanges && localData.exemptIpRanges.length > 0"
            class="flex items-center justify-between p-3 bg-primary/5 rounded border border-primary/20"
          >
            <div class="flex items-center gap-2 text-sm">
              <CheckCircle2 class="w-4 h-4 text-primary" />
              <span class="font-medium">
                {{ countTotalIps(localData.exemptIpRanges) }} IP{{ countTotalIps(localData.exemptIpRanges) !== 1 ? 's' : '' }} excluded
              </span>
              <span class="text-muted-foreground">
                ({{ localData.exemptIpRanges.length }} range{{ localData.exemptIpRanges.length !== 1 ? 's' : '' }}, max 20)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              @click="clearAllExemptRanges"
              class="text-xs h-7"
            >
              Clear All
            </Button>
          </div>

          <!-- Warnings -->
          <div v-if="exemptRangesWarnings.length > 0" class="space-y-2">
            <Alert variant="default" class="border-yellow-300 bg-yellow-50">
              <AlertTriangle class="h-4 w-4 text-yellow-600" />
              <AlertTitle class="text-yellow-800">Warnings</AlertTitle>
              <AlertDescription class="text-yellow-700">
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li v-for="(warning, index) in exemptRangesWarnings" :key="index">{{ warning }}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      <!-- VLAN Mode Selection (Disabled - Forced to Calculated VLAN) -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">
          VLAN Configuration Mode <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.mode" disabled>
          <SelectTrigger
            class="border-green-500 bg-muted/50"
          >
            <SelectValue>
              Calculated VLAN (Examination)
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calculated_vlan">
              <div class="flex flex-col space-y-1">
                <div class="font-medium">Calculated VLAN (Examination)</div>
                <div class="text-xs text-muted-foreground">Algorithm-generated VLAN numbers</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span>This mode is currently locked to Calculated VLAN (Examination) mode.</span>
        </div>
      </div>

      <!-- IP Allocation Strategy (Disabled - Forced to Student ID Based) -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">
          IP Allocation Strategy <span class="text-destructive">*</span>
        </Label>
        <Select v-model="localData.allocationStrategy" disabled>
          <SelectTrigger
            class="border-green-500 bg-muted/50"
          >
            <SelectValue>
              Student ID Based
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student_id_based">Student ID Based</SelectItem>
          </SelectContent>
        </Select>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span>This strategy is currently locked to Student ID Based allocation.</span>
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

              <!-- Subnet Block Index (NEW) -->
              <div class="space-y-2">
                <Label class="text-sm font-medium">
                  Subnet Block <span class="text-destructive">*</span>
                </Label>
                <Input
                  v-model.number="vlan.subnetIndex"
                  type="number"
                  min="1"
                  placeholder="1"
                  @input="validateVlan(index)"
                  @blur="validateVlan(index)"
                  :class="{
                    'border-destructive': hasError(`vlan_${index}_subnetIndex`),
                    'border-green-500': !hasError(`vlan_${index}_subnetIndex`) && vlan.subnetIndex !== undefined
                  }"
                />
                <p class="text-xs text-muted-foreground flex items-start gap-1">
                  <Info class="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Subnet block to use (1 = first, 2 = second, etc.).
                    For /26: block 1 = .0-.63, block 2 = .64-.127, block 3 = .128-.191
                  </span>
                </p>
                <p v-if="hasError(`vlan_${index}_subnetIndex`)" class="text-sm text-destructive">
                  {{ getError(`vlan_${index}_subnetIndex`) }}
                </p>
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
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base flex items-center">
                <Eye class="w-4 h-4 mr-2" />
                Preview Student IP
              </CardTitle>
            </div>
            <div class="flex items-center gap-2 mt-3">
              <Label class="text-sm text-muted-foreground whitespace-nowrap">Student ID:</Label>
              <Input
                v-model.number="previewStudentId"
                type="number"
                class="w-32"
                placeholder="65070232"
                min="60000000"
                max="99999999"
              />
              <span class="text-xs text-muted-foreground">
                (Enter any 8-digit student ID)
              </span>
            </div>
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
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">
                      {{ getVlanDisplay(vlan, index) }}
                    </span>
                    <Badge v-if="vlan.subnetIndex !== undefined" variant="secondary" class="text-xs">
                      Block {{ vlan.subnetIndex }}
                    </Badge>
                  </div>
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
  Calculator,
  X
} from 'lucide-vue-next'

// Import IP range utilities
import {
  parseIpInput,
  validateRangeInNetwork,
  autoMergeRanges,
  countTotalIps,
  countIpsInRange,
  formatRangeDisplay as formatRangeDisplayUtil,
  validateExemptRanges as validateExemptRangesUtil
} from '@/utils/ipRangeUtils'

// UI Components
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

// Types
import type { ValidationResult, IpRange } from '@/types/wizard'

// VLAN Configuration Types
interface VlanConfig {
  id?: string
  vlanId?: number
  calculationMultiplier?: number
  baseNetwork: string
  subnetMask: number
  subnetIndex: number        // NEW: Which subnet block (0 = first, 1 = second, etc.)
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
  exemptIpRanges: IpRange[]
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

// Local state - FORCED: mode=calculated_vlan, allocationStrategy=student_id_based
const localData = ref<NetworkConfig>({
  ...props.modelValue,
  managementNetwork: props.modelValue.managementNetwork || '10.0.0.0',
  managementSubnetMask: props.modelValue.managementSubnetMask || 24,
  mode: 'calculated_vlan', // FORCED: Only Calculated VLAN mode is currently supported
  allocationStrategy: 'student_id_based', // FORCED: Only Student ID Based allocation is currently supported
  vlanCount: props.modelValue.vlanCount || 1,
  vlans: props.modelValue.vlans || [],
  exemptIpRanges: props.modelValue.exemptIpRanges || []
})
const fieldErrors = ref<Record<string, string>>({})
const isUpdatingFromProps = ref(false)

// Preview student ID state
const previewStudentId = ref(65070232)

// Exempt IP Ranges state
const exemptRangeInput = ref('')
const exemptRangesError = ref('')
const exemptRangesWarnings = ref<string[]>([])

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
    subnetIndex: 1,          // NEW: Default to first subnet block (1-indexed for UI)
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
  // Use preview student ID from input
  const studentId = previewStudentId.value || 65070232

  if (!vlan.baseNetwork || !isValidIP(vlan.baseNetwork)) {
    return 'Invalid base network'
  }

  // Validate student ID
  if (!studentId || studentId < 60000000 || studentId > 99999999) {
    return 'Invalid student ID (must be 8 digits)'
  }

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

  // Calculate fourth octet (last octet) based on subnet block
  // subnetIndex is 1-indexed in UI, so convert to 0-indexed for calculation
  // Formula: lastOctet = (subnetBlock - 1) * blockSize
  // Examples:
  //   /24, Block 1: blockSize = 256, lastOctet = 0
  //   /25, Block 1: blockSize = 128, lastOctet = 0
  //   /25, Block 2: blockSize = 128, lastOctet = 128
  //   /26, Block 1: blockSize = 64, lastOctet = 0
  //   /26, Block 2: blockSize = 64, lastOctet = 64
  //   /26, Block 3: blockSize = 64, lastOctet = 128
  //   /26, Block 4: blockSize = 64, lastOctet = 192
  const subnetIndexZeroBased = (vlan.subnetIndex || 1) - 1
  const blockSize = Math.pow(2, 32 - vlan.subnetMask)
  const dec4 = subnetIndexZeroBased * blockSize  // This is the starting address of the subnet block

  const [baseOct1] = vlan.baseNetwork.split('.').map(Number)
  return `${baseOct1}.${dec2}.${dec3}.${dec4}/${vlan.subnetMask}`
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

  // Validate subnet index (NEW)
  // NOTE: UI uses 1-indexed (1 = first block), but backend uses 0-indexed
  // We will convert to 0-indexed when submitting to backend (subnetIndex - 1)
  if (vlan.subnetIndex === undefined || vlan.subnetIndex === null) {
    fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index is required'
  } else if (vlan.subnetIndex < 1) {
    fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index must be >= 1'
  } else {
    // Calculate if this subnet index would exceed the valid IP range
    // Convert to 0-indexed for calculation
    const blockSize = Math.pow(2, 32 - vlan.subnetMask)
    const startAddress = (vlan.subnetIndex - 1) * blockSize

    // Check if the starting address of this subnet block exceeds 254 (last usable octet)
    if (startAddress > 254) {
      fieldErrors.value[`vlan_${index}_subnetIndex`] =
        `Subnet block ${vlan.subnetIndex} with /${vlan.subnetMask} would start at .${startAddress} (exceeds .254)`
    } else {
      delete fieldErrors.value[`vlan_${index}_subnetIndex`]
    }
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

// Exempt IP Ranges Methods
const addExemptRange = () => {
  const input = exemptRangeInput.value.trim()

  if (!input) {
    return
  }

  // Parse the input
  const { range, error } = parseIpInput(input)

  if (error || !range) {
    exemptRangesError.value = error || 'Invalid IP range format'
    return
  }

  // Validate against management network
  const validation = validateRangeInNetwork(
    range,
    localData.value.managementNetwork,
    localData.value.managementSubnetMask
  )

  if (!validation.isValid) {
    exemptRangesError.value = validation.error || 'IP range validation failed'
    return
  }

  // Check max ranges limit (20)
  if (localData.value.exemptIpRanges.length >= 20) {
    exemptRangesError.value = 'Maximum 20 exempt ranges allowed'
    return
  }

  // Add to ranges and auto-merge
  const updatedRanges = [...localData.value.exemptIpRanges, range]
  localData.value.exemptIpRanges = autoMergeRanges(updatedRanges)

  // Clear input and errors
  exemptRangeInput.value = ''
  exemptRangesError.value = ''

  // Validate all ranges
  validateExemptRanges()
}

const removeExemptRange = (index: number) => {
  localData.value.exemptIpRanges.splice(index, 1)
  validateExemptRanges()
}

const clearAllExemptRanges = () => {
  localData.value.exemptIpRanges = []
  exemptRangesError.value = ''
  exemptRangesWarnings.value = []
}

const validateExemptRanges = () => {
  if (localData.value.exemptIpRanges.length === 0) {
    exemptRangesError.value = ''
    exemptRangesWarnings.value = []
    return
  }

  const validation = validateExemptRangesUtil(
    localData.value.exemptIpRanges,
    localData.value.managementNetwork,
    localData.value.managementSubnetMask,
    20 // max ranges
  )

  if (!validation.isValid) {
    exemptRangesError.value = validation.errors[0] || 'Validation failed'
  } else {
    exemptRangesError.value = ''
  }

  exemptRangesWarnings.value = validation.warnings
}

const getRangeWarning = (range: IpRange): boolean => {
  // Show warning for large ranges (>100 IPs)
  return countIpsInRange(range) > 100
}

const formatRangeDisplay = (range: IpRange): string => {
  return formatRangeDisplayUtil(range)
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
      // FORCED: Only Calculated VLAN and Student ID Based are currently supported
      mode: 'calculated_vlan',
      allocationStrategy: 'student_id_based'
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
  // Force mode to calculated_vlan if not already set or if empty
  if (localData.value.mode !== 'calculated_vlan') {
    localData.value.mode = 'calculated_vlan'
  }
  // Force allocationStrategy to student_id_based if not already set
  if (localData.value.allocationStrategy !== 'student_id_based') {
    localData.value.allocationStrategy = 'student_id_based'
  }
  // Initialize with default VLAN if empty
  if (localData.value.vlans.length === 0 && localData.value.mode) {
    addVlan()
  }
  validateStep()
})
</script>

<style scoped>
</style>