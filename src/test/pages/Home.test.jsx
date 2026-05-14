import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import Home from '../../pages/owner/Home'

/* ── Mocks ── */

vi.mock('../../hooks/useBusiness', () => ({
  useMyBusinesses: vi.fn(),
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
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useMyBusinesses } from '../../hooks/useBusiness'

/* ── Fixtures ── */

const BUSINESS_A = {
  id: 'b1',
  name: 'Bar do João',
  slug: 'bar-do-joao',
  category: 'bar',
  logo_url: null,
  is_open: true,
  timezone: 'America/Sao_Paulo',
  address_city: 'São Paulo',
  address_state: 'SP',
}

const BUSINESS_B = {
  id: 'b2',
  name: 'Restaurante Silva',
  slug: 'restaurante-silva',
  category: 'restaurant',
  logo_url: null,
  is_open: false,
  timezone: 'America/Sao_Paulo',
  address_city: null,
  address_state: null,
}

const METRICS_A = { activeOrders: 3, occupiedTables: 2, revenue: 450.0 }
const METRICS_B = { activeOrders: 0, occupiedTables: 0, revenue: 0 }

const defaultHook = {
  businesses: [BUSINESS_A],
  metrics: { b1: METRICS_A },
  loading: false,
  error: null,
  toggleIsOpen: vi.fn(),
}

/* ── Testes ── */

describe('Home — loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe spinner enquanto carrega', () => {
    useMyBusinesses.mockReturnValue({ ...defaultHook, loading: true, businesses: [] })
    renderWithRouter(<Home />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('não exibe lista durante loading', () => {
    useMyBusinesses.mockReturnValue({ ...defaultHook, loading: true, businesses: [] })
    renderWithRouter(<Home />)
    expect(screen.queryByTestId('business-list')).not.toBeInTheDocument()
  })
})

describe('Home — erro', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe estado de erro quando fetch falha', () => {
    useMyBusinesses.mockReturnValue({
      ...defaultHook,
      loading: false,
      businesses: [],
      error: new Error('Network error'),
    })
    renderWithRouter(<Home />)
    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })
})

describe('Home — estado vazio', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe empty state quando não há estabelecimentos', () => {
    useMyBusinesses.mockReturnValue({ ...defaultHook, businesses: [], metrics: {} })
    renderWithRouter(<Home />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('botão do empty state navega para /owner/business/new', () => {
    useMyBusinesses.mockReturnValue({ ...defaultHook, businesses: [], metrics: {} })
    renderWithRouter(<Home />)
    fireEvent.click(screen.getByTestId('btn-new-business-empty'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/new')
  })
})

describe('Home — lista de estabelecimentos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza card para cada estabelecimento', () => {
    useMyBusinesses.mockReturnValue({
      ...defaultHook,
      businesses: [BUSINESS_A, BUSINESS_B],
      metrics: { b1: METRICS_A, b2: METRICS_B },
    })
    renderWithRouter(<Home />)
    expect(screen.getByTestId('business-card-b1')).toBeInTheDocument()
    expect(screen.getByTestId('business-card-b2')).toBeInTheDocument()
  })

  it('exibe nome do estabelecimento', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    expect(screen.getByText('Bar do João')).toBeInTheDocument()
  })

  it('exibe label da categoria', () => {
    useMyBusinesses.mockReturnValue({
      ...defaultHook,
      businesses: [BUSINESS_B],
      metrics: { b2: METRICS_B },
    })
    renderWithRouter(<Home />)
    expect(screen.getByText('Restaurante')).toBeInTheDocument()
  })

  it('exibe badge Aberto quando is_open=true', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    expect(screen.getByTestId('badge-status-b1')).toHaveTextContent('Aberto')
  })

  it('exibe badge Fechado quando is_open=false', () => {
    useMyBusinesses.mockReturnValue({
      ...defaultHook,
      businesses: [BUSINESS_B],
      metrics: { b2: METRICS_B },
    })
    renderWithRouter(<Home />)
    expect(screen.getByTestId('badge-status-b2')).toHaveTextContent('Fechado')
  })

  it('exibe initials quando logo_url é null', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    expect(screen.getByText('BJ')).toBeInTheDocument()
  })

  it('exibe métricas do estabelecimento', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    expect(screen.getByTestId('metric-orders-b1')).toHaveTextContent('3')
    expect(screen.getByTestId('metric-tables-b1')).toHaveTextContent('2')
    expect(screen.getByTestId('metric-revenue-b1')).toHaveTextContent('450')
  })

  it('exibe contagem de estabelecimentos', () => {
    useMyBusinesses.mockReturnValue({
      ...defaultHook,
      businesses: [BUSINESS_A, BUSINESS_B],
      metrics: { b1: METRICS_A, b2: METRICS_B },
    })
    renderWithRouter(<Home />)
    expect(screen.getByText(/2 estabelecimentos/)).toBeInTheDocument()
  })
})

describe('Home — navegação', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clicar no card navega para /owner/business/:id', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    fireEvent.click(screen.getByTestId('business-card-b1'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1')
  })

  it('botão "+ Novo" no header navega para /owner/business/new', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    fireEvent.click(screen.getByTestId('btn-new-business'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/new')
  })

  it('card dashed "Novo estabelecimento" na lista navega para /owner/business/new', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    fireEvent.click(screen.getByTestId('btn-new-business-list'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/new')
  })
})

describe('Home — toggle is_open', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chama toggleIsOpen com id e valor atual ao clicar no toggle', async () => {
    const toggleIsOpen = vi.fn().mockResolvedValue(undefined)
    useMyBusinesses.mockReturnValue({ ...defaultHook, toggleIsOpen })
    renderWithRouter(<Home />)
    fireEvent.click(screen.getByTestId('toggle-open-b1'))
    await waitFor(() =>
      expect(toggleIsOpen).toHaveBeenCalledWith('b1', true)
    )
  })
})

describe('Home — header OwnerLayout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza logo MenuFlow', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    expect(screen.getByText('Flow')).toBeInTheDocument()
  })

  it('renderiza initials do usuário no avatar', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    expect(screen.getByTestId('avatar-btn')).toHaveTextContent('JS')
  })

  it('abre dropdown ao clicar no avatar', () => {
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    fireEvent.click(screen.getByTestId('avatar-btn'))
    expect(screen.getByTestId('avatar-dropdown')).toBeInTheDocument()
  })

  it('toggle de tema persiste no localStorage', () => {
    localStorage.clear()
    document.documentElement.className = 'dark'
    useMyBusinesses.mockReturnValue(defaultHook)
    renderWithRouter(<Home />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
