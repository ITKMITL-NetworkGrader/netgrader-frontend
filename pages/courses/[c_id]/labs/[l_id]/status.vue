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
  Eye,
  Server,
  Info
} from 'lucide-vue-next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { useCourseLabs } from '@/composables/useCourseLabs'
import { useCourse } from '@/composables/useCourse'
import { useLabStatus, type LabSubmissionOverview, type LabIPStats, type AssignedIP } from '@/composables/useLabStatus'

const route = useRoute()

// Route params
const courseId = computed(() => route.params.c_id as string)
const labId = computed(() => route.params.l_id as string)

// Composables
const { currentCourse, fetchCourse } = useCourse()
const { currentLab, fetchLabById } = useCourseLabs()
const { fetchLabSubmissionOverview, fetchLabIPStats } = useLabStatus()

// State
const isLoading = ref(true)
const activeTab = ref('submissions')
const searchQuery = ref('')
const submissionsData = ref<LabSubmissionOverview[]>([])
const ipStats = ref<LabIPStats | null>(null)
const assignedIps = ref<AssignedIP[]>([])
const pollingInterval = ref<NodeJS.Timeout | null>(null)

// Computed
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId.value}`)
const labTitle = computed(() => currentLab.value?.title || 'Lab')

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
const sortedSubmissions = computed(() => {
  return [...filteredSubmissions.value].sort((a, b) => {
    return a.studentId.localeCompare(b.studentId)
  })
})

// Get status badge variant
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'passed':
      return { variant: 'default' as const, class: 'bg-green-500 hover:bg-green-600 text-white', label: 'Passed' }
    case 'failed':
      return { variant: 'destructive' as const, class: '', label: 'Not Passed' }
    case 'running':
      return { variant: 'default' as const, class: 'bg-blue-500 hover:bg-blue-600 text-white', label: 'Grading' }
    case 'pending':
      return { variant: 'secondary' as const, class: '', label: 'In Queue' }
    case 'cancelled':
      return { variant: 'outline' as const, class: '', label: 'Cancelled' }
    default:
      return { variant: 'outline' as const, class: '', label: status }
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

// Start polling submissions every 5 seconds
const startPolling = () => {
  // Initial load
  loadSubmissions()

  // Poll every 5 seconds
  pollingInterval.value = setInterval(() => {
    loadSubmissions()
  }, 5000)
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
      fetchLabById(labId.value)
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
            <NuxtLink :to="`/courses/${courseId}/labs/${labId}`" class="hover:text-primary transition-colors">
              {{ labTitle }}
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
        <TabsList class="grid w-full max-w-md grid-cols-2">
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
                    Real-time submission status (auto-refreshes every 5 seconds)
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
                      <TableHead class="font-semibold w-[200px]">Progress</TableHead>
                      <TableHead class="font-semibold w-[140px]">Status</TableHead>
                      <TableHead class="font-semibold w-[200px]">Last Submitted</TableHead>
                      <TableHead class="font-semibold w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="submission in sortedSubmissions"
                      :key="submission.studentId"
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
                      <TableCell>
                        <div class="space-y-2">
                          <div class="text-sm font-medium">
                            {{ submission.progression }}
                          </div>
                          <!-- Visual Progress Indicators -->
                          <div class="flex items-center space-x-1.5">
                            <div
                              v-for="partNum in submission.totalParts"
                              :key="partNum"
                              class="relative"
                            >
                              <!-- Passed Part (Green) -->
                              <div
                                v-if="partNum < submission.currentPart"
                                class="w-3 h-3 rounded-full bg-green-500 border-2 border-green-600"
                                :title="`Part ${partNum} - Completed`"
                              />
                              <!-- Current Part (Yellow with Ping) -->
                              <div
                                v-else-if="partNum === submission.currentPart"
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
                      </TableCell>

                      <!-- Status -->
                      <TableCell>
                        <Badge
                          :variant="getStatusBadge(submission.latestSubmissionStatus).variant"
                          :class="getStatusBadge(submission.latestSubmissionStatus).class"
                        >
                          {{ getStatusBadge(submission.latestSubmissionStatus).label }}
                        </Badge>
                      </TableCell>

                      <!-- Submission Date/Time -->
                      <TableCell class="text-sm text-muted-foreground">
                        {{ formatDateTime(submission.latestSubmissionAt) }}
                      </TableCell>

                      <!-- Actions -->
                      <TableCell>
                        <NuxtLink :to="`/submissions/${submission.studentId}`">
                          <Button variant="ghost" size="sm" class="flex items-center space-x-1">
                            <Eye class="w-4 h-4" />
                            <span>View</span>
                          </Button>
                        </NuxtLink>
                      </TableCell>
                    </TableRow>

                    <!-- Empty State -->
                    <TableRow v-if="sortedSubmissions.length === 0">
                      <TableCell colspan="6" class="text-center py-12">
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
