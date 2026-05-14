import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Spinner from '../../components/ui/Spinner'
import { fetchBusinessByStaffCode } from '../../services/businessService'

export default function StaffLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('from') ? decodeURIComponent(searchParams.get('from')) : '/staff/pdv'
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    setError('')
  }

  const handleSubmit = async () => {
    if (code.length < 6) {
      setError('Digite o codigo de 6 digitos.')
      return
    }
    setLoading(true)
    try {
      const business = await fetchBusinessByStaffCode(code)
      localStorage.setItem('staff_session', JSON.stringify({
        businessId: business.id,
        businessName: business.name,
        role: 'staff',
        loginAt: new Date().toISOString(),
      }))
      navigate(redirectTo, { replace: true })
    } catch {
      setError('Codigo invalido. Verifique com o responsavel.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center px-5">

      <div className="mb-8 text-center">
        <p className="text-[22px] font-medium text-[var(--text)]" style={{ letterSpacing: '-0.5px' }}>
          Menu<span className="text-accent">Flow</span>
        </p>
        <p className="text-[13px] text-[var(--text-3)] mt-1">Acesso da equipe</p>
      </div>

      <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-[16px] p-6 flex flex-col gap-5">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
            Codigo de acesso
          </label>
          <input
            data-testid="input-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full h-[48px] px-4 rounded-input text-[22px] text-center font-medium text-[var(--text)] bg-[var(--bg-secondary)] outline-none border transition-colors ${
              error ? 'border-red-500' : 'border-[var(--border-strong)]'
            } focus:border-accent`}
            style={{ letterSpacing: '0.3em' }}
          />
          {error && (
            <p data-testid="error-message" className="text-[11px] text-red-500 mt-1">
              {error}
            </p>
          )}
          <p className="text-[11px] text-[var(--text-3)] mt-1">
            Solicite o codigo de 6 digitos ao responsavel.
          </p>
        </div>

        <button
          type="button"
          data-testid="btn-enter"
          onClick={handleSubmit}
          disabled={loading || code.length < 6}
          className="w-full h-[46px] rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-50 flex items-center justify-center"
        >
          {loading
            ? <Spinner size="sm" className="border-white/30 border-t-white" />
            : 'Entrar'}
        </button>
      </div>

    </div>
  )
}
