<template>
  <div class="w-full max-w-4xl mx-auto py-10 px-4">
    <!-- Page header -->
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-1">
        <Network class="h-6 w-6 text-primary" />
        <h1 class="text-2xl font-bold">ContainerLab Management</h1>
      </div>
      <p class="text-muted-foreground text-sm">
        Connect to a clab-api-server to list running labs, deploy topologies, and destroy labs.
      </p>
    </div>

    <ClabManagementPanel />
  </div>
</template>

<script setup lang="ts">
import { Network } from 'lucide-vue-next'
import ClabManagementPanel from '@/components/clab/ClabManagementPanel.vue'

definePageMeta({})
</script>
