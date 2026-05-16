import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconMoon, IconSun, IconLogout, IconUser } from '@tabler/icons-react'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toggleTheme } from '../../utils/theme'

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0)
  if (!words.length) return ''
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? ''
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

export default function OwnerLayout({ title, showBack = false, backTo, children }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('theme') || 'dark') === 'dark'
  )
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef(null)

  const userName = user?.user_metadata?.name || user?.email || ''
  const initials = getInitials(userName) || '?'
  const avatarUrl = user?.user_metadata?.avatar_url || null

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleBack = () => backTo ? navigate(backTo) : navigate(-1)

  const handleSignOut = async () => {
    setAvatarOpen(false)
    await supabase.auth.signOut()
    navigate('/login')
  }


  // Close dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return
    const handler = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarOpen])

  return (
    <div className="min-h-dvh bg-[var(--bg-secondary)] flex flex-col">
      {/* Header — fixed, absorbs status bar safe area on PWA */}
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-[52px] px-5 flex items-center">

        {/* Left — back button + title OR empty space */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              type="button"
              data-testid="btn-back"
              onClick={handleBack}
              className="w-[32px] h-[32px] flex-shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors duration-150"
            >
              <IconArrowLeft size={15} />
            </button>
          )}
          {title && (
            <span className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px] truncate">
              {title}
            </span>
          )}
        </div>

        {/* Center — logo */}
        <div className="flex-shrink-0">
          <span className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
            Menu<span className="text-accent">Flow</span>
          </span>
        </div>

        {/* Right — theme toggle + avatar */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={handleToggleTheme}
            className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors duration-150"
          >
            {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
          </button>

          {/* Avatar */}
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              data-testid="avatar-btn"
              onClick={() => setAvatarOpen((v) => !v)}
              className="w-[32px] h-[32px] rounded-full bg-accent flex items-center justify-center text-white text-[11px] font-medium flex-shrink-0 hover:opacity-90 transition-opacity overflow-hidden"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : initials
              }
            </button>

            {/* Dropdown */}
            {avatarOpen && (
              <div
                data-testid="avatar-dropdown"
                className="absolute right-0 top-[38px] w-[220px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-section shadow-lg z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="text-[13px] font-medium text-[var(--text)] truncate">{userName}</p>
                  {user?.email && userName !== user.email && (
                    <p className="text-[11px] text-[var(--text-3)] truncate mt-[2px]">{user.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  data-testid="btn-profile"
                  onClick={() => { setAvatarOpen(false); navigate('/owner/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--text-2)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <IconUser size={15} />
                  Meu perfil
                </button>
                <button
                  type="button"
                  data-testid="btn-signout"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-500 hover:bg-[var(--bg-secondary)] transition-colors border-t border-[var(--border)]"
                >
                  <IconLogout size={15} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>

        </div>
      </header>

      {/* Page content — offset below fixed header + safe area */}
      <main
        className="flex-1 flex flex-col"
        style={{ paddingTop: 'calc(3.25rem + env(safe-area-inset-top))' }}
      >
        {children}
      </main>
    </div>
  )
}
