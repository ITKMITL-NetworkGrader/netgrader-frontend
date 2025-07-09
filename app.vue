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
    <!-- Toast notifications -->
    <Toaster 
      :toast-options="{
        classes: {
          toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-slate-950 dark:group-[.toaster]:text-slate-50 dark:group-[.toaster]:border-slate-800',
          description: 'group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400',
          actionButton: 'group-[.toast]:bg-slate-900 group-[.toast]:text-slate-50 dark:group-[.toast]:bg-slate-50 dark:group-[.toast]:text-slate-900',
          cancelButton: 'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-400',
          error: 'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200 dark:group-[.toaster]:bg-red-900/10 dark:group-[.toaster]:text-red-400 dark:group-[.toaster]:border-red-900/20',
          success: 'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200 dark:group-[.toaster]:bg-green-900/10 dark:group-[.toaster]:text-green-400 dark:group-[.toaster]:border-green-900/20',
          warning: 'group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-900 group-[.toaster]:border-yellow-200 dark:group-[.toaster]:bg-yellow-900/10 dark:group-[.toaster]:text-yellow-400 dark:group-[.toaster]:border-yellow-900/20',
          info: 'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200 dark:group-[.toaster]:bg-blue-900/10 dark:group-[.toaster]:text-blue-400 dark:group-[.toaster]:border-blue-900/20'
        }
      }"
      class="toaster group"
    />
</template>
<style>
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
