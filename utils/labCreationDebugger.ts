import type { IpVariableReference, GeneratedIpVariable } from '~/utils/studentIpGenerator'
import StudentIpGenerator from '~/utils/studentIpGenerator'

export interface LabCreationStep {
  stepNumber: number
  stepName: string
  timestamp: Date
  data: any
  validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export interface DeviceConfiguration {
  deviceId: string
  templateId: string
  deviceType: 'router' | 'switch' | 'pc'
  ipVariables: GeneratedIpVariable[]
}

export interface TaskParameterDebug {
  taskId: string
  templateId: string
  parameterName: string
  parameterType: string
  value: string
  source: 'ip_variable' | 'custom_input' | 'text_input'
  variableReference?: string // DeviceID.VariableName format
  resolvedIpAddress?: string
  validation: {
    isValid: boolean
    error?: string
  }
}

export interface LabCreationPayload {
  // Lab Basic Information (Step 1)
  courseId: string
  name: string
  description?: string
  instructions: string
  dueDate?: Date
  availableFrom?: Date
  availableUntil?: Date

  // Network Configuration (Step 2)
  network: {
    managementNetwork: string
    managementSubnetMask: number
    mode: 'fixed_vlan' | 'lecturer_group' | 'calculated_vlan'
    vlanConfiguration: {
      vlanCount: number
      vlans: Array<{
        id?: string
        vlanId?: number
        calculationMultiplier?: number
        baseNetwork: string
        subnetMask: number
        groupModifier?: number
        isStudentGenerated: boolean
      }>
    }
    devices: Array<{
      deviceId: string
      templateId: string
      deviceType: string
      ipVariables: Array<{
        name: string
        inputType: 'hostOffset' | 'fullIP' | 'studentGenerated'
        hostOffset?: number
        fullIP?: string
        isStudentGenerated?: boolean
        readonly?: boolean
        description?: string
        vlanIndex?: number // Which VLAN this variable belongs to
      }>
    }>
  }

  // Student Generation Configuration
  studentGeneration: {
    enabled: boolean
    algorithm: 'base_network_replacement' | 'lecturer_group_based' | 'calculated_vlan_numbers'
    baseConfiguration: {
      yearOffset: number // e.g., 61 for 2565 Buddhist year
      facultyCode: string // e.g., "07" for IT faculty
      indexDigits: number // e.g., 4 for 4-digit student index
    }
  }

  // Debug Information
  debug: {
    creationSteps: LabCreationStep[]
    ipVariableReferences: IpVariableReference[]
    deviceConfigurations: DeviceConfiguration[]
    studentGenerationPreview?: {
      sampleStudentId: string
      previewNetworks: any
      previewDevices: any
    }
  }
}

export interface PartCreationPayload {
  labId: string
  partId: string
  title: string
  description?: string
  instructions: string
  order: number
  tasks: Array<{
    taskId: string
    name: string
    description?: string
    templateId: string
    executionDevice: string
    targetDevices: string[]
    parameters: Record<string, any>
    testCases: Array<{
      comparison_type: string
      expected_result: any
    }>
    order: number
    points: number

    // Debug information for parameters
    parameterDebug?: TaskParameterDebug[]
  }>
  task_groups: Array<{
    group_id: string
    title: string
    description?: string
    group_type: 'all_or_nothing' | 'proportional'
    points: number
    continue_on_failure: boolean
    timeout_seconds: number
  }>
  prerequisites: string[]
  totalPoints: number

  // Debug Information
  debug: {
    partCreationTimestamp: Date
    ipVariableResolutions: Record<string, string>
    taskParameterValidations: TaskParameterDebug[]
    warnings: string[]
  }
}

class LabCreationDebugger {
  private steps: LabCreationStep[] = []
  private ipGenerator?: StudentIpGenerator
  private deviceConfigurations: DeviceConfiguration[] = []
  private ipVariableReferences: IpVariableReference[] = []

  constructor(studentId?: string | number, networkConfig?: any) {
    if (studentId && networkConfig) {
      this.ipGenerator = new StudentIpGenerator({
        student_id: studentId,
        managementNetwork: networkConfig.managementNetwork || '10.0.0.0',
        managementSubnetMask: networkConfig.managementSubnetMask || 24,
        mode: networkConfig.mode || 'calculated_vlan',
        vlans: networkConfig.vlanConfiguration?.vlans || []
      })
    }
  }

  // Update IP generator when network config changes
  updateNetworkConfig(studentId: string | number, networkConfig: any) {
    this.ipGenerator = new StudentIpGenerator({
      student_id: studentId,
      managementNetwork: networkConfig.managementNetwork || '10.0.0.0',
      managementSubnetMask: networkConfig.managementSubnetMask || 24,
      mode: networkConfig.mode || 'calculated_vlan',
      vlans: networkConfig.vlanConfiguration?.vlans || []
    })
  }

  // Record a step in the lab creation process
  recordStep(stepNumber: number, stepName: string, data: any, validation?: any) {
    const step: LabCreationStep = {
      stepNumber,
      stepName,
      timestamp: new Date(),
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      validation
    }

    this.steps.push(step)
  }

  // Add device configuration
  addDeviceConfiguration(device: DeviceConfiguration) {
    const existingIndex = this.deviceConfigurations.findIndex(d => d.deviceId === device.deviceId)
    if (existingIndex >= 0) {
      this.deviceConfigurations[existingIndex] = device
    } else {
      this.deviceConfigurations.push(device)
    }

    // Update IP variable references
    this.updateIpVariableReferences()
  }

  // Update IP variable references from current device configurations
  updateIpVariableReferences() {
    if (!this.ipGenerator) return

    const devices = this.deviceConfigurations.map(device => ({
      deviceId: device.deviceId,
      ipVariables: device.ipVariables
    }))

    this.ipVariableReferences = this.ipGenerator.createIpVariableReferences(devices)
  }

  // Generate student IP values for a device
  generateStudentIpVariables(deviceId: string, deviceType: 'router' | 'switch' | 'pc'): GeneratedIpVariable[] {
    if (!this.ipGenerator) return []

    return this.ipGenerator.generatePredefinedIpVariables(deviceId, deviceType)
  }

  // Validate task parameter that uses IP variables
  validateTaskParameter(
    taskId: string,
    templateId: string,
    parameterName: string,
    parameterType: string,
    value: string,
    isIpParameter: boolean = false
  ): TaskParameterDebug {
    const debug: TaskParameterDebug = {
      taskId,
      templateId,
      parameterName,
      parameterType,
      value,
      source: 'text_input',
      validation: { isValid: true }
    }

    if (isIpParameter && parameterType === 'ip_address') {
      // Check if value is an IP variable reference (DeviceID.VariableName format)
      if (value.includes('.') && this.ipVariableReferences.length > 0) {
        const variableRef = this.ipVariableReferences.find(ref => ref.displayName === value)

        if (variableRef) {
          debug.source = 'ip_variable'
          debug.variableReference = value
          debug.resolvedIpAddress = variableRef.ipAddress
          debug.validation.isValid = true
        } else {
          debug.validation.isValid = false
          debug.validation.error = `IP variable reference '${value}' not found`
        }
      } else {
        // Treat as custom IP address
        debug.source = 'custom_input'

        if (this.ipGenerator) {
          const isIpv6 = value.includes(':')
          const validation = this.ipGenerator.validateIpAddress(value, isIpv6 ? 'ipv6' : 'ipv4')
          debug.validation = validation
          if (validation.isValid) {
            debug.resolvedIpAddress = value
          }
        } else {
          // Basic validation without IP generator
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$/

          debug.validation.isValid = ipv4Regex.test(value) || ipv6Regex.test(value)
          if (!debug.validation.isValid) {
            debug.validation.error = 'Invalid IP address format'
          } else {
            debug.resolvedIpAddress = value
          }
        }
      }
    }

    return debug
  }

  // Generate complete lab creation payload with debug info
  generateLabPayload(labData: any): LabCreationPayload {
    // Check if any VLAN uses student generation
    const hasStudentGeneration = labData.network?.vlanConfiguration?.vlans?.some(
      (vlan: any) => vlan.isStudentGenerated
    ) || false

    // Determine algorithm based on mode
    let algorithm: 'base_network_replacement' | 'lecturer_group_based' | 'calculated_vlan_numbers' = 'base_network_replacement'
    if (labData.network?.mode) {
      switch (labData.network.mode) {
        case 'fixed_vlan':
          algorithm = 'base_network_replacement'
          break
        case 'lecturer_group':
          algorithm = 'lecturer_group_based'
          break
        case 'calculated_vlan':
          algorithm = 'calculated_vlan_numbers'
          break
      }
    }

    // Generate preview data if student generation is enabled
    let studentGenerationPreview = undefined
    if (hasStudentGeneration && this.ipGenerator) {
      const sampleStudentId = '65070232'
      const previewData = this.ipGenerator.generateStudentIpData()
      studentGenerationPreview = {
        sampleStudentId,
        mode: labData.network?.mode || 'calculated_vlan',
        previewNetworks: previewData.generatedNetworks,
        previewVlanData: previewData.vlanData,
        previewDevices: this.deviceConfigurations.map(device => ({
          deviceId: device.deviceId,
          variables: device.ipVariables
            .filter(v => v.type === 'student_generated')
            .map(v => ({
              name: v.name,
              vlanIndex: v.vlanIndex || 0,
              previewIP: this.generatePreviewIPForVlan(device.deviceType, v.name, v.vlanIndex || 0)
            }))
        }))
      }
    }

    const payload: LabCreationPayload = {
      ...labData,
      studentGeneration: {
        enabled: hasStudentGeneration,
        algorithm,
        baseConfiguration: {
          yearOffset: 61, // 2565 Buddhist year
          facultyCode: '07', // IT faculty
          indexDigits: 4 // 4-digit student index
        }
      },
      debug: {
        creationSteps: [...this.steps],
        ipVariableReferences: [...this.ipVariableReferences],
        deviceConfigurations: [...this.deviceConfigurations],
        studentGenerationPreview
      }
    }

    // Record the payload generation step
    this.recordStep(
      999,
      'Generate Lab Payload',
      {
        payloadSize: JSON.stringify(payload).length,
        hasStudentGeneration,
        deviceCount: this.deviceConfigurations.length
      },
      { isValid: true, errors: [], warnings: [] }
    )

    return payload
  }

  // Helper method to generate preview IP for a device variable
  private generatePreviewIPForVlan(deviceType: string, variableName: string, vlanIndex: number = 0): string {
    if (!this.ipGenerator) return 'Preview not available'

    try {
      const data = this.ipGenerator.generateStudentIpData()
      const vlanKey = `vlan_${vlanIndex + 1}`

      // Map variable names to IP addresses based on VLAN
      const ipMap: Record<string, string> = {
        [`gig0_0_${vlanKey}`]: data.commonIpAddresses[`router_${vlanKey}_ip`],
        [`gig0_0_${vlanKey}_ipv6`]: data.commonIpAddresses[`router_${vlanKey}_ipv6`],
        'loopback0': data.commonIpAddresses.router_external_ip,
        'gig0_1_external': data.commonIpAddresses.router_external_ip,
        'management_ip': data.commonIpAddresses.switch_management_ip,
        'eth0': data.commonIpAddresses[`pc1_${vlanKey}_ip`],
        'eth0_ipv6': data.commonIpAddresses[`pc1_${vlanKey}_ipv6`]
      }

      // Try exact match first
      if (ipMap[variableName.toLowerCase()]) {
        return ipMap[variableName.toLowerCase()]
      }

      // Try pattern matching for VLAN interfaces
      if (variableName.toLowerCase().includes('gig0_0') && !variableName.toLowerCase().includes('ipv6')) {
        return data.commonIpAddresses[`router_${vlanKey}_ip`] || 'IP not available'
      }

      if (variableName.toLowerCase().includes('gig0_0') && variableName.toLowerCase().includes('ipv6')) {
        return data.commonIpAddresses[`router_${vlanKey}_ipv6`] || 'IPv6 not available'
      }

      // Default fallback
      return data.commonIpAddresses[`router_${vlanKey}_ip`] || 'Preview not available'
    } catch (error) {
      return 'Error generating preview'
    }
  }

  // Backward compatibility method
  private generatePreviewIP(deviceType: string, variableName: string): string {
    return this.generatePreviewIPForVlan(deviceType, variableName, 0)
  }

  // Generate part creation payload with parameter debugging
  generatePartPayload(partData: any, tasks: any[]): PartCreationPayload {
    const taskParameterValidations: TaskParameterDebug[] = []
    const warnings: string[] = []
    const ipVariableResolutions: Record<string, string> = {}

    // Process each task and validate parameters
    const processedTasks = tasks.map(task => {
      const taskDebug: TaskParameterDebug[] = []

      // Check each parameter for IP types
      Object.entries(task.parameters || {}).forEach(([paramName, paramValue]) => {
        // This would come from the task template schema
        const isIpParameter = paramName.toLowerCase().includes('ip') ||
                            paramName.toLowerCase().includes('address') ||
                            paramName.toLowerCase().includes('destination')

        const paramDebug = this.validateTaskParameter(
          task.taskId,
          task.templateId,
          paramName,
          'string', // This should come from template schema
          String(paramValue),
          isIpParameter
        )

        taskDebug.push(paramDebug)
        taskParameterValidations.push(paramDebug)

        // Track IP variable resolutions
        if (paramDebug.resolvedIpAddress) {
          ipVariableResolutions[`${task.taskId}.${paramName}`] = paramDebug.resolvedIpAddress
        }

        // Add warnings for potential issues
        if (!paramDebug.validation.isValid) {
          warnings.push(`Task ${task.taskId}, parameter ${paramName}: ${paramDebug.validation.error}`)
        }
      })

      return {
        ...task,
        parameterDebug: taskDebug
      }
    })

    const payload: PartCreationPayload = {
      ...partData,
      tasks: processedTasks,
      debug: {
        partCreationTimestamp: new Date(),
        ipVariableResolutions,
        taskParameterValidations,
        warnings
      }
    }

    // Record the part payload generation
    this.recordStep(
      998,
      'Generate Part Payload',
      {
        partId: partData.partId,
        tasksCount: tasks.length,
        payloadSize: JSON.stringify(payload).length,
        warningsCount: warnings.length
      },
      {
        isValid: warnings.length === 0,
        errors: [],
        warnings
      }
    )

    return payload
  }

  // Export debug session for analysis
  exportDebugSession(): {
    sessionId: string
    timestamp: Date
    studentConfig?: any
    steps: LabCreationStep[]
    deviceConfigurations: DeviceConfiguration[]
    ipVariableReferences: IpVariableReference[]
    summary: {
      totalSteps: number
      deviceCount: number
      ipVariableCount: number
      errors: string[]
      warnings: string[]
    }
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Collect errors and warnings from all steps
    this.steps.forEach(step => {
      if (step.validation) {
        errors.push(...step.validation.errors)
        warnings.push(...step.validation.warnings)
      }
    })

    return {
      sessionId: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      studentConfig: this.ipGenerator?.config,
      steps: [...this.steps],
      deviceConfigurations: [...this.deviceConfigurations],
      ipVariableReferences: [...this.ipVariableReferences],
      summary: {
        totalSteps: this.steps.length,
        deviceCount: this.deviceConfigurations.length,
        ipVariableCount: this.ipVariableReferences.length,
        errors: Array.from(new Set(errors)),
        warnings: Array.from(new Set(warnings))
      }
    }
  }

  // Pretty print payloads for debugging
  static formatPayloadForDebugging(payload: LabCreationPayload | PartCreationPayload, type: 'lab' | 'part'): string {
    const formatted = {
      type,
      timestamp: new Date().toISOString(),
      payload: JSON.parse(JSON.stringify(payload, null, 2))
    }

    return JSON.stringify(formatted, null, 2)
  }

  // Clear debug session
  reset() {
    this.steps = []
    this.deviceConfigurations = []
    this.ipVariableReferences = []
  }
}

export default LabCreationDebugger