<template>
  <div class="space-y-3">
    <!-- Mode Selection - Styled Toggle Buttons -->
    <div class="inline-flex rounded-md border border-input bg-background p-1" role="radiogroup">
      <button
        type="button"
        :class="[
          'relative inline-flex items-center px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-l-sm',
          mode === 'variable'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        ]"
        role="radio"
        :aria-checked="mode === 'variable'"
        @click="setMode('variable')"
      >
        <Network class="w-4 h-4 mr-2" />
        Use IP Variable
      </button>
      <button
        type="button"
        :class="[
          'relative inline-flex items-center px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-r-sm',
          mode === 'custom'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        ]"
        role="radio"
        :aria-checked="mode === 'custom'"
        @click="setMode('custom')"
      >
        <Globe class="w-4 h-4 mr-2" />
        Custom IP Address
      </button>
    </div>

    <!-- Variable Selection -->
    <div v-if="mode === 'variable'" class="space-y-2">
      <Label class="text-sm font-medium">
        Select IP Variable <span class="text-destructive">*</span>
      </Label>
      <Select
        v-model="selectedVariable"
        @update:model-value="handleVariableChange"
      >
        <SelectTrigger
          :class="{
            'border-destructive': hasError && mode === 'variable' && !selectedVariable,
            'border-green-500': !hasError && selectedVariable
          }"
        >
          <SelectValue>
            <template v-if="selectedVariable">
              {{ selectedVariable }}
            </template>
            <template v-else>
              Select an IP variable
            </template>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in ipVariableOptions"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
          >
            <div class="flex flex-col">
              <div class="font-medium">{{ option.label }}</div>
              <div class="text-xs text-muted-foreground">{{ option.description }}</div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="selectedVariable" class="text-xs text-muted-foreground">
        This will use the IP variable from device configuration
      </p>
    </div>

    <!-- Custom IP Input -->
    <div v-if="mode === 'custom'" class="space-y-2">
      <Label class="text-sm font-medium">
        Custom IP Address or Domain <span class="text-destructive">*</span>
      </Label>
      <Input
        v-model="customIp"
        placeholder="192.168.1.1, 2001:db8::1, 8.8.8.8, google.com"
        :class="{
          'border-destructive': hasError && mode === 'custom' && (!customIp || !isIpOrDomain(customIp)),
          'border-green-500': !hasError && customIp && isIpOrDomain(customIp)
        }"
        @input="handleCustomIpChange($event)"
      />
      <p class="text-xs text-muted-foreground">
        Enter a custom IPv4/IPv6 address or domain name (supports external destinations like Internet)
      </p>
      <p v-if="customIp && !isIpOrDomain(customIp)" class="text-xs text-destructive">
        Please enter a valid IPv4/IPv6 address or domain name
      </p>
    </div>

    <!-- Error Message -->
    <p v-if="hasError && errorMessage" class="text-xs text-destructive">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Network, Globe } from 'lucide-vue-next'
import type { Device } from '@/types/wizard'

interface Props {
  modelValue: string | undefined
  paramName: string
  devices: Device[]
  required?: boolean
  hasError?: boolean
  errorMessage?: string
  ipv6Only?: boolean // When true, only show interfaces with IPv6 configured
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'validate', paramName: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const mode = ref<'variable' | 'custom'>('variable')
const selectedVariable = ref<string>('')
const customIp = ref<string>('')
const isUserTyping = ref(false)
const lastUserAction = ref<'variable' | 'custom' | null>(null)

// Computed - handle undefined modelValue
const safeModelValue = computed(() => props.modelValue || '')

// Computed
const ipVariableOptions = computed(() => {
  const options: Array<{ label: string; value: string; description: string }> = []

  for (const device of props.devices) {
    for (const ipVar of device.ipVariables) {
      // Skip management interfaces
      if (ipVar.isManagementInterface) continue

      const label = `${device.deviceId}.${ipVar.name}`
      const value = label // Store as "deviceId.variableName"
      let description = `${device.deviceId} - ${ipVar.name}`

      if (ipVar.interface) {
        description += ` (${ipVar.interface})`
      }

      // Add input type information
      // For ipv6Only mode, prioritize showing IPv6 config info if available
      if (props.ipv6Only) {
        if (ipVar.ipv6InputType && ipVar.ipv6InputType !== 'none') {
          description += ` - IPv6: ${ipVar.ipv6InputType}`
        } else if (ipVar.inputType) {
          description += ` - ${ipVar.inputType}`
        }
      } else if (ipVar.inputType) {
        description += ` - ${ipVar.inputType}`
      }

      options.push({
        label,
        value,
        description
      })
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
})

// Methods
const isValidIpv4 = (ip: string): boolean => {
  if (!ip) return false
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip.trim())
}

const isValidIpv6 = (ip: string): boolean => {
  if (!ip) return false
  // Remove prefix length if present (e.g., /64)
  const ipWithoutPrefix = ip.split('/')[0].trim()
  // Comprehensive IPv6 regex supporting full, compressed, and mixed formats
  const ipv6Regex = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::(?:[fF]{4}:)?(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/
  return ipv6Regex.test(ipWithoutPrefix)
}

const isValidIp = (ip: string): boolean => {
  return isValidIpv4(ip) || isValidIpv6(ip)
}

const isValidDomainName = (domain: string): boolean => {
  if (!domain) return false
  // Domain name regex: allows letters, numbers, hyphens, and dots
  // Must have at least one dot and valid TLD
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  return domainRegex.test(domain.trim())
}

const isIpOrDomain = (value: string): boolean => {
  return isValidIp(value) || isValidDomainName(value)
}

const setMode = (newMode: 'variable' | 'custom') => {
  mode.value = newMode
  lastUserAction.value = newMode
  isUserTyping.value = false
  // Clear the current value when mode changes
  selectedVariable.value = ''
  customIp.value = ''
  updateModelValue('')
}

const handleModeChange = () => {
  // Clear the current value when mode changes
  selectedVariable.value = ''
  customIp.value = ''
  updateModelValue('')
}

const handleVariableChange = (value: string) => {
  isUserTyping.value = true
  lastUserAction.value = 'variable'
  selectedVariable.value = value

  // Wrap the IP variable with {{}} for backend
  // For IPv6 mode, add :ipv6 suffix to indicate IPv6 resolution
  const suffix = props.ipv6Only ? ':ipv6' : ''
  const wrappedValue = value ? `{{${value}${suffix}}}` : ''
  updateModelValue(wrappedValue)

  // Reset typing state after a short delay
  setTimeout(() => {
    isUserTyping.value = false
  }, 500)
}

const handleCustomIpChange = (event: Event) => {
  // Get the actual current value from the input event
  const target = event.target as HTMLInputElement
  const currentValue = target.value
  
  // Set user typing state immediately to prevent interference
  isUserTyping.value = true
  lastUserAction.value = 'custom'

  // Save immediately using the event value (not customIp.value which hasn't updated yet)
  emit('update:modelValue', currentValue)
  
  // Clear any existing timeout
  if (window.ipValidationTimeout) {
    clearTimeout(window.ipValidationTimeout)
  }
  
  // Only debounce the validation, not the saving
  window.ipValidationTimeout = setTimeout(() => {
    isUserTyping.value = false
    // Trigger validation only after user stops typing
    emit('validate', props.paramName)
  }, 500)
}

const updateModelValue = (value: string) => {
  // Debug logging (commented out for production)
  // console.log('🔍 IpParameterSelector emitting:', {
  //   paramName: props.paramName,
  //   value: value,
  //   mode: mode.value,
  //   customIp: customIp.value,
  //   selectedVariable: selectedVariable.value
  // })
  emit('update:modelValue', value)
  // Don't emit validation immediately - let the debounced validation handle it
}

const parseCurrentValue = (value: string) => {
  if (!value) {
    // Clear values but don't change mode
    selectedVariable.value = ''
    customIp.value = ''
    return
  }

  // If user is actively typing, don't switch modes - just update the current field
  if (isUserTyping.value) {
    if (mode.value === 'custom') {
      customIp.value = value
    } else {
      selectedVariable.value = value
    }
    return
  }

  // Check if value is wrapped with {{}} - indicating it's an IP variable
  // Support both {{device.var}} and {{device.var:ipv6}} formats
  const wrappedPattern = /^\{\{(.+?)(:ipv6)?\}\}$/
  const wrappedMatch = value.match(wrappedPattern)

  if (wrappedMatch) {
    // It's a wrapped IP variable - extract the inner value (without :ipv6 suffix)
    const innerValue = wrappedMatch[1]

    // Check if it's a valid variable option
    if (ipVariableOptions.value.some(opt => opt.value === innerValue)) {
      mode.value = 'variable'
      selectedVariable.value = innerValue
      customIp.value = ''
      lastUserAction.value = 'variable'
      return
    }
  }

  // Only auto-detect mode on initial load, not during typing
  // Check if it's a complete variable reference (deviceId.variableName format) without {{}}
  if (value.includes('.') && ipVariableOptions.value.some(opt => opt.value === value)) {
    mode.value = 'variable'
    selectedVariable.value = value
    customIp.value = ''
    lastUserAction.value = 'variable'
  } else {
    // Default to custom mode for everything else (IPs, domains, etc.)
    mode.value = 'custom'
    selectedVariable.value = ''
    customIp.value = value
    lastUserAction.value = 'custom'
  }
}

// Watchers
watch(
  () => safeModelValue.value,
  (newValue, oldValue) => {
    // Only parse on initial load or when value changes from external source
    // Don't parse during user typing to avoid mode switching
    if (newValue !== oldValue && !isUserTyping.value && lastUserAction.value === null) {
      parseCurrentValue(newValue)
    }
  },
  { immediate: true }
)

// Cleanup function to save final value
const cleanup = () => {
  if (window.ipValidationTimeout) {
    clearTimeout(window.ipValidationTimeout)
    // Save the final value if user was typing
    if (isUserTyping.value && mode.value === 'custom' && customIp.value) {
      emit('update:modelValue', customIp.value)
    }
  }
}

// Initialize on mount
onMounted(() => {
  parseCurrentValue(safeModelValue.value)
})

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})

// No longer needed - we save immediately in handleCustomIpChange

// Cleanup when mode changes
watch(() => mode.value, () => {
  cleanup()
})
</script>