<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center justify-between">
          <div class="flex items-center">
            <Icon name="lucide:clipboard-list" class="w-5 h-5 mr-2" />
            Grading Results
          </div>
          <Badge :variant="getOverallBadgeVariant()" class="text-sm px-3 py-1">
            {{ totalScore }}/{{ maxScore }} points ({{ Math.round((totalScore / maxScore) * 100) }}%)
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Detailed results from automated testing of your network configuration
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto space-y-6">
        <!-- Overall Summary -->
        <Card>
          <CardContent class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <!-- Total Score -->
              <div class="text-center">
                <div class="text-3xl font-bold" :class="getScoreColorClass(totalScore, maxScore)">
                  {{ totalScore }}/{{ maxScore }}
                </div>
                <p class="text-sm text-muted-foreground">Total Score</p>
              </div>
              
              <!-- Pass Rate -->
              <div class="text-center">
                <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                  {{ passedTasks }}/{{ results.length }}
                </div>
                <p class="text-sm text-muted-foreground">Tasks Passed</p>
              </div>
              
              <!-- Grade Percentage -->
              <div class="text-center">
                <div class="text-3xl font-bold" :class="getScoreColorClass(totalScore, maxScore)">
                  {{ Math.round((totalScore / maxScore) * 100) }}%
                </div>
                <p class="text-sm text-muted-foreground">Grade</p>
              </div>
              
              <!-- Grade Letter -->
              <div class="text-center">
                <div class="text-3xl font-bold" :class="getScoreColorClass(totalScore, maxScore)">
                  {{ getLetterGrade(totalScore, maxScore) }}
                </div>
                <p class="text-sm text-muted-foreground">Letter Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Quick Filter -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Label class="text-sm font-medium">Filter:</Label>
            <Select v-model:model-value="filterStatus">
              <SelectTrigger class="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="passed">Passed Only</SelectItem>
                <SelectItem value="failed">Failed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div class="text-sm text-muted-foreground">
            {{ filteredResults.length }} of {{ results.length }} tasks shown
          </div>
        </div>

        <!-- Task Results -->
        <div class="space-y-4">
          <div v-for="(result, index) in filteredResults" :key="result.taskName" class="border rounded-lg overflow-hidden">
            <!-- Task Header -->
            <div class="p-4 bg-muted/25 border-b flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <Badge variant="secondary" class="font-mono text-xs">
                  Task {{ index + 1 }}
                </Badge>
                <h3 class="font-semibold">{{ result.taskName }}</h3>
                <Icon 
                  :name="result.passed ? 'lucide:check-circle' : 'lucide:x-circle'" 
                  :class="result.passed ? 'text-green-500' : 'text-red-500'" 
                  class="w-5 h-5" 
                />
              </div>
              
              <div class="flex items-center space-x-3">
                <!-- Score Badge -->
                <Badge :variant="result.passed ? 'default' : 'destructive'" class="text-sm">
                  {{ result.score }}/{{ result.maxScore }} pts
                </Badge>
                
                <!-- Expand/Collapse Button -->
                <Button
                  @click="toggleTaskExpansion(result.taskName)"
                  variant="ghost"
                  size="sm"
                  class="w-8 h-8 p-0"
                >
                  <Icon 
                    :name="isTaskExpanded(result.taskName) ? 'lucide:chevron-up' : 'lucide:chevron-down'" 
                    class="w-4 h-4" 
                  />
                </Button>
              </div>
            </div>

            <!-- Task Details (Collapsible) -->
            <div v-show="isTaskExpanded(result.taskName)" class="p-4 space-y-4">
              <!-- Main Feedback -->
              <div v-if="result.feedback" class="space-y-2">
                <h4 class="font-medium text-sm flex items-center">
                  <Icon name="lucide:message-circle" class="w-4 h-4 mr-2" />
                  Feedback
                </h4>
                <div class="bg-muted/50 p-3 rounded text-sm">
                  {{ result.feedback }}
                </div>
              </div>

              <!-- Detailed Test Results -->
              <div v-if="result.details && result.details.length > 0" class="space-y-2">
                <h4 class="font-medium text-sm flex items-center">
                  <Icon name="lucide:list-checks" class="w-4 h-4 mr-2" />
                  Test Details
                </h4>
                <div class="space-y-2">
                  <div 
                    v-for="(detail, detailIndex) in result.details" 
                    :key="detailIndex"
                    class="flex items-start space-x-3 p-3 bg-card border rounded"
                  >
                    <Icon 
                      :name="getDetailIcon(detail)" 
                      :class="getDetailIconClass(detail)"
                      class="w-4 h-4 mt-0.5 shrink-0" 
                    />
                    <div class="flex-1 min-w-0">
                      <div class="font-mono text-xs text-muted-foreground">
                        {{ detail }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Raw Output/Logs (if available) -->
              <div v-if="result.rawOutput" class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="font-medium text-sm flex items-center">
                    <Icon name="lucide:terminal" class="w-4 h-4 mr-2" />
                    Raw Output
                  </h4>
                  <Button
                    @click="copyToClipboard(result.rawOutput)"
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                  >
                    <Icon name="lucide:copy" class="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div class="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
                  <pre>{{ result.rawOutput }}</pre>
                </div>
              </div>

              <!-- Suggestions (if available) -->
              <div v-if="result.suggestions && result.suggestions.length > 0" class="space-y-2">
                <h4 class="font-medium text-sm flex items-center">
                  <Icon name="lucide:lightbulb" class="w-4 h-4 mr-2" />
                  Suggestions for Improvement
                </h4>
                <ul class="space-y-1 text-sm">
                  <li 
                    v-for="suggestion in result.suggestions" 
                    :key="suggestion"
                    class="flex items-start space-x-2"
                  >
                    <Icon name="lucide:arrow-right" class="w-3 h-3 mt-1 text-blue-500" />
                    <span>{{ suggestion }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredResults.length === 0 && results.length > 0" 
             class="text-center py-12 text-muted-foreground">
          <Icon name="lucide:filter-x" class="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No tasks match the current filter.</p>
          <Button @click="filterStatus = 'all'" variant="outline" size="sm" class="mt-2">
            Clear Filter
          </Button>
        </div>
      </div>

      <!-- Footer Actions -->
      <DialogFooter class="pt-4 border-t">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center space-x-3">
            <Button @click="downloadResults" variant="outline" size="sm">
              <Icon name="lucide:download" class="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button @click="exportJSON" variant="outline" size="sm">
              <Icon name="lucide:file-json" class="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
          
          <div class="flex items-center space-x-3">
            <Button @click="requestRegrade" variant="outline">
              <Icon name="lucide:refresh-cw" class="w-4 h-4 mr-2" />
              Request Regrade
            </Button>
            <Button @click="isOpen = false">
              Close
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'

// Props
interface TaskResult {
  taskName: string
  passed: boolean
  score: number
  maxScore: number
  feedback: string
  details: string[]
  rawOutput?: string
  suggestions?: string[]
}

interface Props {
  open: boolean
  results: TaskResult[]
  totalScore: number
  maxScore: number
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'request:regrade': []
}>()

// Reactive state
const filterStatus = ref<'all' | 'passed' | 'failed'>('all')
const expandedTasks = ref<Set<string>>(new Set())

// Computed
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const passedTasks = computed(() => {
  return props.results.filter(r => r.passed).length
})

const filteredResults = computed(() => {
  if (filterStatus.value === 'all') return props.results
  if (filterStatus.value === 'passed') return props.results.filter(r => r.passed)
  return props.results.filter(r => !r.passed)
})

// Methods
const getScoreColorClass = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 90) return 'text-green-600 dark:text-green-400'
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

const getOverallBadgeVariant = (): 'default' | 'secondary' | 'destructive' => {
  const percentage = (props.totalScore / props.maxScore) * 100
  if (percentage >= 90) return 'default'
  if (percentage >= 70) return 'secondary'
  return 'destructive'
}

const getLetterGrade = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 97) return 'A+'
  if (percentage >= 93) return 'A'
  if (percentage >= 90) return 'A-'
  if (percentage >= 87) return 'B+'
  if (percentage >= 83) return 'B'
  if (percentage >= 80) return 'B-'
  if (percentage >= 77) return 'C+'
  if (percentage >= 73) return 'C'
  if (percentage >= 70) return 'C-'
  if (percentage >= 67) return 'D+'
  if (percentage >= 63) return 'D'
  if (percentage >= 60) return 'D-'
  return 'F'
}

const toggleTaskExpansion = (taskName: string) => {
  if (expandedTasks.value.has(taskName)) {
    expandedTasks.value.delete(taskName)
  } else {
    expandedTasks.value.add(taskName)
  }
}

const isTaskExpanded = (taskName: string): boolean => {
  return expandedTasks.value.has(taskName)
}

const getDetailIcon = (detail: string): string => {
  if (detail.toLowerCase().includes('success') || detail.toLowerCase().includes('passed')) {
    return 'lucide:check'
  }
  if (detail.toLowerCase().includes('fail') || detail.toLowerCase().includes('error')) {
    return 'lucide:x'
  }
  if (detail.toLowerCase().includes('timeout')) {
    return 'lucide:clock'
  }
  if (detail.toLowerCase().includes('connection')) {
    return 'lucide:network'
  }
  return 'lucide:info'
}

const getDetailIconClass = (detail: string): string => {
  if (detail.toLowerCase().includes('success') || detail.toLowerCase().includes('passed')) {
    return 'text-green-500'
  }
  if (detail.toLowerCase().includes('fail') || detail.toLowerCase().includes('error')) {
    return 'text-red-500'
  }
  if (detail.toLowerCase().includes('timeout')) {
    return 'text-yellow-500'
  }
  return 'text-blue-500'
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Output copied to clipboard')
  } catch (error) {
    toast.error('Failed to copy to clipboard')
  }
}

const downloadResults = () => {
  // Generate PDF report (simplified implementation)
  const reportData = {
    timestamp: new Date().toISOString(),
    totalScore: props.totalScore,
    maxScore: props.maxScore,
    percentage: Math.round((props.totalScore / props.maxScore) * 100),
    letterGrade: getLetterGrade(props.totalScore, props.maxScore),
    results: props.results
  }
  
  // Create downloadable content (would typically use a PDF library)
  const content = JSON.stringify(reportData, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `grading-results-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.success('Results downloaded')
}

const exportJSON = () => {
  const data = {
    exportDate: new Date().toISOString(),
    summary: {
      totalScore: props.totalScore,
      maxScore: props.maxScore,
      percentage: Math.round((props.totalScore / props.maxScore) * 100),
      passedTasks: passedTasks.value,
      totalTasks: props.results.length
    },
    results: props.results
  }
  
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `detailed-results-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.success('Results exported as JSON')
}

const requestRegrade = () => {
  emit('request:regrade')
  toast.info('Regrade request submitted')
}

// Auto-expand failed tasks on open
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Auto-expand failed tasks for immediate attention
    props.results.forEach(result => {
      if (!result.passed) {
        expandedTasks.value.add(result.taskName)
      }
    })
  } else {
    // Clear expanded state when closing
    expandedTasks.value.clear()
  }
})
</script>