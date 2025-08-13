<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import PartSidebar from '@/components/lab/PartSidebar.vue'
import ClientOnlyTextEditor from '@/components/lab/ClientOnlyTextEditor.vue'
import PlaySelectionModal from '@/components/lab/PlaySelectionModal.vue'
import { useExamManagement } from '@/composables/useExamManagement'
import { usePlayBank } from '@/composables/usePlayBank'
import { useVariableResolver } from '@/composables/useVariableResolver'
import { useFormValidation, validationRules } from '@/composables/useFormValidation'
import { useApiErrorHandler } from '@/composables/useApiErrorHandler'
import { useNotifications } from '@/composables/useNotifications'
// Removed loading-states dependency - using inline spinner components
import { Home, BookOpen, Save, X, AlertTriangle, Clock, Users, Settings, Upload, Download, Eye, RefreshCw, FileText } from 'lucide-vue-next'
import type { Play, PlayVariableBinding, ExamFormData, SubnetGenerationConfig, ExamConfiguration, Exam } from '@/types/lab'

// Route and navigation
const route = useRoute()
const router = useRouter()
const courseId = computed(() => route.params.c_id as string)
const examId = computed(() => route.params.e_id as string)

// Exam management
const {
  currentExam,
  isLoading: isExamLoading,
  isGenerating,
  loadExam,
  updateExam,
  validateExamData,
  getDefaultSubnetConfig,
  testSubnetGeneration,
  generateStudentConfigurations,
  exportExamConfigurations
} = useExamManagement(courseId.value)

// Play bank integration
const {
  plays,
  isLoading: isPlaysLoading,
  loadPlays
} = usePlayBank()

// Variable resolver
const { generateExamConfig } = useVariableResolver()

// Form validation
const {
  addField,
  setFieldValue,
  touchField,
  getFieldError,
  hasFieldError,
  isFormValid,
  validateForm,
  submitForm
} = useFormValidation()

// API error handling
const { apiCall, error: apiError, isLoading: isApiLoading } = useApiErrorHandler()

// Notifications
const {
  showSuccess,
  showError,
  showSaveSuccess,
  showSaveError,
  showUploadSuccess,
  showUploadError,
  showNetworkError
} = useNotifications()

// Form state
const examTitle = ref('')
const examDescription = ref('')
const timeLimit = ref<number | undefined>(120)
const parts = ref<Array<{
  id: string
  title: string
  content: string
  playId: string | null
  playVariables?: Record<string, any>
  order: number
}>>([])
const currentPart = ref(0)
const subnetConfig = ref<SubnetGenerationConfig>(getDefaultSubnetConfig())

// Student enrollment
const enrolledStudents = ref<Array<{ studentId: string; name?: string }>>([])
const existingConfigurations = ref<Map<string, ExamConfiguration>>(new Map())
const csvFile = ref<File | null>(null)
const isUploadingCSV = ref(false)

// UI state
const showPlayModal = ref(false)
const showSubnetPreview = ref(false)
const showConfigRegenerationDialog = ref(false)
const showUnsavedDialog = ref(false)
const pendingNavigation = ref<string | null>(null)
const hasUnsavedChanges = ref(false)
const isDataLoaded = ref(false)

// Current part data
const currentPartData = computed(() => {
  return parts.value[currentPart.value] || null
})

const selectedPlay = computed(() => {
  if (!currentPartData.value?.playId) return null
  return plays.value.find(play => play.id === currentPartData.value?.playId) || null
})

// Validation
const canSave = computed(() => {
  const examData: ExamFormData = {
    title: examTitle.value,
    description: examDescription.value,
    parts: parts.value.map(({ id, ...part }) => part),
    timeLimit: timeLimit.value,
    subnetGenerationConfig: subnetConfig.value
  }
  
  const validation = validateExamData(examData)
  return validation.isValid && enrolledStudents.value.length > 0
})

const validationErrors = computed(() => {
  const examData: ExamFormData = {
    title: examTitle.value,
    description: examDescription.value,
    parts: parts.value.map(({ id, ...part }) => part),
    timeLimit: timeLimit.value,
    subnetGenerationConfig: subnetConfig.value
  }
  
  const validation = validateExamData(examData)
  const errors = [...validation.errors]
  
  if (enrolledStudents.value.length === 0) {
    errors.push('At least one student must be enrolled')
  }
  
  return errors
})

const hasConfigurationChanges = computed(() => {
  if (!currentExam.value) return false
  
  // Check if subnet configuration has changed
  const originalConfig = currentExam.value.subnetGenerationConfig
  const currentConfig = subnetConfig.value
  
  return JSON.stringify(originalConfig) !== JSON.stringify(currentConfig) ||
         enrolledStudents.value.length !== currentExam.value.studentConfigurations.size
})

// Part management
const addPart = () => {
  const newPart = {
    id: `part_${Date.now()}`,
    title: '',
    content: '',
    playId: null,
    playVariables: {},
    order: parts.value.length
  }
  parts.value.push(newPart)
  currentPart.value = parts.value.length - 1
  hasUnsavedChanges.value = true
}

const selectPart = (index: number) => {
  currentPart.value = index
}

const updatePartTitle = (title: string) => {
  if (currentPartData.value) {
    currentPartData.value.title = title
    hasUnsavedChanges.value = true
  }
}

const updatePartContent = (content: string) => {
  if (currentPartData.value) {
    currentPartData.value.content = content
    hasUnsavedChanges.value = true
  }
}

const updatePartPlay = (playId: string | null, variables?: Record<string, any>) => {
  if (currentPartData.value) {
    currentPartData.value.playId = playId
    currentPartData.value.playVariables = variables || {}
    hasUnsavedChanges.value = true
  }
}

// Event handlers
const handlePartSelect = (index: number) => {
  selectPart(index)
}

const handleAddPart = () => {
  addPart()
}

const handleTitleUpdate = (title: string) => {
  updatePartTitle(title)
}

const handleContentUpdate = (content: string) => {
  updatePartContent(content)
}

const handleOpenPlayModal = () => {
  showPlayModal.value = true
}

const handlePlaySelect = (play: Play, variables: PlayVariableBinding[]) => {
  const variableBindings = variables.reduce((acc, binding) => {
    acc[binding.variableName] = binding.value
    return acc
  }, {} as Record<string, unknown>)
  
  updatePartPlay(play.id, variableBindings)
  showPlayModal.value = false
  toast.success(`Play "${play.name}" selected for Part ${currentPart.value + 1}`)
}

const handleClearPlay = () => {
  updatePartPlay(null)
  toast.info(`Play cleared from Part ${currentPart.value + 1}`)
}

// CSV Upload handling
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type === 'text/csv') {
    csvFile.value = file
  } else {
    toast.error('Please select a valid CSV file')
  }
}

const uploadStudentCSV = async () => {
  if (!csvFile.value) {
    showError('Please select a CSV file first')
    return
  }

  const result = await apiCall(async () => {
    const text = await csvFile.value!.text()
    const lines = text.split('\n').filter(line => line.trim())
    const students: Array<{ studentId: string; name?: string }> = []

    // Skip header row and process data
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''))
      if (columns.length >= 1 && columns[0]) {
        students.push({
          studentId: columns[0],
          name: columns[1] || undefined
        })
      }
    }

    if (students.length === 0) {
      throw new Error('No valid student records found in CSV')
    }

    return students
  }, {
    showErrorToast: false,
    loadingState: false
  })

  if (result.success && result.data) {
    enrolledStudents.value = result.data
    hasUnsavedChanges.value = true
    showUploadSuccess(`${result.data.length} students enrolled`)
  } else if (result.error) {
    showUploadError(csvFile.value.name, result.error.message)
  }
}

const removeStudent = (index: number) => {
  enrolledStudents.value.splice(index, 1)
  hasUnsavedChanges.value = true
  toast.info('Student removed from enrollment')
}

// Configuration management
const regenerateConfigurations = async () => {
  try {
    const result = await generateStudentConfigurations(examId.value)
    if (result.success) {
      toast.success('Student configurations regenerated successfully')
      // Reload exam data to get updated configurations
      await loadExamData()
    } else {
      toast.error(result.message)
    }
  } catch (error) {
    console.error('Configuration regeneration failed:', error)
    toast.error('Failed to regenerate configurations')
  }
  showConfigRegenerationDialog.value = false
}

const exportConfigurations = async () => {
  try {
    const result = await exportExamConfigurations(examId.value)
    if (result.success && result.data) {
      // Create download link
      const url = window.URL.createObjectURL(result.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `exam-${examId.value}-configurations.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Configurations exported successfully')
    } else {
      toast.error(result.message || 'Failed to export configurations')
    }
  } catch (error) {
    console.error('Export failed:', error)
    toast.error('Failed to export configurations')
  }
}

// Subnet generation preview
const previewSubnetGeneration = () => {
  if (enrolledStudents.value.length === 0) {
    toast.error('Please enroll students first to preview configurations')
    return
  }
  showSubnetPreview.value = true
}

const getPreviewConfigurations = computed(() => {
  return enrolledStudents.value.slice(0, 5).map((student, index) => {
    try {
      return testSubnetGeneration(subnetConfig.value, student.studentId, index + 1)
    } catch (error) {
      console.error('Preview generation failed:', error)
      return null
    }
  }).filter(Boolean) as ExamConfiguration[]
})

// Data loading
const loadExamData = async () => {
  try {
    const exam = await loadExam(examId.value)
    if (exam) {
      // Populate form with exam data
      examTitle.value = exam.title
      examDescription.value = exam.description
      timeLimit.value = exam.timeLimit
      subnetConfig.value = exam.subnetGenerationConfig
      
      // Convert parts to editable format
      parts.value = exam.parts.map((part, index) => ({
        id: part.id || `part_${index}`,
        title: part.title,
        content: part.content,
        playId: part.playId,
        playVariables: part.playVariables || {},
        order: part.order
      }))
      
      // Extract enrolled students from configurations
      const students: Array<{ studentId: string; name?: string }> = []
      exam.studentConfigurations.forEach((config, studentId) => {
        students.push({ studentId })
      })
      enrolledStudents.value = students
      existingConfigurations.value = exam.studentConfigurations
      
      isDataLoaded.value = true
      hasUnsavedChanges.value = false // Reset after loading
    } else {
      toast.error('Exam not found')
      router.push(`/courses/${courseId.value}/exams`)
    }
  } catch (error) {
    console.error('Failed to load exam:', error)
    toast.error('Failed to load exam data')
    router.push(`/courses/${courseId.value}/exams`)
  }
}

// Save and cancel handlers
const handleSave = async () => {
  const success = await submitForm(async () => {
    if (!canSave.value) {
      showError('Please fix validation errors before saving')
      return
    }

    const examData: ExamFormData = {
      title: examTitle.value,
      description: examDescription.value,
      parts: parts.value.map(({ id, ...part }) => part),
      timeLimit: timeLimit.value,
      subnetGenerationConfig: subnetConfig.value
    }

    const result = await apiCall(async () => {
      return await updateExam(examId.value, examData)
    }, {
      retries: 2,
      showErrorToast: false
    })
    
    if (result.success && result.data?.success) {
      hasUnsavedChanges.value = false
      showSaveSuccess('Exam')
      
      // Check if configurations need regeneration
      if (hasConfigurationChanges.value) {
        showConfigRegenerationDialog.value = true
      }
    } else {
      const errorMessage = result.error?.message || result.data?.error?.message || 'Failed to update exam'
      showSaveError('Exam', () => handleSave())
      throw new Error(errorMessage)
    }
  })

  if (!success) {
    showError('Please fix validation errors before saving')
  }
}

const handleCancel = () => {
  if (hasUnsavedChanges.value) {
    pendingNavigation.value = `/courses/${courseId.value}/exams`
    showUnsavedDialog.value = true
  } else {
    router.push(`/courses/${courseId.value}/exams`)
  }
}

const handleConfirmNavigation = () => {
  if (pendingNavigation.value) {
    router.push(pendingNavigation.value)
  }
  showUnsavedDialog.value = false
  pendingNavigation.value = null
}

const handleCancelNavigation = () => {
  showUnsavedDialog.value = false
  pendingNavigation.value = null
}

// Initialize validation fields
const initializeValidation = () => {
  addField('examTitle', examTitle.value, { ...validationRules.required, minLength: 3, maxLength: 100 })
  addField('examDescription', examDescription.value, { maxLength: 500 })
  addField('timeLimit', timeLimit.value, { ...validationRules.positiveNumber, min: 1, max: 480 })
  addField('baseNetwork', subnetConfig.value.baseNetwork, validationRules.subnet)
}

// Initialize
onMounted(async () => {
  await Promise.all([
    loadPlays(),
    loadExamData()
  ])
  initializeValidation()
})

// Navigation guard
onBeforeUnmount(() => {
  if (hasUnsavedChanges.value) {
    console.warn('Leaving page with unsaved changes')
  }
})

// Watch for changes
watch([examTitle, examDescription, timeLimit, subnetConfig], () => {
  if (isDataLoaded.value) {
    hasUnsavedChanges.value = true
  }
}, { deep: true })

// Page title
useHead({
  title: computed(() => `Edit Exam: ${examTitle.value || 'Loading...'} - NetGrader`)
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header with Breadcrumb -->
    <div class="">
      <div class="container mx-auto px-4 py-4">
        <Breadcrumb class="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" class="flex items-center">
                <Home class="w-4 h-4 mr-1" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink :href="`/courses/${courseId}`">
                Course {{ courseId }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink :href="`/courses/${courseId}/exams`">
                Exams
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Exam</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-foreground">
              <Skeleton v-if="!isDataLoaded" class="h-8 w-64" />
              <span v-else>Edit Exam: {{ examTitle }}</span>
            </h1>
            <p class="text-muted-foreground mt-1">
              Modify examination settings and configurations
            </p>
          </div>
          
          <div class="flex items-center space-x-2">
            <Badge v-if="hasUnsavedChanges" variant="secondary">
              Unsaved Changes
            </Badge>
            <Badge v-if="parts.length > 0" variant="outline">
              {{ parts.length }} Part{{ parts.length !== 1 ? 's' : '' }}
            </Badge>
            <Badge v-if="enrolledStudents.length > 0" variant="outline">
              {{ enrolledStudents.length }} Student{{ enrolledStudents.length !== 1 ? 's' : '' }}
            </Badge>
            <Badge v-if="existingConfigurations.size > 0" variant="outline" class="bg-green-50 text-green-700">
              {{ existingConfigurations.size }} Config{{ existingConfigurations.size !== 1 ? 's' : '' }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="!isDataLoaded" class="container mx-auto px-4 py-6">
      <div class="space-y-6">
        <Skeleton class="h-32 w-full" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-24 w-full" />
        </div>
        <Skeleton class="h-64 w-full" />
      </div>
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Exam Configuration -->
      <div class="container mx-auto px-4 py-6">
        <Tabs default-value="basic" class="mb-6">
          <TabsList class="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="students">Student Enrollment</TabsTrigger>
            <TabsTrigger value="subnet">Subnet Configuration</TabsTrigger>
            <TabsTrigger value="configs">Existing Configurations</TabsTrigger>
          </TabsList>       
   
          <!-- Basic Information Tab -->
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center">
                  <BookOpen class="w-5 h-5 mr-2" />
                  Exam Information
                </CardTitle>
                <CardDescription>
                  Configure the basic information and settings for your exam
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="exam-title">Exam Title *</Label>
                    <Input
                      id="exam-title"
                      v-model="examTitle"
                      placeholder="Enter exam title..."
                      :class="{ 
                        'border-destructive focus:border-destructive focus:ring-destructive': hasFieldError('examTitle')
                      }"
                      @input="setFieldValue('examTitle', examTitle)"
                      @blur="touchField('examTitle')"
                    />
                    <div v-if="getFieldError('examTitle')" class="flex items-center space-x-1 text-sm text-destructive">
                      <AlertTriangle class="w-4 h-4" />
                      <span>{{ getFieldError('examTitle') }}</span>
                    </div>
                  </div>
                  
                  <div class="space-y-2">
                    <Label for="time-limit" class="flex items-center space-x-2">
                      <Clock class="w-4 h-4" />
                      <span>Time Limit (minutes)</span>
                    </Label>
                    <Input
                      id="time-limit"
                      v-model.number="timeLimit"
                      type="number"
                      min="1"
                      max="480"
                      placeholder="120"
                      :class="{ 
                        'border-destructive focus:border-destructive focus:ring-destructive': hasFieldError('timeLimit')
                      }"
                      @input="setFieldValue('timeLimit', timeLimit)"
                      @blur="touchField('timeLimit')"
                    />
                    <div v-if="getFieldError('timeLimit')" class="flex items-center space-x-1 text-sm text-destructive">
                      <AlertTriangle class="w-4 h-4" />
                      <span>{{ getFieldError('timeLimit') }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="space-y-2">
                  <Label for="exam-description">Description</Label>
                  <Textarea
                    id="exam-description"
                    v-model="examDescription"
                    placeholder="Describe the purpose and objectives of this exam..."
                    rows="3"
                    :class="{ 
                      'border-destructive focus:border-destructive focus:ring-destructive': hasFieldError('examDescription')
                    }"
                    @input="setFieldValue('examDescription', examDescription)"
                    @blur="touchField('examDescription')"
                  />
                  <div v-if="getFieldError('examDescription')" class="flex items-center space-x-1 text-sm text-destructive">
                    <AlertTriangle class="w-4 h-4" />
                    <span>{{ getFieldError('examDescription') }}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <!-- Student Enrollment Tab -->
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center">
                  <Users class="w-5 h-5 mr-2" />
                  Student Enrollment
                </CardTitle>
                <CardDescription>
                  Manage student enrollment for this exam
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <!-- CSV Upload Section -->
                <div class="border-2 border-dashed border-border rounded-lg p-6">
                  <div class="text-center space-y-4">
                    <Upload class="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <h4 class="font-medium">Update Student List</h4>
                      <p class="text-sm text-muted-foreground">
                        CSV format: student_id, name (optional)
                      </p>
                    </div>
                    
                    <div class="flex items-center justify-center space-x-4">
                      <Input
                        type="file"
                        accept=".csv"
                        class="max-w-xs"
                        @change="handleFileUpload"
                      />
                      <Button
                        :disabled="!csvFile || isUploadingCSV"
                        @click="uploadStudentCSV"
                      >
                        <Upload v-if="!isUploadingCSV" class="w-4 h-4 mr-2" />
                        <div v-else class="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                        {{ isUploadingCSV ? 'Processing...' : 'Upload' }}
                      </Button>
                    </div>
                  </div>
                </div>

                <!-- Enrolled Students List -->
                <div v-if="enrolledStudents.length > 0" class="space-y-4">
                  <div class="flex items-center justify-between">
                    <h4 class="font-medium">Enrolled Students ({{ enrolledStudents.length }})</h4>
                    <div class="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        @click="previewSubnetGeneration"
                      >
                        <Eye class="w-4 h-4 mr-2" />
                        Preview Configurations
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        :disabled="existingConfigurations.size === 0"
                        @click="exportConfigurations"
                      >
                        <Download class="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                  
                  <div class="max-h-64 overflow-y-auto border rounded-lg">
                    <div class="divide-y">
                      <div
                        v-for="(student, index) in enrolledStudents"
                        :key="student.studentId"
                        class="flex items-center justify-between p-3 hover:bg-muted/50"
                      >
                        <div>
                          <div class="font-medium">{{ student.studentId }}</div>
                          <div v-if="student.name" class="text-sm text-muted-foreground">
                            {{ student.name }}
                          </div>
                        </div>
                        <div class="flex items-center space-x-2">
                          <Badge v-if="existingConfigurations.has(student.studentId)" variant="outline" class="bg-green-50 text-green-700">
                            Configured
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            class="text-destructive hover:text-destructive"
                            @click="removeStudent(index)"
                          >
                            <X class="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <!-- Subnet Configuration Tab -->
          <TabsContent value="subnet">
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center">
                  <Settings class="w-5 h-5 mr-2" />
                  Subnet Generation Configuration
                </CardTitle>
                <CardDescription>
                  Configure how network subnets will be generated for each student
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="algorithm">Generation Algorithm</Label>
                    <Select v-model="subnetConfig.algorithm">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Algorithm</SelectItem>
                        <SelectItem value="custom">Custom Algorithm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div class="space-y-2">
                    <Label for="base-network">Base Network</Label>
                    <Input
                      id="base-network"
                      v-model="subnetConfig.baseNetwork"
                      placeholder="10.30.6.0/24"
                      :class="{ 
                        'border-destructive focus:border-destructive focus:ring-destructive': hasFieldError('baseNetwork')
                      }"
                      @input="setFieldValue('baseNetwork', subnetConfig.baseNetwork)"
                      @blur="touchField('baseNetwork')"
                    />
                    <div v-if="getFieldError('baseNetwork')" class="flex items-center space-x-1 text-sm text-destructive">
                      <AlertTriangle class="w-4 h-4" />
                      <span>{{ getFieldError('baseNetwork') }}</span>
                    </div>
                  </div>
                </div>

                <!-- Custom Algorithm Input -->
                <div v-if="subnetConfig.algorithm === 'custom'" class="space-y-2">
                  <Label for="custom-algorithm">Custom Algorithm (JavaScript)</Label>
                  <Textarea
                    id="custom-algorithm"
                    v-model="subnetConfig.customAlgorithm"
                    placeholder="// Custom subnet generation algorithm
function generateConfig(studentId, examNumber) {
  // Your custom logic here
  return {
    vlan1: ...,
    vlan2: ...,
    // etc.
  };
}"
                    rows="8"
                    class="font-mono text-sm"
                  />
                </div>

                <!-- Variable Ranges -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label>Exam Number Range</Label>
                    <div class="flex items-center space-x-2">
                      <Input
                        v-model.number="subnetConfig.variableRanges.examNumber.min"
                        type="number"
                        placeholder="Min"
                        class="flex-1"
                      />
                      <span class="text-muted-foreground">to</span>
                      <Input
                        v-model.number="subnetConfig.variableRanges.examNumber.max"
                        type="number"
                        placeholder="Max"
                        class="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div class="space-y-2">
                    <Label>VLAN Range</Label>
                    <div class="flex items-center space-x-2">
                      <Input
                        v-model.number="subnetConfig.variableRanges.vlanRange.min"
                        type="number"
                        placeholder="Min"
                        class="flex-1"
                      />
                      <span class="text-muted-foreground">to</span>
                      <Input
                        v-model.number="subnetConfig.variableRanges.vlanRange.max"
                        type="number"
                        placeholder="Max"
                        class="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <!-- Existing Configurations Tab -->
          <TabsContent value="configs">
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center">
                  <FileText class="w-5 h-5 mr-2" />
                  Existing Configurations
                </CardTitle>
                <CardDescription>
                  View and manage existing student configurations
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-muted-foreground">
                    {{ existingConfigurations.size }} student{{ existingConfigurations.size !== 1 ? 's' : '' }} configured
                  </div>
                  <div class="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="isGenerating"
                      @click="showConfigRegenerationDialog = true"
                    >
                      <RefreshCw v-if="!isGenerating" class="w-4 h-4 mr-2" />
                      <div v-else class="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                      {{ isGenerating ? 'Regenerating...' : 'Regenerate All' }}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="existingConfigurations.size === 0"
                      @click="exportConfigurations"
                    >
                      <Download class="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                <div v-if="existingConfigurations.size > 0" class="max-h-64 overflow-y-auto border rounded-lg">
                  <div class="divide-y">
                    <div
                      v-for="[studentId, config] in existingConfigurations"
                      :key="studentId"
                      class="p-3 hover:bg-muted/50"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <div class="font-medium">{{ studentId }}</div>
                        <Badge variant="outline" class="bg-green-50 text-green-700">
                          Configured
                        </Badge>
                      </div>
                      <div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>VLAN1: {{ config.vlan1 }}</div>
                        <div>VLAN2: {{ config.vlan2 }}</div>
                        <div>IPv4: {{ config.ipv4Subnet }}</div>
                        <div>IPv6: {{ config.ipv6Subnet }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="text-center py-8 text-muted-foreground">
                  <Settings class="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No configurations generated yet</p>
                  <p class="text-sm">Save the exam to generate student configurations</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <!-- Main Editor Layout -->
      <div class="container mx-auto flex-1 flex px-4">
        <!-- Part Sidebar -->
        <PartSidebar
          :parts="parts"
          :current-part="currentPart"
          :can-add-parts="true"
          :show-status="false"
          :user-role="'lecturer'"
          :sequential-access="false"
          @select-part="handlePartSelect"
          @add-part="handleAddPart"
        />

        <!-- Content Editor -->
        <div class="flex-1 flex flex-col">
          <ClientOnlyTextEditor
            v-if="currentPartData"
            :model-value="currentPartData.content"
            :title="currentPartData.title"
            :selected-play="selectedPlay"
            @update:model-value="handleContentUpdate"
            @update:title="handleTitleUpdate"
            @open-play-modal="handleOpenPlayModal"
            @clear-play="handleClearPlay"
          />
          
          <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
            <div class="text-center">
              <BookOpen class="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No parts available. Click "Add Part" to get started.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="border-t border-border bg-card">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- Validation Errors -->
              <div v-if="validationErrors.length > 0" class="flex items-center space-x-2 text-destructive">
                <AlertTriangle class="w-4 h-4" />
                <span class="text-sm">{{ validationErrors.length }} error{{ validationErrors.length !== 1 ? 's' : '' }}</span>
              </div>
              
              <!-- Success Indicator -->
              <div v-else-if="canSave" class="flex items-center space-x-2 text-green-600">
                <div class="w-2 h-2 bg-green-600 rounded-full"/>
                <span class="text-sm">Ready to save</span>
              </div>

              <!-- Configuration Changes Warning -->
              <div v-if="hasConfigurationChanges" class="flex items-center space-x-2 text-amber-600">
                <AlertTriangle class="w-4 h-4" />
                <span class="text-sm">Configuration changes detected</span>
              </div>
            </div>

            <div class="flex items-center space-x-3">
              <Button
                variant="outline"
                :disabled="isExamLoading"
                @click="handleCancel"
              >
                <X class="w-4 h-4 mr-2" />
                Cancel
              </Button>
              
              <Button
                :disabled="!canSave || isExamLoading"
                @click="handleSave"
              >
                <Save v-if="!isExamLoading" class="w-4 h-4 mr-2" />
                <div v-else class="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                {{ isExamLoading ? 'Saving...' : 'Update Exam' }}
              </Button>
            </div>
          </div>
          
          <!-- Validation Errors List -->
          <div v-if="validationErrors.length > 0" class="mt-3 pt-3 border-t">
            <div class="text-sm text-destructive space-y-1">
              <div v-for="error in validationErrors" :key="error" class="flex items-center space-x-2">
                <div class="w-1 h-1 bg-destructive rounded-full"/>
                <span>{{ error }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>    <!
-- Play Selection Modal -->
    <PlaySelectionModal
      v-model:open="showPlayModal"
      :plays="plays"
      :is-loading="isPlaysLoading"
      @select-play="handlePlaySelect"
    />

    <!-- Subnet Preview Modal -->
    <Dialog v-model:open="showSubnetPreview">
      <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Subnet Configuration Preview</DialogTitle>
          <DialogDescription>
            Preview of how network configurations will be generated for students
          </DialogDescription>
        </DialogHeader>
        
        <div class="max-h-[60vh] overflow-y-auto">
          <div v-if="getPreviewConfigurations.length > 0" class="space-y-4">
            <div
              v-for="(config, index) in getPreviewConfigurations"
              :key="config.studentId"
              class="border rounded-lg p-4"
            >
              <h4 class="font-medium mb-2">Student: {{ config.studentId }}</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-muted-foreground">VLAN 1:</span>
                  <span class="ml-2 font-mono">{{ config.vlan1 }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">VLAN 2:</span>
                  <span class="ml-2 font-mono">{{ config.vlan2 }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">IPv4 Subnet:</span>
                  <span class="ml-2 font-mono">{{ config.ipv4Subnet }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">IPv6 Subnet:</span>
                  <span class="ml-2 font-mono">{{ config.ipv6Subnet }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Out Interface IPv4:</span>
                  <span class="ml-2 font-mono">{{ config.outInterfaceIpv4 }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Out Interface IPv6:</span>
                  <span class="ml-2 font-mono">{{ config.outInterfaceIpv6 }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-muted-foreground">
            <Settings class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No configurations to preview</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showSubnetPreview = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Configuration Regeneration Dialog -->
    <AlertDialog v-model:open="showConfigRegenerationDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate Student Configurations</AlertDialogTitle>
          <AlertDialogDescription>
            This will regenerate all student network configurations based on the current settings. 
            Existing configurations will be replaced. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction :disabled="isGenerating" @click="regenerateConfigurations">
            {{ isGenerating ? 'Regenerating...' : 'Regenerate Configurations' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Unsaved Changes Dialog -->
    <AlertDialog v-model:open="showUnsavedDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost if you leave this page. 
            Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="handleCancelNavigation">
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleConfirmNavigation">
            Leave Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>