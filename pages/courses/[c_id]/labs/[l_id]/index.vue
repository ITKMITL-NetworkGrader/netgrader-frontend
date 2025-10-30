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
  Info,
  Loader2,
  Send
} from 'lucide-vue-next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { useCourseLabs, type Lab, type LabPart, type LabTask, type TaskGroup } from '@/composables/useCourseLabs'
import { useCourse } from '@/composables/useCourse'
import { useSubmissions } from '@/composables/useSubmissions'
import GradingProgress from '@/components/GradingProgress.vue'
import LabResultsModal from '@/components/student/LabResultsModal.vue'
import LabTimer from '@/components/student/LabTimer.vue'
import FillInBlankQuestions from '@/components/student/FillInBlankQuestions.vue'
import type { ISubmission } from '@/types/submission'
import { toast } from 'vue-sonner'

type FillInBlankSubmissionPayload = {
  results: any[]
  totalPointsEarned: number
  totalPoints: number
  passed: boolean
  submission?: {
    id?: string
    attempt?: number
    status?: string
    submittedAt?: string
  }
}

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
const isUpdateModeRoute = computed(() => route.query.mode === 'update')

// Composables
const { currentCourse, fetchCourse } = useCourse()
const {
  currentLab,
  allLabParts,
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
  clearGradingResults,
  fetchStudentSubmissions,
  checkLabCompletionStatus
} = useSubmissions()

const {
  isCourseTA,
  isCourseInstructor,
  canManageCurrentCourse
} = useRoleGuard()

const PART_ZERO_ID = '__instructions_ack__'
const SESSION_STORAGE_PREFIX = 'fillin:'

// State Management
const currentPartIndex = ref(0)
const completedParts = ref<Set<string>>(new Set())
const completedTasks = ref<Record<string, Set<string>>>(new Map()) // partId -> Set of taskIds
const isSubmittingPart = ref(false)
const progress = ref<Record<string, number>>({}) // partId -> percentage
const fillInBlankQuestionsRef = ref<InstanceType<typeof FillInBlankQuestions> | null>(null)
const fillInBlankSubmission = ref<FillInBlankSubmissionPayload | null>(null)

// Part 0 Instructions acknowledgement state
const instructionsAcknowledged = ref(false)
const instructionsAcknowledgedAt = ref<Date | null>(null)
const instructionsAckChecked = ref(false)
const instructionsAckLoading = ref(false)
const instructionsAckError = ref('')
const lastAutoNavigatedIndex = ref<number | null>(null)

const clearSessionStoredAnswers = () => {
  if (typeof window === 'undefined') return

 const keysToRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith(SESSION_STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => sessionStorage.removeItem(key))
}

// IP Loading and Completion State
const isLoadingIPs = ref(true)
const ipLoadingStatus = ref('Gathering your IP addresses...')
const backendIpMappings = ref<Record<string, { ip: string; vlan: number | null }>>({})
const backendVlanMappings = ref<Record<string, number>>({})
const activeLabSessionId = ref<string | null>(null)
const showResultsModal = ref(false)
const timerExpiredModalMode = ref<'results' | 'timer_expired' | 'unavailable'>('results')
const isFreshCompletion = ref(false) // Track if this is a fresh completion for confetti
const showCollapsedSummary = ref(false) // Track if modal should show collapsed summary initially
const studentSubmissions = ref<ISubmission[]>([])
const completionStatus = ref({
  isFullyCompleted: false,
  completedParts: [] as string[],
  totalPartsCompleted: 0,
  totalParts: 0,
  allPartsPassedWithFullPoints: false
})

const currentLabParts = computed<LabPart[]>(() => {
  const lab = currentLab.value
  const parts = allLabParts.value || []

  const normalizedParts = parts.map((part) => {
    if (part.partId === PART_ZERO_ID || part.id === PART_ZERO_ID) {
      return {
        ...part,
        id: PART_ZERO_ID,
        partId: PART_ZERO_ID,
        isPartZero: true,
        isVirtual: true,
        order: 0
      }
    }
    return part
  })

  if (normalizedParts.some(part => part.partId === PART_ZERO_ID)) {
    return normalizedParts
  }

  if (!lab) {
    return normalizedParts
  }

  const instructions = lab.instructions ?? { html: '', json: { type: 'doc', content: [] } }
  const instructionsHtml = typeof instructions === 'string'
    ? instructions
    : (instructions.html || '')

  const fallbackInstructions = typeof instructions === 'string'
    ? (instructions.trim()
        ? instructions
        : '<p class="text-muted-foreground">No instructions provided.</p>')
    : {
        ...instructions,
        html: instructionsHtml.trim()
          ? instructionsHtml
          : '<p class="text-muted-foreground">No instructions provided.</p>'
      }

  const virtualInstructionsPart: LabPart = {
    id: PART_ZERO_ID,
    labId: labId.value,
    partId: PART_ZERO_ID,
    title: lab.type === 'exam' ? 'Exam Instructions' : 'Student Instructions',
    description: lab.type === 'exam'
      ? 'Review and acknowledge these rules before starting the exam.'
      : 'Review and acknowledge these instructions before starting the lab.',
    instructions: fallbackInstructions,
    order: 0,
    partType: 'network_config',
    questions: [],
    tasks: [],
    task_groups: [],
    prerequisites: [],
    totalPoints: 0,
    isPartZero: true,
    isVirtual: true
  }

  return [virtualInstructionsPart, ...normalizedParts]
})

const actualLabParts = computed(() => currentLabParts.value.filter(part => !part.isPartZero))

// Computed Properties
const currentPart = computed(() => {
  const parts = currentLabParts.value || []
  return parts[currentPartIndex.value] || null
})

const isFillInBlankPart = computed(() => currentPart.value?.partType === 'fill_in_blank')

const totalParts = computed(() => currentLabParts.value?.length || 0)
const completedPartsCount = computed(() => completedParts.value.size)

const overallProgress = computed(() => {
  if (totalParts.value === 0) return 0
  return Math.round((completedPartsCount.value / totalParts.value) * 100)
})

const totalPointsEarned = computed(() => {
  let earned = 0
  actualLabParts.value?.forEach(part => {
    if (completedParts.value.has(part.id)) {
      earned += part.totalPoints || 0
    }
  })
  return earned
})

const totalPointsAvailable = computed(() => {
  return actualLabParts.value?.reduce((sum, part) => sum + (part.totalPoints || 0), 0) || 0
})

const instructionsAcknowledgedLabel = computed(() => {
  if (!instructionsAcknowledgedAt.value) return ''
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(instructionsAcknowledgedAt.value)
})

const currentPartDisplayNumber = computed(() => {
  if (!currentPart.value) return currentPartIndex.value
  return currentPart.value.isPartZero ? 0 : currentPartIndex.value
})

const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId.value}`)
const shouldHideStudentContent = computed(() => showResultsModal.value || timerExpiredModalMode.value === 'timer_expired')

// Check if current part has fill-in-blank questions
const hasFillInBlankQuestions = computed(() => {
  if (!currentPart.value) return false
  return currentPart.value.partType === 'fill_in_blank' &&
         currentPart.value.questions &&
         currentPart.value.questions.length > 0
})

// Helper function to calculate network address from IP and subnet mask
const calculateNetworkAddress = (ip: string, subnetMask: number): string => {
  const ipParts = ip.split('.').map(Number)
  const maskBits = '1'.repeat(subnetMask) + '0'.repeat(32 - subnetMask)
  const maskOctets = [
    parseInt(maskBits.slice(0, 8), 2),
    parseInt(maskBits.slice(8, 16), 2),
    parseInt(maskBits.slice(16, 24), 2),
    parseInt(maskBits.slice(24, 32), 2)
  ]

  const networkParts = ipParts.map((octet, i) => octet & maskOctets[i])
  return `${networkParts.join('.')}/${subnetMask}`
}

// Variable Reference Table - Maps VLAN A-J and CIDR Q-Z to actual values
const variableReferenceTable = computed(() => {
  if (!currentLab.value?.network?.vlanConfiguration?.vlans) return []

  const variables: Array<{
    vlanVariable: string  // VLAN A, VLAN B, etc.
    vlanValue: string     // Actual VLAN ID (e.g., 117)
    cidrVariable: string  // CIDR Q, CIDR R, etc.
    cidrValue: string     // Actual network CIDR (e.g., 172.16.23.0/26)
  }> = []

  const vlanLetters = 'ABCDEFGHIJ'.split('')
  const cidrLetters = 'QRSTUVWXYZ'.split('')

  currentLab.value.network.vlanConfiguration.vlans.forEach((vlan, index) => {
    if (index >= 10) return // Only support up to 10 VLANs (A-J)

    // Find a sample IP from backend mappings for this VLAN to calculate CIDR
    const sampleIp = Object.entries(backendIpMappings.value).find(([key, mapping]) => {
      const ipVar = currentLab.value?.network.devices
        ?.flatMap(d => d.ipVariables)
        .find(v => key === `${currentLab.value.network.devices.find(dev => dev.ipVariables.includes(v))?.deviceId}.${v.name}`)
      return mapping.vlan !== null && ipVar?.vlanIndex === index
    })

    const vlanId = sampleIp?.[1]?.vlan ?? (isLoadingIPs.value ? 'Loading...' : '-')
    const cidrValue = sampleIp?.[1]?.ip
      ? calculateNetworkAddress(sampleIp[1].ip, vlan.subnetMask)
      : (isLoadingIPs.value ? 'Loading...' : '-')

    variables.push({
      vlanVariable: `VLAN ${vlanLetters[index]}`,
      vlanValue: typeof vlanId === 'number' ? vlanId.toString() : vlanId,
      cidrVariable: `CIDR ${cidrLetters[index]}`,
      cidrValue
    })
  })

  return variables
})

// Device Management Table - Only shows Device and Management IP
const deviceManagementTable = computed(() => {
  if (!currentLab.value?.network) return []

  const devices: Array<{
    deviceDisplay: string // Device name + management interface
    managementIp: string
  }> = []

  currentLab.value.network.devices?.forEach(device => {
    let managementIp = isLoadingIPs.value ? 'Loading...' : 'Not assigned'
    let managementInterface = ''

    device.ipVariables?.forEach(ipVar => {
      const mappingKey = `${device.deviceId}.${ipVar.name}`
      const ipMapping = backendIpMappings.value[mappingKey]

      // Only include Management IPs (not interface IPs - those are answers!)
      if (ipVar.isManagementInterface || ipVar.inputType === 'studentManagement') {
        managementIp = ipMapping?.ip || (isLoadingIPs.value ? 'Loading...' : 'Not assigned')
        // Store the interface name for display
        managementInterface = ipVar.interface || ipVar.name || ''
      }
    })

    // Build device display name with management interface
    const deviceDisplay = managementInterface
      ? `${device.deviceId} (${managementInterface})`
      : device.deviceId

    devices.push({
      deviceDisplay,
      managementIp
    })
  })

  return devices
})

// Part Access Control - Sequential Unlocking Based on Prerequisites
const isPartUnlocked = (part: LabPart): boolean => {
  if (part.isPartZero) {
    return true
  }

  if (!instructionsAcknowledged.value) {
    return false
  }

  if (!part.prerequisites || part.prerequisites.length === 0) {
    return true
  }
  
  // Check if all prerequisite parts are completed
  return part.prerequisites.every(prereqPartId => {
    if (prereqPartId === PART_ZERO_ID) {
      return instructionsAcknowledged.value
    }

    const prereqPart = currentLabParts.value.find(p => p.partId === prereqPartId)
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
  const part = currentLabParts.value[index]
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

const acknowledgeInstructions = async () => {
  if (instructionsAcknowledged.value || !instructionsAckChecked.value || instructionsAckLoading.value) return

  instructionsAckLoading.value = true
  instructionsAckError.value = ''

  try {
    const config = useRuntimeConfig()
    const response = await fetch(
      `${config.public.backendurl}/v0/labs/${labId.value}/instructions/acknowledge`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    instructionsAcknowledged.value = true
    instructionsAckChecked.value = true
    instructionsAcknowledgedAt.value = result.data?.acknowledgedAt
      ? new Date(result.data.acknowledgedAt)
      : new Date()
    instructionsAckError.value = ''
    toast.success('Instructions acknowledged. You can continue to Part 1.')

    // Automatically move to the next part if available
    if (currentPartIndex.value === 0 && totalParts.value > 1) {
      goToNextPart()
    }

    await checkLabCompletion()
  } catch (error: any) {
    const message = error?.message || 'Failed to acknowledge instructions'
    instructionsAckError.value = message
    toast.error(message)
  } finally {
    instructionsAckLoading.value = false
  }
}

// Grading Submission
const submitPartForGrading = async () => {
  if (!currentPart.value) return

  try {
    const result = await createSubmission(
      labId.value,
      currentPart.value.partId,
      { labSessionId: activeLabSessionId.value ?? undefined }
    )

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

const handleFillInBlankSubmissionResult = (result: FillInBlankSubmissionPayload) => {
  fillInBlankSubmission.value = result

  if (!currentPart.value) return

  const partId = currentPart.value.id

  if (result.passed) {
    completedParts.value.add(partId)

    if (!completedTasks.value[partId]) {
      completedTasks.value[partId] = new Set()
    }

    // There may be no discrete tasks for fill-in-the-blank parts, but ensure the set exists
    setTimeout(async () => {
      await checkLabCompletion()
    }, 2000)
  } else {
    completedParts.value.delete(partId)
  }
}

const handleFillInBlankSubmit = async () => {
  if (!fillInBlankQuestionsRef.value) return

  const result = await fillInBlankQuestionsRef.value.submitAnswers()
  if (result && !fillInBlankSubmission.value) {
    handleFillInBlankSubmissionResult(result)
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
watch(() => currentGradingStatus.value, async (newStatus) => {
  if (currentPart.value?.partType === 'fill_in_blank') {
    return
  }
  if (newStatus.status === 'completed' && newStatus.results && currentPart.value) {
    // Mark part as completed if grading was successful and got full points
    if (newStatus.results.total_points_earned === newStatus.results.total_points_possible) {
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

      // Check if ALL parts are now completed to show completion modal
      // Add a small delay so student can see the grading results first
      setTimeout(async () => {
        await checkLabCompletion()
      }, 2000)
    }
  }
})

watch(() => currentPart.value?.id, () => {
  fillInBlankSubmission.value = null
})

watch(instructionsAcknowledged, (acknowledged) => {
  if (acknowledged) {
    completedParts.value.add(PART_ZERO_ID)
    attemptResumeNavigation(studentSubmissions.value)
  } else {
    completedParts.value.delete(PART_ZERO_ID)
  }
})

watch(instructionsAckChecked, () => {
  if (instructionsAckError.value) {
    instructionsAckError.value = ''
  }
})

// Get user state
const userState = useUserState()

watch(() => userState.value?.u_id, (newValue, oldValue) => {
  if (!newValue && oldValue) {
    clearSessionStoredAnswers()
  }
})

const buildLatestSubmissionsMap = (submissions: ISubmission[]) => {
  const latest: Record<string, ISubmission> = {}

  submissions.forEach((submission) => {
    const existing = latest[submission.partId]
    if (!existing || submission.attempt > existing.attempt) {
      latest[submission.partId] = submission
    }
  })

  return latest
}

const determineResumePartIndex = (submissions: ISubmission[]): number | null => {
  if (!currentLabParts.value.length) return null

  if (!instructionsAcknowledged.value) {
    return 0
  }

  const latestByPart = buildLatestSubmissionsMap(submissions)

  for (let index = 0; index < currentLabParts.value.length; index++) {
    const part = currentLabParts.value[index]
    if (part.isPartZero) continue

    const submission = latestByPart[part.partId]

    if (!submission) {
      return index
    }

    const grading = submission.gradingResult
    const passed =
      submission.status === 'completed' &&
      grading &&
      grading.total_points_earned === grading.total_points_possible

    if (!passed) {
      return index
    }
  }

  return null
}

const attemptResumeNavigation = (submissions: ISubmission[]) => {
  if (!Array.isArray(submissions)) {
    return
  }

  const relevantSubmissions = activeLabSessionId.value
    ? submissions.filter(sub => sub.labSessionId && sub.labSessionId === activeLabSessionId.value)
    : submissions

  const targetIndex = determineResumePartIndex(relevantSubmissions)

  if (targetIndex === null) {
    return
  }

  if (!instructionsAcknowledged.value && targetIndex === 0) {
    return
  }

  if (targetIndex === currentPartIndex.value) {
    lastAutoNavigatedIndex.value = targetIndex
    return
  }

  const previousAutoIndex = lastAutoNavigatedIndex.value ?? -1

  if (targetIndex > previousAutoIndex && canAccessPart(targetIndex)) {
    currentPartIndex.value = targetIndex
    lastAutoNavigatedIndex.value = targetIndex
  }
}

const initializeInstructionsState = () => {
  const acknowledged = Boolean(currentLab.value?.instructionsAcknowledged)
  instructionsAcknowledged.value = acknowledged
  instructionsAckChecked.value = acknowledged

  if (acknowledged) {
    completedParts.value.add(PART_ZERO_ID)
  } else {
    completedParts.value.delete(PART_ZERO_ID)
  }
}

// Check lab completion status
const checkLabCompletion = async () => {
  try {
    // Get student ID from user state
    const studentId = userState.value?.u_id

    if (!studentId) {
      console.warn('No student ID available for completion check')
      return
    }

    if (!activeLabSessionId.value) {
      console.log('⏳ [DEBUG] Active lab session not available yet, skipping completion check')
      return
    }

    ipLoadingStatus.value = 'Checking lab status...'

    // Fetch student submissions for the active attempt
    const result = await fetchStudentSubmissions(
      studentId,
      labId.value,
      { labSessionId: activeLabSessionId.value }
    )

    if (result.success && result.submissions) {
      studentSubmissions.value = result.submissions

      // Check completion status
      const labParts = actualLabParts.value?.map(part => ({
        partId: part.partId,
        totalPoints: part.totalPoints || 0
      })) || []

      const status = checkLabCompletionStatus(
        result.submissions,
        labParts,
        { labSessionId: activeLabSessionId.value }
      )

      const completedPartIds = new Set(status.completedParts)
      if (instructionsAcknowledged.value) {
        completedPartIds.add(PART_ZERO_ID)
      }

      completionStatus.value = {
        ...status,
        isFullyCompleted: status.isFullyCompleted && instructionsAcknowledged.value,
        completedParts: Array.from(completedPartIds),
        totalParts: status.totalParts + 1,
        totalPartsCompleted: status.totalPartsCompleted + (instructionsAcknowledged.value ? 1 : 0)
      }

      if (!completionStatus.value.isFullyCompleted) {
        attemptResumeNavigation(result.submissions)
      }

      // Show completion modal if lab is fully completed
      if (completionStatus.value.isFullyCompleted && instructionsAcknowledged.value) {
        // Show LabResultsModal directly in collapsed state
        showResultsModal.value = true
        timerExpiredModalMode.value = 'results'
        isFreshCompletion.value = true // This IS a fresh completion (first time seeing results)
        showCollapsedSummary.value = true // Show collapsed summary initially
        isLoadingIPs.value = false // Stop loading IPs since lab is completed
      }
    }
  } catch (error) {
    console.error('❌ [ERROR] Failed to check lab completion:', error)
  }
}

// Load personalized IPs from backend
const loadPersonalizedIPs = async (options: { restart?: boolean } = {}) => {
  try {
    const config = useRuntimeConfig()

    const previousSessionId = activeLabSessionId.value
    ipLoadingStatus.value = options.restart
      ? 'Resetting your lab environment...'
      : 'Fetching your personalized network configuration...'

    const endpoint = options.restart ? 'restart' : 'start'
    const response = await fetch(
      `${config.public.backendurl}/v0/labs/${labId.value}/${endpoint}`,
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

      if (result.data.session) {
        const sessionInfo = result.data.session
        const acknowledged = Boolean(sessionInfo.instructionsAcknowledged)
        instructionsAcknowledged.value = acknowledged
        instructionsAckChecked.value = acknowledged
        instructionsAcknowledgedAt.value = sessionInfo.instructionsAcknowledgedAt
          ? new Date(sessionInfo.instructionsAcknowledgedAt)
          : instructionsAcknowledgedAt.value

        const newSessionId = sessionInfo.sessionId || null
        const sessionChanged = newSessionId !== previousSessionId
        activeLabSessionId.value = newSessionId

        if (sessionChanged) {
          studentSubmissions.value = []
          completionStatus.value = {
            isFullyCompleted: false,
            completedParts: [],
            totalPartsCompleted: 0,
            totalParts: 0,
            allPartsPassedWithFullPoints: false
          }
        }
      } else {
        activeLabSessionId.value = null
      }

      attemptResumeNavigation(studentSubmissions.value)

      if (activeLabSessionId.value !== previousSessionId) {
        await checkLabCompletion()
      }
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


// Handle restart lab from results modal
const handleRestartLabFromResults = async () => {
  showResultsModal.value = false
  showCollapsedSummary.value = false
  // Reset completion status
  completionStatus.value = {
    isFullyCompleted: false,
    completedParts: [],
    totalPartsCompleted: 0,
    totalParts: 0,
    allPartsPassedWithFullPoints: false
  }
  lastAutoNavigatedIndex.value = null
  // Clear any locally cached answers for a fresh attempt
  clearSessionStoredAnswers()
  activeLabSessionId.value = null
  // Reload IPs
  isLoadingIPs.value = true
  await loadPersonalizedIPs({ restart: true })
  if (!showResultsModal.value) {
    await checkLabCompletion()
  }
}

// Handle modal close
const handleCloseResultsModal = () => {
  showResultsModal.value = false
  showCollapsedSummary.value = false
  isFreshCompletion.value = false
}

// Handle timer expiration
const handleTimerExpired = () => {
  console.log('⏰ Timer expired!')
  timerExpiredModalMode.value = 'timer_expired'
  isFreshCompletion.value = false // Timer expiration is NOT a fresh completion
  showCollapsedSummary.value = false // Show full details for timer expiration
  showResultsModal.value = true
}

const handleDeadlineExtended = (payload: {
  labId: string
  labTitle?: string
  fields: Array<{ type: 'dueDate' | 'availableUntil'; diffMs: number }>
}) => {
  console.log('⏳ [INFO] Lab timer extended:', payload)
}

// Data Loading
const loadLabData = async () => {
  console.log('🚀 [DEBUG] loadLabData started')
  console.log('🚀 [DEBUG] courseId:', courseId.value)
  console.log('🚀 [DEBUG] labId:', labId.value)

  try {
    // Load course and lab in parallel
    console.log('🚀 [DEBUG] Loading course and lab...')
    await Promise.all([
      fetchCourse(courseId.value),
      fetchLabById(labId.value)
    ])

    console.log('🚀 [DEBUG] Course and lab data loaded')
    console.log('🚀 [DEBUG] currentLab.value:', currentLab.value)

    initializeInstructionsState()

    // Then load parts data
    if (currentLab.value) {
      console.log('🚀 [DEBUG] Lab found, fetching parts with labId:', labId.value)
      const parts = await fetchLabParts(labId.value) // Use labId directly as specified in API
      console.log('🚀 [DEBUG] Parts fetched:', parts)

      // Load personalized IPs first so we know the active session before checking completion
      await loadPersonalizedIPs()

      // If not showing results modal, perform a completion check for the active attempt
      if (!showResultsModal.value) {
        await checkLabCompletion()
      }
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
    const parsed = parseInt(newPart, 10)
    if (Number.isNaN(parsed)) {
      return
    }

    const partIndex = parsed <= 0 ? 0 : parsed
    if (partIndex >= 0 && partIndex < totalParts.value && canAccessPart(partIndex)) {
      currentPartIndex.value = partIndex
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Lab Results Modal -->
    <LabResultsModal
      :is-open="showResultsModal"
      :course-id="courseId"
      :lab-name="currentLab?.title || 'Lab'"
      :submissions="studentSubmissions"
      :active-lab-session-id="activeLabSessionId"
      :lab-parts="actualLabParts || []"
      :mode="timerExpiredModalMode"
      :available-until="currentLab?.availableUntil"
      :is-fresh-completion="isFreshCompletion"
      :initially-collapsed="showCollapsedSummary"
      @start-over="handleRestartLabFromResults()"
      @close="handleCloseResultsModal()"
    />

    <!-- Lab Timer (Fixed at bottom center) -->
    <LabTimer
      v-if="!isLoadingIPs && !isLoading && !isLoadingParts && currentLab"
      :available-from="currentLab?.availableFrom"
      :due-date="currentLab?.dueDate"
      :available-until="currentLab?.availableUntil"
      :created-at="currentLab?.createdAt"
      :lab-id="labId"
      :poll-interval-ms="45000"
      @timer-expired="handleTimerExpired"
      @deadline-extended="handleDeadlineExtended"
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
      <div v-if="!shouldHideStudentContent" class="w-[30%] min-w-[380px] max-w-[420px] border-r bg-card/30 backdrop-blur-sm flex flex-col">
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
                        Part {{ part.isPartZero ? 0 : index }}: {{ part.title }}
                      </h3>
                      <Badge
                        v-if="part.isPartZero && completedParts.has(part.id)"
                        variant="secondary"
                        class="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 ml-2"
                      >
                        Acknowledged
                      </Badge>
                      <Badge
                        v-else-if="completedParts.has(part.id)"
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
                    
                      <div
                        v-if="!part.isPartZero"
                        class="flex items-center space-x-3 text-xs text-muted-foreground mb-2"
                      >
                        <div class="flex items-center space-x-1">
                          <Award class="w-3 h-3" />
                          <span>{{ part.totalPoints || 0 }} pts</span>
                        </div>
                      </div>
                    
                    <!-- Prerequisites -->
                    <div
                      v-if="!part.isPartZero && part.prerequisites?.length"
                      class="flex items-center space-x-1 text-xs text-amber-600"
                    >
                      <Lock class="w-3 h-3" />
                      <span>Requires: {{ part.prerequisites.join(', ') }}</span>
                    </div>
                    <div
                      v-else-if="!part.isPartZero && !instructionsAcknowledged"
                      class="flex items-center space-x-1 text-xs text-amber-600"
                    >
                      <Lock class="w-3 h-3" />
                      <span>Requires: Student Instructions</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      <!-- Main Content Area (70%) -->
      <div class="flex-1 flex flex-col bg-background" v-if="!shouldHideStudentContent">
        <!-- Current Part Header -->
        <div v-if="currentPart" class="border-b bg-card/50 backdrop-blur-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-foreground">
                Part {{ currentPartDisplayNumber }}: {{ currentPart.title }}
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
          <div
            v-if="!currentPart.isPartZero"
            class="flex items-center space-x-6 text-sm text-muted-foreground"
          >
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

            <Card
              v-if="currentPart.isPartZero"
              class="shadow-sm border-emerald-200 bg-emerald-50/60"
            >
              <CardHeader class="pb-3">
                <CardTitle class="flex items-center space-x-3 text-lg text-emerald-800">
                  <div class="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle class="w-5 h-5 text-emerald-700" />
                  </div>
                  <span>Confirm you understand the instructions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <div class="flex items-start gap-3">
                    <Checkbox
                      id="ack-instructions"
                      v-model="instructionsAckChecked"
                      :disabled="instructionsAcknowledged"
                    />
                    <Label for="ack-instructions" class="text-sm text-muted-foreground leading-snug">
                      I have read and understand the instructions above. I agree to follow these rules while working on this lab.
                    </Label>
                  </div>

                  <p v-if="instructionsAckError" class="text-sm text-destructive">
                    {{ instructionsAckError }}
                  </p>

                  <div
                    v-if="instructionsAcknowledged"
                    class="flex items-center gap-2 text-xs text-emerald-700"
                  >
                    <CheckCircle class="w-4 h-4" />
                    <span>Acknowledged {{ instructionsAcknowledgedLabel }}</span>
                  </div>
                </div>
            </CardContent>
          </Card>

            <template v-else>
              <!-- Variable Reference Table (VLAN A-J, CIDR Q-Z) -->
              <Card v-if="variableReferenceTable.length > 0" class="shadow-sm">
                <CardHeader class="pb-4">
                  <CardTitle class="flex items-center space-x-3 text-xl">
                    <div class="p-2 bg-purple-100 rounded-lg">
                      <BookOpen class="w-5 h-5 text-purple-600" />
                    </div>
                    <span>Network Variables</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead class="font-semibold">Variable</TableHead>
                          <TableHead class="font-semibold">VLAN ID</TableHead>
                          <TableHead class="font-semibold">Variable</TableHead>
                          <TableHead class="font-semibold">Network (CIDR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow
                          v-for="(variable, index) in variableReferenceTable"
                          :key="`variable-${index}`"
                          class="hover:bg-muted/30"
                        >
                          <TableCell class="font-mono font-semibold text-purple-600">{{ variable.vlanVariable }}</TableCell>
                          <TableCell class="font-mono text-sm">{{ variable.vlanValue }}</TableCell>
                          <TableCell class="font-mono font-semibold text-purple-600">{{ variable.cidrVariable }}</TableCell>
                          <TableCell class="font-mono text-sm">{{ variable.cidrValue }}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <!-- Device Management Table -->
              <Card v-if="deviceManagementTable.length > 0" class="shadow-sm">
                <CardHeader class="pb-4">
                  <CardTitle class="flex items-center space-x-3 text-xl">
                    <div class="p-2 bg-blue-100 rounded-lg">
                      <Server class="w-5 h-5 text-blue-600" />
                    </div>
                    <span>Your Devices</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead class="font-semibold">Device (Management Interface)</TableHead>
                          <TableHead class="font-semibold">Management IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow
                          v-for="(device, index) in deviceManagementTable"
                          :key="`device-${index}`"
                          class="hover:bg-muted/30"
                        >
                          <TableCell class="font-medium">{{ device.deviceDisplay }}</TableCell>
                          <TableCell class="font-mono text-sm text-blue-600">{{ device.managementIp }}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <!-- Fill-in-Blank Questions -->
              <div v-if="hasFillInBlankQuestions && currentPart">
                <FillInBlankQuestions
                  ref="fillInBlankQuestionsRef"
                  :questions="currentPart.questions"
                  :labId="labId"
                  :partId="currentPart.partId"
                  :lab-session-id="activeLabSessionId"
                  :show-submit-button="!isFillInBlankPart"
                  @submitted="handleFillInBlankSubmissionResult"
                />
              </div>
            </template>

          </div>
        </ScrollArea>

        <!-- Bottom Action Bar -->
        <div class="border-t bg-card/80 backdrop-blur-sm">
          <!-- Part Submission Area -->
          <div v-if="currentPart" class="p-6">
          <div class="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div class="flex-1">
              <template v-if="currentPart.isPartZero">
                <h3 class="font-semibold text-lg mb-1">
                  {{ instructionsAcknowledged ? 'Instructions acknowledged' : 'Acknowledge the instructions to continue' }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  These terms must be accepted before you can access the rest of the lab parts.
                  <span v-if="instructionsAcknowledged" class="font-medium text-emerald-700 ml-1">
                    Acknowledged {{ instructionsAcknowledgedLabel }}
                  </span>
                </p>
              </template>
              <template v-else-if="isFillInBlankPart">
                <h3 class="font-semibold text-lg mb-1">
                  <span v-if="fillInBlankSubmission?.passed">
                    Part {{ currentPartDisplayNumber }} Completed!
                  </span>
                  <span v-else-if="fillInBlankSubmission">
                    Keep Going — Review Your Results
                  </span>
                  <span v-else>
                    Ready to Submit Part {{ currentPartDisplayNumber }}?
                  </span>
                </h3>
                <p class="text-sm text-muted-foreground">
                  <span v-if="fillInBlankSubmission">
                    You earned {{ fillInBlankSubmission.totalPointsEarned }}/{{ fillInBlankSubmission.totalPoints }} points.
                    <span v-if="fillInBlankSubmission.passed" class="font-medium text-primary ml-1">Great work!</span>
                  </span>
                  <span v-else>
                    Submit your answers to auto-grade this part.
                    <span class="font-medium text-primary ml-1">{{ currentPart.totalPoints }} points available</span>
                  </span>
                </p>
                <p v-if="fillInBlankSubmission?.submission?.attempt" class="text-xs text-muted-foreground">
                  Attempt #{{ fillInBlankSubmission?.submission?.attempt }}
                </p>
              </template>
              <template v-else>
                <h3 class="font-semibold text-lg mb-1">
                  {{ currentGradingStatus.status === 'completed' && currentGradingStatus.results?.total_points_earned > 0 
                     ? `Part ${currentPartDisplayNumber} Completed!` 
                     : `Ready to Submit Part ${currentPartDisplayNumber}?` }}
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
              </template>
            </div>
            <div class="flex items-center space-x-3">
              <template v-if="currentPart.isPartZero">
                <Button
                  variant="success"
                  size="lg"
                  class="min-w-[180px]"
                  :disabled="instructionsAcknowledged || !instructionsAckChecked || instructionsAckLoading"
                  @click="acknowledgeInstructions"
                >
                  <Loader2 v-if="instructionsAckLoading" class="w-4 h-4 mr-2 animate-spin" />
                  <CheckCircle2 v-else-if="instructionsAcknowledged" class="w-4 h-4 mr-2" />
                  <Send v-else class="w-4 h-4 mr-2" />
                  <span>{{ instructionsAcknowledged ? 'Acknowledged' : 'Submit' }}</span>
                </Button>
                <p v-if="instructionsAckError" class="text-sm text-destructive">
                  {{ instructionsAckError }}
                </p>
              </template>
              <template v-else-if="isFillInBlankPart">
                <Button
                  size="lg"
                  class="min-w-[180px]"
                  :disabled="(fillInBlankQuestionsRef?.isSubmitting?.value ?? false) || (fillInBlankSubmission?.passed === true && !isUpdateModeRoute)"
                  @click="handleFillInBlankSubmit"
                >
                  <Loader2 v-if="fillInBlankQuestionsRef?.isSubmitting?.value" class="w-4 h-4 mr-2 animate-spin" />
                  <Send v-else class="w-4 h-4 mr-2" />
                  Submit for Grading
                </Button>
              </template>
              <template v-else>
                <!-- Grading Progress Component -->
                <GradingProgress
                  :status="currentGradingStatus.status"
                  :progress="currentGradingStatus.progress"
                  :results="currentGradingStatus.results"
                  :error="currentGradingStatus.error"
                  :total-test-cases="currentPartTotalTestCases"
                  @submit="submitPartForGrading"
                  @toggle-details="toggleProgressDetails(labId, currentPart.partId)"
                  @close-results="clearGradingResults(labId, currentPart.partId)"
                />
              </template>
            </div>
          </div>
          </div>

        </div>
      </div>
    </div>

    <!-- No Parts Available -->
    <div v-else-if="currentLab && (!actualLabParts || actualLabParts.length === 0)" class="p-12 text-center">
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
