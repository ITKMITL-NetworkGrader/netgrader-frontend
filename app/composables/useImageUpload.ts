export interface ImageUploadOptions {
  bucket?: string
  maxSize?: number // bytes
  allowedTypes?: string[]
  compress?: boolean
  maxWidth?: number
  quality?: number
}

export interface UploadResult {
  url: string
  filename: string
  originalName: string
  size: number
  type: string
}

const DEFAULT_OPTIONS: ImageUploadOptions = {
  bucket: 'editor-images',
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  compress: true,
  maxWidth: 1200,
  quality: 0.8
}

export function useImageUpload(options: ImageUploadOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const isUploading = ref(false)
  const uploadProgress = ref(0)

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!config.allowedTypes!.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${config.allowedTypes!.join(', ')}`
      }
    }

    if (file.size > config.maxSize!) {
      const maxSizeMB = config.maxSize! / (1024 * 1024)
      return {
        valid: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`
      }
    }

    return { valid: true }
  }

  // Client-side image compression
  const compressImage = async (file: File): Promise<File> => {
    if (!config.compress) return file

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        const maxWidth = config.maxWidth!

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          file.type,
          config.quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Main upload function - ready for MinIO integration
  const uploadFile = async (file: File): Promise<UploadResult> => {
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    isUploading.value = true
    uploadProgress.value = 0

    try {
      // Compress if enabled
      const processedFile = await compressImage(file)

      // Create FormData
      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('bucket', config.bucket!)
      formData.append('originalName', file.name)

      // Upload with progress tracking
      const response = await $fetch<UploadResult>('/api/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progress) => {
          if (progress.total) {
            uploadProgress.value = Math.round((progress.loaded / progress.total) * 100)
          }
        }
      })

      return response
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  // Upload from URL
  const uploadFromUrl = async (url: string, filename?: string): Promise<UploadResult> => {
    isUploading.value = true

    try {
      // Validate URL scheme to prevent SSRF
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only http and https URLs are allowed')
      }
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`)
      }

      const blob = await response.blob()
      const file = new File([blob], filename || 'image.jpg', { type: blob.type })

      return await uploadFile(file)
    } finally {
      isUploading.value = false
    }
  }

  // Drag and drop setup for editor
  const setupDragDrop = (editor: any) => {
    const handleDrop = async (view: any, event: DragEvent) => {
      const files = Array.from(event.dataTransfer?.files || [])
      const imageFiles = files.filter(file => file.type.startsWith('image/'))

      if (imageFiles.length === 0) return false

      event.preventDefault()

      try {
        for (const file of imageFiles) {
          const result = await uploadFile(file)

          // Get cursor position from drop coordinates
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY
          })

          if (pos) {
            const { schema } = view.state
            const node = schema.nodes.image.create({
              src: result.url,
              alt: result.originalName,
              title: result.originalName
            })
            const tr = view.state.tr.insert(pos.pos, node)
            view.dispatch(tr)
          }
        }
      } catch (error) {
        console.error('Failed to upload dropped image:', error)
        throw error
      }

      return true
    }

    return { handleDrop }
  }

  // Clipboard paste setup
  const setupClipboardPaste = (editor: any) => {
    const handlePaste = async (_view: any, event: ClipboardEvent | ClipboardEvent & { clipboardData?: DataTransfer }) => {
      const clipboard = event.clipboardData || (window as any).clipboardData
      const items = clipboard?.items
      if (!items) return false

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()

          const file = item.getAsFile()
          if (file) {
            try {
              const result = await uploadFile(file)
              editor.commands.setImage({
                src: result.url,
                alt: result.originalName,
                title: result.originalName
              })
            } catch (error) {
              console.error('Failed to upload clipboard image:', error)
              throw error
            }
          }
          return true
        }
      }

      return false
    }

    return { handlePaste }
  }

  // Insert image from URL directly
  const insertImageFromUrl = (editor: any, url: string, alt?: string) => {
    editor.commands.setImage({
      src: url,
      alt: alt || 'Image',
      title: alt || 'Image'
    })
  }

  return {
    // State
    isUploading: readonly(isUploading),
    uploadProgress: readonly(uploadProgress),

    // Methods
    uploadFile,
    uploadFromUrl,
    validateFile,
    compressImage,
    insertImageFromUrl,

    // Editor integration
    setupDragDrop,
    setupClipboardPaste,

    // Config
    config: readonly(config)
  }
}
