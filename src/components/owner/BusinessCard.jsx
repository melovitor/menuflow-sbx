import { useNavigate } from 'react-router-dom'
import Toggle from '../ui/Toggle'
import { toast } from '../ui/Toast'
import { formatCurrency } from '../../utils/formatters'

const CATEGORY_LABELS = {
  bar: 'Bar',
  restaurant: 'Restaurante',
  snack_bar: 'Lanchonete',
  cafeteria: 'Cafeteria',
  other: 'Outro',
}

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0)
  if (!words.length) return ''
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? ''
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

function Sparkline({ data, id }) {
  const W = 84, H = 30
  if (!data || data.length < 2) return <div style={{ width: W, height: H }} />
  const max = Math.max(...data)
  if (max === 0) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
        <line x1="0" y1={H * 0.65} x2={W} y2={H * 0.65}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    )
  }
  const pad = 3
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - v / max) * (H - pad * 2),
  }))
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const areaPath =
    `M${pts[0].x.toFixed(1)},${H} ` +
    pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${last.x.toFixed(1)},${H} Z`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${id})`} />
      <polyline points={line} fill="none" stroke="var(--accent)"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="2.5" fill="var(--accent)" />
    </svg>
  )
}

export default function BusinessCard({ business, metrics, onToggleOpen, onNavigate }) {
  const navigate = useNavigate()
  const m = metrics || {
    activeOrders: 0, occupiedTables: 0, revenue: 0,
    ticketAvg: 0, sparklineData: null,
  }
  const initials = getInitials(business.name)

  const handleToggle = async (e) => {
    e.stopPropagation()
    const wasAuto = business.schedule_enabled
    try {
      await onToggleOpen(business.id, business.is_open)
      if (wasAuto) {
        toast.success(business.is_open
          ? 'Fechado manualmente — horário automático desativado'
          : 'Aberto manualmente — horário automático desativado')
      } else {
        toast.success(business.is_open ? 'Estabelecimento fechado' : 'Estabelecimento aberto')
      }
    } catch {
      toast.error('Falha ao atualizar status. Tente novamente.')
    }
  }

  const handlePdv = (e) => {
    e.stopPropagation()
    navigate(`/owner/business/${business.id}`)
  }

  const handleSettings = (e) => {
    e.stopPropagation()
    navigate(`/owner/business/${business.id}/settings`)
  }

  return (
    <div
      data-testid={`business-card-${business.id}`}
      onClick={() => onNavigate(business.id)}
      className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 cursor-pointer
        hover:border-[var(--border-strong)] transition-colors duration-150 flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-3">
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt={business.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[var(--border)]"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0 glow-brass"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-semibold text-[var(--text)] tracking-ui truncate">
            {business.name}
          </p>
          <p className="text-[11.5px] text-[var(--text-3)] mt-[1px]">
            {CATEGORY_LABELS[business.category] ?? business.category}
            {business.address_city && (
              <> · {business.address_city}{business.address_state ? `, ${business.address_state}` : ''}</>
            )}
          </p>
        </div>

        <div
          onClick={handleToggle}
          data-testid={`toggle-open-${business.id}`}
          className="flex-shrink-0"
        >
          <Toggle checked={business.is_open} onChange={() => {}} />
        </div>
      </div>

      {/* ── Status badges ── */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {business.is_open ? (
          <span
            data-testid={`badge-status-${business.id}`}
            className="flex items-center gap-1.5 px-2.5 py-[4px] rounded-pill text-[11px] font-medium
              bg-[var(--green-bg)] text-[var(--green-text)] border border-[var(--green-border)]"
          >
            <span className="relative flex w-[7px] h-[7px]">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full w-[7px] h-[7px] bg-green-400" />
            </span>
            Aberto
          </span>
        ) : (
          <span
            data-testid={`badge-status-${business.id}`}
            className="flex items-center gap-1.5 px-2.5 py-[4px] rounded-pill text-[11px] font-medium
              bg-[var(--bg-tertiary)] text-[var(--text-3)] border border-[var(--border)]"
          >
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-3)]" />
            Fechado
          </span>
        )}
        {business.schedule_enabled && (
          <span
            data-testid={`badge-auto-${business.id}`}
            className="font-mono-ui text-[10px] text-[var(--text-3)] px-2 py-[3px] rounded-pill border border-[var(--border)] bg-[var(--bg-tertiary)]"
          >
            Auto
          </span>
        )}
        {m.activeOrders > 0 && (
          <span className="font-mono-ui text-[10px] px-2 py-[3px] rounded-pill border border-[var(--border-strong)] bg-[var(--accent-light)] text-[var(--accent-text)] dark:text-accent">
            {m.activeOrders} {m.activeOrders === 1 ? 'pedido' : 'pedidos'}
          </span>
        )}
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-3 gap-2 py-3 border-t border-[var(--border)]">
        <div data-testid={`metric-orders-${business.id}`}>
          <p className="text-[18px] font-semibold text-[var(--text)] tracking-title tabular leading-none">
            {m.activeOrders}
          </p>
          <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.06em] mt-1">
            Pedidos
          </p>
        </div>
        <div data-testid={`metric-tables-${business.id}`}>
          <p className="text-[18px] font-semibold text-[var(--text)] tracking-title tabular leading-none">
            {m.occupiedTables}
          </p>
          <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.06em] mt-1">
            Mesas
          </p>
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[var(--text)] tracking-title tabular leading-none">
            {m.ticketAvg > 0 ? formatCurrency(m.ticketAvg) : '—'}
          </p>
          <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.06em] mt-1">
            Ticket
          </p>
        </div>
      </div>

      {/* ── Revenue + sparkline ── */}
      <div className="py-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.06em]">
            Faturado · Hoje
          </p>
          {business.is_open && m.revenue > 0 && (
            <span className="flex items-center gap-1 font-mono-ui text-[9px] text-emerald-400 dark:text-emerald-400">
              <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" />
              Ao vivo
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2" data-testid={`metric-revenue-${business.id}`}>
          <div>
            <p className="text-[16px] font-semibold text-[var(--text)] tracking-title tabular leading-none">
              {formatCurrency(m.revenue)}
            </p>
            {m.revenue === 0 && (
              <p className="font-mono-ui text-[9px] text-[var(--text-3)] uppercase tracking-[.06em] mt-1">
                Sem movimento
              </p>
            )}
          </div>
          <Sparkline data={m.sparklineData} id={business.id} />
        </div>
      </div>

      {/* ── Footer quick links ── */}
      <div className="flex items-center border-t border-[var(--border)] pt-3 mt-auto gap-2">
        <button
          type="button"
          data-testid={`btn-pdv-${business.id}`}
          onClick={handlePdv}
          className="flex-1 text-[12px] font-medium text-[var(--accent-text)] dark:text-accent hover:opacity-75 transition-opacity text-left"
        >
          Painel ›
        </button>
        <div className="w-px h-3 bg-[var(--border)]" />
        <button
          type="button"
          data-testid={`btn-settings-${business.id}`}
          onClick={handleSettings}
          className="flex-1 text-[12px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors text-right"
        >
          Configurações
        </button>
      </div>
    </div>
  )
}
