<template>
  <div class="space-y-4">
    <!-- Test Cases Header -->
    <div class="flex items-center justify-between">
      <Label class="text-sm font-medium">
        Test Cases
        <span v-if="enforceRequirement" class="text-destructive">*</span>
        <span v-else class="text-muted-foreground font-normal">(Optional)</span>
      </Label>
      <div v-if="isReadOnly" class="text-xs text-muted-foreground">
        Default test cases provided by template
      </div>
      <div v-else class="flex items-center space-x-2">
        <Button variant="outline" size="sm" @click="addTestCase">
          <Plus class="w-4 h-4 mr-1" />
          Add Test Case
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="localTestCases.length === 0" class="text-center p-4 border-2 border-dashed border-muted-foreground/25 rounded">
      <TestTube class="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
      <p class="text-sm text-muted-foreground mb-3">
        <template v-if="enforceRequirement">
          No test cases configured
        </template>
        <template v-else>
          Test cases are optional for this template
        </template>
      </p>
      <div v-if="!isReadOnly" class="flex items-center justify-center space-x-2">
        <Button variant="outline" size="sm" @click="addTestCase">
          <Plus class="w-4 h-4 mr-1" />
          Add Test Case
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
                <span class="font-medium text-sm">{{ getTestCaseDisplayName(testCase, index) }}</span>
              </div>
              <Button
                v-if="!isReadOnly"
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="removeTestCase(index)"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Comparison Type -->
              <div class="space-y-2">
                <Label class="text-xs font-medium">
                  Comparison Type <span class="text-destructive">*</span>
                </Label>
                <Select 
                  v-model="testCase.comparison_type"
                  :disabled="isReadOnly"
                  @update:model-value="() => {
                    validateTestCase(index, 'comparison_type')
                    // Also validate expected_result since its rules depend on comparison_type
                    validateTestCase(index, 'expected_result')
                    // Trigger global validation to update the error list at bottom
                    nextTick(() => {
                      validateAllTestCases()
                    })
                  }"
                >
                  <SelectTrigger
                    :disabled="isReadOnly"
                    :class="{
                      'border-destructive': hasTestCaseError(index, 'comparison_type'),
                      'border-green-500': !hasTestCaseError(index, 'comparison_type') && testCase.comparison_type
                    }"
                  >
                    <SelectValue placeholder="Select comparison type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="regex">Regex Match</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="ssh_success">SSH Success</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="hasTestCaseError(index, 'comparison_type')" class="text-xs text-destructive">
                  {{ getTestCaseError(index, 'comparison_type') }}
                </p>
                <div class="text-xs text-muted-foreground">
                  {{ getComparisonTypeHelp(testCase.comparison_type) }}
                </div>
              </div>

              <!-- Expected Result -->
              <div class="space-y-2">
                <Label class="text-xs font-medium">
                  Expected Result <span v-if="testCase.comparison_type !== 'success'" class="text-destructive">*</span>
                  <span v-if="testCase.comparison_type === 'success'" class="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  v-model="testCase.expected_result"
                  :readonly="isReadOnly"
                  :disabled="isReadOnly"
                  :placeholder="getPlaceholderText(testCase.comparison_type)"
                  :class="{
                    'border-destructive': hasTestCaseError(index, 'expected_result'),
                    'border-green-500': !hasTestCaseError(index, 'expected_result') && (testCase.expected_result || testCase.comparison_type === 'success')
                  }"
                  @input="validateTestCase(index, 'expected_result')"
                />
                <p v-if="hasTestCaseError(index, 'expected_result')" class="text-xs text-destructive">
                  {{ getTestCaseError(index, 'expected_result') }}
                </p>
                <div class="text-xs text-muted-foreground">
                  {{ getExpectedResultHelp(testCase.comparison_type) }}
                </div>
              </div>
            </div>

            <!-- Test Case Preview -->
            <div v-if="testCase.comparison_type && (testCase.expected_result || testCase.comparison_type === 'success')" class="mt-4 p-3 bg-muted/50 rounded-md">
              <div class="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                <Info class="w-3 h-3" />
                <span>Test Case Preview:</span>
              </div>
              <div class="text-sm font-mono text-foreground">
                {{ getTestCasePreview(testCase) }}
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
      <div class="text-muted-foreground">
        Points are managed at task level
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import {
  TestTube,
  Plus,
  X,
  Info
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Types
import type { TestCase, TaskTemplate } from '@/types/wizard'

// Props
interface Props {
  modelValue: TestCase[]
  template?: TaskTemplate
  readOnly?: boolean
  testCasesRequired?: boolean
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: TestCase[]): void
  (e: 'validate', errors: string[]): void
}

const props = defineProps<Props>()
const isReadOnly = computed(() => props.readOnly ?? false)
const enforceRequirement = computed(() => props.testCasesRequired ?? true)
const emit = defineEmits<Emits>()

// Local state
const localTestCases = ref<TestCase[]>([])
const testCaseErrors = ref<Record<string, Record<string, string>>>({})
const isUpdatingFromProps = ref(false)

const ensureTestCaseErrorBucket = (index: number): Record<string, string> => {
  if (!testCaseErrors.value[index]) {
    testCaseErrors.value[index] = {}
  }
  return testCaseErrors.value[index]
}

const clearTestCaseError = (index: number, key: string) => {
  if (!testCaseErrors.value[index]) {
    return
  }
  const { [key]: _removed, ...remaining } = testCaseErrors.value[index]
  testCaseErrors.value[index] = remaining
}

// Methods
const addTestCase = () => {
  if (isReadOnly.value) return

  const newTestCase: TestCase = {
    comparison_type: '',
    expected_result: ''
  }
  localTestCases.value.push(newTestCase)
  nextTick(() => {
    validateAllTestCases()
  })
}

const removeTestCase = (index: number) => {
  if (isReadOnly.value) return

  localTestCases.value.splice(index, 1)
  const { [String(index)]: _removed, ...remainingErrors } = testCaseErrors.value
  testCaseErrors.value = remainingErrors
  nextTick(() => {
    validateAllTestCases()
  })
}

const hasTestCaseError = (index: number, field: string): boolean => {
  return !!(testCaseErrors.value[index]?.[field])
}

const getTestCaseError = (index: number, field: string): string => {
  return testCaseErrors.value[index]?.[field] || ''
}

const validateTestCase = (index: number, field: string) => {
  const testCase = localTestCases.value[index]
  if (!testCase) {
    return
  }

  switch (field) {
    case 'comparison_type': {
      const validTypes = ['equals', 'contains', 'regex', 'success', 'ssh_success', 'greater_than']
      if (!testCase.comparison_type || !validTypes.includes(testCase.comparison_type)) {
        ensureTestCaseErrorBucket(index).comparison_type = 'Valid comparison type is required'
      } else {
        clearTestCaseError(index, 'comparison_type')
      }
      break
    }

    case 'expected_result': {
      const expectedResult = String(testCase.expected_result ?? '').trim()
      const comparisonType = testCase.comparison_type
      
      if (comparisonType === 'success') {
        clearTestCaseError(index, 'expected_result')
      } else if (!expectedResult) {
        ensureTestCaseErrorBucket(index).expected_result = 'Expected result is required'
      } else {
        clearTestCaseError(index, 'expected_result')
      }
      break
    }
  }
}

const validateAllTestCases = () => {
  // Clear previous errors
  testCaseErrors.value = {}
  
  // Validate all test cases
  localTestCases.value.forEach((testCase, index) => {
    validateTestCase(index, 'comparison_type')
    validateTestCase(index, 'expected_result')
  })

  const errors: string[] = []

  if (enforceRequirement.value && localTestCases.value.length === 0) {
    errors.push('At least one test case is required')
  }

  // Collect test case errors
  Object.values(testCaseErrors.value).forEach(testCaseErrors => {
    errors.push(...Object.values(testCaseErrors))
  })

  emit('validate', errors)
}

// Helper functions for UI display
const getPlaceholderText = (comparisonType: string): string => {
  if (comparisonType === 'success') {
    return 'Leave empty or enter "true" for success check...'
  }
  return 'Enter expected value or result...'
}

const getTestCaseDisplayName = (testCase: TestCase, index: number): string => {
  if (testCase.comparison_type && testCase.expected_result) {
    return `${testCase.comparison_type.charAt(0).toUpperCase() + testCase.comparison_type.slice(1)} Test`
  }
  return `Test Case ${index + 1}`
}

const getComparisonTypeHelp = (type: string): string => {
  const helpText: Record<string, string> = {
    'equals': 'Exact match comparison',
    'contains': 'Check if result contains this text',
    'regex': 'Regular expression pattern match',
    'success': 'Command execution success (no errors)',
    'ssh_success': 'SSH connection successful',
    'greater_than': 'Numeric value greater than expected'
  }
  return helpText[type] || 'Select a comparison type for help'
}

const getExpectedResultHelp = (type: string): string => {
  const helpText: Record<string, string> = {
    'equals': 'Exact text that should be returned',
    'contains': 'Text that should be found in the output',
    'regex': 'Regular expression pattern to match',
    'success': 'Leave empty or use "true" for success check',
    'ssh_success': 'Target IP or hostname for SSH test',
    'greater_than': 'Numeric threshold value'
  }
  return helpText[type] || 'Enter the expected result for this test'
}

const getTestCasePreview = (testCase: TestCase): string => {
  const { comparison_type, expected_result } = testCase
  
  switch (comparison_type) {
    case 'equals':
      return `Output must equal: "${expected_result}"`
    case 'contains':
      return `Output must contain: "${expected_result}"`
    case 'regex':
      return `Output must match pattern: /${expected_result}/`
    case 'success':
      return 'Command must execute successfully'
    case 'ssh_success':
      return `SSH connection to ${expected_result} must succeed`
    case 'greater_than':
      return `Result must be greater than: ${expected_result}`
    default:
      return `${comparison_type}: ${expected_result}`
  }
}

// Watchers
watch(
  localTestCases,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', [...newValue])
    }
  },
  { deep: true, flush: 'post' }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) return
    isUpdatingFromProps.value = true
    localTestCases.value = [...(newValue || [])]
    nextTick(() => {
      isUpdatingFromProps.value = false
      validateAllTestCases()
    })
  },
  { deep: true, immediate: false }
)

watch(
  () => props.testCasesRequired,
  () => {
    nextTick(() => {
      validateAllTestCases()
    })
  }
)

// Lifecycle
onMounted(() => {
  localTestCases.value = [...(props.modelValue || [])]
  // Use nextTick to ensure reactive updates are complete before validation
  nextTick(() => {
    validateAllTestCases()
  })
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
