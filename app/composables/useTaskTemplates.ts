import type { TaskTemplate, APIResponse } from '@/types/lab'

export const useTaskTemplates = () => {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.backendurl}/v0/api`

  const templates = ref<TaskTemplate[]>([])
  const isLoading = ref(false)
  const selectedTemplate = ref<TaskTemplate | null>(null)

  const loadTemplates = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<TaskTemplate[]>>(`${baseURL}/task-templates`)
      if (response.success && response.data) {
        templates.value = response.data
      }
    } catch (error) {
      console.error('Failed to load task templates:', error)
      // Fallback to built-in templates if API fails
      templates.value = getBuiltInTemplates()
    } finally {
      isLoading.value = false
    }
  }

  const getTemplateById = (templateId: string): TaskTemplate | null => {
    return templates.value.find(t => t.id === templateId) || null
  }

  const getTemplatesByCategory = (category: TaskTemplate['category']): TaskTemplate[] => {
    return templates.value.filter(t => t.category === category)
  }

  const searchTemplates = (query: string): TaskTemplate[] => {
    if (!query.trim()) return templates.value

    const lowercaseQuery = query.toLowerCase()
    return templates.value.filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery)
    )
  }

  const selectTemplate = (template: TaskTemplate) => {
    selectedTemplate.value = template
  }

  const clearSelection = () => {
    selectedTemplate.value = null
  }

  // Built-in templates as fallback
  const getBuiltInTemplates = (): TaskTemplate[] => [
    {
      id: 'ping_test',
      name: 'Ping Test',
      description: 'Test network connectivity using ICMP ping',
      category: 'connectivity',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will execute the ping command',
          required: true
        },
        {
          name: 'target_ip',
          type: 'device_variable',
          description: 'Target IP address to ping',
          required: true
        },
        {
          name: 'count',
          type: 'number',
          description: 'Number of ping packets to send',
          required: false,
          default_value: 4
        },
        {
          name: 'timeout',
          type: 'number',
          description: 'Timeout in seconds',
          required: false,
          default_value: 5
        }
      ],
      default_test_cases: [
        {
          description: 'Ping should succeed',
          comparison_type: 'success',
          expected_result: true
        }
      ]
    },
    {
      id: 'traceroute_test',
      name: 'Traceroute',
      description: 'Trace network path to destination',
      category: 'connectivity',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will execute the traceroute command',
          required: true
        },
        {
          name: 'target_ip',
          type: 'device_variable',
          description: 'Target IP address for traceroute',
          required: true
        },
        {
          name: 'max_hops',
          type: 'number',
          description: 'Maximum number of hops',
          required: false,
          default_value: 30
        }
      ],
      default_test_cases: [
        {
          description: 'Traceroute should complete successfully',
          comparison_type: 'success',
          expected_result: true
        }
      ]
    },
    {
      id: 'ssh_connectivity',
      name: 'SSH Connectivity',
      description: 'Test SSH connection to remote host',
      category: 'connectivity',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will initiate the SSH connection',
          required: true
        },
        {
          name: 'target_ip',
          type: 'device_variable',
          description: 'Target IP address for SSH connection',
          required: true
        },
        {
          name: 'username',
          type: 'string',
          description: 'SSH username',
          required: false,
          default_value: 'admin'
        },
        {
          name: 'port',
          type: 'number',
          description: 'SSH port number',
          required: false,
          default_value: 22
        }
      ],
      default_test_cases: [
        {
          description: 'SSH connection should succeed',
          comparison_type: 'ssh_success',
          expected_result: true
        }
      ]
    },
    {
      id: 'telnet_connectivity',
      name: 'Telnet Connectivity',
      description: 'Test Telnet connection to remote host',
      category: 'connectivity',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will initiate the Telnet connection',
          required: true
        },
        {
          name: 'target_ip',
          type: 'device_variable',
          description: 'Target IP address for Telnet connection',
          required: true
        },
        {
          name: 'port',
          type: 'number',
          description: 'Telnet port number',
          required: false,
          default_value: 23
        }
      ],
      default_test_cases: [
        {
          description: 'Telnet connection should succeed',
          comparison_type: 'success',
          expected_result: true
        }
      ]
    },
    {
      id: 'http_check',
      name: 'HTTP Service Check',
      description: 'Test HTTP service availability and content',
      category: 'service',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will make the HTTP request',
          required: true
        },
        {
          name: 'url',
          type: 'url',
          description: 'URL to check (use http://{{device_ip}}/ format)',
          required: true
        },
        {
          name: 'expected_status',
          type: 'number',
          description: 'Expected HTTP status code',
          required: false,
          default_value: 200
        }
      ],
      default_test_cases: [
        {
          description: 'HTTP request should succeed',
          comparison_type: 'contains',
          expected_result: '200 OK'
        }
      ]
    },
    {
      id: 'port_scan',
      name: 'Port Scan',
      description: 'Scan specific ports on target host',
      category: 'security',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will perform the port scan',
          required: true
        },
        {
          name: 'target_ip',
          type: 'device_variable',
          description: 'Target IP address to scan',
          required: true
        },
        {
          name: 'ports',
          type: 'string',
          description: 'Comma-separated list of ports (e.g., 22,80,443)',
          required: true
        }
      ],
      default_test_cases: [
        {
          description: 'Port scan should complete',
          comparison_type: 'success',
          expected_result: true
        }
      ]
    },
    {
      id: 'dns_lookup',
      name: 'DNS Lookup',
      description: 'Perform DNS resolution test',
      category: 'connectivity',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will perform the DNS lookup',
          required: true
        },
        {
          name: 'hostname',
          type: 'string',
          description: 'Hostname to resolve',
          required: true
        },
        {
          name: 'dns_server',
          type: 'device_variable',
          description: 'DNS server IP address (optional)',
          required: false
        }
      ],
      default_test_cases: [
        {
          description: 'DNS lookup should succeed',
          comparison_type: 'success',
          expected_result: true
        }
      ]
    },
    {
      id: 'config_backup',
      name: 'Configuration Backup',
      description: 'Backup device configuration',
      category: 'configuration',
      parameters: [
        {
          name: 'source_device',
          type: 'device_variable',
          description: 'Device that will initiate the backup',
          required: true
        },
        {
          name: 'target_ip',
          type: 'device_variable',
          description: 'Target device IP address to backup',
          required: true
        },
        {
          name: 'backup_method',
          type: 'string',
          description: 'Backup method (tftp, scp, etc.)',
          required: false,
          default_value: 'scp'
        }
      ],
      default_test_cases: [
        {
          description: 'Configuration backup should succeed',
          comparison_type: 'success',
          expected_result: true
        }
      ]
    }
  ]

  const getParametersByTemplate = (templateId: string): TaskTemplate['parameters'] => {
    const template = getTemplateById(templateId)
    return template?.parameters || []
  }

  const getDefaultTestCases = (templateId: string): TaskTemplate['default_test_cases'] => {
    const template = getTemplateById(templateId)
    return template?.default_test_cases || []
  }

  const validateParameters = (templateId: string, parameters: Record<string, any>): { isValid: boolean; errors: string[] } => {
    const template = getTemplateById(templateId)
    if (!template) {
      return { isValid: false, errors: ['Template not found'] }
    }

    const errors: string[] = []

    template.parameters.forEach(param => {
      const value = parameters[param.name]

      if (param.required && (value === undefined || value === null || value === '')) {
        errors.push(`Parameter '${param.name}' is required`)
        return
      }

      if (value !== undefined && value !== null && value !== '') {
        switch (param.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Parameter '${param.name}' must be a number`)
            }
            break
          case 'ip_address':
            if (!isValidIPAddress(value)) {
              errors.push(`Parameter '${param.name}' must be a valid IP address`)
            }
            break
          case 'url':
            if (!isValidURL(value)) {
              errors.push(`Parameter '${param.name}' must be a valid URL`)
            }
            break
          case 'device_variable':
            if (!isValidDeviceVariable(value)) {
              errors.push(`Parameter '${param.name}' must be a valid device variable (e.g., {{pc1_ip}})`)
            }
            break
        }

        if (param.validation_pattern) {
          const regex = new RegExp(param.validation_pattern)
          if (!regex.test(value)) {
            errors.push(`Parameter '${param.name}' does not match required pattern`)
          }
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Utility functions
  const isValidIPAddress = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipv4Regex.test(ip)
  }

  const isValidURL = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return url.includes('{{') && url.includes('}}') // Allow template variables
    }
  }

  const isValidDeviceVariable = (variable: string): boolean => {
    return variable.includes('{{') && variable.includes('}}') || isValidIPAddress(variable)
  }

  // Load templates on mount
  onMounted(() => {
    loadTemplates()
  })

  return {
    // State
    templates: readonly(templates),
    isLoading: readonly(isLoading),
    selectedTemplate: readonly(selectedTemplate),

    // Actions
    loadTemplates,
    getTemplateById,
    getTemplatesByCategory,
    searchTemplates,
    selectTemplate,
    clearSelection,
    getParametersByTemplate,
    getDefaultTestCases,
    validateParameters,

    // Utils
    isValidIPAddress,
    isValidURL,
    isValidDeviceVariable
  }
}