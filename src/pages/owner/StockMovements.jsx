import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { IconArrowNarrowDown, IconArrowNarrowUp, IconAdjustments, IconFlame, IconSearch } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { toast } from '../../components/ui/Toast'
import { fetchStockMovements, fetchIngredients } from '../../services/inventoryService'
import { formatCurrency } from '../../utils/formatters'

const TYPE_CONFIG = {
  in:     { label: 'Entrada',     icon: IconArrowNarrowUp,   pill: 'bg-[var(--green-bg)] text-[var(--green-text)] border-[var(--green-border)]' },
  out:    { label: 'Saída',       icon: IconArrowNarrowDown, pill: 'bg-[var(--red-bg)] text-[var(--red-text)] border-[var(--red-border)]' },
  adjust: { label: 'Ajuste',      icon: IconAdjustments,     pill: 'bg-[var(--amber-bg)] text-[var(--amber-text)] border-[var(--amber-border)]' },
  waste:  { label: 'Desperdício', icon: IconFlame,           pill: 'bg-[var(--bg-tertiary)] text-[var(--text-3)] border-[var(--border)]' },
}

const PERIOD_OPTIONS = [
  { value: 'today',  label: 'Hoje' },
  { value: 'week',   label: '7 dias' },
  { value: 'month',  label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
]

const TYPE_OPTIONS = [
  { value: 'all',    label: 'Todos os tipos' },
  { value: 'in',     label: 'Entrada' },
  { value: 'out',    label: 'Saída' },
  { value: 'adjust', label: 'Ajuste' },
  { value: 'waste',  label: 'Desperdício' },
]

function getPeriodRange(period, customFrom, customTo) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'today') return { from: startOfToday.toISOString(), to: now.toISOString() }
  if (period === 'week')  return { from: new Date(startOfToday - 6 * 86400000).toISOString(), to: now.toISOString() }
  if (period === 'month') return { from: new Date(startOfToday - 29 * 86400000).toISOString(), to: now.toISOString() }
  if (period === 'custom' && customFrom && customTo) {
    return {
      from: new Date(customFrom + 'T00:00:00').toISOString(),
      to:   new Date(customTo  + 'T23:59:59').toISOString(),
    }
  }
  return {}
}

function formatDateTime(iso) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const PAGE_SIZE = 50

export default function StockMovements() {
  const { id: businessId } = useParams()

  const [movements, setMovements] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const [ingredientFilter, setIngredientFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [period, setPeriod] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const buildFilters = useCallback(() => {
    const range = getPeriodRange(period, customFrom, customTo)
    return {
      ingredientId: ingredientFilter || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      ...range,
      limit: PAGE_SIZE,
      offset: 0,
    }
  }, [ingredientFilter, typeFilter, period, customFrom, customTo])

  const load = useCallback(async () => {
    setLoading(true)
    setOffset(0)
    try {
      const filters = buildFilters()
      const data = await fetchStockMovements(businessId, filters)
      setMovements(data)
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      toast.error('Erro ao carregar movimentações.')
    } finally {
      setLoading(false)
    }
  }, [businessId, buildFilters])

  const loadMore = async () => {
    const next = offset + PAGE_SIZE
    setLoadingMore(true)
    try {
      const filters = { ...buildFilters(), offset: next, limit: PAGE_SIZE }
      const data = await fetchStockMovements(businessId, filters)
      setMovements((prev) => [...prev, ...data])
      setOffset(next)
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      toast.error('Erro ao carregar mais.')
    } finally {
      setLoadingMore(false)
    }
  }

  // Load ingredients for filter select
  useEffect(() => {
    fetchIngredients(businessId).then(setIngredients).catch(() => {})
  }, [businessId])

  useEffect(() => { load() }, [load])

  const handleSearch = () => {
    if (period === 'custom' && (!customFrom || !customTo)) return
    load()
  }

  return (
    <OwnerLayout
      title="Movimentações"
      showBack
      backTo={`/owner/business/${businessId}/stock/ingredients`}
    >
      <div className="px-5 py-5 flex flex-col gap-4 pb-10">

        {/* Filters */}
        <div className="flex flex-col gap-3">

          {/* Ingredient select */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Insumo
            </label>
            <select
              value={ingredientFilter}
              onChange={(e) => setIngredientFilter(e.target.value)}
              className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none border border-[var(--border-strong)] focus:border-accent"
            >
              <option value="">Todos os insumos</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Type + period pills */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none border border-[var(--border-strong)] focus:border-accent"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Período
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none border border-[var(--border-strong)] focus:border-accent"
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom date inputs */}
          {period === 'custom' && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">De</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text)] outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Até</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text)] outline-none focus:border-accent"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={!customFrom || !customTo}
                className="w-full h-[40px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[13px] font-medium disabled:opacity-40"
              >
                <IconSearch size={14} />
                Buscar
              </button>
            </div>
          )}

          {/* Search button for non-custom periods */}
          {period !== 'custom' && (
            <button
              type="button"
              onClick={handleSearch}
              className="w-full h-[40px] flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
            >
              <IconSearch size={14} />
              Aplicar filtros
            </button>
          )}
        </div>

        {/* Results */}
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && movements.length === 0 && (
          <div className="text-center py-14">
            <IconAdjustments size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
            <p className="text-[14px] font-medium text-[var(--text-2)]">Nenhuma movimentação</p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">
              Tente outro período ou filtro.
            </p>
          </div>
        )}

        {!loading && movements.length > 0 && (
          <div className="flex flex-col gap-2">
            {movements.map((mov) => {
              const cfg = TYPE_CONFIG[mov.type] || TYPE_CONFIG.adjust
              const Icon = cfg.icon
              const isAuto = !!mov.orders?.order_number
              const isPO   = !!mov.purchase_orders?.id

              return (
                <div
                  key={mov.id}
                  data-testid={`movement-row-${mov.id}`}
                  className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] px-4 py-3"
                >
                  <div className="flex items-start gap-3">

                    {/* Type icon */}
                    <div className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={15} className={
                        mov.type === 'in'     ? 'text-[var(--green-text)]'
                        : mov.type === 'out'  ? 'text-[var(--red-text)]'
                        : mov.type === 'adjust' ? 'text-[var(--amber-text)]'
                        : 'text-[var(--text-3)]'
                      } />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium border ${cfg.pill}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[13px] font-medium text-[var(--text)] truncate">
                          {mov.ingredients?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-[12px] text-[var(--text-2)]">
                          {mov.quantity > 0 ? '+' : ''}{Number(mov.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {mov.ingredients?.unit}
                        </p>
                        {mov.unit_cost > 0 && (
                          <p className="text-[11px] text-[var(--text-3)]">
                            {formatCurrency(mov.unit_cost)}/{mov.ingredients?.unit}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-[10px] text-[var(--text-3)]">
                          {formatDateTime(mov.created_at)}
                        </p>
                        {isAuto && (
                          <span className="text-[10px] text-[var(--text-3)]">
                            · Pedido #{mov.orders.order_number}
                          </span>
                        )}
                        {isPO && (
                          <span className="text-[10px] text-[var(--text-3)]">
                            · Ordem de compra
                          </span>
                        )}
                        {!isAuto && !isPO && (
                          <span className="text-[10px] text-[var(--text-3)]">· Manual</span>
                        )}
                        {mov.notes && (
                          <span className="text-[10px] text-[var(--text-3)]">· {mov.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Load more */}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full h-[42px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
              >
                {loadingMore ? <Spinner size="sm" /> : 'Carregar mais'}
              </button>
            )}
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
