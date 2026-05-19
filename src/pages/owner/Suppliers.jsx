import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { IconTruck, IconPlus, IconPencil } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Toggle from '../../components/ui/Toggle'
import Modal from '../../components/ui/Modal'
import { toast } from '../../components/ui/Toast'
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  fetchIngredientCountsBySupplier,
} from '../../services/inventoryService'
import { formatPhone } from '../../utils/formatters'
import { supabase } from '../../services/supabase'

const inputCls =
  'w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent'

const EMPTY_FORM = { name: '', phone: '', email: '', notes: '', is_active: true }

export default function Suppliers() {
  const { id: businessId } = useParams()

  const [suppliers, setSuppliers] = useState([])
  const [ingredientCounts, setIngredientCounts] = useState({})
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [data, counts] = await Promise.all([
        fetchSuppliers(businessId),
        fetchIngredientCountsBySupplier(businessId),
      ])
      setSuppliers(data)
      setIngredientCounts(counts)
    } catch {
      toast.error('Erro ao carregar fornecedores.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const channel = supabase
      .channel(`suppliers-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers', filter: `business_id=eq.${businessId}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [businessId, load])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (supplier) => {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active,
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome é obrigatório.'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      }

      if (editing) {
        await updateSupplier(editing.id, payload)
        toast.success('Fornecedor atualizado.')
      } else {
        await createSupplier(businessId, payload)
        toast.success('Fornecedor adicionado.')
      }

      closeModal()
      await load()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (supplier) => {
    const next = !supplier.is_active
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplier.id ? { ...s, is_active: next } : s))
    )
    try {
      await updateSupplier(supplier.id, { is_active: next })
    } catch {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplier.id ? { ...s, is_active: !next } : s))
      )
      toast.error('Erro ao atualizar.')
    }
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setPhone = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setForm((f) => ({ ...f, phone: digits.length >= 10 ? formatPhone(digits) : digits }))
  }

  return (
    <OwnerLayout
      title="Fornecedores"
      showBack
      backTo={`/owner/business/${businessId}/stock/ingredients`}
    >
      <div className="px-5 py-5 flex flex-col gap-4 pb-10">

        {/* Add button */}
        <button
          type="button"
          data-testid="btn-add-supplier"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 w-full h-[44px] rounded-[10px] bg-accent text-white text-[14px] font-medium"
        >
          <IconPlus size={16} />
          Novo fornecedor
        </button>

        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && suppliers.length === 0 && (
          <div data-testid="empty-state" className="text-center py-14">
            <IconTruck size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
            <p className="text-[14px] font-medium text-[var(--text-2)]">Nenhum fornecedor</p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">
              Adicione fornecedores para vincular aos insumos.
            </p>
          </div>
        )}

        {!loading && suppliers.length > 0 && (
          <div data-testid="suppliers-list" className="flex flex-col gap-3">
            {suppliers.map((supplier) => {
              const count = ingredientCounts[supplier.id] || 0
              return (
                <div
                  key={supplier.id}
                  data-testid={`supplier-card-${supplier.id}`}
                  className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4"
                >
                  <div className="flex items-start gap-3">

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-medium text-[var(--text)] truncate">
                          {supplier.name}
                        </p>
                        <Badge variant={supplier.is_active ? 'open' : 'closed'}>
                          {supplier.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                      {supplier.phone && (
                        <p className="text-[12px] text-[var(--text-3)] mt-1">{supplier.phone}</p>
                      )}
                      {supplier.email && (
                        <p className="text-[12px] text-[var(--text-3)]">{supplier.email}</p>
                      )}
                      {supplier.notes && (
                        <p className="text-[11px] text-[var(--text-3)] mt-1 line-clamp-2">
                          {supplier.notes}
                        </p>
                      )}

                      <p className="text-[11px] text-[var(--text-3)] mt-2">
                        {count} insumo{count !== 1 ? 's' : ''} vinculado{count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <button
                        type="button"
                        data-testid={`btn-edit-${supplier.id}`}
                        onClick={() => openEdit(supplier)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors"
                      >
                        <IconPencil size={14} />
                      </button>
                      <Toggle
                        checked={supplier.is_active}
                        onChange={() => handleToggleActive(supplier)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Modal de criação / edição */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar fornecedor' : 'Novo fornecedor'}
        data-testid="supplier-modal"
      >
        <div className="flex flex-col gap-4">

          {/* Nome */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="input-supplier-name"
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Nome do fornecedor"
              className={`${inputCls} ${errors.name ? 'border-red-500' : ''}`}
              autoFocus
            />
            {errors.name && (
              <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Telefone
            </label>
            <input
              data-testid="input-supplier-phone"
              type="tel"
              value={form.phone}
              onChange={setPhone}
              maxLength={15}
              placeholder="(11) 99999-9999"
              className={inputCls}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Email
            </label>
            <input
              data-testid="input-supplier-email"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="contato@fornecedor.com"
              className={inputCls}
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
              Observações
            </label>
            <textarea
              data-testid="input-supplier-notes"
              value={form.notes}
              onChange={set('notes')}
              placeholder="Prazo de entrega, condições, etc."
              rows={3}
              className="w-full px-3 py-2.5 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent resize-none"
            />
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between py-2 border-t border-[var(--border)]">
            <div>
              <p className="text-[13px] font-medium text-[var(--text)]">Ativo</p>
              <p className="text-[11px] text-[var(--text-3)]">Disponível para vincular a insumos</p>
            </div>
            <Toggle
              checked={form.is_active}
              onChange={(val) => setForm((f) => ({ ...f, is_active: val }))}
            />
          </div>

          {/* Ações */}
          <button
            type="button"
            data-testid="btn-save-supplier"
            onClick={handleSave}
            disabled={saving}
            className="w-full h-[44px] flex items-center justify-center rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-60 transition-opacity"
          >
            {saving
              ? <Spinner size="sm" className="border-white/30 border-t-white" />
              : 'Salvar'}
          </button>

          <button
            type="button"
            data-testid="btn-cancel-supplier"
            onClick={closeModal}
            className="w-full h-[42px] flex items-center justify-center rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors"
          >
            Cancelar
          </button>

        </div>
      </Modal>
    </OwnerLayout>
  )
}
