<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Base Network Input -->
      <div class="space-y-2">
        <Label for="base-network">Base Network *</Label>
        <div class="relative">
          <Input
            id="base-network"
            v-model="localConfig.baseNetwork"
            placeholder="e.g., 10.30.6.0, 192.168.1.0"
            :class="{ 
              'border-destructive': validationResult && !validationResult.isValid,
              'border-green-500': validationResult && validationResult.isValid 
            }"
          />
          <Icon 
            v-if="validationResult && validationResult.isValid" 
            name="lucide:check-circle" 
            class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" 
          />
          <Icon 
            v-else-if="validationResult && !validationResult.isValid" 
            name="lucide:x-circle" 
            class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" 
          />
        </div>
        <p class="text-xs text-muted-foreground">
          Enter the network address (not a host address)
        </p>
      </div>

      <!-- Subnet Mask -->
      <div class="space-y-2">
        <Label for="subnet-mask">Subnet Mask *</Label>
        <Select v-model:model-value="subnetMaskString">
          <SelectTrigger id="subnet-mask">
            <SelectValue placeholder="Select subnet mask" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Common Subnet Masks</SelectLabel>
              <SelectItem value="24">/24 - 255.255.255.0 (254 hosts)</SelectItem>
              <SelectItem value="25">/25 - 255.255.255.128 (126 hosts)</SelectItem>
              <SelectItem value="26">/26 - 255.255.255.192 (62 hosts)</SelectItem>
              <SelectItem value="27">/27 - 255.255.255.224 (30 hosts)</SelectItem>
              <SelectItem value="28">/28 - 255.255.255.240 (14 hosts)</SelectItem>
            </SelectGroup>
            <Separator />
            <SelectGroup>
              <SelectLabel>Larger Networks</SelectLabel>
              <SelectItem value="16">/16 - 255.255.0.0 (65534 hosts)</SelectItem>
              <SelectItem value="20">/20 - 255.255.240.0 (4094 hosts)</SelectItem>
              <SelectItem value="22">/22 - 255.255.252.0 (1022 hosts)</SelectItem>
              <SelectItem value="23">/23 - 255.255.254.0 (510 hosts)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Gateway Configuration -->
    <div class="space-y-2">
      <Label for="gateway">Gateway (Optional)</Label>
      <div class="flex space-x-2">
        <Input
          id="gateway"
          v-model="localConfig.gateway"
          placeholder="e.g., 10.30.6.1"
          :class="{ 'border-destructive': gatewayError }"
        />
        <Button 
          @click="suggestGateway" 
          variant="outline"
          size="sm"
          :disabled="!canSuggestGateway"
        >
          <Icon name="lucide:lightbulb" class="w-4 h-4 mr-1" />
          Suggest
        </Button>
      </div>
      <p v-if="gatewayError" class="text-xs text-destructive">{{ gatewayError }}</p>
      <p v-else class="text-xs text-muted-foreground">
        Typically the first available IP address in the network
      </p>
    </div>

    <!-- Description -->
    <div class="space-y-2">
      <Label for="network-description">Description (Optional)</Label>
      <Textarea
        id="network-description"
        v-model="localConfig.description"
        placeholder="Describe this network configuration..."
        rows="2"
      />
    </div>

    <!-- Network Information Display -->
    <div v-if="networkInfo" class="rounded-lg bg-muted/50 p-4">
      <h4 class="text-sm font-medium mb-3 flex items-center">
        <Icon name="lucide:info" class="w-4 h-4 mr-2" />
        Network Information
      </h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Network:</span>
            <code class="bg-background px-2 py-1 rounded">{{ networkInfo.network }}</code>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Broadcast:</span>
            <code class="bg-background px-2 py-1 rounded">{{ networkInfo.broadcast }}</code>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Subnet Mask:</span>
            <code class="bg-background px-2 py-1 rounded">{{ networkInfo.subnetMask }}</code>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-muted-foreground">First Host:</span>
            <code class="bg-background px-2 py-1 rounded">{{ networkInfo.firstHost }}</code>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Last Host:</span>
            <code class="bg-background px-2 py-1 rounded">{{ networkInfo.lastHost }}</code>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Available Hosts:</span>
            <Badge variant="secondary">{{ networkInfo.totalHosts }}</Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Errors -->
    <Alert v-if="validationResult && !validationResult.isValid" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Network Configuration Errors</AlertTitle>
      <AlertDescription>
        <ul class="list-disc list-inside space-y-1 mt-2">
          <li v-for="error in validationResult.errors" :key="error">
            {{ error }}
          </li>
        </ul>
      </AlertDescription>
    </Alert>

    <!-- Validation Warnings -->
    <Alert v-if="validationResult && validationResult.isValid && validationResult.warnings?.length" variant="default">
      <Icon name="lucide:triangle-alert" class="h-4 w-4" />
      <AlertTitle>Network Configuration Warnings</AlertTitle>
      <AlertDescription>
        <ul class="list-disc list-inside space-y-1 mt-2">
          <li v-for="warning in validationResult.warnings" :key="warning">
            {{ warning }}
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle } from 'lucide-vue-next'
import type { NetworkConfig, NetworkValidationResult, NetworkInfo } from '@/types/ipSchema'

// Props
interface Props {
  modelValue: NetworkConfig
  validationResult?: NetworkValidationResult | null
}

const props = withDefaults(defineProps<Props>(), {
  validationResult: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: NetworkConfig]
}>()

// Composables
const { validateGateway, suggestGateway: autoSuggestGateway } = useNetworkValidation()

// Local reactive state
const localConfig = ref<NetworkConfig>({ ...props.modelValue })

// Computed
const subnetMaskString = computed({
  get: () => localConfig.value.subnetMask.toString(),
  set: (value: string) => {
    localConfig.value.subnetMask = parseInt(value)
  }
})

const networkInfo = computed((): NetworkInfo | null => {
  return props.validationResult?.network_info || null
})

const canSuggestGateway = computed(() => {
  return props.validationResult?.isValid && networkInfo.value
})

const gatewayError = computed(() => {
  if (!localConfig.value.gateway) return null
  
  if (!canSuggestGateway.value) {
    return 'Fix network configuration first'
  }
  
  const validation = validateGateway(
    localConfig.value.gateway,
    localConfig.value.baseNetwork,
    localConfig.value.subnetMask
  )
  
  return validation.isValid ? null : validation.error
})

// Methods
const suggestGateway = () => {
  if (canSuggestGateway.value && networkInfo.value) {
    localConfig.value.gateway = autoSuggestGateway(
      localConfig.value.baseNetwork,
      localConfig.value.subnetMask
    )
  }
}

// Watch for changes and emit
watch(localConfig, (newValue) => {
  emit('update:modelValue', { ...newValue })
}, { deep: true })

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (JSON.stringify(newValue) !== JSON.stringify(localConfig.value)) {
    localConfig.value = { ...newValue }
  }
}, { deep: true })
</script>