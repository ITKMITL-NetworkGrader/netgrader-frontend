<script setup lang="ts">
const route = useRoute();
const isFullScreenPage = computed(() => route.path === '/demo' || route.path.startsWith('/play'));
const isHomePage = computed(() => route.path === '/');
</script>

<template>
    <div class="min-h-screen flex flex-col">
        <NuxtLoadingIndicator />
        <NavigationBar />
        <main 
            class="flex-1" 
            :class="{
                'mx-auto max-w-screen-xl md:pt-28 pt-24 2xl:px-0 px-8': !isFullScreenPage && !isHomePage,
                'pt-0': isFullScreenPage,
                'mx-auto': !isFullScreenPage
            }"
        >
            <slot />
        </main>
        <PageFooter v-if="!isFullScreenPage" />
    </div>
</template>