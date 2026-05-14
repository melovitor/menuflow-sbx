import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import MenuItems from '../../pages/owner/MenuItems'

/* ── Mocks ── */

vi.mock('../../services/menuService', () => ({
  fetchMenuItems: vi.fn(),
  updateMenuItem: vi.fn(),
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
let mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'b1' }),
    useLocation: () => ({ state: mockState, pathname: '/owner/business/b1/menu/items' }),
  }
})

import { fetchMenuItems, updateMenuItem } from '../../services/menuService'

/* ── Fixtures ── */

const ITEM_A = {
  id: 'i1',
  category_id: 'cat1',
  name: 'Coca-Cola',
  description: 'Gelada',
  photo_url: 'https://example.com/coca.jpg',
  price: 8.00,
  promo_price: null,
  prep_time_minutes: 5,
  tags: [],
  is_active: true,
}

const ITEM_B = {
  id: 'i2',
  category_id: 'cat1',
  name: 'Suco de Laranja',
  description: 'Natural',
  photo_url: null,
  price: 12.00,
  promo_price: 9.00,
  prep_time_minutes: 10,
  tags: ['vegetarian', 'vegan'],
  is_active: false,
}

const ITEM_C = {
  id: 'i3',
  category_id: 'cat1',
  name: 'Água Mineral',
  description: null,
  photo_url: 'https://example.com/agua.jpg',
  price: 5.00,
  promo_price: null,
  prep_time_minutes: null,
  tags: ['gluten_free'],
  is_active: true,
}

/* ── Loading ── */

describe('MenuItems — loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
  })

  it('exibe spinner enquanto carrega', () => {
    fetchMenuItems.mockReturnValue(new Promise(() => {}))
    renderWithRouter(<MenuItems />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })
})

/* ── Estado vazio ── */

describe('MenuItems — estado vazio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
  })

  it('exibe empty state quando não há itens', async () => {
    fetchMenuItems.mockResolvedValue([])
    renderWithRouter(<MenuItems />)
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
  })
})

/* ── Conteúdo ── */

describe('MenuItems — conteúdo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
    fetchMenuItems.mockResolvedValue([ITEM_A, ITEM_B, ITEM_C])
  })

  it('exibe nomes dos itens', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('item-name-i1')).toHaveTextContent('Coca-Cola')
    expect(screen.getByTestId('item-name-i2')).toHaveTextContent('Suco de Laranja')
    expect(screen.getByTestId('item-name-i3')).toHaveTextContent('Água Mineral')
  })

  it('exibe foto quando photo_url existe', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('item-photo-i1')).toBeInTheDocument()
  })

  it('exibe placeholder quando photo_url é null', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('item-photo-placeholder-i2')).toBeInTheDocument()
  })

  it('exibe preço regular quando não há promoção', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('item-price-i1')).toHaveTextContent(/8,00/)
  })

  it('exibe preço promocional quando promo_price existe', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('item-promo-price-i2')).toHaveTextContent(/9,00/)
    expect(screen.getByTestId('item-price-i2')).toHaveTextContent(/12,00/)
  })

  it('exibe badge Ativo para itens ativos', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('badge-active-i1')).toHaveTextContent('Ativo')
  })

  it('exibe badge Inativo para itens inativos', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('badge-active-i2')).toHaveTextContent('Inativo')
  })

  it('exibe tags dos itens', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.getByTestId('item-tag-i2-vegetarian')).toHaveTextContent('Vegetariano')
    expect(screen.getByTestId('item-tag-i2-vegan')).toHaveTextContent('Vegano')
    expect(screen.getByTestId('item-tag-i3-gluten_free')).toHaveTextContent('Sem Glúten')
  })

  it('não exibe tags quando array está vazio', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('item-list'))
    expect(screen.queryByTestId('item-tag-i1-vegetarian')).not.toBeInTheDocument()
  })
})

/* ── Toggle ativo ── */

describe('MenuItems — toggle ativo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
    fetchMenuItems.mockResolvedValue([ITEM_A])
  })

  it('chama updateMenuItem ao toggling', async () => {
    updateMenuItem.mockResolvedValueOnce({ ...ITEM_A, is_active: false })
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('toggle-active-i1'))
    fireEvent.click(screen.getByTestId('toggle-active-i1').querySelector('button'))
    await waitFor(() =>
      expect(updateMenuItem).toHaveBeenCalledWith('i1', { is_active: false })
    )
  })

  it('atualização otimista muda o badge imediatamente', async () => {
    let resolve
    updateMenuItem.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('badge-active-i1'))
    expect(screen.getByTestId('badge-active-i1')).toHaveTextContent('Ativo')
    fireEvent.click(screen.getByTestId('toggle-active-i1').querySelector('button'))
    await waitFor(() =>
      expect(screen.getByTestId('badge-active-i1')).toHaveTextContent('Inativo')
    )
    resolve({ ...ITEM_A, is_active: false })
  })

  it('reverte o badge em caso de erro', async () => {
    updateMenuItem.mockRejectedValueOnce(new Error('fail'))
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('badge-active-i1'))
    fireEvent.click(screen.getByTestId('toggle-active-i1').querySelector('button'))
    await waitFor(() =>
      expect(screen.getByTestId('badge-active-i1')).toHaveTextContent('Ativo')
    )
  })
})

/* ── Navegação ── */

describe('MenuItems — navegação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
    fetchMenuItems.mockResolvedValue([ITEM_A])
  })

  it('btn-add-item navega para formulário de criação', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('btn-add-item'))
    fireEvent.click(screen.getByTestId('btn-add-item'))
    expect(mockNavigate).toHaveBeenCalledWith(
      '/owner/business/b1/menu/items/new',
      { state: { categoryId: 'cat1', categoryName: 'Bebidas' } }
    )
  })

  it('btn-edit navega para formulário de edição', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('btn-edit-i1'))
    fireEvent.click(screen.getByTestId('btn-edit-i1'))
    expect(mockNavigate).toHaveBeenCalledWith(
      '/owner/business/b1/menu/items/i1/edit',
      { state: { categoryId: 'cat1', categoryName: 'Bebidas' } }
    )
  })

  it('btn-add-dashed navega para formulário de criação', async () => {
    renderWithRouter(<MenuItems />)
    await waitFor(() => screen.getByTestId('btn-add-dashed'))
    fireEvent.click(screen.getByTestId('btn-add-dashed'))
    expect(mockNavigate).toHaveBeenCalledWith(
      '/owner/business/b1/menu/items/new',
      { state: { categoryId: 'cat1', categoryName: 'Bebidas' } }
    )
  })
})

/* ── Sem categoryId no state ── */

describe('MenuItems — sem categoryId no state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = null
  })

  it('redireciona para /menu se não há categoryId', async () => {
    fetchMenuItems.mockResolvedValue([])
    renderWithRouter(<MenuItems />)
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1/menu', { replace: true })
    )
  })
})
