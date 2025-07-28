<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PartSidebar from '@/components/lab/PartSidebar.vue'
import ClientOnlyTextEditor from '@/components/lab/ClientOnlyTextEditor.vue'
import PlaySelectionModal from '@/components/lab/PlaySelectionModal.vue'
import { useExamManagement } from '@/composables/useExamManagement'
import { usePlayBank } from '@/composables/usePlayBank'
import { useVariableResolver } from '@/composables/useVariableResolver'
import { Home, BookOpen, Plus, Save, X, AlertTriangle, Clock, Users, Settings, Upload, Download, Eye } from 'lucide-vue-next'
import type { Play, PlayVariableBinding, ExamFormData, SubnetGenerationConfig, ExamConfiguration } from '@/types/lab'

// Route and navigation
const route = useRoute()
const router = useRouter()
const courseId = computed(() => route.params.c_id as string)

// Exam management
const {
  isLoading: isExamLoading,
  createExam,
  validateExamData,
  getDefaultSubnetConfig,
  testSubnetGeneration
} = useExamManagement(courseId.value)

// Play bank integration
const {
  plays,
  isLoading: isPlaysLoading,
  loadPlays
} = usePlayBank()

// Variable resolver
const { generateExamConfig } = useVariableResolver()

// Form state
const examTitle = ref('')
const examDescription = ref('')
const timeLimit = ref<number | undefined>(120) // Default 2 hours
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
const csvFile = ref<File | null>(null)
const isUploadingCSV = ref(false)

// UI state
const showPlayModal = ref(false)
const showSubnetPreview = ref(false)
const showUnsavedDialog = ref(false)
const pendingNavigation = ref<string | null>(null)
const hasUnsavedChanges = ref(false)

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
  }, {} as Record<string, any>)
  
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
    toast.error('Please select a CSV file first')
    return
  }

  isUploadingCSV.value = true
  try {
    const text = await csvFile.value.text()
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
      toast.error('No valid student records found in CSV')
      return
    }

    enrolledStudents.value = students
    hasUnsavedChanges.value = true
    toast.success(`${students.length} students enrolled successfully`)
  } catch (error) {
    console.error('CSV upload failed:', error)
    toast.error('Failed to process CSV file')
  } finally {
    isUploadingCSV.value = false
  }
}

const removeStudent = (index: number) => {
  enrolledStudents.value.splice(index, 1)
  hasUnsavedChanges.value = true
  toast.info('Student removed from enrollment')
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

// Save and cancel handlers
const handleSave = async () => {
  if (!canSave.value) {
    toast.error('Please fix validation errors before saving')
    return
  }

  try {
    const examData: ExamFormData = {
      title: examTitle.value,
      description: examDescription.value,
      parts: parts.value.map(({ id, ...part }) => part),
      timeLimit: timeLimit.value,
      subnetGenerationConfig: subnetConfig.value
    }

    const response = await createExam(examData)
    
    if (response.success) {
      toast.success('Exam created successfully!')
      router.push(`/courses/${courseId.value}/exams`)
    } else {
      toast.error(response.error?.message || 'Failed to create exam')
    }
  } catch (error) {
    console.error('Save error:', error)
    toast.error('Failed to create exam. Please try again.')
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

// Initialize with first part
onMounted(async () => {
  await loadPlays()
  
  // Add initial part
  addPart()
  hasUnsavedChanges.value = false // Reset after initial setup
})

// Navigation guard
onBeforeUnmount(() => {
  if (hasUnsavedChanges.value) {
    console.warn('Leaving page with unsaved changes')
  }
})

// Watch for changes
watch([examTitle, examDescription, timeLimit, subnetConfig], () => {
  hasUnsavedChanges.value = true
}, { deep: true })

// Page title
useHead({
  title: 'Create Exam - NetGrader'
})

const getSubnetMask = (usableIPs: number): number => {
  return usableIPs <= 0 ? 32 : Math.max(0, 32 - Math.ceil(Math.log2(usableIPs + 2)))
}
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
              <BreadcrumbPage>Create Exam</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-foreground">Create Exam</h1>
            <p class="text-muted-foreground mt-1">
              Design a new examination with personalized configurations
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
          </div>
        </div>
      </div>
    </div>

    <!-- Exam Configuration -->
    <div class="container mx-auto px-4 py-6">
      <Tabs default-value="basic" class="mb-6">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="students">Student Enrollment</TabsTrigger>
          <TabsTrigger value="subnet">Subnet Configuration</TabsTrigger>
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
                    :class="{ 'border-destructive': !examTitle.trim() && examTitle !== '' }"
                  />
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
                  />
                </div>
              </div>
              
              <div class="space-y-2">
                <Label for="exam-description">Description</Label>
                <Textarea
                  id="exam-description"
                  v-model="examDescription"
                  placeholder="Describe the purpose and objectives of this exam..."
                  rows="3"
                />
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
                Upload a CSV file with student IDs to enroll students in this exam
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- CSV Upload Section -->
              <div class="border-2 border-dashed border-border rounded-lg p-6">
                <div class="text-center space-y-4">
                  <Upload class="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <h4 class="font-medium">Upload Student List</h4>
                    <p class="text-sm text-muted-foreground">
                      CSV format: student_id, name (optional)
                    </p>
                  </div>
                  
                  <div class="flex items-center justify-center space-x-4">
                    <Input
                      type="file"
                      accept=".csv"
                      @change="handleFileUpload"
                      class="max-w-xs"
                    />
                    <Button
                      @click="uploadStudentCSV"
                      :disabled="!csvFile || isUploadingCSV"
                    >
                      <Upload v-if="!isUploadingCSV" class="w-4 h-4 mr-2" />
                      <div v-else class="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      {{ isUploadingCSV ? 'Processing...' : 'Upload' }}
                    </Button>
                  </div>
                </div>
              </div>

              <!-- Enrolled Students List -->
              <div v-if="enrolledStudents.length > 0" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="font-medium">Enrolled Students ({{ enrolledStudents.length }})</h4>
                  <Button
                    @click="previewSubnetGeneration"
                    variant="outline"
                    size="sm"
                  >
                    <Eye class="w-4 h-4 mr-2" />
                    Preview Configurations
                  </Button>
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
                      <Button
                        @click="removeStudent(index)"
                        variant="ghost"
                        size="sm"
                        class="text-destructive hover:text-destructive"
                      >
                        <X class="w-4 h-4" />
                      </Button>
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
                  />
                </div>
                
                <div class="space-y-2">
                  <Label>Network Configuration</Label>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                      <Label for="usable-ips" class="text-xs">Usable IPs</Label>
                      <Input
                        id="usable-ips"
                        v-model.number="subnetConfig.usableIPs"
                        type="number"
                        min="1"
                        max="2147483646"
                        placeholder="254"
                        @input="(e: Event) => {
                          const target = e.target as HTMLInputElement;
                          const value = parseInt(target.value);
                          if (value >= 1 && value <= 2147483646) {
                            subnetConfig.usableIPs = value;
                            subnetConfig.subnetMask = getSubnetMask(value);
                          } else {
                            subnetConfig.usableIPs = Math.max(1, Math.min(value, 2147483646));
                          }
                        }"
                      />
                    </div>
                    <div class="space-y-1">
                      <Label for="subnet-mask" class="text-xs">Subnet Mask</Label>
                      <div class="relative">
                        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">/</span>
                        <Input
                          id="subnet-mask"
                          v-model.number="subnetConfig.subnetMask"
                          type="number"
                          min="1"
                          max="30"
                          placeholder="24"
                          class="pl-6"
                          @input="(e: Event) => {
                            const target = e.target as HTMLInputElement;
                            const value = parseInt(target.value);
                            if (value >= 1 && value <= 30) {
                              subnetConfig.subnetMask = value;
                              subnetConfig.usableIPs = value === 32 ? 0 : Math.pow(2, 32 - value) - 2;
                              console.log(value)
                            } else {
                              subnetConfig.subnetMask = Math.max(1, Math.min(value, 30));
                            }
                          }"
                        />
                      </div>
                    </div>
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
              <div class="w-2 h-2 bg-green-600 rounded-full"></div>
              <span class="text-sm">Ready to save</span>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <Button
              @click="handleCancel"
              variant="outline"
              :disabled="isExamLoading"
            >
              <X class="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              @click="handleSave"
              :disabled="!canSave || isExamLoading"
            >
              <Save v-if="!isExamLoading" class="w-4 h-4 mr-2" />
              <div v-else class="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              {{ isExamLoading ? 'Saving...' : 'Save Exam' }}
            </Button>
          </div>
        </div>
        
        <!-- Validation Errors List -->
        <div v-if="validationErrors.length > 0" class="mt-3 pt-3 border-t">
          <div class="text-sm text-destructive space-y-1">
            <div v-for="error in validationErrors" :key="error" class="flex items-center space-x-2">
              <div class="w-1 h-1 bg-destructive rounded-full"></div>
              <span>{{ error }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Play Selection Modal -->
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
          <Button @click="showSubnetPreview = false" variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
          <AlertDialogAction @click="handleConfirmNavigation" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Leave Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>