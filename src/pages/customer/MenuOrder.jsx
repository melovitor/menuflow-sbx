import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconSearch, IconMoon, IconSun, IconPlus, IconMinus } from '@tabler/icons-react'
import { fetchBusinessBySlug } from '../../services/businessService'
import { fetchCategories, fetchAllActiveItems } from '../../services/menuService'
import { getCustomerSession } from '../../utils/customerSession'
import { QUANTITY_ALERT_THRESHOLD } from '../../utils/customerSession'
import { formatCurrency } from '../../utils/formatters'
import { toggleTheme } from '../../utils/theme'
import { useCartStore } from '../../stores/cartStore'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

const ORDERED_DAYS = [
  { key: 'mon', label: 'Seg' }, { key: 'tue', label: 'Ter' }, { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' }, { key: 'fri', label: 'Sex' }, { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
]

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const TAG_LABELS = { vegetarian: 'Vegetariano', vegan: 'Vegano', gluten_free: 'Sem Glúten', spicy: 'Picante' }
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

function ItemCard({ item, qty, isDark, canOrder, onAdd, onRemove }) {
  const hasPromo = item.promo_price && item.promo_price < item.price

  return (
    <div
      data-testid={`menu-item-${item.id}`}
      className="flex gap-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-3"
    >
      {/* Content */}
      <div className="flex-1 flex flex-col gap-[6px] min-w-0">
        <p className="text-[14px] font-medium text-[var(--text)] leading-snug">{item.name}</p>

        {item.description && (
          <p
            className="text-[12px] text-[var(--text-3)] leading-snug"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {item.description}
          </p>
        )}

        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => {
              const s = TAG_STYLE[tag]
              if (!s) return null
              return (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-[6px] py-[2px] rounded-full border"
                  style={{ background: isDark ? s.darkBg : s.bg, color: isDark ? s.darkText : s.text, borderColor: isDark ? s.darkBorder : s.border }}
                >
                  {TAG_LABELS[tag]}
                </span>
              )
            })}
          </div>
        )}

        {/* Price + qty control */}
        <div className="flex items-center justify-between mt-auto pt-[2px]">
          <div>
            {hasPromo ? (
              <div className="flex items-baseline gap-1">
                <span className="text-[14px] font-medium" style={{ color: '#10B981' }}>{formatCurrency(item.promo_price)}</span>
                <span className="text-[11px] text-[var(--text-3)] line-through">{formatCurrency(item.price)}</span>
              </div>
            ) : (
              <span className="text-[14px] font-medium text-accent">{formatCurrency(item.price)}</span>
            )}
          </div>

          {canOrder && (
            qty === 0 ? (
              <button
                type="button"
                data-testid={`btn-add-${item.id}`}
                onClick={() => onAdd(item)}
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                <IconPlus size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  data-testid={`btn-remove-${item.id}`}
                  onClick={() => onRemove(item.id)}
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
                >
                  <IconMinus size={13} />
                </button>
                <span className="text-[14px] font-medium text-[var(--text)] min-w-[16px] text-center">
                  {qty}
                </span>
                <button
                  type="button"
                  data-testid={`btn-add-more-${item.id}`}
                  onClick={() => onAdd(item)}
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  <IconPlus size={13} />
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Photo */}
      {item.photo_url && (
        <img
          src={item.photo_url}
          alt={item.name}
          className="flex-shrink-0 w-[80px] h-[80px] rounded-[10px] object-cover bg-[var(--bg-tertiary)] self-start"
        />
      )}
    </div>
  )
}

export default function MenuOrder() {
  const { businessSlug } = useParams()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const [session, setSession] = useState(null)
  const [business, setBusiness] = useState(null)
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [hasPlacedOrders, setHasPlacedOrders] = useState(false)

  // Modals
  const [showRecovery, setShowRecovery] = useState(false)
  const [quantityAlert, setQuantityAlert] = useState(null) // { item, newQty }

  const cart = useCartStore(businessSlug || '_')

  // Session check + data load
  useEffect(() => {
    const s = getCustomerSession(businessSlug)
    if (!s) {
      navigate(`/order/${businessSlug}/identify`, { replace: true })
      return
    }
    setSession(s)
    setHasPlacedOrders(Boolean(sessionStorage.getItem(`orders_placed_${businessSlug}`)))

    // Check for saved cart (show recovery modal once per browser session)
    const recoveryKey = `cart_recovery_done_${businessSlug}`
    if (!sessionStorage.getItem(recoveryKey)) {
      try {
        const raw = localStorage.getItem(`cart_${businessSlug}`)
        const parsed = raw ? JSON.parse(raw) : null
        const savedCount = parsed?.state?.items?.length ?? 0
        if (savedCount > 0) setShowRecovery(true)
      } catch { /* ignore */ }
      sessionStorage.setItem(recoveryKey, '1')
    }

    fetchBusinessBySlug(businessSlug)
      .then((biz) => {
        setBusiness(biz)
        return Promise.all([fetchCategories(biz.id), fetchAllActiveItems(biz.id)])
      })
      .then(([cats, allItems]) => {
        setCategories(cats)
        setItems(allItems)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessSlug, navigate])

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleAdd = useCallback((item) => {
    const currentQty = cart.items.find((i) => i.id === item.id)?.quantity ?? 0
    const newQty = currentQty + 1
    if (newQty >= QUANTITY_ALERT_THRESHOLD) {
      setQuantityAlert({ item, newQty })
      return
    }
    cart.addItem(item)
  }, [cart])

  const handleRemove = useCallback((itemId) => {
    const currentQty = cart.items.find((i) => i.id === itemId)?.quantity ?? 0
    cart.updateQuantity(itemId, currentQty - 1)
  }, [cart])

  const handleConfirmQty = () => {
    if (quantityAlert) cart.addItem(quantityAlert.item)
    setQuantityAlert(null)
  }

  const handleDiscardCart = () => {
    cart.clear()
    setShowRecovery(false)
  }

  // Filter logic
  const filteredItems = items.filter((item) => {
    const inCat = selectedCategoryId ? item.category_id === selectedCategoryId : true
    const inSearch = search.trim() ? normalize(item.name).includes(normalize(search.trim())) : true
    return inCat && inSearch
  })

  const showGrouped = !selectedCategoryId && !search.trim()
  const categoryGroups = categories
    .map((cat) => ({ cat, catItems: items.filter((i) => i.category_id === cat.id) }))
    .filter((g) => g.catItems.length > 0)

  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.total()

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div data-testid="loading-state" className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] px-6 text-center">
        <p className="text-[14px] text-[var(--text-2)]">Estabelecimento não encontrado.</p>
      </div>
    )
  }

  const firstName = session?.customerName?.split(' ')[0] ?? ''
  const canOrder = business.is_open

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* ── Cart recovery modal ── */}
      {showRecovery && (
        <Modal onClose={() => setShowRecovery(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[15px] font-medium text-[var(--text)]">Carrinho salvo</p>
              <p className="text-[13px] text-[var(--text-2)] mt-1">
                Você tinha itens no carrinho da última visita. Quer continuar?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="btn-discard-cart"
                onClick={handleDiscardCart}
                className="flex-1 h-[42px] rounded-[10px] text-[13px] font-medium border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
              >
                Descartar
              </button>
              <button
                type="button"
                data-testid="btn-recover-cart"
                onClick={() => setShowRecovery(false)}
                className="flex-1 h-[42px] rounded-[10px] text-[13px] font-medium text-white"
                style={{ background: 'var(--accent)' }}
              >
                Continuar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Quantity alert modal ── */}
      {quantityAlert && (
        <Modal onClose={() => setQuantityAlert(null)}>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[15px] font-medium text-[var(--text)]">Quantidade alta</p>
              <p className="text-[13px] text-[var(--text-2)] mt-1">
                Você quer adicionar <span className="font-medium">{quantityAlert.newQty}×</span>{' '}
                {quantityAlert.item.name}?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="btn-qty-correct"
                onClick={() => setQuantityAlert(null)}
                className="flex-1 h-[42px] rounded-[10px] text-[13px] font-medium border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
              >
                Corrigir
              </button>
              <button
                type="button"
                data-testid="btn-qty-confirm"
                onClick={handleConfirmQty}
                className="flex-1 h-[42px] rounded-[10px] text-[13px] font-medium text-white"
                style={{ background: 'var(--accent)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 h-[52px] px-4 flex items-center justify-between flex-shrink-0
          bg-[var(--bg-primary)] border-b border-[var(--border)]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-[var(--border)]" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
              {getInitials(business.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--text)] leading-none truncate">{business.name}</p>
            {firstName && (
              <p className="text-[11px] text-[var(--text-3)] leading-none mt-[3px]">
                Olá, {firstName}!
              </p>
            )}
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
              {ORDERED_DAYS.filter((d) => business.open_days.includes(d.key)).map((d) => d.label).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ── Search + Category tabs (sticky) ── */}
      <div className="sticky z-10 bg-[var(--bg-secondary)]" style={{ top: 52 }}>
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
            <input
              type="text"
              data-testid="search-input"
              placeholder="Buscar no cardápio…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedCategoryId(null) }}
              className="w-full h-[38px] pl-8 pr-3 text-[13px] rounded-[10px] outline-none
                bg-[var(--bg-primary)] border border-[var(--border-strong)]
                text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-accent"
            />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              type="button"
              data-testid="btn-category-all"
              onClick={() => { setSelectedCategoryId(null); setSearch('') }}
              className="flex-shrink-0 h-[28px] px-3 rounded-full text-[12px] font-medium border transition-colors duration-150"
              style={!selectedCategoryId && !search.trim()
                ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                : { background: 'var(--bg-primary)', color: 'var(--text-2)', borderColor: 'var(--border-strong)' }}
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
                style={selectedCategoryId === cat.id
                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                  : { background: 'var(--bg-primary)', color: 'var(--text-2)', borderColor: 'var(--border-strong)' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Items ── */}
      <div
        className="flex-1 px-4 pt-3"
        style={{ paddingBottom: (canOrder && totalItems > 0 && hasPlacedOrders) ? 148 : (canOrder && totalItems > 0) ? 100 : hasPlacedOrders ? 68 : 20 }}
      >
        {/* Cardápio vazio */}
        {items.length === 0 && (
          <div data-testid="empty-state" className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[15px] font-medium text-[var(--text-2)] mb-1">Cardápio em breve!</p>
            <p className="text-[13px] text-[var(--text-3)]">Fale com nosso atendente.</p>
          </div>
        )}

        {/* Sem resultados */}
        {items.length > 0 && filteredItems.length === 0 && (
          <div className="flex items-center justify-center py-14">
            <p className="text-[13px] text-[var(--text-3)]">Nenhum item encontrado.</p>
          </div>
        )}

        {/* Agrupado por categoria */}
        {showGrouped && categoryGroups.map(({ cat, catItems }) => (
          <div key={cat.id} className="mb-6">
            <h2 className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-2">
              {cat.name}
            </h2>
            <div className="flex flex-col gap-2">
              {catItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  qty={cart.items.find((i) => i.id === item.id)?.quantity ?? 0}
                  isDark={isDark}
                  canOrder={canOrder}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Lista plana */}
        {!showGrouped && filteredItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                qty={cart.items.find((i) => i.id === item.id)?.quantity ?? 0}
                isDark={isDark}
                canOrder={canOrder}
                onAdd={handleAdd}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom bar: track orders + cart ── */}
      {((canOrder && totalItems > 0) || hasPlacedOrders) && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--bg-primary)] border-t border-[var(--border)] flex flex-col px-4 py-3 gap-2">
          {hasPlacedOrders && (
            <button
              type="button"
              data-testid="btn-track-orders"
              onClick={() => navigate(`/order/${businessSlug}/status`)}
              className="w-full h-[40px] rounded-[10px] border border-[var(--border-strong)] text-[13px] font-medium text-[var(--text-2)] bg-[var(--bg-primary)]"
            >
              Acompanhar meu pedido →
            </button>
          )}
          {canOrder && totalItems > 0 && (
            <button
              type="button"
              data-testid="btn-view-cart"
              onClick={() => navigate(`/order/${businessSlug}/cart`)}
              className="w-full h-[52px] rounded-[12px] text-[14px] font-medium text-white flex items-center px-4 gap-3"
              style={{ background: 'var(--accent)' }}
            >
              <span className="flex-1 text-left">Ver carrinho</span>
              <span
                className="text-[11px] font-medium px-2 py-[2px] rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
              </span>
              <span className="font-medium">{formatCurrency(totalPrice)}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
