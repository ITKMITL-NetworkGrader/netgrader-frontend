<script setup lang="ts">
import { ChevronRight, ChevronUp, Home, Plus, Edit, Trash2, Users, BookOpen, Calendar, Lock, FileCode2, RefreshCw, Eye, ArrowRight, Sparkles } from 'lucide-vue-next'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

interface TaskTemplate {
  id: string
  templateId: string
  name: string
  description: string
  source: 'mongo' | 'minio'
  category?: string
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

interface TemplatesResponse {
  success: boolean
  data: {
    templates: TaskTemplate[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
    }
  }
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

// Task Template data
const taskTemplates = ref<TaskTemplate[]>([])
const totalTemplates = ref(0)
const isLoadingTemplates = ref(false)
const showAllTemplates = ref(false)

// Refresh animation states
const isRefreshingCourses = ref(false)
const isRefreshingTemplates = ref(false)

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

// Fetch task templates
const fetchTaskTemplates = async () => {
  try {
    isLoadingTemplates.value = true
    const response = await $fetch<TemplatesResponse>(`${backendURL}/v0/task-templates`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    if (response.success && response.data) {
      taskTemplates.value = response.data.templates || []
      totalTemplates.value = response.data.pagination?.totalItems || taskTemplates.value.length
    }
  } catch (error) {
    console.error('Failed to fetch task templates:', error)
    taskTemplates.value = []
    totalTemplates.value = 0
  } finally {
    isLoadingTemplates.value = false
  }
}

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

// Get template category badge variant
const getTemplateCategoryBadge = (source: string) => {
  return source === 'minio' ? 'secondary' : 'outline'
}

// Refresh courses with spin animation
const refreshCourses = async () => {
  isRefreshingCourses.value = true
  await fetchUserCourses()
  // Keep spinning for at least 500ms for visual feedback
  setTimeout(() => {
    isRefreshingCourses.value = false
  }, 500)
}

// Refresh templates with spin animation
const refreshTemplates = async () => {
  isRefreshingTemplates.value = true
  await fetchTaskTemplates()
  // Keep spinning for at least 500ms for visual feedback
  setTimeout(() => {
    isRefreshingTemplates.value = false
  }, 500)
}

// Fetch courses on mount
onMounted(() => {
  fetchTotalCourses()
  fetchUserCourses()
  fetchTaskTemplates()
})
</script>
<template>
  <div>
    <!-- Navigation Breadcrumb - Sticks below NavigationBar -->
    <div class="border-b bg-background p-4 sticky top-16 z-[150] shadow-sm">
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
            <BreadcrumbPage class="font-medium">Manage</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <div class="p-4 pb-8">
      <h1 class="text-5xl font-bold mb-1">Management Dashboard</h1>
      <p class="text-xl text-muted-foreground mb-4">Manage your courses, templates, and educational content</p>

      <div class="w-full max-w-screen-xl mx-auto">

      <!-- Stats Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <!-- My Courses Card -->
        <Card class="relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group cursor-pointer">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="p-2 bg-blue-500/10 rounded-lg">
                <BookOpen class="h-5 w-5 text-blue-500" />
              </div>
              <Badge variant="secondary" class="text-xs">Courses</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-1">
              <div class="text-3xl font-bold text-foreground">{{ userCourses.length }}</div>
              <CardDescription>
                Your created courses
              </CardDescription>
            </div>
            <div class="mt-4 text-xs text-muted-foreground">
              {{ totalCourses }} total on platform
            </div>
          </CardContent>
        </Card>

        <!-- Task Templates Card -->
        <Card class="relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group cursor-pointer">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="p-2 bg-emerald-500/10 rounded-lg">
                <FileCode2 class="h-5 w-5 text-emerald-500" />
              </div>
              <Badge variant="secondary" class="text-xs">Templates</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-1">
              <div class="text-3xl font-bold text-foreground">{{ totalTemplates }}</div>
              <CardDescription>
                Available task templates
              </CardDescription>
            </div>
            <div class="mt-4 text-xs text-muted-foreground">
              {{ taskTemplates.filter(t => t.source === 'minio').length }} custom templates
            </div>
          </CardContent>
        </Card>

        <!-- Total Students Card -->
        <Card class="relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group cursor-pointer">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="p-2 bg-violet-500/10 rounded-lg">
                <Users class="h-5 w-5 text-violet-500" />
              </div>
              <Badge variant="secondary" class="text-xs">Students</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-1">
              <div class="text-3xl font-bold text-foreground">
                {{ userCourses.reduce((acc, course) => acc + (course.enrollmentCount || 0), 0) }}
              </div>
              <CardDescription>
                Total enrolled students
              </CardDescription>
            </div>
            <div class="mt-4 text-xs text-muted-foreground">
              Across all your courses
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Courses Section (2 columns) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- My Courses Management Card -->
          <Card class="border-border/50">
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle class="flex items-center gap-2 text-xl">
                    <BookOpen class="h-5 w-5 text-blue-500" />
                    My Courses
                  </CardTitle>
                  <CardDescription>
                    Create and manage your courses
                  </CardDescription>
                </div>
                <div class="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="ghost" size="icon" :disabled="isLoading || isRefreshingCourses" @click="refreshCourses">
                          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isRefreshingCourses }" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh courses</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <!-- Create Course Button -->
                  <Dialog v-model:open="isCreateModalOpen">
                    <DialogTrigger as-child>
                      <Button class="bg-primary hover:bg-primary/90">
                        <Plus class="h-4 w-4 mr-2" />
                        Create Course
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <!-- Loading State -->
              <div v-if="isLoading" class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>

              <!-- Empty State -->
              <div v-else-if="userCourses.length === 0" class="text-center py-12">
                <BookOpen class="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 class="text-lg font-semibold mb-2">No courses created yet</h3>
                <p class="text-muted-foreground mb-4 text-sm">Create your first course to get started!</p>
                <Button @click="isCreateModalOpen = true">
                  <Plus class="h-4 w-4 mr-2" />
                  Create Your First Course
                </Button>
              </div>

              <!-- Courses Grid -->
              <div v-else class="grid gap-4 md:grid-cols-2">
                <Card
                  v-for="course in userCourses"
                  :key="course._id"
                  class="group hover:border-primary/30 transition-all duration-200 cursor-pointer"
                  aria-describedby="course-card"
                >
                  <CardHeader class="pb-2" @click="navigateToCourse(course._id)">
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <CardTitle class="text-base line-clamp-1 group-hover:text-primary transition-colors">
                          {{ course.title }}
                        </CardTitle>
                        <CardDescription class="line-clamp-2 mt-1 text-xs">
                          {{ course.description }}
                        </CardDescription>
                      </div>
                      <div class="flex flex-col items-end gap-1 ml-2">
                        <Badge :variant="course.visibility === 'private' ? 'secondary' : 'default'" class="text-xs">
                          <Lock v-if="course.visibility === 'private'" class="h-3 w-3 mr-1" />
                          {{ course.visibility === 'private' ? 'Private' : 'Public' }}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div class="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div class="flex items-center gap-3">
                        <span class="flex items-center gap-1">
                          <Users class="h-3 w-3" />
                          {{ course.enrollmentCount || 0 }}
                        </span>
                        <span class="flex items-center gap-1">
                          <Calendar class="h-3 w-3" />
                          {{ new Date(course.createdAt).toLocaleDateString() }}
                        </span>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        class="flex-1 h-8 text-xs"
                        @click.stop="openEditModal(course)"
                      >
                        <Edit class="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        @click.stop="deleteCourse(course._id, course.title)"
                      >
                        <Trash2 class="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Sidebar (1 column) -->
        <div class="space-y-6">
          <!-- Task Templates Section -->
          <Card class="border-border/50">
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle class="flex items-center gap-2 text-xl">
                    <FileCode2 class="h-5 w-5 text-emerald-500" />
                    Task Templates
                  </CardTitle>
                  <CardDescription>
                    Reusable grading templates
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button variant="ghost" size="icon" :disabled="isLoadingTemplates || isRefreshingTemplates" @click="refreshTemplates">
                        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isRefreshingTemplates }" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh templates</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <!-- Loading State -->
              <div v-if="isLoadingTemplates" class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>

              <!-- Templates List -->
              <div v-else class="space-y-3">
                <div v-if="taskTemplates.length === 0" class="text-center py-8">
                  <FileCode2 class="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p class="text-sm text-muted-foreground mb-4">No templates available</p>
                </div>

                <div v-else>
                  <!-- Template Items (show first 5 or all) -->
                  <div
                    v-for="template in (showAllTemplates ? taskTemplates : taskTemplates.slice(0, 5))"
                    :key="template.id"
                    class="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-sm truncate">{{ template.name }}</div>
                      <div class="text-xs text-muted-foreground truncate">{{ template.description }}</div>
                    </div>
                    <Badge :variant="getTemplateCategoryBadge(template.source)" class="text-xs ml-2 shrink-0">
                      {{ template.source === 'minio' ? 'Custom' : 'Built-in' }}
                    </Badge>
                  </div>

                  <!-- View All / Collapse Link -->
                  <div v-if="taskTemplates.length > 5" class="pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      class="w-full text-xs text-muted-foreground"
                      @click="showAllTemplates = !showAllTemplates"
                    >
                      <Eye v-if="!showAllTemplates" class="h-3 w-3 mr-1" />
                      <ChevronUp v-else class="h-3 w-3 mr-1" />
                      {{ showAllTemplates ? 'Show less' : `View all ${totalTemplates} templates` }}
                    </Button>
                  </div>
                </div>

                <!-- Create Template Button -->
                <div class="pt-4 border-t border-border/50">
                  <NuxtLink to="/manage/templates/create">
                    <Button class="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Plus class="h-4 w-4 mr-2" />
                      Create New Template
                    </Button>
                  </NuxtLink>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Quick Actions Card -->
          <Card class="border-border/50">
            <CardHeader>
              <CardTitle class="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <Button variant="outline" class="w-full justify-start text-sm" @click="isCreateModalOpen = true">
                <Plus class="h-4 w-4 mr-2" />
                New Course
              </Button>
              <NuxtLink to="/manage/templates/create" class="block">
                <Button variant="outline" class="w-full justify-start text-sm">
                  <FileCode2 class="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </NuxtLink>
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
  </div>
</template>