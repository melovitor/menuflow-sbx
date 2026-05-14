import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconVolume, IconVolumeOff, IconMoon, IconSun } from '@tabler/icons-react'
import { supabase } from '../../services/supabase'
import { fetchKdsOrders, updateOrderStatus } from '../../services/orderService'
import { toggleTheme } from '../../utils/theme'
import { formatDuration } from '../../utils/formatters'
import Spinner from '../../components/ui/Spinner'
import { useAudio } from '../../hooks/useAudio'

const getColumns = (isDark) => [
  {
    status: 'pending',
    label: 'NOVO',
    headerBg:     isDark ? '#1A0808' : '#FEF2F2',
    headerBorder: isDark ? '#3D1212' : '#FECACA',
    headerText:   isDark ? '#FCA5A5' : '#991B1B',
    cardBorder:   '#ef4444',
    cardBg:       isDark ? '#450a0a' : '#FFF5F5',
    nextStatus: 'preparing',
    actionLabel: 'Iniciar preparo',
    blinkCount: true,
    glowCards: false,
  },
  {
    status: 'preparing',
    label: 'EM PREPARO',
    headerBg:     isDark ? '#1A1200' : '#FFFBEB',
    headerBorder: isDark ? '#3D2E00' : '#FDE68A',
    headerText:   isDark ? '#FDE68A' : '#92400E',
    cardBorder:   '#eab308',
    cardBg:       isDark ? '#422006' : '#FEFCE8',
    nextStatus: 'ready',
    actionLabel: 'Marcar como pronto',
    blinkCount: false,
    glowCards: false,
  },
  {
    status: 'ready',
    label: 'PRONTO',
    headerBg:     isDark ? '#021510' : '#ECFDF5',
    headerBorder: isDark ? '#0D3320' : '#A7F3D0',
    headerText:   isDark ? '#A7F3D0' : '#065F46',
    cardBorder:   '#22c55e',
    cardBg:       isDark ? '#052e16' : '#F0FFF4',
    nextStatus: 'delivered',
    actionLabel: 'Finalizar pedido',
    blinkCount: false,
    glowCards: true,
  },
]

const getSourceStyle = (isDark) => ({
  table:   isDark ? { background: '#1E2D4A', color: '#93C5FD' } : { background: '#EFF6FF', color: '#1D4ED8' },
  counter: isDark ? { background: '#2D1A08', color: '#FDBA74' } : { background: '#FFF7ED', color: '#C2410C' },
  staff:   isDark ? { background: '#2E1065', color: '#C4B5FD' } : { background: '#F5F3FF', color: '#6D28D9' },
})

const getSourceLabel = (order) => {
  if (order.source === 'table') return `Mesa ${order.tables?.number ?? '?'}`
  if (order.source === 'counter') return order.customer_name ? `Balcão — ${order.customer_name}` : 'Balcão'
  return 'PDV'
}

const getTimeLabel = (order, now) => {
  const ms = now - new Date(order.created_at).getTime()
  return { label: formatDuration(ms), hint: 'aberto' }
}

const getStaffSession = () => {
  try { return JSON.parse(localStorage.getItem('staff_session') || 'null') } catch { return null }
}

export default function KitchenDisplay() {
  const { businessId } = useParams()
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)
  const [updating, setUpdating] = useState(new Set())
  const [now, setNow] = useState(Date.now())
  const [wrongBusiness, setWrongBusiness] = useState(false)
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const { enabled: audioEnabled, enable: enableAudio, play: playSound } = useAudio(['/sounds/new-order.wav'])

  const COLUMNS = getColumns(isDark)
  const SOURCE_STYLE = getSourceStyle(isDark)

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  useEffect(() => { mutedRef.current = muted }, [muted])

  useEffect(() => {
    const session = getStaffSession()
    if (!session) {
      navigate(`/staff/login?from=${encodeURIComponent(window.location.pathname)}`, { replace: true })
      return
    }
    if (session.businessId !== businessId) setWrongBusiness(true)
  }, [businessId, navigate])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!businessId) return
    Promise.all([
      fetchKdsOrders(businessId),
      supabase.from('businesses').select('name').eq('id', businessId).single(),
    ])
      .then(([ords, { data: biz }]) => {
        setOrders(ords)
        setBusinessName(biz?.name || '')
      })
      .finally(() => setLoading(false))
  }, [businessId])

  useEffect(() => {
    if (!businessId) return
    const ch = supabase
      .channel(`kds-${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
        async (payload) => {
          if (!['pending', 'preparing', 'ready'].includes(payload.new.status)) return
          const { data: order } = await supabase
            .from('orders')
            .select('id, order_number, source, status, customer_name, created_at, updated_at, tables(number), order_items(id, item_name, quantity, notes)')
            .eq('id', payload.new.id)
            .single()
          if (!order) return
          setOrders((prev) => [...prev, order])
          if (!mutedRef.current) playSound('/sounds/new-order.wav')
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
        (payload) => {
          const updated = payload.new
          if (['cancelled', 'delivered'].includes(updated.status)) {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id))
          } else if (updated.status === 'closed') {
            // Conta fechada mas pedido ainda precisa ser preparado/entregue —
            // manter no KDS com a flag _billClosed, sem alterar o status de preparo
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, _billClosed: true } : o))
            )
          } else {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [businessId])

  const handleAdvance = async (order, nextStatus) => {
    if (!nextStatus || updating.has(order.id)) return
    setUpdating((prev) => new Set(prev).add(order.id))
    try {
      if (order._billClosed) {
        // Conta já fechada — avançar só no estado local, sem gravar no banco
        if (nextStatus === 'delivered') {
          setOrders((prev) => prev.filter((o) => o.id !== order.id))
        } else {
          setOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
          )
        }
      } else {
        await updateOrderStatus(order.id, nextStatus)
      }
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: order.status } : o)))
    } finally {
      setUpdating((prev) => { const next = new Set(prev); next.delete(order.id); return next })
    }
  }

  const handleEnableAudio = () => { enableAudio() }

  const bg = isDark ? '#111113' : '#F8F8F8'
  const headerBg = isDark ? '#0A0A0C' : '#FFFFFF'
  const headerBorder = isDark ? '#2A2A2E' : '#E2E2E2'
  const colDivider = isDark ? '#2A2A2E' : '#E2E2E2'
  const textPrimary = isDark ? '#FAFAFA' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#555555'
  const textMuted = isDark ? '#555558' : '#999999'
  const btnBg = isDark ? '#18181B' : '#F1F1F1'
  const btnBorder = isDark ? '#3F3F46' : '#C8C8C8'
  const emptyText = isDark ? '#555558' : '#999999'
  const noteColor = isDark ? '#FDE68A' : '#92400E'
  const itemText = isDark ? '#FFFFFF' : '#111111'
  const updatingColor = isDark ? '#555558' : '#999999'

  if (wrongBusiness) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-5 px-8 text-center" style={{ background: bg }}>
        <p className="text-[18px] font-medium" style={{ color: textPrimary }}>Estabelecimento incorreto</p>
        <p className="text-[14px]" style={{ color: textSecondary }}>
          Você está autenticado em outro estabelecimento.<br />Saia e use o código correto.
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('staff_session')
            navigate(`/staff/login?from=${encodeURIComponent(window.location.pathname)}`, { replace: true })
          }}
          className="h-[44px] px-8 rounded-[10px] text-[14px] font-medium text-white"
          style={{ background: '#7C3AED' }}
        >
          Sair e entrar novamente
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: bg }}>
        <Spinner />
      </div>
    )
  }

  const colOrders = (status) => orders.filter((o) => o.status === status)

  return (
    <div className="h-screen flex flex-col select-none" style={{ background: bg, color: textPrimary }}>
      {/* Audio activation overlay */}
      {!audioEnabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <button
            type="button"
            data-testid="btn-enable-audio"
            onClick={handleEnableAudio}
            className="flex flex-col items-center gap-4 px-10 py-8 rounded-[20px]"
            style={{ background: btnBg, border: `1px solid ${btnBorder}` }}
          >
            <IconVolume size={40} color="#A78BFA" />
            <p className="text-[20px] font-medium" style={{ color: textPrimary }}>Ativar alertas sonoros</p>
            <p className="text-[15px]" style={{ color: textSecondary }}>
              Toque para habilitar o som dos novos pedidos
            </p>
          </button>
        </div>
      )}

      {/* Header */}
      <header
        className="flex-shrink-0 h-[52px] px-5 flex items-center justify-between"
        style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-medium" style={{ color: textPrimary, letterSpacing: '-0.2px' }}>
            Menu<span style={{ color: '#7C3AED' }}>Flow</span>
            <span style={{ color: textMuted }}> · KDS</span>
          </span>
          {businessName && (
            <span className="text-[14px]" style={{ color: textSecondary }}>{businessName}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="btn-toggle-audio"
            onClick={() => audioEnabled && setMuted((v) => !v)}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
            style={{ border: `1px solid ${btnBorder}`, background: btnBg, color: (audioEnabled && !muted) ? '#A78BFA' : textMuted }}
          >
            {(audioEnabled && !muted) ? <IconVolume size={16} /> : <IconVolumeOff size={16} />}
          </button>

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

      {/* Columns */}
      <div className="flex-1 flex overflow-hidden">
        {COLUMNS.map((col, colIndex) => {
          const colItems = colOrders(col.status)
          return (
            <div
              key={col.status}
              className="flex-1 flex flex-col overflow-hidden"
              style={{ borderRight: colIndex < COLUMNS.length - 1 ? `1px solid ${colDivider}` : 'none' }}
            >
              {/* Column header */}
              <div
                className="flex-shrink-0 h-[44px] px-4 flex items-center justify-between"
                style={{ background: col.headerBg, borderBottom: `1px solid ${col.headerBorder}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium uppercase tracking-[.08em]" style={{ color: col.headerText }}>
                    {col.label}
                  </span>
                  {colItems.length > 0 && (
                    <span
                      className={`text-[11px] font-medium px-2 py-[1px] rounded-full ${col.blinkCount ? 'animate-blink' : ''}`}
                      style={{ background: col.headerBorder, color: col.headerText }}
                    >
                      {colItems.length}
                    </span>
                  )}
                </div>
                {col.status === 'ready' && colItems.length > 0 && (
                  <span className="w-[8px] h-[8px] rounded-full animate-blink" style={{ background: '#10B981' }} />
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[14px]" style={{ color: emptyText }}>—</p>
                  </div>
                ) : (
                  colItems.map((order) => {
                    const src = SOURCE_STYLE[order.source] || SOURCE_STYLE.staff
                    const isUpdating = updating.has(order.id)
                    const tappable = !!col.nextStatus
                    const { label: timeLabel, hint: timeHint } = getTimeLabel(order, now)

                    return (
                      <button
                        key={order.id}
                        type="button"
                        data-testid={`kds-card-${order.order_number}`}
                        onClick={() => tappable && handleAdvance(order, col.nextStatus)}
                        disabled={!tappable || isUpdating}
                        className={`w-full text-left rounded-[14px] overflow-hidden flex flex-col min-h-[120px] transition-opacity ${
                          tappable ? 'active:opacity-70 cursor-pointer' : 'cursor-default'
                        } ${col.glowCards ? 'animate-glow' : ''}`}
                        style={{
                          background: col.cardBg,
                          border: `2px solid ${col.cardBorder}`,
                          opacity: isUpdating ? 0.5 : 1,
                        }}
                      >
                        {/* Card top */}
                        <div
                          className="flex items-center justify-between px-3 py-2"
                          style={{ borderBottom: `1px solid ${col.cardBorder}40` }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[14px] font-medium flex-shrink-0" style={{ color: itemText }}>
                              #{order.order_number}
                            </span>
                            <span
                              className="text-[11px] font-medium px-2 py-[2px] rounded-pill truncate"
                              style={{ background: src.background, color: src.color }}
                            >
                              {getSourceLabel(order)}
                            </span>
                            {order._billClosed && (
                              <span
                                className="text-[10px] font-medium px-2 py-[2px] rounded-pill flex-shrink-0"
                                style={{ background: isDark ? '#042918' : '#ECFDF5', color: isDark ? '#6EE7B7' : '#065F46', border: `1px solid ${isDark ? '#0D3320' : '#A7F3D0'}` }}
                              >
                                Pago
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 ml-2">
                            <span className="text-[13px] font-medium" style={{ color: textSecondary }}>
                              {timeLabel}
                            </span>
                            <span className="text-[10px]" style={{ color: textMuted }}>
                              {timeHint}
                            </span>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="flex-1 px-3 py-2 space-y-[6px]">
                          {(order.order_items || []).map((item) => (
                            <div key={item.id}>
                              <p className="text-[16px] leading-tight" style={{ color: itemText }}>
                                <span className="font-medium">{item.quantity}×</span>{' '}
                                {item.item_name}
                              </p>
                              {item.notes && (
                                <p className="text-[13px] mt-[2px]" style={{ color: noteColor }}>
                                  ↳ {item.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action footer */}
                        {tappable && (
                          <div
                            className="px-3 py-2 text-[13px] font-medium text-center"
                            style={{ borderTop: `1px solid ${col.cardBorder}40`, color: col.headerText }}
                          >
                            {isUpdating
                              ? <span style={{ color: updatingColor }}>Atualizando…</span>
                              : col.actionLabel + ' →'
                            }
                          </div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
