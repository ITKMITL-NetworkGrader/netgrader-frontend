import type { Exam, ExamFormData, ExamConfiguration, SubnetGenerationConfig, APIResponse } from '~/types/lab'

export const useExamManagement = (courseId: string) => {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.backend1url}/v0/api`

  const exams = ref<Exam[]>([])
  const currentExam = ref<Exam | null>(null)
  const isLoading = ref(false)
  const isGenerating = ref(false)

  const createExam = async (examData: ExamFormData): Promise<APIResponse<Exam>> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Exam>>(`${baseURL}/courses/${courseId}/exams`, {
        method: 'POST',
        body: examData
      })
      
      if (response.success) {
        await loadExams() // Refresh exams list
      }
      
      return response
    } catch (error) {
      console.error('Failed to create exam:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const updateExam = async (examId: string, examData: ExamFormData): Promise<APIResponse<Exam>> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Exam>>(`${baseURL}/courses/${courseId}/exams/${examId}`, {
        method: 'PUT',
        body: examData
      })
      
      if (response.success) {
        await loadExams() // Refresh exams list
        if (currentExam.value?.id === examId) {
          currentExam.value = response.data || null
        }
      }
      
      return response
    } catch (error) {
      console.error('Failed to update exam:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const loadExam = async (examId: string): Promise<Exam | null> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Exam>>(`${baseURL}/courses/${courseId}/exams/${examId}`)
      
      if (response.success && response.data) {
        currentExam.value = response.data
        return response.data
      }
      
      return null
    } catch (error) {
      console.error('Failed to load exam:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const loadExams = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<Exam[]>>(`${baseURL}/courses/${courseId}/exams`)
      
      if (response.success && response.data) {
        exams.value = response.data
      }
    } catch (error) {
      console.error('Failed to load exams:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const deleteExam = async (examId: string): Promise<boolean> => {
    try {
      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/exams/${examId}`, {
        method: 'DELETE'
      })
      
      if (response.success) {
        await loadExams() // Refresh exams list
        if (currentExam.value?.id === examId) {
          currentExam.value = null
        }
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to delete exam:', error)
      return false
    }
  }

  const generateStudentConfigurations = async (examId: string): Promise<{ success: boolean; message: string; configurations?: ExamConfiguration[] }> => {
    isGenerating.value = true
    try {
      const response = await $fetch<APIResponse<ExamConfiguration[]>>(`${baseURL}/courses/${courseId}/exams/${examId}/generate-configs`, {
        method: 'POST'
      })
      
      if (response.success && response.data) {
        // Reload exam to get updated configurations
        await loadExam(examId)
        
        return {
          success: true,
          message: 'Student configurations generated successfully',
          configurations: response.data
        }
      } else {
        return {
          success: false,
          message: response.error?.message || 'Failed to generate configurations'
        }
      }
    } catch (error) {
      console.error('Configuration generation failed:', error)
      return {
        success: false,
        message: 'Configuration generation failed due to network error'
      }
    } finally {
      isGenerating.value = false
    }
  }

  const previewConfiguration = (studentId: string, examNumber: number): ExamConfiguration => {
    const { generateExamConfig } = useVariableResolver()
    return generateExamConfig(studentId, examNumber)
  }

  const validateExamData = (examData: ExamFormData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!examData.title.trim()) {
      errors.push('Exam title is required')
    }

    if (!examData.description.trim()) {
      errors.push('Exam description is required')
    }

    if (examData.parts.length === 0) {
      errors.push('Exam must have at least one part')
    }

    examData.parts.forEach((part, index) => {
      if (!part.title.trim()) {
        errors.push(`Part ${index + 1} must have a title`)
      }
      if (!part.content.trim()) {
        errors.push(`Part ${index + 1} must have content`)
      }
      if (!part.playId) {
        errors.push(`Part ${index + 1} must have a Play selected`)
      }
    })

    if (examData.timeLimit && examData.timeLimit <= 0) {
      errors.push('Time limit must be greater than 0')
    }

    // Validate subnet generation config
    const config = examData.subnetGenerationConfig
    if (!config.baseNetwork) {
      errors.push('Base network is required for subnet generation')
    }

    if (config.algorithm === 'custom' && !config.customAlgorithm) {
      errors.push('Custom algorithm code is required when using custom algorithm')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const getDefaultSubnetConfig = (): SubnetGenerationConfig => {
    return {
      algorithm: 'default',
      baseNetwork: '10.30.6.0/24',
      variableRanges: {
        examNumber: { min: 1, max: 100 },
        vlanRange: { min: 100, max: 4000 }
      }
    }
  }

  const testSubnetGeneration = (config: SubnetGenerationConfig, sampleStudentId: string, examNumber: number): ExamConfiguration => {
    if (config.algorithm === 'default') {
      return previewConfiguration(sampleStudentId, examNumber)
    } else {
      // SECURITY FIX: new Function() removed — equivalent to eval() and enables RCE.
      // Custom algorithms must be executed server-side in a sandboxed environment.
      console.warn('Custom algorithm execution is not supported on the client. Using default algorithm.')
      return previewConfiguration(sampleStudentId, examNumber)
    }
  }

  const getExamStatistics = (examId: string) => {
    const exam = exams.value.find(e => e.id === examId)
    if (!exam) return null

    const totalStudents = exam.studentConfigurations.size
    const totalParts = exam.parts.length
    const totalPossiblePoints = exam.parts.reduce((sum, part) => {
      // This would need to be calculated based on the Play's total points
      return sum + 100 // Placeholder
    }, 0)

    return {
      totalStudents,
      totalParts,
      totalPossiblePoints,
      timeLimit: exam.timeLimit,
      hasConfigurations: totalStudents > 0
    }
  }

  const exportExamConfigurations = async (examId: string): Promise<{ success: boolean; data?: Blob; message?: string }> => {
    try {
      const response = await $fetch(`${baseURL}/courses/${courseId}/exams/${examId}/export-configs`, {
        method: 'GET',
        responseType: 'blob'
      })

      return {
        success: true,
        data: response as Blob
      }
    } catch (error) {
      console.error('Failed to export configurations:', error)
      return {
        success: false,
        message: 'Failed to export configurations'
      }
    }
  }

  // Load exams on mount
  onMounted(() => {
    loadExams()
  })

  return {
    // State
    exams: readonly(exams),
    currentExam: readonly(currentExam),
    isLoading: readonly(isLoading),
    isGenerating: readonly(isGenerating),

    // Actions
    createExam,
    updateExam,
    loadExam,
    loadExams,
    deleteExam,
    generateStudentConfigurations,

    // Utilities
    previewConfiguration,
    validateExamData,
    getDefaultSubnetConfig,
    testSubnetGeneration,
    getExamStatistics,
    exportExamConfigurations
  }
}