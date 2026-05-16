import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { IconShoppingBag, IconClock, IconSearch } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { toast } from '../../components/ui/Toast'
import { fetchBusinessById, fetchBusinessMetrics } from '../../services/businessService'
import { fetchActiveOrders, fetchRevenueByPeriod } from '../../services/orderService'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/formatters'

const STATUS_LABEL = {
  pending: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Pronto',
}

const STATUS_STYLE = {
  pending: 'bg-[var(--red-bg)] border-[var(--red-border)] text-[var(--red-text)]',
  preparing: 'bg-[var(--amber-bg)] border-[var(--amber-border)] text-[var(--amber-text)]',
  ready: 'bg-[var(--green-bg)] border-[var(--green-border)] text-[var(--green-text)]',
}

const SOURCE_LABEL = {
  table: (o) => `Mesa ${o.tables?.number ?? '?'}`,
  counter: () => 'Balcao',
  staff: (o) => o.tables ? `PDV - Mesa ${o.tables.number}` : 'PDV',
}

const SOURCE_STYLE = {
  table: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  counter: 'bg-[var(--amber-bg)] border-[var(--amber-border)] text-[var(--amber-text)]',
  staff: 'bg-[var(--accent-light)] border-[var(--accent-light)] text-[var(--accent-text)]',
}

const METRIC_DEFS = [
  { key: 'revenue',        label: 'Faturamento',       sub: 'Hoje',               color: '#7C3AED',       testId: 'metric-revenue' },
  { key: 'activeOrders',   label: 'Pedidos Ativos',    sub: 'Na fila agora',      color: '#10B981',       testId: 'metric-active-orders' },
  { key: 'occupiedTables', label: 'Mesas Ocupadas',    sub: 'Com pedido aberto',  color: '#F59E0B',       testId: 'metric-occupied-tables' },
  { key: 'counterQueue',   label: 'Fila do Balcão',    sub: 'Pedidos de balcão',  color: '#EF4444',       testId: 'metric-counter-queue' },
]

const PERIOD_PRESETS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d',    label: '7 dias' },
  { value: '30d',   label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
]

function getDateRange(period, customFrom, customTo) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'today') return { from: todayStart.toISOString(), to: now.toISOString() }
  if (period === '7d')  return { from: new Date(todayStart - 6 * 86400000).toISOString(), to: now.toISOString() }
  if (period === '30d') return { from: new Date(todayStart - 29 * 86400000).toISOString(), to: now.toISOString() }
  if (period === 'custom' && customFrom && customTo) {
    return {
      from: new Date(customFrom + 'T00:00:00').toISOString(),
      to:   new Date(customTo  + 'T23:59:59').toISOString(),
    }
  }
  return null
}

const elapsed = (createdAt) => {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000)
  if (mins < 1) return 'agora'
  if (mins === 1) return 'ha 1 min'
  return `ha ${mins} min`
}

export default function Dashboard() {
  const { id } = useParams()

  const [business, setBusiness] = useState(null)
  const [metrics, setMetrics] = useState({ activeOrders: 0, occupiedTables: 0, revenue: 0, counterQueue: 0 })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const [revPeriod, setRevPeriod] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [revenue, setRevenue] = useState(null)
  const [revLoading, setRevLoading] = useState(false)

  // Refs para período — permitem que refreshAll leia valores atuais
  // sem precisar ser recriado (e sem recriar a subscription) a cada mudança de filtro
  const revPeriodRef = useRef(revPeriod)
  const customFromRef = useRef(customFrom)
  const customToRef = useRef(customTo)
  useEffect(() => { revPeriodRef.current = revPeriod }, [revPeriod])
  useEffect(() => { customFromRef.current = customFrom }, [customFrom])
  useEffect(() => { customToRef.current = customTo }, [customTo])

  // Função de refresh estável — só recriada quando id muda
  // Lê período dos refs para enxergar sempre o filtro atual
  const refreshAll = useCallback(async () => {
    try {
      const range = getDateRange(revPeriodRef.current, customFromRef.current, customToRef.current)
      const [met, ords] = await Promise.all([
        fetchBusinessMetrics(id),
        fetchActiveOrders(id),
      ])
      setMetrics(met)
      setOrders(ords)
      if (range) {
        const data = await fetchRevenueByPeriod(id, range)
        setRevenue(data)
      }
    } catch { /* silent */ }
  }, [id])

  // Carga inicial
  useEffect(() => {
    Promise.all([fetchBusinessById(id), fetchBusinessMetrics(id), fetchActiveOrders(id)])
      .then(([biz, met, ords]) => { setBusiness(biz); setMetrics(met); setOrders(ords) })
      .catch(() => toast.error('Erro ao carregar dashboard.'))
      .finally(() => setLoading(false))
  }, [id])

  // Faturamento com spinner — acionado pelo seletor de período
  const loadRevenue = useCallback(async (period, cfrom, cto) => {
    const range = getDateRange(period, cfrom, cto)
    if (!range) return
    setRevLoading(true)
    try {
      const data = await fetchRevenueByPeriod(id, range)
      setRevenue(data)
    } catch { /* silent */ }
    finally { setRevLoading(false) }
  }, [id])

  useEffect(() => {
    if (revPeriod !== 'custom') loadRevenue(revPeriod, '', '')
  }, [revPeriod, loadRevenue])

  // Subscription Realtime — recriada apenas quando id (ou refreshAll) muda
  useEffect(() => {
    const channel = supabase
      .channel(`dashboard-rt-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `business_id=eq.${id}` }, refreshAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `business_id=eq.${id}` }, refreshAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tables', filter: `business_id=eq.${id}` }, refreshAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, refreshAll])

  const metricValue = (def) => {
    const raw = metrics[def.key]
    return def.key === 'revenue' ? formatCurrency(raw ?? 0) : (raw ?? 0)
  }

  return (
    <OwnerLayout title="Dashboard" showBack backTo={`/owner/business/${id}`}>
      <div className="px-5 py-5 flex flex-col gap-6 pb-10">

        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && business && (
          <>
            {/* Faturamento com filtro de período */}
            <section>
              <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
                Faturamento
              </p>

              {/* Period pills */}
              <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {PERIOD_PRESETS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setRevPeriod(p.value)}
                    className={`flex-shrink-0 h-[26px] px-3 rounded-pill text-[11px] font-medium border transition-colors ${
                      revPeriod === p.value
                        ? 'bg-accent text-white border-accent'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-2)] border-[var(--border-strong)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom date inputs */}
              {revPeriod === 'custom' && (
                <div className="flex gap-2 mb-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">De</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="w-full h-[38px] px-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text)] outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Até</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      className="w-full h-[38px] px-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text)] outline-none focus:border-accent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadRevenue('custom', customFrom, customTo)}
                    disabled={!customFrom || !customTo}
                    className="h-[38px] px-4 rounded-input bg-accent text-white text-[13px] font-medium disabled:opacity-40 flex items-center gap-1 flex-shrink-0"
                  >
                    <IconSearch size={14} />
                    Buscar
                  </button>
                </div>
              )}

              {/* Revenue cards */}
              {revLoading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : revenue ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] p-3"
                    style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--accent)' }}>
                    <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Total</p>
                    <p className="text-[15px] font-medium text-[var(--text)] leading-none" style={{ letterSpacing: '-0.3px' }}>
                      {formatCurrency(revenue.total)}
                    </p>
                  </div>
                  <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] p-3"
                    style={{ borderLeftWidth: '3px', borderLeftColor: '#10B981' }}>
                    <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Pedidos</p>
                    <p className="text-[15px] font-medium text-[var(--text)] leading-none" style={{ letterSpacing: '-0.3px' }}>
                      {revenue.count}
                    </p>
                  </div>
                  <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] p-3"
                    style={{ borderLeftWidth: '3px', borderLeftColor: '#F59E0B' }}>
                    <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Ticket médio</p>
                    <p className="text-[15px] font-medium text-[var(--text)] leading-none" style={{ letterSpacing: '-0.3px' }}>
                      {formatCurrency(revenue.avg)}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Operational metrics — always real-time (today) */}
            <section>
              <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
                Operação agora
              </p>
              <div className="grid grid-cols-2 gap-2">
                {METRIC_DEFS.map((def) => (
                  <div
                    key={def.testId}
                    data-testid={def.testId}
                    className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] p-3"
                    style={{ borderLeftWidth: '3px', borderLeftColor: def.color }}
                  >
                    <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">
                      {def.label}
                    </p>
                    <p
                      data-testid={`${def.testId}-value`}
                      className="text-[20px] font-medium text-[var(--text)] leading-none"
                      style={{ letterSpacing: '-0.5px' }}
                    >
                      {metricValue(def)}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)] mt-1">{def.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Active orders */}
            <section>
              <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
                Pedidos ativos
              </p>

              {orders.length === 0 && (
                <div data-testid="empty-orders" className="text-center py-10">
                  <IconShoppingBag size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
                  <p className="text-[14px] font-medium text-[var(--text-2)]">
                    Nenhum pedido ativo
                  </p>
                  <p className="text-[12px] text-[var(--text-3)] mt-0.5">
                    Os pedidos aparecerao aqui em tempo real.
                  </p>
                </div>
              )}

              {orders.length > 0 && (
                <div data-testid="orders-list" className="flex flex-col gap-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      data-testid={`order-row-${order.id}`}
                      className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] px-4 py-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-[var(--text)]">
                            #{order.order_number}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium border ${SOURCE_STYLE[order.source] || SOURCE_STYLE.staff}`}
                          >
                            {(SOURCE_LABEL[order.source] || (() => order.source))(order)}
                          </span>
                        </div>
                        {order.customer_name && (
                          <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">
                            {order.customer_name}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          data-testid={`order-status-${order.id}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium border ${STATUS_STYLE[order.status] || ''}`}
                        >
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-3)]">
                          <IconClock size={10} />
                          {elapsed(order.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </OwnerLayout>
  )
}
