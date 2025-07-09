<script setup lang="ts">
const route = useRoute();    
</script>

<template>
    <div>
        <NuxtLoadingIndicator />
        <NavigationBar />
        <main class="mx-auto" :class="{ 'max-w-screen-xl md:pt-28 pt-24 2xl:px-0 px-8 min-[1024px]:min-h-[90.9vh] min-h-[86.7vh]' : route.path !== '/' }">
            <slot>
            </slot>
        </main>
        <PageFooter />
    </div>
</template>