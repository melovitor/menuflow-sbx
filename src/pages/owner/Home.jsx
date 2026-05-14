import { useNavigate } from 'react-router-dom'
import { IconPlus, IconChevronRight, IconBuildingStore } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Toggle from '../../components/ui/Toggle'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { useMyBusinesses } from '../../hooks/useBusiness'
import { toast } from '../../components/ui/Toast'
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

function BusinessCard({ business, metrics, onToggleOpen, onNavigate }) {
  const m = metrics || { activeOrders: 0, occupiedTables: 0, revenue: 0 }
  const initials = getInitials(business.name)

  const handleToggle = async (e) => {
    e.stopPropagation()
    try {
      await onToggleOpen(business.id, business.is_open)
      toast.success(business.is_open ? 'Estabelecimento fechado' : 'Estabelecimento aberto')
    } catch {
      toast.error('Falha ao atualizar status. Tente novamente.')
    }
  }

  return (
    <div
      data-testid={`business-card-${business.id}`}
      onClick={() => onNavigate(business.id)}
      className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-[14px] cursor-pointer hover:border-[var(--border-strong)] transition-colors duration-150"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">

        {/* Logo / initials */}
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt={business.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[var(--border)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0">
            {initials}
          </div>
        )}

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px] truncate">
            {business.name}
          </p>
          <p className="text-[11px] text-[var(--text-3)] mt-[1px]">
            {CATEGORY_LABELS[business.category] ?? business.category}
            {business.address_city && (
              <> · {business.address_city}{business.address_state ? `, ${business.address_state}` : ''}</>
            )}
          </p>
        </div>

        {/* is_open toggle + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div onClick={handleToggle} data-testid={`toggle-open-${business.id}`}>
            <Toggle checked={business.is_open} onChange={() => {}} />
          </div>
          <IconChevronRight size={16} className="text-[var(--text-3)]" />
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        <Badge variant={business.is_open ? 'open' : 'closed'} data-testid={`badge-status-${business.id}`}>
          {business.is_open ? 'Aberto' : 'Fechado'}
        </Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">

        <div data-testid={`metric-orders-${business.id}`}>
          <p className="text-[18px] font-medium text-[var(--text)] tracking-[-0.5px] leading-none">
            {m.activeOrders}
          </p>
          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-[.06em] mt-[4px] leading-tight">
            Pedidos<br />ativos
          </p>
        </div>

        <div data-testid={`metric-tables-${business.id}`}>
          <p className="text-[18px] font-medium text-[var(--text)] tracking-[-0.5px] leading-none">
            {m.occupiedTables}
          </p>
          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-[.06em] mt-[4px] leading-tight">
            Mesas<br />ocupadas
          </p>
        </div>

        <div data-testid={`metric-revenue-${business.id}`}>
          <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.3px] leading-none">
            {formatCurrency(m.revenue)}
          </p>
          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-[.06em] mt-[4px] leading-tight">
            Faturado<br />hoje
          </p>
        </div>

      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { businesses, metrics, loading, error, toggleIsOpen } = useMyBusinesses()

  const handleNavigate = (businessId) => {
    navigate(`/owner/business/${businessId}`)
  }

  return (
    <OwnerLayout>
      <div className="px-5 py-5">

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[18px] font-medium text-[var(--text)] tracking-[-0.3px]">
              Meus estabelecimentos
            </h1>
            {!loading && businesses.length > 0 && (
              <p className="text-[12px] text-[var(--text-3)] mt-[2px]">
                {businesses.length} {businesses.length === 1 ? 'estabelecimento' : 'estabelecimentos'}
              </p>
            )}
          </div>
          <button
            type="button"
            data-testid="btn-new-business"
            onClick={() => navigate('/owner/business/new')}
            className="flex items-center gap-[6px] px-3 py-2 text-[13px] font-medium text-accent
              border border-[var(--border-strong)] rounded-[10px] bg-[var(--bg-primary)]
              hover:border-accent transition-colors duration-150"
          >
            <IconPlus size={15} />
            Novo
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div data-testid="error-state" className="text-center py-16">
            <p className="text-[13px] text-[var(--text-2)] mb-1">
              Não foi possível carregar seus estabelecimentos.
            </p>
            <p className="text-[12px] text-[var(--text-3)]">Verifique sua conexão e recarregue a página.</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && businesses.length === 0 && (
          <div data-testid="empty-state" className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-light)] border border-accent flex items-center justify-center mb-4">
              <IconBuildingStore size={24} className="text-accent dark:text-[var(--accent-text)]" />
            </div>
            <h2 className="text-[15px] font-medium text-[var(--text)] mb-2">
              Nenhum estabelecimento ainda
            </h2>
            <p className="text-[13px] text-[var(--text-2)] mb-6 max-w-[240px]">
              Cadastre seu bar ou restaurante e comece a operar agora
            </p>
            <button
              type="button"
              data-testid="btn-new-business-empty"
              onClick={() => navigate('/owner/business/new')}
              className="flex items-center gap-2 px-5 py-3 text-[14px] font-medium text-white bg-accent rounded-[10px] hover:bg-accent/90 transition-colors"
            >
              <IconPlus size={16} />
              Criar estabelecimento
            </button>
          </div>
        )}

        {/* Business list */}
        {!loading && !error && businesses.length > 0 && (
          <div data-testid="business-list" className="flex flex-col gap-3">
            {businesses.map((b) => (
              <BusinessCard
                key={b.id}
                business={b}
                metrics={metrics[b.id]}
                onToggleOpen={toggleIsOpen}
                onNavigate={handleNavigate}
              />
            ))}

            {/* Add new — dashed card */}
            <button
              type="button"
              data-testid="btn-new-business-list"
              onClick={() => navigate('/owner/business/new')}
              className="w-full flex items-center justify-center gap-2 p-4 text-[13px] font-medium text-[var(--text-2)]
                border border-dashed border-[var(--border-strong)] rounded-card bg-[var(--bg-primary)]
                hover:border-accent hover:text-accent transition-colors duration-150"
            >
              <IconPlus size={15} />
              Novo estabelecimento
            </button>
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
