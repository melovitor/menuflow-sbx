import { useState, useRef, useEffect } from 'react'

// Contexto e buffers em nível de módulo — sobrevivem ao desmonte do componente
// (PDV navega para Checkout e volta; sem isso o áudio precisaria ser reativado toda vez)
let _sharedCtx = null
let _sharedBuffers = {}
let _sharedEnabled = false

// Uses Web Audio API so playback works from async callbacks (realtime events)
// on all browsers including Safari iOS, which blocks <audio>.play() from non-gesture contexts.
export const useAudio = (srcs = []) => {
  const [enabled, setEnabled] = useState(_sharedEnabled)
  const ctxRef = useRef(_sharedCtx)
  const buffersRef = useRef(_sharedBuffers)

  // Sync module-level state back if it was enabled in a previous mount
  useEffect(() => {
    if (_sharedEnabled && !enabled) setEnabled(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const enable = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      _sharedEnabled = true
      setEnabled(true)
      return
    }

    if (!ctxRef.current) {
      const ctx = new AudioContext()
      await ctx.resume()
      ctxRef.current = ctx
      _sharedCtx = ctx
    }

    const ctx = ctxRef.current
    await Promise.all(
      srcs.map(async (src) => {
        if (buffersRef.current[src]) return // já carregado
        try {
          const res = await fetch(src)
          const raw = await res.arrayBuffer()
          const buf = await ctx.decodeAudioData(raw)
          buffersRef.current[src] = buf
          _sharedBuffers[src] = buf
        } catch {}
      })
    )

    _sharedEnabled = true
    setEnabled(true)
  }

  const play = (src) => {
    const ctx = ctxRef.current || _sharedCtx
    const buf = (buffersRef.current[src] || _sharedBuffers[src])
    if (!ctx || !buf) return
    try {
      const source = ctx.createBufferSource()
      source.buffer = buf
      source.connect(ctx.destination)
      source.start(0)
    } catch {}
  }

  return { enabled, enable, play }
}
