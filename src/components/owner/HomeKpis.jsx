import { useMemo } from 'react'
import { formatCurrency } from '../../utils/formatters'

function KpiCard({ label, value, accent }) {
  return (
    <div
      className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <p className="font-mono-ui text-[10px] text-[var(--text-3)] uppercase tracking-[.06em] mb-1">{label}</p>
      <p className="text-[22px] font-semibold text-[var(--text)] tracking-title tabular leading-none">{value}</p>
    </div>
  )
}

export default function HomeKpis({ businesses, metrics }) {
  const totals = useMemo(() => {
    const ids = businesses.map((b) => b.id)
    return ids.reduce(
      (acc, id) => {
        const m = metrics[id] || {}
        return {
          revenue: acc.revenue + (m.revenue || 0),
          activeOrders: acc.activeOrders + (m.activeOrders || 0),
          occupiedTables: acc.occupiedTables + (m.occupiedTables || 0),
        }
      },
      { revenue: 0, activeOrders: 0, occupiedTables: 0 }
    )
  }, [businesses, metrics])

  const openCount = businesses.filter((b) => b.is_open).length

  return (
    <div className="hidden lg:grid grid-cols-4 gap-3">
      <KpiCard label="Faturamento hoje" value={formatCurrency(totals.revenue)} accent="var(--accent)" />
      <KpiCard label="Pedidos ativos" value={totals.activeOrders} accent="var(--green-text)" />
      <KpiCard label="Mesas ocupadas" value={totals.occupiedTables} accent="var(--amber-text)" />
      <KpiCard label="Abertos agora" value={openCount} accent="var(--red-text)" />
    </div>
  )
}
