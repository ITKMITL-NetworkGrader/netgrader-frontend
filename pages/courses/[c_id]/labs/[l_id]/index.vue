<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Home,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  ArrowLeft,
  CheckCircle,
  Settings,
  Users,
  Award,
  Target,
  Timer,
  FileText,
  Server,
  TestTube,
  RotateCcw,
  Info
} from 'lucide-vue-next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCourseLabs, type Lab, type LabPart, type LabTask, type TaskGroup } from '@/composables/useCourseLabs'
import { useCourse } from '@/composables/useCourse'
import { useSubmissions } from '@/composables/useSubmissions'
import GradingProgress from '@/components/GradingProgress.vue'
import LabCompletionPrompt from '@/components/student/LabCompletionPrompt.vue'
import LabResultsModal from '@/components/student/LabResultsModal.vue'
import LabTimer from '@/components/student/LabTimer.vue'
import type { ISubmission } from '@/types/submission'

// Configure marked for safe HTML rendering
marked.setOptions({
  gfm: true,
  breaks: true,
})

const route = useRoute()
const router = useRouter()

// Route params
const courseId = computed(() => route.params.c_id as string)
const labId = computed(() => route.params.l_id as string)

// Composables
const { currentCourse, fetchCourse } = useCourse()
const {
  currentLab,
  currentLabParts,
  isLoading,
  isLoadingParts,
  error,
  fetchLabById,
  fetchLabParts,
  formatLabDate
} = useCourseLabs()

const {
  createSubmission,
  getGradingStatus,
  toggleProgressDetails,
  fetchStudentSubmissions,
  checkLabCompletionStatus
} = useSubmissions()

// State Management
const currentPartIndex = ref(0)
const completedParts = ref<Set<string>>(new Set())
const completedTasks = ref<Record<string, Set<string>>>(new Map()) // partId -> Set of taskIds
const isSubmittingPart = ref(false)
const progress = ref<Record<string, number>>({}) // partId -> percentage

// IP Loading and Completion State
const isLoadingIPs = ref(true)
const ipLoadingStatus = ref('Gathering your IP addresses...')
const backendIpMappings = ref<Record<string, { ip: string; vlan: number | null }>>({})
const backendVlanMappings = ref<Record<string, number>>({})
const showCompletionPrompt = ref(false)
const showResultsModal = ref(false)
const timerExpiredModalMode = ref<'results' | 'timer_expired' | 'unavailable'>('results')
const studentSubmissions = ref<ISubmission[]>([])
const completionStatus = ref({
  isFullyCompleted: false,
  completedParts: [] as string[],
  totalPartsCompleted: 0,
  totalParts: 0,
  allPartsPassedWithFullPoints: false
})

// Computed Properties
const currentPart = computed(() => {
  const parts = currentLabParts.value || []
  return parts[currentPartIndex.value] || null
})

const totalParts = computed(() => currentLabParts.value?.length || 0)
const completedPartsCount = computed(() => completedParts.value.size)

const overallProgress = computed(() => {
  if (totalParts.value === 0) return 0
  return Math.round((completedPartsCount.value / totalParts.value) * 100)
})

const totalPointsEarned = computed(() => {
  let earned = 0
  currentLabParts.value?.forEach(part => {
    if (completedParts.value.has(part.id)) {
      earned += part.totalPoints || 0
    }
  })
  return earned
})

const totalPointsAvailable = computed(() => {
  return currentLabParts.value?.reduce((sum, part) => sum + (part.totalPoints || 0), 0) || 0
})

const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId.value}`)

// IP Variables and Network Configuration - Using Backend IPs
const ipVariablesTable = computed(() => {
  if (!currentLab.value?.network?.devices) return []

  const variables: Array<{ deviceId: string; variableName: string; ipAddress: string; vlan: number | null | string }> = []

  currentLab.value.network.devices.forEach(device => {
    device.ipVariables.forEach(ipVar => {
      // Create mapping key: deviceId.variableName
      const mappingKey = `${device.deviceId}.${ipVar.name}`

      // Get IP and VLAN from backend mappings, or show loading/placeholder
      const ipMapping = backendIpMappings.value[mappingKey]
      const ipAddress = ipMapping?.ip || (isLoadingIPs.value ? 'Loading...' : 'Not assigned')
      const vlan = ipMapping?.vlan ?? (isLoadingIPs.value ? 'Loading...' : '-')

      variables.push({
        deviceId: device.deviceId,
        variableName: ipVar.name,
        ipAddress,
        vlan
      })
    })
  })

  return variables
})

// Part Access Control - Sequential Unlocking Based on Prerequisites
const isPartUnlocked = (part: LabPart): boolean => {
  if (!part.prerequisites || part.prerequisites.length === 0) {
    return true // No prerequisites means unlocked
  }
  
  // Check if all prerequisite parts are completed
  return part.prerequisites.every(prereqPartId => {
    const prereqPart = currentLabParts.value?.find(p => p.partId === prereqPartId)
    return prereqPart ? completedParts.value.has(prereqPart.id) : false
  })
}

const getPartStatus = (part: LabPart, index: number) => {
  if (completedParts.value.has(part.id)) return 'completed'
  if (index === currentPartIndex.value) return 'current'
  if (!isPartUnlocked(part)) return 'locked'
  return 'available'
}

const canAccessPart = (index: number): boolean => {
  const part = currentLabParts.value?.[index]
  return part ? isPartUnlocked(part) : false
}

// Task Organization and Grouping
const organizedTasks = computed(() => {
  if (!currentPart.value) return { grouped: [], ungrouped: [] }
  
  const grouped: Array<{ group: TaskGroup; tasks: LabTask[] }> = []
  const ungrouped: LabTask[] = []
  
  // Get all tasks for current part, sorted by order
  const allTasks = [...(currentPart.value.tasks || [])].sort((a, b) => a.order - b.order)
  const taskGroups = currentPart.value.task_groups || []
  
  // Create a set of task IDs that belong to any group
  const groupedTaskIds = new Set<string>()
  
  // Process task groups
  taskGroups.forEach(group => {
    const groupTasks = allTasks.filter(task => {
      // In a real implementation, you'd need a way to determine which tasks belong to which group
      // For now, we'll assume tasks are assigned to groups based on some logic or additional field
      // This is a placeholder - you may need to adjust based on your actual data structure
      return true // Placeholder logic
    })
    
    if (groupTasks.length > 0) {
      grouped.push({ group, tasks: groupTasks })
      groupTasks.forEach(task => groupedTaskIds.add(task.taskId))
    }
  })
  
  // Process ungrouped tasks
  allTasks.forEach(task => {
    if (!groupedTaskIds.has(task.taskId)) {
      ungrouped.push(task)
    }
  })
  
  return { grouped, ungrouped }
})

// Task Status Management
const getTaskStatus = (taskId: string, partId: string): 'pending' | 'running' | 'passed' | 'failed' => {
  const partTasks = completedTasks.value[partId] || new Set()
  if (partTasks.has(taskId)) return 'passed'
  // In a real implementation, you'd track running/failed states
  return 'pending'
}

// Markdown Rendering
const renderMarkdown = (markdown: string | any): string => {
  // Handle case where instructions might come as an object instead of string
  let htmlContent = ''

  if (typeof markdown === 'string') {
    // If it's a string, treat as markdown and convert to HTML
    htmlContent = marked(markdown)
  } else if (markdown && typeof markdown === 'object') {
    // If it's a rich content object (from TipTap editor), extract HTML
    if (markdown.html) {
      htmlContent = markdown.html
    } else if (markdown.content || markdown.text || markdown.instructions) {
      // Fallback: treat as markdown
      const markdownText = markdown.content || markdown.text || markdown.instructions
      htmlContent = marked(markdownText)
    } else {
      // Last resort: stringify the object
      htmlContent = marked(JSON.stringify(markdown))
    }
  } else {
    const content = String(markdown || '')
    htmlContent = marked(content)
  }

  return DOMPurify.sanitize(htmlContent)
}

// Navigation Methods
const selectPart = (index: number) => {
  if (!canAccessPart(index)) return
  currentPartIndex.value = index
}

const goToPreviousPart = () => {
  if (currentPartIndex.value > 0) {
    const prevIndex = currentPartIndex.value - 1
    if (canAccessPart(prevIndex)) {
      currentPartIndex.value = prevIndex
    }
  }
}

const goToNextPart = () => {
  if (currentPartIndex.value < totalParts.value - 1) {
    const nextIndex = currentPartIndex.value + 1
    if (canAccessPart(nextIndex)) {
      currentPartIndex.value = nextIndex
    }
  }
}

// Calculate total test cases for current part (for display purposes only)
const currentPartTotalTestCases = computed(() => {
  if (!currentPart.value || !currentPart.value.tasks) return 0

  // Each task can have multiple test cases
  return currentPart.value.tasks.reduce((total, task) => {
    const testCaseCount = task.testCases?.length || 0
    return total + testCaseCount
  }, 0)
})

// Grading Submission
const submitPartForGrading = async () => {
  if (!currentPart.value) return

  try {
    const result = await createSubmission(labId.value, currentPart.value.partId)

    if (result.success) {
      console.log('✅ Submission created successfully:', result.jobId)
    } else {
      console.error('❌ Failed to create submission:', result.error)
      // Handle error state - could show toast or alert
    }
  } catch (error) {
    console.error('❌ Error during submission:', error)
  }
}

// Get current grading status for display
const currentGradingStatus = computed(() => {
  if (!currentPart.value) return { status: 'idle', message: 'Ready to submit' }
  const status = getGradingStatus(labId.value, currentPart.value.partId)
  console.log('🎯 [DEBUG] Current grading status:', status)
  return status
})

// Watch for completed submissions to update part completion status
watch(() => currentGradingStatus.value, (newStatus) => {
  if (newStatus.status === 'completed' && newStatus.results && currentPart.value) {
    // Mark part as completed if grading was successful
    if (newStatus.results.total_points_earned > 0) {
      completedParts.value.add(currentPart.value.id)
      
      // Mark all tasks in this part as completed
      const partId = currentPart.value.id
      if (!completedTasks.value[partId]) {
        completedTasks.value[partId] = new Set()
      }
      currentPart.value.tasks?.forEach(task => {
        completedTasks.value[partId].add(task.taskId)
      })
      
      console.log('✅ Part completed and marked as done:', currentPart.value.partId)
    }
  }
})

// Get user state
const userState = useUserState()

// Check lab completion status
const checkLabCompletion = async () => {
  try {
    // Get student ID from user state
    const studentId = userState.value?.u_id

    if (!studentId) {
      console.warn('No student ID available for completion check')
      return
    }

    ipLoadingStatus.value = 'Checking lab status...'

    // Fetch student submissions
    const result = await fetchStudentSubmissions(studentId, labId.value)

    if (result.success && result.submissions) {
      studentSubmissions.value = result.submissions

      // Check completion status
      const labParts = currentLabParts.value?.map(part => ({
        partId: part.partId,
        totalPoints: part.totalPoints || 0
      })) || []

      completionStatus.value = checkLabCompletionStatus(
        result.submissions,
        labParts
      )

      // Show completion prompt if lab is fully completed
      if (completionStatus.value.isFullyCompleted) {
        showCompletionPrompt.value = true
      }
    }
  } catch (error) {
    console.error('❌ [ERROR] Failed to check lab completion:', error)
  }
}

// Load personalized IPs from backend
const loadPersonalizedIPs = async () => {
  try {
    const config = useRuntimeConfig()

    ipLoadingStatus.value = 'Fetching your personalized network configuration...'

    const response = await fetch(
      `${config.public.backendurl}/v0/labs/${labId.value}/start`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.success && result.data) {
      // Store IP mappings from backend
      backendIpMappings.value = result.data.networkConfiguration.ipMappings || {}
      backendVlanMappings.value = result.data.networkConfiguration.vlanMappings || {}

      console.log('✅ [DEBUG] Loaded personalized IPs:', {
        ipMappings: backendIpMappings.value,
        vlanMappings: backendVlanMappings.value
      })
    }

    // Finish loading
    ipLoadingStatus.value = 'Finalizing configuration...'
    await new Promise(resolve => setTimeout(resolve, 500))
    isLoadingIPs.value = false

  } catch (error) {
    console.error('❌ [ERROR] Failed to load personalized IPs:', error)
    // Fall back to showing the lab anyway
    isLoadingIPs.value = false
  }
}

// Handle view results - show detailed results modal
const handleViewResults = () => {
  showCompletionPrompt.value = false
  showResultsModal.value = true
}

// Handle continue after completion (just view the lab)
const handleContinueAfterCompletion = () => {
  showCompletionPrompt.value = false
  // IPs should already be loaded or loading
}

// Handle restart lab from completion prompt
const handleRestartLabFromPrompt = () => {
  showCompletionPrompt.value = false
  // Reset completion status
  completionStatus.value = {
    isFullyCompleted: false,
    completedParts: [],
    totalPartsCompleted: 0,
    totalParts: 0,
    allPartsPassedWithFullPoints: false
  }
  // Reload IPs
  isLoadingIPs.value = true
  loadPersonalizedIPs()
}

// Handle restart lab from results modal
const handleRestartLabFromResults = () => {
  showResultsModal.value = false
  // Reset completion status
  completionStatus.value = {
    isFullyCompleted: false,
    completedParts: [],
    totalPartsCompleted: 0,
    totalParts: 0,
    allPartsPassedWithFullPoints: false
  }
  // Reload IPs
  isLoadingIPs.value = true
  loadPersonalizedIPs()
}

// Handle timer expiration
const handleTimerExpired = () => {
  console.log('⏰ Timer expired!')
  timerExpiredModalMode.value = 'timer_expired'
  showResultsModal.value = true
}

// Data Loading
const loadLabData = async () => {
  console.log('🚀 [DEBUG] loadLabData started')
  console.log('🚀 [DEBUG] courseId:', courseId.value)
  console.log('🚀 [DEBUG] labId:', labId.value)

  try {
    // Load course and lab data in parallel
    console.log('🚀 [DEBUG] Loading course and lab data...')
    await Promise.all([
      fetchCourse(courseId.value),
      fetchLabById(labId.value),
    ])

    console.log('🚀 [DEBUG] Course and lab data loaded')
    console.log('🚀 [DEBUG] currentLab.value:', currentLab.value)

    // Then load parts data
    if (currentLab.value) {
      console.log('🚀 [DEBUG] Lab found, fetching parts with labId:', labId.value)
      const parts = await fetchLabParts(labId.value) // Use labId directly as specified in API
      console.log('🚀 [DEBUG] Parts fetched:', parts)

      // After loading lab data, check completion and load IPs
      await checkLabCompletion()

      // If not showing completion prompt, load IPs immediately
      if (!showCompletionPrompt.value) {
        await loadPersonalizedIPs()
      }
      // If showing completion prompt, IPs will be loaded when user makes a choice
    } else {
      console.log('🚀 [DEBUG] No currentLab found, skipping parts fetch')
      isLoadingIPs.value = false
    }
  } catch (err) {
    console.error('🚀 [DEBUG] Failed to load lab data:', err)
    isLoadingIPs.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await loadLabData()
})

// Watch for URL changes to update current part
watch(() => route.query.part, (newPart) => {
  if (newPart && typeof newPart === 'string') {
    const partIndex = parseInt(newPart) - 1
    if (partIndex >= 0 && partIndex < totalParts.value && canAccessPart(partIndex)) {
      currentPartIndex.value = partIndex
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Lab Completion Prompt -->
    <LabCompletionPrompt
      :is-open="showCompletionPrompt"
      :lab-name="currentLab?.title || 'Lab'"
      :completed-parts="completionStatus.totalPartsCompleted"
      :total-parts="completionStatus.totalParts"
      @view-results="handleViewResults()"
      @continue="handleContinueAfterCompletion(); loadPersonalizedIPs()"
      @restart="handleRestartLabFromPrompt()"
      @close="showCompletionPrompt = false"
    />

    <!-- Lab Results Modal -->
    <LabResultsModal
      :is-open="showResultsModal"
      :course-id="courseId"
      :lab-name="currentLab?.title || 'Lab'"
      :submissions="studentSubmissions"
      :lab-parts="currentLabParts || []"
      :mode="timerExpiredModalMode"
      :available-until="currentLab?.availableUntil"
      @start-over="handleRestartLabFromResults()"
      @close="showResultsModal = false"
    />

    <!-- Lab Timer (Fixed at bottom center) -->
    <LabTimer
      v-if="!isLoadingIPs && !isLoading && !isLoadingParts && currentLab"
      :available-from="currentLab?.availableFrom"
      :due-date="currentLab?.dueDate"
      :available-until="currentLab?.availableUntil"
      @timer-expired="handleTimerExpired"
    />

    <!-- Navigation Breadcrumb -->
    <div class="border-b bg-background p-4 sticky top-0 z-[100] shadow-sm">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <NuxtLink to="/" class="flex items-center hover:text-primary transition-colors">
              <Home class="h-4 w-4" />
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <NuxtLink to="/courses" class="hover:text-primary transition-colors">
              Courses
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <NuxtLink :to="`/courses/${courseId}`" class="hover:text-primary transition-colors">
              {{ courseTitle }}
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage class="font-medium">
              {{ currentLab?.title || 'Loading...' }}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <!-- IP Loading Overlay -->
    <div v-if="isLoadingIPs && !isLoading && !isLoadingParts && currentLab" class="fixed inset-x-0 top-[73px] bottom-0 z-40 flex items-center justify-center bg-background/95">
      <div class="text-center space-y-6 px-4">
        <!-- Animated IP Loading Text -->
        <div class="relative">
          <h2 class="text-4xl md:text-5xl font-bold text-foreground mb-2 tracking-tight">
            <span class="inline-block relative ip-loading-text">
              {{ ipLoadingStatus }}
              <span class="absolute inset-0 shine-effect"></span>
            </span>
          </h2>
          <p class="text-lg text-muted-foreground">
            Setting up your personalized network configuration...
          </p>
        </div>

        <!-- Loading Animation -->
        <div class="flex justify-center space-x-2 mt-8">
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading || isLoadingParts" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6" />
        <h3 class="text-lg font-semibold mb-2">Loading Lab</h3>
        <p class="text-muted-foreground">Preparing your learning experience...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-8 max-w-2xl mx-auto">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription class="text-base">{{ error }}</AlertDescription>
      </Alert>
    </div>

    <!-- Main Lab Interface -->
    <div v-else-if="currentLab && currentLabParts && currentLabParts.length > 0" class="flex min-h-[calc(100vh-80px)]">
      <!-- Right Sidebar - Part Navigation (30%) -->
      <div class="w-[30%] min-w-[380px] max-w-[420px] border-r bg-card/30 backdrop-blur-sm flex flex-col">
        <!-- Lab Header -->
        <div class="p-6 border-b bg-card/80 backdrop-blur-sm">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center border border-primary/20">
                <BookOpen class="w-7 h-7 text-primary" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="font-bold text-xl truncate text-foreground">{{ currentLab.title }}</h2>
              <p v-if="currentLab.description" class="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                {{ currentLab.description }}
              </p>
            </div>
          </div>

          <!-- Progress Overview -->
          <div class="mt-6 space-y-4">
            <div class="flex items-center justify-between text-sm">
              <span class="font-semibold flex items-center space-x-2">
                <Award class="w-4 h-4 text-primary" />
                <span>Overall Progress</span>
              </span>
              <span class="text-muted-foreground">{{ completedPartsCount }}/{{ totalParts }} parts</span>
            </div>
            <!-- Custom Progress Bar with Success Color Fill -->
            <div class="relative h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500 ease-out"
                :class="overallProgress === 100 ? 'bg-green-500' : 'bg-primary'"
                :style="{ width: `${overallProgress}%` }"
              ></div>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{{ overallProgress }}% complete</span>
              <span class="font-medium text-primary">{{ totalPointsEarned }}/{{ totalPointsAvailable }} pts</span>
            </div>
          </div>
        </div>

        <!-- Parts List -->
        <ScrollArea class="flex-1 p-4">
          <div class="space-y-3">
            <Card
              v-for="(part, index) in currentLabParts"
              :key="part.id"
              :class="[
                'cursor-pointer transition-all duration-300 overflow-hidden',
                {
                  // Current part - primary styling
                  'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-lg': index === currentPartIndex,
                  // Completed part - success styling
                  'bg-green-300/30 border-green-200 shadow-md scale-[0.98]': completedParts.has(part.id) && index !== currentPartIndex,
                  // Available part - default styling
                  'bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20 scale-[0.98]': canAccessPart(index) && index !== currentPartIndex && !completedParts.has(part.id),
                  // Locked part - disabled styling
                  'opacity-50 cursor-not-allowed bg-muted border-muted-foreground/20 scale-[0.98]': !canAccessPart(index)
                }
              ]"
              @click="selectPart(index)"
            >
              <CardContent class="p-4">
                <div class="flex items-start space-x-3">
                  <!-- Status Icon -->
                  <div class="flex-shrink-0 mt-1">
                    <div class="relative">
                      <CheckCircle2 
                        v-if="completedParts.has(part.id)" 
                        class="w-6 h-6 text-green-600 drop-shadow-sm" 
                      />
                      <Play 
                        v-else-if="index === currentPartIndex" 
                        class="w-6 h-6 text-primary drop-shadow-sm animate-pulse" 
                      />
                      <Lock 
                        v-else-if="!canAccessPart(index)" 
                        class="w-6 h-6 text-muted-foreground/50" 
                      />
                      <Clock 
                        v-else 
                        class="w-6 h-6 text-muted-foreground" 
                      />
                    </div>
                  </div>

                  <!-- Part Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between mb-2">
                      <h3 class="font-semibold text-sm leading-tight">
                        Part {{ index + 1 }}: {{ part.title }}
                      </h3>
                      <Badge
                        v-if="completedParts.has(part.id)"
                        variant="secondary"
                        class="text-xs bg-green-100 text-green-800 border-green-200 ml-2"
                      >
                        Completed
                      </Badge>
                      <Badge
                        v-else-if="index === currentPartIndex"
                        variant="secondary"
                        class="text-xs bg-primary/15 text-primary border-primary/30 ml-2"
                      >
                        Current
                      </Badge>
                    </div>
                    
                    <div class="flex items-center space-x-3 text-xs text-muted-foreground mb-2">
                      <div class="flex items-center space-x-1">
                        <Award class="w-3 h-3" />
                        <span>{{ part.totalPoints || 0 }} pts</span>
                      </div>
                    </div>
                    
                    <!-- Prerequisites -->
                    <div v-if="part.prerequisites?.length" class="flex items-center space-x-1 text-xs text-amber-600">
                      <Lock class="w-3 h-3" />
                      <span>Requires: {{ part.prerequisites.join(', ') }}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      <!-- Main Content Area (70%) -->
      <div class="flex-1 flex flex-col bg-background">
        <!-- Current Part Header -->
        <div v-if="currentPart" class="border-b bg-card/50 backdrop-blur-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-foreground">
                Part {{ currentPartIndex + 1 }}: {{ currentPart.title }}
              </h1>
              <p v-if="currentPart.description" class="text-muted-foreground mt-2 text-lg">
                {{ currentPart.description }}
              </p>
            </div>
            <div class="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                :disabled="currentPartIndex === 0"
                @click="goToPreviousPart"
                class="shadow-sm"
              >
                <ChevronLeft class="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="currentPartIndex === totalParts - 1 || !canAccessPart(currentPartIndex + 1)"
                @click="goToNextPart"
                class="shadow-sm"
              >
                Next
                <ChevronRight class="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <!-- Part Metadata -->
          <div class="flex items-center space-x-6 text-sm text-muted-foreground">
            <div class="flex items-center space-x-2">
              <Award class="w-4 h-4" />
              <span>{{ currentPart.totalPoints || 0 }} points available</span>
            </div>
          </div>
        </div>

        <!-- Part Content -->
        <ScrollArea class="flex-1 p-6">
          <div v-if="currentPart" class="max-w-5xl mx-auto space-y-8">
            
            <!-- Instructions Section -->
            <Card class="shadow-sm">
              <CardHeader class="pb-4">
                <CardTitle class="flex items-center space-x-3 text-xl">
                  <div class="p-2 bg-primary/10 rounded-lg">
                    <FileText class="w-5 h-5 text-primary" />
                  </div>
                  <span>Instructions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  class="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:border lab-instructions"
                  v-html="renderMarkdown(currentPart.instructions)"
                />
              </CardContent>
            </Card>

            <!-- IP Variables Table -->
            <Card v-if="ipVariablesTable.length > 0" class="shadow-sm">
              <CardHeader class="pb-4">
                <CardTitle class="flex items-center space-x-3 text-xl">
                  <div class="p-2 bg-blue-100 rounded-lg">
                    <Server class="w-5 h-5 text-blue-600" />
                  </div>
                  <span>Network Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead class="font-semibold">Device</TableHead>
                        <TableHead class="font-semibold">Variable Name</TableHead>
                        <TableHead class="font-semibold">IP Address</TableHead>
                        <TableHead class="font-semibold">VLAN</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="(variable, index) in ipVariablesTable"
                        :key="`${variable.deviceId}-${variable.variableName}-${index}`"
                        class="hover:bg-muted/30"
                      >
                        <TableCell class="font-medium">{{ variable.deviceId }}</TableCell>
                        <TableCell class="font-mono text-sm">{{ variable.variableName }}</TableCell>
                        <TableCell class="font-mono text-sm text-blue-600">{{ variable.ipAddress }}</TableCell>
                        <TableCell class="font-mono text-sm">
                          <Badge v-if="typeof variable.vlan === 'number'" variant="outline" class="font-mono">
                            VLAN {{ variable.vlan }}
                          </Badge>
                          <span v-else class="text-muted-foreground">{{ variable.vlan }}</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div class="mt-3 text-xs text-muted-foreground">
                  <div class="flex items-center space-x-1">
                    <Info class="w-3 h-3" />
                    <span>Use these IP addresses in your configuration tasks</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>

        <!-- Bottom Action Bar -->
        <div class="border-t bg-card/80 backdrop-blur-sm">
          <!-- Part Submission Area -->
          <div v-if="currentPart" class="p-6">
            <div class="max-w-5xl mx-auto flex items-center justify-between">
              <div class="flex-1">
                <h3 class="font-semibold text-lg mb-1">
                  {{ currentGradingStatus.status === 'completed' && currentGradingStatus.results?.total_points_earned > 0 
                     ? `Part ${currentPartIndex + 1} Completed!` 
                     : `Ready to Submit Part ${currentPartIndex + 1}?` }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  <span v-if="currentGradingStatus.status === 'completed' && currentGradingStatus.results?.total_points_earned > 0">
                    Great work! You earned {{ currentGradingStatus.results.total_points_earned }}/{{ currentGradingStatus.results.total_points_possible }} points.
                  </span>
                  <span v-else>
                    Once submitted, your work will be automatically graded and you can proceed to the next part.
                    <span class="font-medium text-primary ml-1">{{ currentPart.totalPoints }} points available</span>
                  </span>
                </p>
              </div>
              <div class="flex items-center space-x-3">
                <!-- Grading Progress Component -->
                <GradingProgress
                  :status="currentGradingStatus.status"
                  :progress="currentGradingStatus.progress"
                  :results="currentGradingStatus.results"
                  :error="currentGradingStatus.error"
                  :total-test-cases="currentPartTotalTestCases"
                  @submit="submitPartForGrading"
                  @toggle-details="toggleProgressDetails(labId, currentPart.partId)"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- No Parts Available -->
    <div v-else-if="currentLab && (!currentLabParts || currentLabParts.length === 0)" class="p-12 text-center">
      <div class="max-w-md mx-auto">
        <BookOpen class="w-20 h-20 mx-auto text-muted-foreground/50 mb-6" />
        <h3 class="text-2xl font-semibold mb-3">No Parts Available</h3>
        <p class="text-muted-foreground leading-relaxed">
          This lab doesn't have any parts configured yet. Please check back later or contact your instructor.
        </p>
      </div>
    </div>

    <!-- Lab Not Found -->
    <div v-else class="p-12 text-center">
      <Alert class="max-w-md mx-auto">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription>
          Lab not found or you don't have access to this lab.
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Custom scrollbar for better appearance */
.scroll-area {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground)) hsl(var(--background));
}

.scroll-area::-webkit-scrollbar {
  width: 6px;
}

.scroll-area::-webkit-scrollbar-track {
  background: hsl(var(--background));
}

.scroll-area::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground));
  border-radius: 3px;
}

/* Enhanced focus states for accessibility */
.focus\:ring-primary:focus {
  --tw-ring-color: hsl(var(--primary));
}

/* Smooth animations */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced prose styles for markdown content */
.prose {
  color: hsl(var(--foreground));
}

.prose h1 {
  color: hsl(var(--foreground));
  border-bottom: 2px solid hsl(var(--border));
  padding-bottom: 0.5rem;
}

.prose h2 {
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 0.25rem;
}

.prose code {
  background-color: hsl(var(--muted));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.prose pre {
  background-color: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
}

.prose blockquote {
  border-left: 4px solid hsl(var(--primary));
  background-color: hsl(var(--muted) / 0.5);
  padding: 1rem;
  margin: 1rem 0;
}

/* Fix for TipTap editor HTML content with nested headings */
.lab-instructions p h1,
.lab-instructions p h2,
.lab-instructions p h3,
.lab-instructions p h4,
.lab-instructions p h5,
.lab-instructions p h6 {
  display: block;
  margin: 0;
  padding: 0;
}

.lab-instructions p h1 {
  font-size: 2rem !important;
  font-weight: 700 !important;
  margin: 2rem 0 1rem 0 !important;
  color: hsl(var(--foreground)) !important;
  border-bottom: 2px solid hsl(var(--border)) !important;
  padding-bottom: 0.5rem !important;
  line-height: 1.2 !important;
}

.lab-instructions p h2 {
  font-size: 1.5rem !important;
  font-weight: 600 !important;
  margin: 1.5rem 0 0.75rem 0 !important;
  color: hsl(var(--foreground)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  padding-bottom: 0.25rem !important;
  line-height: 1.3 !important;
}

.lab-instructions p h3 {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  margin: 1.25rem 0 0.5rem 0 !important;
  color: hsl(var(--foreground)) !important;
  line-height: 1.4 !important;
}

/* Also style regular headings in case some are not nested */
.lab-instructions h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: hsl(var(--foreground));
  border-bottom: 2px solid hsl(var(--border));
  padding-bottom: 0.5rem;
}

.lab-instructions h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 0.25rem;
}

.lab-instructions h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.lab-instructions img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

/* IP Loading Animation */
.ip-loading-text {
  position: relative;
  display: inline-block;
  background: linear-gradient(
    90deg,
    var(--foreground) 0%,
    var(--foreground) 40%,
    var(--primary) 50%,
    var(--foreground) 60%,
    var(--foreground) 100%
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
</style>