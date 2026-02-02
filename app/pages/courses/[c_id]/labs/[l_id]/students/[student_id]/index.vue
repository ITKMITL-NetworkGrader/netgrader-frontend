<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Home,
  ChevronRight,
  BookOpen,
  User,
  Clock,
  Award,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Play
} from 'lucide-vue-next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'

import { useCourseLabs } from '@/composables/useCourseLabs'
import { useCourse } from '@/composables/useCourse'
import { useStudentSubmissionHistory } from '@/composables/useStudentSubmissionHistory'
import { applyLatePenalty, calculateStats, type PenalizedPartHistory, type LabPenaltyConfig } from '@/composables/useLatePenaltyCalculation'

const route = useRoute()

// Route params
const courseId = computed(() => route.params.c_id as string)
const labId = computed(() => route.params.l_id as string)
const studentId = computed(() => route.params.student_id as string)

// Composables
const { currentCourse, fetchCourse } = useCourse()
const { currentLab, fetchLabById } = useCourseLabs()
const {
  isLoading,
  error,
  submissionHistory,
  fetchStudentSubmissionHistory,
  formatDateTime,
  getStatusBadge
} = useStudentSubmissionHistory()

// Computed
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId.value}`)
const labTitle = computed(() => currentLab.value?.title || 'Lab')

// Lab configuration for penalty calculation
const labPenaltyConfig = computed<LabPenaltyConfig>(() => ({
  dueDate: currentLab.value?.dueDate,
  availableUntil: currentLab.value?.availableUntil,
  latePenaltyPercent: (currentLab.value as any)?.latePenaltyPercent
}))

// Apply late penalty using shared utility
const submissionHistoryWithIncrementalPenalty = computed<PenalizedPartHistory[]>(() => {
  return applyLatePenalty(submissionHistory.value, labPenaltyConfig.value)
})

// Calculate overall statistics using shared utility
const overallStats = computed(() => {
  return calculateStats(submissionHistoryWithIncrementalPenalty.value)
})

// Get the best attempt for a part (highest effective score)
const getBestAttempt = (partHistory: any[]) => {
  if (!partHistory || partHistory.length === 0) return null
  
  // Filter to only completed attempts
  const completedAttempts = partHistory.filter(a => a.status === 'completed')
  if (completedAttempts.length === 0) {
    // Return the latest attempt if none are completed
    return partHistory.reduce((latest, current) => 
      current.attempt > latest.attempt ? current : latest
    , partHistory[0])
  }
  
  // Find the attempt with the highest effective score
  return completedAttempts.reduce((best, current) => {
    const currentScore = current.adjustedScore ?? current.score ?? 0
    const bestScore = best.adjustedScore ?? best.score ?? 0
    return currentScore > bestScore ? current : best
  }, completedAttempts[0])
}

// Load data
const loadData = async () => {
  try {
    await Promise.all([
      fetchCourse(courseId.value),
      fetchLabById(labId.value),
      fetchStudentSubmissionHistory(labId.value, studentId.value)
    ])
  } catch (err) {
    console.error('Failed to load data:', err)
  }
}

onMounted(() => {
  loadData()
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
            <NuxtLink :to="`/courses/${courseId}/labs/${labId}/status`" class="hover:text-primary transition-colors">
              {{ labTitle }}
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage class="font-medium">
              {{ studentId }}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6" />
        <h3 class="text-lg font-semibold mb-2">Loading Submission History</h3>
        <p class="text-muted-foreground">Fetching student attempts...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="container mx-auto px-4 py-8">
      <Card class="border-destructive">
        <CardContent class="pt-6">
          <div class="flex items-center space-x-3 text-destructive">
            <AlertCircle class="w-6 h-6" />
            <div>
              <h3 class="font-semibold">Error Loading Submission History</h3>
              <p class="text-sm">{{ error }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Main Content -->
    <div v-else class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center space-x-4 mb-4">
          <div class="w-12 h-12 bg-gradient-to-br from-secondary/20 to-secondary/30 rounded-xl flex items-center justify-center border border-secondary/20">
            <User class="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-foreground">Student Submission History</h1>
            <p class="text-muted-foreground">{{ studentId }} - {{ labTitle }}</p>
          </div>
        </div>
      </div>

      <!-- Overall Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Total Attempts -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Clock class="w-4 h-4" />
              <span>Total Attempts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ overallStats.totalAttempts }}</div>
          </CardContent>
        </Card>

        <!-- Parts Progress -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <BookOpen class="w-4 h-4" />
              <span>Parts Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ overallStats.partsCompleted }}/{{ overallStats.totalParts }}</div>
          </CardContent>
        </Card>

        <!-- Total Score -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Award class="w-4 h-4" />
              <span>Total Score</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ overallStats.totalScore }}/{{ overallStats.totalPossiblePoints }}</div>
          </CardContent>
        </Card>

        <!-- Progress Percentage -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <TrendingUp class="w-4 h-4" />
              <span>Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold mb-2">{{ overallStats.progressPercentage }}%</div>
            <Progress :model-value="overallStats.progressPercentage" class="h-2" />
          </CardContent>
        </Card>
      </div>

      <!-- Submission History by Part (Accordion) -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center space-x-2">
            <BookOpen class="w-5 h-5" />
            <span>Submission History by Part</span>
          </CardTitle>
          <CardDescription>
            View all submission attempts grouped by lab part
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" class="w-full" v-if="submissionHistoryWithIncrementalPenalty.length > 0">
            <AccordionItem
              v-for="(partHistory, index) in submissionHistoryWithIncrementalPenalty"
              :key="partHistory.partId"
              :value="`part-${index}`"
            >
              <AccordionTrigger class="hover:no-underline">
                <div class="flex items-center justify-between w-full pr-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span class="text-sm font-semibold text-primary">{{ partHistory.partOrder ?? (index + 1) }}</span>
                    </div>
                    <div class="text-left">
                      <div class="font-semibold">Part {{ partHistory.partOrder ?? (index + 1) }}: {{ partHistory.partTitle || partHistory.partId }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ partHistory.submissionHistory.length }} {{ partHistory.submissionHistory.length === 1 ? 'attempt' : 'attempts' }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <!-- Best Score Badge -->
                    <Badge variant="outline" class="font-mono">
                      Best: {{ getBestAttempt(partHistory.submissionHistory)?.adjustedScore ?? getBestAttempt(partHistory.submissionHistory)?.score ?? 0 }}/{{ getBestAttempt(partHistory.submissionHistory)?.totalPoints ?? 0 }}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div class="space-y-3 pt-2">
                  <!-- Attempt Cards -->
                  <NuxtLink
                    v-for="attempt in partHistory.submissionHistory"
                    :key="attempt._id"
                    :to="`/submissions/${attempt._id}`"
                    class="block"
                  >
                    <Card class="hover:shadow-md transition-all cursor-pointer border-l-4 hover:bg-accent/50"
                      :class="{
                        'border-l-green-500': attempt.status === 'completed' && attempt.score === attempt.totalPoints,
                        'border-l-red-500': attempt.status === 'completed' && attempt.score < attempt.totalPoints,
                        'border-l-blue-500': attempt.status === 'running',
                        'border-l-muted-foreground': attempt.status === 'pending' || attempt.status === 'cancelled'
                      }"
                    >
                      <CardContent class="p-4">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center space-x-4">
                            <!-- Attempt Number -->
                            <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <span class="font-semibold text-sm">#{{ attempt.attempt }}</span>
                            </div>

                            <!-- Attempt Details -->
                            <div>
                              <div class="flex items-center space-x-2 mb-1">
                                <div class="relative inline-flex">
                                  <div
                                    v-if="getStatusBadge(attempt.status, attempt.score, attempt.totalPoints).showPing"
                                    class="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"
                                  />
                                  <Badge
                                    :variant="getStatusBadge(attempt.status, attempt.score, attempt.totalPoints).variant"
                                    :class="getStatusBadge(attempt.status, attempt.score, attempt.totalPoints).class"
                                    class="relative"
                                  >
                                    {{ getStatusBadge(attempt.status, attempt.score, attempt.totalPoints).label }}
                                  </Badge>
                                </div>
                                <!-- LATE Badge -->
                                <Badge
                                  v-if="attempt.isLate"
                                  class="bg-amber-500 hover:bg-amber-600 text-white"
                                >
                                  <AlertTriangle class="w-3 h-3 mr-1" />
                                  LATE
                                </Badge>
                                <!-- Score Display with penalty breakdown for late submissions -->
                                <template v-if="attempt.isLate">
                                  <span class="font-mono text-muted-foreground line-through">{{ attempt.originalScore }}</span>
                                  <span class="font-mono font-semibold text-amber-600">→ {{ attempt.adjustedScore }}/{{ attempt.totalPoints }}</span>
                                  <span class="text-xs text-amber-600">(-{{ attempt.latePenaltyPercent }}%)</span>
                                  <!-- Detailed penalty breakdown -->
                                  <span class="text-xs text-muted-foreground ml-2" :title="`Base: ${attempt.bestScoreBeforeDue} + Improvement: ${attempt.penalizedImprovement} = ${attempt.adjustedScore}`">
                                    ({{ attempt.bestScoreBeforeDue }} + {{ attempt.penalizedImprovement }})
                                  </span>
                                </template>
                                <template v-else>
                                  <span class="font-mono font-semibold">{{ attempt.score }}/{{ attempt.totalPoints }}</span>
                                  <span class="text-sm text-muted-foreground">
                                    ({{ attempt.totalPoints > 0 ? Math.round((attempt.score / attempt.totalPoints) * 100) : 0 }}%)
                                  </span>
                                </template>
                              </div>
                              <div class="flex items-center space-x-4 text-xs text-muted-foreground">
                                <div class="flex items-center space-x-1">
                                  <Calendar class="w-3 h-3" />
                                  <span>Submitted: {{ formatDateTime(attempt.submittedAt) }}</span>
                                </div>
                                <div class="flex items-center">
                                  <Badge variant="outline" class="text-[10px] capitalize">
                                    {{ (attempt.submissionType || 'auto_grading').replace(/_/g, ' ') }}
                                  </Badge>
                                </div>
                                <div v-if="attempt.completedAt" class="flex items-center space-x-1">
                                  <CheckCircle2 class="w-3 h-3" />
                                  <span>Completed: {{ formatDateTime(attempt.completedAt) }}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- Score Indicator -->
                          <div class="text-right">
                            <CheckCircle2
                              v-if="attempt.status === 'completed' && attempt.score === attempt.totalPoints"
                              class="w-8 h-8 text-green-500"
                            />
                            <XCircle
                              v-else-if="attempt.status === 'completed' && attempt.score < attempt.totalPoints"
                              class="w-8 h-8 text-destructive"
                            />
                            <Loader2
                              v-else-if="attempt.status === 'running'"
                              class="w-8 h-8 text-blue-500 animate-spin"
                            />
                            <Clock
                              v-else-if="attempt.status === 'pending'"
                              class="w-8 h-8 text-muted-foreground"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </NuxtLink>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <AlertCircle class="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p class="text-muted-foreground">No submission history found for this student.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
