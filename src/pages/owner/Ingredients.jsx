import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconPackage,
  IconPlus,
  IconPencil,
  IconAdjustments,
  IconTruck,
  IconAlertTriangle,
  IconChevronRight,
  IconChartBar,
} from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import Toggle from '../../components/ui/Toggle'
import Modal from '../../components/ui/Modal'
import { toast } from '../../components/ui/Toast'
import {
  fetchIngredients,
  fetchSuppliers,
  createIngredient,
  updateIngredient,
  adjustIngredientStock,
} from '../../services/inventoryService'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/formatters'

const UNITS = ['un', 'kg', 'g', 'l', 'ml']

const ADJUST_TYPES = [
  { value: 'in',     label: 'Entrada',     color: 'text-[var(--green-text)]' },
  { value: 'out',    label: 'Saída',       color: 'text-[var(--red-text)]' },
  { value: 'adjust', label: 'Ajuste',      color: 'text-[var(--amber-text)]' },
  { value: 'waste',  label: 'Desperdício', color: 'text-[var(--text-2)]' },
]

const FILTERS = [
  { value: 'all',         label: 'Todos' },
  { value: 'alert',       label: 'Em alerta' },
  { value: 'no_supplier', label: 'Sem fornecedor' },
]

const inputCls =
  'w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent'

const EMPTY_FORM = {
  name: '', unit: 'un', unit_cost: '', current_stock: '', min_stock: '',
  supplier_id: '', is_active: true,
}

const EMPTY_ADJUST = { type: 'in', quantity: '', unit_cost: '', notes: '' }

export default function Ingredients() {
  const { id: businessId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [ingredients, setIngredients] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')

  // Ingredient modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Adjust modal
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [adjust, setAdjust] = useState(EMPTY_ADJUST)
  const [adjustSaving, setAdjustSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [ings, sups] = await Promise.all([
        fetchIngredients(businessId),
        fetchSuppliers(businessId),
      ])
      setIngredients(ings)
      setSuppliers(sups)
    } catch {
      toast.error('Erro ao carregar insumos.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const channel = supabase
      .channel(`ingredients-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients', filter: `business_id=eq.${businessId}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [businessId, load])

  const filtered = ingredients.filter((ing) => {
    if (filter === 'alert') return ing.current_stock <= ing.min_stock
    if (filter === 'no_supplier') return !ing.supplier_id
    return true
  })

  // ── Ingredient form ────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (ing) => {
    setEditing(ing)
    setForm({
      name: ing.name,
      unit: ing.unit,
      unit_cost: numberToDigits(ing.unit_cost),
      current_stock: String(ing.current_stock),
      min_stock: String(ing.min_stock),
      supplier_id: ing.supplier_id || '',
      is_active: ing.is_active,
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const validateForm = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome é obrigatório.'
    if (!form.unit) e.unit = 'Unidade é obrigatória.'
    if (!form.unit_cost || parseCostDigits(form.unit_cost) < 0)
      e.unit_cost = 'Custo inválido.'
    if (form.current_stock === '' || isNaN(Number(form.current_stock)) || Number(form.current_stock) < 0)
      e.current_stock = 'Estoque atual inválido.'
    if (form.min_stock === '' || isNaN(Number(form.min_stock)) || Number(form.min_stock) < 0)
      e.min_stock = 'Estoque mínimo inválido.'
    return e
  }

  const handleSave = async () => {
    const e = validateForm()
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit,
        unit_cost: parseCostDigits(form.unit_cost),
        current_stock: Number(form.current_stock),
        min_stock: Number(form.min_stock),
        supplier_id: form.supplier_id || null,
        is_active: form.is_active,
      }

      if (editing) {
        await updateIngredient(editing.id, payload)
        toast.success('Insumo atualizado.')
      } else {
        await createIngredient(businessId, payload)
        toast.success('Insumo adicionado.')
      }

      closeModal()
      await load()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (ing) => {
    const next = !ing.is_active
    setIngredients((prev) =>
      prev.map((i) => (i.id === ing.id ? { ...i, is_active: next } : i))
    )
    try {
      await updateIngredient(ing.id, { is_active: next })
    } catch {
      setIngredients((prev) =>
        prev.map((i) => (i.id === ing.id ? { ...i, is_active: !next } : i))
      )
      toast.error('Erro ao atualizar.')
    }
  }

  // ── Adjust stock ───────────────────────────────────────────────
  const openAdjust = (ing) => {
    setAdjustTarget(ing)
    setAdjust({ ...EMPTY_ADJUST, unit_cost: numberToDigits(ing.unit_cost) })
    setAdjustOpen(true)
  }

  const closeAdjust = () => { setAdjustOpen(false); setAdjustTarget(null) }

  const handleAdjust = async () => {
    if (!adjust.quantity || isNaN(Number(adjust.quantity)) || Number(adjust.quantity) <= 0) {
      toast.error('Informe uma quantidade válida.')
      return
    }
    setAdjustSaving(true)
    try {
      await adjustIngredientStock(businessId, adjustTarget.id, {
        type: adjust.type,
        quantity: Number(adjust.quantity),
        unit_cost: adjust.type === 'in' && adjust.unit_cost ? parseCostDigits(adjust.unit_cost) : undefined,
        notes: adjust.notes.trim() || undefined,
      })
      toast.success('Estoque ajustado.')
      closeAdjust()
      await load()
    } catch {
      toast.error('Erro ao ajustar estoque.')
    } finally {
      setAdjustSaving(false)
    }
  }

  const setF = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setA = (field) => (e) => setAdjust((a) => ({ ...a, [field]: e.target.value }))

  // Cents-first currency mask (ex: "2" → "0,02" → "0,20" → "2,00")
  // Estado armazena dígitos crus; displayCost formata para exibição
  const setCostDigits = (field, setter) => (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setter((f) => ({ ...f, [field]: digits }))
  }

  const displayCost = (digits) => {
    if (!digits) return ''
    const padded = digits.padStart(3, '0')
    const reais = padded.slice(0, -2).replace(/^0+/, '') || '0'
    const centavos = padded.slice(-2)
    return `${reais},${centavos}`
  }

  const parseCostDigits = (digits) => parseInt(digits || '0') / 100
  const numberToDigits = (n) => Math.round(parseFloat(n || 0) * 100).toString()

  const isAlert = (ing) => ing.current_stock <= ing.min_stock

  return (
    <OwnerLayout
      title="Insumos"
      showBack
      backTo={`/owner/business/${businessId}`}
    >
      <div className="px-5 py-5 flex flex-col gap-4 pb-10">

        {/* Actions row */}
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="btn-add-ingredient"
            onClick={openAdd}
            className="flex-1 flex items-center justify-center gap-2 h-[44px] rounded-[10px] bg-accent text-white text-[14px] font-medium"
          >
            <IconPlus size={16} />
            Novo insumo
          </button>
          <button
            type="button"
            data-testid="btn-suppliers"
            onClick={() => navigate(`/owner/business/${businessId}/suppliers`)}
            className="flex items-center justify-center gap-1.5 h-[44px] px-4 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
          >
            <IconTruck size={15} />
            Fornecedores
          </button>
        </div>

        {/* Secondary nav links */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="btn-purchase-orders"
            onClick={() => navigate(`/owner/business/${businessId}/purchase-orders`)}
            className="w-full flex items-center justify-between px-4 h-[42px] rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <IconPackage size={15} />
              Ordens de compra
            </div>
            <IconChevronRight size={14} />
          </button>
          <button
            type="button"
            data-testid="btn-stock-movements"
            onClick={() => navigate(`/owner/business/${businessId}/stock/movements`)}
            className="w-full flex items-center justify-between px-4 h-[42px] rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <IconAdjustments size={15} />
              Histórico de movimentações
            </div>
            <IconChevronRight size={14} />
          </button>
          <button
            type="button"
            data-testid="btn-cmv-report"
            onClick={() => navigate(`/owner/business/${businessId}/stock/cmv`)}
            className="w-full flex items-center justify-between px-4 h-[42px] rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <IconChartBar size={15} />
              CMV e Custos
            </div>
            <IconChevronRight size={14} />
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 h-[28px] px-3 rounded-pill text-[11px] font-medium border transition-colors ${
                filter === f.value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-2)] border-[var(--border-strong)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div data-testid="empty-state" className="text-center py-14">
            <IconPackage size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
            <p className="text-[14px] font-medium text-[var(--text-2)]">
              {filter === 'all' ? 'Nenhum insumo cadastrado' : 'Nenhum insumo neste filtro'}
            </p>
            {filter === 'all' && (
              <p className="text-[12px] text-[var(--text-3)] mt-1">
                Adicione insumos para montar fichas técnicas e controlar o estoque.
              </p>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div data-testid="ingredients-list" className="flex flex-col gap-3">
            {filtered.map((ing) => {
              const alert = isAlert(ing)
              return (
                <div
                  key={ing.id}
                  data-testid={`ingredient-card-${ing.id}`}
                  className={`rounded-card p-4 border ${
                    alert
                      ? 'bg-[var(--amber-bg)] border-[var(--amber-border)]'
                      : 'bg-[var(--bg-primary)] border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-start gap-3">

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[14px] font-medium truncate ${alert ? 'text-[var(--amber-text)]' : 'text-[var(--text)]'}`}>
                          {ing.name}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium bg-[var(--bg-tertiary)] text-[var(--text-3)] border border-[var(--border)]">
                          {ing.unit}
                        </span>
                        {!ing.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium bg-[var(--bg-tertiary)] text-[var(--text-3)]">
                            Inativo
                          </span>
                        )}
                      </div>

                      {/* Stock row */}
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-[.06em]">Estoque</p>
                          <p className={`text-[13px] font-medium ${alert ? 'text-[var(--amber-text)]' : 'text-[var(--text)]'}`}>
                            {Number(ing.current_stock).toLocaleString('pt-BR')} {ing.unit}
                            {alert && <IconAlertTriangle size={12} className="inline ml-1 mb-0.5" />}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-[.06em]">Mínimo</p>
                          <p className="text-[13px] text-[var(--text-2)]">
                            {Number(ing.min_stock).toLocaleString('pt-BR')} {ing.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-[.06em]">Custo/un</p>
                          <p className="text-[13px] text-[var(--text-2)]">
                            {formatCurrency(ing.unit_cost)}
                          </p>
                        </div>
                      </div>

                      {ing.suppliers?.name && (
                        <p className="text-[11px] text-[var(--text-3)] mt-2 flex items-center gap-1">
                          <IconTruck size={11} />
                          {ing.suppliers.name}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <button
                        type="button"
                        data-testid={`btn-adjust-${ing.id}`}
                        onClick={() => openAdjust(ing)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
                        title="Ajustar estoque"
                      >
                        <IconAdjustments size={14} />
                      </button>
                      <button
                        type="button"
                        data-testid={`btn-edit-${ing.id}`}
                        onClick={() => openEdit(ing)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
                        title="Editar insumo"
                      >
                        <IconPencil size={14} />
                      </button>
                      <Toggle
                        checked={ing.is_active}
                        onChange={() => handleToggleActive(ing)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── Ingredient modal ────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar insumo' : 'Novo insumo'}
        data-testid="ingredient-modal"
      >
        <div className="flex flex-col gap-4">

          {/* Nome */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="input-ingredient-name"
              type="text"
              value={form.name}
              onChange={setF('name')}
              placeholder="Ex: Farinha de trigo"
              className={`${inputCls} ${errors.name ? 'border-red-500' : ''}`}
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Unidade + Custo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Unidade <span className="text-red-500">*</span>
              </label>
              <select
                data-testid="select-unit"
                value={form.unit}
                onChange={setF('unit')}
                className={`${inputCls} ${errors.unit ? 'border-red-500' : ''}`}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {errors.unit && <p className="text-[11px] text-red-500 mt-1">{errors.unit}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Custo / {form.unit || 'un'} <span className="text-red-500">*</span>
              </label>
              <input
                data-testid="input-unit-cost"
                type="text"
                inputMode="numeric"
                value={displayCost(form.unit_cost)}
                onChange={setCostDigits('unit_cost', setForm)}
                placeholder="0,00"
                className={`${inputCls} ${errors.unit_cost ? 'border-red-500' : ''}`}
              />
              {errors.unit_cost && <p className="text-[11px] text-red-500 mt-1">{errors.unit_cost}</p>}
            </div>
          </div>

          {/* Estoque atual + mínimo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Estoque atual <span className="text-red-500">*</span>
              </label>
              <input
                data-testid="input-current-stock"
                type="number"
                min="0"
                step="0.001"
                value={form.current_stock}
                onChange={setF('current_stock')}
                placeholder="0"
                className={`${inputCls} ${errors.current_stock ? 'border-red-500' : ''}`}
              />
              {errors.current_stock && <p className="text-[11px] text-red-500 mt-1">{errors.current_stock}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Estoque mínimo <span className="text-red-500">*</span>
              </label>
              <input
                data-testid="input-min-stock"
                type="number"
                min="0"
                step="0.001"
                value={form.min_stock}
                onChange={setF('min_stock')}
                placeholder="0"
                className={`${inputCls} ${errors.min_stock ? 'border-red-500' : ''}`}
              />
              {errors.min_stock && <p className="text-[11px] text-red-500 mt-1">{errors.min_stock}</p>}
            </div>
          </div>

          {/* Fornecedor */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Fornecedor
            </label>
            <select
              data-testid="select-supplier"
              value={form.supplier_id}
              onChange={setF('supplier_id')}
              className={inputCls}
            >
              <option value="">Sem fornecedor</option>
              {suppliers.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between py-2 border-t border-[var(--border)]">
            <div>
              <p className="text-[13px] font-medium text-[var(--text)]">Ativo</p>
              <p className="text-[11px] text-[var(--text-3)]">Disponível para fichas técnicas</p>
            </div>
            <Toggle
              checked={form.is_active}
              onChange={(val) => setForm((f) => ({ ...f, is_active: val }))}
            />
          </div>

          <button
            type="button"
            data-testid="btn-save-ingredient"
            onClick={handleSave}
            disabled={saving}
            className="w-full h-[44px] flex items-center justify-center rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-60"
          >
            {saving ? <Spinner size="sm" className="border-white/30 border-t-white" /> : 'Salvar'}
          </button>

          <button
            type="button"
            onClick={closeModal}
            className="w-full h-[42px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
          >
            Cancelar
          </button>

        </div>
      </Modal>

      {/* ── Adjust stock modal ───────────────────────────────────── */}
      <Modal
        open={adjustOpen}
        onClose={closeAdjust}
        title={adjustTarget ? `Ajustar — ${adjustTarget.name}` : 'Ajustar estoque'}
        data-testid="adjust-modal"
      >
        <div className="flex flex-col gap-4">

          {/* Tipo */}
          <div>
            <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-2">
              Tipo de movimentação
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ADJUST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAdjust((a) => ({ ...a, type: t.value }))}
                  className={`h-[38px] rounded-[10px] text-[13px] font-medium border transition-colors ${
                    adjust.type === t.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-[var(--bg-primary)] text-[var(--text-2)] border-[var(--border-strong)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              {adjust.type === 'adjust' ? 'Novo estoque total' : 'Quantidade'}
              {adjustTarget && <span className="normal-case ml-1 text-[var(--text-3)]">({adjustTarget?.unit})</span>}
            </label>
            <input
              data-testid="input-adjust-quantity"
              type="number"
              min="0"
              step="0.001"
              value={adjust.quantity}
              onChange={setA('quantity')}
              placeholder="0"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Custo unitário — apenas para entrada */}
          {adjust.type === 'in' && (
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Custo unitário (R$)
              </label>
              <input
                data-testid="input-adjust-cost"
                type="text"
                inputMode="numeric"
                value={displayCost(adjust.unit_cost)}
                onChange={setCostDigits('unit_cost', setAdjust)}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Observação
            </label>
            <input
              data-testid="input-adjust-notes"
              type="text"
              value={adjust.notes}
              onChange={setA('notes')}
              placeholder="Opcional"
              className={inputCls}
            />
          </div>

          <button
            type="button"
            data-testid="btn-confirm-adjust"
            onClick={handleAdjust}
            disabled={adjustSaving}
            className="w-full h-[44px] flex items-center justify-center rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-60"
          >
            {adjustSaving ? <Spinner size="sm" className="border-white/30 border-t-white" /> : 'Confirmar'}
          </button>

          <button
            type="button"
            onClick={closeAdjust}
            className="w-full h-[42px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
          >
            Cancelar
          </button>

        </div>
      </Modal>

    </OwnerLayout>
  )
}
