import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import BusinessForm from '../../pages/owner/BusinessForm'

/* ── Mocks ── */

vi.mock('../../services/businessService', () => ({
  fetchBusinessById: vi.fn(),
  createBusiness: vi.fn(),
  updateBusiness: vi.fn(),
  checkSlugExists: vi.fn(),
}))

vi.mock('../../utils/cep', () => ({
  fetchAddressByCep: vi.fn(),
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
const mockUseParams = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  }
})

import { fetchBusinessById, createBusiness, updateBusiness, checkSlugExists } from '../../services/businessService'
import { fetchAddressByCep } from '../../utils/cep'

/* ── Fixtures ── */

const BUSINESS = {
  id: 'b1',
  name: 'Bar do João',
  slug: 'bar-do-joao',
  category: 'bar',
  phone: '(11) 99999-9999',
  address_zip: '04327180',
  address_street: 'Rua Exemplo',
  address_number: '100',
  address_complement: '',
  address_neighborhood: 'Vila Teste',
  address_city: 'São Paulo',
  address_state: 'SP',
  timezone: 'America/Sao_Paulo',
  opens_at: '18:00',
  closes_at: '00:00',
  service_charge_percent: 10,
  max_discount_percent: 15,
  is_open: true,
}

const CEP_RESPONSE = {
  street: 'Rua Exemplo',
  neighborhood: 'Bairro Teste',
  city: 'São Paulo',
  state: 'SP',
}

/* ── Modo Criação ── */

describe('BusinessForm — modo criação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({})
    checkSlugExists.mockResolvedValue(false) // slug livre por padrão
  })

  it('renderiza formulário vazio', () => {
    renderWithRouter(<BusinessForm />)
    expect(screen.getByTestId('input-name')).toHaveValue('')
    expect(screen.getByTestId('input-slug')).toHaveValue('')
    expect(screen.getByTestId('select-category')).toHaveValue('')
  })

  it('exibe título Novo estabelecimento', () => {
    renderWithRouter(<BusinessForm />)
    expect(screen.getByText('Novo estabelecimento')).toBeInTheDocument()
  })

  it('exibe botão Criar estabelecimento', () => {
    renderWithRouter(<BusinessForm />)
    expect(screen.getByTestId('btn-submit')).toHaveTextContent('Criar estabelecimento')
  })

  it('auto-gera slug ao digitar nome', () => {
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Bar do João' } })
    expect(screen.getByTestId('input-slug')).toHaveValue('bar-do-joao')
  })

  it('exibe erro se nome estiver vazio ao submeter', async () => {
    renderWithRouter(<BusinessForm />)
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(screen.getByTestId('error-name')).toBeInTheDocument())
  })

  it('exibe erro se categoria não for selecionada ao submeter', async () => {
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Bar do João' } })
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(screen.getByTestId('error-category')).toBeInTheDocument())
  })

  it('chama createBusiness e navega após criar', async () => {
    createBusiness.mockResolvedValueOnce({ id: 'b-new' })
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Novo Bar' } })
    fireEvent.change(screen.getByTestId('select-category'), { target: { value: 'bar' } })
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(createBusiness).toHaveBeenCalled())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b-new'))
  })

  it('inclui owner_id, staff_access_code e is_open no payload', async () => {
    createBusiness.mockResolvedValueOnce({ id: 'b-new' })
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Novo Bar' } })
    fireEvent.change(screen.getByTestId('select-category'), { target: { value: 'bar' } })
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(createBusiness).toHaveBeenCalled())
    const payload = createBusiness.mock.calls[0][0]
    expect(payload.owner_id).toBe('u1')
    expect(payload.staff_access_code).toMatch(/^\d{6}$/)
    expect(payload.is_open).toBe(false)
  })

  it('exibe erro inline quando slug já está em uso (verificação prévia)', async () => {
    checkSlugExists.mockResolvedValueOnce(true)
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Novo Bar' } })
    fireEvent.change(screen.getByTestId('select-category'), { target: { value: 'bar' } })
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(screen.getByTestId('error-slug')).toBeInTheDocument())
    expect(createBusiness).not.toHaveBeenCalled()
  })

  it('exibe erro de slug duplicado retornado pelo servidor (fallback 23505)', async () => {
    const slugErr = Object.assign(new Error('businesses_slug_key'), { code: '23505' })
    createBusiness.mockRejectedValueOnce(slugErr)
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Novo Bar' } })
    fireEvent.change(screen.getByTestId('select-category'), { target: { value: 'bar' } })
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(screen.getByTestId('error-slug')).toBeInTheDocument())
  })
})

/* ── Modo Edição ── */

describe('BusinessForm — modo edição', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'b1' })
    fetchBusinessById.mockResolvedValue(BUSINESS)
    checkSlugExists.mockResolvedValue(false)
  })

  it('exibe spinner enquanto carrega', () => {
    fetchBusinessById.mockReturnValue(new Promise(() => {}))
    renderWithRouter(<BusinessForm />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('pré-preenche nome e slug após carregar', async () => {
    renderWithRouter(<BusinessForm />)
    await waitFor(() => expect(screen.getByTestId('input-name')).toHaveValue('Bar do João'))
    expect(screen.getByTestId('input-slug')).toHaveValue('bar-do-joao')
  })

  it('pré-preenche categoria após carregar', async () => {
    renderWithRouter(<BusinessForm />)
    await waitFor(() => expect(screen.getByTestId('select-category')).toHaveValue('bar'))
  })

  it('pré-preenche cidade e estado após carregar', async () => {
    renderWithRouter(<BusinessForm />)
    await waitFor(() => expect(screen.getByTestId('input-city')).toHaveValue('São Paulo'))
    expect(screen.getByTestId('input-state')).toHaveValue('SP')
  })

  it('exibe botão Salvar alterações', async () => {
    renderWithRouter(<BusinessForm />)
    await waitFor(() => screen.getByTestId('input-name'))
    expect(screen.getByTestId('btn-submit')).toHaveTextContent('Salvar alterações')
  })

  it('chama updateBusiness e navega após salvar', async () => {
    updateBusiness.mockResolvedValueOnce(BUSINESS)
    renderWithRouter(<BusinessForm />)
    await waitFor(() => screen.getByTestId('input-name'))
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(updateBusiness).toHaveBeenCalledWith('b1', expect.any(Object)))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1'))
  })

  it('redireciona para /owner/home se fetchBusinessById falhar', async () => {
    fetchBusinessById.mockRejectedValueOnce(new Error('not found'))
    renderWithRouter(<BusinessForm />)
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/owner/home', { replace: true })
    )
  })
})

/* ── CEP auto-fill ── */

describe('BusinessForm — CEP auto-fill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({})
  })

  it('preenche campos de endereço ao digitar CEP válido', async () => {
    fetchAddressByCep.mockResolvedValueOnce(CEP_RESPONSE)
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-cep'), { target: { value: '04327180' } })
    await waitFor(() =>
      expect(screen.getByTestId('input-street')).toHaveValue('Rua Exemplo')
    )
    expect(screen.getByTestId('input-city')).toHaveValue('São Paulo')
    expect(screen.getByTestId('input-state')).toHaveValue('SP')
    expect(screen.getByTestId('input-neighborhood')).toHaveValue('Bairro Teste')
  })

  it('exibe timezone após CEP válido de SP', async () => {
    fetchAddressByCep.mockResolvedValueOnce(CEP_RESPONSE)
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-cep'), { target: { value: '04327180' } })
    await waitFor(() =>
      expect(screen.getByTestId('timezone-display')).toHaveTextContent('America/Sao_Paulo')
    )
  })

  it('exibe erro de CEP quando não encontrado', async () => {
    fetchAddressByCep.mockRejectedValueOnce(new Error('CEP não encontrado'))
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-cep'), { target: { value: '00000000' } })
    await waitFor(() =>
      expect(screen.getByTestId('error-cep')).toBeInTheDocument()
    )
  })

  it('não chama fetchAddressByCep com menos de 8 dígitos', () => {
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-cep'), { target: { value: '0432718' } })
    expect(fetchAddressByCep).not.toHaveBeenCalled()
  })
})

/* ── Timezone por estado manual ── */

describe('BusinessForm — timezone por estado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({})
  })

  it('exibe timezone ao digitar estado manualmente', () => {
    renderWithRouter(<BusinessForm />)
    fireEvent.change(screen.getByTestId('input-state'), { target: { value: 'AM' } })
    expect(screen.getByTestId('timezone-display')).toHaveTextContent('America/Manaus')
  })
})
