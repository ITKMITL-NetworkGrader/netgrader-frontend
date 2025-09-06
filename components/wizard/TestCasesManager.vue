<template>
  <div class="space-y-4">
    <!-- Test Cases Header -->
    <div class="flex items-center justify-between">
      <Label class="text-sm font-medium">
        Test Cases <span class="text-destructive">*</span>
        <span class="text-muted-foreground font-normal">(Minimum 1 required)</span>
      </Label>
      <div class="flex items-center space-x-2">
        <Button
          v-if="template && template.defaultTestCases.length > 0"
          @click="autoGenerateTestCases"
          variant="ghost"
          size="sm"
        >
          <Wand2 class="w-4 h-4 mr-1" />
          Auto-generate
        </Button>
        <Button @click="addTestCase" variant="outline" size="sm">
          <Plus class="w-4 h-4 mr-1" />
          Add Test Case
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="localTestCases.length === 0" class="text-center p-4 border-2 border-dashed border-muted-foreground/25 rounded">
      <TestTube class="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
      <p class="text-sm text-muted-foreground mb-3">No test cases configured</p>
      <div class="flex items-center justify-center space-x-2">
        <Button @click="addTestCase" variant="outline" size="sm">
          <Plus class="w-4 h-4 mr-1" />
          Add Test Case
        </Button>
        <Button
          v-if="template && template.defaultTestCases.length > 0"
          @click="autoGenerateTestCases"
          variant="ghost"
          size="sm"
        >
          <Wand2 class="w-4 h-4 mr-1" />
          Auto-generate
        </Button>
      </div>
    </div>

    <!-- Test Cases List -->
    <div v-else class="space-y-3">
      <TransitionGroup name="test-case" tag="div" class="space-y-3">
        <Card
          v-for="(testCase, index) in localTestCases"
          :key="`test-case-${index}`"
          class="bg-muted/20"
        >
          <CardContent class="p-4">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center space-x-2">
                <TestTube class="w-4 h-4 text-orange-600" />
                <span class="font-medium text-sm">Test Case {{ index + 1 }}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="removeTestCase(index)"
                class="text-destructive hover:text-destructive"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Test Case Name -->
              <div class="space-y-2">
                <Label class="text-xs font-medium">
                  Name <span class="text-destructive">*</span>
                </Label>
                <Input
                  v-model="testCase.name"
                  placeholder="Hostname Verification"
                  size="sm"
                  :class="{
                    'border-destructive': hasTestCaseError(index, 'name'),
                    'border-green-500': !hasTestCaseError(index, 'name') && testCase.name.length > 0
                  }"
                  @input="validateTestCase(index, 'name')"
                />
                <p v-if="hasTestCaseError(index, 'name')" class="text-xs text-destructive">
                  {{ getTestCaseError(index, 'name') }}
                </p>
              </div>

              <!-- Points -->
              <div class="space-y-2">
                <Label class="text-xs font-medium">
                  Points <span class="text-destructive">*</span>
                </Label>
                <Input
                  v-model.number="testCase.points"
                  type="number"
                  min="0"
                  placeholder="5"
                  size="sm"
                  :class="{
                    'border-destructive': hasTestCaseError(index, 'points'),
                    'border-green-500': !hasTestCaseError(index, 'points') && testCase.points > 0
                  }"
                  @input="validateTestCase(index, 'points')"
                />
                <p v-if="hasTestCaseError(index, 'points')" class="text-xs text-destructive">
                  {{ getTestCaseError(index, 'points') }}
                </p>
              </div>

              <!-- Weight -->
              <div class="space-y-2">
                <Label class="text-xs font-medium">
                  Weight <span class="text-destructive">*</span>
                </Label>
                <Input
                  v-model.number="testCase.weight"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="1.0"
                  size="sm"
                  :class="{
                    'border-destructive': hasTestCaseError(index, 'weight'),
                    'border-green-500': !hasTestCaseError(index, 'weight') && testCase.weight > 0
                  }"
                  @input="validateTestCase(index, 'weight')"
                />
                <p v-if="hasTestCaseError(index, 'weight')" class="text-xs text-destructive">
                  {{ getTestCaseError(index, 'weight') }}
                </p>
              </div>

              <!-- Timeout -->
              <div class="space-y-2">
                <Label class="text-xs font-medium">
                  Timeout (seconds) <span class="text-destructive">*</span>
                </Label>
                <Input
                  v-model.number="testCase.timeoutSeconds"
                  type="number"
                  min="1"
                  max="300"
                  placeholder="30"
                  size="sm"
                  :class="{
                    'border-destructive': hasTestCaseError(index, 'timeoutSeconds'),
                    'border-green-500': !hasTestCaseError(index, 'timeoutSeconds') && testCase.timeoutSeconds > 0
                  }"
                  @input="validateTestCase(index, 'timeoutSeconds')"
                />
                <p v-if="hasTestCaseError(index, 'timeoutSeconds')" class="text-xs text-destructive">
                  {{ getTestCaseError(index, 'timeoutSeconds') }}
                </p>
              </div>
            </div>

            <!-- Test Condition -->
            <div class="mt-4 space-y-2">
              <Label class="text-xs font-medium">
                Test Condition <span class="text-destructive">*</span>
              </Label>
              <Textarea
                v-model="testCase.condition"
                placeholder="show running-config | grep hostname"
                rows="2"
                class="font-mono text-sm"
                :class="{
                  'border-destructive': hasTestCaseError(index, 'condition'),
                  'border-green-500': !hasTestCaseError(index, 'condition') && testCase.condition.length > 0
                }"
                @input="validateTestCase(index, 'condition')"
              />
              <p v-if="hasTestCaseError(index, 'condition')" class="text-xs text-destructive">
                {{ getTestCaseError(index, 'condition') }}
              </p>
              <div class="flex items-center space-x-2 text-xs text-muted-foreground">
                <Info class="w-3 h-3" />
                <span>Command or condition to test the task completion</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TransitionGroup>
    </div>

    <!-- Summary -->
    <div v-if="localTestCases.length > 0" class="flex justify-between items-center text-sm">
      <div class="text-muted-foreground">
        {{ localTestCases.length }} test case{{ localTestCases.length !== 1 ? 's' : '' }}
      </div>
      <div class="flex items-center space-x-4">
        <div class="text-muted-foreground">
          Total Points: <span class="font-medium">{{ totalPoints }}</span>
        </div>
        <div class="text-muted-foreground">
          Total Weight: <span class="font-medium">{{ totalWeight.toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <!-- Validation Warning -->
    <div v-if="totalWeight !== localTestCases.length && localTestCases.length > 0" class="mt-2">
      <Alert variant="default">
        <Info class="h-4 w-4" />
        <AlertDescription>
          Consider balancing test case weights. Total weight is {{ totalWeight.toFixed(1) }}, 
          but you have {{ localTestCases.length }} test cases.
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import {
  TestTube,
  Plus,
  X,
  Wand2,
  Info
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Types
import type { TestCase, TaskTemplate } from '@/types/wizard'

// Props
interface Props {
  modelValue: TestCase[]
  template?: TaskTemplate
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: TestCase[]): void
  (e: 'validate', errors: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localTestCases = ref<TestCase[]>([])
const testCaseErrors = ref<Record<string, Record<string, string>>>({})
const isUpdatingFromProps = ref(false)

// Computed
const totalPoints = computed(() => {
  return localTestCases.value.reduce((sum, testCase) => sum + (testCase.points || 0), 0)
})

const totalWeight = computed(() => {
  return localTestCases.value.reduce((sum, testCase) => sum + (testCase.weight || 0), 0)
})

// Methods
const addTestCase = () => {
  const newTestCase: TestCase = {
    name: '',
    condition: '',
    points: 5,
    weight: 1.0,
    timeoutSeconds: 30
  }
  localTestCases.value.push(newTestCase)
  validateAllTestCases()
}

const removeTestCase = (index: number) => {
  localTestCases.value.splice(index, 1)
  delete testCaseErrors.value[index]
  validateAllTestCases()
}

const autoGenerateTestCases = () => {
  if (!props.template?.defaultTestCases) return

  localTestCases.value = props.template.defaultTestCases.map((defaultCase, index) => ({
    name: `Test Case ${index + 1}`,
    condition: defaultCase.expected_result,
    points: 5,
    weight: 1.0,
    timeoutSeconds: 30
  }))

  validateAllTestCases()
}

const hasTestCaseError = (index: number, field: string): boolean => {
  return !!(testCaseErrors.value[index]?.[field])
}

const getTestCaseError = (index: number, field: string): string => {
  return testCaseErrors.value[index]?.[field] || ''
}

const validateTestCase = (index: number, field: string) => {
  if (!testCaseErrors.value[index]) {
    testCaseErrors.value[index] = {}
  }

  const testCase = localTestCases.value[index]

  switch (field) {
    case 'name':
      if (!testCase.name.trim()) {
        testCaseErrors.value[index].name = 'Test case name is required'
      } else {
        delete testCaseErrors.value[index].name
      }
      break

    case 'condition':
      if (!testCase.condition.trim()) {
        testCaseErrors.value[index].condition = 'Test condition is required'
      } else {
        delete testCaseErrors.value[index].condition
      }
      break

    case 'points':
      if (!testCase.points || testCase.points <= 0) {
        testCaseErrors.value[index].points = 'Points must be greater than 0'
      } else {
        delete testCaseErrors.value[index].points
      }
      break

    case 'weight':
      if (!testCase.weight || testCase.weight <= 0 || testCase.weight > 1) {
        testCaseErrors.value[index].weight = 'Weight must be between 0 and 1'
      } else {
        delete testCaseErrors.value[index].weight
      }
      break

    case 'timeoutSeconds':
      if (!testCase.timeoutSeconds || testCase.timeoutSeconds <= 0) {
        testCaseErrors.value[index].timeoutSeconds = 'Timeout must be greater than 0'
      } else if (testCase.timeoutSeconds > 300) {
        testCaseErrors.value[index].timeoutSeconds = 'Timeout cannot exceed 300 seconds'
      } else {
        delete testCaseErrors.value[index].timeoutSeconds
      }
      break
  }

  validateAllTestCases()
}

const validateAllTestCases = () => {
  // Validate all test cases
  localTestCases.value.forEach((testCase, index) => {
    validateTestCase(index, 'name')
    validateTestCase(index, 'condition')
    validateTestCase(index, 'points')
    validateTestCase(index, 'weight')
    validateTestCase(index, 'timeoutSeconds')
  })

  const errors: string[] = []

  if (localTestCases.value.length === 0) {
    errors.push('At least one test case is required')
  }

  // Collect test case errors
  Object.values(testCaseErrors.value).forEach(testCaseErrors => {
    errors.push(...Object.values(testCaseErrors))
  })

  emit('validate', errors)
}

// Watchers
watch(
  localTestCases,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', newValue)
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    isUpdatingFromProps.value = true
    localTestCases.value = [...newValue]
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  localTestCases.value = [...props.modelValue]
  validateAllTestCases()
})
</script>

<style scoped>
/* Test case transition animations */
.test-case-enter-active,
.test-case-leave-active {
  transition: all 0.2s ease;
}

.test-case-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.test-case-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>