<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Skeleton -->
    <div v-if="showNavigation" class="border-b border-border">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <Skeleton class="h-8 w-32" />
          <div class="flex items-center space-x-4">
            <Skeleton class="h-8 w-20" />
            <Skeleton class="h-8 w-20" />
            <Skeleton class="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>

    <!-- Breadcrumb Skeleton -->
    <div v-if="showBreadcrumb" class="border-b border-border">
      <div class="container mx-auto px-4 py-2">
        <div class="flex items-center space-x-2">
          <Skeleton class="h-4 w-16" />
          <span class="text-muted-foreground">/</span>
          <Skeleton class="h-4 w-20" />
          <span class="text-muted-foreground">/</span>
          <Skeleton class="h-4 w-24" />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex h-screen" :class="{ 'pt-16': showNavigation }">
      <!-- Sidebar Skeleton -->
      <div v-if="showSidebar" class="w-64 border-r border-border p-4">
        <Skeleton class="h-6 w-24 mb-4" />
        <div class="space-y-2">
          <Skeleton 
            v-for="item in sidebarItems" 
            :key="item"
            class="h-12 w-full rounded-lg" 
          />
        </div>
        <div v-if="showSidebarActions" class="mt-6 space-y-2">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col">
        <!-- Header Skeleton -->
        <div v-if="showHeader" class="border-b border-border p-6 bg-card">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <Skeleton class="h-8 w-64" />
              <Skeleton v-if="showHeaderDescription" class="h-4 w-96" />
            </div>
            <div v-if="showHeaderActions" class="flex space-x-2">
              <Skeleton class="h-10 w-20" />
              <Skeleton class="h-10 w-24" />
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 p-6">
          <div v-if="contentType === 'form'" class="max-w-2xl">
            <LoadingForm 
              :loading="true" 
              :field-count="formFields"
              :show-header="showFormHeader"
              :show-actions="showFormActions"
            />
          </div>
          
          <div v-else-if="contentType === 'table'" class="space-y-4">
            <LoadingTable 
              :loading="true"
              :headers="tableHeaders"
              :rows="tableRows"
              :show-pagination="showTablePagination"
            />
          </div>
          
          <div v-else-if="contentType === 'cards'" class="grid gap-4" :class="cardGridClass">
            <LoadingCard 
              v-for="card in cardCount" 
              :key="card"
              :loading="true"
              :show-actions="showCardActions"
            />
          </div>
          
          <div v-else-if="contentType === 'list'">
            <LoadingList 
              :loading="true"
              :items="[]"
              :skeleton-count="listItems"
              :show-avatar="showListAvatar"
              :show-description="showListDescription"
              :show-actions="showListActions"
            />
          </div>
          
          <div v-else-if="contentType === 'editor'" class="space-y-4">
            <!-- Editor Toolbar -->
            <div class="border rounded-lg p-2">
              <div class="flex items-center space-x-2">
                <Skeleton v-for="tool in 8" :key="tool" class="h-8 w-8" />
              </div>
            </div>
            <!-- Editor Content -->
            <div class="border rounded-lg p-4">
              <Skeleton class="h-6 w-48 mb-4" />
              <div class="space-y-2">
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-3/4" />
                <Skeleton class="h-4 w-5/6" />
                <Skeleton class="h-4 w-2/3" />
              </div>
            </div>
          </div>
          
          <div v-else class="space-y-4">
            <!-- Generic content skeleton -->
            <Skeleton class="h-8 w-48" />
            <div class="space-y-2">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-5/6" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <Skeleton v-for="item in 6" :key="item" class="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="showOverlay" class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-card border rounded-lg shadow-lg p-6">
        <div class="flex items-center space-x-4">
          <LoadingSpinner size="lg" />
          <div>
            <h3 class="font-semibold">{{ overlayTitle || 'Loading...' }}</h3>
            <p v-if="overlayMessage" class="text-sm text-muted-foreground">{{ overlayMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'
import LoadingForm from './LoadingForm.vue'
import LoadingTable from './LoadingTable.vue'
import LoadingCard from './LoadingCard.vue'
import LoadingList from './LoadingList.vue'
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  contentType?: 'form' | 'table' | 'cards' | 'list' | 'editor' | 'generic'
  showNavigation?: boolean
  showBreadcrumb?: boolean
  showSidebar?: boolean
  showHeader?: boolean
  showHeaderDescription?: boolean
  showHeaderActions?: boolean
  showSidebarActions?: boolean
  showOverlay?: boolean
  overlayTitle?: string
  overlayMessage?: string
  
  // Sidebar options
  sidebarItems?: number
  
  // Form options
  formFields?: number
  showFormHeader?: boolean
  showFormActions?: boolean
  
  // Table options
  tableHeaders?: string[]
  tableRows?: number
  showTablePagination?: boolean
  
  // Cards options
  cardCount?: number
  cardColumns?: number
  showCardActions?: boolean
  
  // List options
  listItems?: number
  showListAvatar?: boolean
  showListDescription?: boolean
  showListActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  contentType: 'generic',
  showNavigation: true,
  showBreadcrumb: true,
  showSidebar: false,
  showHeader: true,
  showHeaderDescription: true,
  showHeaderActions: true,
  showSidebarActions: true,
  showOverlay: false,
  
  sidebarItems: 5,
  
  formFields: 4,
  showFormHeader: true,
  showFormActions: true,
  
  tableHeaders: () => ['Name', 'Status', 'Date', 'Actions'],
  tableRows: 5,
  showTablePagination: true,
  
  cardCount: 6,
  cardColumns: 3,
  showCardActions: true,
  
  listItems: 5,
  showListAvatar: true,
  showListDescription: true,
  showListActions: true
})

const cardGridClass = computed(() => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }
  return columnClasses[Math.min(props.cardColumns, 4) as keyof typeof columnClasses]
})
</script>