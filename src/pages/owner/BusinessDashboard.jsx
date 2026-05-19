import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconToolsKitchen2,
  IconArmchair,
  IconSettings,
  IconReceipt,
  IconLink,
  IconPackage,
  IconUsers,
} from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Toggle from '../../components/ui/Toggle'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { fetchBusinessById, updateBusinessOpenStatus } from '../../services/businessService'
import { toast } from '../../components/ui/Toast'

const CATEGORY_LABELS = {
  bar: 'Bar',
  restaurant: 'Restaurante',
  snack_bar: 'Lanchonete',
  cafeteria: 'Cafeteria',
  other: 'Outro',
}

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Vendas e pedidos',
    icon: IconLayoutDashboard,
    iconColor: '#7C3AED',
    iconBg: 'var(--accent-light)',
    testId: 'nav-dashboard',
  },
  {
    key: 'menu',
    label: 'Cardápio',
    description: 'Categorias e itens',
    icon: IconToolsKitchen2,
    iconColor: '#10B981',
    iconBg: 'var(--green-bg)',
    testId: 'nav-menu',
  },
  {
    key: 'tables',
    label: 'Mesas e QR',
    description: 'QR Codes e status',
    icon: IconArmchair,
    iconColor: '#F59E0B',
    iconBg: 'var(--amber-bg)',
    testId: 'nav-tables',
  },
  {
    key: 'settings',
    label: 'Configurações',
    description: 'Dados e preferências',
    icon: IconSettings,
    iconColor: 'var(--text-2)',
    iconBg: 'var(--bg-tertiary)',
    testId: 'nav-settings',
  },
  {
    key: 'orders',
    label: 'Pedidos',
    description: 'Histórico do dia',
    icon: IconReceipt,
    iconColor: '#EF4444',
    iconBg: 'var(--red-bg)',
    testId: 'nav-orders',
  },
  {
    key: 'access',
    label: 'Acessos',
    description: 'Links PDV e KDS',
    icon: IconLink,
    iconColor: '#0EA5E9',
    iconBg: '#EFF6FF',
    iconBgDark: '#0C1A2E',
    testId: 'nav-access',
  },
  {
    key: 'stock/ingredients',
    label: 'Estoque',
    description: 'Insumos e compras',
    icon: IconPackage,
    iconColor: '#7C3AED',
    iconBg: 'var(--accent-light)',
    testId: 'nav-stock',
  },
  {
    key: 'customers',
    label: 'Clientes',
    description: 'Histórico de clientes',
    icon: IconUsers,
    iconColor: '#0EA5E9',
    iconBg: 'var(--border)',
    testId: 'nav-customers',
  },
]

export default function BusinessDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchBusinessById(id)
      .then(setBusiness)
      .catch(() => navigate('/owner/home', { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleToggleOpen = async () => {
    if (!business || togglingOpen) return
    const next = !business.is_open
    setTogglingOpen(true)
    setBusiness((b) => ({ ...b, is_open: next }))
    try {
      await updateBusinessOpenStatus(id, next)
      toast.success(next ? 'Estabelecimento aberto' : 'Estabelecimento fechado')
    } catch {
      setBusiness((b) => ({ ...b, is_open: !next }))
      toast.error('Falha ao atualizar status. Tente novamente.')
    } finally {
      setTogglingOpen(false)
    }
  }

  const handleNav = (key) => {
    navigate(`/owner/business/${id}/${key}`)
  }

  if (loading) {
    return (
      <OwnerLayout>
        <div data-testid="loading-state" className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    )
  }

  if (!business) return null

  const categoryLabel = CATEGORY_LABELS[business.category] ?? business.category
  const locationParts = [business.address_city, business.address_state].filter(Boolean)

  return (
    <OwnerLayout title={business.name} showBack backTo="/owner/home">
      <div className="px-5 py-5 flex flex-col gap-5">

        {/* Business info strip */}
        <div
          data-testid="business-info"
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-[14px]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px] truncate">
                {business.name}
              </p>
              <p className="text-[12px] text-[var(--text-3)] mt-[2px]">
                {categoryLabel}
                {locationParts.length > 0 && (
                  <> · {locationParts.join(', ')}</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge
                variant={business.is_open ? 'open' : 'closed'}
                data-testid="badge-status"
              >
                {business.is_open ? 'Aberto' : 'Fechado'}
              </Badge>
              <div data-testid="toggle-open">
                <Toggle
                  checked={business.is_open}
                  onChange={handleToggleOpen}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation grid */}
        <div
          data-testid="nav-grid"
          className="grid grid-cols-2 gap-3"
        >
          {NAV_ITEMS.map(({ key, label, description, icon: Icon, iconColor, iconBg, iconBgDark, testId }) => (
            <button
              key={key}
              type="button"
              data-testid={testId}
              onClick={() => handleNav(key)}
              className="flex flex-col items-center justify-center gap-3 p-5
                bg-[var(--bg-primary)] border border-[var(--border)] rounded-card
                hover:border-[var(--border-strong)] active:scale-[0.98]
                transition-all duration-150 min-h-[148px]"
            >
              {/* Icon container */}
              <div
                className="w-12 h-12 rounded-section flex items-center justify-center flex-shrink-0"
                style={{ background: (isDark && iconBgDark) ? iconBgDark : iconBg }}
              >
                <Icon size={24} style={{ color: iconColor }} />
              </div>

              {/* Label */}
              <div className="text-center">
                <p className="text-[14px] font-medium text-[var(--text)] tracking-[-0.2px]">
                  {label}
                </p>
                <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                  {description}
                </p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </OwnerLayout>
  )
}
