<script setup lang="ts">
import '@fontsource/bai-jamjuree';
import '@fontsource/geist-mono';
import { SonnerToaster as Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
import { Fragment, defineComponent, h } from 'vue'

// Polyfill Fragment for Vue 3.5+ compatibility with Milkdown
// This fixes the "Fragment is not defined" error in Milkdown's JSX components
if (typeof window !== 'undefined') {
  ;(window as any).Fragment = Fragment
}

// Global Vue error handler to catch rendering errors from third-party components (like Milkdown)
const app = useNuxtApp().vueApp

app.config.errorHandler = (err: unknown, instance: unknown, info: string) => {
  // Check if this is the Fragment error from Milkdown
  if (err instanceof ReferenceError && err.message === 'Fragment is not defined') {
    console.warn('Milkdown ImageBlock render error caught:', err)
    // Prevent the error from crashing the app - return a fallback UI
    return false
  }
  // Log other errors
  console.error('Vue error:', err, info)
}

// Also handle unhandled promise rejections that might occur during rendering
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof ReferenceError && event.reason.message === 'Fragment is not defined') {
      console.warn('Milkdown ImageBlock unhandled rejection caught:', event.reason)
      event.preventDefault()
    }
  })
}

// Early theme initialization via inline script to prevent flash of default theme
useHead({
  script: [
    {
      innerHTML: `
        (function() {
          try {
            var mode = localStorage.getItem('ng-color-mode') || 'dark';
            if (mode === 'system') {
              mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            if (mode === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch(e) {
            document.documentElement.classList.add('dark');
          }
        })();
      `,
      type: 'text/javascript',
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
/* Fonts are now handled by CSS variables in tailwind.css */
</style>
