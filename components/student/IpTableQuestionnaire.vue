<template>
  <div class="ip-table-questionnaire">
    <!-- Table Header -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        IP Address Configuration Table
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Enter the IP addresses for each device interface as specified in the instructions.
      </p>
    </div>

    <!-- IP Table -->
    <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <!-- Column Headers -->
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
            >
              Device.Interface
            </th>
            <th
              v-for="column in sortedColumns"
              :key="column.columnId"
              class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="(row, rowIndex) in sortedRows"
            :key="row.rowId"
            class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <!-- Row Header (Device.Interface) -->
            <td
              class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
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
                  class="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                >
                  {{ getReadonlyContent(rowIndex, colIndex) }}
                </div>

                <!-- Blank Cell -->
                <div
                  v-else-if="getCellType(rowIndex, colIndex) === 'blank'"
                  class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-500 text-center"
                >
                  {{ getBlankReason(rowIndex, colIndex) || '—' }}
                </div>

                <!-- Input Cell -->
                <div v-else>
                  <input
                    v-model="cellValues[rowIndex][colIndex]"
                    type="text"
                    :placeholder="getCellPlaceholder(rowIndex, colIndex)"
                    :disabled="isCellInputDisabled(rowIndex, colIndex)"
                    class="w-full px-3 py-2 text-sm border rounded-md transition-colors"
                    :class="getCellInputClass(rowIndex, colIndex)"
                    @input="onCellInput(rowIndex, colIndex)"
                  />

                  <!-- Lecturer Range Hint (for DHCP pool cells) -->
                  <div
                    v-if="getLecturerRange(rowIndex, colIndex)"
                    class="mt-1 text-xs text-blue-600 dark:text-blue-400"
                  >
                    Valid range: {{ getLecturerRange(rowIndex, colIndex) }}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Points Display -->
    <div class="mt-4 flex items-center justify-between">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        Total Points: <span class="font-semibold">{{ totalPoints }}</span>
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400">
        Filled: {{ filledCellsCount }} / {{ totalCellsCount }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

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
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  readonly: false
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
// Initialize cell values
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

// Emit changes to parent when user types
watch(cellValues, (newValues) => {
  emit('update:modelValue', newValues.map(row => [...row]))
}, { deep: true, flush: 'post' })

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
      return 'Enter IP address'
    }
  }

  return 'xxx.xxx.xxx.xxx'
}

// Get lecturer-defined range hint
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

  return null
}

// Handle cell input
const onCellInput = () => {}

// Get cell input class based on validation state
const getCellInputClass = (rowIndex: number, colIndex: number): string => {
  const hasValue = cellValues.value[rowIndex][colIndex]?.trim() !== ''

  const baseClasses = 'focus:outline-none focus:ring-2'

  if (isCellInputDisabled(rowIndex, colIndex)) {
    return `${baseClasses} bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-300 dark:border-gray-600`
  }

  if (hasValue) {
    return `${baseClasses} border-green-500 dark:border-green-400 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-900`
  }

  return `${baseClasses} border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-900`
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

const isCellInputDisabled = (rowIndex: number, colIndex: number): boolean => {
  const cell = props.tableData.cells[rowIndex]?.[colIndex]

  if (!cell || (cell.cellType ?? 'input') !== 'input') {
    return true
  }

  if (!props.readonly) {
    return false
  }

  // Allow lecturer-defined range cells to remain editable even in readonly mode
  return !isLecturerRangeEditableCell(rowIndex, colIndex)
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
