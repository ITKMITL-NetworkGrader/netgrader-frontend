import type { 
  NetworkConfig,
  DeviceConfig,
  IPSchemaConfig,
  StudentCSVRow,
  IPGenerationResult
} from '@/types/ipSchema'
import type { IpSchema, DeviceIpMapping } from '@/types/lab'

export const useIPSchema = () => {
  const { validateCIDR, suggestGateway } = useNetworkValidation()
  const { generateIPAssignments, previewIPAssignments } = useIPGeneration()
  
  // Reactive state for IP schema configuration
  const networkConfig = ref<NetworkConfig>({
    baseNetwork: '192.168.1.0',
    subnetMask: 24,
    gateway: '192.168.1.1',
    description: ''
  })
  
  const deviceConfigs = ref<DeviceConfig[]>([])
  const students = ref<StudentCSVRow[]>([])
  const allocationStrategy = ref<'group_based' | 'student_id_based'>('group_based')
  
  // Computed properties
  const isNetworkValid = computed(() => {
    const cidr = `${networkConfig.value.baseNetwork}/${networkConfig.value.subnetMask}`
    const validation = validateCIDR(cidr)
    return validation.isValid
  })
  
  const networkInfo = computed(() => {
    if (!isNetworkValid.value) return null
    const cidr = `${networkConfig.value.baseNetwork}/${networkConfig.value.subnetMask}`
    const validation = validateCIDR(cidr)
    return validation.network_info || null
  })
  
  const hasDeviceConfigs = computed(() => deviceConfigs.value.length > 0)
  const hasStudents = computed(() => students.value.length > 0)
  
  const canGenerateIPs = computed(() => 
    isNetworkValid.value && hasDeviceConfigs.value && hasStudents.value
  )
  
  const previewAssignments = computed(() => {
    if (!canGenerateIPs.value) return null
    
    try {
      return previewIPAssignments(
        students.value,
        networkConfig.value,
        deviceConfigs.value,
        allocationStrategy.value,
        3 // Show preview for 3 students
      )
    } catch {
      return null
    }
  })
  
  // Actions
  const updateNetworkConfig = (updates: Partial<NetworkConfig>) => {
    networkConfig.value = { ...networkConfig.value, ...updates }
    
    // Auto-suggest gateway if not set
    if (!networkConfig.value.gateway && isNetworkValid.value && networkInfo.value) {
      networkConfig.value.gateway = suggestGateway(
        networkConfig.value.baseNetwork,
        networkConfig.value.subnetMask
      )
    }
  }
  
  const addDeviceConfig = (device: Omit<DeviceConfig, 'ipVariable'>) => {
    const ipVariable = `${device.deviceId.toLowerCase()}_ip`
    deviceConfigs.value.push({
      ...device,
      ipVariable
    })
  }
  
  const updateDeviceConfig = (index: number, updates: Partial<DeviceConfig>) => {
    if (index >= 0 && index < deviceConfigs.value.length) {
      deviceConfigs.value[index] = { ...deviceConfigs.value[index], ...updates }
    }
  }
  
  const removeDeviceConfig = (index: number) => {
    if (index >= 0 && index < deviceConfigs.value.length) {
      deviceConfigs.value.splice(index, 1)
    }
  }
  
  const updateStudents = (newStudents: StudentCSVRow[]) => {
    students.value = [...newStudents]
    
    // Update allocation strategy based on whether students have groups
    const hasGroups = newStudents.some(s => s.groupNumber !== undefined)
    if (!hasGroups && allocationStrategy.value === 'group_based') {
      allocationStrategy.value = 'student_id_based'
    }
  }
  
  const setAllocationStrategy = (strategy: 'group_based' | 'student_id_based') => {
    allocationStrategy.value = strategy
  }
  
  const generateFullIPAssignments = (): IPGenerationResult | null => {
    if (!canGenerateIPs.value) return null
    
    return generateIPAssignments(
      students.value,
      networkConfig.value,
      deviceConfigs.value,
      allocationStrategy.value
    )
  }
  
  const createIpSchema = (): IpSchema => {
    return {
      scope: allocationStrategy.value === 'group_based' ? 'lab' : 'exam',
      baseNetwork: networkConfig.value.baseNetwork,
      subnetMask: networkConfig.value.subnetMask,
      gateway: networkConfig.value.gateway,
      allocationStrategy: allocationStrategy.value === 'group_based' ? 'group_based' : 'student_id_based',
      variablesMapping: deviceConfigs.value.map(device => ({
        name: device.ipVariable,
        hostOffset: device.hostOffset,
        example: generateExampleIP(device)
      }))
    }
  }
  
  const createDeviceIpMapping = (): DeviceIpMapping[] => {
    return deviceConfigs.value.map(device => ({
      deviceId: device.deviceId,
      ipVariable: device.ipVariable
    }))
  }

  const createDevicesData = (): any[] => {
    return deviceConfigs.value.map(device => {
      const baseDevice: any = {
        id: device.deviceId,
        ip_address: generateExampleIP(device),
        ansible_connection: "ssh"
      }

      // ALL devices require credentials (both isolated and regular)
      if (device.ansibleUsername && device.ansiblePassword) {
        baseDevice.credentials = {
          ansible_user: device.ansibleUsername,
          ansible_password: device.ansiblePassword
        }
      }

      // Isolated devices get additional Ansible connection fields
      if (device.isIsolated) {
        // Only include non-null values to avoid Elysia rejection
        // Set default values for now - these may need to be configurable later
        baseDevice.use_persistent_connection = false
        
        // Add other fields only when they have actual values
        // platform, jump_host, ssh_args, role, proxy_host, proxy_credentials
        // will be added later when we determine their values
      }

      return baseDevice
    })
  }
  
  const generateExampleIP = (device: DeviceConfig): string => {
    try {
      if (allocationStrategy.value === 'group_based') {
        // Example with group 1
        const parts = networkConfig.value.baseNetwork.split('.')
        parts[2] = String(parseInt(parts[2]) + 1)
        parts[3] = String(device.hostOffset)
        return parts.join('.')
      } else {
        // Example with sample student ID
        const parts = networkConfig.value.baseNetwork.split('.')
        parts[2] = String(parseInt(parts[2]) + 1)
        parts[3] = String(10 + device.hostOffset)
        return parts.join('.')
      }
    } catch {
      return `${networkConfig.value.baseNetwork.split('.').slice(0, 3).join('.')}.${device.hostOffset}`
    }
  }
  
  const resetConfiguration = () => {
    networkConfig.value = {
      baseNetwork: '192.168.1.0',
      subnetMask: 24,
      gateway: '192.168.1.1',
      description: ''
    }
    deviceConfigs.value = []
    students.value = []
    allocationStrategy.value = 'group_based'
  }
  
  const loadFromIpSchema = (schema: IpSchema, deviceMappings: DeviceIpMapping[]) => {
    // Update network config
    networkConfig.value = {
      baseNetwork: schema.baseNetwork,
      subnetMask: schema.subnetMask,
      gateway: schema.gateway,
      description: ''
    }
    
    // Update allocation strategy
    allocationStrategy.value = schema.allocationStrategy === 'group_based' ? 'group_based' : 'student_id_based'
    
    // Update device configs
    deviceConfigs.value = deviceMappings.map(mapping => {
      const variableMapping = schema.variablesMapping.find(v => v.name === mapping.ipVariable)
      return {
        deviceId: mapping.deviceId,
        deviceName: mapping.deviceId.charAt(0).toUpperCase() + mapping.deviceId.slice(1),
        ipVariable: mapping.ipVariable,
        hostOffset: variableMapping?.hostOffset || 1,
        description: ''
      }
    })
  }
  
  const validateConfiguration = (): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Validate network configuration
    const cidr = `${networkConfig.value.baseNetwork}/${networkConfig.value.subnetMask}`
    const networkValidation = validateCIDR(cidr)
    if (!networkValidation.isValid) {
      errors.push(...networkValidation.errors)
    }
    if (networkValidation.warnings) {
      warnings.push(...networkValidation.warnings)
    }
    
    // Validate device configurations
    if (deviceConfigs.value.length === 0) {
      errors.push('At least one device configuration is required')
    }
    
    // Check for duplicate device IDs and IP variables
    const deviceIds = new Set<string>()
    const ipVariables = new Set<string>()
    const hostOffsets = new Set<number>()
    
    deviceConfigs.value.forEach((device, index) => {
      if (deviceIds.has(device.deviceId)) {
        errors.push(`Duplicate device ID: ${device.deviceId}`)
      }
      deviceIds.add(device.deviceId)
      
      if (ipVariables.has(device.ipVariable)) {
        errors.push(`Duplicate IP variable: ${device.ipVariable}`)
      }
      ipVariables.add(device.ipVariable)
      
      if (hostOffsets.has(device.hostOffset)) {
        warnings.push(`Duplicate host offset ${device.hostOffset} for devices`)
      }
      hostOffsets.add(device.hostOffset)
      
      if (device.hostOffset < 1 || device.hostOffset > 254) {
        errors.push(`Invalid host offset for ${device.deviceId}: must be between 1 and 254`)
      }

      // Validate device credentials (required for ALL devices)
      if (!device.ansibleUsername?.trim()) {
        errors.push(`Ansible username is required for device: ${device.deviceId}`)
      }
      if (!device.ansiblePassword?.trim()) {
        errors.push(`Ansible password is required for device: ${device.deviceId}`)
      }
    })
    
    // Validate student data
    if (students.value.length === 0) {
      errors.push('Student data is required')
    }
    
    // Strategy-specific validations
    if (allocationStrategy.value === 'group_based') {
      const studentsWithoutGroups = students.value.filter(s => s.groupNumber === undefined)
      if (studentsWithoutGroups.length > 0) {
        errors.push('Group-based allocation requires all students to have group assignments')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  const getCommonDeviceTemplates = () => [
    { deviceId: 'pc1', deviceName: 'PC 1', hostOffset: 10, description: 'Student workstation' },
    { deviceId: 'router1', deviceName: 'Router 1', hostOffset: 1, description: 'Main network router' },
    { deviceId: 'switch1', deviceName: 'Switch 1', hostOffset: 2, description: 'Network switch' }
  ]
  
  return {
    // State
    networkConfig: readonly(networkConfig),
    deviceConfigs: readonly(deviceConfigs),
    students: readonly(students),
    allocationStrategy: readonly(allocationStrategy),
    
    // Computed
    isNetworkValid,
    networkInfo,
    hasDeviceConfigs,
    hasStudents,
    canGenerateIPs,
    previewAssignments,
    
    // Actions
    updateNetworkConfig,
    addDeviceConfig,
    updateDeviceConfig,
    removeDeviceConfig,
    updateStudents,
    setAllocationStrategy,
    generateFullIPAssignments,
    createIpSchema,
    createDeviceIpMapping,
    createDevicesData,
    resetConfiguration,
    loadFromIpSchema,
    validateConfiguration,
    getCommonDeviceTemplates
  }
}