<template>
  <div class="space-y-3">
    <!-- Mode Selection - Styled Toggle Buttons -->
    <div class="inline-flex rounded-md border border-input bg-background p-1" role="radiogroup">
      <button
        type="button"
        @click="setMode('variable')"
        :class="[
          'relative inline-flex items-center px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-l-sm',
          mode === 'variable'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        ]"
        role="radio"
        :aria-checked="mode === 'variable'"
      >
        <Network class="w-4 h-4 mr-2" />
        Use IP Variable
      </button>
      <button
        type="button"
        @click="setMode('custom')"
        :class="[
          'relative inline-flex items-center px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-r-sm',
          mode === 'custom'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        ]"
        role="radio"
        :aria-checked="mode === 'custom'"
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
        @update:modelValue="handleVariableChange"
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
            :textValue="option.label"
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
        Custom IP Address <span class="text-destructive">*</span>
      </Label>
      <Input
        v-model="customIp"
        placeholder="192.168.1.1, 10.0.0.1, 8.8.8.8"
        @input="handleCustomIpChange"
        :class="{
          'border-destructive': hasError && mode === 'custom' && (!customIp || !isValidIp(customIp)),
          'border-green-500': !hasError && customIp && isValidIp(customIp)
        }"
      />
      <p class="text-xs text-muted-foreground">
        Enter a custom IP address (supports external destinations like Internet)
      </p>
      <p v-if="customIp && !isValidIp(customIp)" class="text-xs text-destructive">
        Please enter a valid IP address
      </p>
    </div>

    <!-- Error Message -->
    <p v-if="hasError && errorMessage" class="text-xs text-destructive">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Network, Globe } from 'lucide-vue-next'
import type { Device } from '@/types/wizard'

interface Props {
  modelValue: string
  paramName: string
  devices: Device[]
  required?: boolean
  hasError?: boolean
  errorMessage?: string
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

// Computed
const ipVariableOptions = computed(() => {
  const options: Array<{ label: string; value: string; description: string }> = []

  for (const device of props.devices) {
    for (const ipVar of device.ipVariables) {
      const label = `${device.deviceId}.${ipVar.name}`
      const value = label // Store as "deviceId.variableName"
      let description = `${device.deviceId} - ${ipVar.name}`

      if (ipVar.interface) {
        description += ` (${ipVar.interface})`
      }

      // Add input type information
      if (ipVar.inputType) {
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
const isValidIp = (ip: string): boolean => {
  if (!ip) return false
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip.trim())
}

const setMode = (newMode: 'variable' | 'custom') => {
  mode.value = newMode
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
  selectedVariable.value = value
  updateModelValue(value)
}

const handleCustomIpChange = () => {
  updateModelValue(customIp.value)
}

const updateModelValue = (value: string) => {
  emit('update:modelValue', value)
  emit('validate', props.paramName)
}

const parseCurrentValue = (value: string) => {
  if (!value) {
    mode.value = 'variable'
    selectedVariable.value = ''
    customIp.value = ''
    return
  }

  // Check if it's a variable reference (deviceId.variableName format)
  if (value.includes('.') && ipVariableOptions.value.some(opt => opt.value === value)) {
    mode.value = 'variable'
    selectedVariable.value = value
    customIp.value = ''
  } else if (isValidIp(value)) {
    // It's a custom IP address
    mode.value = 'custom'
    selectedVariable.value = ''
    customIp.value = value
  } else {
    // Try to detect if it looks like a variable reference even if not found
    if (value.includes('.') && /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(value)) {
      mode.value = 'variable'
      selectedVariable.value = value
      customIp.value = ''
    } else {
      // Default to custom IP mode and let user see/fix the value
      mode.value = 'custom'
      selectedVariable.value = ''
      customIp.value = value
    }
  }
}

// Watchers
watch(
  () => props.modelValue,
  (newValue) => {
    parseCurrentValue(newValue)
  },
  { immediate: true }
)

// Initialize on mount
onMounted(() => {
  if (props.modelValue) {
    parseCurrentValue(props.modelValue)
  }
})
</script>