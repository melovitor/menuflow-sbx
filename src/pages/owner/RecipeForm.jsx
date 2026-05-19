import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { IconTrash, IconPlus, IconChefHat } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { toast } from '../../components/ui/Toast'
import { fetchMenuItemById } from '../../services/menuService'
import {
  fetchIngredients,
  fetchRecipeItems,
  upsertRecipeItem,
  deleteRecipeItem,
} from '../../services/inventoryService'
import { formatCurrency } from '../../utils/formatters'

const inputCls =
  'w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border border-[var(--border-strong)] focus:border-accent'

function marginColor(pct) {
  if (pct === null) return 'text-[var(--text-3)]'
  if (pct > 60) return 'text-[var(--green-text)]'
  if (pct >= 30) return 'text-[var(--amber-text)]'
  return 'text-[var(--red-text)]'
}

function marginBg(pct) {
  if (pct === null) return 'bg-[var(--bg-tertiary)] border-[var(--border)]'
  if (pct > 60) return 'bg-[var(--green-bg)] border-[var(--green-border)]'
  if (pct >= 30) return 'bg-[var(--amber-bg)] border-[var(--amber-border)]'
  return 'bg-[var(--red-bg)] border-[var(--red-border)]'
}

// Cents-first currency mask
const displayCost = (digits) => {
  if (!digits) return ''
  const padded = digits.padStart(3, '0')
  const reais = padded.slice(0, -2).replace(/^0+/, '') || '0'
  return `${reais},${padded.slice(-2)}`
}
const parseCostDigits = (digits) => parseInt(digits || '0') / 100
const numberToDigits = (n) => Math.round(parseFloat(n || 0) * 100).toString()

export default function RecipeForm() {
  const { id: businessId, itemId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const categoryId = location.state?.categoryId
  const categoryName = location.state?.categoryName
  const itemNameFromState = location.state?.itemName

  const [menuItem, setMenuItem] = useState(null)
  const [recipeItems, setRecipeItems] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)

  // Add ingredient form
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  const load = async () => {
    try {
      const [item, recipe, ings] = await Promise.all([
        fetchMenuItemById(itemId),
        fetchRecipeItems(itemId),
        fetchIngredients(businessId),
      ])
      setMenuItem(item)
      setRecipeItems(recipe)
      setIngredients(ings.filter((i) => i.is_active))
    } catch {
      toast.error('Erro ao carregar ficha técnica.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [itemId, businessId])

  // CMV calculated in real-time
  const cmv = recipeItems.reduce(
    (sum, ri) => sum + ri.quantity * (ri.ingredients?.unit_cost || 0),
    0
  )
  const price = menuItem?.price || 0
  const margin = price > 0 ? ((price - cmv) / price) * 100 : null

  // Ingredients not yet in recipe
  const usedIds = new Set(recipeItems.map((ri) => ri.ingredients?.id))
  const available = ingredients.filter(
    (i) => !usedIds.has(i.id) &&
      i.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId)

  const handleAdd = async () => {
    if (!selectedIngredientId) { toast.error('Selecione um insumo.'); return }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      toast.error('Informe uma quantidade válida.')
      return
    }
    setAdding(true)
    try {
      await upsertRecipeItem(itemId, selectedIngredientId, Number(quantity))
      setSelectedIngredientId('')
      setQuantity('')
      setSearch('')
      await load()
    } catch {
      toast.error('Erro ao adicionar insumo.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id) => {
    try {
      await deleteRecipeItem(id)
      setRecipeItems((prev) => prev.filter((ri) => ri.id !== id))
    } catch {
      toast.error('Erro ao remover insumo.')
    }
  }

  if (loading) {
    return (
      <OwnerLayout showBack>
        <div className="flex-1 flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    )
  }

  return (
    <OwnerLayout
      title="Ficha Técnica"
      showBack
    >
      <div className="px-5 py-5 flex flex-col gap-5 pb-10">

        {/* Item header */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3">
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-0.5">
            Item
          </p>
          <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
            {menuItem?.name || itemNameFromState}
          </p>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Preço de venda: {formatCurrency(price)}
          </p>
        </div>

        {/* CMV summary */}
        <div className={`rounded-card border px-4 py-3 ${marginBg(margin)}`}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-0.5">
                CMV
              </p>
              <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.3px]">
                {formatCurrency(cmv)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-0.5">
                Margem bruta
              </p>
              <p className={`text-[15px] font-medium tracking-[-0.3px] ${marginColor(margin)}`}>
                {margin !== null ? `${margin.toFixed(1)}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-0.5">
                Lucro/un
              </p>
              <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.3px]">
                {formatCurrency(price - cmv)}
              </p>
            </div>
          </div>
        </div>

        {/* Margin legend */}
        <p className="text-[10px] text-[var(--text-3)] -mt-3">
          Margem: <span className="text-[var(--green-text)]">verde &gt;60%</span>
          <span className="mx-1.5">·</span>
          <span className="text-[var(--amber-text)]">amber 30–60%</span>
          <span className="mx-1.5">·</span>
          <span className="text-[var(--red-text)]">vermelho &lt;30%</span>
        </p>

        {/* Recipe items list */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Insumos da ficha
          </p>

          {recipeItems.length === 0 && (
            <div
              data-testid="empty-recipe"
              className="flex flex-col items-center justify-center py-10 border border-dashed border-[var(--border-strong)] rounded-card text-center"
            >
              <IconChefHat size={28} className="mb-2 text-[var(--text-3)]" />
              <p className="text-[13px] text-[var(--text-2)]">Nenhum insumo adicionado</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                Adicione os insumos usados neste item.
              </p>
            </div>
          )}

          {recipeItems.length > 0 && (
            <div data-testid="recipe-list" className="flex flex-col gap-2">
              {recipeItems.map((ri) => {
                const partialCost = ri.quantity * (ri.ingredients?.unit_cost || 0)
                return (
                  <div
                    key={ri.id}
                    data-testid={`recipe-item-${ri.id}`}
                    className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text)] truncate">
                        {ri.ingredients?.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                        {ri.quantity} {ri.ingredients?.unit}
                        <span className="mx-1.5">·</span>
                        {formatCurrency(ri.ingredients?.unit_cost || 0)}/{ri.ingredients?.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-[13px] font-medium text-[var(--text)]">
                        {formatCurrency(partialCost)}
                      </p>
                      <button
                        type="button"
                        data-testid={`btn-remove-${ri.id}`}
                        onClick={() => handleRemove(ri.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-3)] hover:border-red-500 hover:text-red-500 transition-colors"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Add ingredient */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Adicionar insumo
          </p>

          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 flex flex-col gap-3">

            {/* Search + select */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Insumo
              </label>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedIngredientId('') }}
                placeholder="Buscar insumo..."
                className={inputCls}
              />
              {search && available.length > 0 && !selectedIngredientId && (
                <div className="mt-1 border border-[var(--border)] rounded-[10px] overflow-hidden bg-[var(--bg-primary)]">
                  {available.slice(0, 6).map((ing) => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => {
                        setSelectedIngredientId(ing.id)
                        setSearch(ing.name)
                      }}
                      className="w-full text-left px-3 py-2.5 text-[13px] text-[var(--text)] hover:bg-[var(--bg-secondary)] border-b border-[var(--border)] last:border-0 transition-colors"
                    >
                      <span className="font-medium">{ing.name}</span>
                      <span className="text-[var(--text-3)] ml-2 text-[11px]">
                        {ing.unit} · {formatCurrency(ing.unit_cost)}/{ing.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {search && available.length === 0 && !selectedIngredientId && (
                <p className="text-[11px] text-[var(--text-3)] mt-1.5 px-1">
                  Nenhum insumo encontrado. <button
                    type="button"
                    onClick={() => navigate(`/owner/business/${businessId}/stock/ingredients`)}
                    className="text-accent underline"
                  >Cadastrar insumo</button>
                </p>
              )}
            </div>

            {/* Quantity + unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Qtd por venda
                </label>
                <input
                  data-testid="input-recipe-quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="ex: 1"
                  className={inputCls}
                />
                <p className="text-[10px] text-[var(--text-3)] mt-1">
                  Quantidade usada por unidade vendida
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Unidade
                </label>
                <div className={`${inputCls} flex items-center text-[var(--text-3)]`}>
                  {selectedIngredient?.unit || '—'}
                </div>
              </div>
            </div>

            {/* Preview cost */}
            {selectedIngredient && quantity && Number(quantity) > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <p className="text-[12px] text-[var(--text-3)]">Custo parcial</p>
                <p className="text-[13px] font-medium text-[var(--text)]">
                  {formatCurrency(Number(quantity) * selectedIngredient.unit_cost)}
                </p>
              </div>
            )}

            <button
              type="button"
              data-testid="btn-add-recipe-item"
              onClick={handleAdd}
              disabled={adding || !selectedIngredientId}
              className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-50 transition-opacity"
            >
              {adding
                ? <Spinner size="sm" className="border-white/30 border-t-white" />
                : <><IconPlus size={16} /> Adicionar</>}
            </button>

          </div>
        </section>

      </div>
    </OwnerLayout>
  )
}
