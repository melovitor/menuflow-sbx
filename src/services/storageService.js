import { supabase } from './supabase'

const getPublicUrl = (path) =>
  supabase.storage.from('menuflow-assets').getPublicUrl(path).data.publicUrl

const upload = async (path, file) => {
  const { error } = await supabase.storage
    .from('menuflow-assets')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return getPublicUrl(path)
}

export const uploadMenuItemPhoto = async (businessId, fileKey, file) => {
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  return upload(`menu-items/${businessId}/${fileKey}.${ext}`, file)
}

export const uploadBusinessLogo = async (businessId, file) => {
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  return upload(`businesses/${businessId}/logo.${ext}`, file)
}

export const uploadUserAvatar = async (userId, file) => {
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  return upload(`users/${userId}/avatar.${ext}`, file)
}
