<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
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
  Send,
  History,
  ExternalLink,
  Network
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
import LabResultsModal from '@/components/student/LabResultsModal.vue'
import FillInBlankQuestions from '@/components/student/FillInBlankQuestions.vue'
import PlaygroundTab from '@/components/playground/PlaygroundTab.vue'
import StudentGns3SetupModal from '@/components/student/StudentGns3SetupModal.vue'
import type { ISubmission, LecturerRangeAnswerPayload } from '@/types/submission'
import { toast } from 'vue-sonner'

type FillInBlankSubmissionPayload = {
  results: any[]
  totalPointsEarned: number
  totalPoints: number
  passed: boolean
  ipTableAnswers?: Record<string, string[][]>  // Answers from database
  submission?: {
    id?: string
    attempt?: number
    status?: string
    submittedAt?: string
  }
}


type StoredFillInBlankPayload = {
  answers?: Record<string, string>
  ipTableAnswers?: Record<string, string[][]>
  validatedIpTableAnswers?: Record<string, string[][]>
  timestamp?: number
}

// Configure marked for safe HTML rendering
marked.setOptions({
  gfm: true,
  breaks: true,
})

const route = useRoute()
const router = useRouter()
const DOMPURIFY_TEXT_COLOR_CONFIG = {
  ADD_ATTR: ['style'],
  ALLOWED_CSS: ['color']
}
const EMPTY_PARAGRAPH_REGEX = /\<p\>(?:\s|\&nbsp;|\<br\s*\/?\>)*\<\/p\>/gi

const normalizeEmptyParagraphs = (html: string): string => {
  return html.replace(
    EMPTY_PARAGRAPH_REGEX,
    '<p class="lab-empty-line"><span aria-hidden="true">&nbsp;</span></p>'
  )
}

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
const completedTasks = ref<Record<string, Set<string>>>({}) // partId -> Set of taskIds
const isSubmittingPart = ref(false)
const isOperationInProgress = ref(false) // Mutex for submit/restart operations
const progress = ref<Record<string, number>>({}) // partId -> percentage
const fillInBlankQuestionsRef = ref<InstanceType<typeof FillInBlankQuestions> | null>(null)
const fillInBlankSubmissions = ref<Record<string, FillInBlankSubmissionPayload | null>>({})

// Part 0 Instructions acknowledgement state
const instructionsAcknowledged = ref(false)
const instructionsAcknowledgedAt = ref<Date | null>(null)
const instructionsAckChecked = ref(false)
const instructionsAckLoading = ref(false)
const instructionsAckError = ref('')
const lastAutoNavigatedIndex = ref<number | null>(null)

// Multi-tab prevention
const currentTabId = ref<string>(Math.random().toString(36).substring(2, 15))
const isDuplicateTab = ref(false)
const labBroadcastChannel = ref<BroadcastChannel | null>(null)

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

const buildFillInStorageKey = (identifier: string, labIdentifier: string, partId: string) =>
  `${SESSION_STORAGE_PREFIX}${identifier}:${labIdentifier}:${partId}`

const parseStoredFillInPayload = (key: string): StoredFillInBlankPayload | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as StoredFillInBlankPayload
  } catch (error) {
    console.warn('[StudentLabView] Failed to parse stored fill-in-blank payload:', { key, error })
    return null
  }
}

const getStoredFillInPayload = (partId: string): StoredFillInBlankPayload | null => {
  if (typeof window === 'undefined') return null

  const currentLabId = labId.value
  if (!currentLabId) return null

  const identifiers: string[] = []
  if (resolvedUserId.value) {
    identifiers.push(resolvedUserId.value)
  }
  identifiers.push('anonymous')

  for (const identifier of identifiers) {
    const key = buildFillInStorageKey(identifier, currentLabId, partId)
    const payload = parseStoredFillInPayload(key)
    if (payload) {
      return payload
    }
  }

  return null
}

const collectLecturerRangeOverrides = (): LecturerRangeAnswerPayload[] => {
  if (typeof window === 'undefined') return []

  const overrides: LecturerRangeAnswerPayload[] = []

  actualLabParts.value?.forEach(part => {
    if (!part || part.partType !== 'fill_in_blank' || !part.questions?.length) {
      return
    }

    const payload = getStoredFillInPayload(part.partId)
    if (!payload || !payload.validatedIpTableAnswers) {
      return
    }

    part.questions.forEach(question => {
      if (question.questionType !== 'ip_table_questionnaire' || !question.ipTableQuestionnaire) {
        return
      }

      const storedAnswers = payload.validatedIpTableAnswers?.[question.questionId]
      if (!storedAnswers) {
        return
      }

      question.ipTableQuestionnaire.cells.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (!cell || (cell.cellType ?? 'input') !== 'input') {
            return
          }

          if (cell.answerType !== 'calculated' || !cell.calculatedAnswer) {
            return
          }

          if (cell.calculatedAnswer.calculationType !== 'vlan_lecturer_range') {
            return
          }

          const value = storedAnswers[rowIndex]?.[colIndex]?.trim()
          if (!value) {
            return
          }

          const rowMeta = question.ipTableQuestionnaire.rows?.[rowIndex]

          let resolvedDeviceId = cell.calculatedAnswer.deviceId || rowMeta?.deviceId
          let resolvedInterfaceName = cell.calculatedAnswer.interfaceName || rowMeta?.interfaceName

          if ((!resolvedDeviceId || !resolvedInterfaceName) && typeof rowMeta?.displayName === 'string') {
            const [parsedDeviceId, parsedInterfaceName] = rowMeta.displayName.split('.')
            if (!resolvedDeviceId && parsedDeviceId) {
              resolvedDeviceId = parsedDeviceId.trim()
            }
            if (!resolvedInterfaceName && parsedInterfaceName) {
              resolvedInterfaceName = parsedInterfaceName.trim()
            }
          }

          if (!resolvedDeviceId || !resolvedInterfaceName) {
            return
          }

          overrides.push({
            sourcePartId: part.partId,
            questionId: question.questionId,
            rowIndex,
            colIndex,
            answer: value,
            deviceId: resolvedDeviceId,
            interfaceName: resolvedInterfaceName,
            vlanIndex: cell.calculatedAnswer.vlanIndex
          })
        })
      })
    })
  })

  return overrides
}

// Collect SLAAC IPv6 overrides from IP Table Questionnaires (works like lecturer range)
const collectSlaacOverrides = (): LecturerRangeAnswerPayload[] => {
  if (typeof window === 'undefined') return []

  const overrides: LecturerRangeAnswerPayload[] = []

  actualLabParts.value?.forEach(part => {
    if (!part || part.partType !== 'fill_in_blank' || !part.questions?.length) {
      return
    }

    const payload = getStoredFillInPayload(part.partId)
    if (!payload || !payload.validatedIpTableAnswers) {
      return
    }

    part.questions.forEach(question => {
      if (question.questionType !== 'ip_table_questionnaire' || !question.ipTableQuestionnaire) {
        return
      }

      const storedAnswers = payload.validatedIpTableAnswers?.[question.questionId]
      if (!storedAnswers) {
        return
      }

      question.ipTableQuestionnaire.cells.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (!cell || (cell.cellType ?? 'input') !== 'input') {
            return
          }

          if (cell.answerType !== 'calculated' || !cell.calculatedAnswer) {
            return
          }

          // Only process SLAAC cells
          if (cell.calculatedAnswer.calculationType !== 'ipv6_slaac') {
            return
          }

          const value = storedAnswers[rowIndex]?.[colIndex]?.trim()
          if (!value) {
            return
          }

          const rowMeta = question.ipTableQuestionnaire.rows?.[rowIndex]

          let resolvedDeviceId = cell.calculatedAnswer.deviceId || rowMeta?.deviceId
          let resolvedInterfaceName = cell.calculatedAnswer.interfaceName || rowMeta?.interfaceName

          if ((!resolvedDeviceId || !resolvedInterfaceName) && typeof rowMeta?.displayName === 'string') {
            const [parsedDeviceId, parsedInterfaceName] = rowMeta.displayName.split('.')
            if (!resolvedDeviceId && parsedDeviceId) {
              resolvedDeviceId = parsedDeviceId.trim()
            }
            if (!resolvedInterfaceName && parsedInterfaceName) {
              resolvedInterfaceName = parsedInterfaceName.trim()
            }
          }

          if (!resolvedDeviceId || !resolvedInterfaceName) {
            return
          }

          overrides.push({
            sourcePartId: part.partId,
            questionId: question.questionId,
            rowIndex,
            colIndex,
            answer: value,
            deviceId: resolvedDeviceId,
            interfaceName: resolvedInterfaceName,
            vlanIndex: cell.calculatedAnswer.vlanIndex
          })
        })
      })
    })
  })

  return overrides
}
const clearFillInBlankStorageForLab = () => {
  if (typeof window === 'undefined') return

  const currentLabId = labId.value
  if (!currentLabId) return

  const keysToRemove: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key &&
      key.startsWith(SESSION_STORAGE_PREFIX) &&
      key.includes(`:${currentLabId}:`)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* no-op */
    }
  })
}

// IP Loading and Completion State
const isLoadingIPs = ref(true)
const ipLoadingStatus = ref('Gathering your IP addresses...')
const backendIpMappings = ref<Record<string, { ip: string; vlan: number | null }>>({})
const backendVlanMappings = ref<Record<string, number>>({})
const backendVlanSubnets = ref<Record<number, { baseNetwork: string; subnetMask: number }>>({})
const backendLargeSubnetInfo = ref<{
  allocatedSubnet: string;
  networkAddress: string;
  subnetMask: number;
  randomizedVlanIds: number[];
  subVlans: Array<{
    name: string;
    subnetSize: number;
    subnetIndex: number;
    vlanId: number;
  }>;
} | null>(null)
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
const hasClearedLabStorage = ref(false)

// GNS3 Setup Modal State
const showGns3SetupModal = ref(false)
const hasGns3Project = ref(false)
const GNS3_PROJECT_STORAGE_KEY = 'netgrader_gns3_project'

// Clear GNS3 project data from localStorage when navigating away from the lab page
const clearGns3ProjectData = () => {
  if (typeof window === 'undefined') return

  try {
    const saved = localStorage.getItem(GNS3_PROJECT_STORAGE_KEY)
    if (saved) {
      const config = JSON.parse(saved)
      // Only clear if it matches the current lab to avoid clearing other sessions
      if (config.labId === labId.value) {
        localStorage.removeItem(GNS3_PROJECT_STORAGE_KEY)
        console.log('[GNS3 Cleanup] Cleared GNS3 project data for lab:', labId.value)
      }
    }
  } catch (e) {
    // Ignore parse errors, just try to remove the item
    localStorage.removeItem(GNS3_PROJECT_STORAGE_KEY)
    console.log('[GNS3 Cleanup] Cleared GNS3 project data (error during parse)')
  }
}

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

const currentPartKey = computed(() => currentPart.value?.partId || currentPart.value?.id || null)

const currentFillInBlankSubmission = computed(() => {
  const key = currentPartKey.value
  if (!key) return null
  return fillInBlankSubmissions.value[key] ?? null
})

const currentPartHasLecturerRangeCells = computed(() => {
  const part = currentPart.value
  if (!part?.questions?.length) {
    return false
  }

  return part.questions.some(question => {
    if (question.questionType !== 'ip_table_questionnaire' || !question.ipTableQuestionnaire?.cells) {
      return false
    }

    return question.ipTableQuestionnaire.cells.some(row =>
      row?.some(cell =>
        cell &&
        (cell.cellType ?? 'input') === 'input' &&
        cell.answerType === 'calculated' &&
        // Check for both DHCP (lecturer range) and SLAAC (IPv6) student-updatable cells
        (cell.calculatedAnswer?.calculationType === 'vlan_lecturer_range' ||
         cell.calculatedAnswer?.calculationType === 'ipv6_slaac')
      )
    )
  })
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

    // Use direct VLAN mapping from backend (fixes VLAN C+ showing hyphens)
    const vlanId = backendVlanMappings.value[`vlan${index}`]
      ?? (isLoadingIPs.value ? 'Loading...' : '-')

    // Use direct subnet info from backend for CIDR calculation
    const subnetInfo = backendVlanSubnets.value[index]
    const cidrValue = subnetInfo
      ? `${subnetInfo.baseNetwork}/${subnetInfo.subnetMask}`
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

// Check if current lab is in Large Subnet Mode
const isLargeSubnetMode = computed(() => {
  return currentLab.value?.network?.vlanConfiguration?.mode === 'large_subnet'
})

// Large Subnet Reference Table - Shows allocated subnet and sub-VLAN mappings
const largeSubnetReferenceTable = computed(() => {
  if (!isLargeSubnetMode.value || !backendLargeSubnetInfo.value) return null

  const vlanLetters = 'ABCDEFGHIJ'.split('')
  const info = backendLargeSubnetInfo.value

  return {
    allocatedSubnet: info.allocatedSubnet || '-',
    networkAddress: info.networkAddress || '-',
    subnetMask: info.subnetMask || 0,
    subVlans: info.subVlans?.map((sv, idx) => ({
      vlanVariable: `VLAN ${vlanLetters[idx] || idx}`,
      name: sv.name,
      vlanId: sv.vlanId,
      subnetIndex: sv.subnetIndex
    })) || []
  }
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

  const sanitized = DOMPurify.sanitize(htmlContent, DOMPURIFY_TEXT_COLOR_CONFIG)
  return normalizeEmptyParagraphs(sanitized)
}

// Navigation Methods
const selectPart = (index: number) => {
  if (!canAccessPart(index)) return
  currentPartIndex.value = index
}

const goToPreviousPart = useDebounceFn(() => {
  if (currentPartIndex.value > 0) {
    const prevIndex = currentPartIndex.value - 1
    if (canAccessPart(prevIndex)) {
      currentPartIndex.value = prevIndex
    }
  }
}, 300)

const goToNextPart = useDebounceFn(() => {
  if (currentPartIndex.value < totalParts.value - 1) {
    const nextIndex = currentPartIndex.value + 1
    if (canAccessPart(nextIndex)) {
      currentPartIndex.value = nextIndex
    }
  }
}, 300)

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

    // Show GNS3 setup modal after acknowledging instructions if no project configured
    checkAndShowGns3Modal()

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

// GNS3 Setup Modal handlers
function checkGns3ProjectExists(): boolean {
  try {
    const saved = localStorage.getItem(GNS3_PROJECT_STORAGE_KEY)
    if (saved) {
      const config = JSON.parse(saved)
      // Check if config exists for current lab
      if (config.labId === labId.value && config.projectName) {
        return true
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return false
}

function checkAndShowGns3Modal() {
  console.log('[GNS3 Modal Debug] checkAndShowGns3Modal called')
  console.log('[GNS3 Modal Debug] instructionsAcknowledged:', instructionsAcknowledged.value)
  
  const projectExists = checkGns3ProjectExists()
  console.log('[GNS3 Modal Debug] projectExists:', projectExists)
  
  if (!projectExists) {
    console.log('[GNS3 Modal Debug] Showing modal - no project found')
    showGns3SetupModal.value = true
  } else {
    console.log('[GNS3 Modal Debug] Not showing modal - project already exists')
    hasGns3Project.value = true
  }
}

function handleGns3SetupComplete(config: {
  serverIp: string
  serverPort: number
  projectId: string
  projectName: string
}) {
  hasGns3Project.value = true
  showGns3SetupModal.value = false
  toast.success(`GNS3 project "${config.projectName}" configured successfully!`)
}

// Grading Submission
const submitPartForGrading = async (): Promise<{ success: boolean; isExpired?: boolean }> => {
  if (!currentPart.value) return { success: false }

  try {
    const lecturerRangeOverrides = collectLecturerRangeOverrides()
    const slaacOverrides = collectSlaacOverrides()

    // Get projectId from localStorage (GNS3 project config)
    let projectId = ''
    try {
      const saved = localStorage.getItem(GNS3_PROJECT_STORAGE_KEY)
      if (saved) {
        const config = JSON.parse(saved)
        if (config.labId === labId.value && config.projectId) {
          projectId = config.projectId
        }
      }
    } catch (e) {
      console.warn('[submitPartForGrading] Failed to get projectId from localStorage:', e)
    }

    const result = await createSubmission(
      labId.value,
      currentPart.value.partId,
      {
        projectId,
        labSessionId: activeLabSessionId.value ?? undefined,
        lecturerRangeAnswers: lecturerRangeOverrides.length > 0 ? lecturerRangeOverrides : undefined,
        slaacAnswers: slaacOverrides.length > 0 ? slaacOverrides : undefined
      }
    )

    if (result.success) {
      console.log('Submission created successfully:', result.jobId)
      return { success: true }
    } else {
      console.error('❌ Failed to create submission:', result.error)
      
      // Show error toast with specific message for lab expired
      if (result.isExpired) {
        toast.error('Lab Expired', {
          description: 'This lab is no longer accepting submissions. Your time has run out.'
        })
      } else if (result.errorCode === 429) {
        toast.error('Please Wait', {
          description: result.error || 'Please wait before submitting again.'
        })
      } else {
        toast.error('Submission Failed', {
          description: result.error || 'Failed to submit. Please try again.'
        })
      }
      
      return { success: false, isExpired: result.isExpired }
    }
  } catch (error: any) {
    console.error('❌ Error during submission:', error)
    toast.error('Submission Error', {
      description: error.message || 'An unexpected error occurred.'
    })
    return { success: false }
  }
}

const handleFillInBlankSubmissionResult = (result: FillInBlankSubmissionPayload) => {
  const partKey = currentPartKey.value

  if (partKey) {
    fillInBlankSubmissions.value = {
      ...fillInBlankSubmissions.value,
      [partKey]: result
    }
  }

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
  if (result) {
    handleFillInBlankSubmissionResult(result)
  }
}

const fillInBlankActionButtonLabel = computed(() => {
  if (currentFillInBlankSubmission.value?.passed && currentPartHasLecturerRangeCells.value) {
    return 'Update IP Schema'
  }
  return 'Submit for Grading'
})

const fillInBlankActionButtonDisabled = computed(() => {
  return fillInBlankQuestionsRef.value?.isSubmitting?.value ?? false
})

// Get current grading status for display
const currentGradingStatus = computed(() => {
  if (!currentPart.value) return { status: 'idle', message: 'Ready to submit' }
  const status = getGradingStatus(labId.value, currentPart.value.partId)
  console.log('[DEBUG] Current grading status:', status)
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

      console.log('Part completed and marked as done:', currentPart.value.partId)

      // Check if ALL parts are now completed to show completion modal
      // Add a small delay so student can see the grading results first
      setTimeout(async () => {
        await checkLabCompletion()
      }, 2000)
    }
  }
})

watch(() => currentPart.value?.id, () => {
  fillInBlankQuestionsRef.value = null
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
const resolvedUserId = computed(() => userState.value?.u_id ?? null)

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

const toFillInBlankSubmissionPayload = (submission: ISubmission): FillInBlankSubmissionPayload | null => {
  if (!submission.fillInBlankResults) {
    return null
  }

  const { questions, totalPoints, totalPointsEarned, passed } = submission.fillInBlankResults

  const results = questions.map(question => ({
    questionId: question.questionId,
    isCorrect: question.isCorrect,
    pointsEarned: question.pointsEarned
  }))

  // NEW: Extract ipTableAnswers from questions (stored in database from previous submissions)
  const ipTableAnswers: Record<string, string[][]> = {}
  questions.forEach(q => {
    if (q.ipTableAnswers && Array.isArray(q.ipTableAnswers) && q.ipTableAnswers.length > 0) {
      ipTableAnswers[q.questionId] = q.ipTableAnswers
    }
  })

  const submittedAt = submission.submittedAt
  const submittedAtString = submittedAt instanceof Date
    ? submittedAt.toISOString()
    : typeof submittedAt === 'string'
      ? submittedAt
      : undefined

  return {
    results,
    totalPointsEarned,
    totalPoints,
    passed,
    ipTableAnswers, // Include answers from database
    submission: {
      id: submission.jobId,
      attempt: submission.attempt,
      status: submission.status,
      submittedAt: submittedAtString
    }
  }
}


const syncFillInBlankSubmissionsFromHistory = (submissions: ISubmission[]) => {
  if (!Array.isArray(submissions) || !submissions.length) {
    return
  }

  const latestByPart = buildLatestSubmissionsMap(submissions)
  const next: Record<string, FillInBlankSubmissionPayload | null> = { ...fillInBlankSubmissions.value }

  Object.entries(latestByPart).forEach(([partId, submission]) => {
    if (submission.submissionType !== 'fill_in_blank') {
      return
    }

    const payload = toFillInBlankSubmissionPayload(submission)
    if (payload) {
      next[partId] = payload
    }
  })

  fillInBlankSubmissions.value = next
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
      console.log('[DEBUG] Active lab session not available yet, skipping completion check')
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
      syncFillInBlankSubmissionsFromHistory(result.submissions)

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

      // CRITICAL FIX: Sync the completedParts Set from submission history
      // This ensures that when a student returns to the lab, parts that were previously
      // completed (with full points) are correctly marked as completed, unlocking subsequent parts
      completedPartIds.forEach(partId => {
        // Find the actual part to get its id (not partId)
        const part = actualLabParts.value?.find(p => p.partId === partId)
        if (part) {
          completedParts.value.add(part.id)
          console.log('[DEBUG] Synced completed part from history:', partId, '-> id:', part.id)
        }
      })

      if (!completionStatus.value.isFullyCompleted) {
        attemptResumeNavigation(result.submissions)
      }

      // Show completion modal if lab is fully completed
      if (completionStatus.value.isFullyCompleted && instructionsAcknowledged.value) {
        if (!hasClearedLabStorage.value) {
          clearFillInBlankStorageForLab()
          hasClearedLabStorage.value = true
        }

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
      backendVlanSubnets.value = result.data.networkConfiguration.vlanSubnets || {}
      
      // Store Large Subnet Info for Large Subnet Mode
      if (result.data.networkConfiguration.largeSubnetInfo) {
        backendLargeSubnetInfo.value = result.data.networkConfiguration.largeSubnetInfo
        console.log('[DEBUG] Large Subnet Info:', backendLargeSubnetInfo.value)
      } else {
        backendLargeSubnetInfo.value = null
      }

      console.log('[DEBUG] Loaded personalized IPs:', {
        ipMappings: backendIpMappings.value,
        vlanMappings: backendVlanMappings.value,
        vlanSubnets: backendVlanSubnets.value,
        largeSubnetInfo: backendLargeSubnetInfo.value
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
  // Prevent race condition with ongoing submit operations
  if (isOperationInProgress.value || isSubmittingPart.value) {
    console.warn('⚠️ Cannot restart: another operation is in progress')
    return
  }
  
  isOperationInProgress.value = true
  try {
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
    hasClearedLabStorage.value = false
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
  } finally {
    isOperationInProgress.value = false
  }
}

// Handle modal close
const handleCloseResultsModal = () => {
  showResultsModal.value = false
  showCollapsedSummary.value = false
  isFreshCompletion.value = false
}

// Handle timer expiration - auto-submit current part before showing modal
const isAutoSubmitting = ref(false)

const autoSubmitCurrentPart = async (): Promise<{ success: boolean; submitted: boolean }> => {
  if (!currentPart.value) {
    return { success: false, submitted: false }
  }
  
  const partType = currentPart.value.partType
  const partTitle = currentPart.value.title
  
  console.log(`Auto-submitting part "${partTitle}" (type: ${partType})...`)
  
  try {
    if (partType === 'fill_in_blank') {
      // For fill-in-blank parts, use forceSubmit to submit partial answers
      if (fillInBlankQuestionsRef.value) {
        const result = await fillInBlankQuestionsRef.value.submitAnswers({ forceSubmit: true })
        if (result) {
          handleFillInBlankSubmissionResult(result)
          return { success: true, submitted: true }
        }
        // Even if result is null, we still "submitted" (just nothing to submit)
        return { success: true, submitted: false }
      }
    } else if (partType === 'network_config' || partType === 'dhcp_config') {
      // For network configuration parts, trigger the grading submission
      const result = await submitPartForGrading()
      return { success: result.success, submitted: true }
    }
    
    // For other part types (like instructions), nothing to submit
    return { success: true, submitted: false }
  } catch (error: any) {
    console.error('⏰ Auto-submit failed:', error)
    return { success: false, submitted: false }
  }
}

const handleTimerExpired = async () => {
  console.log('Timer expired!')
  
  // Prevent multiple auto-submit attempts
  if (isAutoSubmitting.value) {
    console.log('Auto-submit already in progress, skipping...')
    return
  }
  
  isAutoSubmitting.value = true
  
  try {
    // Check if the current part has not been completed yet
    const isCurrentPartCompleted = currentPart.value 
      ? completedParts.value.has(currentPart.value.id)
      : true
    
    if (!isCurrentPartCompleted && currentPart.value) {
      console.log(`Current part "${currentPart.value.title}" not completed, attempting auto-submit...`)
      
      // Show a toast to inform the user
      toast.info('Time\'s up!', {
        description: 'Auto-saving your work before showing results...'
      })
      
      // Auto-submit the current part with a timeout
      const submitPromise = autoSubmitCurrentPart()
      const timeoutPromise = new Promise<{ success: boolean; submitted: boolean }>((resolve) => 
        setTimeout(() => resolve({ success: false, submitted: false }), 3000)
      )
      
      const result = await Promise.race([submitPromise, timeoutPromise])
      
      if (result.submitted && result.success) {
        toast.success('Work Auto-Saved', {
          description: 'Your answers were submitted before time ran out.'
        })
      } else if (result.submitted && !result.success) {
        toast.warning('Auto-Save Incomplete', {
          description: 'Some of your work may not have been saved.'
        })
      }
    } else {
      console.log('Current part already completed or no part selected, skipping auto-submit')
    }
  } catch (error: any) {
    console.error('⏰ Error during timer expiry handling:', error)
  } finally {
    isAutoSubmitting.value = false
  }
  
  // Show the timer expired modal
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
  console.log('[INFO] Lab timer extended:', payload)
}

// Data Loading
const loadLabData = async () => {
  console.log('[DEBUG] loadLabData started')
  console.log('[DEBUG] courseId:', courseId.value)
  console.log('[DEBUG] labId:', labId.value)

  try {
    // Load course and lab in parallel
    console.log('[DEBUG] Loading course and lab...')
    await Promise.all([
      fetchCourse(courseId.value),
      fetchLabById(labId.value)
    ])

    console.log('[DEBUG] Course and lab data loaded')
    console.log('[DEBUG] currentLab.value:', currentLab.value)

    initializeInstructionsState()

    // Then load parts data
    if (currentLab.value) {
      console.log('[DEBUG] Lab found, fetching parts with labId:', labId.value)
      const parts = await fetchLabParts(labId.value) // Use labId directly as specified in API
      console.log('[DEBUG] Parts fetched:', parts)

      // Load personalized IPs first so we know the active session before checking completion
      await loadPersonalizedIPs()

      // If not showing results modal, perform a completion check for the active attempt
      if (!showResultsModal.value) {
        await checkLabCompletion()
      }
    } else {
      console.log('[DEBUG] No currentLab found, skipping parts fetch')
      isLoadingIPs.value = false
    }
  } catch (err) {
    console.error('🚀 [DEBUG] Failed to load lab data:', err)
    isLoadingIPs.value = false
  }
}

// Lifecycle

// Navbar timer composable
const { setTimer, clearTimer } = useNavbarTimer()
const { setEventHandlers, clearEventHandlers } = useNavbarTimerEvents()

// Watch for lab data to set timer
watch(
  () => ({
    loading: isLoadingIPs.value || isLoading.value || isLoadingParts.value,
    lab: currentLab.value
  }),
  ({ loading, lab }) => {
    if (!loading && lab) {
      setTimer({
        availableFrom: lab.availableFrom,
        dueDate: lab.dueDate,
        availableUntil: lab.availableUntil,
        labId: labId.value,
        createdAt: lab.createdAt,
        pollIntervalMs: 45000
      })
      setEventHandlers({
        onTimerExpired: handleTimerExpired,
        onDeadlineExtended: handleDeadlineExtended
      })
    } else {
      clearTimer()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // DISABLED: Multi-tab prevention using BroadcastChannel
  // This feature was causing issues where IP Table answers were wiped when students
  // accidentally opened duplicate tabs. Disabled until a better solution is implemented.
  /*
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !canManageCurrentCourse.value) {
    const channelName = `netgrader_lab_${labId.value}`
    labBroadcastChannel.value = new BroadcastChannel(channelName)
    
    // Listen for other tabs
    labBroadcastChannel.value.onmessage = (event) => {
      if (event.data.type === 'lab_active' && event.data.tabId !== currentTabId.value) {
        // Another tab is already active
        isDuplicateTab.value = true
        console.warn('[Multi-Tab] Duplicate tab detected for lab:', labId.value)
      } else if (event.data.type === 'lab_ping') {
        // Respond to ping from new tabs
        labBroadcastChannel.value?.postMessage({ 
          type: 'lab_active', 
          tabId: currentTabId.value,
          labId: labId.value 
        })
      }
    }
    
    // Announce this tab and ping for other tabs
    labBroadcastChannel.value.postMessage({ 
      type: 'lab_ping', 
      tabId: currentTabId.value,
      labId: labId.value 
    })
    labBroadcastChannel.value.postMessage({ 
      type: 'lab_active', 
      tabId: currentTabId.value,
      labId: labId.value 
    })
  }
  */
  
  await loadLabData()
  
  // For returning users: if instructions already acknowledged but no GNS3 project, show modal
  if (instructionsAcknowledged.value) {
    checkAndShowGns3Modal()
  }
})

onBeforeUnmount(() => {
  clearTimer()
  clearEventHandlers()
  // Clear GNS3 project data when component unmounts
  clearGns3ProjectData()
  // Close BroadcastChannel
  labBroadcastChannel.value?.close()
  labBroadcastChannel.value = null
})

// Clear GNS3 project data when navigating away from the lab page via Vue Router
// Also warn about unsaved changes
onBeforeRouteLeave((to, from, next) => {
  // Check if current part is a fill-in-blank type with potentially unsaved data
  const currentPartData = currentPart.value
  const hasFillInBlank = currentPartData?.partType === 'fill_in_blank'
  
  // If we have a fill-in-blank part and the lab is not completed, warn the user
  if (hasFillInBlank && !showResultsModal.value && !isSubmittingPart.value) {
    const confirmLeave = window.confirm(
      'You have unsaved answers. Are you sure you want to leave this page? Your typed answers may be lost.'
    )
    if (!confirmLeave) {
      next(false)
      return
    }
  }
  
  clearGns3ProjectData()
  next()
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
    <LabResultsModal :is-open="showResultsModal" :course-id="courseId" :lab-name="currentLab?.title || 'Lab'"
      :submissions="studentSubmissions" :active-lab-session-id="activeLabSessionId" :lab-parts="actualLabParts || []"
      :mode="timerExpiredModalMode" :available-until="currentLab?.availableUntil"
      :is-fresh-completion="isFreshCompletion" :initially-collapsed="showCollapsedSummary"
      @start-over="handleRestartLabFromResults()" @close="handleCloseResultsModal()" />

    <!-- GNS3 Setup Modal -->
    <StudentGns3SetupModal
      :open="showGns3SetupModal"
      :lab-id="labId"
      :lab-name="currentLab?.title"
      :course-name="currentCourse?.title"
      :student-id="resolvedUserId || ''"
      @update:open="showGns3SetupModal = $event"
      @complete="handleGns3SetupComplete"
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

    <!-- Duplicate Tab Warning -->
    <div v-if="isDuplicateTab" class="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Alert variant="destructive" class="max-w-md mx-4">
        <AlertCircle class="h-5 w-5" />
        <div class="ml-2">
          <h3 class="font-semibold text-lg">Duplicate Tab Detected</h3>
          <AlertDescription class="mt-2">
            This lab is already open in another browser tab. Please close this tab and continue working in the original tab to avoid losing your progress.
          </AlertDescription>
          <Button 
            class="mt-4 w-full" 
            variant="destructive"
            @click="isDuplicateTab = false"
          >
            Continue Anyway (Not Recommended)
          </Button>
        </div>
      </Alert>
    </div>

    <!-- IP Loading Overlay -->
    <div v-if="isLoadingIPs && !isLoading && !isLoadingParts && currentLab"
      class="fixed inset-x-0 top-[73px] bottom-0 z-40 flex items-center justify-center bg-background/95">
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
      <div v-if="!shouldHideStudentContent"
        class="w-[30%] min-w-[380px] max-w-[420px] border-r bg-card/30 backdrop-blur-sm flex flex-col">
        <!-- Lab Header -->
        <div class="p-6 border-b bg-card/80 backdrop-blur-sm">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div
                class="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center border border-primary/20">
                <BookOpen class="w-7 h-7 text-primary" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="font-bold text-xl truncate text-foreground">{{ currentLab.title }}</h2>
                  <p v-if="currentLab.description" class="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {{ currentLab.description }}
                  </p>
                </div>
                <!-- View Submissions Button (opens in new tab) -->
                <a
                  :href="`/courses/${courseId}/labs/${labId}/submissions`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex-shrink-0 ml-2"
                >
                  <Button variant="outline" size="sm" class="flex items-center space-x-1" title="View Submission History (New Tab)">
                    <History class="w-4 h-4" />
                    <span class="hidden sm:inline">Submissions</span>
                    <ExternalLink class="w-3 h-3 ml-1" />
                  </Button>
                </a>
              </div>
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
              <div class="h-full rounded-full transition-all duration-500 ease-out"
                :class="overallProgress === 100 ? 'bg-green-500' : 'bg-primary'"
                :style="{ width: `${overallProgress}%` }"></div>
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
            <Card v-for="(part, index) in currentLabParts" :key="part.id" :class="[
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
            ]" @click="selectPart(index)">
              <CardContent class="p-4">
                <div class="flex items-start space-x-3">
                  <!-- Status Icon -->
                  <div class="flex-shrink-0 mt-1">
                    <div class="relative">
                      <CheckCircle2 v-if="completedParts.has(part.id)" class="w-6 h-6 text-green-600 drop-shadow-sm" />
                      <Play v-else-if="index === currentPartIndex"
                        class="w-6 h-6 text-primary drop-shadow-sm animate-pulse" />
                      <Lock v-else-if="!canAccessPart(index)" class="w-6 h-6 text-muted-foreground/50" />
                      <Clock v-else class="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>

                  <!-- Part Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between mb-2">
                      <h3 class="font-semibold text-sm leading-tight">
                        Part {{ part.isPartZero ? 0 : index }}: {{ part.title }}
                      </h3>
                      <Badge v-if="part.isPartZero && completedParts.has(part.id)" variant="secondary"
                        class="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 ml-2">
                        Acknowledged
                      </Badge>
                      <Badge v-else-if="completedParts.has(part.id)" variant="secondary"
                        class="text-xs bg-green-100 text-green-800 border-green-200 ml-2">
                        Completed
                      </Badge>
                      <Badge v-else-if="index === currentPartIndex" variant="secondary"
                        class="text-xs bg-primary/15 text-primary border-primary/30 ml-2">
                        Current
                      </Badge>
                    </div>

                    <div v-if="!part.isPartZero" class="flex items-center space-x-3 text-xs text-muted-foreground mb-2">
                      <div class="flex items-center space-x-1">
                        <Award class="w-3 h-3" />
                        <span>{{ part.totalPoints || 0 }} pts</span>
                      </div>
                    </div>

                    <!-- Prerequisites -->
                    <div v-if="!part.isPartZero && part.prerequisites?.length"
                      class="flex items-center space-x-1 text-xs text-amber-600">
                      <Lock class="w-3 h-3" />
                      <span>Requires: {{ part.prerequisites.join(', ') }}</span>
                    </div>
                    <div v-else-if="!part.isPartZero && !instructionsAcknowledged"
                      class="flex items-center space-x-1 text-xs text-amber-600">
                      <Lock class="w-3 h-3" />
                      <span>Requires: Student Instructions</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <!-- Playground Tab for Lecturers/TAs -->
        <div v-if="canManageCurrentCourse" class="border-t p-4">
          <PlaygroundTab :lab-id="labId" :part-id="currentPart?.partId || ''"
            :vlan-config="currentLab?.network?.vlanConfiguration?.vlans" />
        </div>
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
              <Button variant="outline" size="sm" :disabled="currentPartIndex === 0" @click="goToPreviousPart"
                class="shadow-sm">
                <ChevronLeft class="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button variant="outline" size="sm"
                :disabled="currentPartIndex === totalParts - 1 || !canAccessPart(currentPartIndex + 1)"
                @click="goToNextPart" class="shadow-sm">
                Next
                <ChevronRight class="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <!-- Part Metadata -->
          <div v-if="!currentPart.isPartZero" class="flex items-center space-x-6 text-sm text-muted-foreground">
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
                  v-html="renderMarkdown(currentPart.instructions)" />
              </CardContent>
            </Card>

            <Card v-if="currentPart.isPartZero" class="shadow-sm border-emerald-200 bg-emerald-50/60">
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
                    <Checkbox id="ack-instructions" v-model="instructionsAckChecked"
                      :disabled="instructionsAcknowledged" />
                    <Label for="ack-instructions" class="text-sm text-muted-foreground leading-snug">
                      I have read and understand the instructions above. I agree to follow these rules while working on
                      this lab.
                    </Label>
                  </div>

                  <p v-if="instructionsAckError" class="text-sm text-destructive">
                    {{ instructionsAckError }}
                  </p>

                  <div v-if="instructionsAcknowledged" class="flex items-center gap-2 text-xs text-emerald-700">
                    <CheckCircle class="w-4 h-4" />
                    <span>Acknowledged {{ instructionsAcknowledgedLabel }}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <template v-else>
              <!-- Large Subnet Mode - Your Network Allocation -->
              <Card v-if="largeSubnetReferenceTable" class="shadow-sm border-primary/20">
                <CardHeader class="pb-4">
                  <CardTitle class="flex items-center space-x-3 text-xl">
                    <div class="p-2 bg-primary/10 rounded-lg">
                      <Network class="w-5 h-5 text-primary" />
                    </div>
                    <span>Your Network Allocation</span>
                  </CardTitle>
                  <p class="text-sm text-muted-foreground mt-1">
                    Your unique subnet and VLAN assignments for this lab
                  </p>
                </CardHeader>
                <CardContent class="space-y-4">
                  <!-- Allocated Subnet Info -->
                  <div class="flex flex-col sm:flex-row gap-4 p-4 bg-muted/40 rounded-lg border border-primary/10">
                    <div class="flex-1 space-y-1">
                      <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Allocated Subnet</span>
                      <p class="font-mono text-lg font-semibold text-primary">{{ largeSubnetReferenceTable.allocatedSubnet }}</p>
                    </div>
                    <div class="flex-1 space-y-1">
                      <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Network Address</span>
                      <p class="font-mono text-lg font-semibold">{{ largeSubnetReferenceTable.networkAddress }}</p>
                    </div>
                  </div>

                  <!-- Sub-VLAN Mappings Table -->
                  <div v-if="largeSubnetReferenceTable.subVlans.length > 0" class="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow class="bg-muted/30">
                          <TableHead class="font-semibold">Variable</TableHead>
                          <TableHead class="font-semibold">Name</TableHead>
                          <TableHead class="font-semibold text-right">VLAN ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-for="(subVlan, index) in largeSubnetReferenceTable.subVlans" :key="`subvlan-${index}`"
                          class="hover:bg-muted/30 transition-colors cursor-pointer">
                          <TableCell class="font-mono font-semibold text-primary">{{ subVlan.vlanVariable }}</TableCell>
                          <TableCell class="text-sm">{{ subVlan.name }}</TableCell>
                          <TableCell class="font-mono text-sm text-right font-medium">{{ subVlan.vlanId }}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <!-- Variable Reference Table (VLAN A-J, CIDR Q-Z) - For non-Large Subnet Mode -->
              <Card v-else-if="variableReferenceTable.length > 0" class="shadow-sm">
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
                        <TableRow v-for="(variable, index) in variableReferenceTable" :key="`variable-${index}`"
                          class="hover:bg-muted/30">
                          <TableCell class="font-mono font-semibold text-purple-600">{{ variable.vlanVariable }}
                          </TableCell>
                          <TableCell class="font-mono text-sm">{{ variable.vlanValue }}</TableCell>
                          <TableCell class="font-mono font-semibold text-purple-600">{{ variable.cidrVariable }}
                          </TableCell>
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
                        <TableRow v-for="(device, index) in deviceManagementTable" :key="`device-${index}`"
                          class="hover:bg-muted/30">
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
                <FillInBlankQuestions :key="currentPart.partId || currentPart.id" ref="fillInBlankQuestionsRef"
                  :questions="currentPart.questions" :labId="labId" :partId="currentPart.partId"
                  :lab-session-id="activeLabSessionId" :show-submit-button="!isFillInBlankPart"
                  :initial-submission-result="currentFillInBlankSubmission"
                  @submitted="handleFillInBlankSubmissionResult" />
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
                  <h3 class="font-semibold text-lg mb-1">{{ instructionsAcknowledged ? 'Instructions acknowledged' :
                    'Acknowledge the instructions to continue' }}</h3>
                  <p class="text-sm text-muted-foreground">
                    These terms must be accepted before you can access the rest of the lab parts.
                    <span v-if="instructionsAcknowledged" class="font-medium text-emerald-700 ml-1">
                      Acknowledged {{ instructionsAcknowledgedLabel }}
                    </span>
                  </p>
                </template>
                <template v-else-if="isFillInBlankPart">
                  <h3 class="font-semibold text-lg mb-1">
                    <span v-if="currentFillInBlankSubmission?.passed">
                      Part {{ currentPartDisplayNumber }} Completed!
                    </span>
                    <span v-else-if="currentFillInBlankSubmission">
                      Keep Going — Review Your Results
                    </span>
                    <span v-else>
                      Ready to Submit Part {{ currentPartDisplayNumber }}?
                    </span>
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    <span v-if="currentFillInBlankSubmission">
                      You earned {{ currentFillInBlankSubmission.totalPointsEarned }}/{{
                        currentFillInBlankSubmission.totalPoints }} points.
                      <span v-if="currentFillInBlankSubmission.passed" class="font-medium text-primary ml-1">Great
                        work!</span>
                    </span>
                    <span v-else>
                      Submit your answers to auto-grade this part.
                      <span class="font-medium text-primary ml-1">{{ currentPart.totalPoints }} points available</span>
                    </span>
                  </p>
                  <p v-if="currentFillInBlankSubmission?.submission?.attempt" class="text-xs text-muted-foreground">
                    Attempt #{{ currentFillInBlankSubmission?.submission?.attempt }}
                  </p>
                </template>
                <template v-else>
                  <h3 class="font-semibold text-lg mb-1">
                    {{ currentGradingStatus.status === 'completed' && currentGradingStatus.results?.total_points_earned
                      > 0
                      ? `Part ${currentPartDisplayNumber} Completed!`
                      : `Ready to Submit Part ${currentPartDisplayNumber}?` }}
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    <span
                      v-if="currentGradingStatus.status === 'completed' && currentGradingStatus.results?.total_points_earned > 0">
                      Great work! You earned {{ currentGradingStatus.results.total_points_earned }}/{{
                        currentGradingStatus.results.total_points_possible }} points.
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
                  <Button variant="success" size="lg" class="min-w-[180px]"
                    :disabled="instructionsAcknowledged || !instructionsAckChecked || instructionsAckLoading"
                    @click="acknowledgeInstructions">
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
                  <Button size="lg" class="min-w-[180px]" :disabled="fillInBlankActionButtonDisabled"
                    @click="handleFillInBlankSubmit">
                    <Loader2 v-if="fillInBlankQuestionsRef?.isSubmitting?.value" class="w-4 h-4 mr-2 animate-spin" />
                    <Send v-else class="w-4 h-4 mr-2" />
                    {{ fillInBlankActionButtonLabel }}
                  </Button>
                </template>
                <template v-else>
                  <!-- Grading Progress Component -->
                  <GradingProgress :status="currentGradingStatus.status" :progress="currentGradingStatus.progress"
                    :results="currentGradingStatus.results" :error="currentGradingStatus.error"
                    :total-test-cases="currentPartTotalTestCases" @submit="submitPartForGrading"
                    @toggle-details="toggleProgressDetails(labId, currentPart.partId)"
                    @close-results="clearGradingResults(labId, currentPart.partId)" />
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
:deep(.lab-instructions p h1),
:deep(.lab-instructions p h2),
:deep(.lab-instructions p h3),
:deep(.lab-instructions p h4),
:deep(.lab-instructions p h5),
:deep(.lab-instructions p h6) {
  display: block;
  margin: 0;
  padding: 0;
}

:deep(.lab-instructions p h1) {
  font-size: 2rem !important;
  font-weight: 700 !important;
  margin: 1.25rem 0 0.6rem 0 !important;
  color: hsl(var(--foreground)) !important;
  border-bottom: 2px solid hsl(var(--border)) !important;
  padding-bottom: 0.5rem !important;
  line-height: 1.2 !important;
}

:deep(.lab-instructions p h2) {
  font-size: 1.5rem !important;
  font-weight: 600 !important;
  margin: 1rem 0 0.4rem 0 !important;
  color: hsl(var(--foreground)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  padding-bottom: 0.25rem !important;
  line-height: 1.3 !important;
}

:deep(.lab-instructions p h3) {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  margin: 0.85rem 0 0.35rem 0 !important;
  color: hsl(var(--foreground)) !important;
  line-height: 1.4 !important;
}

/* Also style regular headings in case some are not nested */
:deep(.lab-instructions h1) {
  font-size: 2rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.6rem;
  color: hsl(var(--foreground));
  border-bottom: 2px solid hsl(var(--border));
  padding-bottom: 0.5rem;
}

:deep(.lab-instructions h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.4rem;
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 0.25rem;
}

:deep(.lab-instructions h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.9rem;
  margin-bottom: 0.35rem;
  color: hsl(var(--foreground));
}

:deep(.lab-instructions img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

:deep(.lab-instructions > *:first-child),
:deep(.lab-instructions > p:first-child > *:first-child) {
  margin-top: 0 !important;
}

:deep(.lab-instructions ul),
:deep(.lab-instructions ol) {
  margin: 0.75rem 0;
}

:deep(.lab-instructions ul) {
  padding-left: 1.5rem;
  list-style-position: outside;
  list-style-type: disc;
}

:deep(.lab-instructions ol) {
  padding-left: 1.75rem;
  margin-left: 0;
  list-style-position: outside;
  list-style-type: decimal;
}

:deep(.lab-instructions li) {
  margin: 0.25rem 0;
}

:deep(.lab-instructions li > p) {
  margin: 0;
}

:deep(.lab-instructions p.lab-empty-line) {
  margin: 0.75rem 0;
  min-height: 0.75rem;
}

:deep(.lab-instructions p.lab-empty-line span) {
  display: block;
  height: 0.75rem;
}

/* IP Loading Animation */
.ip-loading-text {
  position: relative;
  display: inline-block;
  background: linear-gradient(90deg,
      var(--foreground) 0%,
      var(--foreground) 40%,
      var(--primary) 50%,
      var(--foreground) 60%,
      var(--foreground) 100%);
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
  background: linear-gradient(90deg,
      transparent 0%,
      transparent 40%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 60%,
      transparent 100%);
  background-size: 200% 100%;
  animation: shine 3s linear infinite;
}
</style>
