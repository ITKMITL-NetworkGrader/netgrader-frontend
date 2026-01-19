<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Table2 class="w-5 h-5 text-primary" />
          Configure Table Dimensions
        </DialogTitle>
        <DialogDescription>
          Set the number of rows and columns for your IP table questionnaire
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- Row Count -->
        <div class="space-y-2">
          <Label for="rowCount" class="text-sm font-medium">
            Number of Rows <span class="text-destructive">*</span>
          </Label>
          <Input
            id="rowCount"
            v-model.number="localRowCount"
            type="number"
            min="1"
            max="20"
            placeholder="Enter row count (1-20)"
            :class="{
              'border-destructive': errors.rowCount,
              'border-green-500': !errors.rowCount && localRowCount >= 1 && localRowCount <= 20
            }"
            @blur="validateRowCount"
          />
          <p v-if="errors.rowCount" class="text-sm text-destructive">
            {{ errors.rowCount }}
          </p>
          <p v-else class="text-xs text-muted-foreground">
            Each row represents a device interface (e.g., router1.g0-1)
          </p>
        </div>

        <!-- Column Count -->
        <div class="space-y-2">
          <Label for="columnCount" class="text-sm font-medium">
            Number of Columns <span class="text-destructive">*</span>
          </Label>
          <Input
            id="columnCount"
            v-model.number="localColumnCount"
            type="number"
            min="1"
            max="20"
            placeholder="Enter column count (1-20)"
            :class="{
              'border-destructive': errors.columnCount,
              'border-green-500': !errors.columnCount && localColumnCount >= 1 && localColumnCount <= 20
            }"
            @blur="validateColumnCount"
          />
          <p v-if="errors.columnCount" class="text-sm text-destructive">
            {{ errors.columnCount }}
          </p>
          <p v-else class="text-xs text-muted-foreground">
            Each column represents a network field (IPv4, Gateway, DNS, etc.)
          </p>
        </div>

        <!-- Info Alert -->
        <Alert class="bg-blue-50 border-blue-200">
          <Info class="w-4 h-4 text-blue-600" />
          <AlertDescription class="text-xs text-blue-800">
            <strong>Note:</strong> You can configure the specific column types and device interfaces in the next step
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleCancel"
        >
          Cancel
        </Button>
        <Button
          @click="handleCreate"
          :disabled="!isValid"
        >
          <ArrowRight class="w-4 h-4 mr-2" />
          Create Table
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Table2, Info, ArrowRight } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'create', dimensions: { rowCount: number; columnCount: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localRowCount = ref<number>(3)
const localColumnCount = ref<number>(4)
const errors = ref<{
  rowCount?: string
  columnCount?: string
}>({})

// Validation
const validateRowCount = () => {
  if (!localRowCount.value) {
    errors.value.rowCount = 'Row count is required'
    return false
  }
  if (localRowCount.value < 1) {
    errors.value.rowCount = 'Row count must be at least 1'
    return false
  }
  if (localRowCount.value > 20) {
    errors.value.rowCount = 'Row count cannot exceed 20'
    return false
  }
  delete errors.value.rowCount
  return true
}

const validateColumnCount = () => {
  if (!localColumnCount.value) {
    errors.value.columnCount = 'Column count is required'
    return false
  }
  if (localColumnCount.value < 1) {
    errors.value.columnCount = 'Column count must be at least 1'
    return false
  }
  if (localColumnCount.value > 20) {
    errors.value.columnCount = 'Column count cannot exceed 20'
    return false
  }
  delete errors.value.columnCount
  return true
}

const isValid = computed(() => {
  return validateRowCount() && validateColumnCount()
})

// Methods
const handleOpenChange = (value: boolean) => {
  emit('update:open', value)
}

const handleCancel = () => {
  emit('update:open', false)
}

const handleCreate = () => {
  if (!isValid.value) return

  emit('create', {
    rowCount: localRowCount.value,
    columnCount: localColumnCount.value
  })
  emit('update:open', false)
}

// Reset form when modal opens
watch(() => props.open, (newValue) => {
  if (newValue) {
    localRowCount.value = 3
    localColumnCount.value = 4
    errors.value = {}
  }
})
</script>
