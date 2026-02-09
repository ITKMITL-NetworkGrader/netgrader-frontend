<script setup lang="ts">
/**
 * Chat Page - Full-page Gemini Chat interface
 * Route: /courses/:c_id/labs/chat
 */
import GeminiChat from '~/components/chat/GeminiChat.vue';

definePageMeta({
  layout: 'course',
  middleware: ['auth']
});

const route = useRoute();
const courseId = computed(() => route.params.c_id as string);
</script>

<template>
  <div class="h-[calc(100vh-120px)] p-4">
    <GeminiChat />
  </div>
</template>
