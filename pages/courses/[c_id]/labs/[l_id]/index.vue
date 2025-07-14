<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const labId = ref(route.params.l_id)

</script>
<template>
  <div class="bg-background p-4 pb-8">
    <h1 class="text-5xl font-bold mb-1">Lab: {{ labId }}</h1>
    <p class="text-xl text-gray-600 mb-4">Practice makes perfect.</p>
  </div>
</template>