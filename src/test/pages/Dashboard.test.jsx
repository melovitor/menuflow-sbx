import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dashboard from '../../pages/owner/Dashboard'

let mockParams = { id: 'b1' }
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}))

vi.mock('../../services/businessService', () => ({
  fetchBusinessById: vi.fn(),
  fetchBusinessMetrics: vi.fn(),
}))

vi.mock('../../services/orderService', () => ({
  fetchActiveOrders: vi.fn(),
}))

vi.mock('../../services/inventoryService', () => ({
  fetchAlertIngredientsCount: vi.fn().mockResolvedValue(0),
}))

vi.mock('../../services/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
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

import { fetchBusinessById, fetchBusinessMetrics } from '../../services/businessService'
import { fetchActiveOrders } from '../../services/orderService'
import { toast } from '../../components/ui/Toast'

const mockBusiness = { id: 'b1', name: 'Bar Teste', slug: 'bar-teste' }

const mockMetrics = {
  activeOrders: 3,
  occupiedTables: 2,
  revenue: 150.5,
  counterQueue: 1,
}

const mockOrders = [
  {
    id: 'o1',
    order_number: '0905-0001',
    source: 'table',
    status: 'pending',
    customer_name: null,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    tables: { number: 3 },
  },
  {
    id: 'o2',
    order_number: '0905-0002',
    source: 'counter',
    status: 'preparing',
    customer_name: 'Joao Silva',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    tables: null,
  },
  {
    id: 'o3',
    order_number: '0905-0003',
    source: 'staff',
    status: 'ready',
    customer_name: null,
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
    tables: { number: 1 },
  },
]

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'b1' }
    fetchBusinessById.mockResolvedValue(mockBusiness)
    fetchBusinessMetrics.mockResolvedValue(mockMetrics)
    fetchActiveOrders.mockResolvedValue(mockOrders)
  })

  it('shows loading spinner initially', () => {
    fetchBusinessById.mockReturnValue(new Promise(() => {}))
    render(<Dashboard />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByTestId('spinner-lg')).toBeInTheDocument()
  })

  it('renders all 4 metric cards after loading', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('metric-revenue')).toBeInTheDocument())
    expect(screen.getByTestId('metric-active-orders')).toBeInTheDocument()
    expect(screen.getByTestId('metric-occupied-tables')).toBeInTheDocument()
    expect(screen.getByTestId('metric-counter-queue')).toBeInTheDocument()
  })

  it('displays active orders count', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('metric-active-orders-value')).toBeInTheDocument())
    expect(screen.getByTestId('metric-active-orders-value')).toHaveTextContent('3')
  })

  it('displays occupied tables count', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('metric-occupied-tables-value')).toBeInTheDocument())
    expect(screen.getByTestId('metric-occupied-tables-value')).toHaveTextContent('2')
  })

  it('displays counter queue count', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('metric-counter-queue-value')).toBeInTheDocument())
    expect(screen.getByTestId('metric-counter-queue-value')).toHaveTextContent('1')
  })

  it('displays formatted revenue', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('metric-revenue-value')).toBeInTheDocument())
    expect(screen.getByTestId('metric-revenue-value')).toHaveTextContent(/150/)
  })

  it('shows empty orders state when no active orders', async () => {
    fetchActiveOrders.mockResolvedValue([])
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('empty-orders')).toBeInTheDocument())
    expect(screen.getByText('Nenhum pedido ativo')).toBeInTheDocument()
  })

  it('does not show empty state when orders exist', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('orders-list')).toBeInTheDocument())
    expect(screen.queryByTestId('empty-orders')).not.toBeInTheDocument()
  })

  it('renders a row for each active order', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('orders-list')).toBeInTheDocument())
    expect(screen.getByTestId('order-row-o1')).toBeInTheDocument()
    expect(screen.getByTestId('order-row-o2')).toBeInTheDocument()
    expect(screen.getByTestId('order-row-o3')).toBeInTheDocument()
  })

  it('shows order numbers', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('orders-list')).toBeInTheDocument())
    expect(screen.getByText('#0905-0001')).toBeInTheDocument()
    expect(screen.getByText('#0905-0002')).toBeInTheDocument()
  })

  it('shows table number for table orders', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('orders-list')).toBeInTheDocument())
    expect(screen.getByTestId('order-row-o1')).toHaveTextContent('Mesa 3')
  })

  it('shows source label for counter orders', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('orders-list')).toBeInTheDocument())
    expect(screen.getByTestId('order-row-o2')).toHaveTextContent('Balcao')
  })

  it('shows customer name for counter orders', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('orders-list')).toBeInTheDocument())
    expect(screen.getByTestId('order-row-o2')).toHaveTextContent('Joao Silva')
  })

  it('shows correct status badges', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByTestId('orders-list')).toBeInTheDocument())
    expect(screen.getByTestId('order-status-o1')).toHaveTextContent('Aguardando')
    expect(screen.getByTestId('order-status-o2')).toHaveTextContent('Em preparo')
    expect(screen.getByTestId('order-status-o3')).toHaveTextContent('Pronto')
  })

  it('shows error toast when fetch fails', async () => {
    fetchBusinessById.mockRejectedValue(new Error('DB error'))
    render(<Dashboard />)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao carregar dashboard.'))
  })

  it('does not show loading after data loads', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument())
  })
})
