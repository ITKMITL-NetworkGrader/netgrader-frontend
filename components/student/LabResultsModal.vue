<template>
  <div v-if="isOpen" class="fixed inset-x-0 top-[73px] bottom-0 z-50 flex items-center justify-center bg-background/95">
    <div class="bg-card border border-border rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground flex-shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <Award class="w-7 h-7" />
            </div>
            <div>
              <h2 class="text-2xl font-bold">Lab Results</h2>
              <p class="text-primary-foreground/80 text-sm">Detailed grading breakdown</p>
            </div>
          </div>
          <Badge variant="secondary" class="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 font-semibold text-lg px-4 py-2">
            {{ totalPointsEarned }}/{{ totalPointsPossible }} pts
          </Badge>
        </div>
      </div>

      <!-- Content - Scrollable -->
      <ScrollArea class="flex-1 p-6">
        <div class="space-y-6">
          <!-- Overall Summary -->
          <Card class="border-primary/20 bg-primary/5">
            <CardHeader class="pb-3">
              <CardTitle class="text-lg flex items-center space-x-2">
                <Target class="w-5 h-5 text-primary" />
                <span>Overall Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-3 bg-card rounded-lg border border-border">
                  <div class="text-2xl font-bold text-foreground">{{ completedParts }}</div>
                  <div class="text-xs text-muted-foreground">Parts Completed</div>
                </div>
                <div class="text-center p-3 bg-card rounded-lg border border-border">
                  <div class="text-2xl font-bold text-foreground">{{ totalAttempts }}</div>
                  <div class="text-xs text-muted-foreground">Total Attempts</div>
                </div>
                <div class="text-center p-3 bg-card rounded-lg border border-border">
                  <div class="text-2xl font-bold text-green-600">{{ successRate }}%</div>
                  <div class="text-xs text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Parts Breakdown -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold flex items-center space-x-2">
              <FileText class="w-5 h-5" />
              <span>Parts Breakdown</span>
            </h3>

            <Accordion type="single" collapsible class="space-y-3">
              <AccordionItem
                v-for="(partResult, index) in partResults"
                :key="partResult.partId"
                :value="`part-${index}`"
                class="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger class="px-4 hover:no-underline">
                  <div class="flex items-center justify-between w-full pr-4">
                    <div class="flex items-center space-x-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center"
                        :class="partResult.isPassed ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'"
                      >
                        <CheckCircle v-if="partResult.isPassed" class="w-5 h-5 text-green-600" />
                        <XCircle v-else class="w-5 h-5 text-red-600" />
                      </div>
                      <div class="text-left">
                        <div class="font-semibold">Part {{ index + 1 }}: {{ partResult.title }}</div>
                        <div class="text-xs text-muted-foreground">
                          {{ partResult.attempts }} attempt{{ partResult.attempts > 1 ? 's' : '' }}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center space-x-4">
                      <Badge
                        :variant="partResult.isPassed ? 'default' : 'destructive'"
                        class="font-semibold"
                      >
                        {{ partResult.pointsEarned }}/{{ partResult.pointsPossible }} pts
                      </Badge>
                      <Badge
                        variant="outline"
                        :class="partResult.isPassed ? 'border-green-500 text-green-700 dark:text-green-300' : 'border-red-500 text-red-700 dark:text-red-300'"
                      >
                        {{ partResult.isPassed ? 'Passed' : 'Failed' }}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent class="px-4 pb-4">
                  <div class="space-y-4 pt-3">
                    <!-- Submission Info -->
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      <div class="flex items-center space-x-2 text-muted-foreground">
                        <Clock class="w-4 h-4" />
                        <span>Submitted: {{ formatDate(partResult.submittedAt) }}</span>
                      </div>
                      <div class="flex items-center space-x-2 text-muted-foreground">
                        <Timer class="w-4 h-4" />
                        <span>Execution: {{ partResult.executionTime.toFixed(4) }}s</span>
                      </div>
                    </div>

                    <!-- Test Results -->
                    <div v-if="partResult.testResults && partResult.testResults.length > 0">
                      <h4 class="font-medium text-sm mb-3 flex items-center space-x-2">
                        <TestTube class="w-4 h-4" />
                        <span>Test Results</span>
                      </h4>
                      <div class="space-y-2">
                        <div
                          v-for="(test, testIdx) in partResult.testResults"
                          :key="testIdx"
                          class="p-3 rounded-lg border"
                          :class="test.status === 'passed' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'"
                        >
                          <div class="flex items-start justify-between mb-2">
                            <div class="flex items-start space-x-2">
                              <CheckCircle2 v-if="test.status === 'passed'" class="w-4 h-4 text-green-600 mt-0.5" />
                              <XCircle v-else class="w-4 h-4 text-red-600 mt-0.5" />
                              <div>
                                <div class="font-medium text-sm">{{ test.test_name }}</div>
                                <div class="text-xs text-muted-foreground mt-1">{{ test.message }}</div>
                              </div>
                            </div>
                            <Badge variant="outline" class="text-xs">
                              {{ test.points_earned }}/{{ test.points_possible }} pts
                            </Badge>
                          </div>

                          <!-- Test Case Results -->
                          <div v-if="test.test_case_results && test.test_case_results.length > 0" class="mt-3 pl-6 space-y-2">
                            <div
                              v-for="(testCase, tcIdx) in test.test_case_results"
                              :key="tcIdx"
                              class="text-xs p-2 rounded bg-card border"
                              :class="testCase.status === 'passed' ? 'border-green-200 dark:border-green-800' : 'border-destructive/30'"
                            >
                              <div class="flex items-center justify-between mb-1">
                                <span class="font-medium">{{ testCase.description }}</span>
                                <Badge
                                  :variant="testCase.status === 'passed' ? 'default' : 'destructive'"
                                  class="text-xs h-5"
                                >
                                  {{ testCase.status }}
                                </Badge>
                              </div>
                              <div class="space-y-1 text-muted-foreground">
                                <div>Expected: <code class="text-xs bg-muted px-1 rounded">{{ formatValue(testCase.expected_value) }}</code></div>
                                <div>Actual: <code class="text-xs bg-muted px-1 rounded">{{ formatValue(testCase.actual_value) }}</code></div>
                                <div v-if="testCase.message" class="text-xs italic">{{ testCase.message }}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Group Results -->
                    <div v-if="partResult.groupResults && partResult.groupResults.length > 0">
                      <h4 class="font-medium text-sm mb-3 flex items-center space-x-2">
                        <Layers class="w-4 h-4" />
                        <span>Task Groups</span>
                      </h4>
                      <div class="space-y-2">
                        <div
                          v-for="(group, groupIdx) in partResult.groupResults"
                          :key="groupIdx"
                          class="p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div class="flex items-center justify-between mb-2">
                            <div class="font-medium text-sm">{{ group.title }}</div>
                            <Badge variant="outline">
                              {{ group.points_earned }}/{{ group.points_possible }} pts
                            </Badge>
                          </div>
                          <div class="text-xs text-muted-foreground">
                            {{ group.message }} ({{ group.group_type }})
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </ScrollArea>

      <!-- Actions - Fixed at bottom -->
      <div class="border-t border-border p-4 bg-muted/20 flex-shrink-0">
        <div class="flex justify-end space-x-3">
          <Button
            variant="outline"
            @click="handleLeave"
            class="min-w-[120px]"
          >
            <ArrowLeft class="w-4 h-4 mr-2" />
            Leave
          </Button>
          <Button
            @click="handleStartOver"
            class="min-w-[120px]"
          >
            <RotateCcw class="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Award,
  CheckCircle,
  XCircle,
  CheckCircle2,
  Clock,
  Timer,
  FileText,
  TestTube,
  Target,
  Layers,
  ArrowLeft,
  RotateCcw
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ISubmission } from '@/types/submission'
import type { LabPart } from '@/composables/useCourseLabs'

interface Props {
  isOpen: boolean
  courseId: string
  labName: string
  submissions: ISubmission[]
  labParts: LabPart[]
}

interface Emits {
  (e: 'start-over'): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

// Compute part results from submissions
interface PartResult {
  partId: string
  title: string
  attempts: number
  pointsEarned: number
  pointsPossible: number
  isPassed: boolean
  submittedAt: Date
  executionTime: number
  testResults: any[]
  groupResults: any[]
}

const partResults = computed<PartResult[]>(() => {
  const results: PartResult[] = []

  props.labParts.forEach(part => {
    // Get all submissions for this part
    const partSubmissions = props.submissions.filter(s => s.partId === part.partId)

    if (partSubmissions.length === 0) {
      // No submissions for this part
      results.push({
        partId: part.partId,
        title: part.title,
        attempts: 0,
        pointsEarned: 0,
        pointsPossible: part.totalPoints || 0,
        isPassed: false,
        submittedAt: new Date(),
        executionTime: 0,
        testResults: [],
        groupResults: []
      })
      return
    }

    // Get the latest submission (highest attempt number)
    const latestSubmission = partSubmissions.reduce((latest, current) =>
      current.attempt > latest.attempt ? current : latest
    )

    const gradingResult = latestSubmission.gradingResult

    results.push({
      partId: part.partId,
      title: part.title,
      attempts: partSubmissions.length,
      pointsEarned: gradingResult?.total_points_earned || 0,
      pointsPossible: gradingResult?.total_points_possible || part.totalPoints || 0,
      isPassed: gradingResult?.total_points_earned === gradingResult?.total_points_possible,
      submittedAt: latestSubmission.submittedAt,
      executionTime: gradingResult?.total_execution_time || 0,
      testResults: gradingResult?.test_results || [],
      groupResults: gradingResult?.group_results || []
    })
  })

  return results
})

const totalPointsEarned = computed(() =>
  partResults.value.reduce((sum, part) => sum + part.pointsEarned, 0)
)

const totalPointsPossible = computed(() =>
  partResults.value.reduce((sum, part) => sum + part.pointsPossible, 0)
)

const completedParts = computed(() =>
  partResults.value.filter(part => part.isPassed).length
)

const totalAttempts = computed(() =>
  partResults.value.reduce((sum, part) => sum + part.attempts, 0)
)

const successRate = computed(() => {
  if (totalPointsPossible.value === 0) return 0
  return Math.round((totalPointsEarned.value / totalPointsPossible.value) * 100)
})

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const handleLeave = () => {
  emit('close')
  router.push(`/courses/${props.courseId}`)
}

const handleStartOver = () => {
  emit('start-over')
  emit('close')
}
</script>

<style scoped>
/* Fade in animation for dialog */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fixed {
  animation: fadeIn 0.2s ease-out;
}
</style>
