import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { toast } from '../../components/ui/Toast'
import { fetchBusinessById, createBusiness, updateBusiness, checkSlugExists } from '../../services/businessService'
import { uploadBusinessLogo } from '../../services/storageService'
import { fetchAddressByCep } from '../../utils/cep'
import { generateSlug, generateAccessCode } from '../../utils/formatters'
import { getTimezoneByState } from '../../utils/timezone'
import { compressImage } from '../../utils/imageCompressor'
import { useAuthStore } from '../../stores/authStore'
import { IconPhoto } from '@tabler/icons-react'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0)
  if (!words.length) return '?'
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? '?'
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

const CATEGORIES = [
  { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'snack_bar', label: 'Lanchonete' },
  { value: 'cafeteria', label: 'Cafeteria' },
  { value: 'other', label: 'Outro' },
]

const EMPTY_FORM = {
  name: '',
  slug: '',
  category: '',
  phone: '',
  address_zip: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  timezone: '',
  opens_at: '',
  closes_at: '',
  service_charge_percent: '',
  max_discount_percent: '',
}

const inputCls = (err) =>
  `w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border ${
    err ? 'border-red-500' : 'border-[var(--border-strong)]'
  } focus:border-accent`

export default function BusinessForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [loadingBusiness, setLoadingBusiness] = useState(isEdit)
  const [loadingCep, setLoadingCep] = useState(false)
  const [saving, setSaving] = useState(false)
  const slugEdited = useRef(false)

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null)
  const [currentLogoUrl, setCurrentLogoUrl] = useState(null)
  const logoRef = useRef(null)

  useEffect(() => {
    if (!isEdit) return
    setLoadingBusiness(true)
    fetchBusinessById(id)
      .then((b) => {
        slugEdited.current = true
        setForm({
          name: b.name || '',
          slug: b.slug || '',
          category: b.category || '',
          phone: b.phone || '',
          address_zip: b.address_zip || '',
          address_street: b.address_street || '',
          address_number: b.address_number || '',
          address_complement: b.address_complement || '',
          address_neighborhood: b.address_neighborhood || '',
          address_city: b.address_city || '',
          address_state: b.address_state || '',
          timezone: b.timezone || '',
          opens_at: b.opens_at || '',
          closes_at: b.closes_at || '',
          service_charge_percent: b.service_charge_percent != null ? String(b.service_charge_percent) : '',
          max_discount_percent: b.max_discount_percent != null ? String(b.max_discount_percent) : '',
        })
        if (b.logo_url) setCurrentLogoUrl(b.logo_url)
      })
      .catch(() => navigate('/owner/home', { replace: true }))
      .finally(() => setLoadingBusiness(false))
  }, [id, isEdit, navigate])

  const clearError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }))

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearError(field)
  }

  const handleNameChange = (value) => {
    clearError('name')
    if (!slugEdited.current) {
      setForm((prev) => ({ ...prev, name: value, slug: generateSlug(value) }))
    } else {
      setForm((prev) => ({ ...prev, name: value }))
    }
  }

  const handleSlugChange = (value) => {
    slugEdited.current = true
    set('slug', value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  const handleCepChange = async (value) => {
    const clean = value.replace(/\D/g, '')
    set('address_zip', value)
    if (clean.length !== 8) return
    setLoadingCep(true)
    try {
      const addr = await fetchAddressByCep(clean)
      const tz = getTimezoneByState(addr.state)
      setForm((prev) => ({
        ...prev,
        address_zip: value,
        address_street: addr.street,
        address_neighborhood: addr.neighborhood,
        address_city: addr.city,
        address_state: addr.state,
        timezone: tz,
      }))
      clearError('address_zip')
    } catch {
      setErrors((prev) => ({ ...prev, address_zip: 'CEP não encontrado' }))
    } finally {
      setLoadingCep(false)
    }
  }

  const handleStateChange = (value) => {
    const upper = value.toUpperCase().slice(0, 2)
    const tz = getTimezoneByState(upper)
    setForm((prev) => ({ ...prev, address_state: upper, timezone: tz }))
  }

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WEBP.')
      return
    }
    try {
      const compressed = await compressImage(file, 400)
      setLogoFile(compressed)
      setLogoPreviewUrl(URL.createObjectURL(compressed))
    } catch {
      toast.error('Erro ao processar imagem.')
    }
    e.target.value = ''
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome é obrigatório'
    if (!form.category) e.category = 'Categoria é obrigatória'
    if (!form.slug.trim()) e.slug = 'Slug é obrigatório'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const slug = form.slug.trim()

      // Check slug uniqueness before hitting the DB (exclude self in edit mode)
      const slugTaken = await checkSlugExists(slug, isEdit ? id : null)
      if (slugTaken) {
        setErrors({ slug: 'Este slug já está em uso. Escolha outro.' })
        return
      }

      const payload = {
        name: form.name.trim(),
        slug,
        category: form.category,
        phone: form.phone.trim() || null,
        address_zip: form.address_zip.replace(/\D/g, '') || null,
        address_street: form.address_street.trim() || null,
        address_number: form.address_number.trim() || null,
        address_complement: form.address_complement.trim() || null,
        address_neighborhood: form.address_neighborhood.trim() || null,
        address_city: form.address_city.trim() || null,
        address_state: form.address_state.trim() || null,
        timezone: form.timezone || 'America/Sao_Paulo',
        opens_at: form.opens_at || null,
        closes_at: form.closes_at || null,
        service_charge_percent: form.service_charge_percent !== '' ? Number(form.service_charge_percent) : 0,
        max_discount_percent: form.max_discount_percent !== '' ? Number(form.max_discount_percent) : 0,
      }

      if (isEdit) {
        let logoUrl = undefined
        if (logoFile) {
          logoUrl = await uploadBusinessLogo(id, logoFile)
        }
        await updateBusiness(id, { ...payload, ...(logoUrl ? { logo_url: logoUrl } : {}) })
        toast.success('Estabelecimento atualizado')
        navigate(`/owner/business/${id}`)
      } else {
        const created = await createBusiness({
          ...payload,
          owner_id: user.id,
          staff_access_code: generateAccessCode(),
          is_open: false,
        })
        if (logoFile) {
          const logoUrl = await uploadBusinessLogo(created.id, logoFile)
          await updateBusiness(created.id, { logo_url: logoUrl })
        }
        toast.success('Estabelecimento criado')
        navigate(`/owner/business/${created.id}`)
      }
    } catch (err) {
      // Supabase unique-violation code is '23505'
      if (err?.code === '23505' && err?.message?.includes('slug')) {
        setErrors({ slug: 'Este slug já está em uso. Escolha outro.' })
      } else {
        toast.error('Erro ao salvar. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loadingBusiness) {
    return (
      <OwnerLayout showBack backTo={`/owner/business/${id}`}>
        <div data-testid="loading-state" className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    )
  }

  return (
    <OwnerLayout
      title={isEdit ? 'Editar estabelecimento' : 'Novo estabelecimento'}
      showBack
      backTo={isEdit ? `/owner/business/${id}` : '/owner/home'}
    >
      <div className="px-5 py-5 flex flex-col gap-5 pb-10">

        {/* Logo */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Logo
          </p>
          <div className="flex items-center gap-4">
            <div
              className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-[var(--border-strong)] flex items-center justify-center overflow-hidden flex-shrink-0 bg-[var(--bg-tertiary)] cursor-pointer"
              onClick={() => logoRef.current?.click()}
              data-testid="logo-preview"
            >
              {logoPreviewUrl || currentLogoUrl ? (
                <img
                  src={logoPreviewUrl || currentLogoUrl}
                  alt="logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[20px] font-medium text-[var(--text-3)]">
                  {getInitials(form.name)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <button
                type="button"
                data-testid="btn-logo-upload"
                onClick={() => logoRef.current?.click()}
                className="flex items-center gap-2 h-[36px] px-4 rounded-input border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
              >
                <IconPhoto size={15} />
                {currentLogoUrl || logoPreviewUrl ? 'Trocar logo' : 'Adicionar logo'}
              </button>
              <p className="text-[10px] text-[var(--text-3)]">JPG, PNG ou WEBP · Opcional</p>
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoSelect}
              data-testid="input-logo"
            />
          </div>
        </section>

        {/* Informações básicas */}
        <section>
          <p data-testid="section-basic" className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Informações básicas
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Nome *
              </label>
              <input
                data-testid="input-name"
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Bar do João"
                className={inputCls(errors.name)}
              />
              {errors.name && (
                <p data-testid="error-name" className="text-[11px] text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Slug (URL)
              </label>
              <input
                data-testid="input-slug"
                type="text"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="bar-do-joao"
                className={inputCls(errors.slug)}
              />
              {errors.slug && (
                <p data-testid="error-slug" className="text-[11px] text-red-500 mt-1">{errors.slug}</p>
              )}
              <p className="text-[10px] text-[var(--text-3)] mt-1">
                Gerado automaticamente. Usado na URL do cardápio.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Categoria *
              </label>
              <select
                data-testid="select-category"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={inputCls(errors.category)}
              >
                <option value="">Selecione uma categoria</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.category && (
                <p data-testid="error-category" className="text-[11px] text-red-500 mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Telefone
              </label>
              <input
                data-testid="input-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className={inputCls(false)}
              />
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section>
          <p data-testid="section-address" className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Endereço
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                CEP
              </label>
              <div className="relative">
                <input
                  data-testid="input-cep"
                  type="text"
                  value={form.address_zip}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className={inputCls(errors.address_zip)}
                />
                {loadingCep && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
              {errors.address_zip && (
                <p data-testid="error-cep" className="text-[11px] text-red-500 mt-1">{errors.address_zip}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Rua / Logradouro
              </label>
              <input
                data-testid="input-street"
                type="text"
                value={form.address_street}
                onChange={(e) => set('address_street', e.target.value)}
                placeholder="Rua Exemplo"
                className={inputCls(false)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Número
                </label>
                <input
                  data-testid="input-number"
                  type="text"
                  value={form.address_number}
                  onChange={(e) => set('address_number', e.target.value)}
                  placeholder="123"
                  className={inputCls(false)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Complemento
                </label>
                <input
                  data-testid="input-complement"
                  type="text"
                  value={form.address_complement}
                  onChange={(e) => set('address_complement', e.target.value)}
                  placeholder="Apto, Sala..."
                  className={inputCls(false)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Bairro
              </label>
              <input
                data-testid="input-neighborhood"
                type="text"
                value={form.address_neighborhood}
                onChange={(e) => set('address_neighborhood', e.target.value)}
                placeholder="Bairro"
                className={inputCls(false)}
              />
            </div>

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Cidade
                </label>
                <input
                  data-testid="input-city"
                  type="text"
                  value={form.address_city}
                  onChange={(e) => set('address_city', e.target.value)}
                  placeholder="São Paulo"
                  className={inputCls(false)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Estado
                </label>
                <input
                  data-testid="input-state"
                  type="text"
                  value={form.address_state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className={`${inputCls(false)} uppercase`}
                />
              </div>
            </div>

            {form.timezone && (
              <div
                data-testid="timezone-display"
                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-input border border-[var(--border)]"
              >
                <p className="text-[11px] text-[var(--text-3)]">Fuso horário:</p>
                <p className="text-[11px] text-[var(--text-2)] font-medium">{form.timezone}</p>
              </div>
            )}
          </div>
        </section>

        {/* Horário de funcionamento */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Horário de funcionamento{' '}
            <span className="normal-case">— informativo</span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Abre às
              </label>
              <input
                data-testid="input-opens-at"
                type="time"
                value={form.opens_at}
                onChange={(e) => set('opens_at', e.target.value)}
                className={inputCls(false)}
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
                onChange={(e) => set('closes_at', e.target.value)}
                className={inputCls(false)}
              />
            </div>
          </div>
        </section>

        {/* Configurações financeiras */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Configurações financeiras
          </p>

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
                onChange={(e) => set('service_charge_percent', e.target.value)}
                placeholder="0"
                className={inputCls(false)}
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
                onChange={(e) => set('max_discount_percent', e.target.value)}
                placeholder="0"
                className={inputCls(false)}
              />
              <p className="text-[10px] text-[var(--text-3)] mt-1">Máximo que staff pode aplicar</p>
            </div>
          </div>
        </section>

        {/* Submit */}
        <button
          type="button"
          data-testid="btn-submit"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full h-[46px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium tracking-[-0.2px] disabled:opacity-60 transition-opacity"
        >
          {saving
            ? <Spinner size="sm" className="border-white/30 border-t-white" />
            : (isEdit ? 'Salvar alterações' : 'Criar estabelecimento')}
        </button>

      </div>
    </OwnerLayout>
  )
}
