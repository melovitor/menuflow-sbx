import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  IconPlus,
  IconShoppingCart,
  IconCheck,
  IconX,
  IconSend,
  IconPackage,
  IconChevronDown,
  IconChevronUp,
  IconWand,
  IconTrash,
  IconClipboardList,
  IconPrinter,
} from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { toast } from '../../components/ui/Toast'
import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  updatePurchaseOrderItems,
  receivePurchaseOrder,
  generateAutoOrder,
  fetchIngredients,
  fetchSuppliers,
} from '../../services/inventoryService'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/formatters'

// ── helpers ──────────────────────────────────────────────────────────────────

function printShoppingList(items, total) {
  const date = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date())

  const rows = items.map((item) => `
    <tr>
      <td class="check"><span class="box"></span></td>
      <td class="name">${item.name}</td>
      <td class="qty">${item.quantity} ${item.unit}</td>
      <td class="cost">${item.unit_cost > 0
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unit_cost)
        : '—'
      }</td>
    </tr>
  `).join('')

  const totalFormatted = total > 0
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)
    : null

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Lista de Compras</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-bottom: 2px solid #111; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: .06em;
         color: #555; padding: 6px 8px; text-align: left; }
    td { padding: 10px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .check { width: 32px; }
    .box { display: inline-block; width: 16px; height: 16px;
           border: 1.5px solid #555; border-radius: 3px; }
    .name { font-weight: 500; }
    .qty { color: #444; white-space: nowrap; }
    .cost { text-align: right; white-space: nowrap; color: #444; }
    .total-row { margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;
                 padding-top: 12px; border-top: 2px solid #111; font-size: 14px; }
    .total-row span:last-child { font-weight: 700; }
    @media print {
      body { padding: 16px; }
    }
  </style>
</head>
<body>
  <h1>Lista de Compras</h1>
  <p class="meta">Gerada em ${date}</p>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Insumo</th>
        <th>Quantidade</th>
        <th style="text-align:right">Custo est.</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${totalFormatted ? `
  <div class="total-row">
    <span>Total estimado</span>
    <span>${totalFormatted}</span>
  </div>` : ''}
  <script>window.onload = () => { window.print() }<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=700,height=900')
  win.document.write(html)
  win.document.close()
}

const STATUS_CONFIG = {
  draft:     { label: 'Rascunho',  pill: 'bg-[var(--bg-tertiary)] text-[var(--text-3)] border-[var(--border)]' },
  sent:      { label: 'Enviada',   pill: 'bg-[var(--amber-bg)] text-[var(--amber-text)] border-[var(--amber-border)]' },
  received:  { label: 'Recebida', pill: 'bg-[var(--green-bg)] text-[var(--green-text)] border-[var(--green-border)]' },
  cancelled: { label: 'Cancelada', pill: 'bg-[var(--red-bg)] text-[var(--red-text)] border-[var(--red-border)]' },
}

const displayQty = (digits) => {
  if (!digits) return ''
  const n = digits.replace(/\D/g, '')
  return n ? String(parseFloat(n) / 1000) : ''
}

const inputCls =
  'w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent'

// cents-first mask for cost
const displayCost = (digits) => {
  if (!digits) return ''
  const padded = digits.padStart(3, '0')
  const reais = padded.slice(0, -2).replace(/^0+/, '') || '0'
  return `${reais},${padded.slice(-2)}`
}
const parseCostDigits = (digits) => parseInt(digits || '0') / 100
const numberToDigits = (n) => Math.round(parseFloat(n || 0) * 100).toString()

function formatDate(iso) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium border ${cfg.pill}`}>
      {cfg.label}
    </span>
  )
}

function ItemRow({ item, onChange, onRemove, editable, ingredients }) {
  const ing = ingredients.find((i) => i.id === item.ingredient_id)
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--text)] flex-1 truncate">
          {ing?.name || item.ingredients?.name || '—'}
        </p>
        {editable && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-3)] hover:border-red-500 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <IconTrash size={13} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">
            Qtd ({ing?.unit || item.ingredients?.unit || '—'})
          </label>
          {editable ? (
            <input
              type="number"
              min="0"
              step="0.001"
              value={item.quantity || ''}
              onChange={(e) => onChange({ ...item, quantity: e.target.value })}
              className={inputCls}
              placeholder="0"
            />
          ) : (
            <p className="text-[13px] text-[var(--text)]">
              {item.quantity} {ing?.unit || item.ingredients?.unit}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-1">
            Custo/un (R$)
          </label>
          {editable ? (
            <input
              type="text"
              inputMode="numeric"
              value={displayCost(item._costDigits || numberToDigits(item.unit_cost))}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                onChange({ ...item, _costDigits: digits, unit_cost: parseCostDigits(digits) })
              }}
              className={inputCls}
              placeholder="0,00"
            />
          ) : (
            <p className="text-[13px] text-[var(--text)]">
              {formatCurrency(item.unit_cost)}
            </p>
          )}
        </div>
      </div>
      {(item.quantity && item.unit_cost) ? (
        <p className="text-[11px] text-[var(--text-3)]">
          Subtotal: {formatCurrency(Number(item.quantity) * Number(item.unit_cost))}
        </p>
      ) : null}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const { id: businessId } = useParams()

  const [orders, setOrders] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [form, setForm] = useState({ supplierId: '', notes: '', items: [] })
  const [ingSearch, setIngSearch] = useState('')
  const [showIngList, setShowIngList] = useState(false)

  // Edit items modal
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editItems, setEditItems] = useState([])
  const [editSaving, setEditSaving] = useState(false)

  // Shopping list modal
  const [listStep, setListStep] = useState(null) // null | 'select' | 'list'
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [checkedItems, setCheckedItems] = useState({}) // key: ingredientId
  const [concluding, setConcluding] = useState(false)

  const load = useCallback(async () => {
    try {
      const [pos, ings, sups] = await Promise.all([
        fetchPurchaseOrders(businessId),
        fetchIngredients(businessId),
        fetchSuppliers(businessId),
      ])
      setOrders(pos)
      setIngredients(ings)
      setSuppliers(sups.filter((s) => s.is_active))
    } catch {
      toast.error('Erro ao carregar ordens de compra.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const channel = supabase
      .channel(`purchase-orders-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders', filter: `business_id=eq.${businessId}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [businessId, load])

  // ── auto-generate ──────────────────────────────────────────────
  const handleAutoGenerate = async () => {
    try {
      const suggested = await generateAutoOrder(businessId)
      if (suggested.length === 0) {
        toast.info('Nenhum insumo em alerta no momento.')
        return
      }
      const items = suggested.map((s) => ({
        ingredient_id: s.ingredient_id,
        quantity: s.quantity,
        unit_cost: s.unit_cost,
        _costDigits: numberToDigits(s.unit_cost),
      }))
      setForm({
        supplierId: suggested[0].supplier_id || '',
        notes: 'Gerada automaticamente por alerta de estoque.',
        items,
      })
      setCreateOpen(true)
    } catch {
      toast.error('Erro ao gerar ordem automática.')
    }
  }

  // ── create ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (form.items.length === 0) { toast.error('Adicione pelo menos um insumo.'); return }
    const invalid = form.items.find((i) => !i.quantity || Number(i.quantity) <= 0)
    if (invalid) { toast.error('Informe a quantidade de todos os itens.'); return }

    setCreateLoading(true)
    try {
      await createPurchaseOrder(businessId, {
        supplierId: form.supplierId || null,
        notes: form.notes.trim() || null,
        items: form.items.map((i) => ({
          ingredient_id: i.ingredient_id,
          quantity: Number(i.quantity),
          unit_cost: Number(i.unit_cost) || 0,
        })),
      })
      toast.success('Ordem criada.')
      setCreateOpen(false)
      setForm({ supplierId: '', notes: '', items: [] })
      await load()
    } catch {
      toast.error('Erro ao criar ordem.')
    } finally {
      setCreateLoading(false)
    }
  }

  const addIngredient = (ing) => {
    if (form.items.find((i) => i.ingredient_id === ing.id)) {
      toast.error('Insumo já adicionado.')
      return
    }
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        ingredient_id: ing.id,
        quantity: '',
        unit_cost: ing.unit_cost,
        _costDigits: numberToDigits(ing.unit_cost),
      }],
    }))
    setIngSearch('')
    setShowIngList(false)
  }

  const updateItem = (idx, updated) => {
    setForm((f) => {
      const items = [...f.items]
      items[idx] = updated
      return { ...f, items }
    })
  }

  const removeItem = (idx) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  // ── status actions ─────────────────────────────────────────────
  const handleSend = async (po) => {
    setActionLoading(po.id + '_send')
    try {
      await updatePurchaseOrderStatus(po.id, 'sent')
      toast.success('Ordem marcada como enviada.')
      await load()
    } catch {
      toast.error('Erro ao atualizar status.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReceive = async (po) => {
    setActionLoading(po.id + '_receive')
    try {
      await receivePurchaseOrder(po)
      toast.success('Recebimento registrado. Estoque atualizado.')
      await load()
    } catch {
      toast.error('Erro ao registrar recebimento.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (po) => {
    setActionLoading(po.id + '_cancel')
    try {
      await updatePurchaseOrderStatus(po.id, 'cancelled')
      toast.success('Ordem cancelada.')
      await load()
    } catch {
      toast.error('Erro ao cancelar ordem.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── edit items ─────────────────────────────────────────────────
  const openEditItems = (po) => {
    setEditTarget(po)
    setEditItems((po.purchase_order_items || []).map((i) => ({
      ingredient_id: i.ingredients?.id ?? i.ingredient_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      _costDigits: numberToDigits(i.unit_cost),
      ingredients: i.ingredients,
    })))
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (editItems.length === 0) { toast.error('A ordem precisa ter pelo menos um item.'); return }
    setEditSaving(true)
    try {
      await updatePurchaseOrderItems(editTarget.id, editItems.map((i) => ({
        ingredient_id: i.ingredient_id,
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost) || 0,
      })))
      toast.success('Itens atualizados.')
      setEditOpen(false)
      await load()
    } catch {
      toast.error('Erro ao salvar itens.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── conclude shopping ──────────────────────────────────────────
  const handleConcludeShoppingList = async () => {
    const targets = orders.filter((o) => selectedOrderIds.includes(o.id))
    setConcluding(true)
    try {
      for (const po of targets) {
        await receivePurchaseOrder(po)
      }
      toast.success(`${targets.length} ordem${targets.length !== 1 ? 's' : ''} recebida${targets.length !== 1 ? 's' : ''}. Estoque atualizado.`)
      setListStep(null)
      setSelectedOrderIds([])
      await load()
    } catch {
      toast.error('Erro ao concluir compra.')
    } finally {
      setConcluding(false)
    }
  }

  // ── shopping list ──────────────────────────────────────────────
  const openShoppingList = () => {
    const selectableOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'received')
    if (selectableOrders.length === 0) { toast.error('Nenhuma ordem disponível.'); return }
    setSelectedOrderIds(selectableOrders.map((o) => o.id))
    setCheckedItems({})
    setListStep('select')
  }

  const consolidatedItems = () => {
    const map = {}
    orders
      .filter((o) => selectedOrderIds.includes(o.id))
      .forEach((po) => {
        ;(po.purchase_order_items || []).forEach((item) => {
          const id = item.ingredients?.id ?? item.ingredient_id
          const name = item.ingredients?.name ?? '—'
          const unit = item.ingredients?.unit ?? ''
          if (!map[id]) {
            map[id] = { id, name, unit, quantity: 0, unit_cost: item.unit_cost }
          }
          map[id].quantity += Number(item.quantity)
        })
      })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }

  // ── filtered ingredient search ─────────────────────────────────
  const usedIds = new Set(form.items.map((i) => i.ingredient_id))
  const availableIngs = ingredients.filter(
    (i) => i.is_active && !usedIds.has(i.id) &&
      i.name.toLowerCase().includes(ingSearch.toLowerCase())
  )

  // ── render ─────────────────────────────────────────────────────
  return (
    <OwnerLayout
      title="Ordens de Compra"
      showBack
      backTo={`/owner/business/${businessId}/stock/ingredients`}
    >
      <div className="px-5 py-5 flex flex-col gap-4 pb-10">

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="btn-new-order"
            onClick={() => { setForm({ supplierId: '', notes: '', items: [] }); setCreateOpen(true) }}
            className="flex-1 flex items-center justify-center gap-2 h-[44px] rounded-[10px] bg-accent text-white text-[14px] font-medium"
          >
            <IconPlus size={16} />
            Nova ordem
          </button>
          <button
            type="button"
            data-testid="btn-auto-order"
            onClick={handleAutoGenerate}
            className="flex items-center justify-center gap-1.5 h-[44px] px-4 rounded-[10px] border border-[var(--amber-border)] bg-[var(--bg-primary)] text-[13px] text-[var(--amber-text)] hover:bg-[var(--amber-bg)] transition-colors"
          >
            <IconWand size={15} />
            Auto
          </button>
        </div>

        {/* Shopping list button */}
        <button
          type="button"
          data-testid="btn-shopping-list"
          onClick={openShoppingList}
          className="w-full flex items-center justify-between px-4 h-[42px] rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
        >
          <div className="flex items-center gap-2">
            <IconClipboardList size={15} />
            Gerar lista de compras
          </div>
          <IconChevronDown size={14} />
        </button>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-14">
            <IconShoppingCart size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
            <p className="text-[14px] font-medium text-[var(--text-2)]">Nenhuma ordem de compra</p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">
              Crie uma ordem manual ou use o botão Auto para gerar a partir dos alertas.
            </p>
          </div>
        )}

        {/* Orders list */}
        {!loading && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((po) => {
              const isExpanded = expandedId === po.id
              const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft
              const isDraft = po.status === 'draft'
              const isSent = po.status === 'sent'
              const isFinal = po.status === 'received' || po.status === 'cancelled'

              return (
                <div
                  key={po.id}
                  data-testid={`po-card-${po.id}`}
                  className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card overflow-hidden"
                >
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : po.id)}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill status={po.status} />
                        <span className="text-[13px] font-medium text-[var(--text)] truncate">
                          {po.suppliers?.name || 'Sem fornecedor'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-[11px] text-[var(--text-3)]">
                          {formatDate(po.created_at)}
                        </p>
                        <p className="text-[11px] text-[var(--text-3)]">
                          {po.purchase_order_items?.length || 0} iten{(po.purchase_order_items?.length || 0) !== 1 ? 's' : ''}
                        </p>
                        {po.total_cost > 0 && (
                          <p className="text-[12px] font-medium text-[var(--text)]">
                            {formatCurrency(po.total_cost)}
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpanded
                      ? <IconChevronUp size={16} className="text-[var(--text-3)] flex-shrink-0 mt-0.5" />
                      : <IconChevronDown size={16} className="text-[var(--text-3)] flex-shrink-0 mt-0.5" />
                    }
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[var(--border)]">

                      {/* Items */}
                      <div className="flex flex-col gap-2 pt-3">
                        {(po.purchase_order_items || []).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 py-1"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-[var(--text)] truncate">
                                {item.ingredients?.name}
                              </p>
                              <p className="text-[11px] text-[var(--text-3)]">
                                {item.quantity} {item.ingredients?.unit}
                                {item.unit_cost > 0 && (
                                  <> · {formatCurrency(item.unit_cost)}/{item.ingredients?.unit}</>
                                )}
                              </p>
                            </div>
                            {item.total_cost > 0 && (
                              <p className="text-[12px] font-medium text-[var(--text)] flex-shrink-0">
                                {formatCurrency(item.total_cost)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {po.notes && (
                        <p className="text-[11px] text-[var(--text-3)] border-t border-[var(--border)] pt-2">
                          {po.notes}
                        </p>
                      )}

                      {/* Timestamps */}
                      <div className="flex flex-col gap-0.5 border-t border-[var(--border)] pt-2">
                        <p className="text-[10px] text-[var(--text-3)]">
                          Criada em {formatDate(po.created_at)}
                        </p>
                        {po.sent_at && (
                          <p className="text-[10px] text-[var(--text-3)]">
                            Enviada em {formatDate(po.sent_at)}
                          </p>
                        )}
                        {po.received_at && (
                          <p className="text-[10px] text-[var(--text-3)]">
                            Recebida em {formatDate(po.received_at)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {!isFinal && (
                        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                          {isDraft && (
                            <>
                              <button
                                type="button"
                                data-testid={`btn-edit-items-${po.id}`}
                                onClick={() => openEditItems(po)}
                                className="w-full h-[38px] flex items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
                              >
                                Editar itens
                              </button>
                              <button
                                type="button"
                                data-testid={`btn-send-${po.id}`}
                                onClick={() => handleSend(po)}
                                disabled={actionLoading === po.id + '_send'}
                                className="w-full h-[38px] flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--amber-bg)] border border-[var(--amber-border)] text-[13px] text-[var(--amber-text)] font-medium disabled:opacity-50 transition-opacity"
                              >
                                {actionLoading === po.id + '_send'
                                  ? <Spinner size="sm" />
                                  : <><IconSend size={14} /> Marcar como enviada</>
                                }
                              </button>
                            </>
                          )}
                          {isSent && (
                            <button
                              type="button"
                              data-testid={`btn-receive-${po.id}`}
                              onClick={() => handleReceive(po)}
                              disabled={actionLoading === po.id + '_receive'}
                              className="w-full h-[38px] flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--green-bg)] border border-[var(--green-border)] text-[13px] text-[var(--green-text)] font-medium disabled:opacity-50 transition-opacity"
                            >
                              {actionLoading === po.id + '_receive'
                                ? <Spinner size="sm" />
                                : <><IconPackage size={14} /> Registrar recebimento</>
                              }
                            </button>
                          )}
                          <button
                            type="button"
                            data-testid={`btn-cancel-${po.id}`}
                            onClick={() => handleCancel(po)}
                            disabled={!!actionLoading}
                            className="w-full h-[38px] flex items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-3)] hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <IconX size={14} />
                            Cancelar ordem
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova ordem de compra"
      >
        <div className="flex flex-col gap-4">

          {/* Supplier */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Fornecedor
            </label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Sem fornecedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Observações
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Instruções de entrega, prazo, etc."
              rows={2}
              className="w-full px-3 py-2.5 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent resize-none"
            />
          </div>

          {/* Items */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Insumos
            </label>

            {/* Search */}
            <div className="relative mb-2">
              <input
                type="text"
                value={ingSearch}
                onChange={(e) => { setIngSearch(e.target.value); setShowIngList(true) }}
                onFocus={() => setShowIngList(true)}
                placeholder="Buscar insumo para adicionar..."
                className={inputCls}
              />
              {showIngList && ingSearch && availableIngs.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 border border-[var(--border)] rounded-[10px] bg-[var(--bg-primary)] overflow-hidden shadow-lg">
                  {availableIngs.slice(0, 6).map((ing) => (
                    <button
                      key={ing.id}
                      type="button"
                      onMouseDown={() => addIngredient(ing)}
                      className="w-full text-left px-3 py-2.5 text-[13px] text-[var(--text)] hover:bg-[var(--bg-secondary)] border-b border-[var(--border)] last:border-0 transition-colors"
                    >
                      <span className="font-medium">{ing.name}</span>
                      <span className="text-[var(--text-3)] ml-2 text-[11px]">
                        {ing.unit} · {formatCurrency(ing.unit_cost)}/{ing.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.items.length === 0 && (
              <p className="text-[12px] text-[var(--text-3)] text-center py-4 border border-dashed border-[var(--border-strong)] rounded-[10px]">
                Nenhum insumo adicionado
              </p>
            )}

            {form.items.length > 0 && (
              <div className="flex flex-col gap-2">
                {form.items.map((item, idx) => (
                  <ItemRow
                    key={item.ingredient_id}
                    item={item}
                    onChange={(updated) => updateItem(idx, updated)}
                    onRemove={() => removeItem(idx)}
                    editable
                    ingredients={ingredients}
                  />
                ))}
                <p className="text-[12px] font-medium text-[var(--text)] text-right pt-1">
                  Total estimado:{' '}
                  {formatCurrency(
                    form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0)
                  )}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="btn-save-order"
            onClick={handleCreate}
            disabled={createLoading}
            className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-60 transition-opacity"
          >
            {createLoading
              ? <Spinner size="sm" className="border-white/30 border-t-white" />
              : <><IconCheck size={16} /> Criar ordem</>
            }
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="w-full h-[42px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
          >
            Cancelar
          </button>

        </div>
      </Modal>

      {/* ── Shopping list — step 1: select orders ── */}
      <Modal
        open={listStep === 'select'}
        onClose={() => setListStep(null)}
        title="Selecionar ordens"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[12px] text-[var(--text-3)]">
            Marque as ordens que devem entrar na lista de compras.
          </p>

          <div className="flex flex-col gap-2">
            {orders.filter((o) => o.status !== 'cancelled' && o.status !== 'received').map((po) => {
              const checked = selectedOrderIds.includes(po.id)
              return (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => setSelectedOrderIds((prev) =>
                    checked ? prev.filter((id) => id !== po.id) : [...prev, po.id]
                  )}
                  className={`flex items-center gap-3 px-3 py-3 rounded-[10px] border text-left transition-colors ${
                    checked
                      ? 'border-accent bg-[var(--accent-light)]'
                      : 'border-[var(--border-strong)] bg-[var(--bg-primary)]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center flex-shrink-0 border ${
                    checked ? 'bg-accent border-accent' : 'border-[var(--border-strong)]'
                  }`}>
                    {checked && <IconCheck size={13} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusPill status={po.status} />
                      <span className="text-[13px] font-medium text-[var(--text)] truncate">
                        {po.suppliers?.name || 'Sem fornecedor'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                      {formatDate(po.created_at)} · {po.purchase_order_items?.length || 0} iten{(po.purchase_order_items?.length || 0) !== 1 ? 's' : ''}
                      {po.total_cost > 0 && ` · ${formatCurrency(po.total_cost)}`}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            data-testid="btn-generate-list"
            disabled={selectedOrderIds.length === 0}
            onClick={() => { setCheckedItems({}); setListStep('list') }}
            className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-40"
          >
            <IconClipboardList size={16} />
            Ver lista ({selectedOrderIds.length} ordem{selectedOrderIds.length !== 1 ? 's' : ''})
          </button>

          <button
            type="button"
            onClick={() => setListStep(null)}
            className="w-full h-[42px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* ── Shopping list — step 2: list with checkboxes ── */}
      <Modal
        open={listStep === 'list'}
        onClose={() => setListStep(null)}
        title="Lista de compras"
      >
        {(() => {
          const items = consolidatedItems()
          const total = items.reduce((s, i) => s + i.quantity * (i.unit_cost || 0), 0)
          const doneCount = Object.values(checkedItems).filter(Boolean).length

          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-[var(--text-3)]">
                  {doneCount}/{items.length} itens marcados
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const allChecked = items.every((i) => checkedItems[i.id])
                    const next = {}
                    if (!allChecked) items.forEach((i) => { next[i.id] = true })
                    setCheckedItems(next)
                  }}
                  className="text-[11px] text-accent underline"
                >
                  {items.every((i) => checkedItems[i.id]) ? 'Desmarcar tudo' : 'Marcar tudo'}
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {items.map((item) => {
                  const done = !!checkedItems[item.id]
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCheckedItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] border text-left transition-colors ${
                        done
                          ? 'border-[var(--border)] bg-[var(--bg-tertiary)] opacity-60'
                          : 'border-[var(--border-strong)] bg-[var(--bg-primary)]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        done ? 'bg-[var(--green-text)] border-[var(--green-text)]' : 'border-[var(--border-strong)]'
                      }`}>
                        {done && <IconCheck size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium ${done ? 'line-through text-[var(--text-3)]' : 'text-[var(--text)]'}`}>
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-3)]">
                          {item.quantity} {item.unit}
                          {item.unit_cost > 0 && ` · est. ${formatCurrency(item.quantity * item.unit_cost)}`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {total > 0 && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-[10px] bg-[var(--bg-tertiary)] border border-[var(--border)]">
                  <p className="text-[13px] text-[var(--text-2)]">Total estimado</p>
                  <p className="text-[14px] font-medium text-[var(--text)]">{formatCurrency(total)}</p>
                </div>
              )}

              <button
                type="button"
                data-testid="btn-conclude-shopping"
                onClick={handleConcludeShoppingList}
                disabled={concluding}
                className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] bg-[var(--green-bg)] border border-[var(--green-border)] text-[13px] text-[var(--green-text)] font-medium disabled:opacity-50 transition-opacity"
              >
                {concluding
                  ? <Spinner size="sm" />
                  : <><IconCheck size={15} /> Concluir compra e atualizar estoque</>
                }
              </button>

              <button
                type="button"
                onClick={() => printShoppingList(items, total)}
                className="w-full h-[42px] flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
              >
                <IconPrinter size={15} />
                Imprimir lista
              </button>

              <button
                type="button"
                onClick={() => setListStep('select')}
                className="w-full h-[40px] flex items-center justify-center rounded-[10px] text-[12px] text-[var(--text-3)] hover:text-accent transition-colors"
              >
                ← Voltar e alterar seleção
              </button>
            </div>
          )
        })()}
      </Modal>

      {/* ── Edit items modal ── */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar itens da ordem"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {editItems.map((item, idx) => (
              <ItemRow
                key={item.ingredient_id}
                item={item}
                onChange={(updated) => {
                  const next = [...editItems]
                  next[idx] = updated
                  setEditItems(next)
                }}
                onRemove={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
                editable
                ingredients={ingredients}
              />
            ))}
          </div>

          <button
            type="button"
            data-testid="btn-save-edit-items"
            onClick={handleSaveEdit}
            disabled={editSaving}
            className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-60 transition-opacity"
          >
            {editSaving
              ? <Spinner size="sm" className="border-white/30 border-t-white" />
              : 'Salvar alterações'
            }
          </button>

          <button
            type="button"
            onClick={() => setEditOpen(false)}
            className="w-full h-[42px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>

    </OwnerLayout>
  )
}
