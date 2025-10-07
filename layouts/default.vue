<script setup lang="ts">
const route = useRoute();
const isFullScreenPage = computed(() =>
  route.path === '/demo' ||
  route.path.startsWith('/play') ||
  route.path.startsWith('/courses') || // Add this line
  route.path.startsWith('/manage') // Add this line
);
const isHomePage = computed(() => route.path === '/');

// Get the primary color from CSS variables
const loadingColor = computed(() => {
  if (process.client) {
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue('--color-primary').trim();
  }
  return 'oklch(0.6698 0.0882 196.2136)'; // Default primary color
});
</script>

<template>
    <div class="min-h-screen flex flex-col">
        <NuxtLoadingIndicator :color="loadingColor"/>
        <NavigationBar />
        <main 
            class="flex-1" 
            :class="{
                'mx-auto max-w-screen-xl md:pt-28 pt-24 2xl:px-0 px-8': !isFullScreenPage && !isHomePage,
                'md:pt-20 pt-16 mx-16': isFullScreenPage, // Add top padding for nav
                'mx-auto': !isFullScreenPage
            }"
        >
            <slot />
        </main>
        <PageFooter v-if="!isFullScreenPage" />
    </div>
</template>