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
          <BreadcrumbPage>Labs</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-4xl font-bold mb-2">Lab Bank</h1>
        <p class="text-xl text-muted-foreground">Manage and create laboratory exercises for your course</p>
      </div>
      <NuxtLink :to="`/courses/${courseId}/labs/create`">
        <Button class="flex items-center space-x-2">
          <Plus class="w-4 h-4" />
          <span>Create Lab</span>
        </Button>
      </NuxtLink>
    </div>

    <!-- Content -->
    <div class="w-full max-w-screen-xl mx-auto">
      <!-- Labs will be listed here -->
      <div class="text-center py-16">
        <BeakerIcon class="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h2 class="text-2xl font-semibold mb-2">No Labs Created Yet</h2>
        <p class="text-muted-foreground mb-6">
          Start by creating your first laboratory exercise for students.
        </p>
        <NuxtLink :to="`/courses/${courseId}/labs/create`">
          <Button variant="outline">
            <Plus class="w-4 h-4 mr-2" />
            Create Your First Lab
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

// Heroicons Beaker icon as placeholder
const BeakerIcon = defineComponent({
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
        d: 'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5a2.25 2.25 0 0 0-.659 1.591V19.5a2.25 2.25 0 0 0 2.25 2.25h10.818a2.25 2.25 0 0 0 2.25-2.25v-3.409a2.25 2.25 0 0 0-.659-1.591L14.909 10.41a2.25 2.25 0 0 1-.659-1.591V3.104m-4.5 0V9m4.5-5.896V9m0 0H9'
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