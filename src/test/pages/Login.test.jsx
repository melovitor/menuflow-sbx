import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import Login from '../../pages/auth/Login'

vi.mock('../../services/authService', () => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { signIn, signInWithGoogle } from '../../services/authService'

describe('Login — elementos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.className = 'dark'
  })

  it('renderiza todos os elementos interativos', () => {
    renderWithRouter(<Login />)
    expect(screen.getByTestId('input-email')).toBeInTheDocument()
    expect(screen.getByTestId('input-password')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-password')).toBeInTheDocument()
    expect(screen.getByTestId('btn-signin')).toBeInTheDocument()
    expect(screen.getByTestId('btn-google')).toBeInTheDocument()
    expect(screen.getByTestId('link-forgot-password')).toBeInTheDocument()
    expect(screen.getByTestId('link-register')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('exibe logo MenuFlow com Flow em destaque', () => {
    renderWithRouter(<Login />)
    expect(screen.getByText('Flow')).toBeInTheDocument()
  })
})

describe('Login — validação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('exibe erro quando campos estão vazios', async () => {
    renderWithRouter(<Login />)
    fireEvent.click(screen.getByTestId('btn-signin'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('exibe erro quando apenas email está preenchido', async () => {
    renderWithRouter(<Login />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'test@test.com' },
    })
    fireEvent.click(screen.getByTestId('btn-signin'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(signIn).not.toHaveBeenCalled()
  })
})

describe('Login — autenticação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('chama signIn com email e senha corretos', async () => {
    signIn.mockResolvedValueOnce({ user: { id: '1' } })
    renderWithRouter(<Login />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByTestId('btn-signin'))
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith('owner@test.com', '123456')
    )
  })

  it('navega para /owner/home após login bem-sucedido', async () => {
    signIn.mockResolvedValueOnce({ user: { id: '1' } })
    renderWithRouter(<Login />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByTestId('btn-signin'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/owner/home'))
  })

  it('exibe erro em credenciais inválidas', async () => {
    signIn.mockRejectedValueOnce(new Error('Invalid login credentials'))
    renderWithRouter(<Login />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'wrong@test.com' },
    })
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'errado' },
    })
    fireEvent.click(screen.getByTestId('btn-signin'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('chama signIn ao pressionar Enter no campo email', async () => {
    signIn.mockResolvedValueOnce({ user: { id: '1' } })
    renderWithRouter(<Login />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: '123456' },
    })
    fireEvent.keyDown(screen.getByTestId('input-email'), { key: 'Enter' })
    await waitFor(() => expect(signIn).toHaveBeenCalled())
  })

  it('chama signInWithGoogle', async () => {
    signInWithGoogle.mockResolvedValueOnce({})
    renderWithRouter(<Login />)
    fireEvent.click(screen.getByTestId('btn-google'))
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled())
  })

  it('exibe erro quando Google falha', async () => {
    signInWithGoogle.mockRejectedValueOnce(new Error('OAuth error'))
    renderWithRouter(<Login />)
    fireEvent.click(screen.getByTestId('btn-google'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })
})

describe('Login — password toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('inicia com tipo password', () => {
    renderWithRouter(<Login />)
    expect(screen.getByTestId('input-password')).toHaveAttribute('type', 'password')
  })

  it('revela a senha ao clicar no toggle', () => {
    renderWithRouter(<Login />)
    fireEvent.click(screen.getByTestId('toggle-password'))
    expect(screen.getByTestId('input-password')).toHaveAttribute('type', 'text')
  })

  it('oculta novamente ao clicar de volta', () => {
    renderWithRouter(<Login />)
    fireEvent.click(screen.getByTestId('toggle-password'))
    fireEvent.click(screen.getByTestId('toggle-password'))
    expect(screen.getByTestId('input-password')).toHaveAttribute('type', 'password')
  })
})

describe('Login — tema', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = 'dark'
  })

  it('toggle de tema chama toggleTheme e atualiza estado', () => {
    renderWithRouter(<Login />)
    const toggle = screen.getByTestId('theme-toggle')
    fireEvent.click(toggle)
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
