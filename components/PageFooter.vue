<script setup lang="ts">
const currentYear = new Date().getFullYear()

const teamMembers = [
  {
    name: '@tarj.essada',
    role: 'Backend',
    url: 'https://instagram.com/tarj.essada'
  },
  {
    name: '@chinfair_',
    role: 'Frontend',
    url: 'https://instagram.com/chinfair_'
  },
  {
    name: '@oat_chayanont',
    role: 'AI Implementor',
    url: 'https://instagram.com/oat_chayanont'
  }
]
</script>

<template>
  <footer class="relative mt-auto">
    <!-- Decorative gradient -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-secondary/10 via-secondary/5 to-transparent pointer-events-none" />

    <div class="relative glass border-t border-border/30 supports-[backdrop-filter]:bg-background/60">
      <div class="layout-container py-8">
        <!-- Main footer content -->
        <div class="flex flex-col lg:flex-row gap-6 lg:gap-8 justify-between items-start lg:items-center">
          <!-- Brand and copyright -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2">
              <div
                class="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-mono font-bold">
                NG
              </div>
              <span class="font-mono font-bold text-lg">NetGrader</span>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
              <span>© {{ currentYear }}</span>
              <span class="hidden sm:block">•</span>
              <span>Property of ITKMITL</span>
            </div>
          </div>

          <!-- Team credits -->
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap gap-x-4 gap-y-2">
              <p class="text-sm font-medium text-foreground">
                Made with <span class="text-primary">💦</span> by:
              </p>
              <NuxtLink
              v-for="member in teamMembers" :key="member.name" :to="member.url"
                class="group flex items-center gap-2 text-sm transition-colors hover:text-primary focus:text-primary"
                external target="_blank" :aria-label="`Visit ${member.name}'s Instagram - ${member.role}`">
                <span
                  class="font-medium underline decoration-2 decoration-transparent transition-colors group-hover:decoration-primary group-focus:decoration-primary">
                  {{ member.name }}
                </span>
                <span class="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                  {{ member.role }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>