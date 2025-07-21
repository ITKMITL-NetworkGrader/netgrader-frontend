<script setup lang="ts">
import { onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

const config = useRuntimeConfig()
const backendURL = config.public.backend1url
interface CourseResponse {
    courses: Array<{
        id: number
        title: string
        description: string
        instructor: string
        createdAt: string
        updatedAt: string
    }>
}
const courses = await useFetch<CourseResponse>(backendURL + '/v0/courses', {
    method: 'GET',
}).then(res => res.data.value?.courses || []).catch(err => {
    console.error('Failed to fetch courses:', err)
    return []
})


const { $anime } = useNuxtApp()
onMounted(() => {
    $anime({
        targets: '#card',
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutExpo'
    });
});

</script>
<template>
    <div class="bg-background p-4 pb-8">
        <h1 class="text-5xl font-bold mb-1">Courses</h1>
        <p class="text-xl text-gray-600 mb-4">Access all of your courses from here!</p>
        <div class="w-full max-w-screen-xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card v-for="course in courses" :key="course.id" id="card" class="overflow-hidden">
                    <!-- Banner Image -->
                    <div class="h-48 bg-cover bg-center relative" 
                         style="background-image: url('https://i.pinimg.com/736x/18/e3/ad/18e3ad7a432d41a6e2a57d1523e81c73.jpg')">
                        <!-- Optional overlay for better text readability -->
                        <!-- <div class="absolute inset-0 bg-black bg-opacity-20"></div> -->
                    </div>
                    
                    <div class="p-6">
                        <CardHeader class="p-0 pb-2">
                            <CardTitle class="text-xl">{{ course.title }}</CardTitle>
                        </CardHeader>
                        <CardContent class="p-0 pb-2">
                            <p class="text-gray-600 mb-2">{{ course.description }}</p>
                            <p class="text-sm text-gray-500 mb-4">Instructor: {{ course.instructor }}</p>
                        </CardContent>
                        <CardFooter class="p-0">
                            <NuxtLink to="/courses/{{ course.id }}" class="hover:underline">
                                <Button class="w-full">
                                    View Course
                                </Button>
                            </NuxtLink>
                        </CardFooter>
                    </div>
                </Card>
            </div>
        </div>
    </div>
</template>