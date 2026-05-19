import { supabase } from './supabase'

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const fetchSuppliers = async (businessId) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, phone, email, notes, is_active, created_at')
    .eq('business_id', businessId)
    .order('name')
  if (error) throw error
  return data || []
}

export const createSupplier = async (businessId, payload) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ business_id: businessId, ...payload })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateSupplier = async (id, payload) => {
  const { data, error } = await supabase
    .from('suppliers')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const fetchIngredientCountsBySupplier = async (businessId) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('supplier_id')
    .eq('business_id', businessId)
    .not('supplier_id', 'is', null)
  if (error) return {}
  const counts = {}
  for (const row of (data || [])) {
    counts[row.supplier_id] = (counts[row.supplier_id] || 0) + 1
  }
  return counts
}

// ── Ingredients ───────────────────────────────────────────────────────────────

export const fetchIngredients = async (businessId) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select(`
      id, name, unit, unit_cost, current_stock, min_stock,
      is_active, supplier_id, created_at, updated_at,
      suppliers(id, name)
    `)
    .eq('business_id', businessId)
    .order('name')
  if (error) throw error
  return data || []
}

export const fetchAlertIngredientsCount = async (businessId) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, current_stock, min_stock')
    .eq('business_id', businessId)
    .eq('is_active', true)
  if (error) return 0
  return (data || []).filter((r) => r.current_stock <= r.min_stock).length
}

export const createIngredient = async (businessId, payload) => {
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ business_id: businessId, ...payload })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateIngredient = async (id, payload) => {
  const { data, error } = await supabase
    .from('ingredients')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const adjustIngredientStock = async (
  businessId,
  ingredientId,
  { type, quantity, unit_cost, notes, createdBy }
) => {
  const { data: ing, error: fetchErr } = await supabase
    .from('ingredients')
    .select('current_stock')
    .eq('id', ingredientId)
    .single()
  if (fetchErr) throw fetchErr

  let newStock = ing.current_stock
  let delta = quantity

  if (type === 'in') {
    newStock = ing.current_stock + quantity
  } else if (type === 'out' || type === 'waste') {
    newStock = Math.max(0, ing.current_stock - quantity)
    delta = -quantity
  } else if (type === 'adjust') {
    delta = quantity - ing.current_stock
    newStock = quantity
  }

  const { error: updErr } = await supabase
    .from('ingredients')
    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', ingredientId)
  if (updErr) throw updErr

  const { error: movErr } = await supabase.from('stock_movements').insert({
    business_id: businessId,
    ingredient_id: ingredientId,
    type,
    quantity: delta,
    unit_cost: type === 'in' ? (unit_cost ?? null) : null,
    notes: notes || null,
    created_by: createdBy || null,
  })
  if (movErr) throw movErr
}

// ── Recipe Items ──────────────────────────────────────────────────────────────

export const fetchRecipeItems = async (menuItemId) => {
  const { data, error } = await supabase
    .from('recipe_items')
    .select(`
      id, quantity,
      ingredients(id, name, unit, unit_cost)
    `)
    .eq('menu_item_id', menuItemId)
  if (error) throw error
  return data || []
}

export const upsertRecipeItem = async (menuItemId, ingredientId, quantity) => {
  const { data, error } = await supabase
    .from('recipe_items')
    .upsert(
      { menu_item_id: menuItemId, ingredient_id: ingredientId, quantity },
      { onConflict: 'menu_item_id,ingredient_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteRecipeItem = async (id) => {
  const { error } = await supabase.from('recipe_items').delete().eq('id', id)
  if (error) throw error
}

export const fetchRecipeCMV = async (menuItemId) => {
  const items = await fetchRecipeItems(menuItemId)
  const cmv = items.reduce(
    (sum, ri) => sum + ri.quantity * (ri.ingredients?.unit_cost || 0),
    0
  )
  return { items, cmv }
}

// ── Stock Movements ───────────────────────────────────────────────────────────

export const fetchStockMovements = async (
  businessId,
  { ingredientId, type, from, to, limit = 50, offset = 0 } = {}
) => {
  let query = supabase
    .from('stock_movements')
    .select(`
      id, type, quantity, unit_cost, notes, created_at,
      ingredients(id, name, unit),
      orders(order_number),
      purchase_orders(id)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (ingredientId) query = query.eq('ingredient_id', ingredientId)
  if (type && type !== 'all') query = query.eq('type', type)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const fetchPurchaseOrders = async (businessId) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id, status, notes, total_cost, created_at, sent_at, received_at, business_id,
      suppliers(id, name),
      purchase_order_items(
        id, quantity, unit_cost, total_cost,
        ingredients(id, name, unit)
      )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const createPurchaseOrder = async (businessId, { supplierId, notes, items, createdBy }) => {
  const totalCost = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)

  const { data: po, error: poErr } = await supabase
    .from('purchase_orders')
    .insert({
      business_id: businessId,
      supplier_id: supplierId || null,
      notes: notes || null,
      total_cost: totalCost,
      created_by: createdBy || null,
      status: 'draft',
    })
    .select()
    .single()
  if (poErr) throw poErr

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from('purchase_order_items').insert(
      items.map((i) => ({
        purchase_order_id: po.id,
        ingredient_id: i.ingredient_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
      }))
    )
    if (itemsErr) throw itemsErr
  }

  return po
}

export const updatePurchaseOrderStatus = async (id, status) => {
  const updates = { status }
  if (status === 'sent') updates.sent_at = new Date().toISOString()
  if (status === 'received') updates.received_at = new Date().toISOString()
  const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id)
  if (error) throw error
}

export const updatePurchaseOrderItems = async (purchaseOrderId, items) => {
  const { error: delErr } = await supabase
    .from('purchase_order_items')
    .delete()
    .eq('purchase_order_id', purchaseOrderId)
  if (delErr) throw delErr

  if (items.length === 0) return

  const { error: insErr } = await supabase.from('purchase_order_items').insert(
    items.map((i) => ({
      purchase_order_id: purchaseOrderId,
      ingredient_id: i.ingredient_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
    }))
  )
  if (insErr) throw insErr

  const totalCost = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)
  const { error: updErr } = await supabase
    .from('purchase_orders')
    .update({ total_cost: totalCost })
    .eq('id', purchaseOrderId)
  if (updErr) throw updErr
}

export const receivePurchaseOrder = async (po) => {
  await updatePurchaseOrderStatus(po.id, 'received')

  for (const item of po.purchase_order_items || []) {
    const ingredientId = item.ingredients?.id ?? item.ingredient_id
    if (!ingredientId) continue

    const { data: ing } = await supabase
      .from('ingredients')
      .select('current_stock')
      .eq('id', ingredientId)
      .single()
    if (!ing) continue

    const newStock = (ing.current_stock || 0) + item.quantity

    await supabase
      .from('ingredients')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', ingredientId)

    await supabase.from('stock_movements').insert({
      business_id: po.business_id,
      ingredient_id: ingredientId,
      type: 'in',
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      purchase_order_id: po.id,
      notes: 'Recebimento de ordem de compra',
    })
  }
}

export const generateAutoOrder = async (businessId) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, unit, unit_cost, current_stock, min_stock, supplier_id')
    .eq('business_id', businessId)
    .eq('is_active', true)
  if (error) throw error
  return (data || [])
    .filter((r) => r.current_stock <= r.min_stock)
    .map((ing) => ({
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.unit,
      quantity: ing.min_stock * 2,
      unit_cost: ing.unit_cost,
      supplier_id: ing.supplier_id,
    }))
}

// ── CMV ───────────────────────────────────────────────────────────────────────

export const fetchCMVData = async (businessId, { from, to }) => {
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('business_id', businessId)

  const categoryIds = (categories || []).map((c) => c.id)
  if (categoryIds.length === 0) {
    return { items: [], totalRevenue: 0, totalCMV: 0, cmvPercent: 0 }
  }

  const [ordersRes, itemsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('order_items(item_id, item_name, quantity, unit_price)')
      .eq('business_id', businessId)
      .in('status', ['closed', 'delivered'])
      .gte('created_at', from)
      .lte('created_at', to),
    supabase
      .from('menu_items')
      .select('id, name, price, recipe_items(quantity, ingredients(unit_cost))')
      .in('category_id', categoryIds),
  ])

  if (ordersRes.error) throw ordersRes.error
  if (itemsRes.error) throw itemsRes.error

  const itemMap = {}
  for (const item of itemsRes.data || []) {
    const cmvUnit = (item.recipe_items || []).reduce(
      (s, ri) => s + ri.quantity * (ri.ingredients?.unit_cost || 0),
      0
    )
    itemMap[item.id] = {
      name: item.name,
      price: item.price,
      cmvUnit,
      hasRecipe: (item.recipe_items || []).length > 0,
      sales: 0,
      revenue: 0,
      totalCMV: 0,
    }
  }

  for (const order of ordersRes.data || []) {
    for (const oi of order.order_items || []) {
      if (oi.item_id && itemMap[oi.item_id]) {
        itemMap[oi.item_id].sales += oi.quantity
        itemMap[oi.item_id].revenue += oi.unit_price * oi.quantity
        itemMap[oi.item_id].totalCMV += itemMap[oi.item_id].cmvUnit * oi.quantity
      }
    }
  }

  const items = Object.values(itemMap)
    .filter((i) => i.sales > 0)
    .sort((a, b) => {
      const ma = a.price > 0 ? (a.price - a.cmvUnit) / a.price : 1
      const mb = b.price > 0 ? (b.price - b.cmvUnit) / b.price : 1
      return ma - mb
    })

  const totalRevenue = items.reduce((s, i) => s + i.revenue, 0)
  const totalCMV = items.reduce((s, i) => s + i.totalCMV, 0)

  return {
    items,
    totalRevenue,
    totalCMV,
    cmvPercent: totalRevenue > 0 ? (totalCMV / totalRevenue) * 100 : 0,
  }
}
