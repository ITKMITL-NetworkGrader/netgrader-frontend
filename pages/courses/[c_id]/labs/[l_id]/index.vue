<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-vue-next'
import PartSidebar from '@/components/lab/PartSidebar.vue'
import TextEditor from '@/components/lab/TextEditor.vue'
import GradingStatus from '@/components/lab/GradingStatus.vue'
import { useLabManagement } from '@/composables/useLabManagement'
import { useGradingStatus } from '@/composables/useGradingStatus'
import { useVariableResolver } from '@/composables/useVariableResolver'
import type { Lab, LabPart } from '@/types/lab'

const route = useRoute()
const router = useRouter()

const courseId = computed(() => route.params.c_id as string)
const labId = computed(() => route.params.l_id as string)

// Lab management
const { loadLab, isLoading: isLoadingLab } = useLabManagement()
const lab = ref<Lab | null>(null)
const parts = ref<LabPart[]>([])
const currentPart = ref(0)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Variable resolution
const { resolveVariables } = useVariableResolver()
const studentGroupNumber = ref<number | undefined>(undefined)
const resolvedContent = ref('')

// Grading status for current part
const currentPartId = computed(() => {
  return parts.value[currentPart.value]?.id || ''
})

const {
  status: gradingStatus,
  gradingProgress,
  taskResults,
  totalScore,
  maxScore,
  submitForGrading,
  isSubmitting
} = useGradingStatus(courseId.value, labId.value, currentPartId.value)

// Load lab data
const loadLabData = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const labData = await loadLab(courseId.value, labId.value)
    if (labData) {
      lab.value = labData
      parts.value = labData.parts.map(part => ({
        ...part,
        status: 'not_submitted' // Will be updated by individual grading status
      }))
      
      // Load student's group information if lab requires groups
      if (labData.groupsRequired) {
        await loadStudentGroup()
      }
      
      // Resolve variables for current part
      updateResolvedContent()
    } else {
      error.value = 'Lab not found'
    }
  } catch (err) {
    console.error('Failed to load lab:', err)
    error.value = 'Failed to load lab data'
  } finally {
    isLoading.value = false
  }
}

// Load student's group assignment
const loadStudentGroup = async () => {
  try {
    const config = useRuntimeConfig()
    const baseURL = `${config.public.backend1url}/v0/api`
    
    const response = await $fetch(`${baseURL}/courses/${courseId.value}/students/me/group`)
    if (response.success && response.data) {
      studentGroupNumber.value = response.data.groupNumber
    }
  } catch (err) {
    console.log('No group assignment found for student')
  }
}

// Update resolved content when part changes
const updateResolvedContent = () => {
  const currentPartData = parts.value[currentPart.value]
  if (!currentPartData) {
    resolvedContent.value = ''
    return
  }
  
  let content = currentPartData.content
  
  // Resolve variables if lab requires groups and student has group
  if (lab.value?.groupsRequired && studentGroupNumber.value !== undefined) {
    content = resolveVariables(
      content,
      currentPartData.playVariables || {},
      undefined,
      studentGroupNumber.value
    )
  }
  
  resolvedContent.value = content
}

// Handle part selection
const selectPart = (index: number) => {
  // Check if part is accessible (sequential access control)
  if (!isPartAccessible(index)) {
    return
  }
  
  currentPart.value = index
  updateResolvedContent()
}

// Check if a part is accessible based on completion status
const isPartAccessible = (index: number): boolean => {
  // First part is always accessible
  if (index === 0) return true
  
  // Check if all previous parts are completed
  for (let i = 0; i < index; i++) {
    const part = parts.value[i]
    if (!part.status || part.status !== 'graded') {
      return false
    }
  }
  
  return true
}

// Handle grading submission
const handleSubmitGrading = async () => {
  const success = await submitForGrading()
  if (success) {
    // Update part status
    const currentPartData = parts.value[currentPart.value]
    if (currentPartData) {
      currentPartData.status = 'grading'
    }
  }
}

// Handle grading completion (called when status changes to 'graded')
const handleGradingComplete = () => {
  const currentPartData = parts.value[currentPart.value]
  if (currentPartData && gradingStatus.value === 'graded') {
    currentPartData.status = 'graded'
    
    // Auto-advance to next part if available and accessible
    const nextPartIndex = currentPart.value + 1
    if (nextPartIndex < parts.value.length && isPartAccessible(nextPartIndex)) {
      // Optional: Auto-advance or let student manually navigate
      // currentPart.value = nextPartIndex
      // updateResolvedContent()
    }
  }
}

// Watch for grading status changes
watch(gradingStatus, (newStatus) => {
  if (newStatus === 'graded') {
    handleGradingComplete()
  }
})

// Computed properties
const currentPartData = computed(() => parts.value[currentPart.value])
const canSubmitGrading = computed(() => {
  return currentPartData.value?.playId && gradingStatus.value === 'not_submitted'
})

const progressStats = computed(() => {
  const completed = parts.value.filter(part => part.status === 'graded').length
  const total = parts.value.length
  return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 }
})

// Initialize
onMounted(() => {
  loadLabData()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex h-screen">
      <div class="w-64 border-r border-border p-4">
        <Skeleton class="h-6 w-24 mb-4" />
        <div class="space-y-2">
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-12 w-full" />
        </div>
      </div>
      <div class="flex-1 p-4">
        <Skeleton class="h-8 w-48 mb-4" />
        <Skeleton class="h-64 w-full" />
      </div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="p-8">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
    </div>
    
    <!-- Main Lab Interface -->
    <div v-else-if="lab" class="flex h-screen">
      <!-- Part Sidebar -->
      <PartSidebar
        :parts="parts"
        :current-part="currentPart"
        :can-add-parts="false"
        :show-status="true"
        :show-progress="true"
        :user-role="'student'"
        :sequential-access="true"
        @select-part="selectPart"
      />
      
      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col">
        <!-- Lab Header -->
        <div class="border-b border-border p-6 bg-card">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold">{{ lab.title }}</h1>
              <p v-if="lab.description" class="text-muted-foreground mt-1">
                {{ lab.description }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-muted-foreground">Progress</div>
              <div class="text-lg font-semibold">
                {{ progressStats.completed }}/{{ progressStats.total }} parts
              </div>
            </div>
          </div>
        </div>
        
        <!-- Part Content -->
        <div class="flex-1 flex flex-col">
          <TextEditor
            v-if="currentPartData"
            :model-value="resolvedContent"
            :title="currentPartData.title"
            :readonly="true"
          />
          
          <!-- No Part Selected -->
          <div v-else class="flex-1 flex items-center justify-center">
            <div class="text-center text-muted-foreground">
              <p>Select a part from the sidebar to begin</p>
            </div>
          </div>
        </div>
        
        <!-- Grading Status Section -->
        <div v-if="currentPartData">
          <GradingStatus
            :course-id="courseId"
            :lab-id="labId"
            :part-id="currentPartId"
            :status="gradingStatus"
            :grading-progress="gradingProgress"
            :task-results="taskResults"
            :total-score="totalScore"
            :max-score="maxScore"
            :can-submit="canSubmitGrading"
            :allow-resubmission="false"
            @submit-grading="handleSubmitGrading"
          />
        </div>
      </div>
    </div>
  </div>
</template>