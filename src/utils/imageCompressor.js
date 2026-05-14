const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BLOCKED_TYPES = ['image/gif', 'image/svg+xml']

export const validateImageFile = (file) => {
  if (BLOCKED_TYPES.includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG ou WEBP.')
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG ou WEBP.')
  }
}

export const compressImage = (file, maxWidthPx = 1200) =>
  new Promise((resolve, reject) => {
    validateImageFile(file)
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ratio = Math.min(1, maxWidthPx / img.width)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

      const tryQuality = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Falha ao comprimir imagem'))
            if (blob.size > MAX_SIZE_BYTES && quality > 0.3) {
              tryQuality(quality - 0.1)
            } else if (blob.size > MAX_SIZE_BYTES) {
              reject(new Error('Imagem muito grande. Tente uma imagem menor.'))
            } else {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            }
          },
          'image/jpeg',
          quality
        )
      }
      tryQuality(0.85)
    }
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = url
  })
