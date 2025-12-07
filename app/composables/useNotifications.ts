import { toast } from 'vue-sonner'

export interface NotificationOptions {
  duration?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export const useNotifications = () => {
  // Success notifications
  const showSuccess = (message: string, options: NotificationOptions = {}) => {
    toast.success(message, {
      duration: options.duration || 4000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action
    })
  }

  // Error notifications
  const showError = (message: string, options: NotificationOptions = {}) => {
    toast.error(message, {
      duration: options.duration || 6000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action
    })
  }

  // Warning notifications
  const showWarning = (message: string, options: NotificationOptions = {}) => {
    toast.warning(message, {
      duration: options.duration || 5000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action
    })
  }

  // Info notifications
  const showInfo = (message: string, options: NotificationOptions = {}) => {
    toast.info(message, {
      duration: options.duration || 4000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action
    })
  }

  // Loading notifications
  const showLoading = (message: string, options: NotificationOptions = {}) => {
    return toast.loading(message, {
      duration: options.duration || Infinity,
      position: options.position,
      dismissible: options.dismissible !== false
    })
  }

  // Network error notification with retry option
  const showNetworkError = (retryCallback?: () => void) => {
    showError('Network error occurred. Please check your connection.', {
      duration: 8000,
      action: retryCallback ? {
        label: 'Retry',
        onClick: retryCallback
      } : undefined
    })
  }

  // API error notification with details
  const showApiError = (error: { message: string; code?: string; details?: any }, retryCallback?: () => void) => {
    let message = error.message
    
    // Add error code if available
    if (error.code && import.meta.dev) {
      message += ` (${error.code})`
    }

    showError(message, {
      duration: 6000,
      action: retryCallback ? {
        label: 'Retry',
        onClick: retryCallback
      } : undefined
    })
  }

  // Validation error notification
  const showValidationError = (errors: string[] | string) => {
    const message = Array.isArray(errors) 
      ? `Validation failed:\n${errors.join('\n')}`
      : errors

    showError(message, {
      duration: 8000
    })
  }

  // Form save success
  const showSaveSuccess = (itemName = 'Item') => {
    showSuccess(`${itemName} saved successfully!`)
  }

  // Form save error
  const showSaveError = (itemName = 'Item', retryCallback?: () => void) => {
    showError(`Failed to save ${itemName.toLowerCase()}. Please try again.`, {
      action: retryCallback ? {
        label: 'Retry',
        onClick: retryCallback
      } : undefined
    })
  }

  // Delete confirmation (using toast for consistency)
  const showDeleteConfirmation = (itemName: string, onConfirm: () => void) => {
    toast.warning(`Are you sure you want to delete ${itemName}?`, {
      duration: 10000,
      action: {
        label: 'Delete',
        onClick: onConfirm
      }
    })
  }

  // Bulk operation notifications
  const showBulkSuccess = (count: number, operation: string) => {
    showSuccess(`${count} item${count !== 1 ? 's' : ''} ${operation} successfully!`)
  }

  const showBulkError = (count: number, operation: string, retryCallback?: () => void) => {
    showError(`Failed to ${operation} ${count} item${count !== 1 ? 's' : ''}. Please try again.`, {
      action: retryCallback ? {
        label: 'Retry',
        onClick: retryCallback
      } : undefined
    })
  }

  // File upload notifications
  const showUploadSuccess = (fileName: string) => {
    showSuccess(`${fileName} uploaded successfully!`)
  }

  const showUploadError = (fileName: string, error?: string) => {
    const message = error 
      ? `Failed to upload ${fileName}: ${error}`
      : `Failed to upload ${fileName}. Please try again.`
    
    showError(message)
  }

  const showUploadProgress = (fileName: string) => {
    return showLoading(`Uploading ${fileName}...`)
  }

  // Dismiss all notifications
  const dismissAll = () => {
    toast.dismiss()
  }

  // Dismiss specific notification
  const dismiss = (toastId: string | number) => {
    toast.dismiss(toastId)
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showNetworkError,
    showApiError,
    showValidationError,
    showSaveSuccess,
    showSaveError,
    showDeleteConfirmation,
    showBulkSuccess,
    showBulkError,
    showUploadSuccess,
    showUploadError,
    showUploadProgress,
    dismissAll,
    dismiss
  }
}