import { ref, computed, watch } from 'vue'
import StudentIpGenerator from '~/utils/studentIpGenerator'
import LabCreationDebugger from '~/utils/labCreationDebugger'
import type { IpVariableReference, GeneratedIpVariable } from '~/utils/studentIpGenerator'
import type { LabCreationPayload, PartCreationPayload, DeviceConfiguration } from '~/utils/labCreationDebugger'

interface WizardStep {
  number: number
  name: string
  isValid: boolean
  data: any
}

interface TaskTemplate {
  _id: string
  templateId: string
  name: string
  description: string
  parameterSchema: Array<{
    name: string
    type: string
    description?: string
    required: boolean
  }>
  defaultTestCases: Array<{
    comparison_type: string
    expected_result: any
  }>
}

export const useLabCreationWizard = () => {
  // Wizard state
  const currentStep = ref(1)
  const totalSteps = ref(6)
  const isDebugMode = ref(process.env.NODE_ENV === 'development')

  // Lab creation data
  const labData = ref({
    courseId: '',
    name: '',
    description: '',
    instructions: {
      html: '',
      json: { type: 'doc', content: [] }
    },
    dueDate: null as Date | null,
    availableFrom: null as Date | null,
    availableUntil: null as Date | null
  })

  // Network configuration
  const networkConfig = ref({
    baseNetwork: '192.168.1.0',
    subnetMask: 24
  })

  // Device configurations
  const devices = ref<DeviceConfiguration[]>([])

  // Student ID for IP generation
  const studentId = ref<string | number>('')

  // Parts and tasks
  const parts = ref<any[]>([])

  // Available task templates
  const taskTemplates = ref<TaskTemplate[]>([])

  // Debug and IP generation
  const debugger = ref<LabCreationDebugger>()
  const ipGenerator = ref<StudentIpGenerator>()
  const availableIpVariables = ref<IpVariableReference[]>([])

  // Initialize debugger and IP generator
  function initializeGenerators() {
    if (studentId.value && networkConfig.value.baseNetwork && networkConfig.value.subnetMask) {
      ipGenerator.value = new StudentIpGenerator({
        student_id: studentId.value,
        baseNetwork: networkConfig.value.baseNetwork,
        subnetMask: networkConfig.value.subnetMask
      })

      debugger.value = new LabCreationDebugger(
        studentId.value,
        networkConfig.value.baseNetwork,
        networkConfig.value.subnetMask
      )

      updateAvailableIpVariables()
    }
  }

  // Update available IP variables when devices change
  function updateAvailableIpVariables() {
    if (!ipGenerator.value || !debugger.value) return

    // Update debugger device configurations
    devices.value.forEach(device => {
      debugger.value!.addDeviceConfiguration(device)
    })

    // Get updated IP variable references
    availableIpVariables.value = debugger.value.ipVariableReferences
  }

  // Add a new device
  function addDevice(deviceId: string, templateId: string, deviceType: 'router' | 'switch' | 'pc') {
    if (!ipGenerator.value || !debugger.value) {
      console.warn('IP generator not initialized')
      return
    }

    // Generate student IP variables for this device
    const studentIpVariables = debugger.value.generateStudentIpVariables(deviceId, deviceType)

    const newDevice: DeviceConfiguration = {
      deviceId,
      templateId,
      deviceType,
      ipVariables: studentIpVariables
    }

    devices.value.push(newDevice)
    updateAvailableIpVariables()

    // Record debug step
    debugger.value.recordStep(3, 'Add Device', {
      deviceId,
      templateId,
      deviceType,
      generatedVariables: studentIpVariables.length
    })
  }

  // Update device IP variables
  function updateDeviceIpVariables(deviceId: string, ipVariables: GeneratedIpVariable[]) {
    const deviceIndex = devices.value.findIndex(d => d.deviceId === deviceId)
    if (deviceIndex >= 0) {
      devices.value[deviceIndex].ipVariables = ipVariables
      updateAvailableIpVariables()

      // Record debug step
      debugger.value?.recordStep(3, 'Update Device IP Variables', {
        deviceId,
        variableCount: ipVariables.length,
        variables: ipVariables.map(v => ({ name: v.name, type: v.type, value: v.value }))
      })
    }
  }

  // Add IP variable to device (custom or student-generated)
  function addIpVariableToDevice(
    deviceId: string,
    variableName: string,
    type: 'host_offset' | 'full_ip' | 'student_generated',
    value: string | number
  ) {
    const deviceIndex = devices.value.findIndex(d => d.deviceId === deviceId)
    if (deviceIndex < 0) return

    const newVariable: GeneratedIpVariable = {
      name: variableName,
      type,
      value,
      readonly: type === 'student_generated',
      deviceId
    }

    devices.value[deviceIndex].ipVariables.push(newVariable)
    updateAvailableIpVariables()

    // Record debug step
    debugger.value?.recordStep(3, 'Add IP Variable', {
      deviceId,
      variableName,
      type,
      value
    })
  }

  // Validate task parameter with IP support
  function validateTaskParameter(
    taskId: string,
    templateId: string,
    parameterName: string,
    parameterSchema: any,
    value: string
  ) {
    if (!debugger.value) return { isValid: true }

    const isIpParameter = parameterSchema.type === 'ip_address'
    return debugger.value.validateTaskParameter(
      taskId,
      templateId,
      parameterName,
      parameterSchema.type,
      value,
      isIpParameter
    )
  }

  // Generate lab creation payload
  function generateLabPayload(): LabCreationPayload {
    if (!debugger.value) {
      throw new Error('Debugger not initialized')
    }

    const payload = debugger.value.generateLabPayload({
      ...labData.value,
      network: {
        topology: networkConfig.value,
        devices: devices.value.map(device => ({
          deviceId: device.deviceId,
          templateId: device.templateId,
          ipVariables: device.ipVariables.map(variable => {
            if (variable.type === 'student_generated') {
              return {
                name: variable.name,
                studentGenerated: {
                  ipAddress: variable.value as string,
                  readonly: true
                }
              }
            } else if (variable.type === 'full_ip') {
              return {
                name: variable.name,
                fullIp: variable.value as string
              }
            } else {
              // For other types (studentVlanX, studentManagement), store the type info
              return {
                name: variable.name,
                vlanIndex: variable.vlanIndex,
                interfaceOffset: variable.interfaceOffset
              }
            }
          })
        }))
      }
    })

    return payload
  }

  // Generate part creation payload
  function generatePartPayload(partData: any): PartCreationPayload {
    if (!debugger.value) {
      throw new Error('Debugger not initialized')
    }

    return debugger.value.generatePartPayload(partData, partData.tasks || [])
  }

  // Export debug information
  function exportDebugInfo() {
    if (!debugger.value) return null

    const debugSession = debugger.value.exportDebugSession()

    // Add current state snapshot
    const fullDebugInfo = {
      ...debugSession,
      currentState: {
        currentStep: currentStep.value,
        labData: labData.value,
        networkConfig: networkConfig.value,
        devices: devices.value,
        parts: parts.value,
        availableIpVariables: availableIpVariables.value
      },
      generatedPayloads: {
        lab: generateLabPayload(),
        parts: parts.value.map(part => generatePartPayload(part))
      }
    }

    return fullDebugInfo
  }

  // Pretty print debug payloads
  function getFormattedLabPayload(): string {
    try {
      const payload = generateLabPayload()
      return LabCreationDebugger.formatPayloadForDebugging(payload, 'lab')
    } catch (error) {
      return `Error generating lab payload: ${error}`
    }
  }

  function getFormattedPartPayload(partIndex: number): string {
    try {
      if (partIndex >= 0 && partIndex < parts.value.length) {
        const payload = generatePartPayload(parts.value[partIndex])
        return LabCreationDebugger.formatPayloadForDebugging(payload, 'part')
      }
      return 'Part not found'
    } catch (error) {
      return `Error generating part payload: ${error}`
    }
  }

  // Download debug information as JSON file
  function downloadDebugInfo() {
    const debugInfo = exportDebugInfo()
    if (!debugInfo) return

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-creation-debug-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Computed properties
  const canProceedToNextStep = computed(() => {
    switch (currentStep.value) {
      case 1:
        return labData.value.name && labData.value.instructions
      case 2:
        return networkConfig.value.baseNetwork && networkConfig.value.subnetMask
      case 3:
        return devices.value.length > 0
      case 4:
        return parts.value.length > 0 && parts.value.every(part => part.tasks?.length > 0)
      default:
        return true
    }
  })

  const debugSummary = computed(() => {
    if (!debugger.value) return null

    return {
      steps: debugger.value.steps?.length || 0,
      devices: devices.value.length,
      ipVariables: availableIpVariables.value.length,
      parts: parts.value.length,
      totalTasks: parts.value.reduce((sum, part) => sum + (part.tasks?.length || 0), 0)
    }
  })

  // Watch for changes that require re-initialization
  watch([studentId, () => networkConfig.value.baseNetwork, () => networkConfig.value.subnetMask], () => {
    initializeGenerators()
  }, { immediate: true })

  // Watch devices changes to update IP variables
  watch(devices, () => {
    updateAvailableIpVariables()
  }, { deep: true })

  return {
    // State
    currentStep,
    totalSteps,
    isDebugMode,
    labData,
    networkConfig,
    devices,
    studentId,
    parts,
    taskTemplates,
    availableIpVariables,
    debugSummary,
    canProceedToNextStep,

    // Methods
    initializeGenerators,
    addDevice,
    updateDeviceIpVariables,
    addIpVariableToDevice,
    validateTaskParameter,
    generateLabPayload,
    generatePartPayload,
    exportDebugInfo,
    getFormattedLabPayload,
    getFormattedPartPayload,
    downloadDebugInfo
  }
}
