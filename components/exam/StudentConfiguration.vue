<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-sm flex items-center">
        <User class="w-4 h-4 mr-2" />
        Your Personalized Configuration
      </CardTitle>
      <CardDescription>
        Unique network configuration generated for your student ID
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="isLoading" class="space-y-2">
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-4 w-1/2" />
      </div>
      
      <div v-else-if="error" class="text-sm text-destructive">
        {{ error }}
      </div>
      
      <div v-else-if="studentConfig" class="space-y-4">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Student ID:</span>
            <span class="font-mono ml-2">{{ studentConfig.studentId }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Generated:</span>
            <span class="ml-2">{{ formatDate(studentConfig.generatedAt) }}</span>
          </div>
        </div>
        
        <Separator />
        
        <!-- VLAN Configuration -->
        <div>
          <h4 class="font-medium text-sm mb-2">VLAN Configuration</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">VLAN 1:</span>
              <Badge variant="outline" class="ml-2 font-mono">{{ studentConfig.vlan1 }}</Badge>
            </div>
            <div>
              <span class="text-muted-foreground">VLAN 2:</span>
              <Badge variant="outline" class="ml-2 font-mono">{{ studentConfig.vlan2 }}</Badge>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <!-- Network Configuration -->
        <div>
          <h4 class="font-medium text-sm mb-2">Network Configuration</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">IPv4 Subnet:</span>
              <span class="font-mono">{{ studentConfig.ipv4Subnet }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">IPv6 Subnet:</span>
              <span class="font-mono">{{ studentConfig.ipv6Subnet }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Gateway IPv4:</span>
              <span class="font-mono">{{ networkDetails.gateway_ipv4 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Network Address:</span>
              <span class="font-mono">{{ networkDetails.network_address }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Broadcast:</span>
              <span class="font-mono">{{ networkDetails.broadcast_address }}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <!-- Interface Configuration -->
        <div>
          <h4 class="font-medium text-sm mb-2">Interface Configuration</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Out Interface IPv4:</span>
              <span class="font-mono">{{ studentConfig.outInterfaceIpv4 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Out Interface IPv6:</span>
              <span class="font-mono">{{ studentConfig.outInterfaceIpv6 }}</span>
            </div>
          </div>
        </div>
        
        <!-- Validation Status -->
        <div v-if="validationResult" class="mt-4">
          <div class="flex items-center space-x-2">
            <CheckCircle v-if="validationResult.isValid" class="w-4 h-4 text-green-600" />
            <AlertCircle v-else class="w-4 h-4 text-red-600" />
            <span class="text-sm font-medium">
              {{ validationResult.isValid ? 'Configuration Valid' : 'Configuration Issues' }}
            </span>
          </div>
          
          <div v-if="!validationResult.isValid && validationResult.errors.length > 0" class="mt-2">
            <Alert variant="destructive">
              <AlertDescription>
                <ul class="list-disc list-inside text-sm">
                  <li v-for="error in validationResult.errors" :key="error">{{ error }}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
        
        <!-- Debug Info (only in development) -->
        <div v-if="showDebugInfo" class="mt-4">
          <details class="text-sm">
            <summary class="cursor-pointer text-muted-foreground hover:text-foreground flex items-center space-x-2">
              <ChevronRight class="w-4 h-4" />
              <span>Debug Information</span>
            </summary>
            <div class="mt-2 bg-muted p-3 rounded-lg">
              <pre class="text-xs overflow-x-auto">{{ JSON.stringify(debugInfo, null, 2) }}</pre>
            </div>
          </details>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { User, CheckCircle, AlertCircle, ChevronRight } from 'lucide-vue-next'
import { useVariableResolver } from '@/composables/useVariableResolver'
import type { ExamConfiguration } from '@/types/lab'

interface Props {
  studentConfig: ExamConfiguration | null
  isLoading?: boolean
  error?: string | null
  showDebugInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null,
  showDebugInfo: false
})

const { 
  validatePersonalizedVariableResolution, 
  generatePersonalizedVariablePreview,
  resolveExamVariables 
} = useVariableResolver()

// Computed properties for network details
const networkDetails = computed(() => {
  if (!props.studentConfig?.generatedAnswers?.networking?.ipv4) {
    return {}
  }
  
  const { resolvedVariables } = resolveExamVariables('', props.studentConfig)
  return resolvedVariables
})

// Validation of the student configuration
const validationResult = computed(() => {
  if (!props.studentConfig) return null
  
  // Validate basic template with common variables
  const testTemplate = `
    Student ID: {student_id}
    VLAN 1: {vlan1}
    VLAN 2: {vlan2}
    IPv4 Subnet: {ipv4_subnet}
    IPv6 Subnet: {ipv6_subnet}
    Gateway: {gateway_ipv4}
    Network: {network_address}
    Broadcast: {broadcast_address}
  `
  
  const expectedVariables = [
    'student_id', 'vlan1', 'vlan2', 'ipv4_subnet', 'ipv6_subnet',
    'gateway_ipv4', 'network_address', 'broadcast_address'
  ]
  
  return validatePersonalizedVariableResolution(
    testTemplate,
    props.studentConfig,
    expectedVariables
  )
})

// Debug information
const debugInfo = computed(() => {
  if (!props.studentConfig) return null
  
  return generatePersonalizedVariablePreview(props.studentConfig)
})

// Format date helper
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString()
}

// Watch for configuration changes and log validation results
watch(() => props.studentConfig, (newConfig) => {
  if (newConfig && validationResult.value) {
    console.log('Student configuration validation:', {
      studentId: newConfig.studentId,
      isValid: validationResult.value.isValid,
      errors: validationResult.value.errors,
      resolvedVariableCount: Object.keys(validationResult.value.resolvedVariables).length
    })
  }
}, { immediate: true })
</script>