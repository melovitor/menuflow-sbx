import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconMoon, IconSun, IconTrash } from '@tabler/icons-react'
import { useCartStore } from '../../stores/cartStore'
import { getCustomerSession } from '../../utils/customerSession'
import { createCounterOrder } from '../../services/orderService'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/formatters'
import { toggleTheme } from '../../utils/theme'
import Spinner from '../../components/ui/Spinner'

const NOTES_MAX = 140
const QUANTITY_ALERT_THRESHOLD = 10

export default function Cart() {
  const { businessSlug } = useParams()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const cart = useCartStore(businessSlug)
  const items = cart.items
  const total = cart.total()

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Quantity alert modal state
  const [quantityAlert, setQuantityAlert] = useState(null) // { id, name, pendingQty }

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleQuantityChange = (item, delta) => {
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      cart.updateQuantity(item.id, 0)
      return
    }
    if (newQty >= QUANTITY_ALERT_THRESHOLD) {
      setQuantityAlert({ id: item.id, name: item.name, pendingQty: newQty })
      return
    }
    cart.updateQuantity(item.id, newQty)
  }

  const handleConfirmQuantityAlert = () => {
    if (!quantityAlert) return
    cart.updateQuantity(quantityAlert.id, quantityAlert.pendingQty)
    setQuantityAlert(null)
  }

  const handlePlaceOrder = async () => {
    if (submitting || items.length === 0) return

    const session = getCustomerSession(businessSlug)
    if (!session) {
      navigate(`/order/${businessSlug}/identify`, { replace: true })
      return
    }

    if (!navigator.onLine) {
      setErrorMsg('Sem conexão. Seu pedido não foi enviado.')
      return
    }

    setErrorMsg('')
    setSubmitting(true)
    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', businessSlug)
        .single()

      if (!biz) throw new Error('Negócio não encontrado')

      const orderItems = items.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        unitPrice: item.promo_price ?? item.price,
        quantity: item.quantity,
        notes: item.notes || null,
      }))

      await createCounterOrder({
        businessId: biz.id,
        customerId: session.customerId,
        customerName: session.customerName,
        items: orderItems,
      })

      sessionStorage.setItem(`orders_placed_${businessSlug}`, '1')
      cart.clear()
      navigate(`/order/${businessSlug}/status`, { replace: true })
    } catch {
      setErrorMsg('Erro ao enviar pedido. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* Header */}
      <header
        className="h-[52px] px-4 flex items-center justify-between flex-shrink-0
          bg-[var(--bg-primary)] border-b border-[var(--border)] sticky top-0 z-10"
      >
        <button
          type="button"
          data-testid="btn-back"
          onClick={() => navigate(-1)}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center
            border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
        >
          <IconArrowLeft size={15} />
        </button>

        <span className="text-[13px] font-medium text-[var(--text)] tracking-[-0.2px]">
          Carrinho
        </span>

        <button
          type="button"
          data-testid="btn-toggle-theme"
          onClick={handleToggleTheme}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center
            border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
        >
          {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </header>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <p className="text-[15px] font-medium text-[var(--text)]">Seu carrinho está vazio</p>
          <p className="text-[13px] text-[var(--text-2)]">Adicione itens do cardápio para continuar.</p>
          <button
            type="button"
            data-testid="btn-back-to-menu"
            onClick={() => navigate(-1)}
            className="mt-2 h-[44px] px-6 rounded-[10px] text-[14px] font-medium text-white flex items-center"
            style={{ background: 'var(--accent)' }}
          >
            Ver cardápio
          </button>
        </div>
      )}

      {/* Cart items */}
      {items.length > 0 && (
        <div className="flex-1 px-4 py-4 pb-[120px] flex flex-col gap-3 max-w-lg mx-auto w-full">

          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`cart-item-${item.id}`}
              className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                {/* Photo */}
                <img
                  src={item.photo_url}
                  alt={item.name}
                  className="w-[68px] h-[68px] rounded-[8px] object-cover flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text)] truncate">{item.name}</p>

                  <div className="flex items-center gap-2 mt-[2px]">
                    {item.promo_price != null ? (
                      <>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                          {formatCurrency(item.promo_price)}
                        </span>
                        <span className="text-[11px] text-[var(--text-3)] line-through">
                          {formatCurrency(item.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] font-medium text-[var(--text-2)]">
                        {formatCurrency(item.price)}
                      </span>
                    )}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`btn-decrease-${item.id}`}
                        onClick={() => handleQuantityChange(item, -1)}
                        className="w-[28px] h-[28px] rounded-full border border-[var(--border-strong)]
                          bg-[var(--bg-secondary)] text-[var(--text-2)] flex items-center justify-center
                          text-[16px] font-medium leading-none"
                      >
                        {item.quantity === 1 ? (
                          <IconTrash size={13} />
                        ) : (
                          '−'
                        )}
                      </button>
                      <span
                        data-testid={`qty-${item.id}`}
                        className="text-[14px] font-medium text-[var(--text)] w-[20px] text-center"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        data-testid={`btn-increase-${item.id}`}
                        onClick={() => handleQuantityChange(item, 1)}
                        className="w-[28px] h-[28px] rounded-full border border-[var(--border-strong)]
                          bg-[var(--bg-secondary)] text-[var(--text-2)] flex items-center justify-center
                          text-[16px] font-medium leading-none"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-[13px] font-medium text-[var(--text)]">
                      {formatCurrency((item.promo_price ?? item.price) * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="px-3 pb-3">
                <textarea
                  data-testid={`notes-${item.id}`}
                  placeholder="Observações (ex: sem cebola, ponto da carne...)"
                  value={item.notes || ''}
                  maxLength={NOTES_MAX}
                  rows={2}
                  onChange={(e) => cart.updateNotes(item.id, e.target.value)}
                  className="w-full px-3 py-2 text-[12px] rounded-[8px] resize-none outline-none
                    bg-[var(--bg-secondary)] border border-[var(--border)]
                    text-[var(--text)] placeholder:text-[var(--text-3)]
                    focus:border-[var(--border-strong)]"
                />
                <p className="text-[10px] text-[var(--text-3)] text-right mt-[2px]">
                  {(item.notes || '').length}/{NOTES_MAX}
                </p>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* Bottom bar */}
      {items.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)] border-t border-[var(--border)]
            px-4 py-4 flex flex-col gap-2"
        >
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[var(--text-2)]">Total</span>
            <span className="text-[15px] font-medium text-[var(--text)]">{formatCurrency(total)}</span>
          </div>

          {errorMsg && (
            <p className="text-[12px] text-center" style={{ color: '#EF4444' }}>{errorMsg}</p>
          )}

          <button
            type="button"
            data-testid="btn-place-order"
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="w-full h-[48px] rounded-[12px] text-[14px] font-medium text-white
              flex items-center justify-center transition-opacity"
            style={{ background: 'var(--accent)', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? <Spinner size="sm" /> : 'Fazer pedido'}
          </button>
        </div>
      )}

      {/* Quantity alert modal */}
      {quantityAlert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-sm mx-4 mb-6 bg-[var(--bg-primary)] border border-[var(--border)]
              rounded-[16px] p-5"
          >
            <p className="text-[15px] font-medium text-[var(--text)] mb-2">
              Quantidade alta
            </p>
            <p className="text-[13px] text-[var(--text-2)] mb-5">
              Você quer adicionar {quantityAlert.pendingQty}× {quantityAlert.name}?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="btn-alert-cancel"
                onClick={() => setQuantityAlert(null)}
                className="flex-1 h-[44px] rounded-[10px] text-[14px] font-medium
                  border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
              >
                Corrigir
              </button>
              <button
                type="button"
                data-testid="btn-alert-confirm"
                onClick={handleConfirmQuantityAlert}
                className="flex-1 h-[44px] rounded-[10px] text-[14px] font-medium text-white"
                style={{ background: 'var(--accent)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
