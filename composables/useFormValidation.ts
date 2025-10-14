import { ref, computed, reactive, watch } from 'vue'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  url?: boolean
  numeric?: boolean
  min?: number
  max?: number
  custom?: (value: any) => string | null
}

export interface FieldValidation {
  value: any
  rules: ValidationRule
  error: string | null
  touched: boolean
  valid: boolean
}

export interface FormValidation {
  [key: string]: FieldValidation
}

export const useFormValidation = () => {
  const fields = reactive<FormValidation>({})
  const isSubmitting = ref(false)

  // Add a field to validation
  const addField = (name: string, initialValue: any = '', rules: ValidationRule = {}) => {
    fields[name] = {
      value: initialValue,
      rules,
      error: null,
      touched: false,
      valid: true
    }
  }

  // Remove a field from validation
  const removeField = (name: string) => {
    delete fields[name]
  }

  // Validate a single field
  const validateField = (name: string): boolean => {
    const field = fields[name]
    if (!field) return true

    const { value, rules } = field
    let error: string | null = null

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      error = 'This field is required'
    }
    // String length validations
    else if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        error = `Minimum length is ${rules.minLength} characters`
      } else if (rules.maxLength && value.length > rules.maxLength) {
        error = `Maximum length is ${rules.maxLength} characters`
      }
    }
    // Email validation
    else if (rules.email && value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(value)) {
        error = 'Please enter a valid email address'
      }
    }
    // URL validation
    else if (rules.url && value) {
      try {
        new URL(value)
      } catch {
        error = 'Please enter a valid URL'
      }
    }
    // Numeric validation
    else if (rules.numeric && value !== '' && value !== null && value !== undefined) {
      const numValue = Number(value)
      if (isNaN(numValue)) {
        error = 'Please enter a valid number'
      } else {
        if (rules.min !== undefined && numValue < rules.min) {
          error = `Value must be at least ${rules.min}`
        } else if (rules.max !== undefined && numValue > rules.max) {
          error = `Value must be at most ${rules.max}`
        }
      }
    }
    // Pattern validation
    else if (rules.pattern && value && !rules.pattern.test(value)) {
      error = 'Please enter a valid format'
    }
    // Custom validation
    else if (rules.custom && value) {
      error = rules.custom(value)
    }

    field.error = error
    field.valid = error === null
    return field.valid
  }

  // Validate all fields
  const validateForm = (): boolean => {
    let isValid = true
    
    Object.keys(fields).forEach(name => {
      const fieldValid = validateField(name)
      if (!fieldValid) {
        isValid = false
      }
    })
    
    return isValid
  }

  // Set field value and validate
  const setFieldValue = (name: string, value: any) => {
    if (fields[name]) {
      fields[name].value = value
      fields[name].touched = true
      validateField(name)
    }
  }

  // Mark field as touched
  const touchField = (name: string) => {
    if (fields[name]) {
      fields[name].touched = true
      validateField(name)
    }
  }

  // Get field error
  const getFieldError = (name: string): string | null => {
    const field = fields[name]
    return field && field.touched ? field.error : null
  }

  // Check if field has error
  const hasFieldError = (name: string): boolean => {
    const field = fields[name]
    return field ? field.touched && !field.valid : false
  }

  // Get field value
  const getFieldValue = (name: string): any => {
    return fields[name]?.value
  }

  // Check if form is valid
  const isFormValid = computed(() => {
    return Object.values(fields).every(field => field.valid)
  })

  // Check if any field has been touched
  const hasAnyFieldTouched = computed(() => {
    return Object.values(fields).some(field => field.touched)
  })

  // Get all errors
  const getAllErrors = computed(() => {
    const errors: Record<string, string> = {}
    Object.entries(fields).forEach(([name, field]) => {
      if (field.error && field.touched) {
        errors[name] = field.error
      }
    })
    return errors
  })

  // Reset form
  const resetForm = () => {
    Object.keys(fields).forEach(name => {
      fields[name].touched = false
      fields[name].error = null
      fields[name].valid = true
    })
  }

  // Reset field
  const resetField = (name: string) => {
    if (fields[name]) {
      fields[name].touched = false
      fields[name].error = null
      fields[name].valid = true
    }
  }

  // Submit form with validation
  const submitForm = async (callback: () => Promise<void> | void) => {
    if (isSubmitting.value) return

    // Mark all fields as touched
    Object.keys(fields).forEach(name => {
      fields[name].touched = true
    })

    // Validate form
    const isValid = validateForm()
    
    if (!isValid) {
      return false
    }

    isSubmitting.value = true
    try {
      await callback()
      return true
    } catch (error) {
      console.error('Form submission error:', error)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    fields,
    isSubmitting,
    addField,
    removeField,
    validateField,
    validateForm,
    setFieldValue,
    touchField,
    getFieldError,
    hasFieldError,
    getFieldValue,
    isFormValid,
    hasAnyFieldTouched,
    getAllErrors,
    resetForm,
    resetField,
    submitForm
  }
}

// Common validation rules
export const validationRules = {
  required: { required: true },
  email: { required: true, email: true },
  url: { url: true },
  minLength: (length: number) => ({ minLength: length }),
  maxLength: (length: number) => ({ maxLength: length }),
  numeric: { numeric: true },
  positiveNumber: { numeric: true, min: 0 },
  range: (min: number, max: number) => ({ numeric: true, min, max }),
  studentId: {
    required: true,
    pattern: /^\d{8}$/,
    custom: (value: string) => {
      if (value && !/^\d{8}$/.test(value)) {
        return 'Student ID must be 8 digits'
      }
      return null
    }
  },
  ipAddress: {
    pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    custom: (value: string) => {
      if (value && !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value)) {
        return 'Please enter a valid IP address'
      }
      return null
    }
  },
  subnet: {
    pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,
    custom: (value: string) => {
      if (value && !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/.test(value)) {
        return 'Please enter a valid subnet (e.g., 192.168.1.0/24)'
      }
      return null
    }
  }
}