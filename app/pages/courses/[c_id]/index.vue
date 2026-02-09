<script setup lang="ts">
import { ChevronRight, Home, Edit, Settings, X, Plus, Trash2, Play, BookOpen, Clock, Calendar, Loader2, BarChart3, RotateCcw, UserCog, History } from 'lucide-vue-next'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'

// New redesigned modal components
import EditCourseModal from '@/components/course/EditCourseModal.vue'
import ManageLabsExamsModal from '@/components/course/ManageLabsExamsModal.vue'

import type { Enrollment } from "~/composables/states";

interface EnrollmentsResponse {
    status: boolean,
    enrollments: Enrollment[]
}

interface EnrollResponse {
    success: boolean,
    message: string,
    enrollment: Array<{
        u_id: string,
        c_id: string,
        u_role: string,
        enrollmentDate: null
    }>
}

type CourseRoleOption = 'STUDENT' | 'TA' | 'INSTRUCTOR'

interface EnrollmentDraftItem extends Enrollment {
  originalRole: CourseRoleOption
  newRole: CourseRoleOption
  markedForRemoval: boolean
}

const route = useRoute()
const courseId = route.params.c_id as string
const config = useRuntimeConfig()
const backendURL = config.public.backendurl

// Initialize composables
const { currentCourse, isLoading, fetchCourse, currentCourseEnrollment } = useCourse()
const { canManageCurrentCourse } = useRoleGuard()
const courseRoleState = useCourseRoleState()
const user = useUserState()
const { 
  labs, 
  availableLabs, 
  availableExams, 
  isLoading: isLoadingLabs, 
  error: labsError,
  fetchCourseLabs,
  deleteLab,
  formatLabDate 
} = useCourseLabs()

// Reactive data for enrollments (for management purposes)
const enrolledStudents = ref<Enrollment[]>([])
const isLoadingEnrollments = ref(false)

// Use enrollment data from useCourse composable
const isEnrolled = computed(() => {
  return currentCourseEnrollment.value.isEnrolled
})

const userRole = computed(() => {
  return currentCourseEnrollment.value.role || null
})

const canManageCourse = canManageCurrentCourse
const isCourseInstructor = computed(() => currentCourseEnrollment.value?.role === 'INSTRUCTOR')
const isCourseTA = computed(() => currentCourseEnrollment.value?.role === 'TA')

const DEFAULT_BANNER_PLACEHOLDER = '/placeholder.avif'
const ACCEPTED_BANNER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BANNER_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const bannerFileInput = ref<HTMLInputElement | null>(null)
const isUploadingBanner = ref(false)

const courseBannerUrl = computed(() => {
  return currentCourse.value?.bannerUrl || currentCourse.value?.bannerImage || DEFAULT_BANNER_PLACEHOLDER
})

// Modal states
const isEditModalOpen = ref(false)
const isManageModalOpen = ref(false)
const isEnrollModalOpen = ref(false)
const isPasswordModalOpen = ref(false)
const isConfirmEnrollModalOpen = ref(false)
const isAdminRoleChangeModalOpen = ref(false)

// Enrollment form data
const enrollmentForm = ref({
  password: '',
  selectedRole: 'STUDENT' as 'STUDENT' | 'INSTRUCTOR' | 'TA'
})

// Admin role change form
const adminRoleChangeForm = ref({
  selectedRole: 'STUDENT' as 'STUDENT' | 'INSTRUCTOR' | 'TA'
})
const isChangingAdminRole = ref(false)

const enrollmentDraft = ref<EnrollmentDraftItem[]>([])
const showEnrollmentConfirm = ref(false)
const isSavingChanges = ref(false)

// Form data for editing course
const editForm = ref({
  title: '',
  description: '',
  bannerUrl: '',
  password: '',
  enrolledStudents: [] as Enrollment[],
  isPrivate: false
})

// Function to fetch enrollment data for management (only when needed)
const fetchEnrollmentData = async () => {
  try {
    isLoadingEnrollments.value = true
    const enrolledStudentsData = await $fetch<EnrollmentsResponse>(`${backendURL}/v0/enrollments/${courseId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    enrolledStudents.value = enrolledStudentsData?.enrollments || []
    resetEnrollmentDraft()
  } catch (error) {
    console.error('Failed to fetch enrolled students:', error)
    enrolledStudents.value = []
    resetEnrollmentDraft()
  } finally {
    isLoadingEnrollments.value = false
  }
}

const resetEnrollmentDraft = () => {
  enrollmentDraft.value = (enrolledStudents.value || []).map(student => ({
    ...student,
    originalRole: student.u_role,
    newRole: student.u_role,
    markedForRemoval: false
  }))
}

// Initialize form data function
const initializeForm = () => {
  if (currentCourse.value) {
    editForm.value.title = currentCourse.value.title || ''
    editForm.value.description = currentCourse.value.description || ''
    editForm.value.bannerUrl = currentCourse.value.bannerUrl || currentCourse.value.bannerImage || ''
    editForm.value.password = currentCourse.value.password || ''
    editForm.value.isPrivate = currentCourse.value.visibility === 'private'
    editForm.value.enrolledStudents = enrolledStudents.value || []
    resetEnrollmentDraft()
  }
}

// Fetch data on mount
onMounted(async () => {
  try {
    await fetchCourse(courseId)
    initializeForm()
    // Fetch labs data if user is enrolled
    if (currentCourseEnrollment.value?.isEnrolled) {
      await fetchCourseLabs(courseId)
    }
  } catch (error) {
    console.error('Failed to fetch course data:', error)
  }
})

// Watch for course changes to update form
watch(currentCourse, (newCourse) => {
  if (newCourse) {
    initializeForm()
  }
}, { immediate: true })

// Watch for enrollment changes to update form
watch(enrolledStudents, () => {
  if (currentCourse.value) {
    initializeForm()
  }
}, { immediate: true })

// Watch for when edit modal opens to fetch enrollment data
watch(isEditModalOpen, (isOpen) => {
  if (isOpen && canManageCourse.value) {
    fetchEnrollmentData()
  } else if (!isOpen) {
    showEnrollmentConfirm.value = false
    resetEnrollmentDraft()
  }
})

// Computed property for course title
const courseTitle = computed(() => {
  return currentCourse.value?.title || `Course ${courseId}`
})

const roleChanges = computed(() =>
  enrollmentDraft.value.filter(item => !item.markedForRemoval && item.newRole !== item.originalRole)
)

const removalList = computed(() =>
  enrollmentDraft.value.filter(item => item.markedForRemoval)
)

const hasEnrollmentChanges = computed(() =>
  roleChanges.value.length > 0 || removalList.value.length > 0
)

const courseDetailsChanged = computed(() => {
  if (!currentCourse.value) return false

  const currentVisibilityPrivate = currentCourse.value.visibility === 'private'
  const currentPassword = currentCourse.value.password || ''

  return (
    editForm.value.title !== (currentCourse.value.title || '') ||
    editForm.value.description !== (currentCourse.value.description || '') ||
    editForm.value.password !== currentPassword ||
    editForm.value.isPrivate !== currentVisibilityPrivate
  )
})

// Methods
const ROLE_SELECT_OPTIONS: Array<{ label: string; value: CourseRoleOption }> = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Teaching Assistant', value: 'TA' }
]

const formatRoleLabel = (role: CourseRoleOption) => {
  switch (role) {
    case 'TA':
      return 'Teaching Assistant'
    case 'INSTRUCTOR':
      return 'Instructor'
    default:
      return 'Student'
  }
}

const roleBadgeClass = (role: CourseRoleOption) => {
  switch (role) {
    case 'INSTRUCTOR':
      return 'bg-green-100 text-green-800'
    case 'TA':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-blue-100 text-blue-800'
  }
}

const canModifyRoleForUser = (student: EnrollmentDraftItem) => {
  if (student.markedForRemoval) return false
  if (isCourseInstructor.value) {
    return student.originalRole !== 'INSTRUCTOR'
  }
  if (isCourseTA.value) {
    return student.originalRole === 'STUDENT'
  }
  return false
}

const canRemoveEnrollment = (student: EnrollmentDraftItem) => {
  if (isCourseInstructor.value) {
    return true
  }
  if (isCourseTA.value) {
    return student.originalRole === 'STUDENT'
  }
  return false
}

const handleRoleChange = (userId: string, newRole: CourseRoleOption) => {
  const student = enrollmentDraft.value.find(item => item.u_id === userId)
  if (!student) return
  if (!canModifyRoleForUser(student)) return
  if (newRole === 'INSTRUCTOR') return
  student.newRole = newRole
}

const toggleRemoval = (userId: string) => {
  const student = enrollmentDraft.value.find(item => item.u_id === userId)
  if (!student) return
  if (!canRemoveEnrollment(student)) return
  student.markedForRemoval = !student.markedForRemoval
  if (student.markedForRemoval) {
    student.newRole = student.originalRole
  }
}

const updateCourseDetails = async () => {
  if (!courseDetailsChanged.value) return

  const updateData = {
    title: editForm.value.title,
    description: editForm.value.description,
    password: editForm.value.password,
    visibility: editForm.value.isPrivate ? 'private' : 'public'
  }

  await $fetch(`${backendURL}/v0/courses/${courseId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: updateData
  })
}

const applyEnrollmentChanges = async () => {
  if (!hasEnrollmentChanges.value) return

  const roleChangePayload = roleChanges.value
    .filter(item => item.newRole !== 'INSTRUCTOR')
    .map(item => ({ u_id: item.u_id, newRole: item.newRole as 'STUDENT' | 'TA' }))

  const removalPayload = removalList.value.map(item => item.u_id)

  if (roleChangePayload.length === 0 && removalPayload.length === 0) {
    return
  }

  await $fetch(`${backendURL}/v0/enrollments/course/${courseId}/manage`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      roleChanges: roleChangePayload,
      removals: removalPayload
    }
  })
}

const applyChanges = async () => {
  if (isSavingChanges.value) return

  if (!courseDetailsChanged.value && !hasEnrollmentChanges.value) {
    toast.info('No changes to save.')
    isEditModalOpen.value = false
    showEnrollmentConfirm.value = false
    return
  }

  isSavingChanges.value = true
  try {
    await updateCourseDetails()
    if (hasEnrollmentChanges.value) {
      await applyEnrollmentChanges()
    }

    toast.success('Course updated successfully!', {
      description: 'Your changes have been saved.'
    })

    await Promise.all([
      fetchCourse(courseId),
      fetchEnrollmentData()
    ])

    initializeForm()
    showEnrollmentConfirm.value = false
    isEditModalOpen.value = false
  } catch (error) {
    console.error('Failed to update course:', error)
    const message = (error as any)?.data?.message || (error as Error).message || 'Please try again later.'
    toast.error('Failed to update course', {
      description: message
    })
  } finally {
    isSavingChanges.value = false
  }
}

const handleSaveClick = () => {
  if (isSavingChanges.value) return
  if (hasEnrollmentChanges.value) {
    showEnrollmentConfirm.value = true
  } else {
    applyChanges()
  }
}

// Handler for EditCourseModal save event
const handleEditCourseSave = async (form: { title: string; description: string; password: string; isPrivate: boolean }) => {
  // Update local editForm with values from modal
  editForm.value.title = form.title
  editForm.value.description = form.description
  editForm.value.password = form.password
  editForm.value.isPrivate = form.isPrivate
  
  // Apply changes
  await applyChanges()
}

// Handler for EditCourseModal cancel event
const handleEditCourseCancel = () => {
  initializeForm()
  resetEnrollmentDraft()
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]

  if (!file) {
    return
  }

  const resetInput = () => {
    if (target) {
      target.value = ''
    }
  }

  if (!ACCEPTED_BANNER_TYPES.includes(file.type)) {
    toast.error('Unsupported file type', {
      description: 'Please upload a JPEG, PNG, WebP, or GIF image.'
    })
    resetInput()
    return
  }

  if (file.size > MAX_BANNER_FILE_SIZE) {
    toast.error('File is too large', {
      description: 'Course banners must be 10 MB or smaller.'
    })
    resetInput()
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    isUploadingBanner.value = true

    interface UploadResponse {
      message?: string
      data?: {
        objectName?: string
        url?: string
      }
    }

    const response = await $fetch<UploadResponse>(`${backendURL}/v0/storage/course/${courseId}/banner`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    const uploadedUrl = response?.data?.url

    toast.success('Course banner updated!', {
      description: 'The new banner is now live.'
    })

    await fetchCourse(courseId)

    if (uploadedUrl) {
      editForm.value.bannerUrl = uploadedUrl
    } else if (currentCourse.value?.bannerUrl || currentCourse.value?.bannerImage) {
      editForm.value.bannerUrl = currentCourse.value.bannerUrl || currentCourse.value.bannerImage || ''
    }
  } catch (error: any) {
    console.error('Failed to upload course banner:', error)
    const errorMessage = error?.data?.message || 'Please try again in a few moments.'
    toast.error('Failed to upload course banner', {
      description: errorMessage
    })
  } finally {
    resetInput()
    isUploadingBanner.value = false
  }
}

const enrollStudent = async () => {
  if (!user.value?.u_id) {
    toast.error('You must be logged in to enroll in a course.', {
      description: 'Please log in and try again.'
    })
    return
  }
  
  // Check if course requires password
  if (currentCourse.value?.requiresPassword) {
    isPasswordModalOpen.value = true
  } else {
    isConfirmEnrollModalOpen.value = true
  }
}

const handlePasswordSubmit = () => {
  if (!enrollmentForm.value.password) {
    toast.error('Password is required', {
      description: 'Please enter the course password.'
    })
    return
  }
  isPasswordModalOpen.value = false
  isConfirmEnrollModalOpen.value = true
}

const confirmEnrollment = async () => {
  try {
    const requestBody: {
      c_id: string;
      password?: string;
      role?: 'STUDENT' | 'INSTRUCTOR' | 'TA';
    } = {
      c_id: courseId,
    }
    
    // Add password if required
    if (currentCourse.value?.requiresPassword) {
      requestBody.password = enrollmentForm.value.password
    }
    
    // Add role selection for admins
    if (user.value?.role === 'ADMIN') {
      requestBody.role = enrollmentForm.value.selectedRole
    }

    const response = await $fetch<EnrollResponse>(`${backendURL}/v0/enrollments/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    })
    
    if (response.success) {
      toast.success('Successfully enrolled in course!', {
        description: 'You may now access course materials, labs, and exams. Have fun!'
      })
      
      // Refresh course data to update enrollment status
      await fetchCourse(courseId)
      
      // Force refresh the course role state by re-fetching enrollment status
      try {
        const enrollmentResponse = await $fetch<{
          success: boolean;
          enrollment: {
            isEnrolled: boolean;
            role: "STUDENT" | "INSTRUCTOR" | "TA";
            enrollmentDate: string;
          };
        }>(`${backendURL}/v0/enrollments/status/${courseId}`, {
          method: "GET",
          credentials: "include",
        });

        if (enrollmentResponse?.success) {
          courseRoleState.value = {
            courseId,
            isEnrolled: enrollmentResponse.enrollment.isEnrolled,
            role: enrollmentResponse.enrollment.role,
            enrollmentDate: enrollmentResponse.enrollment.enrollmentDate
          };
          
          // Fetch labs after enrollment confirmation
          await fetchCourseLabs(courseId)
        }
      } catch (err) {
        console.error("Error refreshing course role:", err);
      }
      
      // Reset form and close modals
      enrollmentForm.value.password = ''
      enrollmentForm.value.selectedRole = 'STUDENT'
      isConfirmEnrollModalOpen.value = false
    }
  } catch (error) {
    console.error('Failed to enroll in course:', error)
    toast.error('Course password is invalid', {
      description: 'Please check your password and try again.'
    })
  }
}

// Lab management functions
const handleDeleteLab = async (labId: string, labTitle: string) => {
  const confirmed = confirm(`Are you sure you want to delete "${labTitle}"? This action cannot be undone.`)

  if (confirmed) {
    try {
      const success = await deleteLab(labId)

      if (success) {
        toast.success('Lab deleted successfully!', {
          description: `"${labTitle}" has been removed from the course.`
        })

        // Refresh labs data
        await fetchCourseLabs(courseId)
      } else {
        toast.error('Failed to delete lab', {
          description: 'Please try again later.'
        })
      }
    } catch (error) {
      console.error('Failed to delete lab:', error)
      toast.error('Failed to delete lab', {
        description: 'An unexpected error occurred.'
      })
    }
  }
}

// Check if lab/exam is available (not expired)
const isLabAvailable = (lab: any): boolean => {
  if (!lab.availableUntil) return true // No expiration date = always available

  const availableUntil = typeof lab.availableUntil === 'string'
    ? new Date(lab.availableUntil)
    : lab.availableUntil

  return Date.now() < availableUntil.getTime()
}

// Fetch labs when manage dialog opens
watch(isManageModalOpen, (isOpen) => {
  if (isOpen && canManageCourse.value) {
    fetchEnrollmentData()
    // Also fetch labs for management
    fetchCourseLabs(courseId)
  }
})

// Debug logging to check enrollment data
watchEffect(() => {
  console.log('Current course enrollment:', currentCourseEnrollment.value)
  console.log('Is enrolled:', isEnrolled.value)
  console.log('User role:', userRole.value)
  console.log('Can manage course:', canManageCourse.value)
})

// Watch for admin role change modal open to set default value
watch(isAdminRoleChangeModalOpen, (isOpen) => {
  if (isOpen && userRole.value) {
    adminRoleChangeForm.value.selectedRole = userRole.value as 'STUDENT' | 'INSTRUCTOR' | 'TA'
  }
})

// Handle admin role change
const handleAdminRoleChange = async () => {
  if (isChangingAdminRole.value) return
  
  isChangingAdminRole.value = true
  try {
    interface AdminRoleChangeResponse {
      success: boolean
      message: string
      enrollment: {
        u_id: string
        c_id: string
        u_role: string
        enrollmentDate: string
      }
    }
    
    const response = await $fetch<AdminRoleChangeResponse>(`${backendURL}/v0/enrollments/admin/self/${courseId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        newRole: adminRoleChangeForm.value.selectedRole
      }
    })
    
    if (response.success) {
      toast.success('Enrollment role updated!', {
        description: `You are now enrolled as ${adminRoleChangeForm.value.selectedRole}.`
      })
      
      // Refresh course data and enrollment status
      await fetchCourse(courseId)
      
      // Update local course role state
      courseRoleState.value = {
        ...courseRoleState.value!,
        role: adminRoleChangeForm.value.selectedRole
      }
      
      // Refresh labs if now can manage
      if (adminRoleChangeForm.value.selectedRole !== 'STUDENT') {
        await fetchCourseLabs(courseId)
      }
      
      isAdminRoleChangeModalOpen.value = false
    }
  } catch (error) {
    console.error('Failed to change enrollment role:', error)
    const message = (error as any)?.data?.message || (error as Error).message || 'Please try again later.'
    toast.error('Failed to change role', {
      description: message
    })
  } finally {
    isChangingAdminRole.value = false
  }
}
</script>

<template>
    <div class="min-h-screen bg-background">
        <div class="mx-auto p-4 pb-8">
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
                        <BreadcrumbPage>
                            <span v-if="isLoading">Loading...</span>
                            <span v-else>{{ courseTitle }}</span>
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            
            <div v-if="isLoading" class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
            </div>
            
            <div v-else-if="currentCourse" class="space-y-6">
                <!-- Debug info (remove in production)
                <div class="bg-gray-100 p-4 rounded-lg text-sm">
                    <h3 class="font-bold mb-2">Debug Info:</h3>
                    <p>Is Enrolled: {{ isEnrolled }}</p>
                    <p>User Role: {{ userRole }}</p>
                    <p>Can Manage: {{ canManageCourse }}</p>
                    <p>Enrollment Object: {{ JSON.stringify(currentCourseEnrollment) }}</p>
                </div> -->

                <div class="relative">
                    <div class="h-48 rounded-lg overflow-hidden relative">
                        <div class="absolute inset-0 bg-gradient-to-r from-black/90 to-black/50 z-10"/>
                        <img :src="courseBannerUrl" alt="Course banner" class="w-full h-full object-cover opacity-70">
                    </div>
                    <div class="absolute inset-0 p-6 flex flex-col justify-center z-20">
                        <h1 class="text-5xl font-bold mb-2 text-white mix-blend-difference">{{ currentCourse.title }}</h1>
                        <p class="text-xl text-muted-foreground/90 mb-4 mix-blend-difference">{{ currentCourse.description }}</p>
                        <p class="text-sm text-muted-foreground/80 mix-blend-difference">Instructor: {{ currentCourse.instructor }}</p>
                    </div>
                    
                    <!-- Management Action Buttons (Top Right) -->
                    <div v-if="canManageCourse" class="absolute top-4 right-4 z-30 flex space-x-2">
                        <!-- Edit Course Button -->
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            class="flex flex-col items-center h-auto py-2 px-3 bg-white/90 hover:bg-white text-gray-800"
                            @click="isEditModalOpen = true"
                        >
                            <Edit class="h-4 w-4 mb-1" />
                            <span class="text-xs">Edit Course</span>
                        </Button>

                        <!-- Manage Labs/Exams Button -->
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            class="flex flex-col items-center h-auto py-2 px-3 bg-white/90 hover:bg-white text-gray-800"
                            @click="isManageModalOpen = true"
                        >
                            <Settings class="h-4 w-4 mb-1" />
                            <span class="text-xs">Manage Labs/Exams</span>
                        </Button>
                    </div>

                    <!-- Edit Course Modal (New Component) -->
                    <EditCourseModal
                        v-model:open="isEditModalOpen"
                        :course="currentCourse"
                        :show-banner-upload="true"
                        :show-enrollment-management="true"
                        :enrollment-draft="enrollmentDraft"
                        :is-loading-enrollments="isLoadingEnrollments"
                        :is-uploading-banner="isUploadingBanner"
                        :is-saving="isSavingChanges"
                        :can-modify-role-for-user="canModifyRoleForUser"
                        :can-remove-enrollment="canRemoveEnrollment"
                        @save="handleEditCourseSave"
                        @cancel="handleEditCourseCancel"
                        @banner-change="handleFileChange"
                        @role-change="handleRoleChange"
                        @toggle-removal="toggleRemoval"
                        @confirm-changes="applyChanges"
                    />

                    <!-- Manage Labs/Exams Modal (New Component) -->
                    <ManageLabsExamsModal
                        v-model:open="isManageModalOpen"
                        :course-id="courseId"
                        :labs="availableLabs"
                        :exams="availableExams"
                        :is-loading="isLoadingLabs"
                        @delete-lab="handleDeleteLab"
                        @delete-exam="handleDeleteLab"
                        @lab-duplicated="fetchCourseLabs(courseId)"
                    />

                    <!-- Enrollment Button (Bottom Right) -->
                    <div v-if="!isEnrolled && userRole !== 'INSTRUCTOR'" class="absolute bottom-4 right-4 z-30">
                        <Button class="bg-primary hover:bg-primary/90 text-white" @click="enrollStudent">
                            Enroll in Course
                        </Button>
                    </div>
                    <div v-else-if="isEnrolled" class="absolute bottom-4 right-4 z-30 flex items-center gap-2">
                        <div class="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                            ✓ Enrolled as {{ userRole }}
                        </div>
                        <!-- Admin Role Change Button -->
                        <Button 
                            v-if="user?.role === 'ADMIN'" 
                            variant="secondary" 
                            size="sm"
                            class="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                            @click="isAdminRoleChangeModalOpen = true"
                        >
                            <UserCog class="h-4 w-4" />
                            <span>Change Role</span>
                        </Button>
                    </div>
                </div>
                
                <!-- Password Modal -->
                <Dialog v-model:open="isPasswordModalOpen">
                    <DialogContent class="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Course Password Required</DialogTitle>
                        </DialogHeader>
                        <div class="space-y-4">
                            <p class="text-muted-foreground">This course requires a password to enroll.</p>
                            <div>
                                <Label for="course-password">Password</Label>
                                <Input 
                                    id="course-password" 
                                    v-model="enrollmentForm.password" 
                                    type="password" 
                                    placeholder="Enter course password"
                                    class="mt-2"
                                />
                            </div>
                            <!-- Role selection for admins -->
                            <div v-if="user?.role === 'ADMIN'">
                                <Label for="enrollment-role" class="mb-2">Enroll as</Label>
                                <Select v-model="enrollmentForm.selectedRole">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent class="mt-2">
                                        <SelectItem value="STUDENT">Student</SelectItem>
                                        <SelectItem value="TA">Teaching Assistant (TA)</SelectItem>
                                        <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-2">
                            <Button variant="outline" @click="isPasswordModalOpen = false">Cancel</Button>
                            <Button @click="handlePasswordSubmit">Continue</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <!-- Confirmation Modal -->
                <Dialog v-model:open="isConfirmEnrollModalOpen">
                    <DialogContent class="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Confirm Enrollment</DialogTitle>
                        </DialogHeader>
                        <div class="space-y-4">
                            <p class="text-muted-foreground">
                                Are you sure you want to enroll in <strong>{{ currentCourse?.title }}</strong>?
                            </p>
                            <!-- Role selection for admins (if no password required) -->
                            <div v-if="user?.role === 'ADMIN' && !currentCourse?.requiresPassword">
                                <Label for="enrollment-role-confirm" class="mb-2">Enroll as</Label>
                                <Select v-model="enrollmentForm.selectedRole">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STUDENT">Student</SelectItem>
                                        <SelectItem value="TA">Teaching Assistant (TA)</SelectItem>
                                        <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div v-if="user?.role === 'ADMIN'" class="text-sm text-muted-foreground">
                                You will be enrolled as: <strong>{{ enrollmentForm.selectedRole }}</strong>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-2">
                            <Button variant="outline" @click="isConfirmEnrollModalOpen = false">Cancel</Button>
                            <Button @click="confirmEnrollment">Confirm Enrollment</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <!-- Admin Role Change Modal -->
                <Dialog v-model:open="isAdminRoleChangeModalOpen">
                    <DialogContent class="max-w-md">
                        <DialogHeader>
                            <DialogTitle class="flex items-center gap-2">
                                <UserCog class="h-5 w-5 text-amber-600" />
                                Change Enrollment Role
                            </DialogTitle>
                        </DialogHeader>
                        <div class="space-y-4">
                            <p class="text-sm text-muted-foreground">
                                As a global admin, you can change your enrollment role in this course to test different views and permissions.
                            </p>
                            <div class="space-y-2">
                                <Label for="admin-role-select">Select Role</Label>
                                <Select v-model="adminRoleChangeForm.selectedRole">
                                    <SelectTrigger id="admin-role-select">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STUDENT">
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                                Student
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="TA">
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                Teaching Assistant (TA)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="INSTRUCTOR">
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                                Instructor
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div class="text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
                                <strong>Note:</strong> This will change your access level for this course. Changing to Student will hide management features.
                            </div>
                        </div>
                        <div class="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" @click="isAdminRoleChangeModalOpen = false">Cancel</Button>
                            <Button 
                                class="bg-amber-600 hover:bg-amber-700 text-white"
                                :disabled="isChangingAdminRole || adminRoleChangeForm.selectedRole === userRole"
                                @click="handleAdminRoleChange"
                            >
                                <Loader2 v-if="isChangingAdminRole" class="h-4 w-4 mr-2 animate-spin" />
                                {{ isChangingAdminRole ? 'Changing...' : 'Change Role' }}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
                
                <div class="flex">
                    <Accordion type="single" collapsible class="w-full">
                        <!-- Labs Section -->
                        <AccordionItem value="labs">
                            <AccordionTrigger>
                                <div class="flex items-center space-x-2">
                                    <BookOpen class="w-5 h-5" />
                                    <span>Labs</span>
                                    <div v-if="availableLabs.length > 0" class="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                                        {{ availableLabs.length }}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <!-- Loading State -->
                                <div v-if="isLoadingLabs" class="flex items-center justify-center py-8">
                                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                    <span class="ml-3 text-muted-foreground">Loading labs...</span>
                                </div>
                                
                                <!-- Error State -->
                                <div v-else-if="labsError" class="text-center py-8">
                                    <div class="text-destructive mb-2">Failed to load labs</div>
                                    <Button variant="outline" size="sm" @click="fetchCourseLabs(courseId)">
                                        Try Again
                                    </Button>
                                </div>
                                
                                <!-- Labs List -->
                                <div v-else-if="availableLabs.length > 0" class="space-y-3">
                                    <Card
                                        v-for="lab in availableLabs"
                                        :key="lab.id"
                                        :class="[
                                          'hover:shadow-md transition-shadow duration-200 border-l-4',
                                          (isLabAvailable(lab) || canManageCourse) ? 'border-l-primary/50' : 'border-l-gray-300 opacity-60'
                                        ]"
                                    >
                                        <CardContent class="p-2">
                                            <div class="flex items-start justify-between">
                                                <div class="flex-1 min-w-0">
                                                    <div class="flex items-start space-x-3">
                                                        <div class="flex-shrink-0 mt-1">
                                                            <div
                                                              :class="[
                                                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                                                isLabAvailable(lab) ? 'bg-primary/10' : 'bg-gray-100'
                                                              ]"
                                                            >
                                                                <BookOpen
                                                                  :class="[
                                                                    'w-5 h-5',
                                                                    isLabAvailable(lab) ? 'text-primary' : 'text-gray-400'
                                                                  ]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div class="flex-1 min-w-0">
                                                            <div class="flex items-center gap-2">
                                                              <h3 class="font-semibold text-lg text-foreground mb-1 truncate">
                                                                  {{ lab.title }}
                                                              </h3>
                                                              <span
                                                                v-if="!isLabAvailable(lab)"
                                                                class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full font-medium"
                                                              >
                                                                Expired
                                                              </span>
                                                            </div>
                                                            <p v-if="lab.description" class="text-muted-foreground text-sm mb-3 line-clamp-2">
                                                                {{ lab.description }}
                                                            </p>
                                                            <div class="flex items-center space-x-4 text-xs text-muted-foreground">
                                                                <div class="flex items-center space-x-1">
                                                                    <Calendar class="w-3 h-3" />
                                                                    <span>Created {{ formatLabDate(lab.createdAt) }}</span>
                                                                </div>
                                                                <div class="flex items-center space-x-1">
                                                                    <Clock class="w-3 h-3" />
                                                                    <span>Updated {{ formatLabDate(lab.updatedAt) }}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
                                                    <!-- View Submissions button (students only) -->
                                                    <NuxtLink
                                                      v-if="isLabAvailable(lab) && !canManageCourse"
                                                      :to="`/courses/${courseId}/labs/${lab.id}/submissions`"
                                                    >
                                                        <Button variant="outline" size="icon" class="w-full px-4" title="View Submissions">
                                                            <History class="w-4 h-4" />
                                                            Submissions
                                                        </Button>
                                                    </NuxtLink>
                                                    <NuxtLink
                                                      v-if="isLabAvailable(lab) || canManageCourse"
                                                      :to="canManageCourse ? `/courses/${courseId}/labs/${lab.id}/status` : `/courses/${courseId}/labs/${lab.id}`"
                                                    >
                                                        <Button class="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-sm">
                                                            <component :is="canManageCourse ? BarChart3 : Play" class="w-4 h-4 mr-2" />
                                                            {{ canManageCourse ? 'Lab Status' : 'Start Lab' }}
                                                        </Button>
                                                    </NuxtLink>
                                                    <Button
                                                      v-else
                                                      disabled
                                                      variant="outline"
                                                      class="bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                                    >
                                                        <X class="w-4 h-4 mr-2" />
                                                        Unavailable
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                
                                <!-- Empty State -->
                                <div v-else class="text-center py-12">
                                    <div class="max-w-md mx-auto">
                                        <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                            <BookOpen class="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 class="text-lg font-medium text-foreground mb-2">No Labs Available</h3>
                                        <p class="text-muted-foreground mb-4">
                                            There are no labs created for this course yet. 
                                            <span v-if="canManageCourse">Check back later or create your first lab.</span>
                                            <span v-else>Check back later for new labs.</span>
                                        </p>
                                        <NuxtLink v-if="canManageCourse" :to="`/courses/${courseId}/labs/create`">
                                            <Button>
                                                <Plus class="w-4 h-4 mr-2" />
                                                Create First Lab
                                            </Button>
                                        </NuxtLink>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        
                        <!-- Exams Section -->
                        <AccordionItem value="exams">
                            <AccordionTrigger>
                                <div class="flex items-center space-x-2">
                                    <Settings class="w-5 h-5" />
                                    <span>Exams</span>
                                    <div v-if="availableExams.length > 0" class="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                                        {{ availableExams.length }}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <!-- Loading State -->
                                <div v-if="isLoadingLabs" class="flex items-center justify-center py-8">
                                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                    <span class="ml-3 text-muted-foreground">Loading exams...</span>
                                </div>
                                
                                <!-- Exams List -->
                                <div v-else-if="availableExams.length > 0" class="space-y-3">
                                    <Card
                                        v-for="exam in availableExams"
                                        :key="exam.id"
                                        :class="[
                                          'hover:shadow-md transition-shadow duration-200 border-l-4',
                                          isLabAvailable(exam) ? 'border-l-orange-500/50' : 'border-l-gray-300 opacity-60'
                                        ]"
                                    >
                                        <CardContent class="p-2">
                                            <div class="flex items-start justify-between">
                                                <div class="flex-1 min-w-0">
                                                    <div class="flex items-start space-x-3">
                                                        <div class="flex-shrink-0 mt-1">
                                                            <div
                                                              :class="[
                                                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                                                isLabAvailable(exam) ? 'bg-orange-100' : 'bg-gray-100'
                                                              ]"
                                                            >
                                                                <Settings
                                                                  :class="[
                                                                    'w-5 h-5',
                                                                    isLabAvailable(exam) ? 'text-orange-600' : 'text-gray-400'
                                                                  ]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div class="flex-1 min-w-0">
                                                            <div class="flex items-center gap-2">
                                                              <h3 class="font-semibold text-lg text-foreground mb-1 truncate">
                                                                  {{ exam.title }}
                                                              </h3>
                                                              <span
                                                                v-if="!isLabAvailable(exam)"
                                                                class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full font-medium"
                                                              >
                                                                Expired
                                                              </span>
                                                            </div>
                                                            <p v-if="exam.description" class="text-muted-foreground text-sm mb-3 line-clamp-2">
                                                                {{ exam.description }}
                                                            </p>
                                                            <div class="flex items-center space-x-4 text-xs text-muted-foreground">
                                                                <div class="flex items-center space-x-1">
                                                                    <Calendar class="w-3 h-3" />
                                                                    <span>Created {{ formatLabDate(exam.createdAt) }}</span>
                                                                </div>
                                                                <div class="flex items-center space-x-1">
                                                                    <Clock class="w-3 h-3" />
                                                                    <span>Updated {{ formatLabDate(exam.updatedAt) }}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="flex-shrink-0 ml-4">
                                                    <NuxtLink
                                                      v-if="isLabAvailable(exam)"
                                                      :to="`/courses/${courseId}/exams/${exam.id}`"
                                                    >
                                                        <Button variant="outline" class="border-orange-200 text-orange-700 hover:bg-orange-50">
                                                            <Play class="w-4 h-4 mr-2" />
                                                            Start Exam
                                                        </Button>
                                                    </NuxtLink>
                                                    <Button
                                                      v-else
                                                      disabled
                                                      variant="outline"
                                                      class="bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                                    >
                                                        <X class="w-4 h-4 mr-2" />
                                                        Unavailable
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                
                                <!-- Empty State -->
                                <div v-else class="text-center py-12">
                                    <div class="max-w-md mx-auto">
                                        <div class="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Settings class="w-8 h-8 text-orange-400" />
                                        </div>
                                        <h3 class="text-lg font-medium text-foreground mb-2">No Exams Available</h3>
                                        <p class="text-muted-foreground mb-4">
                                            There are no exams created for this course yet. 
                                            <span v-if="canManageCourse">Check back later or create your first exam.</span>
                                            <span v-else>Check back later for new exams.</span>
                                        </p>
                                        <NuxtLink v-if="canManageCourse" :to="`/courses/${courseId}/exams/create`">
                                            <Button variant="outline" class="border-orange-200 text-orange-700 hover:bg-orange-50">
                                                <Plus class="w-4 h-4 mr-2" />
                                                Create First Exam
                                            </Button>
                                        </NuxtLink>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        
                        <!-- Resources Section -->
                        <AccordionItem value="resources">
                            <AccordionTrigger>Resources</AccordionTrigger>
                            <AccordionContent>
                                <div v-if="currentCourse.resources && currentCourse.resources.length > 0">
                                    <ul class="list-disc pl-5">
                                        <li v-for="(resource, index) in currentCourse.resources" :key="index">{{ resource }}</li>
                                    </ul>
                                </div>
                                <div v-else class="text-center py-6 text-muted-foreground">
                                    <p>No resources have been added to this course yet.</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
            
            <div v-else class="text-center py-12">
                <p class="text-muted-foreground">Course not found</p>
            </div>
        </div>
    </div>
</template>
