// Casca das telas de autenticação — Noir Veludo.
// Mobile: header + form + footer LGPD.
// Desktop: split-screen — painel de marca (sempre escuro) à esquerda + form à direita.

import { useState } from 'react'
import {
  IconMoon, IconSun, IconBolt, IconShieldCheck, IconBrandWhatsapp,
} from '@tabler/icons-react'
import { toggleTheme } from '../../utils/theme'

function ThemeToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )
  const handleToggle = () => setIsDark(toggleTheme() === 'dark')

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      onClick={handleToggle}
      aria-label="Alternar tema"
      className={`w-9 h-9 rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)]
        flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)]
        transition-colors duration-150 ${className}`}
    >
      {isDark ? <IconMoon size={16} /> : <IconSun size={16} />}
    </button>
  )
}

function Wordmark({ size = 'text-[15px]' }) {
  return (
    <span className={`${size} font-semibold tracking-ui text-[var(--text)]`}>
      Menu<span className="text-accent">Flow</span>
    </span>
  )
}

function BrandMark({ px = 28 }) {
  return (
    <div
      className="rounded-[6px] flex items-center justify-center font-bold tracking-title shrink-0 glow-brass"
      style={{
        width: px, height: px, background: 'var(--accent)',
        color: 'var(--accent-contrast)', fontSize: px * 0.5,
      }}
    >
      M
    </div>
  )
}

function ChatBubble({ side, children }) {
  const out = side === 'out'
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[82%] px-3.5 py-2.5 text-[13.5px] leading-snug"
        style={{
          background: out ? '#D4A258' : '#1F1C15',
          color: out ? '#1A140C' : '#F3EDE0',
          fontWeight: out ? 500 : 400,
          border: out ? 'none' : '1px solid #28241D',
          borderRadius: 14,
          borderBottomRightRadius: out ? 4 : 14,
          borderBottomLeftRadius: out ? 14 : 4,
          boxShadow: out ? '0 4px 14px -6px rgba(212,162,88,0.5)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function FeatureTick({ icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
        style={{ background: '#1C1A14', border: '1px solid #28241D', color: '#E8C285' }}
      >
        {icon}
      </span>
      <span className="text-[12.5px]" style={{ color: '#A39A87' }}>{label}</span>
    </div>
  )
}

function BrandPanel() {
  return (
    <div
      className="relative hidden lg:flex flex-col overflow-hidden px-14 py-12"
      style={{ background: '#0E0D0B', borderRight: '1px solid #28241D', color: '#F3EDE0' }}
    >
      {/* glows ambiente */}
      <div className="pointer-events-none absolute -top-28 -right-24 w-[360px] h-[360px]"
        style={{ background: 'radial-gradient(circle, rgba(212,162,88,0.13) 0%, transparent 68%)' }} />
      <div className="pointer-events-none absolute -bottom-32 -left-28 w-[380px] h-[380px]"
        style={{ background: 'radial-gradient(circle, rgba(212,162,88,0.08) 0%, transparent 70%)' }} />

      {/* brand */}
      <div className="relative flex items-center gap-3">
        <BrandMark px={32} />
        <span className="text-[17px] font-semibold tracking-ui">
          Menu<span style={{ color: '#D4A258' }}>Flow</span>
        </span>
      </div>

      {/* hero */}
      <div className="relative my-auto py-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: '#2A2014', border: '1px solid rgba(212,162,88,0.27)' }}
        >
          <IconBolt size={13} style={{ color: '#D4A258' }} />
          <span className="font-mono-ui text-[10.5px] tracking-[0.1em]" style={{ color: '#E8C285' }}>
            EXCLUSIVO NO BRASIL
          </span>
        </div>

        <h2 className="text-[34px] font-semibold leading-[1.15] tracking-title max-w-[420px] m-0">
          Gerencie seu bar pelo WhatsApp, com inteligência artificial.
        </h2>
        <p className="text-[15px] leading-relaxed max-w-[400px] mt-4" style={{ color: '#A39A87' }}>
          Pergunte <span style={{ color: '#F3EDE0', fontStyle: 'italic' }}>"quanto faturei hoje?"</span>{' '}
          e receba a resposta em segundos. Controle profissional, sem a complexidade.
        </p>

        {/* chat mock */}
        <div className="mt-7 max-w-[380px] flex flex-col gap-2.5">
          <ChatBubble side="out">quanto faturei hoje?</ChatBubble>
          <ChatBubble side="in">
            R$ 2.840,00 hoje — 47 pedidos, ticket médio R$ 86. 12% acima de ontem. 📈
          </ChatBubble>
          <div className="flex items-center gap-2 mt-0.5 pl-1">
            <span className="mf-pulse inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: '#7DB97B', ['--pulse-c']: '#7DB97B' }} />
            <span className="font-mono-ui text-[10.5px] tracking-[0.06em]" style={{ color: '#6E665A' }}>
              BOT RESPONDENDO · 1.4s EM MÉDIA
            </span>
          </div>
        </div>
      </div>

      {/* features */}
      <div className="relative flex gap-6 flex-wrap">
        <FeatureTick icon={<IconBolt size={13} />} label="Tempo real" />
        <FeatureTick icon={<IconShieldCheck size={13} />} label="Conforme LGPD" />
        <FeatureTick icon={<IconBrandWhatsapp size={13} />} label="Bot 24/7" />
      </div>
    </div>
  )
}

export default function AuthShell({ children, footer = true }) {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-[var(--bg-secondary)]">
      <BrandPanel />

      {/* coluna do formulário */}
      <div className="relative flex flex-col bg-[var(--bg-secondary)]">
        {/* header mobile */}
        <header className="lg:hidden h-[52px] px-5 flex items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border)]">
          <Wordmark />
          <ThemeToggle />
        </header>

        {/* toggle de tema no desktop */}
        <div className="hidden lg:block absolute top-6 right-7 z-10">
          <ThemeToggle />
        </div>

        {/* form */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:px-14">
          <div className="w-full max-w-[380px]">
            {children}
          </div>
        </div>

        {/* footer LGPD */}
        {footer && (
          <footer className="px-6 lg:px-14 py-4 border-t border-[var(--border)] bg-[var(--bg-primary)] lg:bg-transparent
            flex items-center justify-center lg:justify-between gap-3">
            <span className="font-mono-ui text-[11px] tracking-[0.04em] text-[var(--text-3)] flex items-center gap-2">
              <IconShieldCheck size={13} /> Dados protegidos conforme a LGPD
            </span>
            <span className="hidden lg:inline font-mono-ui text-[11px] tracking-[0.04em] text-[var(--text-3)]">
              © 2026 MenuFlow
            </span>
          </footer>
        )}
      </div>
    </div>
  )
}

export { ThemeToggle, Wordmark, BrandMark }
