import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconMailForward, IconArrowLeft } from '@tabler/icons-react'
import { resetPassword } from '../../services/authService'
import Button from '../../components/ui/Button'
import AuthShell from '../../components/auth/AuthShell'
import TextInput from '../../components/auth/TextInput'

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) { setError('Informe seu e-mail.'); return }
    if (!isValidEmail(email.trim())) { setError('E-mail inválido.'); return }
    setError('')
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSuccess(true)
    } catch {
      setError('Falha ao enviar o link. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend()
  }

  if (success) {
    return (
      <AuthShell>
        <div className="text-center" data-testid="success-screen">
          <div
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'var(--accent-light)', border: '1px solid var(--accent)',
              color: 'var(--accent-text)', boxShadow: '0 0 24px -6px var(--glow-2)',
            }}
          >
            <IconMailForward size={26} />
          </div>
          <h2 className="text-[20px] font-semibold text-[var(--text)] tracking-title mb-2">Link enviado!</h2>
          <p className="text-[13.5px] text-[var(--text-2)] mb-1">Se o e-mail</p>
          <p className="text-[14px] font-medium text-[var(--text)] mb-1 break-all">{email}</p>
          <p className="text-[13.5px] text-[var(--text-2)] mb-7">
            estiver cadastrado, você receberá o link em instantes.
          </p>
          <Button fullWidth size="lg" onClick={() => navigate('/login')} data-testid="btn-go-login">
            Voltar ao login
          </Button>
          <p className="text-[12px] text-[var(--text-3)] mt-4">Não recebeu? Verifique sua caixa de spam.</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-2)] hover:text-[var(--text)] transition-colors mb-5"
      >
        <IconArrowLeft size={15} /> Voltar ao login
      </Link>

      <div className="mb-7">
        <h1 className="text-[24px] font-semibold text-[var(--text)] tracking-title leading-tight mb-1.5">
          Recuperar senha
        </h1>
        <p className="text-[14px] text-[var(--text-2)]">
          Informe seu e-mail para receber o link de recuperação.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <TextInput
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="email"
          inputMode="email"
          data-testid="input-email"
        />

        {error && (
          <div data-testid="error-message" className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[var(--red-bg)] border border-[var(--red-border)]">
            <IconAlertTriangle size={15} className="text-[var(--red-text)] shrink-0" />
            <span className="text-[12.5px] text-[var(--red-text)] leading-snug">{error}</span>
          </div>
        )}

        <Button fullWidth size="lg" loading={loading} onClick={handleSend} data-testid="btn-send">
          Enviar link de recuperação
        </Button>
      </div>

      <p className="text-center text-[13px] text-[var(--text-2)] mt-7">
        Lembrou a senha?{' '}
        <Link to="/login" data-testid="link-login" className="text-[var(--accent-text)] font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
