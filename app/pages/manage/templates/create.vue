<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronRight, Home, Save, FileCode2, Code2, Boxes, AlertTriangle, Check, ArrowLeft, Info } from 'lucide-vue-next'
import TemplateTestRunner from '@/components/TemplateTestRunner.vue'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'vue-sonner'
import yaml from 'js-yaml'
import { useYamlTemplateValidation, type ValidationResult } from '@/composables/useYamlTemplateValidation'
import { useYamlTemplateAutocomplete } from '@/composables/useYamlTemplateAutocomplete'

// CodeMirror imports
import { Codemirror } from 'vue-codemirror'
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const config = useRuntimeConfig()
const backendURL = config.public.backendurl

// Light theme for CodeMirror
const lightTheme = EditorView.theme({
  '&': { 
    backgroundColor: 'hsl(var(--muted) / 0.3)',
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': { 
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    caretColor: 'hsl(var(--foreground))',
    padding: '16px 0',
  },
  '.cm-cursor': { borderLeftColor: 'hsl(var(--foreground))' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'hsl(var(--primary) / 0.2)' },
  '.cm-gutters': { 
    backgroundColor: 'hsl(var(--muted) / 0.5)', 
    color: 'hsl(var(--muted-foreground))',
    border: 'none',
    borderRight: '1px solid hsl(var(--border))',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 8px' },
  '.cm-activeLine': { backgroundColor: 'hsl(var(--muted) / 0.5)' },
  '.cm-activeLineGutter': { backgroundColor: 'hsl(var(--muted) / 0.7)' },
}, { dark: false })

// Syntax highlighting for light theme
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.string, color: '#059669' },
  { tag: tags.number, color: '#d97706' },
  { tag: tags.bool, color: '#7c3aed' },
  { tag: tags.null, color: '#7c3aed' },
  { tag: tags.keyword, color: '#2563eb' },
  { tag: tags.propertyName, color: '#dc2626' },
  { tag: tags.definition(tags.propertyName), color: '#dc2626' },
  { tag: tags.punctuation, color: '#6b7280' },
])

// Editor modes
type EditorMode = 'raw' | 'block'
const currentMode = ref<EditorMode>('raw')

// Use composables
const { validateYamlTemplate } = useYamlTemplateValidation()
const { createYamlTemplateAutocomplete } = useYamlTemplateAutocomplete()

// CodeMirror extensions with autocompletion
const extensions = [
  yamlLang(),
  lightTheme,
  syntaxHighlighting(lightHighlightStyle),
  EditorView.lineWrapping,
  createYamlTemplateAutocomplete(),
]


// Template data
const templateName = ref('')
const yamlContent = ref(`# Task Template Definition
# For more info, see the NetGrader Custom YAML Template Guide

task_name: "my_custom_task"
description: "Description of what this task does"
connection_type: "netmiko"  # netmiko, napalm, ssh, or command
author: "Your Name"
version: "1.0.0"
points: 10

# Parameters that can be configured when using this template
parameters:
  - name: "target_ip"
    datatype: "ip_address"
    description: "Target IP address to ping"
    required: true
    example: "192.168.1.100"

# Commands to execute
commands:
  - name: "ping_test"
    action: "ping"
    parameters:
      target_ip: "{{target_ip}}"
      ping_count: 5
    register: "ping_result"

  - name: "parse_success_rate"
    action: "parse_output"
    parameters:
      input: "{{ping_result}}"
      pattern: "Success rate is (\\\\d+) percent"
    register: "success_rate"

# Validation rules for grading
validation:
  - field: "success_rate.first_match"
    condition: "greater_than"
    value: 60
    description: "Ping success rate should be greater than 60%"
`)

// Save state
const isSaving = ref(false)
const saveError = ref<string | null>(null)

// Validation state
const validationResult = ref<ValidationResult>({ isValid: true, errors: [], warnings: [] })

// Computed filename
const fileName = computed(() => {
  if (!templateName.value.trim()) return ''
  const sanitized = templateName.value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
  return `${sanitized}.yaml`
})

// Validate YAML content using comprehensive validation
const validateYaml = () => {
  validationResult.value = validateYamlTemplate(yamlContent.value)
  return validationResult.value.isValid
}

// Watch for YAML changes and validate (debounced)
let validateTimeout: ReturnType<typeof setTimeout> | null = null
watch(yamlContent, () => {
  if (validateTimeout) clearTimeout(validateTimeout)
  validateTimeout = setTimeout(() => {
    validateYaml()
  }, 500)
})

// Save template
const saveTemplate = async () => {
  if (!templateName.value.trim()) {
    toast.error('Template name is required')
    return
  }
  
  if (!validateYaml()) {
    toast.error('Please fix YAML validation errors before saving')
    return
  }
  
  try {
    isSaving.value = true
    saveError.value = null
    
    const response = await $fetch<{ success: boolean; message?: string }>(`${backendURL}/v0/task-templates/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        filename: fileName.value,
        content: yamlContent.value
      }
    })
    
    if (response.success) {
      toast.success('Template saved successfully!', {
        description: `Saved as ${fileName.value}`
      })
    } else {
      throw new Error(response.message || 'Failed to save template')
    }
  } catch (error: any) {
    console.error('Failed to save template:', error)
    saveError.value = error.message || 'Failed to save template'
    toast.error('Failed to save template', {
      description: error.message || 'Please try again later.'
    })
  } finally {
    isSaving.value = false
  }
}

// Handle mode switch
const switchMode = (mode: EditorMode) => {
  if (mode === 'block') {
    toast.info('Block Code Editor coming soon!', {
      description: 'This feature is under development.'
    })
    return
  }
  currentMode.value = mode
}

// Handle keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    saveTemplate()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  validateYaml()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div>
    <!-- Navigation Breadcrumb - Sticks below NavigationBar -->
    <div class="border-b bg-background p-4 sticky top-16 z-40 shadow-sm">
      <div class="flex items-center justify-between">
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
              <BreadcrumbPage class="font-medium">Create Template</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>

    <div class="p-4 pb-8">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/manage">
            <Button variant="ghost" size="icon" class="h-8 w-8">
              <ArrowLeft class="h-4 w-4" />
            </Button>
          </NuxtLink>
          <div>
            <h1 class="text-5xl font-bold mb-1">Create Task Template</h1>
            <p class="text-xl text-muted-foreground">Define a reusable grading template</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Validation Status -->
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <Badge 
                  :variant="validationResult.isValid ? 'default' : 'destructive'"
                  class="gap-1"
                >
                  <Check v-if="validationResult.isValid" class="h-3 w-3" />
                  <AlertTriangle v-else class="h-3 w-3" />
                  {{ validationResult.isValid ? 'Valid' : `${validationResult.errors.length} error(s)` }}{{ validationResult.warnings.length > 0 ? ` • ${validationResult.warnings.length} warning(s)` : '' }}
                </Badge>
              </TooltipTrigger>
              <TooltipContent v-if="!validationResult.isValid || validationResult.warnings.length > 0" class="max-w-md">
                <ul class="text-xs space-y-1">
                  <li v-for="error in validationResult.errors" :key="error.path" class="text-red-400">✗ {{ error.message }}</li>
                  <li v-for="warning in validationResult.warnings" :key="warning.path" class="text-yellow-400">⚠ {{ warning.message }}</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <!-- Save Button -->
          <Button 
            @click="saveTemplate" 
            :disabled="isSaving || !templateName.trim() || !validationResult.isValid"
            class="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save class="h-4 w-4 mr-2" />
            {{ isSaving ? 'Saving...' : 'Save Template' }}
          </Button>
        </div>
      </div>

      <div class="w-full max-w-screen-xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Template Info Card -->
          <Card class="border-border/50">
            <CardHeader class="pb-3">
              <CardTitle class="text-lg flex items-center gap-2">
                <FileCode2 class="h-5 w-5 text-emerald-500" />
                Template Info
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div>
                <Label for="template-name" class="text-sm font-medium">Template Name *</Label>
                <Input
                  id="template-name"
                  v-model="templateName"
                  placeholder="e.g., ping_test"
                  class="mt-1.5"
                />
                <p v-if="fileName" class="text-xs text-muted-foreground mt-1.5">
                  Will be saved as: <code class="bg-muted px-1 rounded">{{ fileName }}</code>
                </p>
              </div>
            </CardContent>
          </Card>

          <!-- Editor Mode Toggle -->
          <Card class="border-border/50">
            <CardHeader class="pb-3">
              <CardTitle class="text-lg">Editor Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs :model-value="currentMode" class="w-full">
                <TabsList class="grid w-full grid-cols-2">
                  <TabsTrigger value="raw" @click="switchMode('raw')">
                    <span class="inline-flex items-center gap-1.5">
                      <Code2 class="h-4 w-4" />
                      Raw Text
                    </span>
                  </TabsTrigger>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <TabsTrigger 
                          value="block" 
                          @click="switchMode('block')" 
                          class="opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <span class="inline-flex items-center gap-1.5">
                            <Boxes class="h-4 w-4" />
                            Block Code
                          </span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Coming soon!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TabsList>
              </Tabs>
              <p class="text-xs text-muted-foreground mt-3">
                {{ currentMode === 'raw' ? 'Edit YAML directly with syntax highlighting' : 'Visual block-based editor' }}
              </p>
            </CardContent>
          </Card>

          <!-- Quick Tips Card -->
          <Card class="border-border/50 bg-blue-500/5">
            <CardHeader class="pb-3">
              <CardTitle class="text-sm flex items-center gap-2">
                <Info class="h-4 w-4 text-blue-500" />
                Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="text-xs text-muted-foreground space-y-2">
                <li>• Press <code class="bg-muted px-1 rounded">Ctrl+Space</code> for suggestions</li>
                <li>• Required: <code class="bg-muted px-1 rounded">task_name</code>, <code class="bg-muted px-1 rounded">description</code>, <code class="bg-muted px-1 rounded">connection_type</code></li>
                <li>• Use <code class="bg-muted px-1 rounded">&#123;&#123;param&#125;&#125;</code> for variables</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <!-- Editor Area -->
        <div class="lg:col-span-3">
          <Card class="border-border/50 overflow-hidden">
            <CardHeader class="pb-3 border-b border-border/50">
              <div class="flex items-center justify-between">
                <CardTitle class="text-lg flex items-center gap-2">
                  <Code2 class="h-5 w-5" />
                  YAML Editor
                </CardTitle>
                <Badge variant="outline" class="text-xs">
                  {{ yamlContent.split('\n').length }} lines
                </Badge>
              </div>
            </CardHeader>
            <CardContent class="p-0">
              <!-- Raw Text Editor with CodeMirror -->
              <div v-if="currentMode === 'raw'" class="yaml-editor">
                <ClientOnly>
                  <Codemirror
                    v-model="yamlContent"
                    :extensions="extensions"
                    :style="{ height: '600px' }"
                    placeholder="Enter YAML content..."
                  />
                  <template #fallback>
                    <textarea
                      v-model="yamlContent"
                      class="w-full h-[600px] p-4 font-mono text-sm bg-muted/30 border-0 focus:outline-none focus:ring-0 resize-none"
                      placeholder="Loading editor..."
                      spellcheck="false"
                    />
                  </template>
                </ClientOnly>
              </div>

              <!-- Block Code Editor Placeholder -->
              <div v-else class="flex items-center justify-center min-h-[600px] bg-muted/20">
                <div class="text-center">
                  <Boxes class="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 class="text-lg font-semibold text-muted-foreground">Block Code Editor</h3>
                  <p class="text-sm text-muted-foreground/70">Coming soon...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Validation Errors -->
          <div v-if="!validationResult.isValid" class="mt-4">
            <Alert variant="destructive">
              <AlertTriangle class="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul class="mt-2 space-y-1">
                  <li v-for="error in validationResult.errors" :key="error.path" class="text-sm">
                    <strong>{{ error.path }}:</strong> {{ error.message }}
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <!-- Save Error -->
          <div v-if="saveError" class="mt-4">
            <Alert variant="destructive">
              <AlertTriangle class="h-4 w-4" />
              <AlertTitle>Save Error</AlertTitle>
              <AlertDescription>{{ saveError }}</AlertDescription>
            </Alert>
          </div>

          <!-- Template Test Runner -->
          <div class="mt-4">
            <TemplateTestRunner :yaml-content="yamlContent" storage-key="create" />
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.yaml-editor :deep(.cm-editor),
.json-editor :deep(.cm-editor) {
  font-size: 14px;
}

.yaml-editor :deep(.cm-editor.cm-focused),
.json-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}

.yaml-editor :deep(.cm-gutters),
.json-editor :deep(.cm-gutters) {
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
