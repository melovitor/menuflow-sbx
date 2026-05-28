import { IconChevronRight } from '@tabler/icons-react'
import Toggle from '../ui/Toggle'
import Badge from '../ui/Badge'
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

export default function BusinessCard({ business, metrics, onToggleOpen, onNavigate }) {
  const m = metrics || { activeOrders: 0, occupiedTables: 0, revenue: 0 }
  const initials = getInitials(business.name)

  const handleToggle = async (e) => {
    e.stopPropagation()
    const wasAuto = business.schedule_enabled
    try {
      await onToggleOpen(business.id, business.is_open)
      if (wasAuto) {
        toast.success(business.is_open
          ? 'Fechado manualmente — horário automático desativado'
          : 'Aberto manualmente — horário automático desativado'
        )
      } else {
        toast.success(business.is_open ? 'Estabelecimento fechado' : 'Estabelecimento aberto')
      }
    } catch {
      toast.error('Falha ao atualizar status. Tente novamente.')
    }
  }

  return (
    <div
      data-testid={`business-card-${business.id}`}
      onClick={() => onNavigate(business.id)}
      className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 cursor-pointer
        hover:border-[var(--border-strong)] transition-colors duration-150"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3.5">
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

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div onClick={handleToggle} data-testid={`toggle-open-${business.id}`}>
            <Toggle checked={business.is_open} onChange={() => {}} />
          </div>
          <IconChevronRight size={15} className="text-[var(--text-3)]" />
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3.5">
        <Badge variant={business.is_open ? 'open' : 'closed'} data-testid={`badge-status-${business.id}`}>
          {business.is_open ? 'Aberto' : 'Fechado'}
        </Badge>
        {business.schedule_enabled && (
          <span
            data-testid={`badge-auto-${business.id}`}
            className="font-mono-ui text-[10px] text-[var(--text-3)] px-2 py-[3px] rounded-pill border border-[var(--border)] bg-[var(--bg-tertiary)]"
          >
            Horário automático
          </span>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
        <div data-testid={`metric-orders-${business.id}`}>
          <p className="text-[18px] font-semibold text-[var(--text)] tracking-title tabular leading-none">
            {m.activeOrders}
          </p>
          <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.06em] mt-1 leading-tight">
            Pedidos<br />ativos
          </p>
        </div>
        <div data-testid={`metric-tables-${business.id}`}>
          <p className="text-[18px] font-semibold text-[var(--text)] tracking-title tabular leading-none">
            {m.occupiedTables}
          </p>
          <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.06em] mt-1 leading-tight">
            Mesas<br />ocupadas
          </p>
        </div>
        <div data-testid={`metric-revenue-${business.id}`}>
          <p className="text-[14px] font-semibold text-[var(--text)] tracking-title tabular leading-none">
            {formatCurrency(m.revenue)}
          </p>
          <p className="font-mono-ui text-[9.5px] text-[var(--text-3)] uppercase tracking-[.06em] mt-1 leading-tight">
            Faturado<br />hoje
          </p>
        </div>
      </div>
    </div>
  )
}
