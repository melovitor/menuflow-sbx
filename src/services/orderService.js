import { supabase } from './supabase'

export const fetchActiveOrders = async (businessId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, source, status, customer_name, created_at, tables(number)')
    .eq('business_id', businessId)
    .in('status', ['pending', 'preparing', 'ready'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const createFullOrder = async ({ businessId, staffId, tableId, items }) => {
  const { data: orderNumber, error: rpcErr } = await supabase.rpc('generate_order_number', {
    p_business_id: businessId,
  })
  if (rpcErr) throw rpcErr

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      business_id: businessId,
      order_number: orderNumber,
      table_id: tableId || null,
      staff_id: staffId || null,
      source: 'staff',
      status: 'pending',
    })
    .select()
    .single()
  if (orderErr) throw orderErr

  const { error: itemsErr } = await supabase.from('order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      item_id: item.itemId,
      item_name: item.itemName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      notes: item.notes || null,
    }))
  )
  if (itemsErr) throw itemsErr

  return order
}

export const updateOrderStatus = async (orderId, status) => {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw error
}

export const fetchKdsOrders = async (businessId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, source, status, customer_name, created_at, updated_at,
      tables(number),
      order_items(id, item_name, quantity, notes)
    `)
    .eq('business_id', businessId)
    .in('status', ['pending', 'preparing', 'ready'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const createCounterOrder = async ({ businessId, customerId, customerName, items }) => {
  const { data: orderNumber, error: rpcErr } = await supabase.rpc('generate_order_number', {
    p_business_id: businessId,
  })
  if (rpcErr) throw rpcErr

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      business_id: businessId,
      order_number: orderNumber,
      customer_id: customerId || null,
      customer_name: customerName,
      source: 'counter',
      status: 'pending',
    })
    .select()
    .single()
  if (orderErr) throw orderErr

  const { error: itemsErr } = await supabase.from('order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      item_id: item.itemId,
      item_name: item.itemName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      notes: item.notes || null,
    }))
  )
  if (itemsErr) throw itemsErr

  return order
}

export const cancelOrder = async (orderId) => {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw error
}

export const fetchTableOrders = async (tableId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, created_at, order_items(id, item_name, unit_price, quantity, notes)')
    .eq('table_id', tableId)
    .in('status', ['pending', 'preparing', 'ready', 'delivered'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const fetchBusinessOrders = async (businessId, { status, source, period } = {}) => {
  let query = supabase
    .from('orders')
    .select(`
      id, order_number, source, status, customer_name,
      notes, discount_percent, service_charge_accepted,
      created_at, updated_at,
      tables(number),
      order_items(id, item_name, unit_price, quantity, notes),
      customers(name, phone),
      payments(id, method, amount, split_count)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (source && source !== 'all') {
    if (source === 'table') {
      query = query.not('table_id', 'is', null)
    } else {
      query = query.eq('source', source)
    }
  }

  if (period) {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === 'today') {
      query = query.gte('created_at', startOfToday.toISOString())
    } else if (period === 'yesterday') {
      const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
      query = query
        .gte('created_at', startOfYesterday.toISOString())
        .lt('created_at', startOfToday.toISOString())
    } else if (period === 'last7') {
      const start = new Date(startOfToday.getTime() - 6 * 86400000)
      query = query.gte('created_at', start.toISOString())
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const fetchRevenueByPeriod = async (businessId, { from, to }) => {
  const [ordersRes, bizRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, source, discount_percent, service_charge_accepted, order_items(unit_price, quantity)')
      .eq('business_id', businessId)
      // 'closed' = table/staff fechados pelo checkout; 'delivered' = balcão finalizado pelo KDS
      .in('status', ['closed', 'delivered'])
      .gte('created_at', from)
      .lte('created_at', to),
    supabase
      .from('businesses')
      .select('service_charge_percent')
      .eq('id', businessId)
      .single(),
  ])
  if (ordersRes.error) throw ordersRes.error
  const orders = ordersRes.data || []
  const serviceChargePct = bizRes.data?.service_charge_percent || 0
  let total = 0
  for (const order of orders) {
    const sub = (order.order_items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0)
    const afterDiscount = sub - sub * (order.discount_percent || 0) / 100
    const serviceCharge = order.service_charge_accepted ? afterDiscount * serviceChargePct / 100 : 0
    total += afterDiscount + serviceCharge
  }
  return { total, count: orders.length, avg: orders.length > 0 ? total / orders.length : 0 }
}

export const fetchTableOrdersForCheckout = async (tableId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, created_at, order_items(id, item_name, unit_price, quantity, notes)')
    .eq('table_id', tableId)
    .in('status', ['pending', 'preparing', 'ready', 'delivered', 'cancelled'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const closeTableBill = async ({
  nonCancelledOrderIds,
  discountPercent,
  serviceChargeAccepted,
  payments,
}) => {
  if (!nonCancelledOrderIds.length) return

  const { error: closeErr } = await supabase
    .from('orders')
    .update({
      status: 'closed',
      discount_percent: discountPercent,
      service_charge_accepted: serviceChargeAccepted,
      updated_at: new Date().toISOString(),
    })
    .in('id', nonCancelledOrderIds)
  if (closeErr) throw closeErr

  const firstOrderId = nonCancelledOrderIds[0]
  const { error: payErr } = await supabase.from('payments').insert(
    payments.map((p) => ({
      order_id: firstOrderId,
      method: p.method,
      amount: parseFloat(p.amount),
      split_count: payments.length,
    }))
  )
  if (payErr) throw payErr
}
