<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Stepper, StepperItem, StepperTrigger, StepperTitle, StepperDescription } from '@/components/ui/stepper'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, XCircle, Server, FolderPlus, Settings, RotateCcw } from 'lucide-vue-next'
import { usePlayground, type GNS3Config, type LabDevice, type DeviceMapping, type DeviceInterfaceMapping } from '@/composables/usePlayground'

const props = defineProps<{
  open: boolean
  labId: string
  startAtStep?: number  // Allow starting at specific step (for reconfiguring)
  vlanConfig?: Array<{ vlanId?: number; baseNetwork?: string }>
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'complete', config: {
    gns3Config: GNS3Config
    deviceMappings: DeviceMapping[]
    customIpMappings: Record<string, string>
    customVlanMappings: Record<string, number>
  }): void
  (e: 'reset'): void
}>()

const {
  state,
  isLoading,
  isConfigured,
  testConnectivity,
  createProject,
  getLabDevices,
  reset
} = usePlayground()

// Step control
const currentStep = ref(1)
const steps = [
  { step: 1, title: 'GNS3 Server', description: 'Connect to server', icon: Server },
  { step: 2, title: 'Project', description: 'Create/select project', icon: FolderPlus },
  { step: 3, title: 'Configuration', description: 'Map devices', icon: Settings },
]

// Step 1: GNS3 Server Config
const serverIp = ref('')
const serverPort = ref(3080)
const requiresAuth = ref(false)
const username = ref('')
const password = ref('')
const connectionSuccess = ref(false)
const serverVersion = ref('')

// Step 2: Project
const projectName = ref('')
const projectCreated = ref(false)
const isExistingProject = ref(false)
const availableProjects = ref<Array<{ name: string; project_id: string; status: string }>>([]
)
const isLoadingProjects = ref(false)
const selectedProjectId = ref<string>('')

// Step 3: Device & Network Config (lab-level, interface-level IPs)
const labDevices = ref<LabDevice[]>([])
// { deviceId: { gns3NodeName: string, interfaces: { [interfaceName]: ipAddress } } }
const localDeviceMappings = ref<Record<string, { gns3NodeName: string; interfaces: Record<string, string> }>>({})
const localVlanMappings = ref<Record<string, number>>({})

// Computed
const canProceedStep1 = computed(() => connectionSuccess.value)
const canProceedStep2 = computed(() => projectCreated.value)
const canComplete = computed(() => {
  // All devices must have GNS3 node name and all interfaces must have IPs
  return labDevices.value.every(device => {
    const mapping = localDeviceMappings.value[device.deviceId]
    if (!mapping?.gns3NodeName) return false
    // All interfaces must have IP addresses
    return device.interfaces.every(iface => mapping.interfaces[iface.name]?.trim())
  })
})

// Watchers
watch(() => props.open, async (open) => {
  if (open && props.labId) {
    // If already configured and startAtStep is provided, start there
    if (props.startAtStep && isConfigured.value) {
      currentStep.value = props.startAtStep
      // Restore saved config if available
      if (state.value.gns3Config) {
        serverIp.value = state.value.gns3Config.serverIp
        serverPort.value = state.value.gns3Config.serverPort
        requiresAuth.value = state.value.gns3Config.requiresAuth
        username.value = state.value.gns3Config.username || ''
        password.value = state.value.gns3Config.password || ''
        projectName.value = state.value.gns3Config.projectName || ''
        connectionSuccess.value = true
        projectCreated.value = true
      }
    }
    // Always load lab devices when modal opens
    await loadLabDevices()
  }
})

onMounted(async () => {
  if (props.open && props.labId) {
    await loadLabDevices()
  }
})

// Methods
async function handleTestConnection() {
  const result = await testConnectivity({
    serverIp: serverIp.value,
    serverPort: serverPort.value,
    requiresAuth: requiresAuth.value,
    username: username.value,
    password: password.value,
  })

  if (result.success) {
    connectionSuccess.value = true
    serverVersion.value = result.version || ''
    // Fetch available projects after successful connection
    await fetchAvailableProjects()
  } else {
    connectionSuccess.value = false
  }
}

async function fetchAvailableProjects() {
  isLoadingProjects.value = true
  try {
    const config = useRuntimeConfig()
    const response = await $fetch<{
      success: boolean
      projects: Array<{
        name: string
        project_id: string
        status: string
      }>
    }>(`${config.public.backendurl}/v0/playground/gns3/list-projects`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        serverIp: serverIp.value,
        serverPort: serverPort.value,
        requiresAuth: requiresAuth.value,
        username: username.value,
        password: password.value,
      },
    })
    
    if (response.success && response.projects) {
      availableProjects.value = response.projects
    }
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  } finally {
    isLoadingProjects.value = false
  }
}

function handleProjectSelect(projectId: any) {
  if (typeof projectId !== 'string' || !projectId) return
  selectedProjectId.value = projectId
  const project = availableProjects.value.find(p => p.project_id === projectId)
  if (project) {
    projectName.value = project.name
  }
}

async function handleCreateProject() {
  const result = await createProject(projectName.value)
  if (result.success) {
    projectCreated.value = true
    isExistingProject.value = result.isExisting || false
    await loadLabDevices()
  }
}

async function loadLabDevices() {
  const result = await getLabDevices(props.labId)
  if (result.success && result.devices) {
    labDevices.value = result.devices
    // Initialize local mappings with interface-level structure
    result.devices.forEach(device => {
      if (!localDeviceMappings.value[device.deviceId]) {
        const interfaces: Record<string, string> = {}
        device.interfaces.forEach(iface => {
          interfaces[iface.name] = ''
        })
        localDeviceMappings.value[device.deviceId] = {
          gns3NodeName: '',
          interfaces,
        }
      }
    })
  }
}

function handlePreviousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function handleNextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

function handleComplete() {
  // Build device mappings array with interface-level IPs
  const deviceMappingsArray: DeviceMapping[] = labDevices.value.map(device => {
    const mapping = localDeviceMappings.value[device.deviceId]
    const interfaces: DeviceInterfaceMapping[] = device.interfaces.map(iface => ({
      name: iface.name,
      interfaceName: iface.interfaceName,
      ipAddress: mapping?.interfaces[iface.name] || '',
    }))

    return {
      deviceId: device.deviceId,
      displayName: device.displayName,
      templateId: device.templateId,
      gns3NodeName: mapping?.gns3NodeName || '',
      interfaces,
    }
  })

  // Build flat IP mappings for grading (deviceId.interfaceName -> IP)
  const flatIpMappings: Record<string, string> = {}
  deviceMappingsArray.forEach(dm => {
    dm.interfaces.forEach(iface => {
      flatIpMappings[`${dm.deviceId}.${iface.name}`] = iface.ipAddress
    })
  })

  emit('complete', {
    gns3Config: {
      serverIp: serverIp.value,
      serverPort: serverPort.value,
      projectId: state.value.gns3Config?.projectId,
      projectName: projectName.value,
      requiresAuth: requiresAuth.value,
      username: username.value,
      password: password.value,
    },
    deviceMappings: deviceMappingsArray,
    customIpMappings: flatIpMappings,
    customVlanMappings: localVlanMappings.value,
  })

  emit('update:open', false)
}

function handleReset() {
  currentStep.value = 1
  serverIp.value = ''
  serverPort.value = 3080
  requiresAuth.value = false
  username.value = ''
  password.value = ''
  connectionSuccess.value = false
  serverVersion.value = ''
  projectName.value = ''
  projectCreated.value = false
  isExistingProject.value = false
  availableProjects.value = []
  selectedProjectId.value = ''
  labDevices.value = []
  localDeviceMappings.value = {}
  localVlanMappings.value = {}
  reset()
  emit('reset')
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-foreground">Lab Playground Setup</DialogTitle>
        <DialogDescription class="text-muted-foreground">
          Configure GNS3 server and map all lab devices for testing
        </DialogDescription>
      </DialogHeader>

      <!-- Stepper -->
      <Stepper v-model="currentStep" class="my-4">
        <StepperItem v-for="step in steps" :key="step.step" :step="step.step" class="flex-1">
          <StepperTrigger>
            <component :is="step.icon" class="w-4 h-4" />
          </StepperTrigger>
          <div class="flex flex-col gap-0.5">
            <StepperTitle>{{ step.title }}</StepperTitle>
            <StepperDescription>{{ step.description }}</StepperDescription>
          </div>
        </StepperItem>
      </Stepper>

      <!-- Error Alert -->
      <Alert v-if="state.error" variant="destructive" class="mb-4">
        <XCircle class="h-4 w-4" />
        <AlertDescription>{{ state.error }}</AlertDescription>
      </Alert>

      <!-- Step 1: GNS3 Server Configuration -->
      <div v-if="currentStep === 1" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="serverIp">Server IP Address</Label>
            <Input id="serverIp" v-model="serverIp" placeholder="10.0.0.1" :disabled="connectionSuccess" />
          </div>
          <div class="space-y-2">
            <Label for="serverPort">Port</Label>
            <Input id="serverPort" v-model.number="serverPort" type="number" placeholder="3080"
              :disabled="connectionSuccess" />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Checkbox id="requiresAuth" v-model="requiresAuth" :disabled="connectionSuccess" />
          <Label for="requiresAuth" class="cursor-pointer">
            Server requires authentication
          </Label>
        </div>

        <div v-if="requiresAuth" class="grid grid-cols-2 gap-4 pl-6 border-l-2 border-muted">
          <div class="space-y-2">
            <Label for="username">Username</Label>
            <Input id="username" v-model="username" placeholder="admin" :disabled="connectionSuccess" />
          </div>
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input id="password" v-model="password" type="password" placeholder="••••••••"
              :disabled="connectionSuccess" />
          </div>
        </div>

        <!-- Connection Status -->
        <div v-if="connectionSuccess" class="flex items-center gap-2 p-3 bg-accent/20 rounded-md">
          <CheckCircle2 class="h-5 w-5 text-primary" />
          <span class="text-sm">
            Connected to GNS3 server v{{ serverVersion }}
          </span>
        </div>

        <div class="flex justify-end gap-2">
          <Button v-if="!connectionSuccess" @click="handleTestConnection" :disabled="!serverIp || isLoading">
            <Spinner v-if="isLoading" class="mr-2 h-4 w-4" />
            Test Connection
          </Button>
          <Button v-else @click="handleNextStep">
            Next
          </Button>
        </div>
      </div>

      <!-- Step 2: Project Creation/Selection -->
      <div v-if="currentStep === 2" class="space-y-4">
        <!-- Project Selector -->
        <div class="space-y-2">
          <Label>Select Existing Project</Label>
          <Select v-model="selectedProjectId" :disabled="projectCreated || isLoadingProjects" @update:model-value="handleProjectSelect">
            <SelectTrigger class="w-full">
              <Spinner v-if="isLoadingProjects" class="mr-2 h-4 w-4" />
              <SelectValue :placeholder="isLoadingProjects ? 'Loading projects...' : 'Select a project'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="project in availableProjects" :key="project.project_id" :value="project.project_id">
                <div class="flex items-center gap-2">
                  <span>{{ project.name }}</span>
                  <span class="text-xs text-muted-foreground">({{ project.status }})</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            Select an existing project from the GNS3 server
          </p>
        </div>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-border" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-background px-2 text-muted-foreground">or create new</span>
          </div>
        </div>

        <!-- New Project Name -->
        <div class="space-y-2">
          <Label for="projectName">New Project Name</Label>
          <Input 
            id="projectName" 
            v-model="projectName" 
            placeholder="my-test-lab" 
            :disabled="projectCreated || !!selectedProjectId" 
          />
          <p class="text-xs text-muted-foreground">
            Enter a name to create a new project
          </p>
        </div>

        <!-- Project Created Status -->
        <div v-if="projectCreated" class="flex items-center gap-2 p-3 bg-accent/20 rounded-md">
          <CheckCircle2 class="h-5 w-5 text-primary" />
          <span class="text-sm">
            {{ isExistingProject ? 'Using existing' : 'Created' }} project "{{ projectName }}"
          </span>
        </div>

        <div class="flex justify-between">
          <Button variant="outline" @click="handlePreviousStep">
            Back
          </Button>
          <div class="flex gap-2">
            <Button v-if="!projectCreated" @click="handleCreateProject" :disabled="!projectName || isLoading">
              <Spinner v-if="isLoading" class="mr-2 h-4 w-4" />
              {{ selectedProjectId ? 'Use Project' : 'Create Project' }}
            </Button>
            <Button v-else @click="handleNextStep">
              Next
            </Button>
          </div>
        </div>
      </div>

      <!-- Step 3: Device & Interface Mapping -->
      <div v-if="currentStep === 3" class="space-y-4">
        <div v-if="labDevices.length === 0" class="text-center py-4 text-muted-foreground">
          No devices configured for this lab
        </div>

        <div v-else class="space-y-4">
          <h4 class="font-medium text-sm text-foreground">Device & Interface Mapping</h4>
          <p class="text-xs text-muted-foreground">
            Map each lab device to a GNS3 node and configure IP addresses for all interfaces.
          </p>

          <div v-for="device in labDevices" :key="device.deviceId"
            class="p-4 border border-border rounded-md space-y-3">
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ device.displayName }}</div>
              <div class="text-xs text-muted-foreground">{{ device.interfaces.length }} interface(s)</div>
            </div>

            <!-- GNS3 Node Name -->
            <div class="space-y-1">
              <Label :for="`node-${device.deviceId}`" class="text-xs font-medium">
                GNS3 Node Name
              </Label>
              <Input :id="`node-${device.deviceId}`" v-model="localDeviceMappings[device.deviceId].gns3NodeName"
                placeholder="e.g., R1, SW1" class="max-w-xs" />
            </div>

            <!-- Interface IP Mappings -->
            <div class="pl-3 border-l-2 border-muted space-y-2">
              <div class="text-xs text-muted-foreground font-medium">Interface IP Addresses</div>
              <div class="grid gap-2">
                <div v-for="iface in device.interfaces" :key="iface.name" class="grid grid-cols-2 gap-2 items-center">
                  <Label :for="`ip-${device.deviceId}-${iface.name}`" class="text-xs truncate"
                    :title="iface.interfaceName">
                    {{ iface.interfaceName || iface.name }}
                  </Label>
                  <Input :id="`ip-${device.deviceId}-${iface.name}`"
                    v-model="localDeviceMappings[device.deviceId].interfaces[iface.name]" placeholder="192.168.1.1"
                    class="h-8 text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- VLAN Configuration -->
        <div v-if="vlanConfig && vlanConfig.length > 0" class="space-y-3">
          <h4 class="font-medium text-sm text-foreground">Custom VLAN IDs</h4>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="(_, idx) in vlanConfig" :key="idx" class="space-y-1">
              <Label :for="`vlan-${idx}`" class="text-xs">VLAN {{ idx }}</Label>
              <Input :id="`vlan-${idx}`" v-model.number="localVlanMappings[`vlan${idx}`]" type="number"
                placeholder="100" />
            </div>
          </div>
        </div>

        <div class="flex justify-between pt-4">
          <div class="flex gap-2">
            <Button variant="outline" @click="handlePreviousStep">
              Back
            </Button>
            <Button variant="ghost" @click="handleReset" class="text-destructive hover:text-destructive">
              <RotateCcw class="mr-2 h-4 w-4" />
              Reset & Disconnect
            </Button>
          </div>
          <Button @click="handleComplete" :disabled="!canComplete">
            Complete Setup
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
