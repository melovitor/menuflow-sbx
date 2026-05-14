import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  IconPlus,
  IconPencil,
  IconClock,
} from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Toggle from '../../components/ui/Toggle'
import { toast } from '../../components/ui/Toast'
import { formatCurrency } from '../../utils/formatters'
import { fetchMenuItems, updateMenuItem } from '../../services/menuService'

const TAG_LABELS = {
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  gluten_free: 'Sem Glúten',
  spicy: 'Picante',
}

const iconBtn =
  'w-7 h-7 flex items-center justify-center rounded-[7px] text-[var(--text-2)] border border-[var(--border-strong)] bg-[var(--bg-primary)] hover:border-accent hover:text-accent transition-colors'

export default function MenuItems() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const categoryId = location.state?.categoryId
  const categoryName = location.state?.categoryName

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!categoryId) {
      navigate(`/owner/business/${id}/menu`, { replace: true })
      return
    }
    fetchMenuItems(categoryId)
      .then(setItems)
      .catch(() => toast.error('Erro ao carregar itens.'))
      .finally(() => setLoading(false))
  }, [categoryId, id, navigate])

  const handleToggleActive = async (item) => {
    const next = !item.is_active
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_active: next } : i))
    )
    try {
      await updateMenuItem(item.id, { is_active: next })
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: item.is_active } : i))
      )
      toast.error('Erro ao atualizar status.')
    }
  }

  const handleNavToForm = (itemId = null) => {
    const path = itemId
      ? `/owner/business/${id}/menu/items/${itemId}/edit`
      : `/owner/business/${id}/menu/items/new`
    navigate(path, { state: { categoryId, categoryName } })
  }

  return (
    <OwnerLayout
      title={categoryName || 'Itens'}
      showBack
      backTo={`/owner/business/${id}/menu`}
    >
      <div className="px-5 py-5 flex flex-col gap-3">

        {/* Section header */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em]">
            {categoryName}
          </p>
          <button
            type="button"
            data-testid="btn-add-item"
            onClick={() => handleNavToForm()}
            className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-accent border border-[var(--border-strong)] rounded-[8px] bg-[var(--bg-primary)] hover:border-accent transition-colors"
          >
            <IconPlus size={13} />
            Novo
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div data-testid="empty-state" className="text-center py-10">
            <p className="text-[14px] font-medium text-[var(--text-2)] mb-1">
              Nenhum item ainda
            </p>
            <p className="text-[12px] text-[var(--text-3)]">
              Adicione itens para organizar o cardápio.
            </p>
          </div>
        )}

        {/* Item list */}
        {!loading && items.length > 0 && (
          <div data-testid="item-list" className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid={`item-card-${item.id}`}
                className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-3 flex items-center gap-3"
              >
                {/* Photo */}
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    data-testid={`item-photo-${item.id}`}
                    className="w-[60px] h-[60px] rounded-[10px] object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    data-testid={`item-photo-placeholder-${item.id}`}
                    className="w-[60px] h-[60px] rounded-[10px] bg-[var(--bg-tertiary)] flex-shrink-0"
                  />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      data-testid={`item-name-${item.id}`}
                      className="text-[14px] font-medium text-[var(--text)] truncate"
                    >
                      {item.name}
                    </p>
                    <Badge
                      variant={item.is_active ? 'open' : 'closed'}
                      data-testid={`badge-active-${item.id}`}
                    >
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    {item.promo_price ? (
                      <>
                        <p
                          data-testid={`item-promo-price-${item.id}`}
                          className="text-[13px] font-medium text-accent"
                        >
                          {formatCurrency(item.promo_price)}
                        </p>
                        <p
                          data-testid={`item-price-${item.id}`}
                          className="text-[11px] text-[var(--text-3)] line-through"
                        >
                          {formatCurrency(item.price)}
                        </p>
                      </>
                    ) : (
                      <p
                        data-testid={`item-price-${item.id}`}
                        className="text-[13px] font-medium text-[var(--text-2)]"
                      >
                        {formatCurrency(item.price)}
                      </p>
                    )}

                    {item.prep_time_minutes && (
                      <span className="flex items-center gap-0.5 text-[11px] text-[var(--text-3)]">
                        <IconClock size={11} />
                        {item.prep_time_minutes}min
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          data-testid={`item-tag-${item.id}-${tag}`}
                          className="text-[10px] px-1.5 py-[2px] rounded-[4px] bg-[var(--bg-tertiary)] text-[var(--text-3)]"
                        >
                          {TAG_LABELS[tag] || tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button
                    type="button"
                    data-testid={`btn-edit-${item.id}`}
                    onClick={() => handleNavToForm(item.id)}
                    className={iconBtn}
                  >
                    <IconPencil size={14} />
                  </button>
                  <div data-testid={`toggle-active-${item.id}`}>
                    <Toggle
                      checked={item.is_active}
                      onChange={() => handleToggleActive(item)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Dashed add button */}
            <button
              type="button"
              data-testid="btn-add-dashed"
              onClick={() => handleNavToForm()}
              className="w-full flex items-center justify-center gap-2 p-3 text-[13px] font-medium text-[var(--text-2)]
                border border-dashed border-[var(--border-strong)] rounded-card bg-[var(--bg-primary)]
                hover:border-accent hover:text-accent transition-colors duration-150"
            >
              <IconPlus size={15} />
              Novo item
            </button>
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
