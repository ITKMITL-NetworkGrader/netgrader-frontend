import { ref, computed, reactive } from 'vue'

interface LoadingOperation {
  id: string
  label: string
  progress?: number
  startTime: number
  eta?: string
  cancellable?: boolean
  onCancel?: () => void
}

interface LoadingState {
  isLoading: boolean
  operations: Map<string, LoadingOperation>
  globalProgress: number
}

const globalLoadingState = reactive<LoadingState>({
  isLoading: false,
  operations: new Map(),
  globalProgress: 0
})

export const useLoadingStates = () => {
  const startOperation = (
    id: string, 
    label: string, 
    options: {
      progress?: number
      cancellable?: boolean
      onCancel?: () => void
    } = {}
  ) => {
    const operation: LoadingOperation = {
      id,
      label,
      progress: options.progress || 0,
      startTime: Date.now(),
      cancellable: options.cancellable || false,
      onCancel: options.onCancel
    }
    
    globalLoadingState.operations.set(id, operation)
    updateGlobalState()
  }

  const updateOperation = (
    id: string, 
    updates: Partial<Pick<LoadingOperation, 'progress' | 'label' | 'eta'>>
  ) => {
    const operation = globalLoadingState.operations.get(id)
    if (operation) {
      Object.assign(operation, updates)
      
      // Calculate ETA if progress is provided
      if (updates.progress !== undefined && updates.progress > 0) {
        const elapsed = Date.now() - operation.startTime
        const totalEstimated = (elapsed / updates.progress) * 100
        const remaining = totalEstimated - elapsed
        
        if (remaining > 0) {
          operation.eta = formatETA(remaining)
        }
      }
      
      updateGlobalState()
    }
  }

  const finishOperation = (id: string) => {
    globalLoadingState.operations.delete(id)
    updateGlobalState()
  }

  const cancelOperation = (id: string) => {
    const operation = globalLoadingState.operations.get(id)
    if (operation?.onCancel) {
      operation.onCancel()
    }
    finishOperation(id)
  }

  const updateGlobalState = () => {
    const operations = Array.from(globalLoadingState.operations.values())
    globalLoadingState.isLoading = operations.length > 0
    
    if (operations.length > 0) {
      const totalProgress = operations.reduce((sum, op) => sum + (op.progress || 0), 0)
      globalLoadingState.globalProgress = totalProgress / operations.length
    } else {
      globalLoadingState.globalProgress = 0
    }
  }

  const formatETA = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s remaining`
    } else {
      return `${seconds}s remaining`
    }
  }

  const isOperationActive = (id: string) => {
    return globalLoadingState.operations.has(id)
  }

  const getOperation = (id: string) => {
    return globalLoadingState.operations.get(id)
  }

  const getAllOperations = computed(() => {
    return Array.from(globalLoadingState.operations.values())
  })

  const hasActiveOperations = computed(() => {
    return globalLoadingState.isLoading
  })

  const globalProgress = computed(() => {
    return globalLoadingState.globalProgress
  })

  // Cleanup function for component unmounting
  const cleanup = (operationIds: string[]) => {
    operationIds.forEach(id => finishOperation(id))
  }

  return {
    startOperation,
    updateOperation,
    finishOperation,
    cancelOperation,
    isOperationActive,
    getOperation,
    getAllOperations,
    hasActiveOperations,
    globalProgress,
    cleanup
  }
}

// Specific loading state composables for common operations
export const useAsyncOperation = <T>(
  operationId: string,
  operationLabel: string,
  asyncFn: () => Promise<T>,
  options: {
    showProgress?: boolean
    cancellable?: boolean
    onProgress?: (progress: number) => void
  } = {}
) => {
  const { startOperation, updateOperation, finishOperation, cancelOperation } = useLoadingStates()
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const result = ref<T | null>(null)

  let cancelled = false

  const execute = async (): Promise<T | null> => {
    if (isLoading.value) return null

    isLoading.value = true
    error.value = null
    cancelled = false

    startOperation(operationId, operationLabel, {
      progress: 0,
      cancellable: options.cancellable,
      onCancel: () => {
        cancelled = true
        isLoading.value = false
      }
    })

    try {
      const progressCallback = (progress: number) => {
        if (!cancelled) {
          updateOperation(operationId, { progress })
          options.onProgress?.(progress)
        }
      }

      // If the async function supports progress, pass the callback
      const asyncResult = await asyncFn()
      
      if (!cancelled) {
        result.value = asyncResult
        updateOperation(operationId, { progress: 100 })
        return asyncResult
      }
      
      return null
    } catch (err) {
      if (!cancelled) {
        error.value = err instanceof Error ? err : new Error('Unknown error')
        throw err
      }
      return null
    } finally {
      finishOperation(operationId)
      if (!cancelled) {
        isLoading.value = false
      }
    }
  }

  const cancel = () => {
    if (isLoading.value) {
      cancelOperation(operationId)
    }
  }

  return {
    execute,
    cancel,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    result: computed(() => result.value)
  }
}