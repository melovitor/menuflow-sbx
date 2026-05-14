import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconBrandGoogle, IconEye, IconEyeOff, IconMoon, IconSun } from '@tabler/icons-react'
import { signIn, signInWithGoogle } from '../../services/authService'
import { toggleTheme } from '../../utils/theme'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/owner/home')
    } catch {
      setError('E-mail ou senha incorretos. Verifique e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoadingGoogle(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('Falha ao entrar com Google. Tente novamente.')
      setLoadingGoogle(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSignIn()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* Header */}
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

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[360px]">

          {/* Page title */}
          <div className="mb-7">
            <h1 className="text-[20px] font-medium text-[var(--text)] tracking-[-0.5px] mb-[5px]">
              Bem-vindo de volta
            </h1>
            <p className="text-[13px] text-[var(--text-2)]">
              Entre para gerenciar seus estabelecimentos
            </p>
          </div>

          {/* Form */}
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

            {/* Password with eye toggle */}
            <div className="flex flex-col gap-[5px]">
              <label className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em]">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
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
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  data-testid="link-forgot-password"
                  className="text-[11px] text-accent hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p data-testid="error-message" className="text-[12px] text-red-500 -mt-1">
                {error}
              </p>
            )}

            <Button
              fullWidth
              loading={loading}
              onClick={handleSignIn}
              data-testid="btn-signin"
            >
              Entrar
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[11px] text-[var(--text-3)]">ou</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <Button
              fullWidth
              variant="secondary"
              loading={loadingGoogle}
              onClick={handleGoogleSignIn}
              data-testid="btn-google"
            >
              <IconBrandGoogle size={16} />
              Entrar com Google
            </Button>
          </div>

          {/* Register link */}
          <p className="text-center text-[13px] text-[var(--text-2)] mt-8">
            Não tem conta?{' '}
            <Link
              to="/register"
              data-testid="link-register"
              className="text-accent hover:underline"
            >
              Cadastre-se
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
