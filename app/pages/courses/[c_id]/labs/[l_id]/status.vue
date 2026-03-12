<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Home,
  ChevronRight,
  Search,
  BookOpen,
  Users,
  Network,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Server,
  Info,
  Filter,
  ChevronLeft,
  FileSpreadsheet,
  Download
} from 'lucide-vue-next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

import { useCourseLabs, type LabPart } from '@/composables/useCourseLabs'
import { useCourse } from '@/composables/useCourse'
import { useLabStatus, type LabSubmissionOverview, type LabIPStats, type AssignedIP } from '@/composables/useLabStatus'

const route = useRoute()

// Route params
const courseId = computed(() => route.params.c_id as string)
const labId = computed(() => route.params.l_id as string)

// Composables
const { currentCourse, fetchCourse } = useCourse()
const { currentLab, fetchLabById, fetchLabParts } = useCourseLabs()
const { fetchLabSubmissionOverview, fetchLabIPStats } = useLabStatus()

// State
const isLoading = ref(true)
const activeTab = ref('submissions')
const searchQuery = ref('')
const submissionsData = ref<LabSubmissionOverview[]>([])
const labParts = ref<LabPart[]>([])
const ipStats = ref<LabIPStats | null>(null)
const assignedIps = ref<AssignedIP[]>([])
const pollingInterval = ref<NodeJS.Timeout | null>(null)

// Score Export state
const exportAsOfDate = ref<string>('')
const exportData = ref<Array<{ 
  studentId: string
  studentName: string
  currentScore: number
  fullLabScore: number
  isLate: boolean
  isCompleted: boolean
  partsCompleted: number
  totalParts: number
}>>([])
const isExporting = ref(false)
const exportError = ref<string | null>(null)

// Export column configuration
interface ExportColumn {
  key: string
  label: string
  excelHeader: string
  visible: boolean
  align?: 'left' | 'right' | 'center'
  formatter?: (value: any) => string
}

const exportColumns = ref<ExportColumn[]>([
  { key: 'studentId', label: 'Student ID', excelHeader: 'Student ID', visible: true, align: 'left' },
  { key: 'studentName', label: 'Name', excelHeader: 'Name', visible: true, align: 'left' },
  { key: 'currentScore', label: 'Score', excelHeader: 'Score', visible: true, align: 'right' },
  { key: 'fullLabScore', label: 'Full Score', excelHeader: 'Full Score', visible: true, align: 'right' },
  { key: 'isLate', label: 'Late', excelHeader: 'Late Submission', visible: true, align: 'center', formatter: (v) => v ? 'Yes' : 'No' },
  { key: 'isCompleted', label: 'Completed', excelHeader: 'Completed', visible: false, align: 'center', formatter: (v) => v ? 'Yes' : 'No' },
  { key: 'partsCompleted', label: 'Parts Done', excelHeader: 'Parts Completed', visible: false, align: 'right' },
  { key: 'totalParts', label: 'Total Parts', excelHeader: 'Total Parts', visible: false, align: 'right' },
])

const visibleColumns = computed(() => exportColumns.value.filter(col => col.visible))

const toggleColumn = (key: string) => {
  const col = exportColumns.value.find(c => c.key === key)
  if (col) {
    col.visible = !col.visible
  }
}

const getCellValue = (row: any, column: ExportColumn): string => {
  const value = row[column.key]
  if (column.formatter) {
    return column.formatter(value)
  }
  return String(value ?? '')
}

// Progress filter options
const progressFilter = ref<string>('all')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = 20

// Computed
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId.value}`)
const labTitle = computed(() => currentLab.value?.title || 'Lab')
const backendReportsPartZero = computed(() => labParts.value.some(part => part.isPartZero))
const backendActualLabPartCount = computed(() => labParts.value
  .filter(part => !part.isVirtual && !part.isPartZero)
  .length)

type PartZeroStatus = 'pending' | 'current' | 'completed'

interface SubmissionProgress {
  displayLabel: string
  actualCompleted: number | null
  actualTotal: number | null
  includesPartZero: boolean
  partZeroStatus: PartZeroStatus | null
  partZeroStatusLabel: string | null
  isCurrentlyInPartZero: boolean
  isFullyCompleted: boolean
  currentActualPartNumber: number | null
  actualPartNumbers: number[]
}

interface SubmissionWithProgress extends LabSubmissionOverview {
  _progress: SubmissionProgress
}

const parseProgressionValues = (progression: string | null | undefined): { completed: number; total: number } | null => {
  if (!progression) {
    return null
  }

  const parts = progression.split('/')
  if (parts.length !== 2) {
    return null
  }

  const completed = Number.parseInt(parts[0]!, 10)
  const total = Number.parseInt(parts[1]!, 10)

  if (Number.isNaN(completed) || Number.isNaN(total)) {
    return null
  }

  return {
    completed: Math.max(completed, 0),
    total: Math.max(total, 0)
  }
}

const maxReportedPartTotal = computed(() => {
  let maxTotal = 0

  for (const submission of submissionsData.value) {
    maxTotal = Math.max(maxTotal, submission.totalParts || 0)

    const parsed = parseProgressionValues(submission.progression)
    if (parsed) {
      maxTotal = Math.max(maxTotal, parsed.total)
    }
  }

  return maxTotal
})

const hasPartZero = computed(() => {
  if (backendReportsPartZero.value) {
    return true
  }

  const rawCount = backendActualLabPartCount.value
  const maxTotal = maxReportedPartTotal.value

  if (rawCount > 0) {
    return maxTotal > rawCount
  }

  if (maxTotal > 0 && submissionsData.value.length > 0) {
    return true
  }

  if (maxTotal === 0) {
    return false
  }

  const lab = currentLab.value
  if (!lab?.instructions) {
    return false
  }

  if (typeof lab.instructions === 'string') {
    return lab.instructions.trim().length > 0
  }

  const html = typeof lab.instructions.html === 'string' ? lab.instructions.html.trim() : ''
  if (html.length > 0) {
    return true
  }

  // Check new markdown field
  const markdown = typeof lab.instructions.markdown === 'string' ? lab.instructions.markdown.trim() : ''
  if (markdown.length > 0) {
    return true
  }

  const json = lab.instructions.json
  if (json && typeof json === 'object') {
    return Object.keys(json).length > 0
  }

  return false
})

const actualLabPartCount = computed(() => {
  const rawCount = backendActualLabPartCount.value
  if (rawCount > 0) {
    return rawCount
  }

  const maxTotal = maxReportedPartTotal.value
  if (maxTotal === 0) {
    return 0
  }

  return hasPartZero.value ? Math.max(maxTotal - 1, 0) : maxTotal
})

const buildSubmissionProgress = (submission: LabSubmissionOverview): SubmissionProgress => {
  const parsed = parseProgressionValues(submission.progression)
  const includesPartZero = hasPartZero.value

  const resolvedActualCount = actualLabPartCount.value
  const rawCompleted = parsed?.completed ?? 0
  const rawTotal = parsed?.total ?? (submission.totalParts || 0)
  const totalPartsReported = submission.totalParts ?? rawTotal

  const actualTotalCandidates: Array<number | null> = []
  actualTotalCandidates.push(resolvedActualCount > 0 ? resolvedActualCount : null)

  if (includesPartZero) {
    if (totalPartsReported > 0) {
      actualTotalCandidates.push(Math.max(totalPartsReported - 1, 0))
    }
    if (rawTotal > 0) {
      actualTotalCandidates.push(Math.max(rawTotal - 1, 0))
    }
  } else {
    if (totalPartsReported > 0) {
      actualTotalCandidates.push(totalPartsReported)
    }
    if (rawTotal > 0) {
      actualTotalCandidates.push(rawTotal)
    }
  }

  const actualTotal = actualTotalCandidates.find((value): value is number => typeof value === 'number' && value > 0) ?? 0
  const actualPartNumbers = actualTotal > 0
    ? Array.from({ length: actualTotal }, (_, idx) => idx + 1)
    : []

  let actualCompleted = actualTotal > 0
    ? Math.min(Math.max(rawCompleted, 0), actualTotal)
    : 0

  let partZeroCompletedFromCount = false
  if (includesPartZero && actualTotal > 0 && rawCompleted > actualTotal) {
    actualCompleted = Math.min(Math.max(rawCompleted - 1, 0), actualTotal)
    partZeroCompletedFromCount = true
  }

  const currentPartValue = submission.currentPart ?? 1
  const normalizedCurrentPart = includesPartZero
    ? Math.max(currentPartValue - 1, 0)
    : Math.max(currentPartValue, 0)

  const partZeroCompleted = includesPartZero
    ? partZeroCompletedFromCount || normalizedCurrentPart > 0 || rawCompleted > 0
    : false

  const isCurrentlyInPartZero = includesPartZero && !partZeroCompleted && currentPartValue <= 1
  const partZeroStatus: PartZeroStatus | null = includesPartZero
    ? partZeroCompleted
      ? 'completed'
      : isCurrentlyInPartZero
        ? 'current'
        : 'pending'
    : null

  const partZeroStatusLabel = partZeroStatus === 'completed'
    ? 'Completed'
    : partZeroStatus === 'current'
      ? 'In Progress'
      : partZeroStatus === 'pending'
        ? 'Not Started'
        : null

  const isFullyCompleted = actualTotal > 0
    ? actualCompleted >= actualTotal
    : partZeroCompleted

  let currentActualPartNumber: number | null = null
  if (actualTotal > 0) {
    if (isFullyCompleted) {
      currentActualPartNumber = actualTotal
    } else if (normalizedCurrentPart > 0) {
      currentActualPartNumber = Math.min(Math.max(normalizedCurrentPart, 1), actualTotal)
    } else if (!isCurrentlyInPartZero && actualCompleted < actualTotal) {
      currentActualPartNumber = Math.min(actualCompleted + 1, actualTotal)
    }
  }

  const displayLabel = actualTotal > 0
    ? `${actualCompleted}/${actualTotal}`
    : submission.progression || '—'

  return {
    displayLabel,
    actualCompleted: actualTotal > 0 ? actualCompleted : null,
    actualTotal: actualTotal > 0 ? actualTotal : null,
    includesPartZero,
    partZeroStatus,
    partZeroStatusLabel,
    isCurrentlyInPartZero,
    isFullyCompleted,
    currentActualPartNumber,
    actualPartNumbers
  }
}

const getPartZeroBadgeClasses = (status: PartZeroStatus | null) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700/60'
    case 'current':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-600/60'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/30 dark:bg-muted/40'
  }
}

// Filtered submissions based on search and progress filter
const filteredSubmissions = computed(() => {
  let filtered = submissionsData.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(submission => {
      return (
        submission.studentId.toLowerCase().includes(query) ||
        submission.studentName.toLowerCase().includes(query)
      )
    })
  }

  // Apply progress filter
  if (progressFilter.value !== 'all') {
    filtered = filtered.filter(submission => {
      const progress = buildSubmissionProgress(submission)
      
      if (progressFilter.value === 'completed') {
        return progress.isFullyCompleted
      }
      if (progressFilter.value === 'in-progress') {
        return !progress.isFullyCompleted && (progress.actualCompleted ?? 0) > 0
      }
      if (progressFilter.value === 'not-started') {
        return (progress.actualCompleted ?? 0) === 0 && !progress.isCurrentlyInPartZero
      }
      if (progressFilter.value === 'part0') {
        return progress.isCurrentlyInPartZero
      }
      // Check for specific part passed (e.g., 'part-1', 'part-2')
      const partMatch = progressFilter.value.match(/^part-(\d+)$/)
      if (partMatch) {
        const partNum = parseInt(partMatch[1], 10)
        return (progress.actualCompleted ?? 0) >= partNum
      }
      return true
    })
  }

  return filtered
})

// Progress filter options based on lab parts
const progressFilterOptions = computed(() => {
  const options = [
    { value: 'all', label: 'All Students' },
    { value: 'completed', label: 'Fully Completed' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'not-started', label: 'Not Started' }
  ]
  
  if (hasPartZero.value) {
    options.push({ value: 'part0', label: 'On Part 0' })
  }
  
  // Add options for each part
  const partCount = actualLabPartCount.value
  for (let i = 1; i <= partCount; i++) {
    options.push({ value: `part-${i}`, label: `Part ${i}+ Passed` })
  }
  
  return options
})

// Reset page when filter changes
watch([searchQuery, progressFilter], () => {
  currentPage.value = 1
})

// Total pages
const totalPages = computed(() => Math.ceil(filteredSubmissions.value.length / itemsPerPage))

// Sorted and paginated submissions
const paginatedSubmissions = computed<SubmissionWithProgress[]>(() => {
  const sorted = [...filteredSubmissions.value]
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
    .map(submission => ({
      ...submission,
      _progress: buildSubmissionProgress(submission)
    }))
  
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return sorted.slice(start, end)
})

// All sorted submissions (for display count)
const sortedSubmissions = computed<SubmissionWithProgress[]>(() => {
  return [...filteredSubmissions.value]
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
    .map(submission => ({
      ...submission,
      _progress: buildSubmissionProgress(submission)
    }))
})

// Pagination controls
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const prevPage = () => goToPage(currentPage.value - 1)
const nextPage = () => goToPage(currentPage.value + 1)

// Get status badge variant
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'passed':
      return { variant: 'default' as const, class: 'bg-green-500 hover:bg-green-600 text-white', label: 'Passed', showPing: false }
    case 'failed':
      return { variant: 'destructive' as const, class: '', label: 'Not Passed', showPing: false }
    case 'running':
      return { variant: 'default' as const, class: 'bg-yellow-500 hover:bg-yellow-600', label: 'Grading', showPing: true }
    case 'pending':
      return { variant: 'secondary' as const, class: '', label: 'In Queue', showPing: false }
    case 'cancelled':
      return { variant: 'outline' as const, class: '', label: 'Cancelled', showPing: false }
    default:
      return { variant: 'outline' as const, class: '', label: status, showPing: false }
  }
}

// Format date/time
const formatDateTime = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load submission overview data
const loadSubmissions = async () => {
  const result = await fetchLabSubmissionOverview(labId.value)
  if (result.success && result.data) {
    submissionsData.value = result.data
  }
}

// Load IP stats
const loadIPStats = async () => {
  const result = await fetchLabIPStats(labId.value)
  if (result.success) {
    ipStats.value = result.ipStats || null
    assignedIps.value = result.assignedIps || []
  }
}

// Start polling submissions every 3 seconds
const startPolling = () => {
  // Initial load
  loadSubmissions()

  // Poll every 3 seconds
  pollingInterval.value = setInterval(() => {
    loadSubmissions()
  }, 3000)
}

// Stop polling
const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

// Watch active tab changes
watch(activeTab, (newTab) => {
  if (newTab === 'submissions') {
    startPolling()
  } else {
    stopPolling()
    if (newTab === 'ip-assignment') {
      loadIPStats()
    }
  }
})

// Load initial data
const loadData = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      fetchCourse(courseId.value),
      fetchLabById(labId.value),
      fetchLabParts(labId.value).then(parts => {
        labParts.value = parts || []
      })
    ])

    // Start polling for submissions tab (default)
    if (activeTab.value === 'submissions') {
      startPolling()
    }
  } catch (err) {
    console.error('Failed to load data:', err)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})

onUnmounted(() => {
  stopPolling()
})

// Score Export Functions
const fetchExportData = async () => {
  isExporting.value = true
  exportError.value = null
  
  try {
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl
    
    // Build query string
    const params = new URLSearchParams()
    if (exportAsOfDate.value) {
      // Convert local datetime to ISO string
      const localDate = new Date(exportAsOfDate.value)
      params.set('asOfDate', localDate.toISOString())
    }
    
    const response = await $fetch<{
      status: string
      data?: Array<{ 
        studentId: string
        studentName: string
        currentScore: number
        fullLabScore: number
        isLate: boolean
        isCompleted: boolean
        partsCompleted: number
        totalParts: number
      }>
      message?: string
    }>(`${backendURL}/v0/submissions/lab/${labId.value}/export?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    })
    
    if (response.status === 'success' && response.data) {
      exportData.value = response.data
    } else {
      exportError.value = response.message || 'Failed to fetch export data'
    }
  } catch (err: any) {
    console.error('Error fetching export data:', err)
    exportError.value = err.message || 'An error occurred while fetching export data'
  } finally {
    isExporting.value = false
  }
}

const exportToExcel = async () => {
  if (exportData.value.length === 0) return
  
  try {
    // Dynamic import of xlsx
    const XLSX = await import('xlsx')
    
    // Prepare data for export based on visible columns
    const worksheetData = exportData.value.map(row => {
      const rowData: Record<string, any> = {}
      for (const col of visibleColumns.value) {
        const value = row[col.key as keyof typeof row]
        rowData[col.excelHeader] = col.formatter ? col.formatter(value) : value
      }
      return rowData
    })
    
    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lab Scores')
    
    // Generate filename
    const dateStr = exportAsOfDate.value 
      ? new Date(exportAsOfDate.value).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    const filename = `lab-scores-${labId.value}-${dateStr}.xlsx`
    
    // Download file
    XLSX.writeFile(workbook, filename)
  } catch (err: any) {
    console.error('Error exporting to Excel:', err)
    exportError.value = 'Failed to export to Excel: ' + err.message
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Breadcrumb - Sticks below NavigationBar -->
    <div class="border-b bg-background p-4 sticky top-16 z-40 shadow-sm">
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
              Lab Status
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6" />
        <h3 class="text-lg font-semibold mb-2">Loading Lab Status</h3>
        <p class="text-muted-foreground">Fetching submission data...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center space-x-4 mb-4">
          <div class="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center border border-primary/20">
            <BookOpen class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-foreground">{{ labTitle }}</h1>
            <p class="text-muted-foreground">Monitor student progress and network status</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <Tabs v-model="activeTab" default-value="submissions" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="submissions" class="flex items-center space-x-2">
            <Users class="w-4 h-4" />
            <span>Submissions</span>
          </TabsTrigger>
          <TabsTrigger value="ip-assignment" class="flex items-center space-x-2">
            <Network class="w-4 h-4" />
            <span>IP Assignment</span>
          </TabsTrigger>
          <TabsTrigger value="score-export" class="flex items-center space-x-2">
            <FileSpreadsheet class="w-4 h-4" />
            <span>Score Export</span>
          </TabsTrigger>
        </TabsList>

        <!-- Submissions Tab -->
        <TabsContent value="submissions" class="mt-6">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle class="flex items-center space-x-2">
                    <Users class="w-5 h-5" />
                    <span>Student Submissions</span>
                  </CardTitle>
                  <CardDescription class="mt-1">
                    Real-time submission status (auto-refreshes every 3 seconds)
                  </CardDescription>
                </div>
                <Badge variant="outline" class="flex items-center space-x-1">
                  <Loader2 class="w-3 h-3 animate-spin" />
                  <span>Live</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <!-- Search Bar and Filter -->
              <div class="mb-6 flex flex-col sm:flex-row gap-4">
                <div class="relative flex-1">
                  <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    v-model="searchQuery"
                    placeholder="Search by Student ID or Student Name..."
                    class="pl-10"
                  />
                </div>
                <div class="w-full sm:w-[200px]">
                  <Select v-model="progressFilter">
                    <SelectTrigger>
                      <Filter class="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Filter by progress" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in progressFilterOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <!-- Submissions Table -->
              <div class="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead class="font-semibold w-[150px]">Student ID</TableHead>
                      <TableHead class="font-semibold">Student Name</TableHead>
                      <TableHead class="font-semibold w-[220px] text-center">Progress</TableHead>
                      <TableHead class="font-semibold w-[180px] text-center">Last Attempt</TableHead>
                      <TableHead class="font-semibold w-[300px]">Last Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <NuxtLink
                      v-for="submission in paginatedSubmissions"
                      :key="submission.studentId"
                      :to="`/courses/${courseId}/labs/${labId}/students/${submission.studentId}`"
                      custom
                      v-slot="{ navigate }"
                    >
                      <TableRow
                        @click="navigate"
                        class="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <!-- Student ID -->
                        <TableCell class="font-mono text-sm font-medium">
                          {{ submission.studentId }}
                        </TableCell>

                        <!-- Student Name -->
                        <TableCell class="font-medium">
                          {{ submission.studentName }}
                        </TableCell>

                        <!-- Progress with Visual Indicators -->
                        <TableCell class="text-center">
                          <div class="space-y-2 inline-block">
                            <div class="text-sm font-medium">
                              {{ submission._progress.displayLabel }}
                            </div>
                            <!-- Visual Progress Indicators -->
                            <div class="flex items-center justify-center space-x-2">
                              <div
                                v-if="submission._progress.includesPartZero"
                                class="relative"
                              >
                                <!-- Part 0 badge without ping effect -->
                                <Badge
                                  variant="outline"
                                  class="px-2 py-0 text-[11px] font-medium border"
                                  :class="getPartZeroBadgeClasses(submission._progress.partZeroStatus)"
                                  :title="submission._progress.partZeroStatusLabel ? `Part 0 - ${submission._progress.partZeroStatusLabel}` : 'Part 0'"
                                >
                                  Part 0
                                </Badge>
                              </div>
                              <div class="flex items-center space-x-1.5">
                                <div
                                  v-for="partNum in submission._progress.actualPartNumbers"
                                  :key="`part-${submission.studentId}-${partNum}`"
                                  class="relative"
                                >
                                  <!-- Completed Part (Green), including when lab is fully completed -->
                                  <div
                                    v-if="submission._progress.isFullyCompleted || (submission._progress.actualCompleted !== null && partNum <= submission._progress.actualCompleted)"
                                    class="w-3 h-3 rounded-full bg-green-500 border-2 border-green-600"
                                    :title="`Part ${partNum} - Completed`"
                                  />
                                  <!-- Current Part (Yellow with Ping) -->
                                  <div
                                    v-else-if="submission._progress.currentActualPartNumber === partNum"
                                    class="relative w-3 h-3"
                                    :title="`Part ${partNum} - Current`"
                                  >
                                    <div class="absolute inset-0 w-3 h-3 rounded-full bg-yellow-400 animate-ping opacity-75" />
                                    <div class="relative w-3 h-3 rounded-full bg-yellow-500 border-2 border-yellow-600" />
                                  </div>
                                  <!-- Not Reached Part (Grey) -->
                                  <div
                                    v-else
                                    class="w-3 h-3 rounded-full bg-gray-300 border-2 border-gray-400"
                                    :title="`Part ${partNum} - Not Started`"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <!-- Status -->
                        <TableCell class="text-center">
                          <div class="relative inline-flex">
                            <div
                              v-if="getStatusBadge(submission.latestSubmissionStatus).showPing"
                              class="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"
                            />
                            <Badge
                              :variant="getStatusBadge(submission.latestSubmissionStatus).variant"
                              :class="getStatusBadge(submission.latestSubmissionStatus).class"
                              class="relative"
                            >
                              {{ getStatusBadge(submission.latestSubmissionStatus).label }}
                            </Badge>
                          </div>
                        </TableCell>

                        <!-- Submission Date/Time -->
                        <TableCell class="text-sm text-muted-foreground">
                          {{ formatDateTime(submission.latestSubmissionAt) }}
                        </TableCell>
                      </TableRow>
                    </NuxtLink>

                    <!-- Empty State -->
                    <TableRow v-if="paginatedSubmissions.length === 0">
                      <TableCell colspan="5" class="text-center py-12">
                        <div class="flex flex-col items-center space-y-3">
                          <AlertCircle class="w-12 h-12 text-muted-foreground/50" />
                          <p class="text-muted-foreground">
                            {{ searchQuery || progressFilter !== 'all' ? 'No students found matching your filters' : 'No submissions yet' }}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- Footer with Pagination -->
              <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="text-sm text-muted-foreground flex items-center space-x-1">
                  <Info class="w-4 h-4" />
                  <span>
                    Showing {{ paginatedSubmissions.length }} of {{ sortedSubmissions.length }} 
                    {{ sortedSubmissions.length === 1 ? 'student' : 'students' }}
                    <span v-if="progressFilter !== 'all'" class="text-primary">(filtered)</span>
                  </span>
                </div>
                
                <!-- Pagination Controls -->
                <div v-if="totalPages > 1" class="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="currentPage === 1"
                    @click="prevPage"
                  >
                    <ChevronLeft class="w-4 h-4" />
                    <span class="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  
                  <div class="text-sm text-muted-foreground px-2">
                    Page {{ currentPage }} of {{ totalPages }}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="currentPage === totalPages"
                    @click="nextPage"
                  >
                    <span class="hidden sm:inline mr-1">Next</span>
                    <ChevronRight class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- IP Assignment Tab -->
        <TabsContent value="ip-assignment" class="mt-6">
          <div class="space-y-6">
            <!-- IP Statistics Card -->
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center space-x-2">
                  <Server class="w-5 h-5" />
                  <span>Network Status</span>
                </CardTitle>
                <CardDescription>
                  Management IP allocation and capacity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div v-if="ipStats" class="space-y-6">
                  <!-- Capacity Alert -->
                  <Alert v-if="!ipStats.sufficient" variant="destructive">
                    <AlertTriangle class="h-4 w-4" />
                    <AlertDescription>
                      <strong>Insufficient IP Capacity!</strong> Only {{ ipStats.available }} IPs available for {{ ipStats.enrolledStudents }} enrolled students.
                    </AlertDescription>
                  </Alert>

                  <Alert v-else>
                    <CheckCircle2 class="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Sufficient IP capacity for all enrolled students.
                    </AlertDescription>
                  </Alert>

                  <!-- IP Stats Grid -->
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="p-4 rounded-lg border bg-card">
                      <div class="text-sm text-muted-foreground mb-1">Total IPs</div>
                      <div class="text-2xl font-bold">{{ ipStats.totalIps }}</div>
                    </div>
                    <div class="p-4 rounded-lg border bg-card">
                      <div class="text-sm text-muted-foreground mb-1">Assigned</div>
                      <div class="text-2xl font-bold text-blue-600">{{ ipStats.assignedCount }}</div>
                    </div>
                    <div class="p-4 rounded-lg border bg-card">
                      <div class="text-sm text-muted-foreground mb-1">Available</div>
                      <div class="text-2xl font-bold text-green-600">{{ ipStats.available }}</div>
                    </div>
                    <div class="p-4 rounded-lg border bg-card">
                      <div class="text-sm text-muted-foreground mb-1">Exempt Count</div>
                      <div class="text-2xl font-bold">{{ ipStats.exemptCount }}</div>
                    </div>
                    <div class="p-4 rounded-lg border bg-card">
                      <div class="text-sm text-muted-foreground mb-1">Total Blocked</div>
                      <div class="text-2xl font-bold">{{ ipStats.totalBlocked }}</div>
                    </div>
                    <div class="p-4 rounded-lg border bg-card">
                      <div class="text-sm text-muted-foreground mb-1">Enrolled Students</div>
                      <div class="text-2xl font-bold">{{ ipStats.enrolledStudents }}</div>
                    </div>
                  </div>
                </div>

                <div v-else class="text-center py-8 text-muted-foreground">
                  Loading IP statistics...
                </div>
              </CardContent>
            </Card>

            <!-- Assigned IPs Card -->
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center space-x-2">
                  <Users class="w-5 h-5" />
                  <span>Active Student Sessions</span>
                </CardTitle>
                <CardDescription>
                  Currently assigned management IPs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div v-if="assignedIps.length > 0" class="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead class="font-semibold">Student ID</TableHead>
                        <TableHead class="font-semibold">Student Name</TableHead>
                        <TableHead class="font-semibold">Management IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="ip in assignedIps"
                        :key="ip.studentId"
                        class="hover:bg-muted/30"
                      >
                        <TableCell class="font-mono text-sm">{{ ip.studentId }}</TableCell>
                        <TableCell class="font-medium">{{ ip.studentName }}</TableCell>
                        <TableCell class="font-mono text-sm text-blue-600">{{ ip.managementIp }}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div v-else class="text-center py-12">
                  <Clock class="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p class="text-muted-foreground">No active student sessions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <!-- Score Export Tab -->
        <TabsContent value="score-export" class="mt-6">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <FileSpreadsheet class="w-5 h-5" />
                <span>Export Student Scores</span>
              </CardTitle>
              <CardDescription>
                Export student scores as of a specific date and time. Useful for generating grade reports at a specific point in time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-6">
                <!-- Date/Time Picker -->
                <div class="space-y-2">
                  <label for="export-date" class="text-sm font-medium">As of Date & Time</label>
                  <div class="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div class="flex-1">
                      <input
                        id="export-date"
                        v-model="exportAsOfDate"
                        type="datetime-local"
                        class="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <Button
                      :disabled="isExporting"
                      class="flex items-center space-x-2"
                      @click="fetchExportData"
                    >
                      <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
                      <Search v-else class="w-4 h-4" />
                      <span>{{ isExporting ? 'Loading...' : 'Preview' }}</span>
                    </Button>
                    <Button
                      :disabled="isExporting || exportData.length === 0"
                      variant="default"
                      class="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                      @click="exportToExcel"
                    >
                      <Download class="w-4 h-4" />
                      <span>Export to Excel</span>
                    </Button>
                  </div>
                  <p class="text-xs text-muted-foreground">Leave empty to use current date/time</p>
                </div>

                <!-- Column Selection -->
                <div class="space-y-2">
                  <label class="text-sm font-medium">Columns to Export</label>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="col in exportColumns"
                      :key="col.key"
                      type="button"
                      class="px-3 py-1.5 text-sm rounded-md border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      :class="col.visible 
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                        : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'"
                      @click="toggleColumn(col.key)"
                    >
                      {{ col.label }}
                    </button>
                  </div>
                  <p class="text-xs text-muted-foreground">Click to toggle columns. Selected columns will appear in preview and Excel export.</p>
                </div>

                <!-- Error Alert -->
                <Alert v-if="exportError" variant="destructive">
                  <AlertCircle class="w-4 h-4" />
                  <AlertDescription>{{ exportError }}</AlertDescription>
                </Alert>

                <!-- Preview Table -->
                <div v-if="exportData.length > 0" class="border rounded-lg overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow class="bg-muted/50">
                        <TableHead 
                          v-for="col in visibleColumns" 
                          :key="col.key"
                          :class="{
                            'text-right': col.align === 'right',
                            'text-center': col.align === 'center'
                          }"
                        >
                          {{ col.label }}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-for="row in exportData" :key="row.studentId" class="hover:bg-muted/30">
                        <TableCell 
                          v-for="col in visibleColumns" 
                          :key="col.key"
                          :class="{
                            'font-mono text-sm': col.key === 'studentId' || col.key === 'currentScore' || col.key === 'fullLabScore' || col.key === 'partsCompleted' || col.key === 'totalParts',
                            'font-medium': col.key === 'studentName',
                            'text-right': col.align === 'right',
                            'text-center': col.align === 'center',
                            'text-muted-foreground': col.key === 'fullLabScore' || col.key === 'totalParts'
                          }"
                        >
                          <template v-if="col.key === 'isLate'">
                            <Badge v-if="row.isLate" class="bg-amber-500 text-white">LATE</Badge>
                            <span v-else class="text-muted-foreground">-</span>
                          </template>
                          <template v-else-if="col.key === 'isCompleted'">
                            <Badge v-if="row.isCompleted" class="bg-green-500 text-white">YES</Badge>
                            <span v-else class="text-muted-foreground">No</span>
                          </template>
                          <template v-else>
                            {{ getCellValue(row, col) }}
                          </template>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div v-else-if="!isExporting" class="text-center py-12">
                  <FileSpreadsheet class="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p class="text-muted-foreground">Click "Preview" to load student scores</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>

<style scoped>
/* Smooth animations for ping effect */
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
