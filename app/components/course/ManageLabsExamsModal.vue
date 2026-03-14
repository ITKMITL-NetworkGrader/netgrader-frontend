<script setup lang="ts">
import { ref } from 'vue'
import { 
  BookOpen, 
  GraduationCap,
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  ArrowRight,
  FlaskConical,
  ClipboardCheck,
  Copy
} from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DuplicateLabModal from './DuplicateLabModal.vue'

// Types - flexible to accept readonly arrays
interface Lab {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly type?: 'lab' | 'exam'
  readonly createdAt: string
  readonly updatedAt: string
  readonly availableFrom?: string
  readonly availableUntil?: string
  readonly durationMinutes?: number
  readonly maxScore?: number
}

// Props
const props = defineProps<{
  open: boolean
  courseId: string
  labs: readonly Lab[]
  exams: readonly Lab[]
  isLoading?: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'delete-lab': [labId: string, labTitle: string]
  'delete-exam': [examId: string, examTitle: string]
  'lab-duplicated': []
}>()

// Duplicate Lab Modal State
const showDuplicateLabModal = ref(false)
const selectedLabToDuplicate = ref<Lab | null>(null)
const availableCourses = ref<{ id: string; title: string }[]>([])

const openDuplicateLabModal = async (lab: Lab) => {
  selectedLabToDuplicate.value = lab
  
  // Fetch courses where user has management permissions (INSTRUCTOR, TA, or ADMIN)
  try {
    const config = useRuntimeConfig()
    
    // Get user's enrollments with their roles
    const enrollmentsResponse = await $fetch<{ 
      success: boolean; 
      enrollments: Array<{
        c_id: string;
        u_role: string;
      }>
    }>(
      `${config.public.backendurl}/v0/enrollments/me`,
      {
        method: 'GET',
        credentials: 'include'
      }
    )
    
    if (enrollmentsResponse.success && enrollmentsResponse.enrollments) {
      // Filter for courses where user is INSTRUCTOR or TA
      const manageableEnrollments = enrollmentsResponse.enrollments
        .filter(e => e.u_role === 'INSTRUCTOR' || e.u_role === 'TA')
      
      // Fetch course details for each manageable enrollment
      const coursePromises = manageableEnrollments.map(async (enrollment) => {
        try {
          const courseResponse = await $fetch<{ course: { _id: string; title: string } }>(
            `${config.public.backendurl}/v0/courses/${enrollment.c_id}`,
            {
              method: 'GET',
              credentials: 'include'
            }
          )
          if (courseResponse.course) {
            return {
              id: enrollment.c_id,
              title: courseResponse.course.title
            }
          }
        } catch {
          // Course fetch failed, use ID as fallback
        }
        return {
          id: enrollment.c_id,
          title: `Course ${enrollment.c_id.substring(0, 8)}...`
        }
      })
      
      const manageableCourses = await Promise.all(coursePromises)
      
      // If current course is not in the list, add it
      if (!manageableCourses.some(c => c.id === props.courseId)) {
        manageableCourses.unshift({ id: props.courseId, title: 'Current Course' })
      }
      
      availableCourses.value = manageableCourses
    } else {
      // Fallback to current course only
      availableCourses.value = [{ id: props.courseId, title: 'Current Course' }]
    }
  } catch (error) {
    console.error('Failed to fetch manageable courses:', error)
    // Fallback to current course only
    availableCourses.value = [{ id: props.courseId, title: 'Current Course' }]
  }
  
  showDuplicateLabModal.value = true
}

const handleLabDuplicated = () => {
  showDuplicateLabModal.value = false
  selectedLabToDuplicate.value = null
  emit('lab-duplicated')
}

// Methods
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(dateString)
}

const isAvailable = (item: Lab): boolean => {
  if (!item.availableUntil) return true
  return Date.now() < new Date(item.availableUntil).getTime()
}

const getAvailabilityStatus = (item: Lab) => {
  if (!item.availableFrom && !item.availableUntil) {
    return { label: 'Always Available', variant: 'default' as const, color: 'emerald' }
  }
  
  const now = Date.now()
  const from = item.availableFrom ? new Date(item.availableFrom).getTime() : 0
  const until = item.availableUntil ? new Date(item.availableUntil).getTime() : Infinity
  
  if (now < from) {
    return { label: 'Scheduled', variant: 'secondary' as const, color: 'blue' }
  }
  if (now > until) {
    return { label: 'Expired', variant: 'destructive' as const, color: 'red' }
  }
  return { label: 'Active', variant: 'default' as const, color: 'emerald' }
}

const handleDeleteLab = (lab: Lab) => {
  emit('delete-lab', lab.id, lab.title)
}

const handleDeleteExam = (exam: Lab) => {
  emit('delete-exam', exam.id, exam.title)
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden p-0">
      <!-- Modal Header with Theme Gradient -->
      <div class="modal-header relative p-6 pb-8">
        <div class="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <DialogHeader class="relative">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <GraduationCap class="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle class="text-2xl font-bold text-white">Manage Labs & Exams</DialogTitle>
                <p class="text-white/70 text-sm mt-0.5">Create, edit, and organize your course content</p>
              </div>
            </div>
            
            <!-- Quick Stats -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                <FlaskConical class="h-4 w-4 text-white/80" />
                <span class="text-sm font-medium text-white">{{ labs.length }} Labs</span>
              </div>
              <div class="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                <ClipboardCheck class="h-4 w-4 text-white/80" />
                <span class="text-sm font-medium text-white">{{ exams.length }} Exams</span>
              </div>
            </div>
          </div>
        </DialogHeader>
      </div>

      <!-- Tabs Content -->
      <Tabs default-value="labs" class="w-full">
        <!-- Custom Tab List -->
        <div class="px-6 pt-4 pb-2 border-b border-border bg-muted/30">
          <TabsList class="w-full grid grid-cols-2 h-12 p-1 bg-muted/50">
            <TabsTrigger 
              value="labs" 
              class="h-full text-base font-medium data-[state=active]:bg-white data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200"
            >
              <FlaskConical class="h-4 w-4 mr-2" />
              Labs
              <Badge 
                v-if="labs.length > 0" 
                variant="secondary" 
                class="ml-2 h-5 min-w-[20px] text-xs bg-primary/10 text-primary bg-primary/10"
              >
                {{ labs.length }}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="exams" 
              class="h-full text-base font-medium data-[state=active]:bg-white data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200"
            >
              <ClipboardCheck class="h-4 w-4 mr-2" />
              Exams
              <Badge 
                v-if="exams.length > 0" 
                variant="secondary" 
                class="ml-2 h-5 min-w-[20px] text-xs bg-secondary/20 text-secondary bg-secondary/10"
              >
                {{ exams.length }}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <!-- Labs Tab -->
        <TabsContent value="labs" class="mt-0 p-6 max-h-[calc(90vh-280px)] overflow-y-auto" style="scrollbar-width: thin;">
          <!-- Add Lab Button -->
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-lg font-semibold">Course Labs</h3>
              <p class="text-sm text-muted-foreground">Practice exercises and hands-on activities</p>
            </div>
            <NuxtLink :to="`/courses/${courseId}/labs/create`">
              <Button class="btn-primary-gradient">
                <Plus class="h-4 w-4 mr-2" />
                Add Lab
              </Button>
            </NuxtLink>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
            <Loader2 class="h-10 w-10 animate-spin text-primary mb-4" />
            <p class="text-muted-foreground">Loading labs...</p>
          </div>

          <!-- Labs List -->
          <div v-else-if="labs.length > 0" class="space-y-4">
            <div 
              v-for="lab in labs" 
              :key="lab.id"
              class="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
            >
              <!-- Accent Border -->
              <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl accent-border-primary" />
              
              <div class="flex items-start justify-between gap-4 pl-3">
                <div class="flex-1 min-w-0">
                  <!-- Title Row -->
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-semibold text-base group-hover:text-primary transition-colors truncate">
                      {{ lab.title }}
                    </h4>
                    <Badge 
                      :variant="getAvailabilityStatus(lab).variant"
                      :class="[
                        'text-xs',
                        getAvailabilityStatus(lab).color === 'emerald' && 'bg-emerald-100 text-emerald-700 bg-emerald-500/10 text-emerald-600',
                        getAvailabilityStatus(lab).color === 'blue' && 'bg-blue-100 text-blue-700 bg-blue-500/10 text-blue-600',
                        getAvailabilityStatus(lab).color === 'red' && 'bg-red-100 text-red-700 bg-red-500/10 text-red-600'
                      ]"
                    >
                      {{ getAvailabilityStatus(lab).label }}
                    </Badge>
                  </div>
                  
                  <!-- Description -->
                  <p class="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {{ lab.description || 'No description provided' }}
                  </p>
                  
                  <!-- Meta Info -->
                  <div class="flex items-center gap-4 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Calendar class="h-3.5 w-3.5" />
                      Created {{ formatRelativeTime(lab.createdAt) }}
                    </span>
                    <span class="flex items-center gap-1">
                      <Clock class="h-3.5 w-3.5" />
                      Updated {{ formatRelativeTime(lab.updatedAt) }}
                    </span>
                    <span v-if="lab.durationMinutes" class="flex items-center gap-1">
                      <FileText class="h-3.5 w-3.5" />
                      {{ lab.durationMinutes }} min
                    </span>
                  </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    class="h-9 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-500/10"
                    @click="openDuplicateLabModal(lab)"
                    title="Duplicate lab"
                  >
                    <Copy class="h-3.5 w-3.5 mr-1.5" />
                    Duplicate
                  </Button>
                  <NuxtLink :to="`/courses/${courseId}/labs/${lab.id}/edit`">
                    <Button variant="outline" size="sm" class="h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:bg-primary/10">
                      <Edit class="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </NuxtLink>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    class="h-9 hover:bg-red-50 hover:text-red-600 hover:border-red-300 hover:bg-red-500/10"
                    @click="handleDeleteLab(lab)"
                  >
                    <Trash2 class="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center py-16 text-center">
            <div class="relative mb-6">
              <div class="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div class="relative p-6 rounded-full bg-primary/10 bg-primary/10">
                <FlaskConical class="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">No labs created yet</h3>
            <p class="text-muted-foreground text-sm mb-6 max-w-sm">
              Labs allow students to practice with hands-on exercises. Create your first lab to get started.
            </p>
            <NuxtLink :to="`/courses/${courseId}/labs/create`">
              <Button class="btn-primary-gradient">
                <Plus class="h-4 w-4 mr-2" />
                Create Your First Lab
              </Button>
            </NuxtLink>
          </div>
        </TabsContent>

        <!-- Exams Tab -->
        <TabsContent value="exams" class="mt-0 p-6 max-h-[calc(90vh-280px)] overflow-y-auto" style="scrollbar-width: thin;">
          <!-- Add Exam Button -->
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-lg font-semibold">Course Exams</h3>
              <p class="text-sm text-muted-foreground">Graded assessments and evaluations</p>
            </div>
            <NuxtLink :to="`/courses/${courseId}/exams/create`">
              <Button class="btn-secondary-gradient">
                <Plus class="h-4 w-4 mr-2" />
                Add Exam
              </Button>
            </NuxtLink>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
            <Loader2 class="h-10 w-10 animate-spin text-secondary mb-4" />
            <p class="text-muted-foreground">Loading exams...</p>
          </div>

          <!-- Exams List -->
          <div v-else-if="exams.length > 0" class="space-y-4">
            <div 
              v-for="exam in exams" 
              :key="exam.id"
              class="group relative rounded-xl border border-border bg-card p-4 hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300 cursor-pointer"
            >
              <!-- Accent Border -->
              <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl accent-border-secondary" />
              
              <div class="flex items-start justify-between gap-4 pl-3">
                <div class="flex-1 min-w-0">
                  <!-- Title Row -->
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-semibold text-base group-hover:text-secondary transition-colors truncate">
                      {{ exam.title }}
                    </h4>
                    <Badge 
                      :variant="getAvailabilityStatus(exam).variant"
                      :class="[
                        'text-xs',
                        getAvailabilityStatus(exam).color === 'emerald' && 'bg-emerald-100 text-emerald-700 bg-emerald-500/10 text-emerald-600',
                        getAvailabilityStatus(exam).color === 'blue' && 'bg-blue-100 text-blue-700 bg-blue-500/10 text-blue-600',
                        getAvailabilityStatus(exam).color === 'red' && 'bg-red-100 text-red-700 bg-red-500/10 text-red-600'
                      ]"
                    >
                      {{ getAvailabilityStatus(exam).label }}
                    </Badge>
                  </div>
                  
                  <!-- Description -->
                  <p class="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {{ exam.description || 'No description provided' }}
                  </p>
                  
                  <!-- Meta Info -->
                  <div class="flex items-center gap-4 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Calendar class="h-3.5 w-3.5" />
                      Created {{ formatRelativeTime(exam.createdAt) }}
                    </span>
                    <span class="flex items-center gap-1">
                      <Clock class="h-3.5 w-3.5" />
                      Updated {{ formatRelativeTime(exam.updatedAt) }}
                    </span>
                    <span v-if="exam.durationMinutes" class="flex items-center gap-1">
                      <FileText class="h-3.5 w-3.5" />
                      {{ exam.durationMinutes }} min
                    </span>
                  </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <NuxtLink :to="`/courses/${courseId}/exams/${exam.id}/edit`">
                    <Button variant="outline" size="sm" class="h-9 hover:bg-secondary/10 hover:text-secondary hover:border-secondary/30 dark:hover:bg-secondary/20">
                      <Edit class="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </NuxtLink>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    class="h-9 hover:bg-red-50 hover:text-red-600 hover:border-red-300 hover:bg-red-500/10"
                    @click="handleDeleteExam(exam)"
                  >
                    <Trash2 class="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center py-16 text-center">
            <div class="relative mb-6">
              <div class="absolute inset-0 bg-secondary/20 blur-2xl rounded-full" />
              <div class="relative p-6 rounded-full bg-secondary/10 bg-secondary/10">
                <ClipboardCheck class="h-12 w-12 text-secondary" />
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">No exams created yet</h3>
            <p class="text-muted-foreground text-sm mb-6 max-w-sm">
              Exams help you assess student understanding. Create your first exam to get started.
            </p>
            <NuxtLink :to="`/courses/${courseId}/exams/create`">
              <Button class="btn-secondary-gradient">
                <Plus class="h-4 w-4 mr-2" />
                Create Your First Exam
              </Button>
            </NuxtLink>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>

  <!-- Duplicate Lab Modal -->
  <DuplicateLabModal
    v-model:open="showDuplicateLabModal"
    :lab="selectedLabToDuplicate"
    :current-course-id="courseId"
    :available-courses="availableCourses"
    @duplicated="handleLabDuplicated"
  />
</template>

<style scoped>
.bg-grid-white\/10 {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgba(255,255,255,0.1)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
}

.modal-header {
  background: var(--primary);
}

.btn-primary-gradient {
  background: var(--primary);
  color: var(--primary-foreground);
  transition: all 0.2s ease;
}

.btn-primary-gradient:hover {
  opacity: 0.9;
}

.btn-secondary-gradient {
  background: var(--secondary);
  color: var(--secondary-foreground);
  transition: all 0.2s ease;
}

.btn-secondary-gradient:hover {
  opacity: 0.9;
}

.accent-border-primary {
  background: var(--primary);
}

.accent-border-secondary {
  background: var(--secondary);
}
</style>
