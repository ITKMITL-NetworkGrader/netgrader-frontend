<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table'
const backendUrl = useRuntimeConfig().public.BACKEND1URL
const courseCount = ref(0) // Placeholder for course count
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
    <div class="bg-background p-4">
        <h1 class="text-5xl font-bold mb-1">Courses</h1>
        <p class="text-xl text-gray-600 mb-4">Access all of your courses from here!</p>
        <div class="w-full max-w-screen-xl mx-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableCell class="font-bold">Course Name</TableCell>
                        <TableCell class="font-bold">Description</TableCell>
                        <TableCell class="font-bold">Lecturers</TableCell>
                        <TableCell class="font-bold">Actions</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <!-- Example course row, replace with dynamic data -->
                    <TableRow>
                        <TableCell>Introduction to Networking</TableCell>
                        <TableCell>Learn the basics of networking.</TableCell>
                        <TableCell>
                            <NuxtLink to="/courses/1" class="text-blue-500 hover:underline">View Course</NuxtLink>
                        </TableCell>
                    </TableRow>
                    <!-- Add more course rows as needed -->
                </TableBody>
            </Table>
        </div>
    </div>
</template>