import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPhoto, IconLogout, IconDownload, IconAlertTriangle } from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { toast } from '../../components/ui/Toast'
import { useAuthStore } from '../../stores/authStore'
import {
  fetchUserProfile,
  updateUserProfile,
  updateUserAvatar,
  updateEmail,
  updatePassword,
  anonymizeAccount,
  exportUserData,
} from '../../services/authService'
import { uploadUserAvatar } from '../../services/storageService'
import { compressImage } from '../../utils/imageCompressor'
import { supabase } from '../../services/supabase'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const inputCls = (err) =>
  `w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-primary)] outline-none transition-colors border ${
    err ? 'border-red-500' : 'border-[var(--border-strong)]'
  } focus:border-accent`

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0)
  if (!words.length) return '?'
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? '?'
  return (words[0][0]?.toUpperCase() ?? '') + (words[words.length - 1][0]?.toUpperCase() ?? '')
}

export default function OwnerProfile() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})

  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarRef = useRef(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteEmailInput, setDeleteEmailInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    fetchUserProfile(user.id)
      .then((profile) => {
        setName(profile.name || '')
        setPhone(profile.phone || '')
        setAvatarUrl(profile.avatar_url || null)
      })
      .catch(() => toast.error('Erro ao carregar perfil.'))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WEBP.')
      return
    }
    try {
      const compressed = await compressImage(file, 400)
      setAvatarFile(compressed)
      setAvatarPreview(URL.createObjectURL(compressed))
    } catch {
      toast.error('Erro ao processar imagem.')
    }
    e.target.value = ''
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    if (!user?.id) return
    setSavingProfile(true)
    try {
      if (avatarFile) {
        const url = await uploadUserAvatar(user.id, avatarFile)
        await updateUserAvatar(user.id, url)
        setAvatarUrl(url)
        setAvatarFile(null)
        setAvatarPreview(null)
      }
      await updateUserProfile(user.id, { name: name.trim(), phone: phone.trim() || null })
      toast.success('Dados atualizados')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim()
    if (!trimmed) { toast.error('Informe o novo e-mail.'); return }
    if (trimmed === user?.email) { toast.error('O novo e-mail é igual ao atual.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { toast.error('E-mail inválido.'); return }
    setSavingEmail(true)
    try {
      await updateEmail(trimmed)
      setEmailSent(true)
      setNewEmail('')
    } catch {
      toast.error('Erro ao solicitar troca de e-mail. Tente novamente.')
    } finally {
      setSavingEmail(false)
    }
  }

  const handleChangePassword = async () => {
    const e = {}
    if (!currentPassword) e.currentPassword = 'Informe a senha atual'
    if (!newPassword) e.newPassword = 'Informe a nova senha'
    else if (newPassword.length < 6) e.newPassword = 'Mínimo 6 caracteres'
    if (!confirmPassword) e.confirmPassword = 'Confirme a nova senha'
    else if (newPassword && confirmPassword !== newPassword) e.confirmPassword = 'As senhas não coincidem'
    if (Object.keys(e).length) { setPasswordErrors(e); return }
    setPasswordErrors({})
    setSavingPassword(true)
    try {
      await updatePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Senha alterada com sucesso')
    } catch (err) {
      if (err?.message === 'Senha atual incorreta') {
        setPasswordErrors({ currentPassword: 'Senha atual incorreta' })
      } else {
        toast.error('Erro ao alterar senha. Tente novamente.')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSignOut = async () => {
    localStorage.removeItem('owner_session')
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleExport = async () => {
    if (!user?.id) return
    setExporting(true)
    try {
      await exportUserData(user.id, user.email)
      toast.success('Arquivo baixado com sucesso.')
    } catch {
      toast.error('Erro ao exportar dados. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteEmailInput.trim().toLowerCase() !== user?.email?.toLowerCase()) {
      toast.error('E-mail não confere. Digite exatamente o e-mail da sua conta.')
      return
    }
    setDeleting(true)
    try {
      await anonymizeAccount(user.id)
      navigate('/login', { replace: true })
    } catch {
      toast.error('Erro ao processar solicitação. Tente novamente.')
      setDeleting(false)
    }
  }

  const displayAvatar = avatarPreview || avatarUrl
  const initials = getInitials(name || user?.user_metadata?.name || user?.email || '')

  if (loading) {
    return (
      <OwnerLayout title="Meu perfil" showBack backTo="/owner/home">
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    )
  }

  return (
    <OwnerLayout title="Meu perfil" showBack backTo="/owner/home">
      <div className="px-5 py-5 flex flex-col gap-5 pb-10">

        {/* Photo */}
        <section className="flex flex-col items-center gap-3 pt-2">
          <div
            className="w-[88px] h-[88px] rounded-full bg-accent flex items-center justify-center text-white text-[28px] font-medium overflow-hidden cursor-pointer relative"
            onClick={() => avatarRef.current?.click()}
            data-testid="avatar-preview"
          >
            {displayAvatar
              ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
              : initials
            }
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
              <IconPhoto size={20} color="white" />
            </div>
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
            data-testid="input-avatar"
          />
          {avatarFile && (
            <p className="text-[11px] text-[var(--text-3)]">Foto selecionada · salve abaixo</p>
          )}
        </section>

        {/* Plan badge */}
        <div className="flex justify-center">
          <span
            data-testid="plan-badge"
            className="text-[11px] font-medium px-3 py-1 rounded-pill bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)] border-opacity-20"
          >
            Plano Starter
          </span>
        </div>

        {/* Personal data */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Dados pessoais
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Nome completo
              </label>
              <input
                data-testid="input-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className={inputCls(false)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                E-mail
              </label>
              <input
                data-testid="input-email"
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text-3)] bg-[var(--bg-tertiary)] outline-none border border-[var(--border)] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Telefone
              </label>
              <input
                data-testid="input-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className={inputCls(false)}
              />
            </div>
            <button
              type="button"
              data-testid="btn-save-profile"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] bg-accent text-white text-[14px] font-medium disabled:opacity-60 transition-opacity"
            >
              {savingProfile
                ? <Spinner size="sm" className="border-white/30 border-t-white" />
                : 'Salvar alterações'}
            </button>
          </div>
        </section>

        {/* Change email */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Alterar e-mail
          </p>
          {emailSent ? (
            <div className="bg-[var(--green-bg)] border border-[var(--green-border)] rounded-[12px] px-4 py-3">
              <p className="text-[13px] font-medium text-[var(--green-text)]">Confirmação enviada</p>
              <p className="text-[12px] text-[var(--green-text)] mt-[2px] opacity-80">
                Acesse o link enviado para o novo e-mail para confirmar a troca.
              </p>
              <button
                type="button"
                onClick={() => setEmailSent(false)}
                className="text-[11px] text-[var(--green-text)] underline mt-2"
              >
                Alterar novamente
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  E-mail atual
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text-3)] bg-[var(--bg-tertiary)] outline-none border border-[var(--border)] cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Novo e-mail
                </label>
                <input
                  data-testid="input-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo@email.com"
                  className={inputCls(false)}
                />
              </div>
              <button
                type="button"
                data-testid="btn-change-email"
                onClick={handleChangeEmail}
                disabled={savingEmail}
                className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[14px] font-medium text-[var(--text-2)] disabled:opacity-60 transition-opacity"
              >
                {savingEmail
                  ? <Spinner size="sm" />
                  : 'Alterar e-mail'}
              </button>
            </div>
          )}
        </section>

        {/* Change password */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Alterar senha
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Senha atual
              </label>
              <input
                data-testid="input-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors((p) => ({ ...p, currentPassword: undefined })) }}
                placeholder="••••••"
                className={inputCls(passwordErrors.currentPassword)}
              />
              {passwordErrors.currentPassword && (
                <p className="text-[11px] text-red-500 mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Nova senha
              </label>
              <input
                data-testid="input-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors((p) => ({ ...p, newPassword: undefined })) }}
                placeholder="••••••"
                className={inputCls(passwordErrors.newPassword)}
              />
              {passwordErrors.newPassword && (
                <p className="text-[11px] text-red-500 mt-1">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                Confirmar nova senha
              </label>
              <input
                data-testid="input-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors((p) => ({ ...p, confirmPassword: undefined })) }}
                placeholder="••••••"
                className={inputCls(passwordErrors.confirmPassword)}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
              )}
            </div>
            <button
              type="button"
              data-testid="btn-change-password"
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[14px] font-medium text-[var(--text-2)] disabled:opacity-60 transition-opacity"
            >
              {savingPassword
                ? <Spinner size="sm" />
                : 'Alterar senha'}
            </button>
          </div>
        </section>

        {/* Data export — ITEM 5 */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Meus dados
          </p>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 flex flex-col gap-3">
            <div>
              <p className="text-[13px] font-medium text-[var(--text)]">Portabilidade de dados</p>
              <p className="text-[11px] text-[var(--text-3)] mt-[3px]">
                Baixe um arquivo JSON com seu perfil, estabelecimentos e pedidos dos últimos 90 dias.
              </p>
            </div>
            <button
              type="button"
              data-testid="btn-export-data"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 h-[38px] rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13px] font-medium text-[var(--text-2)] disabled:opacity-60 w-fit transition-opacity"
            >
              {exporting
                ? <Spinner size="sm" />
                : <><IconDownload size={15} />Exportar meus dados</>}
            </button>
          </div>
        </section>

        {/* Account deletion — ITEM 4 */}
        <section>
          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
            Encerramento de conta
          </p>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 flex flex-col gap-3">
            <p className="text-[12px] text-[var(--text-2)]">
              Ao solicitar exclusão, seus dados serão anonimizados em até 30 dias. Pedidos e histórico
              financeiro são mantidos por obrigação legal (90 dias).
            </p>
            <button
              type="button"
              data-testid="btn-delete-account"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 text-[12px] font-medium text-red-500 hover:text-red-400 transition-colors w-fit"
            >
              <IconAlertTriangle size={14} />
              Solicitar exclusão de conta
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          type="button"
          data-testid="btn-signout"
          onClick={handleSignOut}
          className="w-full h-[44px] flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[14px] font-medium text-red-500 transition-opacity"
        >
          <IconLogout size={16} />
          Sair
        </button>

      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-[360px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-[16px] p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <IconAlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[var(--text)]">Excluir conta</p>
                <p className="text-[12px] text-[var(--text-2)] mt-1 leading-relaxed">
                  Sua conta será desativada. Seus dados serão anonimizados em até 30 dias.
                  Pedidos e histórico são mantidos por obrigação legal (90 dias).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[6px]">
                Digite seu e-mail para confirmar
              </label>
              <input
                data-testid="input-delete-confirm-email"
                type="email"
                value={deleteEmailInput}
                onChange={(e) => setDeleteEmailInput(e.target.value)}
                placeholder={user?.email}
                className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-secondary)] outline-none border border-[var(--border-strong)] focus:border-red-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                data-testid="btn-delete-cancel"
                onClick={() => { setShowDeleteModal(false); setDeleteEmailInput('') }}
                className="flex-1 h-[40px] rounded-[10px] border border-[var(--border-strong)] text-[13px] font-medium text-[var(--text-2)] bg-[var(--bg-primary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-delete-confirm"
                onClick={handleDeleteAccount}
                disabled={deleting || !deleteEmailInput.trim()}
                className="flex-1 h-[40px] rounded-[10px] bg-red-500 text-white text-[13px] font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? <Spinner size="sm" className="border-white/30 border-t-white" /> : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

    </OwnerLayout>
  )
}
