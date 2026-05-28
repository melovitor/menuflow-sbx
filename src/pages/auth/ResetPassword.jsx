import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import { supabase } from '../../services/supabase'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import AuthShell from '../../components/auth/AuthShell'
import PasswordInput from '../../components/auth/PasswordInput'
import PasswordStrength from '../../components/auth/PasswordStrength'

export default function ResetPassword() {
  const navigate = useNavigate()

  // 'loading' → aguardando Supabase processar token
  // 'form'    → pronto para nova senha
  // 'success' → senha atualizada
  // 'invalid' → sem sessão de recuperação válida
  const [state, setState] = useState('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setState('form')
      else if (event === 'SIGNED_OUT') setState('invalid')
    })

    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setState(session ? 'form' : 'invalid')
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

  if (state === 'loading') {
    return (
      <AuthShell footer={false}>
        <div className="flex items-center justify-center py-10">
          <Spinner size="lg" />
        </div>
      </AuthShell>
    )
  }

  if (state === 'invalid') {
    return (
      <AuthShell>
        <div className="text-center">
          <div
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              color: 'var(--red-text)', boxShadow: '0 0 24px -8px rgba(201,85,75,0.4)',
            }}
          >
            <IconAlertTriangle size={26} />
          </div>
          <h2 className="text-[20px] font-semibold text-[var(--text)] tracking-title mb-2">
            Link inválido ou expirado
          </h2>
          <p className="text-[13.5px] text-[var(--text-2)] mb-7">
            Solicite um novo link de recuperação para continuar.
          </p>
          <Button fullWidth size="lg" onClick={() => navigate('/forgot-password')}>
            Solicitar novo link
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (state === 'success') {
    return (
      <AuthShell>
        <div className="text-center" data-testid="success-screen">
          <div
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'var(--green-bg)', border: '1px solid var(--green-border)',
              color: 'var(--green-text)', boxShadow: '0 0 24px -8px rgba(125,185,123,0.4)',
            }}
          >
            <IconCheck size={26} />
          </div>
          <h2 className="text-[20px] font-semibold text-[var(--text)] tracking-title mb-2">
            Senha atualizada!
          </h2>
          <p className="text-[13.5px] text-[var(--text-2)] mb-7">
            Sua senha foi redefinida com sucesso.
          </p>
          <Button fullWidth size="lg" onClick={() => navigate('/login')} data-testid="btn-go-login">
            Ir para o login
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold text-[var(--text)] tracking-title leading-tight mb-1.5">
          Nova senha
        </h1>
        <p className="text-[14px] text-[var(--text-2)]">
          Escolha uma senha segura para sua conta.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Nova senha"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="new-password"
            data-testid="input-password"
            data-testid-toggle="toggle-password"
          />
          <PasswordStrength value={password} data-testid="password-strength" />
        </div>

        <PasswordInput
          label="Confirmar senha"
          placeholder="Repita a senha"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoComplete="new-password"
          error={confirm.length > 0 && confirm !== password}
          data-testid="input-confirm"
          data-testid-toggle="toggle-confirm"
        />

        {error && (
          <div data-testid="error-message" className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[var(--red-bg)] border border-[var(--red-border)]">
            <IconAlertTriangle size={15} className="text-[var(--red-text)] shrink-0" />
            <span className="text-[12.5px] text-[var(--red-text)] leading-snug">{error}</span>
          </div>
        )}

        <Button fullWidth size="lg" loading={submitting} onClick={handleSubmit} data-testid="btn-submit">
          Salvar nova senha
        </Button>
      </div>
    </AuthShell>
  )
}
