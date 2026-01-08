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
  Info
} from 'lucide-vue-next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

// Filtered submissions based on search
const filteredSubmissions = computed(() => {
  if (!searchQuery.value.trim()) {
    return submissionsData.value
  }

  const query = searchQuery.value.toLowerCase()
  return submissionsData.value.filter(submission => {
    return (
      submission.studentId.toLowerCase().includes(query) ||
      submission.studentName.toLowerCase().includes(query)
    )
  })
})

// Sorted by Student ID
const sortedSubmissions = computed<SubmissionWithProgress[]>(() => {
  return [...filteredSubmissions.value]
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
    .map(submission => ({
      ...submission,
      _progress: buildSubmissionProgress(submission)
    }))
})

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
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="submissions" class="flex items-center space-x-2">
            <Users class="w-4 h-4" />
            <span>Submissions</span>
          </TabsTrigger>
          <TabsTrigger value="ip-assignment" class="flex items-center space-x-2">
            <Network class="w-4 h-4" />
            <span>IP Assignment</span>
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
              <!-- Search Bar -->
              <div class="mb-6">
                <div class="relative">
                  <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    v-model="searchQuery"
                    placeholder="Search by Student ID or Student Name..."
                    class="pl-10"
                  />
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
                      v-for="submission in sortedSubmissions"
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
                                <div
                                  v-if="submission._progress.partZeroStatus === 'current'"
                                  class="absolute inset-0 rounded-full bg-yellow-300 animate-ping opacity-60"
                                />
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
                    <TableRow v-if="sortedSubmissions.length === 0">
                      <TableCell colspan="5" class="text-center py-12">
                        <div class="flex flex-col items-center space-y-3">
                          <AlertCircle class="w-12 h-12 text-muted-foreground/50" />
                          <p class="text-muted-foreground">
                            {{ searchQuery ? 'No submissions found matching your search' : 'No submissions yet' }}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- Footer Info -->
              <div class="mt-4 text-sm text-muted-foreground flex items-center space-x-1">
                <Info class="w-4 h-4" />
                <span>Showing {{ sortedSubmissions.length }} {{ sortedSubmissions.length === 1 ? 'student' : 'students' }}</span>
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
