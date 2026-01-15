<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle2, 
  XCircle, 
  Server, 
  User, 
  FolderOpen, 
  Shield, 
  Copy,
  Check,
  RefreshCw,
  ExternalLink
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  labId: string
  labName?: string
  courseName?: string
  studentId: string
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

// Setup states
type SetupStep = 'connecting' | 'finding_user' | 'creating_project' | 'finding_pool' | 'adding_to_pool' | 'complete' | 'error'

const currentStep = ref<SetupStep>('connecting')
const error = ref<string | null>(null)
const isSettingUp = ref(false)

// Result data
const credentials = ref<{ username: string; password: string } | null>(null)
const loginUrl = ref<string | null>(null)
const projectUrl = ref<string | null>(null)
const projectId = ref<string | null>(null)
const projectName = ref<string | null>(null)

// Copy state
const copiedUsername = ref(false)
const copiedPassword = ref(false)

// localStorage key
const GNS3_PROJECT_STORAGE_KEY = 'netgrader_gns3_project'

// Step messages
const stepMessages: Record<SetupStep, string> = {
  connecting: 'Connecting to the GNS3 Lab Server...',
  finding_user: 'Finding your account...',
  creating_project: 'Creating your project...',
  finding_pool: 'Finding your resource pool...',
  adding_to_pool: 'Adding project to pool...',
  complete: 'Setup complete!',
  error: 'Setup failed',
}

const currentMessage = computed(() => stepMessages[currentStep.value])

const isLoading = computed(() => 
  isSettingUp.value && currentStep.value !== 'complete' && currentStep.value !== 'error'
)

// Copy functions
async function copyUsername() {
  if (!credentials.value) return
  try {
    await navigator.clipboard.writeText(credentials.value.username)
    copiedUsername.value = true
    toast.success('Username copied!')
    setTimeout(() => { copiedUsername.value = false }, 2000)
  } catch (e) {
    toast.error('Failed to copy username')
  }
}

async function copyPassword() {
  if (!credentials.value) return
  try {
    await navigator.clipboard.writeText(credentials.value.password)
    copiedPassword.value = true
    toast.success('Password copied!')
    setTimeout(() => { copiedPassword.value = false }, 2000)
  } catch (e) {
    toast.error('Failed to copy password')
  }
}

// Run setup
async function runSetup() {
  isSettingUp.value = true
  error.value = null
  currentStep.value = 'connecting'

  try {
    const response = await $fetch<{
      success: boolean
      credentials?: { username: string; password: string }
      loginUrl?: string
      projectUrl?: string
      projectId?: string
      projectName?: string
      error?: string
    }>(`${backendURL}/v0/student-lab/gns3/setup`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: {
        studentId: props.studentId,
        courseName: props.courseName || 'course',
        labName: props.labName || 'lab',
      },
      // Use a custom fetch handler to update progress
      onRequest() {
        currentStep.value = 'connecting'
      },
    })

    if (response.success && response.credentials && response.projectUrl) {
      // Simulate step progression for visual feedback
      currentStep.value = 'finding_user'
      await new Promise(r => setTimeout(r, 300))
      currentStep.value = 'creating_project'
      await new Promise(r => setTimeout(r, 300))
      currentStep.value = 'finding_pool'
      await new Promise(r => setTimeout(r, 300))
      currentStep.value = 'adding_to_pool'
      await new Promise(r => setTimeout(r, 300))
      
      credentials.value = response.credentials
      loginUrl.value = response.loginUrl || null
      projectUrl.value = response.projectUrl
      projectId.value = response.projectId || null
      projectName.value = response.projectName || null
      currentStep.value = 'complete'
    } else {
      throw new Error(response.error || 'Setup failed')
    }
  } catch (e: any) {
    console.error('GNS3 setup error:', e)
    error.value = e.message || 'Failed to setup GNS3 lab'
    currentStep.value = 'error'
  } finally {
    isSettingUp.value = false
  }
}

// Handle complete
function handleComplete() {
  // Save to localStorage (excluding serverIp and serverPort for security)
  if (projectName.value && projectId.value) {
    localStorage.setItem(GNS3_PROJECT_STORAGE_KEY, JSON.stringify({
      labId: props.labId,
      projectId: projectId.value,
      projectName: projectName.value,
      timestamp: Date.now()
    }))
  }

  emit('complete', {
    serverIp: '10.70.38.9',
    serverPort: 80,
    projectId: projectId.value || '',
    projectName: projectName.value || ''
  })
  
  emit('update:open', false)
}

// Reset state
function resetState() {
  currentStep.value = 'connecting'
  error.value = null
  isSettingUp.value = false
  credentials.value = null
  loginUrl.value = null
  projectUrl.value = null
  projectId.value = null
  projectName.value = null
  copiedUsername.value = false
  copiedPassword.value = false
}

// Watch for modal open to start setup
watch(() => props.open, (open) => {
  if (open) {
    resetState()
    // Start setup immediately
    runSetup()
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent 
      class="max-w-md" 
      :closable="false"
      @interact-outside.prevent
      @escape-key-down.prevent
    >
      <DialogHeader>
        <DialogTitle class="text-foreground flex items-center gap-2">
          <Server class="h-5 w-5 text-primary" />
          GNS3 Lab Setup
        </DialogTitle>
        <DialogDescription class="text-muted-foreground">
          Setting up your personal lab environment
        </DialogDescription>
      </DialogHeader>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-8">
        <!-- Progress Steps -->
        <div class="space-y-3 mb-6">
          <div class="flex items-center gap-3" :class="currentStep === 'connecting' ? 'text-primary' : 'text-muted-foreground'">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="currentStep === 'connecting' ? 'bg-primary/20' : 'bg-muted'">
              <Spinner v-if="currentStep === 'connecting'" class="h-4 w-4" />
              <CheckCircle2 v-else class="h-4 w-4" />
            </div>
            <span class="text-sm">Connecting to server</span>
          </div>

          <div class="flex items-center gap-3" :class="currentStep === 'finding_user' ? 'text-primary' : (currentStep === 'connecting' ? 'text-muted-foreground/50' : 'text-muted-foreground')">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="currentStep === 'finding_user' ? 'bg-primary/20' : 'bg-muted'">
              <Spinner v-if="currentStep === 'finding_user'" class="h-4 w-4" />
              <User v-else class="h-4 w-4" />
            </div>
            <span class="text-sm">Finding your account</span>
          </div>

          <div class="flex items-center gap-3" :class="currentStep === 'creating_project' ? 'text-primary' : (['connecting', 'finding_user'].includes(currentStep) ? 'text-muted-foreground/50' : 'text-muted-foreground')">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="currentStep === 'creating_project' ? 'bg-primary/20' : 'bg-muted'">
              <Spinner v-if="currentStep === 'creating_project'" class="h-4 w-4" />
              <FolderOpen v-else class="h-4 w-4" />
            </div>
            <span class="text-sm">Creating project</span>
          </div>

          <div class="flex items-center gap-3" :class="currentStep === 'finding_pool' ? 'text-primary' : (['connecting', 'finding_user', 'creating_project'].includes(currentStep) ? 'text-muted-foreground/50' : 'text-muted-foreground')">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="currentStep === 'finding_pool' ? 'bg-primary/20' : 'bg-muted'">
              <Spinner v-if="currentStep === 'finding_pool'" class="h-4 w-4" />
              <Server v-else class="h-4 w-4" />
            </div>
            <span class="text-sm">Finding resource pool</span>
          </div>

          <div class="flex items-center gap-3" :class="currentStep === 'adding_to_pool' ? 'text-primary' : (['connecting', 'finding_user', 'creating_project', 'finding_pool'].includes(currentStep) ? 'text-muted-foreground/50' : 'text-muted-foreground')">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="currentStep === 'adding_to_pool' ? 'bg-primary/20' : 'bg-muted'">
              <Spinner v-if="currentStep === 'adding_to_pool'" class="h-4 w-4" />
              <Server v-else class="h-4 w-4" />
            </div>
            <span class="text-sm">Adding project to pool</span>
          </div>
        </div>

        <p class="text-center text-sm text-muted-foreground">{{ currentMessage }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="currentStep === 'error'" class="py-6">
        <Alert variant="destructive" class="mb-4">
          <XCircle class="h-4 w-4" />
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

        <div class="flex justify-center">
          <Button @click="runSetup" variant="outline" class="gap-2">
            <RefreshCw class="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>

      <!-- Complete State -->
      <div v-else-if="currentStep === 'complete' && credentials" class="py-4 space-y-6">
        <!-- Success Banner -->
        <div class="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle2 class="h-5 w-5 text-green-600" />
          <span class="text-sm text-green-700 dark:text-green-400 font-medium">
            Your lab environment is ready!
          </span>
        </div>

        <!-- Credentials Section -->
        <div class="space-y-4">
          <h4 class="text-sm font-medium text-foreground">Login Credentials</h4>
          
          <div class="space-y-3">
            <!-- Username -->
            <div class="space-y-1.5">
              <Label class="text-xs text-muted-foreground">Username</Label>
              <div class="flex items-center gap-2">
                <Input 
                  :model-value="credentials.username" 
                  readonly 
                  class="font-mono text-sm bg-muted/50"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  @click="copyUsername"
                  class="shrink-0"
                >
                  <Check v-if="copiedUsername" class="h-4 w-4 text-green-600" />
                  <Copy v-else class="h-4 w-4" />
                </Button>
              </div>
            </div>

            <!-- Password -->
            <div class="space-y-1.5">
              <Label class="text-xs text-muted-foreground">Password</Label>
              <div class="flex items-center gap-2">
                <Input 
                  :model-value="credentials.password" 
                  readonly 
                  class="font-mono text-sm bg-muted/50"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Login URL -->
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-foreground">GNS3 Lab URL</h4>
          <a 
            :href="loginUrl || '#'" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-primary hover:bg-muted transition-colors cursor-pointer"
          >
            <ExternalLink class="h-4 w-4 shrink-0 mt-0.5" />
            <span class="break-all">{{ loginUrl }}</span>
          </a>
          <p class="text-xs text-muted-foreground">Login with your IT credentials. You will see your project in the list.</p>
        </div>

        <!-- Done Button -->
        <Button @click="handleComplete" class="w-full gap-2">
          <CheckCircle2 class="h-4 w-4" />
          Done and Ready
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
