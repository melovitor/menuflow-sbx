import { isBrowserCompatible } from '../../utils/browserCheck'

export default function BrowserGate({ children }) {
  if (isBrowserCompatible()) return children

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
      style={{ background: '#111113' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-5 text-[22px]"
        style={{ background: '#1A1030' }}
      >
        ⚠️
      </div>
      <h1
        className="text-[18px] font-medium mb-2"
        style={{ color: '#FAFAFA', letterSpacing: '-0.3px' }}
      >
        Navegador incompatível
      </h1>
      <p className="text-[14px] mb-6" style={{ color: '#A1A1AA' }}>
        Para uma melhor experiência, use uma versão atualizada de:
      </p>
      <ul className="flex flex-col gap-2 text-left w-full max-w-[240px] mb-8">
        {[
          'Google Chrome 90+',
          'Safari 16.4+',
          'Samsung Internet 14+',
        ].map((b) => (
          <li
            key={b}
            className="flex items-center gap-2 text-[13px]"
            style={{ color: '#A1A1AA' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#7C3AED' }}
            />
            {b}
          </li>
        ))}
      </ul>
      <p className="text-[12px]" style={{ color: '#555558' }}>
        Atualize seu navegador e tente novamente.
      </p>
    </div>
  )
}
