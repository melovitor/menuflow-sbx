import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { IconSearch, IconCheck, IconClock, IconMoon, IconSun } from '@tabler/icons-react'
import LgpdFooter from '../../components/layout/LgpdFooter'
import { supabase } from '../../services/supabase'
import { fetchBusinessBySlug, fetchTableByNumber } from '../../services/businessService'
import { fetchCategories, fetchAllActiveItems } from '../../services/menuService'
import { formatCurrency } from '../../utils/formatters'
import { toggleTheme } from '../../utils/theme'
import Spinner from '../../components/ui/Spinner'

const TAG_LABELS = {
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  gluten_free: 'Sem Glúten',
  spicy: 'Picante',
}

// [dark, light] pairs per tag
const TAG_STYLE = {
  vegetarian: { darkBg: '#022c22', darkText: '#6EE7B7', darkBorder: '#065F46', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  vegan:      { darkBg: '#052e16', darkText: '#86EFAC', darkBorder: '#166534', bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  gluten_free:{ darkBg: '#1A1200', darkText: '#FDE68A', darkBorder: '#3D2E00', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  spicy:      { darkBg: '#1A0808', darkText: '#FCA5A5', darkBorder: '#3D1212', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
}

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? '?'
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

function ItemCard({ item, isDark }) {
  const hasPromo = item.promo_price && item.promo_price < item.price
  return (
    <div
      data-testid={`menu-item-${item.id}`}
      className="flex gap-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-3"
    >
      {/* Text content */}
      <div className="flex-1 flex flex-col gap-[6px] min-w-0">
        <p className="text-[14px] font-medium text-[var(--text)] leading-snug">{item.name}</p>

        {item.description && (
          <p
            className="text-[12px] text-[var(--text-3)] leading-snug"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => {
              const s = TAG_STYLE[tag]
              if (!s) return null
              return (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-[6px] py-[2px] rounded-full border"
                  style={{
                    background: isDark ? s.darkBg : s.bg,
                    color: isDark ? s.darkText : s.text,
                    borderColor: isDark ? s.darkBorder : s.border,
                  }}
                >
                  {TAG_LABELS[tag]}
                </span>
              )
            })}
          </div>
        )}

        {/* Price + prep time */}
        <div className="flex items-center gap-3 mt-auto pt-[2px]">
          {hasPromo ? (
            <div className="flex items-baseline gap-1">
              <span className="text-[14px] font-medium" style={{ color: '#10B981' }}>
                {formatCurrency(item.promo_price)}
              </span>
              <span className="text-[11px] text-[var(--text-3)] line-through">
                {formatCurrency(item.price)}
              </span>
            </div>
          ) : (
            <span className="text-[14px] font-medium text-accent">
              {formatCurrency(item.price)}
            </span>
          )}

          {item.prep_time_minutes > 0 && (
            <span className="flex items-center gap-[3px] text-[11px] text-[var(--text-3)]">
              <IconClock size={11} />
              ≈ {item.prep_time_minutes} min
            </span>
          )}
        </div>
      </div>

      {/* Photo */}
      {item.photo_url && (
        <img
          src={item.photo_url}
          alt={item.name}
          className="flex-shrink-0 w-[80px] h-[80px] rounded-[10px] object-cover bg-[var(--bg-tertiary)]"
        />
      )}
    </div>
  )
}

export default function MenuReadOnly() {
  const { businessSlug, tableNumber } = useParams()
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const [business, setBusiness] = useState(null)
  const [table, setTable] = useState(null)
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)

  const [calling, setCalling] = useState(false)
  const [callId, setCallId] = useState(null)

  // Load business + table + menu
  useEffect(() => {
    const load = async () => {
      const biz = await fetchBusinessBySlug(businessSlug)
      setBusiness(biz)
      const [tbl, cats, allItems] = await Promise.all([
        fetchTableByNumber(biz.id, parseInt(tableNumber, 10)),
        fetchCategories(biz.id),
        fetchAllActiveItems(biz.id),
      ])
      setTable(tbl)
      setCategories(cats)
      setItems(allItems)
    }
    load()
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [businessSlug, tableNumber])

  // Realtime: reset waiter button when call is answered
  useEffect(() => {
    if (!callId) return
    const ch = supabase
      .channel(`waiter-call-${callId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'waiter_calls', filter: `id=eq.${callId}` },
        (payload) => {
          if (payload.new.status === 'answered') setCallId(null)
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [callId])

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleCallWaiter = async () => {
    if (calling || callId || !table || !business) return
    setCalling(true)
    try {
      const { data } = await supabase
        .from('waiter_calls')
        .insert({ business_id: business.id, table_id: table.id, status: 'pending' })
        .select('id')
        .single()
      if (data) setCallId(data.id)
    } catch {
      // silent — button stays interactive for retry
    } finally {
      setCalling(false)
    }
  }

  // Filter logic
  const filteredItems = items.filter((item) => {
    const inCat = selectedCategoryId ? item.category_id === selectedCategoryId : true
    const inSearch = search.trim()
      ? item.name.toLowerCase().includes(search.trim().toLowerCase())
      : true
    return inCat && inSearch
  })

  const showGrouped = !selectedCategoryId && !search.trim()
  const categoryGroups = categories
    .map((cat) => ({ cat, catItems: items.filter((i) => i.category_id === cat.id) }))
    .filter((g) => g.catItems.length > 0)

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        data-testid="loading-state"
        className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────
  if (notFound || !business || !table) {
    return (
      <div
        data-testid="error-state"
        className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-secondary)] px-6 text-center"
      >
        <p className="text-[15px] font-medium text-[var(--text)] mb-1">Mesa não encontrada</p>
        <p className="text-[13px] text-[var(--text-3)]">
          Verifique o QR Code e tente novamente.
        </p>
      </div>
    )
  }

  const waiterCalled = !!callId

  // ── Main render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 h-[52px] px-4 flex items-center justify-between flex-shrink-0
          bg-[var(--bg-primary)] border-b border-[var(--border)]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-[var(--border)]"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
              {getInitials(business.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--text)] leading-none truncate">
              {business.name}
            </p>
            <p className="text-[11px] text-[var(--text-3)] leading-none mt-[3px]">
              Mesa {table.number}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="btn-toggle-theme"
          onClick={handleToggleTheme}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0
            border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
        >
          {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </header>

      {/* ── Closed banner ── */}
      {!business.is_open && (
        <div
          data-testid="closed-banner"
          className="px-4 py-3 border-b border-[var(--amber-border)]"
          style={{ background: 'var(--amber-bg)' }}
        >
          <p className="text-[13px] font-medium text-[var(--amber-text)]">
            Estamos fechados agora. Volte em breve!
          </p>
          {(business.opens_at || business.closes_at) && (
            <p className="text-[12px] text-[var(--amber-text)] mt-[2px] opacity-75">
              {business.opens_at && `Abre às ${business.opens_at.slice(0, 5)}`}
              {business.opens_at && business.closes_at && ' · '}
              {business.closes_at && `Fecha às ${business.closes_at.slice(0, 5)}`}
            </p>
          )}
          {business.open_days?.length > 0 && (
            <p className="text-[12px] text-[var(--amber-text)] mt-[1px] opacity-75">
              {['mon','tue','wed','thu','fri','sat','sun']
                .filter((d) => business.open_days.includes(d))
                .map((d) => ({ mon:'Seg',tue:'Ter',wed:'Qua',thu:'Qui',fri:'Sex',sat:'Sáb',sun:'Dom' })[d])
                .join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ── Search + Category tabs (sticky) ── */}
      <div className="sticky z-10 bg-[var(--bg-secondary)]" style={{ top: 52 }}>
        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <IconSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none"
            />
            <input
              type="text"
              data-testid="search-input"
              placeholder="Buscar no cardápio…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedCategoryId(null) }}
              className="w-full h-[38px] pl-8 pr-3 text-[13px] rounded-[10px] outline-none
                bg-[var(--bg-primary)] border border-[var(--border-strong)]
                text-[var(--text)] placeholder:text-[var(--text-3)]
                focus:border-accent"
            />
          </div>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div
            className="flex gap-2 px-4 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            <button
              type="button"
              data-testid="btn-category-all"
              onClick={() => { setSelectedCategoryId(null); setSearch('') }}
              className="flex-shrink-0 h-[28px] px-3 rounded-full text-[12px] font-medium border transition-colors duration-150"
              style={!selectedCategoryId && !search.trim() ? {
                background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)',
              } : {
                background: 'var(--bg-primary)', color: 'var(--text-2)', borderColor: 'var(--border-strong)',
              }}
            >
              Todos
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                data-testid={`btn-category-${cat.id}`}
                onClick={() => { setSelectedCategoryId(cat.id); setSearch('') }}
                className="flex-shrink-0 h-[28px] px-3 rounded-full text-[12px] font-medium border transition-colors duration-150"
                style={selectedCategoryId === cat.id ? {
                  background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)',
                } : {
                  background: 'var(--bg-primary)', color: 'var(--text-2)', borderColor: 'var(--border-strong)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Items ── */}
      <div className="flex-1 px-4 pt-3" style={{ paddingBottom: business.is_open ? 88 : 20 }}>

        {/* Cardápio vazio */}
        {items.length === 0 && (
          <div
            data-testid="empty-state"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <p className="text-[15px] font-medium text-[var(--text-2)] mb-1">
              Cardápio em breve!
            </p>
            <p className="text-[13px] text-[var(--text-3)]">
              Fale com nosso atendente.
            </p>
          </div>
        )}

        {/* Sem resultados na busca */}
        {items.length > 0 && filteredItems.length === 0 && (
          <div className="flex items-center justify-center py-14">
            <p className="text-[13px] text-[var(--text-3)]">Nenhum item encontrado.</p>
          </div>
        )}

        {/* Agrupado por categoria (Todos, sem busca) */}
        {showGrouped && categoryGroups.map(({ cat, catItems }) => (
          <div key={cat.id} className="mb-6">
            <h2 className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-2">
              {cat.name}
            </h2>
            <div className="flex flex-col gap-2">
              {catItems.map((item) => (
                <ItemCard key={item.id} item={item} isDark={isDark} />
              ))}
            </div>
          </div>
        ))}

        {/* Lista plana (categoria selecionada ou buscando) */}
        {!showGrouped && filteredItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} isDark={isDark} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: Chamar Garçom ── */}
      {business.is_open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-20 px-4 py-3
            bg-[var(--bg-primary)] border-t border-[var(--border)]"
        >
          <button
            type="button"
            data-testid="btn-call-waiter"
            onClick={handleCallWaiter}
            disabled={waiterCalled || calling}
            className="w-full h-[48px] rounded-[12px] text-[14px] font-medium
              flex items-center justify-center gap-2 transition-colors duration-150"
            style={waiterCalled ? {
              background: 'var(--bg-tertiary)',
              color: 'var(--text-3)',
              border: '1px solid var(--border)',
            } : {
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            {calling ? (
              <Spinner size="sm" />
            ) : waiterCalled ? (
              <>
                <IconCheck size={16} />
                Garçom chamado
              </>
            ) : (
              '🤚  Chamar Garçom'
            )}
          </button>
        </div>
      )}
      <LgpdFooter className="border-t border-[var(--border)]" />
    </div>
  )
}
