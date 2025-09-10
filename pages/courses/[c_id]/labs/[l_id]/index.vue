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
  Save,
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
  toggleProgressDetails
} = useSubmissions()

// State Management
const currentPartIndex = ref(0)
const completedParts = ref<Set<string>>(new Set())
const completedTasks = ref<Record<string, Set<string>>>(new Map()) // partId -> Set of taskIds
const isSubmittingPart = ref(false)
const lastSaved = ref<Date | null>(null)
const progress = ref<Record<string, number>>({}) // partId -> percentage

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

// IP Variables and Network Configuration
const ipVariablesTable = computed(() => {
  if (!currentLab.value?.network?.devices) return []
  
  const baseNetwork = currentLab.value.network.topology.baseNetwork
  const baseOctets = baseNetwork.split('.').slice(0, 3).join('.')
  
  const variables: Array<{ deviceId: string; variableName: string; ipAddress: string }> = []
  
  currentLab.value.network.devices.forEach(device => {
    device.ipVariables.forEach(ipVar => {
      let ipAddress = ''
      
      if (ipVar.fullIp) {
        ipAddress = ipVar.fullIp
      } else if (ipVar.hostOffset !== undefined) {
        ipAddress = `${baseOctets}.${ipVar.hostOffset}`
      }
      
      variables.push({
        deviceId: device.deviceId,
        variableName: ipVar.name,
        ipAddress
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
const renderMarkdown = (markdown: string): string => {
  const html = marked(markdown || '')
  return DOMPurify.sanitize(html)
}

// Navigation Methods
const selectPart = (index: number) => {
  if (!canAccessPart(index)) return
  saveProgress()
  currentPartIndex.value = index
}

const goToPreviousPart = () => {
  if (currentPartIndex.value > 0) {
    const prevIndex = currentPartIndex.value - 1
    if (canAccessPart(prevIndex)) {
      saveProgress()
      currentPartIndex.value = prevIndex
    }
  }
}

const goToNextPart = () => {
  if (currentPartIndex.value < totalParts.value - 1) {
    const nextIndex = currentPartIndex.value + 1
    if (canAccessPart(nextIndex)) {
      saveProgress()
      currentPartIndex.value = nextIndex
    }
  }
}

// Progress Management
const saveProgress = () => {
  // In a real implementation, this would save to backend
  lastSaved.value = new Date()
  console.log('Progress saved')
}

const autoSaveProgress = () => {
  // Auto-save every 30 seconds
  setInterval(() => {
    if (currentPart.value) {
      saveProgress()
    }
  }, 30000)
}

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
      
      // Save progress
      saveProgress()
      
      console.log('✅ Part completed and marked as done:', currentPart.value.partId)
    }
  }
})

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
    } else {
      console.log('🚀 [DEBUG] No currentLab found, skipping parts fetch')
    }
  } catch (err) {
    console.error('🚀 [DEBUG] Failed to load lab data:', err)
  }
}

// Lifecycle
onMounted(async () => {
  await loadLabData()
  autoSaveProgress()
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
    <!-- Navigation Breadcrumb -->
    <div class="border-b bg-background/95 backdrop-blur-sm p-4 sticky top-0 z-50 shadow-sm">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink :to="`/`" class="flex items-center hover:text-primary transition-colors">
              <Home class="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink to="/courses" class="hover:text-primary transition-colors">
              Courses
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink :to="`/courses/${courseId}`" class="hover:text-primary transition-colors">
              {{ courseTitle }}
            </BreadcrumbLink>
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

          <!-- Last Saved Indicator -->
          <div v-if="lastSaved" class="mt-4 flex items-center space-x-2 text-xs text-muted-foreground">
            <Save class="w-3 h-3" />
            <span>Last saved: {{ lastSaved.toLocaleTimeString() }}</span>
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
                  'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-lg scale-[1.02]': index === currentPartIndex,
                  // Completed part - success styling
                  'bg-gradient-to-r from-green-50 to-green-25 border-green-200 shadow-md': completedParts.has(part.id) && index !== currentPartIndex,
                  // Available part - default styling
                  'bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20': canAccessPart(index) && index !== currentPartIndex && !completedParts.has(part.id),
                  // Locked part - disabled styling
                  'opacity-50 cursor-not-allowed bg-muted border-muted-foreground/20': !canAccessPart(index)
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
                        Complete
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
                  class="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:border"
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
                <Button 
                  variant="outline" 
                  size="lg"
                  @click="saveProgress"
                  class="shadow-sm"
                >
                  <Save class="w-4 h-4 mr-2" />
                  Save Progress
                </Button>
                
                <!-- Grading Progress Component -->
                <GradingProgress
                  :status="currentGradingStatus.status"
                  :progress="currentGradingStatus.progress"
                  :results="currentGradingStatus.results"
                  :error="currentGradingStatus.error"
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
</style>