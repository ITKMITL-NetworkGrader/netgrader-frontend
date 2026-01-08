/**
 * Comprehensive YAML Task Template Validation
 * Based on NetGrader Custom YAML Template Guide documentation
 */

import yaml from 'js-yaml'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ValidationError {
    path: string
    message: string
    severity: 'error' | 'warning'
}

export interface ValidationResult {
    isValid: boolean
    errors: ValidationError[]
    warnings: ValidationError[]
}

// Enum definitions from documentation
export const CONNECTION_TYPES = ['netmiko', 'napalm', 'ssh', 'command'] as const
export const DATA_TYPES = ['string', 'integer', 'float', 'boolean', 'ip_address', 'domain_name', 'cidr'] as const
export const ACTION_TYPES = ['netmiko_send_command', 'napalm_get', 'ping', 'parse_output', 'custom_script'] as const
export const CONDITION_TYPES = ['equals', 'contains', 'greater_than', 'less_than', 'regex', 'exists'] as const
export const PARSER_TYPES = ['regex', 'textfsm', 'jinja'] as const

type ConnectionType = typeof CONNECTION_TYPES[number]
type DataType = typeof DATA_TYPES[number]
type ActionType = typeof ACTION_TYPES[number]
type ConditionType = typeof CONDITION_TYPES[number]

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const isValidTaskName = (name: string): boolean => {
    // Alphanumeric, underscores, and hyphens only
    return /^[a-zA-Z0-9_-]+$/.test(name)
}

const isValidDataType = (datatype: string): boolean => {
    // Support union types with | operator (e.g., "ip_address | domain_name")
    const types = datatype.split('|').map(t => t.trim())
    return types.every(t => DATA_TYPES.includes(t as DataType))
}

const isValidConnectionType = (type: string): boolean => {
    return CONNECTION_TYPES.includes(type as ConnectionType)
}

const isValidActionType = (action: string): boolean => {
    return ACTION_TYPES.includes(action as ActionType)
}

const isValidConditionType = (condition: string): boolean => {
    return CONDITION_TYPES.includes(condition as ConditionType)
}

// ============================================================================
// SECTION VALIDATORS
// ============================================================================

function validateMetadata(parsed: Record<string, any>, errors: ValidationError[], warnings: ValidationError[]) {
    // task_name - required
    if (!parsed.task_name) {
        errors.push({ path: 'task_name', message: 'Missing required field: task_name', severity: 'error' })
    } else if (typeof parsed.task_name !== 'string') {
        errors.push({ path: 'task_name', message: 'task_name must be a string', severity: 'error' })
    } else if (!isValidTaskName(parsed.task_name)) {
        errors.push({
            path: 'task_name',
            message: 'task_name must contain only alphanumeric characters, underscores, and hyphens',
            severity: 'error'
        })
    }

    // description - required
    if (!parsed.description) {
        errors.push({ path: 'description', message: 'Missing required field: description', severity: 'error' })
    } else if (typeof parsed.description !== 'string') {
        errors.push({ path: 'description', message: 'description must be a string', severity: 'error' })
    }

    // connection_type - required
    if (!parsed.connection_type) {
        errors.push({ path: 'connection_type', message: 'Missing required field: connection_type', severity: 'error' })
    } else if (!isValidConnectionType(parsed.connection_type)) {
        errors.push({
            path: 'connection_type',
            message: `Invalid connection_type: "${parsed.connection_type}". Must be one of: ${CONNECTION_TYPES.join(', ')}`,
            severity: 'error'
        })
    }

    // author - optional
    if (parsed.author !== undefined && typeof parsed.author !== 'string') {
        warnings.push({ path: 'author', message: 'author should be a string', severity: 'warning' })
    }

    // version - optional
    if (parsed.version !== undefined && typeof parsed.version !== 'string') {
        warnings.push({ path: 'version', message: 'version should be a string', severity: 'warning' })
    }

    // points - optional, must be integer
    if (parsed.points !== undefined) {
        if (typeof parsed.points !== 'number' || !Number.isInteger(parsed.points)) {
            warnings.push({ path: 'points', message: 'points should be an integer', severity: 'warning' })
        } else if (parsed.points < 0) {
            warnings.push({ path: 'points', message: 'points should be a positive number', severity: 'warning' })
        }
    }
}

function validateParameters(parsed: Record<string, any>, errors: ValidationError[], warnings: ValidationError[]) {
    if (!parsed.parameters) {
        // Parameters are optional according to some templates, but let's warn
        warnings.push({ path: 'parameters', message: 'No parameters defined', severity: 'warning' })
        return
    }

    if (!Array.isArray(parsed.parameters)) {
        errors.push({ path: 'parameters', message: 'parameters must be an array', severity: 'error' })
        return
    }

    parsed.parameters.forEach((param: any, index: number) => {
        const paramPath = `parameters[${index}]`

        // name - required
        if (!param.name) {
            errors.push({ path: `${paramPath}.name`, message: `Parameter ${index + 1}: missing required field 'name'`, severity: 'error' })
        } else if (typeof param.name !== 'string') {
            errors.push({ path: `${paramPath}.name`, message: `Parameter ${index + 1}: 'name' must be a string`, severity: 'error' })
        }

        // datatype - required
        if (!param.datatype) {
            errors.push({ path: `${paramPath}.datatype`, message: `Parameter ${index + 1}: missing required field 'datatype'`, severity: 'error' })
        } else if (typeof param.datatype !== 'string') {
            errors.push({ path: `${paramPath}.datatype`, message: `Parameter ${index + 1}: 'datatype' must be a string`, severity: 'error' })
        } else if (!isValidDataType(param.datatype)) {
            errors.push({
                path: `${paramPath}.datatype`,
                message: `Parameter ${index + 1}: invalid datatype "${param.datatype}". Must be one of: ${DATA_TYPES.join(', ')} (or union with |)`,
                severity: 'error'
            })
        }

        // description - required
        if (!param.description) {
            errors.push({ path: `${paramPath}.description`, message: `Parameter ${index + 1}: missing required field 'description'`, severity: 'error' })
        }

        // required - should be boolean if present
        if (param.required !== undefined && typeof param.required !== 'boolean') {
            warnings.push({ path: `${paramPath}.required`, message: `Parameter ${index + 1}: 'required' should be a boolean`, severity: 'warning' })
        }
    })
}

function validateCommands(parsed: Record<string, any>, errors: ValidationError[], warnings: ValidationError[]) {
    if (!parsed.commands) {
        // Commands might be optional for simple templates
        warnings.push({ path: 'commands', message: 'No commands defined', severity: 'warning' })
        return
    }

    if (!Array.isArray(parsed.commands)) {
        errors.push({ path: 'commands', message: 'commands must be an array', severity: 'error' })
        return
    }

    if (parsed.commands.length === 0) {
        warnings.push({ path: 'commands', message: 'commands array is empty', severity: 'warning' })
        return
    }

    parsed.commands.forEach((cmd: any, index: number) => {
        const cmdPath = `commands[${index}]`

        // name - required
        if (!cmd.name) {
            errors.push({ path: `${cmdPath}.name`, message: `Command ${index + 1}: missing required field 'name'`, severity: 'error' })
        }

        // action - required
        if (!cmd.action) {
            errors.push({ path: `${cmdPath}.action`, message: `Command ${index + 1}: missing required field 'action'`, severity: 'error' })
        } else if (!isValidActionType(cmd.action)) {
            errors.push({
                path: `${cmdPath}.action`,
                message: `Command ${index + 1}: invalid action "${cmd.action}". Must be one of: ${ACTION_TYPES.join(', ')}`,
                severity: 'error'
            })
        } else {
            // Validate action-specific parameters
            validateActionParameters(cmd, index, errors, warnings)
        }

        // register - optional, should be string
        if (cmd.register !== undefined && typeof cmd.register !== 'string') {
            warnings.push({ path: `${cmdPath}.register`, message: `Command ${index + 1}: 'register' should be a string`, severity: 'warning' })
        }
    })
}

function validateActionParameters(cmd: any, index: number, errors: ValidationError[], warnings: ValidationError[]) {
    const cmdPath = `commands[${index}]`

    if (!cmd.parameters) {
        errors.push({ path: `${cmdPath}.parameters`, message: `Command ${index + 1}: missing required field 'parameters'`, severity: 'error' })
        return
    }

    switch (cmd.action) {
        case 'netmiko_send_command':
            if (!cmd.parameters.command) {
                errors.push({
                    path: `${cmdPath}.parameters.command`,
                    message: `Command ${index + 1}: netmiko_send_command requires 'command' parameter`,
                    severity: 'error'
                })
            }
            break

        case 'napalm_get':
            if (!cmd.parameters.getter) {
                errors.push({
                    path: `${cmdPath}.parameters.getter`,
                    message: `Command ${index + 1}: napalm_get requires 'getter' parameter`,
                    severity: 'error'
                })
            }
            break

        case 'ping':
            if (!cmd.parameters.target_ip) {
                errors.push({
                    path: `${cmdPath}.parameters.target_ip`,
                    message: `Command ${index + 1}: ping requires 'target_ip' parameter`,
                    severity: 'error'
                })
            }
            break

        case 'parse_output':
            if (!cmd.parameters.input) {
                errors.push({
                    path: `${cmdPath}.parameters.input`,
                    message: `Command ${index + 1}: parse_output requires 'input' parameter`,
                    severity: 'error'
                })
            }
            // Check parser type
            const parser = cmd.parameters.parser || 'regex'
            if (!PARSER_TYPES.includes(parser)) {
                errors.push({
                    path: `${cmdPath}.parameters.parser`,
                    message: `Command ${index + 1}: invalid parser "${parser}". Must be one of: ${PARSER_TYPES.join(', ')}`,
                    severity: 'error'
                })
            }
            // Parser-specific validation
            if (parser === 'regex' && !cmd.parameters.pattern) {
                errors.push({
                    path: `${cmdPath}.parameters.pattern`,
                    message: `Command ${index + 1}: regex parser requires 'pattern' parameter`,
                    severity: 'error'
                })
            }
            if (parser === 'textfsm' && !cmd.parameters.template_path && !cmd.parameters.template) {
                errors.push({
                    path: `${cmdPath}.parameters`,
                    message: `Command ${index + 1}: textfsm parser requires 'template_path' or 'template' parameter`,
                    severity: 'error'
                })
            }
            if (parser === 'jinja' && !cmd.parameters.template) {
                errors.push({
                    path: `${cmdPath}.parameters.template`,
                    message: `Command ${index + 1}: jinja parser requires 'template' parameter`,
                    severity: 'error'
                })
            }
            break
    }
}

function validateValidation(parsed: Record<string, any>, errors: ValidationError[], warnings: ValidationError[]) {
    if (!parsed.validation) {
        // Validation rules are optional
        return
    }

    if (!Array.isArray(parsed.validation)) {
        errors.push({ path: 'validation', message: 'validation must be an array', severity: 'error' })
        return
    }

    parsed.validation.forEach((rule: any, index: number) => {
        const rulePath = `validation[${index}]`

        // field - required
        if (!rule.field) {
            errors.push({ path: `${rulePath}.field`, message: `Validation rule ${index + 1}: missing required field 'field'`, severity: 'error' })
        }

        // condition - required
        if (!rule.condition) {
            errors.push({ path: `${rulePath}.condition`, message: `Validation rule ${index + 1}: missing required field 'condition'`, severity: 'error' })
        } else if (!isValidConditionType(rule.condition)) {
            errors.push({
                path: `${rulePath}.condition`,
                message: `Validation rule ${index + 1}: invalid condition "${rule.condition}". Must be one of: ${CONDITION_TYPES.join(', ')}`,
                severity: 'error'
            })
        }

        // value - required
        if (rule.value === undefined) {
            errors.push({ path: `${rulePath}.value`, message: `Validation rule ${index + 1}: missing required field 'value'`, severity: 'error' })
        }
    })
}

function validateDebug(parsed: Record<string, any>, errors: ValidationError[], warnings: ValidationError[]) {
    if (!parsed.debug) {
        return // Debug is optional
    }

    if (typeof parsed.debug !== 'object' || Array.isArray(parsed.debug)) {
        errors.push({ path: 'debug', message: 'debug must be an object', severity: 'error' })
        return
    }

    const booleanFields = ['show_command_results', 'show_registered_variables', 'show_validation_details', 'show_parameter_substitution']

    booleanFields.forEach(field => {
        if (parsed.debug[field] !== undefined && typeof parsed.debug[field] !== 'boolean') {
            warnings.push({ path: `debug.${field}`, message: `debug.${field} should be a boolean`, severity: 'warning' })
        }
    })

    if (parsed.debug.custom_debug_points !== undefined) {
        if (!Array.isArray(parsed.debug.custom_debug_points)) {
            warnings.push({ path: 'debug.custom_debug_points', message: 'debug.custom_debug_points should be an array', severity: 'warning' })
        } else if (!parsed.debug.custom_debug_points.every((p: any) => typeof p === 'string')) {
            warnings.push({ path: 'debug.custom_debug_points', message: 'debug.custom_debug_points should contain only strings', severity: 'warning' })
        }
    }
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export function validateYamlTemplate(yamlContent: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // First, check if YAML is syntactically valid
    let parsed: Record<string, any>
    try {
        parsed = yaml.load(yamlContent) as Record<string, any>
    } catch (e: any) {
        return {
            isValid: false,
            errors: [{ path: 'yaml', message: `YAML syntax error: ${e.message}`, severity: 'error' }],
            warnings: []
        }
    }

    // Check if parsed content is empty or not an object
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
            isValid: false,
            errors: [{ path: 'yaml', message: 'YAML content must be a valid object', severity: 'error' }],
            warnings: []
        }
    }

    // Validate each section
    validateMetadata(parsed, errors, warnings)
    validateParameters(parsed, errors, warnings)
    validateCommands(parsed, errors, warnings)
    validateValidation(parsed, errors, warnings)
    validateDebug(parsed, errors, warnings)

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    }
}

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useYamlTemplateValidation() {
    return {
        validateYamlTemplate,
        CONNECTION_TYPES,
        DATA_TYPES,
        ACTION_TYPES,
        CONDITION_TYPES,
        PARSER_TYPES
    }
}
