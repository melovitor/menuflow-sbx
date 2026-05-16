import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconPencil, IconCopy, IconRefresh, IconCheck } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import Toggle from '../../components/ui/Toggle'
import { toast } from '../../components/ui/Toast'
import {
  fetchBusinessById,
  updateBusiness,
  regenerateStaffCode,
} from '../../services/businessService'

const inputCls =
  'w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent'

const DAYS = [
  { key: 'mon', label: 'Seg' }, { key: 'tue', label: 'Ter' }, { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' }, { key: 'fri', label: 'Sex' }, { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
]

export default function BusinessSettings() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const [form, setForm] = useState({
    service_charge_percent: '',
    max_discount_percent: '',
    opens_at: '',
    closes_at: '',
    open_days: [],
    schedule_enabled: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchBusinessById(id)
      .then((b) => {
        setBusiness(b)
        setForm({
          service_charge_percent: b.service_charge_percent != null ? String(b.service_charge_percent) : '',
          max_discount_percent: b.max_discount_percent != null ? String(b.max_discount_percent) : '',
          opens_at: b.opens_at || '',
          closes_at: b.closes_at || '',
          open_days: b.open_days || [],
          schedule_enabled: b.schedule_enabled || false,
        })
      })
      .catch(() => navigate('/owner/home', { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(business.staff_access_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const newCode = await regenerateStaffCode(id)
      setBusiness((b) => ({ ...b, staff_access_code: newCode }))
      setConfirmRegen(false)
      toast.success('Código regenerado. Informe o novo código à equipe.')
    } catch {
      toast.error('Erro ao regenerar código. Tente novamente.')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBusiness(id, {
        service_charge_percent: form.service_charge_percent !== '' ? Number(form.service_charge_percent) : 0,
        max_discount_percent: form.max_discount_percent !== '' ? Number(form.max_discount_percent) : 0,
        opens_at: form.opens_at || null,
        closes_at: form.closes_at || null,
      })
      toast.success('Configurações salvas')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <OwnerLayout showBack backTo={`/owner/business/${id}`}>
        <div data-testid="loading-state" className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    )
  }

  if (!business) return null

  const codeFormatted = business.staff_access_code
    ? `${business.staff_access_code.slice(0, 3)} ${business.staff_access_code.slice(3)}`
    : '—'

  return (
    <OwnerLayout title="Configurações" showBack backTo={`/owner/business/${id}`}>
      <div className="px-5 py-5 flex flex-col gap-5 pb-10">

        {/* ── Acesso da equipe ── */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Acesso da equipe
          </p>

          <div
            data-testid="staff-code-card"
            className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[var(--text-3)] mb-1">Código de acesso do staff</p>
                <p
                  data-testid="staff-code"
                  className="text-[24px] font-medium text-[var(--text)] tracking-[0.12em]"
                >
                  {codeFormatted}
                </p>
              </div>

              <button
                type="button"
                data-testid="btn-copy-code"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-[8px]
                  border border-[var(--border-strong)] text-[var(--text-2)] bg-[var(--bg-primary)]
                  hover:border-[var(--accent)] hover:text-accent transition-colors"
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            {/* Regenerate */}
            {!confirmRegen ? (
              <button
                type="button"
                data-testid="btn-regen-code"
                onClick={() => setConfirmRegen(true)}
                className="flex items-center gap-1.5 text-[12px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors w-fit"
              >
                <IconRefresh size={13} />
                Regenerar código
              </button>
            ) : (
              <div data-testid="regen-confirm" className="flex items-center gap-2 pt-1">
                <p className="text-[12px] text-[var(--text-2)] flex-1">
                  O código atual deixará de funcionar. Confirmar?
                </p>
                <button
                  type="button"
                  data-testid="btn-regen-confirm"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="px-3 py-1.5 text-[12px] font-medium text-white bg-accent rounded-[8px] disabled:opacity-60"
                >
                  {regenerating ? <Spinner size="sm" className="border-white/30 border-t-white" /> : 'Confirmar'}
                </button>
                <button
                  type="button"
                  data-testid="btn-regen-cancel"
                  onClick={() => setConfirmRegen(false)}
                  className="px-3 py-1.5 text-[12px] text-[var(--text-2)] border border-[var(--border-strong)] rounded-[8px]"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[var(--text-3)] mt-2 px-1">
            Compartilhe este código com seu staff para que possam acessar o PDV e o KDS.
          </p>
        </section>

        {/* ── Configurações financeiras ── */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Configurações financeiras
          </p>

          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Taxa de serviço %
                </label>
                <input
                  data-testid="input-service-charge"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.service_charge_percent}
                  onChange={(e) => setForm((f) => ({ ...f, service_charge_percent: e.target.value }))}
                  placeholder="0"
                  className={inputCls}
                />
                <p className="text-[10px] text-[var(--text-3)] mt-1">Cliente pode recusar</p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Desconto máximo %
                </label>
                <input
                  data-testid="input-max-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.max_discount_percent}
                  onChange={(e) => setForm((f) => ({ ...f, max_discount_percent: e.target.value }))}
                  placeholder="0"
                  className={inputCls}
                />
                <p className="text-[10px] text-[var(--text-3)] mt-1">Máximo que staff pode aplicar</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Horário de funcionamento ── */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Horário de funcionamento
          </p>

          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 flex flex-col gap-4">

            {/* Auto schedule toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[var(--text)]">Abrir/fechar automaticamente</p>
                <p className="text-[11px] text-[var(--text-3)] mt-[3px]">
                  {form.schedule_enabled
                    ? 'O estabelecimento abre e fecha conforme o horário e dias configurados abaixo'
                    : 'Controle manual pelo toggle na tela inicial'}
                </p>
              </div>
              <Toggle
                data-testid="toggle-schedule-enabled"
                checked={form.schedule_enabled}
                onChange={(v) => setForm((f) => ({ ...f, schedule_enabled: v }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Abre às
                </label>
                <input
                  data-testid="input-opens-at"
                  type="time"
                  value={form.opens_at}
                  onChange={(e) => setForm((f) => ({ ...f, opens_at: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Fecha às
                </label>
                <input
                  data-testid="input-closes-at"
                  type="time"
                  value={form.closes_at}
                  onChange={(e) => setForm((f) => ({ ...f, closes_at: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Dias de funcionamento ── */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Dias de funcionamento
          </p>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4">
            <div className="flex gap-2 flex-wrap">
              {DAYS.map(({ key, label }) => {
                const selected = form.open_days.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={`day-${key}`}
                    onClick={() => setForm((f) => ({
                      ...f,
                      open_days: selected
                        ? f.open_days.filter((d) => d !== key)
                        : [...f.open_days, key],
                    }))}
                    className="h-[34px] px-3 rounded-pill text-[12px] font-medium border transition-colors"
                    style={selected
                      ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }
                      : { background: 'var(--bg-secondary)', color: 'var(--text-2)', borderColor: 'var(--border-strong)' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {form.open_days.length === 0 && (
              <p className="text-[11px] text-[var(--text-3)] mt-2">Nenhum dia selecionado — não será exibido no cardápio.</p>
            )}
          </div>
        </section>

        {/* ── Save ── */}
        <button
          type="button"
          data-testid="btn-save"
          onClick={handleSave}
          disabled={saving}
          className="w-full h-[46px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium tracking-[-0.2px] disabled:opacity-60 transition-opacity"
        >
          {saving
            ? <Spinner size="sm" className="border-white/30 border-t-white" />
            : 'Salvar configurações'}
        </button>

        {/* ── Editar dados ── */}
        <button
          type="button"
          data-testid="btn-edit-business"
          onClick={() => navigate(`/owner/business/${id}/edit`)}
          className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
        >
          <IconPencil size={15} />
          Editar dados do estabelecimento
        </button>

      </div>
    </OwnerLayout>
  )
}
