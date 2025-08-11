<script setup lang="ts">
import { ChevronRight, Home, Edit, Settings, X, Plus, Trash2 } from 'lucide-vue-next'
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
  bannerImage: '',
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

const addLab = () => {
  // TODO: Implement add lab logic
  console.log('Adding new lab')
}

const addExam = () => {
  // TODO: Implement add exam logic
  console.log('Adding new exam')
}

const handleFileChange = () => {
    // TODO: Implement file upload logic
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
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                        <div class="absolute inset-0 bg-gradient-to-r from-black/90 to-black/50 z-10"></div>
                        <img :src="currentCourse.bannerImage || 'https://i.pinimg.com/736x/18/e3/ad/18e3ad7a432d41a6e2a57d1523e81c73.jpg'" alt="Course banner" class="w-full h-full object-cover opacity-70">
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
                                <div class="space-y-4 overflow-y-auto max-h-[70vh] pr-2"
                                     style="scrollbar-width: thin; scrollbar-color: rgb(203 213 225) transparent;"
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
                                        <Label class="pb-2" for="banner-image">Banner Image URL</Label>
                                        <Input id="banner-image" type="file" accept="image/*" @change="handleFileChange" />
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
                                        <div v-else-if="editForm.enrolledStudents && editForm.enrolledStudents.length > 0" 
                                             class="rounded-lg overflow-hidden">
                                            <div class="overflow-x-auto max-h-96"
                                                 style="scrollbar-width: thin; scrollbar-color: rgb(203 213 225) transparent;"
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
                                        <div class="grid gap-4">
                                            <Card v-for="(lab, index) in currentCourse.labs || []" :key="index">
                                                <CardHeader>
                                                    <div class="flex justify-between items-start">
                                                        <div>
                                                            <CardTitle class="text-base">{{ lab.title || `Lab ${index + 1}` }}</CardTitle>
                                                            <CardDescription>{{ lab.description }}</CardDescription>
                                                        </div>
                                                        <div class="flex space-x-2">
                                                            <Button variant="outline" size="sm">
                                                                <Edit class="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="destructive" size="sm">
                                                                <Trash2 class="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                            <div v-if="!currentCourse.labs || currentCourse.labs.length === 0" class="text-center py-8 text-muted-foreground border border-dashed border-gray-300 rounded-lg">
                                                <p>No labs have been created for this course yet.</p>
                                                <p class="text-sm mt-1">Click "Add Lab" to create your first lab.</p>
                                            </div>
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
                                        <div class="grid gap-4">
                                            <Card v-for="(exam, index) in currentCourse.exams || []" :key="index">
                                                <CardHeader>
                                                    <div class="flex justify-between items-start">
                                                        <div>
                                                            <CardTitle class="text-base">{{ exam.title || `Exam ${index + 1}` }}</CardTitle>
                                                            <CardDescription>{{ exam.description || exam }}</CardDescription>
                                                        </div>
                                                        <div class="flex space-x-2">
                                                            <Button variant="outline" size="sm">
                                                                <Edit class="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="destructive" size="sm">
                                                                <Trash2 class="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                            <div v-if="!currentCourse.exams || currentCourse.exams.length === 0" class="text-center py-8 text-muted-foreground border border-dashed border-gray-300 rounded-lg">
                                                <p>No exams have been created for this course yet.</p>
                                                <p class="text-sm mt-1">Click "Add Exam" to create your first exam.</p>
                                            </div>
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
                        <AccordionItem value="overview">
                            <AccordionTrigger>Labs</AccordionTrigger>
                            <AccordionContent>
                                <p>Gu Young Mai Mee</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="syllabus">
                            <AccordionTrigger>Exams</AccordionTrigger>
                            <AccordionContent>
                                <ul class="list-disc pl-5">
                                    <li v-for="(item, index) in currentCourse.exams" :key="index">{{ item }}</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
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