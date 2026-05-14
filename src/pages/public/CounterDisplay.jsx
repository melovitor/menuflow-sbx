import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { IconMoon, IconSun } from '@tabler/icons-react'
import LgpdFooter from '../../components/layout/LgpdFooter'
import { supabase } from '../../services/supabase'
import { toggleTheme } from '../../utils/theme'
import Spinner from '../../components/ui/Spinner'

export default function CounterDisplay() {
  const { businessSlug } = useParams()
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const [business, setBusiness] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, name, logo_url')
          .eq('slug', businessSlug)
          .single()

        if (!biz) { setLoading(false); return }
        setBusiness(biz)

        const { data } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, status')
          .eq('business_id', biz.id)
          .eq('source', 'counter')
          .in('status', ['pending', 'preparing', 'ready'])
          .order('created_at', { ascending: true })

        setOrders(data || [])
        setLoading(false)

        const ch = supabase
          .channel(`counter-display-${biz.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders', filter: `business_id=eq.${biz.id}` },
            (payload) => {
              const o = payload.new
              if (o.source === 'counter' && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')) {
                setOrders((prev) => [...prev, o])
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `business_id=eq.${biz.id}` },
            (payload) => {
              const o = payload.new
              if (o.source !== 'counter') return
              if (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready') {
                setOrders((prev) => {
                  const exists = prev.find((x) => x.id === o.id)
                  if (exists) return prev.map((x) => (x.id === o.id ? { ...x, status: o.status } : x))
                  return [...prev, o]
                })
              } else {
                setOrders((prev) => prev.filter((x) => x.id !== o.id))
              }
            }
          )
          .subscribe()

        return () => supabase.removeChannel(ch)
      } catch {
        setLoading(false)
      }
    }

    const cleanup = init()
    return () => { cleanup.then?.((fn) => fn?.()) }
  }, [businessSlug])

  const preparingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing')
  const readyOrders = orders.filter((o) => o.status === 'ready')

  const getInitials = (name = '') => {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '?'
    if (words.length === 1) return words[0][0]?.toUpperCase() ?? '?'
    return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
  }

  // Theme-aware colors
  const bg =           isDark ? '#0A0A0C' : '#F8F8F8'
  const headerBg =     isDark ? '#111113' : '#FFFFFF'
  const headerBorder = isDark ? '#2A2A2E' : '#E2E2E2'
  const colDivider =   isDark ? '#2A2A2E' : '#E2E2E2'
  const textPrimary =  isDark ? '#FAFAFA' : '#111111'
  const textSecondary= isDark ? '#A1A1AA' : '#555555'
  const textMuted =    isDark ? '#555558' : '#999999'
  const btnBg =        isDark ? '#18181B' : '#F1F1F1'
  const btnBorder =    isDark ? '#3F3F46' : '#C8C8C8'

  const preparingCard = isDark
    ? { bg: '#18181B', border: '#2A2A2E', label: '#555558', num: '#FAFAFA', name: '#A1A1AA' }
    : { bg: '#FFFFFF',  border: '#E2E2E2', label: '#999999', num: '#111111', name: '#555555' }

  const readyCard = isDark
    ? { bg: '#021510', border: '#0D3320', label: '#6EE7B7', num: '#FAFAFA', name: '#A7F3D0' }
    : { bg: '#ECFDF5', border: '#A7F3D0', label: '#065F46', num: '#111111', name: '#065F46' }

  const preparingDot = '#F59E0B'
  const readyDot = '#10B981'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <p style={{ color: textMuted, fontSize: 14 }}>Estabelecimento não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: bg, color: textPrimary }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-5 flex-shrink-0"
        style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}` }}
      >
        <div className="flex items-center gap-4">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-medium"
              style={{ background: '#7C3AED' }}
            >
              {getInitials(business.name)}
            </div>
          )}
          <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.4px', color: textPrimary }}>
            {business.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, color: textMuted }}>Painel do Balcão</span>
          <button
            type="button"
            data-testid="btn-toggle-theme"
            onClick={handleToggleTheme}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
            style={{ border: `1px solid ${btnBorder}`, background: btnBg, color: textMuted }}
          >
            {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
        </div>
      </header>

      {/* Main grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-2">

        {/* Em Preparo */}
        <div className="h-full flex flex-col">
          <div
            className="flex-shrink-0 px-8 py-4 flex items-center gap-3"
            style={{ borderBottom: `1px solid ${colDivider}` }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: preparingDot }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: textSecondary, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Em Preparo
            </span>
            {preparingOrders.length > 0 && (
              <span
                className="px-2 py-[2px] rounded-full text-[11px] font-medium"
                style={{ background: isDark ? '#1A1200' : '#FFFBEB', border: `1px solid ${isDark ? '#3D2E00' : '#FDE68A'}`, color: isDark ? '#FDE68A' : '#92400E' }}
              >
                {preparingOrders.length}
              </span>
            )}
          </div>

          <div className="flex-1 px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            {preparingOrders.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p style={{ color: textMuted, fontSize: 14 }}>Nenhum pedido em preparo</p>
              </div>
            )}
            {preparingOrders.map((order) => (
              <div
                key={order.id}
                data-testid={`preparing-${order.id}`}
                className="rounded-[16px] p-5"
                style={{ background: preparingCard.bg, border: `1px solid ${preparingCard.border}` }}
              >
                <p style={{ fontSize: 11, color: preparingCard.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                  Pedido
                </p>
                <p style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.6px', color: preparingCard.num, lineHeight: 1.1 }}>
                  #{order.order_number}
                </p>
                <p style={{ fontSize: 18, color: preparingCard.name, marginTop: 6 }}>
                  {order.customer_name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pronto para Retirar */}
        <div className="h-full flex flex-col" style={{ borderLeft: `1px solid ${colDivider}` }}>
          <div
            className="flex-shrink-0 px-8 py-4 flex items-center gap-3"
            style={{ borderBottom: `1px solid ${colDivider}` }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: readyDot,
                animation: readyOrders.length > 0 ? 'blink 1.2s ease-in-out infinite' : 'none',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, color: textSecondary, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Pronto para Retirar
            </span>
            {readyOrders.length > 0 && (
              <span
                className="px-2 py-[2px] rounded-full text-[11px] font-medium"
                style={{ background: isDark ? '#021510' : '#ECFDF5', border: `1px solid ${isDark ? '#0D3320' : '#A7F3D0'}`, color: isDark ? '#A7F3D0' : '#065F46' }}
              >
                {readyOrders.length}
              </span>
            )}
          </div>

          <div className="flex-1 px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            {readyOrders.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p style={{ color: textMuted, fontSize: 14 }}>Nenhum pedido pronto</p>
              </div>
            )}
            {readyOrders.map((order) => (
              <div
                key={order.id}
                data-testid={`ready-${order.id}`}
                className="rounded-[16px] p-5"
                style={{
                  background: readyCard.bg,
                  border: `1px solid ${readyCard.border}`,
                  animation: 'glow 2s ease-in-out infinite',
                }}
              >
                <p style={{ fontSize: 11, color: readyCard.label, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                  Retirar agora
                </p>
                <p style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.6px', color: readyCard.num, lineHeight: 1.1 }}>
                  #{order.order_number}
                </p>
                <p style={{ fontSize: 18, color: readyCard.name, marginTop: 6 }}>
                  {order.customer_name}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes glow  { 0%, 100% { box-shadow: none; } 50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15); } }
      `}</style>
      <LgpdFooter className="border-t border-zinc-800 mt-auto" />
    </div>
  )
}
