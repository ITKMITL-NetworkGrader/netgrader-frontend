<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { parseTweakcnCSS, nameToSlug } from '~/utils/themeParser'
import type { ThemePreset } from '~/data/themes'

const userState = useUserState()
const config = useRuntimeConfig()
const backendURL = config.public.backendurl

const {
  currentThemeId,
  colorMode,
  allThemes,
  customThemes,
  applyTheme,
  applyColorMode,
  savePreferences,
  fetchCustomThemes,
} = useTheme()

const isAdmin = computed(() => userState.value?.role === 'ADMIN')

// Fetch custom themes on mount
onMounted(() => {
  fetchCustomThemes()
})

// Track initial values so we know if the user made changes
const initialThemeId = ref(currentThemeId.value)
const initialColorMode = ref(colorMode.value)

const hasChanges = computed(() => {
  return currentThemeId.value !== initialThemeId.value
    || colorMode.value !== initialColorMode.value
})

const isSaving = ref(false)

async function save() {
  isSaving.value = true
  try {
    await savePreferences()
    initialThemeId.value = currentThemeId.value
    initialColorMode.value = colorMode.value
    toast.success('Preferences saved')
  } catch {
    toast.error('Failed to save preferences')
  } finally {
    isSaving.value = false
  }
}

const colorModeOptions = [
  { value: 'light' as const, label: 'Light', icon: 'lucide:sun' },
  { value: 'dark' as const, label: 'Dark', icon: 'lucide:moon' },
  { value: 'system' as const, label: 'System', icon: 'lucide:monitor' },
]

function getSwatches(theme: ThemePreset) {
  const dark = theme.cssVars.dark
  return [
    dark['--background'],
    dark['--primary'],
    dark['--secondary'],
    dark['--accent'],
    dark['--foreground'],
  ]
}

// --- Admin: Theme Upload ---
const showUploadForm = ref(false)
const cssInput = ref('')
const themeName = ref('')
const themeDescription = ref('')
const parseError = ref('')
const isUploading = ref(false)
const isDeletingId = ref<string | null>(null)

const parsedPreview = computed(() => {
  if (!cssInput.value.trim()) return null
  parseError.value = ''
  const result = parseTweakcnCSS(cssInput.value)
  if (!result) {
    parseError.value = 'Could not find :root or .dark CSS variable blocks'
    return null
  }
  return result
})

const previewVarCount = computed(() => {
  if (!parsedPreview.value) return 0
  return Object.keys(parsedPreview.value.light).length
    + Object.keys(parsedPreview.value.dark).length
    + Object.keys(parsedPreview.value.theme).length
})

async function uploadTheme() {
  if (!parsedPreview.value || !themeName.value.trim()) return

  isUploading.value = true
  try {
    const themeId = nameToSlug(themeName.value)

    await $fetch(`${backendURL}/v0/themes`, {
      method: 'POST',
      credentials: 'include',
      body: {
        themeId,
        name: themeName.value.trim(),
        description: themeDescription.value.trim() || undefined,
        cssVars: parsedPreview.value,
      },
    })

    toast.success(`Theme "${themeName.value}" uploaded`)

    // Reset form
    cssInput.value = ''
    themeName.value = ''
    themeDescription.value = ''
    showUploadForm.value = false

    // Refresh custom themes
    await fetchCustomThemes(true)
  } catch (e: any) {
    const msg = e?.data?.error || e?.message || 'Failed to upload theme'
    toast.error(msg)
  } finally {
    isUploading.value = false
  }
}

async function deleteTheme(themeId: string) {
  isDeletingId.value = themeId
  try {
    await $fetch(`${backendURL}/v0/themes/${themeId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    toast.success('Theme deleted')

    // If the deleted theme was active, switch to default
    if (currentThemeId.value === themeId) {
      applyTheme('default', true)
    }

    await fetchCustomThemes(true)
  } catch (e: any) {
    const msg = e?.data?.error || e?.message || 'Failed to delete theme'
    toast.error(msg)
  } finally {
    isDeletingId.value = null
  }
}

function isCustomTheme(themeId: string): boolean {
  return customThemes.value.some(t => t.id === themeId)
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink
          to="/"
          class="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-flex items-center gap-1"
        >
          <Icon name="lucide:arrow-left" class="w-4 h-4" />
          Back
        </NuxtLink>
        <h1 class="text-2xl font-bold mt-2">Personalization</h1>
        <p class="text-muted-foreground mt-1">Customize the look and feel of NetGrader</p>
      </div>

      <!-- Color Mode Section -->
      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="text-lg">Color Mode</CardTitle>
          <CardDescription>Choose between light, dark, or system color mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex gap-3">
            <button
              v-for="option in colorModeOptions"
              :key="option.value"
              class="flex items-center gap-2 px-4 py-2.5 rounded-md border transition-all duration-200 text-sm font-medium"
              :class="colorMode === option.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'"
              @click="applyColorMode(option.value, true)"
            >
              <Icon :name="option.icon" class="w-4 h-4" />
              {{ option.label }}
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Theme Selection Section -->
      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="text-lg">Theme</CardTitle>
          <CardDescription>Select a theme preset for the entire application</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="theme in allThemes"
              :key="theme.id"
              class="relative p-4 rounded-md border transition-all duration-200 text-left group"
              :class="currentThemeId === theme.id
                ? 'border-primary ring-1 ring-primary'
                : 'border-border hover:border-foreground/20'"
              @click="applyTheme(theme.id, true)"
            >
              <!-- Checkmark -->
              <div
                v-if="currentThemeId === theme.id"
                class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <Icon name="lucide:check" class="w-3 h-3 text-primary-foreground" />
              </div>

              <!-- Admin delete button for custom themes -->
              <button
                v-if="isAdmin && isCustomTheme(theme.id)"
                class="absolute top-2 right-8 w-5 h-5 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                :disabled="isDeletingId === theme.id"
                @click.stop="deleteTheme(theme.id)"
              >
                <Icon
                  :name="isDeletingId === theme.id ? 'lucide:loader-2' : 'lucide:x'"
                  class="w-3 h-3 text-destructive-foreground"
                  :class="{ 'animate-spin': isDeletingId === theme.id }"
                />
              </button>

              <!-- Color swatches -->
              <div class="flex gap-1.5 mb-3">
                <div
                  v-for="(color, i) in getSwatches(theme)"
                  :key="i"
                  class="w-6 h-6 rounded-full border border-border/50"
                  :style="{ backgroundColor: color }"
                />
              </div>

              <!-- Theme name & badge -->
              <div class="flex items-center gap-1.5">
                <p class="font-medium text-sm">{{ theme.name }}</p>
                <span
                  v-if="isCustomTheme(theme.id)"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
                >
                  Custom
                </span>
              </div>
              <p v-if="theme.description" class="text-xs text-muted-foreground mt-0.5">
                {{ theme.description }}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Save Button -->
      <div class="flex justify-end mb-8">
        <Button
          :disabled="!hasChanges || isSaving"
          @click="save"
          class="min-w-[120px]"
        >
          <Icon v-if="isSaving" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>

      <!-- Admin: Manage Themes -->
      <Card v-if="isAdmin">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="text-lg">Manage Themes</CardTitle>
              <CardDescription>Upload custom themes from CSS (Admin only)</CardDescription>
            </div>
            <Button
              v-if="!showUploadForm"
              size="sm"
              @click="showUploadForm = true"
            >
              <Icon name="lucide:plus" class="w-4 h-4 mr-1" />
              Upload Theme
            </Button>
          </div>
        </CardHeader>
        <CardContent v-if="showUploadForm">
          <div class="space-y-4">
            <!-- Theme name -->
            <div>
              <label class="text-sm font-medium mb-1.5 block">Theme Name</label>
              <input
                v-model="themeName"
                type="text"
                placeholder="e.g. Violet Rose"
                class="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                maxlength="100"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="text-sm font-medium mb-1.5 block">Description (optional)</label>
              <input
                v-model="themeDescription"
                type="text"
                placeholder="e.g. Warm purple tones with rosy accents"
                class="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                maxlength="500"
              />
            </div>

            <!-- CSS Input -->
            <div>
              <label class="text-sm font-medium mb-1.5 block">
                Paste CSS from
                <a
                  href="https://tweakcn.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  tweakcn.com
                </a>
              </label>
              <textarea
                v-model="cssInput"
                rows="12"
                placeholder="Paste your CSS here... Must contain :root { } and .dark { } blocks with CSS custom properties."
                class="w-full px-3 py-2 text-sm rounded-md border border-input bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
            </div>

            <!-- Parse status -->
            <div v-if="parseError" class="text-sm text-destructive">
              {{ parseError }}
            </div>
            <div v-else-if="parsedPreview" class="text-sm text-muted-foreground">
              Parsed {{ previewVarCount }} CSS variables successfully
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3">
              <Button
                :disabled="!parsedPreview || !themeName.trim() || isUploading"
                @click="uploadTheme"
              >
                <Icon v-if="isUploading" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
                {{ isUploading ? 'Uploading...' : 'Upload Theme' }}
              </Button>
              <Button
                variant="ghost"
                @click="showUploadForm = false; cssInput = ''; themeName = ''; themeDescription = ''"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
