import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconMoon, IconSun, IconPlus, IconX, IconCheck } from '@tabler/icons-react'
import {
  fetchTableOrdersForCheckout,
  closeTableBill,
} from '../../services/orderService'
import {
  fetchBusinessSettings,
  fetchTableNumber,
  updateTableStatus,
} from '../../services/businessService'
import { toast } from '../../components/ui/Toast'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/formatters'
import { toggleTheme } from '../../utils/theme'

const METHODS = [
  { id: 'cash', label: 'Dinheiro' },
  { id: 'pix', label: 'PIX' },
  { id: 'credit', label: 'Crédito' },
  { id: 'debit', label: 'Débito' },
]

const STATUS_LABEL = {
  pending: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Pronto',
  closed: 'Fechado',
  cancelled: 'Cancelado',
}

const STATUS_STYLE = {
  pending: 'bg-[var(--red-bg)] border-[var(--red-border)] text-[var(--red-text)]',
  preparing: 'bg-[var(--amber-bg)] border-[var(--amber-border)] text-[var(--amber-text)]',
  ready: 'bg-[var(--green-bg)] border-[var(--green-border)] text-[var(--green-text)]',
  closed: 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-3)]',
  cancelled: 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-3)]',
}

const FALLBACK_STATUS_STYLE = 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-3)]'

const getStaffSession = () => {
  try {
    return JSON.parse(localStorage.getItem('staff_session') || 'null')
  } catch { return null }
}

let nextPaymentId = 1

export default function Checkout() {
  const navigate = useNavigate()
  const { tableId } = useParams()
  const session = getStaffSession()
  const { businessId } = session || {}

  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

  const [tableNumber, setTableNumber] = useState(null)
  const [orders, setOrders] = useState([])
  const [settings, setSettings] = useState({ service_charge_percent: 0, max_discount_percent: 0 })

  // Bill adjustments
  const [discountInput, setDiscountInput] = useState('0')
  const [serviceChargeAccepted, setServiceChargeAccepted] = useState(true)

  // Payments
  const [payments, setPayments] = useState([{ id: ++nextPaymentId, method: null, amount: '' }])
  const [splitInput, setSplitInput] = useState('')

  useEffect(() => {
    if (!businessId || !tableId) return
    Promise.all([
      fetchTableOrdersForCheckout(tableId),
      fetchBusinessSettings(businessId),
      fetchTableNumber(tableId),
    ])
      .then(([ords, biz, num]) => {
        setOrders(ords)
        setSettings(biz)
        setTableNumber(num)
      })
      .catch(() => toast.error('Erro ao carregar conta.'))
      .finally(() => setLoading(false))
  }, [businessId, tableId])

  // Recompute default payment amount when total changes
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled')
  const cancelled = orders.filter((o) => o.status === 'cancelled')

  const subtotal = nonCancelled
    .flatMap((o) => o.order_items || [])
    .reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  const discountPct = Math.min(
    Math.max(parseFloat(discountInput) || 0, 0),
    settings.max_discount_percent
  )
  const discountAmount = subtotal * discountPct / 100
  const afterDiscount = subtotal - discountAmount

  const serviceChargePct = settings.service_charge_percent || 0
  const serviceChargeAmount = serviceChargeAccepted
    ? afterDiscount * serviceChargePct / 100
    : 0
  const total = afterDiscount + serviceChargeAmount

  const paymentTotal = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const remaining = Math.round((total - paymentTotal) * 100) / 100

  // Pre-fill first payment amount when total is computed and payments still have empty amount
  useEffect(() => {
    if (total > 0) {
      setPayments((prev) =>
        prev.map((p, i) => (i === 0 && p.amount === '' ? { ...p, amount: String(total.toFixed(2)) } : p))
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const canClose =
    nonCancelled.length > 0 &&
    payments.every((p) => p.method && parseFloat(p.amount) > 0) &&
    remaining <= 0

  const handleDiscountBlur = () => {
    const val = Math.min(
      Math.max(parseFloat(discountInput) || 0, 0),
      settings.max_discount_percent
    )
    setDiscountInput(String(val))
  }

  const addPayment = () => {
    setPayments((prev) => [
      ...prev,
      { id: ++nextPaymentId, method: null, amount: remaining > 0 ? String(remaining.toFixed(2)) : '' },
    ])
  }

  const removePayment = (id) => {
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  const updatePayment = (id, field, value) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const handleSplit = () => {
    const n = Math.max(2, Math.min(parseInt(splitInput) || 2, 20))
    const perPerson = Math.floor((total / n) * 100) / 100
    const lastAmount = Math.round((total - perPerson * (n - 1)) * 100) / 100
    setPayments(
      Array.from({ length: n }, (_, i) => ({
        id: ++nextPaymentId,
        method: null,
        amount: i < n - 1 ? String(perPerson) : String(lastAmount),
      }))
    )
    setSplitInput('')
  }

  const handleClose = async () => {
    if (!canClose || closing) return
    setClosing(true)
    try {
      const nonCancelledIds = nonCancelled.map((o) => o.id)
      await closeTableBill({
        nonCancelledOrderIds: nonCancelledIds,
        discountPercent: discountPct,
        serviceChargeAccepted,
        payments,
      })
      await updateTableStatus(tableId, 'free')
      toast.success('Conta fechada!')
      navigate('/staff/pdv')
    } catch {
      toast.error('Erro ao fechar conta. Tente novamente.')
    } finally {
      setClosing(false)
    }
  }

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
        <header className="h-[52px] px-4 flex items-center gap-3 bg-[var(--bg-primary)] border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => navigate('/staff/pdv')}
            className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-2)]"
          >
            <IconArrowLeft size={15} />
          </button>
          <span className="text-[15px] font-medium text-[var(--text)]">
            Mesa {tableNumber ?? '—'}
          </span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-3)] gap-2">
          <p className="text-[14px]">Nenhum pedido em aberto.</p>
          <button
            type="button"
            onClick={() => navigate('/staff/pdv')}
            className="text-[13px] text-accent"
          >
            Voltar ao PDV
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 h-[52px] px-4 flex items-center gap-3 bg-[var(--bg-primary)] border-b border-[var(--border)]">
        <button
          type="button"
          data-testid="btn-back"
          onClick={() => navigate('/staff/pdv')}
          className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)]"
        >
          <IconArrowLeft size={15} />
        </button>
        <span className="flex-1 text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
          Fechar Conta{tableNumber ? ` — Mesa ${tableNumber}` : ''}
        </span>
        <button
          type="button"
          data-testid="theme-toggle"
          onClick={handleToggleTheme}
          className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)]"
        >
          {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">

        {/* ── Pedidos ── */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-3">
            Pedidos
          </p>

          <div className="space-y-3">
            {[...nonCancelled, ...cancelled].map((order) => {
              const isCancelled = order.status === 'cancelled'
              return (
                <div
                  key={order.id}
                  className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] overflow-hidden"
                  data-testid={`order-${order.order_number}`}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                    <span className="text-[12px] font-medium text-[var(--text)]">
                      #{order.order_number}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-[2px] rounded-pill border ${STATUS_STYLE[order.status] || FALLBACK_STATUS_STYLE}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  <div className="px-3 py-2 space-y-1">
                    {(order.order_items || []).map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-baseline justify-between ${isCancelled ? 'opacity-50' : ''}`}
                      >
                        <span className="text-[12px] text-[var(--text)] flex-1 min-w-0 truncate pr-2">
                          {item.item_name}
                          <span className="text-[var(--text-3)]"> x{item.quantity}</span>
                        </span>
                        <span className="text-[12px] text-[var(--text-3)] flex-shrink-0">
                          {isCancelled ? 'R$ 0,00' : formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {(order.order_items || []).length === 0 && (
                      <p className="text-[12px] text-[var(--text-3)]">Sem itens</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Resumo ── */}
        <section className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[14px] px-4 py-4">
          <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-3">
            Resumo
          </p>

          <div className="space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-2)]">Subtotal</span>
              <span className="text-[13px] text-[var(--text)]">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--text-2)] flex-shrink-0">
                Desconto
                {settings.max_discount_percent > 0 && (
                  <span className="text-[11px] text-[var(--text-3)] ml-1">
                    (máx {settings.max_discount_percent}%)
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {discountAmount > 0 && (
                  <span className="text-[12px] text-[var(--green-text)]">
                    -{formatCurrency(discountAmount)}
                  </span>
                )}
                <div className="flex items-center gap-1 border border-[var(--border-strong)] rounded-[8px] px-2 h-[32px]">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    onBlur={handleDiscountBlur}
                    min="0"
                    max={settings.max_discount_percent}
                    className="w-[36px] bg-transparent text-[13px] text-[var(--text)] outline-none text-right"
                    data-testid="input-discount"
                  />
                  <span className="text-[12px] text-[var(--text-3)]">%</span>
                </div>
              </div>
            </div>

            {/* Service charge */}
            {serviceChargePct > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[var(--text-2)]">
                  Taxa de serviço ({serviceChargePct}%)
                </span>
                <div className="flex items-center gap-2">
                  {serviceChargeAccepted && serviceChargeAmount > 0 && (
                    <span className="text-[12px] text-[var(--text-3)]">
                      +{formatCurrency(serviceChargeAmount)}
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid="btn-toggle-service-charge"
                    onClick={() => {
                      const newAccepted = !serviceChargeAccepted
                      setServiceChargeAccepted(newAccepted)
                      const newServiceCharge = newAccepted
                        ? afterDiscount * serviceChargePct / 100
                        : 0
                      const newTotal = afterDiscount + newServiceCharge
                      if (payments.length === 1) {
                        setPayments((prev) =>
                          prev.map((p, i) =>
                            i === 0 ? { ...p, amount: String(newTotal.toFixed(2)) } : p
                          )
                        )
                      } else {
                        const n = payments.length
                        const perPerson = Math.floor((newTotal / n) * 100) / 100
                        const lastAmount = Math.round((newTotal - perPerson * (n - 1)) * 100) / 100
                        setPayments((prev) =>
                          prev.map((p, i) => ({
                            ...p,
                            amount: i < n - 1 ? String(perPerson) : String(lastAmount),
                          }))
                        )
                      }
                    }}
                    className={`flex items-center gap-1 h-[28px] px-3 rounded-pill border text-[11px] font-medium transition-colors ${
                      serviceChargeAccepted
                        ? 'bg-[var(--green-bg)] border-[var(--green-border)] text-[var(--green-text)]'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-strong)] text-[var(--text-3)]'
                    }`}
                  >
                    {serviceChargeAccepted ? (
                      <><IconCheck size={11} /> Incluída</>
                    ) : (
                      <><IconX size={11} /> Recusada</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[var(--text)]">Total</span>
              <span className="text-[20px] font-medium text-[var(--text)] tracking-[-0.5px]">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Pagamento ── */}
        <section className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[14px] px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em]">
              Pagamento
            </p>

            {/* Split */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-3)]">Dividir por</span>
              <input
                type="number"
                inputMode="numeric"
                value={splitInput}
                onChange={(e) => setSplitInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSplit()}
                placeholder="N"
                min="2"
                max="20"
                className="w-[40px] h-[28px] px-2 rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[12px] text-[var(--text)] outline-none text-center"
                data-testid="input-split"
              />
              <button
                type="button"
                data-testid="btn-split"
                onClick={handleSplit}
                disabled={!splitInput}
                className="h-[28px] px-3 rounded-[8px] bg-[var(--accent-light)] text-accent text-[11px] font-medium disabled:opacity-40 border border-[var(--border)]"
              >
                Dividir
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {payments.map((p, index) => (
              <div key={p.id} data-testid={`payment-row-${index}`}>
                {payments.length > 1 && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--text-3)]">
                      Pessoa {index + 1}
                    </span>
                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePayment(p.id)}
                        className="text-[var(--text-3)] hover:text-red-500"
                      >
                        <IconX size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Amount input */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] text-[var(--text-3)] flex-shrink-0">R$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={p.amount}
                    onChange={(e) => updatePayment(p.id, 'amount', e.target.value)}
                    placeholder="0,00"
                    className="flex-1 h-[38px] px-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[14px] text-[var(--text)] outline-none focus:border-accent"
                    data-testid={`input-amount-${index}`}
                  />
                </div>

                {/* Method selector */}
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      data-testid={`btn-method-${m.id}-${index}`}
                      onClick={() => updatePayment(p.id, 'method', m.id)}
                      className={`h-[34px] rounded-[8px] border text-[12px] font-medium transition-colors ${
                        p.method === m.id
                          ? 'bg-accent border-accent text-white'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-strong)] text-[var(--text-2)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add payment */}
          <button
            type="button"
            data-testid="btn-add-payment"
            onClick={addPayment}
            className="mt-3 flex items-center gap-1 text-[12px] text-accent"
          >
            <IconPlus size={14} />
            Adicionar forma de pagamento
          </button>

          {/* Remaining */}
          {payments.length > 0 && (
            <div className={`mt-3 flex items-center justify-between pt-3 border-t border-[var(--border)] ${remaining > 0 ? 'text-[var(--red-text)]' : 'text-[var(--green-text)]'}`}>
              <span className="text-[12px] font-medium">
                {remaining > 0 ? 'Falta' : remaining < 0 ? 'Troco' : 'Coberto ✓'}
              </span>
              {remaining !== 0 && (
                <span className="text-[13px] font-medium">
                  {formatCurrency(Math.abs(remaining))}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ── Fechar Conta ── */}
        <button
          type="button"
          data-testid="btn-close-bill"
          onClick={handleClose}
          disabled={!canClose || closing}
          className="w-full h-[50px] rounded-[12px] bg-accent text-white text-[15px] font-medium disabled:opacity-40 flex items-center justify-center"
        >
          {closing ? (
            <Spinner size="sm" className="border-white/30 border-t-white" />
          ) : (
            'Fechar Conta'
          )}
        </button>

        {!canClose && nonCancelled.length > 0 && (
          <p className="text-[11px] text-[var(--text-3)] text-center -mt-2">
            {payments.some((p) => !p.method)
              ? 'Selecione a forma de pagamento'
              : remaining > 0
              ? `Falta ${formatCurrency(remaining)} para cobrir o total`
              : ''}
          </p>
        )}
      </div>
    </div>
  )
}
