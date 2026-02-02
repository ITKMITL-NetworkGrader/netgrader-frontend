<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  FileText,
  History,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-vue-next'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

import { useStudentSubmissionHistory, type PartSubmissionHistory, type SubmissionAttempt } from '@/composables/useStudentSubmissionHistory'
import { useCourseLabs } from '@/composables/useCourseLabs'
import { useCourse } from '@/composables/useCourse'
import { useUserState } from '@/composables/states'
import { applyLatePenalty, calculateStats, type PenalizedPartHistory, type LabPenaltyConfig } from '@/composables/useLatePenaltyCalculation'

const route = useRoute()

// Route params
const courseId = computed(() => route.params.c_id as string)
const labId = computed(() => route.params.l_id as string)

// User state
const userState = useUserState()
const studentId = computed(() => userState.value?.u_id || '')

// Composables
const { currentLab, fetchLabById, fetchLabParts, currentLabParts } = useCourseLabs()
const { currentCourse, fetchCourse } = useCourse()
const {
  isLoading,
  error,
  submissionHistory,
  fetchStudentSubmissionHistory,
  formatDateTime,
  getStatusBadge
} = useStudentSubmissionHistory()

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)
const expandedParts = ref<Record<string, boolean>>({})

// Computed properties
const courseTitle = computed(() => currentCourse.value?.title || 'Course')
const labTitle = computed(() => currentLab.value?.title || 'Lab')

// Flatten all submissions for pagination (using penalty-adjusted data)
const allSubmissions = computed(() => {
  const submissions: Array<SubmissionAttempt & { partId: string; partTitle?: string }> = []
  
  submissionHistoryWithPenalty.value.forEach(part => {
    part.submissionHistory.forEach(attempt => {
      submissions.push({
        ...attempt,
        partId: part.partId,
        partTitle: part.partTitle
      })
    })
  })
  
  // Sort by submission date, most recent first
  return submissions.sort((a, b) => {
    const dateA = new Date(a.submittedAt).getTime()
    const dateB = new Date(b.submittedAt).getTime()
    return dateB - dateA
  })
})

// Pagination computed values
const totalSubmissions = computed(() => allSubmissions.value.length)
const totalPages = computed(() => Math.ceil(totalSubmissions.value / itemsPerPage.value))

const paginatedSubmissions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return allSubmissions.value.slice(start, end)
})

// Lab configuration for penalty calculation
const labPenaltyConfig = computed<LabPenaltyConfig>(() => ({
  dueDate: currentLab.value?.dueDate,
  availableUntil: currentLab.value?.availableUntil,
  latePenaltyPercent: (currentLab.value as any)?.latePenaltyPercent
}))

// Apply late penalty using shared utility
const submissionHistoryWithPenalty = computed<PenalizedPartHistory[]>(() => {
  return applyLatePenalty(submissionHistory.value, labPenaltyConfig.value)
})

// Stats using shared calculation utility
const stats = computed(() => {
  // Get total possible points from actual lab parts fetched via fetchLabParts
  const totalPossiblePoints = currentLabParts.value.reduce((sum: number, part: any) => {
    return sum + (part.totalPoints || 0)
  }, 0)
  
  const baseStats = calculateStats(submissionHistoryWithPenalty.value, totalPossiblePoints || undefined)
  
  // Override totalParts to use lab parts if available
  return {
    ...baseStats,
    totalParts: currentLabParts.value.length || baseStats.totalParts
  }
})

// Page numbers for pagination display
const visiblePageNumbers = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, 5, -1, total)
    } else if (current >= total - 2) {
      pages.push(1, -1, total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, -1, current - 1, current, current + 1, -1, total)
    }
  }
  
  return pages
})

// Navigation functions
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const togglePart = (partId: string) => {
  expandedParts.value[partId] = !expandedParts.value[partId]
}

const navigateToSubmission = (submissionId: string) => {
  navigateTo(`/submissions/${submissionId}`)
}

// Load data
const loadData = async () => {
  if (!studentId.value || !labId.value) {
    return
  }
  
  try {
    // Fetch course, lab info, and lab parts
    await Promise.all([
      fetchLabById(labId.value),
      fetchCourse(courseId.value),
      fetchStudentSubmissionHistory(labId.value, studentId.value),
      fetchLabParts(labId.value)
    ])
    
    // Auto-expand the first part
    if (submissionHistory.value.length > 0) {
      expandedParts.value[submissionHistory.value[0].partId] = true
    }
  } catch (err) {
    console.error('Failed to load submission history:', err)
  }
}

// Reset page when data changes
watch(submissionHistory, () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Breadcrumb -->
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
            <NuxtLink
              :to="`/courses/${courseId}`"
              class="hover:text-primary transition-colors"
            >
              {{ courseTitle }}
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <NuxtLink
              :to="`/courses/${courseId}/labs/${labId}`"
              class="hover:text-primary transition-colors"
            >
              {{ labTitle }}
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage class="font-medium">
              Submission History
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6" />
        <h3 class="text-lg font-semibold mb-2">Loading Submissions</h3>
        <p class="text-muted-foreground">Fetching your submission history...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-8 max-w-2xl mx-auto">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription class="text-base">{{ error }}</AlertDescription>
      </Alert>
    </div>

    <!-- Main Content -->
    <div v-else class="container mx-auto px-4 py-8">
      <!-- Back Button -->
      <div class="mb-6">
        <Button variant="ghost" @click="$router.back()" class="flex items-center space-x-2">
          <ArrowLeft class="w-4 h-4" />
          <span>Back to Lab</span>
        </Button>
      </div>

      <!-- Header with Stats -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div class="p-3 bg-primary/10 rounded-lg">
              <History class="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 class="text-2xl font-bold">Submission History</h1>
              <p class="text-muted-foreground">{{ labTitle }}</p>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent class="p-4">
              <div class="text-2xl font-bold text-primary">{{ stats.totalAttempts }}</div>
              <div class="text-sm text-muted-foreground">Total Submissions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
              <div class="text-2xl font-bold text-green-600">{{ stats.passedAttempts }}</div>
              <div class="text-sm text-muted-foreground">Passed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
              <div class="text-2xl font-bold text-blue-600">{{ stats.partsCompleted }}/{{ stats.totalParts }}</div>
              <div class="text-sm text-muted-foreground">Parts Completed</div>
            </CardContent>
          </Card>
          <Card class="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent class="p-4">
              <div class="text-2xl font-bold text-primary">{{ stats.totalScore }}/{{ stats.totalPossiblePoints }}</div>
              <div class="text-sm text-muted-foreground">Total Score (Best per Part)</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- No Submissions State -->
      <div v-if="submissionHistoryWithPenalty.length === 0" class="text-center py-16">
        <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-medium mb-2">No Submissions Yet</h3>
        <p class="text-muted-foreground mb-4">
          You haven't made any submissions for this lab yet.
        </p>
        <NuxtLink :to="`/courses/${courseId}/labs/${labId}`">
          <Button>
            Start Lab
          </Button>
        </NuxtLink>
      </div>

      <!-- Submissions by Part (Accordion View) -->
      <div v-else class="space-y-4 mb-8">
        <h2 class="text-lg font-semibold flex items-center space-x-2">
          <FileText class="w-5 h-5" />
          <span>Submissions by Part</span>
        </h2>

        <div class="space-y-3">
          <Card
            v-for="part in submissionHistoryWithPenalty"
            :key="part.partId"
            class="overflow-hidden"
          >
            <Collapsible v-model:open="expandedParts[part.partId]">
              <CollapsibleTrigger
                class="w-full p-4 hover:bg-muted/30 transition-colors flex items-center justify-between"
                @click="togglePart(part.partId)"
              >
                <div class="flex items-center space-x-3">
                  <div 
                    class="w-10 h-10 rounded-lg flex items-center justify-center"
                    :class="part.isPartCompleted
                      ? 'bg-green-100 text-green-600'
                      : 'bg-muted text-muted-foreground'"
                  >
                    <component 
                      :is="part.isPartCompleted ? CheckCircle2 : FileText"
                      class="w-5 h-5"
                    />
                  </div>
                  <div class="text-left">
                    <div class="font-semibold">{{ part.partTitle || part.partId }}</div>
                    <div class="text-sm text-muted-foreground">
                      {{ part.submissionHistory.length }} submission{{ part.submissionHistory.length !== 1 ? 's' : '' }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <Badge 
                    v-if="part.isPartCompleted"
                    class="bg-green-500 text-white"
                  >
                    Completed
                  </Badge>
                  <Badge v-else variant="secondary">
                    In Progress
                  </Badge>
                  <component
                    :is="expandedParts[part.partId] ? ChevronUp : ChevronDown"
                    class="w-5 h-5 text-muted-foreground"
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div class="border-t">
                  <div 
                    v-for="submission in part.submissionHistory"
                    :key="submission._id"
                    class="p-4 border-b last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    @click="navigateToSubmission(submission._id)"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-4">
                        <div class="text-center min-w-[60px]">
                          <div class="text-lg font-bold">#{{ submission.attempt }}</div>
                          <div class="text-xs text-muted-foreground">Attempt</div>
                        </div>
                        <Separator orientation="vertical" class="h-10" />
                        <div>
                          <template v-if="submission.isLate">
                            <div class="flex items-center space-x-1 font-mono text-lg">
                              <span class="text-muted-foreground line-through">{{ submission.originalScore }}</span>
                              <span class="text-amber-600 font-semibold">→ {{ submission.adjustedScore }}/{{ submission.totalPoints }}</span>
                            </div>
                            <div class="text-xs text-amber-600">
                              Late: -{{ submission.latePenaltyPercent }}% on improvement
                            </div>
                            <div class="text-xs text-muted-foreground mt-0.5" v-if="submission.bestScoreBeforeDue !== undefined">
                              ({{ submission.bestScoreBeforeDue }} + {{ submission.penalizedImprovement }} after penalty)
                            </div>
                          </template>
                          <template v-else>
                            <div class="font-mono text-lg">
                              {{ submission.score }}/{{ submission.totalPoints }}
                            </div>
                            <div class="text-xs text-muted-foreground">Points</div>
                          </template>
                        </div>
                        <Separator orientation="vertical" class="h-10" />
                        <div>
                          <div class="flex items-center space-x-1">
                            <Badge 
                              :variant="getStatusBadge(submission.status, submission.score, submission.totalPoints).variant"
                              :class="getStatusBadge(submission.status, submission.score, submission.totalPoints).class"
                            >
                              {{ getStatusBadge(submission.status, submission.score, submission.totalPoints).label }}
                            </Badge>
                            <Badge
                              v-if="submission.isLate"
                              class="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <AlertTriangle class="w-3 h-3 mr-1" />
                              LATE
                            </Badge>
                          </div>
                          <div class="text-xs text-muted-foreground mt-1">
                            {{ submission.submissionType?.replace(/_/g, ' ') || 'auto grading' }}
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-3">
                        <div class="text-right">
                          <div class="text-sm">{{ formatDateTime(submission.submittedAt) }}</div>
                          <div class="text-xs text-muted-foreground">Submitted</div>
                        </div>
                        <ExternalLink class="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>

      <!-- All Submissions (Flat List with Pagination) -->
      <div v-if="totalSubmissions > 0" class="space-y-4">
        <h2 class="text-lg font-semibold flex items-center space-x-2">
          <Clock class="w-5 h-5" />
          <span>Recent Submissions</span>
          <Badge variant="secondary" class="ml-2">{{ totalSubmissions }}</Badge>
        </h2>

        <Card>
          <CardContent class="p-0">
            <div class="divide-y">
              <div
                v-for="submission in paginatedSubmissions"
                :key="submission._id"
                class="p-4 hover:bg-muted/20 cursor-pointer transition-colors flex items-center justify-between"
                @click="navigateToSubmission(submission._id)"
              >
                <div class="flex items-center space-x-4">
                  <component
                    :is="submission.status === 'completed' && submission.score === submission.totalPoints ? CheckCircle2 : XCircle"
                    :class="[
                      'w-6 h-6',
                      submission.status === 'completed' && submission.score === submission.totalPoints
                        ? 'text-green-500'
                        : 'text-orange-500'
                    ]"
                  />
                  <div>
                    <div class="font-medium">
                      {{ submission.partTitle || submission.partId }}
                      <span class="text-muted-foreground font-normal ml-2">Attempt #{{ submission.attempt }}</span>
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {{ formatDateTime(submission.submittedAt) }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-4">
                  <div class="text-right">
                    <div class="font-mono font-semibold">
                      {{ submission.score }}/{{ submission.totalPoints }}
                    </div>
                    <Badge 
                      :variant="getStatusBadge(submission.status, submission.score, submission.totalPoints).variant"
                      :class="getStatusBadge(submission.status, submission.score, submission.totalPoints).class"
                      class="text-xs"
                    >
                      {{ getStatusBadge(submission.status, submission.score, submission.totalPoints).label }}
                    </Badge>
                  </div>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, totalSubmissions) }} of {{ totalSubmissions }} submissions
          </div>
          
          <div class="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage === 1"
              @click="goToPage(1)"
            >
              <ChevronsLeft class="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              <ChevronLeft class="w-4 h-4" />
            </Button>

            <template v-for="page in visiblePageNumbers" :key="page">
              <span v-if="page === -1" class="px-2 text-muted-foreground">...</span>
              <Button
                v-else
                :variant="page === currentPage ? 'default' : 'outline'"
                size="sm"
                class="min-w-[40px]"
                @click="goToPage(page)"
              >
                {{ page }}
              </Button>
            </template>

            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              <ChevronRight class="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage === totalPages"
              @click="goToPage(totalPages)"
            >
              <ChevronsRight class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
