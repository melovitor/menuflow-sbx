import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconMoon, IconSun, IconShoppingBag, IconX } from '@tabler/icons-react'
import LgpdFooter from '../../components/layout/LgpdFooter'
import { supabase } from '../../services/supabase'
import { cancelOrder } from '../../services/orderService'
import { getCustomerSession } from '../../utils/customerSession'
import { formatCurrency, formatDuration } from '../../utils/formatters'
import { toggleTheme } from '../../utils/theme'
import Spinner from '../../components/ui/Spinner'

const STATUS_LABEL = {
  pending: 'Aguardando cozinha',
  preparing: 'Em preparo',
  ready: 'Pronto para retirar!',
  delivered: 'Entregue',
  closed: 'Entregue',
  cancelled: 'Cancelado',
}

const STATUS_STYLE = {
  pending: { bg: 'var(--red-bg)', border: 'var(--red-border)', text: 'var(--red-text)' },
  preparing: { bg: 'var(--amber-bg)', border: 'var(--amber-border)', text: 'var(--amber-text)' },
  ready: { bg: 'var(--green-bg)', border: 'var(--green-border)', text: 'var(--green-text)' },
  delivered: { bg: 'var(--bg-tertiary)', border: 'var(--border)', text: 'var(--text-3)' },
  closed: { bg: 'var(--bg-tertiary)', border: 'var(--border)', text: 'var(--text-3)' },
  cancelled: { bg: 'var(--bg-tertiary)', border: 'var(--border)', text: 'var(--text-3)' },
}

export default function OrderStatus() {
  const { businessSlug } = useParams()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const [session, setSession] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [now, setNow] = useState(Date.now())

  const channelsRef = useRef([])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  // Load session + orders
  useEffect(() => {
    const s = getCustomerSession(businessSlug)
    if (!s) {
      navigate(`/order/${businessSlug}/identify`, { replace: true })
      return
    }
    setSession(s)

    const loadOrders = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, status, created_at, updated_at, order_items(id, item_name, quantity, unit_price, notes)')
          .eq('customer_id', s.customerId)
          .not('status', 'in', '(closed,cancelled)')
          .order('created_at', { ascending: false })
        setOrders(data || [])
      } catch {
        // silently fail — user can still see UI
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [businessSlug, navigate])

  // Subscribe to realtime updates for each order
  useEffect(() => {
    if (!orders.length) return

    // Clean up existing channels
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch))
    channelsRef.current = []

    orders.forEach((order) => {
      const ch = supabase
        .channel(`order-status-${order.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
          (payload) => {
            const updated = payload.new
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id
                  ? { ...o, status: updated.status, updated_at: updated.updated_at }
                  : o
              )
            )
          }
        )
        .subscribe()
      channelsRef.current.push(ch)
    })

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch))
      channelsRef.current = []
    }
  }, [orders.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelOrder = async (orderId) => {
    setCancellingId(orderId)
    try {
      await cancelOrder(orderId)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)))
    } catch {
      // silently fail — status will update via realtime if it went through
    } finally {
      setCancellingId(null)
      setConfirmCancelId(null)
    }
  }

  const handleNewOrder = () => {
    navigate(`/order/${businessSlug}/counter`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    )
  }

  const activeOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'closed' && o.status !== 'delivered')
  const doneOrders = orders.filter((o) => o.status === 'cancelled' || o.status === 'closed' || o.status === 'delivered')

  const orderTotal = (order) =>
    order.order_items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* Header */}
      <header
        className="h-[52px] px-4 flex items-center justify-between flex-shrink-0
          bg-[var(--bg-primary)] border-b border-[var(--border)] sticky top-0 z-10"
      >
        <button
          type="button"
          data-testid="btn-back"
          onClick={() => navigate(`/order/${businessSlug}/counter`)}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center
            border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
        >
          <IconArrowLeft size={15} />
        </button>

        <span className="text-[13px] font-medium text-[var(--text)] tracking-[-0.2px]">
          Meus pedidos
        </span>

        <button
          type="button"
          data-testid="btn-toggle-theme"
          onClick={handleToggleTheme}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center
            border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
        >
          {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </header>

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* Welcome */}
        {session && (
          <p className="text-[13px] text-[var(--text-2)]">
            Olá, <span className="font-medium text-[var(--text)]">{session.customerName.split(' ')[0]}</span>! Acompanhe seus pedidos abaixo.
          </p>
        )}

        {/* Empty */}
        {orders.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-16">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent-light)' }}
            >
              <IconShoppingBag size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-[15px] font-medium text-[var(--text)]">Nenhum pedido ativo</p>
            <p className="text-[13px] text-[var(--text-2)]">Seus pedidos aparecerão aqui após confirmar.</p>
            <button
              type="button"
              data-testid="btn-go-menu"
              onClick={handleNewOrder}
              className="mt-2 h-[44px] px-6 rounded-[10px] text-[14px] font-medium text-white"
              style={{ background: 'var(--accent)' }}
            >
              Ver cardápio
            </button>
          </div>
        )}

        {/* Active orders */}
        {activeOrders.length > 0 && (
          <div className="flex flex-col gap-3">
            {activeOrders.map((order) => {
              const style = STATUS_STYLE[order.status] || STATUS_STYLE.pending
              const isPending = order.status === 'pending'
              const isReady = order.status === 'ready'

              return (
                <div
                  key={order.id}
                  data-testid={`order-card-${order.id}`}
                  className="rounded-[14px] border p-4 flex flex-col gap-3"
                  style={{
                    background: style.bg,
                    borderColor: style.border,
                    boxShadow: isReady ? `0 0 0 3px ${style.border}` : 'none',
                  }}
                >
                  {/* Order header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[.06em] text-[var(--text-3)]">
                        Pedido
                      </p>
                      <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
                        #{order.order_number}
                      </p>
                      <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                        {formatDuration(now - new Date(order.created_at).getTime())} aberto
                      </p>
                    </div>
                    <span
                      data-testid={`status-badge-${order.id}`}
                      className="text-[11px] font-medium px-3 py-1 rounded-full border"
                      style={{ background: style.bg, borderColor: style.border, color: style.text }}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="flex flex-col gap-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-2">
                        <span className="text-[13px] text-[var(--text-2)] flex-1">
                          {item.quantity}× {item.item_name}
                          {item.notes && (
                            <span className="text-[11px] text-[var(--text-3)] ml-1">
                              ({item.notes})
                            </span>
                          )}
                        </span>
                        <span className="text-[12px] text-[var(--text-3)] flex-shrink-0">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: style.border }}>
                    <span className="text-[12px] text-[var(--text-3)]">Total do pedido</span>
                    <span className="text-[14px] font-medium text-[var(--text)]">
                      {formatCurrency(orderTotal(order))}
                    </span>
                  </div>

                  {/* Cancel button (pending only) */}
                  {isPending && (
                    <button
                      type="button"
                      data-testid={`btn-cancel-${order.id}`}
                      onClick={() => setConfirmCancelId(order.id)}
                      className="w-full h-[36px] rounded-[8px] text-[12px] font-medium
                        border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]
                        flex items-center justify-center gap-1"
                    >
                      <IconX size={13} />
                      Cancelar pedido
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Finalized orders */}
        {doneOrders.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <p className="text-[11px] font-medium uppercase tracking-[.06em] text-[var(--text-3)]">
              Anteriores
            </p>
            {doneOrders.map((order) => {
              const style = STATUS_STYLE[order.status] || STATUS_STYLE.delivered
              return (
                <div
                  key={order.id}
                  data-testid={`order-done-${order.id}`}
                  className="rounded-[12px] border p-3 flex items-center justify-between"
                  style={{ background: style.bg, borderColor: style.border }}
                >
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text)]">#{order.order_number}</p>
                    <p className="text-[11px] text-[var(--text-3)]">
                      {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'itens'} • {formatCurrency(orderTotal(order))}
                      {order.updated_at && ` • ${formatDuration(new Date(order.updated_at).getTime() - new Date(order.created_at).getTime())}`}
                    </p>
                  </div>
                  <span
                    className="text-[11px] font-medium px-2 py-1 rounded-full border"
                    style={{ background: style.bg, borderColor: style.border, color: style.text }}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* New order button */}
        {orders.length > 0 && (
          <button
            type="button"
            data-testid="btn-new-order"
            onClick={handleNewOrder}
            className="w-full h-[48px] rounded-[12px] text-[14px] font-medium
              border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]
              flex items-center justify-center gap-2 mt-1"
          >
            <IconShoppingBag size={16} />
            Fazer outro pedido
          </button>
        )}

      </div>

      {/* Confirm cancel modal */}
      {confirmCancelId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-sm mx-4 mb-6 bg-[var(--bg-primary)] border border-[var(--border)]
              rounded-[16px] p-5"
          >
            <p className="text-[15px] font-medium text-[var(--text)] mb-2">Cancelar pedido</p>
            <p className="text-[13px] text-[var(--text-2)] mb-5">
              Tem certeza que deseja cancelar? Isso não pode ser desfeito.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="btn-confirm-cancel-no"
                onClick={() => setConfirmCancelId(null)}
                className="flex-1 h-[44px] rounded-[10px] text-[14px] font-medium
                  border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
              >
                Voltar
              </button>
              <button
                type="button"
                data-testid="btn-confirm-cancel-yes"
                onClick={() => handleCancelOrder(confirmCancelId)}
                disabled={cancellingId === confirmCancelId}
                className="flex-1 h-[44px] rounded-[10px] text-[14px] font-medium text-white
                  flex items-center justify-center"
                style={{ background: '#EF4444', opacity: cancellingId === confirmCancelId ? 0.6 : 1 }}
              >
                {cancellingId === confirmCancelId ? <Spinner size="sm" /> : 'Cancelar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LgpdFooter className="border-t border-[var(--border)]" />
    </div>
  )
}
