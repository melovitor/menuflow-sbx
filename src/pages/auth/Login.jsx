import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconAlertTriangle } from '@tabler/icons-react'
import { signIn } from '../../services/authService'
import Button from '../../components/ui/Button'
import AuthShell from '../../components/auth/AuthShell'
import TextInput from '../../components/auth/TextInput'
import PasswordInput from '../../components/auth/PasswordInput'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSignIn()
  }

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold text-[var(--text)] tracking-title leading-tight mb-1.5">
          Bem-vindo de volta
        </h1>
        <p className="text-[14px] text-[var(--text-2)]">
          Entre para gerenciar seus estabelecimentos.
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

        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            data-testid="input-password"
            data-testid-toggle="toggle-password"
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              data-testid="link-forgot-password"
              className="text-[12px] text-[var(--accent-text)] hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        {error && (
          <div
            data-testid="error-message"
            className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[var(--red-bg)] border border-[var(--red-border)]"
          >
            <IconAlertTriangle size={15} className="text-[var(--red-text)] shrink-0" />
            <span className="text-[12.5px] text-[var(--red-text)] leading-snug">{error}</span>
          </div>
        )}

        <Button fullWidth size="lg" loading={loading} onClick={handleSignIn} data-testid="btn-signin">
          Entrar
        </Button>
      </div>

      <p className="text-center text-[13px] text-[var(--text-2)] mt-7">
        Não tem conta?{' '}
        <Link to="/register" data-testid="link-register" className="text-[var(--accent-text)] font-medium hover:underline">
          Cadastre-se
        </Link>
      </p>
    </AuthShell>
  )
}
