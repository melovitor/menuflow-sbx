import { useState, useEffect, useCallback, useRef } from 'react'
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
  const businessesRef = useRef([])

  useEffect(() => { businessesRef.current = businesses }, [businesses])

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

  // Realtime: update is_open/schedule_enabled when cron job changes the DB
  const businessIdsKey = businesses.map((b) => b.id).sort().join(',')
  useEffect(() => {
    if (!businessIdsKey) return
    const ids = businessIdsKey.split(',')

    const channels = ids.map((id) =>
      supabase
        .channel(`home-biz-open-${id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'businesses', filter: `id=eq.${id}` },
          (payload) => {
            setBusinesses((prev) =>
              prev.map((biz) =>
                biz.id === payload.new.id
                  ? { ...biz, is_open: payload.new.is_open, schedule_enabled: payload.new.schedule_enabled }
                  : biz
              )
            )
          }
        )
        .subscribe()
    )

    return () => { channels.forEach((c) => supabase.removeChannel(c)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessIdsKey])

  const toggleIsOpen = useCallback(async (businessId, currentIsOpen) => {
    const biz = businessesRef.current.find((b) => b.id === businessId)
    const clearSchedule = biz?.schedule_enabled === true

    // Optimistic update
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === businessId
          ? { ...b, is_open: !currentIsOpen, ...(clearSchedule ? { schedule_enabled: false } : {}) }
          : b
      )
    )
    try {
      await updateBusinessOpenStatus(businessId, !currentIsOpen, clearSchedule)
    } catch (err) {
      // Revert on failure
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? { ...b, is_open: currentIsOpen, ...(clearSchedule ? { schedule_enabled: true } : {}) }
            : b
        )
      )
      throw err
    }
  }, [])

  return { businesses, metrics, loading, error, toggleIsOpen }
}
