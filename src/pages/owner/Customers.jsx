import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { IconUsers, IconSearch, IconPhone, IconAddressBook } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/formatters'
import { formatPhone } from '../../utils/formatters'

function formatDate(iso) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}

function exportVCard(customers) {
  const vcf = customers.map((c) => {
    const phone = c.phone.replace(/\D/g, '')
    const nameParts = c.name.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.name}`,
      `N:${lastName};${firstName};;;`,
      `TEL;TYPE=CELL:+55${phone}`,
      'END:VCARD',
    ].join('\r\n')
  }).join('\r\n')

  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'clientes-menuflow.vcf'
  a.click()
  URL.revokeObjectURL(url)
}

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? '?'
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

export default function Customers() {
  const { id: businessId } = useParams()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch customers + aggregate order stats in one query
        const { data, error } = await supabase
          .from('customers')
          .select(`
            id, name, phone, created_at,
            orders!orders_customer_id_fkey(
              id, status, created_at,
              order_items(unit_price, quantity)
            )
          `)
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })

        if (error) throw error

        const enriched = (data || []).map((c) => {
          const closedOrders = (c.orders || []).filter((o) => o.status === 'closed')
          const totalSpent = closedOrders.reduce((sum, o) =>
            sum + (o.order_items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0), 0
          )
          const lastOrder = (c.orders || [])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

          return {
            ...c,
            orderCount: (c.orders || []).filter((o) => o.status !== 'cancelled').length,
            totalSpent,
            lastOrderAt: lastOrder?.created_at || null,
          }
        })

        setCustomers(enriched)
      } catch {
        // silently fail — non-critical screen
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId])

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(search)
  })

  return (
    <OwnerLayout
      title="Clientes"
      showBack
      backTo={`/owner/business/${businessId}`}
    >
      <div className="px-5 py-5 flex flex-col gap-4 pb-10">

        {/* Search + export */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full h-[40px] pl-9 pr-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] text-[var(--text)] outline-none focus:border-accent"
            />
          </div>
          {customers.length > 0 && (
            <button
              type="button"
              data-testid="btn-export-contacts"
              onClick={() => exportVCard(customers)}
              title="Exportar contatos para agenda"
              className="h-[40px] px-3 flex items-center justify-center rounded-input border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)] hover:border-accent hover:text-accent transition-colors flex-shrink-0"
            >
              <IconAddressBook size={17} />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && customers.length === 0 && (
          <div className="text-center py-14">
            <IconUsers size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
            <p className="text-[14px] font-medium text-[var(--text-2)]">Nenhum cliente ainda</p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">
              Os clientes aparecem aqui após o primeiro pedido via QR.
            </p>
          </div>
        )}

        {!loading && customers.length > 0 && filtered.length === 0 && (
          <p className="text-center text-[13px] text-[var(--text-3)] py-10">
            Nenhum cliente encontrado.
          </p>
        )}

        {/* Summary */}
        {!loading && customers.length > 0 && (
          <p className="text-[11px] text-[var(--text-3)]">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            {search ? ' encontrado' + (filtered.length !== 1 ? 's' : '') : ' no total'}
          </p>
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                data-testid={`customer-card-${c.id}`}
                className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card px-4 py-3 flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[13px] font-medium text-accent">
                    {getInitials(c.name)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text)] truncate">{c.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <IconPhone size={11} className="text-[var(--text-3)] flex-shrink-0" />
                    <p className="text-[12px] text-[var(--text-3)]">{formatPhone(c.phone)}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-[11px] text-[var(--text-3)]">
                      {c.orderCount} pedido{c.orderCount !== 1 ? 's' : ''}
                    </p>
                    {c.totalSpent > 0 && (
                      <p className="text-[11px] text-[var(--text-3)]">
                        {formatCurrency(c.totalSpent)} gastos
                      </p>
                    )}
                    {c.lastOrderAt && (
                      <p className="text-[11px] text-[var(--text-3)]">
                        Último: {formatDate(c.lastOrderAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
