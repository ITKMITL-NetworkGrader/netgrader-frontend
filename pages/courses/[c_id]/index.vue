<script setup lang="ts">
import { ChevronRight, Home } from 'lucide-vue-next'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const route = useRoute()
const courseId = route.params.c_id as string
const { currentCourse, isLoading, fetchCourse } = useCourse()

// Fetch course data on mount
onMounted(async () => {
  await fetchCourse(courseId)
})

// Computed property for course title
const courseTitle = computed(() => {
  return currentCourse.value?.title || `Course ${courseId}`
})
</script>

<template>
    <div class="min-h-screen bg-background">
        <div class="container mx-auto p-4 pb-8">
            <Breadcrumb class="mb-6">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/" class="flex items-center">
                            <Home class="h-4 w-4" />
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                        <ChevronRight class="h-4 w-4" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/courses">Courses</BreadcrumbLink>
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
                <div class="relative">
                    <div class="h-48 rounded-lg overflow-hidden relative">
                        <div class="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent z-10"></div>
                        <img src="https://i.pinimg.com/736x/18/e3/ad/18e3ad7a432d41a6e2a57d1523e81c73.jpg" alt="Course banner" class="w-full h-full object-cover opacity-70">
                    </div>
                    <div class="absolute inset-0 p-6 flex flex-col justify-center z-20">
                        <h1 class="text-5xl font-bold mb-2 text-white mix-blend-difference">{{ currentCourse.title }}</h1>
                        <p class="text-xl text-muted-foreground/90 mb-4 mix-blend-difference">{{ currentCourse.description }}</p>
                        <p class="text-sm text-muted-foreground/80 mix-blend-difference">Instructor: {{ currentCourse.instructor }}</p>
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
                            <AccordionTrigger>Syllabus</AccordionTrigger>
                            <AccordionContent>
                                <ul class="list-disc pl-5">
                                    <li v-for="(item, index) in currentCourse.syllabus" :key="index">{{ item }}</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="resources">
                            <AccordionTrigger>Resources</AccordionTrigger>
                            <AccordionContent>
                                <ul class="list-disc pl-5">
                                    <li v-for="(resource, index) in currentCourse.resources" :key="index">{{ resource }}</li>
                                </ul>
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