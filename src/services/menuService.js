import { supabase } from './supabase'

export const fetchCategories = async (businessId) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data || []
}

export const createCategory = async (businessId, name, currentCount = 0) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ business_id: businessId, name: name.trim(), order_index: currentCount })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateCategory = async (categoryId, payload) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .update(payload)
    .eq('id', categoryId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const reorderCategories = async (orderedIds) => {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('menu_categories').update({ order_index: index }).eq('id', id)
    )
  )
}

export const fetchMenuItemById = async (itemId) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .single()
  if (error) throw error
  return data
}

export const fetchMenuItems = async (categoryId) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const createMenuItem = async (payload) => {
  const { data, error } = await supabase
    .from('menu_items')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateMenuItem = async (itemId, payload) => {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const fetchAllActiveItems = async (businessId) => {
  const { data: cats, error: catErr } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('business_id', businessId)
    .eq('is_active', true)
  if (catErr) throw catErr
  if (!cats?.length) return []

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, description, photo_url, price, promo_price, prep_time_minutes, tags, category_id')
    .in('category_id', cats.map((c) => c.id))
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}
