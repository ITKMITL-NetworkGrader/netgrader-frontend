import { ref, computed } from 'vue'

// Lab interface matching API response
export interface Lab {
  id: string
  courseId: string
  title: string
  description?: string
  type: 'lab' | 'exam'
  networkProvider?: 'gns3' | 'clab'  // Determines which lab environment backend to use
  network: {
    name: string
    topology: {
      baseNetwork: string
      subnetMask: number
      allocationStrategy: 'student_id_based' | 'group_based'
    }
    devices: Device[]
  }
  createdBy: string
  createdAt: string
  updatedAt: string
  instructions?: {
    html: string
    json: any
  }
  instructionsAcknowledged?: boolean

  // Timer fields for lab availability and deadlines
  availableFrom?: string | Date
  dueDate?: string | Date
  availableUntil?: string | Date
  latePenaltyPercent?: number  // 0-100, default 50 - percentage of score reduction for late submissions
}

export interface Device {
  deviceId: string
  templateId: string
  ipVariables: IpVariable[]
}

export interface IpVariable {
  name: string
  fullIp?: string
  vlanIndex?: number        // For studentVlanX types (0-9)
  interfaceOffset?: number  // For studentVlanX types (1-50)
}

interface CourseLabsResponse {
  success: boolean
  message: string
  data: {
    labs: Lab[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
    }
  }
}

export interface LabPart {
  id: string
  labId: string
  partId: string
  title: string
  description?: string
  instructions: string | {
    html: string
    json: any
    plainText?: string
    metadata?: Record<string, any>
  }
  order: number
  partType?: 'fill_in_blank' | 'network_config' | 'dhcp_config'
  questions?: any[]
  dhcpConfiguration?: any
  tasks: LabTask[]
  task_groups: TaskGroup[]
  prerequisites: string[]
  totalPoints: number
  isVirtual?: boolean
  isPartZero?: boolean
}

export interface LabTask {
  taskId: string
  name: string
  description?: string
  templateId: string
  executionDevice: string
  targetDevices: string[]
  parameters: Record<string, any>
  testCases: TestCase[]
  order: number
  points: number
  group_id?: string  // Group ID if task belongs to a group
  _id: string
}

export interface TestCase {
  comparison_type: string
  expected_result: any
  _id: string
}

export interface TaskGroup {
  group_id: string
  title: string
  description?: string
  group_type: 'all_or_nothing' | 'proportional'
  points: number
  continue_on_failure: boolean
  timeout_seconds: number
  _id: string
}

export interface PartsPaginationResponse {
  success: boolean
  message: string
  data: {
    parts: LabPart[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
    }
  }
}

export interface DirectPartsResponse {
  parts: LabPart[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
}

export const useCourseLabs = () => {
  const config = useRuntimeConfig()
  const backendURL = config.public.backendurl

  // State
  const labs = ref<Lab[]>([])
  const currentLab = ref<Lab | null>(null)
  const currentLabParts = ref<LabPart[]>([])
  const allLabParts = ref<LabPart[]>([])
  const isLoading = ref(false)
  const isLoadingParts = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const labsCount = computed(() => labs.value.length)
  const availableLabs = computed(() => labs.value.filter(lab => lab.type === 'lab'))
  const availableExams = computed(() => labs.value.filter(lab => lab.type === 'exam'))

  // API Methods
  const fetchCourseLabs = async (courseId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<CourseLabsResponse>(`${backendURL}/v0/labs/course/${courseId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.success) {
        labs.value = response.data.labs || []
      } else {
        error.value = response.message || 'Failed to fetch labs'
        labs.value = []
      }
    } catch (err: any) {
      console.error('Failed to fetch course labs:', err)
      error.value = err.message || 'Failed to fetch course labs'
      labs.value = []
    } finally {
      isLoading.value = false
    }
  }

  const fetchLabById = async (labId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ success: boolean; data: Lab }>(`${backendURL}/v0/labs/${labId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.success) {
        currentLab.value = response.data
        return response.data
      } else {
        error.value = 'Lab not found'
        return null
      }
    } catch (err: any) {
      console.error('Failed to fetch lab:', err)
      error.value = err.message || 'Failed to fetch lab'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const fetchLabParts = async (labId: string) => {
    isLoadingParts.value = true
    error.value = null

    try {
      const response = await $fetch<PartsPaginationResponse | DirectPartsResponse>(`${backendURL}/v0/parts/lab/${labId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Handle both response formats:
      // Format 1: { success: true, data: { parts: [...], pagination: {...} } }
      // Format 2: { parts: [...], pagination: {...} }
      let parts: LabPart[] = []

      if ('success' in response && response.success && 'data' in response) {
        // Standard API response format
        parts = response.data.parts || []
      } else if ('parts' in response) {
        // Direct response format (actual backend format)
        parts = (response as any).parts || []
      } else {
        // Unexpected format
        error.value = 'Unexpected API response format'
        currentLabParts.value = []
        allLabParts.value = []
        return []
      }

      // Sort parts by order to ensure correct sequence
      const sortedParts = parts.sort((a, b) => a.order - b.order)

      // Recalculate totalPoints for each part considering task groups
      const partsWithCorrectPoints = sortedParts.map(part => ({
        ...part,
        totalPoints: calculatePartTotalPoints(part)
      }))

      allLabParts.value = partsWithCorrectPoints
      currentLabParts.value = partsWithCorrectPoints.filter(part => !part.isVirtual)
      return partsWithCorrectPoints
    } catch (err: any) {
      console.error('Failed to fetch lab parts:', err.message || err)

      error.value = err.message || 'Failed to fetch lab parts'
      currentLabParts.value = []
      allLabParts.value = []
      return []
    } finally {
      isLoadingParts.value = false
    }
  }

  const deleteLab = async (labId: string) => {
    try {
      const response = await $fetch(`${backendURL}/v0/labs/${labId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.success) {
        // Remove lab from local state
        labs.value = labs.value.filter(lab => lab.id !== labId)
        return true
      }
      return false
    } catch (err: any) {
      console.error('Failed to delete lab:', err)
      error.value = err.message || 'Failed to delete lab'
      return false
    }
  }

  // Utility methods
  const clearError = () => {
    error.value = null
  }

  const refreshLabs = async (courseId: string) => {
    await fetchCourseLabs(courseId)
  }

  const getLabById = (labId: string): Lab | undefined => {
    return labs.value.find(lab => lab.id === labId)
  }

  const formatLabDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatLabDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Utility function to calculate correct part points considering task groups and questions
  const calculatePartTotalPoints = (part: LabPart): number => {
    if (part.isVirtual || part.isPartZero) {
      return 0
    }

    // For fill-in-blank parts, use question points
    if (part.partType === 'fill_in_blank' && part.questions && part.questions.length > 0) {
      return part.questions.reduce((sum, question) => {
        // For IP table questionnaires, calculate from cells
        if (question.questionType === 'ip_table_questionnaire' && question.ipTableQuestionnaire) {
          let cellPoints = 0;
          question.ipTableQuestionnaire.cells?.forEach((row: any[]) => {
            row.forEach((cell: any) => {
              cellPoints += cell.points || 0;
            });
          });
          return sum + cellPoints;
        }
        // For regular questions, use question points
        return sum + (question.points || 0);
      }, 0);
    }

    // For network_config and dhcp_config parts, calculate from tasks
    if (!part.task_groups || part.task_groups.length === 0) {
      // No task groups - use sum of individual task points
      return part.tasks?.reduce((sum, task) => sum + (task.points || 0), 0) || 0
    }

    // Calculate points considering task groups
    let totalGroupPoints = 0
    let ungroupedTaskPoints = 0
    const groupsWithTasks = new Set<string>()

    // First, identify which groups actually have tasks assigned to them
    if (part.tasks) {
      for (const task of part.tasks) {
        if (task.group_id) {
          groupsWithTasks.add(task.group_id)
        }
      }
    }

    // Add up task group points ONLY if the group has tasks assigned
    for (const group of part.task_groups) {
      if (groupsWithTasks.has(group.group_id)) {
        totalGroupPoints += group.points || 0
      }
    }

    // Add points for ungrouped tasks (tasks without group_id)
    if (part.tasks) {
      for (const task of part.tasks) {
        if (!task.group_id) {
          ungroupedTaskPoints += task.points || 0
        }
      }
    }

    return totalGroupPoints + ungroupedTaskPoints
  }

  return {
    // State
    labs: readonly(labs),
    currentLab: readonly(currentLab),
    currentLabParts: readonly(currentLabParts),
    allLabParts: readonly(allLabParts),
    isLoading: readonly(isLoading),
    isLoadingParts: readonly(isLoadingParts),
    error: readonly(error),

    // Computed
    labsCount: readonly(labsCount),
    availableLabs: readonly(availableLabs),
    availableExams: readonly(availableExams),

    // Methods
    fetchCourseLabs,
    fetchLabById,
    fetchLabParts,
    deleteLab,
    clearError,
    refreshLabs,
    getLabById,
    formatLabDate,
    formatLabDateTime,
    calculatePartTotalPoints
  }
}
