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
          <BreadcrumbPage>Exams</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-4xl font-bold mb-2">Exam Bank</h1>
        <p class="text-xl text-muted-foreground">Manage and create examinations for your course</p>
      </div>
      <NuxtLink :to="`/courses/${courseId}/exams/create`">
        <Button class="flex items-center space-x-2">
          <Plus class="w-4 h-4" />
          <span>Create Exam</span>
        </Button>
      </NuxtLink>
    </div>

    <!-- Content -->
    <div class="w-full max-w-screen-xl mx-auto">
      <!-- Exams will be listed here -->
      <div class="text-center py-16">
        <ClipboardDocumentCheckIcon class="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h2 class="text-2xl font-semibold mb-2">No Exams Created Yet</h2>
        <p class="text-muted-foreground mb-6">
          Start by creating your first examination for students.
        </p>
        <NuxtLink :to="`/courses/${courseId}/exams/create`">
          <Button variant="outline">
            <Plus class="w-4 h-4 mr-2" />
            Create Your First Exam
          </Button>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Home, ChevronRight, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

// Heroicons ClipboardDocumentCheck icon as placeholder
const ClipboardDocumentCheckIcon = defineComponent({
  render() {
    return h('svg', {
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.5',
      viewBox: '0 0 24 24',
      xmlns: 'http://www.w3.org/2000/svg'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        d: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z'
      })
    ])
  }
})

const route = useRoute()
const courseId = route.params.c_id as string

// Get course info
const { currentCourse } = useCourse()
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId}`)

// Fetch course data
onMounted(async () => {
  await useCourse().fetchCourse(courseId)
})
</script>