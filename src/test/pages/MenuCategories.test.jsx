import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import MenuCategories from '../../pages/owner/MenuCategories'

/* ── Mocks ── */

vi.mock('../../services/menuService', () => ({
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  reorderCategories: vi.fn(),
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'u1', email: 'owner@test.com', user_metadata: { name: 'João Silva' } },
  })),
}))

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'b1' }),
  }
})

import {
  fetchCategories,
  createCategory,
  updateCategory,
  reorderCategories,
} from '../../services/menuService'

/* ── Fixtures ── */

const CAT_A = { id: 'c1', business_id: 'b1', name: 'Bebidas', is_active: true, order_index: 0 }
const CAT_B = { id: 'c2', business_id: 'b1', name: 'Porções', is_active: true, order_index: 1 }
const CAT_C = { id: 'c3', business_id: 'b1', name: 'Sobremesas', is_active: false, order_index: 2 }

/* ── Loading ── */

describe('MenuCategories — loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe spinner enquanto carrega', () => {
    fetchCategories.mockReturnValue(new Promise(() => {}))
    renderWithRouter(<MenuCategories />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })
})

/* ── Empty state ── */

describe('MenuCategories — estado vazio', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe empty state quando não há categorias', async () => {
    fetchCategories.mockResolvedValue([])
    renderWithRouter(<MenuCategories />)
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
  })
})

/* ── Conteúdo ── */

describe('MenuCategories — conteúdo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategories.mockResolvedValue([CAT_A, CAT_B, CAT_C])
  })

  it('exibe nomes das categorias', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-list'))
    expect(screen.getByTestId('category-name-c1')).toHaveTextContent('Bebidas')
    expect(screen.getByTestId('category-name-c2')).toHaveTextContent('Porções')
    expect(screen.getByTestId('category-name-c3')).toHaveTextContent('Sobremesas')
  })

  it('exibe badge Ativo para categorias ativas', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-list'))
    expect(screen.getByTestId('badge-active-c1')).toHaveTextContent('Ativo')
  })

  it('exibe badge Inativo para categorias inativas', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-list'))
    expect(screen.getByTestId('badge-active-c3')).toHaveTextContent('Inativo')
  })

  it('btn-move-up desabilitado para o primeiro item', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-list'))
    expect(screen.getByTestId('btn-move-up-c1')).toBeDisabled()
  })

  it('btn-move-down desabilitado para o último item', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-list'))
    expect(screen.getByTestId('btn-move-down-c3')).toBeDisabled()
  })
})

/* ── Adicionar categoria ── */

describe('MenuCategories — adicionar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategories.mockResolvedValue([CAT_A])
  })

  it('exibe input ao clicar em Nova', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-add-category'))
    fireEvent.click(screen.getByTestId('btn-add-category'))
    expect(screen.getByTestId('add-input')).toBeInTheDocument()
  })

  it('chama createCategory e adiciona à lista', async () => {
    const newCat = { id: 'c-new', business_id: 'b1', name: 'Pratos Quentes', is_active: true, order_index: 1 }
    createCategory.mockResolvedValueOnce(newCat)
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-add-category'))
    fireEvent.click(screen.getByTestId('btn-add-category'))
    fireEvent.change(screen.getByTestId('add-input'), { target: { value: 'Pratos Quentes' } })
    fireEvent.click(screen.getByTestId('btn-save-add'))
    await waitFor(() => expect(createCategory).toHaveBeenCalledWith('b1', 'Pratos Quentes', 1))
    await waitFor(() => expect(screen.getByTestId('category-name-c-new')).toBeInTheDocument())
  })

  it('cancela adição ao clicar em X', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-add-category'))
    fireEvent.click(screen.getByTestId('btn-add-category'))
    fireEvent.click(screen.getByTestId('btn-cancel-add'))
    expect(screen.queryByTestId('add-input')).not.toBeInTheDocument()
  })

  it('salva ao pressionar Enter no input', async () => {
    const newCat = { id: 'c-new', business_id: 'b1', name: 'Petiscos', is_active: true, order_index: 1 }
    createCategory.mockResolvedValueOnce(newCat)
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-add-category'))
    fireEvent.click(screen.getByTestId('btn-add-category'))
    fireEvent.change(screen.getByTestId('add-input'), { target: { value: 'Petiscos' } })
    fireEvent.keyDown(screen.getByTestId('add-input'), { key: 'Enter' })
    await waitFor(() => expect(createCategory).toHaveBeenCalled())
  })
})

/* ── Editar categoria ── */

describe('MenuCategories — editar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategories.mockResolvedValue([CAT_A, CAT_B])
  })

  it('exibe input com nome atual ao clicar em editar', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-edit-c1'))
    fireEvent.click(screen.getByTestId('btn-edit-c1'))
    expect(screen.getByTestId('edit-input-c1')).toHaveValue('Bebidas')
  })

  it('chama updateCategory com novo nome ao salvar', async () => {
    updateCategory.mockResolvedValueOnce({ ...CAT_A, name: 'Drinks' })
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-edit-c1'))
    fireEvent.click(screen.getByTestId('btn-edit-c1'))
    fireEvent.change(screen.getByTestId('edit-input-c1'), { target: { value: 'Drinks' } })
    fireEvent.click(screen.getByTestId('btn-save-edit-c1'))
    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith('c1', { name: 'Drinks' })
    )
  })

  it('atualiza nome na lista após salvar', async () => {
    updateCategory.mockResolvedValueOnce({ ...CAT_A, name: 'Drinks' })
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-edit-c1'))
    fireEvent.click(screen.getByTestId('btn-edit-c1'))
    fireEvent.change(screen.getByTestId('edit-input-c1'), { target: { value: 'Drinks' } })
    fireEvent.click(screen.getByTestId('btn-save-edit-c1'))
    await waitFor(() =>
      expect(screen.getByTestId('category-name-c1')).toHaveTextContent('Drinks')
    )
  })

  it('cancela edição ao clicar em X', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('btn-edit-c1'))
    fireEvent.click(screen.getByTestId('btn-edit-c1'))
    fireEvent.click(screen.getByTestId('btn-cancel-edit'))
    expect(screen.queryByTestId('edit-input-c1')).not.toBeInTheDocument()
    expect(screen.getByTestId('category-name-c1')).toHaveTextContent('Bebidas')
  })
})

/* ── Toggle ativo ── */

describe('MenuCategories — toggle ativo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategories.mockResolvedValue([CAT_A])
  })

  it('chama updateCategory ao toggling', async () => {
    updateCategory.mockResolvedValueOnce({ ...CAT_A, is_active: false })
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('toggle-active-c1'))
    fireEvent.click(screen.getByTestId('toggle-active-c1').querySelector('button'))
    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith('c1', { is_active: false })
    )
  })

  it('atualização otimista muda o badge imediatamente', async () => {
    let resolve
    updateCategory.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('badge-active-c1'))
    expect(screen.getByTestId('badge-active-c1')).toHaveTextContent('Ativo')
    fireEvent.click(screen.getByTestId('toggle-active-c1').querySelector('button'))
    await waitFor(() =>
      expect(screen.getByTestId('badge-active-c1')).toHaveTextContent('Inativo')
    )
    resolve({ ...CAT_A, is_active: false })
  })

  it('reverte o badge em caso de erro', async () => {
    updateCategory.mockRejectedValueOnce(new Error('fail'))
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('badge-active-c1'))
    fireEvent.click(screen.getByTestId('toggle-active-c1').querySelector('button'))
    await waitFor(() =>
      expect(screen.getByTestId('badge-active-c1')).toHaveTextContent('Ativo')
    )
  })
})

/* ── Reordenar ── */

describe('MenuCategories — reordenar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategories.mockResolvedValue([CAT_A, CAT_B, CAT_C])
    reorderCategories.mockResolvedValue(undefined)
  })

  it('mover para cima troca com o anterior', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-list'))
    fireEvent.click(screen.getByTestId('btn-move-up-c2'))
    await waitFor(() =>
      expect(reorderCategories).toHaveBeenCalledWith(['c2', 'c1', 'c3'])
    )
  })

  it('mover para baixo troca com o seguinte', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-list'))
    fireEvent.click(screen.getByTestId('btn-move-down-c1'))
    await waitFor(() =>
      expect(reorderCategories).toHaveBeenCalledWith(['c2', 'c1', 'c3'])
    )
  })
})

/* ── Navegação ── */

describe('MenuCategories — navegação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategories.mockResolvedValue([CAT_A])
  })

  it('clicar na categoria navega para items com state', async () => {
    renderWithRouter(<MenuCategories />)
    await waitFor(() => screen.getByTestId('category-name-c1'))
    fireEvent.click(screen.getByTestId('category-name-c1'))
    expect(mockNavigate).toHaveBeenCalledWith(
      '/owner/business/b1/menu/items',
      { state: { categoryId: 'c1', categoryName: 'Bebidas' } }
    )
  })
})
