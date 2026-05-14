import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { IconPhoto } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import Toggle from '../../components/ui/Toggle'
import { toast } from '../../components/ui/Toast'
import { validateImageFile, compressImage } from '../../utils/imageCompressor'
import { uploadMenuItemPhoto } from '../../services/storageService'
import {
  fetchMenuItemById,
  createMenuItem,
  updateMenuItem,
} from '../../services/menuService'

const TAG_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetariano' },
  { value: 'vegan', label: 'Vegano' },
  { value: 'gluten_free', label: 'Sem Glúten' },
  { value: 'spicy', label: 'Picante' },
]

const inputCls =
  'w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent'

export default function ItemForm() {
  const { id: businessId, itemId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const categoryId = location.state?.categoryId
  const categoryName = location.state?.categoryName
  const isEdit = !!itemId

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    promo_price: '',
    prep_time_minutes: '15',
    tags: [],
    is_active: true,
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('')
  const [errors, setErrors] = useState({})

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!categoryId) {
      navigate(`/owner/business/${businessId}/menu`, { replace: true })
      return
    }
    if (!isEdit) return

    fetchMenuItemById(itemId)
      .then((item) => {
        setForm({
          name: item.name,
          description: item.description || '',
          price: String(item.price),
          promo_price: item.promo_price != null ? String(item.promo_price) : '',
          prep_time_minutes: item.prep_time_minutes != null ? String(item.prep_time_minutes) : '15',
          tags: item.tags || [],
          is_active: item.is_active,
        })
        setExistingPhotoUrl(item.photo_url || '')
      })
      .catch(() => {
        toast.error('Erro ao carregar item.')
        navigate(`/owner/business/${businessId}/menu/items`, {
          state: { categoryId, categoryName },
        })
      })
      .finally(() => setLoading(false))
  }, [itemId, businessId, isEdit, categoryId, categoryName, navigate])

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      validateImageFile(file)
      const compressed = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      setPhotoFile(compressed)
      setPhotoPreview(previewUrl)
      setErrors((prev) => ({ ...prev, photo: undefined }))
    } catch (err) {
      setErrors((prev) => ({ ...prev, photo: err.message }))
    }
  }

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome é obrigatório.'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      e.price = 'Preço é obrigatório.'
    if (!photoFile && !existingPhotoUrl) e.photo = 'Foto é obrigatória.'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)
    try {
      let photoUrl = existingPhotoUrl

      if (photoFile) {
        const fileKey = isEdit ? itemId : crypto.randomUUID()
        photoUrl = await uploadMenuItemPhoto(businessId, fileKey, photoFile)
      }

      const payload = {
        category_id: categoryId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        photo_url: photoUrl,
        price: Number(form.price),
        promo_price: form.promo_price ? Number(form.promo_price) : null,
        prep_time_minutes: form.prep_time_minutes ? Number(form.prep_time_minutes) : null,
        tags: form.tags,
        is_active: form.is_active,
      }

      if (isEdit) {
        await updateMenuItem(itemId, payload)
      } else {
        await createMenuItem(payload)
      }

      navigate(`/owner/business/${businessId}/menu/items`, {
        state: { categoryId, categoryName },
      })
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(`/owner/business/${businessId}/menu/items`, {
      state: { categoryId, categoryName },
    })
  }

  if (loading) {
    return (
      <OwnerLayout showBack backTo={`/owner/business/${businessId}/menu/items`}>
        <div data-testid="loading-state" className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    )
  }

  return (
    <OwnerLayout
      title={isEdit ? 'Editar item' : 'Novo item'}
      showBack
      backTo={`/owner/business/${businessId}/menu/items`}
    >
      <div className="px-5 py-5 flex flex-col gap-5 pb-10">

        {/* Photo */}
        <div>
          <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
            Foto <span className="text-red-500">*</span>
          </p>

          <input
            ref={fileInputRef}
            data-testid="photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="hidden"
          />

          {photoPreview || existingPhotoUrl ? (
            <div className="relative w-full aspect-video rounded-[12px] overflow-hidden border border-[var(--border)]">
              <img
                data-testid="photo-preview"
                src={photoPreview || existingPhotoUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                data-testid="btn-change-photo"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 px-3 py-1.5 text-[12px] font-medium text-white bg-black/50 rounded-[8px] backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                Alterar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="btn-upload-photo"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-10 rounded-[12px] flex flex-col items-center justify-center gap-2
                border ${errors.photo ? 'border-red-500' : 'border-dashed border-[var(--border-strong)]'}
                bg-[var(--bg-tertiary)] text-[var(--text-3)] hover:border-accent hover:text-accent transition-colors`}
            >
              <IconPhoto size={28} />
              <span className="text-[13px]">Adicionar foto</span>
              <span className="text-[11px]">JPG, PNG ou WEBP · máx. 2MB</span>
            </button>
          )}

          {errors.photo && (
            <p data-testid="error-photo" className="text-[11px] text-red-500 mt-1">
              {errors.photo}
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            data-testid="input-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Coca-Cola 350ml"
            className={`${inputCls} ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && (
            <p data-testid="error-name" className="text-[11px] text-red-500 mt-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
            Descrição
          </label>
          <textarea
            data-testid="input-description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Ingredientes, tamanho, diferenciais..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent resize-none"
          />
        </div>

        {/* Price + Promo price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Preço <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="input-price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0,00"
              className={`${inputCls} ${errors.price ? 'border-red-500' : ''}`}
            />
            {errors.price && (
              <p data-testid="error-price" className="text-[11px] text-red-500 mt-1">
                {errors.price}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Preço promo
            </label>
            <input
              data-testid="input-promo-price"
              type="number"
              min="0"
              step="0.01"
              value={form.promo_price}
              onChange={(e) => setForm((f) => ({ ...f, promo_price: e.target.value }))}
              placeholder="0,00"
              className={inputCls}
            />
          </div>
        </div>

        {/* Prep time */}
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
            Tempo de preparo (minutos)
          </label>
          <input
            data-testid="input-prep-time"
            type="number"
            min="0"
            step="1"
            value={form.prep_time_minutes}
            onChange={(e) => setForm((f) => ({ ...f, prep_time_minutes: e.target.value }))}
            placeholder="15"
            className={inputCls}
          />
        </div>

        {/* Tags */}
        <div>
          <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[10px]">
            Características
          </p>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => {
              const selected = form.tags.includes(tag.value)
              return (
                <button
                  key={tag.value}
                  type="button"
                  data-testid={`tag-btn-${tag.value}`}
                  onClick={() => toggleTag(tag.value)}
                  className={`px-3 py-1.5 rounded-pill text-[12px] font-medium border transition-colors
                    ${selected
                      ? 'bg-accent text-white border-accent'
                      : 'bg-[var(--bg-primary)] text-[var(--text-2)] border-[var(--border-strong)] hov:border-accent hov:text-accent'
                    }`}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Is active */}
        <div className="flex items-center justify-between py-3 border-t border-b border-[var(--border)]">
          <div>
            <p className="text-[13px] font-medium text-[var(--text)]">Item ativo</p>
            <p className="text-[11px] text-[var(--text-3)]">Exibir no cardápio</p>
          </div>
          <Toggle
            checked={form.is_active}
            onChange={(val) => setForm((f) => ({ ...f, is_active: val }))}
            data-testid="toggle-active"
          />
        </div>

        {/* Save */}
        <button
          type="button"
          data-testid="btn-save"
          onClick={handleSave}
          disabled={saving}
          className="w-full h-[46px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium tracking-[-0.2px] disabled:opacity-60 transition-opacity"
        >
          {saving
            ? <Spinner size="sm" className="border-white/30 border-t-white" />
            : 'Salvar'}
        </button>

        <button
          type="button"
          data-testid="btn-cancel"
          onClick={handleCancel}
          className="w-full h-[44px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
        >
          Cancelar
        </button>

      </div>
    </OwnerLayout>
  )
}
