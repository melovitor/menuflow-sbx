import { useRef, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IconArrowLeft, IconMoon, IconSun, IconLogout, IconUser,
  IconBell, IconSearch,
} from '@tabler/icons-react'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toggleTheme } from '../../utils/theme'

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0)
  if (!words.length) return ''
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? ''
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

const NAV_LINKS = [
  { label: 'Negócios',   path: '/owner/home', matchPrefix: '/owner' },
  { label: 'Clientes',   path: null },
  { label: 'Estoque',    path: null },
  { label: 'Relatórios', path: null },
]

function AvatarMenu({ userName, initials, avatarUrl, onProfile, onSignOut, onToggleTheme, isDark }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="avatar-btn"
        onClick={() => setOpen((v) => !v)}
        className="w-[32px] h-[32px] rounded-full bg-accent flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 hover:opacity-90 transition-opacity overflow-hidden"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          : initials}
      </button>

      {open && (
        <div
          data-testid="avatar-dropdown"
          className="absolute right-0 top-[38px] w-[220px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-section shadow-lg z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-[13px] font-medium text-[var(--text)] truncate">{userName}</p>
          </div>
          <button
            type="button"
            data-testid="btn-profile"
            onClick={() => { setOpen(false); onProfile() }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--text-2)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <IconUser size={15} />
            Meu perfil
          </button>
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={() => { onToggleTheme(); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--text-2)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
            {isDark ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button
            type="button"
            data-testid="btn-signout"
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-500 hover:bg-[var(--bg-secondary)] transition-colors border-t border-[var(--border)]"
          >
            <IconLogout size={15} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

export default function OwnerLayout({ title, showBack = false, backTo, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )

  const userName = user?.user_metadata?.name || user?.email || ''
  const initials  = getInitials(userName) || '?'
  const avatarUrl = user?.user_metadata?.avatar_url || null

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleBack    = () => (backTo ? navigate(backTo) : navigate(-1))
  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/login') }
  const handleProfile = () => navigate('/owner/profile')

  const avatarProps = {
    userName, initials, avatarUrl,
    onProfile: handleProfile,
    onSignOut: handleSignOut,
    onToggleTheme: handleToggleTheme,
    isDark,
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-secondary)] flex flex-col">
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >

        {/* ── Mobile header (< lg) ── */}
        <div className="flex lg:hidden h-[52px] px-4 items-center gap-3">

          {showBack ? (
            /* Inner page: back + title */
            <>
              <button
                type="button"
                data-testid="btn-back"
                onClick={handleBack}
                className="w-[32px] h-[32px] flex-shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
              >
                <IconArrowLeft size={15} />
              </button>
              <span className="flex-1 text-[15px] font-medium text-[var(--text)] tracking-[-0.2px] truncate">
                {title}
              </span>
            </>
          ) : (
            /* Home: logo mark + wordmark */
            <>
              <div
                className="w-[28px] h-[28px] rounded-[7px] flex-shrink-0 flex items-center justify-center"
                style={{ background: 'var(--accent)', boxShadow: '0 0 12px -4px var(--glow-2)' }}
              >
                <span className="text-[13px] font-bold" style={{ color: 'var(--accent-contrast)', letterSpacing: '-0.5px' }}>M</span>
              </div>
              <span className="text-[15px] font-semibold text-[var(--text)] tracking-[-0.3px]">
                Menu<span className="text-accent">Flow</span>
              </span>
              <div className="flex-1" />
            </>
          )}

          {/* Right controls */}
          {!showBack && (
            <>
              <button
                type="button"
                className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)]"
              >
                <IconSearch size={15} />
              </button>
              <button
                type="button"
                data-testid="btn-notifications"
                className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)]"
              >
                <IconBell size={15} />
              </button>
            </>
          )}
          <AvatarMenu {...avatarProps} />
        </div>

        {/* ── Desktop header (lg+) ── */}
        <div className="hidden lg:flex h-[52px] px-8 items-center gap-5">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate('/owner/home')}
            className="flex-shrink-0 text-[15px] font-semibold text-[var(--text)] tracking-[-0.3px] hover:opacity-80 transition-opacity"
          >
            Menu<span className="text-accent">Flow</span>
          </button>

          {/* Nav links */}
          <nav className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, path, matchPrefix }) => {
              const active = path && matchPrefix && location.pathname.startsWith(matchPrefix)
              return path ? (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(path)}
                  className={`px-3 py-1.5 rounded-input text-[13px] font-medium transition-colors duration-150
                    ${active
                      ? 'text-[var(--text)] bg-[var(--bg-tertiary)]'
                      : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)]'}`}
                >
                  {label}
                </button>
              ) : (
                <span key={label} className="px-3 py-1.5 text-[13px] text-[var(--text-3)] opacity-35 cursor-not-allowed select-none">
                  {label}
                </span>
              )
            })}
          </nav>

          <div className="flex-1" />

          {/* Breadcrumb on sub-pages */}
          {showBack && title && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                data-testid="btn-back"
                onClick={handleBack}
                className="w-[28px] h-[28px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
              >
                <IconArrowLeft size={13} />
              </button>
              <span className="text-[13px] font-medium text-[var(--text-2)] truncate max-w-[220px]">{title}</span>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              data-testid="btn-notifications"
              className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
            >
              <IconBell size={15} />
            </button>
            <button
              type="button"
              data-testid="theme-toggle-desktop"
              onClick={handleToggleTheme}
              className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
            >
              {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
            </button>
            <AvatarMenu {...avatarProps} />
          </div>
        </div>

      </header>

      <main
        className="flex-1 flex flex-col"
        style={{ paddingTop: 'calc(3.25rem + env(safe-area-inset-top))' }}
      >
        {children}
      </main>
    </div>
  )
}
