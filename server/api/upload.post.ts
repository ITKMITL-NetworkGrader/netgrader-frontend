import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    const fileData = formData.find(item => item.name === 'file')

    if (!fileData || !fileData.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file data found'
      })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const contentType = fileData.type

    if (!contentType || !allowedTypes.includes(contentType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (fileData.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File size too large. Maximum size: 5MB'
      })
    }

    // Generate unique filename
    const originalName = fileData.filename || 'upload'
    const extension = originalName.split('.').pop() || 'jpg'
    const fileName = `${uuidv4()}.${extension}`

    // For now, return a mock URL
    // In the future, this will upload to MinIO
    const mockUrl = `https://via.placeholder.com/800x600/${Math.floor(Math.random() * 16777215).toString(16)}/000000?text=${encodeURIComponent(originalName)}`

    return {
      success: true,
      data: {
        url: mockUrl,
        filename: fileName,
        originalName,
        size: fileData.data.length,
        type: contentType
      }
    }
  } catch (error) {
    console.error('Upload error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Upload failed'
    })
  }
})