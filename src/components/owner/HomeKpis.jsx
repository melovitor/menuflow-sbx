import { useMemo } from 'react'
import { formatCurrency } from '../../utils/formatters'

function KpiCard({ label, value, sub, accent, dim = false }) {
  return (
    <div
      className={`bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3.5 ${dim ? 'opacity-40' : ''}`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.07em] mb-2">{label}</p>
      <p className="text-[22px] font-semibold text-[var(--text)] tracking-title tabular leading-none">{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-3)] mt-1.5 leading-snug">{sub}</p>}
    </div>
  )
}

export default function HomeKpis({ businesses, metrics }) {
  const totals = useMemo(() => {
    return businesses.reduce(
      (acc, b) => {
        const m = metrics[b.id] || {}
        return {
          revenue:        acc.revenue        + (m.revenue        || 0),
          activeOrders:   acc.activeOrders   + (m.activeOrders   || 0),
          occupiedTables: acc.occupiedTables + (m.occupiedTables || 0),
          totalTables:    acc.totalTables    + (m.totalTables    || 0),
          closedCount:    acc.closedCount    + (m.closedCount    || 0),
        }
      },
      { revenue: 0, activeOrders: 0, occupiedTables: 0, totalTables: 0, closedCount: 0 }
    )
  }, [businesses, metrics])

  const openCount   = businesses.filter((b) => b.is_open).length
  const totalCount  = businesses.length
  const ticketAvg   = totals.closedCount > 0 ? totals.revenue / totals.closedCount : 0

  const closedNames = businesses
    .filter((b) => !b.is_open)
    .map((b) => b.name.split(' ')[0])
  const subtitleAbertos = closedNames.length === 0
    ? 'Todos abertos'
    : closedNames.length === 1
      ? `${closedNames[0]} fechado`
      : `${closedNames.length} fechados`

  return (
    <div className="hidden lg:grid grid-cols-5 gap-3">
      <KpiCard
        label="Abertos agora"
        value={`${openCount}/${totalCount}`}
        sub={subtitleAbertos}
        accent="var(--green-text)"
      />
      <KpiCard
        label="Pedidos ativos"
        value={totals.activeOrders}
        sub={totals.activeOrders === 1 ? '1 em andamento' : `${totals.activeOrders} em andamento`}
        accent="var(--accent)"
      />
      <KpiCard
        label="Faturado hoje"
        value={formatCurrency(totals.revenue)}
        sub={ticketAvg > 0 ? `ticket médio ${formatCurrency(ticketAvg)}` : 'nenhum fechamento hoje'}
        accent="var(--amber-text)"
      />
      <KpiCard
        label="Mesas ativas"
        value={`${totals.occupiedTables}/${totals.totalTables}`}
        sub={`de ${totals.totalTables} mesas no total`}
        accent="var(--red-text)"
      />
      <KpiCard
        label="WhatsApp IA"
        value="Em breve"
        sub="recurso v3"
        accent="var(--border-strong)"
        dim
      />
    </div>
  )
}
