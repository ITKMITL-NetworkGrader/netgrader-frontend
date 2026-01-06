<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Stepper, StepperItem, StepperTrigger, StepperTitle, StepperDescription } from '@/components/ui/stepper'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, XCircle, Server, FolderOpen, AlertTriangle, Cloud, Monitor } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  labId: string
  labName?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'complete', config: {
    serverIp: string
    serverPort: number
    projectId: string
    projectName: string
  }): void
}>()

const config = useRuntimeConfig()
const backendURL = config.public.backendurl

// Step control
const currentStep = ref(1)
const steps = [
  { step: 1, title: 'Server Type', description: 'Choose GNS3 server', icon: Server },
  { step: 2, title: 'Connect', description: 'Enter server details', icon: Monitor },
  { step: 3, title: 'Project', description: 'Select project', icon: FolderOpen },
]

// Step 1: Server type selection
type ServerType = 'self-hosted' | 'remote'
const serverType = ref<ServerType>('self-hosted')

// Step 2: Server connection
const serverIp = ref('')
const serverPort = ref(3080)
const isConnecting = ref(false)
const connectionSuccess = ref(false)
const connectionError = ref<string | null>(null)
const serverVersion = ref('')

// Step 3: Project selection
const availableProjects = ref<Array<{ name: string; project_id: string; status: string }>>([])
const selectedProjectId = ref<string>('')
const selectedProjectName = ref<string>('')
const isLoadingProjects = ref(false)

// localStorage key for saving GNS3 project name
const GNS3_PROJECT_STORAGE_KEY = 'netgrader_gns3_project'

// Computed
const canProceedStep1 = computed(() => serverType.value === 'self-hosted')
const canProceedStep2 = computed(() => connectionSuccess.value)
const canComplete = computed(() => !!selectedProjectId.value && !!selectedProjectName.value)

// Methods
async function handleTestConnection() {
  if (!serverIp.value) return
  
  isConnecting.value = true
  connectionError.value = null
  connectionSuccess.value = false
  
  try {
    const response = await $fetch<{
      success: boolean
      version?: string
      error?: string
    }>(`${backendURL}/v0/playground/gns3/test`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        serverIp: serverIp.value,
        serverPort: serverPort.value,
        requiresAuth: false,
        username: '',
        password: '',
      },
    })
    
    if (response.success) {
      connectionSuccess.value = true
      serverVersion.value = response.version || ''
      // Fetch available projects after successful connection
      await fetchAvailableProjects()
    } else {
      connectionError.value = response.error || 'Failed to connect to GNS3 server'
    }
  } catch (error: any) {
    console.error('GNS3 connection error:', error)
    connectionError.value = error.message || 'Failed to connect to GNS3 server'
  } finally {
    isConnecting.value = false
  }
}

async function fetchAvailableProjects() {
  isLoadingProjects.value = true
  try {
    const response = await $fetch<{
      success: boolean
      projects: Array<{
        name: string
        project_id: string
        status: string
      }>
    }>(`${backendURL}/v0/playground/gns3/list-projects`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        serverIp: serverIp.value,
        serverPort: serverPort.value,
        requiresAuth: false,
        username: '',
        password: '',
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
    selectedProjectName.value = project.name
  }
}

function handleNextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

function handlePreviousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function handleComplete() {
  // Store project name in localStorage for grading
  localStorage.setItem(GNS3_PROJECT_STORAGE_KEY, JSON.stringify({
    labId: props.labId,
    projectId: selectedProjectId.value,
    projectName: selectedProjectName.value,
    serverIp: serverIp.value,
    serverPort: serverPort.value,
    timestamp: Date.now()
  }))
  
  emit('complete', {
    serverIp: serverIp.value,
    serverPort: serverPort.value,
    projectId: selectedProjectId.value,
    projectName: selectedProjectName.value
  })
  
  emit('update:open', false)
}

function resetModal() {
  currentStep.value = 1
  serverType.value = 'self-hosted'
  serverIp.value = ''
  serverPort.value = 3080
  connectionSuccess.value = false
  connectionError.value = null
  serverVersion.value = ''
  availableProjects.value = []
  selectedProjectId.value = ''
  selectedProjectName.value = ''
}

// Watch for modal open/close to reset state
watch(() => props.open, (open) => {
  if (open) {
    // Check if we have a saved configuration
    const saved = localStorage.getItem(GNS3_PROJECT_STORAGE_KEY)
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.labId === props.labId) {
          serverIp.value = config.serverIp || ''
          serverPort.value = config.serverPort || 3080
          selectedProjectId.value = config.projectId || ''
          selectedProjectName.value = config.projectName || ''
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  } else {
    resetModal()
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-foreground">GNS3 Server Setup</DialogTitle>
        <DialogDescription class="text-muted-foreground">
          Connect to your GNS3 server to start the lab
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
      <Alert v-if="connectionError" variant="destructive" class="mb-4">
        <XCircle class="h-4 w-4" />
        <AlertDescription>{{ connectionError }}</AlertDescription>
      </Alert>

      <!-- Step 1: Server Type Selection -->
      <div v-if="currentStep === 1" class="space-y-4">
        <RadioGroup v-model="serverType" class="space-y-3">
          <!-- Self-hosted Option -->
          <div
            class="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors"
            :class="serverType === 'self-hosted' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'"
            @click="serverType = 'self-hosted'"
          >
            <RadioGroupItem value="self-hosted" id="self-hosted" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Label for="self-hosted" class="font-medium cursor-pointer">
                  Self-hosted GNS3 Server
                </Label>
                <Badge variant="default" class="text-xs">Recommended</Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                Connect to your own GNS3 server running on your machine or network
              </p>
            </div>
            <Monitor class="h-8 w-8 text-muted-foreground/50" />
          </div>

          <!-- Remote Option (Disabled) -->
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <div
                  class="flex items-start space-x-3 p-4 border rounded-lg cursor-not-allowed opacity-50 border-border"
                >
                  <RadioGroupItem value="remote" id="remote" disabled />
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <Label for="remote" class="font-medium text-muted-foreground">
                        Remote GNS3 Server
                      </Label>
                      <Badge variant="secondary" class="text-xs">Coming Soon</Badge>
                    </div>
                    <p class="text-sm text-muted-foreground mt-1">
                      Use a cloud-hosted GNS3 server provided by the platform
                    </p>
                  </div>
                  <Cloud class="h-8 w-8 text-muted-foreground/30" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remote GNS3 Server is coming soon!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </RadioGroup>

        <div class="flex justify-end">
          <Button @click="handleNextStep" :disabled="!canProceedStep1">
            Next
          </Button>
        </div>
      </div>

      <!-- Step 2: Server Connection -->
      <div v-if="currentStep === 2" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="serverIp">Server IP Address</Label>
            <Input 
              id="serverIp" 
              v-model="serverIp" 
              placeholder="192.168.1.100" 
              :disabled="connectionSuccess" 
            />
          </div>
          <div class="space-y-2">
            <Label for="serverPort">Port</Label>
            <Input 
              id="serverPort" 
              v-model.number="serverPort" 
              type="number" 
              placeholder="3080"
              :disabled="connectionSuccess" 
            />
          </div>
        </div>

        <!-- Connection Status -->
        <div v-if="connectionSuccess" class="flex items-center gap-2 p-3 bg-accent/20 rounded-md">
          <CheckCircle2 class="h-5 w-5 text-primary" />
          <span class="text-sm">
            Connected to GNS3 server v{{ serverVersion }}
          </span>
        </div>

        <div class="flex justify-between">
          <Button variant="outline" @click="handlePreviousStep">
            Back
          </Button>
          <div class="flex gap-2">
            <Button v-if="!connectionSuccess" @click="handleTestConnection" :disabled="!serverIp || isConnecting">
              <Spinner v-if="isConnecting" class="mr-2 h-4 w-4" />
              Test Connection
            </Button>
            <Button v-else @click="handleNextStep">
              Next
            </Button>
          </div>
        </div>
      </div>

      <!-- Step 3: Project Selection -->
      <div v-if="currentStep === 3" class="space-y-4">
        <div class="space-y-2">
          <Label>Select Your GNS3 Project</Label>
          <Select v-model="selectedProjectId" :disabled="isLoadingProjects" @update:model-value="handleProjectSelect">
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
            Select the project you will use for this lab
          </p>
        </div>

        <!-- Selected Project Info -->
        <div v-if="selectedProjectName" class="flex items-center gap-2 p-3 bg-accent/20 rounded-md">
          <CheckCircle2 class="h-5 w-5 text-primary" />
          <span class="text-sm">
            Selected: <strong>{{ selectedProjectName }}</strong>
          </span>
        </div>

        <!-- Warning about project name storage -->
        <Alert class="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle class="h-4 w-4 text-amber-600" />
          <AlertDescription class="text-sm text-amber-700 dark:text-amber-400">
            The selected project name will be stored and used for grading. Make sure to select the correct project.
          </AlertDescription>
        </Alert>

        <div class="flex justify-between">
          <Button variant="outline" @click="handlePreviousStep">
            Back
          </Button>
          <Button @click="handleComplete" :disabled="!canComplete">
            Start Lab
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
