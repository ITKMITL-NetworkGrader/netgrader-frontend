<script setup lang="ts">
import { ChevronRight, Home, Plus, Edit, Trash2, Users, BookOpen, Calendar, Lock } from 'lucide-vue-next'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'

const config = useRuntimeConfig()
const backendURL = config.public.backendurl
const user = useUserState()

// Type definitions
interface Course {
  _id: string
  title: string
  description: string
  password?: string
  visibility: 'private' | 'public'
  createdAt: string
  enrollmentCount?: number
}

interface EnrollmentResponse {
  success: boolean
  enrollments: Array<{
    u_id: string
    u_role: 'INSTRUCTOR' | 'STUDENT' | 'TA'
    enrollmentDate: string
    fullName: string
  }>
}

interface CoursesResponse {
  courses: Course[]
}

// Modal states
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)

// Course data
const userCourses = ref<Course[]>([])
const totalCourses = ref(0)
const isLoading = ref(false)
const isCreating = ref(false)
const isUpdating = ref(false)

// Form data for creating course
const createForm = ref({
  title: '',
  description: '',
  password: '',
  isPrivate: false
})

// Form data for editing course
const editForm = ref({
  id: '',
  title: '',
  description: '',
  password: '',
  isPrivate: false
})

// Fetch enrollment count for a specific course
const fetchEnrollmentCount = async (courseId: string): Promise<number> => {
  try {
    const response = await $fetch<EnrollmentResponse>(`${backendURL}/v0/enrollments/${courseId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    return response.enrollments?.length || 0
  } catch (error) {
    console.error(`Failed to fetch enrollment count for course ${courseId}:`, error)
    return 0
  }
}

const fetchTotalCourses = async () => {
  try {
    isLoading.value = true
    const response = await $fetch<CoursesResponse>(`${backendURL}/v0/courses`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    totalCourses.value = response.courses.length
    console.log('Response:', response)
    console.log('Total courses fetched:', totalCourses.value)
  }
  catch (error) {
    console.error('Failed to fetch total courses:', error)
    totalCourses.value = 0
  } finally {
    isLoading.value = false
  }
}

// Fetch user's courses
const fetchUserCourses = async () => {
  try {
    isLoading.value = true
    const response = await $fetch<CoursesResponse>(`${backendURL}/v0/courses/created`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    const courses = response.courses || []
    
    // Fetch enrollment count for each course
    const coursesWithEnrollments = await Promise.all(
      courses.map(async (course: Course) => {
        const enrollmentCount = await fetchEnrollmentCount(course._id)
        return {
          ...course,
          enrollmentCount
        }
      })
    )
    
    userCourses.value = coursesWithEnrollments
  } catch (error) {
    console.error('Failed to fetch user courses:', error)
    userCourses.value = []
  } finally {
    isLoading.value = false
  }
}

// Create new course
const createCourse = async () => {
  try {
    isCreating.value = true
    
    const courseData = {
      title: createForm.value.title,
      description: createForm.value.description,
      password: createForm.value.password,
      visibility: createForm.value.isPrivate ? 'private' : 'public'
    }
    await $fetch(`${backendURL}/v0/courses`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: courseData
    })

    toast.success('Course created successfully!', {
      description: 'Your new course is ready for students.'
    })

    // Reset form and close modal
    createForm.value = {
      title: '',
      description: '',
      password: '',
      isPrivate: false
    }
    isCreateModalOpen.value = false
    
    // Refresh courses list
    await fetchTotalCourses()
    await fetchUserCourses()
  } catch (error) {
    console.error('Failed to create course:', error)
    toast.error('Failed to create course', {
      description: 'Please try again later.'
    })
  } finally {
    isCreating.value = false
  }
}

// Update course
const updateCourse = async () => {
  console.log(editForm.value.id)
  try {
    isUpdating.value = true
    
    const courseData = {
      title: editForm.value.title,
      description: editForm.value.description,
      password: editForm.value.password,
      visibility: editForm.value.isPrivate ? 'private' : 'public'
    }
    await $fetch(`${backendURL}/v0/courses/${editForm.value.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: courseData
    })

    toast.success('Course updated successfully!', {
      description: 'Your changes have been saved.'
    })

    isEditModalOpen.value = false
    await fetchUserCourses()
  } catch (error) {
    console.error('Failed to update course:', error)
    toast.error('Failed to update course', {
      description: 'Please try again later.'
    })
  } finally {
    isUpdating.value = false
  }
}

// Delete course
const deleteCourse = async (courseId: string, courseName: string) => {
  if (!confirm(`Are you sure you want to delete "${courseName}"? This action cannot be undone.`)) {
    return
  }

  try {
    await $fetch(`${backendURL}/v0/courses/${courseId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    toast.success('Course deleted successfully!', {
      description: 'The course has been permanently removed.'
    })

    await fetchTotalCourses()
    await fetchUserCourses()
  } catch (error) {
    console.error('Failed to delete course:', error)
    toast.error('Failed to delete course', {
      description: 'Please try again later.'
    })
  }
}

// Open edit modal with course data
const openEditModal = (course: any) => {
  editForm.value = {
    id: course._id,
    title: course.title,
    description: course.description,
    password: course.password || '',
    isPrivate: course.visibility === 'private'
  }
  isEditModalOpen.value = true
}

// Navigate to course
const navigateToCourse = (courseId: string) => {
  navigateTo(`/courses/${courseId}`)
}

// Fetch courses on mount
onMounted(() => {
  fetchTotalCourses()
  fetchUserCourses()
})
</script>
<template>
  <div class="min-h-screen bg-background p-4 pb-8">
    <Breadcrumb class="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <NuxtLink to="/">
            <Home class="h-4 w-4" />
          </NuxtLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight class="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Manage</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <div class="max-w-7xl mx-auto">
      <h1 class="text-5xl font-bold mb-1">Course Management</h1>
      <p class="text-xl text-muted-foreground mb-8">Create, edit, and manage your courses</p>

      <!-- My Courses Card -->
      <div class="grid gap-6 mb-8">
        <Card class="bg-gradient-to-r from-popover to-white  border-primary-800">
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="flex items-center gap-2 text-2xl">
                  <BookOpen class="h-6 w-6 text-blue-400" />
                  My Courses
                </CardTitle>
                <CardDescription class="text-lg">
                  You have {{ userCourses.length }} course{{ userCourses.length !== 1 ? 's' : '' }} created
                </CardDescription>
              </div>
              <div class="text-right">
                <div class="text-3xl font-bold text-blue-400">{{ totalCourses }}</div>
                <div v-if="totalCourses > 1" class="text-sm text-muted-foreground">Total Courses</div>
                <div v-else class="text-sm text-muted-foreground">Total Course</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex gap-3">
              <!-- Create Course Button -->
              <Dialog v-model:open="isCreateModalOpen">
                <DialogTrigger as-child>
                  <Button class="bg-primary">
                    <Plus class="h-4 w-4 mr-2" />
                    Create New Course
                  </Button>
                </DialogTrigger>
                <DialogContent class="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle class="text-xl">Create New Course</DialogTitle>
                  </DialogHeader>
                  <div class="space-y-4">
                    <div>
                      <Label for="create-title">Course Title</Label>
                      <Input
                        id="create-title"
                        v-model="createForm.title"
                        placeholder="Enter course title"
                        class="mt-2"
                      />
                    </div>
                    <div>
                      <Label for="create-description">Course Description</Label>
                      <Textarea
                        id="create-description"
                        v-model="createForm.description"
                        placeholder="Enter course description"
                        rows="3"
                        class="mt-2"
                      />
                    </div>
                    <div>
                      <Label for="create-password">Course Password (Optional)</Label>
                      <Input
                        id="create-password"
                        v-model="createForm.password"
                        type="password"
                        placeholder="Enter course password"
                        class="mt-2"
                      />
                      <p class="text-xs text-muted-foreground mt-1">
                        Leave empty if you don't want to require a password for enrollment
                      </p>
                    </div>
                    <div>
                      <Label class="mb-2">Course Visibility</Label>
                      <div class="flex items-center space-x-3">
                        <Label for="create-visibility" class="text-sm font-medium">
                          Make Private
                        </Label>
                        <Switch
                          id="create-visibility"
                          v-model="createForm.isPrivate"
                        />
                        <span class="text-xs text-muted-foreground">
                          {{ createForm.isPrivate ? 'Only enrolled students can see this course' : 'Anyone can see this course' }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" @click="isCreateModalOpen = false">Cancel</Button>
                    <Button :disabled="isCreating || !createForm.title" @click="createCourse">
                      {{ isCreating ? 'Creating...' : 'Create Course' }}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" :disabled="isLoading" @click="fetchUserCourses">
                {{ isLoading ? 'Refreshing...' : 'Refresh Courses' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Courses List -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>

      <div v-else-if="userCourses.length === 0" class="text-center py-12">
        <BookOpen class="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 class="text-xl font-semibold mb-2">No courses created yet</h3>
        <p class="text-muted-foreground mb-4">Create your first course to get started!</p>
        <Button @click="isCreateModalOpen = true">
          <Plus class="h-4 w-4 mr-2" />
          Create Your First Course
        </Button>
      </div>

      <div v-else class="grid gap-4">
        <h2 class="text-2xl font-semibold mb-4">Your Courses</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            v-for="course in userCourses"
            :key="course._id"
            class="hover:shadow-lg transition-shadow cursor-pointer"
            aria-describedby="course-card"
          >
            <CardHeader @click="navigateToCourse(course._id)">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <CardTitle class="text-lg line-clamp-2">{{ course.title }}</CardTitle>
                  <CardDescription class="line-clamp-2 mt-1">
                    {{ course.description }}
                  </CardDescription>
                </div>
                <div class="flex flex-col items-end space-y-1">
                  <Badge :variant="course.visibility === 'private' ? 'secondary' : 'default'">
                    <Lock v-if="course.visibility === 'private'" class="h-3 w-3 mr-1" />
                    {{ course.visibility === 'private' ? 'Private' : 'Public' }}
                  </Badge>
                  <Badge v-if="course.password" variant="outline" class="text-xs">
                    Password Protected
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div class="flex items-center gap-4">
                  <span v-if="course.enrollmentCount > 1" class="flex items-center gap-1">
                    <Users class="h-4 w-4" />
                    {{ course.enrollmentCount || 0 }} students
                  </span>
                  <span v-else class="flex items-center gap-1">
                    <Users class="h-4 w-4" />
                    {{ course.enrollmentCount || 0 }} student
                  </span>
                  <span class="flex items-center gap-1">
                    <Calendar class="h-4 w-4" />
                    {{ new Date(course.createdAt).toLocaleDateString() }}
                  </span>
                </div>
              </div>
              <div class="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  @click.stop="openEditModal(course)"
                >
                  <Edit class="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  @click.stop="deleteCourse(course._id, course.title)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Edit Course Modal -->
      <Dialog v-model:open="isEditModalOpen">
        <DialogContent class="max-w-2xl">
          <DialogHeader>
            <DialogTitle class="text-xl">Edit Course</DialogTitle>
          </DialogHeader>
          <div class="space-y-4">
            <div>
              
              <Label for="edit-title">Course Title</Label>
              <Input
                id="edit-title"
                v-model="editForm.title"
                placeholder="Enter course title"
                class="mt-2"
              />
            </div>
            <div>
              <Label for="edit-description">Course Description</Label>
              <Textarea
                id="edit-description"
                v-model="editForm.description"
                placeholder="Enter course description"
                rows="3"
                class="mt-2"
              />
            </div>
            <div>
              <Label for="edit-password">Course Password (Optional)</Label>
              <Input
                id="edit-password"
                v-model="editForm.password"
                type="password"
                placeholder="Enter course password"
                class="mt-2"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Leave empty if you don't want to require a password for enrollment
              </p>
            </div>
            <div>
              <Label class="mb-2">Course Visibility</Label>
              <div class="flex items-center space-x-3">
                <Label for="edit-visibility" class="text-sm font-medium">
                  Make Private
                </Label>
                <Switch
                  id="edit-visibility"
                  v-model="editForm.isPrivate"
                />
                <span class="text-xs text-muted-foreground">
                  {{ editForm.isPrivate ? 'Only enrolled students can see this course' : 'Anyone can see this course' }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-2 pt-4">
            <Button variant="outline" @click="isEditModalOpen = false">Cancel</Button>
            <Button :disabled="isUpdating || !editForm.title" @click="updateCourse">
              {{ isUpdating ? 'Updating...' : 'Update Course' }}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>