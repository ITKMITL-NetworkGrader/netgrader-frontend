<script setup lang="ts">
import { ChevronRight, Home, Edit, Settings, X, Plus, Trash2, Play, BookOpen, Clock, Calendar, Loader2 } from 'lucide-vue-next'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'vue-sonner'

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

const DEFAULT_BANNER_PLACEHOLDER = 'https://i.pinimg.com/736x/18/e3/ad/18e3ad7a432d41a6e2a57d1523e81c73.jpg'
const ACCEPTED_BANNER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
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

// Enrollment form data
const enrollmentForm = ref({
  password: '',
  selectedRole: 'STUDENT' as 'STUDENT' | 'INSTRUCTOR' | 'TA'
})

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
  } catch (error) {
    console.error('Failed to fetch enrolled students:', error)
    enrolledStudents.value = []
  } finally {
    isLoadingEnrollments.value = false
  }
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
  }
})

// Computed property for course title
const courseTitle = computed(() => {
  return currentCourse.value?.title || `Course ${courseId}`
})

// Methods
const saveEditChanges = async () => {
  try {
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
        'Content-Type': 'application/json',
      },
      body: updateData
    })

    toast.success('Course updated successfully!', {
      description: 'Your changes have been saved.'
    })

    // Refresh course data
    await fetchCourse(courseId)
    isEditModalOpen.value = false
  } catch (error) {
    console.error('Failed to update course:', error)
    toast.error('Failed to update course', {
      description: 'Please try again later.'
    })
  }
}

const removeStudent = (studentId: string) => {
  editForm.value.enrolledStudents = editForm.value.enrolledStudents.filter(s => s.u_id !== studentId)
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
      description: 'Please upload a JPEG, PNG, or WebP image.'
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
</script>

<template>
    <div class="min-h-screen bg-background">
        <!-- Navigation Breadcrumb - Sticks below NavigationBar -->
        <div class="border-b bg-background p-4 sticky top-16 z-[150] shadow-sm mb-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <NuxtLink to="/" class="flex items-center hover:text-primary transition-colors">
                            <Home class="h-4 w-4" />
                        </NuxtLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                        <ChevronRight class="h-4 w-4" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                        <NuxtLink to="/courses" class="hover:text-primary transition-colors">
                            Courses
                        </NuxtLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                        <ChevronRight class="h-4 w-4" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                        <BreadcrumbPage class="font-medium">
                            <span v-if="isLoading">Loading...</span>
                            <span v-else>{{ courseTitle }}</span>
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </div>

        <div class="mx-auto p-4 pb-8">

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
                        <Dialog v-model:open="isEditModalOpen">
                            <DialogTrigger as-child>
                                <Button variant="secondary" size="sm" class="flex flex-col items-center h-auto py-2 px-3 bg-white/90 hover:bg-white text-gray-800">
                                    <Edit class="h-4 w-4 mb-1" />
                                    <span class="text-xs">Edit Course</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent class="min-w-[80vw] max-h-[90vh] overflow-hidden">
                                <DialogHeader>
                                    <DialogTitle class="text-xl">Edit Course</DialogTitle>
                                </DialogHeader>
                                <div
class="space-y-4 overflow-y-auto max-h-[70vh] pr-2"
                                     style="scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground)) transparent;"
                                >
                                    <div>
                                        <Label class="pb-2" for="course-title">Course Name</Label>
                                        <Input id="course-title" v-model="editForm.title" placeholder="Enter course name" />
                                    </div>
                                    <div>
                                        <Label class="pb-2" for="course-description">Course Description</Label>
                                        <Textarea id="course-description" v-model="editForm.description" placeholder="Enter course description" rows="3" />
                                    </div>
                                    <div>
                                        <Label class="pb-2" for="banner-image">Course Banner</Label>
                                        <Input
                                            id="banner-image"
                                            ref="bannerFileInput"
                                            type="file"
                                            accept="image/*"
                                            :disabled="isUploadingBanner"
                                            @change="handleFileChange"
                                        />
                                        <p class="text-xs text-muted-foreground mt-1">
                                            Supported formats: JPEG, PNG, WebP. Maximum size: 10 MB.
                                        </p>
                                        <div v-if="isUploadingBanner" class="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                            <Loader2 class="w-4 h-4 animate-spin" />
                                            Uploading banner...
                                        </div>
                                        <div v-else class="mt-3">
                                            <Label class="text-xs text-muted-foreground uppercase tracking-wide">Current banner preview</Label>
                                            <div class="mt-2 h-32 rounded-md overflow-hidden border border-muted">
                                                <img :src="courseBannerUrl" alt="Current course banner preview" class="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label class="pb-2" for="course-password">Course Password (Optional)</Label>
                                        <Input 
                                            id="course-password" 
                                            v-model="editForm.password" 
                                            type="password" 
                                            placeholder="Enter course password" 
                                        />
                                        <p class="text-xs text-muted-foreground mt-1">
                                            Leave empty if you don't want to require a password for enrollment
                                        </p>
                                    </div>
                                    <div>
                                        <Label class="mb-2" for="course-visibility">Course Visibility</Label>
                                        <div class="flex items-center space-x-3">
                                            <Label for="visibility-switch" class="text-sm font-medium">
                                                {{ editForm.isPrivate ? 'Private' : 'Public' }}
                                            </Label>
                                            <Switch 
                                                id="visibility-switch"
                                                v-model:checked="editForm.isPrivate"
                                            />
                                            <span class="text-xs text-muted-foreground">
                                                {{ editForm.isPrivate ? 'Only enrolled students can see this course' : 'Anyone can see this course' }}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <Label class="pb-2">Enrolled Students</Label>
                                        <div v-if="isLoadingEnrollments" class="flex items-center justify-center py-8">
                                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                        </div>
                                        <div
v-else-if="editForm.enrolledStudents && editForm.enrolledStudents.length > 0" 
                                             class="rounded-lg overflow-hidden">
                                            <div
class="overflow-x-auto max-h-96"
                                                 style="scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground)) transparent;"
                                            >
                                                <Table>
                                                    <TableHeader class="sticky top-0 z-10">
                                                        <TableRow>
                                                            <TableHead class="min-w-[150px]">Name</TableHead>
                                                            <TableHead class="min-w-[120px]">Student ID</TableHead>
                                                            <TableHead class="min-w-[100px]">Role</TableHead>
                                                            <TableHead class="min-w-[120px]">Enrolled Date</TableHead>
                                                            <TableHead class="w-[100px]">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        <TableRow v-for="student in editForm.enrolledStudents" :key="student.u_id">
                                                            <TableCell class="font-medium">{{ student.fullName || 'N/A' }}</TableCell>
                                                            <TableCell>{{ student.u_id }}</TableCell>
                                                            <TableCell>
                                                                <span 
                                                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                                    :class="{
                                                                        'bg-blue-100 text-blue-800': student.u_role === 'STUDENT',
                                                                        'bg-green-100 text-green-800': student.u_role === 'INSTRUCTOR',
                                                                        'bg-yellow-100 text-yellow-800': student.u_role === 'TA'
                                                                    }"
                                                                >
                                                                    {{ student.u_role }}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                {{ new Date(student.enrollmentDate).toLocaleDateString() }}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button 
                                                                    variant="destructive" 
                                                                    size="sm" 
                                                                    :disabled="student.u_role === 'INSTRUCTOR'"
                                                                    @click="removeStudent(student.u_id)"
                                                                >
                                                                    <Trash2 class="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                        <div v-else class="text-center py-8 text-muted-foreground border border-dashed border-gray-300 rounded-lg">
                                            <p>No students are currently enrolled in this course.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                                    <Button variant="outline" @click="isEditModalOpen = false">Cancel</Button>
                                    <Button @click="saveEditChanges">Save Changes</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <!-- Manage Labs/Exams Button -->
                        <Dialog v-model:open="isManageModalOpen">
                            <DialogTrigger as-child>
                                <Button variant="secondary" size="sm" class="flex flex-col items-center h-auto py-2 px-3 bg-white/90 hover:bg-white text-gray-800">
                                    <Settings class="h-4 w-4 mb-1" />
                                    <span class="text-xs">Manage Labs/Exams</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle class="text-xl">Manage Labs & Exams</DialogTitle>
                                </DialogHeader>
                                <Tabs default-value="labs" class="w-full">
                                    <TabsList class="grid w-full grid-cols-2">
                                        <TabsTrigger value="labs">Labs</TabsTrigger>
                                        <TabsTrigger value="exams">Exams</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="labs" class="space-y-4">
                                        <div class="flex justify-between items-center pt-2">
                                            <h3 class="text-lg font-semibold">Course Labs</h3>
                                            <NuxtLink :to="`/courses/${courseId}/labs/create`" class="flex items-center">
                                                <Button>
                                                    <Plus class="h-4 w-4 mr-2" />
                                                    Add Lab
                                                </Button>
                                            </NuxtLink>
                                        </div>
                                        <!-- Loading State -->
                                        <div v-if="isLoadingLabs" class="flex items-center justify-center py-8">
                                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                            <span class="ml-3 text-muted-foreground">Loading labs...</span>
                                        </div>
                                        
                                        <!-- Labs Management List -->
                                        <div v-else-if="availableLabs.length > 0" class="space-y-4">
                                            <Card v-for="lab in availableLabs" :key="lab.id" class="border-l-4 border-l-primary/30">
                                                <CardHeader class="pb-4">
                                                    <div class="flex justify-between items-start">
                                                        <div class="flex-1 min-w-0">
                                                            <CardTitle class="text-base font-semibold mb-1">{{ lab.title }}</CardTitle>
                                                            <CardDescription class="text-sm text-muted-foreground mb-2">
                                                                {{ lab.description || 'No description provided' }}
                                                            </CardDescription>
                                                            <div class="flex items-center space-x-4 text-xs text-muted-foreground">
                                                                <span>Created {{ formatLabDate(lab.createdAt) }}</span>
                                                                <span>•</span>
                                                                <span>Updated {{ formatLabDate(lab.updatedAt) }}</span>
                                                            </div>
                                                        </div>
                                                        <div class="flex space-x-2 ml-4">
                                                            <NuxtLink :to="`/courses/${courseId}/labs/${lab.id}/edit`">
                                                                <Button variant="outline" size="sm" class="h-8">
                                                                    <Edit class="h-3 w-3 mr-1" />
                                                                    Edit
                                                                </Button>
                                                            </NuxtLink>
                                                            <Button 
                                                                variant="destructive" 
                                                                size="sm" 
                                                                class="h-8"
                                                                @click="handleDeleteLab(lab.id, lab.title)"
                                                            >
                                                                <Trash2 class="h-3 w-3 mr-1" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        </div>
                                        
                                        <!-- Empty State -->
                                        <div v-else class="text-center py-8 text-muted-foreground border border-dashed border-gray-300 rounded-lg">
                                            <BookOpen class="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                                            <p class="font-medium mb-1">No labs have been created for this course yet.</p>
                                            <p class="text-sm">Click "Add Lab" to create your first lab.</p>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="exams" class="space-y-4">
                                        <div class="flex justify-between items-center pt-2">
                                            <h3 class="text-lg font-semibold">Course Exams</h3>
                                            <NuxtLink :to="`/courses/${courseId}/exams/create`" class="flex items-center">
                                                <Button>
                                                    <Plus class="h-4 w-4 mr-2" />
                                                    Add Exam
                                                </Button>
                                            </NuxtLink>
                                        </div>
                                        <!-- Loading State -->
                                        <div v-if="isLoadingLabs" class="flex items-center justify-center py-8">
                                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                            <span class="ml-3 text-muted-foreground">Loading exams...</span>
                                        </div>
                                        
                                        <!-- Exams Management List -->
                                        <div v-else-if="availableExams.length > 0" class="space-y-4">
                                            <Card v-for="exam in availableExams" :key="exam.id" class="border-l-4 border-l-orange-500/30">
                                                <CardHeader class="pb-4">
                                                    <div class="flex justify-between items-start">
                                                        <div class="flex-1 min-w-0">
                                                            <CardTitle class="text-base font-semibold mb-1">{{ exam.title }}</CardTitle>
                                                            <CardDescription class="text-sm text-muted-foreground mb-2">
                                                                {{ exam.description || 'No description provided' }}
                                                            </CardDescription>
                                                            <div class="flex items-center space-x-4 text-xs text-muted-foreground">
                                                                <span>Created {{ formatLabDate(exam.createdAt) }}</span>
                                                                <span>•</span>
                                                                <span>Updated {{ formatLabDate(exam.updatedAt) }}</span>
                                                            </div>
                                                        </div>
                                                        <div class="flex space-x-2 ml-4">
                                                            <NuxtLink :to="`/courses/${courseId}/exams/${exam.id}/edit`">
                                                                <Button variant="outline" size="sm" class="h-8">
                                                                    <Edit class="h-3 w-3 mr-1" />
                                                                    Edit
                                                                </Button>
                                                            </NuxtLink>
                                                            <Button 
                                                                variant="destructive" 
                                                                size="sm" 
                                                                class="h-8"
                                                                @click="handleDeleteLab(exam.id, exam.title)"
                                                            >
                                                                <Trash2 class="h-3 w-3 mr-1" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        </div>
                                        
                                        <!-- Empty State -->
                                        <div v-else class="text-center py-8 text-muted-foreground border border-dashed border-gray-300 rounded-lg">
                                            <Settings class="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                                            <p class="font-medium mb-1">No exams have been created for this course yet.</p>
                                            <p class="text-sm">Click "Add Exam" to create your first exam.</p>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <!-- Enrollment Button (Bottom Right) -->
                    <div v-if="!isEnrolled && userRole !== 'INSTRUCTOR'" class="absolute bottom-4 right-4 z-30">
                        <Button class="bg-primary hover:bg-primary/90 text-white" @click="enrollStudent">
                            Enroll in Course
                        </Button>
                    </div>
                    <div v-else-if="isEnrolled" class="absolute bottom-4 right-4 z-30">
                        <div class="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                            ✓ Enrolled as {{ userRole }}
                        </div>
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
                                          isLabAvailable(lab) ? 'border-l-primary/50' : 'border-l-gray-300 opacity-60'
                                        ]"
                                    >
                                        <CardContent class="p-6">
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
                                                <div class="flex-shrink-0 ml-4">
                                                    <!-- Lab Status Button for Instructors/TAs -->
                                                    <NuxtLink
                                                      v-if="canManageCourse && isLabAvailable(lab)"
                                                      :to="`/courses/${courseId}/labs/${lab.id}/status`"
                                                    >
                                                        <Button class="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-secondary-foreground shadow-sm">
                                                            <Users class="w-4 h-4 mr-2" />
                                                            Lab Status
                                                        </Button>
                                                    </NuxtLink>

                                                    <!-- Start Lab Button for Students -->
                                                    <NuxtLink
                                                      v-else-if="!canManageCourse && isLabAvailable(lab)"
                                                      :to="`/courses/${courseId}/labs/${lab.id}`"
                                                    >
                                                        <Button class="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-sm">
                                                            <Play class="w-4 h-4 mr-2" />
                                                            Start Lab
                                                        </Button>
                                                    </NuxtLink>

                                                    <!-- Unavailable Button -->
                                                    <Button
                                                      v-else
                                                      disabled
                                                      variant="outline"
                                                      class="bg-muted text-muted-foreground border-border cursor-not-allowed"
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
                                        <CardContent class="p-6">
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
