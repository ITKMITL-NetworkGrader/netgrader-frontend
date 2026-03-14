/**
 * CodeMirror Autocompletion for YAML Task Templates
 * Provides IntelliSense-like suggestions based on Task Template schema
 */

import { autocompletion, type CompletionContext, type Completion, type CompletionResult } from '@codemirror/autocomplete'
import {
    DATA_TYPES,
    ACTION_TYPES,
    CONDITION_TYPES,
    PARSER_TYPES
} from './useYamlTemplateValidation'

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

interface FieldSchema {
    label: string
    type: string
    detail: string
    info?: string
    snippet?: string
}

// Top-level fields
const TOP_LEVEL_FIELDS: FieldSchema[] = [
    { label: 'task_name', type: 'property', detail: 'required', info: 'Unique identifier for the template (alphanumeric, underscores, hyphens)', snippet: 'task_name: "$1"' },
    { label: 'description', type: 'property', detail: 'required', info: 'Human-readable description of what the task does', snippet: 'description: "$1"' },

    { label: 'author', type: 'property', detail: 'optional', info: 'Template author name', snippet: 'author: "$1"' },
    { label: 'version', type: 'property', detail: 'optional', info: 'Template version (default: 1.0.0)', snippet: 'version: "1.0.0"' },
    { label: 'points', type: 'property', detail: 'optional', info: 'Maximum points for this task (default: 10)', snippet: 'points: ${1:10}' },
    { label: 'parameters', type: 'property', detail: 'array', info: 'Configurable parameters for the template', snippet: 'parameters:\n  - name: "$1"\n    datatype: "string"\n    description: "$2"\n    required: true' },
    { label: 'commands', type: 'property', detail: 'array', info: 'Sequence of actions to execute', snippet: 'commands:\n  - name: "$1"\n    action: "$2"\n    parameters:\n      $3\n    register: "$4"' },
    { label: 'validation', type: 'property', detail: 'array', info: 'Rules to validate execution results', snippet: 'validation:\n  - field: "$1"\n    condition: "equals"\n    value: $2\n    description: "$3"' },
    { label: 'debug', type: 'property', detail: 'optional', info: 'Debug configuration for troubleshooting', snippet: 'debug:\n  show_command_results: true\n  show_registered_variables: true' },
]

// Parameter fields
const PARAMETER_FIELDS: FieldSchema[] = [
    { label: 'name', type: 'property', detail: 'required', info: 'Parameter name', snippet: 'name: "$1"' },
    { label: 'datatype', type: 'property', detail: 'required', info: 'Data type: string, integer, float, boolean, ip_address, domain_name, cidr', snippet: 'datatype: "$1"' },
    { label: 'description', type: 'property', detail: 'required', info: 'Parameter description', snippet: 'description: "$1"' },
    { label: 'required', type: 'property', detail: 'boolean', info: 'Whether this parameter is required', snippet: 'required: ${1:true}' },
    { label: 'example', type: 'property', detail: 'optional', info: 'Example value for documentation', snippet: 'example: "$1"' },
]

// Command fields
const COMMAND_FIELDS: FieldSchema[] = [
    { label: 'name', type: 'property', detail: 'required', info: 'Unique descriptive name for the command', snippet: 'name: "$1"' },
    { label: 'action', type: 'property', detail: 'required', info: 'Type of action to perform', snippet: 'action: "$1"' },
    { label: 'parameters', type: 'property', detail: 'required', info: 'Action-specific parameters', snippet: 'parameters:\n      $1' },
    { label: 'register', type: 'property', detail: 'optional', info: 'Variable name to store the result', snippet: 'register: "$1"' },
]

// Validation rule fields
const VALIDATION_FIELDS: FieldSchema[] = [
    { label: 'field', type: 'property', detail: 'required', info: 'Variable path to validate (supports dot notation)', snippet: 'field: "$1"' },
    { label: 'condition', type: 'property', detail: 'required', info: 'Validation condition: equals, contains, greater_than, less_than, regex, exists', snippet: 'condition: "$1"' },
    { label: 'value', type: 'property', detail: 'required', info: 'Expected value to compare against', snippet: 'value: $1' },
    { label: 'description', type: 'property', detail: 'optional', info: 'Human-readable description', snippet: 'description: "$1"' },
]

// Debug fields
const DEBUG_FIELDS: FieldSchema[] = [
    { label: 'show_command_results', type: 'property', detail: 'boolean', info: 'Display output from each executed command', snippet: 'show_command_results: ${1:true}' },
    { label: 'show_registered_variables', type: 'property', detail: 'boolean', info: 'Show all variables stored via register', snippet: 'show_registered_variables: ${1:true}' },
    { label: 'show_validation_details', type: 'property', detail: 'boolean', info: 'Display detailed validation pass/fail information', snippet: 'show_validation_details: ${1:true}' },
    { label: 'show_parameter_substitution', type: 'property', detail: 'boolean', info: 'Show the actual parameter values received', snippet: 'show_parameter_substitution: ${1:true}' },
    { label: 'custom_debug_points', type: 'property', detail: 'array', info: 'List specific variable names to track and display', snippet: 'custom_debug_points:\n    - "$1"' },
]

// Action-specific parameter fields
const ACTION_PARAMETERS: Record<string, FieldSchema[]> = {
    netmiko_send_command: [
        { label: 'command', type: 'property', detail: 'required', info: 'CLI command to execute', snippet: 'command: "$1"' },
        { label: 'use_textfsm', type: 'property', detail: 'boolean', info: 'Enable TextFSM parsing', snippet: 'use_textfsm: ${1:true}' },
        { label: 'textfsm_template', type: 'property', detail: 'optional', info: 'Specific TextFSM template name', snippet: 'textfsm_template: "$1"' },
        { label: 'execution_mode', type: 'property', detail: 'optional', info: 'Execution mode configuration', snippet: 'execution_mode: "$1"' },
        { label: 'connection_timeout', type: 'property', detail: 'optional', info: 'Connection timeout in seconds', snippet: 'connection_timeout: ${1:30}' },
    ],
    napalm_get: [
        { label: 'getter', type: 'property', detail: 'required', info: 'NAPALM getter method name', snippet: 'getter: "$1"' },
    ],
    ping: [
        { label: 'target_ip', type: 'property', detail: 'required', info: 'IP address or hostname to ping', snippet: 'target_ip: "{{$1}}"' },
        { label: 'ping_count', type: 'property', detail: 'optional', info: 'Number of ping packets (default: 3)', snippet: 'ping_count: ${1:5}' },
    ],
    parse_output: [
        { label: 'parser', type: 'property', detail: 'optional', info: 'Parser type: regex, textfsm, or jinja (default: regex)', snippet: 'parser: "$1"' },
        { label: 'input', type: 'property', detail: 'required', info: 'Text to parse (supports Jinja2 variables)', snippet: 'input: "{{$1}}"' },
        { label: 'pattern', type: 'property', detail: 'regex', info: 'Regex pattern for extraction', snippet: 'pattern: "$1"' },
        { label: 'template', type: 'property', detail: 'jinja/textfsm', info: 'Template content for parsing', snippet: 'template: |\n        $1' },
        { label: 'template_path', type: 'property', detail: 'textfsm', info: 'Path to TextFSM template file', snippet: 'template_path: "$1"' },
    ],
}

// NAPALM getters
const NAPALM_GETTERS = [
    'get_interfaces', 'get_interfaces_ip', 'get_route_to', 'get_bgp_neighbors',
    'get_facts', 'get_vlans', 'get_arp_table', 'get_mac_address_table',
    'get_lldp_neighbors', 'get_ntp_servers', 'get_users', 'get_config'
]

// ============================================================================
// COMPLETION HELPERS
// ============================================================================

function createCompletions(fields: FieldSchema[]): Completion[] {
    return fields.map(field => ({
        label: field.label,
        type: field.type,
        detail: field.detail,
        info: field.info,
        apply: field.snippet || field.label,
    }))
}

function createValueCompletions(values: readonly string[], type: string = 'enum'): Completion[] {
    return values.map(value => ({
        label: value,
        type,
        detail: 'value',
    }))
}

// ============================================================================
// CONTEXT DETECTION
// ============================================================================

type YamlContext =
    | 'top_level'
    | 'parameters_item'
    | 'commands_item'
    | 'commands_parameters'
    | 'validation_item'
    | 'debug'

    | 'value_datatype'
    | 'value_action'
    | 'value_condition'
    | 'value_parser'
    | 'value_getter'
    | 'unknown'

function detectContext(context: CompletionContext): { ctx: YamlContext; currentAction?: string } {
    const { state, pos } = context
    const doc = state.doc.toString()
    const beforeCursor = doc.slice(0, pos)
    const lines = beforeCursor.split('\n')
    const currentLine = lines[lines.length - 1] || ''
    const lineNumber = lines.length - 1

    // Check if we're in a value position (after colon)
    const colonMatch = currentLine.match(/^\s*(\w+):\s*(.*)$/)
    if (colonMatch) {
        const key = colonMatch[1] || ''
        const afterColon = (colonMatch[2] || '').trim()

        // Value completions

        if (key === 'datatype' && (afterColon === '' || afterColon.startsWith('"'))) {
            return { ctx: 'value_datatype' }
        }
        if (key === 'action' && (afterColon === '' || afterColon.startsWith('"'))) {
            return { ctx: 'value_action' }
        }
        if (key === 'condition' && (afterColon === '' || afterColon.startsWith('"'))) {
            return { ctx: 'value_condition' }
        }
        if (key === 'parser' && (afterColon === '' || afterColon.startsWith('"'))) {
            return { ctx: 'value_parser' }
        }
        if (key === 'getter' && (afterColon === '' || afterColon.startsWith('"'))) {
            return { ctx: 'value_getter' }
        }
    }

    // Determine current section based on indentation and previous lines
    let currentSection = ''
    let currentAction = ''
    let inParameters = false
    const indent = currentLine.match(/^(\s*)/)?.[1]?.length || 0

    // Scan backwards to find section context
    for (let i = lineNumber; i >= 0; i--) {
        const line = lines[i]
        if (!line) continue
        const lineIndent = line.match(/^(\s*)/)?.[1]?.length || 0

        // Skip empty lines
        if (line.trim() === '') continue

        // Top level sections (no indent)
        if (lineIndent === 0 && line.match(/^(\w+):/)) {
            const sectionMatch = line.match(/^(\w+):/)
            if (sectionMatch?.[1]) {
                currentSection = sectionMatch[1]
                break
            }
        }

        // Track action type for command parameters context
        const actionMatch = line.match(/^\s+action:\s*["']?(\w+)["']?/)
        if (actionMatch?.[1]) {
            currentAction = actionMatch[1]
        }

        // Check if we're in a parameters block within commands
        if (line.match(/^\s+parameters:\s*$/)) {
            inParameters = true
        }
    }

    // Determine context based on section and indentation
    if (indent === 0) {
        return { ctx: 'top_level' }
    }

    switch (currentSection) {
        case 'parameters':
            return { ctx: 'parameters_item' }
        case 'commands':
            if (inParameters && indent >= 6) {
                return { ctx: 'commands_parameters', currentAction }
            }
            return { ctx: 'commands_item' }
        case 'validation':
            return { ctx: 'validation_item' }
        case 'debug':
            return { ctx: 'debug' }
        default:
            if (indent <= 2) {
                return { ctx: 'top_level' }
            }
            return { ctx: 'unknown' }
    }
}

// ============================================================================
// COMPLETION SOURCE
// ============================================================================

function yamlTemplateCompletions(context: CompletionContext): CompletionResult | null {
    // Get word before cursor
    const word = context.matchBefore(/[\w_-]*/)

    // Don't show completions if nothing typed and not explicitly triggered
    if (!word && !context.explicit) return null

    const from = word?.from ?? context.pos
    const { ctx, currentAction } = detectContext(context)

    let options: Completion[] = []

    switch (ctx) {
        case 'top_level':
            options = createCompletions(TOP_LEVEL_FIELDS)
            break
        case 'parameters_item':
            options = createCompletions(PARAMETER_FIELDS)
            break
        case 'commands_item':
            options = createCompletions(COMMAND_FIELDS)
            break
        case 'commands_parameters':
            if (currentAction && ACTION_PARAMETERS[currentAction]) {
                options = createCompletions(ACTION_PARAMETERS[currentAction])
            } else {
                // Show all possible action parameters if action not detected
                options = Object.values(ACTION_PARAMETERS).flat().map(field => ({
                    label: field.label,
                    type: field.type,
                    detail: field.detail,
                    info: field.info,
                }))
                // Remove duplicates by label
                options = options.filter((v, i, a) => a.findIndex(t => t.label === v.label) === i)
            }
            break
        case 'validation_item':
            options = createCompletions(VALIDATION_FIELDS)
            break
        case 'debug':
            options = createCompletions(DEBUG_FIELDS)
            break

        case 'value_datatype':
            options = createValueCompletions(DATA_TYPES)
            break
        case 'value_action':
            options = createValueCompletions(ACTION_TYPES)
            break
        case 'value_condition':
            options = createValueCompletions(CONDITION_TYPES)
            break
        case 'value_parser':
            options = createValueCompletions(PARSER_TYPES)
            break
        case 'value_getter':
            options = createValueCompletions(NAPALM_GETTERS)
            break
        default:
            // Default to top-level completions
            options = createCompletions(TOP_LEVEL_FIELDS)
    }

    if (options.length === 0) return null

    return {
        from,
        options,
        validFor: /^[\w_-]*$/
    }
}

// ============================================================================
// EXTENSION FACTORY
// ============================================================================

export function createYamlTemplateAutocomplete() {
    return autocompletion({
        override: [yamlTemplateCompletions],
        activateOnTyping: true,
        icons: true,
    })
}

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useYamlTemplateAutocomplete() {
    return {
        createYamlTemplateAutocomplete,
    }
}
