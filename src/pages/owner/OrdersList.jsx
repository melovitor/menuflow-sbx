import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { IconSearch, IconX, IconReceipt } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { fetchBusinessOrders } from '../../services/orderService'
import { fetchBusinessById } from '../../services/businessService'
import { supabase } from '../../services/supabase'
import { formatCurrency, formatDate, formatDuration, formatPhone } from '../../utils/formatters'

const STATUS_CONFIG = {
  pending:   { label: 'Novo',       bg: 'var(--red-bg)',      border: 'var(--red-border)',   text: 'var(--red-text)' },
  preparing: { label: 'Em preparo', bg: 'var(--amber-bg)',    border: 'var(--amber-border)', text: 'var(--amber-text)' },
  ready:     { label: 'Pronto',     bg: 'var(--green-bg)',    border: 'var(--green-border)', text: 'var(--green-text)' },
  closed:    { label: 'Fechado',    bg: 'var(--bg-tertiary)', border: 'var(--border)',       text: 'var(--text-3)' },
  cancelled: { label: 'Cancelado',  bg: 'var(--bg-tertiary)', border: 'var(--border)',       text: 'var(--text-3)' },
}

const SOURCE_CONFIG = {
  table:   { label: 'Mesa',   darkBg: '#1E2D4A', darkText: '#93C5FD', lightBg: '#EFF6FF', lightText: '#1D4ED8' },
  counter: { label: 'Balcão', darkBg: '#2D1A08', darkText: '#FDBA74', lightBg: '#FFF7ED', lightText: '#C2410C' },
  staff:   { label: 'PDV',    darkBg: '#2E1065', darkText: '#C4B5FD', lightBg: '#F5F3FF', lightText: '#6D28D9' },
}

const PAYMENT_LABELS = { cash: 'Dinheiro', pix: 'PIX', credit: 'Crédito', debit: 'Débito' }

const PERIOD_OPTIONS = [
  { value: 'today',     label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7',     label: 'Últimos 7 dias' },
]

const STATUS_OPTIONS = [
  { value: 'all',       label: 'Todos' },
  { value: 'pending',   label: 'Novo' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'ready',     label: 'Pronto' },
  { value: 'closed',    label: 'Fechado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const SOURCE_OPTIONS = [
  { value: 'all',     label: 'Todos' },
  { value: 'table',   label: 'Mesa' },
  { value: 'counter', label: 'Balcão' },
  { value: 'staff',   label: 'PDV' },
]

function isOpen(status) {
  return ['pending', 'preparing', 'ready'].includes(status)
}

function getOrderLabel(order) {
  if (order.tables?.number != null) return `Mesa ${order.tables.number}`
  if (order.source === 'counter') return order.customer_name || order.customers?.name || 'Balcão'
  return order.customer_name || 'PDV'
}

function calcTotals(order, serviceChargePercent) {
  const subtotal = (order.order_items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const discount = subtotal * (order.discount_percent || 0) / 100
  const svc = order.service_charge_accepted ? subtotal * (serviceChargePercent || 0) / 100 : 0
  return { subtotal, discount, svc, total: subtotal - discount + svc }
}

function FilterRow({ options, value, onChange }) {
  return (
    <div className="flex gap-2 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-shrink-0 h-[26px] px-3 rounded-pill text-[11px] font-medium border transition-colors ${
            value === opt.value
              ? 'bg-accent text-white border-accent'
              : 'bg-[var(--bg-secondary)] text-[var(--text-2)] border-[var(--border-strong)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function OrdersList() {
  const { id } = useParams()

  const [business, setBusiness] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: 'all', source: 'all', period: 'today' })
  const [isDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchBusinessById(id).then(setBusiness).catch(() => {})
  }, [id])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchBusinessOrders(id, filters)
      setOrders(data)
    } catch {
      // silent — list shows empty
    } finally {
      setLoading(false)
    }
  }, [id, filters])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    const channel = supabase
      .channel(`orders-list-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${id}` }, () => loadOrders())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id, loadOrders])

  const displayed = search
    ? orders.filter(o => o.order_number.toLowerCase().includes(search.toLowerCase()))
    : orders

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  const svcPct = business?.service_charge_percent || 0
  const timezone = business?.timezone || 'America/Sao_Paulo'

  const getSrcStyle = (source) => {
    const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.staff
    return isDark
      ? { background: cfg.darkBg, color: cfg.darkText }
      : { background: cfg.lightBg, color: cfg.lightText }
  }

  const getTimeStat = (order) => {
    if (isOpen(order.status)) {
      return { label: formatDuration(now - new Date(order.created_at).getTime()), hint: 'aberto' }
    }
    const ms = new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()
    return { label: formatDuration(ms), hint: 'total' }
  }

  return (
    <OwnerLayout title="Pedidos" showBack backTo={`/owner/business/${id}`}>

      {/* Sticky filters */}
      <div className="sticky top-[52px] z-10 bg-[var(--bg-primary)] border-b border-[var(--border)]">
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              type="search"
              placeholder="Buscar por número do pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="orders-search"
              className="w-full h-[38px] pl-9 pr-3 rounded-input border border-[var(--border-strong)]
                bg-[var(--bg-secondary)] text-[13px] text-[var(--text)] outline-none focus:border-accent"
            />
          </div>
        </div>
        <FilterRow options={PERIOD_OPTIONS} value={filters.period} onChange={v => setFilter('period', v)} />
        <FilterRow options={STATUS_OPTIONS} value={filters.status} onChange={v => setFilter('status', v)} />
        <FilterRow options={SOURCE_OPTIONS} value={filters.source} onChange={v => setFilter('source', v)} />
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-3)]">
          <IconReceipt size={32} className="mb-3 opacity-40" />
          <p className="text-[14px]">Nenhum pedido encontrado</p>
          <p className="text-[12px] mt-1">Tente mudar os filtros</p>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-6">
          <p className="text-[11px] text-[var(--text-3)] uppercase tracking-[.06em] font-medium mb-2">
            {displayed.length} {displayed.length === 1 ? 'pedido' : 'pedidos'}
          </p>
          <div className="space-y-2">
            {displayed.map(order => {
              const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.closed
              const srcCfg = SOURCE_CONFIG[order.source] || SOURCE_CONFIG.staff
              const { total } = calcTotals(order, svcPct)
              const { label: timeLabel, hint: timeHint } = getTimeStat(order)
              const itemCount = (order.order_items || []).length

              return (
                <button
                  key={order.id}
                  type="button"
                  data-testid={`order-row-${order.order_number}`}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full text-left bg-[var(--bg-primary)] border border-[var(--border)]
                    rounded-[12px] px-3 py-3 hover:border-[var(--border-strong)] active:scale-[0.99]
                    transition-all duration-150"
                >
                  <div className="flex items-center justify-between gap-2 mb-[5px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-[var(--text)] flex-shrink-0">
                        #{order.order_number}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-[2px] rounded-pill flex-shrink-0"
                        style={getSrcStyle(order.source)}
                      >
                        {srcCfg.label}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-[2px] rounded-pill border flex-shrink-0"
                        style={{ background: st.bg, borderColor: st.border, color: st.text }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] font-medium text-[var(--text-2)]">{timeLabel}</p>
                      <p className="text-[10px] text-[var(--text-3)]">{timeHint}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-[var(--text-2)] truncate pr-4">
                      {getOrderLabel(order)}
                      {' · '}
                      {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                    </p>
                    <span className="text-[13px] font-medium text-[var(--text)] flex-shrink-0">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Order detail bottom sheet */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          svcPct={svcPct}
          timezone={timezone}
          now={now}
          isDark={isDark}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </OwnerLayout>
  )
}

function OrderDetail({ order, svcPct, timezone, now, isDark, onClose }) {
  const { subtotal, discount, svc, total } = calcTotals(order, svcPct)
  const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.closed
  const srcCfg = SOURCE_CONFIG[order.source] || SOURCE_CONFIG.staff
  const open = isOpen(order.status)
  const durationMs = open
    ? now - new Date(order.created_at).getTime()
    : new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()

  const customer = order.customers
  const payments = order.payments || []
  const items = order.order_items || []

  const srcStyle = isDark
    ? { background: srcCfg.darkBg, color: srcCfg.darkText }
    : { background: srcCfg.lightBg, color: srcCfg.lightText }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-h-[90vh] bg-[var(--bg-primary)] rounded-t-[20px]
          border-t border-[var(--border)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
              Pedido #{order.order_number}
            </p>
            <p className="text-[12px] text-[var(--text-3)] mt-[2px]">
              {formatDate(order.created_at, timezone)}
            </p>
          </div>
          <button
            type="button"
            data-testid="btn-close-detail"
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)]
              bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-2)]"
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Source + customer info */}
          <div className="bg-[var(--bg-secondary)] rounded-[12px] p-3 space-y-[6px]">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-medium px-2 py-[2px] rounded-pill flex-shrink-0"
                style={srcStyle}
              >
                {srcCfg.label}
              </span>
              <span className="text-[13px] text-[var(--text)]">{getOrderLabel(order)}</span>
            </div>
            {customer && (
              <p className="text-[12px] text-[var(--text-3)]">
                {customer.name}
                {customer.phone ? ` · ${formatPhone(customer.phone)}` : ''}
              </p>
            )}
            {!customer && order.customer_name && (
              <p className="text-[12px] text-[var(--text-3)]">{order.customer_name}</p>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-2">
              Itens
            </p>
            <div className="space-y-[10px]">
              {items.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--text)]">
                      <span className="font-medium">{item.quantity}×</span> {item.item_name}
                    </p>
                    {item.notes && (
                      <p className="text-[11px] text-[var(--text-3)] mt-[2px]">↳ {item.notes}</p>
                    )}
                  </div>
                  <span className="text-[13px] text-[var(--text-2)] flex-shrink-0">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-[var(--bg-secondary)] rounded-[12px] p-3 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-2)]">Subtotal</span>
              <span className="text-[var(--text)]">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-2)]">Desconto ({order.discount_percent}%)</span>
                <span className="text-[var(--text)]">−{formatCurrency(discount)}</span>
              </div>
            )}
            {order.service_charge_accepted && svcPct > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-2)]">Taxa de serviço ({svcPct}%)</span>
                <span className="text-[var(--text)]">+{formatCurrency(svc)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-medium pt-2 border-t border-[var(--border)]">
              <span className="text-[var(--text)]">Total</span>
              <span className="text-[var(--text)]">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-2">
                Pagamento
              </p>
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between text-[13px]">
                    <span className="text-[var(--text-2)]">
                      {PAYMENT_LABELS[p.method] || p.method}
                      {p.split_count > 1 && ` · dividido por ${p.split_count}`}
                    </span>
                    <span className="text-[var(--text)]">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-3">
              Histórico
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-[6px] h-[6px] rounded-full bg-[var(--text-3)] flex-shrink-0 mt-[4px]" />
                <div>
                  <p className="text-[12px] text-[var(--text-2)]">Pedido criado</p>
                  <p className="text-[11px] text-[var(--text-3)]">{formatDate(order.created_at, timezone)}</p>
                </div>
              </div>

              {!open && order.updated_at && (
                <div className="flex items-start gap-3">
                  <span className="w-[6px] h-[6px] rounded-full bg-[var(--text-3)] flex-shrink-0 mt-[4px]" />
                  <div>
                    <p className="text-[12px] text-[var(--text-2)]">{st.label}</p>
                    <p className="text-[11px] text-[var(--text-3)]">{formatDate(order.updated_at, timezone)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <span
                  className="w-[6px] h-[6px] rounded-full flex-shrink-0 mt-[4px]"
                  style={{ background: open ? '#A78BFA' : 'var(--border-strong)' }}
                />
                <div>
                  <p className="text-[12px] text-[var(--text-2)]">
                    {open ? 'Aberto há' : 'Duração total'}
                  </p>
                  <p
                    className="text-[12px] font-medium"
                    style={{ color: open ? '#A78BFA' : 'var(--text-2)' }}
                  >
                    {formatDuration(durationMs)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-[12px] text-[var(--text-3)]">Status atual</span>
            <span
              className="text-[11px] font-medium px-3 py-1 rounded-full border"
              style={{ background: st.bg, borderColor: st.border, color: st.text }}
            >
              {st.label}
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
