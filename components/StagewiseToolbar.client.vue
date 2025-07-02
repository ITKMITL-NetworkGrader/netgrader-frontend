<template>
  <div id="stagewise-toolbar-container" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(async () => {
  // Only initialize in development mode
  if (import.meta.dev) {
    try {
      const { initToolbar } = await import('@stagewise/toolbar')
      const { VuePlugin } = await import('@stagewise-plugins/vue')
      
      initToolbar({
        plugins: [VuePlugin],
      })
    } catch (error) {
      console.warn('Failed to initialize Stagewise toolbar:', error)
    }
  }
})
</script>
