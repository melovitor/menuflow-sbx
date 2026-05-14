import { useState } from 'react'
import { IconMoon, IconSun, IconArrowLeft } from '@tabler/icons-react'
import { toggleTheme } from '../../utils/theme'

const LAST_UPDATED = '14 de maio de 2026'
const PRIVACY_VERSION = '1.0'
const DPO_EMAIL = 'privacidade@menuflow.app'

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">{title}</h2>
      <div className="flex flex-col gap-2 text-[13px] text-[var(--text-2)] leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export default function Privacy() {
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">

      {/* Header */}
      <header className="h-[52px] px-5 flex items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
          >
            <IconArrowLeft size={15} />
          </button>
          <span className="text-[15px] font-medium text-[var(--text)] tracking-[-0.2px]">
            Menu<span className="text-accent">Flow</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleTheme}
          className="w-[32px] h-[32px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
        >
          {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-[720px] mx-auto w-full px-5 py-8 flex flex-col gap-8">

        {/* Title */}
        <div>
          <h1 className="text-[22px] font-medium text-[var(--text)] tracking-[-0.5px] mb-2">
            Política de Privacidade
          </h1>
          <p className="text-[12px] text-[var(--text-3)]">
            Versão {PRIVACY_VERSION} · Atualizada em {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. Sobre esta Política">
          <p>
            Esta Política de Privacidade descreve como o <strong className="text-[var(--text)]">MenuFlow</strong> coleta,
            usa, armazena e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
            Pessoais (LGPD — Lei nº 13.709/2018).
          </p>
          <p>
            Ao criar uma conta ou utilizar nossos serviços, você confirma que leu e compreendeu esta política.
          </p>
        </Section>

        <Section title="2. Dados que coletamos e suas finalidades">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-2)] uppercase tracking-[.05em] text-[10px]">Dado</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-2)] uppercase tracking-[.05em] text-[10px]">Finalidade</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-2)] uppercase tracking-[.05em] text-[10px]">Base legal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <tr>
                  <td className="px-4 py-3 text-[var(--text)] font-medium">Nome completo</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">Identificação da conta e dos pedidos</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">Execução de contrato</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[var(--text)] font-medium">E-mail</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">Login, comunicações e recuperação de acesso</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">Execução de contrato</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[var(--text)] font-medium">Telefone</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">Identificação de clientes em pedidos via QR Code</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">Execução de contrato / Legítimo interesse</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[var(--text)] font-medium">Foto de perfil</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">Personalização da conta do operador</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">Consentimento</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[var(--text)] font-medium">Dados de pedidos</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">Operação do sistema, histórico e faturamento</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">Execução de contrato / Obrigação legal</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[var(--text)] font-medium">Dados do estabelecimento</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">Configuração e operação do serviço contratado</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">Execução de contrato</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Como protegemos seus dados">
          <p>
            Utilizamos a infraestrutura <strong className="text-[var(--text)]">Supabase</strong> hospedada na região
            South America (São Paulo), com os seguintes controles de segurança:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>Todas as conexões são criptografadas via <strong className="text-[var(--text)]">HTTPS/TLS</strong></li>
            <li><strong className="text-[var(--text)]">Row Level Security (RLS)</strong> garante que cada usuário
              acessa apenas seus próprios dados</li>
            <li>Senhas nunca são armazenadas em texto plano — apenas hashes seguros</li>
            <li>Tokens de sessão têm expiração automática</li>
            <li>Dados nunca são vendidos ou compartilhados com terceiros para fins comerciais</li>
          </ul>
        </Section>

        <Section title="4. Tempo de retenção dos dados">
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li><strong className="text-[var(--text)]">Dados de pedidos:</strong> 90 dias após a criação</li>
            <li><strong className="text-[var(--text)]">Dados da conta (owner):</strong> enquanto a conta estiver ativa</li>
            <li><strong className="text-[var(--text)]">Dados de clientes via QR:</strong> vinculados ao estabelecimento, conforme política do operador</li>
            <li><strong className="text-[var(--text)]">Após exclusão de conta:</strong> dados anonimizados em até 30 dias, exceto registros exigidos por obrigação legal</li>
          </ul>
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p>
            Seus dados <strong className="text-[var(--text)]">não são vendidos</strong> a terceiros.
            Podemos compartilhá-los apenas nas seguintes situações:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>Com provedores de infraestrutura (Supabase, Vercel) estritamente para prestação do serviço</li>
            <li>Quando exigido por lei, ordem judicial ou autoridade competente</li>
            <li>Para proteger direitos, propriedade ou segurança do MenuFlow e de seus usuários</li>
          </ul>
        </Section>

        <Section title="6. Seus direitos como titular">
          <p>
            Em conformidade com o artigo 18 da LGPD, você tem os seguintes direitos:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {[
              ['Acesso', 'Saber quais dados temos sobre você'],
              ['Correção', 'Corrigir dados incompletos, inexatos ou desatualizados'],
              ['Eliminação', 'Solicitar a exclusão dos seus dados pessoais'],
              ['Portabilidade', 'Receber seus dados em formato estruturado (JSON)'],
              ['Revogação', 'Retirar seu consentimento a qualquer momento'],
              ['Informação', 'Ser informado sobre o uso e compartilhamento dos seus dados'],
            ].map(([right, desc]) => (
              <div key={right} className="flex gap-3 items-start bg-[var(--bg-primary)] border border-[var(--border)] rounded-[10px] px-3 py-2.5">
                <span className="text-[11px] font-medium text-accent bg-[var(--accent-light)] px-2 py-0.5 rounded-pill shrink-0 mt-[1px]">
                  {right}
                </span>
                <span className="text-[12px] text-[var(--text-2)]">{desc}</span>
              </div>
            ))}
          </div>
          <p>
            Para exercer qualquer um desses direitos, entre em contato com nosso Encarregado de Proteção de Dados:
          </p>
          <a
            href={`mailto:${DPO_EMAIL}`}
            className="text-accent underline underline-offset-2 font-medium hover:opacity-80 transition-opacity w-fit"
          >
            {DPO_EMAIL}
          </a>
          <p className="text-[11px] text-[var(--text-3)]">
            Responderemos sua solicitação em até 15 dias úteis.
          </p>
        </Section>

        <Section title="7. Cookies e armazenamento local">
          <p>
            O MenuFlow utiliza o armazenamento local do navegador (<em>localStorage</em>) exclusivamente para:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
            <li>Preferência de tema visual (escuro/claro)</li>
            <li>Sessão temporária de identificação em pedidos via QR (expira em 8 horas)</li>
            <li>Carrinho de compras (dados do pedido atual)</li>
          </ul>
          <p>
            Nenhuma senha, token de pagamento ou dado financeiro é armazenado no dispositivo.
          </p>
        </Section>

        <Section title="8. Contato e DPO">
          <p>
            Dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais:
          </p>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px] px-4 py-3 flex flex-col gap-1">
            <p className="text-[13px] font-medium text-[var(--text)]">MenuFlow — Encarregado de Dados (DPO)</p>
            <a href={`mailto:${DPO_EMAIL}`} className="text-accent text-[13px] hover:underline">{DPO_EMAIL}</a>
            <p className="text-[11px] text-[var(--text-3)] mt-1">Foro: São Paulo/SP — Lei Brasileira</p>
          </div>
          <p className="text-[11px] text-[var(--text-3)]">
            Você também tem o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD):
            {' '}
            <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              www.gov.br/anpd
            </a>
          </p>
        </Section>

        <Section title="9. Alterações nesta Política">
          <p>
            Reservamo-nos o direito de atualizar esta Política periodicamente. Quando houver alterações
            relevantes, notificaremos os usuários cadastrados por e-mail ou aviso na plataforma.
            O uso continuado após notificação implica aceite da nova versão.
          </p>
          <p className="text-[12px] text-[var(--text-3)]">
            Última atualização: {LAST_UPDATED} — Versão {PRIVACY_VERSION}
          </p>
        </Section>

      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-5 px-5 text-center">
        <p className="text-[11px] text-[var(--text-3)]">
          © {new Date().getFullYear()} MenuFlow · Todos os direitos reservados
        </p>
      </footer>

    </div>
  )
}
