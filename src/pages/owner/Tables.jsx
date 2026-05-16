import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import {
  IconPlus,
  IconPrinter,
  IconQrcode,
  IconX,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react'
import OwnerLayout from '../../components/layout/OwnerLayout'
import Spinner from '../../components/ui/Spinner'
import { toast } from '../../components/ui/Toast'
import {
  fetchBusinessById,
  fetchTables,
  createTable,
  updateTableCapacity,
  deleteTable,
} from '../../services/businessService'

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'
const getTableQrUrl = (slug, number) => `${APP_URL}/order/${slug}/table/${number}`
const getCounterQrUrl = (slug) => `${APP_URL}/order/${slug}/counter`

const STATUS_LABEL = {
  free: 'Livre',
  occupied: 'Ocupada',
  waiting_payment: 'Aguardando',
}

const STATUS_STYLE = {
  free: {
    card: 'bg-[var(--table-free-bg)] border-[var(--table-free-border)]',
    text: 'text-[var(--table-free-text)]',
    badge: 'bg-[var(--table-free-bg)] border border-[var(--table-free-border)] text-[var(--table-free-text)]',
  },
  occupied: {
    card: 'bg-[var(--table-occupied-bg)] border-[var(--table-occupied-border)]',
    text: 'text-[var(--table-occupied-text)]',
    badge: 'bg-[var(--table-occupied-bg)] border border-[var(--table-occupied-border)] text-[var(--table-occupied-text)]',
  },
  waiting_payment: {
    card: 'bg-[var(--table-waiting-bg)] border-[var(--table-waiting-border)]',
    text: 'text-[var(--table-waiting-text)]',
    badge: 'bg-[var(--table-waiting-bg)] border border-[var(--table-waiting-border)] text-[var(--table-waiting-text)]',
  },
}

function printQrWindow(title, rows) {
  const win = window.open('', '_blank', 'width=600,height=700')
  if (!win) { toast.error('Permita pop-ups para imprimir.'); return }

  const cards = rows
    .map(({ label, imgSrc }) => `
      <div class="card">
        <img src="${imgSrc}" width="180" height="180" alt="${label}" />
        <p class="label">${label}</p>
      </div>`)
    .join('')

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:sans-serif; background:#fff; }
  .grid { display:flex; flex-wrap:wrap; gap:16px; padding:24px; }
  .card { display:flex; flex-direction:column; align-items:center; gap:12px; padding:20px;
          border:1px solid #e2e2e2; border-radius:12px; width:220px; }
  .label { font-size:18px; font-weight:600; color:#111; }
  @media print { .grid { gap:8px; padding:8px; } .card { break-inside:avoid; } }
</style></head>
<body><div class="grid">${cards}</div>
<script>window.onload=()=>window.print()</script>
</body></html>`)
  win.document.close()
}

export default function Tables() {
  const { id } = useParams()

  const [business, setBusiness] = useState(null)
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [addCount, setAddCount] = useState('1')
  const [addCapacity, setAddCapacity] = useState('')
  const [saving, setSaving] = useState(false)

  const [editTable, setEditTable] = useState(null)
  const [editCapacity, setEditCapacity] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const qrRefs = useRef({})
  const counterQrRef = useRef(null)

  useEffect(() => {
    Promise.all([fetchBusinessById(id), fetchTables(id)])
      .then(([biz, tabs]) => { setBusiness(biz); setTables(tabs) })
      .catch(() => toast.error('Erro ao carregar mesas.'))
      .finally(() => setLoading(false))
  }, [id])

  const nextNumber = tables.length > 0
    ? Math.max(...tables.map((t) => t.number)) + 1
    : 1

  const handleAdd = async () => {
    const count = Math.max(1, parseInt(addCount) || 1)
    const capacity = addCapacity ? parseInt(addCapacity) || null : null
    setSaving(true)
    try {
      const created = []
      for (let i = 0; i < count; i++) {
        const number = nextNumber + i
        const qrUrl = getTableQrUrl(business.slug, number)
        const table = await createTable(id, number, qrUrl, capacity)
        created.push(table)
      }
      setTables((prev) => [...prev, ...created])
      setShowAdd(false)
      setAddCount('1')
      setAddCapacity('')
    } catch {
      toast.error('Erro ao criar mesas. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintTable = (number) => {
    const canvas = qrRefs.current[number]
    if (!canvas) return
    const imgSrc = canvas.toDataURL('image/png')
    printQrWindow(`Mesa ${number} — ${business.name}`, [
      { label: `Mesa ${number}`, imgSrc },
    ])
  }

  const handlePrintAll = () => {
    const rows = tables.map((t) => {
      const canvas = qrRefs.current[t.number]
      return { label: `Mesa ${t.number}`, imgSrc: canvas?.toDataURL('image/png') || '' }
    }).filter((r) => r.imgSrc)
    if (!rows.length) return
    printQrWindow(`Todas as mesas — ${business.name}`, rows)
  }

  const handlePrintCounter = () => {
    const canvas = counterQrRef.current
    if (!canvas) return
    const imgSrc = canvas.toDataURL('image/png')
    printQrWindow(`Balcão — ${business.name}`, [
      { label: 'Balcão', imgSrc },
    ])
  }

  const openEditModal = (table) => {
    setEditTable(table)
    setEditCapacity(table.capacity ? String(table.capacity) : '')
    setConfirmDelete(false)
  }

  const handleCloseEdit = () => {
    setEditTable(null)
    setEditCapacity('')
    setConfirmDelete(false)
  }

  const handleEditSave = async () => {
    if (!editTable) return
    setEditSaving(true)
    try {
      const cap = editCapacity ? parseInt(editCapacity) || null : null
      await updateTableCapacity(editTable.id, cap)
      setTables((prev) => prev.map((t) => t.id === editTable.id ? { ...t, capacity: cap } : t))
      toast.success('Mesa atualizada')
      handleCloseEdit()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteTable = async () => {
    if (!editTable) return
    setDeleting(true)
    try {
      await deleteTable(editTable.id)
      setTables((prev) => prev.filter((t) => t.id !== editTable.id))
      toast.success(`Mesa ${editTable.number} excluída`)
      handleCloseEdit()
    } catch {
      toast.error('Erro ao excluir mesa. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }

  const style = (status) => STATUS_STYLE[status] || STATUS_STYLE.free

  return (
    <OwnerLayout title="Mesas e QR Codes" showBack backTo={`/owner/business/${id}`}>
      <div className="px-5 py-5 flex flex-col gap-6 pb-10">

        {loading && (
          <div data-testid="loading-state" className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && business && (
          <>
            {/* ── Balcão ── */}
            <section>
              <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em] mb-3">
                Balcão
              </p>
              <div
                data-testid="counter-qr-card"
                className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-4 flex items-center gap-4"
              >
                <div className="flex-shrink-0 p-2 bg-white rounded-[10px]">
                  <QRCodeCanvas
                    ref={counterQrRef}
                    data-testid="counter-qr-canvas"
                    value={getCounterQrUrl(business.slug)}
                    size={80}
                    level="M"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text)] mb-0.5">
                    QR do Balcão
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] truncate">
                    {getCounterQrUrl(business.slug)}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="btn-print-counter"
                  onClick={handlePrintCounter}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[var(--text-2)] border border-[var(--border-strong)] rounded-[8px] bg-[var(--bg-primary)] hov:border-accent hov:text-accent transition-colors"
                >
                  <IconPrinter size={14} />
                  Imprimir
                </button>
              </div>
            </section>

            {/* ── Mesas ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-[.06em]">
                  Mesas
                </p>
                <button
                  type="button"
                  data-testid="btn-add-table"
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-accent border border-[var(--border-strong)] rounded-[8px] bg-[var(--bg-primary)] hov:border-accent transition-colors"
                >
                  <IconPlus size={13} />
                  Nova mesa
                </button>
              </div>

              {/* Empty */}
              {tables.length === 0 && (
                <div data-testid="empty-state" className="text-center py-10">
                  <IconQrcode size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
                  <p className="text-[14px] font-medium text-[var(--text-2)] mb-1">
                    Nenhuma mesa cadastrada
                  </p>
                  <p className="text-[12px] text-[var(--text-3)]">
                    Adicione mesas para gerar os QR Codes.
                  </p>
                </div>
              )}

              {/* Grid */}
              {tables.length > 0 && (
                <>
                  <div data-testid="table-list" className="grid grid-cols-2 gap-3">
                    {tables.map((table) => {
                      const s = style(table.status)
                      return (
                        <div
                          key={table.id}
                          data-testid={`table-card-${table.number}`}
                          className={`rounded-card border p-4 flex flex-col items-center gap-3 ${s.card}`}
                        >
                          {/* Number */}
                          <div className="text-center">
                            <p className={`text-[28px] font-medium leading-none ${s.text}`}>
                              {table.number}
                            </p>
                            <span
                              data-testid={`table-status-${table.number}`}
                              className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-pill text-[10px] font-medium ${s.badge}`}
                            >
                              {STATUS_LABEL[table.status] || table.status}
                            </span>
                            {table.capacity && (
                              <p className="text-[10px] text-[var(--text-3)] mt-1">{table.capacity} lug.</p>
                            )}
                          </div>

                          {/* QR */}
                          <div className="p-1.5 bg-white rounded-[8px]">
                            <QRCodeCanvas
                              ref={(el) => { if (el) qrRefs.current[table.number] = el }}
                              data-testid={`qr-canvas-${table.number}`}
                              value={table.qr_code_url || getTableQrUrl(business.slug, table.number)}
                              size={96}
                              level="M"
                            />
                          </div>

                          {/* Actions */}
                          <div className="w-full flex flex-col gap-2">
                            <button
                              type="button"
                              data-testid={`btn-print-${table.number}`}
                              onClick={() => handlePrintTable(table.number)}
                              className="flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-[var(--text-2)] border border-[var(--border-strong)] rounded-[8px] bg-[var(--bg-primary)] transition-colors"
                            >
                              <IconPrinter size={12} />
                              Imprimir
                            </button>
                            <button
                              type="button"
                              data-testid={`btn-edit-${table.number}`}
                              onClick={() => openEditModal(table)}
                              className="flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-[var(--text-2)] border border-[var(--border-strong)] rounded-[8px] bg-[var(--bg-primary)] transition-colors"
                            >
                              <IconPencil size={12} />
                              Editar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Print all */}
                  <button
                    type="button"
                    data-testid="btn-print-all"
                    onClick={handlePrintAll}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-[var(--text-2)] border border-[var(--border-strong)] rounded-card bg-[var(--bg-primary)] hov:border-accent hov:text-accent transition-colors"
                  >
                    <IconPrinter size={15} />
                    Imprimir todas as mesas
                  </button>
                </>
              )}
            </section>
          </>
        )}

        {/* ── Modal: nova mesa ── */}
        {showAdd && (
          <div
            data-testid="add-modal"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => { setShowAdd(false); setAddCount('1'); setAddCapacity('') }}
            />
            <div className="relative w-full sm:max-w-sm bg-[var(--bg-primary)] rounded-t-[20px] sm:rounded-[16px] p-6 flex flex-col gap-5 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium text-[var(--text)]">Nova mesa</p>
                <button
                  type="button"
                  data-testid="btn-close-modal"
                  onClick={() => { setShowAdd(false); setAddCount('1'); setAddCapacity('') }}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-2)] border border-[var(--border-strong)]"
                >
                  <IconX size={14} />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Quantidade de mesas
                </label>
                <input
                  data-testid="input-add-count"
                  type="number"
                  min="1"
                  max="50"
                  value={addCount}
                  onChange={(e) => setAddCount(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-secondary)] outline-none border border-[var(--border-strong)] focus:border-accent"
                />
                <p className="text-[11px] text-[var(--text-3)] mt-1">
                  Serão criadas a partir da Mesa {nextNumber}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Capacidade (pessoas) — opcional
                </label>
                <input
                  data-testid="input-add-capacity"
                  type="number"
                  min="1"
                  max="100"
                  value={addCapacity}
                  onChange={(e) => setAddCapacity(e.target.value)}
                  placeholder="Ex: 4"
                  className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-secondary)] outline-none border border-[var(--border-strong)] focus:border-accent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="btn-cancel-add"
                  onClick={() => { setShowAdd(false); setAddCount('1'); setAddCapacity('') }}
                  className="flex-1 h-[42px] rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-add"
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 h-[42px] rounded-[10px] bg-accent text-white text-[13px] font-medium disabled:opacity-60"
                >
                  {saving
                    ? <Spinner size="sm" className="border-white/30 border-t-white mx-auto" />
                    : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: editar mesa ── */}
        {editTable && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={handleCloseEdit} />
            <div className="relative w-full sm:max-w-sm bg-[var(--bg-primary)] rounded-t-[20px] sm:rounded-[16px] p-6 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium text-[var(--text)]">Mesa {editTable.number}</p>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-2)] border border-[var(--border-strong)]"
                >
                  <IconX size={14} />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em] mb-[5px]">
                  Capacidade (pessoas) — opcional
                </label>
                <input
                  data-testid="input-edit-capacity"
                  type="number"
                  min="1"
                  max="100"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  placeholder="Ex: 4"
                  className="w-full h-[40px] px-3 rounded-input text-[13px] text-[var(--text)] bg-[var(--bg-secondary)] outline-none border border-[var(--border-strong)] focus:border-accent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 h-[42px] rounded-[10px] border border-[var(--border-strong)] text-[13px] text-[var(--text-2)] bg-[var(--bg-primary)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  data-testid="btn-edit-save"
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="flex-1 h-[42px] rounded-[10px] bg-accent text-white text-[13px] font-medium disabled:opacity-60"
                >
                  {editSaving ? <Spinner size="sm" className="border-white/30 border-t-white mx-auto" /> : 'Salvar'}
                </button>
              </div>

              {!confirmDelete ? (
                <button
                  type="button"
                  data-testid="btn-delete-table"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--red-text)] hover:opacity-80 transition-opacity w-fit mx-auto"
                >
                  <IconTrash size={13} />
                  Excluir mesa
                </button>
              ) : (
                <div className="rounded-[10px] border border-[var(--red-border)] bg-[var(--red-bg)] p-3 flex flex-col gap-2">
                  <p className="text-[12px] text-[var(--red-text)] text-center">
                    Excluir Mesa {editTable.number}? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 h-[36px] rounded-[8px] border border-[var(--border-strong)] text-[12px] text-[var(--text-2)] bg-[var(--bg-primary)]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      data-testid="btn-delete-confirm"
                      onClick={handleDeleteTable}
                      disabled={deleting}
                      className="flex-1 h-[36px] rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60"
                      style={{ background: '#EF4444' }}
                    >
                      {deleting ? <Spinner size="sm" className="border-white/30 border-t-white mx-auto" /> : 'Confirmar exclusão'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
