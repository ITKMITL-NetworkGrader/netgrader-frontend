<script setup lang="ts">
import '@fontsource/bai-jamjuree';
import '@fontsource-variable/roboto-mono';
import { SonnerToaster as Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

// Initialize dark mode
useDarkMode()

// Add script to head to apply dark mode immediately
useHead({
  script: [
    {
      innerHTML: `
        (function() {
          document.documentElement.classList.add('dark');
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('theme', 'dark');
          }
        })();
      `,
      type: 'text/javascript'
    }
  ]
})

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
    <!-- Toast notifications -->
    <Toaster 
      :toast-options="{
        classes: {
          toast: 'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground hover:group-[.toast]:bg-primary/90',
          cancelButton: 'group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground hover:group-[.toast]:bg-secondary/80',
          error: 'group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-destructive',
          success: 'group-[.toaster]:bg-green-900/10 group-[.toaster]:text-green-400 group-[.toaster]:border-green-900/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-green-400 dark:group-[.toaster]:bg-green-900/15 dark:group-[.toaster]:text-green-300 dark:group-[.toaster]:border-green-800/30',
          warning: 'group-[.toaster]:bg-yellow-900/10 group-[.toaster]:text-yellow-400 group-[.toaster]:border-yellow-900/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-yellow-400 dark:group-[.toaster]:bg-yellow-900/15 dark:group-[.toaster]:text-yellow-300 dark:group-[.toaster]:border-yellow-800/30',
          info: 'group-[.toaster]:bg-primary/10 group-[.toaster]:text-primary group-[.toaster]:border-primary/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-primary'
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
