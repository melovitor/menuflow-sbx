import { supabase } from './supabase'

export const fetchCustomerByPhone = async (businessId, phone) => {
  const { data } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .maybeSingle()
  return data // null if not found — no error thrown
}

export const createCustomer = async (businessId, name, phone) => {
  const { data, error } = await supabase
    .from('customers')
    .insert({ business_id: businessId, name: name.trim(), phone })
    .select('id, name, phone')
    .single()

  if (error) {
    // Unique constraint: phone already exists (race condition) → use existing record
    if (error.code === '23505') {
      const existing = await fetchCustomerByPhone(businessId, phone)
      if (existing) return existing
    }
    throw error
  }
  return data
}
