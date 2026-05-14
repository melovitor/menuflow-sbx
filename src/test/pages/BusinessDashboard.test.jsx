import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import BusinessDashboard from '../../pages/owner/BusinessDashboard'

/* ── Mocks ── */

vi.mock('../../services/businessService', () => ({
  fetchBusinessById: vi.fn(),
  updateBusinessOpenStatus: vi.fn(),
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

import { fetchBusinessById, updateBusinessOpenStatus } from '../../services/businessService'

/* ── Fixtures ── */

const BUSINESS = {
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

/* ── Testes ── */

describe('BusinessDashboard — loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe spinner enquanto carrega', () => {
    fetchBusinessById.mockReturnValue(new Promise(() => {}))
    renderWithRouter(<BusinessDashboard />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('não exibe grid durante loading', () => {
    fetchBusinessById.mockReturnValue(new Promise(() => {}))
    renderWithRouter(<BusinessDashboard />)
    expect(screen.queryByTestId('nav-grid')).not.toBeInTheDocument()
  })
})

describe('BusinessDashboard — erro / não encontrado', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redireciona para /owner/home se fetchBusinessById falhar', async () => {
    fetchBusinessById.mockRejectedValueOnce(new Error('Not found'))
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/owner/home', { replace: true })
    )
  })
})

describe('BusinessDashboard — conteúdo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('exibe nome do estabelecimento no header', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('business-info'))
    expect(screen.getAllByText('Bar do João').length).toBeGreaterThan(0)
  })

  it('exibe label de categoria', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('business-info'))
    expect(screen.getByText(/Bar ·/)).toBeInTheDocument()
  })

  it('exibe cidade e estado', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('business-info'))
    expect(screen.getByText(/São Paulo/)).toBeInTheDocument()
  })

  it('exibe badge Aberto quando is_open=true', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('badge-status'))
    expect(screen.getByTestId('badge-status')).toHaveTextContent('Aberto')
  })

  it('exibe badge Fechado quando is_open=false', async () => {
    fetchBusinessById.mockResolvedValue({ ...BUSINESS, is_open: false })
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('badge-status'))
    expect(screen.getByTestId('badge-status')).toHaveTextContent('Fechado')
  })

  it('renderiza os 4 botões de navegação', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('nav-grid'))
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('nav-menu')).toBeInTheDocument()
    expect(screen.getByTestId('nav-tables')).toBeInTheDocument()
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
  })

  it('exibe labels de todos os botões', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('nav-grid'))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Cardápio')).toBeInTheDocument()
    expect(screen.getByText('Mesas e QR')).toBeInTheDocument()
    expect(screen.getByText('Configurações')).toBeInTheDocument()
  })
})

describe('BusinessDashboard — navegação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('navega para /owner/business/:id/dashboard', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('nav-dashboard'))
    fireEvent.click(screen.getByTestId('nav-dashboard'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1/dashboard')
  })

  it('navega para /owner/business/:id/menu', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('nav-menu'))
    fireEvent.click(screen.getByTestId('nav-menu'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1/menu')
  })

  it('navega para /owner/business/:id/tables', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('nav-tables'))
    fireEvent.click(screen.getByTestId('nav-tables'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1/tables')
  })

  it('navega para /owner/business/:id/settings', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('nav-settings'))
    fireEvent.click(screen.getByTestId('nav-settings'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1/settings')
  })
})

describe('BusinessDashboard — toggle is_open', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('chama updateBusinessOpenStatus ao toggling', async () => {
    updateBusinessOpenStatus.mockResolvedValueOnce(undefined)
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('toggle-open'))
    fireEvent.click(screen.getByTestId('toggle-open').querySelector('button'))
    await waitFor(() =>
      expect(updateBusinessOpenStatus).toHaveBeenCalledWith('b1', false)
    )
  })

  it('atualização otimista inverte o badge antes da resposta', async () => {
    let resolve
    updateBusinessOpenStatus.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('badge-status'))
    expect(screen.getByTestId('badge-status')).toHaveTextContent('Aberto')
    fireEvent.click(screen.getByTestId('toggle-open').querySelector('button'))
    await waitFor(() =>
      expect(screen.getByTestId('badge-status')).toHaveTextContent('Fechado')
    )
    resolve()
  })

  it('reverte o estado em caso de erro', async () => {
    updateBusinessOpenStatus.mockRejectedValueOnce(new Error('fail'))
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('badge-status'))
    fireEvent.click(screen.getByTestId('toggle-open').querySelector('button'))
    await waitFor(() =>
      expect(screen.getByTestId('badge-status')).toHaveTextContent('Aberto')
    )
  })
})

describe('BusinessDashboard — header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('exibe botão de voltar', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByTestId('btn-back'))
    expect(screen.getByTestId('btn-back')).toBeInTheDocument()
  })

  it('exibe logo MenuFlow', async () => {
    renderWithRouter(<BusinessDashboard />)
    await waitFor(() => screen.getByText('Flow'))
    expect(screen.getByText('Flow')).toBeInTheDocument()
  })
})
