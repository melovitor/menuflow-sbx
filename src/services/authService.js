import { supabase } from './supabase'

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signUp = async (email, password, name, privacyMeta = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        privacy_accepted_at: privacyMeta.privacy_accepted_at || new Date().toISOString(),
        privacy_version: privacyMeta.privacy_version || '1.0',
      },
    },
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
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${window.location.origin}/owner/profile` }
  )
  if (error) {
    if (error.status === 429) {
      const e = new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      e.isRateLimit = true
      throw e
    }
    throw error
  }
}

export const anonymizeAccount = async (userId) => {
  const { error } = await supabase
    .from('users')
    .update({
      name: 'Usuário Removido',
      phone: null,
      avatar_url: null,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (error) throw error

  await supabase
    .from('businesses')
    .update({ is_open: false })
    .eq('owner_id', userId)

  await supabase.auth.signOut()
}

export const exportUserData = async (userId, userEmail) => {
  const [profileRes, businessesRes] = await Promise.all([
    supabase.from('users').select('name, phone, created_at').eq('id', userId).single(),
    supabase
      .from('businesses')
      .select('name, slug, category, address_city, address_state, created_at')
      .eq('owner_id', userId),
  ])

  const businesses = businessesRes.data || []
  const businessIds = businesses.map((b) => b.id).filter(Boolean)

  let orders = []
  if (businessIds.length > 0) {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('orders')
      .select('order_number, source, status, created_at, order_items(item_name, quantity, unit_price)')
      .in('business_id', businessIds)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
    orders = data || []
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      name: profileRes.data?.name,
      email: userEmail,
      phone: profileRes.data?.phone,
      memberSince: profileRes.data?.created_at,
    },
    businesses: businesses.map((b) => ({
      name: b.name,
      slug: b.slug,
      category: b.category,
      city: b.address_city,
      state: b.address_state,
      createdAt: b.created_at,
    })),
    orders_last_90_days: orders.map((o) => ({
      orderNumber: o.order_number,
      source: o.source,
      status: o.status,
      createdAt: o.created_at,
      items: (o.order_items || []).map((i) => ({
        name: i.item_name,
        qty: i.quantity,
        unitPrice: i.unit_price,
      })),
    })),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  a.href = url
  a.download = `menuflow-meus-dados-${dd}${mm}${yyyy}.json`
  a.click()
  URL.revokeObjectURL(url)
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
