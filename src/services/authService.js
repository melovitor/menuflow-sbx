import { supabase } from './supabase'

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/owner/home` },
  })
  if (error) throw error
  return data
}

export const signUp = async (email, password, name) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export const fetchUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('name, phone, avatar_url')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const updateUserProfile = async (userId, { name, phone }) => {
  const { error } = await supabase
    .from('users')
    .update({ name, phone })
    .eq('id', userId)
  if (error) throw error
  const { error: authErr } = await supabase.auth.updateUser({ data: { name } })
  if (authErr) throw authErr
}

export const updateUserAvatar = async (userId, avatarUrl) => {
  const { error } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
  if (error) throw error
  const { error: authErr } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
  if (authErr) throw authErr
}

export const updateEmail = async (newEmail) => {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
}

export const updatePassword = async (currentPassword, newPassword) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('Usuário não autenticado')
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) throw new Error('Senha atual incorreta')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
