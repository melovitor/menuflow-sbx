import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { IconChartBar, IconSearch } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { toast } from '../../components/ui/Toast'
import { fetchCMVData } from '../../services/inventoryService'
import { formatCurrency } from '../../utils/formatters'

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week',  label: '7 dias' },
  { value: 'month', label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
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

function marginColor(pct) {
  if (pct === null || pct === undefined) return 'text-[var(--text-3)]'
  if (pct > 60)  return 'text-[var(--green-text)]'
  if (pct >= 30) return 'text-[var(--amber-text)]'
  return 'text-[var(--red-text)]'
}

function rowBg(pct) {
  if (pct === null || pct === undefined) return ''
  if (pct > 60)  return 'bg-[var(--green-bg)] border-[var(--green-border)]'
  if (pct >= 30) return 'bg-[var(--amber-bg)] border-[var(--amber-border)]'
  return 'bg-[var(--red-bg)] border-[var(--red-border)]'
}

function MarginBar({ pct }) {
  if (pct === null || pct === undefined) return null
  const clamped = Math.min(100, Math.max(0, pct))
  const color = pct > 60 ? 'bg-[var(--green-text)]' : pct >= 30 ? 'bg-[var(--amber-text)]' : 'bg-[var(--red-text)]'
  return (
    <div className="w-full h-[4px] rounded-full bg-[var(--border)] mt-1 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export default function CMVReport() {
  const { id: businessId } = useParams()

  const [period, setPeriod] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const load = useCallback(async (p = period, cf = customFrom, ct = customTo) => {
    if (p === 'custom' && (!cf || !ct)) return
    const range = getPeriodRange(p, cf, ct)
    setLoading(true)
    try {
      const result = await fetchCMVData(businessId, range)
      setData(result)
    } catch {
      toast.error('Erro ao carregar dados de CMV.')
    } finally {
      setLoading(false)
    }
  }, [businessId, period, customFrom, customTo])

  // auto-load when period changes (except custom)
  const handlePeriodChange = (val) => {
    setPeriod(val)
    if (val !== 'custom') load(val, customFrom, customTo)
  }

  const avgMargin = data && data.totalRevenue > 0
    ? ((data.totalRevenue - data.totalCMV) / data.totalRevenue) * 100
    : null

  return (
    <OwnerLayout
      title="CMV e Custos"
      showBack
      backTo={`/owner/business/${businessId}/stock/ingredients`}
    >
      <div className="px-5 py-5 flex flex-col gap-5 pb-10">

        {/* Period selector */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Período
            </label>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {PERIOD_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handlePeriodChange(o.value)}
                  className={`flex-shrink-0 h-[34px] px-4 rounded-pill text-[12px] font-medium border transition-colors ${
                    period === o.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-[var(--bg-primary)] text-[var(--text-2)] border-[var(--border-strong)] hover:border-accent hover:text-accent'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

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
                onClick={() => load(period, customFrom, customTo)}
                disabled={!customFrom || !customTo}
                className="w-full h-[40px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[13px] font-medium disabled:opacity-40"
              >
                <IconSearch size={14} />
                Buscar
              </button>
            </div>
          )}
        </div>

        {/* Empty — not loaded yet */}
        {!loading && !data && (
          <div className="text-center py-14">
            <IconChartBar size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
            <p className="text-[14px] font-medium text-[var(--text-2)]">Selecione um período</p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">
              Os dados de CMV aparecerão aqui.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">

              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3" style={{ borderLeft: '3px solid var(--accent)' }}>
                <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Faturamento</p>
                <p className="text-[20px] font-medium text-[var(--text)] tracking-[-0.4px]">
                  {formatCurrency(data.totalRevenue)}
                </p>
              </div>

              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3" style={{ borderLeft: '3px solid #EF4444' }}>
                <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">CMV Total</p>
                <p className="text-[20px] font-medium text-[var(--text)] tracking-[-0.4px]">
                  {formatCurrency(data.totalCMV)}
                </p>
                {data.totalRevenue > 0 && (
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                    {data.cmvPercent.toFixed(1)}% da receita
                  </p>
                )}
              </div>

              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3" style={{ borderLeft: '3px solid #10B981' }}>
                <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Lucro bruto</p>
                <p className={`text-[20px] font-medium tracking-[-0.4px] ${marginColor(avgMargin)}`}>
                  {formatCurrency(data.totalRevenue - data.totalCMV)}
                </p>
              </div>

              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3" style={{ borderLeft: '3px solid #F59E0B' }}>
                <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">Margem média</p>
                <p className={`text-[20px] font-medium tracking-[-0.4px] ${marginColor(avgMargin)}`}>
                  {avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—'}
                </p>
              </div>

            </div>

            {/* Margin legend */}
            <p className="text-[10px] text-[var(--text-3)] -mt-2">
              Margem: <span className="text-[var(--green-text)]">verde &gt;60%</span>
              <span className="mx-1.5">·</span>
              <span className="text-[var(--amber-text)]">amber 30–60%</span>
              <span className="mx-1.5">·</span>
              <span className="text-[var(--red-text)]">vermelho &lt;30%</span>
            </p>

            {/* Items table */}
            {data.items.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[var(--border-strong)] rounded-card">
                <p className="text-[13px] text-[var(--text-2)]">Nenhum item vendido no período</p>
                <p className="text-[11px] text-[var(--text-3)] mt-1">
                  Apenas itens com ficha técnica cadastrada aparecem aqui.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em]">
                  Itens — pior margem primeiro
                </p>
                {data.items.map((item, idx) => {
                  const margin = item.revenue > 0
                    ? ((item.revenue - item.totalCMV) / item.revenue) * 100
                    : null
                  const unitMargin = item.price > 0
                    ? ((item.price - item.cmvUnit) / item.price) * 100
                    : null

                  return (
                    <div
                      key={idx}
                      className={`rounded-[12px] border px-4 py-3 ${rowBg(unitMargin)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--text)] truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                            {item.sales} venda{item.sales !== 1 ? 's' : ''}
                            <span className="mx-1.5">·</span>
                            CMV/un {formatCurrency(item.cmvUnit)}
                            <span className="mx-1.5">·</span>
                            Preço {formatCurrency(item.price)}
                          </p>
                          <MarginBar pct={unitMargin} />
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-[14px] font-medium ${marginColor(unitMargin)}`}>
                            {unitMargin !== null ? `${unitMargin.toFixed(1)}%` : '—'}
                          </p>
                          <p className="text-[10px] text-[var(--text-3)] mt-0.5">
                            margem
                          </p>
                        </div>
                      </div>

                      {/* Period totals */}
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[var(--border)]">
                        <div>
                          <p className="text-[9px] text-[var(--text-3)] uppercase tracking-[.05em]">Receita</p>
                          <p className="text-[12px] font-medium text-[var(--text)]">{formatCurrency(item.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[var(--text-3)] uppercase tracking-[.05em]">CMV</p>
                          <p className="text-[12px] font-medium text-[var(--text)]">{formatCurrency(item.totalCMV)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[var(--text-3)] uppercase tracking-[.05em]">Lucro</p>
                          <p className={`text-[12px] font-medium ${marginColor(margin)}`}>
                            {formatCurrency(item.revenue - item.totalCMV)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>
    </OwnerLayout>
  )
}
