import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import Register from '../../pages/auth/Register'

vi.mock('../../services/authService', () => ({
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { signUp, signInWithGoogle } from '../../services/authService'

const fill = (fields) => {
  if (fields.name !== undefined)
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: fields.name } })
  if (fields.email !== undefined)
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: fields.email } })
  if (fields.password !== undefined)
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: fields.password } })
  if (fields.confirm !== undefined)
    fireEvent.change(screen.getByTestId('input-confirm-password'), { target: { value: fields.confirm } })
}

const VALID = {
  name: 'João Silva',
  email: 'joao@test.com',
  password: '123456',
  confirm: '123456',
}

describe('Register — elementos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.className = 'dark'
  })

  it('renderiza todos os elementos interativos', () => {
    renderWithRouter(<Register />)
    expect(screen.getByTestId('input-name')).toBeInTheDocument()
    expect(screen.getByTestId('input-email')).toBeInTheDocument()
    expect(screen.getByTestId('input-password')).toBeInTheDocument()
    expect(screen.getByTestId('input-confirm-password')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-password')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-confirm-password')).toBeInTheDocument()
    expect(screen.getByTestId('btn-signup')).toBeInTheDocument()
    expect(screen.getByTestId('btn-google')).toBeInTheDocument()
    expect(screen.getByTestId('link-login')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('exibe logo MenuFlow', () => {
    renderWithRouter(<Register />)
    expect(screen.getByText('Flow')).toBeInTheDocument()
  })

  it('link de login aponta para /login', () => {
    renderWithRouter(<Register />)
    expect(screen.getByTestId('link-login')).toHaveAttribute('href', '/login')
  })
})

describe('Register — validação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('exibe erro quando todos os campos estão vazios', async () => {
    renderWithRouter(<Register />)
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
    expect(signUp).not.toHaveBeenCalled()
  })

  it('exibe erro quando nome está vazio', async () => {
    renderWithRouter(<Register />)
    fill({ name: '', email: VALID.email, password: VALID.password, confirm: VALID.confirm })
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
  })

  it('exibe erro quando nome é muito curto', async () => {
    renderWithRouter(<Register />)
    fill({ name: 'A', email: VALID.email, password: VALID.password, confirm: VALID.confirm })
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
  })

  it('exibe erro quando e-mail é inválido', async () => {
    renderWithRouter(<Register />)
    fill({ name: VALID.name, email: 'nao-e-email', password: VALID.password, confirm: VALID.confirm })
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
  })

  it('exibe erro quando senha tem menos de 6 caracteres', async () => {
    renderWithRouter(<Register />)
    fill({ name: VALID.name, email: VALID.email, password: '123', confirm: '123' })
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
  })

  it('exibe erro quando senhas não coincidem', async () => {
    renderWithRouter(<Register />)
    fill({ name: VALID.name, email: VALID.email, password: '123456', confirm: '654321' })
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('coincidem')
    })
    expect(signUp).not.toHaveBeenCalled()
  })
})

describe('Register — cadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('chama signUp com dados corretos', async () => {
    signUp.mockResolvedValueOnce({ user: { id: '1' } })
    renderWithRouter(<Register />)
    fill(VALID)
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith(VALID.email, VALID.password, VALID.name)
    )
  })

  it('exibe tela de sucesso após cadastro', async () => {
    signUp.mockResolvedValueOnce({ user: { id: '1' } })
    renderWithRouter(<Register />)
    fill(VALID)
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => expect(screen.getByTestId('success-screen')).toBeInTheDocument())
    expect(screen.getByTestId('btn-go-login')).toBeInTheDocument()
    expect(screen.getByText(VALID.email)).toBeInTheDocument()
  })

  it('navega para /login ao clicar em "Ir para o login"', async () => {
    signUp.mockResolvedValueOnce({ user: { id: '1' } })
    renderWithRouter(<Register />)
    fill(VALID)
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => screen.getByTestId('btn-go-login'))
    fireEvent.click(screen.getByTestId('btn-go-login'))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('exibe erro de e-mail já cadastrado', async () => {
    signUp.mockRejectedValueOnce(new Error('User already registered'))
    renderWithRouter(<Register />)
    fill(VALID)
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('já está cadastrado')
    })
  })

  it('exibe erro genérico quando cadastro falha', async () => {
    signUp.mockRejectedValueOnce(new Error('Database error'))
    renderWithRouter(<Register />)
    fill(VALID)
    fireEvent.click(screen.getByTestId('btn-signup'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
  })

  it('chama signInWithGoogle', async () => {
    signInWithGoogle.mockResolvedValueOnce({})
    renderWithRouter(<Register />)
    fireEvent.click(screen.getByTestId('btn-google'))
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled())
  })

  it('exibe erro quando Google falha', async () => {
    signInWithGoogle.mockRejectedValueOnce(new Error('OAuth error'))
    renderWithRouter(<Register />)
    fireEvent.click(screen.getByTestId('btn-google'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
  })
})

describe('Register — password toggles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('senha inicia como password e alterna para text', () => {
    renderWithRouter(<Register />)
    const input = screen.getByTestId('input-password')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByTestId('toggle-password'))
    expect(input).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByTestId('toggle-password'))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('confirmar senha inicia como password e alterna para text', () => {
    renderWithRouter(<Register />)
    const input = screen.getByTestId('input-confirm-password')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByTestId('toggle-confirm-password'))
    expect(input).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByTestId('toggle-confirm-password'))
    expect(input).toHaveAttribute('type', 'password')
  })
})

describe('Register — tema', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = 'dark'
  })

  it('toggle alterna para light e persiste no localStorage', () => {
    renderWithRouter(<Register />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
