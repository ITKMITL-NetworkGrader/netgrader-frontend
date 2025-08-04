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
import { toast } from 'vue-sonner'

interface EnrollmentsResponse{
    success: boolean,
    enrollments: Array<{
        u_id: string,
        c_id: string,
        u_role: "INSTRUCTOR" | "STUDENT" | "TA",
        enrollmentDate: string,
    }>
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
const user = useUserState()

// Reactive data for enrollments (for management purposes)
const enrolledStudents = ref<EnrollmentsResponse['enrollments']>([])
const isLoadingEnrollments = ref(false)

// Use enrollment data from useCourse composable
const isEnrolled = computed(() => {
  return currentCourseEnrollment.value.isEnrolled
})

const userRole = computed(() => {
  return currentCourseEnrollment.value.role || null
})

const canManageCourse = computed(() => {
  return userRole.value === 'INSTRUCTOR' || userRole.value === 'TA'
})

// Modal states
const isEditModalOpen = ref(false)
const isManageModalOpen = ref(false)

// Form data for editing course
const editForm = ref({
  title: '',
  description: '',
  bannerImage: '',
  enrolledStudents: [] as Array<{
    u_id: string,
    c_id: string,
    u_role: "INSTRUCTOR" | "STUDENT" | "TA",
    enrollmentDate: string,
  }>,
  visibility: 'public'
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
    editForm.value.visibility = currentCourse.value.visibility || 'public'
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
const saveEditChanges = () => {
  // TODO: Implement save logic
  console.log('Saving changes:', editForm.value)
  isEditModalOpen.value = false
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
  
  try {
    const response = await $fetch<EnrollResponse>(`${backendURL}/v0/enrollments/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        c_id: courseId,
      }
    })
    if (response.success) {
      toast.success('Successfully enrolled in course!', {
        description: 'You may now access course materials, labs, and exams. Have fun!'
      })
      // Refresh course data to update enrollment status
      await fetchCourse(courseId)
    }
  } catch (error) {
    console.error('Failed to enroll in course:', error)
    toast.error('Failed to enroll in course', {
      description: 'Please try again later or contact support.'
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
        <div class="container mx-auto p-4 pb-8">
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
                        <div class="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent z-10"></div>
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
                            <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle class="text-xl">Edit Course</DialogTitle>
                                </DialogHeader>
                                <div class="space-y-4">
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
                                        <Label class="pb-2" for="course-visibility">Course Visibility</Label>
                                        <div class="flex items-center space-x-4">
                                            <div class="flex items-center space-x-2">
                                                <input
                                                    id="public"
                                                    type="radio"
                                                    value="public"
                                                    v-model="editForm.visibility"
                                                    class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                                                />
                                                <Label for="public" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Public
                                                </Label>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <input
                                                    id="private"
                                                    type="radio"
                                                    value="private"
                                                    v-model="editForm.visibility"
                                                    class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                                                />
                                                <Label for="private" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Private
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label class="pb-2">Enrolled Students</Label>
                                        <div v-if="isLoadingEnrollments" class="flex items-center justify-center py-8">
                                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        </div>
                                        <div v-else-if="editForm.enrolledStudents && editForm.enrolledStudents.length > 0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead>Student ID</TableHead>
                                                        <TableHead>Role</TableHead>
                                                        <TableHead>Enrolled Date</TableHead>
                                                        <TableHead class="w-[100px]">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow v-for="student in editForm.enrolledStudents" :key="student.u_id">
                                                        <TableCell>{{ student.name || 'N/A' }}</TableCell>
                                                        <TableCell>{{ student.studentId || student.u_id }}</TableCell>
                                                        <TableCell>
                                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                                  :class="{
                                                                    'bg-blue-100 text-blue-800': student.u_role === 'STUDENT',
                                                                    'bg-green-100 text-green-800': student.u_role === 'INSTRUCTOR',
                                                                    'bg-yellow-100 text-yellow-800': student.u_role === 'TA'
                                                                  }">
                                                                {{ student.u_role }}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {{ new Date(student.enrollmentDate).toLocaleDateString() }}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="destructive" size="sm" @click="removeStudent(student.u_id)" 
                                                                    :disabled="student.u_role === 'INSTRUCTOR'">
                                                                <Trash2 class="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div v-else class="text-center py-8 text-muted-foreground border border-dashed border-gray-300 rounded-lg">
                                            <p>No students are currently enrolled in this course.</p>
                                        </div>
                                    </div>
                                    <div class="flex justify-end space-x-2">
                                        <Button variant="outline" @click="isEditModalOpen = false">Cancel</Button>
                                        <Button @click="saveEditChanges">Save Changes</Button>
                                    </div>
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
                                            <Button @click="addLab">
                                                <Plus class="h-4 w-4 mr-2" />
                                                Add Lab
                                            </Button>
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
                                            <Button @click="addExam">
                                                <Plus class="h-4 w-4 mr-2" />
                                                Add Exam
                                            </Button>
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
                        <Button @click="enrollStudent" class="bg-primary hover:bg-primary/90 text-white">
                            Enroll in Course
                        </Button>
                    </div>
                    <div v-else-if="isEnrolled" class="absolute bottom-4 right-4 z-30">
                        <div class="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                            ✓ Enrolled as {{ userRole }}
                        </div>
                    </div>
                </div>
                
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