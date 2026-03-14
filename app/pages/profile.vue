<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronRight, Home, User, Camera, Trash2, Edit2, Save, X, BookOpen, History, ExternalLink } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'vue-sonner'
import { useProfile } from '@/composables/useProfile'
import { useAllSubmissionHistory } from '@/composables/useAllSubmissionHistory'

const { profile, isLoading, isUpdating, error, fetchProfile, updateBio, uploadProfilePicture, deleteProfilePicture } = useProfile()
const { submissions, isLoading: isLoadingSubmissions, fetchAllSubmissions, formatDateTime, getStatusBadge, total, totalPages, currentPage } = useAllSubmissionHistory()

const userState = useUserState()
const config = useRuntimeConfig()
const backendURL = config.public.backendurl

// Profile picture fallback
const PROFILE_FALLBACK = '/profile_fallback.jpg'
const DEFAULT_BANNER_PLACEHOLDER = '/placeholder.avif'

// Get banner URL using proxy endpoint (no expiry)
const getBannerUrl = (path: string | undefined) => {
  if (!path) return DEFAULT_BANNER_PLACEHOLDER
  if (path.startsWith('http')) return path
  return getImageUrl(path, backendURL)
}

// Bio editing state
const isEditingBio = ref(false)
const bioInput = ref('')
const bioMaxLength = 500

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null)

// Enrollments
interface EnrollmentResponse {
  _id: string
  c_id: string
  u_role: 'STUDENT' | 'INSTRUCTOR' | 'TA'
  enrollmentDate: string
}

interface EnrollmentWithCourse extends EnrollmentResponse {
  courseTitle?: string
  bannerUrl?: string
}

import { getImageUrl } from '~/utils/imageUrl'

const enrollments = ref<EnrollmentWithCourse[]>([])
const isLoadingEnrollments = ref(false)

// Fetch enrollments with course info
const fetchEnrollments = async () => {
  isLoadingEnrollments.value = true
  try {
    const response = await $fetch<{ success: boolean; enrollments: EnrollmentResponse[] }>(`${backendURL}/v0/enrollments/me`, {
      method: 'GET',
      credentials: 'include',
    })
    if (response.success && response.enrollments) {
      // Fetch course titles for each enrollment
      const enrichedEnrollments = await Promise.all(
        response.enrollments.map(async (enrollment) => {
          try {
            const courseResponse = await $fetch<{ course: { title: string; bannerUrl?: string } }>(`${backendURL}/v0/courses/${enrollment.c_id}`, {
              method: 'GET',
              credentials: 'include',
            })
            return {
              ...enrollment,
              courseTitle: courseResponse.course?.title,
              bannerUrl: courseResponse.course?.bannerUrl
            }
          } catch {
            return {
              ...enrollment,
              courseTitle: undefined,
              bannerUrl: undefined
            }
          }
        })
      )
      enrollments.value = enrichedEnrollments
    }
  } catch (err) {
    console.error('Error fetching enrollments:', err)
  } finally {
    isLoadingEnrollments.value = false
  }
}

// Profile picture URL with fallback
const profilePictureUrl = computed(() => {
  return profile.value?.profilePicture || PROFILE_FALLBACK
})

// Role badge variant
const getRoleBadge = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return { variant: 'destructive' as const, label: 'Admin' }
    case 'INSTRUCTOR':
      return { variant: 'default' as const, label: 'Instructor' }
    case 'TA':
      return { variant: 'secondary' as const, label: 'Teaching Assistant' }
    default:
      return { variant: 'outline' as const, label: 'Student' }
  }
}

// Start editing bio
const startEditingBio = () => {
  bioInput.value = profile.value?.bio || ''
  isEditingBio.value = true
}

// Cancel editing bio
const cancelEditingBio = () => {
  isEditingBio.value = false
  bioInput.value = ''
}

// Save bio
const saveBio = async () => {
  const result = await updateBio(bioInput.value)
  if (result.success) {
    toast.success('Bio updated successfully')
    isEditingBio.value = false
  } else {
    toast.error(result.message || 'Failed to update bio')
  }
}

// Trigger file input
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// Handle file selection
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Please select a valid image file (JPEG, PNG, WebP, or GIF)')
    return
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('File size must be less than 5MB')
    return
  }

  const result = await uploadProfilePicture(file)
  if (result.success) {
    toast.success('Profile picture updated successfully')
    // Update user state if needed
    if (userState.value && result.url) {
      userState.value.profilePicture = result.url
    }
  } else {
    toast.error(result.message || 'Failed to upload profile picture')
  }

  // Reset file input
  input.value = ''
}

// Delete profile picture
const handleDeleteProfilePicture = async () => {
  const result = await deleteProfilePicture()
  if (result.success) {
    toast.success('Profile picture removed')
    if (userState.value) {
      userState.value.profilePicture = undefined
    }
  } else {
    toast.error(result.message || 'Failed to remove profile picture')
  }
}

// Navigate to course
const goToCourse = (courseId: string) => {
  navigateTo(`/courses/${courseId}`)
}

// Pagination
const currentSubmissionPage = ref(1)
const pageSize = ref(10)

const loadSubmissionsPage = async (page: number) => {
  currentSubmissionPage.value = page
  await fetchAllSubmissions(page, pageSize.value)
}

// Initialize
onMounted(async () => {
  await Promise.all([
    fetchProfile(),
    fetchEnrollments(),
    fetchAllSubmissions(1, pageSize.value)
  ])
})

// Bio character count
const bioCharacterCount = computed(() => bioInput.value.length)
const bioCharacterRemaining = computed(() => bioMaxLength - bioCharacterCount.value)
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Breadcrumb -->
    <div class="border-b bg-background p-4 sticky top-16 z-40 shadow-sm">
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
            <BreadcrumbPage class="font-medium">Profile</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <div class="max-w-6xl mx-auto p-6">
      <!-- Profile Header -->
      <div class="flex flex-col md:flex-row gap-8 mb-8">
        <!-- Profile Picture Section -->
        <div class="flex flex-col items-center">
          <div 
            class="relative group cursor-pointer"
            @click="triggerFileInput"
          >
            <img
              :src="profilePictureUrl"
              alt="Profile picture"
              class="w-40 h-40 rounded-full object-cover border-4 border-border shadow-lg transition-opacity group-hover:opacity-80"
              @error="(e: Event) => (e.target as HTMLImageElement).src = PROFILE_FALLBACK"
            />
            
            <!-- Overlay for editing -->
            <div 
              class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera class="h-8 w-8 text-white" />
            </div>
            
            <!-- Delete button (positioned in corner) -->
            <Button 
              v-if="profile?.profilePicture"
              size="icon" 
              variant="destructive"
              class="absolute -top-1 -right-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              :disabled="isUpdating"
              @click.stop="handleDeleteProfilePicture"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
          
          <!-- Hidden file input -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            class="hidden"
            @change="handleFileSelect"
          />
          
          <p class="text-xs text-muted-foreground mt-2">
            Click to change
          </p>
        </div>

        <!-- Profile Info -->
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold">{{ profile?.fullName || userState?.fullName || 'User' }}</h1>
            <Badge :variant="getRoleBadge(profile?.role || userState?.role || 'STUDENT').variant">
              {{ getRoleBadge(profile?.role || userState?.role || 'STUDENT').label }}
            </Badge>
          </div>
          
          <p class="text-muted-foreground mb-4">{{ profile?.u_id || userState?.u_id }}</p>

          <!-- Bio Section -->
          <div class="mt-4">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-sm font-semibold text-muted-foreground">About</h3>
              <Button 
                v-if="!isEditingBio"
                size="icon" 
                variant="ghost" 
                class="h-6 w-6"
                @click="startEditingBio"
              >
                <Edit2 class="h-3 w-3" />
              </Button>
            </div>
            
            <div v-if="isEditingBio" class="space-y-2">
              <Textarea
                v-model="bioInput"
                placeholder="Write something about yourself..."
                class="min-h-[100px] resize-none"
                :maxlength="bioMaxLength"
              />
              <div class="flex items-center justify-between">
                <span 
                  class="text-xs"
                  :class="bioCharacterRemaining < 50 ? 'text-destructive' : 'text-muted-foreground'"
                >
                  {{ bioCharacterRemaining }} characters remaining
                </span>
                <div class="flex gap-2">
                  <Button size="sm" variant="ghost" @click="cancelEditingBio">
                    <X class="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" :disabled="isUpdating" @click="saveBio">
                    <Save class="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            </div>
            
            <p v-else class="text-sm">
              {{ profile?.bio || 'No bio yet. Click the edit icon to add one.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tabs Section -->
      <Tabs default-value="courses" class="w-full">
        <TabsList class="w-full grid grid-cols-2">
          <TabsTrigger value="courses" class="gap-2">
            <BookOpen class="h-4 w-4" />
            Enrolled Courses
          </TabsTrigger>
          <TabsTrigger value="submissions" class="gap-2">
            <History class="h-4 w-4" />
            Submission History
          </TabsTrigger>
        </TabsList>

        <!-- Enrolled Courses Tab -->
        <TabsContent value="courses" class="mt-6">
          <div v-if="isLoadingEnrollments" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="i in 3" :key="i" class="animate-pulse">
              <div class="bg-muted h-32 rounded-lg" />
            </div>
          </div>

          <div v-else-if="enrollments.length === 0" class="text-center py-12">
            <BookOpen class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold mb-2">No Courses Yet</h3>
            <p class="text-muted-foreground mb-4">You haven't enrolled in any courses.</p>
            <NuxtLink to="/courses">
              <Button>Browse Courses</Button>
            </NuxtLink>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card 
              v-for="enrollment in enrollments" 
              :key="enrollment._id"
              class="cursor-pointer hover:shadow-lg transition-shadow"
              @click="goToCourse(enrollment.c_id)"
            >
              <div v-if="enrollment.bannerUrl" class="h-24 overflow-hidden rounded-t-lg">
                <img
                  :src="getBannerUrl(enrollment.bannerUrl)" 
                  :alt="enrollment.courseTitle || 'Course banner'"
                  class="w-full h-full object-cover"
                  @error="(e: Event) => (e.target as HTMLImageElement).src = DEFAULT_BANNER_PLACEHOLDER"
                />
              </div>
              <div v-else class="h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
                <BookOpen class="h-10 w-10 text-primary/60" />
              </div>
              <CardContent class="p-4">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold truncate">
                      {{ enrollment.courseTitle || `Course ${enrollment.c_id.slice(-6)}` }}
                    </h3>
                  </div>
                  <Badge :variant="getRoleBadge(enrollment.u_role).variant" class="shrink-0">
                    {{ getRoleBadge(enrollment.u_role).label }}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <!-- Submission History Tab -->
        <TabsContent value="submissions" class="mt-6">
          <div v-if="isLoadingSubmissions" class="space-y-3">
            <div v-for="i in 5" :key="i" class="animate-pulse">
              <div class="bg-muted h-16 rounded-lg" />
            </div>
          </div>

          <div v-else-if="submissions.length === 0" class="text-center py-12">
            <History class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold mb-2">No Submissions Yet</h3>
            <p class="text-muted-foreground">Your submission history will appear here.</p>
          </div>

          <div v-else class="space-y-4">
            <!-- Submissions List -->
            <div class="border rounded-lg overflow-hidden">
              <table class="w-full">
                <thead class="bg-muted">
                  <tr>
                    <th class="text-left p-3 text-sm font-medium">Course / Lab</th>
                    <th class="text-left p-3 text-sm font-medium hidden md:table-cell">Part</th>
                    <th class="text-center p-3 text-sm font-medium">Score</th>
                    <th class="text-center p-3 text-sm font-medium">Status</th>
                    <th class="text-right p-3 text-sm font-medium hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="submission in submissions" 
                    :key="submission._id"
                    class="border-t hover:bg-muted/50 transition-colors"
                  >
                    <td class="p-3">
                      <div>
                        <p class="font-medium text-sm">{{ submission.course?.title || 'Unknown Course' }}</p>
                        <p class="text-xs text-muted-foreground">{{ submission.lab?.title || 'Unknown Lab' }}</p>
                      </div>
                    </td>
                    <td class="p-3 hidden md:table-cell">
                      <span class="text-sm">{{ submission.partTitle }}</span>
                    </td>
                    <td class="p-3 text-center">
                      <span v-if="submission.score !== null && submission.totalPoints !== null" class="text-sm font-medium">
                        {{ submission.score }}/{{ submission.totalPoints }}
                      </span>
                      <span v-else class="text-sm text-muted-foreground">-</span>
                    </td>
                    <td class="p-3 text-center">
                      <Badge 
                        :variant="getStatusBadge(submission.status, submission.score, submission.totalPoints).variant"
                        :class="getStatusBadge(submission.status, submission.score, submission.totalPoints).class"
                      >
                        {{ getStatusBadge(submission.status, submission.score, submission.totalPoints).label }}
                      </Badge>
                    </td>
                    <td class="p-3 text-right hidden lg:table-cell">
                      <span class="text-sm text-muted-foreground">{{ formatDateTime(submission.submittedAt) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                :disabled="currentPage <= 1"
                @click="loadSubmissionsPage(currentPage - 1)"
              >
                Previous
              </Button>
              <span class="text-sm text-muted-foreground">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                :disabled="currentPage >= totalPages"
                @click="loadSubmissionsPage(currentPage + 1)"
              >
                Next
              </Button>
            </div>

            <p class="text-center text-sm text-muted-foreground">
              Showing {{ submissions.length }} of {{ total }} submissions
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
