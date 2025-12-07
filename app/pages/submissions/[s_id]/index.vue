<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Home,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Award,
  FileText,
  Code,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-vue-next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

import { useLabStatus, type DetailedSubmission, type StudentSubmissionHistory } from '@/composables/useLabStatus'
import { useCourseLabs } from '@/composables/useCourseLabs'
import { useCourse } from '@/composables/useCourse'

const route = useRoute()

// Route params
const submissionId = computed(() => route.params.s_id as string)

// Composables
const { fetchSubmissionDetails, fetchStudentHistory } = useLabStatus()
const { currentLab, fetchLabById } = useCourseLabs()
const { currentCourse, fetchCourse } = useCourse()

// State
const isLoading = ref(true)
const submissionData = ref<DetailedSubmission | null>(null)
const studentHistory = ref<StudentSubmissionHistory[]>([])
const expandedTests = ref<Record<string, boolean>>({})

// Computed properties for navigation
const courseId = computed(() => currentCourse.value?.shortcode || '')
const labId = computed(() => submissionData.value?.labId || '')
const studentId = computed(() => submissionData.value?.studentId || '')
const courseTitle = computed(() => currentCourse.value?.title || 'Course')
const labTitle = computed(() => currentLab.value?.title || 'Lab')

// Computed
const totalPoints = computed(() => {
  if (submissionData.value?.gradingResult) {
    return {
      earned: submissionData.value.gradingResult.total_points_earned,
      possible: submissionData.value.gradingResult.total_points_possible
    }
  }

  if (submissionData.value?.fillInBlankResults) {
    return {
      earned: submissionData.value.fillInBlankResults.totalPointsEarned,
      possible: submissionData.value.fillInBlankResults.totalPoints
    }
  }

  return { earned: 0, possible: 0 }
})

const scorePercentage = computed(() => {
  if (totalPoints.value.possible === 0) return 0
  return Math.round((totalPoints.value.earned / totalPoints.value.possible) * 100)
})

const isPassed = computed(() => {
  if (submissionData.value?.fillInBlankResults) {
    return submissionData.value.fillInBlankResults.passed
  }
  return scorePercentage.value === 100
})

const fillInBlankQuestions = computed(() => {
  return submissionData.value?.fillInBlankResults?.questions || []
})

const submissionTypeLabel = computed(() => {
  const type = submissionData.value?.submissionType || 'auto_grading'
  return type.replace(/_/g, ' ')
})

const getCellClass = (question: any, rowIndex: number, cellIndex: number) => {
  const baseClasses = 'px-3 py-2 border-r border-border last:border-r-0 font-mono text-center'
  const answerRow = question.cellResults?.[rowIndex]?.[cellIndex]

  if (!answerRow) {
    return baseClasses
  }

  if (answerRow.isCorrect) {
    return `${baseClasses} bg-green-50`
  }

  if (answerRow.isCorrect === false) {
    return `${baseClasses} bg-red-50`
  }

  return baseClasses
}

// Toggle test details
const toggleTest = (testName: string) => {
  expandedTests.value[testName] = !expandedTests.value[testName]
}

// Get status badge
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'passed':
      return { variant: 'default' as const, class: 'bg-green-500 text-white', icon: CheckCircle2 }
    case 'failed':
      return { variant: 'destructive' as const, class: '', icon: XCircle }
    case 'error':
      return { variant: 'destructive' as const, class: '', icon: AlertCircle }
    default:
      return { variant: 'outline' as const, class: '', icon: Clock }
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
    minute: '2-digit',
    second: '2-digit'
  })
}

// Format execution time
const formatExecutionTime = (seconds: number) => {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
  return `${seconds.toFixed(2)}s`
}

// Load data
const loadData = async () => {
  isLoading.value = true
  try {
    // Fetch submission details
    const detailResult = await fetchSubmissionDetails(submissionId.value)
    if (detailResult.success && detailResult.data) {
      submissionData.value = detailResult.data

      // Fetch lab and course info for breadcrumb navigation
      await fetchLabById(detailResult.data.labId)

      // Fetch course info if lab has courseId
      if (currentLab.value?.courseId) {
        await fetchCourse(currentLab.value.courseId)
      }

      // Fetch student history
      const historyResult = await fetchStudentHistory(
        detailResult.data.labId,
        detailResult.data.studentId
      )
      if (historyResult.success && historyResult.data) {
        studentHistory.value = historyResult.data
      }
    }
  } catch (err) {
    console.error('Failed to load submission details:', err)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Breadcrumb - Sticks below NavigationBar -->
    <div class="border-b bg-background p-4 sticky top-16 z-[150] shadow-sm">
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
              v-if="courseId"
              :to="`/courses/${courseId}`"
              class="hover:text-primary transition-colors"
            >
              {{ courseTitle }}
            </NuxtLink>
            <span v-else class="text-muted-foreground">{{ courseTitle }}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <NuxtLink
              v-if="courseId && labId"
              :to="`/courses/${courseId}/labs/${labId}/status`"
              class="hover:text-primary transition-colors"
            >
              {{ labTitle }}
            </NuxtLink>
            <span v-else class="text-muted-foreground">{{ labTitle }}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <NuxtLink
              v-if="courseId && labId && studentId"
              :to="`/courses/${courseId}/labs/${labId}/students/${studentId}`"
              class="hover:text-primary transition-colors"
            >
              {{ studentId }}
            </NuxtLink>
            <span v-else class="text-muted-foreground">{{ studentId }}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage class="font-medium">
              Submission #{{ submissionData?.attempt || '...' }}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6" />
        <h3 class="text-lg font-semibold mb-2">Loading Submission</h3>
        <p class="text-muted-foreground">Fetching detailed results...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="submissionData" class="container mx-auto px-4 py-8">
      <!-- Back Button -->
      <div class="mb-6">
        <Button variant="ghost" @click="$router.back()" class="flex items-center space-x-2">
          <ArrowLeft class="w-4 h-4" />
          <span>Back to History</span>
        </Button>
      </div>

      <!-- Score Summary -->
      <Card class="mb-8 border-2" :class="isPassed ? 'border-green-500' : 'border-orange-500'">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="flex items-center space-x-3">
                <component
                  :is="isPassed ? CheckCircle2 : XCircle"
                  :class="[
                    'w-10 h-10',
                    isPassed ? 'text-green-500' : 'text-orange-500'
                  ]"
                />
                <div>
                  <h2 class="text-3xl font-bold">
                    {{ totalPoints.earned }}/{{ totalPoints.possible }} Points
                  </h2>
                  <p class="text-muted-foreground">
                    {{ scorePercentage }}% Score
                  </p>
                </div>
              </div>
            </div>
            <div class="text-right space-y-2">
              <Badge
                :variant="isPassed ? 'default' : 'destructive'"
                :class="isPassed ? 'bg-green-500 text-white text-lg px-4 py-2' : 'text-lg px-4 py-2'"
              >
                {{ isPassed ? 'PASSED' : 'NOT PASSED' }}
              </Badge>
              <div class="text-sm text-muted-foreground">
                Attempt #{{ submissionData.attempt }}
              </div>
            </div>
          </div>

          <Separator class="my-4" />

          <!-- Metadata -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div class="text-muted-foreground mb-1">Student ID</div>
              <div class="font-mono font-medium">{{ submissionData.studentId }}</div>
            </div>
            <div>
              <div class="text-muted-foreground mb-1">Submitted At</div>
              <div class="font-medium">{{ formatDateTime(submissionData.submittedAt) }}</div>
            </div>
            <div>
              <div class="text-muted-foreground mb-1">Execution Time</div>
              <div class="font-medium">
                <template v-if="submissionData.submissionType === 'fill_in_blank'">
                  Instant
                </template>
                <template v-else>
                  {{ formatExecutionTime(submissionData.gradingResult?.total_execution_time || 0) }}
                </template>
              </div>
            </div>
            <div>
              <div class="text-muted-foreground mb-1">Status</div>
              <Badge>{{ submissionData.status }}</Badge>
            </div>
            <div>
              <div class="text-muted-foreground mb-1">Submission Type</div>
              <Badge variant="outline" class="capitalize">
                {{ submissionTypeLabel }}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Fill-in-Blank Question Breakdown -->
      <Card v-if="submissionData.fillInBlankResults" class="mb-8">
        <CardHeader>
          <CardTitle class="flex items-center space-x-2">
            <FileText class="w-5 h-5" />
            <span>Question Breakdown</span>
          </CardTitle>
          <CardDescription>
            Detailed results for each fill-in-blank question
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="question in fillInBlankQuestions"
            :key="question.questionId"
            class="border rounded-lg p-4 space-y-3 transition-colors"
            :class="question.isCorrect ? 'border-green-300' : 'border-red-300'"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm text-muted-foreground">Question</div>
                <div class="font-semibold text-base">{{ question.questionText }}</div>
                <div class="text-xs text-muted-foreground mt-1">Type: {{ question.questionType.split('_').join(' ') }}</div>
              </div>
              <div class="text-right space-y-1">
                <Badge
                  :variant="question.isCorrect ? 'default' : 'destructive'"
                  :class="question.isCorrect ? 'bg-green-500 text-white' : ''"
                >
                  {{ question.isCorrect ? 'Correct' : 'Incorrect' }}
                </Badge>
                <div class="text-sm font-mono">
                  {{ question.pointsEarned }}/{{ question.pointsPossible }} pts
                </div>
                <div v-if="typeof question.correctCells === 'number' && typeof question.totalCells === 'number'" class="text-xs text-muted-foreground">
                  {{ question.correctCells }}/{{ question.totalCells }} cells correct
                </div>
              </div>
            </div>

            <div v-if="question.studentAnswer" class="text-sm">
              <span class="text-muted-foreground">Answer:</span>
              <code class="px-2 py-1 bg-muted rounded ml-2">{{ question.studentAnswer }}</code>
            </div>

            <div v-if="question.ipTableAnswers && question.ipTableAnswers.length" class="overflow-x-auto">
              <table class="min-w-full text-sm border border-border rounded">
                <tbody>
                  <tr
                    v-for="(row, rowIndex) in question.ipTableAnswers"
                    :key="`fib-row-${question.questionId}-${rowIndex}`"
                    class="border-b border-border last:border-b-0"
                  >
                    <td
                      v-for="(cell, cellIndex) in row"
                      :key="`fib-cell-${question.questionId}-${rowIndex}-${cellIndex}`"
                      :class="getCellClass(question, rowIndex, cellIndex)"
                    >
                      {{ cell || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Test Results -->
      <Card v-if="submissionData.submissionType !== 'fill_in_blank'" class="mb-8">
        <CardHeader>
          <CardTitle class="flex items-center space-x-2">
            <FileText class="w-5 h-5" />
            <span>Test Results</span>
          </CardTitle>
          <CardDescription>
            Detailed breakdown of test case results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div
              v-for="(test, index) in submissionData.gradingResult?.test_results || []"
              :key="`test-${index}`"
              class="border rounded-lg overflow-hidden"
            >
              <Collapsible v-model:open="expandedTests[test.test_name]">
                <!-- Test Header -->
                <CollapsibleTrigger
                  class="w-full p-4 hover:bg-muted/30 transition-colors flex items-center justify-between"
                  @click="toggleTest(test.test_name)"
                >
                  <div class="flex items-center space-x-3">
                    <component
                      :is="getStatusBadge(test.status).icon"
                      :class="[
                        'w-5 h-5',
                        test.status === 'passed' ? 'text-green-500' : 'text-red-500'
                      ]"
                    />
                    <div class="text-left">
                      <div class="font-semibold">{{ test.test_name }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ test.points_earned }}/{{ test.points_possible }} points
                        · {{ formatExecutionTime(test.execution_time) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <Badge
                      :variant="getStatusBadge(test.status).variant"
                      :class="getStatusBadge(test.status).class"
                    >
                      {{ test.status.toUpperCase() }}
                    </Badge>
                    <component
                      :is="expandedTests[test.test_name] ? ChevronUp : ChevronDown"
                      class="w-5 h-5 text-muted-foreground"
                    />
                  </div>
                </CollapsibleTrigger>

                <!-- Test Details -->
                <CollapsibleContent>
                  <div class="p-4 bg-muted/20 border-t space-y-4">
                    <!-- Message -->
                    <div v-if="test.message" class="text-sm">
                      <div class="font-semibold mb-1">Message:</div>
                      <div class="text-muted-foreground">{{ test.message }}</div>
                    </div>

                    <!-- Test Case Results -->
                    <div v-if="test.test_case_results && test.test_case_results.length > 0">
                      <div class="font-semibold mb-2">Test Cases:</div>
                      <div class="space-y-2">
                        <div
                          v-for="(testCase, tcIndex) in test.test_case_results"
                          :key="`tc-${tcIndex}`"
                          class="p-3 bg-background rounded border"
                        >
                          <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center space-x-2">
                              <component
                                :is="testCase.status === 'passed' ? CheckCircle2 : XCircle"
                                :class="[
                                  'w-4 h-4',
                                  testCase.status === 'passed' ? 'text-green-500' : 'text-red-500'
                                ]"
                              />
                              <span class="text-sm font-medium">{{ testCase.description }}</span>
                            </div>
                            <Badge
                              :variant="testCase.status === 'passed' ? 'default' : 'destructive'"
                              :class="testCase.status === 'passed' ? 'bg-green-500 text-white' : ''"
                              class="text-xs"
                            >
                              {{ testCase.points_earned }}/{{ testCase.points_possible }} pts
                            </Badge>
                          </div>

                          <!-- Comparison Details -->
                          <div class="text-xs space-y-1 text-muted-foreground">
                            <div><strong>Type:</strong> {{ testCase.comparison_type }}</div>
                            <div><strong>Expected:</strong> <code class="px-1 py-0.5 bg-muted rounded">{{ testCase.expected_value }}</code></div>
                            <div><strong>Actual:</strong> <code class="px-1 py-0.5 bg-muted rounded">{{ testCase.actual_value }}</code></div>
                            <div v-if="testCase.message"><strong>Message:</strong> {{ testCase.message }}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Raw Output -->
                    <div v-if="test.raw_output" class="space-y-2">
                      <div class="font-semibold">Raw Output:</div>
                      <pre class="p-3 bg-muted rounded text-xs overflow-x-auto">{{ test.raw_output }}</pre>
                    </div>

                    <!-- Debug Info -->
                    <div v-if="test.debug_info && test.debug_info.enabled" class="space-y-2">
                      <div class="font-semibold flex items-center space-x-2">
                        <Code class="w-4 h-4" />
                        <span>Debug Information:</span>
                      </div>
                      <pre class="p-3 bg-muted rounded text-xs overflow-x-auto">{{ JSON.stringify(test.debug_info, null, 2) }}</pre>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <!-- No Tests -->
            <div v-if="!submissionData.gradingResult?.test_results || submissionData.gradingResult.test_results.length === 0" class="text-center py-8 text-muted-foreground">
              No test results available
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Student Attempt History -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center space-x-2">
            <Clock class="w-5 h-5" />
            <span>Attempt History</span>
          </CardTitle>
          <CardDescription>
            All submission attempts for this lab
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="studentHistory.length > 0" class="space-y-6">
            <div
              v-for="part in studentHistory"
              :key="part.partId"
              class="space-y-3"
            >
              <h3 class="font-semibold text-sm text-muted-foreground">Part: {{ part.partId }}</h3>
              <div class="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attempt</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="submission in part.submissionHistory"
                      :key="submission._id"
                      :class="submission._id === submissionId ? 'bg-primary/5 border-l-4 border-l-primary' : ''"
                    >
                      <TableCell class="font-medium">
                        Attempt #{{ submission.attempt }}
                        <Badge v-if="submission._id === submissionId" variant="secondary" class="ml-2 text-xs">
                          Current
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span class="font-mono">{{ submission.score }}/{{ submission.totalPoints }}</span>
                      </TableCell>
                      <TableCell>
                        <Badge :variant="submission.status === 'completed' ? 'default' : 'secondary'">
                          {{ submission.status }}
                        </Badge>
                      </TableCell>
                      <TableCell class="text-sm text-muted-foreground">
                        {{ formatDateTime(submission.submittedAt) }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-muted-foreground">
            No attempt history available
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Error State -->
    <div v-else class="p-8 max-w-2xl mx-auto">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription class="text-base">
          Failed to load submission details. The submission may not exist or you don't have access to it.
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template>
