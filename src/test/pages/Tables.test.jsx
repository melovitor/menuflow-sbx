import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Tables from '../../pages/owner/Tables'

let mockParams = { id: 'b1' }
vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
}))

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ 'data-testid': testId, value }) => (
    <div data-testid={testId} data-value={value} />
  ),
}))

vi.mock('../../services/businessService', () => ({
  fetchBusinessById: vi.fn(),
  fetchTables: vi.fn(),
  createTable: vi.fn(),
}))

vi.mock('../../components/ui/Toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('../../components/layout/OwnerLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../components/ui/Spinner', () => ({
  default: ({ size }) => <div data-testid={`spinner-${size || 'md'}`} />,
}))

import { fetchBusinessById, fetchTables, createTable } from '../../services/businessService'
import { toast } from '../../components/ui/Toast'

const mockBusiness = { id: 'b1', name: 'Bar Teste', slug: 'bar-teste' }

const mockTables = [
  { id: 't1', number: 1, status: 'free', qr_code_url: 'http://localhost:5173/order/bar-teste/table/1' },
  { id: 't2', number: 2, status: 'occupied', qr_code_url: 'http://localhost:5173/order/bar-teste/table/2' },
  { id: 't3', number: 3, status: 'waiting_payment', qr_code_url: null },
]

describe('Tables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    fetchBusinessById.mockResolvedValue(mockBusiness)
    fetchTables.mockResolvedValue(mockTables)
    window.open = vi.fn().mockReturnValue(null)
  })

  it('shows loading spinner initially', () => {
    fetchBusinessById.mockReturnValue(new Promise(() => {}))
    fetchTables.mockReturnValue(new Promise(() => {}))
    render(<Tables />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByTestId('spinner-lg')).toBeInTheDocument()
  })

  it('renders counter QR section after loading', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('counter-qr-card')).toBeInTheDocument())
    expect(screen.getByText('QR do Balcão')).toBeInTheDocument()
    expect(screen.getByTestId('counter-qr-canvas')).toBeInTheDocument()
  })

  it('counter QR canvas has correct URL', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('counter-qr-canvas')).toBeInTheDocument())
    expect(screen.getByTestId('counter-qr-canvas')).toHaveAttribute(
      'data-value',
      'http://localhost:5173/order/bar-teste/counter'
    )
  })

  it('shows print counter button', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('btn-print-counter')).toBeInTheDocument())
  })

  it('shows empty state when no tables', async () => {
    fetchTables.mockResolvedValue([])
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.getByText('Nenhuma mesa cadastrada')).toBeInTheDocument()
  })

  it('does not show empty state when tables exist', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('table-list')).toBeInTheDocument())
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  it('renders a card for each table', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('table-list')).toBeInTheDocument())
    expect(screen.getByTestId('table-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('table-card-2')).toBeInTheDocument()
    expect(screen.getByTestId('table-card-3')).toBeInTheDocument()
  })

  it('shows correct status badges', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('table-list')).toBeInTheDocument())
    expect(screen.getByTestId('table-status-1')).toHaveTextContent('Livre')
    expect(screen.getByTestId('table-status-2')).toHaveTextContent('Ocupada')
    expect(screen.getByTestId('table-status-3')).toHaveTextContent('Aguardando')
  })

  it('renders QR canvas for each table', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('table-list')).toBeInTheDocument())
    expect(screen.getByTestId('qr-canvas-1')).toBeInTheDocument()
    expect(screen.getByTestId('qr-canvas-2')).toBeInTheDocument()
    expect(screen.getByTestId('qr-canvas-3')).toBeInTheDocument()
  })

  it('uses qr_code_url when available', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('table-list')).toBeInTheDocument())
    expect(screen.getByTestId('qr-canvas-1')).toHaveAttribute(
      'data-value',
      'http://localhost:5173/order/bar-teste/table/1'
    )
  })

  it('falls back to generated URL when qr_code_url is null', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('table-list')).toBeInTheDocument())
    expect(screen.getByTestId('qr-canvas-3')).toHaveAttribute(
      'data-value',
      'http://localhost:5173/order/bar-teste/table/3'
    )
  })

  it('shows print button for each table', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('table-list')).toBeInTheDocument())
    expect(screen.getByTestId('btn-print-1')).toBeInTheDocument()
    expect(screen.getByTestId('btn-print-2')).toBeInTheDocument()
    expect(screen.getByTestId('btn-print-3')).toBeInTheDocument()
  })

  it('shows print all button when tables exist', async () => {
    render(<Tables />)
    await waitFor(() => expect(screen.getByTestId('btn-print-all')).toBeInTheDocument())
  })

  it('opens add modal when "Nova mesa" is clicked', async () => {
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    expect(screen.getByTestId('add-modal')).toBeInTheDocument()
  })

  it('closes modal when cancel is clicked', async () => {
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-cancel-add'))
    expect(screen.queryByTestId('add-modal')).not.toBeInTheDocument()
  })

  it('closes modal when X button is clicked', async () => {
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-close-modal'))
    expect(screen.queryByTestId('add-modal')).not.toBeInTheDocument()
  })

  it('shows next table number hint in modal', async () => {
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    expect(screen.getByText(/Mesa 4/)).toBeInTheDocument()
  })

  it('calls createTable with correct number and QR URL', async () => {
    createTable.mockResolvedValue({ id: 'tnew', number: 4, status: 'free', qr_code_url: null })
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-confirm-add'))
    await waitFor(() =>
      expect(createTable).toHaveBeenCalledWith(
        'b1',
        4,
        'http://localhost:5173/order/bar-teste/table/4'
      )
    )
  })

  it('adds new table to the grid after creation', async () => {
    createTable.mockResolvedValue({ id: 'tnew', number: 4, status: 'free', qr_code_url: null })
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-confirm-add'))
    await waitFor(() => expect(screen.getByTestId('table-card-4')).toBeInTheDocument())
  })

  it('closes modal after successful creation', async () => {
    createTable.mockResolvedValue({ id: 'tnew', number: 4, status: 'free', qr_code_url: null })
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-confirm-add'))
    await waitFor(() => expect(screen.queryByTestId('add-modal')).not.toBeInTheDocument())
  })

  it('shows error toast when createTable fails', async () => {
    createTable.mockRejectedValue(new Error('DB error'))
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-confirm-add'))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro ao criar mesas. Tente novamente.')
    )
  })

  it('next number hint shows 1 when no tables exist', async () => {
    fetchTables.mockResolvedValue([])
    render(<Tables />)
    await waitFor(() => screen.getByTestId('btn-add-table'))
    fireEvent.click(screen.getByTestId('btn-add-table'))
    expect(screen.getByText(/Mesa 1/)).toBeInTheDocument()
  })
})
