<template>
  <div class="ip-table-questionnaire">
    <!-- Table Header -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-foreground text-foreground">
        IP Address Configuration Table
      </h3>
      <p class="text-sm text-muted-foreground text-muted-foreground mt-1">
        Enter the IP addresses for each device interface as specified in the instructions.
      </p>
    </div>

    <!-- IP Table -->
    <div class="overflow-x-auto border border-border rounded-lg">
      <table class="min-w-full divide-y divide-border">
        <!-- Column Headers -->
        <thead class="bg-muted">
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider border-r border-border"
            >
              Device.Interface
            </th>
            <th
              v-for="column in sortedColumns"
              :key="column.columnId"
              class="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="bg-white bg-background divide-y divide-border">
          <tr
            v-for="(row, rowIndex) in sortedRows"
            :key="row.rowId"
            class="hover:bg-muted transition-colors"
          >
            <!-- Row Header (Device.Interface) -->
            <td
              class="px-4 py-3 text-sm font-medium text-foreground text-foreground border-r border-border bg-muted"
            >
              {{ row.displayName }}
            </td>

            <!-- Input Cells -->
            <td
              v-for="(column, colIndex) in sortedColumns"
              :key="column.columnId"
              class="px-4 py-3"
            >
              <div class="relative">
                <!-- Read-only Cell -->
                <div
                  v-if="getCellType(rowIndex, colIndex) === 'readonly'"
                  class="w-full px-3 py-2 text-sm bg-muted bg-muted border border-border border-input rounded-md text-foreground"
                >
                  {{ getReadonlyContent(rowIndex, colIndex) }}
                </div>

                <!-- Blank Cell -->
                <div
                  v-else-if="getCellType(rowIndex, colIndex) === 'blank'"
                  class="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-muted-foreground text-muted-foreground text-center"
                >
                  {{ getBlankReason(rowIndex, colIndex) || '—' }}
                </div>

                <!-- Input Cell -->
                <div v-else class="flex items-center gap-2">
                  <input
                    v-model="cellValues[rowIndex][colIndex]"
                    type="text"
                    :placeholder="getCellPlaceholder(rowIndex, colIndex)"
                    :disabled="isCellInputDisabled(rowIndex, colIndex)"
                    class="flex-1 px-3 py-2 text-sm border rounded-md transition-colors"
                    :class="getCellInputClass(rowIndex, colIndex)"
                    @input="onCellInput(rowIndex, colIndex)"
                  />

                  <!-- Copy Button (appears after part is passed) -->
                  <button
                    v-if="props.isPassed && cellValues[rowIndex]?.[colIndex]?.trim()"
                    type="button"
                    class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    :title="`Copy ${cellValues[rowIndex][colIndex]}`"
                    @click="copyToClipboard(cellValues[rowIndex][colIndex], rowIndex, colIndex)"
                  >
                    <Check
                      v-if="copiedCell === `${rowIndex}-${colIndex}`"
                      class="w-4 h-4 text-green-500"
                    />
                    <Copy v-else class="w-4 h-4" />
                  </button>

                  <!-- Lecturer Range Hint (for DHCP pool cells)
                  <div
                    v-if="getLecturerRange(rowIndex, colIndex)"
                    class="mt-1 text-xs text-blue-600 text-blue-500"
                  >
                    Valid range: {{ getLecturerRange(rowIndex, colIndex) }}
                  </div> -->
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Points Display -->
    <div class="mt-4 flex items-center justify-between">
      <div class="text-sm text-muted-foreground text-muted-foreground">
        Total Points: <span class="font-semibold">{{ totalPoints }}</span>
      </div>
      <div class="text-sm text-muted-foreground text-muted-foreground">
        Filled: {{ filledCellsCount }} / {{ totalCellsCount }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Check } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

interface Column {
  columnId: string
  label: string
  order: number
}

interface Row {
  rowId: string
  deviceId: string
  interfaceName: string
  displayName: string
  order: number
}

interface CalculatedAnswer {
  calculationType: string
  vlanIndex?: number
  lecturerOffset?: number
  lecturerRangeStart?: number
  lecturerRangeEnd?: number
  deviceId?: string
  interfaceName?: string
}

interface Cell {
  cellId: string
  rowId: string
  columnId: string
  cellType: 'input' | 'readonly' | 'blank'
  answerType?: 'static' | 'calculated'
  staticAnswer?: string
  calculatedAnswer?: CalculatedAnswer
  readonlyContent?: string
  blankReason?: string
  points: number
  autoCalculated: boolean
}

interface IpTableData {
  tableId: string
  rowCount: number
  columnCount: number
  columns: Column[]
  rows: Row[]
  cells: Cell[][]
}

interface Props {
  tableData: IpTableData
  modelValue?: string[][] // Student's answers
  readonly?: boolean
  isPassed?: boolean // NEW: Show copy buttons when part is passed
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  readonly: false,
  isPassed: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string[][]]
}>()

// Sorted columns and rows by order
const sortedColumns = computed(() => {
  return [...props.tableData.columns].sort((a, b) => a.order - b.order)
})

const sortedRows = computed(() => {
  return [...props.tableData.rows].sort((a, b) => a.order - b.order)
})

// Initialize cell values from modelValue or empty strings
const cellValues = ref<string[][]>([])

const initializeCellValues = () => {
  if (props.modelValue && props.modelValue.length > 0) {
    cellValues.value = props.modelValue.map(row => [...row])
  } else {
    cellValues.value = Array(props.tableData.rowCount)
      .fill(null)
      .map(() => Array(props.tableData.columnCount).fill(''))
  }
}

initializeCellValues()

// Copy to clipboard functionality
const copiedCell = ref<string | null>(null)

const copyToClipboard = async (value: string, rowIndex: number, colIndex: number) => {
  try {
    await navigator.clipboard.writeText(value)
    copiedCell.value = `${rowIndex}-${colIndex}`
    toast.success('Copied to clipboard', {
      description: value,
      duration: 2000
    })
    // Reset copy indicator after 2 seconds
    setTimeout(() => {
      if (copiedCell.value === `${rowIndex}-${colIndex}`) {
        copiedCell.value = null
      }
    }, 2000)
  } catch (err) {
    toast.error('Failed to copy', {
      description: 'Please copy manually'
    })
  }
}

// Keep local state in sync when parent model changes (e.g., restored from storage)
watch(() => props.modelValue, (newValue) => {
  if (!newValue) return

  const serializedCurrent = JSON.stringify(cellValues.value)
  const serializedIncoming = JSON.stringify(newValue)

  if (serializedCurrent !== serializedIncoming) {
    cellValues.value = newValue.map(row => [...row])
  }
}, { deep: true })

// Calculate total points
const totalPoints = computed(() => {
  let total = 0
  props.tableData.cells.forEach(row => {
    row.forEach(cell => {
      const cellType = cell?.cellType ?? 'input'
      if (cellType === 'input') {
        total += cell.points || 0
      }
    })
  })
  return total
})

// Calculate filled cells count
const filledCellsCount = computed(() => {
  let count = 0
  props.tableData.cells.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellType = cell?.cellType ?? 'input'
      if (cellType === 'input') {
        const value = cellValues.value[rowIndex]?.[colIndex]
        if (value && value.trim() !== '') {
          count++
        }
      }
    })
  })
  return count
})

const totalCellsCount = computed(() => {
  let total = 0
  props.tableData.cells.forEach(row => {
    row.forEach(cell => {
      const cellType = cell?.cellType ?? 'input'
      if (cellType === 'input') {
        total++
      }
    })
  })
  return total
})

// Get cell type
const getCellType = (rowIndex: number, colIndex: number): string => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]
  return cell?.cellType || 'input'
}

// Get readonly content
const getReadonlyContent = (rowIndex: number, colIndex: number): string => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]
  return cell?.readonlyContent || ''
}

// Get blank reason
const getBlankReason = (rowIndex: number, colIndex: number): string => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]
  return cell?.blankReason || ''
}

// Get cell placeholder
const getCellPlaceholder = (rowIndex: number, colIndex: number): string => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]
  if (!cell) return 'xxx.xxx.xxx.xxx'

  // Only input cells need placeholders
  if ((cell.cellType ?? 'input') === 'input') {
    if (cell.answerType === 'static') {
      return 'Enter IP address'
    } else if (cell.calculatedAnswer) {
      const calcType = cell.calculatedAnswer.calculationType
      if (calcType === 'vlan_lecturer_range') {
        return 'DHCP assigned IP'
      }
      // IPv6 placeholders
      if (calcType === 'ipv6_slaac') {
        return 'SLAAC-assigned IPv6'
      }
      if (calcType === 'ipv6_link_local') {
        return 'fe80::...'
      }
      if (calcType === 'ipv6_address' || calcType === 'ipv6_network_prefix') {
        return '2001:db8::...'
      }
      return 'Enter IP address'
    }
  }

  return 'xxx.xxx.xxx.xxx'
}

// Get lecturer-defined range or SLAAC hint
const getLecturerRange = (rowIndex: number, colIndex: number): string | null => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]
  if (!cell || (cell.cellType ?? 'input') !== 'input' || cell.answerType !== 'calculated' || !cell.calculatedAnswer) {
    return null
  }

  const calc = cell.calculatedAnswer
  if (calc.calculationType === 'vlan_lecturer_range' &&
      calc.lecturerRangeStart !== undefined &&
      calc.lecturerRangeEnd !== undefined) {
    return `Host offset ${calc.lecturerRangeStart}-${calc.lecturerRangeEnd}`
  }

  // SLAAC hint for IPv6
  if (calc.calculationType === 'ipv6_slaac') {
    return 'Enter your SLAAC-assigned IPv6 address'
  }

  return null
}

// Handle cell input
const onCellInput = () => {
  const snapshot = cellValues.value.map(row => [...row])
  emit('update:modelValue', snapshot)
}

// Get cell input class based on validation state
const getCellInputClass = (rowIndex: number, colIndex: number): string => {
  const hasValue = cellValues.value[rowIndex]?.[colIndex]?.trim() !== ''

  const baseClasses = 'focus:outline-none focus:ring-2'

  if (isCellInputDisabled(rowIndex, colIndex)) {
    return `${baseClasses} bg-muted bg-muted cursor-not-allowed border-border border-input`
  }

  if (hasValue) {
    return `${baseClasses} border-green-500 border-green-500 focus:ring-green-500 focus:ring-green-500 bg-white bg-background`
  }

  return `${baseClasses} border-border border-input focus:ring-blue-500 focus:ring-blue-500 bg-white bg-background`
}

const isLecturerRangeEditableCell = (rowIndex: number, colIndex: number): boolean => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]

  if (!cell || (cell.cellType ?? 'input') !== 'input') {
    return false
  }

  if (cell.answerType !== 'calculated' || !cell.calculatedAnswer) {
    return false
  }

  return cell.calculatedAnswer.calculationType === 'vlan_lecturer_range'
}

// Check if cell is SLAAC editable (student can update throughout lab, like DHCP)
const isSlaacEditableCell = (rowIndex: number, colIndex: number): boolean => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]

  if (!cell || (cell.cellType ?? 'input') !== 'input') {
    return false
  }

  if (cell.answerType !== 'calculated' || !cell.calculatedAnswer) {
    return false
  }

  return cell.calculatedAnswer.calculationType === 'ipv6_slaac'
}

const isCellInputDisabled = (rowIndex: number, colIndex: number): boolean => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]

  if (!cell || (cell.cellType ?? 'input') !== 'input') {
    return true
  }

  if (!props.readonly) {
    return false
  }

  // Allow lecturer-defined range and SLAAC cells to remain editable even in readonly mode
  const isLecturerRange = isLecturerRangeEditableCell(rowIndex, colIndex)
  const isSlaac = isSlaacEditableCell(rowIndex, colIndex)
  const result = !isLecturerRange && !isSlaac

  return result
}

// Expose validation method for parent component
defineExpose({
  validate: () => true,
  getCellValues: () => {
    return cellValues.value.map(row => [...row])
  }
})
</script>

<style scoped>
.ip-table-questionnaire {
  width: 100%;
}

/* Ensure table is responsive */
@media (max-width: 768px) {
  .ip-table-questionnaire table {
    font-size: 0.75rem;
  }

  .ip-table-questionnaire td,
  .ip-table-questionnaire th {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}
</style>
