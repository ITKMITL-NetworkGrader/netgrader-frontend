<script setup lang="ts">
    import { ref, onMounted } from 'vue'
    import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
    const backendUrl = useRuntimeConfig().public.BACKEND1URL
    // const { courseCount } = await useFetch(backendUrl + '/auth/login', {
    //     method: 'GET',
    //     headers: {
    //         'Content-Type': 'application/json',
    //
    //     },'
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
    <div class="min-h-screen bg-background flex p-4">
        <div class="grid grid-cols-4 flex-1 items-start">
            <Card id="card" class="w-full">
                <CardHeader>
                    <CardTitle class="text-2xl font-bold">My Course</CardTitle>
                    <CardDescription class="text-gray-600">
                        <!-- {{ courseCount }} course{{ courseCount !== 1 ? 's' : '' }} available -->
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div class="flex flex-col space-y-4">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-foreground">Total Courses</span>
                            <span class="font-medium">{{ courseCount }}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</template>