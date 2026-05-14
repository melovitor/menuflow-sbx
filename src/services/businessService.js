import { supabase } from './supabase'
import { generateAccessCode } from '../utils/formatters'

export const fetchMyBusinesses = async (ownerId) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, category, logo_url, is_open, timezone, address_city, address_state')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const fetchBusinessById = async (businessId) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()
  if (error) throw error
  return data
}

export const fetchBusinessMetrics = async (businessId) => {
  const today = new Date().toLocaleDateString('sv') // "2026-05-08"

  const [ordersRes, tablesRes, revenueOrdersRes, counterRes, bizRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('status', ['pending', 'preparing', 'ready']),
    supabase
      .from('tables')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .neq('status', 'free'),
    supabase
      .from('orders')
      .select('id, discount_percent, service_charge_accepted')
      .eq('business_id', businessId)
      // 'closed' = table/staff fechados pelo checkout; 'delivered' = balcão finalizado pelo KDS
      .in('status', ['closed', 'delivered'])
      .gte('created_at', today),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('source', 'counter')
      .in('status', ['pending', 'preparing', 'ready']),
    supabase
      .from('businesses')
      .select('service_charge_percent')
      .eq('id', businessId)
      .single(),
  ])

  const serviceChargePct = bizRes.data?.service_charge_percent || 0
  let revenue = 0
  if (revenueOrdersRes.data?.length) {
    const ids = revenueOrdersRes.data.map((o) => o.id)
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, unit_price, quantity')
      .in('order_id', ids)

    const itemsByOrder = {}
    for (const item of (items || [])) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
      itemsByOrder[item.order_id].push(item)
    }
    for (const order of revenueOrdersRes.data) {
      const sub = (itemsByOrder[order.id] || []).reduce((s, i) => s + i.unit_price * i.quantity, 0)
      const afterDiscount = sub - sub * (order.discount_percent || 0) / 100
      const serviceCharge = order.service_charge_accepted ? afterDiscount * serviceChargePct / 100 : 0
      revenue += afterDiscount + serviceCharge
    }
  }

  return {
    activeOrders: ordersRes.count || 0,
    occupiedTables: tablesRes.count || 0,
    revenue,
    counterQueue: counterRes.count || 0,
  }
}

export const updateBusinessOpenStatus = async (businessId, isOpen) => {
  const { error } = await supabase
    .from('businesses')
    .update({ is_open: isOpen, updated_at: new Date().toISOString() })
    .eq('id', businessId)
  if (error) throw error
}

export const checkSlugExists = async (slug, excludeId = null) => {
  let query = supabase.from('businesses').select('id').eq('slug', slug)
  if (excludeId) query = query.neq('id', excludeId)
  const { data } = await query.maybeSingle()
  return Boolean(data)
}

export const createBusiness = async (payload) => {
  // Retry up to 5 times if staff_access_code collides (unique constraint)
  for (let attempt = 0; attempt < 5; attempt++) {
    const tryPayload = attempt === 0
      ? payload
      : { ...payload, staff_access_code: generateAccessCode() }

    const { data, error } = await supabase
      .from('businesses')
      .insert(tryPayload)
      .select()
      .single()

    if (!error) return data

    if (error.code === '23505' && error.message?.includes('staff_access_code')) continue

    throw error
  }
  throw new Error('Não foi possível gerar um código de acesso único. Tente novamente.')
}

export const regenerateStaffCode = async (businessId) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateAccessCode()
    const { data, error } = await supabase
      .from('businesses')
      .update({ staff_access_code: code, updated_at: new Date().toISOString() })
      .eq('id', businessId)
      .select('staff_access_code')
      .single()
    if (!error) return data.staff_access_code
    if (error.code === '23505') continue
    throw error
  }
  throw new Error('Não foi possível gerar código único. Tente novamente.')
}

export const fetchTables = async (businessId) => {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', businessId)
    .order('number', { ascending: true })
  if (error) throw error
  return data || []
}

export const createTable = async (businessId, number, qrCodeUrl, capacity = null) => {
  const payload = { business_id: businessId, number, qr_code_url: qrCodeUrl }
  if (capacity) payload.capacity = capacity
  const { data, error } = await supabase
    .from('tables')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export const fetchBusinessBySlug = async (slug) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, logo_url, is_open, opens_at, closes_at, timezone, open_days')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export const fetchTableByNumber = async (businessId, number) => {
  const { data, error } = await supabase
    .from('tables')
    .select('id, number')
    .eq('business_id', businessId)
    .eq('number', number)
    .single()
  if (error) throw error
  return data
}

export const fetchBusinessByStaffCode = async (code) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('staff_access_code', code)
    .single()
  if (error) throw error
  return data
}

export const updateBusiness = async (businessId, payload) => {
  const { data, error } = await supabase
    .from('businesses')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', businessId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTableStatus = async (tableId, status) => {
  const { error } = await supabase
    .from('tables')
    .update({ status })
    .eq('id', tableId)
  if (error) throw error
}

export const updateTableCapacity = async (tableId, capacity) => {
  const { error } = await supabase
    .from('tables')
    .update({ capacity: capacity || null })
    .eq('id', tableId)
  if (error) throw error
}

export const deleteTable = async (tableId) => {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', tableId)
  if (error) throw error
}

export const fetchPendingWaiterCalls = async (businessId) => {
  const { data, error } = await supabase
    .from('waiter_calls')
    .select('id, table_id, created_at, tables(number)')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const answerWaiterCall = async (callId) => {
  const { error } = await supabase
    .from('waiter_calls')
    .update({ status: 'answered' })
    .eq('id', callId)
  if (error) throw error
}

export const fetchBusinessSettings = async (businessId) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('name, service_charge_percent, max_discount_percent')
    .eq('id', businessId)
    .single()
  if (error) throw error
  return data
}

export const fetchTableNumber = async (tableId) => {
  const { data, error } = await supabase
    .from('tables')
    .select('number')
    .eq('id', tableId)
    .single()
  if (error) throw error
  return data?.number ?? null
}
