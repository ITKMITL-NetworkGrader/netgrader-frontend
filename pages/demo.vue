<template>
  <div class="h-screen flex flex-col bg-gray-50 pt-16">
    <!-- Custom header for Play page -->
    <div class="border-b bg-white px-4 py-2 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <NuxtLink to="/courses" class="text-blue-600 hover:text-blue-800">
            ← Back to Courses
          </NuxtLink>
          <div>
            <h1 class="text-xl font-semibold">Play Editor</h1>
            <p class="text-sm text-gray-600">Course: {{ course?.name }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <!-- User info from navigation -->
          <span v-if="userState" class="text-sm text-gray-600">
            {{ userState.first_name }} {{ userState.last_name }}
          </span>
          <div class="flex gap-2">
            <Button variant="outline" @click="savePlay">Save</Button>
            <Button @click="publishPlay">Publish</Button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex-1 flex">
      <PlayToolbar class="w-64 border-r bg-white" :play-id="playId" />
      <PlayCanvas class="flex-1 w-full" :play-id="playId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import PlayToolbar from '@/components/play/PlayToolbar.vue'
import PlayCanvas from '@/components/play/PlayCanvas.vue'

const route = useRoute()
const userState = useUserState()
const playId = computed(() => route.params.id as string)

// Mock course data for demo
const course = ref({ name: 'Demo Course' })

const savePlay = async () => {
  // Save play logic
  console.log('Saving play...')
}

const publishPlay = async () => {
  // Publish play logic
  console.log('Publishing play...')
}

// Use a custom layout or no layout for full-screen experience
// definePageMeta({
//   layout: false,  // This removes the default layout
// })
</script>