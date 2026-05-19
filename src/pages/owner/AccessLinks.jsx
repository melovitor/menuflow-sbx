import { useParams, useLocation } from 'react-router-dom'
import { IconCash, IconToolsKitchen2, IconCopy, IconExternalLink, IconCheck, IconDeviceTv } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import { toast } from '../../components/ui/Toast'
import { fetchBusinessById } from '../../services/businessService'

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

function LinkCard({ icon: Icon, iconColor, iconBg, title, description, url }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Tente manualmente.')
    }
  }

  const handleOpen = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-section flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--text)] tracking-[-0.2px]">{title}</p>
          <p className="text-[12px] text-[var(--text-3)] mt-[1px]">{description}</p>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[8px] px-3 py-2 mb-3">
        <p className="text-[11px] text-[var(--text-3)] font-mono break-all select-all">{url}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={`flex-1 h-[38px] flex items-center justify-center gap-2 rounded-[10px] border text-[13px] font-medium transition-colors ${
            copied
              ? 'border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green-text)]'
              : 'border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-2)] hover:border-accent hover:text-accent'
          }`}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
        <button
          type="button"
          onClick={handleOpen}
          className="flex-1 h-[38px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconExternalLink size={14} />
          Abrir
        </button>
      </div>
    </div>
  )
}

export default function AccessLinks() {
  const { id } = useParams()
  const location = useLocation()
  const [slug, setSlug] = useState(location.state?.slug || null)

  useEffect(() => {
    if (!slug) {
      fetchBusinessById(id).then((b) => setSlug(b.slug)).catch(() => {})
    }
  }, [id, slug])

  const links = [
    {
      icon: IconCash,
      iconColor: '#7C3AED',
      iconBg: 'var(--accent-light)',
      title: 'PDV — Ponto de Venda',
      description: 'Login e acesso do garçom',
      url: `${APP_URL}/staff/login`,
    },
    {
      icon: IconToolsKitchen2,
      iconColor: '#10B981',
      iconBg: 'var(--green-bg)',
      title: 'KDS — Cozinha',
      description: 'Tela de pedidos da cozinha',
      url: `${APP_URL}/kds/${id}`,
    },
    ...(slug ? [{
      icon: IconDeviceTv,
      iconColor: '#F59E0B',
      iconBg: 'var(--amber-bg)',
      title: 'Display — TV do Balcão',
      description: 'Tela pública onde clientes acompanham o pedido',
      url: `${APP_URL}/display/${slug}`,
    }] : []),
  ]

  return (
    <OwnerLayout title="Acessos" showBack backTo={`/owner/business/${id}`}>
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-[12px] text-[var(--text-3)]">
          Copie ou abra os links abaixo nos dispositivos da operação.
        </p>
        {links.map((link) => (
          <LinkCard key={link.url} {...link} />
        ))}
      </div>
    </OwnerLayout>
  )
}
