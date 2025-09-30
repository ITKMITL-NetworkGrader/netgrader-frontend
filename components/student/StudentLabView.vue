<template>
  <div class="student-lab-view">
    <!-- IP Calculation Loading Screen -->
    <div v-if="isCalculatingIPs" class="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div class="text-center space-y-6 px-4">
        <!-- Animated IP Calculation Text -->
        <div class="relative">
          <h2 class="text-4xl md:text-5xl font-bold text-foreground mb-2 tracking-tight">
            <span class="inline-block relative ip-calc-text">
              Calculating your IP addresses
              <span class="absolute inset-0 shine-effect"></span>
            </span>
          </h2>
          <p class="text-lg text-muted-foreground">
            Generating personalized network configuration...
          </p>
        </div>

        <!-- Loading Animation -->
        <div class="flex justify-center space-x-2 mt-8">
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>

        <!-- Progress Info -->
        <div class="mt-6 text-sm text-muted-foreground space-y-2">
          <div class="flex items-center justify-center space-x-2">
            <div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>{{ calculationStatus }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Lab Content (shown after calculation) -->
    <div v-else>
      <!-- Lab Header -->
      <div class="lab-header">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-foreground">{{ labData.name }}</h1>
            <p class="text-muted-foreground">{{ labData.description }}</p>
          </div>
          <div class="flex items-center space-x-2">
            <Badge variant="secondary">Student ID: {{ currentUser.studentId }}</Badge>
            <Badge variant="outline">{{ labData.courseCode }}</Badge>
          </div>
        </div>
      </div>

    <!-- Personalized Network Configuration -->
    <div class="personalized-config mb-6">
      <div class="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div class="flex items-center mb-3">
          <span class="text-primary">🌐</span>
          <h3 class="font-semibold text-primary ml-2">Your Personalized Network Configuration</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-card p-3 rounded border border-border">
            <div class="text-sm font-medium text-card-foreground mb-1">Your Networks</div>
            <div class="space-y-1 text-sm">
              <div>IPv4: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.ipv4_subnet }}</code></div>
              <div>IPv6: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.ipv6_subnet }}</code></div>
            </div>
          </div>

          <div class="bg-card p-3 rounded border border-border">
            <div class="text-sm font-medium text-card-foreground mb-1">VLANs</div>
            <div class="space-y-1 text-sm">
              <div>VLAN 1: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.vlan1 }}</code></div>
              <div>VLAN 2: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.vlan2 }}</code></div>
            </div>
          </div>

          <div class="bg-card p-3 rounded border border-border">
            <div class="text-sm font-medium text-card-foreground mb-1">External Interface</div>
            <div class="space-y-1 text-sm">
              <div>IPv4: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.router_external_ip }}</code></div>
              <div>IPv6: <code class="bg-muted px-1 rounded">{{ personalizedNetworks.router_external_ipv6 }}</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lab Instructions -->
    <div class="lab-instructions mb-6">
      <div class="bg-white border rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Lab Instructions</h3>
        <div class="prose max-w-none" v-html="renderedInstructions"></div>
      </div>
    </div>

    <!-- Device Configuration Reference -->
    <div class="device-config mb-6">
      <div class="bg-muted/50 border border-border rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4 text-foreground">Your Device Configuration Reference</h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Router Configuration -->
          <div v-for="device in personalizedDevices" :key="device.deviceId" class="device-card">
            <div class="bg-card border border-border rounded-lg p-4">
              <div class="flex items-center mb-3">
                <component :is="getDeviceIcon(device.type)" class="w-5 h-5 text-primary mr-2" />
                <h4 class="font-semibold text-card-foreground">{{ device.deviceId }}</h4>
                <Badge variant="outline" class="ml-2">{{ device.type }}</Badge>
              </div>

              <div class="space-y-3">
                <div v-for="variable in device.ipVariables" :key="variable.name" class="variable-config">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-card-foreground">{{ variable.displayName }}</span>
                    <div class="flex items-center space-x-2">
                      <code class="bg-primary/10 text-primary px-2 py-1 rounded text-sm border border-primary/20">
                        {{ variable.resolvedIP }}
                      </code>
                      <Badge
                        :variant="variable.type === 'student_generated' ? 'secondary' : 'outline'"
                        class="text-xs"
                      >
                        {{ variable.type === 'student_generated' ? 'Auto-generated' : 'Static' }}
                      </Badge>
                    </div>
                  </div>
                  <div v-if="variable.description" class="text-xs text-muted-foreground">
                    {{ variable.description }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lab Tasks -->
    <div class="lab-tasks">
      <div class="bg-card border border-border rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4 text-card-foreground">Lab Tasks</h3>

        <div class="space-y-4">
          <div v-for="part in labData.parts" :key="part.partId" class="part-section">
            <div class="border border-border rounded-lg p-4">
              <h4 class="font-semibold text-card-foreground mb-2">{{ part.title }}</h4>
              <p class="text-muted-foreground text-sm mb-3">{{ part.description }}</p>

              <div class="space-y-2">
                <div v-for="task in part.tasks" :key="task.taskId" class="task-item">
                  <div class="flex items-start space-x-3 p-3 bg-muted/50 rounded border border-border">
                    <div class="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20">
                      <span class="text-primary text-xs font-medium">{{ task.order }}</span>
                    </div>
                    <div class="flex-1">
                      <div class="font-medium text-card-foreground">{{ task.name }}</div>
                      <div v-if="task.description" class="text-sm text-muted-foreground mt-1">{{ task.description }}</div>

                      <!-- Show personalized parameters -->
                      <div v-if="task.personalizedParameters" class="mt-2">
                        <div class="text-xs font-medium text-card-foreground mb-1">Your Parameters:</div>
                        <div class="space-y-1">
                          <div v-for="(value, param) in task.personalizedParameters" :key="param" class="text-xs">
                            <span class="text-muted-foreground">{{ param }}:</span>
                            <code class="bg-accent text-accent-foreground px-1 rounded ml-1 border border-border">{{ value }}</code>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="text-sm text-muted-foreground">{{ task.points }} pts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Debug Information (Development Mode) -->
      <div v-if="showDebugInfo" class="debug-info mt-6">
        <div class="bg-card border border-border rounded-lg p-4">
          <h3 class="font-semibold mb-3 text-card-foreground">Debug Information</h3>
          <details>
            <summary class="cursor-pointer text-muted-foreground hover:text-card-foreground">Student IP Generation Details</summary>
            <pre class="mt-2 text-sm overflow-x-auto bg-muted p-3 rounded border border-border text-muted-foreground font-mono">{{ debugInfo }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { Router, Monitor, HardDrive } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import StudentIpGenerator from '@/utils/studentIpGenerator'

// IP Calculation State
const isCalculatingIPs = ref(true)
const calculationStatus = ref('Initializing calculation engine...')

interface Props {
  labData: {
    id: string
    name: string
    description: string
    courseCode: string
    instructions: string
    network: {
      devices: Array<{
        deviceId: string
        templateId: string
        deviceType: string
        ipVariables: Array<{
          name: string
          inputType: 'hostOffset' | 'fullIP' | 'studentGenerated'
          hostOffset?: number
          fullIP?: string
          isStudentGenerated?: boolean
        }>
      }>
    }
    parts: Array<{
      partId: string
      title: string
      description: string
      tasks: Array<{
        taskId: string
        name: string
        description: string
        order: number
        points: number
        parameters: Record<string, any>
      }>
    }>
  }
  currentUser: {
    studentId: string
    name: string
    email: string
  }
  showDebugInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false
})

// Initialize student IP generator with current user's student ID
const studentGenerator = computed(() => {
  return new StudentIpGenerator({
    student_id: props.currentUser.studentId,
    baseNetwork: "192.168.1.0", // This would come from lab configuration
    subnetMask: 24
  })
})

// Generate personalized networks for this student
const personalizedNetworks = computed(() => {
  const data = studentGenerator.value.generateStudentIpData()
  return {
    ipv4_subnet: data.generatedNetworks.ipv4_subnet,
    ipv6_subnet: data.generatedNetworks.ipv6_subnet,
    vlan1: data.calculatedValues.vlan1,
    vlan2: data.calculatedValues.vlan2,
    router_external_ip: data.commonIpAddresses.router_external_ip,
    router_external_ipv6: data.commonIpAddresses.router_external_ipv6
  }
})

// Generate personalized device configurations
const personalizedDevices = computed(() => {
  return props.labData.network.devices.map(device => {
    const resolvedVariables = device.ipVariables.map(variable => {
      let resolvedIP: string

      if (variable.inputType === 'studentGenerated') {
        // Use student generator to get personalized IP
        resolvedIP = generatePersonalizedIP(device.deviceType, variable.name)
      } else if (variable.inputType === 'fullIP') {
        resolvedIP = variable.fullIP || 'Not configured'
      } else {
        resolvedIP = 'Unknown configuration'
      }

      return {
        name: variable.name,
        displayName: `${device.deviceId}.${variable.name}`,
        resolvedIP,
        type: variable.inputType === 'studentGenerated' ? 'student_generated' : 'static',
        description: getVariableDescription(device.deviceType, variable.name)
      }
    })

    return {
      deviceId: device.deviceId,
      type: device.deviceType,
      ipVariables: resolvedVariables
    }
  })
})

// Process lab instructions and replace variables with personalized values
const renderedInstructions = computed(() => {
  let instructions = props.labData.instructions

  // Replace common variables in instructions
  instructions = instructions.replace(/\{student\.id\}/g, props.currentUser.studentId)
  instructions = instructions.replace(/\{student\.name\}/g, props.currentUser.name)

  // Replace IP variables
  personalizedDevices.value.forEach(device => {
    device.ipVariables.forEach(variable => {
      const placeholder = `{${variable.displayName}}`
      instructions = instructions.replace(new RegExp(placeholder, 'g'), variable.resolvedIP)
    })
  })

  // Replace network variables
  instructions = instructions.replace(/\{network\.ipv4\}/g, personalizedNetworks.value.ipv4_subnet)
  instructions = instructions.replace(/\{network\.vlan1\}/g, personalizedNetworks.value.vlan1.toString())
  instructions = instructions.replace(/\{network\.vlan2\}/g, personalizedNetworks.value.vlan2.toString())

  return instructions
})

// Generate personalized task parameters
const personalizedTasks = computed(() => {
  return props.labData.parts.map(part => ({
    ...part,
    tasks: part.tasks.map(task => {
      const personalizedParameters: Record<string, string> = {}

      // Process task parameters and resolve IP variables
      Object.entries(task.parameters).forEach(([key, value]) => {
        if (typeof value === 'string') {
          // Check if this parameter references an IP variable
          const deviceVarMatch = value.match(/^(\w+)\.(\w+)$/)
          if (deviceVarMatch) {
            const [, deviceId, variableName] = deviceVarMatch
            const device = personalizedDevices.value.find(d => d.deviceId === deviceId)
            const variable = device?.ipVariables.find(v => v.name === variableName)
            if (variable) {
              personalizedParameters[key] = variable.resolvedIP
            } else {
              personalizedParameters[key] = value
            }
          } else {
            personalizedParameters[key] = value
          }
        } else {
          personalizedParameters[key] = String(value)
        }
      })

      return {
        ...task,
        personalizedParameters: Object.keys(personalizedParameters).length > 0 ? personalizedParameters : null
      }
    })
  }))
})

// Debug information
const debugInfo = computed(() => {
  return {
    studentId: props.currentUser.studentId,
    generatedNetworks: personalizedNetworks.value,
    algorithmSteps: studentGenerator.value.generateDebugInfo().algorithmSteps,
    deviceConfigurations: personalizedDevices.value
  }
})

// Helper methods
function generatePersonalizedIP(deviceType: string, variableName: string): string {
  const data = studentGenerator.value.generateStudentIpData()

  const ipMap: Record<string, string> = {
    // Router IPs
    'loopback0': data.commonIpAddresses.router_external_ip,
    'gig0_0': data.commonIpAddresses.router_vlan1_ip,
    'gig0_1': data.commonIpAddresses.router_vlan2_ip,
    'fa0_0': data.commonIpAddresses.router_vlan1_ip,
    'fa0_1': data.commonIpAddresses.router_vlan2_ip,

    // Switch IPs
    'management_ip': data.commonIpAddresses.switch_management_ip,
    'mgmt': data.commonIpAddresses.switch_management_ip,

    // PC IPs
    'eth0': deviceType === 'pc' ? data.commonIpAddresses.pc1_ip : data.commonIpAddresses.pc1_ip,
    'ens2': deviceType === 'pc' ? data.commonIpAddresses.pc1_ip : data.commonIpAddresses.pc1_ip
  }

  return ipMap[variableName.toLowerCase()] || data.commonIpAddresses.router_vlan1_ip
}

function getVariableDescription(deviceType: string, variableName: string): string {
  const descriptions: Record<string, string> = {
    'loopback0': 'Router loopback interface',
    'gig0_0': 'Router GigabitEthernet 0/0 interface',
    'gig0_1': 'Router GigabitEthernet 0/1 interface',
    'management_ip': 'Switch management interface',
    'eth0': 'Primary network interface',
    'ens2': 'Network interface'
  }

  return descriptions[variableName.toLowerCase()] || `${deviceType} interface`
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'router':
      return Router
    case 'switch':
      return Monitor
    case 'pc':
      return HardDrive
    default:
      return Router
  }
}

// IP Calculation Simulation
async function calculateStudentIPs() {
  const steps = [
    { message: 'Fetching lab configuration...', duration: 400 },
    { message: 'Retrieving student information...', duration: 300 },
    { message: 'Processing management network...', duration: 500 },
    { message: 'Calculating VLAN assignments...', duration: 600 },
    { message: 'Generating device IP addresses...', duration: 700 },
    { message: 'Finalizing IP schema...', duration: 400 }
  ]

  for (const step of steps) {
    calculationStatus.value = step.message
    await new Promise(resolve => setTimeout(resolve, step.duration))
  }

  // Finish calculation
  isCalculatingIPs.value = false
}

// Lifecycle
onMounted(() => {
  // Start IP calculation when component mounts
  calculateStudentIPs()
})
</script>

<style scoped>
.student-lab-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

.lab-header {
  margin-bottom: 2rem;
}

.personalized-config {
  margin-bottom: 2rem;
}

.device-card {
  transition: all 0.2s ease;
}

.device-card:hover {
  transform: translateY(-1px);
}

.variable-config {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.variable-config:last-child {
  border-bottom: none;
}

.task-item {
  margin-bottom: 0.5rem;
}

.prose {
  line-height: 1.6;
}

.prose h1, .prose h2, .prose h3 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.prose p {
  margin-bottom: 1em;
}

.prose code {
  background-color: var(--color-muted);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.debug-info {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

/* IP Calculation Loading Animation */
.ip-calc-text {
  position: relative;
  display: inline-block;
  background: linear-gradient(
    90deg,
    var(--color-foreground) 0%,
    var(--color-foreground) 40%,
    var(--color-primary) 50%,
    var(--color-foreground) 60%,
    var(--color-foreground) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
}

@keyframes shine {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Shine effect overlay */
.shine-effect {
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shine 3s linear infinite;
}

/* Support for dark mode */
:global(.dark) .shine-effect {
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 200% 100%;
}
</style>