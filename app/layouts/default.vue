<script setup lang="ts">
const route = useRoute()

// Special pages that don't use the standard layout
const isHomePage = computed(() => route.path === '/')
const isCenteredPage = computed(() => route.path === '/login')

// Get the primary color from CSS variables
const loadingColor = computed(() => {
  if (process.client) {
    const styles = getComputedStyle(document.documentElement)
    return styles.getPropertyValue('--color-primary').trim()
  }
  return 'oklch(0.6698 0.0882 196.2136)' // Default primary color
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <NuxtLoadingIndicator :color="loadingColor" />
    <!-- Sticky NavigationBar at the top -->
    <div class="sticky top-0 z-[200]">
      <NavigationBar />
    </div>
    <main
      class="flex-1"
      :class="{
        'mx-auto max-w-screen-xl 2xl:px-0 px-8': isCenteredPage,
        'mx-16': !isHomePage && !isCenteredPage,
      }"
    >
      <slot />
    </main>
  </div>
</template>