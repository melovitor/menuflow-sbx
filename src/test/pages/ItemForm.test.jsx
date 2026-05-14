import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithRouter } from '../utils/render'
import ItemForm from '../../pages/owner/ItemForm'

/* ── Mocks ── */

vi.mock('../../services/menuService', () => ({
  fetchMenuItemById: vi.fn(),
  createMenuItem: vi.fn(),
  updateMenuItem: vi.fn(),
}))

vi.mock('../../services/storageService', () => ({
  uploadMenuItemPhoto: vi.fn(),
}))

vi.mock('../../utils/imageCompressor', () => ({
  validateImageFile: vi.fn(),
  compressImage: vi.fn(),
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'u1', email: 'owner@test.com', user_metadata: { name: 'João' } },
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
let mockParams = { id: 'b1' }
let mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useLocation: () => ({ state: mockState, pathname: '' }),
  }
})

import {
  fetchMenuItemById,
  createMenuItem,
  updateMenuItem,
} from '../../services/menuService'
import { uploadMenuItemPhoto } from '../../services/storageService'
import { validateImageFile, compressImage } from '../../utils/imageCompressor'

/* ── Fixture ── */

const EXISTING_ITEM = {
  id: 'i1',
  category_id: 'cat1',
  name: 'Coca-Cola',
  description: 'Gelada',
  photo_url: 'https://example.com/coca.jpg',
  price: 8.00,
  promo_price: null,
  prep_time_minutes: 5,
  tags: ['vegetarian'],
  is_active: true,
}

const mockFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
const mockCompressedFile = new File(['compressed'], 'photo.jpg', { type: 'image/jpeg' })

/* ── Modo criação ── */

describe('ItemForm — modo criação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
  })

  it('exibe título Novo item', () => {
    renderWithRouter(<ItemForm />)
    expect(screen.getByText('Novo item')).toBeInTheDocument()
  })

  it('exibe campos de formulário vazios', () => {
    renderWithRouter(<ItemForm />)
    expect(screen.getByTestId('input-name')).toHaveValue('')
    expect(screen.getByTestId('input-price')).toHaveValue(null)
    expect(screen.getByTestId('input-description')).toHaveValue('')
  })

  it('exibe botão de upload quando não há foto', () => {
    renderWithRouter(<ItemForm />)
    expect(screen.getByTestId('btn-upload-photo')).toBeInTheDocument()
  })

  it('exibe prep_time_minutes padrão 15', () => {
    renderWithRouter(<ItemForm />)
    expect(screen.getByTestId('input-prep-time')).toHaveValue(15)
  })
})

/* ── Validações ── */

describe('ItemForm — validações', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
  })

  it('exibe erro de foto quando tenta salvar sem foto', async () => {
    renderWithRouter(<ItemForm />)
    fireEvent.click(screen.getByTestId('btn-save'))
    await waitFor(() =>
      expect(screen.getByTestId('error-photo')).toBeInTheDocument()
    )
  })

  it('exibe erro de nome quando tenta salvar sem nome', async () => {
    renderWithRouter(<ItemForm />)
    fireEvent.click(screen.getByTestId('btn-save'))
    await waitFor(() =>
      expect(screen.getByTestId('error-name')).toBeInTheDocument()
    )
  })

  it('exibe erro de preço quando tenta salvar sem preço', async () => {
    renderWithRouter(<ItemForm />)
    fireEvent.click(screen.getByTestId('btn-save'))
    await waitFor(() =>
      expect(screen.getByTestId('error-price')).toBeInTheDocument()
    )
  })

  it('exibe erro de formato ao selecionar arquivo inválido', async () => {
    validateImageFile.mockImplementationOnce(() => {
      throw new Error('Formato não suportado. Use JPG, PNG ou WEBP.')
    })
    renderWithRouter(<ItemForm />)
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [new File(['x'], 'img.gif', { type: 'image/gif' })] },
    })
    await waitFor(() =>
      expect(screen.getByTestId('error-photo')).toHaveTextContent('Formato não suportado')
    )
  })
})

/* ── Upload de foto ── */

describe('ItemForm — upload de foto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
    validateImageFile.mockReturnValue(undefined)
    compressImage.mockResolvedValue(mockCompressedFile)
    global.URL.createObjectURL = vi.fn(() => 'blob:preview-url')
  })

  it('exibe preview após selecionar foto válida', async () => {
    renderWithRouter(<ItemForm />)
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [mockFile] },
    })
    await waitFor(() =>
      expect(screen.getByTestId('photo-preview')).toBeInTheDocument()
    )
  })

  it('exibe botão Alterar foto após selecionar foto', async () => {
    renderWithRouter(<ItemForm />)
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [mockFile] },
    })
    await waitFor(() =>
      expect(screen.getByTestId('btn-change-photo')).toBeInTheDocument()
    )
  })
})

/* ── Tags ── */

describe('ItemForm — tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
  })

  it('seleciona tag ao clicar', async () => {
    renderWithRouter(<ItemForm />)
    fireEvent.click(screen.getByTestId('tag-btn-vegetarian'))
    await waitFor(() =>
      expect(screen.getByTestId('tag-btn-vegetarian').className).toContain('bg-accent')
    )
  })

  it('deseleciona tag ao clicar novamente', async () => {
    renderWithRouter(<ItemForm />)
    fireEvent.click(screen.getByTestId('tag-btn-vegan'))
    await waitFor(() =>
      expect(screen.getByTestId('tag-btn-vegan').className).toContain('bg-accent')
    )
    fireEvent.click(screen.getByTestId('tag-btn-vegan'))
    await waitFor(() =>
      expect(screen.getByTestId('tag-btn-vegan').className).not.toContain('bg-accent')
    )
  })
})

/* ── Salvar — criação ── */

describe('ItemForm — salvar criação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
    validateImageFile.mockReturnValue(undefined)
    compressImage.mockResolvedValue(mockCompressedFile)
    global.URL.createObjectURL = vi.fn(() => 'blob:preview-url')
    uploadMenuItemPhoto.mockResolvedValue('https://cdn.example.com/photo.jpg')
    createMenuItem.mockResolvedValue({ id: 'i-new', name: 'Sprite' })
  })

  it('chama createMenuItem com payload correto', async () => {
    renderWithRouter(<ItemForm />)

    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [mockFile] } })
    await waitFor(() => screen.getByTestId('photo-preview'))

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Sprite' } })
    fireEvent.change(screen.getByTestId('input-price'), { target: { value: '7' } })

    fireEvent.click(screen.getByTestId('btn-save'))

    await waitFor(() =>
      expect(createMenuItem).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: 'cat1',
          name: 'Sprite',
          price: 7,
          photo_url: 'https://cdn.example.com/photo.jpg',
        })
      )
    )
  })

  it('navega para lista de itens após salvar', async () => {
    renderWithRouter(<ItemForm />)

    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [mockFile] } })
    await waitFor(() => screen.getByTestId('photo-preview'))

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Sprite' } })
    fireEvent.change(screen.getByTestId('input-price'), { target: { value: '7' } })

    fireEvent.click(screen.getByTestId('btn-save'))

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        '/owner/business/b1/menu/items',
        { state: { categoryId: 'cat1', categoryName: 'Bebidas' } }
      )
    )
  })
})

/* ── Modo edição ── */

describe('ItemForm — modo edição', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1', itemId: 'i1' }
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
    fetchMenuItemById.mockResolvedValue(EXISTING_ITEM)
  })

  it('exibe spinner enquanto carrega', () => {
    fetchMenuItemById.mockReturnValue(new Promise(() => {}))
    renderWithRouter(<ItemForm />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('exibe título Editar item', async () => {
    renderWithRouter(<ItemForm />)
    await waitFor(() => expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument())
    expect(screen.getByText('Editar item')).toBeInTheDocument()
  })

  it('pré-preenche nome', async () => {
    renderWithRouter(<ItemForm />)
    await waitFor(() => expect(screen.getByTestId('input-name')).toHaveValue('Coca-Cola'))
  })

  it('pré-preenche preço', async () => {
    renderWithRouter(<ItemForm />)
    await waitFor(() => expect(screen.getByTestId('input-price')).toHaveValue(8))
  })

  it('exibe foto existente', async () => {
    renderWithRouter(<ItemForm />)
    await waitFor(() => expect(screen.getByTestId('photo-preview')).toBeInTheDocument())
  })

  it('tags pré-selecionadas estão marcadas', async () => {
    renderWithRouter(<ItemForm />)
    await waitFor(() =>
      expect(screen.getByTestId('tag-btn-vegetarian').className).toContain('bg-accent')
    )
  })

  it('chama updateMenuItem ao salvar sem trocar foto', async () => {
    updateMenuItem.mockResolvedValue({ ...EXISTING_ITEM, name: 'Coca-Cola Zero' })
    renderWithRouter(<ItemForm />)
    await waitFor(() => screen.getByTestId('input-name'))

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Coca-Cola Zero' } })
    fireEvent.click(screen.getByTestId('btn-save'))

    await waitFor(() =>
      expect(updateMenuItem).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ name: 'Coca-Cola Zero' })
      )
    )
  })
})

/* ── Cancelar ── */

describe('ItemForm — cancelar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    mockState = { categoryId: 'cat1', categoryName: 'Bebidas' }
  })

  it('btn-cancel navega de volta para lista de itens', () => {
    renderWithRouter(<ItemForm />)
    fireEvent.click(screen.getByTestId('btn-cancel'))
    expect(mockNavigate).toHaveBeenCalledWith(
      '/owner/business/b1/menu/items',
      { state: { categoryId: 'cat1', categoryName: 'Bebidas' } }
    )
  })
})

/* ── Sem categoryId ── */

describe('ItemForm — sem categoryId no state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    mockState = null
  })

  it('redireciona para /menu se não há categoryId', async () => {
    renderWithRouter(<ItemForm />)
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/owner/business/b1/menu', { replace: true })
    )
  })
})
