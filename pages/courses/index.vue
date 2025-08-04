<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ChevronRight, Home } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { computed } from "vue";
import { useColorMode } from "@vueuse/core";

const isDark = computed(() => useColorMode().value == "dark");
const config = useRuntimeConfig()
const backendURL = config.public.backendurl

interface CourseResponse {
    courses: Array<{
        _id: string
        title: string
        description: string
        instructor: string
        createdAt: string
        updatedAt: string
        visibility: 'public' | 'private'
    }>
}

// Use reactive ref for courses
const isLoading = ref(true)

// Fetch courses only on client side to prevent hydration issues
const { data: coursesData, status } = await useFetch<CourseResponse>(backendURL + '/v0/courses', {
    method: 'GET',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
    },
    default: () => ({ courses: [] })
})


</script>

<template>
  <div class="p-4 pb-8">
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
          <BreadcrumbPage>Courses</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    
    <h1 class="text-5xl font-bold mb-1">Courses</h1>
    <p class="text-xl text-muted-foreground mb-4">Access all of your courses from here!</p>
    
    <div class="w-full max-w-screen-xl mx-auto">
      <!-- Loading state -->
      <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="animate-pulse">
          <div class="bg-gray-200 dark:bg-gray-700 h-48 rounded-t-xl"></div>
          <div class="p-6 space-y-3">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      
      <!-- Courses grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="(course, index) in coursesData.courses" 
             :key="course._id"
             class="flex flex-col bg-white border shadow-sm rounded-xl hover:shadow-lg transition dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7] opacity-0 translate-y-4"
             :class="[
                'animate-[fade-in-up_0.3s_ease-out_forwards]',
                `animation-delay-${index * 100}`
             ]">
          <img class="w-full h-48 object-cover rounded-t-xl hover:scale-105 transition-transform duration-500" 
               src="https://i.pinimg.com/736x/18/e3/ad/18e3ad7a432d41a6e2a57d1523e81c73.jpg"
               :alt="course.title + ' banner'">
          
          <div class="p-6">
            <CardHeader class="p-0 pb-2">
              <CardTitle class="text-xl text-gray-800 dark:text-gray-300">{{ course.title }}</CardTitle>
            </CardHeader>
            <CardContent class="p-0 pb-2">
              <p class="mt-2 text-gray-600 dark:text-gray-400">{{ course.description }}</p>
              <p class="mt-3 text-sm text-gray-500 dark:text-gray-500">Instructor: {{ course.instructor }}</p>
            </CardContent>
            <CardFooter class="p-0 mt-4">
              <NuxtLink :to="'/courses/' + course._id" class="w-full">
                <Button class="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-transparent font-semibold transition-all hover:scale-[1.02]">
                  View Course
                </Button>
              </NuxtLink>
            </CardFooter>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Only render particles on client side -->
    <ClientOnly>
      <ParticlesBg
        class="absolute inset-0 z-[-1]"
        :quantity="100"
        :ease="100"
        :color="'#dbeafe'"
        :staticity="10"
        refresh
      />
    </ClientOnly>
  </div>
</template>