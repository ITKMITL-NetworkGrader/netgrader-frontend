import { ref } from 'vue'
import { toast } from 'vue-sonner'

export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
}

export const useApiErrorHandler = () => {
  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)
  const retryCount = ref(0)
  const maxRetries = 3
  const retryDelay = 1000 // 1 second

  // Clear error state
  const clearError = () => {
    error.value = null
  }

  // Handle different types of errors
  const handleError = (err: any, showToast = true): ApiError => {
    let apiError: ApiError

    if (err.response) {
      // HTTP error response
      const status = err.response.status
      const data = err.response.data

      apiError = {
        code: data?.error?.code || `HTTP_${status}`,
        message: data?.error?.message || getDefaultErrorMessage(status),
        details: data?.error?.details,
        statusCode: status
      }
    } else if (err.request) {
      // Network error
      apiError = {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection.',
        statusCode: 0
      }
    } else {
      // Other error
      apiError = {
        code: 'UNKNOWN_ERROR',
        message: err.message || 'An unexpected error occurred',
        statusCode: 0
      }
    }

    error.value = apiError

    if (showToast) {
      toast.error(apiError.message)
    }

    return apiError
  }

  // Get default error message based on status code
  const getDefaultErrorMessage = (statusCode: number): string => {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input.'
      case 401:
        return 'You are not authorized to perform this action.'
      case 403:
        return 'Access denied. You do not have permission.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'Conflict. The resource already exists or is in use.'
      case 422:
        return 'Validation failed. Please check your input.'
      case 429:
        return 'Too many requests. Please try again later.'
      case 500:
        return 'Internal server error. Please try again later.'
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.'
      case 503:
        return 'Service unavailable. Please try again later.'
      case 504:
        return 'Gateway timeout. The request took too long to process.'
      default:
        return 'An error occurred. Please try again.'
    }
  }

  // Retry logic with exponential backoff
  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> => {
    let lastError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        retryCount.value = attempt
        return await operation()
      } catch (err) {
        lastError = err
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (err.response?.status >= 400 && err.response?.status < 500 && err.response?.status !== 429) {
          throw err
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw err
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  // Wrapper for API calls with error handling and retry
  const apiCall = async <T>(
    operation: () => Promise<T>,
    options: {
      showErrorToast?: boolean
      retries?: number
      retryDelay?: number
      loadingState?: boolean
    } = {}
  ): Promise<ApiResponse<T>> => {
    const {
      showErrorToast = true,
      retries = maxRetries,
      retryDelay: delay = retryDelay,
      loadingState = true
    } = options

    if (loadingState) {
      isLoading.value = true
    }
    
    clearError()

    try {
      const result = await withRetry(operation, retries, delay)
      return {
        success: true,
        data: result
      }
    } catch (err) {
      const apiError = handleError(err, showErrorToast)
      return {
        success: false,
        error: apiError
      }
    } finally {
      if (loadingState) {
        isLoading.value = false
      }
      retryCount.value = 0
    }
  }

  // Check if error is retryable
  const isRetryableError = (err: any): boolean => {
    if (!err.response) return true // Network errors are retryable
    
    const status = err.response.status
    return status >= 500 || status === 429 // Server errors and rate limits are retryable
  }

  // Format error for display
  const formatErrorMessage = (err: ApiError): string => {
    let message = err.message

    if (err.details && typeof err.details === 'object') {
      if (Array.isArray(err.details)) {
        message += '\n' + err.details.join('\n')
      } else if (err.details.errors) {
        const errors = Object.values(err.details.errors).flat()
        message += '\n' + errors.join('\n')
      }
    }

    return message
  }

  // Show detailed error in development
  const showDetailedError = (err: ApiError) => {
    if (import.meta.dev) {
      console.group('API Error Details')
      console.error('Code:', err.code)
      console.error('Message:', err.message)
      console.error('Status:', err.statusCode)
      console.error('Details:', err.details)
      console.groupEnd()
    }
  }

  return {
    isLoading,
    error,
    retryCount,
    clearError,
    handleError,
    apiCall,
    withRetry,
    isRetryableError,
    formatErrorMessage,
    showDetailedError
  }
}