import type { StudentCSVRow, CSVValidationResult, CSVUploadConfig } from '@/types/ipSchema'

export const useCSVProcessor = () => {
  
  const defaultConfig: CSVUploadConfig = {
    hasHeaders: false,
    separator: ',',
    expectedColumns: {
      studentId: 0,
      groupNumber: 1
    }
  }
  
  const parseCSV = (csvContent: string, config: CSVUploadConfig = defaultConfig, allocationStrategy: 'group_based' | 'student_id_based' = 'group_based'): CSVValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    const parsedData: StudentCSVRow[] = []
    
    try {
      const lines = csvContent.trim().split('\n')
      
      if (lines.length === 0) {
        errors.push('CSV file is empty')
        return { isValid: false, errors, warnings }
      }
      
      let startIndex = 0
      
      // Skip header row if present
      if (config.hasHeaders) {
        if (lines.length === 1) {
          errors.push('CSV contains only header row, no student data found')
          return { isValid: false, errors, warnings }
        }
        startIndex = 1
      }
      
      const processedStudentIds = new Set<string>()
      const groupNumbers = new Set<number>()
      
      for (let i = startIndex; i < lines.length; i++) {
        const lineNumber = i + 1
        const line = lines[i].trim()
        
        if (!line) {
          warnings.push(`Empty line at row ${lineNumber}, skipping`)
          continue
        }
        
        const columns = line.split(config.separator)
        
        if (columns.length < 1) {
          errors.push(`Row ${lineNumber}: Insufficient columns (expected at least Student ID)`)
          continue
        }
        
        const studentIdRaw = columns[config.expectedColumns.studentId]?.trim()
        const secondColumnRaw = columns[config.expectedColumns.groupNumber]?.trim()
        
        // Validate Student ID
        if (!studentIdRaw) {
          errors.push(`Row ${lineNumber}: Student ID is required`)
          continue
        }
        
        // Validate Student ID format (should be 8-digit number)
        const studentIdPattern = /^\d{8}$/
        if (!studentIdPattern.test(studentIdRaw)) {
          errors.push(`Row ${lineNumber}: Student ID "${studentIdRaw}" must be exactly 8 digits`)
          continue
        }
        
        // Check for duplicate Student IDs
        if (processedStudentIds.has(studentIdRaw)) {
          errors.push(`Row ${lineNumber}: Duplicate Student ID "${studentIdRaw}"`)
          continue
        }
        
        processedStudentIds.add(studentIdRaw)
        
        // Process second column based on allocation strategy
        let groupNumber: number | undefined
        let fullName: string | undefined
        
        if (allocationStrategy === 'group_based') {
          // Process Group Number
          if (secondColumnRaw) {
            const groupNum = parseInt(secondColumnRaw)
            if (isNaN(groupNum) || groupNum < 1 || groupNum > 99) {
              errors.push(`Row ${lineNumber}: Group number "${secondColumnRaw}" must be a number between 1 and 99`)
              continue
            }
            groupNumber = groupNum
            groupNumbers.add(groupNum)
          }
        } else {
          // Process Name for student_id_based
          fullName = secondColumnRaw || undefined
        }
        
        // Validate Student ID structure (65XXYYYY format)
        const yearPart = studentIdRaw.substring(0, 2)
        const facultyPart = studentIdRaw.substring(2, 4)
        const indexPart = studentIdRaw.substring(4, 8)
        
        // Basic validation of year (Buddhist calendar: Christian year + 543)
        const year = parseInt(yearPart)
        const currentChristianYear = new Date().getFullYear()
        const currentBuddhistYear = currentChristianYear + 543
        const studentBuddhistYear = 2500 + year // Convert 2-digit to full Buddhist year
        
        // Allow reasonable range: current year ± 10 years in Buddhist calendar
        if (studentBuddhistYear < (currentBuddhistYear - 10) || studentBuddhistYear > (currentBuddhistYear + 1)) {
          const christianEquivalent = studentBuddhistYear - 543
          warnings.push(`Row ${lineNumber}: Student ID year "${yearPart}" seems unusual (${studentBuddhistYear} BE / ${christianEquivalent} CE)`)
        }
        
        parsedData.push({
          studentId: studentIdRaw,
          groupNumber,
          fullName
        })
      }
      
      // Final validation
      if (parsedData.length === 0) {
        errors.push('No valid student records found in CSV')
        return { isValid: false, errors, warnings }
      }
      
      // Check group assignment consistency
      const studentsWithGroups = parsedData.filter(s => s.groupNumber !== undefined).length
      const studentsWithoutGroups = parsedData.length - studentsWithGroups
      
      if (studentsWithGroups > 0 && studentsWithoutGroups > 0) {
        warnings.push(`Mixed group assignment: ${studentsWithGroups} students have groups, ${studentsWithoutGroups} do not`)
      }
      
      // Group size validation
      if (groupNumbers.size > 0) {
        const groupSizes = new Map<number, number>()
        parsedData.forEach(student => {
          if (student.groupNumber) {
            groupSizes.set(student.groupNumber, (groupSizes.get(student.groupNumber) || 0) + 1)
          }
        })
        
        const sizes = Array.from(groupSizes.values())
        const minSize = Math.min(...sizes)
        const maxSize = Math.max(...sizes)
        
        if (maxSize - minSize > 1) {
          warnings.push(`Unbalanced groups: sizes range from ${minSize} to ${maxSize} students`)
        }
      }
      
      const stats = {
        totalStudents: parsedData.length,
        studentsWithGroups,
        uniqueGroups: groupNumbers.size,
        groupNumbers: Array.from(groupNumbers).sort((a, b) => a - b)
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        parsedData,
        stats
      }
      
    } catch (error) {
      errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { isValid: false, errors, warnings }
    }
  }
  
  const validateStudentId = (studentId: string): { isValid: boolean; error?: string; info?: any } => {
    if (!/^\d{8}$/.test(studentId)) {
      return { isValid: false, error: 'Student ID must be exactly 8 digits' }
    }
    
    const yearPart = studentId.substring(0, 2)
    const facultyPart = studentId.substring(2, 4)
    const indexPart = studentId.substring(4, 8)
    
    return {
      isValid: true,
      info: {
        year: 2500 + parseInt(yearPart), // Buddhist year
        christianYear: (2500 + parseInt(yearPart)) - 543, // Christian equivalent
        faculty: facultyPart,
        index: indexPart,
        formatted: `${yearPart}-${facultyPart}-${indexPart}`
      }
    }
  }
  
  const generateSampleCSV = (includeGroups: boolean = true, studentCount: number = 10): string => {
    // Convert current Christian year to Buddhist year, then get last 2 digits
    const currentChristianYear = new Date().getFullYear()
    const currentBuddhistYear = currentChristianYear + 543
    const yearPart = (currentBuddhistYear % 100).toString().padStart(2, '0')
    const lines: string[] = []
    
    const groupCount = Math.ceil(studentCount / 3) // ~3 students per group
    
    for (let i = 1; i <= studentCount; i++) {
      const studentIndex = String(i).padStart(4, '0')
      const studentId = `${yearPart}07${studentIndex}`
      
      let line = studentId
      
      if (includeGroups) {
        const groupNumber = Math.ceil(i / 3) // Distribute into groups of 3
        line += `,${groupNumber}`
      }
      
      lines.push(line)
    }
    
    return lines.join('\n')
  }
  
  const exportToCSV = (students: StudentCSVRow[]): string => {
    return students.map(student => {
      let line = student.studentId
      if (student.groupNumber !== undefined) {
        line += `,${student.groupNumber}`
      }
      return line
    }).join('\n')
  }
  
  const balanceGroups = (students: StudentCSVRow[]): StudentCSVRow[] => {
    const studentsWithoutGroups = students.filter(s => s.groupNumber === undefined)
    const studentsWithGroups = students.filter(s => s.groupNumber !== undefined)
    
    if (studentsWithoutGroups.length === 0) {
      return students // Already all have groups
    }
    
    // Determine group size (default to 3-4 students per group)
    const totalStudents = students.length
    const targetGroupSize = 3
    const numberOfGroups = Math.ceil(totalStudents / targetGroupSize)
    
    // Start group numbering after existing groups
    const existingGroups = new Set(studentsWithGroups.map(s => s.groupNumber!))
    const nextGroupNumber = existingGroups.size > 0 ? Math.max(...existingGroups) + 1 : 1
    
    const balanced = [...studentsWithGroups]
    
    // Assign students without groups
    let currentGroup = nextGroupNumber
    let studentsInCurrentGroup = 0
    
    studentsWithoutGroups.forEach(student => {
      if (studentsInCurrentGroup >= targetGroupSize) {
        currentGroup++
        studentsInCurrentGroup = 0
      }
      
      balanced.push({
        ...student,
        groupNumber: currentGroup
      })
      
      studentsInCurrentGroup++
    })
    
    return balanced
  }
  
  return {
    parseCSV,
    validateStudentId,
    generateSampleCSV,
    exportToCSV,
    balanceGroups
  }
}