<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent
      class="w-[95vw] sm:w-full sm:max-w-[1100px] max-h-[90vh] flex flex-col overflow-hidden rounded-lg p-0"
    >
      <!-- Header -->
      <div class="shrink-0 bg-background border-b px-6 py-4">
        <DialogHeader>
          <DialogTitle class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Table2 class="w-6 h-6 text-primary" />
              <div>
                <h2 class="text-2xl font-bold">IP Table Questionnaire Builder</h2>
                <p class="text-sm text-muted-foreground font-normal mt-1">
                  Configure row/column headers and expected answers
                </p>
              </div>
            </div>
            <Badge variant="secondary" class="text-sm">
              {{ tableData.rowCount }} × {{ tableData.columnCount }} Table
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <!-- Toolbar -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t">
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="handleAutoCalculate"
              :disabled="!canAutoCalculate"
            >
              <Wand2 class="w-4 h-4 mr-2" />
              Auto-Calculate Answers
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="handleClearAll"
            >
              <Eraser class="w-4 h-4 mr-2" />
              Clear All Cells
            </Button>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-sm text-muted-foreground">
              Total Points: <span class="font-semibold text-foreground">{{ totalPoints }}</span>
            </div>
            <button
              v-if="hasValidationErrors"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive transition hover:bg-destructive/15 focus:outline-none focus:ring-2 focus:ring-destructive/40 focus:ring-offset-2"
              @click="handleOpenValidationModal"
            >
              <XCircle class="w-4 h-4" aria-hidden="true" />
              <span class="sr-only">Validation issues:</span>
              <span>{{ validationErrorCount }}</span>
            </button>
            <div
              v-else
              class="flex items-center gap-2 rounded-full border border-muted px-3 py-1 text-sm text-muted-foreground"
            >
              <CheckCircle2 class="w-4 h-4 text-emerald-500" aria-hidden="true" />
              <span>All fields valid</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4">
        <!-- Instructions Alert -->
        <Alert class="mb-6 bg-blue-50 border-blue-200">
          <Info class="w-4 h-4 text-blue-600" />
          <AlertDescription class="text-sm text-blue-800">
            <strong>How to build your table:</strong>
            <ol class="list-decimal list-inside mt-2 space-y-1">
              <li>Configure each column header by selecting the field type (and VLAN if applicable)</li>
              <li>Configure each row header by selecting the device and interface</li>
              <li>Fill in the expected answer for each cell, or use Auto-Calculate</li>
              <li>Adjust points per cell if needed (default: 1 point)</li>
            </ol>
          </AlertDescription>
        </Alert>

        <!-- Table Container -->
        <div class="border rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <!-- Table Header Row -->
              <thead>
                <tr class="bg-muted/50">
                  <!-- Top-left corner cell -->
                  <th class="border px-4 py-3 text-center bg-muted">
                    <div class="flex items-center justify-center gap-2">
                      <Server class="w-4 h-4 text-muted-foreground" />
                      <span class="text-sm font-semibold">Device.Interface</span>
                    </div>
                  </th>
                  <!-- Column header cells -->
                  <th
                    v-for="(column, colIndex) in tableData.columns"
                    :key="column.columnId"
                    class="border px-4 py-3 min-w-[200px]"
                  >
                    <!-- Column Label Input -->
                    <Input
                      v-model="column.label"
                      placeholder="Column label (e.g., IPv4, Subnet Mask)"
                      class="font-semibold"
                    />
                  </th>
                </tr>
              </thead>

              <!-- Table Body -->
              <tbody>
                <tr
                  v-for="(row, rowIndex) in tableData.rows"
                  :key="row.rowId"
                  :class="rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'"
                >
                  <!-- Row header cell -->
                  <td class="border px-4 py-3 bg-muted/30 min-w-[200px]">
                    <div class="space-y-2">
                      <!-- Device Selector -->
                      <Select
                        v-model="row.deviceId"
                        @update:modelValue="() => handleRowDeviceChange(rowIndex)"
                      >
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="Select device..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="device in devices"
                            :key="device.deviceId"
                            :value="device.deviceId"
                          >
                            {{ device.deviceId }}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <!-- Interface Selector -->
                      <Select
                        v-model="row.interfaceName"
                        @update:modelValue="() => handleRowInterfaceChange(rowIndex)"
                        :disabled="!row.deviceId"
                      >
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="Select interface..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="iface in getDeviceInterfaces(row.deviceId)"
                            :key="iface.name"
                            :value="iface.name"
                          >
                            {{ iface.name }}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <!-- Display Name Preview -->
                      <div v-if="row.displayName" class="text-xs text-muted-foreground">
                        Display: <code class="bg-muted px-1 py-0.5 rounded">{{ row.displayName }}</code>
                      </div>
                    </div>
                  </td>

                  <!-- Data cells -->
                  <td
                    v-for="(column, colIndex) in tableData.columns"
                    :key="column.columnId"
                    class="border px-4 py-3"
                  >
                    <div class="space-y-2">
                      <!-- Configure Cell Button -->
                      <Button
                        variant="outline"
                        size="sm"
                        class="w-full justify-start text-left h-auto py-2"
                        :class="{
                          'border-destructive ring-1 ring-destructive/40':
                            hasAttemptedSave && !isCellConfigured(tableData.cells[rowIndex][colIndex]),
                          'border-green-500 bg-green-50': isCellConfigured(tableData.cells[rowIndex][colIndex]),
                          'bg-blue-50': tableData.cells[rowIndex][colIndex].autoCalculated
                        }"
                        @click="handleConfigureCell(rowIndex, colIndex)"
                      >
                        <Settings class="w-4 h-4 mr-2 shrink-0" />
                        <div class="flex-1 min-w-0">
                          <div class="text-xs font-normal truncate">
                            {{ getCellDisplayText(tableData.cells[rowIndex][colIndex]) }}
                          </div>
                          <div class="text-xs text-muted-foreground mt-1">
                            <Badge variant="secondary" class="text-xs">
                              {{ tableData.cells[rowIndex][colIndex].answerType }}
                            </Badge>
                          </div>
                        </div>
                      </Button>

                      <!-- Points Display -->
                      <div class="flex items-center gap-2 justify-between">
                        <span class="text-xs text-muted-foreground">
                          Points: <span class="font-semibold">{{ tableData.cells[rowIndex][colIndex].points }}</span>
                        </span>
                        <Badge
                          v-if="tableData.cells[rowIndex][colIndex].autoCalculated"
                          variant="secondary"
                          class="text-xs"
                        >
                          <Wand2 class="w-3 h-3 mr-1" />
                          Auto
                        </Badge>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="shrink-0 bg-background border-t px-6 py-4">
        <div class="flex items-center justify-between">
          <Button
            variant="outline"
            @click="handleCancel"
          >
            <X class="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              @click="handlePreview"
            >
              <Eye class="w-4 h-4 mr-2" />
              Preview Table
            </Button>
            <Button
              @click="handleSave"
            >
              <Check class="w-4 h-4 mr-2" />
              Save Table
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="validationModalOpen">
    <DialogContent class="max-w-[520px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-destructive">
          <XCircle class="w-5 h-5" aria-hidden="true" />
          {{ validationErrorCount }}
          {{ validationErrorCount === 1 ? 'validation issue' : 'validation issues' }}
        </DialogTitle>
        <DialogDescription v-if="hasValidationErrors">
          Review the list below to resolve the remaining validation problems.
        </DialogDescription>
        <DialogDescription v-else>
          Great! All validation checks are passing.
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="hasValidationErrors"
        class="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-2"
      >
        <div
          v-for="(error, idx) in validationErrors"
          :key="`${idx}-${error}`"
          class="flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <span class="font-semibold text-destructive/70">{{ idx + 1 }}.</span>
          <span class="flex-1">{{ error }}</span>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <Button variant="outline" @click="validationModalOpen = false">
          Close
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Cell Configuration Modal -->
  <CellConfigModal
    v-if="configuringCell && currentCellConfig"
    :open="cellConfigModalOpen"
    :cell="currentCellConfig"
    :row-index="configuringCell.rowIndex"
    :col-index="configuringCell.colIndex"
    :devices="devices"
    :vlans="vlans"
    @update:open="(value) => cellConfigModalOpen = value"
    @save="handleSaveCellConfig"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  Table2,
  Server,
  Info,
  Wand2,
  Eraser,
  X,
  Check,
  Eye,
  XCircle,
  CheckCircle2,
  Settings
} from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import CellConfigModal from './CellConfigModal.vue'

import type {
  IpTableQuestionnaire,
  IpTableColumn,
  IpTableRow,
  IpTableCell,
  Device
} from '@/types/wizard'

interface Props {
  open: boolean
  initialData?: IpTableQuestionnaire
  rowCount: number
  columnCount: number
  devices: Device[]
  vlans: Array<{
    id?: string
    vlanId?: number
    baseNetwork: string
    subnetMask: number
    subnetIndex: number
    isStudentGenerated: boolean
  }>
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'save', data: IpTableQuestionnaire): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Generate unique IDs (MUST be defined before initializeTable)
const generateId = (prefix: string): string => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`
}

// Initialize table with empty data
function initializeTable(): IpTableQuestionnaire {
  if (props.initialData) {
    return JSON.parse(JSON.stringify(props.initialData))
  }

  const columns: IpTableColumn[] = Array.from({ length: props.columnCount }, (_, i) => ({
    columnId: generateId('col'),
    label: '',  // Empty label by default
    order: i
  }))

  const rows: IpTableRow[] = Array.from({ length: props.rowCount }, (_, i) => ({
    rowId: generateId('row'),
    deviceId: '',
    interfaceName: '',
    displayName: '',
    order: i
  }))

  const cells: IpTableCell[][] = Array.from({ length: props.rowCount }, (_, rowIdx) =>
    Array.from({ length: props.columnCount }, (_, colIdx) => ({
      cellId: generateId('cell'),
      rowId: rows[rowIdx].rowId,
      columnId: columns[colIdx].columnId,
      answerType: 'calculated',  // Default to calculated
      calculatedAnswer: {
        calculationType: 'vlan_lecturer_offset',
        vlanIndex: 0,
        lecturerOffset: 1
      },
      points: 1,
      autoCalculated: false
    }))
  )

  return {
    tableId: generateId('table'),
    rowCount: props.rowCount,
    columnCount: props.columnCount,
    columns,
    rows,
    cells,
    autoCalculate: false
  }
}

// Local state (initialized after initializeTable is defined)
const tableData = ref<IpTableQuestionnaire>(initializeTable())
const validationErrors = ref<string[]>([])
const hasAttemptedSave = ref(false)
const validationModalOpen = ref(false)

// Cell Configuration Modal state
const cellConfigModalOpen = ref(false)
const configuringCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const currentCellConfig = ref<IpTableCell | null>(null)

const validationErrorCount = computed(() => validationErrors.value.length)
const hasValidationErrors = computed(() => validationErrorCount.value > 0)

// Get device interfaces from device templates
const getDeviceInterfaces = (deviceId: string) => {
  const device = props.devices.find(d => d.deviceId === deviceId)
  if (!device) return []

  // Return IP variables as interfaces
  return device.ipVariables.map(v => ({
    name: v.name,
    fullName: v.interface || v.name
  }))
}

// Handlers
const handleRowDeviceChange = (rowIndex: number) => {
  const row = tableData.value.rows[rowIndex]

  // Reset interface when device changes
  row.interfaceName = ''
  row.displayName = ''

  validate()
}

const handleRowInterfaceChange = (rowIndex: number) => {
  const row = tableData.value.rows[rowIndex]

  // Update display name
  if (row.deviceId && row.interfaceName) {
    row.displayName = `${row.deviceId}.${row.interfaceName}`
  } else {
    row.displayName = ''
  }

  validate()
}

const handleAutoCalculate = () => {
  toast.info('Auto-calculation feature coming soon!')
  // TODO: Implement auto-calculation logic based on network config from Step 2
}

const handleClearAll = () => {
  tableData.value.cells.forEach(row => {
    row.forEach(cell => {
      cell.answerType = 'static'
      cell.staticAnswer = ''
      cell.calculatedAnswer = undefined
      cell.autoCalculated = false
    })
  })
  toast.success('All cells cleared')
  validate()
}

const handlePreview = () => {
  toast.info('Preview feature coming soon!')
  // TODO: Show a preview of how the table will look to students
}

const handleCancel = () => {
  emit('update:open', false)
  validationModalOpen.value = false
}

const handleSave = () => {
  hasAttemptedSave.value = true
  const errors = validate({ includeCellErrors: true })
  if (errors.length > 0) {
    toast.error('Please fix validation errors before saving')
    validationModalOpen.value = true
    return
  }

  emit('save', tableData.value)
  emit('update:open', false)
  hasAttemptedSave.value = false
  validationModalOpen.value = false
  toast.success('IP Table Questionnaire saved successfully!')
}

const handleOpenChange = (value: boolean) => {
  emit('update:open', value)
  if (!value) {
    hasAttemptedSave.value = false
    validationModalOpen.value = false
  }
}

const handleOpenValidationModal = () => {
  if (hasValidationErrors.value) {
    validationModalOpen.value = true
  }
}

// Cell Configuration Handlers
const handleConfigureCell = (rowIndex: number, colIndex: number) => {
  configuringCell.value = { rowIndex, colIndex }
  currentCellConfig.value = JSON.parse(JSON.stringify(tableData.value.cells[rowIndex][colIndex]))
  cellConfigModalOpen.value = true
}

const handleSaveCellConfig = (cell: IpTableCell) => {
  if (configuringCell.value) {
    const { rowIndex, colIndex } = configuringCell.value
    tableData.value.cells[rowIndex][colIndex] = cell
    validate()
    toast.success('Cell configuration saved')
  }
  cellConfigModalOpen.value = false
  configuringCell.value = null
  currentCellConfig.value = null
}

// Helper to get cell display text
const getCellDisplayText = (cell: IpTableCell): string => {
  if (cell.answerType === 'static') {
    return cell.staticAnswer || 'Not configured'
  } else if (cell.answerType === 'calculated') {
    const calcType = cell.calculatedAnswer?.calculationType || 'Not configured'
    // Add friendlier display for range type
    if (calcType === 'vlan_lecturer_range') {
      return `Range: ${calcType}`
    }
    return `Calculated: ${calcType}`
  }
  return 'Not configured'
}

// Helper to check if cell is configured
const isCellConfigured = (cell: IpTableCell): boolean => {
  if (cell.answerType === 'static') {
    return !!(cell.staticAnswer && cell.staticAnswer.trim())
  } else if (cell.calculatedAnswer) {
    return !!cell.calculatedAnswer.calculationType
  }
  return false
}

// Computed
const totalPoints = computed(() => {
  return tableData.value.cells.reduce((total, row) => {
    return total + row.reduce((rowTotal, cell) => rowTotal + (cell.points || 0), 0)
  }, 0)
})

const canAutoCalculate = computed(() => {
  // Can only auto-calculate if all columns and rows are configured
  const columnsConfigured = tableData.value.columns.every(col => {
    return col.label && col.label.trim() !== ''
  })

  const rowsConfigured = tableData.value.rows.every(row => {
    return row.deviceId && row.interfaceName
  })

  return columnsConfigured && rowsConfigured
})

// Validation
const validate = (options: { includeCellErrors?: boolean } = {}) => {
  const includeCellErrors = options.includeCellErrors ?? hasAttemptedSave.value
  const errors: string[] = []

  // Validate columns
  tableData.value.columns.forEach((col, idx) => {
    if (!col.label || col.label.trim() === '') {
      errors.push(`Column ${idx + 1}: Column label is required`)
    }
  })

  // Validate rows
  tableData.value.rows.forEach((row, idx) => {
    if (!row.deviceId) {
      errors.push(`Row ${idx + 1}: Device is required`)
    }
    if (!row.interfaceName) {
      errors.push(`Row ${idx + 1}: Interface is required`)
    }
  })

  // Validate cells (only when requested)
  if (includeCellErrors) {
    tableData.value.cells.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        // Check if cell is configured
        if (!isCellConfigured(cell)) {
          errors.push(`Cell [${rowIdx + 1}, ${colIdx + 1}]: Cell configuration is required`)
        }

        // Validate based on answer type
        if (cell.answerType === 'static') {
          if (!cell.staticAnswer || !cell.staticAnswer.trim()) {
            errors.push(`Cell [${rowIdx + 1}, ${colIdx + 1}]: Static answer is required`)
          }
        } else if (cell.answerType === 'calculated') {
          if (!cell.calculatedAnswer) {
            errors.push(`Cell [${rowIdx + 1}, ${colIdx + 1}]: Calculation configuration is required`)
          } else if (!cell.calculatedAnswer.calculationType) {
            errors.push(`Cell [${rowIdx + 1}, ${colIdx + 1}]: Calculation type is required`)
          }
        }

        if (!cell.points || cell.points < 1) {
          errors.push(`Cell [${rowIdx + 1}, ${colIdx + 1}]: Points must be at least 1`)
        }
      })
    })
  }

  validationErrors.value = errors
  return errors
}

// Watch for prop changes
watch(() => props.open, (newValue) => {
  if (newValue) {
    tableData.value = initializeTable()
    validationErrors.value = []
    hasAttemptedSave.value = false
    validationModalOpen.value = false
    validate({ includeCellErrors: false })
  }
})

watch(validationErrors, (errors) => {
  if (errors.length === 0) {
    validationModalOpen.value = false
  }
})
</script>
