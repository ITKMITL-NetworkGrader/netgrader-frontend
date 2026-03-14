<script setup lang="ts">
import { 
  BookOpen, 
  Image as ImageIcon, 
  Lock, 
  Users, 
  Loader2, 
  Trash2, 
  RotateCcw,
  Eye,
  EyeOff,
  Upload,
  GraduationCap
} from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'

// Types
type CourseRoleOption = 'STUDENT' | 'TA' | 'INSTRUCTOR'

interface Enrollment {
  u_id: string
  u_role: CourseRoleOption
  enrollmentDate: string
  fullName?: string
  profilePicture?: string
}

interface EnrollmentDraftItem extends Enrollment {
  originalRole: CourseRoleOption
  newRole: CourseRoleOption
  markedForRemoval: boolean
}

interface EditFormData {
  title: string
  description: string
  bannerUrl: string
  password: string
  isPrivate: boolean
}

interface Course {
  title?: string
  description?: string
  bannerUrl?: string
  bannerImage?: string
  password?: string
  visibility?: 'private' | 'public'
}

// Props
const props = withDefaults(defineProps<{
  open: boolean
  course: Course | null
  showBannerUpload?: boolean
  showEnrollmentManagement?: boolean
  enrollmentDraft?: EnrollmentDraftItem[]
  isLoadingEnrollments?: boolean
  isUploadingBanner?: boolean
  isSaving?: boolean
  canModifyRoleForUser?: (student: EnrollmentDraftItem) => boolean
  canRemoveEnrollment?: (student: EnrollmentDraftItem) => boolean
}>(), {
  showBannerUpload: true,
  showEnrollmentManagement: true,
  enrollmentDraft: () => [],
  isLoadingEnrollments: false,
  isUploadingBanner: false,
  isSaving: false,
  canModifyRoleForUser: () => true,
  canRemoveEnrollment: () => true
})

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [form: EditFormData]
  'cancel': []
  'banner-change': [event: Event]
  'role-change': [userId: string, newRole: CourseRoleOption]
  'toggle-removal': [userId: string]
  'confirm-changes': []
}>()

// Local state
const showPassword = ref(false)
const showEnrollmentConfirm = ref(false)

const DEFAULT_BANNER_PLACEHOLDER = '/placeholder.avif'

// Form data (local copy)
const editForm = ref<EditFormData>({
  title: '',
  description: '',
  bannerUrl: '',
  password: '',
  isPrivate: false
})

// Initialize form when course changes
watch(() => props.course, (newCourse) => {
  if (newCourse) {
    editForm.value = {
      title: newCourse.title || '',
      description: newCourse.description || '',
      bannerUrl: newCourse.bannerUrl || newCourse.bannerImage || '',
      password: newCourse.password || '',
      isPrivate: newCourse.visibility === 'private'
    }
  }
}, { immediate: true, deep: true })

// Computed
const courseBannerUrl = computed(() => {
  return editForm.value.bannerUrl || DEFAULT_BANNER_PLACEHOLDER
})

const roleChanges = computed(() =>
  props.enrollmentDraft.filter(item => !item.markedForRemoval && item.newRole !== item.originalRole)
)

const removalList = computed(() =>
  props.enrollmentDraft.filter(item => item.markedForRemoval)
)

const hasEnrollmentChanges = computed(() =>
  roleChanges.value.length > 0 || removalList.value.length > 0
)

const courseDetailsChanged = computed(() => {
  if (!props.course) return false

  const currentVisibilityPrivate = props.course.visibility === 'private'
  const currentPassword = props.course.password || ''

  return (
    editForm.value.title !== (props.course.title || '') ||
    editForm.value.description !== (props.course.description || '') ||
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
      return 'bg-emerald-100 text-emerald-800 bg-emerald-500/10 text-emerald-600'
    case 'TA':
      return 'bg-amber-100 text-amber-800 bg-amber-500/10 text-amber-600'
    default:
      return 'bg-blue-100 text-blue-800 bg-blue-500/10 text-blue-600'
  }
}

const handleClose = () => {
  emit('update:open', false)
  emit('cancel')
}

const handleSaveClick = () => {
  if (props.isSaving) return
  if (hasEnrollmentChanges.value) {
    showEnrollmentConfirm.value = true
  } else {
    emit('save', editForm.value)
  }
}

const handleConfirmChanges = () => {
  showEnrollmentConfirm.value = false
  emit('confirm-changes')
  emit('save', editForm.value)
}

const handleRoleChange = (userId: string, newRole: string) => {
  emit('role-change', userId, newRole as CourseRoleOption)
}

const handleToggleRemoval = (userId: string) => {
  emit('toggle-removal', userId)
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden p-0">
      <!-- Modal Header with Theme Gradient -->
      <div class="modal-header relative p-6 pb-8">
        <div class="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <DialogHeader class="relative">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <BookOpen class="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle class="text-2xl font-bold text-white">Edit Course</DialogTitle>
              <p class="text-white/70 text-sm mt-0.5">Customize your course settings and manage enrollments</p>
            </div>
          </div>
        </DialogHeader>
      </div>

      <!-- Content with Scroll -->
      <div class="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-8">
        
        <!-- Section: Basic Information -->
        <section class="space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-border">
            <BookOpen class="h-4 w-4 text-primary" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h3>
          </div>
          
          <div class="grid gap-4">
            <div class="space-y-2">
              <Label for="course-title" class="text-sm font-medium">Course Title</Label>
              <Input 
                id="course-title" 
                v-model="editForm.title" 
                placeholder="Enter a descriptive course title"
                class="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div class="space-y-2">
              <Label for="course-description" class="text-sm font-medium">Course Description</Label>
              <Textarea 
                id="course-description" 
                v-model="editForm.description" 
                placeholder="Describe what students will learn in this course..."
                rows="4"
                class="transition-all duration-200 focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        </section>

        <!-- Section: Course Banner -->
        <section v-if="showBannerUpload" class="space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-border">
            <ImageIcon class="h-4 w-4 text-secondary" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Banner</h3>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Banner Preview -->
            <div class="space-y-3">
              <Label class="text-xs text-muted-foreground uppercase tracking-wide">Current Banner</Label>
              <div class="relative h-40 rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30 group">
                <img 
                  :src="courseBannerUrl" 
                  alt="Course banner preview" 
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
            
            <!-- Upload Section -->
            <div class="space-y-3">
              <Label class="text-xs text-muted-foreground uppercase tracking-wide">Upload New Banner</Label>
              <div class="relative h-40 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group">
                <input 
                  type="file" 
                  accept="image/*"
                  :disabled="isUploadingBanner"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  @change="$emit('banner-change', $event)"
                />
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <div v-if="isUploadingBanner" class="flex flex-col items-center gap-2">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <span class="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                  <div v-else class="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                    <Upload class="h-8 w-8" />
                    <span class="text-sm font-medium">Drop image or click to upload</span>
                    <span class="text-xs">JPEG, PNG, WebP, GIF up to 10MB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section: Access Settings -->
        <section class="space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-border">
            <Lock class="h-4 w-4 text-accent-foreground" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Settings</h3>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Password -->
            <div class="space-y-2">
              <Label for="course-password" class="text-sm font-medium">
                Enrollment Password
                <span class="text-muted-foreground font-normal ml-1">(Optional)</span>
              </Label>
              <div class="relative">
                <Input 
                  id="course-password" 
                  v-model="editForm.password" 
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter password for enrollment"
                  class="h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                <button 
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <Eye v-if="showPassword" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
              </div>
              <p class="text-xs text-muted-foreground">
                Leave empty if you don't want to require a password for enrollment
              </p>
            </div>
            
            <!-- Visibility Toggle -->
            <div class="space-y-2">
              <Label class="text-sm font-medium">Course Visibility</Label>
              <div class="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-colors">
                <div class="flex items-center gap-3">
                  <div :class="[
                    'p-2 rounded-lg transition-colors',
                    editForm.isPrivate ? 'bg-destructive/10 text-destructive bg-destructive/10' : 'bg-primary/10 text-primary bg-primary/10'
                  ]">
                    <Lock v-if="editForm.isPrivate" class="h-4 w-4" />
                    <GraduationCap v-else class="h-4 w-4" />
                  </div>
                  <div>
                    <p class="text-sm font-medium">{{ editForm.isPrivate ? 'Private Course' : 'Public Course' }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ editForm.isPrivate ? 'Only enrolled students can access' : 'Visible to everyone' }}
                    </p>
                  </div>
                </div>
                <Switch 
                  v-model="editForm.isPrivate"
                  class="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Section: Enrolled Students -->
        <section v-if="showEnrollmentManagement" class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-border">
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-primary" />
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Students</h3>
            </div>
            <Badge variant="secondary" class="text-xs">
              {{ enrollmentDraft.length }} {{ enrollmentDraft.length === 1 ? 'student' : 'students' }}
            </Badge>
          </div>
          
          <!-- Loading State -->
          <div v-if="isLoadingEnrollments" class="flex items-center justify-center py-12">
            <div class="flex flex-col items-center gap-3">
              <Loader2 class="h-8 w-8 animate-spin text-primary" />
              <span class="text-sm text-muted-foreground">Loading enrollments...</span>
            </div>
          </div>

          <!-- Students Table -->
          <div v-else-if="enrollmentDraft.length > 0" class="rounded-xl border border-border overflow-hidden">
            <div class="overflow-x-auto max-h-80" style="scrollbar-width: thin;">
              <Table>
                <TableHeader class="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead class="min-w-[180px]">Student</TableHead>
                    <TableHead class="min-w-[120px]">Student ID</TableHead>
                    <TableHead class="min-w-[180px]">Role</TableHead>
                    <TableHead class="min-w-[120px]">Enrolled</TableHead>
                    <TableHead class="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="student in enrollmentDraft"
                    :key="student.u_id"
                    :class="[
                      'transition-colors duration-200',
                      student.markedForRemoval
                        ? 'bg-red-50 bg-red-500/10'
                        : student.newRole !== student.originalRole
                          ? 'bg-amber-50 bg-amber-500/10'
                          : 'hover:bg-muted/50'
                    ]"
                  >
                    <TableCell>
                      <div class="flex items-center gap-3">
                        <img
                          v-if="student.profilePicture"
                          :src="student.profilePicture"
                          :alt="student.fullName || 'Profile'"
                          class="h-9 w-9 rounded-full object-cover"
                          @error="(e: Event) => (e.target as HTMLElement).style.display = 'none'"
                        />
                        <div v-else class="h-9 w-9 rounded-full avatar-gradient flex items-center justify-center text-white text-sm font-semibold">
                          {{ (student.fullName ?? 'U')[0].toUpperCase() }}
                        </div>
                        <div>
                          <p class="font-medium text-sm">{{ student.fullName || 'Unknown' }}</p>
                          <p class="text-xs text-muted-foreground">{{ formatRoleLabel(student.originalRole) }}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell class="font-mono text-sm">{{ student.u_id }}</TableCell>
                    <TableCell>
                      <div class="flex items-center gap-2">
                        <Select
                          v-if="canModifyRoleForUser(student)"
                          :model-value="student.newRole"
                          :disabled="student.markedForRemoval || isSaving"
                          @update:model-value="(value) => handleRoleChange(student.u_id, value)"
                        >
                          <SelectTrigger class="w-[180px] h-9">
                            <SelectValue :placeholder="formatRoleLabel(student.newRole)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              v-for="option in ROLE_SELECT_OPTIONS"
                              :key="option.value"
                              :value="option.value"
                              :disabled="option.value === 'INSTRUCTOR'"
                            >
                              {{ option.label }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <span
                          v-else
                          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          :class="roleBadgeClass(student.newRole)"
                        >
                          {{ formatRoleLabel(student.newRole) }}
                        </span>
                        <Badge
                          v-if="!student.markedForRemoval && student.newRole !== student.originalRole"
                          variant="outline"
                          class="text-xs border-amber-300 text-amber-600 bg-amber-50 bg-amber-500/10"
                        >
                          Modified
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell class="text-sm text-muted-foreground">
                      {{ new Date(student.enrollmentDate).toLocaleDateString() }}
                    </TableCell>
                    <TableCell class="text-right">
                      <div class="flex items-center justify-end gap-2">
                        <Button
                          v-if="canRemoveEnrollment(student)"
                          :variant="student.markedForRemoval ? 'outline' : 'destructive'"
                          size="sm"
                          :disabled="isSaving"
                          class="h-8 text-xs"
                          @click="handleToggleRemoval(student.u_id)"
                        >
                          <template v-if="student.markedForRemoval">
                            <RotateCcw class="h-3 w-3 mr-1" />
                            Undo
                          </template>
                          <template v-else>
                            <Trash2 class="h-3 w-3 mr-1" />
                            Remove
                          </template>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed border-border bg-muted/20">
            <div class="p-4 rounded-full bg-muted/50 mb-4">
              <Users class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="font-medium text-muted-foreground">No students enrolled yet</p>
            <p class="text-sm text-muted-foreground/70 mt-1">Students will appear here once they enroll in your course</p>
          </div>
        </section>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between p-4 border-t border-border bg-muted/30">
        <p class="text-xs text-muted-foreground">
          <span v-if="courseDetailsChanged" class="text-amber-600 font-medium">Unsaved changes</span>
          <span v-else>No changes</span>
        </p>
        <div class="flex items-center gap-3">
          <Button variant="outline" @click="handleClose" :disabled="isSaving">
            Cancel
          </Button>
          <Button 
            @click="handleSaveClick" 
            :disabled="isSaving || (!courseDetailsChanged && !hasEnrollmentChanges)"
            class="min-w-[120px] btn-primary-gradient"
          >
            <template v-if="isSaving">
              <Loader2 class="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </template>
            <template v-else>
              Save Changes
            </template>
          </Button>
        </div>
      </div>

      <!-- Enrollment Changes Confirmation Dialog -->
      <AlertDialog v-model:open="showEnrollmentConfirm">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Enrollment Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Review the changes below before applying them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div class="space-y-4 my-4">
            <div v-if="courseDetailsChanged" class="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <BookOpen class="h-4 w-4" />
              Course details will also be updated
            </div>
            <div v-if="roleChanges.length" class="space-y-2">
              <h4 class="text-sm font-semibold flex items-center gap-2">
                <Badge variant="outline" class="text-amber-600 border-amber-300">{{ roleChanges.length }}</Badge>
                Role Updates
              </h4>
              <ul class="space-y-1 text-sm text-muted-foreground pl-4">
                <li v-for="change in roleChanges" :key="`role-${change.u_id}`" class="flex items-center gap-2">
                  <span class="font-medium text-foreground">{{ change.fullName || change.u_id }}</span>
                  <span>:</span>
                  <span class="line-through text-muted-foreground/50">{{ formatRoleLabel(change.originalRole) }}</span>
                  <span>→</span>
                  <span class="text-amber-600 font-medium">{{ formatRoleLabel(change.newRole) }}</span>
                </li>
              </ul>
            </div>
            <div v-if="removalList.length" class="space-y-2">
              <h4 class="text-sm font-semibold flex items-center gap-2 text-destructive">
                <Badge variant="destructive">{{ removalList.length }}</Badge>
                Pending Removals
              </h4>
              <ul class="space-y-1 text-sm text-destructive pl-4">
                <li v-for="removal in removalList" :key="`remove-${removal.u_id}`">
                  {{ removal.fullName || removal.u_id }}
                </li>
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="isSaving">Cancel</AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleConfirmChanges" :disabled="isSaving" class="btn-primary-gradient">
                <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
                <span v-else>Confirm Changes</span>
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  </Dialog>
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

.avatar-gradient {
  background: var(--primary);
}
</style>
