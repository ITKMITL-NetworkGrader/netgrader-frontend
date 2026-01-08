<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ChevronRight, Home, Plus, Edit, Trash2, FileCode2, RefreshCw, Search, ExternalLink, AlertCircle } from 'lucide-vue-next'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'

const config = useRuntimeConfig()
const backendURL = config.public.backendurl

// Type definitions
interface TaskTemplate {
  id: string
  _id?: string
  templateId: string
  name: string
  description: string
  source: 'mongo' | 'minio'
  category?: string
}

interface TemplatesResponse {
  success: boolean
  data: {
    templates: TaskTemplate[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
    }
  }
}

// State
const taskTemplates = ref<TaskTemplate[]>([])
const isLoading = ref(false)
const isRefreshing = ref(false)
const searchQuery = ref('')
const isDeleteDialogOpen = ref(false)
const templateToDelete = ref<TaskTemplate | null>(null)
const isDeleting = ref(false)

// Computed
const filteredTemplates = computed(() => {
  if (!searchQuery.value.trim()) {
    return taskTemplates.value
  }
  const query = searchQuery.value.toLowerCase()
  return taskTemplates.value.filter(t => 
    t.name.toLowerCase().includes(query) ||
    t.description.toLowerCase().includes(query) ||
    t.category?.toLowerCase().includes(query)
  )
})

const customTemplatesCount = computed(() => 
  taskTemplates.value.filter(t => t.source === 'minio').length
)

const builtInTemplatesCount = computed(() => 
  taskTemplates.value.filter(t => t.source === 'mongo').length
)

// Fetch templates
const fetchTemplates = async () => {
  try {
    isLoading.value = true
    const response = await $fetch<TemplatesResponse>(`${backendURL}/v0/task-templates`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    if (response.success && response.data) {
      taskTemplates.value = response.data.templates || []
    }
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    taskTemplates.value = []
    toast.error('Failed to load templates', {
      description: 'Please try again later.'
    })
  } finally {
    isLoading.value = false
  }
}

// Refresh with animation
const refreshTemplates = async () => {
  isRefreshing.value = true
  await fetchTemplates()
  setTimeout(() => {
    isRefreshing.value = false
  }, 500)
}

// Navigate to edit page
const navigateToEdit = (template: TaskTemplate) => {
  const id = template._id || template.id
  navigateTo(`/manage/templates/${id}/edit`)
}

// Open delete confirmation
const openDeleteDialog = (template: TaskTemplate) => {
  if (template.source === 'mongo') {
    toast.error('Cannot delete built-in templates', {
      description: 'Only custom templates can be deleted.'
    })
    return
  }
  templateToDelete.value = template
  isDeleteDialogOpen.value = true
}

// Delete template
const deleteTemplate = async () => {
  if (!templateToDelete.value) return
  
  try {
    isDeleting.value = true
    const id = templateToDelete.value._id || templateToDelete.value.id
    
    // Use the appropriate endpoint based on template source
    const endpoint = templateToDelete.value.source === 'minio'
      ? `${backendURL}/v0/task-templates/minio/${id}`
      : `${backendURL}/v0/task-templates/${id}`
    
    await $fetch(endpoint, {
      method: 'DELETE',
      credentials: 'include',
    })
    
    toast.success('Template deleted successfully!', {
      description: `"${templateToDelete.value.name}" has been removed.`
    })
    
    isDeleteDialogOpen.value = false
    templateToDelete.value = null
    await fetchTemplates()
  } catch (error) {
    console.error('Failed to delete template:', error)
    toast.error('Failed to delete template', {
      description: 'Please try again later.'
    })
  } finally {
    isDeleting.value = false
  }
}

// Get badge variant
const getSourceBadge = (source: string) => {
  return source === 'minio' ? 'secondary' : 'outline'
}

onMounted(() => {
  fetchTemplates()
})
</script>

<template>
  <div>
    <!-- Navigation Breadcrumb -->
    <div class="border-b bg-background p-4 sticky top-16 z-40 shadow-sm">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <NuxtLink to="/" class="flex items-center hover:text-primary transition-colors">
              <Home class="h-4 w-4" />
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <NuxtLink to="/manage" class="hover:text-primary transition-colors">
              Manage
            </NuxtLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage class="font-medium">Templates</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <div class="p-4 pb-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-5xl font-bold mb-1">Task Templates</h1>
          <p class="text-xl text-muted-foreground">Manage your grading templates</p>
        </div>
        <NuxtLink to="/manage/templates/create">
          <Button class="bg-emerald-600 hover:bg-emerald-700">
            <Plus class="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </NuxtLink>
      </div>

      <div class="w-full max-w-screen-xl mx-auto">
        <!-- Stats Cards -->
        <div class="mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card class="border-border/50">
              <CardContent class="p-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-emerald-500/10 rounded-lg">
                    <FileCode2 class="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <div class="text-2xl font-bold">{{ taskTemplates.length }}</div>
                    <div class="text-sm text-muted-foreground">Total Templates</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card class="border-border/50">
              <CardContent class="p-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-blue-500/10 rounded-lg">
                    <FileCode2 class="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div class="text-2xl font-bold">{{ builtInTemplatesCount }}</div>
                    <div class="text-sm text-muted-foreground">Built-in</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card class="border-border/50">
              <CardContent class="p-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-violet-500/10 rounded-lg">
                    <FileCode2 class="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <div class="text-2xl font-bold">{{ customTemplatesCount }}</div>
                    <div class="text-sm text-muted-foreground">Custom</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div class="text-xs text-muted-foreground mt-2 ml-auto text-right">Built-in and Custom are template types</div>
        </div>

        <!-- Templates List Card -->
        <Card class="border-border/50">
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-xl">All Templates</CardTitle>
                <CardDescription>Browse and manage your task templates</CardDescription>
              </div>
              <div class="flex items-center gap-3">
                <!-- Search -->
                <div class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    v-model="searchQuery"
                    placeholder="Search templates..."
                    class="pl-9 w-64"
                  />
                </div>
                <!-- Refresh -->
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button variant="ghost" size="icon" :disabled="isLoading || isRefreshing" @click="refreshTemplates">
                        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh templates</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <!-- Loading State -->
            <div v-if="isLoading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>

            <!-- Empty State -->
            <div v-else-if="taskTemplates.length === 0" class="text-center py-12">
              <FileCode2 class="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 class="text-lg font-semibold mb-2">No templates found</h3>
              <p class="text-muted-foreground mb-4 text-sm">Create your first template to get started!</p>
              <NuxtLink to="/manage/templates/create">
                <Button class="bg-emerald-600 hover:bg-emerald-700">
                  <Plus class="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </NuxtLink>
            </div>

            <!-- No Search Results -->
            <div v-else-if="filteredTemplates.length === 0" class="text-center py-12">
              <Search class="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 class="text-lg font-semibold mb-2">No matching templates</h3>
              <p class="text-muted-foreground text-sm">Try a different search term</p>
            </div>

            <!-- Templates Table -->
            <div v-else class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border/50">
                    <th class="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Name</th>
                    <th class="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Description</th>
                    <th class="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Type</th>
                    <th class="text-right py-3 px-4 font-medium text-muted-foreground text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="template in filteredTemplates" 
                    :key="template.id || template._id"
                    class="border-b border-border/30 hover:bg-muted/30 transition-colors group"
                  >
                    <td class="py-3 px-4">
                      <div class="font-medium">{{ template.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ template.templateId }}</div>
                    </td>
                    <td class="py-3 px-4 max-w-md">
                      <div class="text-sm text-muted-foreground truncate">{{ template.description }}</div>
                    </td>
                    <td class="py-3 px-4">
                      <Badge :variant="getSourceBadge(template.source)" class="text-xs">
                        {{ template.source === 'minio' ? 'Custom' : 'Built-in' }}
                      </Badge>
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger as-child>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                class="h-8 w-8"
                                @click="navigateToEdit(template)"
                              >
                                <Edit class="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit template</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger as-child>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                :disabled="template.source === 'mongo'"
                                @click="openDeleteDialog(template)"
                              >
                                <Trash2 class="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {{ template.source === 'mongo' ? 'Cannot delete built-in templates' : 'Delete template' }}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="isDeleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertCircle class="h-5 w-5 text-destructive" />
            Delete Template
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{{ templateToDelete?.name }}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="isDeleteDialogOpen = false" :disabled="isDeleting">
            Cancel
          </Button>
          <Button variant="destructive" @click="deleteTemplate" :disabled="isDeleting">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
