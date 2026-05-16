import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import BusinessSettings from '../../pages/owner/BusinessSettings'

/* ── Mocks ── */

vi.mock('../../services/businessService', () => ({
  fetchBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  regenerateStaffCode: vi.fn(),
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

import { fetchBusinessById, updateBusiness, regenerateStaffCode } from '../../services/businessService'

/* ── Fixtures ── */

const BUSINESS = {
  id: 'b1',
  name: 'Bar do João',
  slug: 'bar-do-joao',
  category: 'bar',
  is_open: true,
  staff_access_code: '123456',
  service_charge_percent: 10,
  max_discount_percent: 15,
  opens_at: '18:00',
  closes_at: '00:00',
}

/* ── Loading ── */

describe('BusinessSettings — loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe spinner enquanto carrega', () => {
    fetchBusinessById.mockReturnValue(new Promise(() => {}))
    renderWithRouter(<BusinessSettings />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('redireciona para /owner/home se fetch falhar', async () => {
    fetchBusinessById.mockRejectedValueOnce(new Error('not found'))
    renderWithRouter(<BusinessSettings />)
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/owner/home', { replace: true })
    )
  })
})

/* ── Conteúdo ── */

describe('BusinessSettings — conteúdo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('exibe o código de acesso formatado', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('staff-code'))
    expect(screen.getByTestId('staff-code')).toHaveTextContent('123 456')
  })

  it('pré-preenche taxa de serviço', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('input-service-charge'))
    expect(screen.getByTestId('input-service-charge')).toHaveValue(10)
  })

  it('pré-preenche desconto máximo', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('input-max-discount'))
    expect(screen.getByTestId('input-max-discount')).toHaveValue(15)
  })

  it('pré-preenche horários', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('input-opens-at'))
    expect(screen.getByTestId('input-opens-at')).toHaveValue('18:00')
    expect(screen.getByTestId('input-closes-at')).toHaveValue('00:00')
  })

  it('exibe botão de editar dados do estabelecimento', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-edit-business'))
    expect(screen.getByTestId('btn-edit-business')).toBeInTheDocument()
  })
})

/* ── Copiar código ── */

describe('BusinessSettings — copiar código', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('copia o código ao clicar em Copiar', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-copy-code'))
    fireEvent.click(screen.getByTestId('btn-copy-code'))
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123456')
    )
  })

  it('muda texto para Copiado! após cópia', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-copy-code'))
    fireEvent.click(screen.getByTestId('btn-copy-code'))
    await waitFor(() =>
      expect(screen.getByTestId('btn-copy-code')).toHaveTextContent('Copiado!')
    )
  })
})

/* ── Regenerar código ── */

describe('BusinessSettings — regenerar código', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('exibe confirmação ao clicar em Regenerar código', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-regen-code'))
    fireEvent.click(screen.getByTestId('btn-regen-code'))
    expect(screen.getByTestId('regen-confirm')).toBeInTheDocument()
  })

  it('cancela regeneração ao clicar em Cancelar', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-regen-code'))
    fireEvent.click(screen.getByTestId('btn-regen-code'))
    fireEvent.click(screen.getByTestId('btn-regen-cancel'))
    expect(screen.queryByTestId('regen-confirm')).not.toBeInTheDocument()
  })

  it('chama regenerateStaffCode ao confirmar', async () => {
    regenerateStaffCode.mockResolvedValueOnce('654321')
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-regen-code'))
    fireEvent.click(screen.getByTestId('btn-regen-code'))
    fireEvent.click(screen.getByTestId('btn-regen-confirm'))
    await waitFor(() =>
      expect(regenerateStaffCode).toHaveBeenCalledWith('b1')
    )
  })

  it('exibe novo código após regeneração', async () => {
    regenerateStaffCode.mockResolvedValueOnce('654321')
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-regen-code'))
    fireEvent.click(screen.getByTestId('btn-regen-code'))
    fireEvent.click(screen.getByTestId('btn-regen-confirm'))
    await waitFor(() =>
      expect(screen.getByTestId('staff-code')).toHaveTextContent('654 321')
    )
  })
})

/* ── Salvar configurações ── */

describe('BusinessSettings — salvar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('chama updateBusiness com os valores corretos', async () => {
    updateBusiness.mockResolvedValueOnce({})
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-save'))
    fireEvent.click(screen.getByTestId('btn-save'))
    await waitFor(() =>
      expect(updateBusiness).toHaveBeenCalledWith('b1', {
        service_charge_percent: 10,
        max_discount_percent: 15,
        opens_at: '18:00',
        closes_at: '00:00',
        open_days: [],
        schedule_enabled: false,
      })
    )
  })
})

/* ── Navegação ── */

describe('BusinessSettings — navegação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchBusinessById.mockResolvedValue(BUSINESS)
  })

  it('navega para edição ao clicar em Editar dados', async () => {
    renderWithRouter(<BusinessSettings />)
    await waitFor(() => screen.getByTestId('btn-edit-business'))
    fireEvent.click(screen.getByTestId('btn-edit-business'))
    expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1/edit')
  })
})
