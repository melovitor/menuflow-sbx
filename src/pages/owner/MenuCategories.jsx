import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconGripVertical,
  IconPencil,
  IconCheck,
  IconX,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Toggle from '../../components/ui/Toggle'
import { toast } from '../../components/ui/Toast'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  reorderCategories,
} from '../../services/menuService'

const iconBtn =
  'w-7 h-7 flex items-center justify-center rounded-[7px] text-[var(--text-2)] border border-[var(--border-strong)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-default disabled:hover:border-[var(--border-strong)] disabled:hover:text-[var(--text-2)]'

export default function MenuCategories() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const addInputRef = useRef(null)
  const editInputRef = useRef(null)

  useEffect(() => {
    fetchCategories(id)
      .then(setCategories)
      .catch(() => toast.error('Erro ao carregar categorias.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSavingNew(true)
    try {
      const cat = await createCategory(id, newName.trim(), categories.length)
      setCategories((prev) => [...prev, cat])
      setNewName('')
      setAdding(false)
    } catch {
      toast.error('Erro ao criar categoria. Tente novamente.')
    } finally {
      setSavingNew(false)
    }
  }

  const handleCancelAdd = () => {
    setAdding(false)
    setNewName('')
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditName(cat.name)
  }

  const handleEdit = async (catId) => {
    if (!editName.trim()) return
    try {
      const updated = await updateCategory(catId, { name: editName.trim() })
      setCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, name: updated.name } : c))
      )
      setEditingId(null)
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  const handleToggleActive = async (cat) => {
    const next = !cat.is_active
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: next } : c))
    )
    try {
      await updateCategory(cat.id, { is_active: next })
    } catch {
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: cat.is_active } : c))
      )
      toast.error('Erro ao atualizar status.')
    }
  }

  const handleMove = async (index, direction) => {
    const newCats = [...categories]
    const target = index + direction
    ;[newCats[index], newCats[target]] = [newCats[target], newCats[index]]
    setCategories(newCats)
    try {
      await reorderCategories(newCats.map((c) => c.id))
    } catch {
      setCategories(categories)
      toast.error('Erro ao reordenar.')
    }
  }

  const handleNavToItems = (cat) => {
    navigate(`/owner/business/${id}/menu/items`, {
      state: { categoryId: cat.id, categoryName: cat.name },
    })
  }

  return (
    <OwnerLayout title="Cardápio" showBack backTo={`/owner/business/${id}`}>
      <div className="px-5 py-5 flex flex-col gap-3">

        {/* Section header */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em]">
            Categorias
          </p>
          <button
            type="button"
            data-testid="btn-add-category"
            onClick={() => { setAdding(true); setEditingId(null) }}
            className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-accent border border-[var(--border-strong)] rounded-[8px] bg-[var(--bg-primary)] hover:border-accent transition-colors"
          >
            <IconPlus size={13} />
            Nova
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!loading && categories.length === 0 && !adding && (
          <div data-testid="empty-state" className="text-center py-10">
            <p className="text-[14px] font-medium text-[var(--text-2)] mb-1">
              Nenhuma categoria ainda
            </p>
            <p className="text-[12px] text-[var(--text-3)]">
              Crie categorias para organizar o seu cardápio.
            </p>
          </div>
        )}

        {/* Category list */}
        {!loading && (
          <div data-testid="category-list" className="flex flex-col gap-2">
            {categories.map((cat, index) => (
              <div
                key={cat.id}
                data-testid={`category-item-${cat.id}`}
                className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-3"
              >
                {editingId === cat.id ? (
                  /* Edit mode */
                  <div className="flex items-center gap-2">
                    <input
                      ref={editInputRef}
                      data-testid={`edit-input-${cat.id}`}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEdit(cat.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 h-[34px] px-3 rounded-[8px] text-[13px] text-[var(--text)] bg-[var(--bg-secondary)] outline-none border border-accent"
                    />
                    <button
                      type="button"
                      data-testid={`btn-save-edit-${cat.id}`}
                      onClick={() => handleEdit(cat.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-[7px] bg-accent text-white"
                    >
                      <IconCheck size={15} />
                    </button>
                    <button
                      type="button"
                      data-testid="btn-cancel-edit"
                      onClick={() => setEditingId(null)}
                      className={iconBtn}
                    >
                      <IconX size={15} />
                    </button>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    {/* Top row: handle + name + badge + chevron */}
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => handleNavToItems(cat)}
                    >
                      <IconGripVertical size={15} className="text-[var(--text-3)] flex-shrink-0" />
                      <p
                        data-testid={`category-name-${cat.id}`}
                        className="text-[14px] font-medium text-[var(--text)] flex-1 truncate"
                      >
                        {cat.name}
                      </p>
                      <Badge
                        variant={cat.is_active ? 'open' : 'closed'}
                        data-testid={`badge-active-${cat.id}`}
                      >
                        {cat.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <IconChevronRight size={14} className="text-[var(--text-3)]" />
                    </div>

                    {/* Bottom row: reorder + edit + toggle */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-testid={`btn-move-up-${cat.id}`}
                          onClick={() => handleMove(index, -1)}
                          disabled={index === 0}
                          className={iconBtn}
                        >
                          <IconChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          data-testid={`btn-move-down-${cat.id}`}
                          onClick={() => handleMove(index, 1)}
                          disabled={index === categories.length - 1}
                          className={iconBtn}
                        >
                          <IconChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          data-testid={`btn-edit-${cat.id}`}
                          onClick={() => startEdit(cat)}
                          className={`${iconBtn} ml-1`}
                        >
                          <IconPencil size={14} />
                        </button>
                      </div>

                      <div data-testid={`toggle-active-${cat.id}`}>
                        <Toggle
                          checked={cat.is_active}
                          onChange={() => handleToggleActive(cat)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add new category input */}
            {adding && (
              <div
                data-testid="add-category-row"
                className="bg-[var(--bg-primary)] border border-accent rounded-card p-3 flex items-center gap-2"
              >
                <input
                  ref={addInputRef}
                  data-testid="add-input"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') handleCancelAdd()
                  }}
                  placeholder="Nome da categoria"
                  className="flex-1 h-[34px] px-3 rounded-[8px] text-[13px] text-[var(--text)] bg-[var(--bg-secondary)] outline-none border border-[var(--border-strong)] focus:border-accent"
                />
                <button
                  type="button"
                  data-testid="btn-save-add"
                  onClick={handleAdd}
                  disabled={savingNew}
                  className="w-8 h-8 flex items-center justify-center rounded-[7px] bg-accent text-white disabled:opacity-60"
                >
                  {savingNew
                    ? <Spinner size="sm" className="border-white/30 border-t-white" />
                    : <IconCheck size={15} />}
                </button>
                <button
                  type="button"
                  data-testid="btn-cancel-add"
                  onClick={handleCancelAdd}
                  className={iconBtn}
                >
                  <IconX size={15} />
                </button>
              </div>
            )}

            {/* Dashed add button (when not adding) */}
            {!adding && !loading && (
              <button
                type="button"
                data-testid="btn-add-dashed"
                onClick={() => { setAdding(true); setEditingId(null) }}
                className="w-full flex items-center justify-center gap-2 p-3 text-[13px] font-medium text-[var(--text-2)]
                  border border-dashed border-[var(--border-strong)] rounded-card bg-[var(--bg-primary)]
                  hover:border-accent hover:text-accent transition-colors duration-150"
              >
                <IconPlus size={15} />
                Nova categoria
              </button>
            )}
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
