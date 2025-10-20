<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Network class="w-5 h-5" />
          Your Declared IP Addresses
        </DialogTitle>
        <DialogDescription>
          Review and update your IP addresses. Changes are saved when you click "Save Changes".
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- Network Variables Section -->
        <div v-if="networkVariables && networkVariables.length > 0" class="space-y-3">
          <div class="flex items-center gap-2">
            <Globe class="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Network Variables
            </h3>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="variable in networkVariables"
              :key="variable.key"
              class="p-3 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-950/20"
            >
              <div class="text-xs font-medium text-purple-700 dark:text-purple-300">
                {{ variable.label }}
              </div>
              <div class="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                {{ variable.value }}
              </div>
            </div>
          </div>
        </div>

        <!-- Declared IPs Section -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Server class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Device IP Addresses
              </h3>
            </div>
            <Badge variant="outline">
              {{ Object.keys(declaredIps).length }} devices
            </Badge>
          </div>

          <!-- IP Address Table -->
          <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Device.Interface
                  </th>
                  <th
                    v-for="column in tableColumns"
                    :key="column"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {{ column }}
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="(rowData, deviceKey) in declaredIps"
                  :key="deviceKey"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ rowData.displayName }}
                  </td>
                  <td
                    v-for="column in tableColumns"
                    :key="column"
                    class="px-4 py-3"
                  >
                    <div class="relative">
                      <Input
                        v-model="rowData.values[column]"
                        type="text"
                        placeholder="xxx.xxx.xxx.xxx"
                        class="font-mono text-sm"
                        :class="{
                          'border-red-500': !isValidIP(rowData.values[column]),
                          'border-green-500': isValidIP(rowData.values[column])
                        }"
                        :disabled="!editMode"
                      />
                      <div
                        v-if="!isValidIP(rowData.values[column]) && rowData.values[column]"
                        class="text-xs text-red-600 dark:text-red-400 mt-1"
                      >
                        Invalid IP format
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <Button
                      v-if="editMode"
                      variant="ghost"
                      size="sm"
                      @click="resetRow(deviceKey)"
                      class="text-xs"
                    >
                      <RotateCcw class="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DialogFooter class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle class="w-4 h-4" />
          <span>Changes are only saved when you click "Save Changes"</span>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            @click="handleClose"
          >
            {{ editMode ? 'Cancel' : 'Close' }}
          </Button>
          <Button
            v-if="!editMode"
            @click="enableEditMode"
          >
            <Edit class="w-4 h-4 mr-2" />
            Edit IPs
          </Button>
          <Button
            v-else
            @click="saveChanges"
            :disabled="isSaving || !hasValidIps"
          >
            <Loader2 v-if="isSaving" class="w-4 h-4 mr-2 animate-spin" />
            <Save v-else class="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  Network,
  Server,
  Globe,
  Edit,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle
} from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NetworkVariable {
  key: string
  label: string
  value: string
}

interface DeviceIpData {
  displayName: string
  values: Record<string, string>
}

interface Props {
  open: boolean
  declaredIps: Record<string, DeviceIpData>
  networkVariables?: NetworkVariable[]
  tableColumns: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [updatedIps: Record<string, DeviceIpData>]
}>()

// State
const editMode = ref(false)
const isSaving = ref(false)
const localDeclaredIps = ref<Record<string, DeviceIpData>>({})
const originalIps = ref<Record<string, DeviceIpData>>({})

// Watch for prop changes to update local state
watch(() => props.declaredIps, (newIps) => {
  localDeclaredIps.value = JSON.parse(JSON.stringify(newIps))
  originalIps.value = JSON.parse(JSON.stringify(newIps))
}, { immediate: true, deep: true })

// Validate IP address format
const isValidIP = (ip: string): boolean => {
  if (!ip || ip.trim() === '') return false

  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ip.match(ipPattern)

  if (!match) return false

  // Check each octet is between 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i])
    if (octet < 0 || octet > 255) return false
  }

  return true
}

// Check if all IPs are valid
const hasValidIps = computed(() => {
  for (const deviceKey in localDeclaredIps.value) {
    const rowData = localDeclaredIps.value[deviceKey]
    for (const column in rowData.values) {
      const ip = rowData.values[column]
      if (!isValidIP(ip)) {
        return false
      }
    }
  }
  return true
})

// Enable edit mode
const enableEditMode = () => {
  editMode.value = true
}

// Reset a specific row
const resetRow = (deviceKey: string) => {
  if (originalIps.value[deviceKey]) {
    localDeclaredIps.value[deviceKey] = JSON.parse(JSON.stringify(originalIps.value[deviceKey]))
  }
}

// Save changes
const saveChanges = async () => {
  if (!hasValidIps.value) {
    toast.error('Invalid IP Addresses', {
      description: 'Please fix all invalid IP addresses before saving.'
    })
    return
  }

  isSaving.value = true

  try {
    // Emit save event with updated IPs
    emit('save', JSON.parse(JSON.stringify(localDeclaredIps.value)))

    // Update original IPs to reflect saved state
    originalIps.value = JSON.parse(JSON.stringify(localDeclaredIps.value))

    toast.success('IP Addresses Updated', {
      description: 'Your IP addresses have been saved successfully.'
    })

    editMode.value = false
  } catch (error) {
    console.error('Failed to save IP addresses:', error)
    toast.error('Save Failed', {
      description: 'Failed to save your IP addresses. Please try again.'
    })
  } finally {
    isSaving.value = false
  }
}

// Handle modal close
const handleClose = (value: boolean) => {
  if (!value) {
    // Reset to original if closing without saving
    if (editMode.value) {
      localDeclaredIps.value = JSON.parse(JSON.stringify(originalIps.value))
      editMode.value = false
    }
  }
  emit('update:open', value)
}
</script>

<style scoped>
/* Smooth transitions for input states */
input {
  transition: all 0.2s ease-in-out;
}
</style>
