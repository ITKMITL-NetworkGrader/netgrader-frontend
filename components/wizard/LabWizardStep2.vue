<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Network Configuration</h2>
      <p class="text-muted-foreground mt-1">
        Configure the base network topology that will be used for all lab devices.
      </p>
    </div>

    <!-- Network Settings -->
    <div class="space-y-6">
      <!-- Base Network -->
      <div class="space-y-2">
        <Label for="base-network" class="text-sm font-medium">
          Base Network <span class="text-destructive">*</span>
        </Label>
        <div class="flex items-center space-x-2">
          <Input
            id="base-network"
            v-model="localData.baseNetwork"
            placeholder="192.168.1.0"
            :class="{
              'border-destructive': hasError('baseNetwork'),
              'border-green-500': !hasError('baseNetwork') && isValidIP(localData.baseNetwork)
            }"
            @input="validateField('baseNetwork')"
            @blur="validateField('baseNetwork')"
          />
          <div class="text-lg font-mono text-muted-foreground">/</div>
          <Select v-model="localData.subnetMask" @update:modelValue="validateField('subnetMask')">
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
        <p v-if="hasError('baseNetwork')" class="text-sm text-destructive">
          {{ getError('baseNetwork') }}
        </p>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground">
          <Info class="w-3 h-3" />
          <span>Enter the base network address (e.g., 192.168.1.0)</span>
        </div>
      </div>

      <!-- Network Information Card -->
      <Card class="bg-muted/30">
        <CardHeader>
          <CardTitle class="text-lg flex items-center">
            <Network class="w-5 h-5 mr-2" />
            Network Information
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-sm font-medium">Network Address</Label>
              <div class="p-3 bg-background rounded-md border">
                <code class="text-sm font-mono">
                  {{ networkInfo.networkAddress || 'Invalid network' }}
                </code>
              </div>
            </div>

            <div class="space-y-2">
              <Label class="text-sm font-medium">Subnet Mask</Label>
              <div class="p-3 bg-background rounded-md border">
                <code class="text-sm font-mono">
                  {{ networkInfo.subnetMaskDecimal || 'Invalid mask' }}
                </code>
              </div>
            </div>

            <div class="space-y-2">
              <Label class="text-sm font-medium">Available Hosts</Label>
              <div class="p-3 bg-background rounded-md border">
                <code class="text-sm font-mono">
                  {{ networkInfo.availableHosts || 0 }}
                </code>
              </div>
            </div>

            <div class="space-y-2">
              <Label class="text-sm font-medium">IP Range</Label>
              <div class="p-3 bg-background rounded-md border">
                <code class="text-sm font-mono">
                  {{ networkInfo.ipRange || 'Invalid range' }}
                </code>
              </div>
            </div>
          </div>

          <!-- Network Recommendations -->
          <div v-if="networkInfo.availableHosts" class="space-y-2">
            <Label class="text-sm font-medium">Recommendations</Label>
            <div class="space-y-2">
              <Alert v-if="networkInfo.availableHosts < 10" variant="destructive">
                <AlertTriangle class="h-4 w-4" />
                <AlertDescription>
                  This network may be too small for complex labs. Consider using a larger subnet.
                </AlertDescription>
              </Alert>
              <Alert v-else-if="networkInfo.availableHosts < 50">
                <Info class="h-4 w-4" />
                <AlertDescription>
                  This network size is suitable for small to medium labs (up to {{ Math.floor(networkInfo.availableHosts / 5) }} devices).
                </AlertDescription>
              </Alert>
              <Alert v-else class="border-green-500">
                <CheckCircle2 class="h-4 w-4 text-green-600" />
                <AlertDescription>
                  This network size is excellent for large labs (up to {{ Math.floor(networkInfo.availableHosts / 5) }} devices).
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Common Network Templates -->
      <div class="space-y-4">
        <Label class="text-sm font-medium">Quick Templates</Label>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            v-for="template in networkTemplates"
            :key="template.name"
            variant="outline"
            class="h-auto p-4 justify-start"
            @click="applyNetworkTemplate(template)"
          >
            <div class="text-left">
              <div class="font-medium">{{ template.name }}</div>
              <div class="text-xs text-muted-foreground mt-1">
                {{ template.network }}/{{ template.mask }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ getTemplateHostCount(template.mask) }} hosts
              </div>
            </div>
          </Button>
        </div>
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
  CheckCircle2
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

// Props
interface Props {
  modelValue: {
    baseNetwork: string
    subnetMask: number
  }
  validation?: ValidationResult
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'validate', result: ValidationResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localData = ref({ ...props.modelValue })
const fieldErrors = ref<Record<string, string>>({})
const isUpdatingFromProps = ref(false)

// Constants
const subnetMaskOptions = Array.from({ length: 23 }, (_, i) => 8 + i) // 8-30
const networkTemplates = [
  { name: 'Small Lab', network: '192.168.1.0', mask: 28 }, // 14 hosts
  { name: 'Medium Lab', network: '192.168.1.0', mask: 26 }, // 62 hosts  
  { name: 'Large Lab', network: '192.168.1.0', mask: 24 }, // 254 hosts
]

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

const getTemplateHostCount = (mask: number): number => {
  return Math.pow(2, 32 - mask) - 2
}

const calculateNetworkInfo = (baseNetwork: string, subnetMask: number) => {
  if (!isValidIP(baseNetwork)) {
    return {
      networkAddress: null,
      subnetMaskDecimal: null,
      availableHosts: 0,
      ipRange: null
    }
  }

  const availableHosts = Math.pow(2, 32 - subnetMask) - 2
  const subnetMaskDecimal = Array(4).fill(0).map((_, i) => {
    const bitsInOctet = Math.max(0, Math.min(8, subnetMask - i * 8))
    return 256 - Math.pow(2, 8 - bitsInOctet)
  }).join('.')

  // Calculate network address
  const ipParts = baseNetwork.split('.').map(Number)
  const maskParts = subnetMaskDecimal.split('.').map(Number)
  const networkParts = ipParts.map((ip, i) => ip & maskParts[i])
  const networkAddress = networkParts.join('.')

  // Calculate IP range
  const firstIP = [...networkParts]
  firstIP[3] += 1
  const lastIPParts = [...networkParts]
  const hostBits = 32 - subnetMask
  let hostsToAdd = Math.pow(2, hostBits) - 2

  for (let i = 3; i >= 0 && hostsToAdd > 0; i--) {
    const maxInOctet = 255 - lastIPParts[i]
    const toAdd = Math.min(hostsToAdd, maxInOctet)
    lastIPParts[i] += toAdd
    hostsToAdd -= toAdd
  }

  const ipRange = `${firstIP.join('.')} - ${lastIPParts.join('.')}`

  return {
    networkAddress,
    subnetMaskDecimal,
    availableHosts,
    ipRange
  }
}

// Computed
const networkInfo = computed(() => {
  return calculateNetworkInfo(localData.value.baseNetwork, localData.value.subnetMask)
})

const validateField = (field: string) => {
  switch (field) {
    case 'baseNetwork':
      if (!localData.value.baseNetwork.trim()) {
        fieldErrors.value.baseNetwork = 'Base network is required'
      } else if (!isValidIP(localData.value.baseNetwork)) {
        fieldErrors.value.baseNetwork = 'Please enter a valid IP address'
      } else {
        delete fieldErrors.value.baseNetwork
      }
      break

    case 'subnetMask':
      if (!localData.value.subnetMask) {
        fieldErrors.value.subnetMask = 'Subnet mask is required'
      } else if (localData.value.subnetMask < 8 || localData.value.subnetMask > 30) {
        fieldErrors.value.subnetMask = 'Subnet mask must be between 8 and 30'
      } else {
        delete fieldErrors.value.subnetMask
      }
      break
  }

  emitValidation()
}

const validateAllFields = () => {
  // Validate all fields without calling validateField to avoid recursion
  if (!localData.value.baseNetwork.trim()) {
    fieldErrors.value.baseNetwork = 'Base network is required'
  } else if (!isValidIP(localData.value.baseNetwork)) {
    fieldErrors.value.baseNetwork = 'Please enter a valid IP address'
  } else {
    delete fieldErrors.value.baseNetwork
  }

  if (!localData.value.subnetMask) {
    fieldErrors.value.subnetMask = 'Subnet mask is required'
  } else if (localData.value.subnetMask < 8 || localData.value.subnetMask > 30) {
    fieldErrors.value.subnetMask = 'Subnet mask must be between 8 and 30'
  } else {
    delete fieldErrors.value.subnetMask
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
  emitValidation()
}

const applyNetworkTemplate = (template: typeof networkTemplates[0]) => {
  localData.value.baseNetwork = template.network
  localData.value.subnetMask = template.mask
  validateStep()
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
    localData.value = { ...newValue }
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  validateStep()
})
</script>