import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconMoon, IconSun, IconCheck } from '@tabler/icons-react'
import { supabase } from '../../services/supabase'
import { toggleTheme } from '../../utils/theme'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  // 'loading' → waiting for Supabase to process token
  // 'form'    → ready to accept new password
  // 'success' → password updated
  // 'invalid' → no valid recovery session
  const [state, setState] = useState('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  useEffect(() => {
    // Supabase detects the recovery token in the URL hash and emits PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setState('form')
      } else if (event === 'SIGNED_OUT') {
        setState('invalid')
      }
    })

    // Fallback: if no event fires within 3s, check if there's a session anyway
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) setState('invalid')
      else setState('form')
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const validate = () => {
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    if (password !== confirm) return 'As senhas não coincidem.'
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      await supabase.auth.signOut()
      setState('success')
    } catch {
      setError('Erro ao atualizar a senha. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const header = (
    <header className="h-[52px] px-5 flex items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border)]">
      <span className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
        Menu<span className="text-accent">Flow</span>
      </span>
      <button
        type="button"
        onClick={handleToggleTheme}
        className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)]"
      >
        {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
      </button>
    </header>
  )

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
        {header}
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-4">
          <p className="text-[15px] font-medium text-[var(--text)]">Link inválido ou expirado</p>
          <p className="text-[13px] text-[var(--text-2)]">Solicite um novo link de recuperação.</p>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="h-[44px] px-6 rounded-[10px] text-[14px] font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            Solicitar novo link
          </button>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col" data-testid="success-screen">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          <div
            className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}
          >
            <IconCheck size={26} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--text)] tracking-[-0.3px] mb-2">
            Senha atualizada!
          </h2>
          <p className="text-[13px] text-[var(--text-2)] mb-8">
            Sua senha foi redefinida com sucesso.
          </p>
          <Button fullWidth onClick={() => navigate('/login')} data-testid="btn-go-login">
            Ir para o login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
      {header}

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[360px]">

          <div className="mb-7">
            <h1 className="text-[20px] font-medium text-[var(--text)] tracking-[-0.5px] mb-[5px]">
              Nova senha
            </h1>
            <p className="text-[13px] text-[var(--text-2)]">
              Escolha uma senha segura para sua conta.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              label="Nova senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              data-testid="input-password"
            />

            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              data-testid="input-confirm"
            />

            {error && (
              <p data-testid="error-message" className="text-[12px] -mt-1" style={{ color: '#EF4444' }}>
                {error}
              </p>
            )}

            <Button
              fullWidth
              loading={submitting}
              onClick={handleSubmit}
              data-testid="btn-submit"
            >
              Salvar nova senha
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
