import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import ForgotPassword from '../../pages/auth/ForgotPassword'

vi.mock('../../services/authService', () => ({
  resetPassword: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { resetPassword } from '../../services/authService'

describe('ForgotPassword — elementos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.className = 'dark'
  })

  it('renderiza todos os elementos interativos', () => {
    renderWithRouter(<ForgotPassword />)
    expect(screen.getByTestId('input-email')).toBeInTheDocument()
    expect(screen.getByTestId('btn-send')).toBeInTheDocument()
    expect(screen.getByTestId('link-login')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('exibe logo MenuFlow', () => {
    renderWithRouter(<ForgotPassword />)
    expect(screen.getByText('Flow')).toBeInTheDocument()
  })

  it('link de login aponta para /login', () => {
    renderWithRouter(<ForgotPassword />)
    expect(screen.getByTestId('link-login')).toHaveAttribute('href', '/login')
  })
})

describe('ForgotPassword — validação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('exibe erro quando e-mail está vazio', async () => {
    renderWithRouter(<ForgotPassword />)
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('exibe erro quando e-mail é inválido', async () => {
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'nao-e-email' },
    })
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('não exibe erro com e-mail válido antes de enviar', () => {
    renderWithRouter(<ForgotPassword />)
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
  })
})

describe('ForgotPassword — envio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('chama resetPassword com o e-mail correto', async () => {
    resetPassword.mockResolvedValueOnce(undefined)
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('owner@test.com'))
  })

  it('exibe tela de sucesso após envio', async () => {
    resetPassword.mockResolvedValueOnce(undefined)
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => expect(screen.getByTestId('success-screen')).toBeInTheDocument())
  })

  it('exibe o e-mail na tela de sucesso', async () => {
    resetPassword.mockResolvedValueOnce(undefined)
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => screen.getByTestId('success-screen'))
    expect(screen.getByText('owner@test.com')).toBeInTheDocument()
  })

  it('navega para /login ao clicar em "Voltar ao login"', async () => {
    resetPassword.mockResolvedValueOnce(undefined)
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => screen.getByTestId('btn-go-login'))
    fireEvent.click(screen.getByTestId('btn-go-login'))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('exibe erro quando o envio falha', async () => {
    resetPassword.mockRejectedValueOnce(new Error('Network error'))
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
    expect(screen.queryByTestId('success-screen')).not.toBeInTheDocument()
  })

  it('chama resetPassword ao pressionar Enter no campo', async () => {
    resetPassword.mockResolvedValueOnce(undefined)
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.keyDown(screen.getByTestId('input-email'), { key: 'Enter' })
    await waitFor(() => expect(resetPassword).toHaveBeenCalled())
  })

  it('o tema toggle persiste no header da tela de sucesso', async () => {
    resetPassword.mockResolvedValueOnce(undefined)
    renderWithRouter(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'owner@test.com' },
    })
    fireEvent.click(screen.getByTestId('btn-send'))
    await waitFor(() => screen.getByTestId('success-screen'))
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })
})

describe('ForgotPassword — tema', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = 'dark'
  })

  it('toggle alterna para light e persiste no localStorage', () => {
    renderWithRouter(<ForgotPassword />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle volta para dark ao clicar novamente', () => {
    renderWithRouter(<ForgotPassword />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
