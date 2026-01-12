<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="w-full max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Settings class="w-5 h-5" />
          Configure Cell Answer
        </DialogTitle>
        <DialogDescription>
          Cell [{{ rowIndex + 1}}, {{ colIndex + 1 }}]: Define how this cell's answer should be validated
        </DialogDescription>
      </DialogHeader>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto space-y-6 py-4">
        <!-- Cell Type Selection -->
        <div class="space-y-2">
          <Label>Cell Type</Label>
          <RadioGroup v-model="localCell.cellType" @update:modelValue="(value: string) => handleCellTypeChange(value as CellType)">
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="input" id="input" />
              <Label for="input" class="font-normal cursor-pointer">
                Input Field (Student can type)
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="readonly" id="readonly" />
              <Label for="readonly" class="font-normal cursor-pointer">
                Read-Only (Lecturer pre-filled)
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="blank" id="blank" />
              <Label for="blank" class="font-normal cursor-pointer">
                Blank (No interaction)
              </Label>
            </div>
          </RadioGroup>
        </div>


        <!-- Read-only Content (only for readonly cells) -->
        <div v-if="localCell.cellType === 'readonly'" class="space-y-2">
          <Label>Pre-filled Content</Label>
          <Input
            v-model="localCell.readonlyContent"
            placeholder="Enter content to display (e.g., 'N/A', 'Auto-assigned', '192.168.1.1')"
            class="font-mono"
          />
          <p class="text-sm text-muted-foreground">
            This content will be displayed to students and cannot be edited
          </p>
        </div>

        <!-- Blank Reason (only for blank cells) -->
        <div v-if="localCell.cellType === 'blank'" class="space-y-2">
          <Label>Blank Reason (Optional)</Label>
          <Input
            v-model="localCell.blankReason"
            placeholder="Enter reason why cell is blank (e.g., 'Not applicable', 'Reserved')"
          />
          <p class="text-sm text-muted-foreground">
            Optional explanation for why this cell is not interactive
          </p>
        </div>

        <!-- Answer Type Selection (only for input cells) -->
        <div v-if="localCell.cellType === 'input'" class="space-y-2">
          <Label>Answer Type</Label>
          <RadioGroup v-model="localCell.answerType" @update:modelValue="(value: string) => handleAnswerTypeChange(value as CellAnswerType)">
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="static" id="static" />
              <Label for="static" class="font-normal cursor-pointer">
                Static Value (e.g., DNS server "8.8.8.8")
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="calculated" id="calculated" />
              <Label for="calculated" class="font-normal cursor-pointer">
                Calculated (Student-Specific)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <!-- Static Answer Input -->
        <div v-if="localCell.answerType === 'static'" class="space-y-2">
          <Label>Static Answer</Label>
          <Input
            v-model="localCell.staticAnswer"
            placeholder="Enter exact answer (e.g., 8.8.8.8)"
            class="font-mono"
          />
          <p class="text-sm text-muted-foreground">
            This answer will be the same for all students
          </p>
        </div>

        <!-- Calculated Answer Configuration -->
        <div v-if="localCell.answerType === 'calculated' && localCell.calculatedAnswer">
          <!-- Calculation Type -->
          <div class="space-y-2">
            <Label>Calculation Type</Label>
            <Select
              v-model="localCell.calculatedAnswer.calculationType"
              @update:modelValue="(value: any) => handleCalculationTypeChange((value || 'vlan_lecturer_offset') as CalculationType)"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select calculation type..." />
              </SelectTrigger>
              <SelectContent class="z-[250]">
                <SelectItem value="vlan_network_address">VLAN Network Address</SelectItem>
                <SelectItem value="vlan_first_usable">VLAN First Usable IP</SelectItem>
                <SelectItem value="vlan_last_usable">VLAN Last Usable IP</SelectItem>
                <SelectItem value="vlan_broadcast">VLAN Broadcast Address</SelectItem>
                <SelectItem value="vlan_subnet_mask">VLAN Subnet Mask</SelectItem>
                <SelectItem value="vlan_lecturer_offset">
                  Lecturer-Defined Offset (Exact IP)
                </SelectItem>
                <SelectItem value="vlan_lecturer_range">
                  Lecturer-Defined Range (IP Range)
                </SelectItem>
                <SelectItem value="device_interface_ip">Device Interface IP</SelectItem>
                <SelectItem value="vlan_id">VLAN ID</SelectItem>
                <!-- IPv6 Calculation Types -->
                <SelectItem value="ipv6_network_prefix">IPv6 Network Prefix</SelectItem>
                <SelectItem value="ipv6_address">IPv6 Interface Address</SelectItem>
                <SelectItem value="ipv6_link_local">IPv6 Link-Local</SelectItem>
                <SelectItem value="ipv6_slaac">IPv6 SLAAC (Student Updatable)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- VLAN Selector (for VLAN-based calculations) -->
          <div
            v-if="localCell.calculatedAnswer && requiresVlanSelection(localCell.calculatedAnswer.calculationType)"
            class="space-y-2"
          >
            <Label class="mt-4">Select VLAN</Label>
            <Select v-model="localCell.calculatedAnswer.vlanIndex">
              <SelectTrigger>
                <SelectValue placeholder="Select VLAN..." />
              </SelectTrigger>
              <SelectContent class="z-[250]">
                <SelectItem
                  v-for="(vlan, vlanIdx) in vlans"
                  :key="vlanIdx"
                  :value="vlanIdx"
                >
                  VLAN {{ vlanIdx }} - Subnet Block {{ (vlan as any).subnetIndex || vlanIdx }} ({{ vlan.baseNetwork }}/{{ vlan.subnetMask }})
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Show subnet block details -->
            <Alert v-if="getValidOffsetRange" class="mt-2 mb-4 text-muted-foreground">
              <Info class="w-4 h-4" />
              <AlertDescription class="text-sm space-y-1">
                <div><strong>Subnet Block {{ getValidOffsetRange.subnetIndex }}:</strong></div>
                <div class="font-mono text-xs">
                  Network: {{ getValidOffsetRange.networkAddress }}/{{ vlans[localCell.calculatedAnswer?.vlanIndex || 0]?.subnetMask || 24 }}
                </div>
                <div class="font-mono text-xs">
                  Usable Range: {{ getValidOffsetRange.firstUsableIp }} - {{ getValidOffsetRange.lastUsableIp }}
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <!-- Lecturer Offset Input (for exact offset) -->
          <div
            v-if="localCell.calculatedAnswer?.calculationType === 'vlan_lecturer_offset'"
            class="space-y-2"
          >
            <Label>
              Host Offset
              <span v-if="getValidOffsetRange" class="text-muted-foreground">
                ({{ getValidOffsetRange.min }}-{{ getValidOffsetRange.max }})
              </span>
            </Label>
            <Input
              v-model.number="localCell.calculatedAnswer.lecturerOffset"
              type="number"
              :min="getValidOffsetRange?.min || 1"
              :max="getValidOffsetRange?.max || 254"
              placeholder="e.g., 5 for 5th host"
              :class="{ 'border-destructive': offsetValidationError }"
            />
            <Alert v-if="offsetValidationError" variant="destructive" class="mt-2">
              <AlertDescription class="text-sm">
                {{ offsetValidationError }}
              </AlertDescription>
            </Alert>
            <Alert v-else class="mt-2">
              <Info class="w-4 h-4" />
              <AlertDescription class="text-sm text-muted-foreground">
                <div v-if="getValidOffsetRange && localCell.calculatedAnswer?.lecturerOffset">
                  Example IP for offset {{ localCell.calculatedAnswer.lecturerOffset }}:
                  <span class="font-mono">{{ numberToIp(ipToNumber(getValidOffsetRange.networkAddress) + localCell.calculatedAnswer.lecturerOffset) }}</span>
                  (for Subnet Block {{ getValidOffsetRange.subnetIndex }})
                </div>
                <div v-else>
                  The exact IP at this offset will be calculated for each student's network
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <!-- Lecturer Range Inputs (for IP Range) -->
          <div
            v-if="localCell.calculatedAnswer?.calculationType === 'vlan_lecturer_range'"
            class="space-y-4"
          >
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>
                  Start Offset
                  <span v-if="getValidOffsetRange" class="text-muted-foreground text-xs">
                    ({{ getValidOffsetRange.min }}-{{ getValidOffsetRange.max }})
                  </span>
                </Label>
                <Input
                  v-model.number="localCell.calculatedAnswer.lecturerRangeStart"
                  type="number"
                  :min="getValidOffsetRange?.min || 1"
                  :max="getValidOffsetRange?.max || 254"
                  placeholder="e.g., 5"
                  :class="{ 'border-destructive': rangeValidationError }"
                />
              </div>
              <div class="space-y-2">
                <Label>
                  End Offset
                  <span v-if="getValidOffsetRange" class="text-muted-foreground text-xs">
                    ({{ getValidOffsetRange.min }}-{{ getValidOffsetRange.max }})
                  </span>
                </Label>
                <Input
                  v-model.number="localCell.calculatedAnswer.lecturerRangeEnd"
                  type="number"
                  :min="getValidOffsetRange?.min || 1"
                  :max="getValidOffsetRange?.max || 254"
                  placeholder="e.g., 10"
                  :class="{ 'border-destructive': rangeValidationError }"
                />
              </div>
            </div>
            <Alert v-if="rangeValidationError" variant="destructive">
              <AlertDescription class="text-sm">
                {{ rangeValidationError }}
              </AlertDescription>
            </Alert>
            <Alert v-else>
              <Info class="w-4 h-4" />
              <AlertDescription class="text-sm">
                <div v-if="getValidOffsetRange && localCell.calculatedAnswer?.lecturerRangeStart && localCell.calculatedAnswer?.lecturerRangeEnd">
                  IP Range:
                  <span class="font-mono">
                    {{ numberToIp(ipToNumber(getValidOffsetRange.networkAddress) + localCell.calculatedAnswer.lecturerRangeStart) }}
                    -
                    {{ numberToIp(ipToNumber(getValidOffsetRange.networkAddress) + localCell.calculatedAnswer.lecturerRangeEnd) }}
                  </span>
                  <div class="mt-1">Any IP within this range will be marked as correct (for Subnet Block {{ getValidOffsetRange.subnetIndex }})</div>
                </div>
                <div v-else>
                  Any IP within this offset range will be marked as correct
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <!-- Device Selector (for device interface IPs) -->
          <div
            v-if="localCell.calculatedAnswer?.calculationType === 'device_interface_ip'"
            class="space-y-4"
          >
            <div class="space-y-2">
              <Label>Select Device</Label>
              <Select
                v-model="localCell.calculatedAnswer.deviceId"
                @update:modelValue="handleDeviceChange"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device..." />
                </SelectTrigger>
                <SelectContent class="z-[250]">
                  <SelectItem
                    v-for="device in devices"
                    :key="device.deviceId"
                    :value="device.deviceId"
                  >
                    {{ device.deviceId }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label>Select Interface</Label>
              <Select
                v-model="localCell.calculatedAnswer.interfaceName"
                :disabled="!localCell.calculatedAnswer.deviceId"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interface..." />
                </SelectTrigger>
                <SelectContent class="z-[250]">
                  <SelectItem
                    v-for="iface in getDeviceInterfaces(localCell.calculatedAnswer?.deviceId)"
                    :key="iface.name"
                    :value="iface.name"
                  >
                    {{ iface.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- IPv6 SLAAC Info (for SLAAC type) -->
          <div
            v-if="localCell.calculatedAnswer?.calculationType === 'ipv6_slaac'"
            class="space-y-2"
          >
            <Alert>
              <Info class="w-4 h-4" />
              <AlertDescription class="text-sm">
                <div class="font-semibold mb-1">SLAAC (Student Updatable)</div>
                <div>Students can update this field with their SLAAC-assigned IPv6 address throughout the lab.</div>
                <div class="mt-2 text-muted-foreground">This works like DHCP - the student enters the address assigned by their network's router advertisement.</div>
              </AlertDescription>
            </Alert>
          </div>

          <!-- IPv6 Info (for other IPv6 types) -->
          <div
            v-if="isIpv6CalculationType && localCell.calculatedAnswer?.calculationType !== 'ipv6_slaac'"
            class="space-y-2"
          >
            <Alert>
              <Info class="w-4 h-4" />
              <AlertDescription class="text-sm">
                <div v-if="localCell.calculatedAnswer?.calculationType === 'ipv6_network_prefix'">The IPv6 network prefix is calculated based on the lab's IPv6 configuration.</div>
                <div v-else-if="localCell.calculatedAnswer?.calculationType === 'ipv6_address'">The IPv6 address is calculated based on interface and student ID.</div>
                <div v-else-if="localCell.calculatedAnswer?.calculationType === 'ipv6_link_local'">Link-local addresses (fe80::/10) are auto-configured on each interface.</div>
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <!-- Points Configuration -->
        <div class="space-y-2">
          <Label>Points for this Cell</Label>
          <Input
            v-model.number="localCell.points"
            type="number"
            :min="localCell.cellType === 'input' ? 1 : 0"
            :disabled="localCell.cellType !== 'input'"
            placeholder="1"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" @click="handleCancel">
          <X class="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button @click="handleSave" :disabled="!isValid">
          <Check class="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Settings, Info, Check, X } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

import type {
  IpTableCell,
  CellAnswerType,
  CellType,
  CalculationType,
  Device
} from '@/types/wizard'

interface Props {
  open: boolean
  cell: IpTableCell
  rowIndex: number
  colIndex: number
  devices: Device[]
  vlans: Array<{
    baseNetwork: string
    subnetMask: number
  }>
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'save', cell: IpTableCell): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local copy of cell for editing
const localCell = ref<IpTableCell>(JSON.parse(JSON.stringify(props.cell)))

// Watch for prop changes
watch(() => props.cell, (newCell) => {
  localCell.value = JSON.parse(JSON.stringify(newCell))
}, { deep: true })

watch(() => props.open, (newOpen) => {
  if (newOpen) {
    localCell.value = JSON.parse(JSON.stringify(props.cell))
  }
})

// Watch for VLAN changes to update valid offset range
watch(() => localCell.value.calculatedAnswer?.vlanIndex, (newVlanIndex) => {
  if (newVlanIndex === undefined) return

  const validRange = getValidOffsetRange.value
  if (!validRange) return

  const calc = localCell.value.calculatedAnswer
  if (!calc) return

  // Adjust offset if it's out of the new valid range
  if (calc.calculationType === 'vlan_lecturer_offset' && calc.lecturerOffset) {
    if (calc.lecturerOffset < validRange.min) {
      calc.lecturerOffset = validRange.min
    } else if (calc.lecturerOffset > validRange.max) {
      calc.lecturerOffset = validRange.max
    }
  }

  // Adjust range if it's out of the new valid range
  if (calc.calculationType === 'vlan_lecturer_range') {
    if (calc.lecturerRangeStart && calc.lecturerRangeStart < validRange.min) {
      calc.lecturerRangeStart = validRange.min
    }
    if (calc.lecturerRangeStart && calc.lecturerRangeStart > validRange.max) {
      calc.lecturerRangeStart = validRange.max
    }
    if (calc.lecturerRangeEnd && calc.lecturerRangeEnd < validRange.min) {
      calc.lecturerRangeEnd = validRange.min
    }
    if (calc.lecturerRangeEnd && calc.lecturerRangeEnd > validRange.max) {
      calc.lecturerRangeEnd = validRange.max
    }
  }
})

// Helper functions
const requiresVlanSelection = (calcType: CalculationType | undefined): boolean => {
  if (!calcType) return false
  return [
    'vlan_network_address',
    'vlan_first_usable',
    'vlan_last_usable',
    'vlan_broadcast',
    'vlan_subnet_mask',
    'vlan_lecturer_offset',
    'vlan_lecturer_range',
    'vlan_id',
    // IPv6 types that require VLAN selection
    'ipv6_network_prefix',
    'ipv6_address',
    'ipv6_slaac'
  ].includes(calcType)
}

// Check if current type is an IPv6 calculation
const isIpv6CalculationType = computed(() => {
  const calcType = localCell.value.calculatedAnswer?.calculationType
  return calcType && [
    'ipv6_network_prefix',
    'ipv6_address',
    'ipv6_interface_id',
    'ipv6_link_local',
    'ipv6_slaac'
  ].includes(calcType)
})

const getDeviceInterfaces = (deviceId: string | undefined) => {
  if (!deviceId) return []
  const device = props.devices.find(d => d.deviceId === deviceId)
  if (!device) return []

  // Filter out management interfaces - they are auto-generated and should not be in questionnaires
  const nonManagementInterfaces = device.ipVariables.filter(v => !v.isManagementInterface)

  return nonManagementInterfaces.map(v => ({
    name: v.name,
    fullName: v.interface || v.name
  }))
}

// IP conversion helpers
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number)
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.')
}

// Calculate valid offset range for selected VLAN
interface ValidOffsetRange {
  min: number;
  max: number;
  subnetSize: number;
  networkAddress: string;
  firstUsableIp: string;
  lastUsableIp: string;
  broadcastAddress: string;
  subnetIndex: number;
}

const getValidOffsetRange = computed((): ValidOffsetRange | null => {
  const calc = localCell.value.calculatedAnswer
  if (!calc || calc.vlanIndex === undefined) return null

  const vlan = props.vlans[calc.vlanIndex]
  if (!vlan) return null

  // Calculate subnet size based on subnet mask
  const subnetSize = Math.pow(2, 32 - vlan.subnetMask)

  // Calculate network address for this specific subnet block
  const baseNum = ipToNumber(vlan.baseNetwork)
  const networkNum = baseNum + ((vlan as any).subnetIndex || 0) * subnetSize

  const networkAddress = numberToIp(networkNum)
  const firstUsableIp = numberToIp(networkNum + 1)
  const lastUsableIp = numberToIp(networkNum + subnetSize - 2)
  const broadcastAddress = numberToIp(networkNum + subnetSize - 1)

  // Valid offsets: 1 to (subnetSize - 2)
  // Exclude: 0 (network address) and (subnetSize - 1) (broadcast)
  return {
    min: 1,
    max: subnetSize - 2,
    subnetSize,
    networkAddress,
    firstUsableIp,
    lastUsableIp,
    broadcastAddress,
    subnetIndex: (vlan as any).subnetIndex || 0
  }
})

// Validation error messages for offset/range
const offsetValidationError = computed((): string | null => {
  const calc = localCell.value.calculatedAnswer
  if (!calc || calc.calculationType !== 'vlan_lecturer_offset') return null

  const validRange = getValidOffsetRange.value
  if (!validRange) return null

  const offset = calc.lecturerOffset
  if (offset === undefined || offset === null) return null

  if (offset < validRange.min || offset > validRange.max) {
    return `Offset must be between ${validRange.min} and ${validRange.max} for Subnet Block ${validRange.subnetIndex} (${validRange.networkAddress}/${props.vlans[calc.vlanIndex!].subnetMask})`
  }

  return null
})

const rangeValidationError = computed((): string | null => {
  const calc = localCell.value.calculatedAnswer
  if (!calc || calc.calculationType !== 'vlan_lecturer_range') return null

  const validRange = getValidOffsetRange.value
  if (!validRange) return null

  const start = calc.lecturerRangeStart
  const end = calc.lecturerRangeEnd

  if (start === undefined || end === undefined) return null

  if (start < validRange.min || start > validRange.max) {
    return `Start offset must be between ${validRange.min} and ${validRange.max} for Subnet Block ${validRange.subnetIndex} (${validRange.networkAddress}/${props.vlans[calc.vlanIndex!].subnetMask})`
  }

  if (end < validRange.min || end > validRange.max) {
    return `End offset must be between ${validRange.min} and ${validRange.max} for Subnet Block ${validRange.subnetIndex} (${validRange.networkAddress}/${props.vlans[calc.vlanIndex!].subnetMask})`
  }

  if (start >= end) {
    return 'Start offset must be less than end offset'
  }

  return null
})

// Handlers
const handleCellTypeChange = (newType: CellType) => {
  localCell.value.cellType = newType

  // Set default configuration based on cell type
  if (newType === 'input') {
    // Restore scoring defaults for input cells
    if (!localCell.value.points || localCell.value.points < 1) {
      localCell.value.points = 1
    }
    localCell.value.autoCalculated = Boolean(localCell.value.autoCalculated)

    // Initialize answer type for input cells
    if (!localCell.value.answerType) {
      localCell.value.answerType = 'calculated'
    }
    // Ensure calculatedAnswer is initialized for input cells if answerType is calculated
    if (localCell.value.answerType === 'calculated' && !localCell.value.calculatedAnswer) {
      localCell.value.calculatedAnswer = {
        calculationType: 'vlan_lecturer_offset',
        vlanIndex: 0,
        lecturerOffset: 1
      }
    }
  } else if (newType === 'readonly') {
    // Clear answer configuration for readonly cells
    localCell.value.points = 0
    localCell.value.autoCalculated = false
    localCell.value.answerType = undefined
    localCell.value.staticAnswer = undefined
    localCell.value.calculatedAnswer = undefined
    if (!localCell.value.readonlyContent) {
      localCell.value.readonlyContent = ''
    }
    localCell.value.blankReason = undefined
  } else if (newType === 'blank') {
    // Clear all answer configuration for blank cells
    localCell.value.points = 0
    localCell.value.autoCalculated = false
    localCell.value.answerType = undefined
    localCell.value.staticAnswer = undefined
    localCell.value.calculatedAnswer = undefined
    localCell.value.readonlyContent = undefined
    if (!localCell.value.blankReason) {
      localCell.value.blankReason = ''
    }
    localCell.value.readonlyContent = undefined
  }
}

const handleAnswerTypeChange = (newType: CellAnswerType) => {
  localCell.value.answerType = newType

  // Initialize calculatedAnswer if switching to calculated type
  if (newType === 'calculated') {
    // Always ensure calculatedAnswer is defined for calculated type
    localCell.value.calculatedAnswer = {
      calculationType: localCell.value.calculatedAnswer?.calculationType || 'vlan_lecturer_offset',
      vlanIndex: localCell.value.calculatedAnswer?.vlanIndex || 0,
      lecturerOffset: localCell.value.calculatedAnswer?.lecturerOffset || 1,
      lecturerRangeStart: localCell.value.calculatedAnswer?.lecturerRangeStart,
      lecturerRangeEnd: localCell.value.calculatedAnswer?.lecturerRangeEnd,
      deviceId: localCell.value.calculatedAnswer?.deviceId,
      interfaceName: localCell.value.calculatedAnswer?.interfaceName
    }
    localCell.value.staticAnswer = undefined
  } else {
    // Static type
    localCell.value.calculatedAnswer = undefined
    if (!localCell.value.staticAnswer) {
      localCell.value.staticAnswer = ''
    }
  }
}

const handleCalculationTypeChange = (newType: CalculationType) => {
  if (!localCell.value.calculatedAnswer) return

  localCell.value.calculatedAnswer.calculationType = newType

  // Reset fields based on calculation type
  if (requiresVlanSelection(newType)) {
    if (localCell.value.calculatedAnswer.vlanIndex === undefined) {
      localCell.value.calculatedAnswer.vlanIndex = 0
    }
  }

  if (newType === 'vlan_lecturer_offset') {
    // Set to minimum valid offset for the selected VLAN
    const validRange = getValidOffsetRange.value
    localCell.value.calculatedAnswer.lecturerOffset = validRange?.min || 1
  } else if (newType === 'vlan_lecturer_range') {
    // Set to reasonable defaults within valid range
    const validRange = getValidOffsetRange.value
    const min = validRange?.min || 5
    const max = validRange?.max || 10
    localCell.value.calculatedAnswer.lecturerRangeStart = min
    localCell.value.calculatedAnswer.lecturerRangeEnd = Math.min(min + 5, max)
  } else if (newType === 'device_interface_ip') {
    localCell.value.calculatedAnswer.deviceId = ''
    localCell.value.calculatedAnswer.interfaceName = ''
  }
}

const handleDeviceChange = () => {
  if (localCell.value.calculatedAnswer) {
    localCell.value.calculatedAnswer.interfaceName = ''
  }
}

const handleCancel = () => {
  emit('update:open', false)
}

const handleSave = () => {
  emit('save', localCell.value)
  emit('update:open', false)
}

const handleOpenChange = (value: boolean) => {
  emit('update:open', value)
}

// Validation
const isValid = computed(() => {
  // For blank cells, only need cellType
  if (localCell.value.cellType === 'blank') {
    return true
  }

  // For readonly cells, need cellType and readonlyContent
  if (localCell.value.cellType === 'readonly') {
    return localCell.value.readonlyContent && 
           localCell.value.readonlyContent.trim() !== ''
  }

  // For input cells, need to validate answer configuration
  if (localCell.value.cellType === 'input') {
    if (localCell.value.answerType === 'static') {
      return localCell.value.staticAnswer && localCell.value.staticAnswer.trim() !== ''
    }

    if (localCell.value.answerType === 'calculated') {
      if (!localCell.value.calculatedAnswer) return false

      const calc = localCell.value.calculatedAnswer

      // Check VLAN selection
      if (requiresVlanSelection(calc.calculationType)) {
        if (calc.vlanIndex === undefined) return false
      }

      // Check offset (with subnet-aware validation)
      if (calc.calculationType === 'vlan_lecturer_offset') {
        if (!calc.lecturerOffset) return false
        // Use subnet-aware validation
        if (offsetValidationError.value) return false
      }

      // Check range (with subnet-aware validation)
      if (calc.calculationType === 'vlan_lecturer_range') {
        if (!calc.lecturerRangeStart || !calc.lecturerRangeEnd) return false
        // Use subnet-aware validation
        if (rangeValidationError.value) return false
      }

      // Check device interface
      if (calc.calculationType === 'device_interface_ip') {
        if (!calc.deviceId || !calc.interfaceName) return false
      }

      return true
    }

    return false
  }

  return false
})
</script>
