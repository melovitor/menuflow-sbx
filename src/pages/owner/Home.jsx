import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconBuildingStore } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import BusinessCard from '../../components/owner/BusinessCard'
import HomeKpis from '../../components/owner/HomeKpis'
import { useMyBusinesses } from '../../hooks/useBusiness'

const FILTERS = [
  ['todos', 'Todos'],
  ['abertos', 'Abertos'],
  ['fechados', 'Fechados'],
]

function FilterPills({ value, onChange, counts }) {
  return (
    <div className="inline-flex bg-[var(--bg-primary)] border border-[var(--border)] rounded-pill p-1">
      {FILTERS.map(([id, label]) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`px-3.5 py-1.5 rounded-pill text-[12.5px] font-medium transition-colors duration-150
              ${active
                ? 'bg-[var(--bg-tertiary)] text-[var(--text)] shadow-[inset_0_0_0_1px_var(--border-strong)]'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'}`}
          >
            {label} <span className="font-mono-ui text-[11px] text-[var(--text-3)]">· {counts[id]}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { businesses, metrics, loading, error, toggleIsOpen } = useMyBusinesses()
  const [filter, setFilter] = useState('todos')

  const handleNavigate = (businessId) => navigate(`/owner/business/${businessId}`)

  const counts = useMemo(() => ({
    todos: businesses.length,
    abertos: businesses.filter((b) => b.is_open).length,
    fechados: businesses.filter((b) => !b.is_open).length,
  }), [businesses])

  const visible = useMemo(() => {
    if (filter === 'abertos') return businesses.filter((b) => b.is_open)
    if (filter === 'fechados') return businesses.filter((b) => !b.is_open)
    return businesses
  }, [businesses, filter])

  const openCount = counts.abertos

  return (
    <OwnerLayout>
      <div className="w-full max-w-[1240px] mx-auto px-5 py-5 lg:px-8 lg:py-8 flex flex-col gap-5 lg:gap-7">

        {/* Hero / section header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] lg:text-[28px] font-semibold text-[var(--text)] tracking-title leading-tight">
              Meus estabelecimentos
            </h1>
            {!loading && businesses.length > 0 && (
              <p className="text-[12px] lg:text-[14px] text-[var(--text-3)] mt-1">
                {businesses.length} {businesses.length === 1 ? 'estabelecimento' : 'estabelecimentos'}
                {openCount > 0 && <> · {openCount} {openCount === 1 ? 'aberto' : 'abertos'} agora</>}
              </p>
            )}
          </div>
          <button
            type="button"
            data-testid="btn-new-business"
            onClick={() => navigate('/owner/business/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-[var(--accent-text)]
              border border-[var(--border-strong)] rounded-button bg-[var(--bg-primary)]
              hover:border-accent transition-colors duration-150 flex-shrink-0"
          >
            <IconPlus size={15} />
            <span className="hidden sm:inline">Novo estabelecimento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* KPIs agregados (desktop) */}
        {!loading && !error && businesses.length > 0 && (
          <HomeKpis businesses={businesses} metrics={metrics} />
        )}

        {/* Filtro */}
        {!loading && !error && businesses.length > 0 && (
          <div className="flex items-center justify-between">
            <FilterPills value={filter} onChange={setFilter} counts={counts} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div data-testid="error-state" className="text-center py-20">
            <p className="text-[14px] text-[var(--text-2)] mb-1">
              Não foi possível carregar seus estabelecimentos.
            </p>
            <p className="text-[13px] text-[var(--text-3)]">Verifique sua conexão e recarregue a página.</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && businesses.length === 0 && (
          <div data-testid="empty-state" className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-full bg-[var(--accent-light)] border border-accent flex items-center justify-center mb-5"
              style={{ boxShadow: '0 0 28px -8px var(--glow-2)' }}
            >
              <IconBuildingStore size={26} className="text-[var(--accent-text)]" />
            </div>
            <h2 className="text-[16px] font-semibold text-[var(--text)] mb-2">
              Nenhum estabelecimento ainda
            </h2>
            <p className="text-[13.5px] text-[var(--text-2)] mb-6 max-w-[260px]">
              Cadastre seu bar ou restaurante e comece a operar agora.
            </p>
            <button
              type="button"
              data-testid="btn-new-business-empty"
              onClick={() => navigate('/owner/business/new')}
              className="inline-flex items-center gap-2 px-5 py-3 text-[14px] font-semibold rounded-button glow-brass glow-brass-hover transition-all"
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
            >
              <IconPlus size={16} />
              Criar estabelecimento
            </button>
          </div>
        )}

        {/* Lista / grid */}
        {!loading && !error && businesses.length > 0 && (
          <div data-testid="business-list" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
            {visible.map((b) => (
              <BusinessCard
                key={b.id}
                business={b}
                metrics={metrics[b.id]}
                onToggleOpen={toggleIsOpen}
                onNavigate={handleNavigate}
              />
            ))}

            {/* Adicionar — card tracejado (somente sem filtro) */}
            {filter === 'todos' && (
              <button
                type="button"
                data-testid="btn-new-business-list"
                onClick={() => navigate('/owner/business/new')}
                className="w-full min-h-[120px] flex items-center justify-center gap-2 p-4 text-[13px] font-medium text-[var(--text-2)]
                  border border-dashed border-[var(--border-strong)] rounded-card bg-transparent
                  hover:border-accent hover:text-[var(--accent-text)] transition-colors duration-150"
              >
                <IconPlus size={15} />
                Novo estabelecimento
              </button>
            )}
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
