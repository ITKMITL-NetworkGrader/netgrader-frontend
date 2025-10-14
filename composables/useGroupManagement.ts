import type { StudentGroup, StudentEnrollment, APIResponse } from '~/types/lab'

export const useGroupManagement = (courseId: string) => {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.backend1url}/v0/api`

  const groups = ref<StudentGroup[]>([])
  const enrollments = ref<StudentEnrollment[]>([])
  const isLoading = ref(false)
  const isUploading = ref(false)

  const loadGroups = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<StudentGroup[]>>(`${baseURL}/courses/${courseId}/groups`)
      if (response.success && response.data) {
        groups.value = response.data
      }
    } catch (error) {
      console.error('Failed to load groups:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const loadEnrollments = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await $fetch<APIResponse<StudentEnrollment[]>>(`${baseURL}/courses/${courseId}/enrollments`)
      if (response.success && response.data) {
        enrollments.value = response.data
      }
    } catch (error) {
      console.error('Failed to load enrollments:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const uploadStudentCSV = async (file: File, hasGroups: boolean = false): Promise<{ success: boolean; message: string; data?: any }> => {
    isUploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('hasGroups', hasGroups.toString())

      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/students/upload`, {
        method: 'POST',
        body: formData
      })

      if (response.success) {
        // Reload groups and enrollments after successful upload
        await Promise.all([loadGroups(), loadEnrollments()])
        return {
          success: true,
          message: 'Students uploaded successfully',
          data: response.data
        }
      } else {
        return {
          success: false,
          message: response.error?.message || 'Upload failed'
        }
      }
    } catch (error) {
      console.error('CSV upload failed:', error)
      return {
        success: false,
        message: 'Upload failed due to network error'
      }
    } finally {
      isUploading.value = false
    }
  }

  const assignStudentToGroup = async (studentId: string, groupNumber: number): Promise<boolean> => {
    try {
      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/students/${studentId}/group`, {
        method: 'PUT',
        body: { groupNumber }
      })

      if (response.success) {
        await loadGroups() // Refresh groups
        return true
      }
      return false
    } catch (error) {
      console.error('Group assignment failed:', error)
      return false
    }
  }

  const removeStudentFromGroup = async (studentId: string): Promise<boolean> => {
    try {
      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/students/${studentId}/group`, {
        method: 'DELETE'
      })

      if (response.success) {
        await loadGroups() // Refresh groups
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to remove student from group:', error)
      return false
    }
  }

  const createGroup = async (groupNumber: number): Promise<boolean> => {
    try {
      const response = await $fetch<APIResponse<StudentGroup>>(`${baseURL}/courses/${courseId}/groups`, {
        method: 'POST',
        body: { groupNumber }
      })

      if (response.success) {
        await loadGroups() // Refresh groups
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to create group:', error)
      return false
    }
  }

  const deleteGroup = async (groupId: string): Promise<boolean> => {
    try {
      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/groups/${groupId}`, {
        method: 'DELETE'
      })

      if (response.success) {
        await loadGroups() // Refresh groups
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to delete group:', error)
      return false
    }
  }

  const getStudentGroup = (studentId: string): StudentGroup | null => {
    return groups.value.find(group => group.students.includes(studentId)) || null
  }

  const getGroupByNumber = (groupNumber: number): StudentGroup | null => {
    return groups.value.find(group => group.groupNumber === groupNumber) || null
  }

  const getAvailableGroupNumbers = (): number[] => {
    const usedNumbers = groups.value.map(group => group.groupNumber)
    const available: number[] = []

    for (let i = 1; i <= 32; i++) {
      if (!usedNumbers.includes(i)) {
        available.push(i)
      }
    }

    return available
  }

  const validateCSVFormat = (csvContent: string, hasGroups: boolean): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    const lines = csvContent.trim().split('\n')

    if (lines.length === 0) {
      errors.push('CSV file is empty')
      return { isValid: false, errors }
    }

    // Check header
    const header = lines[0].toLowerCase()
    const expectedColumns = hasGroups ? ['student_id', 'group_number'] : ['student_id']

    expectedColumns.forEach(col => {
      if (!header.includes(col)) {
        errors.push(`Missing required column: ${col}`)
      }
    })

    // Validate data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',')
      
      if (row.length < expectedColumns.length) {
        errors.push(`Row ${i + 1}: Insufficient columns`)
        continue
      }

      const studentId = row[0].trim()
      if (!studentId) {
        errors.push(`Row ${i + 1}: Student ID is required`)
      }

      if (hasGroups) {
        const groupNumber = parseInt(row[1].trim())
        if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > 32) {
          errors.push(`Row ${i + 1}: Group number must be between 1 and 32`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const balanceGroups = async (): Promise<boolean> => {
    try {
      const response = await $fetch<APIResponse<any>>(`${baseURL}/courses/${courseId}/groups/balance`, {
        method: 'POST'
      })

      if (response.success) {
        await loadGroups() // Refresh groups
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to balance groups:', error)
      return false
    }
  }

  const exportGroups = async (): Promise<boolean> => {
    try {
      const response = await $fetch<Blob>(`${baseURL}/courses/${courseId}/groups/export`, {
        method: 'GET'
      })

      // Create download link
      const url = window.URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      link.download = `course-${courseId}-groups.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return true
    } catch (error) {
      console.error('Failed to export groups:', error)
      return false
    }
  }

  const generateGroupStats = () => {
    const stats = {
      totalGroups: groups.value.length,
      totalStudents: groups.value.reduce((sum, group) => sum + group.students.length, 0),
      averageGroupSize: 0,
      largestGroup: 0,
      smallestGroup: Infinity,
      emptyGroups: 0
    }

    if (stats.totalGroups > 0) {
      stats.averageGroupSize = Math.round(stats.totalStudents / stats.totalGroups * 100) / 100

      groups.value.forEach(group => {
        const size = group.students.length
        if (size === 0) {
          stats.emptyGroups++
        }
        if (size > stats.largestGroup) {
          stats.largestGroup = size
        }
        if (size < stats.smallestGroup) {
          stats.smallestGroup = size
        }
      })

      if (stats.smallestGroup === Infinity) {
        stats.smallestGroup = 0
      }
    }

    return stats
  }

  // Load data on mount
  onMounted(() => {
    Promise.all([loadGroups(), loadEnrollments()])
  })

  return {
    // State
    groups: readonly(groups),
    enrollments: readonly(enrollments),
    isLoading: readonly(isLoading),
    isUploading: readonly(isUploading),

    // Actions
    loadGroups,
    loadEnrollments,
    uploadStudentCSV,
    assignStudentToGroup,
    removeStudentFromGroup,
    createGroup,
    deleteGroup,
    balanceGroups,
    exportGroups,

    // Utilities
    getStudentGroup,
    getGroupByNumber,
    getAvailableGroupNumbers,
    validateCSVFormat,
    generateGroupStats
  }
}