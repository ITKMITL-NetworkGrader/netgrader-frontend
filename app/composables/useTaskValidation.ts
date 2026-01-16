import { computed, type Ref, type ComputedRef } from 'vue'
import type { WizardTask, TaskTemplate, Device, TestCase } from '@/types/wizard'

/**
 * Task Validation Composable
 * 
 * Provides reactive, template-aware validation for tasks in the Lab wizard.
 * Validation errors are computed based on the current task data and selected template,
 * automatically resetting when templates change.
 */

export interface TaskValidationResult {
    fieldErrors: Record<string, string>
    parameterErrors: Record<string, string>
    testCaseErrors: string[]
    isValid: boolean
    allErrors: string[]
}

export interface UseTaskValidationOptions {
    tasks: Ref<WizardTask[]>
    templates: Ref<TaskTemplate[]>
    devices: Ref<Device[]>
}

export interface UseTaskValidationReturn {
    /** Get field validation errors for a specific task */
    getFieldErrors: (taskIndex: number) => ComputedRef<Record<string, string>>
    /** Get parameter validation errors for a specific task (template-aware) */
    getParameterErrors: (taskIndex: number) => ComputedRef<Record<string, string>>
    /** Get test case validation errors for a specific task */
    getTestCaseErrors: (taskIndex: number) => ComputedRef<string[]>
    /** Check if a specific task has any validation errors */
    hasTaskErrors: (taskIndex: number) => ComputedRef<boolean>
    /** Check if a task is fully valid (all required fields filled correctly) */
    isTaskValid: (taskIndex: number) => ComputedRef<boolean>
    /** Get all validation errors across all tasks */
    allErrors: ComputedRef<string[]>
    /** Check if all tasks are valid */
    isValid: ComputedRef<boolean>
    /** Get validation result for a specific task */
    getTaskValidation: (taskIndex: number) => ComputedRef<TaskValidationResult>
}

// Helper to normalize test cases from templates
const normalizeDefaultTestCase = (defaultCase: unknown): TestCase | null => {
    if (!defaultCase || typeof defaultCase !== 'object') {
        return null
    }

    const caseRecord = defaultCase as Record<string, unknown>
    const comparisonType = caseRecord['comparison_type'] ?? caseRecord['comparisonType']
    if (typeof comparisonType !== 'string' || comparisonType.length === 0) {
        return null
    }

    const rawExpectedResult = caseRecord['expected_result'] ?? caseRecord['expectedResult']
    let expectedResult: string = ''

    if (typeof rawExpectedResult === 'boolean') {
        expectedResult = rawExpectedResult ? 'true' : 'false'
    } else if (rawExpectedResult !== undefined && rawExpectedResult !== null) {
        expectedResult = String(rawExpectedResult)
    }

    return {
        comparison_type: comparisonType,
        expected_result: expectedResult
    }
}

const getTemplateDefaultTestCases = (template?: TaskTemplate): TestCase[] => {
    if (!template) return []

    if (Array.isArray(template.defaultTestCases) && template.defaultTestCases.length > 0) {
        return template.defaultTestCases
            .map(normalizeDefaultTestCase)
            .filter((testCase): testCase is TestCase => testCase !== null)
    }

    if (template.defaultTestCase) {
        const normalized = normalizeDefaultTestCase(template.defaultTestCase)
        return normalized ? [normalized] : []
    }

    return []
}

const templateRequiresTestCases = (template?: TaskTemplate): boolean => {
    if (!template) return true

    // Minio templates with default test cases are read-only, but still need test cases
    if (template.source === 'mongo') {
        return getTemplateDefaultTestCases(template).length > 0
    }

    return true
}

export function useTaskValidation(options: UseTaskValidationOptions): UseTaskValidationReturn {
    const { tasks, templates, devices } = options

    // Cache for computed refs to avoid creating new ones on each call
    const fieldErrorsCache = new Map<number, ComputedRef<Record<string, string>>>()
    const parameterErrorsCache = new Map<number, ComputedRef<Record<string, string>>>()
    const testCaseErrorsCache = new Map<number, ComputedRef<string[]>>()
    const hasErrorsCache = new Map<number, ComputedRef<boolean>>()
    const isValidCache = new Map<number, ComputedRef<boolean>>()
    const validationCache = new Map<number, ComputedRef<TaskValidationResult>>()

    /**
     * Get the template for a given task
     */
    const getTemplateForTask = (task: WizardTask): TaskTemplate | undefined => {
        if (!task.templateId) return undefined

        // Try matching by id first, then by templateId
        return templates.value.find(t => t.id === task.templateId) ||
            templates.value.find(t => t.templateId === task.templateId)
    }

    /**
     * Validate IP parameter value
     */
    const validateIpParameterValue = (value: string): boolean => {
        if (!value || typeof value !== 'string') return false

        const trimmedValue = value.trim()

        // Check if it's a wrapped variable reference {{deviceId.variableName}}
        const wrappedPattern = /^\{\{([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\}\}$/
        const wrappedMatch = trimmedValue.match(wrappedPattern)

        if (wrappedMatch) {
            const innerValue = wrappedMatch[1]
            const [deviceId, variableName] = innerValue.split('.')

            // Validate that this variable exists in devices
            return devices.value.some(device =>
                device.deviceId === deviceId &&
                device.ipVariables.some(ipVar => ipVar.name === variableName)
            )
        }

        // Check if it's a valid IP address
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        const isIp = ipRegex.test(trimmedValue)

        // Check if it's a valid domain name
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
        const isDomain = domainRegex.test(trimmedValue)

        // Check if it's a variable reference without {{}}
        if (trimmedValue.includes('.') && !isDomain && !isIp) {
            const variablePattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/
            if (variablePattern.test(trimmedValue)) {
                const [deviceId, variableName] = trimmedValue.split('.')
                return devices.value.some(device =>
                    device.deviceId === deviceId &&
                    device.ipVariables.some(ipVar => ipVar.name === variableName)
                )
            }
        }

        return isIp || isDomain
    }

    /**
     * Get field validation errors for a task (name, templateId, executionDevice, points)
     */
    const getFieldErrors = (taskIndex: number): ComputedRef<Record<string, string>> => {
        if (!fieldErrorsCache.has(taskIndex)) {
            fieldErrorsCache.set(taskIndex, computed(() => {
                const task = tasks.value[taskIndex]
                if (!task) return {}

                const errors: Record<string, string> = {}

                // Task ID validation
                if (!task.taskId?.trim()) {
                    errors.taskId = 'Task ID is required (generated from name)'
                } else if (!/^[a-zA-Z0-9_-]+$/.test(task.taskId)) {
                    errors.taskId = 'Task ID must be alphanumeric with underscores/hyphens'
                } else if (tasks.value.some((t, i) => i !== taskIndex && t.taskId === task.taskId)) {
                    errors.taskId = 'Task ID must be unique within this part'
                }

                // Name validation
                if (!task.name?.trim()) {
                    errors.name = 'Task name is required'
                }

                // Template validation
                if (!task.templateId) {
                    errors.templateId = 'Task template is required'
                }

                // Execution device validation
                if (!task.executionDevice) {
                    errors.executionDevice = 'Execution device is required'
                } else if (!devices.value.some(d => d.deviceId === task.executionDevice)) {
                    errors.executionDevice = `Selected device '${task.executionDevice}' does not exist`
                }

                // Points validation - allow 0 or positive values
                if (task.points === undefined || task.points === null || task.points < 0) {
                    errors.points = 'Task points must be 0 or greater'
                }

                // Target devices validation
                if (task.targetDevices && task.targetDevices.length > 0) {
                    const invalidDevices = task.targetDevices.filter(
                        deviceId => !devices.value.some(d => d.deviceId === deviceId)
                    )
                    if (invalidDevices.length > 0) {
                        errors.targetDevices = `Target device(s) do not exist: ${invalidDevices.join(', ')}`
                    }
                }

                // Test cases validation (template-aware)
                const template = getTemplateForTask(task)
                const requiresTestCases = templateRequiresTestCases(template)
                if (requiresTestCases && (!task.testCases || task.testCases.length === 0)) {
                    errors.testCases = 'At least one test case is required'
                }

                return errors
            }))
        }
        return fieldErrorsCache.get(taskIndex)!
    }

    /**
     * Get parameter validation errors for a task
     * Only validates parameters defined in the CURRENT template's schema
     */
    const getParameterErrors = (taskIndex: number): ComputedRef<Record<string, string>> => {
        if (!parameterErrorsCache.has(taskIndex)) {
            parameterErrorsCache.set(taskIndex, computed(() => {
                const task = tasks.value[taskIndex]
                if (!task) return {}

                const template = getTemplateForTask(task)
                if (!template || !template.parameterSchema) return {}

                const errors: Record<string, string> = {}

                // Only validate parameters from current template schema
                template.parameterSchema.forEach(param => {
                    const paramValue = task.parameters?.[param.name]

                    if (param.required) {
                        const isEmpty = paramValue === undefined ||
                            paramValue === null ||
                            (typeof paramValue === 'string' && paramValue.trim() === '') ||
                            (typeof paramValue === 'number' && isNaN(paramValue))

                        if (isEmpty) {
                            errors[param.name] = `${param.name} is required`
                        } else if (param.type === 'ip_address' && typeof paramValue === 'string') {
                            // IP address validation - only for complete values
                            const shouldValidate = paramValue.includes('.') && (
                                /^(\d{1,3}\.){3}\d{1,3}$/.test(paramValue) ||
                                /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(paramValue) ||
                                /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(paramValue)
                            )

                            if (shouldValidate && !validateIpParameterValue(paramValue)) {
                                errors[param.name] = `${param.name} must be a valid IP variable, IP address, or domain name`
                            }
                        }
                    }
                })

                return errors
            }))
        }
        return parameterErrorsCache.get(taskIndex)!
    }

    /**
     * Get test case validation errors for a task
     */
    const getTestCaseErrors = (taskIndex: number): ComputedRef<string[]> => {
        if (!testCaseErrorsCache.has(taskIndex)) {
            testCaseErrorsCache.set(taskIndex, computed(() => {
                const task = tasks.value[taskIndex]
                if (!task) return []

                const template = getTemplateForTask(task)
                const requiresTestCases = templateRequiresTestCases(template)

                if (requiresTestCases && (!task.testCases || task.testCases.length === 0)) {
                    return ['At least one test case is required']
                }

                return []
            }))
        }
        return testCaseErrorsCache.get(taskIndex)!
    }

    /**
     * Check if a task has any validation errors
     */
    const hasTaskErrors = (taskIndex: number): ComputedRef<boolean> => {
        if (!hasErrorsCache.has(taskIndex)) {
            hasErrorsCache.set(taskIndex, computed(() => {
                const fieldErrs = getFieldErrors(taskIndex).value
                const paramErrs = getParameterErrors(taskIndex).value
                const testErrs = getTestCaseErrors(taskIndex).value

                return Object.keys(fieldErrs).length > 0 ||
                    Object.keys(paramErrs).length > 0 ||
                    testErrs.length > 0
            }))
        }
        return hasErrorsCache.get(taskIndex)!
    }

    /**
     * Check if a task is fully valid
     */
    const isTaskValid = (taskIndex: number): ComputedRef<boolean> => {
        if (!isValidCache.has(taskIndex)) {
            isValidCache.set(taskIndex, computed(() => {
                const task = tasks.value[taskIndex]
                if (!task) return false

                const template = getTemplateForTask(task)
                const requiresTestCases = templateRequiresTestCases(template)
                const hasRequiredTestCases = requiresTestCases ? (task.testCases?.length ?? 0) > 0 : true

                return task.taskId?.length > 0 &&
                    task.name?.length > 0 &&
                    task.templateId?.length > 0 &&
                    task.executionDevice?.length > 0 &&
                    (task.points ?? -1) >= 0 &&
                    hasRequiredTestCases &&
                    !hasTaskErrors(taskIndex).value
            }))
        }
        return isValidCache.get(taskIndex)!
    }

    /**
     * Get complete validation result for a task
     */
    const getTaskValidation = (taskIndex: number): ComputedRef<TaskValidationResult> => {
        if (!validationCache.has(taskIndex)) {
            validationCache.set(taskIndex, computed(() => {
                const fieldErrs = getFieldErrors(taskIndex).value
                const paramErrs = getParameterErrors(taskIndex).value
                const testErrs = getTestCaseErrors(taskIndex).value

                const allErrs = [
                    ...Object.values(fieldErrs),
                    ...Object.values(paramErrs),
                    ...testErrs
                ]

                return {
                    fieldErrors: fieldErrs,
                    parameterErrors: paramErrs,
                    testCaseErrors: testErrs,
                    isValid: allErrs.length === 0,
                    allErrors: allErrs
                }
            }))
        }
        return validationCache.get(taskIndex)!
    }

    /**
     * All validation errors across all tasks
     */
    const allErrors = computed(() => {
        const errors: string[] = []

        if (tasks.value.length === 0) {
            errors.push('At least one task is required per part')
        }

        tasks.value.forEach((_, index) => {
            errors.push(...Object.values(getFieldErrors(index).value))
            errors.push(...Object.values(getParameterErrors(index).value))
            errors.push(...getTestCaseErrors(index).value)
        })

        // Deduplicate
        return [...new Set(errors)]
    })

    /**
     * Check if all tasks are valid
     */
    const isValid = computed(() => allErrors.value.length === 0)

    return {
        getFieldErrors,
        getParameterErrors,
        getTestCaseErrors,
        hasTaskErrors,
        isTaskValid,
        allErrors,
        isValid,
        getTaskValidation
    }
}
