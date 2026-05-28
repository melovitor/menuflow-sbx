import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconMail } from '@tabler/icons-react'
import { signUp } from '../../services/authService'
import Button from '../../components/ui/Button'
import AuthShell from '../../components/auth/AuthShell'
import TextInput from '../../components/auth/TextInput'
import PasswordInput from '../../components/auth/PasswordInput'
import PasswordStrength from '../../components/auth/PasswordStrength'

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validate = () => {
    if (!name.trim()) return 'Informe seu nome completo.'
    if (name.trim().length < 2) return 'Nome muito curto.'
    if (!email.trim()) return 'Informe seu e-mail.'
    if (!isValidEmail(email.trim())) return 'E-mail inválido.'
    if (!password) return 'Crie uma senha.'
    if (password.length < 6) return 'A senha deve ter no mínimo 6 caracteres.'
    if (password !== confirmPassword) return 'As senhas não coincidem.'
    if (!privacyAccepted) return 'Você precisa aceitar a Política de Privacidade para continuar.'
    return ''
  }

  const handleSignUp = async () => {
    const msg = validate()
    if (msg) { setError(msg); return }
    setError('')
    setLoading(true)
    try {
      await signUp(email.trim(), password, name.trim(), {
        privacy_accepted_at: new Date().toISOString(),
        privacy_version: '1.0',
      })
      setSuccess(true)
    } catch (err) {
      if (err.message?.toLowerCase().includes('already registered')) {
        setError('Este e-mail já está cadastrado. Tente entrar.')
      } else {
        setError('Falha ao criar conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
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
            <IconMail size={26} />
          </div>
          <h2 className="text-[20px] font-semibold text-[var(--text)] tracking-title mb-2">
            Verifique seu e-mail
          </h2>
          <p className="text-[13.5px] text-[var(--text-2)] mb-1">Enviamos um link de confirmação para</p>
          <p className="text-[14px] font-medium text-[var(--text)] mb-7 break-all">{email}</p>
          <Button fullWidth size="lg" onClick={() => navigate('/login')} data-testid="btn-go-login">
            Ir para o login
          </Button>
          <p className="text-[12px] text-[var(--text-3)] mt-4">Não recebeu? Verifique sua caixa de spam.</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold text-[var(--text)] tracking-title leading-tight mb-1.5">
          Criar sua conta
        </h1>
        <p className="text-[14px] text-[var(--text-2)]">Comece a gerenciar seus estabelecimentos.</p>
      </div>

      <div className="flex flex-col gap-4">
        <TextInput
          label="Nome completo"
          placeholder="João Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          data-testid="input-name"
        />

        <TextInput
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          data-testid="input-email"
        />

        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Senha"
            placeholder="Mín. 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            data-testid="input-password"
            data-testid-toggle="toggle-password"
          />
          <PasswordStrength value={password} data-testid="password-strength" />
        </div>

        <PasswordInput
          label="Confirmar senha"
          placeholder="Repita a senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={confirmPassword.length > 0 && confirmPassword !== password}
          data-testid="input-confirm-password"
          data-testid-toggle="toggle-confirm-password"
        />

        {/* Consentimento LGPD */}
        <label data-testid="label-privacy-consent" className="flex items-start gap-3 cursor-pointer select-none">
          <span className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              data-testid="checkbox-privacy"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="peer appearance-none w-[18px] h-[18px] rounded-[5px] border border-[var(--border-strong)]
                bg-[var(--bg-primary)] checked:bg-accent checked:border-accent cursor-pointer transition-colors"
            />
            <svg
              viewBox="0 0 14 14"
              className="absolute inset-0 m-auto w-[11px] h-[11px] opacity-0 peer-checked:opacity-100 pointer-events-none"
              style={{ color: 'var(--accent-contrast)' }}
            >
              <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[12.5px] text-[var(--text-2)] leading-relaxed">
            Li e aceito a{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--accent-text)] hover:underline">
              Política de Privacidade
            </a>{' '}e os{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--accent-text)] hover:underline">
              Termos de Uso
            </a>
          </span>
        </label>

        {error && (
          <div data-testid="error-message" className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[var(--red-bg)] border border-[var(--red-border)]">
            <IconAlertTriangle size={15} className="text-[var(--red-text)] shrink-0" />
            <span className="text-[12.5px] text-[var(--red-text)] leading-snug">{error}</span>
          </div>
        )}

        <Button fullWidth size="lg" loading={loading} onClick={handleSignUp} data-testid="btn-signup">
          Criar conta
        </Button>
      </div>

      <p className="text-center text-[13px] text-[var(--text-2)] mt-7">
        Já tem conta?{' '}
        <Link to="/login" data-testid="link-login" className="text-[var(--accent-text)] font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
