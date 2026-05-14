import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconBellRinging, IconPlus, IconMinus,
  IconSearch, IconLogout, IconVolume, IconVolumeOff, IconMoon,
  IconSun, IconPencil, IconCheck,
} from '@tabler/icons-react'
import { supabase } from '../../services/supabase'
import {
  fetchTables, updateTableStatus, fetchPendingWaiterCalls,
  answerWaiterCall, createTable,
} from '../../services/businessService'
import { fetchCategories, fetchAllActiveItems } from '../../services/menuService'
import { createFullOrder, fetchTableOrders, cancelOrder } from '../../services/orderService'
import { toast } from '../../components/ui/Toast'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, formatDuration } from '../../utils/formatters'
import { toggleTheme } from '../../utils/theme'
import { useAudio } from '../../hooks/useAudio'

const QUANTITY_ALERT_THRESHOLD = 10

const TABLE_COLORS = {
  dark: {
    free:            { bg: '#042918', border: '#0D3320', color: '#6EE7B7' },
    occupied:        { bg: '#1A1030', border: '#3D2060', color: '#A78BFA' },
    waiting_payment: { bg: '#1A0D00', border: '#3D2200', color: '#FDBA74' },
  },
  light: {
    free:            { bg: '#EAF3DE', border: '#C0DD97', color: '#3B6D11' },
    occupied:        { bg: '#EDE9FE', border: '#AFA9EC', color: '#3C3489' },
    waiting_payment: { bg: '#FAEEDA', border: '#F0997B', color: '#712B13' },
  },
}

const TABLE_STATUS_LABEL = {
  free: 'Livre',
  occupied: 'Ocupada',
  waiting_payment: 'Aguardando',
}

const ORDER_STATUS_LABEL = {
  pending: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
}

const ORDER_STATUS_STYLE = {
  pending: 'bg-[var(--red-bg)] border-[var(--red-border)] text-[var(--red-text)]',
  preparing: 'bg-[var(--amber-bg)] border-[var(--amber-border)] text-[var(--amber-text)]',
  ready: 'bg-[var(--green-bg)] border-[var(--green-border)] text-[var(--green-text)]',
  delivered: 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-3)]',
}

const getStaffSession = () => {
  try {
    return JSON.parse(localStorage.getItem('staff_session') || 'null')
  } catch { return null }
}

export default function PDV() {
  const navigate = useNavigate()
  const session = getStaffSession()
  const { businessId, businessName } = session || {}

  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )

  // View
  const [view, setView] = useState('map')
  const [selectedTable, setSelectedTable] = useState(null)
  const [orderTab, setOrderTab] = useState('menu') // 'orders' | 'menu'

  // Data
  const [tables, setTables] = useState([])
  const [waiterCalls, setWaiterCalls] = useState([])
  const [categories, setCategories] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [now, setNow] = useState(Date.now())

  // Existing orders for selected table
  const [tableOrders, setTableOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  // Order panel
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [sending, setSending] = useState(false)

  // Modals
  const [showCallsModal, setShowCallsModal] = useState(false)
  const [showNewTableModal, setShowNewTableModal] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('')
  const [creatingTable, setCreatingTable] = useState(false)
  const [quantityAlert, setQuantityAlert] = useState(null)
  const [notesTarget, setNotesTarget] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')

  // Sound
  const { enabled: audioEnabled, enable: enableAudio, play: playSound } = useAudio(['/sounds/waiter-call.wav'])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!businessId) return
    setLoading(true)
    Promise.all([
      fetchTables(businessId),
      fetchPendingWaiterCalls(businessId),
      fetchCategories(businessId),
      fetchAllActiveItems(businessId),
    ])
      .then(([tbls, calls, cats, items]) => {
        setTables(tbls)
        setWaiterCalls(calls)
        setCategories(cats.filter((c) => c.is_active))
        setAllItems(items)
      })
      .catch(() => toast.error('Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [businessId])

  // Realtime: tables
  useEffect(() => {
    if (!businessId) return
    const ch = supabase
      .channel(`pdv-tables-${businessId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tables',
        filter: `business_id=eq.${businessId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTables((prev) =>
            [...prev, payload.new].sort((a, b) => a.number - b.number)
          )
        } else if (payload.eventType === 'UPDATE') {
          setTables((prev) =>
            prev.map((t) => (t.id === payload.new.id ? payload.new : t))
          )
          setSelectedTable((prev) =>
            prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev
          )
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [businessId])

  // Realtime: waiter calls
  useEffect(() => {
    if (!businessId) return
    const ch = supabase
      .channel(`pdv-calls-${businessId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'waiter_calls',
        filter: `business_id=eq.${businessId}`,
      }, async (payload) => {
        try {
          const calls = await fetchPendingWaiterCalls(businessId)
          if (payload.eventType === 'INSERT') {
            playSound('/sounds/waiter-call.wav')
          }
          setWaiterCalls(calls)
        } catch {}
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [businessId])

  // Realtime: order status updates (for the Pedidos tab)
  useEffect(() => {
    if (!businessId) return
    const ch = supabase
      .channel(`pdv-orders-${businessId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `business_id=eq.${businessId}`,
      }, (payload) => {
        const updated = payload.new
        setTableOrders((prev) => {
          if (!prev.find((o) => o.id === updated.id)) return prev
          if (updated.status === 'cancelled' || updated.status === 'closed') {
            return prev.filter((o) => o.id !== updated.id)
          }
          return prev.map((o) => o.id === updated.id ? { ...o, status: updated.status } : o)
        })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [businessId])

  const tableCardStyle = (status) => {
    const palette = TABLE_COLORS[isDark ? 'dark' : 'light']
    const s = palette[status] || palette.free
    return {
      background: s.bg,
      borderColor: s.border,
      color: s.color,
      borderWidth: '1px',
      borderStyle: 'solid',
    }
  }

  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const filteredItems = allItems.filter((item) => {
    const inCategory = selectedCategoryId ? item.category_id === selectedCategoryId : true
    const inSearch = search ? normalize(item.name).includes(normalize(search)) : true
    return inCategory && inSearch
  })

  const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0)

  const loadTableOrders = async (tid) => {
    setLoadingOrders(true)
    try {
      const orders = await fetchTableOrders(tid)
      setTableOrders(orders)
    } catch {
      // silent — don't block the UI
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleSelectTable = (table) => {
    setSelectedTable(table)
    setCart([])
    setSearch('')
    setSelectedCategoryId(null)
    setOrderTab(table.status !== 'free' ? 'orders' : 'menu')
    setView('order')
    loadTableOrders(table.id)

    // Answer all pending waiter calls for this table
    const pendingCalls = waiterCalls.filter(c => c.table_id === table.id)
    if (pendingCalls.length > 0) {
      pendingCalls.forEach(c => answerWaiterCall(c.id).catch(() => {}))
      setWaiterCalls(prev => prev.filter(c => c.table_id !== table.id))
    }
  }

  const handleBackToMap = () => {
    setView('map')
    setSelectedTable(null)
    setTableOrders([])
    setCart([])
    setSearch('')
  }

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id)
      const newQty = (existing?.quantity || 0) + 1

      if (newQty >= QUANTITY_ALERT_THRESHOLD) {
        setQuantityAlert({ item, pendingQty: newQty, isExisting: !!existing })
        return prev
      }

      if (existing) {
        return prev.map((c) =>
          c.itemId === item.id ? { ...c, quantity: newQty } : c
        )
      }
      return [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name,
          unitPrice: item.promo_price ?? item.price,
          quantity: 1,
          notes: '',
        },
      ]
    })
  }

  const confirmQuantityAlert = () => {
    const { item, pendingQty, isExisting } = quantityAlert
    setCart((prev) => {
      if (isExisting) {
        return prev.map((c) =>
          c.itemId === item.id ? { ...c, quantity: pendingQty } : c
        )
      }
      return [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name,
          unitPrice: item.promo_price ?? item.price,
          quantity: pendingQty,
          notes: '',
        },
      ]
    })
    setQuantityAlert(null)
  }

  const updateCartQty = (itemId, delta) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === itemId)
      if (!existing) return prev
      const newQty = existing.quantity + delta
      if (newQty <= 0) return prev.filter((c) => c.itemId !== itemId)
      if (newQty >= QUANTITY_ALERT_THRESHOLD && delta > 0) {
        setQuantityAlert({
          item: {
            id: itemId,
            name: existing.itemName,
            promo_price: null,
            price: existing.unitPrice,
          },
          pendingQty: newQty,
          isExisting: true,
        })
        return prev
      }
      return prev.map((c) => (c.itemId === itemId ? { ...c, quantity: newQty } : c))
    })
  }

  const openNotesModal = (cartItem) => {
    setNotesTarget({ itemId: cartItem.itemId, itemName: cartItem.itemName })
    setNotesDraft(cartItem.notes)
  }

  const saveNotes = () => {
    setCart((prev) =>
      prev.map((c) =>
        c.itemId === notesTarget.itemId
          ? { ...c, notes: notesDraft.slice(0, 140) }
          : c
      )
    )
    setNotesTarget(null)
  }

  const handleSendOrder = async () => {
    if (!cart.length || sending) return
    setSending(true)
    try {
      await createFullOrder({
        businessId,
        staffId: null,
        tableId: selectedTable?.id || null,
        items: cart,
      })
      if (selectedTable && selectedTable.status === 'free') {
        await updateTableStatus(selectedTable.id, 'occupied')
      }
      toast.success('Pedido enviado para a cozinha!')
      setCart([])
      handleBackToMap()
    } catch {
      toast.error('Erro ao enviar pedido. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelTarget || cancelling) return
    setCancelling(true)
    try {
      await cancelOrder(cancelTarget.id)
      setTableOrders((prev) => prev.filter((o) => o.id !== cancelTarget.id))
      toast.success(`Pedido #${cancelTarget.order_number} cancelado.`)
      setCancelTarget(null)
    } catch {
      toast.error('Erro ao cancelar pedido.')
    } finally {
      setCancelling(false)
    }
  }

  const handleAnswerCall = async (callId) => {
    try {
      await answerWaiterCall(callId)
      setWaiterCalls((prev) => prev.filter((c) => c.id !== callId))
    } catch {
      toast.error('Erro ao responder chamado.')
    }
  }

  const handleCreateTable = async () => {
    const num = parseInt(newTableNumber, 10)
    if (!num || num < 1) return
    if (tables.some((t) => t.number === num)) {
      toast.error(`Mesa ${num} já existe.`)
      return
    }
    setCreatingTable(true)
    try {
      const capacity = newTableCapacity ? parseInt(newTableCapacity, 10) || null : null
      await createTable(businessId, num, null, capacity)
      setShowNewTableModal(false)
      setNewTableNumber('')
      setNewTableCapacity('')
      toast.success(`Mesa ${num} criada!`)
    } catch {
      toast.error('Erro ao criar mesa.')
    } finally {
      setCreatingTable(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('staff_session')
    navigate('/staff/login')
  }

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleEnableAudio = () => { enableAudio() }

  if (loading) {
    return (
      <div className="h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="h-screen bg-[var(--bg-secondary)] flex flex-col">
      {/* ── Header ── */}
      <header className="flex-shrink-0 h-[52px] px-4 flex items-center gap-3 bg-[var(--bg-primary)] border-b border-[var(--border)] z-40">
        {view === 'order' ? (
          <>
            <button
              type="button"
              data-testid="btn-back-map"
              onClick={handleBackToMap}
              className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)]"
            >
              <IconArrowLeft size={15} />
            </button>
            <span className="flex-1 text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
              Mesa {selectedTable?.number}
            </span>
            <button
              type="button"
              data-testid="btn-checkout"
              onClick={() => navigate(`/staff/checkout/${selectedTable?.id}`)}
              className="h-[30px] px-3 rounded-[8px] border border-[var(--border-strong)] text-[12px] text-[var(--text-2)]"
            >
              Fechar Conta
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-[14px] font-medium text-[var(--text)] truncate tracking-[-0.2px]">
              {businessName}
            </span>
            <div className="flex items-center gap-2">
              {!audioEnabled ? (
                <button
                  type="button"
                  data-testid="btn-enable-audio"
                  onClick={handleEnableAudio}
                  title="Ativar alertas sonoros"
                  className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-3)]"
                >
                  <IconVolumeOff size={15} />
                </button>
              ) : (
                <span
                  data-testid="btn-disable-audio"
                  title="Alertas sonoros ativos"
                  className="w-[32px] h-[32px] rounded-full border border-accent bg-[var(--accent-light)] flex items-center justify-center text-accent"
                >
                  <IconVolume size={15} />
                </span>
              )}

              {waiterCalls.length > 0 && (
                <button
                  type="button"
                  data-testid="btn-calls-badge"
                  onClick={() => setShowCallsModal(true)}
                  className="relative w-[32px] h-[32px] rounded-full border border-[var(--amber-border)] bg-[var(--amber-bg)] flex items-center justify-center text-[var(--amber-text)]"
                >
                  <IconBellRinging size={15} />
                  <span className="absolute -top-[4px] -right-[4px] w-[16px] h-[16px] rounded-full bg-[var(--amber-text)] text-white text-[9px] flex items-center justify-center font-medium">
                    {waiterCalls.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                data-testid="theme-toggle"
                onClick={handleToggleTheme}
                className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)]"
              >
                {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
              </button>

              <button
                type="button"
                data-testid="btn-logout"
                onClick={handleLogout}
                className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-3)]"
              >
                <IconLogout size={15} />
              </button>
            </div>
          </>
        )}
      </header>

      {/* ── MAP VIEW ── */}
      {view === 'map' && (
        <div className="flex-1 overflow-y-auto p-4">
          {waiterCalls.length > 0 && (
            <button
              type="button"
              data-testid="btn-waiter-call-banner"
              onClick={() => setShowCallsModal(true)}
              className="w-full mb-4 flex items-center gap-2 px-4 py-3 rounded-[12px] bg-[var(--amber-bg)] border border-[var(--amber-border)] text-[var(--amber-text)] text-[13px]"
            >
              <IconBellRinging size={16} className="flex-shrink-0" />
              <span className="font-medium">
                {waiterCalls.length} chamado{waiterCalls.length > 1 ? 's' : ''} de garçom
              </span>
              <span className="ml-auto text-[11px] opacity-70">Ver →</span>
            </button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tables.map((table) => (
              <button
                key={table.id}
                type="button"
                data-testid={`table-card-${table.number}`}
                onClick={() => handleSelectTable(table)}
                className="aspect-square rounded-[14px] flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity relative"
                style={
                  waiterCalls.some(c => c.table_id === table.id)
                    ? { background: 'var(--amber-bg)', borderColor: 'var(--amber-border)', borderWidth: '2px', borderStyle: 'solid', color: 'var(--amber-text)' }
                    : tableCardStyle(table.status)
                }
              >
                {waiterCalls.some(c => c.table_id === table.id) && (
                  <span
                    className="absolute top-2 right-2 w-[8px] h-[8px] rounded-full animate-pulse"
                    style={{ background: 'var(--amber-text)' }}
                  />
                )}
                <IconBellRinging
                  size={16}
                  style={{
                    color: 'var(--amber-text)',
                    display: waiterCalls.some(c => c.table_id === table.id) ? 'block' : 'none',
                  }}
                />
                <span className="text-[15px] font-medium">Mesa {table.number}</span>
                <span className="text-[11px] opacity-70">
                  {waiterCalls.some(c => c.table_id === table.id)
                    ? 'Chamando!'
                    : TABLE_STATUS_LABEL[table.status] || 'Livre'}
                </span>
                {table.capacity && (
                  <span className="text-[10px] opacity-50">{table.capacity} lug.</span>
                )}
              </button>
            ))}

            <button
              type="button"
              data-testid="btn-new-table"
              onClick={() => {
                const maxNum = tables.reduce((max, t) => Math.max(max, t.number), 0)
                setNewTableNumber(String(maxNum + 1))
                setShowNewTableModal(true)
              }}
              className="aspect-square rounded-[14px] border border-dashed border-[var(--border-strong)] flex flex-col items-center justify-center gap-1 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
            >
              <IconPlus size={20} />
              <span className="text-[11px]">Nova mesa</span>
            </button>
          </div>

          {tables.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)]">
              <p className="text-[13px]">Nenhuma mesa cadastrada.</p>
              <p className="text-[12px] mt-1">Toque em "Nova mesa" para criar.</p>
            </div>
          )}
        </div>
      )}

      {/* ── ORDER VIEW ── */}
      {view === 'order' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex-shrink-0 flex bg-[var(--bg-primary)] border-b border-[var(--border)]">
            <button
              type="button"
              data-testid="tab-orders"
              onClick={() => setOrderTab('orders')}
              className={`flex-1 h-[40px] text-[13px] font-medium border-b-2 transition-colors ${
                orderTab === 'orders'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-[var(--text-3)]'
              }`}
            >
              Pedidos
              {tableOrders.length > 0 && (
                <span className="ml-1 text-[11px]">({tableOrders.length})</span>
              )}
            </button>
            <button
              type="button"
              data-testid="tab-menu"
              onClick={() => setOrderTab('menu')}
              className={`flex-1 h-[40px] text-[13px] font-medium border-b-2 transition-colors ${
                orderTab === 'menu'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-[var(--text-3)]'
              }`}
            >
              Cardápio
              {cart.length > 0 && (
                <span className="ml-1 text-[11px]">({cart.length})</span>
              )}
            </button>
          </div>

          {/* ── Tab: Pedidos ── */}
          {orderTab === 'orders' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner />
                </div>
              ) : tableOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-[var(--text-3)]">
                  <p className="text-[13px]">Nenhum pedido em aberto.</p>
                  <button
                    type="button"
                    onClick={() => setOrderTab('menu')}
                    className="mt-2 text-[12px] text-accent"
                  >
                    Adicionar itens →
                  </button>
                </div>
              ) : (
                tableOrders.map((order) => (
                  <div
                    key={order.id}
                    data-testid={`order-card-${order.order_number}`}
                    className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[12px] font-medium text-[var(--text)] flex-shrink-0">
                          #{order.order_number}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-[2px] rounded-pill border flex-shrink-0 ${ORDER_STATUS_STYLE[order.status]}`}>
                          {ORDER_STATUS_LABEL[order.status]}
                        </span>
                        <span className="text-[10px] text-[var(--text-3)] truncate">
                          {formatDuration(now - new Date(order.created_at).getTime())} aberto
                        </span>
                      </div>
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          data-testid={`btn-cancel-${order.order_number}`}
                          onClick={() => setCancelTarget(order)}
                          className="h-[26px] px-3 rounded-[8px] bg-[var(--red-bg)] border border-[var(--red-border)] text-[var(--red-text)] text-[11px] font-medium"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    <div className="px-3 py-2 space-y-[6px]">
                      {(order.order_items || []).map((item) => (
                        <div key={item.id} className="flex items-baseline justify-between">
                          <span className="text-[12px] text-[var(--text)] flex-1 min-w-0 truncate pr-2">
                            {item.item_name}
                            <span className="text-[var(--text-3)]"> x{item.quantity}</span>
                          </span>
                          <span className="text-[12px] text-[var(--text-3)] flex-shrink-0">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      {order.order_items?.length === 0 && (
                        <p className="text-[12px] text-[var(--text-3)]">Sem itens</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Cardápio ── */}
          {orderTab === 'menu' && (
            <>
              {/* Search */}
              <div className="flex-shrink-0 px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border)]">
                <div className="relative">
                  <IconSearch
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
                  />
                  <input
                    type="search"
                    placeholder="Buscar item..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-[38px] pl-9 pr-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text)] outline-none focus:border-accent"
                    data-testid="pdv-search"
                  />
                </div>
              </div>

              {/* Category tabs */}
              <div
                className="flex-shrink-0 flex gap-2 px-4 py-2 overflow-x-auto bg-[var(--bg-primary)] border-b border-[var(--border)]"
                style={{ scrollbarWidth: 'none' }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`flex-shrink-0 h-[28px] px-3 rounded-pill text-[11px] font-medium border transition-colors ${
                    selectedCategoryId === null
                      ? 'bg-accent text-white border-accent'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-2)] border-[var(--border-strong)]'
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex-shrink-0 h-[28px] px-3 rounded-pill text-[11px] font-medium border transition-colors ${
                      selectedCategoryId === cat.id
                        ? 'bg-accent text-white border-accent'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-2)] border-[var(--border-strong)]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-[var(--text-3)]">
                    <p className="text-[13px]">Nenhum item encontrado</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {filteredItems.map((item) => {
                      const cartItem = cart.find((c) => c.itemId === item.id)
                      const price = item.promo_price ?? item.price
                      return (
                        <div
                          key={item.id}
                          data-testid={`menu-item-${item.id}`}
                          className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px]"
                        >
                          {item.photo_url && (
                            <img
                              src={item.photo_url}
                              alt={item.name}
                              className="w-[44px] h-[44px] rounded-[8px] object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[var(--text)] truncate">
                              {item.name}
                            </p>
                            <p className="text-[12px] text-[var(--text-3)]">
                              {formatCurrency(price)}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-testid={`btn-add-${item.id}`}
                            onClick={() => addToCart(item)}
                            className="w-[32px] h-[32px] rounded-full bg-accent flex items-center justify-center text-white flex-shrink-0"
                          >
                            {cartItem ? (
                              <span className="text-[11px] font-medium">{cartItem.quantity}</span>
                            ) : (
                              <IconPlus size={14} />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Cart panel */}
              {cart.length > 0 && (
                <div className="flex-shrink-0 bg-[var(--bg-primary)] border-t border-[var(--border)]">
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em]">
                      Pedido — {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>

                  <div className="max-h-[160px] overflow-y-auto px-4 space-y-2 pb-2">
                    {cart.map((c) => (
                      <div key={c.itemId} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-[var(--text)] truncate">{c.itemName}</p>
                          {c.notes && (
                            <p className="text-[10px] text-[var(--text-3)] truncate">{c.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            data-testid={`btn-decrement-${c.itemId}`}
                            onClick={() => updateCartQty(c.itemId, -1)}
                            className="w-[22px] h-[22px] rounded-full border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-2)]"
                          >
                            <IconMinus size={10} />
                          </button>
                          <span className="w-[18px] text-center text-[12px] text-[var(--text)]">
                            {c.quantity}
                          </span>
                          <button
                            type="button"
                            data-testid={`btn-increment-${c.itemId}`}
                            onClick={() => updateCartQty(c.itemId, 1)}
                            className="w-[22px] h-[22px] rounded-full border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-2)]"
                          >
                            <IconPlus size={10} />
                          </button>
                        </div>
                        <button
                          type="button"
                          data-testid={`btn-notes-${c.itemId}`}
                          onClick={() => openNotesModal(c)}
                          className={`w-[22px] h-[22px] flex items-center justify-center ${
                            c.notes ? 'text-accent' : 'text-[var(--text-3)]'
                          }`}
                        >
                          <IconPencil size={12} />
                        </button>
                        <span className="text-[11px] text-[var(--text-3)] w-[52px] text-right flex-shrink-0">
                          {formatCurrency(c.unitPrice * c.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 pt-2 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] text-[var(--text-2)]">Total</span>
                      <span className="text-[15px] font-medium text-[var(--text)]">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-send-order"
                      onClick={handleSendOrder}
                      disabled={sending}
                      className="w-full h-[44px] rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-50 flex items-center justify-center"
                    >
                      {sending ? (
                        <Spinner size="sm" className="border-white/30 border-t-white" />
                      ) : (
                        'Enviar para cozinha'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MODAL: Cancel order ── */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        data-testid="modal-cancel-order"
      >
        <p className="text-[15px] font-medium text-[var(--text)] mb-1">
          Cancelar pedido?
        </p>
        <p className="text-[13px] text-[var(--text-2)] mb-5">
          O pedido <strong>#{cancelTarget?.order_number}</strong> será cancelado.
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCancelTarget(null)}
            className="flex-1 h-[40px] rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)]"
          >
            Manter
          </button>
          <button
            type="button"
            data-testid="btn-confirm-cancel"
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="flex-1 h-[40px] rounded-[10px] bg-red-500 text-white text-[13px] font-medium disabled:opacity-50 flex items-center justify-center"
          >
            {cancelling ? (
              <Spinner size="sm" className="border-white/30 border-t-white" />
            ) : (
              'Cancelar pedido'
            )}
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Waiter calls ── */}
      <Modal
        open={showCallsModal}
        onClose={() => setShowCallsModal(false)}
        title="Chamados de garçom"
        data-testid="modal-waiter-calls"
      >
        {waiterCalls.length === 0 ? (
          <p className="text-[13px] text-[var(--text-3)] text-center py-4">
            Nenhum chamado pendente.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {waiterCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[10px]"
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--text)]">
                    Mesa {call.tables?.number ?? '—'}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    {new Date(call.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid={`btn-answer-${call.id}`}
                  onClick={() => handleAnswerCall(call.id)}
                  className="h-[30px] px-3 rounded-[8px] bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-text)] text-[12px] font-medium flex items-center gap-1"
                >
                  <IconCheck size={12} />
                  Atender
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowCallsModal(false)}
          className="w-full h-[40px] rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)]"
        >
          Fechar
        </button>
      </Modal>

      {/* ── MODAL: New table ── */}
      <Modal
        open={showNewTableModal}
        onClose={() => setShowNewTableModal(false)}
        title="Nova mesa"
        data-testid="modal-new-table"
      >
        <div className="mb-4">
          <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
            Número da mesa
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
            className="w-full h-[40px] px-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[14px] text-[var(--text)] outline-none focus:border-accent"
            min="1"
            data-testid="input-new-table-number"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
            Capacidade (pessoas) — opcional
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(e.target.value)}
            className="w-full h-[40px] px-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[14px] text-[var(--text)] outline-none focus:border-accent"
            min="1"
            placeholder="Ex: 4"
            data-testid="input-new-table-capacity"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNewTableModal(false)}
            className="flex-1 h-[40px] rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="btn-confirm-new-table"
            onClick={handleCreateTable}
            disabled={creatingTable || !newTableNumber}
            className="flex-1 h-[40px] rounded-[10px] bg-accent text-white text-[13px] font-medium disabled:opacity-50 flex items-center justify-center"
          >
            {creatingTable ? (
              <Spinner size="sm" className="border-white/30 border-t-white" />
            ) : (
              'Criar mesa'
            )}
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Quantity alert ── */}
      <Modal
        open={!!quantityAlert}
        onClose={() => setQuantityAlert(null)}
        data-testid="modal-quantity-alert"
      >
        <p className="text-[15px] font-medium text-[var(--text)] mb-1">
          Confirmar quantidade?
        </p>
        <p className="text-[13px] text-[var(--text-2)] mb-5">
          Você quer adicionar{' '}
          <strong>{quantityAlert?.pendingQty}x {quantityAlert?.item?.name}</strong>?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setQuantityAlert(null)}
            className="flex-1 h-[40px] rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)]"
          >
            Corrigir
          </button>
          <button
            type="button"
            data-testid="btn-confirm-qty"
            onClick={confirmQuantityAlert}
            className="flex-1 h-[40px] rounded-[10px] bg-accent text-white text-[13px] font-medium"
          >
            Confirmar
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Notes ── */}
      <Modal
        open={!!notesTarget}
        onClose={() => setNotesTarget(null)}
        title={notesTarget?.itemName}
        data-testid="modal-notes"
      >
        <div className="mb-4">
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value.slice(0, 140))}
            placeholder="Observação para a cozinha..."
            rows={3}
            className="w-full px-3 py-2 rounded-input border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text)] outline-none focus:border-accent resize-none"
            data-testid="input-notes"
          />
          <p className="text-[10px] text-[var(--text-3)] mt-1 text-right">
            {notesDraft.length}/140
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNotesTarget(null)}
            className="flex-1 h-[40px] rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="btn-save-notes"
            onClick={saveNotes}
            className="flex-1 h-[40px] rounded-[10px] bg-accent text-white text-[13px] font-medium"
          >
            Salvar
          </button>
        </div>
      </Modal>
    </div>
  )
}
