<script setup lang="ts">
// @nuxtjs/google-fonts will handle font imports
// import '@fontsource/bai-jamjuree';
// import '@fontsource-variable/roboto-mono';
useSeoMeta({
        title: 'NetGrader',
        ogTitle: 'NetGrader',
        description:
            'Network Grader Automation for IT Infrastructure Students',
        ogDescription:
            'Network Grader Automation for IT Infrastructure Students',
        ogImage: '',
    })
</script>
<template>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
</template>
