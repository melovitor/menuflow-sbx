import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import {
  fetchMyBusinesses,
  fetchBusinessMetrics,
  updateBusinessOpenStatus,
} from '../services/businessService'
import { useAuthStore } from '../stores/authStore'

export const useMyBusinesses = () => {
  const { user } = useAuthStore()
  const [businesses, setBusinesses] = useState([])
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshMetrics = useCallback(async (businessId) => {
    try {
      const m = await fetchBusinessMetrics(businessId)
      setMetrics((prev) => ({ ...prev, [businessId]: m }))
    } catch {
      // metrics refresh failures are silent — data stays stale
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setError(null)

    fetchMyBusinesses(user.id)
      .then(async (data) => {
        setBusinesses(data)
        await Promise.all(data.map((b) => refreshMetrics(b.id)))
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [user?.id, refreshMetrics])

  // Realtime: re-fetch metrics when orders or tables change
  useEffect(() => {
    if (!businesses.length) return

    const channels = businesses.map((b) =>
      supabase
        .channel(`home-metrics-${b.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${b.id}` },
          () => refreshMetrics(b.id)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tables', filter: `business_id=eq.${b.id}` },
          () => refreshMetrics(b.id)
        )
        .subscribe()
    )

    return () => { channels.forEach((c) => supabase.removeChannel(c)) }
  }, [businesses, refreshMetrics])

  const toggleIsOpen = useCallback(async (businessId, currentIsOpen) => {
    // Optimistic update
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, is_open: !currentIsOpen } : b))
    )
    try {
      await updateBusinessOpenStatus(businessId, !currentIsOpen)
    } catch (err) {
      // Revert on failure
      setBusinesses((prev) =>
        prev.map((b) => (b.id === businessId ? { ...b, is_open: currentIsOpen } : b))
      )
      throw err
    }
  }, [])

  return { businesses, metrics, loading, error, toggleIsOpen }
}
