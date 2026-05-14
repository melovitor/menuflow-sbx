import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconBrandGoogle,
  IconEye,
  IconEyeOff,
  IconMoon,
  IconSun,
  IconCircleCheck,
} from '@tabler/icons-react'
import { signUp, signInWithGoogle } from '../../services/authService'
import { toggleTheme } from '../../utils/theme'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const validate = () => {
    if (!name.trim()) return 'Informe seu nome completo.'
    if (name.trim().length < 2) return 'Nome muito curto.'
    if (!email.trim()) return 'Informe seu e-mail.'
    if (!isValidEmail(email.trim())) return 'E-mail inválido.'
    if (!password) return 'Crie uma senha.'
    if (password.length < 6) return 'A senha deve ter no mínimo 6 caracteres.'
    if (password !== confirmPassword) return 'As senhas não coincidem.'
    return ''
  }

  const handleSignUp = async () => {
    const msg = validate()
    if (msg) { setError(msg); return }
    setError('')
    setLoading(true)
    try {
      await signUp(email.trim(), password, name.trim())
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

  const handleGoogleSignUp = async () => {
    setError('')
    setLoadingGoogle(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('Falha ao cadastrar com Google. Tente novamente.')
      setLoadingGoogle(false)
    }
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

            <div className="w-[56px] h-[56px] rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center mx-auto mb-5">
              <IconCircleCheck size={28} className="text-[var(--green-text)]" />
            </div>

            <h2 className="text-[18px] font-medium text-[var(--text)] tracking-[-0.3px] mb-[6px]">
              Verifique seu e-mail
            </h2>
            <p className="text-[13px] text-[var(--text-2)] mb-[4px]">
              Enviamos um link de confirmação para
            </p>
            <p className="text-[14px] font-medium text-[var(--text)] mb-8 break-all">
              {email}
            </p>

            <Button
              fullWidth
              onClick={() => navigate('/login')}
              data-testid="btn-go-login"
            >
              Ir para o login
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
              Criar sua conta
            </h1>
            <p className="text-[13px] text-[var(--text-2)]">
              Comece a gerenciar seus estabelecimentos
            </p>
          </div>

          {/* Campos */}
          <div className="flex flex-col gap-4">

            <Input
              label="Nome completo"
              type="text"
              placeholder="João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              data-testid="input-name"
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              data-testid="input-email"
            />

            {/* Senha */}
            <div className="flex flex-col gap-[5px]">
              <label className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em]">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mín. 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  data-testid="input-password"
                  className="w-full h-10 px-3 pr-10 text-[13px] text-[var(--text)]
                    bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded-input
                    outline-none transition-colors duration-150
                    focus:border-accent placeholder:text-[var(--text-3)]"
                />
                <button
                  type="button"
                  data-testid="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                >
                  {showPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div className="flex flex-col gap-[5px]">
              <label className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em]">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  data-testid="input-confirm-password"
                  className="w-full h-10 px-3 pr-10 text-[13px] text-[var(--text)]
                    bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded-input
                    outline-none transition-colors duration-150
                    focus:border-accent placeholder:text-[var(--text-3)]"
                />
                <button
                  type="button"
                  data-testid="toggle-confirm-password"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                >
                  {showConfirm ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <p data-testid="error-message" className="text-[12px] text-red-500 -mt-1">
                {error}
              </p>
            )}

            <Button
              fullWidth
              loading={loading}
              onClick={handleSignUp}
              data-testid="btn-signup"
            >
              Criar conta
            </Button>

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[11px] text-[var(--text-3)]">ou</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <Button
              fullWidth
              variant="secondary"
              loading={loadingGoogle}
              onClick={handleGoogleSignUp}
              data-testid="btn-google"
            >
              <IconBrandGoogle size={16} />
              Cadastrar com Google
            </Button>

          </div>

          {/* Link login */}
          <p className="text-center text-[13px] text-[var(--text-2)] mt-8">
            Já tem conta?{' '}
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
