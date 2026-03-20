<template>
  <div class="min-h-screen bg-background">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <Loader2 class="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
        <p class="text-muted-foreground">Loading lab…</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md">
        <AlertCircle class="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h2 class="text-xl font-bold mb-2">Failed to Load Lab</h2>
        <p class="text-muted-foreground mb-4">{{ loadError }}</p>
        <Button @click="router.push(`/courses/${courseId}`)">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Course
        </Button>
      </div>
    </div>

    <!-- Not a ContainerLab lab -->
    <div v-else-if="!isClabLab" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md">
        <AlertCircle class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 class="text-xl font-bold mb-2">ContainerLab Not Enabled</h2>
        <p class="text-muted-foreground mb-4">
          This lab does not use ContainerLab as its network provider.
        </p>
        <Button variant="outline" @click="router.push(`/courses/${courseId}/labs/${labId}/edit`)">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Edit
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Header -->
      <div class="border-b bg-background sticky top-0 z-40">
        <div class="w-full max-w-screen-xl mx-auto px-6 py-4 lg:px-12">
          <!-- Breadcrumb -->
          <Breadcrumb class="mb-4">
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
                <NuxtLink to="/courses">Courses</NuxtLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight class="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <NuxtLink :to="`/courses/${courseId}`">{{ courseTitle }}</NuxtLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight class="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <NuxtLink :to="`/courses/${courseId}/labs/${labId}/edit`">
                  {{ labTitle }}
                </NuxtLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight class="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>ContainerLab Playground</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <!-- Title row -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                class="gap-1.5"
                @click="router.push(`/courses/${courseId}/labs/${labId}/edit`)"
              >
                <ArrowLeft class="h-4 w-4" />
                Back to Edit
              </Button>
              <div>
                <h1 class="text-2xl font-bold flex items-center gap-2">
                  <Network class="h-5 w-5 text-primary" />
                  ContainerLab Playground
                </h1>
                <p class="text-muted-foreground mt-0.5 text-sm">
                  {{ labTitle }} — test your topology on a live ContainerLab server
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="w-full max-w-screen-xl mx-auto px-6 py-8 lg:px-12">
        <ClabPlaygroundManager :lab-id="labId" :topology="clabTopology" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Home,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Network,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import ClabPlaygroundManager from '@/components/clab/ClabPlaygroundManager.vue'
import { useCourse } from '@/composables/useCourse'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const backendURL = config.public.backendurl

const courseId = route.params.c_id as string
const labId = route.params.l_id as string

// ── Course title ────────────────────────────────────────────────────────────

const { currentCourse, fetchCourse } = useCourse()
const courseTitle = computed(() => currentCourse.value?.title || `Course ${courseId}`)

// ── Lab data ────────────────────────────────────────────────────────────────

const isLoading = ref(true)
const loadError = ref('')
const labData = ref<any>(null)

const labTitle = computed(() => labData.value?.title || 'Lab')
const isClabLab = computed(() => labData.value?.networkProvider === 'clab')

/**
 * Optional pre-built clab topology stored on the lab.
 * If the lab has a `clabTopology` field (a ContainerLab topology object),
 * it will be passed to the playground manager so Deploy is available.
 * Otherwise, the manager shows the "save lab first" hint and only Inspect works.
 */
const clabTopology = computed(() => labData.value?.clabTopology ?? undefined)

async function loadLab() {
  try {
    isLoading.value = true
    loadError.value = ''

    const resp = await $fetch<any>(`${backendURL}/v0/labs/${labId}`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!resp.success) {
      throw new Error(resp.message || 'Failed to load lab')
    }

    labData.value = resp.data
  } catch (err: any) {
    loadError.value = err?.data?.message || err?.message || 'An error occurred while loading the lab'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCourse(courseId)
  loadLab()
})
</script>
