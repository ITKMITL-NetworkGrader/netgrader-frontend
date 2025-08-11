<template>
  <div class="min-h-screen bg-background p-4 pb-8">
    <!-- Breadcrumb Navigation -->
    <Breadcrumb class="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <NuxtLink to="/" class="flex items-center">
            <Home class="h-4 w-4" />
          </NuxtLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight class="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <NuxtLink to="/courses" class="flex items-center">
            Courses
          </NuxtLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight class="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <NuxtLink :to="`/courses/${courseId}`" class="flex items-center">
            {{ courseTitle }}
          </NuxtLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight class="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <NuxtLink :to="`/courses/${courseId}/exams`" class="flex items-center">
            Exams
          </NuxtLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight class="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Create Exam</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Create New Exam</h1>
        <p class="text-muted-foreground">Design a comprehensive exam with multiple parts, time limits, and personalized configurations</p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex items-center space-x-4">
          <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
              :class="{
                'bg-primary text-primary-foreground border-primary': currentStep >= index + 1,
                'border-muted-foreground text-muted-foreground': currentStep < index + 1
              }"
            >
              <Check v-if="currentStep > index + 1" class="w-4 h-4" />
              <span v-else class="text-sm font-medium">{{ index + 1 }}</span>
            </div>
            <span
              class="ml-2 text-sm transition-colors"
              :class="{
                'text-foreground font-medium': currentStep >= index + 1,
                'text-muted-foreground': currentStep < index + 1
              }"
            >
              {{ step.title }}
            </span>
            <ChevronRight
              v-if="index < steps.length - 1"
              class="w-4 h-4 mx-4 text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <Card class="mb-6">
        <CardContent class="p-6">
          <!-- Step 1: Basic Information -->
          <div v-if="currentStep === 1">
            <h2 class="text-xl font-semibold mb-4">Exam Information</h2>
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label for="exam-title">Exam Title *</Label>
                  <Input
                    id="exam-title"
                    v-model="examForm.title"
                    placeholder="Enter exam title"
                    class="mt-1"
                    :class="{ 'border-destructive': showValidation && !examForm.title.trim() }"
                  />
                  <p v-if="showValidation && !examForm.title.trim()" class="text-sm text-destructive mt-1">
                    Exam title is required
                  </p>
                </div>
                <div>
                  <Label for="time-limit" class="flex items-center space-x-2">
                    <Clock class="w-4 h-4" />
                    <span>Time Limit (minutes)</span>
                  </Label>
                  <Input
                    id="time-limit"
                    v-model.number="examForm.timeLimit"
                    type="number"
                    min="1"
                    max="480"
                    placeholder="120"
                    class="mt-1"
                    :class="{ 'border-destructive': showValidation && (!examForm.timeLimit || examForm.timeLimit < 1) }"
                  />
                  <p v-if="showValidation && (!examForm.timeLimit || examForm.timeLimit < 1)" class="text-sm text-destructive mt-1">
                    Time limit is required and must be at least 1 minute
                  </p>
                </div>
              </div>
              <div>
                <Label for="exam-description">Description *</Label>
                <Textarea
                  id="exam-description"
                  v-model="examForm.description"
                  placeholder="Describe the purpose and objectives of this exam"
                  rows="4"
                  class="mt-1"
                  :class="{ 'border-destructive': showValidation && !examForm.description.trim() }"
                />
                <p v-if="showValidation && !examForm.description.trim()" class="text-sm text-destructive mt-1">
                  Exam description is required
                </p>
              </div>
            </div>
          </div>

          <!-- Step 2: Student Enrollment -->
          <div v-if="currentStep === 2">
            <h2 class="text-xl font-semibold mb-4">Student Enrollment</h2>
            
            <!-- CSV Upload Section -->
            <div class="border-2 border-dashed border-border rounded-lg p-6 mb-6">
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
                    class="max-w-xs"
                    @change="handleFileUpload"
                  />
                  <Button
                    :disabled="!csvFile || isUploadingCSV"
                    @click="uploadStudentCSV"
                  >
                    <Upload v-if="!isUploadingCSV" class="w-4 h-4 mr-2" />
                    <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
                    {{ isUploadingCSV ? 'Processing...' : 'Upload' }}
                  </Button>
                </div>
              </div>
            </div>

            <!-- Enrolled Students List -->
            <div v-if="enrolledStudents.length > 0" class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="font-medium">Enrolled Students ({{ enrolledStudents.length }})</h4>
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

            <div v-if="showValidation && enrolledStudents.length === 0" class="text-sm text-destructive mt-4">
              At least one student must be enrolled to create an exam
            </div>
          </div>

          <!-- Step 3: IP Schema Configuration -->
          <div v-if="currentStep === 3">
            <h2 class="text-xl font-semibold mb-4">Network Configuration</h2>
            <IPSchemaManager
              v-model:schema="examForm.ipSchema"
              v-model:device-mapping="examForm.deviceIpMapping"
              :show-validation="showValidation"
            />
          </div>

          <!-- Step 4: Exam Parts -->
          <div v-if="currentStep === 4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold">Exam Parts</h2>
              <Button variant="outline" size="sm" @click="addExamPart">
                <Plus class="w-4 h-4 mr-1" />
                Add Part
              </Button>
            </div>

            <div v-if="examForm.parts.length === 0" class="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <p class="text-muted-foreground mb-2">No exam parts added yet</p>
              <Button variant="outline" @click="addExamPart">
                <Plus class="w-4 h-4 mr-1" />
                Add Your First Part
              </Button>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(part, index) in examForm.parts"
                :key="part.tempId"
                class="border rounded-lg"
              >
                <div
                  class="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                  @click="togglePartExpanded(index)"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {{ index + 1 }}
                    </div>
                    <div>
                      <h3 class="font-medium">
                        {{ part.title || `Part ${index + 1}` }}
                      </h3>
                      <p class="text-sm text-muted-foreground">
                        {{ part.selectedPlay ? `Play: ${part.selectedPlay.title}` : 'No play selected' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Badge
                      :variant="part.selectedPlay ? 'default' : 'destructive'"
                    >
                      {{ part.selectedPlay ? 'Configured' : 'Needs Play' }}
                    </Badge>
                    <ChevronDown
                      class="w-4 h-4 transition-transform"
                      :class="{ 'transform rotate-180': expandedParts[index] }"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      @click.stop="removeExamPart(index)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Transition name="expand">
                  <div v-if="expandedParts[index]" class="border-t">
                    <div class="h-96">
                      <TextEditor
                        :model-value="part.textMd"
                        :title="part.title"
                        :selected-play="part.selectedPlay"
                        :show-validation="showValidation"
                        @update:model-value="updatePartContent(index, $event)"
                        @update:title="updatePartTitle(index, $event)"
                        @open-play-modal="openPlayModal(index)"
                        @clear-play="clearPlay(index)"
                      />
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- Step 5: Review & Save -->
          <div v-if="currentStep === 5">
            <h2 class="text-xl font-semibold mb-4">Review Exam</h2>
            <div class="space-y-6">
              <!-- Basic Information -->
              <div>
                <h3 class="font-medium mb-2">Basic Information</h3>
                <dl class="grid grid-cols-1 gap-2 text-sm">
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Title:</dt>
                    <dd class="col-span-2">{{ examForm.title }}</dd>
                  </div>
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Description:</dt>
                    <dd class="col-span-2">{{ examForm.description }}</dd>
                  </div>
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Time Limit:</dt>
                    <dd class="col-span-2">{{ examForm.timeLimit }} minutes</dd>
                  </div>
                </dl>
              </div>

              <!-- Student Enrollment -->
              <div>
                <h3 class="font-medium mb-2">Students ({{ enrolledStudents.length }})</h3>
                <div class="text-sm text-muted-foreground">
                  {{ enrolledStudents.slice(0, 3).map(s => s.studentId).join(', ') }}
                  <span v-if="enrolledStudents.length > 3">
                    and {{ enrolledStudents.length - 3 }} more...
                  </span>
                </div>
              </div>

              <!-- IP Schema -->
              <div v-if="examForm.ipSchema">
                <h3 class="font-medium mb-2">IP Configuration</h3>
                <dl class="grid grid-cols-1 gap-2 text-sm">
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Base Network:</dt>
                    <dd class="col-span-2">{{ examForm.ipSchema.baseNetwork }}/{{ examForm.ipSchema.subnetMask }}</dd>
                  </div>
                  <div class="grid grid-cols-3">
                    <dt class="font-medium text-muted-foreground">Strategy:</dt>
                    <dd class="col-span-2">{{ examForm.ipSchema.allocationStrategy }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Parts Summary -->
              <div>
                <h3 class="font-medium mb-2">Exam Parts ({{ examForm.parts.length }})</h3>
                <div class="space-y-2">
                  <div
                    v-for="(part, index) in examForm.parts"
                    :key="part.tempId"
                    class="flex items-center justify-between p-3 border rounded"
                  >
                    <div>
                      <span class="font-medium">{{ part.title || `Part ${index + 1}` }}</span>
                      <p class="text-sm text-muted-foreground">
                        {{ part.selectedPlay ? `Play: ${part.selectedPlay.title}` : 'No play configured' }}
                      </p>
                    </div>
                    <Badge :variant="part.selectedPlay ? 'default' : 'destructive'">
                      {{ part.selectedPlay ? 'Ready' : 'Missing Play' }}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Navigation -->
      <div class="flex items-center justify-between">
        <div>
          <Button
            v-if="currentStep > 1"
            variant="outline"
            :disabled="isSubmitting"
            @click="previousStep"
          >
            <ChevronLeft class="w-4 h-4 mr-1" />
            Previous
          </Button>
        </div>
        <div class="flex items-center space-x-2">
          <Button
            variant="outline"
            :disabled="isSubmitting"
            @click="saveDraft"
          >
            Save Draft
          </Button>
          <Button
            v-if="currentStep < steps.length"
            :disabled="isSubmitting"
            @click="nextStep"
          >
            Next
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
          <Button
            v-else
            :disabled="isSubmitting || !isExamValid"
            @click="submitExam"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            Create Exam
          </Button>
        </div>
      </div>
    </div>

    <!-- Play Creation Modal -->
    <PlayCreationModal
      v-model:open="showPlayCreationModal"
      :context-info="{
        course: courseId,
        labOrExam: 'Exam',
        part: currentPartIndex !== null ? `Part ${currentPartIndex + 1}` : '',
        availableDevices: availableDevices
      }"
      @play-created="handlePlayCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { 
  Home, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  Check, 
  Plus, 
  Trash2, 
  Loader2,
  Clock,
  Upload,
  X
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

import TextEditor from '@/components/lab/TextEditor.vue'
import IPSchemaManager from '@/components/lab/IPSchemaManager.vue'
import PlayCreationModal from '@/components/play/PlayCreationModal.vue'

import type { LabFormData, LabPart, IpSchema, DeviceIpMapping } from '@/types/lab'

// Route setup
const route = useRoute()
const router = useRouter()
const courseId = route.params.c_id as string

// Get course info for breadcrumb
const { currentCourse } = useCourse()
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId}`)

// Wizard steps
const steps = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'Students' },
  { id: 3, title: 'IP Configuration' }, 
  { id: 4, title: 'Exam Parts' },
  { id: 5, title: 'Review' }
]

const currentStep = ref(1)
const showValidation = ref(false)
const isSubmitting = ref(false)

// Form data
interface ExamPartWithTemp extends Omit<LabPart, 'part_id'> {
  tempId: string
  selectedPlay?: { id: string; title: string; description: string } | null
}

const examForm = reactive<LabFormData & { parts: ExamPartWithTemp[]; timeLimit: number }>({
  title: '',
  description: '',
  type: 'exam',
  groupsRequired: false,
  timeLimit: 120, // 2 hours default
  ipSchema: undefined,
  deviceIpMapping: undefined,
  parts: []
})

// Student enrollment
const enrolledStudents = ref<Array<{ studentId: string; name?: string }>>([])
const csvFile = ref<File | null>(null)
const isUploadingCSV = ref(false)

// Part management
const expandedParts = ref<Record<number, boolean>>({})
const currentPartIndex = ref<number | null>(null)
const showPlayCreationModal = ref(false)

// Available devices for play creation
const availableDevices = computed(() => {
  if (!examForm.deviceIpMapping || examForm.deviceIpMapping.length === 0) {
    return []
  }
  
  return examForm.deviceIpMapping.map(device => ({
    value: device.deviceId,
    label: device.deviceId.charAt(0).toUpperCase() + device.deviceId.slice(1).replace(/[_-]/g, ' '),
    icon: getDeviceIcon(device.deviceId)
  }))
})

const getDeviceIcon = (deviceId: string): string => {
  const id = deviceId.toLowerCase()
  
  if (id.includes('router')) return 'lucide:router'
  if (id.includes('switch')) return 'lucide:network'
  if (id.includes('pc') || id.includes('computer')) return 'lucide:monitor'
  if (id.includes('server')) return 'lucide:server'
  if (id.includes('firewall') || id.includes('security')) return 'lucide:shield'
  if (id.includes('phone') || id.includes('voip')) return 'lucide:phone'
  if (id.includes('printer')) return 'lucide:printer'
  if (id.includes('camera')) return 'lucide:camera'
  
  return 'lucide:cpu' // Default icon
}

// Validation
const isExamValid = computed(() => {
  return examForm.title.trim() && 
         examForm.description.trim() && 
         examForm.timeLimit > 0 &&
         enrolledStudents.value.length > 0 &&
         examForm.parts.length > 0 &&
         examForm.parts.every(part => part.title.trim() && part.selectedPlay)
})

// Methods
const nextStep = () => {
  showValidation.value = true
  
  if (currentStep.value === 1) {
    if (!examForm.title.trim() || !examForm.description.trim() || !examForm.timeLimit || examForm.timeLimit < 1) {
      toast.error('Please fill in all required fields')
      return
    }
  }
  
  if (currentStep.value === 2) {
    if (enrolledStudents.value.length === 0) {
      toast.error('Please enroll at least one student')
      return
    }
  }
  
  if (currentStep.value === 4) {
    if (examForm.parts.length === 0) {
      toast.error('Please add at least one exam part')
      return
    }
    
    const invalidParts = examForm.parts.filter(part => !part.title.trim() || !part.selectedPlay)
    if (invalidParts.length > 0) {
      toast.error('All parts must have a title and selected play')
      return
    }
  }
  
  currentStep.value++
}

const previousStep = () => {
  currentStep.value--
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
  toast.info('Student removed from enrollment')
}

const addExamPart = () => {
  const newPart: ExamPartWithTemp = {
    tempId: `temp-${Date.now()}`,
    title: `Part ${examForm.parts.length + 1}`,
    textMd: '',
    order: examForm.parts.length + 1,
    total_points: 0,
    ipSchema: null,
    deviceIpMapping: null,
    plays: [],
    selectedPlay: null
  }
  
  examForm.parts.push(newPart)
  expandedParts.value[examForm.parts.length - 1] = true
}

const removeExamPart = (index: number) => {
  examForm.parts.splice(index, 1)
  delete expandedParts.value[index]
  
  // Reorder remaining parts
  examForm.parts.forEach((part, i) => {
    part.order = i + 1
  })
}

const togglePartExpanded = (index: number) => {
  expandedParts.value[index] = !expandedParts.value[index]
}

const openPlayModal = (partIndex: number) => {
  currentPartIndex.value = partIndex
  showPlayCreationModal.value = true
}

const clearPlay = (partIndex: number) => {
  examForm.parts[partIndex].selectedPlay = null
}

const updatePartContent = (partIndex: number, content: string) => {
  if (examForm.parts[partIndex]) {
    examForm.parts[partIndex].textMd = content
  }
}

const updatePartTitle = (partIndex: number, title: string) => {
  if (examForm.parts[partIndex]) {
    examForm.parts[partIndex].title = title
  }
}

const handlePlayCreated = (play: any) => {
  if (currentPartIndex.value !== null) {
    examForm.parts[currentPartIndex.value].selectedPlay = {
      id: play.id || play.play_id,
      title: play.name,
      description: play.description || ''
    }
  }
  currentPartIndex.value = null
}

const saveDraft = async () => {
  toast.success('Draft saved locally')
}

const submitExam = async () => {
  if (!isExamValid.value) {
    toast.error('Please complete all required fields and configurations')
    return
  }

  isSubmitting.value = true
  
  try {
    // Transform the form data to match the expected API format
    const examData = {
      ...examForm,
      parts: examForm.parts.map((part, index) => ({
        title: part.title,
        textMd: part.textMd,
        order: index + 1,
        total_points: part.total_points,
        ipSchema: part.ipSchema,
        deviceIpMapping: part.deviceIpMapping,
        plays: part.selectedPlay ? [{
          play_id: part.selectedPlay.id,
          name: part.selectedPlay.title,
          description: part.selectedPlay.description,
          source_device: '',
          target_device: '',
          total_points: part.total_points,
          ansible_tasks: []
        }] : []
      })),
      enrolledStudents: enrolledStudents.value
    }

    // TODO: Make API call to create exam
    console.log('Creating exam:', examData)
    
    toast.success('Exam created successfully!')
    router.push(`/courses/${courseId}/exams`)
    
  } catch (error) {
    console.error('Failed to create exam:', error)
    toast.error('Failed to create exam. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

// Initialize with at least one part
onMounted(() => {
  addExamPart()
})
</script>

<style>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  height: 384px; /* h-96 */
  opacity: 1;
}
</style>