import { useConnection } from '../../hooks/useConnection'

export default function ConnectionStatus() {
  const { isOnline } = useConnection()
  if (isOnline) return null
  return (
    <div
      data-testid="connection-status-offline"
      className="fixed top-0 left-0 right-0 z-[9998] bg-red-500 text-white text-center text-[12px] py-1 font-medium"
    >
      Sem conexão — verifique sua internet
    </div>
  )
}
