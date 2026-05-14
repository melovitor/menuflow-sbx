import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconMailForward, IconMoon, IconSun } from '@tabler/icons-react'
import { resetPassword } from '../../services/authService'
import { toggleTheme } from '../../utils/theme'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

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

  const header = (
    <header className="h-[52px] px-5 flex items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border)]">
      <span className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
        Menu<span className="text-accent">Flow</span>
      </span>
      <button
        type="button"
        data-testid="theme-toggle"
        onClick={handleToggleTheme}
        className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors duration-150"
      >
        {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
      </button>
    </header>
  )

  /* ── Estado de sucesso ── */
  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col" data-testid="success-screen">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
          <div className="w-full max-w-[360px] text-center">

            <div className="w-[56px] h-[56px] rounded-full bg-[var(--accent-light)] border border-accent flex items-center justify-center mx-auto mb-5">
              <IconMailForward size={26} className="text-accent dark:text-[var(--accent-text)]" />
            </div>

            <h2 className="text-[18px] font-medium text-[var(--text)] tracking-[-0.3px] mb-[6px]">
              Link enviado!
            </h2>

            <p className="text-[13px] text-[var(--text-2)] mb-[4px]">
              Se o e-mail
            </p>
            <p className="text-[14px] font-medium text-[var(--text)] mb-[4px] break-all">
              {email}
            </p>
            <p className="text-[13px] text-[var(--text-2)] mb-8">
              estiver cadastrado, você receberá o link em instantes.
            </p>

            <Button
              fullWidth
              onClick={() => navigate('/login')}
              data-testid="btn-go-login"
            >
              Voltar ao login
            </Button>

            <p className="text-[12px] text-[var(--text-3)] mt-4">
              Não recebeu? Verifique sua caixa de spam.
            </p>

          </div>
        </div>
      </div>
    )
  }

  /* ── Formulário ── */
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
      {header}

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[360px]">

          {/* Título */}
          <div className="mb-7">
            <h1 className="text-[20px] font-medium text-[var(--text)] tracking-[-0.5px] mb-[5px]">
              Recuperar senha
            </h1>
            <p className="text-[13px] text-[var(--text-2)]">
              Informe seu e-mail para receber o link de recuperação
            </p>
          </div>

          {/* Campo */}
          <div className="flex flex-col gap-4">

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="email"
              data-testid="input-email"
            />

            {/* Erro */}
            {error && (
              <p data-testid="error-message" className="text-[12px] text-red-500 -mt-1">
                {error}
              </p>
            )}

            <Button
              fullWidth
              loading={loading}
              onClick={handleSend}
              data-testid="btn-send"
            >
              Enviar link de recuperação
            </Button>

          </div>

          {/* Link login */}
          <p className="text-center text-[13px] text-[var(--text-2)] mt-8">
            Lembrou a senha?{' '}
            <Link
              to="/login"
              data-testid="link-login"
              className="text-accent hover:underline"
            >
              Entrar
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
