<template>
  <Card class="max-w-4xl mx-auto">
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <Network class="w-5 h-5" />
        <span>IP Parameter Selection Demo - Issue #8</span>
      </CardTitle>
      <CardDescription>
        Demonstrates the new IP address parameter selection feature for task templates.
        When a task template parameter has type "ip_address", users can select from existing IP variables or enter custom IP addresses.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Sample Devices Display -->
      <div class="space-y-3">
        <Label class="text-sm font-medium">Sample Devices (Step 3 Configuration)</Label>
        <div class="grid gap-3">
          <Card v-for="device in sampleDevices" :key="device.deviceId" class="p-3 bg-muted/30">
            <div class="flex items-center justify-between mb-2">
              <Badge variant="outline">{{ device.deviceId }}</Badge>
              <Badge variant="secondary">{{ device.ipVariables.length }} IP Variables</Badge>
            </div>
            <div class="space-y-1">
              <div
                v-for="ipVar in device.ipVariables"
                :key="ipVar.name"
                class="text-xs bg-card p-2 rounded border"
              >
                <code class="font-mono">{{ device.deviceId }}.{{ ipVar.name }}</code>
                <span class="text-muted-foreground ml-2">{{ ipVar.inputType }}</span>
                <span v-if="ipVar.interface" class="text-muted-foreground ml-2">({{ ipVar.interface }})</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <!-- Task Template Simulation -->
      <div class="space-y-3">
        <Label class="text-sm font-medium">Task Template Parameter Simulation</Label>
        <Card class="p-4 bg-primary/10">
          <div class="space-y-2 mb-4">
            <h4 class="font-medium">Template: "ping_connectivity_test"</h4>
            <p class="text-sm text-muted-foreground">Parameter: "target_ip" (type: "ip_address", required: true)</p>
            <p class="text-sm text-muted-foreground">Description: "IP address to ping for connectivity test"</p>
          </div>

          <!-- This is where our IP Parameter Selector shows up -->
          <div class="space-y-2">
            <Label class="text-sm font-medium">
              target_ip <span class="text-destructive">*</span>
              <span class="text-muted-foreground font-normal">- IP address to ping for connectivity test</span>
            </Label>

            <IpParameterSelector
              v-model="selectedIpValue"
              param-name="target_ip"
              :devices="sampleDevices"
              :required="true"
              :has-error="hasError"
              :error-message="errorMessage"
              @validate="handleValidation"
            />
          </div>
        </Card>
      </div>

      <!-- Result Display -->
      <div class="space-y-3">
        <Label class="text-sm font-medium">Current Parameter Value</Label>
        <div class="p-3 bg-green-500/10 rounded border">
          <div class="flex items-center space-x-2">
            <Badge variant="outline" class="font-mono">target_ip</Badge>
            <Badge v-if="selectedIpValue" variant="default" class="font-mono">{{ selectedIpValue }}</Badge>
            <Badge v-else variant="secondary">No value selected</Badge>
          </div>
          <div class="mt-2 text-sm">
            <p v-if="selectedIpValue && selectedIpValue.includes('.')" class="text-muted-foreground">
              <strong>Type:</strong> {{ isValidIp(selectedIpValue) ? 'Custom IP Address' : 'IP Variable Reference' }}
            </p>
            <p v-if="selectedIpValue && !selectedIpValue.includes('.')" class="text-muted-foreground">
              <strong>Type:</strong> Invalid format
            </p>
          </div>
        </div>
      </div>

      <!-- Feature Summary -->
      <div class="space-y-3">
        <Label class="text-sm font-medium">Feature Summary</Label>
        <div class="grid gap-3 md:grid-cols-2">
          <Card class="p-3">
            <h4 class="font-medium text-green-600 mb-2 flex items-center">
              <CheckCircle class="w-4 h-4 mr-2" />
              IP Variable Selection
            </h4>
            <ul class="text-sm text-muted-foreground space-y-1">
              <li>• Select from existing IP variables</li>
              <li>• Format: "DeviceID.VariableName"</li>
              <li>• Validates against actual devices</li>
              <li>• Shows interface and type info</li>
            </ul>
          </Card>
          <Card class="p-3">
            <h4 class="font-medium text-blue-600 mb-2 flex items-center">
              <Globe class="w-4 h-4 mr-2" />
              Custom IP Address
            </h4>
            <ul class="text-sm text-muted-foreground space-y-1">
              <li>• Enter any valid IP address</li>
              <li>• Supports external destinations</li>
              <li>• Real-time validation</li>
              <li>• Perfect for Internet IPs</li>
            </ul>
          </Card>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Network, CheckCircle, Globe } from 'lucide-vue-next'
import IpParameterSelector from '@/components/wizard/IpParameterSelector.vue'
import type { Device } from '@/types/wizard'

// Sample devices data that would come from Step 3
const sampleDevices: Device[] = [
  {
    deviceId: 'router1',
    templateId: 'cisco-router-template',
    ipVariables: [
      {
        name: 'loopback0',
        inputType: 'studentVlan0',
        vlanIndex: 0,
        interfaceOffset: 1,
        interface: 'Loopback0'
      },
      {
        name: 'gig0_0',
        inputType: 'studentVlan0',
        vlanIndex: 0,
        interfaceOffset: 2,
        interface: 'GigabitEthernet0/0'
      },
      {
        name: 'mgmt_ip',
        inputType: 'studentManagement',
        isStudentGenerated: true,
        interface: 'Management0/0'
      }
    ]
  },
  {
    deviceId: 'router2',
    templateId: 'cisco-router-template',
    ipVariables: [
      {
        name: 'loopback0',
        inputType: 'studentVlan0',
        vlanIndex: 0,
        interfaceOffset: 1,
        interface: 'Loopback0'
      },
      {
        name: 'gig0_1',
        inputType: 'fullIP',
        fullIP: '10.0.0.20',
        interface: 'GigabitEthernet0/1'
      }
    ]
  },
  {
    deviceId: 'switch1',
    templateId: 'cisco-switch-template',
    ipVariables: [
      {
        name: 'vlan1',
        inputType: 'studentVlan0',
        vlanIndex: 0,
        interfaceOffset: 1,
        isStudentGenerated: true,
        interface: 'Vlan1'
      }
    ]
  }
]

// Component state
const selectedIpValue = ref<string>('')
const hasError = ref<boolean>(false)
const errorMessage = ref<string>('')

// Helper function
const isValidIp = (ip: string): boolean => {
  if (!ip) return false
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip.trim())
}

// Validation handler
const handleValidation = (paramName: string) => {
  if (!selectedIpValue.value) {
    hasError.value = true
    errorMessage.value = 'target_ip is required'
  } else {
    hasError.value = false
    errorMessage.value = ''
  }
}
</script>