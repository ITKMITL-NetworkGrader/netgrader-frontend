<script setup lang="ts">
import '@fontsource/bai-jamjuree';
import '@fontsource-variable/roboto-mono';
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
    <!-- Stagewise Toolbar - Only renders in development mode and on client side -->
    <ClientOnly>
      <StagewiseToolbar />
    </ClientOnly>
</template>
<style>
@font-face {
    font-family: 'Bai Jamjuree';
    src: url('~@fontsource/bai-jamjuree/files/bai-jamjuree-latin-400-normal.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
}
@font-face {
    font-family: 'Bai Jamjuree';
    src: url('~@fontsource/bai-jamjuree/files/bai-jamjuree-latin-700-normal.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
}
@font-face {
    font-family: 'Roboto Mono Variable';
    src: url('~@fontsource-variable/roboto-mono/files/roboto-mono-variable-latin-400-normal.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
}
@font-face {
    font-family: 'Roboto Mono Variable';
    src: url('~@fontsource-variable/roboto-mono/files/roboto-mono-variable-latin-700-normal.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
}
body, html {
    font-family: 'Bai Jamjuree', sans-serif;
}

.font-bai-jamjuree {
    font-family: 'Bai Jamjuree', sans-serif;
}
.font-roboto-mono {
    font-family: 'Roboto Mono Variable', 'Roboto Mono', monospace;
}

</style>
