import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconMoon, IconSun } from '@tabler/icons-react'
import { fetchBusinessBySlug } from '../../services/businessService'
import { fetchCustomerByPhone, createCustomer } from '../../services/customerService'
import { saveCustomerSession, getCustomerSession, getSavedPhone } from '../../utils/customerSession'
import { formatPhone } from '../../utils/formatters'
import { toggleTheme } from '../../utils/theme'
import Spinner from '../../components/ui/Spinner'

const NAME_MAX = 60

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? '?'
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

export default function Identify() {
  const { businessSlug } = useParams()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  // 'phone' → 'confirm' (found) or 'name' (not found)
  const [step, setStep] = useState('phone')
  const [phoneRaw, setPhoneRaw] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const phoneInputRef = useRef(null)
  const nameInputRef = useRef(null)

  // Load business + redirect if session already exists
  useEffect(() => {
    const session = getCustomerSession(businessSlug)
    if (session) {
      navigate(`/order/${businessSlug}/counter`, { replace: true })
      return
    }
    fetchBusinessBySlug(businessSlug)
      .then(setBusiness)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessSlug, navigate])

  // Pre-fill saved phone
  useEffect(() => {
    const saved = getSavedPhone(businessSlug)
    if (saved) setPhoneRaw(saved)
  }, [businessSlug])

  // Auto-focus on step change
  useEffect(() => {
    if (step === 'phone') phoneInputRef.current?.focus()
    if (step === 'name') nameInputRef.current?.focus()
  }, [step])

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const phoneDisplay = phoneRaw.length >= 10 ? formatPhone(phoneRaw) : phoneRaw
  const phoneValid = phoneRaw.length >= 10

  // ── Step 1: look up phone ─────────────────────────────────────
  const handlePhoneSubmit = async () => {
    if (!phoneValid || submitting || !business) return
    setErrorMsg('')
    setSubmitting(true)
    try {
      const customer = await fetchCustomerByPhone(business.id, phoneRaw)
      if (customer) {
        setFoundCustomer(customer)
        setStep('confirm')
      } else {
        setStep('name')
      }
    } catch {
      setErrorMsg('Erro ao verificar o número. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step 2a: confirmed identity ───────────────────────────────
  const handleConfirmYes = () => {
    saveCustomerSession(businessSlug, foundCustomer)
    navigate(`/order/${businessSlug}/counter`, { replace: true })
  }

  // ── Step 2b: not me — clear phone and go back ─────────────────
  const handleConfirmNo = () => {
    setFoundCustomer(null)
    setPhoneRaw('')
    setStep('phone')
  }

  // ── Step 3: create new customer ───────────────────────────────
  const handleCreateCustomer = async () => {
    if (!customerName.trim() || submitting || !business) return
    setErrorMsg('')
    setSubmitting(true)
    try {
      const customer = await createCustomer(business.id, customerName.trim(), phoneRaw)
      saveCustomerSession(businessSlug, customer)
      navigate(`/order/${businessSlug}/counter`, { replace: true })
    } catch {
      setErrorMsg('Erro ao criar conta. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
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

  // ── Main render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* Header */}
      <header
        className="h-[52px] px-4 flex items-center justify-between flex-shrink-0
          bg-[var(--bg-primary)] border-b border-[var(--border)]"
      >
        {/* Back only when not on initial phone step */}
        {step !== 'phone' ? (
          <button
            type="button"
            data-testid="btn-back"
            onClick={() => {
              if (step === 'confirm') handleConfirmNo()
              else { setStep('phone'); setErrorMsg('') }
            }}
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center
              border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)]"
          >
            <IconArrowLeft size={15} />
          </button>
        ) : (
          <div className="w-[32px]" />
        )}

        {/* Business */}
        <span className="text-[13px] font-medium text-[var(--text)] tracking-[-0.2px]">
          {business.name}
        </span>

        {/* Theme toggle */}
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

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-5 py-10 max-w-sm mx-auto w-full">

        {/* ── STEP: phone ──────────────────────────────────────── */}
        {step === 'phone' && (
          <>
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-[var(--text)] tracking-[-0.4px] mb-1">
                Qual é o seu número?
              </h1>
              <p className="text-[14px] text-[var(--text-2)]">
                Para acompanhar seus pedidos em tempo real.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[6px]">
                  WhatsApp ou celular
                </label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  data-testid="input-phone"
                  placeholder="(11) 99999-9999"
                  value={phoneDisplay}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                    setPhoneRaw(digits)
                    setErrorMsg('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                  className="w-full h-[44px] px-3 text-[15px] rounded-[10px] outline-none
                    bg-[var(--bg-primary)] border border-[var(--border-strong)]
                    text-[var(--text)] placeholder:text-[var(--text-3)]
                    focus:border-accent"
                />
                {errorMsg && (
                  <p className="text-[12px] mt-[6px]" style={{ color: '#EF4444' }}>{errorMsg}</p>
                )}
              </div>

              <button
                type="button"
                data-testid="btn-phone-submit"
                onClick={handlePhoneSubmit}
                disabled={!phoneValid || submitting}
                className="w-full h-[48px] rounded-[12px] text-[14px] font-medium text-white
                  flex items-center justify-center transition-opacity"
                style={{ background: 'var(--accent)', opacity: !phoneValid || submitting ? 0.5 : 1 }}
              >
                {submitting ? <Spinner size="sm" /> : 'Continuar'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: confirm ────────────────────────────────────── */}
        {step === 'confirm' && foundCustomer && (
          <>
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-medium"
                style={{ background: 'var(--accent)' }}
              >
                {getInitials(foundCustomer.name)}
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-[20px] font-medium text-[var(--text)] tracking-[-0.4px] mb-1">
                Olá, {foundCustomer.name.split(' ')[0]}!
              </h1>
              <p className="text-[14px] text-[var(--text-2)]">
                Este número já tem uma conta conosco. É você?
              </p>
              <p className="text-[13px] text-[var(--text-3)] mt-1">
                {phoneDisplay}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                data-testid="btn-confirm-yes"
                onClick={handleConfirmYes}
                className="w-full h-[48px] rounded-[12px] text-[14px] font-medium text-white
                  flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                Sim, sou eu
              </button>
              <button
                type="button"
                data-testid="btn-confirm-no"
                onClick={handleConfirmNo}
                className="w-full h-[48px] rounded-[12px] text-[14px] font-medium
                  flex items-center justify-center border border-[var(--border-strong)]
                  bg-[var(--bg-primary)] text-[var(--text-2)]"
              >
                Não sou eu
              </button>
            </div>
          </>
        )}

        {/* ── STEP: name ───────────────────────────────────────── */}
        {step === 'name' && (
          <>
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-[var(--text)] tracking-[-0.4px] mb-1">
                Como você se chama?
              </h1>
              <p className="text-[14px] text-[var(--text-2)]">
                Primeira vez por aqui? Bem-vindo!
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Phone (read-only, with edit option) */}
              <div
                className="flex items-center justify-between px-3 h-[40px] rounded-[10px]
                  border border-[var(--border)] bg-[var(--bg-tertiary)]"
              >
                <span className="text-[13px] text-[var(--text-2)]">{phoneDisplay}</span>
                <button
                  type="button"
                  data-testid="btn-edit-phone"
                  onClick={() => { setStep('phone'); setErrorMsg('') }}
                  className="text-[12px] font-medium text-accent"
                >
                  Alterar
                </button>
              </div>

              {/* Name input */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[6px]">
                  Seu nome
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  data-testid="input-name"
                  placeholder="Nome completo"
                  value={customerName}
                  maxLength={NAME_MAX}
                  onChange={(e) => { setCustomerName(e.target.value); setErrorMsg('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomer()}
                  className="w-full h-[44px] px-3 text-[15px] rounded-[10px] outline-none
                    bg-[var(--bg-primary)] border border-[var(--border-strong)]
                    text-[var(--text)] placeholder:text-[var(--text-3)]
                    focus:border-accent"
                />
                <div className="flex justify-between mt-[5px]">
                  {errorMsg ? (
                    <p className="text-[12px]" style={{ color: '#EF4444' }}>{errorMsg}</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-[10px] text-[var(--text-3)]">
                    {customerName.length}/{NAME_MAX}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="btn-create-customer"
                onClick={handleCreateCustomer}
                disabled={!customerName.trim() || submitting}
                className="w-full h-[48px] rounded-[12px] text-[14px] font-medium text-white
                  flex items-center justify-center transition-opacity"
                style={{
                  background: 'var(--accent)',
                  opacity: !customerName.trim() || submitting ? 0.5 : 1,
                }}
              >
                {submitting ? <Spinner size="sm" /> : 'Entrar'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
