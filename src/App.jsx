import AppRouter from './routes'
import ToastContainer from './components/ui/Toast'
import ConnectionStatus from './components/ui/ConnectionStatus'
import BrowserGate from './components/ui/BrowserGate'

export default function App() {
  return (
    <BrowserGate>
      <ConnectionStatus />
      <AppRouter />
      <ToastContainer />
    </BrowserGate>
  )
}
